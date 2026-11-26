# @tablist/mcp-server

Local stdio MCP server for [Tablist](https://tablist.app). Tools call the Tablist HTTPS API with a personal access token (`TABLIST_API_TOKEN`). `BGG_API_KEY` stays on the Tablist server.

## Run (from repo root)

```bash
cd packages/mcp-server && npm install
# from boardgames repo root:
TABLIST_API_TOKEN=tab_… TABLIST_API_BASE=https://tablist.app \
  npx tsx packages/mcp-server/src/stdio.ts
```

## Cursor `mcp.json`

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

Create a token in the app under **Profile → Agents**.

Dev-only alternative: `TABLIST_ACCESS_TOKEN` (Supabase access JWT). Prefer PATs.

## Verify

1. `tablist_whoami`
2. `tablist_list_collection` with `limit: 3`
3. `tablist_pick_random_game` → `ui.kind === "tablist.random_game_reel"`
