/** MCP Apps UI resource URIs (ui:// scheme). */
export const RANDOM_GAME_UI_URI = "ui://tablist/random-game-reel";
export const FIRST_PLAYER_UI_URI = "ui://tablist/first-player-reel";

/** CDN copy of @modelcontextprotocol/ext-apps browser App client (matches installed 1.7.5). */
export const EXT_APPS_CDN =
  "https://unpkg.com/@modelcontextprotocol/ext-apps@1.7.5/dist/src/app-with-deps.js";

/** Origins the sandboxed iframe may load (scripts + BGG cover art). */
export const MCP_APP_RESOURCE_DOMAINS = [
  "https://unpkg.com",
  "https://cf.geekdo-images.com",
  "https://*.geekdo-images.com",
  "https://boardgamegeek.com",
] as const;
