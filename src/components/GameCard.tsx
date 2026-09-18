"use client";

import Link from "next/link";
import type { CollectionGame } from "@/types/database";

function WeightDots({ weight }: { weight: number | null }) {
  const filled = weight ? Math.min(5, Math.max(1, Math.round(weight))) : 0;
  return (
    <div className="flex gap-px sm:gap-0.5" title={weight ? `Weight: ${weight}` : "Weight unknown"}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 w-1.5 rounded-full sm:h-2 sm:w-2 ${
            i < filled ? "bg-secondary" : "border border-secondary"
          }`}
        />
      ))}
    </div>
  );
}

export function GameCard({ game }: { game: CollectionGame }) {
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

  const image = game.image_url || game.thumbnail_url;

  return (
    <article className="card-shadow card-hover relative flex flex-row overflow-hidden rounded-xl border border-secondary/10 bg-surface sm:flex-col">
      <Link
        href={`/games/${game.id}`}
        className="flex flex-1 cursor-pointer flex-row sm:flex-col"
      >
        <div
          className="relative w-24 shrink-0 self-stretch border-r border-secondary/10 bg-surface-container bg-cover bg-center sm:h-40 sm:w-full sm:border-b sm:border-r-0"
          style={image ? { backgroundImage: `url('${image}')` } : undefined}
        >
          {game.bgg_rating != null && (
            <div className="absolute left-1.5 top-1.5 flex items-center gap-0.5 rounded-xl border border-white/40 bg-background/40 px-2 py-0.5 text-[10px] font-medium text-primary backdrop-blur-md sm:left-2 sm:top-2 sm:gap-1 sm:px-2.5 sm:py-1 sm:text-xs">
              <span className="material-symbols-outlined filled !text-[12px] sm:!text-[16px] ![font-variation-settings:'FILL'_1,'wght'_400,'GRAD'_0,'opsz'_20]">
                star
              </span>
              {game.bgg_rating.toFixed(1)}
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col p-2.5 sm:p-3">
          <h3 className="mb-1 font-[family-name:var(--font-headline)] text-base font-semibold leading-tight text-primary sm:text-lg">
            {game.name}
          </h3>
          <p className="mb-2 line-clamp-2 text-xs text-on-surface-variant">
            {game.description || "No description available."}
          </p>
          <div className="mt-auto flex items-center justify-between border-t border-outline-variant/20 pt-2 text-[10px] font-medium text-outline sm:text-xs">
            <div className="flex items-center gap-0.5 sm:gap-1" title="Players">
              <span className="material-symbols-outlined !text-[14px] sm:!text-[18px] ![font-variation-settings:'FILL'_0,'wght'_400,'GRAD'_0,'opsz'_20]">
                group
              </span>
              {players}
            </div>
            <div className="flex items-center gap-0.5 sm:gap-1" title="Play Time">
              <span className="material-symbols-outlined !text-[14px] sm:!text-[18px] ![font-variation-settings:'FILL'_0,'wght'_400,'GRAD'_0,'opsz'_20]">
                hourglass_empty
              </span>
              {playtime}
            </div>
            <WeightDots weight={game.weight} />
          </div>
        </div>
      </Link>
    </article>
  );
}
