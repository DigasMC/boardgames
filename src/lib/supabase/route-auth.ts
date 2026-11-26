import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  hasScope,
  isApiTokenFormat,
  lookupActiveApiToken,
  touchApiTokenLastUsed,
  type ApiTokenScope,
} from "@/lib/auth/api-tokens";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type RouteAuthContext = {
  user: User;
  /** User-scoped client (JWT from cookies / Bearer JWT) — use for auth checks and RPC. */
  supabase: SupabaseClient;
  /** Service-role client when configured; otherwise user JWT for PostgREST. */
  db: SupabaseClient;
  /** Auth method used for this request. */
  authMethod: "cookie" | "pat" | "jwt";
  /** PAT scopes when authMethod is pat; otherwise full access. */
  scopes: string[] | null;
};

async function createUserDbClient(
  supabase: SupabaseClient,
  accessToken?: string
): Promise<SupabaseClient> {
  let token = accessToken;
  if (!token) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    token = session?.access_token;
  }
  if (!token) return supabase;

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
          Authorization: `Bearer ${token}`,
        },
      },
    }
  );
}

function unauthorized(message = "Unauthorized") {
  return NextResponse.json(
    { error: message, code: "unauthorized" },
    { status: 401 }
  );
}

function extractBearer(request?: Request): string | null {
  if (!request) return null;
  const header = request.headers.get("authorization");
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() || null;
}

async function requireAdminDb(): Promise<
  | { ok: true; db: SupabaseClient }
  | { ok: false; response: NextResponse }
> {
  try {
    return { ok: true, db: createAdminClient() };
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            "Server misconfigured: SUPABASE_SERVICE_ROLE_KEY is required for personal access token auth",
          code: "unauthorized",
        },
        { status: 503 }
      ),
    };
  }
}

async function authWithPat(
  rawToken: string
): Promise<
  | { ok: true; ctx: RouteAuthContext }
  | { ok: false; response: NextResponse }
> {
  const admin = await requireAdminDb();
  if (!admin.ok) return admin;

  const row = await lookupActiveApiToken(admin.db, rawToken);
  if (!row) {
    return { ok: false, response: unauthorized("Invalid or revoked API token") };
  }

  void touchApiTokenLastUsed(admin.db, row.id);

  const {
    data: { user },
    error,
  } = await admin.db.auth.admin.getUserById(row.user_id);

  if (error || !user) {
    return { ok: false, response: unauthorized() };
  }

  // PAT path always uses service-role for PostgREST (no user JWT).
  return {
    ok: true,
    ctx: {
      user,
      supabase: admin.db,
      db: admin.db,
      authMethod: "pat",
      scopes: row.scopes ?? [],
    },
  };
}

async function authWithJwt(
  accessToken: string
): Promise<
  | { ok: true; ctx: RouteAuthContext }
  | { ok: false; response: NextResponse }
> {
  const supabase = createSupabaseClient(
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

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken);

  if (error || !user) {
    return { ok: false, response: unauthorized("Invalid or expired access token") };
  }

  let db: SupabaseClient;
  try {
    db = createAdminClient();
  } catch {
    db = await createUserDbClient(supabase, accessToken);
  }

  return {
    ok: true,
    ctx: {
      user,
      supabase,
      db,
      authMethod: "jwt",
      scopes: null,
    },
  };
}

/**
 * Authenticate an API route via (in order):
 * 1. Authorization: Bearer tab_… (personal access token)
 * 2. Authorization: Bearer <supabase access JWT> (dev/prototype)
 * 3. Cookie session (browser)
 */
export async function requireRouteUser(
  request?: Request
): Promise<
  | { ok: true; ctx: RouteAuthContext }
  | { ok: false; response: NextResponse }
> {
  const bearer = extractBearer(request);
  if (bearer) {
    if (isApiTokenFormat(bearer)) {
      return authWithPat(bearer);
    }
    return authWithJwt(bearer);
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { ok: false, response: unauthorized() };
  }

  let db: SupabaseClient;
  try {
    db = createAdminClient();
  } catch {
    db = await createUserDbClient(supabase);
  }

  return {
    ok: true,
    ctx: { user, supabase, db, authMethod: "cookie", scopes: null },
  };
}

export function requireScopes(
  ctx: RouteAuthContext,
  required: ApiTokenScope[]
): NextResponse | null {
  if (ctx.authMethod !== "pat") return null;
  for (const scope of required) {
    if (!hasScope(ctx.scopes, scope)) {
      return NextResponse.json(
        {
          error: `Missing scope: ${scope}`,
          code: "unauthorized",
        },
        { status: 403 }
      );
    }
  }
  return null;
}
