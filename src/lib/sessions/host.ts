import type { SessionHistoryRow } from "@/components/SessionHistoryCard";

/** Placeholder host id for optimistic offline-created sessions. */
export const LOCAL_SESSION_HOST_ID = "local";

/**
 * Whether the signed-in user is the session host.
 * Treats offline placeholder host ids as the creator when they appear on the roster.
 */
export function isSessionHost(
  session: Pick<SessionHistoryRow, "host_id" | "session_players">,
  currentUserId: string | null | undefined
): boolean {
  if (!currentUserId) return true;

  const hostId = session.host_id;
  if (!hostId || hostId === LOCAL_SESSION_HOST_ID) {
    return (session.session_players ?? []).some(
      (p) => p.user_id === currentUserId
    );
  }

  return hostId === currentUserId;
}
