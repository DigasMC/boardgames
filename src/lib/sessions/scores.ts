/** Score row accepted when finishing a session (PATCH) or creating as completed (POST). */
export type SessionScoreInput = {
  playerId?: string | null;
  teamId?: string | null;
  gameId: string;
  score: number | null;
  isWinner?: boolean;
  notes?: string | null;
};

/**
 * Create-time scores before player/team UUIDs exist.
 * Individual: `playerIndex` into the submitted players array (after trim).
 * Team: `teamName` matching a submitted team.
 */
export type CreateSessionScoreInput = {
  playerIndex?: number;
  teamName?: string | null;
  score: number | null;
  isWinner?: boolean;
  notes?: string | null;
};

/** Same coercion the session detail "Save scores" path uses. */
export function coerceScoreValue(raw: string): number | null {
  if (raw === "") return null;
  return Number(raw);
}

export function parseSessionScoreRows(
  raw: unknown,
  sessionId: string
):
  | { ok: true; rows: Array<{
      session_id: string;
      player_id: string | null;
      team_id: string | null;
      game_id: string;
      score: number | null;
      is_winner: boolean;
      notes: string | null;
    }> }
  | { ok: false; error: string } {
  if (!Array.isArray(raw)) {
    return { ok: false, error: "scores must be an array" };
  }

  const rows = raw
    .map((s) => {
      if (!s || typeof s !== "object") return null;
      const obj = s as Record<string, unknown>;
      const gameId =
        typeof obj.gameId === "string"
          ? obj.gameId
          : typeof obj.game_id === "string"
            ? obj.game_id
            : "";
      if (!gameId) return null;

      const playerId =
        typeof obj.playerId === "string"
          ? obj.playerId
          : typeof obj.player_id === "string"
            ? obj.player_id
            : null;
      const teamId =
        typeof obj.teamId === "string"
          ? obj.teamId
          : typeof obj.team_id === "string"
            ? obj.team_id
            : null;
      if ((playerId && teamId) || (!playerId && !teamId)) return null;

      const scoreRaw = obj.score;
      const score =
        scoreRaw === null || scoreRaw === undefined || scoreRaw === ""
          ? null
          : Number(scoreRaw);

      return {
        session_id: sessionId,
        player_id: playerId,
        team_id: teamId,
        game_id: gameId,
        score: score != null && Number.isNaN(score) ? null : score,
        is_winner: Boolean(obj.isWinner ?? obj.is_winner),
        notes:
          typeof obj.notes === "string" || obj.notes === null
            ? (obj.notes as string | null)
            : null,
      };
    })
    .filter(Boolean) as Array<{
    session_id: string;
    player_id: string | null;
    team_id: string | null;
    game_id: string;
    score: number | null;
    is_winner: boolean;
    notes: string | null;
  }>;

  return { ok: true, rows };
}

export function parseCreateSessionScores(
  raw: unknown
):
  | { ok: true; scores: CreateSessionScoreInput[] }
  | { ok: false; error: string } {
  if (raw == null) return { ok: true, scores: [] };
  if (!Array.isArray(raw)) {
    return { ok: false, error: "scores must be an array" };
  }

  const scores: CreateSessionScoreInput[] = [];
  for (const s of raw) {
    if (!s || typeof s !== "object") {
      return { ok: false, error: "Invalid score entry" };
    }
    const obj = s as Record<string, unknown>;
    const teamName =
      typeof obj.teamName === "string"
        ? obj.teamName.trim()
        : typeof obj.team_name === "string"
          ? obj.team_name.trim()
          : null;
    const playerIndexRaw = obj.playerIndex ?? obj.player_index;
    const playerIndex =
      typeof playerIndexRaw === "number" && Number.isInteger(playerIndexRaw)
        ? playerIndexRaw
        : typeof playerIndexRaw === "string" &&
            playerIndexRaw.trim() !== "" &&
            Number.isInteger(Number(playerIndexRaw))
          ? Number(playerIndexRaw)
          : undefined;

    if (teamName && playerIndex != null) {
      return {
        ok: false,
        error: "Each score must target a playerIndex or teamName, not both",
      };
    }
    if (!teamName && playerIndex == null) {
      return {
        ok: false,
        error: "Each score needs a playerIndex or teamName",
      };
    }
    if (playerIndex != null && playerIndex < 0) {
      return { ok: false, error: "playerIndex must be >= 0" };
    }

    const scoreRaw = obj.score;
    const score =
      scoreRaw === null || scoreRaw === undefined || scoreRaw === ""
        ? null
        : Number(scoreRaw);

    scores.push({
      playerIndex,
      teamName: teamName || null,
      score: score != null && Number.isNaN(score) ? null : score,
      isWinner: Boolean(obj.isWinner ?? obj.is_winner),
      notes:
        typeof obj.notes === "string" || obj.notes === null
          ? (obj.notes as string | null)
          : null,
    });
  }

  return { ok: true, scores };
}

export type ResolvedScoreRow = {
  session_id: string;
  player_id: string | null;
  team_id: string | null;
  game_id: string;
  score: number | null;
  is_winner: boolean;
  notes: string | null;
};

export function resolveCreateScoresToRows(params: {
  sessionId: string;
  gameId: string;
  scoringMode: "individual" | "team";
  scores: CreateSessionScoreInput[];
  playerIdsInOrder: string[];
  teamIdByName: Map<string, string>;
}): { ok: true; rows: ResolvedScoreRow[] } | { ok: false; error: string } {
  const {
    sessionId,
    gameId,
    scoringMode,
    scores,
    playerIdsInOrder,
    teamIdByName,
  } = params;

  const rows: ResolvedScoreRow[] = [];

  for (const s of scores) {
    if (scoringMode === "team") {
      const name = s.teamName?.trim();
      if (!name) {
        return { ok: false, error: "Team scores require teamName" };
      }
      const teamId = teamIdByName.get(name);
      if (!teamId) {
        return { ok: false, error: `Unknown team: ${name}` };
      }
      rows.push({
        session_id: sessionId,
        player_id: null,
        team_id: teamId,
        game_id: gameId,
        score: s.score,
        is_winner: Boolean(s.isWinner),
        notes: s.notes ?? null,
      });
    } else {
      const index = s.playerIndex;
      if (index == null || index < 0 || index >= playerIdsInOrder.length) {
        return {
          ok: false,
          error: `playerIndex out of range (0–${Math.max(playerIdsInOrder.length - 1, 0)})`,
        };
      }
      rows.push({
        session_id: sessionId,
        player_id: playerIdsInOrder[index]!,
        team_id: null,
        game_id: gameId,
        score: s.score,
        is_winner: Boolean(s.isWinner),
        notes: s.notes ?? null,
      });
    }
  }

  return { ok: true, rows };
}
