import { NextResponse } from "next/server";
import {
  BGG_SEARCH_PAGE_SIZE,
  searchBggGames,
} from "@/lib/bgg/client";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ error: "Missing q" }, { status: 400 });
  }

  const offset = Math.max(0, Number(searchParams.get("offset") ?? 0) || 0);
  const limitRaw = Number(searchParams.get("limit") ?? BGG_SEARCH_PAGE_SIZE);
  const limit =
    Number.isFinite(limitRaw) && limitRaw > 0
      ? Math.min(50, limitRaw)
      : BGG_SEARCH_PAGE_SIZE;

  try {
    const page = await searchBggGames(q, { offset, limit });
    return NextResponse.json(page);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "BGG search failed" },
      { status: 502 }
    );
  }
}
