"use client";

import Link from "next/link";
import { Crown } from "lucide-react";
import type {
  Game,
  GameSession,
  SessionPlayer,
  SessionScore,
  SessionTeam,
} from "@/types/database";
import { CoverImage } from "@/components/CoverImage";
import { isSessionHost } from "@/lib/sessions/host";

export type SessionHost = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export type SessionHistoryRow = GameSession & {
  session_games: { id?: string; game: Game | null }[] | null;
  session_players: SessionPlayer[] | null;
  session_scores: SessionScore[] | null;
  session_teams?: SessionTeam[] | null;
  host?: SessionHost | SessionHost[] | null;
};

function asHost(
  host: SessionHost | SessionHost[] | null | undefined
): SessionHost | null {
  if (!host) return null;
  return Array.isArray(host) ? host[0] ?? null : host;
}

function scoreForPlayer(
  scores: SessionScore[],
  playerId: string
): SessionScore | undefined {
  return scores.find((s) => s.player_id === playerId);
}

function resolveWinnerLabel(session: SessionHistoryRow): string | null {
  const scores = session.session_scores ?? [];
  if (scores.length === 0) return null;

  const winnerScore =
    scores.find((s) => s.is_winner) ??
    [...scores].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];
  if (!winnerScore) return null;

  if (winnerScore.team_id) {
    return (
      (session.session_teams ?? []).find((t) => t.id === winnerScore.team_id)
        ?.name ?? null
    );
  }
  if (winnerScore.player_id) {
    return (
      (session.session_players ?? []).find((p) => p.id === winnerScore.player_id)
        ?.display_name ?? null
    );
  }
  return null;
}

function resolveWinnerPlayerId(session: SessionHistoryRow): string | null {
  const scores = session.session_scores ?? [];
  const winnerScore =
    scores.find((s) => s.is_winner) ??
    [...scores].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];
  return winnerScore?.player_id ?? null;
}

function resolveWinnerTeamId(session: SessionHistoryRow): string | null {
  const scores = session.session_scores ?? [];
  const winnerScore =
    scores.find((s) => s.is_winner) ??
    [...scores].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];
  return winnerScore?.team_id ?? null;
}

function playersByPoints(session: SessionHistoryRow): SessionPlayer[] {
  const players = [...(session.session_players ?? [])];
  const scores = session.session_scores ?? [];
  const winnerId = resolveWinnerPlayerId(session);
  const winnerTeamId = resolveWinnerTeamId(session);

  return players.sort((a, b) => {
    if (winnerTeamId) {
      if (a.team_id === winnerTeamId && b.team_id !== winnerTeamId) return -1;
      if (b.team_id === winnerTeamId && a.team_id !== winnerTeamId) return 1;
    }
    if (a.id === winnerId) return -1;
    if (b.id === winnerId) return 1;
    const scoreA = scoreForPlayer(scores, a.id)?.score ?? -Infinity;
    const scoreB = scoreForPlayer(scores, b.id)?.score ?? -Infinity;
    return scoreB - scoreA;
  });
}

function PlayerAvatar({
  player,
  isWinner,
}: {
  player: SessionPlayer;
  isWinner: boolean;
}) {
  const avatar = player.profile?.avatar_url;
  const label = player.display_name.slice(0, 2).toUpperCase();
  const size = isWinner
    ? "h-7 w-7 text-[9px] md:h-8 md:w-8 md:text-[10px]"
    : "h-6 w-6 text-[8px] md:h-7 md:w-7 md:text-[9px]";

  return (
    <div title={player.display_name} className="relative flex flex-col items-center">
      {isWinner && (
        <Crown
          aria-hidden
          className="absolute -top-2.5 size-3 fill-amber-400 text-amber-500"
        />
      )}
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatar}
          alt=""
          referrerPolicy="no-referrer"
          className={`${size} rounded-full border-2 border-surface object-cover`}
        />
      ) : (
        <div
          className={`flex items-center justify-center rounded-full border-2 border-surface bg-primary-container font-semibold text-on-primary-container ${size}`}
        >
          {label}
        </div>
      )}
    </div>
  );
}

export function SessionHistoryCard({
  session,
  currentUserId,
}: {
  session: SessionHistoryRow;
  currentUserId?: string | null;
}) {
  const primaryGame = session.session_games?.[0]?.game;
  const date = new Date(session.session_date);
  const isCompleted = session.status === "completed";
  const winnerName = resolveWinnerLabel(session);
  const winnerId = resolveWinnerPlayerId(session);
  const winnerTeamId = resolveWinnerTeamId(session);
  const rankedPlayers = playersByPoints(session);
  const host = asHost(session.host);
  const isHost = isSessionHost(session, currentUserId);
  const hostLabel =
    host?.display_name?.trim() || host?.username || "another player";

  return (
    <div className="relative pl-6 md:pl-12">
      <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full border-4 border-background bg-surface-tint" />
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-medium text-on-surface-variant">
        <span>
          {date.toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </span>
        {!isHost && (
          <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-[10px] font-semibold text-on-surface">
            Hosted by {hostLabel}
          </span>
        )}
        {isHost && currentUserId && (
          <span className="rounded-full bg-primary-fixed/60 px-2 py-0.5 text-[10px] font-semibold text-on-primary-fixed-variant">
            You hosted
          </span>
        )}
      </div>
      <article className="card-shadow card-hover relative flex overflow-hidden rounded-xl border border-outline-variant/10 bg-surface">
        <Link
          href={`/sessions/${session.id}`}
          className="flex min-w-0 flex-1 flex-row"
        >
          <CoverImage
            src={primaryGame?.image_url || primaryGame?.thumbnail_url}
            alt={primaryGame?.name ?? session.title}
            className="w-24 shrink-0 self-stretch md:w-32"
          >
            <span
              className={`absolute left-0 top-0 z-[2] rounded-br-lg px-2 py-0.5 text-[10px] font-semibold capitalize backdrop-blur-sm ${
                isCompleted
                  ? "bg-primary-fixed/90 text-on-primary-fixed-variant"
                  : "bg-surface/90 text-on-surface-variant"
              }`}
            >
              {session.status.replace("_", " ")}
            </span>
          </CoverImage>
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 px-3 py-2.5 md:px-4 md:py-3">
            <div className="min-w-0">
              <h4 className="font-[family-name:var(--font-headline)] text-base font-semibold leading-snug text-on-surface md:text-lg">
                {session.title}
              </h4>
              {session.location && (
                <p className="truncate text-xs text-on-surface-variant md:text-sm">
                  {session.location}
                </p>
              )}
              {isCompleted && (
                <p className="text-xs font-medium text-primary md:text-sm">
                  {winnerName
                    ? `Winner: ${winnerName}`
                    : "No winner recorded"}
                </p>
              )}
            </div>
            <div className="flex items-end gap-1">
              {rankedPlayers.slice(0, 6).map((p) => {
                const isWinner =
                  p.id === winnerId ||
                  (winnerTeamId != null && p.team_id === winnerTeamId);
                return (
                  <PlayerAvatar key={p.id} player={p} isWinner={isWinner} />
                );
              })}
            </div>
          </div>
        </Link>
      </article>
    </div>
  );
}
