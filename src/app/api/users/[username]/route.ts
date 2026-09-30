import { NextResponse } from "next/server";
import { normalizeGameText } from "@/lib/htmlEntities";
import { createClient } from "@/lib/supabase/server";
import type { Game, PlayStats } from "@/types/database";

type Params = { params: Promise<{ username: string }> };

export async function GET(_request: Request, { params }: Params) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { username: raw } = await params;
  const username = raw.trim().toLowerCase();
  if (!username) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, is_public")
    .ilike("username", username)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!profile?.username) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isSelf = profile.id === user.id;
  const isPublic = Boolean(profile.is_public);

  if (!isSelf && !isPublic) {
    return NextResponse.json({
      profile: {
        id: profile.id,
        username: profile.username,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        is_public: false,
      },
      private: true,
      collection: [],
      stats: null,
    });
  }

  const { data: collections } = await supabase
    .from("collections")
    .select("id")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: true })
    .limit(1);

  const collectionId = collections?.[0]?.id;
  let collection: Array<
    Game & {
      collection_item_id: string;
      notes: string | null;
      is_wishlist: boolean;
    }
  > = [];

  if (collectionId) {
    const { data: items } = await supabase
      .from("collection_items")
      .select("id, notes, is_wishlist, game:games(*)")
      .eq("collection_id", collectionId)
      .order("added_at", { ascending: false });

    collection = (items ?? [])
      .map((item) => {
        const game = Array.isArray(item.game) ? item.game[0] : item.game;
        if (!game) return null;
        const normalized = normalizeGameText(game as Game);
        return {
          ...normalized,
          collection_item_id: item.id as string,
          notes: (item.notes as string | null) ?? null,
          is_wishlist: Boolean(item.is_wishlist),
        };
      })
      .filter(Boolean) as typeof collection;
  }

  const { data: statsRaw, error: statsError } = await supabase.rpc(
    "profile_play_stats",
    { target: profile.id }
  );

  if (statsError) {
    return NextResponse.json({ error: statsError.message }, { status: 500 });
  }

  const stats = (statsRaw ?? null) as PlayStats | null;

  return NextResponse.json({
    profile: {
      id: profile.id,
      username: profile.username,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      is_public: isPublic,
    },
    private: false,
    isSelf,
    collection,
    stats,
  });
}
