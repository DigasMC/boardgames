import { createHash, randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export const API_TOKEN_PREFIX = "tab_";

export const DEFAULT_API_TOKEN_SCOPES = [
  "collection:read",
  "collection:write",
  "sessions:read",
  "sessions:write",
  "bgg:read",
] as const;

export type ApiTokenScope = (typeof DEFAULT_API_TOKEN_SCOPES)[number];

export type ApiTokenRow = {
  id: string;
  user_id: string;
  token_hash: string;
  name: string;
  prefix: string;
  scopes: string[];
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

export function hashApiToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export function generateApiToken(): { raw: string; prefix: string; hash: string } {
  const secret = randomBytes(24).toString("base64url");
  const raw = `${API_TOKEN_PREFIX}${secret}`;
  return {
    raw,
    prefix: raw.slice(0, 12),
    hash: hashApiToken(raw),
  };
}

export function isApiTokenFormat(token: string): boolean {
  return token.startsWith(API_TOKEN_PREFIX) && token.length > API_TOKEN_PREFIX.length + 8;
}

export async function lookupActiveApiToken(
  db: SupabaseClient,
  rawToken: string
): Promise<ApiTokenRow | null> {
  const tokenHash = hashApiToken(rawToken);
  const { data, error } = await db
    .from("api_tokens")
    .select(
      "id, user_id, token_hash, name, prefix, scopes, last_used_at, revoked_at, created_at"
    )
    .eq("token_hash", tokenHash)
    .is("revoked_at", null)
    .maybeSingle();

  if (error || !data) return null;
  return data as ApiTokenRow;
}

export async function touchApiTokenLastUsed(
  db: SupabaseClient,
  tokenId: string
): Promise<void> {
  await db
    .from("api_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", tokenId);
}

export function hasScope(
  scopes: string[] | null | undefined,
  required: ApiTokenScope
): boolean {
  if (!scopes || scopes.length === 0) return true;
  return scopes.includes(required);
}
