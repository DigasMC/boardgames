import { SessionsView } from "@/components/SessionsView";

/** Shell only — sessions hydrate from IndexedDB (local-first). */
export default function SessionsPage() {
  return <SessionsView />;
}
