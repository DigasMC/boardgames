import { NextResponse } from "next/server";
import { fetchBggThing } from "@/lib/bgg/client";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    const { data: existing } = await supabase
      .from("games")
      .select("*")
      .eq("bgg_id", id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ game: existing });
    }

    const parsed = await fetchBggThing(id);
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
      .upsert(rest, { onConflict: "bgg_id" })
      .select("*")
      .single();

    if (insertError) {
      const { data: raced } = await supabase
        .from("games")
        .select("*")
        .eq("bgg_id", id)
        .maybeSingle();
      if (raced) {
        return NextResponse.json({ game: raced });
      }
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ game: inserted });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "BGG lookup failed" },
      { status: 502 }
    );
  }
}
