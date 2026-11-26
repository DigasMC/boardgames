import type { CollectionGame } from "@/types/database";

/** Mirrors CollectionFiltersState / CollectionView filter semantics. */
export type CollectionFilterInput = {
  search?: string;
  players?: number | null;
  /** Treat ≥180 as “no max”, same as the web UI. */
  maxPlaytime?: number;
  /** 0 = off */
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

  const weightMax = filters.weightMax ?? 0;
  if (weightMax > 0) {
    if (game.weight != null && game.weight > weightMax) return false;
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
