import type { CollectionGame } from "@/types/database";
import type { SessionHistoryRow } from "@/components/SessionHistoryCard";
import { listOutbox, removeOutbox } from "./outbox";
import {
  getMeta,
  readCollectionSnapshot,
  readSessionsSnapshot,
  saveCollectionSnapshot,
  saveSessionsSnapshot,
  setMeta,
  upsertSession,
  removeSession,
} from "./snapshot";
import type { OutboxOp } from "./db";
import { warmOfflineAssets } from "./warm";

/** How often to re-pull snapshots + warm the offline pack while the app is open. */
export const PERIODIC_SYNC_MS = 3 * 60 * 60 * 1000;

export type SyncState = {
  syncing: boolean;
  warming: boolean;
  pending: number;
  online: boolean;
  lastError: string | null;
  lastSync: string | null;
  lastWarm: string | null;
};

type SyncListener = (state: SyncState) => void;

const syncListeners = new Set<SyncListener>();

let state: SyncState = {
  syncing: false,
  warming: false,
  pending: 0,
  online: typeof navigator !== "undefined" ? navigator.onLine : true,
  lastError: null,
  lastSync: null,
  lastWarm: null,
};

let flushPromise: Promise<void> | null = null;

function emit() {
  for (const listener of syncListeners) listener(state);
}

export function getSyncState() {
  return state;
}

export function subscribeSync(listener: SyncListener) {
  syncListeners.add(listener);
  listener(state);
  return () => {
    syncListeners.delete(listener);
  };
}

export async function refreshPendingCount() {
  const { outboxCount } = await import("./outbox");
  state = { ...state, pending: await outboxCount() };
  emit();
}

async function applyOutboxOp(op: OutboxOp): Promise<void> {
  switch (op.type) {
    case "collection:add": {
      const res = await fetch("/api/collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bggId: op.payload.bggId,
          isWishlist: op.payload.isWishlist,
          notes: op.payload.notes,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to add game");
      break;
    }
    case "collection:remove": {
      const res = await fetch(
        `/api/collection?itemId=${encodeURIComponent(op.payload.itemId)}`,
        { method: "DELETE" }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok && res.status !== 404) {
        throw new Error(data.error || "Failed to remove game");
      }
      break;
    }
    case "session:create": {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: op.payload.title,
          sessionDate: op.payload.sessionDate,
          location: op.payload.location,
          notes: op.payload.notes,
          gameId: op.payload.gameId,
          players: op.payload.players,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to create session");
      const created = data.session as SessionHistoryRow;
      await removeSession(op.payload.tempId);
      await upsertSession(created);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("tablist:session-id-remapped", {
            detail: { tempId: op.payload.tempId, realId: created.id },
          })
        );
      }
      break;
    }
    case "session:patch": {
      const res = await fetch("/api/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(op.payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to update session");
      if (data.session) {
        await upsertSession(data.session as SessionHistoryRow);
      }
      break;
    }
    case "session:delete": {
      const res = await fetch(
        `/api/sessions?id=${encodeURIComponent(op.payload.sessionId)}`,
        { method: "DELETE" }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok && res.status !== 404) {
        throw new Error(data.error || "Failed to delete session");
      }
      await removeSession(op.payload.sessionId);
      break;
    }
  }
}

async function warmAfterPull(
  games: CollectionGame[],
  sessions: SessionHistoryRow[],
  force = false
) {
  state = { ...state, warming: true };
  emit();
  try {
    const didWarm = await warmOfflineAssets(games, sessions, { force });
    if (didWarm) {
      const meta = await getMeta();
      state = { ...state, lastWarm: meta.lastWarm };
      emit();
    }
  } catch {
    // Warming is best-effort; sync already succeeded.
  } finally {
    state = { ...state, warming: false };
    emit();
  }
}

export async function pullSnapshots(): Promise<{
  games: CollectionGame[];
  sessions: SessionHistoryRow[];
}> {
  const [collectionRes, sessionsRes] = await Promise.all([
    fetch("/api/collection"),
    fetch("/api/sessions"),
  ]);

  if (collectionRes.status === 401 || sessionsRes.status === 401) {
    throw new Error("Session expired — sign in again to sync.");
  }

  const collectionData = await collectionRes.json();
  const sessionsData = await sessionsRes.json();

  if (!collectionRes.ok) {
    throw new Error(collectionData.error || "Failed to load collection");
  }
  if (!sessionsRes.ok) {
    throw new Error(sessionsData.error || "Failed to load sessions");
  }

  const games = (collectionData.games ?? []) as CollectionGame[];
  const sessions = (sessionsData.sessions ?? []) as SessionHistoryRow[];

  await saveCollectionSnapshot(games, collectionData.collectionId ?? null);
  await saveSessionsSnapshot(sessions);
  const lastSync = new Date().toISOString();
  await setMeta({ lastSync });
  state = { ...state, lastSync };
  emit();

  void warmAfterPull(games, sessions);

  return { games, sessions };
}

export async function flushOutbox(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!navigator.onLine) {
    state = { ...state, online: false };
    emit();
    return;
  }
  if (flushPromise) return flushPromise;

  flushPromise = (async () => {
    state = { ...state, syncing: true, online: true, lastError: null };
    emit();

    try {
      const ops = await listOutbox();
      state = { ...state, pending: ops.length };
      emit();

      for (const op of ops) {
        await applyOutboxOp(op);
        await removeOutbox(op.id);
        state = { ...state, pending: Math.max(0, state.pending - 1) };
        emit();
      }

      await pullSnapshots();
      state = { ...state, lastError: null };
    } catch (err) {
      state = {
        ...state,
        lastError: err instanceof Error ? err.message : "Sync failed",
      };
    } finally {
      state = { ...state, syncing: false };
      await refreshPendingCount();
      emit();
      flushPromise = null;
    }
  })();

  return flushPromise;
}

export async function ensureLocalSnapshots(): Promise<{
  games: CollectionGame[];
  sessions: SessionHistoryRow[];
}> {
  if (navigator.onLine) {
    try {
      return await pullSnapshots();
    } catch {
      // fall through to local
    }
  }
  const [games, sessions] = await Promise.all([
    readCollectionSnapshot(),
    readSessionsSnapshot(),
  ]);
  return { games, sessions };
}

/** Force a full offline pack refresh (used after install). */
export async function forceWarmOfflinePack(): Promise<void> {
  if (typeof window === "undefined" || !navigator.onLine) return;
  const { games, sessions } = await ensureLocalSnapshots();
  await warmAfterPull(games, sessions, true);
}

let listenersStarted = false;

export function startSyncListeners() {
  if (typeof window === "undefined") return () => {};
  if (listenersStarted) return () => {};
  listenersStarted = true;

  const onOnline = () => {
    state = { ...state, online: true };
    emit();
    void flushOutbox();
  };
  const onOffline = () => {
    state = { ...state, online: false };
    emit();
  };
  const onVisible = () => {
    if (document.visibilityState === "visible" && navigator.onLine) {
      void flushOutbox();
    }
  };
  const onInstalled = () => {
    void forceWarmOfflinePack();
  };

  const intervalId = window.setInterval(() => {
    if (document.visibilityState === "visible" && navigator.onLine) {
      void flushOutbox();
    }
  }, PERIODIC_SYNC_MS);

  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("appinstalled", onInstalled);

  void (async () => {
    const meta = await getMeta().catch(() => null);
    if (meta) {
      state = {
        ...state,
        lastSync: meta.lastSync,
        lastWarm: meta.lastWarm,
      };
      emit();
    }
    await refreshPendingCount();
    if (navigator.onLine) void flushOutbox();
  })();

  return () => {
    window.clearInterval(intervalId);
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("appinstalled", onInstalled);
    listenersStarted = false;
  };
}
