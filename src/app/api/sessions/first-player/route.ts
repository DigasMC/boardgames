import { NextResponse } from "next/server";
import {
  FIRST_PLAYER_ITEM_HEIGHT,
  FIRST_PLAYER_REEL_LENGTH,
  FIRST_PLAYER_SPIN_MS,
  buildReelItems,
  pickUniformRandom,
} from "@/lib/collection/reel";
import { requireRouteUser, requireScopes } from "@/lib/supabase/route-auth";

type PlayerRow = {
  id: string;
  display_name: string;
  user_id: string | null;
  team_id: string | null;
};

export async function POST(request: Request) {
  const auth = await requireRouteUser(request);
  if (!auth.ok) return auth.response;
  const scopeError = requireScopes(auth.ctx, ["sessions:read"]);
  if (scopeError) return scopeError;
  const { user, db } = auth.ctx;

  let body: {
    sessionId?: unknown;
    excludePlayerIds?: unknown;
  } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const sessionId =
    typeof body.sessionId === "string" ? body.sessionId.trim() : "";
  if (!sessionId) {
    return NextResponse.json(
      { error: "sessionId required", code: "validation" },
      { status: 400 }
    );
  }

  const excludePlayerIds = Array.isArray(body.excludePlayerIds)
    ? body.excludePlayerIds.filter((id): id is string => typeof id === "string")
    : [];

  const { data: session, error: sessionError } = await db
    .from("sessions")
    .select("id, host_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (sessionError) {
    return NextResponse.json({ error: sessionError.message }, { status: 500 });
  }
  if (!session) {
    return NextResponse.json(
      { error: "Not found", code: "not_found" },
      { status: 404 }
    );
  }

  // Host or participant may pick (matches session visibility); host always ok.
  if (session.host_id !== user.id) {
    const { data: seat } = await db
      .from("session_players")
      .select("id")
      .eq("session_id", sessionId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!seat) {
      return NextResponse.json(
        { error: "Not found", code: "not_found" },
        { status: 404 }
      );
    }
  }

  const { data: players, error: playersError } = await db
    .from("session_players")
    .select("id, display_name, user_id, team_id")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (playersError) {
    return NextResponse.json({ error: playersError.message }, { status: 500 });
  }

  const pool = (players ?? []) as PlayerRow[];
  if (pool.length === 0) {
    return NextResponse.json(
      {
        error: "Session has no players on the roster",
        code: "validation",
      },
      { status: 400 }
    );
  }

  const chosen = pickUniformRandom(pool, excludePlayerIds);
  if (!chosen) {
    return NextResponse.json(
      { error: "No players available to pick", code: "validation" },
      { status: 400 }
    );
  }

  const reelPlayers = buildReelItems(pool, chosen, FIRST_PLAYER_REEL_LENGTH);
  const reel = reelPlayers.map((p) => ({
    id: p.id,
    name: p.display_name,
    thumbnailUrl: null as string | null,
  }));

  return NextResponse.json({
    player: {
      id: chosen.id,
      displayName: chosen.display_name,
      userId: chosen.user_id,
      teamId: chosen.team_id,
    },
    poolSize: pool.length,
    persisted: false,
    text: `First player: **${chosen.display_name}** (not saved in Tablist — ephemeral).`,
    ui: {
      kind: "tablist.first_player_reel",
      version: 1,
      spinMs: FIRST_PLAYER_SPIN_MS,
      itemHeight: FIRST_PLAYER_ITEM_HEIGHT,
      reel,
      chosenIndex: reel.length - 1,
    },
  });
}
