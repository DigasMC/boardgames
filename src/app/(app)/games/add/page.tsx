"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Search } from "lucide-react";
import { BackLink } from "@/components/BackLink";
import { GameCard, type GameCardData } from "@/components/GameCard";
import type { BggSearchResult } from "@/types/database";

const PAGE_SIZE = 25;

function toGameCardData(item: BggSearchResult): GameCardData {
  return {
    name: item.name,
    image_url: item.imageUrl ?? null,
    thumbnail_url: item.thumbnailUrl ?? null,
    min_players: null,
    max_players: null,
    min_playtime: null,
    max_playtime: null,
    playing_time: null,
    weight: null,
    bgg_rating: null,
    year_published: item.yearPublished ?? null,
    categories: [],
    mechanics: [],
  };
}

function SearchResultSkeleton() {
  return (
    <article
      aria-hidden
      className="card-shadow flex animate-pulse flex-row overflow-hidden rounded-lg border border-secondary/10 bg-surface sm:flex-col sm:rounded-xl"
    >
      <div className="w-24 shrink-0 self-stretch bg-surface-container sm:h-40 sm:w-full" />
      <div className="flex flex-1 flex-col p-2.5 sm:p-3">
        <div className="mb-2 h-5 w-3/4 rounded bg-outline/20" />
        <div className="mb-2 h-4 w-1/3 rounded bg-outline/20" />
        <div className="mt-auto h-8 w-full rounded bg-outline/20" />
      </div>
    </article>
  );
}

export default function AddGamePage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BggSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [addingId, setAddingId] = useState<number | null>(null);
  const [ownedBggIds, setOwnedBggIds] = useState<Set<number>>(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchId, setSearchId] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const searchGenRef = useRef(0);
  const activeQueryRef = useRef("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { loadCollectionOfflineAware } = await import(
          "@/lib/offline/mutations"
        );
        const games = await loadCollectionOfflineAware();
        if (cancelled) return;
        setOwnedBggIds(new Set(games.map((g) => g.bgg_id)));
      } catch {
        // Search still works without owned-state
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function resetSearchUi() {
    abortRef.current?.abort();
    searchGenRef.current += 1;
    setResults([]);
    setLoading(false);
    setLoadingMore(false);
    setHasMore(false);
    setTotal(0);
    setHasSearched(false);
    setError(null);
    activeQueryRef.current = "";
  }

  function updateQuery(value: string) {
    setQuery(value);
    if (results.length > 0 || hasSearched) {
      resetSearchUi();
    }
  }

  async function runSearch(opts: { append: boolean }) {
    const q = query.trim();
    if (!q) return;

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setError("BoardGameGeek search needs an internet connection.");
      setHasSearched(true);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const gen = ++searchGenRef.current;
    const offset = opts.append ? results.length : 0;

    if (opts.append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setResults([]);
      setHasMore(false);
      setTotal(0);
      setHasSearched(true);
      setSearchId(gen);
      activeQueryRef.current = q;
    }
    setError(null);
    setSuccess(null);

    try {
      const params = new URLSearchParams({
        q,
        offset: String(offset),
        limit: String(PAGE_SIZE),
      });
      const res = await fetch(`/api/bgg/search?${params}`, {
        signal: controller.signal,
        cache: "no-store",
      });
      const data = await res.json();
      if (gen !== searchGenRef.current) return;
      if (!res.ok) throw new Error(data.error || "Search failed");

      const next = (data.results ?? []) as BggSearchResult[];
      setResults((prev) => (opts.append ? [...prev, ...next] : next));
      setHasMore(Boolean(data.hasMore));
      setTotal(typeof data.total === "number" ? data.total : next.length);
    } catch (err) {
      if (gen !== searchGenRef.current) return;
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Search failed");
      if (!opts.append) {
        setResults([]);
        setHasMore(false);
        setTotal(0);
      }
    } finally {
      if (gen === searchGenRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    await runSearch({ append: false });
  }

  async function onLoadMore() {
    if (loading || loadingMore || !hasMore) return;
    if (activeQueryRef.current !== query.trim()) return;
    await runSearch({ append: true });
  }

  async function addGame(bggId: number, name: string) {
    if (ownedBggIds.has(bggId) || addingId === bggId) return;
    setAddingId(bggId);
    setError(null);
    setSuccess(null);
    try {
      const { addGameToCollection } = await import("@/lib/offline/mutations");
      const result = await addGameToCollection({ bggId, name });
      setOwnedBggIds((prev) => new Set(prev).add(bggId));
      setSuccess(
        result.queued
          ? `${name} queued — will sync when you're back online.`
          : `${name} added to your collection.`
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add game");
    } finally {
      setAddingId(null);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <BackLink href="/collection" label="Back to Collection" />
        <h2 className="mb-1 font-[family-name:var(--font-headline)] text-2xl font-semibold text-primary md:text-[32px] md:leading-10">
          Add New Game
        </h2>
        <p className="text-on-surface-variant">
          Search BoardGameGeek and add titles to your collection. BGG search
          requires an internet connection.
        </p>
      </div>

      <form
        onSubmit={onSearch}
        className="sticky top-16 z-40 -mx-4 mb-6 border-b border-outline-variant/10 bg-surface/70 px-4 py-3 backdrop-blur-sm md:top-0 md:-mx-12 md:px-12"
      >
        <div className="flex w-full flex-wrap items-center gap-3">
          <div className="relative min-w-[10rem] flex-1 md:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-outline" />
            <input
              value={query}
              onChange={(e) => updateQuery(e.target.value)}
              placeholder="Search BoardGameGeek…"
              type="text"
              className="w-full rounded-md bg-surface-container py-2 pl-9 pr-3 text-on-surface outline-none ring-primary placeholder:text-outline focus:ring-1"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-primary px-3 py-2 text-sm font-bold tracking-wide text-on-primary md:px-4"
          >
            {loading ? "Searching…" : "Search"}
          </button>
        </div>
      </form>

      {error && (
        <p className="mb-4 rounded-md bg-error-container px-3 py-2 text-sm text-on-error-container">
          {error}
        </p>
      )}
      {success && (
        <p className="mb-4 rounded-md bg-primary-fixed px-3 py-2 text-sm text-on-primary-fixed">
          {success}{" "}
          <button
            type="button"
            className="font-semibold underline"
            onClick={() => router.push("/collection")}
          >
            View collection
          </button>
        </p>
      )}

      <div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
        aria-busy={loading || loadingMore}
        key={searchId}
      >
        {loading ? (
          Array.from({ length: 10 }, (_, i) => <SearchResultSkeleton key={i} />)
        ) : (
          <>
            {results.map((item, index) => {
              const inCollection = ownedBggIds.has(item.bggId);
              const isAdding = addingId === item.bggId;

              return (
                <GameCard
                  key={`${item.bggId}-${item.type}-${index}`}
                  game={toGameCardData(item)}
                  href={null}
                  action={
                    inCollection ? (
                      <span className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-primary-container/15 px-3 py-1.5 text-sm font-bold text-primary">
                        <Check className="size-3.5" strokeWidth={2.5} />
                        In collection
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={isAdding}
                        onClick={() => addGame(item.bggId, item.name)}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-bold text-white disabled:opacity-60"
                      >
                        {isAdding ? (
                          <>
                            <Loader2 className="size-3.5 animate-spin" />
                            Adding…
                          </>
                        ) : (
                          "Add"
                        )}
                      </button>
                    )
                  }
                />
              );
            })}

            {loadingMore &&
              Array.from({ length: 5 }, (_, i) => (
                <SearchResultSkeleton key={`more-${i}`} />
              ))}

            {!loading && !loadingMore && hasSearched && results.length === 0 && (
              <div className="col-span-full rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-10 text-center text-on-surface-variant">
                No results yet — try a search.
              </div>
            )}

            {!loading && results.length > 0 && (
              <div className="col-span-full flex flex-col items-center gap-2 pt-2">
                <p className="text-xs text-on-surface-variant">
                  Showing {results.length}
                  {total > results.length ? ` of ${total}` : ""} result
                  {total === 1 ? "" : "s"}
                </p>
                {hasMore && (
                  <button
                    type="button"
                    onClick={onLoadMore}
                    disabled={loadingMore}
                    className="rounded-md border border-secondary/20 bg-surface px-5 py-2 text-sm font-bold text-primary transition-colors hover:bg-surface-container disabled:opacity-60"
                  >
                    {loadingMore ? "Loading…" : "Load more"}
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
