import type { CollectionGame } from "@/types/database";
import type { SessionHistoryRow } from "@/components/SessionHistoryCard";
import { getMeta, setMeta } from "./snapshot";

const SHELL_PATHS = [
  "/collection",
  "/sessions",
  "/sessions/new",
  "/games/add",
  "/profile",
] as const;

const WARM_THROTTLE_MS = 5 * 60 * 1000;
const CONCURRENCY = 6;

export function snapshotRevision(
  games: CollectionGame[],
  sessions: SessionHistoryRow[]
): string {
  const gameIds = games.map((g) => g.id).sort().join(",");
  const sessionIds = sessions.map((s) => s.id).sort().join(",");
  return `${gameIds}|${sessionIds}`;
}

async function mapPool<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>
): Promise<void> {
  if (items.length === 0) return;
  let next = 0;
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (next < items.length) {
        const i = next++;
        try {
          await fn(items[i]!);
        } catch {
          // Ignore individual failures — pack is best-effort.
        }
      }
    }
  );
  await Promise.all(workers);
}

async function fetchQuiet(url: string, init?: RequestInit): Promise<void> {
  try {
    await fetch(url, { ...init, credentials: "include" });
  } catch {
    // ignore
  }
}

function collectImageUrls(game: CollectionGame): string[] {
  const urls: string[] = [];
  if (game.image_url) urls.push(game.image_url);
  if (game.thumbnail_url && game.thumbnail_url !== game.image_url) {
    urls.push(game.thumbnail_url);
  }
  return urls;
}

export type WarmOptions = {
  /** Bypass throttle even when revision is unchanged. */
  force?: boolean;
};

/**
 * Warm Serwist runtime caches with app shells, per-game/session documents,
 * and BGG cover images so the installed PWA works offline.
 */
export async function warmOfflineAssets(
  games: CollectionGame[],
  sessions: SessionHistoryRow[],
  options: WarmOptions = {}
): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!navigator.onLine) return false;

  const revision = snapshotRevision(games, sessions);
  const meta = await getMeta();
  const lastWarmMs = meta.lastWarm ? Date.parse(meta.lastWarm) : 0;
  const revisionChanged = meta.warmRevision !== revision;
  const recentlyWarmed =
    Number.isFinite(lastWarmMs) &&
    Date.now() - lastWarmMs < WARM_THROTTLE_MS;

  if (!options.force && !revisionChanged && recentlyWarmed) {
    return false;
  }

  const documentUrls = [
    ...SHELL_PATHS,
    ...games.map((g) => `/games/${g.id}`),
    ...sessions.map((s) => `/sessions/${s.id}`),
  ];

  const imageUrls = [
    ...new Set(games.flatMap(collectImageUrls)),
  ];

  await mapPool(documentUrls, CONCURRENCY, (url) =>
    fetchQuiet(url, {
      headers: { Accept: "text/html" },
    })
  );

  await mapPool(imageUrls, CONCURRENCY, (url) => fetchQuiet(url, { mode: "no-cors" }));

  const lastWarm = new Date().toISOString();
  await setMeta({ lastWarm, warmRevision: revision });
  return true;
}
