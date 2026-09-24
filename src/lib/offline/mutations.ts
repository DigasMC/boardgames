import type { CollectionGame, Game, SessionPlayer, SessionScore } from "@/types/database";
import type { SessionHistoryRow } from "@/components/SessionHistoryCard";
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
  players: string[];
}): Promise<{ queued: boolean; session: SessionHistoryRow }> {
  const onlineResult = await tryOnline(async () => {
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to create session");
    const session = data.session as SessionHistoryRow;
    await upsertSession(session);
    return session;
  });

  if (onlineResult) {
    await refreshPendingCount();
    return { queued: false, session: onlineResult };
  }

  const games = await readCollectionSnapshot();
  const game = games.find((g) => g.id === input.gameId);
  if (!game) {
    throw new Error(
      "Game not available offline. Open your collection while online first."
    );
  }

  const tempId = crypto.randomUUID();
  const now = new Date().toISOString();
  const players: SessionPlayer[] = input.players.map((name) => ({
    id: crypto.randomUUID(),
    session_id: tempId,
    display_name: name,
    user_id: null,
    color: null,
    created_at: now,
  }));

          const session: SessionHistoryRow = {
    id: tempId,
    host_id: "local",
    title: input.title,
    session_date: input.sessionDate,
    location: input.location,
    notes: input.notes,
    status: "planned",
    created_at: now,
    updated_at: now,
    session_games: [{ id: crypto.randomUUID(), game }],
    session_players: players,
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
      players: input.players,
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
  scores?: {
    playerId: string;
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
  if (input.scores) {
    const byPlayer = new Map(nextScores.map((s) => [s.player_id, s]));
    for (const row of input.scores) {
      const prev = byPlayer.get(row.playerId);
      const score: SessionScore = {
        id: prev?.id ?? crypto.randomUUID(),
        session_id: input.sessionId,
        player_id: row.playerId,
        game_id: row.gameId,
        score: row.score,
        is_winner: row.isWinner,
        notes: prev?.notes ?? null,
        created_at: prev?.created_at ?? now,
      };
      byPlayer.set(row.playerId, score);
    }
    nextScores = [...byPlayer.values()];
  }

  const optimistic: SessionHistoryRow = {
    ...existing,
    status: (input.status as SessionHistoryRow["status"]) ?? existing.status,
    title: input.title ?? existing.title,
    notes: input.notes !== undefined ? input.notes : existing.notes,
    location: input.location !== undefined ? input.location : existing.location,
    session_date: input.sessionDate ?? existing.session_date,
    updated_at: now,
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
      const scores = (session.session_scores ?? []).filter(
        (s) => s.game_id === gameId
      );
      const winnerScore =
        scores.find((s) => s.is_winner) ??
        [...scores].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];
      const winnerPlayer = winnerScore
        ? players.find((p) => p.id === winnerScore.player_id)
        : null;

      return {
        id: session.id,
        session_date: session.session_date,
        playerCount: players.length,
        playerNames: players.map((p) => p.display_name),
        winnerName: winnerPlayer?.display_name ?? null,
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
