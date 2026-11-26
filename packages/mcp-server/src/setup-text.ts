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

export function resolveMcpPublicOrigin(appOrigin: string): string {
  const origin = appOrigin.replace(/\/$/, "");
  if (origin === TABLIST_APP_ORIGIN || origin === "https://tablist.app") {
    return TABLIST_MCP_PUBLIC_ORIGIN;
  }
  return origin;
}

export function buildMcpHttpConfigSnippet(
  appOrigin = TABLIST_MCP_PUBLIC_ORIGIN
): string {
  const mcpUrl = tablistMcpUrl(resolveMcpPublicOrigin(appOrigin));
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

export function buildMcpStdioConfigSnippet(
  appOrigin = TABLIST_APP_ORIGIN
): string {
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

/** @deprecated Prefer buildMcpStdioConfigSnippet */
export const buildMcpConfigSnippet = buildMcpStdioConfigSnippet;

function sharedRules(mcpUrl: string): string {
  return `## Rules for the agent
- Prefer hosted HTTP at \`${mcpUrl}\`. Do **not** clone the repo or run Node unless the host cannot do remote MCP.
- Never invent, log, or commit the token. Ask the user to paste \`tab_…\` once into the host’s secret field / config.
- Do **not** ask for \`BGG_API_KEY\` — BGG stays on Tablist’s server.
- MCP URL must use **www** (\`${TABLIST_MCP_PUBLIC_ORIGIN}\`), not the apex redirect host.
- If tools return \`Missing scope: sessions:read\`, the PAT is old: user must revoke it, create a new one in Profile → Agents, and reconnect.

## Verify (required)
1. Call \`tablist_whoami\` → expect the user’s display name / username.
2. Call \`tablist_list_collection\` with \`limit: 3\`.
3. Done. (Optional later: \`tablist_find_session\` with \`which: "latest"\`.)

## Failures
- **401** → missing/revoked token → new PAT in Profile → Agents.
- **403 Missing scope** → regenerate PAT (scopes are fixed at mint time).
- **Tools missing** → wrong URL, missing Bearer header, or host not restarted.
- **Empty collection** → user has no games; use search/add tools after confirming.
`;
}

function claudeAiSteps(mcpUrl: string): string {
  return `## Claude.ai (hosted HTTP — do this)
1. Ask the user for a PAT from Tablist **Profile → Agents** (\`tab_…\`).
2. Have them open Claude.ai → **Customize → Connectors → Add custom connector**
   (Team/Enterprise: Organization settings → Connectors → Add → Custom).
3. Fill in:
   - **Server URL:** \`${mcpUrl}\`
   - **Authentication:** No sign-in
   - **Request header** (Required): name \`authorization\`, value \`Bearer <PASTE_TOKEN>\`
     (must include the word Bearer and a space)
4. Save. Leave transport as Streamable HTTP. Do not use a URL ending in \`/sse\`.
5. Run verify steps below.

If Request headers are unavailable on their plan, switch to Cursor / Claude Desktop with the HTTP config JSON instead.
`;
}

function cursorSteps(mcpUrl: string, httpSnippet: string): string {
  return `## Cursor (hosted HTTP — do this)
1. Ask the user for a PAT from Tablist **Profile → Agents** (\`tab_…\`).
2. Add/merge this into Cursor MCP settings (\`mcp.json\`). Replace \`<PASTE_TOKEN>\` with their token:

\`\`\`json
${httpSnippet}
\`\`\`

3. Reload / restart MCP in Cursor, then run verify steps below.

URL reference: \`${mcpUrl}\`
`;
}

function claudeDesktopSteps(mcpUrl: string, httpSnippet: string): string {
  return `## Claude Desktop (hosted HTTP when supported)
1. Ask the user for a PAT from Tablist **Profile → Agents** (\`tab_…\`).
2. Prefer remote MCP with URL \`${mcpUrl}\` and header \`Authorization: Bearer <PASTE_TOKEN>\`.
   If the Desktop build accepts URL+headers in config, merge:

\`\`\`json
${httpSnippet}
\`\`\`

3. Only if remote MCP is unavailable, use local stdio (needs the boardgames repo + Node 20+):

\`\`\`json
${buildMcpStdioConfigSnippet()}
\`\`\`

4. Restart Claude Desktop, then run verify steps below.
`;
}

function otherClientSteps(mcpUrl: string, httpSnippet: string): string {
  return `## Other MCP host
1. Ask the user for a PAT from Tablist **Profile → Agents** (\`tab_…\`).
2. Configure Streamable HTTP MCP:
   - URL: \`${mcpUrl}\`
   - Header: \`Authorization: Bearer <PASTE_TOKEN>\`
3. Example config many hosts accept:

\`\`\`json
${httpSnippet}
\`\`\`

4. Run verify steps below. Use local stdio only if the host has no remote/HTTP MCP.
`;
}

function overviewSteps(
  mcpUrl: string,
  httpSnippet: string
): string {
  return `## Goal
Wire Tablist MCP so you can call \`tablist_*\` tools for this user’s collection and sessions.

## Fast path (recommended for every host that supports remote MCP)
1. Ask which client they use: Claude.ai, Cursor, Claude Desktop, or other.
2. Ask for a PAT from Tablist **Profile → Agents** (\`tab_…\`). Never invent it.
3. Connect with hosted HTTP (no install):
   - **URL:** \`${mcpUrl}\`
   - **Header:** \`Authorization: Bearer <PASTE_TOKEN>\`
4. Run verify steps.

### Claude.ai UI path
Customize → Connectors → Add custom connector → URL above → Auth **No sign-in** →
Required request header \`authorization\` = \`Bearer <PASTE_TOKEN>\`.

### Config JSON (Cursor / Desktop / other)
\`\`\`json
${httpSnippet}
\`\`\`

### Local stdio (last resort)
Only if the host cannot do remote HTTP. Needs the boardgames repo + Node 20+:

\`\`\`json
${buildMcpStdioConfigSnippet()}
\`\`\`
`;
}

/**
 * Short, action-oriented setup text for LLMs (Profile copy + MCP prompt/resource).
 * Pass `client` when known so the model gets one path instead of every option.
 */
export function buildConnectInstructions(
  appOrigin: string = TABLIST_APP_ORIGIN,
  client?: McpClientKind
): string {
  const origin = appOrigin.replace(/\/$/, "");
  const mcpOrigin = resolveMcpPublicOrigin(origin);
  const mcpUrl = tablistMcpUrl(mcpOrigin);
  const httpSnippet = buildMcpHttpConfigSnippet(mcpOrigin);

  const body =
    client === "claude_ai"
      ? claudeAiSteps(mcpUrl)
      : client === "cursor"
        ? cursorSteps(mcpUrl, httpSnippet)
        : client === "claude_desktop"
          ? claudeDesktopSteps(mcpUrl, httpSnippet)
          : client === "other"
            ? otherClientSteps(mcpUrl, httpSnippet)
            : overviewSteps(mcpUrl, httpSnippet);

  return `# Connect Tablist MCP

You are connecting Tablist MCP for this user. Do not invent credentials.

${body}
${sharedRules(mcpUrl)}`;
}

/** Alias used by the Next.js Agents UI. */
export function buildMcpConnectInstructions(options?: {
  appOrigin?: string;
  client?: McpClientKind;
  /** Ignored — kept for call-site compatibility. */
  packageHint?: string;
}): string {
  return buildConnectInstructions(
    options?.appOrigin ?? TABLIST_APP_ORIGIN,
    options?.client
  );
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
