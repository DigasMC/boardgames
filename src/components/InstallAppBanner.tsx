"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

const DISMISS_KEY = "tablist-install-dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  if (typeof window === "undefined") return true;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    ("standalone" in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

function isIosSafari() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const webkit = /WebKit/.test(ua);
  const chrome = /CriOS|FxiOS|EdgiOS/.test(ua);
  return iOS && webkit && !chrome;
}

export function InstallAppBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [showIos, setShowIos] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    if (isIosSafari()) {
      setShowIos(true);
      setVisible(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
    };
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
    setDeferred(null);
    setShowIos(false);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="mb-4 rounded-lg border border-secondary/15 bg-surface-container-low p-3 text-sm shadow-sm">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-primary">Install Tablist</p>
          {showIos && !deferred ? (
            <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
              Tap <Share className="inline size-3.5 align-text-bottom" /> Share,
              then <span className="font-semibold">Add to Home Screen</span>.
            </p>
          ) : (
            <p className="mt-1 text-xs text-on-surface-variant">
              Add to your home screen for offline game nights.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss install tip"
          className="rounded p-1 text-on-surface-variant hover:bg-surface-container-high"
        >
          <X className="size-4" />
        </button>
      </div>
      {deferred ? (
        <button
          type="button"
          onClick={install}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-on-primary"
        >
          <Download className="size-4" />
          Install
        </button>
      ) : null}
    </div>
  );
}
