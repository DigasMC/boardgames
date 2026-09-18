"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import type { CollectionGame, Game } from "@/types/database";

function NewSessionForm() {
  const router = useRouter();
  const params = useSearchParams();
  const presetGameId = params.get("gameId");
  const presetTitle = params.get("title");

  const [title, setTitle] = useState(presetTitle || "Game Night");
  const [sessionDate, setSessionDate] = useState(
    new Date().toISOString().slice(0, 16)
  );
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [playersText, setPlayersText] = useState("");
  const [games, setGames] = useState<CollectionGame[]>([]);
  const [selectedGameIds, setSelectedGameIds] = useState<string[]>(
    presetGameId ? [presetGameId] : []
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/collection")
      .then((r) => r.json())
      .then((data) => setGames(data.games ?? []))
      .catch(() => setGames([]));
  }, []);

  function toggleGame(id: string) {
    setSelectedGameIds((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const players = playersText
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);

    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          sessionDate: new Date(sessionDate).toISOString(),
          location: location || null,
          notes: notes || null,
          gameIds: selectedGameIds,
          players,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create session");
      router.push(`/sessions/${data.session.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create session");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-2xl space-y-6">
      <div>
        <BackLink
          href={presetGameId ? `/games/${presetGameId}` : "/sessions"}
          label={presetGameId ? "Back to Game" : "Back to Sessions"}
        />
        <h2 className="mb-1 font-[family-name:var(--font-headline)] text-2xl font-semibold text-primary md:text-[32px]">
          New Session
        </h2>
        <p className="text-on-surface-variant">
          Plan a game night and track scores afterward.
        </p>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-semibold text-on-surface-variant">Title</span>
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded-md bg-surface-container px-3 py-2 outline-none ring-primary focus:ring-1"
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-on-surface-variant">Date & time</span>
          <input
            required
            type="datetime-local"
            value={sessionDate}
            onChange={(e) => setSessionDate(e.target.value)}
            className="rounded-md bg-surface-container px-3 py-2 outline-none ring-primary focus:ring-1"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-on-surface-variant">Location</span>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Home, café…"
            className="rounded-md bg-surface-container px-3 py-2 outline-none ring-primary focus:ring-1"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-semibold text-on-surface-variant">
          Players (comma-separated)
        </span>
        <input
          value={playersText}
          onChange={(e) => setPlayersText(e.target.value)}
          placeholder="Alex, Sam, Jordan"
          className="rounded-md bg-surface-container px-3 py-2 outline-none ring-primary focus:ring-1"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-semibold text-on-surface-variant">Notes</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="rounded-md bg-surface-container px-3 py-2 outline-none ring-primary focus:ring-1"
        />
      </label>

      <div>
        <p className="mb-2 text-sm font-semibold text-on-surface-variant">
          Games from collection
        </p>
        <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-outline-variant/20 p-3">
          {games.length === 0 ? (
            <p className="text-sm text-on-surface-variant">
              Your collection is empty — add games first.
            </p>
          ) : (
            games.map((game: Game & { collection_item_id?: string }) => (
              <label
                key={game.id}
                className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-surface-container"
              >
                <input
                  type="checkbox"
                  checked={selectedGameIds.includes(game.id)}
                  onChange={() => toggleGame(game.id)}
                />
                <span className="text-sm text-on-surface">{game.name}</span>
              </label>
            ))
          )}
        </div>
      </div>

      {error && (
        <p className="rounded-md bg-error-container px-3 py-2 text-sm text-on-error-container">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-primary px-5 py-3 font-bold text-on-primary disabled:opacity-60"
      >
        {loading ? "Creating…" : "Create session"}
      </button>
    </form>
  );
}

export default function NewSessionPage() {
  return (
    <Suspense fallback={<div className="text-on-surface-variant">Loading…</div>}>
      <NewSessionForm />
    </Suspense>
  );
}
