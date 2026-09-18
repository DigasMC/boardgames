import { XMLParser } from "fast-xml-parser";
import type { BggSearchResult, Game } from "@/types/database";

const BGG_BASE = "https://boardgamegeek.com/xmlapi2";
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
    "User-Agent": "VaultAndBoard/1.0 (+https://boardgames-nu.vercel.app)",
  };
}

async function fetchBgg(path: string, retries = 4): Promise<string> {
  const url = `${BGG_BASE}${path}`;
  for (let attempt = 0; attempt < retries; attempt++) {
    const res = await fetch(url, {
      headers: authHeaders(),
      next: { revalidate: 0 },
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

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function pickPrimaryName(names: unknown): string {
  const list = asArray(names as Record<string, string>[]);
  const primary = list.find((n) => n["@_type"] === "primary");
  return (primary?.["@_value"] ?? list[0]?.["@_value"] ?? "Unknown").toString();
}

function stripHtml(html: string | undefined): string | null {
  if (!html) return null;
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#10;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

async function enrichSearchWithImages(
  results: BggSearchResult[]
): Promise<BggSearchResult[]> {
  if (results.length === 0) return results;

  const byId = new Map<number, { thumbnail: string | null; image: string | null }>();
  const batches = chunkIds(
    results.map((r) => r.bggId),
    BGG_THING_BATCH_SIZE
  );

  try {
    for (let i = 0; i < batches.length; i++) {
      if (i > 0) {
        // Brief pause between batches to reduce 429s from BGG
        await new Promise((r) => setTimeout(r, 500));
      }
      const batchMedia = await fetchThingMediaByIds(batches[i]);
      for (const [id, media] of batchMedia) {
        byId.set(id, media);
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
  } catch (err) {
    // Keep any images already fetched; search still works without the rest
    console.error("Failed to enrich BGG search with images", err);
    if (byId.size === 0) return results;
    return results.map((r) => {
      const media = byId.get(r.bggId);
      return {
        ...r,
        thumbnailUrl: media?.thumbnail ?? null,
        imageUrl: media?.image ?? null,
      };
    });
  }
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
      name: (nameNode?.["@_value"] ?? "Unknown").toString(),
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

export async function fetchBggThing(bggId: number): Promise<ParsedBggGame> {
  const xml = await fetchBgg(`/thing?id=${bggId}&stats=1`);
  const data = parser.parse(xml);
  const item = asArray(data?.items?.item)[0];
  if (!item) {
    throw new Error(`Game ${bggId} not found on BoardGameGeek`);
  }

  const links = asArray(item.link);
  const categories = links
    .filter((l) => l["@_type"] === "boardgamecategory")
    .map((l) => String(l["@_value"]));
  const mechanics = links
    .filter((l) => l["@_type"] === "boardgamemechanic")
    .map((l) => String(l["@_value"]));

  const ratings = item.statistics?.ratings;
  const average = ratings?.average?.["@_value"];
  const weight = ratings?.averageweight?.["@_value"];

  return {
    bgg_id: Number(item["@_id"]),
    name: pickPrimaryName(item.name),
    description: stripHtml(item.description),
    image_url: normalizeBggMediaUrl(xmlText(item.image)),
    thumbnail_url: normalizeBggMediaUrl(xmlText(item.thumbnail)),
    min_players: item.minplayers?.["@_value"]
      ? Number(item.minplayers["@_value"])
      : null,
    max_players: item.maxplayers?.["@_value"]
      ? Number(item.maxplayers["@_value"])
      : null,
    min_playtime: item.minplaytime?.["@_value"]
      ? Number(item.minplaytime["@_value"])
      : null,
    max_playtime: item.maxplaytime?.["@_value"]
      ? Number(item.maxplaytime["@_value"])
      : null,
    playing_time: item.playingtime?.["@_value"]
      ? Number(item.playingtime["@_value"])
      : null,
    weight: weight ? Number(Number(weight).toFixed(2)) : null,
    bgg_rating: average ? Number(Number(average).toFixed(2)) : null,
    year_published: item.yearpublished?.["@_value"]
      ? Number(item.yearpublished["@_value"])
      : null,
    categories,
    mechanics,
    raw_xml: xml,
  };
}
