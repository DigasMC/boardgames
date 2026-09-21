import { NextResponse } from "next/server";
import {
  fetchBggCollection,
  fetchBggThings,
  type ParsedBggGame,
} from "@/lib/bgg/client";
import { saveBggUsername } from "@/lib/profile/bggUsername";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

async function ensureCollection(userId: string) {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("collections")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("collections")
    .insert({ user_id: userId, name: "My Collection" })
    .select("id")
    .single();

  if (error) throw error;
  return created.id as string;
}

function gameInsertRow(parsed: ParsedBggGame) {
  return {
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
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { username?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const username =
    typeof body.username === "string" ? body.username.trim() : "";
  if (!username) {
    return NextResponse.json(
      { error: "BoardGameGeek username is required" },
      { status: 400 }
    );
  }

  try {
    const collectionItems = await fetchBggCollection(username);
    if (collectionItems.length === 0) {
      await saveBggUsername(supabase, user.id, username);

      return NextResponse.json({
        username,
        total: 0,
        added: 0,
        alreadyHad: 0,
        message:
          "No owned games found. Check the username and that the collection is public.",
      });
    }

    const bggIds = collectionItems.map((item) => item.bggId);
    const { data: existingGames, error: existingError } = await supabase
      .from("games")
      .select("id, bgg_id")
      .in("bgg_id", bggIds);

    if (existingError) {
      return NextResponse.json(
        { error: existingError.message },
        { status: 500 }
      );
    }

    const gameIdByBggId = new Map<number, string>();
    for (const row of existingGames ?? []) {
      gameIdByBggId.set(row.bgg_id as number, row.id as string);
    }

    const missingIds = bggIds.filter((id) => !gameIdByBggId.has(id));
    if (missingIds.length > 0) {
      const parsedGames = await fetchBggThings(missingIds);
      if (parsedGames.length > 0) {
        const { data: inserted, error: insertError } = await supabase
          .from("games")
          .upsert(parsedGames.map(gameInsertRow), { onConflict: "bgg_id" })
          .select("id, bgg_id");

        if (insertError) {
          return NextResponse.json(
            { error: insertError.message },
            { status: 500 }
          );
        }

        for (const row of inserted ?? []) {
          gameIdByBggId.set(row.bgg_id as number, row.id as string);
        }
      }
    }

    const collectionId = await ensureCollection(user.id);

    const { data: existingItems, error: itemsLookupError } = await supabase
      .from("collection_items")
      .select("game_id")
      .eq("collection_id", collectionId);

    if (itemsLookupError) {
      return NextResponse.json(
        { error: itemsLookupError.message },
        { status: 500 }
      );
    }

    const alreadyOwnedGameIds = new Set(
      (existingItems ?? []).map((row) => row.game_id as string)
    );

    const rowsToUpsert: { collection_id: string; game_id: string }[] = [];
    let skippedMissing = 0;

    for (const bggId of bggIds) {
      const gameId = gameIdByBggId.get(bggId);
      if (!gameId) {
        skippedMissing += 1;
        continue;
      }
      rowsToUpsert.push({ collection_id: collectionId, game_id: gameId });
    }

    const alreadyHad = rowsToUpsert.filter((row) =>
      alreadyOwnedGameIds.has(row.game_id)
    ).length;

    if (rowsToUpsert.length > 0) {
      const { error: upsertError } = await supabase
        .from("collection_items")
        .upsert(rowsToUpsert, { onConflict: "collection_id,game_id" });

      if (upsertError) {
        return NextResponse.json(
          { error: upsertError.message },
          { status: 500 }
        );
      }
    }

    await saveBggUsername(supabase, user.id, username);

    const added = rowsToUpsert.length - alreadyHad;

    return NextResponse.json({
      username,
      total: collectionItems.length,
      added,
      alreadyHad,
      skippedMissing,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to import BoardGameGeek collection",
      },
      { status: 502 }
    );
  }
}
