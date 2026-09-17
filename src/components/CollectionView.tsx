"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CollectionGame } from "@/types/database";
import { GameCard } from "@/components/GameCard";
import {
  CollectionFilters,
  type CollectionFiltersState,
} from "@/components/CollectionFilters";

function matchesFilters(game: CollectionGame, filters: CollectionFiltersState) {
  if (filters.search) {
    const q = filters.search.toLowerCase();
    if (!game.name.toLowerCase().includes(q)) return false;
  }

  if (filters.players != null) {
    const min = game.min_players ?? 1;
    const max = game.max_players ?? 99;
    if (filters.players === 4) {
      if (max < 4) return false;
    } else if (filters.players < min || filters.players > max) {
      return false;
    }
  }

  if (filters.maxPlaytime < 180) {
    const time = game.playing_time ?? game.max_playtime ?? game.min_playtime;
    if (time != null && time > filters.maxPlaytime) return false;
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
  const [filters, setFilters] = useState<CollectionFiltersState>({
    players: null,
    maxPlaytime: 180,
    categories: [],
    search: "",
  });
  const [randomGame, setRandomGame] = useState<CollectionGame | null>(null);

  const filtered = useMemo(
    () => games.filter((g) => matchesFilters(g, filters)),
    [games, filters]
  );

  function pickRandom() {
    if (filtered.length === 0) {
      setRandomGame(null);
      return;
    }
    setRandomGame(filtered[Math.floor(Math.random() * filtered.length)]);
  }

  return (
    <div>
      <div className="mb-8 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <div>
          <h2 className="mb-1 font-[family-name:var(--font-headline)] text-2xl font-semibold text-primary md:text-[32px] md:leading-10">
            My Collection
          </h2>
          <p className="text-on-surface-variant">
            {filtered.length} of {games.length} games ready for the table.
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-3 md:w-auto">
          <div className="relative flex-1 md:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">
              search
            </span>
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
            onClick={pickRandom}
            className="flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-bold tracking-wide text-white shadow-sm transition-opacity hover:opacity-90"
          >
            <span className="material-symbols-outlined filled">casino</span>
            Random Game
          </button>
        </div>
      </div>

      {randomGame && (
        <div className="card-shadow mb-6 rounded-lg border border-accent/30 bg-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                Tonight&apos;s pick
              </p>
              <p className="font-[family-name:var(--font-headline)] text-xl font-semibold text-primary">
                {randomGame.name}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                router.push(
                  `/sessions/new?gameId=${randomGame.id}&title=${encodeURIComponent(randomGame.name)}`
                )
              }
              className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-on-primary"
            >
              Start session
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-6 lg:flex-row">
        <CollectionFilters value={filters} onChange={setFilters} />
        <div className="grid flex-1 grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.length === 0 ? (
            <div className="col-span-full rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-10 text-center text-on-surface-variant">
              No games match these filters.{" "}
              <button
                type="button"
                className="font-semibold text-primary underline"
                onClick={() => router.push("/games/add")}
              >
                Add a game
              </button>
            </div>
          ) : (
            filtered.map((game) => <GameCard key={game.id} game={game} />)
          )}
        </div>
      </div>
    </div>
  );
}
