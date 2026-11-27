import { NextResponse } from "next/server";
import { fetchBggThing } from "@/lib/bgg/client";
import { ensureCollection } from "@/lib/collection/ensure";
import {
  filterCollectionGames,
  type CollectionFilterInput,
} from "@/lib/collection/filters";
import { normalizeGameText } from "@/lib/htmlEntities";
import { requireRouteUser, requireScopes } from "@/lib/supabase/route-auth";
import type { CollectionGame, Game } from "@/types/database";

function parseListFilters(url: URL): CollectionFilterInput {
  const search = url.searchParams.get("search")?.trim() || undefined;
  const playersRaw = url.searchParams.get("players");
  const players =
    playersRaw != null && playersRaw !== ""
      ? Number(playersRaw)
      : undefined;
  const maxPlaytimeRaw = url.searchParams.get("maxPlaytime");
  const maxPlaytime =
    maxPlaytimeRaw != null && maxPlaytimeRaw !== ""
      ? Number(maxPlaytimeRaw)
      : undefined;
  const weightMinRaw = url.searchParams.get("weightMin");
  const weightMin =
    weightMinRaw != null && weightMinRaw !== ""
      ? Number(weightMinRaw)
      : undefined;
  const weightMaxRaw = url.searchParams.get("weightMax");
  const weightMax =
    weightMaxRaw != null && weightMaxRaw !== ""
      ? Number(weightMaxRaw)
      : undefined;
  const categoriesParam = url.searchParams.get("categories");
  const categories = categoriesParam
    ? categoriesParam
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean)
    : undefined;
  const wishlistRaw = url.searchParams.get("wishlist");
  const wishlist =
    wishlistRaw === "only" ||
    wishlistRaw === "include" ||
    wishlistRaw === "exclude"
      ? wishlistRaw
      : undefined;

  return {
    search,
    players: Number.isFinite(players) ? players : undefined,
    maxPlaytime: Number.isFinite(maxPlaytime) ? maxPlaytime : undefined,
    weightMin: Number.isFinite(weightMin) ? weightMin : undefined,
    weightMax: Number.isFinite(weightMax) ? weightMax : undefined,
    categories,
    wishlist,
  };
}

function mapCollectionRows(
  data: Array<{
    id: string;
    notes: string | null;
    is_wishlist: boolean;
    game: unknown;
  }>
): CollectionGame[] {
  return data
    .filter((row) => row.game)
    .map((row) => {
      const game = normalizeGameText(row.game as Game);
      return {
        ...game,
        collection_item_id: row.id,
        notes: row.notes,
        is_wishlist: row.is_wishlist,
      };
    });
}

export async function GET(request: Request) {
  const auth = await requireRouteUser(request);
  if (!auth.ok) return auth.response;
  const scopeError = requireScopes(auth.ctx, ["collection:read"]);
  if (scopeError) return scopeError;
  const { user, db } = auth.ctx;

  const url = new URL(request.url);
  const filters = parseListFilters(url);
  const limitRaw = Number(url.searchParams.get("limit") ?? "");
  const offsetRaw = Number(url.searchParams.get("offset") ?? "0");
  const limit =
    Number.isFinite(limitRaw) && limitRaw > 0
      ? Math.min(500, Math.floor(limitRaw))
      : undefined;
  const offset =
    Number.isFinite(offsetRaw) && offsetRaw > 0 ? Math.floor(offsetRaw) : 0;

  try {
    const collectionId = await ensureCollection(db, user.id);
    const { data, error } = await db
      .from("collection_items")
      .select("id, notes, is_wishlist, game:games(*)")
      .eq("collection_id", collectionId)
      .order("added_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const all = mapCollectionRows(
      (data ?? []) as Array<{
        id: string;
        notes: string | null;
        is_wishlist: boolean;
        game: unknown;
      }>
    );
    const filtered = filterCollectionGames(all, filters);
    const total = filtered.length;
    const page =
      limit != null ? filtered.slice(offset, offset + limit) : filtered.slice(offset);

    return NextResponse.json({
      collectionId,
      total,
      games: page,
      filtersApplied: filters,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load collection" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireRouteUser(request);
  if (!auth.ok) return auth.response;
  const scopeError = requireScopes(auth.ctx, ["collection:write", "bgg:read"]);
  if (scopeError) return scopeError;
  const { user, db } = auth.ctx;

  const body = await request.json();
  const bggId = Number(body.bggId);
  if (!Number.isFinite(bggId)) {
    return NextResponse.json(
      { error: "bggId required", code: "validation" },
      { status: 400 }
    );
  }

  try {
    let { data: game } = await db
      .from("games")
      .select("*")
      .eq("bgg_id", bggId)
      .maybeSingle();

    if (!game) {
      const parsed = await fetchBggThing(bggId);
      const rest = {
        bgg_id: parsed.bgg_id,
        name: parsed.name,
        description: parsed.description,
        image_url: parsed.image_url,
        thumbnail_url: parsed.thumbnail_url,
        min_players: parsed.min_players,
        max_players: parsed.max_players,
        min_playtime: parsed.min_playtime,
        max_playtime: parsed.max_playtime,
        playing_time: parsed.playing_time,
        weight: parsed.weight,
        bgg_rating: parsed.bgg_rating,
        year_published: parsed.year_published,
        categories: parsed.categories,
        mechanics: parsed.mechanics,
      };
      const { data: inserted, error: insertError } = await db
        .from("games")
        .insert(rest)
        .select("*")
        .single();
      if (insertError) {
        const { data: raced } = await db
          .from("games")
          .select("*")
          .eq("bgg_id", bggId)
          .single();
        if (!raced) {
          return NextResponse.json({ error: insertError.message }, { status: 500 });
        }
        game = raced;
      } else {
        game = inserted;
      }
    }

    const collectionId = await ensureCollection(db, user.id);
    const { data: item, error: itemError } = await db
      .from("collection_items")
      .upsert(
        {
          collection_id: collectionId,
          game_id: game.id,
          is_wishlist: Boolean(body.isWishlist),
          notes: body.notes ?? null,
        },
        { onConflict: "collection_id,game_id" }
      )
      .select("id")
      .single();

    if (itemError) {
      return NextResponse.json({ error: itemError.message }, { status: 500 });
    }

    return NextResponse.json({
      game: normalizeGameText(game as Game),
      itemId: item.id,
    });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Failed to add game";
    const bggUnavailable =
      /bgg|401|403|502|unauthorized|application token/i.test(message);
    return NextResponse.json(
      {
        error: message,
        code: bggUnavailable ? "bgg_unavailable" : undefined,
      },
      { status: 502 }
    );
  }
}

export async function DELETE(request: Request) {
  const auth = await requireRouteUser(request);
  if (!auth.ok) return auth.response;
  const scopeError = requireScopes(auth.ctx, ["collection:write"]);
  if (scopeError) return scopeError;
  const { user, db } = auth.ctx;

  const url = new URL(request.url);
  const itemId = url.searchParams.get("itemId");
  const gameId = url.searchParams.get("gameId");
  if (!itemId && !gameId) {
    return NextResponse.json(
      { error: "itemId or gameId required", code: "validation" },
      { status: 400 }
    );
  }

  const collectionId = await ensureCollection(db, user.id);

  let query = db
    .from("collection_items")
    .delete()
    .eq("collection_id", collectionId);

  if (itemId) {
    query = query.eq("id", itemId);
  } else if (gameId) {
    query = query.eq("game_id", gameId);
  }

  const { data, error } = await query.select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data || data.length === 0) {
    return NextResponse.json(
      { error: "Not found", code: "not_found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
}
