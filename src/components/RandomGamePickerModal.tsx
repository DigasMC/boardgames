"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dice5, Hourglass, Users, X } from "lucide-react";
import type { CollectionGame } from "@/types/database";
import { CoverImage } from "@/components/CoverImage";

const ITEM_HEIGHT = 152;
const REEL_LENGTH = 28;
const SPIN_MS = 3400;

type RandomGamePickerModalProps = {
  open: boolean;
  games: CollectionGame[];
  chosen: CollectionGame;
  onClose: () => void;
  onReroll: () => void;
};

function buildReel(
  games: CollectionGame[],
  chosen: CollectionGame
): CollectionGame[] {
  if (games.length === 0) return [chosen];

  const reel: CollectionGame[] = [];
  for (let i = 0; i < REEL_LENGTH - 1; i++) {
    reel.push(games[Math.floor(Math.random() * games.length)]);
  }
  reel.push(chosen);
  return reel;
}

function WeightDots({ weight }: { weight: number | null }) {
  const filled = weight ? Math.min(5, Math.max(1, Math.round(weight))) : 0;
  return (
    <div
      className="flex items-center gap-0.5"
      title={weight ? `Weight: ${weight}` : "Weight unknown"}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={`inline-block size-1.5 rounded-full ${
            i < filled ? "bg-current" : "border border-current opacity-40"
          }`}
        />
      ))}
    </div>
  );
}

function ReelItem({ game }: { game: CollectionGame }) {
  const image = game.image_url || game.thumbnail_url;

  const players =
    game.min_players != null && game.max_players != null
      ? game.min_players === game.max_players
        ? `${game.min_players}`
        : `${game.min_players}-${game.max_players}`
      : "—";

  const playtime =
    game.playing_time != null
      ? `${game.playing_time}m`
      : game.min_playtime != null && game.max_playtime != null
        ? `${game.min_playtime}-${game.max_playtime}m`
        : "—";

  return (
    <div
      className="flex items-center gap-4 px-3"
      style={{ height: ITEM_HEIGHT }}
    >
      <CoverImage
        src={image}
        alt={game.name}
        className="size-28 shrink-0 rounded-lg"
        loading="eager"
        referrerPolicy="no-referrer"
        fallback={
          <div className="flex h-full w-full items-center justify-center bg-surface-container-high text-outline">
            <Dice5 className="size-8" />
          </div>
        }
      />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 font-[family-name:var(--font-headline)] text-lg font-semibold leading-snug text-primary">
          {game.name}
        </p>
        <div className="mt-2 flex items-center gap-4 text-xs font-medium text-on-surface-variant">
          <div className="flex items-center gap-1" title="Players">
            <Users className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
            <span className="leading-none">{players}</span>
          </div>
          <div className="flex items-center gap-1" title="Play Time">
            <Hourglass
              className="size-3.5 shrink-0"
              strokeWidth={1.75}
              aria-hidden
            />
            <span className="leading-none">{playtime}</span>
          </div>
          <WeightDots weight={game.weight} />
        </div>
      </div>
    </div>
  );
}

export function RandomGamePickerModal({
  open,
  games,
  chosen,
  onClose,
  onReroll,
}: RandomGamePickerModalProps) {
  const router = useRouter();
  const reelRef = useRef<HTMLDivElement>(null);
  const [settled, setSettled] = useState(false);
  const [reel, setReel] = useState<CollectionGame[]>([]);

  useEffect(() => {
    if (!open) return;
    setSettled(false);
    setReel(buildReel(games, chosen));
  }, [open, chosen, games]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open || reel.length === 0) return;

    const el = reelRef.current;
    if (!el) return;

    setSettled(false);
    const targetY = -((reel.length - 1) * ITEM_HEIGHT);
    const animation = el.animate(
      [
        { transform: "translateY(0)" },
        { transform: `translateY(${targetY}px)` },
      ],
      {
        duration: SPIN_MS,
        easing: "cubic-bezier(0.08, 0.7, 0.12, 1)",
        fill: "forwards",
      }
    );

    animation.onfinish = () => setSettled(true);

    return () => {
      animation.cancel();
    };
  }, [open, reel]);

  if (!open) return null;

  const sessionHref = `/sessions/new?gameId=${chosen.id}&title=${encodeURIComponent(chosen.name)}`;
  const displayReel = reel.length > 0 ? reel : [chosen];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-primary/40"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="random-picker-title"
        className="relative z-[70] flex w-full max-w-md flex-col rounded-2xl border border-secondary/10 bg-surface shadow-lg"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-outline-variant/20 px-6 py-4">
          <h3
            id="random-picker-title"
            className="font-[family-name:var(--font-headline)] text-lg font-semibold text-primary"
          >
            {settled ? "Tonight's pick" : "Picking a game…"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-on-surface-variant transition-colors hover:bg-surface-container-high"
          >
            <X className="size-6" />
          </button>
        </div>

        <div
          className="slot-reel-window relative overflow-hidden bg-surface-container-low"
          style={{ height: ITEM_HEIGHT }}
          aria-live="polite"
          aria-atomic="true"
        >
          <div ref={reelRef} className="will-change-transform">
            {displayReel.map((game, index) => (
              <ReelItem key={`${game.id}-${index}`} game={game} />
            ))}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-outline-variant/20 px-6 py-4">
          <div className="flex min-h-9 w-full flex-wrap items-center justify-end gap-3">
            {settled ? (
              <>
                <button
                  type="button"
                  onClick={onReroll}
                  className="rounded-md px-4 py-2 text-sm font-bold text-on-surface-variant transition-colors hover:bg-surface-container-high"
                >
                  Re-roll
                </button>
                <Link
                  href={`/games/${chosen.id}`}
                  className="rounded-md px-4 py-2 text-sm font-bold text-on-surface-variant transition-colors hover:bg-surface-container-high"
                >
                  Details
                </Link>
                <button
                  type="button"
                  onClick={() => router.push(sessionHref)}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-on-primary"
                >
                  Start Session
                </button>
              </>
            ) : (
              <p className="w-full text-center text-sm text-on-surface-variant">
                Spinning through your collection…
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
