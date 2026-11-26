export function buildConnectInstructions(appOrigin: string): string {
  const origin = appOrigin.replace(/\/$/, "");
  // Prefer www — apex tablist.app 308-redirects; Claude may not follow POST redirects.
  const mcpOrigin =
    origin === "https://tablist.app" ? "https://www.tablist.app" : origin;
  const mcpUrl = `${mcpOrigin}/api/mcp`;
  return `# Connect Tablist MCP

You are setting up the Tablist MCP server for this user so you can manage
their board-game collection and sessions. Do not invent credentials.

## 1. Prerequisites
- Tablist account signed in at ${origin}
- A personal access token from Profile → Agents (starts with \`tab_\`).
  Ask the user to paste it into a secret/env — never commit it.

## 2. Claude.ai / remote (Streamable HTTP) — preferred for Claude web
- MCP URL: \`${mcpUrl}\`
- Header: \`Authorization: Bearer <PASTE_TOKEN>\` (include Bearer + space)
- Claude.ai: Customize → Connectors → Add custom connector → No sign-in →
  Request headers → authorization = \`Bearer <PASTE_TOKEN>\`

## 3. Cursor / Claude Desktop (local stdio) — optional
Requires Node 20+.

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

## 4. Auth
- Preferred: \`TABLIST_API_TOKEN\` (PAT from Profile) or Bearer on HTTP MCP.
- Dev-only: temporary Supabase access token via \`TABLIST_ACCESS_TOKEN\` only if Profile says so.
- Do not request \`BGG_API_KEY\` from the user — BGG stays on the Tablist server.

## 5. Token scopes
New tokens from Profile → Agents include \`collection:read|write\`,
\`sessions:read|write\`, and \`bgg:read\`. If session tools return
\`Missing scope: sessions:read\`, revoke the old token and create a new one,
then reconnect Claude / update the Bearer header.

## 6. Verify
1. Restart / reconnect the MCP host.
2. Call tool \`tablist_whoami\` — expect display name / username.
3. Call \`tablist_list_collection\` with limit 3.
4. Call \`tablist_list_sessions\` or \`tablist_find_session\` with
   \`which: "latest"\` — expect roster/games/notes fields.
5. Optionally \`tablist_pick_random_game\` — expect \`ui.kind\`
   \`tablist.random_game_reel\`, \`presentationMarkdown\`, and
   \`ui.animationUrl\` (SVG spin). Paste the markdown frames in chat.

## 7. If verification fails
- 401 → token missing/revoked; recreate PAT in Profile.
- 403 Missing scope → regenerate token (scopes are fixed at mint time).
- Tools missing → config JSON / restart host / wrong MCP URL.
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
