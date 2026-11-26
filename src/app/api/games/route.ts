import { NextResponse } from "next/server";
import { fetchBggThing } from "@/lib/bgg/client";
import { ensureCollection } from "@/lib/collection/ensure";
import { normalizeGameText } from "@/lib/htmlEntities";
import { requireRouteUser, requireScopes } from "@/lib/supabase/route-auth";
import type { Game } from "@/types/database";

export async function GET(request: Request) {
  const auth = await requireRouteUser(request);
  if (!auth.ok) return auth.response;
  const scopeError = requireScopes(auth.ctx, ["collection:read"]);
  if (scopeError) return scopeError;
  const { user, db } = auth.ctx;

  const url = new URL(request.url);
  const gameId = url.searchParams.get("gameId")?.trim() || null;
  const bggIdRaw = url.searchParams.get("bggId");
  const bggId =
    bggIdRaw != null && bggIdRaw !== "" ? Number(bggIdRaw) : NaN;
  const refresh = url.searchParams.get("refresh") === "1" || url.searchParams.get("refresh") === "true";

  if (!gameId && !Number.isFinite(bggId)) {
    return NextResponse.json(
      { error: "gameId or bggId required", code: "validation" },
      { status: 400 }
    );
  }

  try {
    let game: Game | null = null;

    if (gameId) {
      const { data, error } = await db
        .from("games")
        .select("*")
        .eq("id", gameId)
        .maybeSingle();
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      game = data as Game | null;
    } else {
      const { data, error } = await db
        .from("games")
        .select("*")
        .eq("bgg_id", bggId)
        .maybeSingle();
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      game = data as Game | null;
    }

    if ((!game || refresh) && Number.isFinite(bggId || game?.bgg_id)) {
      const targetBggId = Number.isFinite(bggId) ? bggId : (game!.bgg_id as number);
      if (refresh || !game) {
        const scopeBgg = requireScopes(auth.ctx, ["bgg:read"]);
        if (scopeBgg) return scopeBgg;
        const parsed = await fetchBggThing(targetBggId);
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
          updated_at: new Date().toISOString(),
        };
        const { data: upserted, error: upsertError } = await db
          .from("games")
          .upsert(rest, { onConflict: "bgg_id" })
          .select("*")
          .single();
        if (upsertError) {
          return NextResponse.json({ error: upsertError.message }, { status: 500 });
        }
        game = upserted as Game;
      }
    }

    if (!game) {
      return NextResponse.json(
        { error: "Not found", code: "not_found" },
        { status: 404 }
      );
    }

    const normalized = normalizeGameText(game);
    let inCollection = false;
    let collectionItemId: string | null = null;
    let isWishlist: boolean | null = null;
    try {
      const collectionId = await ensureCollection(db, user.id);
      const { data: item } = await db
        .from("collection_items")
        .select("id, is_wishlist")
        .eq("collection_id", collectionId)
        .eq("game_id", normalized.id)
        .maybeSingle();
      if (item) {
        inCollection = true;
        collectionItemId = item.id as string;
        isWishlist = Boolean(item.is_wishlist);
      }
    } catch {
      // ignore
    }

    return NextResponse.json({
      game: normalized,
      inCollection,
      collectionItemId,
      isWishlist,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load game";
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
