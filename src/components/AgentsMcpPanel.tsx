"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bot, Check, Copy, KeyRound, Trash2, X } from "lucide-react";
import {
  TABLIST_APP_ORIGIN,
  TABLIST_MCP_PUBLIC_ORIGIN,
  buildMcpConfigSnippet,
  buildMcpConnectInstructions,
  buildMcpHttpConfigSnippet,
  tablistMcpUrl,
} from "@/lib/mcp/setup-instructions";

type TokenRow = {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  active: boolean;
};

type CreatedToken = {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  createdAt: string;
  secret: string;
};

type CopiedKind = "prompt" | "http" | "stdio" | "secret" | "url" | null;

export function AgentsMcpPanel() {
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [tokenName, setTokenName] = useState("MCP");
  const [created, setCreated] = useState<CreatedToken | null>(null);
  const [connectOpen, setConnectOpen] = useState(false);
  const [copied, setCopied] = useState<CopiedKind>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const mcpUrl = useMemo(() => tablistMcpUrl(TABLIST_MCP_PUBLIC_ORIGIN), []);
  const instructions = useMemo(
    () => buildMcpConnectInstructions({ appOrigin: TABLIST_APP_ORIGIN }),
    []
  );
  const httpSnippet = useMemo(
    () => buildMcpHttpConfigSnippet(TABLIST_MCP_PUBLIC_ORIGIN),
    []
  );
  const stdioSnippet = useMemo(
    () => buildMcpConfigSnippet(TABLIST_APP_ORIGIN),
    []
  );

  const loadTokens = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/tokens");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load tokens");
      }
      setTokens(data.tokens ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tokens");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTokens();
  }, [loadTokens]);

  useEffect(() => {
    if (!connectOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setConnectOpen(false);
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [connectOpen]);

  async function copyText(value: string, kind: Exclude<CopiedKind, null>) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setError("Could not copy to clipboard");
    }
  }

  async function onCreateToken(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: tokenName }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create token");
      }
      setCreated(data.token as CreatedToken);
      setTokenName("MCP");
      await loadTokens();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create token");
    } finally {
      setCreating(false);
    }
  }

  async function onRevoke(id: string) {
    setRevokingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/tokens?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to revoke token");
      }
      if (created?.id === id) setCreated(null);
      await loadTokens();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke token");
    } finally {
      setRevokingId(null);
    }
  }

  const activeTokens = tokens.filter((t) => t.active);

  return (
    <div className="card-shadow rounded-xl border border-secondary/10 bg-surface p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-headline)] text-xl font-bold text-primary">
            Agents
          </h2>
          <p className="mt-2 text-sm text-on-surface-variant">
            Connect Claude.ai (remote HTTPS MCP), Cursor, or Claude Desktop.
            Tokens start with{" "}
            <code className="rounded bg-surface-container px-1">tab_</code> and
            are shown once. New tokens include{" "}
            <code className="rounded bg-surface-container px-1">
              sessions:read
            </code>{" "}
            and{" "}
            <code className="rounded bg-surface-container px-1">
              sessions:write
            </code>
            — if an older token was minted without them, revoke it and create a
            new one, then reconnect the MCP host.
          </p>
          <p className="mt-2 text-xs text-on-surface-variant">
            Hosted MCP:{" "}
            <code className="rounded bg-surface-container px-1">{mcpUrl}</code>
          </p>
        </div>
        <button
          type="button"
          onClick={() => setConnectOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-on-primary shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90 hover:shadow-md active:translate-y-0"
        >
          <Bot className="size-4" aria-hidden />
          Connect Tablist MCP
        </button>
      </div>

      {error ? (
        <p className="mt-4 rounded-md bg-error-container px-3 py-2 text-sm text-on-error-container">
          {error}
        </p>
      ) : null}

      {created ? (
        <div className="mt-4 rounded-lg border border-primary/20 bg-primary-container/30 p-4">
          <p className="text-sm font-semibold text-primary">
            Copy your new token now — it won&apos;t be shown again.
          </p>
          <p className="mt-1 text-xs text-on-surface-variant">
            Scopes: {(created.scopes ?? []).join(", ") || "default"}
          </p>
          <code className="mt-2 block break-all rounded-md bg-surface px-3 py-2 text-xs text-on-surface">
            {created.secret}
          </code>
          <button
            type="button"
            onClick={() => copyText(created.secret, "secret")}
            className="mt-3 inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-bold text-on-primary"
          >
            {copied === "secret" ? (
              <Check className="size-4" />
            ) : (
              <Copy className="size-4" />
            )}
            {copied === "secret" ? "Copied" : "Copy token"}
          </button>
        </div>
      ) : null}

      <form
        onSubmit={onCreateToken}
        className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
          <span className="font-semibold text-on-surface-variant">
            Token name
          </span>
          <input
            type="text"
            value={tokenName}
            onChange={(e) => setTokenName(e.target.value)}
            maxLength={80}
            disabled={creating}
            className="rounded-md bg-surface-container px-3 py-2 text-on-surface outline-none ring-primary focus:ring-1 disabled:opacity-60"
          />
        </label>
        <button
          type="submit"
          disabled={creating}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-secondary/20 bg-surface-container-low px-4 py-3 text-sm font-bold text-primary transition-colors hover:bg-surface-container-high disabled:opacity-60"
        >
          <KeyRound className="size-4" aria-hidden />
          {creating ? "Creating…" : "Create API token"}
        </button>
      </form>

      <div className="mt-6">
        <h3 className="text-sm font-semibold text-on-surface-variant">
          Active tokens
        </h3>
        {loading ? (
          <p className="mt-2 text-sm text-on-surface-variant">Loading…</p>
        ) : activeTokens.length === 0 ? (
          <p className="mt-2 text-sm text-on-surface-variant">
            No active tokens yet.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {activeTokens.map((token) => (
              <li
                key={token.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-container-low px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium text-on-surface">{token.name}</p>
                  <p className="text-xs text-on-surface-variant">
                    {token.prefix}… · created{" "}
                    {new Date(token.createdAt).toLocaleString()}
                    {token.lastUsedAt
                      ? ` · last used ${new Date(token.lastUsedAt).toLocaleString()}`
                      : ""}
                  </p>
                  <p className="mt-1 break-all text-[11px] text-on-surface-variant/90">
                    scopes:{" "}
                    {(token.scopes ?? []).length > 0
                      ? token.scopes.join(", ")
                      : "(none — regenerate for sessions:read)"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void onRevoke(token.id)}
                  disabled={revokingId === token.id}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-bold text-accent transition-colors hover:bg-error-container/40 disabled:opacity-60"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                  {revokingId === token.id ? "Revoking…" : "Revoke"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {connectOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-primary/40"
            onClick={() => setConnectOpen(false)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="connect-mcp-title"
            className="relative z-[70] flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-secondary/10 bg-surface shadow-lg"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-outline-variant/20 px-6 py-4">
              <h3
                id="connect-mcp-title"
                className="font-[family-name:var(--font-headline)] text-lg font-semibold text-primary"
              >
                Connect Tablist MCP
              </h3>
              <button
                type="button"
                onClick={() => setConnectOpen(false)}
                aria-label="Close"
                className="rounded-lg p-1 text-on-surface-variant transition-colors hover:bg-surface-container-high"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2 border-b border-outline-variant/10 px-6 py-3">
              <button
                type="button"
                onClick={() => void copyText(instructions, "prompt")}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-bold text-on-primary"
              >
                {copied === "prompt" ? (
                  <Check className="size-4" />
                ) : (
                  <Copy className="size-4" />
                )}
                {copied === "prompt" ? "Copied prompt" : "Copy prompt for agent"}
              </button>
              <button
                type="button"
                onClick={() => void copyText(mcpUrl, "url")}
                className="inline-flex items-center gap-2 rounded-md border border-secondary/20 bg-surface-container-low px-3 py-2 text-sm font-bold text-primary"
              >
                {copied === "url" ? (
                  <Check className="size-4" />
                ) : (
                  <Copy className="size-4" />
                )}
                {copied === "url" ? "Copied URL" : "Copy MCP URL"}
              </button>
              <button
                type="button"
                onClick={() => void copyText(httpSnippet, "http")}
                className="inline-flex items-center gap-2 rounded-md border border-secondary/20 bg-surface-container-low px-3 py-2 text-sm font-bold text-primary"
              >
                {copied === "http" ? (
                  <Check className="size-4" />
                ) : (
                  <Copy className="size-4" />
                )}
                {copied === "http" ? "Copied HTTP" : "Copy HTTP config"}
              </button>
              <button
                type="button"
                onClick={() => void copyText(stdioSnippet, "stdio")}
                className="inline-flex items-center gap-2 rounded-md border border-secondary/20 bg-surface-container-low px-3 py-2 text-sm font-bold text-primary"
              >
                {copied === "stdio" ? (
                  <Check className="size-4" />
                ) : (
                  <Copy className="size-4" />
                )}
                {copied === "stdio" ? "Copied stdio" : "Copy stdio config"}
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-4">
              <div className="mb-4 rounded-lg border border-primary/15 bg-primary-container/20 p-3 text-sm text-on-surface">
                <p className="font-semibold text-primary">
                  Claude.ai / remote (Streamable HTTP)
                </p>
                <p className="mt-1 text-on-surface-variant">
                  URL{" "}
                  <code className="rounded bg-surface px-1 text-xs">{mcpUrl}</code>
                  {" · "}
                  header{" "}
                  <code className="rounded bg-surface px-1 text-xs">
                    Authorization: Bearer tab_…
                  </code>
                </p>
                <p className="mt-2 text-xs text-on-surface-variant">
                  Local stdio remains available for Cursor / Claude Desktop.
                </p>
              </div>
              <pre className="whitespace-pre-wrap break-words rounded-lg bg-surface-container-low p-4 text-xs leading-relaxed text-on-surface">
                {instructions}
              </pre>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
