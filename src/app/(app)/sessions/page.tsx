import { createClient } from "@/lib/supabase/server";
import { SessionsView } from "@/components/SessionsView";
import { normalizeGameText } from "@/lib/htmlEntities";
import type { SessionHistoryRow } from "@/components/SessionHistoryCard";
import type { Game } from "@/types/database";

export default async function SessionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: sessions } = await supabase
    .from("sessions")
    .select(
      "*, session_games(game:games(*)), session_players(*), session_scores(*)"
    )
    .eq("host_id", user.id)
    .order("session_date", { ascending: false });

  const rows = ((sessions ?? []) as SessionHistoryRow[]).map((session) => ({
    ...session,
    session_games: (session.session_games ?? []).map((sg) => ({
      ...sg,
      game: sg.game ? normalizeGameText(sg.game as Game) : sg.game,
    })),
    session_scores: session.session_scores ?? [],
  }));

  return <SessionsView initialSessions={rows} />;
}
