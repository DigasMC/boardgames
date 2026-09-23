import { getOfflineDb, type OutboxOp } from "./db";

const listeners = new Set<() => void>();

export function subscribeOutbox(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyOutbox() {
  for (const listener of listeners) listener();
}

export async function enqueueOutbox(
  op: Omit<OutboxOp, "id" | "createdAt"> & { id?: string }
): Promise<OutboxOp> {
  const entry = {
    ...op,
    id: op.id ?? crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  } as OutboxOp;
  const db = await getOfflineDb();
  await db.put("outbox", entry);
  notifyOutbox();
  return entry;
}

export async function listOutbox(): Promise<OutboxOp[]> {
  const db = await getOfflineDb();
  const all = await db.getAllFromIndex("outbox", "by-created");
  return all;
}

export async function removeOutbox(id: string) {
  const db = await getOfflineDb();
  await db.delete("outbox", id);
  notifyOutbox();
}

export async function outboxCount(): Promise<number> {
  const db = await getOfflineDb();
  return db.count("outbox");
}
