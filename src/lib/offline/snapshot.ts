import type { CollectionGame } from "@/types/database";
import type { SessionHistoryRow } from "@/components/SessionHistoryCard";
import { getOfflineDb, type OfflineMeta } from "./db";

export async function getMeta(): Promise<OfflineMeta> {
  const db = await getOfflineDb();
  return (
    (await db.get("meta", "meta")) ?? {
      key: "meta",
      userId: null,
      lastSync: null,
      lastWarm: null,
      warmRevision: null,
      collectionId: null,
    }
  );
}

export async function setMeta(partial: Partial<Omit<OfflineMeta, "key">>) {
  const db = await getOfflineDb();
  const current = await getMeta();
  await db.put("meta", { ...current, ...partial, key: "meta" });
}

export async function saveCollectionSnapshot(
  games: CollectionGame[],
  collectionId?: string | null
) {
  const db = await getOfflineDb();
  const tx = db.transaction("collection", "readwrite");
  await tx.store.clear();
  await Promise.all(games.map((g) => tx.store.put(g)));
  await tx.done;
  if (collectionId !== undefined) {
    await setMeta({ collectionId: collectionId ?? null });
  }
}

export async function readCollectionSnapshot(): Promise<CollectionGame[]> {
  const db = await getOfflineDb();
  return db.getAll("collection");
}

export async function upsertCollectionGame(game: CollectionGame) {
  const db = await getOfflineDb();
  await db.put("collection", game);
}

export async function removeCollectionGame(itemId: string) {
  const db = await getOfflineDb();
  await db.delete("collection", itemId);
}

export async function saveSessionsSnapshot(sessions: SessionHistoryRow[]) {
  const db = await getOfflineDb();
  const tx = db.transaction("sessions", "readwrite");
  await tx.store.clear();
  await Promise.all(sessions.map((s) => tx.store.put(s)));
  await tx.done;
}

export async function readSessionsSnapshot(): Promise<SessionHistoryRow[]> {
  const db = await getOfflineDb();
  const all = await db.getAll("sessions");
  return all.sort(
    (a, b) =>
      new Date(b.session_date).getTime() - new Date(a.session_date).getTime()
  );
}

export async function upsertSession(session: SessionHistoryRow) {
  const db = await getOfflineDb();
  await db.put("sessions", session);
}

export async function removeSession(sessionId: string) {
  const db = await getOfflineDb();
  await db.delete("sessions", sessionId);
}

export async function readSession(sessionId: string) {
  const db = await getOfflineDb();
  return db.get("sessions", sessionId);
}
