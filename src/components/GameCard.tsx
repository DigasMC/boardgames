"use client";

import { useState } from "react";
import Link from "next/link";
import type { CollectionGame } from "@/types/database";

function WeightDots({ weight }: { weight: number | null }) {
  const filled = weight ? Math.min(5, Math.max(1, Math.round(weight))) : 0;
  return (
    <div className="flex gap-[2px]" title={weight ? `Weight: ${weight}` : "Weight unknown"}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className={`h-2 w-2 rounded-full ${
            i < filled ? "bg-secondary" : "border border-secondary"
          }`}
        />
      ))}
    </div>
  );
}

export function GameCard({
  game,
  onDeleted,
}: {
  game: CollectionGame;
  onDeleted?: (itemId: string) => void;
}) {
  const [removing, setRemoving] = useState(false);

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

  async function removeFromCollection() {
    if (removing) return;
    if (!confirm(`Remove ${game.name} from your collection?`)) return;

    setRemoving(true);
    try {
      const res = await fetch(
        `/api/collection?itemId=${encodeURIComponent(game.collection_item_id)}`,
        { method: "DELETE" }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not remove game");
      onDeleted?.(game.collection_item_id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not remove game");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <article className="card-shadow card-hover relative flex flex-col overflow-hidden rounded-xl border border-secondary/10 bg-surface">
      {onDeleted && (
        <button
          type="button"
          onClick={removeFromCollection}
          disabled={removing}
          aria-label={`Remove ${game.name} from collection`}
          className="absolute left-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded border border-secondary/20 bg-background/90 text-on-surface-variant backdrop-blur-sm transition-opacity hover:text-error disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-[18px]">delete</span>
        </button>
      )}
      <Link
        href={`/games/add?highlight=${game.bgg_id}`}
        className="flex flex-1 cursor-pointer flex-col"
      >
        <div
          className="relative h-48 w-full border-b border-secondary/10 bg-surface-container bg-cover bg-center"
          style={image ? { backgroundImage: `url('${image}')` } : undefined}
        >
          {game.bgg_rating != null && (
            <div className="absolute right-2 top-2 flex items-center gap-1 rounded border border-secondary/20 bg-background/90 px-2 py-1 text-xs font-medium text-primary backdrop-blur-sm">
              <span className="material-symbols-outlined filled text-[16px]">
                star
              </span>
              {game.bgg_rating.toFixed(1)}
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col p-4">
          <h3 className="mb-2 font-[family-name:var(--font-headline)] text-xl font-semibold leading-tight text-primary">
            {game.name}
          </h3>
          <p className="mb-4 line-clamp-2 text-sm text-on-surface-variant">
            {game.description || "No description available."}
          </p>
          <div className="mt-auto flex items-center justify-between border-t border-outline-variant/20 pt-3 text-xs font-medium text-outline">
            <div className="flex items-center gap-1" title="Players">
              <span className="material-symbols-outlined text-[18px]">group</span>
              {players}
            </div>
            <div className="flex items-center gap-1" title="Play Time">
              <span className="material-symbols-outlined text-[18px]">
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
