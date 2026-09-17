import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { CollectionGame, Game } from "@/types/database";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const players = searchParams.get("players");
  const maxPlaytime = searchParams.get("maxPlaytime");
  const search = searchParams.get("search")?.toLowerCase() ?? "";
  const categories = (searchParams.get("categories") ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  const { data: collection } = await supabase
    .from("collections")
    .select("id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!collection) {
    return NextResponse.json({ games: [] });
  }

  const { data, error } = await supabase
    .from("collection_items")
    .select("id, notes, is_wishlist, game:games(*)")
    .eq("collection_id", collection.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let games: CollectionGame[] = (data ?? [])
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

  if (search) {
    games = games.filter((g) => g.name.toLowerCase().includes(search));
  }

  if (players) {
    const n = Number(players);
    games = games.filter((g) => {
      const min = g.min_players ?? 1;
      const max = g.max_players ?? 99;
      if (n === 4) return max >= 4;
      return n >= min && n <= max;
    });
  }

  if (maxPlaytime) {
    const max = Number(maxPlaytime);
    games = games.filter((g) => {
      const time = g.playing_time ?? g.max_playtime ?? g.min_playtime;
      return time == null || time <= max;
    });
  }

  if (categories.length > 0) {
    games = games.filter((g) => {
      const cats = (g.categories ?? []).map((c) => c.toLowerCase());
      return categories.some((wanted) =>
        cats.some((c) => c.includes(wanted.toLowerCase()))
      );
    });
  }

  return NextResponse.json({ games });
}
