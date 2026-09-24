"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Hourglass, Users } from "lucide-react";
import type { Game } from "@/types/database";
import { CoverImage } from "@/components/CoverImage";
import { GameTags } from "@/components/GameTags";
import { RatingBadge } from "@/components/RatingBadge";

export type GameCardData = Pick<
  Game,
  | "name"
  | "image_url"
  | "thumbnail_url"
  | "min_players"
  | "max_players"
  | "min_playtime"
  | "max_playtime"
  | "playing_time"
  | "weight"
  | "bgg_rating"
  | "year_published"
  | "categories"
  | "mechanics"
> & {
  id?: string;
};

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

export function GameCard({
  game,
  layout = "responsive",
  className,
  href,
  action,
}: {
  game: GameCardData;
  /** `row` locks the mobile horizontal layout at all breakpoints. */
  layout?: "responsive" | "row";
  className?: string;
  /** Override link target. Pass `null` for a non-linking card. */
  href?: string | null;
  /** Replaces the stats footer when provided (e.g. an Add button). */
  action?: ReactNode;
}) {
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
  const rowOnly = layout === "row";
  const linkHref =
    href === null ? null : (href ?? (game.id ? `/games/${game.id}` : null));

  const body = (
    <>
      <CoverImage
        src={image}
        alt={game.name}
        className={`w-24 shrink-0 self-stretch border-r border-secondary/10 ${
          rowOnly ? "" : "sm:h-40 sm:w-full sm:border-b sm:border-r-0"
        }`}
      >
        {game.bgg_rating != null && <RatingBadge rating={game.bgg_rating} />}
      </CoverImage>
      <div className={`flex flex-1 flex-col p-2.5 ${rowOnly ? "" : "sm:p-3"}`}>
        <h3
          className={`mb-1 font-[family-name:var(--font-headline)] text-base font-semibold leading-tight text-primary ${
            rowOnly ? "" : "sm:text-lg"
          }`}
        >
          {game.name}
        </h3>
        {action && game.year_published != null && (
          <p className="mb-1 text-xs text-on-surface-variant">
            {game.year_published}
          </p>
        )}
        {action ? null : (
          <div
            className={`mb-2 min-h-[1.25rem] ${
              rowOnly ? "" : "sm:min-h-[1.5rem]"
            }`}
          >
            <GameTags
              categories={game.categories}
              mechanics={game.mechanics}
              max={3}
              size="sm"
            />
          </div>
        )}
        {action ? (
          <div className="mt-auto border-t border-outline-variant/20 pt-2">
            {action}
          </div>
        ) : (
          <div
            className={`mt-auto flex items-center gap-5 border-t border-outline-variant/20 pt-2 text-[10px] font-medium text-on-surface-variant ${
              rowOnly ? "" : "sm:text-xs"
            }`}
          >
            <div className="flex items-center gap-1" title="Players">
              <Users
                className={`size-3.5 shrink-0 ${rowOnly ? "" : "sm:size-4"}`}
                strokeWidth={1.75}
                aria-hidden
              />
              <span className="leading-none">{players}</span>
            </div>
            <div className="flex items-center gap-1" title="Play Time">
              <Hourglass
                className={`size-3.5 shrink-0 ${rowOnly ? "" : "sm:size-4"}`}
                strokeWidth={1.75}
                aria-hidden
              />
              <span className="leading-none">{playtime}</span>
            </div>
            <WeightDots weight={game.weight} />
          </div>
        )}
      </div>
    </>
  );

  return (
    <article
      className={`card-shadow card-hover relative flex flex-row overflow-hidden rounded-lg border border-secondary/10 bg-surface ${
        rowOnly ? "" : "sm:flex-col sm:rounded-xl"
      } ${className ?? ""}`}
    >
      {linkHref ? (
        <Link
          href={linkHref}
          className={`flex flex-1 cursor-pointer flex-row ${
            rowOnly ? "" : "sm:flex-col"
          }`}
        >
          {body}
        </Link>
      ) : (
        <div
          className={`flex flex-1 flex-row ${rowOnly ? "" : "sm:flex-col"}`}
        >
          {body}
        </div>
      )}
    </article>
  );
}
