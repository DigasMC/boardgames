export function buildConnectInstructions(appOrigin: string): string {
  const origin = appOrigin.replace(/\/$/, "");
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

## 3. Claude Desktop — edit claude_desktop_config.json
Same \`mcpServers.tablist\` block as above (command/args/cwd/env).

## 4. Auth
- Preferred: \`TABLIST_API_TOKEN\` (PAT from Profile).
- Dev-only: temporary Supabase access token via \`TABLIST_ACCESS_TOKEN\` only if Profile says so.
- Do not request \`BGG_API_KEY\` from the user — BGG stays on the Tablist server.

## 5. Verify
1. Restart the MCP host (Cursor / Claude Desktop).
2. Call tool \`tablist_whoami\` — expect display name / username.
3. Call \`tablist_list_collection\` with limit 3.
4. Optionally \`tablist_pick_random_game\` — expect \`ui.kind\`
   \`tablist.random_game_reel\` plus a chosen game.

## 6. If verification fails
- 401 → token missing/revoked; recreate PAT in Profile.
- Tools missing → config JSON / restart host.
- Empty collection → user has no games; use search/add tools after confirm.
`;
}

export const FILTER_DOCS = `# Tablist collection filters

Same semantics as the web Collection UI:

- \`search\`: case-insensitive substring on game name
- \`players\`: game min_players ≤ n ≤ max_players
- \`maxPlaytime\`: if < 180, exclude games with playing_time (or max/min) above the value; ≥180 means no max
- \`weightMax\`: 0 = off; otherwise exclude games heavier than this
- \`categories\`: OR match; each wanted string case-insensitive-includes against game categories
- \`wishlist\`: \`exclude\` (default, owned shelf), \`only\`, or \`include\`
`;
