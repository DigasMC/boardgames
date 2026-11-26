import { NextResponse } from "next/server";
import {
  DEFAULT_API_TOKEN_SCOPES,
  generateApiToken,
} from "@/lib/auth/api-tokens";
import { requireRouteUser } from "@/lib/supabase/route-auth";

export async function GET(request: Request) {
  const auth = await requireRouteUser(request);
  if (!auth.ok) return auth.response;
  // Token management is cookie/JWT only — do not manage tokens via PAT.
  if (auth.ctx.authMethod === "pat") {
    return NextResponse.json(
      { error: "Manage tokens from the signed-in Profile UI", code: "unauthorized" },
      { status: 403 }
    );
  }

  const { user, db } = auth.ctx;
  const { data, error } = await db
    .from("api_tokens")
    .select("id, name, prefix, scopes, last_used_at, revoked_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    tokens: (data ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      prefix: t.prefix,
      scopes: t.scopes,
      lastUsedAt: t.last_used_at,
      revokedAt: t.revoked_at,
      createdAt: t.created_at,
      active: t.revoked_at == null,
    })),
  });
}

export async function POST(request: Request) {
  const auth = await requireRouteUser(request);
  if (!auth.ok) return auth.response;
  if (auth.ctx.authMethod === "pat") {
    return NextResponse.json(
      { error: "Create tokens from the signed-in Profile UI", code: "unauthorized" },
      { status: 403 }
    );
  }

  const { user, db } = auth.ctx;
  let body: { name?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const name =
    typeof body.name === "string" && body.name.trim()
      ? body.name.trim().slice(0, 80)
      : "MCP";

  const generated = generateApiToken();
  const { data, error } = await db
    .from("api_tokens")
    .insert({
      user_id: user.id,
      token_hash: generated.hash,
      name,
      prefix: generated.prefix,
      scopes: [...DEFAULT_API_TOKEN_SCOPES],
    })
    .select("id, name, prefix, scopes, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    token: {
      id: data.id,
      name: data.name,
      prefix: data.prefix,
      scopes: data.scopes,
      createdAt: data.created_at,
      /** Shown once — store in MCP env; never logged again. */
      secret: generated.raw,
    },
  });
}

export async function DELETE(request: Request) {
  const auth = await requireRouteUser(request);
  if (!auth.ok) return auth.response;
  if (auth.ctx.authMethod === "pat") {
    return NextResponse.json(
      { error: "Revoke tokens from the signed-in Profile UI", code: "unauthorized" },
      { status: 403 }
    );
  }

  const { user, db } = auth.ctx;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { error: "id required", code: "validation" },
      { status: 400 }
    );
  }

  const { data, error } = await db
    .from("api_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .is("revoked_at", null)
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data || data.length === 0) {
    return NextResponse.json(
      { error: "Not found", code: "not_found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
}
