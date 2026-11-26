# @tablist/mcp-server

Tablist domain MCP server (collection, sessions, BGG via Tablist HTTPS API).

- **Hosted Streamable HTTP** (Claude.ai / remote): `https://www.tablist.app/api/mcp` with `Authorization: Bearer tab_…` — implemented in the Next app (`src/app/api/mcp`), reusing this package’s tool handlers.
- **Local stdio** (Cursor / Claude Desktop): this package’s `stdio.ts` entry.

`BGG_API_KEY` stays on the Tablist server.

## Hosted (recommended for Claude.ai)

1. Create a PAT under **Profile → Agents** (`tab_…`).
2. Add a Claude.ai custom connector:
   - URL: `https://www.tablist.app/api/mcp`
   - Auth: **No sign-in**
   - Request header `authorization` = `Bearer tab_…` (include `Bearer `)
3. Verify with `tablist_whoami`.

## Run stdio (from repo root)

```bash
cd packages/mcp-server && npm install
# from boardgames repo root:
TABLIST_API_TOKEN=tab_… TABLIST_API_BASE=https://tablist.app \
  npx tsx packages/mcp-server/src/stdio.ts
```

## Cursor `mcp.json` (stdio)

```json
{
  "mcpServers": {
    "tablist": {
      "command": "npx",
      "args": ["tsx", "packages/mcp-server/src/stdio.ts"],
      "cwd": "/absolute/path/to/boardgames",
      "env": {
        "TABLIST_API_TOKEN": "tab_…",
        "TABLIST_API_BASE": "https://tablist.app"
      }
    }
  }
}
```

Remote HTTP-style config (hosts that support URL + headers):

```json
{
  "mcpServers": {
    "tablist": {
      "url": "https://www.tablist.app/api/mcp",
      "headers": {
        "Authorization": "Bearer tab_…"
      }
    }
  }
}
```

Dev-only alternative: `TABLIST_ACCESS_TOKEN` (Supabase access JWT). Prefer PATs.

## Verify

1. `tablist_whoami`
2. `tablist_list_collection` with `limit: 3`
3. `tablist_find_session` with `which: "latest"` (needs `sessions:read` on the PAT)
4. `tablist_pick_random_game` → MCP Apps iframe (`ui://tablist/random-game-reel`) when the host supports it; else `presentationMarkdown` / `ui.animationUrl`
5. `tablist_pick_first_player` → MCP Apps iframe (`ui://tablist/first-player-reel`) when supported

If session tools return `Missing scope: sessions:read`, revoke the token in Profile → Agents, create a new one (defaults include sessions scopes), and reconnect.

**MCP Apps (Claude.ai / ChatGPT / VS Code):** `tablist_pick_random_game` and `tablist_pick_first_player` advertise `_meta.ui.resourceUri` pointing at `text/html;profile=mcp-app` resources. Supporting hosts load those in a sandboxed iframe (Claude may open fullscreen / side panel via `preferredDisplayMode`). Fallback for other hosts: markdown frames + SVG/page URLs for random pick; markdown winner for first player.
