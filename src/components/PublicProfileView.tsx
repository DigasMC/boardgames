"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Crown, Lock } from "lucide-react";
import { PublicProfileSkeleton } from "@/components/skeletons";
import { CoverImage } from "@/components/CoverImage";
import { GameCard } from "@/components/GameCard";
import type { CollectionGame, PlayStats, PublicProfile } from "@/types/database";

export function PublicProfileView({ username }: { username: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isSelf, setIsSelf] = useState(false);
  const [collection, setCollection] = useState<CollectionGame[]>([]);
  const [stats, setStats] = useState<PlayStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/users/${encodeURIComponent(username)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Not found");
        if (cancelled) return;
        setProfile(data.profile);
        setIsPrivate(Boolean(data.private));
        setIsSelf(Boolean(data.isSelf));
        setCollection((data.collection ?? []) as CollectionGame[]);
        setStats((data.stats ?? null) as PlayStats | null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [username]);

  if (loading) {
    return <PublicProfileSkeleton />;
  }
  if (error || !profile) {
    return <p className="text-error">{error || "Not found"}</p>;
  }

  const name = profile.display_name?.trim() || profile.username;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
      <div className="flex flex-wrap items-start gap-4">
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt=""
            referrerPolicy="no-referrer"
            className="size-20 rounded-2xl object-cover"
          />
        ) : (
          <div className="flex size-20 items-center justify-center rounded-2xl bg-primary-container text-xl font-bold text-on-primary-container">
            {name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="font-[family-name:var(--font-headline)] text-3xl font-bold text-primary">
            {name}
          </h1>
          <p className="text-on-surface-variant">@{profile.username}</p>
          {isSelf ? (
            <Link
              href="/profile"
              className="mt-2 inline-block text-sm font-semibold text-primary hover:underline"
            >
              Edit your profile
            </Link>
          ) : null}
        </div>
      </div>

      {isPrivate ? (
        <div className="card-shadow flex flex-col items-center gap-3 rounded-xl border border-secondary/10 bg-surface px-6 py-12 text-center">
          <Lock className="size-8 text-on-surface-variant" />
          <h2 className="font-[family-name:var(--font-headline)] text-xl font-semibold text-primary">
            This profile is private
          </h2>
          <p className="max-w-sm text-sm text-on-surface-variant">
            Collection and play stats are hidden until they make their profile
            public.
          </p>
        </div>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-surface-container-low px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                Sessions
              </p>
              <p className="mt-1 text-2xl font-bold text-primary">
                {stats?.sessionsPlayed ?? 0}
              </p>
            </div>
            <div className="rounded-xl bg-surface-container-low px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                Games played
              </p>
              <p className="mt-1 text-2xl font-bold text-primary">
                {stats?.gamesPlayed ?? 0}
              </p>
            </div>
            <div className="rounded-xl bg-surface-container-low px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                Wins
              </p>
              <p className="mt-1 text-2xl font-bold text-primary">
                {stats?.wins ?? 0}
              </p>
            </div>
          </section>

          {(stats?.recent?.length ?? 0) > 0 && (
            <section>
              <h2 className="mb-4 font-[family-name:var(--font-headline)] text-xl font-semibold text-primary">
                Recent plays
              </h2>
              <ul className="space-y-2">
                {stats!.recent.map((play) => (
                  <li key={`${play.session_id}-${play.game_id}`}>
                    <Link
                      href={`/sessions/${play.session_id}`}
                      className="card-shadow flex items-center gap-3 rounded-xl border border-outline-variant/10 bg-surface p-3 transition-colors hover:bg-surface-container-low"
                    >
                      <CoverImage
                        src={play.thumbnail_url}
                        alt={play.game_name ?? play.title}
                        className="h-14 w-12 shrink-0 rounded-md"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-on-surface">
                          {play.game_name || play.title}
                        </p>
                        <p className="text-xs text-on-surface-variant">
                          {new Date(play.session_date).toLocaleDateString()}
                        </p>
                      </div>
                      {play.won ? (
                        <Crown className="size-4 shrink-0 fill-amber-400 text-amber-500" />
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2 className="mb-4 font-[family-name:var(--font-headline)] text-xl font-semibold text-primary">
              Collection
            </h2>
            {collection.length === 0 ? (
              <p className="text-sm text-on-surface-variant">
                No games in collection yet.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {collection.map((game) => (
                  <GameCard key={game.id} game={game} href={null} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
