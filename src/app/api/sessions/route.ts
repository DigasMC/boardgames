import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = new URL(request.url).searchParams.get("id");

  if (id) {
    const { data, error } = await supabase
      .from("sessions")
      .select(
        "*, session_games(id, game:games(*)), session_players(*), session_scores(*)"
      )
      .eq("id", id)
      .eq("host_id", user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ session: data });
  }

  const { data, error } = await supabase
    .from("sessions")
    .select(
      "*, session_games(id, game:games(*)), session_players(*), session_scores(*)"
    )
    .eq("host_id", user.id)
    .order("session_date", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sessions: data ?? [] });
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
  const title = (body.title as string)?.trim() || "Game Night";
  const sessionDate = body.sessionDate || new Date().toISOString();
  const location = body.location ?? null;
  const notes = body.notes ?? null;
  const gameIds: string[] = Array.isArray(body.gameIds) ? body.gameIds : [];
  const players: string[] = Array.isArray(body.players) ? body.players : [];

  const { data: session, error } = await supabase
    .from("sessions")
    .insert({
      host_id: user.id,
      title,
      session_date: sessionDate,
      location,
      notes,
      status: "planned",
    })
    .select("*")
    .single();

  if (error || !session) {
    return NextResponse.json(
      { error: error?.message || "Failed to create session" },
      { status: 500 }
    );
  }

  if (gameIds.length > 0) {
    const { error: gamesError } = await supabase.from("session_games").insert(
      gameIds.map((gameId, index) => ({
        session_id: session.id,
        game_id: gameId,
        sort_order: index,
      }))
    );
    if (gamesError) {
      return NextResponse.json({ error: gamesError.message }, { status: 500 });
    }
  }

  if (players.length > 0) {
    const { error: playersError } = await supabase
      .from("session_players")
      .insert(
        players.map((display_name) => ({
          session_id: session.id,
          display_name,
        }))
      );
    if (playersError) {
      return NextResponse.json({ error: playersError.message }, { status: 500 });
    }
  }

  const { data: full } = await supabase
    .from("sessions")
    .select(
      "*, session_games(id, game:games(*)), session_players(*), session_scores(*)"
    )
    .eq("id", session.id)
    .single();

  return NextResponse.json({ session: full ?? session });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const sessionId = body.sessionId as string;
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const { data: owned } = await supabase
    .from("sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("host_id", user.id)
    .maybeSingle();

  if (!owned) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (body.status || body.title || body.notes || body.location || body.sessionDate) {
    const updates: Record<string, unknown> = {};
    if (body.status) updates.status = body.status;
    if (body.title) updates.title = body.title;
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.location !== undefined) updates.location = body.location;
    if (body.sessionDate) updates.session_date = body.sessionDate;

    const { error } = await supabase
      .from("sessions")
      .update(updates)
      .eq("id", sessionId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  if (Array.isArray(body.scores)) {
    const rows = body.scores.map(
      (s: {
        playerId: string;
        gameId: string;
        score: number | null;
        isWinner?: boolean;
        notes?: string | null;
      }) => ({
        session_id: sessionId,
        player_id: s.playerId,
        game_id: s.gameId,
        score: s.score,
        is_winner: Boolean(s.isWinner),
        notes: s.notes ?? null,
      })
    );

    if (rows.length > 0) {
      const { error } = await supabase
        .from("session_scores")
        .upsert(rows, { onConflict: "session_id,player_id,game_id" });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }
  }

  const { data: full } = await supabase
    .from("sessions")
    .select(
      "*, session_games(id, game:games(*)), session_players(*), session_scores(*)"
    )
    .eq("id", sessionId)
    .single();

  return NextResponse.json({ session: full });
}
