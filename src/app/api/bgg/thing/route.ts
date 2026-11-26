import { NextResponse } from "next/server";
import { fetchBggThing } from "@/lib/bgg/client";
import { requireRouteUser, requireScopes } from "@/lib/supabase/route-auth";

export async function GET(request: Request) {
  const auth = await requireRouteUser(request);
  if (!auth.ok) return auth.response;
  const scopeError = requireScopes(auth.ctx, ["bgg:read"]);
  if (scopeError) return scopeError;
  const { db } = auth.ctx;

  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    const { data: existing } = await db
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

    const { data: inserted, error: insertError } = await db
      .from("games")
      .upsert(rest, { onConflict: "bgg_id" })
      .select("*")
      .single();

    if (insertError) {
      const { data: raced } = await db
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
    const message = err instanceof Error ? err.message : "BGG lookup failed";
    return NextResponse.json(
      {
        error: message,
        code: /401|403|unauthorized|application token/i.test(message)
          ? "bgg_unavailable"
          : undefined,
      },
      { status: 502 }
    );
  }
}
