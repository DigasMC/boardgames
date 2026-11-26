import { NextResponse } from "next/server";
import {
  BGG_SEARCH_PAGE_SIZE,
  searchBggGames,
} from "@/lib/bgg/client";
import { requireRouteUser, requireScopes } from "@/lib/supabase/route-auth";

export async function GET(request: Request) {
  const auth = await requireRouteUser(request);
  if (!auth.ok) return auth.response;
  const scopeError = requireScopes(auth.ctx, ["bgg:read"]);
  if (scopeError) return scopeError;

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
