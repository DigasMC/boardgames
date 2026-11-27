"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Play } from "lucide-react";
import {
  SessionHistoryCard,
  type SessionHistoryRow,
} from "@/components/SessionHistoryCard";
import { SessionStats } from "@/components/SessionStats";
import { SessionsPageSkeleton } from "@/components/skeletons";
import { subscribeSnapshots } from "@/lib/offline/snapshot";

function countSessionsInMonth(rows: SessionHistoryRow[], monthOffset: number) {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const targetMonth = target.getMonth();
  const targetYear = target.getFullYear();

  return rows.filter((s) => {
    const d = new Date(s.session_date);
    return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
  }).length;
}

export function SessionsView() {
  const [rows, setRows] = useState<SessionHistoryRow[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const hydrateFromLocal = useCallback(async () => {
    const [{ loadSessionsOfflineAware, loadMeOfflineAware }] = await Promise.all([
      import("@/lib/offline/mutations"),
    ]);
    const [sessions, me] = await Promise.all([
      loadSessionsOfflineAware(),
      loadMeOfflineAware(),
    ]);
    setRows(sessions);
    setCurrentUserId(me?.userId ?? null);
    setHydrated(true);
  }, []);

  useEffect(() => {
    void hydrateFromLocal();
    return subscribeSnapshots(() => {
      void hydrateFromLocal();
    });
  }, [hydrateFromLocal]);

  const thisMonth = countSessionsInMonth(rows, 0);
  const lastMonth = countSessionsInMonth(rows, -1);

  const { mostPlayed, uniqueGames } = useMemo(() => {
    const playCounts = new Map<string, number>();
    for (const s of rows) {
      for (const sg of s.session_games ?? []) {
        if (!sg.game) continue;
        playCounts.set(sg.game.name, (playCounts.get(sg.game.name) ?? 0) + 1);
      }
    }
    const top = [...playCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    return { mostPlayed: top, uniqueGames: playCounts.size };
  }, [rows]);

  if (!hydrated) {
    return <SessionsPageSkeleton />;
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="mb-2 font-[family-name:var(--font-headline)] text-3xl font-bold text-primary md:text-5xl">
            Recent Sessions
          </h2>
          <p className="text-lg text-on-surface-variant">
            Review your past battles, alliances, and narrow escapes.
          </p>
        </div>
        <Link
          href="/sessions/new"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-bold tracking-wide text-white shadow-sm transition-colors hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <Play
            className="size-5 shrink-0"
            fill="currentColor"
            strokeWidth={0}
            aria-hidden
          />
          Create session
        </Link>
      </div>

      <SessionStats
        thisMonth={thisMonth}
        lastMonth={lastMonth}
        mostPlayed={mostPlayed}
        totalSessions={rows.length}
        uniqueGames={uniqueGames}
      />

      <section>
        <h3 className="mb-6 font-[family-name:var(--font-headline)] text-2xl font-semibold text-primary">
          Play History
        </h3>
        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-outline-variant p-10 text-center text-on-surface-variant">
            No sessions yet.{" "}
            <Link href="/sessions/new" className="font-semibold text-primary underline">
              Create a session
            </Link>
          </div>
        ) : (
          <div className="relative ml-4 space-y-10 border-l-2 border-surface-container-high pb-8 md:ml-6">
            {rows.map((session) => (
              <SessionHistoryCard
                key={session.id}
                session={session}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
