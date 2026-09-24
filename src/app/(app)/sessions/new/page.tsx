"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, X } from "lucide-react";
import { BackLink } from "@/components/BackLink";
import { GameSelect } from "@/components/GameSelect";
import type { CollectionGame } from "@/types/database";

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
  const [players, setPlayers] = useState<string[]>([""]);
  const [games, setGames] = useState<CollectionGame[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(
    presetGameId
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { loadCollectionOfflineAware } = await import(
        "@/lib/offline/mutations"
      );
      const games = await loadCollectionOfflineAware();
      if (!cancelled) setGames(games);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function updatePlayer(index: number, value: string) {
    setPlayers((prev) => prev.map((p, i) => (i === index ? value : p)));
  }

  function addPlayer() {
    setPlayers((prev) => [...prev, ""]);
  }

  function removePlayer(index: number) {
    setPlayers((prev) => {
      if (prev.length <= 1) return [""];
      return prev.filter((_, i) => i !== index);
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedGameId) {
      setError("Please select a game");
      return;
    }

    setLoading(true);
    setError(null);
    const playerNames = players.map((p) => p.trim()).filter(Boolean);

    try {
      const { createSessionOfflineAware } = await import(
        "@/lib/offline/mutations"
      );
      const { session } = await createSessionOfflineAware({
        title,
        sessionDate: new Date(sessionDate).toISOString(),
        location: location || null,
        notes: notes || null,
        gameId: selectedGameId,
        players: playerNames,
      });
      router.push(`/sessions/${session.id}`);
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

      <div className="flex flex-col gap-1 text-sm">
        <span className="font-semibold text-on-surface-variant">Game</span>
        <GameSelect
          games={games}
          value={selectedGameId}
          onChange={setSelectedGameId}
        />
      </div>

      <div className="flex flex-col gap-2 text-sm">
        <span className="font-semibold text-on-surface-variant">Players</span>
        <div className="space-y-2">
          {players.map((player, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                value={player}
                onChange={(e) => updatePlayer(index, e.target.value)}
                placeholder={`Player ${index + 1}`}
                className="min-w-0 flex-1 rounded-md bg-surface-container px-3 py-2 outline-none ring-primary focus:ring-1"
              />
              <button
                type="button"
                onClick={() => removePlayer(index)}
                aria-label={`Remove player ${index + 1}`}
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-error-container/40 hover:text-error"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addPlayer}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-2 text-sm font-semibold text-primary transition-colors hover:bg-surface-container"
          >
            <Plus className="size-4" />
            Add player
          </button>
        </div>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-semibold text-on-surface-variant">Notes</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="rounded-md bg-surface-container px-3 py-2 outline-none ring-primary focus:ring-1"
        />
      </label>

      {error && (
        <p className="rounded-md bg-error-container px-3 py-2 text-sm text-on-error-container">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !selectedGameId}
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
