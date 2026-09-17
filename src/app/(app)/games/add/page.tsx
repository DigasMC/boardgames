"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { BggSearchResult } from "@/types/database";

export default function AddGamePage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BggSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/bgg/search?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setResults(data.results ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  async function addGame(bggId: number, name: string) {
    setAddingId(bggId);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bggId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not add game");
      setSuccess(`${name} added to your collection.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add game");
    } finally {
      setAddingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="mb-1 font-[family-name:var(--font-headline)] text-2xl font-semibold text-primary md:text-[32px]">
        Add New Game
      </h2>
      <p className="mb-8 text-on-surface-variant">
        Search BoardGameGeek and add titles to your collection.
      </p>

      <form onSubmit={onSearch} className="card-shadow mb-6 flex gap-3 rounded-xl border border-secondary/10 bg-surface p-4">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">
            search
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search BoardGameGeek…"
            className="w-full rounded-md bg-surface-container py-2 pl-10 pr-4 outline-none ring-primary focus:ring-1"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-primary px-5 py-2 text-sm font-bold text-on-primary disabled:opacity-60"
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

      <div className="space-y-3">
        {results.map((item) => (
          <div
            key={item.bggId}
            className="card-shadow flex items-center justify-between gap-4 rounded-lg border border-secondary/10 bg-surface p-4"
          >
            <div>
              <p className="font-[family-name:var(--font-headline)] text-lg font-semibold text-primary">
                {item.name}
              </p>
              <p className="text-xs text-on-surface-variant">
                BGG #{item.bggId}
                {item.yearPublished ? ` · ${item.yearPublished}` : ""} · {item.type}
              </p>
            </div>
            <button
              type="button"
              disabled={addingId === item.bggId}
              onClick={() => addGame(item.bggId, item.name)}
              className="rounded-md bg-accent px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
            >
              {addingId === item.bggId ? "Adding…" : "Add"}
            </button>
          </div>
        ))}
        {!loading && results.length === 0 && query && (
          <p className="text-center text-on-surface-variant">No results yet — try a search.</p>
        )}
      </div>
    </div>
  );
}
