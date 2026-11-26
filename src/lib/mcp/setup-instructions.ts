/**
 * Re-exports Tablist MCP setup helpers from the mcp-server package
 * so Profile UI and MCP prompts stay on one source of truth.
 */
export {
  TABLIST_APP_ORIGIN,
  TABLIST_MCP_PUBLIC_ORIGIN,
  TABLIST_MCP_PATH,
  tablistMcpUrl,
  resolveMcpPublicOrigin,
  buildConnectInstructions,
  buildMcpConnectInstructions,
  buildMcpHttpConfigSnippet,
  buildMcpStdioConfigSnippet,
  buildMcpConfigSnippet,
  type McpClientKind,
} from "@tablist/mcp-server/setup-text";
