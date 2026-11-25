"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Hourglass, Play, Users } from "lucide-react";
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
  playHref,
}: {
  game: GameCardData;
  /** `row` locks the mobile horizontal layout at all breakpoints. */
  layout?: "responsive" | "row";
  className?: string;
  /** Override link target. Pass `null` for a non-linking card. */
  href?: string | null;
  /** Replaces the stats footer when provided (e.g. an Add button). */
  action?: ReactNode;
  /** Optional "start session" control overlaid on the cover art. */
  playHref?: string;
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

  const cover = (
    <div
      className={`relative w-24 shrink-0 self-stretch border-r border-secondary/10 ${
        rowOnly ? "" : "sm:h-40 sm:w-full sm:border-b sm:border-r-0"
      }`}
    >
      {linkHref ? (
        <Link
          href={linkHref}
          aria-label={game.name}
          className="absolute inset-0 z-[1]"
        >
          <span className="sr-only">{game.name}</span>
        </Link>
      ) : null}
      <CoverImage
        src={image}
        alt={game.name}
        className="h-full min-h-[5.5rem] w-full"
        referrerPolicy="no-referrer"
      >
        {game.bgg_rating != null && <RatingBadge rating={game.bgg_rating} />}
      </CoverImage>
    </div>
  );

  const details = (
    <div
      className={`flex flex-1 flex-col p-2.5 ${rowOnly ? "" : "sm:p-3"} ${
        playHref ? (rowOnly ? "pr-14" : "pr-14 sm:pr-3") : ""
      }`}
    >
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
  );

  return (
    <article
      className={`card-shadow card-hover relative flex flex-row overflow-hidden rounded-lg border border-secondary/10 bg-surface ${
        rowOnly ? "" : "sm:flex-col sm:rounded-xl"
      } ${className ?? ""}`}
    >
      {cover}
      {linkHref ? (
        <Link
          href={linkHref}
          className="flex min-w-0 flex-1 cursor-pointer flex-col"
        >
          {details}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 flex-col">{details}</div>
      )}
      {playHref ? (
        <Link
          href={playHref}
          aria-label={`Start a session with ${game.name}`}
          title="Start session"
          className={`absolute right-2 top-2 z-20 inline-flex h-7 w-12 items-center justify-center rounded-sm bg-accent text-white shadow-[0_3px_10px_rgba(255,133,41,0.4)] ring-1 ring-white/90 transition-all duration-200 hover:scale-105 hover:bg-[#ff933f] hover:shadow-[0_4px_14px_rgba(255,133,41,0.5)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
            rowOnly ? "" : "sm:right-2 sm:top-2 sm:h-5 sm:w-9"
          }`}
        >
          <Play
            className={`translate-x-px ${
              rowOnly ? "size-3.5" : "size-3.5 sm:size-3"
            }`}
            fill="currentColor"
            strokeWidth={0}
            aria-hidden
          />
        </Link>
      ) : null}
    </article>
  );
}
