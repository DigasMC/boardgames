import { NextResponse } from "next/server";
import { ensureCollection } from "@/lib/collection/ensure";
import { requireRouteUser } from "@/lib/supabase/route-auth";

export async function GET(request: Request) {
  const auth = await requireRouteUser(request);
  if (!auth.ok) return auth.response;
  const { user, db, authMethod } = auth.ctx;

  const { data: profile, error } = await db
    .from("profiles")
    .select(
      "id, display_name, username, avatar_url, bgg_username, is_public, created_at, updated_at"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let collectionId: string | null = null;
  try {
    collectionId = await ensureCollection(db, user.id);
  } catch {
    collectionId = null;
  }

  return NextResponse.json({
    userId: user.id,
    email: user.email ?? null,
    authMethod,
    bggConfigured: Boolean(process.env.BGG_API_KEY),
    collectionId,
    profile: profile
      ? {
          id: profile.id,
          displayName: profile.display_name,
          username: profile.username,
          avatarUrl: profile.avatar_url,
          bggUsername: profile.bgg_username,
          isPublic: profile.is_public,
        }
      : null,
  });
}
