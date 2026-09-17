import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Game, GameSession, SessionPlayer } from "@/types/database";

type SessionRow = GameSession & {
  session_games: { game: Game | null }[] | null;
  session_players: SessionPlayer[] | null;
};

export default async function SessionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: sessions } = await supabase
    .from("sessions")
    .select(
      "*, session_games(game:games(*)), session_players(*)"
    )
    .eq("host_id", user.id)
    .order("session_date", { ascending: false });

  const rows = (sessions ?? []) as SessionRow[];
  const thisMonth = rows.filter((s) => {
    const d = new Date(s.session_date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const playCounts = new Map<string, number>();
  for (const s of rows) {
    for (const sg of s.session_games ?? []) {
      if (!sg.game) continue;
      playCounts.set(sg.game.name, (playCounts.get(sg.game.name) ?? 0) + 1);
    }
  }
  const mostPlayed = [...playCounts.entries()].sort((a, b) => b[1] - a[1])[0];

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
          className="rounded-lg bg-primary px-4 py-3 text-sm font-bold text-on-primary"
        >
          New session
        </Link>
      </div>

      <section className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="relative overflow-hidden rounded-xl border border-outline-variant/20 bg-gradient-to-br from-surface-container-low to-white p-6 shadow-sm">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-on-surface-variant">
            Games This Month
          </h3>
          <p className="font-[family-name:var(--font-headline)] text-5xl font-bold text-primary">
            {thisMonth}
          </p>
        </div>
        <div className="relative overflow-hidden rounded-xl border border-outline-variant/20 bg-gradient-to-br from-surface-container-low to-white p-6 shadow-sm">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-on-surface-variant">
            Most Played
          </h3>
          <p className="truncate font-[family-name:var(--font-headline)] text-2xl font-bold text-primary">
            {mostPlayed?.[0] ?? "—"}
          </p>
          <p className="mt-2 text-xs text-on-surface-variant">
            {mostPlayed ? `${mostPlayed[1]} sessions logged` : "Play a game to start tracking"}
          </p>
        </div>
        <div className="relative overflow-hidden rounded-xl border border-outline-variant/20 bg-gradient-to-br from-surface-container-low to-white p-6 shadow-sm">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-on-surface-variant">
            Total Sessions
          </h3>
          <p className="font-[family-name:var(--font-headline)] text-5xl font-bold text-primary">
            {rows.length}
          </p>
        </div>
      </section>

      <section>
        <h3 className="mb-6 font-[family-name:var(--font-headline)] text-2xl font-semibold text-primary">
          Play History
        </h3>
        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-outline-variant p-10 text-center text-on-surface-variant">
            No sessions yet.{" "}
            <Link href="/sessions/new" className="font-semibold text-primary underline">
              Host your first game night
            </Link>
          </div>
        ) : (
          <div className="relative ml-4 space-y-10 border-l-2 border-surface-container-high pb-8 md:ml-6">
            {rows.map((session) => {
              const primaryGame = session.session_games?.[0]?.game;
              const date = new Date(session.session_date);
              return (
                <div key={session.id} className="relative pl-6 md:pl-12">
                  <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full border-4 border-background bg-surface-tint" />
                  <div className="mb-2 text-xs font-medium text-on-surface-variant">
                    {date.toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </div>
                  <Link
                    href={`/sessions/${session.id}`}
                    className="card-shadow card-hover flex flex-col overflow-hidden rounded-xl border border-outline-variant/10 bg-surface md:flex-row"
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
                    <div className="flex flex-1 flex-col justify-between p-6">
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
                          <p className="text-sm text-on-surface-variant">{session.location}</p>
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
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
