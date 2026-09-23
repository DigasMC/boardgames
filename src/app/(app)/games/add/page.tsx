"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Dices, Search } from "lucide-react";
import { BackLink } from "@/components/BackLink";
import { CoverImage } from "@/components/CoverImage";
import type { BggSearchResult } from "@/types/database";

const PAGE_SIZE = 25;

function SearchResultThumb({
  src,
  name,
}: {
  src: string | null | undefined;
  name: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  return (
    <CoverImage
      src={showImage ? src : null}
      alt={`${name} cover`}
      className="h-16 w-16 shrink-0 rounded-md border border-secondary/10 sm:h-20 sm:w-20"
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      fallback={
        <div className="flex h-full w-full items-center justify-center text-outline">
          <Dices className="size-6" />
        </div>
      }
    />
  );
}

function SearchResultSkeleton() {
  return (
    <div
      aria-hidden
      className="card-shadow flex animate-pulse items-center justify-between gap-4 rounded-lg border border-secondary/10 bg-surface p-3 sm:p-4"
    >
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <div className="h-16 w-16 shrink-0 rounded-md bg-surface-container sm:h-20 sm:w-20" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-5 w-2/3 max-w-xs rounded bg-outline/20" />
          <div className="h-3 w-1/3 max-w-[10rem] rounded bg-outline/20" />
        </div>
      </div>
      <div className="h-9 w-14 shrink-0 rounded-md bg-surface-container" />
    </div>
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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchId, setSearchId] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const searchGenRef = useRef(0);
  const activeQueryRef = useRef("");

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
    setAddingId(bggId);
    setError(null);
    setSuccess(null);
    try {
      const { addGameToCollection } = await import("@/lib/offline/mutations");
      const result = await addGameToCollection({ bggId, name });
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
    <div className="mx-auto max-w-3xl">
      <BackLink href="/collection" label="Back to Collection" />
      <h2 className="mb-1 font-[family-name:var(--font-headline)] text-2xl font-semibold text-primary md:text-[32px]">
        Add New Game
      </h2>
      <p className="mb-8 text-on-surface-variant">
        Search BoardGameGeek and add titles to your collection. BGG search
        requires an internet connection.
      </p>

      <form onSubmit={onSearch} className="card-shadow mb-6 flex gap-3 rounded-xl border border-secondary/10 bg-surface p-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-6 -translate-y-1/2 text-outline" />
          <input
            value={query}
            onChange={(e) => updateQuery(e.target.value)}
            placeholder="Search BoardGameGeek…"
            className="w-full rounded-md bg-surface-container py-2 pl-10 pr-4 outline-none ring-primary focus:ring-1"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-primary px-5 py-2 text-sm font-bold text-on-primary"
        >
          {loading ? "Searching…" : "Search"}
        </button>
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

      <div className="space-y-3" aria-busy={loading || loadingMore} key={searchId}>
        {loading ? (
          Array.from({ length: 5 }, (_, i) => <SearchResultSkeleton key={i} />)
        ) : (
          <>
            {results.map((item, index) => {
              return (
                <div
                  key={`${item.bggId}-${item.type}-${index}`}
                  className="card-shadow flex items-center justify-between gap-4 rounded-lg border border-secondary/10 bg-surface p-3 sm:p-4"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <SearchResultThumb
                      src={item.thumbnailUrl || item.imageUrl}
                      name={item.name}
                    />
                    <div className="min-w-0">
                      <p className="truncate font-[family-name:var(--font-headline)] text-lg font-semibold text-primary">
                        {item.name}
                      </p>
                      <p className="text-xs text-on-surface-variant">
                        BGG #{item.bggId}
                        {item.yearPublished ? ` · ${item.yearPublished}` : ""} ·{" "}
                        {item.type}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={addingId === item.bggId}
                    onClick={() => addGame(item.bggId, item.name)}
                    className="shrink-0 rounded-md bg-accent px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                  >
                    {addingId === item.bggId ? "Adding…" : "Add"}
                  </button>
                </div>
              );
            })}

            {loadingMore &&
              Array.from({ length: 3 }, (_, i) => (
                <SearchResultSkeleton key={`more-${i}`} />
              ))}

            {!loading && !loadingMore && hasSearched && results.length === 0 && (
              <p className="text-center text-on-surface-variant">
                No results yet — try a search.
              </p>
            )}

            {!loading && results.length > 0 && (
              <div className="flex flex-col items-center gap-2 pt-2">
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
