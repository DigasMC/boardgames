"use client";

import Link from "next/link";
import { Crown } from "lucide-react";
import type { Game, GameSession, SessionPlayer, SessionScore } from "@/types/database";
import { CoverImage } from "@/components/CoverImage";

export type SessionHistoryRow = GameSession & {
  session_games: { game: Game | null }[] | null;
  session_players: SessionPlayer[] | null;
  session_scores: SessionScore[] | null;
};

function scoreForPlayer(
  scores: SessionScore[],
  playerId: string
): SessionScore | undefined {
  return scores.find((s) => s.player_id === playerId);
}

function resolveWinnerId(session: SessionHistoryRow): string | null {
  const players = session.session_players ?? [];
  const scores = session.session_scores ?? [];
  if (scores.length === 0) return null;

  const winnerScore =
    scores.find((s) => s.is_winner) ??
    [...scores].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];
  if (!winnerScore) return null;
  if (!players.some((p) => p.id === winnerScore.player_id)) return null;
  return winnerScore.player_id;
}

function resolveWinnerName(session: SessionHistoryRow): string | null {
  const winnerId = resolveWinnerId(session);
  if (!winnerId) return null;
  return (
    (session.session_players ?? []).find((p) => p.id === winnerId)
      ?.display_name ?? null
  );
}

function playersByPoints(session: SessionHistoryRow): SessionPlayer[] {
  const players = [...(session.session_players ?? [])];
  const scores = session.session_scores ?? [];
  const winnerId = resolveWinnerId(session);

  return players.sort((a, b) => {
    if (a.id === winnerId) return -1;
    if (b.id === winnerId) return 1;
    const scoreA = scoreForPlayer(scores, a.id)?.score ?? -Infinity;
    const scoreB = scoreForPlayer(scores, b.id)?.score ?? -Infinity;
    return scoreB - scoreA;
  });
}

export function SessionHistoryCard({ session }: { session: SessionHistoryRow }) {
  const primaryGame = session.session_games?.[0]?.game;
  const date = new Date(session.session_date);
  const isCompleted = session.status === "completed";
  const winnerName = resolveWinnerName(session);
  const winnerId = resolveWinnerId(session);
  const rankedPlayers = playersByPoints(session);

  return (
    <div className="relative pl-6 md:pl-12">
      <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full border-4 border-background bg-surface-tint" />
      <div className="mb-2 text-xs font-medium text-on-surface-variant">
        {date.toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        })}
      </div>
      <article className="card-shadow card-hover relative flex overflow-hidden rounded-xl border border-outline-variant/10 bg-surface">
        <Link
          href={`/sessions/${session.id}`}
          className="flex min-w-0 flex-1 flex-row"
        >
          <CoverImage
            src={primaryGame?.image_url || primaryGame?.thumbnail_url}
            alt={primaryGame?.name ?? session.title}
            className="w-28 shrink-0 self-stretch md:w-48"
          />
          <div className="flex flex-1 flex-col justify-between p-4 md:p-6">
            <div>
              <div className="mb-2 flex flex-col items-start gap-1.5 md:flex-row md:justify-between md:gap-2">
                <h4 className="font-[family-name:var(--font-headline)] text-xl font-semibold text-on-surface">
                  {session.title}
                </h4>
                <span
                  className={`rounded px-2 py-1 text-xs capitalize ${
                    isCompleted
                      ? "bg-primary-fixed text-on-primary-fixed-variant"
                      : "bg-surface-container text-on-surface-variant"
                  }`}
                >
                  {session.status.replace("_", " ")}
                </span>
              </div>
              {session.location && (
                <p className="text-sm text-on-surface-variant">
                  {session.location}
                </p>
              )}
              {isCompleted && (
                <p className="mt-1 text-sm font-medium text-primary">
                  {winnerName
                    ? `Winner: ${winnerName}`
                    : "No winner recorded"}
                </p>
              )}
            </div>
            <div className="mt-4 flex items-end gap-1.5 border-t border-outline-variant/10 pt-5">
              {rankedPlayers.slice(0, 6).map((p) => {
                const isWinner = p.id === winnerId;
                return (
                  <div
                    key={p.id}
                    title={p.display_name}
                    className="relative flex flex-col items-center"
                  >
                    {isWinner && (
                      <Crown
                        aria-hidden
                        className="absolute -top-3 size-3.5 fill-amber-400 text-amber-500 md:-top-3.5 md:size-4"
                      />
                    )}
                    <div
                      className={`flex items-center justify-center rounded-full border-2 border-surface bg-primary-container font-semibold text-on-primary-container ${
                        isWinner
                          ? "h-9 w-9 text-[10px] md:h-11 md:w-11 md:text-xs"
                          : "h-7 w-7 text-[9px] md:h-8 md:w-8 md:text-[10px]"
                      }`}
                    >
                      {p.display_name.slice(0, 2).toUpperCase()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Link>
      </article>
    </div>
  );
}
