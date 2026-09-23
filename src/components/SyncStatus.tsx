"use client";

import { useEffect, useState } from "react";
import { CloudOff, RefreshCw, Wifi } from "lucide-react";
import {
  flushOutbox,
  getSyncState,
  subscribeSync,
  type SyncState,
} from "@/lib/offline/sync";

export function SyncStatus() {
  const [state, setState] = useState<SyncState>(getSyncState);

  useEffect(() => subscribeSync(setState), []);

  if (state.online && state.pending === 0 && !state.syncing && !state.lastError) {
    return null;
  }

  return (
    <div className="rounded-lg border border-outline-variant/20 bg-surface px-3 py-2 text-xs text-on-surface-variant">
      <div className="flex items-center gap-2">
        {!state.online ? (
          <CloudOff className="size-3.5 shrink-0 text-secondary" />
        ) : state.syncing ? (
          <RefreshCw className="size-3.5 shrink-0 animate-spin text-primary" />
        ) : (
          <Wifi className="size-3.5 shrink-0 text-primary" />
        )}
        <span className="min-w-0 flex-1 leading-snug">
          {!state.online
            ? state.pending > 0
              ? `Offline · ${state.pending} change${state.pending === 1 ? "" : "s"} pending`
              : "Offline · using cached data"
            : state.syncing
              ? "Syncing…"
              : state.lastError
                ? state.lastError
                : `${state.pending} pending · tap to sync`}
        </span>
        {state.online && state.pending > 0 && !state.syncing ? (
          <button
            type="button"
            onClick={() => void flushOutbox()}
            className="shrink-0 font-semibold text-primary underline"
          >
            Sync
          </button>
        ) : null}
      </div>
    </div>
  );
}
