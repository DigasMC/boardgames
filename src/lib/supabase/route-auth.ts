import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type RouteAuthContext = {
  user: User;
  /** User-scoped client (JWT from cookies) — use for auth checks and RPC. */
  supabase: SupabaseClient;
  /** Service-role client when configured; otherwise same as `supabase`. */
  db: SupabaseClient;
};

export async function requireRouteUser():
  Promise<
    | { ok: true; ctx: RouteAuthContext }
    | { ok: false; response: NextResponse }
  > {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  let db: SupabaseClient = supabase;
  try {
    db = createAdminClient();
  } catch {
    // Fall back to user JWT when service role is not configured (e.g. local dev).
  }

  return { ok: true, ctx: { user, supabase, db } };
}
