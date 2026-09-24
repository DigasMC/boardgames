"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  GameDetails,
  type GameSessionHistoryItem,
} from "@/components/GameDetails";
import type { CollectionGame } from "@/types/database";

export default function GameDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [game, setGame] = useState<CollectionGame | null>(null);
  const [sessions, setSessions] = useState<GameSessionHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const { loadGameOfflineAware } = await import(
          "@/lib/offline/mutations"
        );
        const data = await loadGameOfflineAware(id);
        if (cancelled) return;
        setGame(data.game);
        setSessions(data.sessions);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Could not load game"
        );
        setGame(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <p className="text-sm text-on-surface-variant">Loading game…</p>
    );
  }

  if (error || !game) {
    return (
      <p className="text-sm text-error">
        {error ?? "Game not found in your collection."}
      </p>
    );
  }

  return <GameDetails game={game} sessions={sessions} />;
}
