import { NextResponse } from "next/server";
import { normalizeGameText } from "@/lib/htmlEntities";
import { ensureProfileForUser } from "@/lib/profile/ensureProfile";
import { requireRouteUser } from "@/lib/supabase/route-auth";
import { createClient } from "@/lib/supabase/server";
import type { Game, SessionPlayerInput } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

type SessionWithGames = {
  session_games?: { game?: Game | null }[] | null;
  [key: string]: unknown;
};

const SESSION_SELECT = `
  *,
  host:profiles!sessions_host_id_fkey(id, username, display_name, avatar_url),
  session_games(id, game:games(*)),
  session_players(*, profile:profiles!session_players_user_id_fkey(id, username, display_name, avatar_url)),
  session_teams(*),
  session_scores(*)
`;

function normalizeSessionGames<T extends SessionWithGames>(session: T): T {
  if (!session.session_games) return session;
  return {
    ...session,
    session_games: session.session_games.map((sg) => ({
      ...sg,
      game: sg.game ? normalizeGameText(sg.game) : sg.game,
    })),
  };
}

function parsePlayers(raw: unknown): SessionPlayerInput[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((p) => {
      if (typeof p === "string") {
        const displayName = p.trim();
        return displayName ? { displayName } : null;
      }
      if (p && typeof p === "object") {
        const obj = p as Record<string, unknown>;
        const displayName =
          typeof obj.displayName === "string"
            ? obj.displayName.trim()
            : typeof obj.display_name === "string"
              ? obj.display_name.trim()
              : "";
        if (!displayName) return null;
        const id =
          typeof obj.id === "string" && obj.id.trim()
            ? obj.id.trim()
            : null;
        const userId =
          typeof obj.userId === "string"
            ? obj.userId
            : typeof obj.user_id === "string"
              ? obj.user_id
              : null;
        const teamName =
          typeof obj.teamName === "string"
            ? obj.teamName.trim()
            : typeof obj.team_name === "string"
              ? obj.team_name.trim()
              : null;
        return {
          id,
          displayName,
          userId,
          teamName: teamName || null,
        };
      }
      return null;
    })
    .filter(Boolean) as SessionPlayerInput[];
}

function parseTeamNames(raw: unknown, players: SessionPlayerInput[]): string[] {
  if (Array.isArray(raw)) {
    const fromBody = raw
      .map((t: unknown) =>
        typeof t === "string"
          ? t.trim()
          : t &&
              typeof t === "object" &&
              typeof (t as { name?: string }).name === "string"
            ? (t as { name: string }).name.trim()
            : ""
      )
      .filter(Boolean);
    if (fromBody.length > 0) return fromBody;
  }
  return [
    ...new Set(
      players.map((p) => p.teamName).filter((n): n is string => Boolean(n))
    ),
  ];
}

async function validateLinkedPlayers(
  supabase: SupabaseClient,
  hostId: string,
  players: SessionPlayerInput[]
): Promise<string | null> {
  const friendIds = [
    ...new Set(
      players
        .map((p) => p.userId)
        .filter((id): id is string => Boolean(id) && id !== hostId)
    ),
  ];
  for (const friendId of friendIds) {
    const { data: ok } = await supabase.rpc("are_friends", {
      a: hostId,
      b: friendId,
    });
    if (!ok) {
      return "Can only add accepted friends as linked players";
    }
  }
  return null;
}

function validateTeamRoster(
  scoringMode: "individual" | "team",
  players: SessionPlayerInput[],
  teamNames: string[]
): string | null {
  if (scoringMode !== "team") return null;
  if (teamNames.length < 2) {
    return "Team mode requires at least 2 teams";
  }
  if (players.some((p) => !p.teamName)) {
    return "Every player must be assigned to a team";
  }
  return null;
}

async function replaceSessionRoster(
  supabase: SupabaseClient,
  sessionId: string,
  scoringMode: "individual" | "team",
  players: SessionPlayerInput[],
  teamNames: string[]
): Promise<string | null> {
  const { data: currentSession } = await supabase
    .from("sessions")
    .select("scoring_mode")
    .eq("id", sessionId)
    .maybeSingle();
  const previousMode =
    (currentSession?.scoring_mode as "individual" | "team" | undefined) ??
    "individual";
  const modeChanged = previousMode !== scoringMode;

  const { data: existingScoresRaw } = await supabase
    .from("session_scores")
    .select(
      "player_id, team_id, game_id, score, is_winner, notes"
    )
    .eq("session_id", sessionId);

  const previousScores = (existingScoresRaw ?? []).map((s) => ({
    player_id: (s.player_id as string | null) ?? null,
    team_id: (s.team_id as string | null) ?? null,
    game_id: s.game_id as string,
    score: (s.score as number | null) ?? null,
    is_winner: Boolean(s.is_winner),
    notes: (s.notes as string | null) ?? null,
  }));

  const { data: existingTeams } = await supabase
    .from("session_teams")
    .select("id, name, sort_order")
    .eq("session_id", sessionId);

  const { data: existingPlayers } = await supabase
    .from("session_players")
    .select("id, team_id")
    .eq("session_id", sessionId);

  const existingPlayerIds = new Set(
    (existingPlayers ?? []).map((p) => p.id as string)
  );
  const previousPlayerTeamIds = new Map(
    (existingPlayers ?? []).map(
      (p) => [p.id as string, (p.team_id as string | null) ?? null] as const
    )
  );

  const { error: modeError } = await supabase
    .from("sessions")
    .update({ scoring_mode: scoringMode })
    .eq("id", sessionId);
  if (modeError) return modeError.message;

  const teamIdByName = new Map<string, string>();

  if (scoringMode === "team") {
    const existingByName = new Map(
      (existingTeams ?? []).map((t) => [t.name as string, t.id as string])
    );
    const keepTeamIds = new Set<string>();

    for (let index = 0; index < teamNames.length; index++) {
      const name = teamNames[index]!;
      const existingId = existingByName.get(name);
      if (existingId) {
        keepTeamIds.add(existingId);
        teamIdByName.set(name, existingId);
        const { error } = await supabase
          .from("session_teams")
          .update({ sort_order: index })
          .eq("id", existingId);
        if (error) return error.message;
      } else {
        const { data: created, error } = await supabase
          .from("session_teams")
          .insert({
            session_id: sessionId,
            name,
            sort_order: index,
          })
          .select("id, name")
          .single();
        if (error || !created) {
          return error?.message || "Failed to create team";
        }
        keepTeamIds.add(created.id);
        teamIdByName.set(created.name, created.id);
      }
    }

    const teamsToRemove = (existingTeams ?? []).filter(
      (t) => !keepTeamIds.has(t.id as string)
    );
    if (teamsToRemove.length > 0) {
      const removeIds = teamsToRemove.map((t) => t.id as string);
      const { error: detachError } = await supabase
        .from("session_players")
        .update({ team_id: null })
        .eq("session_id", sessionId)
        .in("team_id", removeIds);
      if (detachError) return detachError.message;

      const { error: deleteTeamsError } = await supabase
        .from("session_teams")
        .delete()
        .in("id", removeIds);
      if (deleteTeamsError) return deleteTeamsError.message;
    }
  }

  const keepPlayerIds = new Set<string>();
  const nextPlayerSeats: { id: string; team_id: string | null }[] = [];

  for (const p of players) {
    const teamId =
      scoringMode === "team" && p.teamName
        ? (teamIdByName.get(p.teamName) ?? null)
        : null;
    const existingId =
      p.id && existingPlayerIds.has(p.id) ? p.id : null;

    if (existingId) {
      keepPlayerIds.add(existingId);
      const { error } = await supabase
        .from("session_players")
        .update({
          display_name: p.displayName,
          user_id: p.userId || null,
          team_id: teamId,
        })
        .eq("id", existingId)
        .eq("session_id", sessionId);
      if (error) return error.message;
      nextPlayerSeats.push({ id: existingId, team_id: teamId });
    } else {
      const { data: created, error } = await supabase
        .from("session_players")
        .insert({
          session_id: sessionId,
          display_name: p.displayName,
          user_id: p.userId || null,
          team_id: teamId,
        })
        .select("id")
        .single();
      if (error || !created) {
        return error?.message || "Failed to add player";
      }
      keepPlayerIds.add(created.id);
      nextPlayerSeats.push({ id: created.id, team_id: teamId });
    }
  }

  const playersToRemove = [...existingPlayerIds].filter(
    (id) => !keepPlayerIds.has(id)
  );
  if (playersToRemove.length > 0) {
    const { error: deletePlayersError } = await supabase
      .from("session_players")
      .delete()
      .in("id", playersToRemove);
    if (deletePlayersError) return deletePlayersError.message;
  }

  // Drop teams only after remapping when leaving team mode
  if (scoringMode === "individual" && (existingTeams ?? []).length > 0) {
    // Players already have team_id null from updates above
    const { error: deleteTeamsError } = await supabase
      .from("session_teams")
      .delete()
      .eq("session_id", sessionId);
    if (deleteTeamsError) return deleteTeamsError.message;
  }

  if (modeChanged && previousScores.length > 0) {
    const { remapScoresAfterRosterChange } = await import(
      "@/lib/sessions/scoreRemap"
    );
    const remapped = remapScoresAfterRosterChange({
      previousMode,
      nextMode: scoringMode,
      sessionId,
      previousScores,
      nextPlayers: nextPlayerSeats,
      previousPlayerTeamIds,
    });

    const { error: clearError } = await supabase
      .from("session_scores")
      .delete()
      .eq("session_id", sessionId);
    if (clearError) return clearError.message;

    if (remapped.length > 0) {
      const { error: insertError } = await supabase
        .from("session_scores")
        .insert(
          remapped.map((row) => ({
            session_id: row.session_id,
            player_id: row.player_id,
            team_id: row.team_id,
            game_id: row.game_id,
            score: row.score,
            is_winner: row.is_winner,
            notes: row.notes,
          }))
        );
      if (insertError) return insertError.message;
    }
  }

  return null;
}

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
      .select(SESSION_SELECT)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ session: normalizeSessionGames(data) });
  }

  const { data, error } = await supabase
    .from("sessions")
    .select(SESSION_SELECT)
    .order("session_date", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    sessions: (data ?? []).map((s) => normalizeSessionGames(s)),
  });
}

export async function POST(request: Request) {
  const auth = await requireRouteUser();
  if (!auth.ok) return auth.response;
  const { user, supabase, db } = auth.ctx;

  const profileError = await ensureProfileForUser(db, user);
  if (profileError) {
    return NextResponse.json({ error: profileError }, { status: 500 });
  }

  const body = await request.json();
  const title = (body.title as string)?.trim() || "Game Night";
  const sessionDate = body.sessionDate || new Date().toISOString();
  const location = body.location ?? null;
  const notes = body.notes ?? null;
  const gameId = typeof body.gameId === "string" ? body.gameId.trim() : "";
  const scoringMode =
    body.scoringMode === "team" || body.scoring_mode === "team"
      ? "team"
      : "individual";
  const players = parsePlayers(body.players);
  const teamNames = parseTeamNames(body.teams, players);

  if (!gameId) {
    return NextResponse.json(
      { error: "gameId is required" },
      { status: 400 }
    );
  }

  const teamError = validateTeamRoster(scoringMode, players, teamNames);
  if (teamError) {
    return NextResponse.json({ error: teamError }, { status: 400 });
  }

  const friendError = await validateLinkedPlayers(supabase, user.id, players);
  if (friendError) {
    return NextResponse.json({ error: friendError }, { status: 400 });
  }

  const { data: session, error } = await db
    .from("sessions")
    .insert({
      host_id: user.id,
      title,
      session_date: sessionDate,
      location,
      notes,
      status: "planned",
      scoring_mode: scoringMode,
    })
    .select("*")
    .single();

  if (error || !session) {
    return NextResponse.json(
      { error: error?.message || "Failed to create session" },
      { status: 500 }
    );
  }

  const { error: gamesError } = await db.from("session_games").insert({
    session_id: session.id,
    game_id: gameId,
    sort_order: 0,
  });
  if (gamesError) {
    return NextResponse.json({ error: gamesError.message }, { status: 500 });
  }

  const rosterError = await replaceSessionRoster(
    db,
    session.id,
    scoringMode,
    players,
    teamNames
  );
  // Fresh session has no players/teams yet — replace still works (deletes nothing)
  if (rosterError) {
    return NextResponse.json({ error: rosterError }, { status: 500 });
  }

  const { data: full } = await supabase
    .from("sessions")
    .select(SESSION_SELECT)
    .eq("id", session.id)
    .single();

  return NextResponse.json({
    session: full ? normalizeSessionGames(full) : session,
  });
}

export async function PATCH(request: Request) {
  const auth = await requireRouteUser();
  if (!auth.ok) return auth.response;
  const { user, supabase, db } = auth.ctx;

  const body = await request.json();
  const sessionId = body.sessionId as string;
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const { data: owned } = await db
    .from("sessions")
    .select("id, scoring_mode, host_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (!owned || owned.host_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (
    body.status ||
    body.title ||
    body.notes ||
    body.location ||
    body.sessionDate
  ) {
    const updates: Record<string, unknown> = {};
    if (body.status) updates.status = body.status;
    if (body.title) updates.title = body.title;
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.location !== undefined) updates.location = body.location;
    if (body.sessionDate) updates.session_date = body.sessionDate;

    const { error } = await db
      .from("sessions")
      .update(updates)
      .eq("id", sessionId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  const hasRoster =
    Array.isArray(body.players) ||
    "scoringMode" in body ||
    "scoring_mode" in body ||
    Array.isArray(body.teams);

  if (hasRoster) {
    const players = Array.isArray(body.players)
      ? parsePlayers(body.players)
      : null;

    if (players !== null && players.length === 0) {
      return NextResponse.json(
        { error: "Add at least one player" },
        { status: 400 }
      );
    }

    const scoringMode: "individual" | "team" =
      body.scoringMode === "team" || body.scoring_mode === "team"
        ? "team"
        : body.scoringMode === "individual" ||
            body.scoring_mode === "individual"
          ? "individual"
          : ((owned.scoring_mode as "individual" | "team") ?? "individual");

    // If only mode/teams without players, load existing players to reassign
    let rosterPlayers = players;
    if (!rosterPlayers) {
      const { data: existingPlayers } = await db
        .from("session_players")
        .select("display_name, user_id, team_id")
        .eq("session_id", sessionId);
      const { data: existingTeams } = await db
        .from("session_teams")
        .select("id, name")
        .eq("session_id", sessionId);
      const teamNameById = new Map(
        (existingTeams ?? []).map((t) => [t.id as string, t.name as string])
      );
      rosterPlayers = (existingPlayers ?? []).map((p) => ({
        displayName: p.display_name as string,
        userId: (p.user_id as string | null) ?? null,
        teamName: p.team_id
          ? (teamNameById.get(p.team_id as string) ?? null)
          : null,
      }));
    }

    const teamNames = parseTeamNames(body.teams, rosterPlayers);
    const teamError = validateTeamRoster(
      scoringMode,
      rosterPlayers,
      teamNames
    );
    if (teamError) {
      return NextResponse.json({ error: teamError }, { status: 400 });
    }

    const friendError = await validateLinkedPlayers(
      supabase,
      user.id,
      rosterPlayers
    );
    if (friendError) {
      return NextResponse.json({ error: friendError }, { status: 400 });
    }

    const rosterError = await replaceSessionRoster(
      db,
      sessionId,
      scoringMode,
      rosterPlayers,
      teamNames
    );
    if (rosterError) {
      return NextResponse.json({ error: rosterError }, { status: 500 });
    }
  }

  if (Array.isArray(body.scores)) {
    const rows = body.scores
      .map(
        (s: {
          playerId?: string | null;
          teamId?: string | null;
          gameId: string;
          score: number | null;
          isWinner?: boolean;
          notes?: string | null;
        }) => {
          const playerId = s.playerId ?? null;
          const teamId = s.teamId ?? null;
          if ((playerId && teamId) || (!playerId && !teamId)) return null;
          return {
            session_id: sessionId,
            player_id: playerId,
            team_id: teamId,
            game_id: s.gameId,
            score: s.score,
            is_winner: Boolean(s.isWinner),
            notes: s.notes ?? null,
          };
        }
      )
      .filter(Boolean) as Array<{
      session_id: string;
      player_id: string | null;
      team_id: string | null;
      game_id: string;
      score: number | null;
      is_winner: boolean;
      notes: string | null;
    }>;

    if (rows.length > 0) {
      const { error: clearError } = await db
        .from("session_scores")
        .delete()
        .eq("session_id", sessionId)
        .eq("game_id", rows[0]!.game_id);
      if (clearError) {
        return NextResponse.json({ error: clearError.message }, { status: 500 });
      }
      const { error: insertError } = await db
        .from("session_scores")
        .insert(rows);
      if (insertError) {
        return NextResponse.json(
          { error: insertError.message },
          { status: 500 }
        );
      }
    }
  }

  const { data: full } = await supabase
    .from("sessions")
    .select(SESSION_SELECT)
    .eq("id", sessionId)
    .single();

  return NextResponse.json({
    session: full ? normalizeSessionGames(full) : full,
  });
}

export async function DELETE(request: Request) {
  const auth = await requireRouteUser();
  if (!auth.ok) return auth.response;
  const { user, db } = auth.ctx;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const { data, error } = await db
    .from("sessions")
    .delete()
    .eq("id", id)
    .eq("host_id", user.id)
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
