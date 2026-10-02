import { unstable_cache } from "next/cache";
import type { BggGameFile } from "@/types/database";

const GEEKDO_FILES_BASE = "https://api.geekdo.com/api/files";
const BGG_CACHE_FILES_SECONDS = 60 * 60 * 24 * 7; // 7d
const FILES_PAGE_SIZE = 50;
const DEFAULT_PAGES = 2;

export type { BggGameFile };
export {
  bggFilePageUrl,
  bggFilesBrowseUrl,
  formatFileSize,
  rankRuleFiles,
  BGG_ENGLISH_LANGUAGE_ID,
  RULE_FILES_UI_LIMIT,
} from "@/lib/bgg/fileUtils";

type GeekdoFileRaw = {
  filepageid?: string | number;
  fileid?: string | number;
  title?: string;
  filename?: string;
  language?: string;
  languageid?: string | number;
  numpositive?: string | number | null;
  size?: string | number;
  href?: string;
  description?: { rendered?: string } | string;
  postdate?: string;
};

type GeekdoFilesResponse = {
  files?: GeekdoFileRaw[];
  config?: {
    endpage?: number;
    numitems?: number;
  };
};

function authHeaders(): HeadersInit {
  return {
    Accept: "application/json",
    "User-Agent": "Tablist/1.0 (+https://boardgames-nu.vercel.app)",
  };
}

function stripHtml(html: string | undefined | null): string | null {
  if (!html) return null;
  return (
    html
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim() || null
  );
}

function normalizeFile(raw: GeekdoFileRaw): BggGameFile | null {
  const filepageid = Number(raw.filepageid);
  const fileid = Number(raw.fileid);
  if (!Number.isFinite(filepageid) || !Number.isFinite(fileid)) return null;

  const href =
    typeof raw.href === "string" && raw.href.startsWith("/")
      ? raw.href
      : `/filepage/${filepageid}`;

  const description =
    typeof raw.description === "string"
      ? stripHtml(raw.description)
      : stripHtml(raw.description?.rendered);

  return {
    filepageid,
    fileid,
    title: (raw.title ?? raw.filename ?? "Untitled").toString(),
    filename: (raw.filename ?? "").toString(),
    language: raw.language ? String(raw.language) : null,
    languageid:
      raw.languageid != null && String(raw.languageid).length > 0
        ? String(raw.languageid)
        : null,
    numpositive: Number(raw.numpositive) || 0,
    size: Number(raw.size) || 0,
    href,
    description,
    postdate: raw.postdate ? String(raw.postdate) : null,
  };
}

async function fetchFilesPage(
  bggId: number,
  pageid: number,
  options: { languageId?: string; sort?: "hot" | "recent" } = {}
): Promise<{ files: BggGameFile[]; endpage: number }> {
  const params = new URLSearchParams({
    objecttype: "thing",
    objectid: String(bggId),
    pageid: String(pageid),
    showcount: String(FILES_PAGE_SIZE),
    sort: options.sort ?? "hot",
  });
  if (options.languageId) {
    params.set("languageid", options.languageId);
  }

  const url = `${GEEKDO_FILES_BASE}?${params.toString()}`;
  const res = await fetch(url, {
    headers: authHeaders(),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`BGG files request failed (${res.status}) for ${url}`);
  }

  const data = (await res.json()) as GeekdoFilesResponse;
  const files = (data.files ?? [])
    .map(normalizeFile)
    .filter((f): f is BggGameFile => f != null);
  const endpage = Number(data.config?.endpage) || 1;
  return { files, endpage };
}

const getCachedBggFiles = unstable_cache(
  async (
    bggId: number,
    languageId: string | null,
    sort: "hot" | "recent",
    pages: number
  ): Promise<BggGameFile[]> => {
    const seen = new Set<number>();
    const all: BggGameFile[] = [];
    let endpage = 1;

    for (let page = 1; page <= pages; page++) {
      if (page > 1) {
        await new Promise((r) => setTimeout(r, 400));
      }
      const result = await fetchFilesPage(bggId, page, {
        languageId: languageId ?? undefined,
        sort,
      });
      endpage = result.endpage;
      for (const file of result.files) {
        if (seen.has(file.filepageid)) continue;
        seen.add(file.filepageid);
        all.push(file);
      }
      if (page >= endpage) break;
    }

    return all;
  },
  ["bgg-json-files"],
  { revalidate: BGG_CACHE_FILES_SECONDS, tags: ["bgg", "bgg-files"] }
);

export async function fetchBggFiles(
  bggId: number,
  options: {
    languageId?: string;
    sort?: "hot" | "recent";
    pages?: number;
  } = {}
): Promise<BggGameFile[]> {
  if (!Number.isFinite(bggId) || bggId <= 0) {
    throw new Error("Valid BGG thing id is required");
  }

  const pages = Math.min(3, Math.max(1, options.pages ?? DEFAULT_PAGES));
  const sort = options.sort ?? "hot";
  const languageId = options.languageId ?? null;

  return getCachedBggFiles(bggId, languageId, sort, pages);
}
