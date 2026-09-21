import type { SupabaseClient } from "@supabase/supabase-js";

export async function saveBggUsername(
  supabase: SupabaseClient,
  userId: string,
  username: string | null
) {
  const trimmed = username?.trim() || null;

  const { error } = await supabase
    .from("profiles")
    .update({
      bgg_username: trimmed,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) throw error;
}
