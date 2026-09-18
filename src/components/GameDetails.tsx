"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CollectionGame } from "@/types/database";
import { GameTags } from "@/components/GameTags";
import { RatingBadge } from "@/components/RatingBadge";

export type GameSessionHistoryItem = {
  id: string;
  session_date: string;
  playerCount: number;
  playerNames: string[];
  winnerName: string | null;
  winnerScore: number | null;
};

function weightLabel(weight: number | null): string {
  if (weight == null) return "Unknown";
  if (weight < 2) return "Light";
  if (weight < 3.5) return "Medium";
  return "Heavy";
}

function WeightPips({ weight }: { weight: number | null }) {
  const filled = weight ? Math.min(5, Math.max(1, Math.round(weight))) : 0;
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={`material-symbols-outlined text-sm ${
            i < filled ? "filled text-secondary" : "text-outline-variant"
          }`}
        >
          circle
        </span>
      ))}
      <span className="ml-1 text-sm font-semibold tracking-wide text-on-surface-variant">
        {weightLabel(weight)}
      </span>
    </div>
  );
}

function formatSessionDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function GameDetails({
  game,
  sessions,
}: {
  game: CollectionGame;
  sessions: GameSessionHistoryItem[];
}) {
  const router = useRouter();
  const [removing, setRemoving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const players =
    game.min_players != null && game.max_players != null
      ? game.min_players === game.max_players
        ? `${game.min_players} Players`
        : `${game.min_players}-${game.max_players} Players`
      : "Players unknown";

  const playtime =
    game.min_playtime != null && game.max_playtime != null
      ? game.min_playtime === game.max_playtime
        ? `${game.min_playtime} Min`
        : `${game.min_playtime}-${game.max_playtime} Min`
      : game.playing_time != null
        ? `${game.playing_time} Min`
        : "Time unknown";

  const image = game.image_url || game.thumbnail_url;

  const startHref = `/sessions/new?gameId=${game.id}&title=${encodeURIComponent(game.name)}`;

  async function removeFromCollection() {
    if (removing) return;

    setRemoving(true);
    try {
      const res = await fetch(
        `/api/collection?itemId=${encodeURIComponent(game.collection_item_id)}`,
        { method: "DELETE" }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not remove game");
      setConfirmOpen(false);
      router.push("/collection");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not remove game");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 md:gap-12">
      <section className="card-shadow flex flex-col overflow-hidden rounded-xl border border-secondary/10 bg-surface transition-shadow duration-300 hover:shadow-[0_8px_16px_0_rgba(100,63,25,0.08)] md:flex-row">
        <div className="relative h-64 w-full shrink-0 bg-surface-container md:h-auto md:w-1/3 md:min-h-[280px]">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt={game.name}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full min-h-[256px] items-center justify-center text-on-surface-variant">
              No cover art
            </div>
          )}
          {game.bgg_rating != null && (
            <RatingBadge rating={game.bgg_rating} size="md" />
          )}
        </div>
        <div className="relative z-10 flex flex-1 flex-col justify-between bg-surface p-6 md:w-2/3 md:p-8">
          <div>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <GameTags
                  categories={game.categories}
                  mechanics={game.mechanics}
                  max={6}
                />
              </div>
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                disabled={removing}
                className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-md border border-secondary/20 px-3 py-1.5 text-sm font-medium text-on-surface-variant transition-colors hover:border-error/30 hover:bg-error-container/40 hover:text-error disabled:opacity-60"
              >
                <span className="material-symbols-outlined !text-[18px] ![font-variation-settings:'FILL'_0,'wght'_400,'GRAD'_0,'opsz'_20]">
                  delete
                </span>
                Remove
              </button>
            </div>
            <h1 className="mb-2 font-[family-name:var(--font-headline)] text-3xl font-bold leading-tight text-primary md:text-5xl md:leading-[56px] md:tracking-[-0.02em]">
              {game.name}
            </h1>
            {game.year_published != null && (
              <p className="mb-3 text-sm text-on-surface-variant">
                {game.year_published}
              </p>
            )}
            <p className="mb-6 max-w-2xl text-base leading-7 text-on-surface-variant md:text-lg md:leading-8">
              {game.description || "No description available."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6 border-t border-outline-variant/20 pt-4">
            <div className="flex items-center gap-2 text-on-surface-variant">
              <span className="material-symbols-outlined text-secondary">group</span>
              <span className="text-sm font-semibold tracking-wide">{players}</span>
            </div>
            <div className="flex items-center gap-2 text-on-surface-variant">
              <span className="material-symbols-outlined text-secondary">
                hourglass_empty
              </span>
              <span className="text-sm font-semibold tracking-wide">{playtime}</span>
            </div>
            <WeightPips weight={game.weight} />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <section className="card-shadow rounded-xl border border-secondary/10 bg-surface p-6 md:p-8 lg:col-span-2">
          <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="mb-1 font-[family-name:var(--font-headline)] text-2xl font-semibold text-primary">
                Start New Session
              </h2>
              <p className="text-base text-on-surface-variant">
                Track scores for your current game.
              </p>
            </div>
            <Link
              href={startHref}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-2 text-sm font-semibold tracking-wide text-white shadow-sm transition-opacity hover:opacity-90"
            >
              <span className="material-symbols-outlined filled">play_arrow</span>
              Start Game
            </Link>
          </div>
          <div className="rounded-lg border border-dashed border-outline-variant/40 bg-surface-container-low px-4 py-8 text-center text-on-surface-variant">
            Create a session to track scores.
          </div>
        </section>

        <section className="card-shadow flex h-full flex-col rounded-xl border border-secondary/10 bg-surface p-6">
          <h2 className="mb-6 font-[family-name:var(--font-headline)] text-2xl font-semibold text-primary">
            Session History
          </h2>
          {sessions.length === 0 ? (
            <p className="flex-1 text-sm text-on-surface-variant">
              No sessions logged for this game yet.
            </p>
          ) : (
            <div className="flex flex-1 flex-col gap-4">
              {sessions.map((session) => (
                <Link
                  key={session.id}
                  href={`/sessions/${session.id}`}
                  className="group cursor-pointer rounded-lg border border-outline-variant/20 p-4 transition-colors hover:bg-surface-container-low"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-medium tracking-wide text-on-surface-variant">
                      {formatSessionDate(session.session_date)}
                    </span>
                    <span className="rounded bg-surface-container px-2 py-0.5 text-xs font-medium tracking-wide text-secondary">
                      {session.playerCount}{" "}
                      {session.playerCount === 1 ? "Player" : "Players"}
                    </span>
                  </div>
                  <div className="flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-base font-medium text-primary">
                        {session.winnerName
                          ? `Winner: ${session.winnerName}`
                          : "No winner recorded"}
                      </div>
                      <div className="truncate text-sm text-on-surface-variant">
                        {session.playerNames.join(", ") || "—"}
                      </div>
                    </div>
                    {session.winnerScore != null && (
                      <div className="shrink-0 font-[family-name:var(--font-headline)] text-2xl font-semibold text-primary transition-colors group-hover:text-accent">
                        {session.winnerScore} pt
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
          <Link
            href="/sessions"
            className="mt-6 block w-full rounded-lg border border-secondary py-3 text-center text-sm font-semibold tracking-wide text-secondary transition-colors hover:bg-secondary hover:text-on-secondary"
          >
            View All History
          </Link>
        </section>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-primary/40"
            onClick={() => !removing && setConfirmOpen(false)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="remove-game-title"
            className="relative z-[70] flex w-full max-w-sm flex-col rounded-2xl border border-secondary/10 bg-surface shadow-lg"
          >
            <div className="px-6 py-5">
              <h3
                id="remove-game-title"
                className="mb-2 font-[family-name:var(--font-headline)] text-lg font-semibold text-primary"
              >
                Remove from collection?
              </h3>
              <p className="text-sm text-on-surface-variant">
                Remove{" "}
                <span className="font-medium text-on-surface">{game.name}</span>{" "}
                from your collection? You can add it again later.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-outline-variant/20 px-6 py-4">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={removing}
                className="rounded-md px-4 py-2 text-sm font-bold text-on-surface-variant transition-colors hover:bg-surface-container-high disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={removeFromCollection}
                disabled={removing}
                className="rounded-md bg-error px-4 py-2 text-sm font-bold text-on-error disabled:opacity-60"
              >
                {removing ? "Removing…" : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
