/**
 * Smoke: tools/list + resources/read advertise MCP Apps UI for reel tools.
 * Uses in-process server with a stub client (no network).
 */
import { createTablistMcpServer } from "../src/server.ts";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

const stub = {
  async request() {
    throw new Error("stub: unexpected API call during smoke");
  },
};

const server = createTablistMcpServer(stub, {
  appOrigin: "https://www.tablist.app",
});
const [clientTransport, serverTransport] =
  InMemoryTransport.createLinkedPair();
const client = new Client({ name: "smoke", version: "0.0.0" });

await server.connect(serverTransport);
await client.connect(clientTransport);

const tools = await client.listTools();
const random = tools.tools.find((t) => t.name === "tablist_pick_random_game");
const first = tools.tools.find((t) => t.name === "tablist_pick_first_player");

function uiUri(tool) {
  const meta = tool?._meta ?? {};
  return meta?.ui?.resourceUri ?? meta?.["ui/resourceUri"];
}

const checks = [];
checks.push(["random tool exists", Boolean(random)]);
checks.push(["first tool exists", Boolean(first)]);
checks.push([
  "random ui uri",
  uiUri(random) === "ui://tablist/random-game-reel",
]);
checks.push([
  "first ui uri",
  uiUri(first) === "ui://tablist/first-player-reel",
]);

for (const uri of [
  "ui://tablist/random-game-reel",
  "ui://tablist/first-player-reel",
]) {
  const res = await client.readResource({ uri });
  const content = res.contents?.[0];
  checks.push([
    `${uri} mime`,
    content?.mimeType === "text/html;profile=mcp-app",
  ]);
  checks.push([
    `${uri} html`,
    typeof content?.text === "string" &&
      content.text.includes("<!DOCTYPE html>") &&
      content.text.includes("app-with-deps.js"),
  ]);
  const preferred = content?._meta?.ui?.preferredDisplayMode;
  checks.push([`${uri} preferredDisplayMode`, preferred === "fullscreen"]);
}

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failed += 1;
}

await client.close();
await server.close();
process.exit(failed ? 1 : 0);
