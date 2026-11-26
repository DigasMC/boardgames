# @tablist/mcp-server

Tablist domain MCP server (collection, sessions, BGG via Tablist HTTPS API).

- **Hosted Streamable HTTP** (recommended): `https://www.tablist.app/api/mcp` with `Authorization: Bearer tab_…` — Next app route `src/app/api/mcp`, same tool handlers as this package.
- **Local stdio** (fallback): `stdio.ts` when a host cannot do remote MCP.

`BGG_API_KEY` stays on the Tablist server. Prefer hosted HTTP — no clone, no Node on the client.

## Connect in 3 steps

1. Create a PAT under **Profile → Agents** (`tab_…`).
2. Point the MCP host at hosted HTTP:
   - **URL:** `https://www.tablist.app/api/mcp`
   - **Header:** `Authorization: Bearer tab_…` (include `Bearer `)
3. Call `tablist_whoami`.

On Profile → Agents, **Copy prompt for agent** pastes short client-specific steps an LLM can follow (or finish) for you.

### Claude.ai

Customize → Connectors → Add custom connector → URL above → Auth **No sign-in** → Required request header `authorization` = `Bearer tab_…`.

### Cursor / remote JSON

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

## Local stdio (fallback only)

```bash
cd packages/mcp-server && npm install
# from boardgames repo root:
TABLIST_API_TOKEN=tab_… TABLIST_API_BASE=https://tablist.app \
  npx tsx packages/mcp-server/src/stdio.ts
```

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

Dev-only alternative: `TABLIST_ACCESS_TOKEN` (Supabase access JWT). Prefer PATs.

## Verify

1. `tablist_whoami`
2. `tablist_list_collection` with `limit: 3`

If session tools return `Missing scope: sessions:read`, revoke the token in Profile → Agents, create a new one, and reconnect.

**MCP Apps (Claude.ai / ChatGPT / VS Code):** `tablist_pick_random_game` and `tablist_pick_first_player` advertise `_meta.ui.resourceUri` for iframe reels when the host supports them; otherwise markdown / SVG fallbacks.
