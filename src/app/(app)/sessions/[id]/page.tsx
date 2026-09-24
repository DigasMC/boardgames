"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Crown, Pencil, Trash2 } from "lucide-react";
import { BackLink } from "@/components/BackLink";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { GameCard } from "@/components/GameCard";
import type { Game, GameSession, SessionPlayer, SessionScore } from "@/types/database";

type SessionDetail = GameSession & {
  session_games: { id?: string; game: Game | null }[];
  session_players: SessionPlayer[];
  session_scores: SessionScore[];
};

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [scores, setScores] = useState<
    Record<string, { score: string; is_winner: boolean }>
  >({});

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
        const game = data.session_games?.[0]?.game as Game | undefined;
        const map: Record<string, { score: string; is_winner: boolean }> = {};
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
        setScores(map);
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

  async function saveScores(e: FormEvent) {
    e.preventDefault();
    if (!session) return;
    const game = session.session_games?.[0]?.game;
    if (!game) return;

    setSaving(true);
    setError(null);
    const payload = Object.entries(scores).map(([playerId, value]) => ({
      playerId,
      gameId: game.id,
      score: value.score === "" ? null : Number(value.score),
      isWinner: value.is_winner,
    }));

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
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function deleteSession() {
    if (!session || deleting) return;

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
  const isReadOnly = session.status === "completed" && !editing;

  const rankedPlayers = [...players].sort((a, b) => {
    const scoreA = scores[a.id];
    const scoreB = scores[b.id];
    if (scoreA?.is_winner && !scoreB?.is_winner) return -1;
    if (scoreB?.is_winner && !scoreA?.is_winner) return 1;
    const numA = scoreA?.score === "" || scoreA?.score == null ? -Infinity : Number(scoreA.score);
    const numB = scoreB?.score === "" || scoreB?.score == null ? -Infinity : Number(scoreB.score);
    return numB - numA;
  });

  return (
    <div className="mx-auto max-w-4xl">
      <BackLink href="/sessions" label="Back to Sessions" />
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">
            {session.status.replace("_", " ")}
          </p>
          <h2 className="font-[family-name:var(--font-headline)] text-3xl font-bold text-primary">
            {session.title}
          </h2>
          <p className="mt-2 text-on-surface-variant">
            {new Date(session.session_date).toLocaleString()}
            {session.location ? ` · ${session.location}` : ""}
          </p>
          {session.notes && (
            <p className="mt-3 text-sm text-on-surface-variant">{session.notes}</p>
          )}
        </div>
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

      {game && (
        <GameCard game={game} layout="row" className="mb-8 max-w-md" />
      )}

      {isReadOnly ? (
        <div className="card-shadow rounded-xl border border-secondary/10 bg-surface p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-[family-name:var(--font-headline)] text-xl font-semibold text-primary">
              Score Tracker
            </h3>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-bold text-primary transition-colors hover:bg-surface-container-high"
            >
              <Pencil className="size-4" />
              Edit
            </button>
          </div>

          {players.length === 0 || !game ? (
            <p className="text-on-surface-variant">
              Add players and a game when creating a session to track scores.
            </p>
          ) : (
            <div className="space-y-2">
              {rankedPlayers.map((player) => {
                const row = scores[player.id] ?? { score: "", is_winner: false };
                return (
                  <div
                    key={player.id}
                    className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg py-2.5 pl-2.5 pr-6 ${
                      row.is_winner ? "bg-primary-fixed/40" : ""
                    }`}
                  >
                    <div className="relative flex w-10 items-center justify-center">
                      {row.is_winner ? (
                        <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-primary-container text-sm font-bold text-on-primary-container">
                          <Crown
                            aria-hidden
                            className="absolute -top-3.5 size-4 fill-amber-400 text-amber-500"
                          />
                          {player.display_name.slice(0, 2).toUpperCase()}
                        </div>
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container text-[10px] font-semibold text-on-surface-variant">
                          {player.display_name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <span
                      className={`font-medium text-on-surface ${
                        row.is_winner ? "text-base" : "text-sm"
                      }`}
                    >
                      {player.display_name}
                    </span>
                    <span
                      className={`min-w-[2.5rem] text-right tabular-nums text-on-surface-variant ${
                        row.is_winner ? "text-base font-semibold text-primary" : "text-sm"
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
      ) : (
        <form
          onSubmit={saveScores}
          className="card-shadow rounded-xl border border-secondary/10 bg-surface p-6"
        >
          <h3 className="mb-4 font-[family-name:var(--font-headline)] text-xl font-semibold text-primary">
            Score Tracker
          </h3>

          {players.length === 0 || !game ? (
            <p className="text-on-surface-variant">
              Add players and a game when creating a session to track scores.
            </p>
          ) : (
            <div className="space-y-2">
              {players.map((player) => {
                const row = scores[player.id] ?? { score: "", is_winner: false };
                return (
                  <div
                    key={player.id}
                    className="grid grid-cols-[1fr_100px_auto] items-center gap-3"
                  >
                    <span className="text-sm font-medium text-on-surface">
                      {player.display_name}
                    </span>
                    <input
                      type="number"
                      value={row.score}
                      onChange={(e) =>
                        setScores((prev) => ({
                          ...prev,
                          [player.id]: { ...row, score: e.target.value },
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
                            [player.id]: {
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
              disabled={saving || players.length === 0 || !game}
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
      )}

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
