import { unstable_cache } from "next/cache";
import { XMLParser } from "fast-xml-parser";
import { decodeHtmlEntities } from "@/lib/htmlEntities";
import { createClient } from "@/lib/supabase/server";
import type { BggSearchResult, Game } from "@/types/database";

const BGG_BASE = "https://boardgamegeek.com/xmlapi2";

/** Cache TTLs for BGG XML responses (server-side only; ToS: cache + minimize). */
const BGG_CACHE_SEARCH_SECONDS = 60 * 60 * 24; // 24h
const BGG_CACHE_THING_SECONDS = 60 * 60 * 24 * 7; // 7d
const BGG_CACHE_COLLECTION_SECONDS = 60 * 60; // 1h

/** Collection endpoints often queue with 202; allow more retries than search/thing. */
const BGG_COLLECTION_RETRIES = 8;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  isArray: (name) =>
    ["item", "name", "link", "rank", "results"].includes(name),
});

function getBggToken(): string {
  const key = process.env.BGG_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "BGG_API_KEY is not set. BoardGameGeek requires a registered Application Token (Authorization: Bearer …). Create one at https://boardgamegeek.com/applications after your app is approved."
    );
  }
  return key;
}

function authHeaders(): HeadersInit {
  return {
    Accept: "application/xml",
    Authorization: `Bearer ${getBggToken()}`,
    // Identify the app; BGG asks for server-side cached requests
    "User-Agent": "Tablist/1.0 (+https://boardgames-nu.vercel.app)",
  };
}

/** Uncached outbound call — Authorization headers prevent reliable Next fetch caching. */
async function fetchBggRaw(path: string, retries = 4): Promise<string> {
  const url = `${BGG_BASE}${path}`;
  for (let attempt = 0; attempt < retries; attempt++) {
    const res = await fetch(url, {
      headers: authHeaders(),
      // Caching is handled by unstable_cache in fetchBgg, not the Data Cache.
      cache: "no-store",
    });

    if (res.status === 202) {
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      continue;
    }

    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      continue;
    }

    if (res.status === 401) {
      throw new Error(
        "BGG returned 401 Unauthorized. Check that BGG_API_KEY is a valid Application Token from https://boardgamegeek.com/applications (Authorization: Bearer <token>, domain boardgamegeek.com without www)."
      );
    }

    if (!res.ok) {
      throw new Error(`BGG request failed (${res.status}) for ${path}`);
    }

    return res.text();
  }
  throw new Error(`BGG request timed out after retries: ${path}`);
}

const getCachedSearchXml = unstable_cache(
  async (path: string) => fetchBggRaw(path),
  ["bgg-xml-search"],
  { revalidate: BGG_CACHE_SEARCH_SECONDS, tags: ["bgg", "bgg-search"] }
);

const getCachedThingXml = unstable_cache(
  async (path: string) => fetchBggRaw(path),
  ["bgg-xml-thing"],
  { revalidate: BGG_CACHE_THING_SECONDS, tags: ["bgg", "bgg-thing"] }
);

const getCachedCollectionXml = unstable_cache(
  async (path: string) => fetchBggRaw(path, BGG_COLLECTION_RETRIES),
  ["bgg-xml-collection"],
  { revalidate: BGG_CACHE_COLLECTION_SECONDS, tags: ["bgg", "bgg-collection"] }
);

async function fetchBgg(path: string, retries = 4): Promise<string> {
  if (path.startsWith("/search")) {
    return getCachedSearchXml(path);
  }
  if (path.startsWith("/thing")) {
    return getCachedThingXml(path);
  }
  if (path.startsWith("/collection")) {
    return getCachedCollectionXml(path);
  }
  return fetchBggRaw(path, retries);
}

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function pickPrimaryName(names: unknown): string {
  const list = asArray(names as Record<string, string>[]);
  const primary = list.find((n) => n["@_type"] === "primary");
  const raw = (primary?.["@_value"] ?? list[0]?.["@_value"] ?? "Unknown").toString();
  return decodeHtmlEntities(raw);
}

function stripHtml(html: string | undefined): string | null {
  if (!html) return null;
  return decodeHtmlEntities(
    html
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

/** BGG /thing rejects more than 20 IDs per request. */
const BGG_THING_BATCH_SIZE = 20;

function xmlText(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  if (typeof value === "object" && value !== null && "#text" in value) {
    const text = (value as { "#text": unknown })["#text"];
    if (text == null) return undefined;
    return String(text);
  }
  return undefined;
}

/** Prefer HTTPS so covers load on HTTPS deployments (mixed content). */
function normalizeBggMediaUrl(url: string | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://")) {
    return `https://${trimmed.slice("http://".length)}`;
  }
  return trimmed;
}

function chunkIds(ids: number[], size: number): number[][] {
  const chunks: number[][] = [];
  for (let i = 0; i < ids.length; i += size) {
    chunks.push(ids.slice(i, i + size));
  }
  return chunks;
}

async function fetchThingMediaByIds(
  ids: number[]
): Promise<Map<number, { thumbnail: string | null; image: string | null }>> {
  const byId = new Map<number, { thumbnail: string | null; image: string | null }>();
  if (ids.length === 0) return byId;

  const xml = await fetchBgg(`/thing?id=${ids.join(",")}`);
  const data = parser.parse(xml);
  const items = asArray(data?.items?.item);

  for (const item of items) {
    const id = Number(item["@_id"]);
    if (!Number.isFinite(id)) continue;
    byId.set(id, {
      thumbnail: normalizeBggMediaUrl(xmlText(item.thumbnail)),
      image: normalizeBggMediaUrl(xmlText(item.image)),
    });
  }

  return byId;
}

function hasMedia(media?: {
  thumbnail: string | null;
  image: string | null;
}): boolean {
  return Boolean(media?.thumbnail || media?.image);
}

/** Prefer durable `games` cache before calling BGG /thing for thumbnails. */
async function loadMediaFromGames(
  ids: number[]
): Promise<Map<number, { thumbnail: string | null; image: string | null }>> {
  const byId = new Map<
    number,
    { thumbnail: string | null; image: string | null }
  >();
  if (ids.length === 0) return byId;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("games")
    .select("bgg_id, thumbnail_url, image_url")
    .in("bgg_id", ids);

  if (error) {
    console.error("Failed to load BGG media from games cache", error);
    return byId;
  }

  for (const row of data ?? []) {
    byId.set(row.bgg_id as number, {
      thumbnail: (row.thumbnail_url as string | null) ?? null,
      image: (row.image_url as string | null) ?? null,
    });
  }
  return byId;
}

async function enrichSearchWithImages(
  results: BggSearchResult[]
): Promise<BggSearchResult[]> {
  if (results.length === 0) return results;

  const byId = await loadMediaFromGames(results.map((r) => r.bggId));
  const missingIds = results
    .filter((r) => !hasMedia(byId.get(r.bggId)))
    .map((r) => r.bggId);

  if (missingIds.length > 0) {
    const batches = chunkIds(missingIds, BGG_THING_BATCH_SIZE);
    try {
      for (let i = 0; i < batches.length; i++) {
        if (i > 0) {
          // Brief pause between batches to reduce 429s from BGG
          await new Promise((r) => setTimeout(r, 500));
        }
        const batchMedia = await fetchThingMediaByIds(batches[i]!);
        for (const [id, media] of batchMedia) {
          byId.set(id, media);
        }
      }
    } catch (err) {
      // Keep any images already fetched; search still works without the rest
      console.error("Failed to enrich BGG search with images", err);
    }
  }

  return results.map((r) => {
    const media = byId.get(r.bggId);
    return {
      ...r,
      thumbnailUrl: media?.thumbnail ?? null,
      imageUrl: media?.image ?? null,
    };
  });
}

export const BGG_SEARCH_PAGE_SIZE = 25;

export type BggSearchPage = {
  results: BggSearchResult[];
  total: number;
  hasMore: boolean;
};

export async function searchBggGames(
  query: string,
  options: { offset?: number; limit?: number } = {}
): Promise<BggSearchPage> {
  const offset = Math.max(0, options.offset ?? 0);
  const limit = Math.min(
    50,
    Math.max(1, options.limit ?? BGG_SEARCH_PAGE_SIZE)
  );

  const xml = await fetchBgg(
    `/search?query=${encodeURIComponent(query)}&type=boardgame,boardgameexpansion`
  );
  const data = parser.parse(xml);
  const items = asArray(data?.items?.item);
  const total = items.length;

  const page = items.slice(offset, offset + limit).map((item) => {
    const nameNode = asArray(item.name)[0];
    return {
      bggId: Number(item["@_id"]),
      name: decodeHtmlEntities((nameNode?.["@_value"] ?? "Unknown").toString()),
      yearPublished: item.yearpublished?.["@_value"]
        ? Number(item.yearpublished["@_value"])
        : undefined,
      type: (item["@_type"] ?? "boardgame").toString(),
      thumbnailUrl: null,
      imageUrl: null,
    };
  });

  const results = await enrichSearchWithImages(page);
  return {
    results,
    total,
    hasMore: offset + results.length < total,
  };
}

export type ParsedBggGame = Omit<
  Game,
  "id" | "created_at" | "updated_at" | "fetched_at"
> & { raw_xml?: string | null };

function parseThingItem(
  item: Record<string, unknown>,
  rawXml?: string | null
): ParsedBggGame {
  const links = asArray(item.link as Record<string, string>[]);
  const categories = links
    .filter((l) => l["@_type"] === "boardgamecategory")
    .map((l) => String(l["@_value"]));
  const mechanics = links
    .filter((l) => l["@_type"] === "boardgamemechanic")
    .map((l) => String(l["@_value"]));

  const statistics = item.statistics as
    | { ratings?: { average?: { "@_value"?: string }; averageweight?: { "@_value"?: string } } }
    | undefined;
  const ratings = statistics?.ratings;
  const average = ratings?.average?.["@_value"];
  const weight = ratings?.averageweight?.["@_value"];

  const minplayers = item.minplayers as { "@_value"?: string } | undefined;
  const maxplayers = item.maxplayers as { "@_value"?: string } | undefined;
  const minplaytime = item.minplaytime as { "@_value"?: string } | undefined;
  const maxplaytime = item.maxplaytime as { "@_value"?: string } | undefined;
  const playingtime = item.playingtime as { "@_value"?: string } | undefined;
  const yearpublished = item.yearpublished as { "@_value"?: string } | undefined;

  return {
    bgg_id: Number(item["@_id"]),
    name: pickPrimaryName(item.name),
    description: stripHtml(xmlText(item.description)),
    image_url: normalizeBggMediaUrl(xmlText(item.image)),
    thumbnail_url: normalizeBggMediaUrl(xmlText(item.thumbnail)),
    min_players: minplayers?.["@_value"] ? Number(minplayers["@_value"]) : null,
    max_players: maxplayers?.["@_value"] ? Number(maxplayers["@_value"]) : null,
    min_playtime: minplaytime?.["@_value"]
      ? Number(minplaytime["@_value"])
      : null,
    max_playtime: maxplaytime?.["@_value"]
      ? Number(maxplaytime["@_value"])
      : null,
    playing_time: playingtime?.["@_value"]
      ? Number(playingtime["@_value"])
      : null,
    weight: weight ? Number(Number(weight).toFixed(2)) : null,
    bgg_rating: average ? Number(Number(average).toFixed(2)) : null,
    year_published: yearpublished?.["@_value"]
      ? Number(yearpublished["@_value"])
      : null,
    categories,
    mechanics,
    raw_xml: rawXml ?? null,
  };
}

export async function fetchBggThing(bggId: number): Promise<ParsedBggGame> {
  const xml = await fetchBgg(`/thing?id=${bggId}&stats=1`);
  const data = parser.parse(xml);
  const item = asArray(data?.items?.item)[0];
  if (!item) {
    throw new Error(`Game ${bggId} not found on BoardGameGeek`);
  }
  return parseThingItem(item, xml);
}

export type BggCollectionItem = {
  bggId: number;
  name: string;
};

export async function fetchBggCollection(
  username: string
): Promise<BggCollectionItem[]> {
  const trimmed = username.trim();
  if (!trimmed) {
    throw new Error("BoardGameGeek username is required");
  }

  const path =
    `/collection?username=${encodeURIComponent(trimmed)}` +
    `&own=1&excludesubtype=boardgameaccessory`;

  const xml = await fetchBgg(path, BGG_COLLECTION_RETRIES);
  const data = parser.parse(xml);

  // BGG returns <errors><error>…</error></errors> for unknown users
  const errors = asArray(data?.errors?.error);
  if (errors.length > 0) {
    const message = errors
      .map((e) => {
        if (typeof e === "string") return e;
        if (e && typeof e === "object" && "#text" in e) {
          return String((e as { "#text": unknown })["#text"]);
        }
        if (e && typeof e === "object" && "message" in e) {
          return String((e as { message: unknown }).message);
        }
        return "Unknown error";
      })
      .join("; ");
    throw new Error(
      message ||
        `BoardGameGeek user "${trimmed}" not found or collection is unavailable`
    );
  }

  const items = asArray(data?.items?.item);
  const seen = new Set<number>();
  const result: BggCollectionItem[] = [];

  for (const item of items) {
    const bggId = Number(item["@_objectid"] ?? item["@_id"]);
    if (!Number.isFinite(bggId) || seen.has(bggId)) continue;
    seen.add(bggId);

    const nameRaw = item.name;
    let name = "Unknown";
    if (typeof nameRaw === "string") {
      name = decodeHtmlEntities(nameRaw);
    } else if (nameRaw && typeof nameRaw === "object") {
      const text = xmlText(nameRaw) ?? (nameRaw as { "@_value"?: string })["@_value"];
      if (text) name = decodeHtmlEntities(String(text));
    }

    result.push({ bggId, name });
  }

  return result;
}

export async function fetchBggThings(
  ids: number[]
): Promise<ParsedBggGame[]> {
  const unique = [...new Set(ids.filter((id) => Number.isFinite(id) && id > 0))];
  if (unique.length === 0) return [];

  const games: ParsedBggGame[] = [];
  const batches = chunkIds(unique, BGG_THING_BATCH_SIZE);

  for (let i = 0; i < batches.length; i++) {
    if (i > 0) {
      await new Promise((r) => setTimeout(r, 500));
    }
    const batch = batches[i]!;
    const xml = await fetchBgg(`/thing?id=${batch.join(",")}&stats=1`);
    const data = parser.parse(xml);
    const items = asArray(data?.items?.item);
    for (const item of items) {
      games.push(parseThingItem(item, null));
    }
  }

  return games;
}
