import { createClient } from "@/lib/supabase/server";
import { CollectionView } from "@/components/CollectionView";
import type { CollectionGame, Game } from "@/types/database";

export default async function CollectionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: collection } = await supabase
    .from("collections")
    .select("id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  let games: CollectionGame[] = [];

  if (collection) {
    const { data } = await supabase
      .from("collection_items")
      .select("id, notes, is_wishlist, game:games(*)")
      .eq("collection_id", collection.id)
      .order("added_at", { ascending: false });

    games = (data ?? [])
      .filter((row) => row.game)
      .map((row) => {
        const game = row.game as unknown as Game;
        return {
          ...game,
          collection_item_id: row.id,
          notes: row.notes,
          is_wishlist: row.is_wishlist,
        };
      });
  }

  return <CollectionView games={games} />;
}
