"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Game, GameSession, SessionPlayer } from "@/types/database";

export type SessionHistoryRow = GameSession & {
  session_games: { game: Game | null }[] | null;
  session_players: SessionPlayer[] | null;
};

export function SessionHistoryCard({ session }: { session: SessionHistoryRow }) {
  const router = useRouter();
  const [removing, setRemoving] = useState(false);
  const [removed, setRemoved] = useState(false);

  const primaryGame = session.session_games?.[0]?.game;
  const date = new Date(session.session_date);

  async function deleteSession() {
    if (removing) return;
    if (
      !confirm(
        `Delete session "${session.title}"? This cannot be undone.`
      )
    ) {
      return;
    }

    setRemoving(true);
    try {
      const res = await fetch(
        `/api/sessions?id=${encodeURIComponent(session.id)}`,
        { method: "DELETE" }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not delete session");
      setRemoved(true);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not delete session");
    } finally {
      setRemoving(false);
    }
  }

  if (removed) return null;

  return (
    <div className="relative pl-6 md:pl-12">
      <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full border-4 border-background bg-surface-tint" />
      <div className="mb-2 text-xs font-medium text-on-surface-variant">
        {date.toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        })}
      </div>
      <article className="card-shadow card-hover relative flex flex-col overflow-hidden rounded-xl border border-outline-variant/10 bg-surface md:flex-row">
        <button
          type="button"
          onClick={deleteSession}
          disabled={removing}
          aria-label={`Delete session ${session.title}`}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded border border-secondary/20 bg-background/90 text-on-surface-variant backdrop-blur-sm transition-opacity hover:text-error disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-[18px]">delete</span>
        </button>
        <Link
          href={`/sessions/${session.id}`}
          className="flex flex-1 flex-col md:flex-row"
        >
          <div className="relative flex h-32 w-full items-center justify-center bg-secondary-container md:h-auto md:w-48">
            {primaryGame?.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={primaryGame.image_url}
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-80 mix-blend-multiply"
              />
            ) : null}
            <span className="relative z-10 px-3 text-center font-[family-name:var(--font-headline)] text-lg font-bold text-white drop-shadow">
              {primaryGame?.name ?? session.title}
            </span>
          </div>
          <div className="flex flex-1 flex-col justify-between p-6 pr-14">
            <div>
              <div className="mb-2 flex items-start justify-between gap-2">
                <h4 className="font-[family-name:var(--font-headline)] text-xl font-semibold text-on-surface">
                  {session.title}
                </h4>
                <span className="rounded bg-surface-container px-2 py-1 text-xs capitalize text-on-surface-variant">
                  {session.status.replace("_", " ")}
                </span>
              </div>
              {session.location && (
                <p className="text-sm text-on-surface-variant">
                  {session.location}
                </p>
              )}
            </div>
            <div className="mt-4 flex -space-x-2 border-t border-outline-variant/10 pt-4">
              {(session.session_players ?? []).slice(0, 6).map((p) => (
                <div
                  key={p.id}
                  title={p.display_name}
                  className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-surface bg-primary-container text-[10px] font-semibold text-on-primary-container"
                >
                  {p.display_name.slice(0, 2).toUpperCase()}
                </div>
              ))}
            </div>
          </div>
        </Link>
      </article>
    </div>
  );
}
