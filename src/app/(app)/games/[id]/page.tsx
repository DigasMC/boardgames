"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  GameDetails,
  type GameSessionHistoryItem,
} from "@/components/GameDetails";
import { GameDetailsSkeleton } from "@/components/skeletons";
import type { CollectionGame } from "@/types/database";
import { subscribeSnapshots } from "@/lib/offline/snapshot";

export default function GameDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [game, setGame] = useState<CollectionGame | null>(null);
  const [sessions, setSessions] = useState<GameSessionHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const hydrate = useCallback(async () => {
    setError(null);
    try {
      const { loadGameOfflineAware } = await import("@/lib/offline/mutations");
      const data = await loadGameOfflineAware(id);
      setGame(data.game);
      setSessions(data.sessions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load game");
      setGame(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    void hydrate();
    return subscribeSnapshots(() => {
      void hydrate();
    });
  }, [hydrate]);

  if (loading) {
    return <GameDetailsSkeleton />;
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
