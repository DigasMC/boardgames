"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Game, GameSession, SessionPlayer, SessionScore } from "@/types/database";

type SessionDetail = GameSession & {
  session_games: { id: string; game: Game }[];
  session_players: SessionPlayer[];
  session_scores: SessionScore[];
};

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [scores, setScores] = useState<
    Record<string, { score: string; is_winner: boolean }>
  >({});

  useEffect(() => {
    fetch(`/api/sessions?id=${id}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Failed to load");
        setSession(data.session);
        const map: Record<string, { score: string; is_winner: boolean }> = {};
        for (const player of data.session.session_players ?? []) {
          for (const sg of data.session.session_games ?? []) {
            const key = `${player.id}:${sg.game.id}`;
            const existing = (data.session.session_scores ?? []).find(
              (s: SessionScore) =>
                s.player_id === player.id && s.game_id === sg.game.id
            );
            map[key] = {
              score: existing?.score != null ? String(existing.score) : "",
              is_winner: Boolean(existing?.is_winner),
            };
          }
        }
        setScores(map);
      })
      .catch((err) => setError(err.message));
  }, [id]);

  async function saveScores(e: FormEvent) {
    e.preventDefault();
    if (!session) return;
    setSaving(true);
    setError(null);
    const payload = Object.entries(scores).map(([key, value]) => {
      const [playerId, gameId] = key.split(":");
      return {
        playerId,
        gameId,
        score: value.score === "" ? null : Number(value.score),
        isWinner: value.is_winner,
      };
    });

    try {
      const res = await fetch("/api/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          status: "completed",
          scores: payload,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setSession(data.session);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (error && !session) {
    return <p className="text-error">{error}</p>;
  }
  if (!session) {
    return <p className="text-on-surface-variant">Loading session…</p>;
  }

  const games = session.session_games ?? [];
  const players = session.session_players ?? [];

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
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

      <div className="mb-8 flex flex-wrap gap-3">
        {games.map((sg) => (
          <div
            key={sg.id}
            className="rounded-lg border border-secondary/10 bg-surface px-4 py-2 text-sm font-semibold text-primary"
          >
            {sg.game.name}
          </div>
        ))}
      </div>

      <form onSubmit={saveScores} className="card-shadow rounded-xl border border-secondary/10 bg-surface p-6">
        <h3 className="mb-4 font-[family-name:var(--font-headline)] text-xl font-semibold text-primary">
          Score Tracker
        </h3>

        {players.length === 0 || games.length === 0 ? (
          <p className="text-on-surface-variant">
            Add players and games when creating a session to track scores.
          </p>
        ) : (
          <div className="space-y-6">
            {games.map((sg) => (
              <div key={sg.id}>
                <h4 className="mb-3 text-sm font-semibold text-on-surface-variant">
                  {sg.game.name}
                </h4>
                <div className="space-y-2">
                  {players.map((player) => {
                    const key = `${player.id}:${sg.game.id}`;
                    const row = scores[key] ?? { score: "", is_winner: false };
                    return (
                      <div
                        key={key}
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
                              [key]: { ...row, score: e.target.value },
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
                                [key]: { ...row, is_winner: e.target.checked },
                              }))
                            }
                          />
                          Winner
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <p className="mt-4 rounded-md bg-error-container px-3 py-2 text-sm text-on-error-container">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving || players.length === 0 || games.length === 0}
          className="mt-6 rounded-lg bg-primary px-5 py-3 font-bold text-on-primary disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save scores"}
        </button>
      </form>
    </div>
  );
}
