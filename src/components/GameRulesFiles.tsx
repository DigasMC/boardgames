"use client";

import { useEffect, useState } from "react";
import { BookOpen, ExternalLink, ThumbsUp } from "lucide-react";
import type { BggGameFile } from "@/types/database";
import {
  bggFilePageUrl,
  bggFilesBrowseUrl,
  formatFileSize,
  rankRuleFiles,
} from "@/lib/bgg/fileUtils";

type FilesResponse = {
  files: BggGameFile[];
  ruleFiles: BggGameFile[];
  bggFilesUrl: string;
  error?: string;
};

export function GameRulesFiles({
  bggId,
  initialFiles,
  className,
}: {
  bggId: number;
  /** Cached files already on the game row (may be empty / stale). */
  initialFiles?: BggGameFile[] | null;
  className?: string;
}) {
  const browseUrl = bggFilesBrowseUrl(bggId);
  const seeded = initialFiles?.length
    ? rankRuleFiles(initialFiles)
    : [];

  const [ruleFiles, setRuleFiles] = useState<BggGameFile[]>(seeded);
  const [bggFilesUrl, setBggFilesUrl] = useState(browseUrl);
  const [loading, setLoading] = useState(seeded.length === 0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        if (seeded.length === 0) setLoading(true);
        const res = await fetch(`/api/bgg/files?bggId=${bggId}`);
        const data = (await res.json()) as FilesResponse;
        if (cancelled) return;

        if (!res.ok && !data.ruleFiles) {
          setError(data.error ?? "Could not load rules files");
          setBggFilesUrl(data.bggFilesUrl ?? browseUrl);
          return;
        }

        setRuleFiles(data.ruleFiles ?? []);
        setBggFilesUrl(data.bggFilesUrl ?? browseUrl);
        setError(data.error ?? null);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not load rules files"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // Only re-fetch when the BGG id changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bggId]);

  return (
    <section
      id="rules"
      className={`card-shadow flex scroll-mt-24 flex-col rounded-xl border border-secondary/10 bg-surface p-6 md:p-8 ${className ?? ""}`}
    >
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <h2 className="flex items-center gap-2 font-[family-name:var(--font-headline)] text-2xl font-semibold text-primary">
          <BookOpen className="size-6 shrink-0" aria-hidden />
          Rules &amp; files
        </h2>
        <a
          href={bggFilesUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-outline-variant/40 px-4 py-2 text-sm font-semibold tracking-wide text-primary transition-colors hover:bg-surface-container-low"
        >
          Browse all on BGG
          <ExternalLink className="size-4" aria-hidden />
        </a>
      </div>

      {loading ? (
        <p className="text-sm text-on-surface-variant">Loading community files…</p>
      ) : ruleFiles.length === 0 ? (
        <p className="text-sm text-on-surface-variant">
          {error
            ? "Could not load file metadata right now."
            : "No likely rulebooks found in the top community files."}{" "}
          <a
            href={bggFilesUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-accent underline-offset-2 hover:underline"
          >
            Check BoardGameGeek Files
          </a>
          .
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {ruleFiles.map((file) => (
            <li key={file.filepageid}>
              <a
                href={bggFilePageUrl(file)}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col gap-1 rounded-lg border border-outline-variant/20 p-4 transition-colors hover:bg-surface-container-low sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="truncate text-base font-medium text-primary group-hover:text-accent">
                    {file.title}
                  </div>
                  <div className="truncate text-sm text-on-surface-variant">
                    {[file.filename, file.language, formatFileSize(file.size)]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-sm text-on-surface-variant">
                  {file.numpositive > 0 && (
                    <span
                      className="inline-flex items-center gap-1"
                      title="Thumbs up on BGG"
                    >
                      <ThumbsUp className="size-3.5" aria-hidden />
                      {file.numpositive}
                    </span>
                  )}
                  <ExternalLink
                    className="size-4 opacity-60 transition-opacity group-hover:opacity-100"
                    aria-hidden
                  />
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
