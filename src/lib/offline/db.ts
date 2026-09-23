import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { CollectionGame } from "@/types/database";
import type { SessionHistoryRow } from "@/components/SessionHistoryCard";

export type OutboxOp =
  | {
      id: string;
      type: "collection:add";
      createdAt: string;
      payload: {
        bggId: number;
        isWishlist?: boolean;
        notes?: string | null;
        /** Optimistic local game when known */
        game?: CollectionGame;
      };
    }
  | {
      id: string;
      type: "collection:remove";
      createdAt: string;
      payload: { itemId: string };
    }
  | {
      id: string;
      type: "session:create";
      createdAt: string;
      payload: {
        tempId: string;
        title: string;
        sessionDate: string;
        location: string | null;
        notes: string | null;
        gameId: string;
        players: string[];
      };
    }
  | {
      id: string;
      type: "session:patch";
      createdAt: string;
      payload: {
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
      };
    }
  | {
      id: string;
      type: "session:delete";
      createdAt: string;
      payload: { sessionId: string };
    };

export type OfflineMeta = {
  key: "meta";
  userId: string | null;
  lastSync: string | null;
  collectionId: string | null;
};

interface TablistDB extends DBSchema {
  meta: {
    key: string;
    value: OfflineMeta;
  };
  collection: {
    key: string;
    value: CollectionGame;
  };
  sessions: {
    key: string;
    value: SessionHistoryRow;
  };
  outbox: {
    key: string;
    value: OutboxOp;
    indexes: { "by-created": string };
  };
}

const DB_NAME = "tablist-offline";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<TablistDB>> | null = null;

export function getOfflineDb() {
  if (typeof window === "undefined") {
    throw new Error("Offline DB is browser-only");
  }
  if (!dbPromise) {
    dbPromise = openDB<TablistDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta", { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains("collection")) {
          db.createObjectStore("collection", { keyPath: "collection_item_id" });
        }
        if (!db.objectStoreNames.contains("sessions")) {
          db.createObjectStore("sessions", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("outbox")) {
          const outbox = db.createObjectStore("outbox", { keyPath: "id" });
          outbox.createIndex("by-created", "createdAt");
        }
      },
    });
  }
  return dbPromise;
}

export async function clearOfflineData() {
  const db = await getOfflineDb();
  const tx = db.transaction(
    ["meta", "collection", "sessions", "outbox"],
    "readwrite"
  );
  await Promise.all([
    tx.objectStore("collection").clear(),
    tx.objectStore("sessions").clear(),
    tx.objectStore("outbox").clear(),
    tx.objectStore("meta").put({
      key: "meta",
      userId: null,
      lastSync: null,
      collectionId: null,
    }),
    tx.done,
  ]);
}
