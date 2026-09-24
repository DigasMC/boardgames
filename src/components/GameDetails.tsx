"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Hourglass, Play, Trash2, Users } from "lucide-react";
import type { CollectionGame } from "@/types/database";
import { BackLink } from "@/components/BackLink";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { CoverImage } from "@/components/CoverImage";
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
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1" aria-hidden>
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className={`inline-block size-2 rounded-full ${
              i < filled ? "bg-current" : "border border-current opacity-40"
            }`}
          />
        ))}
      </div>
      <span className="text-sm font-semibold tracking-wide leading-none">
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
      const { removeGameFromCollection } = await import(
        "@/lib/offline/mutations"
      );
      await removeGameFromCollection(game.collection_item_id);
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
      <div className="-mb-4 md:-mb-8">
        <BackLink href="/collection" label="Back to Collection" />
      </div>
      <section className="card-shadow flex flex-col overflow-hidden rounded-xl border border-secondary/10 bg-surface transition-shadow duration-300 hover:shadow-[0_8px_16px_0_rgba(100,63,25,0.08)] md:flex-row">
        <CoverImage
          src={image}
          alt={game.name}
          className="h-64 w-full shrink-0 md:h-auto md:w-1/3 md:min-h-[280px]"
          fallback={
            <div className="flex h-full min-h-[256px] items-center justify-center text-on-surface-variant">
              No cover art
            </div>
          }
        >
          {game.bgg_rating != null && (
            <RatingBadge rating={game.bgg_rating} size="md" />
          )}
        </CoverImage>
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
                className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container-high disabled:opacity-60"
              >
                <Trash2 className="size-[18px]" />
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
          <div className="flex flex-wrap items-center gap-6 border-t border-outline-variant/20 pt-4 text-on-surface-variant">
            <div className="flex items-center gap-2">
              <Users className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
              <span className="text-sm font-semibold tracking-wide leading-none">
                {players}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Hourglass className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
              <span className="text-sm font-semibold tracking-wide leading-none">
                {playtime}
              </span>
            </div>
            <WeightPips weight={game.weight} />
          </div>
        </div>
      </section>

      <section className="card-shadow flex flex-col rounded-xl border border-secondary/10 bg-surface p-6 md:p-8">
        <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="mb-1 font-[family-name:var(--font-headline)] text-2xl font-semibold text-primary">
              Session History
            </h2>
            <p className="text-base text-on-surface-variant">
              Track scores for your current game.
            </p>
          </div>
          <Link
            href={startHref}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-2 text-sm font-semibold tracking-wide text-white shadow-sm transition-opacity hover:opacity-90"
          >
            <Play className="size-6" fill="currentColor" />
            Start Game
          </Link>
        </div>
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
          className="mt-6 block w-full rounded-lg bg-primary py-3 text-center text-sm font-semibold tracking-wide text-on-primary transition-opacity hover:opacity-90"
        >
          View All History
        </Link>
      </section>

      <ConfirmDialog
        open={confirmOpen}
        title="Remove from collection?"
        description={
          <>
            Remove{" "}
            <span className="font-medium text-on-surface">{game.name}</span>{" "}
            from your collection? You can add it again later.
          </>
        }
        confirmLabel="Remove"
        busyLabel="Removing…"
        busy={removing}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={removeFromCollection}
      />
    </div>
  );
}
