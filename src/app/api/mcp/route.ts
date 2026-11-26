import { handleTablistMcpRequest } from "@/lib/mcp/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function handle(request: Request): Promise<Response> {
  return handleTablistMcpRequest(request);
}

// Streamable HTTP: POST (JSON-RPC), GET (SSE), DELETE (end session).
export { handle as GET, handle as POST, handle as DELETE, handle as OPTIONS };
