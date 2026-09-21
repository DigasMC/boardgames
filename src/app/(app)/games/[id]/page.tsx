import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  GameDetails,
  type GameSessionHistoryItem,
} from "@/components/GameDetails";
import { normalizeGameText } from "@/lib/htmlEntities";
import type {
  CollectionGame,
  Game,
  GameSession,
  SessionPlayer,
  SessionScore,
} from "@/types/database";

type SessionWithRelations = GameSession & {
  session_players: SessionPlayer[] | null;
  session_scores: SessionScore[] | null;
};

export default async function GameDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: collection } = await supabase
    .from("collections")
    .select("id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!collection) notFound();

  const { data: item } = await supabase
    .from("collection_items")
    .select("id, notes, is_wishlist, game:games(*)")
    .eq("collection_id", collection.id)
    .eq("game_id", id)
    .maybeSingle();

  if (!item?.game) notFound();

  const gameRow = normalizeGameText(item.game as unknown as Game);
  const game: CollectionGame = {
    ...gameRow,
    collection_item_id: item.id,
    notes: item.notes,
    is_wishlist: item.is_wishlist,
  };

  const { data: sessionGames } = await supabase
    .from("session_games")
    .select(
      "session:sessions(*, session_players(*), session_scores(*))"
    )
    .eq("game_id", id);

  const history: GameSessionHistoryItem[] = (sessionGames ?? [])
    .map((row) => {
      const session = row.session as unknown as SessionWithRelations | null;
      if (!session || session.host_id !== user.id) return null;

      const players = session.session_players ?? [];
      const scores = (session.session_scores ?? []).filter(
        (s) => s.game_id === id
      );
      const winnerScore =
        scores.find((s) => s.is_winner) ??
        [...scores].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];
      const winnerPlayer = winnerScore
        ? players.find((p) => p.id === winnerScore.player_id)
        : null;

      return {
        id: session.id,
        session_date: session.session_date,
        playerCount: players.length,
        playerNames: players.map((p) => p.display_name),
        winnerName: winnerPlayer?.display_name ?? null,
        winnerScore: winnerScore?.score ?? null,
      } satisfies GameSessionHistoryItem;
    })
    .filter((s): s is GameSessionHistoryItem => s != null)
    .sort(
      (a, b) =>
        new Date(b.session_date).getTime() - new Date(a.session_date).getTime()
    )
    .slice(0, 10);

  return <GameDetails game={game} sessions={history} />;
}
