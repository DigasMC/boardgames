export const TABLIST_APP_ORIGIN = "https://tablist.app";

export type McpClientKind = "cursor" | "claude_desktop" | "other";

export function buildMcpConnectInstructions(options?: {
  appOrigin?: string;
  client?: McpClientKind;
  packageHint?: string;
}): string {
  const origin = (options?.appOrigin ?? TABLIST_APP_ORIGIN).replace(/\/$/, "");
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
- Node 20+ available for local stdio.

## 2. Cursor (stdio) — add to mcp.json / Cursor MCP settings
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

## 3. Claude Desktop — edit claude_desktop_config.json
Same \`mcpServers.tablist\` block as above (command/args/cwd/env).

## 4. Auth
- Preferred: \`TABLIST_API_TOKEN\` (PAT from Profile → Agents).
- Dev-only: temporary Supabase access token via \`TABLIST_ACCESS_TOKEN\` only
  if Profile says so (JWTs expire; do not commit).
- Do not request \`BGG_API_KEY\` from the user for MCP clients that call
  Tablist HTTPS APIs — BGG stays on the Tablist server.

## 5. Verify
1. Restart the MCP host (Cursor / Claude Desktop).
2. Call tool \`tablist_whoami\` — expect display name / username.
3. Call \`tablist_list_collection\` with limit 3.
4. Optionally \`tablist_pick_random_game\` — expect \`ui.kind\`
   \`tablist.random_game_reel\` plus a chosen game.

## 6. If verification fails
- 401 → token missing/revoked; recreate PAT in Profile → Agents.
- Tools missing → config JSON / restart host.
- Empty collection → user has no games; use search/add tools after confirm.
`;
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
