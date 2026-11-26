import { NextResponse } from "next/server";
import { ensureCollection } from "@/lib/collection/ensure";
import {
  filterCollectionGames,
  type CollectionFilterInput,
} from "@/lib/collection/filters";
import {
  RANDOM_GAME_REEL_LENGTH,
  buildReelItems,
  pickUniformRandom,
  toGameReelUiItem,
} from "@/lib/collection/reel";
import {
  buildRandomGamePresentationMarkdown,
  buildRandomGameUi,
  pickChatFrames,
} from "@/lib/collection/random-presentation";
import { normalizeGameText } from "@/lib/htmlEntities";
import { TABLIST_APP_ORIGIN } from "@/lib/mcp/setup-instructions";
import { requireRouteUser, requireScopes } from "@/lib/supabase/route-auth";
import type { CollectionGame, Game } from "@/types/database";

function parseFilters(body: Record<string, unknown>): CollectionFilterInput {
  const categories = Array.isArray(body.categories)
    ? body.categories.filter((c): c is string => typeof c === "string")
    : undefined;
  const wishlist =
    body.wishlist === "only" ||
    body.wishlist === "include" ||
    body.wishlist === "exclude"
      ? body.wishlist
      : undefined;

  return {
    search: typeof body.search === "string" ? body.search : undefined,
    players:
      typeof body.players === "number" && Number.isFinite(body.players)
        ? body.players
        : undefined,
    maxPlaytime:
      typeof body.maxPlaytime === "number" && Number.isFinite(body.maxPlaytime)
        ? body.maxPlaytime
        : undefined,
    weightMax:
      typeof body.weightMax === "number" && Number.isFinite(body.weightMax)
        ? body.weightMax
        : typeof body.weight === "number" && Number.isFinite(body.weight)
          ? body.weight
          : undefined,
    categories,
    wishlist,
  };
}

export async function POST(request: Request) {
  const auth = await requireRouteUser(request);
  if (!auth.ok) return auth.response;
  const scopeError = requireScopes(auth.ctx, ["collection:read"]);
  if (scopeError) return scopeError;
  const { user, db } = auth.ctx;

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const filters = parseFilters(body);
  const excludeGameIds = Array.isArray(body.excludeGameIds)
    ? body.excludeGameIds.filter((id): id is string => typeof id === "string")
    : [];

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

    const games: CollectionGame[] = (data ?? [])
      .filter((row) => row.game)
      .map((row) => {
        const game = normalizeGameText(row.game as unknown as Game);
        return {
          ...game,
          collection_item_id: row.id as string,
          notes: row.notes as string | null,
          is_wishlist: Boolean(row.is_wishlist),
        };
      });

    const pool = filterCollectionGames(games, filters);
    if (pool.length === 0) {
      return NextResponse.json(
        {
          error: "No games match the given filters",
          code: "validation",
          poolSize: 0,
          filtersApplied: filters,
        },
        { status: 400 }
      );
    }

    const chosen = pickUniformRandom(pool, excludeGameIds);
    if (!chosen) {
      return NextResponse.json(
        { error: "No games available to pick", code: "validation" },
        { status: 400 }
      );
    }

    const reelGames = buildReelItems(
      pool,
      chosen,
      RANDOM_GAME_REEL_LENGTH
    );
    const reel = reelGames.map(toGameReelUiItem);
    const chosenIndex = reel.length - 1;
    const coverUrl = chosen.image_url || chosen.thumbnail_url || null;
    const origin = TABLIST_APP_ORIGIN;
    const ui = buildRandomGameUi({
      origin,
      reel,
      chosenIndex,
    });
    const frames = pickChatFrames(reel);
    const presentationMarkdown = buildRandomGamePresentationMarkdown({
      gameName: chosen.name,
      poolSize: pool.length,
      coverUrl,
      frames,
      deepLink: ui.deepLink,
      animationUrl: ui.animationUrl,
      animationPageUrl: ui.animationPageUrl,
    });
    const summary = `Picked **${chosen.name}** from ${pool.length} matching game${pool.length === 1 ? "" : "s"}.`;
    const uiMode =
      body.ui === "structured" ||
      body.ui === "media" ||
      body.ui === "text" ||
      body.ui === "auto"
        ? body.ui
        : "auto";

    return NextResponse.json({
      game: {
        id: chosen.id,
        collectionItemId: chosen.collection_item_id,
        bggId: chosen.bgg_id,
        name: chosen.name,
        minPlayers: chosen.min_players,
        maxPlayers: chosen.max_players,
        playingTime: chosen.playing_time,
        weight: chosen.weight,
        bggRating: chosen.bgg_rating,
        yearPublished: chosen.year_published,
        categories: chosen.categories,
        mechanics: chosen.mechanics,
        thumbnailUrl: chosen.thumbnail_url,
        imageUrl: chosen.image_url,
        notes: chosen.notes,
        isWishlist: chosen.is_wishlist,
      },
      poolSize: pool.length,
      filtersApplied: filters,
      text: summary,
      coverUrl,
      frames,
      presentationMarkdown,
      requestedUi: uiMode,
      ui,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to pick random game",
      },
      { status: 500 }
    );
  }
}
