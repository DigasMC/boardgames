import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type RouteAuthContext = {
  user: User;
  /** User-scoped client (JWT from cookies) — use for auth checks and RPC. */
  supabase: SupabaseClient;
  /** Service-role client when configured; otherwise user JWT for PostgREST. */
  db: SupabaseClient;
};

async function createUserDbClient(
  supabase: SupabaseClient
): Promise<SupabaseClient> {
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token;
  if (!accessToken) return supabase;

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    }
  );
}

export async function requireRouteUser(): Promise<
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

  let db: SupabaseClient;
  try {
    db = createAdminClient();
  } catch {
    db = await createUserDbClient(supabase);
  }

  return { ok: true, ctx: { user, supabase, db } };
}
