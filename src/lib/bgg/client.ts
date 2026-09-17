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

async function enrichSearchWithImages(
  results: BggSearchResult[]
): Promise<BggSearchResult[]> {
  if (results.length === 0) return results;

  const ids = results.map((r) => r.bggId).join(",");
  try {
    const xml = await fetchBgg(`/thing?id=${ids}`);
    const data = parser.parse(xml);
    const items = asArray(data?.items?.item);
    const byId = new Map<number, { thumbnail?: string; image?: string }>();

    for (const item of items) {
      const id = Number(item["@_id"]);
      if (!Number.isFinite(id)) continue;
      byId.set(id, {
        thumbnail: item.thumbnail ? String(item.thumbnail) : undefined,
        image: item.image ? String(item.image) : undefined,
      });
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
    // Search still works without images if the batch thing call fails
    console.error("Failed to enrich BGG search with images", err);
    return results;
  }
}

export async function searchBggGames(query: string): Promise<BggSearchResult[]> {
  const xml = await fetchBgg(
    `/search?query=${encodeURIComponent(query)}&type=boardgame,boardgameexpansion`
  );
  const data = parser.parse(xml);
  const items = asArray(data?.items?.item);

  const results = items.slice(0, 25).map((item) => {
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

  return enrichSearchWithImages(results);
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
    image_url: item.image ? String(item.image) : null,
    thumbnail_url: item.thumbnail ? String(item.thumbnail) : null,
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
