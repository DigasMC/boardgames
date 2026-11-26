import { TablistClient } from "@tablist/mcp-server/client";
import { createTablistMcpServer } from "@tablist/mcp-server";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { isApiTokenFormat } from "@/lib/auth/api-tokens";
import {
  TABLIST_APP_ORIGIN,
  TABLIST_MCP_PATH,
  tablistMcpUrl,
} from "@/lib/mcp/setup-instructions";

export { TABLIST_MCP_PATH, tablistMcpUrl };

export function resolveTablistApiBase(request: Request): string {
  const fromEnv =
    process.env.TABLIST_API_BASE?.trim() ||
    process.env.TABLIST_APP_ORIGIN?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) {
    const cleaned = fromEnv.replace(/\/$/, "");
    return cleaned.startsWith("http") ? cleaned : `https://${cleaned}`;
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return `https://${vercel.replace(/\/$/, "")}`;
  }

  try {
    return new URL(request.url).origin;
  } catch {
    return TABLIST_APP_ORIGIN;
  }
}

function extractBearer(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() || null;
}

function unauthorizedResponse(message: string): Response {
  return Response.json(
    {
      jsonrpc: "2.0",
      error: {
        code: -32001,
        message,
      },
      id: null,
    },
    {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Bearer realm="tablist-mcp", error="invalid_token"',
        "Cache-Control": "no-store",
      },
    }
  );
}

/**
 * Streamable HTTP MCP handler (stateless) authenticated with Tablist PATs.
 * Reuses the same tool/resource/prompt registrations as the stdio package.
 */
export async function handleTablistMcpRequest(
  request: Request
): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(request),
    });
  }

  const bearer = extractBearer(request);
  if (!bearer) {
    return withCors(
      request,
      unauthorizedResponse(
        "Missing Authorization Bearer token. Use a Tablist PAT (tab_…) from Profile → Agents."
      )
    );
  }

  if (!isApiTokenFormat(bearer) && bearer.length < 20) {
    return withCors(
      request,
      unauthorizedResponse("Invalid Authorization Bearer token")
    );
  }

  const apiBase = resolveTablistApiBase(request);
  const client = new TablistClient(apiBase, bearer);
  const server = createTablistMcpServer(client, { appOrigin: apiBase });

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    // Prefer JSON responses on serverless — avoids long-lived SSE on Vercel.
    enableJsonResponse: true,
  });

  await server.connect(transport);

  try {
    const response = await transport.handleRequest(request);
    return withCors(request, response);
  } finally {
    void server.close().catch(() => undefined);
  }
}

function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Authorization, Content-Type, Accept, Mcp-Session-Id, Last-Event-ID, MCP-Protocol-Version",
    "Access-Control-Expose-Headers": "Mcp-Session-Id",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function withCors(request: Request, response: Response): Response {
  const headers = new Headers(response.headers);
  const extra = corsHeaders(request);
  for (const [key, value] of Object.entries(extra)) {
    headers.set(key, value);
  }
  headers.set("Cache-Control", "no-store");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
