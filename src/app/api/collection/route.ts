import { NextResponse } from "next/server";
import { fetchBggThing } from "@/lib/bgg/client";
import { createClient } from "@/lib/supabase/server";
import type { CollectionGame, Game } from "@/types/database";

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

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const collectionId = await ensureCollection(user.id);
  const { data, error } = await supabase
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
      const game = row.game as unknown as Game;
      return {
        ...game,
        collection_item_id: row.id,
        notes: row.notes,
        is_wishlist: row.is_wishlist,
      };
    });

  return NextResponse.json({ collectionId, games });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const bggId = Number(body.bggId);
  if (!Number.isFinite(bggId)) {
    return NextResponse.json({ error: "bggId required" }, { status: 400 });
  }

  try {
    let { data: game } = await supabase
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
      const { data: inserted, error: insertError } = await supabase
        .from("games")
        .insert(rest)
        .select("*")
        .single();
      if (insertError) {
        // Race: another request may have inserted
        const { data: raced } = await supabase
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

    const collectionId = await ensureCollection(user.id);
    const { data: item, error: itemError } = await supabase
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

    return NextResponse.json({ game, itemId: item.id });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to add game" },
      { status: 502 }
    );
  }
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const itemId = new URL(request.url).searchParams.get("itemId");
  if (!itemId) {
    return NextResponse.json({ error: "itemId required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("collection_items")
    .delete()
    .eq("id", itemId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
