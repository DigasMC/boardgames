import { NextResponse } from "next/server";
import {
  bggFilesBrowseUrl,
  fetchBggFiles,
  rankRuleFiles,
  type BggGameFile,
} from "@/lib/bgg/files";
import { createClient } from "@/lib/supabase/server";

/** Durable cache freshness — align with Geekdo unstable_cache (7d). */
const BGG_FILES_DB_TTL_MS = 1000 * 60 * 60 * 24 * 7;

function isFresh(fetchedAt: string | null | undefined): boolean {
  if (!fetchedAt) return false;
  const t = Date.parse(fetchedAt);
  if (!Number.isFinite(t)) return false;
  return Date.now() - t < BGG_FILES_DB_TTL_MS;
}

function asFileArray(value: unknown): BggGameFile[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (f): f is BggGameFile =>
      !!f &&
      typeof f === "object" &&
      Number.isFinite(Number((f as BggGameFile).filepageid))
  );
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const bggId = Number(url.searchParams.get("bggId"));
  if (!Number.isFinite(bggId) || bggId <= 0) {
    return NextResponse.json({ error: "bggId required" }, { status: 400 });
  }

  const browseUrl = bggFilesBrowseUrl(bggId);

  try {
    const { data: existing } = await supabase
      .from("games")
      .select("id, bgg_files, bgg_files_fetched_at")
      .eq("bgg_id", bggId)
      .maybeSingle();

    if (
      existing &&
      isFresh(existing.bgg_files_fetched_at as string | null) &&
      Array.isArray(existing.bgg_files)
    ) {
      const files = asFileArray(existing.bgg_files);
      return NextResponse.json({
        files,
        ruleFiles: rankRuleFiles(files),
        bggFilesUrl: browseUrl,
        cached: true,
      });
    }

    const files = await fetchBggFiles(bggId, { sort: "hot", pages: 2 });
    const fetchedAt = new Date().toISOString();

    if (existing?.id) {
      const { error: updateError } = await supabase
        .from("games")
        .update({
          bgg_files: files,
          bgg_files_fetched_at: fetchedAt,
        })
        .eq("id", existing.id);

      if (updateError) {
        console.error("Failed to cache BGG files", updateError);
      }
    }

    return NextResponse.json({
      files,
      ruleFiles: rankRuleFiles(files),
      bggFilesUrl: browseUrl,
      cached: false,
    });
  } catch (err) {
    console.error(err);

    // Fail soft: still return browse link so UI can deep-link to BGG.
    return NextResponse.json({
      files: [] as BggGameFile[],
      ruleFiles: [] as BggGameFile[],
      bggFilesUrl: browseUrl,
      cached: false,
      error:
        err instanceof Error ? err.message : "Could not load BGG community files",
    });
  }
}
