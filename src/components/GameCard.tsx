"use client";

import Link from "next/link";
import { Hourglass, Users } from "lucide-react";
import type { CollectionGame } from "@/types/database";
import { GameTags } from "@/components/GameTags";
import { RatingBadge } from "@/components/RatingBadge";

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
          className={`inline-block size-1.5 rounded-full sm:size-2 ${
            i < filled ? "bg-current" : "border border-current opacity-40"
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
          {game.bgg_rating != null && <RatingBadge rating={game.bgg_rating} />}
        </div>
        <div className="flex flex-1 flex-col p-2.5 sm:p-3">
          <h3 className="mb-1 font-[family-name:var(--font-headline)] text-base font-semibold leading-tight text-primary sm:text-lg">
            {game.name}
          </h3>
          <div className="mb-2 min-h-[1.25rem] sm:min-h-[1.5rem]">
            <GameTags
              categories={game.categories}
              mechanics={game.mechanics}
              max={3}
              size="sm"
            />
          </div>
          <div className="mt-auto flex items-center justify-between gap-2 border-t border-outline-variant/20 pt-2 text-[10px] font-medium text-on-surface-variant sm:text-xs">
            <div className="flex items-center gap-1" title="Players">
              <Users className="size-3.5 shrink-0 sm:size-4" strokeWidth={1.75} aria-hidden />
              <span className="leading-none">{players}</span>
            </div>
            <div className="flex items-center gap-1" title="Play Time">
              <Hourglass className="size-3.5 shrink-0 sm:size-4" strokeWidth={1.75} aria-hidden />
              <span className="leading-none">{playtime}</span>
            </div>
            <WeightDots weight={game.weight} />
          </div>
        </div>
      </Link>
    </article>
  );
}
