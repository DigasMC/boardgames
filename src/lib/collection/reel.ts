/** Shared constants / helpers matching RandomGamePickerModal. */

export const RANDOM_GAME_REEL_LENGTH = 28;
export const RANDOM_GAME_ITEM_HEIGHT = 152;
export const RANDOM_GAME_SPIN_MS = 3400;

export const FIRST_PLAYER_REEL_LENGTH = 28;
export const FIRST_PLAYER_ITEM_HEIGHT = 112;
export const FIRST_PLAYER_SPIN_MS = 3400;

export type ReelItem = {
  id: string;
  name: string;
  thumbnailUrl?: string | null;
};

export function buildReelItems<T extends { id: string }>(
  pool: T[],
  chosen: T,
  length: number = RANDOM_GAME_REEL_LENGTH
): T[] {
  if (pool.length === 0) return [chosen];
  const reel: T[] = [];
  for (let i = 0; i < length - 1; i++) {
    reel.push(pool[Math.floor(Math.random() * pool.length)]!);
  }
  reel.push(chosen);
  return reel;
}

export function pickUniformRandom<T>(
  pool: T[],
  excludeIds?: Set<string> | string[],
  idOf: (item: T) => string = (item) => (item as { id: string }).id
): T | null {
  if (pool.length === 0) return null;
  let candidates = pool;
  if (excludeIds) {
    const set =
      excludeIds instanceof Set ? excludeIds : new Set(excludeIds);
    if (set.size > 0) {
      const filtered = pool.filter((item) => !set.has(idOf(item)));
      if (filtered.length > 0) candidates = filtered;
    }
  }
  return candidates[Math.floor(Math.random() * candidates.length)] ?? null;
}

export function toGameReelUiItem(game: {
  id: string;
  name: string;
  thumbnail_url?: string | null;
  image_url?: string | null;
}): ReelItem {
  return {
    id: game.id,
    name: game.name,
    thumbnailUrl: game.thumbnail_url || game.image_url || null,
  };
}
