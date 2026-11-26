export const TABLIST_APP_ORIGIN = "https://tablist.app";
/** Canonical host for remote MCP — apex tablist.app 308-redirects to www; Claude may not follow POST redirects. */
export const TABLIST_MCP_PUBLIC_ORIGIN = "https://www.tablist.app";
export const TABLIST_MCP_PATH = "/api/mcp";

export type McpClientKind =
  | "claude_ai"
  | "cursor"
  | "claude_desktop"
  | "other";

export function tablistMcpUrl(
  appOrigin: string = TABLIST_MCP_PUBLIC_ORIGIN
): string {
  return `${appOrigin.replace(/\/$/, "")}${TABLIST_MCP_PATH}`;
}

export function buildMcpConnectInstructions(options?: {
  appOrigin?: string;
  client?: McpClientKind;
  packageHint?: string;
}): string {
  const origin = (options?.appOrigin ?? TABLIST_APP_ORIGIN).replace(/\/$/, "");
  // Prefer www for the MCP endpoint even when marketing origin is apex.
  const mcpOrigin =
    origin === TABLIST_APP_ORIGIN || origin === "https://tablist.app"
      ? TABLIST_MCP_PUBLIC_ORIGIN
      : origin;
  const mcpUrl = tablistMcpUrl(mcpOrigin);
  const packageHint =
    options?.packageHint ??
    "npx tsx packages/mcp-server/src/stdio.ts (from the boardgames repo) — or @tablist/mcp-server when published";

  return `# Connect Tablist MCP

You are setting up the Tablist MCP server for this user so you can manage
their board-game collection and sessions. Do not invent credentials.

## 1. Prerequisites
- Tablist account signed in at ${origin}
- A personal access token from Profile → Agents (starts with \`tab_\`).
  Ask the user to paste it into a secret/env — never commit it.

## 2. Claude.ai / remote clients (recommended) — Streamable HTTP
Use the hosted MCP endpoint (no local Node required):

- **MCP URL:** \`${mcpUrl}\`
- **Auth:** \`Authorization: Bearer <PASTE_TOKEN>\` (include the word Bearer and a space)

### Claude.ai custom connector
1. Open Claude.ai → Customize → Connectors → Add custom connector
   (Team/Enterprise: Organization settings → Connectors → Add → Custom).
2. Server URL: \`${mcpUrl}\`
3. Authentication: **No sign-in**
4. Under **Request headers** (beta; if shown), add:
   - Header: \`authorization\`
   - Value: \`Bearer <PASTE_TOKEN>\` (must include \`Bearer \` prefix)
   - Mark the header **Required**
5. Leave transport as Streamable HTTP (default). Do not use a URL ending in \`/sse\`.
6. Save, then verify with \`tablist_whoami\`.

If Request headers are unavailable on the plan, the user must use a client that
supports Bearer headers (Claude Desktop / Cursor with remote MCP, or local stdio).

## 3. Cursor / Claude Desktop (local stdio) — optional
Requires Node 20+ and the boardgames repo (or published package).

\`\`\`json
{
  "mcpServers": {
    "tablist": {
      "command": "npx",
      "args": ["tsx", "packages/mcp-server/src/stdio.ts"],
      "cwd": "<path-to-boardgames-repo>",
      "env": {
        "TABLIST_API_TOKEN": "<PASTE_TOKEN>",
        "TABLIST_API_BASE": "${origin}"
      }
    }
  }
}
\`\`\`
(Early dev uses local \`packages/mcp-server\` via tsx. Published package may
replace args with \`["-y", "@tablist/mcp-server@latest"]\` — use the snippet
shown in Profile if it differs. Current package hint: ${packageHint}.)

Cursor / Claude Desktop can also point a remote MCP HTTP client at \`${mcpUrl}\`
with the same Bearer header when the host supports it.

## 4. Auth
- Preferred: Tablist PAT (\`tab_\`…) as \`Authorization: Bearer …\` (HTTP) or
  \`TABLIST_API_TOKEN\` (stdio).
- Dev-only: temporary Supabase access token via \`TABLIST_ACCESS_TOKEN\` only
  if Profile says so (JWTs expire; do not commit).
- Do not request \`BGG_API_KEY\` from the user for MCP clients that call
  Tablist HTTPS APIs — BGG stays on the Tablist server.

## 5. Token scopes
New tokens from Profile → Agents include \`collection:read|write\`,
\`sessions:read|write\`, and \`bgg:read\`. If session tools return
\`Missing scope: sessions:read\`, revoke the old token and **create a new one**,
then reconnect Claude / update the Bearer header (scopes are fixed at mint time).

## 6. Verify
1. Connect / restart the MCP host.
2. Call tool \`tablist_whoami\` — expect display name / username.
3. Call \`tablist_list_collection\` with limit 3.
4. Call \`tablist_list_sessions\` or \`tablist_find_session\` with
   \`which: "latest"\` — expect full roster/games/scores/notes.
5. Optionally \`tablist_pick_random_game\` — expect \`ui.kind\`
   \`tablist.random_game_reel\`, \`presentationMarkdown\`, and
   \`ui.animationUrl\`. Paste the markdown frames so the spin shows in chat.

## 7. If verification fails
- 401 → token missing/revoked; recreate PAT in Profile → Agents.
- 403 Missing scope → regenerate token (old tokens keep their original scopes).
- Tools missing → config JSON / restart host / wrong MCP URL.
- Empty collection → user has no games; use search/add tools after confirm.
`;
}

export function buildMcpHttpConfigSnippet(
  appOrigin = TABLIST_MCP_PUBLIC_ORIGIN
): string {
  const mcpOrigin =
    appOrigin === TABLIST_APP_ORIGIN || appOrigin === "https://tablist.app"
      ? TABLIST_MCP_PUBLIC_ORIGIN
      : appOrigin;
  const mcpUrl = tablistMcpUrl(mcpOrigin);
  return JSON.stringify(
    {
      mcpServers: {
        tablist: {
          url: mcpUrl,
          headers: {
            Authorization: "Bearer <PASTE_TOKEN>",
          },
        },
      },
    },
    null,
    2
  );
}

export function buildMcpConfigSnippet(appOrigin = TABLIST_APP_ORIGIN): string {
  const origin = appOrigin.replace(/\/$/, "");
  return JSON.stringify(
    {
      mcpServers: {
        tablist: {
          command: "npx",
          args: ["tsx", "packages/mcp-server/src/stdio.ts"],
          cwd: "<path-to-boardgames-repo>",
          env: {
            TABLIST_API_TOKEN: "<PASTE_TOKEN>",
            TABLIST_API_BASE: origin,
          },
        },
      },
    },
    null,
    2
  );
}
