"use client";

import { useEffect, useRef, useState } from "react";
import { UserRound, X } from "lucide-react";
import type { SessionPlayer } from "@/types/database";

const ITEM_HEIGHT = 112;
const REEL_LENGTH = 28;
const SPIN_MS = 3400;

type FirstPlayerPickerModalProps = {
  open: boolean;
  players: SessionPlayer[];
  chosen: SessionPlayer;
  onClose: () => void;
  onReroll: () => void;
};

function buildReel(
  players: SessionPlayer[],
  chosen: SessionPlayer
): SessionPlayer[] {
  if (players.length === 0) return [chosen];

  const reel: SessionPlayer[] = [];
  for (let i = 0; i < REEL_LENGTH - 1; i++) {
    reel.push(players[Math.floor(Math.random() * players.length)]);
  }
  reel.push(chosen);
  return reel;
}

function ReelItem({ player }: { player: SessionPlayer }) {
  const initials = player.display_name.slice(0, 2).toUpperCase();
  const avatar = player.profile?.avatar_url;

  return (
    <div
      className="flex items-center gap-4 px-4"
      style={{ height: ITEM_HEIGHT }}
    >
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatar}
          alt=""
          referrerPolicy="no-referrer"
          className="size-16 shrink-0 rounded-full object-cover"
        />
      ) : (
        <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary-container text-lg font-bold text-on-primary-container">
          {initials || <UserRound className="size-7" aria-hidden />}
        </div>
      )}
      <p className="min-w-0 flex-1 truncate font-[family-name:var(--font-headline)] text-xl font-semibold text-primary">
        {player.display_name}
      </p>
    </div>
  );
}

export function FirstPlayerPickerModal({
  open,
  players,
  chosen,
  onClose,
  onReroll,
}: FirstPlayerPickerModalProps) {
  const reelRef = useRef<HTMLDivElement>(null);
  const [settled, setSettled] = useState(false);
  const [reel, setReel] = useState<SessionPlayer[]>([]);

  useEffect(() => {
    if (!open) return;
    setSettled(false);
    setReel(buildReel(players, chosen));
  }, [open, chosen, players]);

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
        aria-labelledby="first-player-picker-title"
        className="relative z-[70] flex w-full max-w-md flex-col rounded-2xl border border-secondary/10 bg-surface shadow-lg"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-outline-variant/20 px-6 py-4">
          <h3
            id="first-player-picker-title"
            className="font-[family-name:var(--font-headline)] text-lg font-semibold text-primary"
          >
            {settled ? "First player" : "Picking who goes first…"}
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
            {displayReel.map((player, index) => (
              <ReelItem key={`${player.id}-${index}`} player={player} />
            ))}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-outline-variant/20 px-4 py-4 sm:gap-3 sm:px-6">
          <div className="flex min-h-9 w-full flex-nowrap items-center justify-end gap-2 sm:gap-3">
            {settled ? (
              <>
                <p className="mr-auto text-sm text-on-surface-variant">
                  <span className="font-semibold text-primary">
                    {chosen.display_name}
                  </span>{" "}
                  goes first
                </p>
                <button
                  type="button"
                  onClick={onReroll}
                  className="shrink-0 rounded-md px-2.5 py-2 text-sm font-bold text-on-surface-variant transition-colors hover:bg-surface-container-high sm:px-4"
                >
                  Re-roll
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="shrink-0 rounded-md bg-primary px-2.5 py-2 text-sm font-bold text-on-primary sm:px-4"
                >
                  Done
                </button>
              </>
            ) : (
              <p className="w-full text-center text-sm text-on-surface-variant">
                Spinning through the roster…
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
