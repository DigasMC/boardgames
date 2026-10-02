import type {
  CollectionGame,
  Game,
  SessionPlayer,
  SessionPlayerInput,
  SessionScore,
  SessionTeam,
} from "@/types/database";
import type { SessionHistoryRow } from "@/components/SessionHistoryCard";
import { LOCAL_SESSION_HOST_ID } from "@/lib/sessions/host";
import { createClient } from "@/lib/supabase/client";
import type { GameSessionHistoryItem } from "@/components/GameDetails";
import { enqueueOutbox } from "./outbox";
import {
  readCollectionSnapshot,
  readSession,
  readSessionsSnapshot,
  removeCollectionGame,
  removeSession,
  upsertCollectionGame,
  upsertSession,
} from "./snapshot";
import { flushOutbox, refreshPendingCount } from "./sync";

function isOnline() {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

async function tryOnline<T>(fn: () => Promise<T>): Promise<T | null> {
  if (!isOnline()) return null;
  try {
    return await fn();
  } catch {
    return null;
  }
}

function normalizePlayerInputs(
  players: string[] | SessionPlayerInput[]
): SessionPlayerInput[] {
  return players
    .map((p) => {
      if (typeof p === "string") {
        const displayName = p.trim();
        return displayName ? { displayName } : null;
      }
      const displayName = p.displayName?.trim();
      if (!displayName) return null;
      return {
        id: p.id ?? null,
        displayName,
        userId: p.userId ?? null,
        teamName: p.teamName ?? null,
      };
    })
    .filter(Boolean) as SessionPlayerInput[];
}

export async function addGameToCollection(input: {
  bggId: number;
  name?: string;
  isWishlist?: boolean;
  notes?: string | null;
}): Promise<{ queued: boolean; game?: CollectionGame; itemId?: string }> {
  const onlineResult = await tryOnline(async () => {
    const res = await fetch("/api/collection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bggId: input.bggId,
        isWishlist: input.isWishlist,
        notes: input.notes,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not add game");
    const game = data.game as Game;
    const itemId = data.itemId as string;
    const collectionGame: CollectionGame = {
      ...game,
      collection_item_id: itemId,
      notes: input.notes ?? null,
      is_wishlist: Boolean(input.isWishlist),
    };
    await upsertCollectionGame(collectionGame);
    return { game: collectionGame, itemId };
  });

  if (onlineResult) {
    await refreshPendingCount();
    return { queued: false, ...onlineResult };
  }

  const tempItemId = crypto.randomUUID();
  const now = new Date().toISOString();
  const optimistic: CollectionGame = {
    id: crypto.randomUUID(),
    bgg_id: input.bggId,
    name: input.name ?? `BGG #${input.bggId}`,
    description: null,
    image_url: null,
    thumbnail_url: null,
    min_players: null,
    max_players: null,
    min_playtime: null,
    max_playtime: null,
    playing_time: null,
    weight: null,
    bgg_rating: null,
    year_published: null,
    categories: [],
    mechanics: [],
    bgg_files: [],
    bgg_files_fetched_at: null,
    fetched_at: now,
    created_at: now,
    updated_at: now,
    collection_item_id: tempItemId,
    notes: input.notes ?? null,
    is_wishlist: Boolean(input.isWishlist),
  };
  await upsertCollectionGame(optimistic);
  await enqueueOutbox({
    type: "collection:add",
    payload: {
      bggId: input.bggId,
      isWishlist: input.isWishlist,
      notes: input.notes,
      game: optimistic,
    },
  });
  await refreshPendingCount();
  if (isOnline()) void flushOutbox();
  return { queued: true, game: optimistic, itemId: tempItemId };
}

export async function removeGameFromCollection(itemId: string): Promise<{
  queued: boolean;
}> {
  await removeCollectionGame(itemId);

  const onlineResult = await tryOnline(async () => {
    const res = await fetch(
      `/api/collection?itemId=${encodeURIComponent(itemId)}`,
      { method: "DELETE" }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok && res.status !== 404) {
      throw new Error(data.error || "Could not remove game");
    }
    return true;
  });

  if (onlineResult) {
    await refreshPendingCount();
    return { queued: false };
  }

  await enqueueOutbox({
    type: "collection:remove",
    payload: { itemId },
  });
  await refreshPendingCount();
  if (isOnline()) void flushOutbox();
  return { queued: true };
}

export async function createSessionOfflineAware(input: {
  title: string;
  sessionDate: string;
  location: string | null;
  notes: string | null;
  gameId: string;
  players: string[] | SessionPlayerInput[];
  scoringMode?: "individual" | "team";
  teams?: string[];
}): Promise<{ queued: boolean; session: SessionHistoryRow }> {
  const scoringMode = input.scoringMode ?? "individual";
  const playerInputs = normalizePlayerInputs(input.players);
  const teamNames =
    scoringMode === "team"
      ? (input.teams ?? []).map((t) => t.trim()).filter(Boolean)
      : [];

  if (isOnline()) {
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: input.title,
        sessionDate: input.sessionDate,
        location: input.location,
        notes: input.notes,
        gameId: input.gameId,
        scoringMode,
        teams: teamNames,
        players: playerInputs,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to create session");
    }
    const session = data.session as SessionHistoryRow;
    await upsertSession(session);
    await refreshPendingCount();
    return { queued: false, session };
  }

  const games = await readCollectionSnapshot();
  const game = games.find((g) => g.id === input.gameId);
  if (!game) {
    throw new Error(
      "Game not available offline. Open your collection while online first."
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const hostId = user?.id ?? LOCAL_SESSION_HOST_ID;
  let hostProfile: SessionHistoryRow["host"] = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle();
    if (profile) {
      hostProfile = profile;
    }
  }

  const tempId = crypto.randomUUID();
  const now = new Date().toISOString();
  const localTeams: SessionTeam[] = teamNames.map((name, index) => ({
    id: crypto.randomUUID(),
    session_id: tempId,
    name,
    sort_order: index,
    created_at: now,
  }));
  const teamIdByName = new Map(localTeams.map((t) => [t.name, t.id]));

  const players: SessionPlayer[] = playerInputs.map((p) => ({
    id: crypto.randomUUID(),
    session_id: tempId,
    display_name: p.displayName,
    user_id: p.userId ?? null,
    team_id:
      scoringMode === "team" && p.teamName
        ? (teamIdByName.get(p.teamName) ?? null)
        : null,
    color: null,
    created_at: now,
  }));

  const session: SessionHistoryRow = {
    id: tempId,
    host_id: hostId,
    host: hostProfile,
    title: input.title,
    session_date: input.sessionDate,
    location: input.location,
    notes: input.notes,
    status: "planned",
    scoring_mode: scoringMode,
    created_at: now,
    updated_at: now,
    session_games: [{ id: crypto.randomUUID(), game }],
    session_players: players,
    session_teams: localTeams,
    session_scores: [],
  };

  await upsertSession(session);
  await enqueueOutbox({
    type: "session:create",
    payload: {
      tempId,
      title: input.title,
      sessionDate: input.sessionDate,
      location: input.location,
      notes: input.notes,
      gameId: input.gameId,
      scoringMode,
      teams: teamNames,
      players: playerInputs,
    },
  });
  await refreshPendingCount();
  if (isOnline()) void flushOutbox();
  return { queued: true, session };
}

export async function patchSessionOfflineAware(input: {
  sessionId: string;
  status?: string;
  title?: string;
  notes?: string | null;
  location?: string | null;
  sessionDate?: string;
  scoringMode?: "individual" | "team";
  teams?: string[];
  players?: SessionPlayerInput[];
  scores?: {
    playerId?: string;
    teamId?: string;
    gameId: string;
    score: number | null;
    isWinner: boolean;
  }[];
}): Promise<{ queued: boolean; session: SessionHistoryRow }> {
  const existing = await readSession(input.sessionId);
  if (!existing) {
    throw new Error("Session not found locally");
  }

  const now = new Date().toISOString();
  let nextScores = existing.session_scores ?? [];
  let nextPlayers = existing.session_players ?? [];
  let nextTeams = existing.session_teams ?? [];
  let nextMode = existing.scoring_mode ?? "individual";

  if (input.players) {
    const previousMode = existing.scoring_mode ?? "individual";
    nextMode = input.scoringMode ?? previousMode;
    const modeChanged = previousMode !== nextMode;

    const existingTeams = existing.session_teams ?? [];
    const previousScores = (existing.session_scores ?? []).map((s) => ({
      player_id: s.player_id,
      team_id: s.team_id,
      game_id: s.game_id,
      score: s.score,
      is_winner: s.is_winner,
      notes: s.notes,
    }));
    const previousPlayerTeamIds = new Map(
      (existing.session_players ?? []).map(
        (p) => [p.id, p.team_id] as const
      )
    );

    const teamNames =
      nextMode === "team"
        ? (input.teams ?? []).map((t) => t.trim()).filter(Boolean)
        : [];

    if (nextMode === "team") {
      const byName = new Map(existingTeams.map((t) => [t.name, t]));
      nextTeams = teamNames.map((name, index) => {
        const prev = byName.get(name);
        return {
          id: prev?.id ?? crypto.randomUUID(),
          session_id: input.sessionId,
          name,
          sort_order: index,
          created_at: prev?.created_at ?? now,
        };
      });
    } else {
      nextTeams = [];
    }

    const teamIdByName = new Map(nextTeams.map((t) => [t.name, t.id]));
    const existingById = new Map(
      (existing.session_players ?? []).map((p) => [p.id, p])
    );
    const keepIds = new Set<string>();

    nextPlayers = input.players.map((p) => {
      const prev = p.id ? existingById.get(p.id) : undefined;
      const id = prev?.id ?? crypto.randomUUID();
      keepIds.add(id);
      return {
        id,
        session_id: input.sessionId,
        display_name: p.displayName,
        user_id: p.userId ?? null,
        team_id:
          nextMode === "team" && p.teamName
            ? (teamIdByName.get(p.teamName) ?? null)
            : null,
        color: prev?.color ?? null,
        created_at: prev?.created_at ?? now,
        profile: prev?.profile,
      };
    });

    if (modeChanged) {
      const { remapScoresAfterRosterChange } = await import(
        "@/lib/sessions/scoreRemap"
      );
      nextScores = remapScoresAfterRosterChange({
        previousMode,
        nextMode,
        sessionId: input.sessionId,
        previousScores,
        nextPlayers: nextPlayers.map((p) => ({
          id: p.id,
          team_id: p.team_id,
        })),
        previousPlayerTeamIds,
        now,
      });
    } else {
      const keepTeamIds = new Set(nextTeams.map((t) => t.id));
      nextScores = (existing.session_scores ?? []).filter((s) => {
        if (s.player_id) return keepIds.has(s.player_id);
        if (s.team_id) return keepTeamIds.has(s.team_id);
        return false;
      });
    }
  } else if (input.scores) {
    const next: SessionScore[] = [];
    for (const row of input.scores) {
      const prev = nextScores.find(
        (s) =>
          (row.playerId && s.player_id === row.playerId) ||
          (row.teamId && s.team_id === row.teamId)
      );
      next.push({
        id: prev?.id ?? crypto.randomUUID(),
        session_id: input.sessionId,
        player_id: row.playerId ?? null,
        team_id: row.teamId ?? null,
        game_id: row.gameId,
        score: row.score,
        is_winner: row.isWinner,
        notes: prev?.notes ?? null,
        created_at: prev?.created_at ?? now,
      });
    }
    nextScores = next;
  }

  const optimistic: SessionHistoryRow = {
    ...existing,
    scoring_mode: nextMode,
    status: (input.status as SessionHistoryRow["status"]) ?? existing.status,
    title: input.title ?? existing.title,
    notes: input.notes !== undefined ? input.notes : existing.notes,
    location: input.location !== undefined ? input.location : existing.location,
    session_date: input.sessionDate ?? existing.session_date,
    updated_at: now,
    session_players: nextPlayers,
    session_teams: nextTeams,
    session_scores: nextScores,
  };
  await upsertSession(optimistic);

  const onlineResult = await tryOnline(async () => {
    const res = await fetch("/api/sessions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Save failed");
    const session = data.session as SessionHistoryRow;
    await upsertSession(session);
    return session;
  });

  if (onlineResult) {
    await refreshPendingCount();
    return { queued: false, session: onlineResult };
  }

  await enqueueOutbox({
    type: "session:patch",
    payload: input,
  });
  await refreshPendingCount();
  if (isOnline()) void flushOutbox();
  return { queued: true, session: optimistic };
}

export async function deleteSessionOfflineAware(sessionId: string): Promise<{
  queued: boolean;
}> {
  await removeSession(sessionId);

  const onlineResult = await tryOnline(async () => {
    const res = await fetch(
      `/api/sessions?id=${encodeURIComponent(sessionId)}`,
      { method: "DELETE" }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok && res.status !== 404) {
      throw new Error(data.error || "Could not delete session");
    }
    return true;
  });

  if (onlineResult) {
    await refreshPendingCount();
    return { queued: false };
  }

  await enqueueOutbox({
    type: "session:delete",
    payload: { sessionId },
  });
  await refreshPendingCount();
  if (isOnline()) void flushOutbox();
  return { queued: true };
}

export async function loadSessionOfflineAware(
  sessionId: string
): Promise<SessionHistoryRow> {
  if (isOnline()) {
    try {
      const res = await fetch(`/api/sessions?id=${encodeURIComponent(sessionId)}`);
      const data = await res.json();
      if (res.ok && data.session) {
        await upsertSession(data.session);
        return data.session as SessionHistoryRow;
      }
    } catch {
      // fall through
    }
  }
  const local = await readSession(sessionId);
  if (!local) throw new Error("Session unavailable offline");
  return local;
}

export async function loadCollectionOfflineAware(
  initial?: CollectionGame[]
): Promise<CollectionGame[]> {
  if (initial && initial.length > 0) {
    await import("./snapshot").then((m) =>
      m.saveCollectionSnapshot(initial)
    );
    return initial;
  }
  if (isOnline()) {
    try {
      const res = await fetch("/api/collection");
      const data = await res.json();
      if (res.ok) {
        const games = (data.games ?? []) as CollectionGame[];
        await import("./snapshot").then((m) =>
          m.saveCollectionSnapshot(games, data.collectionId ?? null)
        );
        return games;
      }
    } catch {
      // fall through
    }
  }
  return readCollectionSnapshot();
}

function historyFromSessions(
  gameId: string,
  sessions: SessionHistoryRow[]
): GameSessionHistoryItem[] {
  return sessions
    .filter((session) =>
      (session.session_games ?? []).some((sg) => sg.game?.id === gameId)
    )
    .map((session) => {
      const players = session.session_players ?? [];
      const teams = session.session_teams ?? [];
      const scores = (session.session_scores ?? []).filter(
        (s) => s.game_id === gameId
      );
      const winnerScore =
        scores.find((s) => s.is_winner) ??
        [...scores].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];
      let winnerName: string | null = null;
      if (winnerScore?.team_id) {
        winnerName =
          teams.find((t) => t.id === winnerScore.team_id)?.name ?? null;
      } else if (winnerScore?.player_id) {
        winnerName =
          players.find((p) => p.id === winnerScore.player_id)?.display_name ??
          null;
      }

      return {
        id: session.id,
        session_date: session.session_date,
        playerCount: players.length,
        playerNames: players.map((p) => p.display_name),
        winnerName,
        winnerScore: winnerScore?.score ?? null,
      } satisfies GameSessionHistoryItem;
    })
    .sort(
      (a, b) =>
        new Date(b.session_date).getTime() - new Date(a.session_date).getTime()
    )
    .slice(0, 10);
}

export async function loadGameOfflineAware(gameId: string): Promise<{
  game: CollectionGame;
  sessions: GameSessionHistoryItem[];
}> {
  if (isOnline()) {
    try {
      const games = await loadCollectionOfflineAware();
      const game = games.find((g) => g.id === gameId);
      if (game) {
        const sessions = await readSessionsSnapshot();
        // Prefer fresh sessions list when online
        try {
          const res = await fetch("/api/sessions");
          const data = await res.json();
          if (res.ok && data.sessions) {
            await import("./snapshot").then((m) =>
              m.saveSessionsSnapshot(data.sessions as SessionHistoryRow[])
            );
            return {
              game,
              sessions: historyFromSessions(
                gameId,
                data.sessions as SessionHistoryRow[]
              ),
            };
          }
        } catch {
          // fall through to local sessions
        }
        return { game, sessions: historyFromSessions(gameId, sessions) };
      }
    } catch {
      // fall through
    }
  }

  const [games, sessions] = await Promise.all([
    readCollectionSnapshot(),
    readSessionsSnapshot(),
  ]);
  const game = games.find((g) => g.id === gameId);
  if (!game) throw new Error("Game unavailable offline");
  return { game, sessions: historyFromSessions(gameId, sessions) };
}
