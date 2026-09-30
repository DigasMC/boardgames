"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Crown, Pencil, Trash2, Users } from "lucide-react";
import { BackLink } from "@/components/BackLink";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { GameCard } from "@/components/GameCard";
import { SessionRosterEditor } from "@/components/SessionRosterEditor";
import { createClient } from "@/lib/supabase/client";
import type {
  Game,
  GameSession,
  SessionPlayer,
  SessionPlayerInput,
  SessionScore,
  SessionTeam,
} from "@/types/database";
import type { SessionHost } from "@/components/SessionHistoryCard";

type SessionDetail = GameSession & {
  session_games: { id?: string; game: Game | null }[];
  session_players: SessionPlayer[];
  session_scores: SessionScore[];
  session_teams?: SessionTeam[];
  host?: SessionHost | SessionHost[] | null;
};

function asHost(
  host: SessionHost | SessionHost[] | null | undefined
): SessionHost | null {
  if (!host) return null;
  return Array.isArray(host) ? host[0] ?? null : host;
}

function scoresMapFromSession(data: SessionDetail): Record<
  string,
  { score: string; is_winner: boolean }
> {
  const game = data.session_games?.[0]?.game as Game | undefined;
  const map: Record<string, { score: string; is_winner: boolean }> = {};
  const isTeam = (data.scoring_mode ?? "individual") === "team";
  if (isTeam) {
    for (const team of data.session_teams ?? []) {
      if (!game) continue;
      const existing = (data.session_scores ?? []).find(
        (s: SessionScore) => s.team_id === team.id && s.game_id === game.id
      );
      map[team.id] = {
        score: existing?.score != null ? String(existing.score) : "",
        is_winner: Boolean(existing?.is_winner),
      };
    }
  } else {
    for (const player of data.session_players ?? []) {
      if (!game) continue;
      const existing = (data.session_scores ?? []).find(
        (s: SessionScore) =>
          s.player_id === player.id && s.game_id === game.id
      );
      map[player.id] = {
        score: existing?.score != null ? String(existing.score) : "",
        is_winner: Boolean(existing?.is_winner),
      };
    }
  }
  return map;
}

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [rosterSaving, setRosterSaving] = useState(false);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingRoster, setEditingRoster] = useState(false);
  const [scores, setScores] = useState<
    Record<string, { score: string; is_winner: boolean }>
  >({});

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { loadSessionOfflineAware } = await import(
          "@/lib/offline/mutations"
        );
        const data = await loadSessionOfflineAware(id);
        if (cancelled) return;
        setSession(data as SessionDetail);
        setScores(scoresMapFromSession(data as SessionDetail));
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      }
    })();

    function onRemap(event: Event) {
      const detail = (event as CustomEvent<{ tempId: string; realId: string }>)
        .detail;
      if (detail?.tempId === id && detail.realId) {
        router.replace(`/sessions/${detail.realId}`);
      }
    }
    window.addEventListener("tablist:session-id-remapped", onRemap);

    return () => {
      cancelled = true;
      window.removeEventListener("tablist:session-id-remapped", onRemap);
    };
  }, [id, router]);

  const isHost = useMemo(() => {
    if (!session || !currentUserId) return true;
    return session.host_id === currentUserId;
  }, [session, currentUserId]);

  const isTeamMode = (session?.scoring_mode ?? "individual") === "team";

  async function saveScores(e: FormEvent) {
    e.preventDefault();
    if (!session || !isHost) return;
    const game = session.session_games?.[0]?.game;
    if (!game) return;

    setSaving(true);
    setError(null);
    const payload = Object.entries(scores).map(([entityId, value]) =>
      isTeamMode
        ? {
            teamId: entityId,
            gameId: game.id,
            score: value.score === "" ? null : Number(value.score),
            isWinner: value.is_winner,
          }
        : {
            playerId: entityId,
            gameId: game.id,
            score: value.score === "" ? null : Number(value.score),
            isWinner: value.is_winner,
          }
    );

    try {
      const { patchSessionOfflineAware } = await import(
        "@/lib/offline/mutations"
      );
      const { session: next } = await patchSessionOfflineAware({
        sessionId: session.id,
        status: "completed",
        scores: payload,
      });
      setSession(next as SessionDetail);
      setScores(scoresMapFromSession(next as SessionDetail));
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function saveRoster(payload: {
    scoringMode: "individual" | "team";
    teams: string[];
    players: SessionPlayerInput[];
  }) {
    if (!session || !isHost) return;
    setRosterSaving(true);
    setRosterError(null);
    try {
      const { patchSessionOfflineAware } = await import(
        "@/lib/offline/mutations"
      );
      const { session: next } = await patchSessionOfflineAware({
        sessionId: session.id,
        scoringMode: payload.scoringMode,
        teams: payload.teams,
        players: payload.players,
      });
      setSession(next as SessionDetail);
      setScores(scoresMapFromSession(next as SessionDetail));
      setEditingRoster(false);
      setEditing(false);
      router.refresh();
    } catch (err) {
      setRosterError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setRosterSaving(false);
    }
  }

  async function deleteSession() {
    if (!session || deleting || !isHost) return;

    setDeleting(true);
    setError(null);
    try {
      const { deleteSessionOfflineAware } = await import(
        "@/lib/offline/mutations"
      );
      await deleteSessionOfflineAware(session.id);
      setConfirmOpen(false);
      router.push("/sessions");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete session");
      setDeleting(false);
    }
  }

  if (error && !session) {
    return <p className="text-error">{error}</p>;
  }
  if (!session) {
    return <p className="text-on-surface-variant">Loading session…</p>;
  }

  const game = session.session_games?.[0]?.game ?? null;
  const players = session.session_players ?? [];
  const teams = session.session_teams ?? [];
  const host = asHost(session.host);
  const hostLabel =
    host?.display_name?.trim() || host?.username || "another player";
  const isReadOnly =
    !isHost || (session.status === "completed" && !editing);

  const scoreEntities = isTeamMode
    ? [...teams].sort((a, b) => a.sort_order - b.sort_order)
    : players;

  const rankedEntities = [...scoreEntities].sort((a, b) => {
    const scoreA = scores[a.id];
    const scoreB = scores[b.id];
    if (scoreA?.is_winner && !scoreB?.is_winner) return -1;
    if (scoreB?.is_winner && !scoreA?.is_winner) return 1;
    const numA =
      scoreA?.score === "" || scoreA?.score == null
        ? -Infinity
        : Number(scoreA.score);
    const numB =
      scoreB?.score === "" || scoreB?.score == null
        ? -Infinity
        : Number(scoreB.score);
    return numB - numA;
  });

  function entityLabel(entity: SessionPlayer | SessionTeam) {
    if ("display_name" in entity) return entity.display_name;
    return entity.name;
  }

  function entityAvatar(entity: SessionPlayer | SessionTeam) {
    if ("display_name" in entity) {
      const avatar = entity.profile?.avatar_url;
      if (avatar) {
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatar}
            alt=""
            referrerPolicy="no-referrer"
            className="size-full rounded-full object-cover"
          />
        );
      }
      return entity.display_name.slice(0, 2).toUpperCase();
    }
    return entity.name.slice(0, 2).toUpperCase();
  }

  return (
    <div className="mx-auto max-w-4xl">
      <BackLink href="/sessions" label="Back to Sessions" />
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">
            {session.status.replace("_", " ")}
            {isTeamMode ? " · team scoring" : ""}
          </p>
          <h2 className="font-[family-name:var(--font-headline)] text-3xl font-bold text-primary">
            {session.title}
          </h2>
          <p className="mt-2 text-on-surface-variant">
            {new Date(session.session_date).toLocaleString()}
            {session.location ? ` · ${session.location}` : ""}
          </p>
          {!isHost && (
            <p className="mt-1 text-sm font-medium text-primary">
              Hosted by {hostLabel}
            </p>
          )}
          {session.notes && (
            <p className="mt-3 text-sm text-on-surface-variant">{session.notes}</p>
          )}
        </div>
        {isHost ? (
          <div className="flex flex-wrap gap-2">
            {!editingRoster ? (
              <button
                type="button"
                onClick={() => {
                  setEditingRoster(true);
                  setEditing(false);
                  setRosterError(null);
                }}
                className="inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-bold text-primary transition-colors hover:bg-surface-container-high"
              >
                <Users className="size-4" />
                Edit players
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              disabled={deleting}
              className="inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-bold text-on-surface-variant transition-colors hover:bg-error-container/40 hover:text-error disabled:opacity-60"
            >
              <Trash2 className="size-4" />
              {deleting ? "Deleting…" : "Delete session"}
            </button>
          </div>
        ) : null}
      </div>

      {game && (
        <GameCard game={game} layout="row" className="mb-8 max-w-md" />
      )}

      {editingRoster && isHost ? (
        <div className="mb-8">
          <SessionRosterEditor
            initialPlayers={players}
            initialTeams={teams}
            initialTeamMode={isTeamMode}
            busy={rosterSaving}
            error={rosterError}
            onCancel={() => {
              setEditingRoster(false);
              setRosterError(null);
            }}
            onSave={saveRoster}
          />
        </div>
      ) : (
        <>
          {!isTeamMode && players.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-2">
              {players.map((player) => (
                <div
                  key={player.id}
                  className="inline-flex items-center gap-2 rounded-full bg-surface-container-low px-3 py-1.5 text-sm"
                >
                  {player.profile?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={player.profile.avatar_url}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="size-6 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex size-6 items-center justify-center rounded-full bg-primary-container text-[9px] font-semibold text-on-primary-container">
                      {player.display_name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  {player.display_name}
                </div>
              ))}
            </div>
          )}

          {isTeamMode && teams.length > 0 && (
            <div className="mb-6 space-y-3">
              {teams.map((team) => {
                const members = players.filter((p) => p.team_id === team.id);
                return (
                  <div
                    key={team.id}
                    className="rounded-lg bg-surface-container-low px-4 py-3"
                  >
                    <p className="text-sm font-semibold text-primary">
                      {team.name}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {members.map((player) => (
                        <span
                          key={player.id}
                          className="inline-flex items-center gap-1.5 text-sm text-on-surface"
                        >
                          {player.profile?.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={player.profile.avatar_url}
                              alt=""
                              referrerPolicy="no-referrer"
                              className="size-5 rounded-full object-cover"
                            />
                          ) : null}
                          {player.display_name}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {!editingRoster && isReadOnly ? (
        <div className="card-shadow rounded-xl border border-secondary/10 bg-surface p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-[family-name:var(--font-headline)] text-xl font-semibold text-primary">
              Score Tracker
            </h3>
            {isHost ? (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-bold text-primary transition-colors hover:bg-surface-container-high"
              >
                <Pencil className="size-4" />
                Edit
              </button>
            ) : (
              <span className="text-xs font-medium text-on-surface-variant">
                View only
              </span>
            )}
          </div>

          {scoreEntities.length === 0 || !game ? (
            <p className="text-on-surface-variant">
              Add players and a game when creating a session to track scores.
            </p>
          ) : (
            <div className="space-y-2">
              {rankedEntities.map((entity) => {
                const row = scores[entity.id] ?? {
                  score: "",
                  is_winner: false,
                };
                return (
                  <div
                    key={entity.id}
                    className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg py-2.5 pl-2.5 pr-6 ${
                      row.is_winner ? "bg-primary-fixed/40" : ""
                    }`}
                  >
                    <div className="relative flex w-10 items-center justify-center">
                      {row.is_winner ? (
                        <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-primary-container text-sm font-bold text-on-primary-container">
                          <Crown
                            aria-hidden
                            className="absolute -top-3.5 size-4 fill-amber-400 text-amber-500"
                          />
                          {entityAvatar(entity)}
                        </div>
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-surface-container text-[10px] font-semibold text-on-surface-variant">
                          {entityAvatar(entity)}
                        </div>
                      )}
                    </div>
                    <span
                      className={`font-medium text-on-surface ${
                        row.is_winner ? "text-base" : "text-sm"
                      }`}
                    >
                      {entityLabel(entity)}
                    </span>
                    <span
                      className={`min-w-[2.5rem] text-right tabular-nums text-on-surface-variant ${
                        row.is_winner
                          ? "text-base font-semibold text-primary"
                          : "text-sm"
                      }`}
                    >
                      {row.score === "" ? "—" : row.score}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      {!editingRoster && !isReadOnly ? (
        <form
          onSubmit={saveScores}
          className="card-shadow rounded-xl border border-secondary/10 bg-surface p-6"
        >
          <h3 className="mb-4 font-[family-name:var(--font-headline)] text-xl font-semibold text-primary">
            Score Tracker
          </h3>

          {scoreEntities.length === 0 || !game ? (
            <p className="text-on-surface-variant">
              Add players and a game when creating a session to track scores.
            </p>
          ) : (
            <div className="space-y-2">
              {scoreEntities.map((entity) => {
                const row = scores[entity.id] ?? {
                  score: "",
                  is_winner: false,
                };
                return (
                  <div
                    key={entity.id}
                    className="grid grid-cols-[1fr_100px_auto] items-center gap-3"
                  >
                    <span className="text-sm font-medium text-on-surface">
                      {entityLabel(entity)}
                    </span>
                    <input
                      type="number"
                      value={row.score}
                      onChange={(e) =>
                        setScores((prev) => ({
                          ...prev,
                          [entity.id]: { ...row, score: e.target.value },
                        }))
                      }
                      className="rounded-md bg-surface-container px-3 py-2 text-sm outline-none ring-primary focus:ring-1"
                      placeholder="Score"
                    />
                    <label className="flex items-center gap-2 text-xs text-on-surface-variant">
                      <input
                        type="checkbox"
                        checked={row.is_winner}
                        onChange={(e) =>
                          setScores((prev) => ({
                            ...prev,
                            [entity.id]: {
                              ...row,
                              is_winner: e.target.checked,
                            },
                          }))
                        }
                      />
                      Winner
                    </label>
                  </div>
                );
              })}
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-md bg-error-container px-3 py-2 text-sm text-on-error-container">
              {error}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={saving || scoreEntities.length === 0 || !game}
              className="rounded-lg bg-primary px-5 py-3 font-bold text-on-primary disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save scores"}
            </button>
            {session.status === "completed" && editing && (
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-lg border border-secondary/20 px-5 py-3 font-bold text-on-surface-variant"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        title="Delete session?"
        description={
          <>
            Delete{" "}
            <span className="font-medium text-on-surface">{session.title}</span>?
            This cannot be undone.
          </>
        }
        confirmLabel="Delete"
        busyLabel="Deleting…"
        busy={deleting}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={deleteSession}
      />
    </div>
  );
}
