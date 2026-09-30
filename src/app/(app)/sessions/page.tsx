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
      `*,
      host:profiles!sessions_host_id_fkey(id, username, display_name, avatar_url),
      session_games(game:games(*)),
      session_players(*, profile:profiles!session_players_user_id_fkey(id, username, display_name, avatar_url)),
      session_teams(*),
      session_scores(*)`
    )
    .order("session_date", { ascending: false });

  const rows = ((sessions ?? []) as SessionHistoryRow[]).map((session) => ({
    ...session,
    scoring_mode: session.scoring_mode ?? "individual",
    session_games: (session.session_games ?? []).map((sg) => ({
      ...sg,
      game: sg.game ? normalizeGameText(sg.game as Game) : sg.game,
    })),
    session_scores: session.session_scores ?? [],
    session_teams: session.session_teams ?? [],
  }));

  return <SessionsView initialSessions={rows} currentUserId={user.id} />;
}
