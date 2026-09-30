import type { SessionScore } from "@/types/database";

type ScoreRow = Pick<
  SessionScore,
  | "id"
  | "session_id"
  | "player_id"
  | "team_id"
  | "game_id"
  | "score"
  | "is_winner"
  | "notes"
  | "created_at"
>;

type PlayerSeat = {
  id: string;
  team_id: string | null;
};

/** Snapshot of scores before roster/mode changes. */
export type ScoreSnapshot = {
  player_id: string | null;
  team_id: string | null;
  game_id: string;
  score: number | null;
  is_winner: boolean;
  notes: string | null;
};

/**
 * Remap scores when switching individual ↔ team.
 * - individual → team: sum member scores per team; winner if any member won
 * - team → individual: copy team score/winner onto each member
 * - same mode: keep scores for surviving player/team ids
 */
export function remapScoresAfterRosterChange(input: {
  previousMode: "individual" | "team";
  nextMode: "individual" | "team";
  sessionId: string;
  previousScores: ScoreSnapshot[];
  /** Players after update, with final team_id (null in individual mode). */
  nextPlayers: PlayerSeat[];
  /** For team→individual: player id → team id they had before detach. */
  previousPlayerTeamIds?: Map<string, string | null>;
  now?: string;
}): ScoreRow[] {
  const {
    previousMode,
    nextMode,
    sessionId,
    previousScores,
    nextPlayers,
    previousPlayerTeamIds,
    now = new Date().toISOString(),
  } = input;

  const keepPlayerIds = new Set(nextPlayers.map((p) => p.id));

  if (previousMode === nextMode) {
    if (nextMode === "individual") {
      return previousScores
        .filter((s) => s.player_id && keepPlayerIds.has(s.player_id))
        .map((s) => ({
          id: crypto.randomUUID(),
          session_id: sessionId,
          player_id: s.player_id,
          team_id: null,
          game_id: s.game_id,
          score: s.score,
          is_winner: s.is_winner,
          notes: s.notes,
          created_at: now,
        }));
    }
    const keepTeamIds = new Set(
      nextPlayers.map((p) => p.team_id).filter(Boolean) as string[]
    );
    return previousScores
      .filter((s) => s.team_id && keepTeamIds.has(s.team_id))
      .map((s) => ({
        id: crypto.randomUUID(),
        session_id: sessionId,
        player_id: null,
        team_id: s.team_id,
        game_id: s.game_id,
        score: s.score,
        is_winner: s.is_winner,
        notes: s.notes,
        created_at: now,
      }));
  }

  if (previousMode === "individual" && nextMode === "team") {
    type Agg = {
      team_id: string;
      game_id: string;
      score: number | null;
      is_winner: boolean;
      notes: string | null;
    };
    const byKey = new Map<string, Agg>();
    const playerTeam = new Map(
      nextPlayers.map((p) => [p.id, p.team_id] as const)
    );

    for (const s of previousScores) {
      if (!s.player_id) continue;
      const teamId = playerTeam.get(s.player_id);
      if (!teamId) continue;
      const key = `${teamId}:${s.game_id}`;
      const prev = byKey.get(key);
      if (!prev) {
        byKey.set(key, {
          team_id: teamId,
          game_id: s.game_id,
          score: s.score,
          is_winner: s.is_winner,
          notes: s.notes,
        });
        continue;
      }
      if (s.score != null) {
        prev.score = (prev.score ?? 0) + s.score;
      }
      prev.is_winner = prev.is_winner || s.is_winner;
      if (!prev.notes && s.notes) prev.notes = s.notes;
    }

    return [...byKey.values()].map((row) => ({
      id: crypto.randomUUID(),
      session_id: sessionId,
      player_id: null,
      team_id: row.team_id,
      game_id: row.game_id,
      score: row.score,
      is_winner: row.is_winner,
      notes: row.notes,
      created_at: now,
    }));
  }

  // team → individual
  const teamScores = previousScores.filter((s) => s.team_id);
  const teamScoreByKey = new Map<string, ScoreSnapshot>();
  for (const s of teamScores) {
    if (!s.team_id) continue;
    teamScoreByKey.set(`${s.team_id}:${s.game_id}`, s);
  }

  const gameIds = [...new Set(teamScores.map((s) => s.game_id))];
  const rows: ScoreRow[] = [];

  for (const player of nextPlayers) {
    const priorTeamId =
      previousPlayerTeamIds?.get(player.id) ?? player.team_id;
    if (!priorTeamId) continue;
    for (const gameId of gameIds) {
      const teamScore = teamScoreByKey.get(`${priorTeamId}:${gameId}`);
      if (!teamScore) continue;
      rows.push({
        id: crypto.randomUUID(),
        session_id: sessionId,
        player_id: player.id,
        team_id: null,
        game_id: gameId,
        score: teamScore.score,
        is_winner: teamScore.is_winner,
        notes: teamScore.notes,
        created_at: now,
      });
    }
  }

  return rows;
}
