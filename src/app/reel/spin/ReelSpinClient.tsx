"use client";

import { useEffect, useState } from "react";

type ReelItem = {
  name: string;
  thumbnailUrl: string | null;
};

const ITEM_HEIGHT = 152;

export function ReelSpinClient({
  reel,
  chosenIndex,
  spinMs,
}: {
  reel: ReelItem[];
  chosenIndex: number;
  spinMs: number;
}) {
  const [offset, setOffset] = useState(0);
  const [done, setDone] = useState(false);
  const target = chosenIndex * ITEM_HEIGHT;

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setOffset(target);
      setDone(true);
      return;
    }
    const start = window.setTimeout(() => setOffset(target), 40);
    const end = window.setTimeout(() => setDone(true), spinMs + 80);
    return () => {
      window.clearTimeout(start);
      window.clearTimeout(end);
    };
  }, [spinMs, target]);

  const winner = reel[chosenIndex] ?? reel[reel.length - 1];

  return (
    <div className="w-full max-w-md">
      <div
        className="relative overflow-hidden rounded-2xl border-2 border-[#d4c4a8] bg-white shadow-sm"
        style={{ height: ITEM_HEIGHT }}
      >
        <div
          className="will-change-transform"
          style={{
            transform: `translateY(-${offset}px)`,
            transition: done
              ? "none"
              : `transform ${spinMs}ms cubic-bezier(0.12, 0.7, 0.1, 1)`,
          }}
        >
          {reel.map((item, i) => (
            <div
              key={`${item.name}-${i}`}
              className="flex items-center gap-4 px-4"
              style={{ height: ITEM_HEIGHT }}
            >
              {item.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.thumbnailUrl}
                  alt=""
                  className="size-28 shrink-0 rounded-lg object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex size-28 shrink-0 items-center justify-center rounded-lg bg-[#ebe4d6] text-sm text-[#8a7a62]">
                  No art
                </div>
              )}
              <p className="line-clamp-2 text-lg font-semibold text-[#1a1a1a]">
                {item.name}
              </p>
            </div>
          ))}
        </div>
        <div
          className="pointer-events-none absolute inset-x-2 top-1/2 h-10 -translate-y-1/2 rounded-lg border-2 border-[#c45c26]"
          aria-hidden
        />
      </div>
      <p
        className="mt-6 text-center text-xl font-bold text-[#1a1a1a] transition-opacity duration-500"
        style={{ opacity: done ? 1 : 0 }}
      >
        {winner ? `Winner: ${winner.name}` : null}
      </p>
    </div>
  );
}
