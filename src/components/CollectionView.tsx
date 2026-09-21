"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dices, Search, SlidersHorizontal, X } from "lucide-react";
import type { CollectionGame } from "@/types/database";
import { GameCard } from "@/components/GameCard";
import {
  CollectionFilters,
  type CollectionFiltersState,
} from "@/components/CollectionFilters";
import { RandomGamePickerModal } from "@/components/RandomGamePickerModal";

function matchesFilters(game: CollectionGame, filters: CollectionFiltersState) {
  if (filters.search) {
    const q = filters.search.toLowerCase();
    if (!game.name.toLowerCase().includes(q)) return false;
  }

  if (filters.players != null) {
    const min = game.min_players ?? 1;
    const max = game.max_players ?? 99;
    if (filters.players < min || filters.players > max) return false;
  }

  if (filters.maxPlaytime < 180) {
    const time = game.playing_time ?? game.max_playtime ?? game.min_playtime;
    if (time != null && time > filters.maxPlaytime) return false;
  }

  if (filters.weight > 0) {
    if (game.weight != null && game.weight > filters.weight) return false;
  }

  if (filters.categories.length > 0) {
    const cats = (game.categories ?? []).map((c) => c.toLowerCase());
    const ok = filters.categories.some((wanted) =>
      cats.some((c) => c.includes(wanted.toLowerCase()))
    );
    if (!ok) return false;
  }

  return true;
}

export function CollectionView({ games }: { games: CollectionGame[] }) {
  const router = useRouter();
  const [items, setItems] = useState(games);
  const [filters, setFilters] = useState<CollectionFiltersState>({
    players: null,
    maxPlaytime: 180,
    weight: 0,
    categories: [],
    search: "",
  });
  const [randomGame, setRandomGame] = useState<CollectionGame | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    setItems(games);
  }, [games]);

  useEffect(() => {
    if (!filtersOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setFiltersOpen(false);
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [filtersOpen]);

  const filtered = useMemo(
    () => items.filter((g) => matchesFilters(g, filters)),
    [items, filters]
  );

  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    for (const game of items) {
      for (const cat of game.categories ?? []) {
        if (cat) set.add(cat);
      }
    }
    return Array.from(set);
  }, [items]);

  const activeFilterCount =
    (filters.players != null ? 1 : 0) +
    (filters.maxPlaytime < 180 ? 1 : 0) +
    (filters.weight > 0 ? 1 : 0) +
    filters.categories.length;

  function pickRandom() {
    if (filtered.length === 0) return;
    setRandomGame(filtered[Math.floor(Math.random() * filtered.length)]);
    setPickerOpen(true);
  }

  function rerollRandom() {
    if (filtered.length === 0) return;
    const pool =
      filtered.length > 1 && randomGame
        ? filtered.filter((g) => g.id !== randomGame.id)
        : filtered;
    setRandomGame(pool[Math.floor(Math.random() * pool.length)]);
  }

  function closePicker() {
    setPickerOpen(false);
    setRandomGame(null);
  }

  function clearFilters() {
    setFilters((prev) => ({
      ...prev,
      players: null,
      maxPlaytime: 180,
      weight: 0,
      categories: [],
    }));
  }

  function clearAllFilters() {
    setFilters({
      players: null,
      maxPlaytime: 180,
      weight: 0,
      categories: [],
      search: "",
    });
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="mb-1 font-[family-name:var(--font-headline)] text-2xl font-semibold text-primary md:text-[32px] md:leading-10">
            My Collection
          </h2>
          <p className="text-on-surface-variant">
            {filtered.length} of {items.length} games ready for the table.
          </p>
        </div>
        <Link
          href="/games/add"
          className="rounded-lg bg-primary px-4 py-3 text-sm font-bold text-on-primary"
        >
          New game
        </Link>
      </div>

      <div className="sticky top-16 z-40 -mx-4 mb-6 border-b border-outline-variant/10 bg-background/95 px-4 py-3 backdrop-blur-sm md:top-0 md:-mx-12 md:px-12">
        <div className="flex w-full flex-wrap items-center gap-3">
          <div className="relative min-w-[10rem] flex-1 md:max-w-xs">
            <Search className="absolute left-3 top-1/2 size-6 -translate-y-1/2 text-outline" />
            <input
              className="w-full rounded-md border-none bg-surface-container py-2 pl-10 pr-4 text-on-surface shadow-inner placeholder:text-outline focus:ring-1 focus:ring-primary"
              placeholder="Search collection..."
              type="text"
              value={filters.search}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value })
              }
            />
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="flex items-center gap-2 rounded-md border border-secondary/20 bg-surface px-3 py-2 text-sm font-bold tracking-wide text-primary shadow-sm transition-colors hover:bg-surface-container-high md:px-4"
            aria-label="Filters"
            aria-haspopup="dialog"
            aria-expanded={filtersOpen}
          >
            <SlidersHorizontal className="size-5" />
            <span className="hidden md:inline">Filters</span>
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-primary-container px-2 py-0.5 text-xs text-on-primary-container">
                {activeFilterCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={pickRandom}
            className="flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-bold tracking-wide text-white shadow-sm transition-opacity hover:opacity-90 md:px-4"
            aria-label="Random Game"
          >
            <Dices className="size-6" />
            <span className="hidden md:inline">Random Game</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {games.length === 0 ? (
          <div className="col-span-full rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-10 text-center text-on-surface-variant">
            Your collection is empty.{" "}
            <button
              type="button"
              className="font-semibold text-primary underline"
              onClick={() => router.push("/games/add")}
            >
              Add a game
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-10 text-center text-on-surface-variant">
            No games match these filters.{" "}
            <button
              type="button"
              className="font-semibold text-primary underline"
              onClick={clearAllFilters}
            >
              Clear filters
            </button>
          </div>
        ) : (
          filtered.map((game) => (
            <GameCard key={game.id} game={game} />
          ))
        )}
      </div>

      {filtersOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-primary/40"
            onClick={() => setFiltersOpen(false)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="collection-filters-title"
            className="relative z-[70] flex max-h-[min(90vh,40rem)] w-full max-w-md flex-col rounded-2xl border border-secondary/10 bg-surface shadow-lg"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-outline-variant/20 px-6 py-4">
              <h3
                id="collection-filters-title"
                className="text-sm font-semibold tracking-wide text-primary"
              >
                Filters
              </h3>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                aria-label="Close filters"
                className="rounded-lg p-1 text-on-surface-variant transition-colors hover:bg-surface-container-high"
              >
                <X className="size-6" />
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-5">
              <CollectionFilters
                value={filters}
                onChange={setFilters}
                availableCategories={availableCategories}
                embedded
              />
            </div>
            <div className="flex shrink-0 items-center justify-end gap-3 border-t border-outline-variant/20 px-6 py-4">
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-md px-4 py-2 text-sm font-bold text-on-surface-variant transition-colors hover:bg-surface-container-high"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-on-primary"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {randomGame && (
        <RandomGamePickerModal
          open={pickerOpen}
          games={filtered}
          chosen={randomGame}
          onClose={closePicker}
          onReroll={rerollRandom}
        />
      )}
    </div>
  );
}
