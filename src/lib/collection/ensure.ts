import type { SupabaseClient } from "@supabase/supabase-js";

export async function ensureCollection(
  db: SupabaseClient,
  userId: string
): Promise<string> {
  const { data: existing } = await db
    .from("collections")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existing) return existing.id as string;

  const { data: created, error } = await db
    .from("collections")
    .insert({ user_id: userId, name: "My Collection" })
    .select("id")
    .single();

  if (error) throw error;
  return created.id as string;
}
