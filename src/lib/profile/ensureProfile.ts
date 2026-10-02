import type { SupabaseClient, User } from "@supabase/supabase-js";

function baseUsername(user: User): string {
  const metadata = user.user_metadata ?? {};
  const raw =
    (typeof metadata.display_name === "string" && metadata.display_name) ||
    (typeof metadata.full_name === "string" && metadata.full_name) ||
    (typeof metadata.name === "string" && metadata.name) ||
    user.email?.split("@")[0] ||
    "user";

  let base = raw
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 16);
  if (base.length < 3) {
    base = base.padEnd(3, "0");
  }
  return base;
}

/** Ensures profiles + default collection exist (backfill when signup trigger missed). */
export async function ensureProfileForUser(
  db: SupabaseClient,
  user: User
): Promise<string | null> {
  const { data: existing } = await db
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (existing) return null;

  const metadata = user.user_metadata ?? {};
  const displayName =
    (typeof metadata.display_name === "string" && metadata.display_name.trim()) ||
    (typeof metadata.full_name === "string" && metadata.full_name.trim()) ||
    (typeof metadata.name === "string" && metadata.name.trim()) ||
    user.email?.split("@")[0] ||
    "User";
  const avatarUrl =
    (typeof metadata.avatar_url === "string" && metadata.avatar_url) ||
    (typeof metadata.picture === "string" && metadata.picture) ||
    null;

  const candidate = baseUsername(user);
  for (let n = 0; n < 50; n++) {
    const username = n === 0 ? candidate : `${candidate.slice(0, 12)}${n}`;
    const { error: profileError } = await db.from("profiles").insert({
      id: user.id,
      display_name: displayName,
      avatar_url: avatarUrl,
      username,
      is_public: false,
    });
    if (!profileError) break;
    if (profileError.code !== "23505") {
      return profileError.message;
    }
  }

  const { data: collection } = await db
    .from("collections")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!collection) {
    const { error: collectionError } = await db.from("collections").insert({
      user_id: user.id,
      name: "My Collection",
    });
    if (collectionError) {
      return collectionError.message;
    }
  }

  return null;
}
