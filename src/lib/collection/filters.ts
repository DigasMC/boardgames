import type { CollectionGame } from "@/types/database";

/** Mirrors CollectionFiltersState / CollectionView filter semantics. */
export type CollectionFilterInput = {
  search?: string;
  players?: number | null;
  /** Treat ≥180 as “no max”, same as the web UI. */
  maxPlaytime?: number;
  /** Inclusive min on BGG weight (1–5). Omit / ≤1 = no min floor. */
  weightMin?: number;
  /** Inclusive max on BGG weight (1–5). Omit / ≥5 / 0 = no max cap (legacy 0 = off). */
  weightMax?: number;
  categories?: string[];
  /** Default exclude wishlist (owned shelf). */
  wishlist?: "exclude" | "only" | "include";
};

export function matchesCollectionFilters(
  game: CollectionGame,
  filters: CollectionFilterInput
): boolean {
  const wishlist = filters.wishlist ?? "exclude";
  if (wishlist === "exclude" && game.is_wishlist) return false;
  if (wishlist === "only" && !game.is_wishlist) return false;

  if (filters.search) {
    const q = filters.search.toLowerCase();
    if (!game.name.toLowerCase().includes(q)) return false;
  }

  if (filters.players != null) {
    const min = game.min_players ?? 1;
    const max = game.max_players ?? 99;
    if (filters.players < min || filters.players > max) return false;
  }

  const maxPlaytime = filters.maxPlaytime ?? 180;
  if (maxPlaytime < 180) {
    const time = game.playing_time ?? game.max_playtime ?? game.min_playtime;
    if (time != null && time > maxPlaytime) return false;
  }

  const weightMin = filters.weightMin ?? 1;
  const weightMaxRaw = filters.weightMax;
  // Legacy: weightMax 0 / undefined means “no max”. Cap at 5 = full range.
  const weightMax =
    weightMaxRaw == null || weightMaxRaw === 0 ? 5 : weightMaxRaw;
  if (game.weight != null) {
    if (weightMin > 1 && game.weight < weightMin) return false;
    if (weightMax < 5 && game.weight > weightMax) return false;
  }

  const categories = filters.categories ?? [];
  if (categories.length > 0) {
    const cats = (game.categories ?? []).map((c) => c.toLowerCase());
    const ok = categories.some((wanted) =>
      cats.some((c) => c.includes(wanted.toLowerCase()))
    );
    if (!ok) return false;
  }

  return true;
}

export function filterCollectionGames(
  games: CollectionGame[],
  filters: CollectionFilterInput
): CollectionGame[] {
  return games.filter((g) => matchesCollectionFilters(g, filters));
}
