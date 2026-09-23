"use client";

import { useEffect } from "react";
import { startSyncListeners } from "@/lib/offline/sync";

/** Boots offline sync listeners once in the authenticated app shell. */
export function OfflineProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => startSyncListeners(), []);
  return <>{children}</>;
}
