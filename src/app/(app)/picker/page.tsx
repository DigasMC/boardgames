"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Dices } from "lucide-react";
import type { CollectionGame } from "@/types/database";
import {
  CollectionFilters,
  type CollectionFiltersState,
} from "@/components/CollectionFilters";
import { GameCard } from "@/components/GameCard";

export default function PickerPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<CollectionFiltersState>({
    players: null,
    maxPlaytime: 180,
    categories: [],
    search: "",
  });
  const [candidates, setCandidates] = useState<CollectionGame[]>([]);
  const [picked, setPicked] = useState<CollectionGame | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.players) params.set("players", String(filters.players));
    if (filters.maxPlaytime < 180)
      params.set("maxPlaytime", String(filters.maxPlaytime));
    if (filters.categories.length)
      params.set("categories", filters.categories.join(","));
    if (filters.search) params.set("search", filters.search);

    setLoading(true);
    fetch(`/api/picker?${params.toString()}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Failed to load");
        setCandidates(data.games ?? []);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [filters]);

  function pickRandom() {
    if (candidates.length === 0) {
      setPicked(null);
      return;
    }
    setPicked(candidates[Math.floor(Math.random() * candidates.length)]);
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="mb-1 font-[family-name:var(--font-headline)] text-2xl font-semibold text-primary md:text-[32px]">
          Game Picker
        </h2>
        <p className="text-on-surface-variant">
          Filter your collection, then roll for tonight&apos;s game.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={pickRandom}
          className="flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-bold text-white"
        >
          <Dices className="size-6" />
          Random from filters ({candidates.length})
        </button>
        {picked && (
          <button
            type="button"
            onClick={() =>
              router.push(
                `/sessions/new?gameId=${picked.id}&title=${encodeURIComponent(picked.name)}`
              )
            }
            className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-on-primary"
          >
            Start session with {picked.name}
          </button>
        )}
      </div>

      {picked && (
        <div className="mb-8 max-w-sm">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent">
            Selected
          </p>
          <GameCard game={picked} />
        </div>
      )}

      {error && (
        <p className="mb-4 rounded-md bg-error-container px-3 py-2 text-sm text-on-error-container">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-6 lg:flex-row">
        <CollectionFilters value={filters} onChange={setFilters} />
        <div className="grid flex-1 grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <p className="text-on-surface-variant">Filtering…</p>
          ) : candidates.length === 0 ? (
            <p className="col-span-full text-on-surface-variant">
              No games match these filters.
            </p>
          ) : (
            candidates.map((game) => <GameCard key={game.id} game={game} />)
          )}
        </div>
      </div>
    </div>
  );
}
