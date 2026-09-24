"use client";

import type { ReactNode } from "react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  busyLabel: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  busyLabel,
  busy = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  if (!open) return null;

  const titleId = "confirm-dialog-title";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-primary/40"
        onClick={() => !busy && onCancel()}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-[70] flex w-full max-w-sm flex-col rounded-2xl border border-secondary/10 bg-surface shadow-lg"
      >
        <div className="px-6 py-5">
          <h3
            id={titleId}
            className="mb-2 font-[family-name:var(--font-headline)] text-lg font-semibold text-primary"
          >
            {title}
          </h3>
          <div className="text-sm text-on-surface-variant">{description}</div>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-outline-variant/20 px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-md px-4 py-2 text-sm font-bold text-on-surface-variant transition-colors hover:bg-surface-container-high disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="rounded-md bg-accent px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
