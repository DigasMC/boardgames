import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";
import { createTablistClientFromEnv, type TablistClient } from "./client.js";
import {
  serializeSessionDetail,
  serializeSessionListItem,
  summarizeSession,
} from "./sessions.js";
import { FILTER_DOCS, buildConnectInstructions } from "./setup-text.js";
import {
  FIRST_PLAYER_UI_URI,
  MCP_APP_RESOURCE_DOMAINS,
  RANDOM_GAME_UI_URI,
} from "./ui/constants.js";
import { buildFirstPlayerAppHtml } from "./ui/first-player-html.js";
import { buildRandomGameAppHtml } from "./ui/random-game-html.js";

function textResult(text: string, structured?: unknown) {
  return {
    content: [{ type: "text" as const, text }],
    ...(structured !== undefined
      ? { structuredContent: structured as Record<string, unknown> }
      : {}),
  };
}

function errorResult(err: unknown) {
  const e = err as { message?: string; error?: string; code?: string; status?: number };
  const payload = {
    error: e.error || e.message || "Request failed",
    code: e.code,
    status: e.status,
  };
  return {
    isError: true as const,
    content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload,
  };
}

const filterShape = {
  search: z.string().optional(),
  players: z.number().int().positive().optional(),
  maxPlaytime: z.number().int().positive().optional(),
  weightMax: z.number().nonnegative().optional(),
  categories: z.array(z.string()).optional(),
  wishlist: z.enum(["exclude", "only", "include"]).optional(),
};

function compactGame(g: Record<string, unknown>) {
  return {
    id: g.id,
    collectionItemId: g.collection_item_id ?? g.collectionItemId,
    bggId: g.bgg_id ?? g.bggId,
    name: g.name,
    minPlayers: g.min_players ?? g.minPlayers,
    maxPlayers: g.max_players ?? g.maxPlayers,
    playingTime: g.playing_time ?? g.playingTime,
    weight: g.weight,
    bggRating: g.bgg_rating ?? g.bggRating,
    yearPublished: g.year_published ?? g.yearPublished,
    categories: g.categories,
    mechanics: g.mechanics,
    thumbnailUrl: g.thumbnail_url ?? g.thumbnailUrl,
    imageUrl: g.image_url ?? g.imageUrl,
    notes: g.notes,
    isWishlist: g.is_wishlist ?? g.isWishlist,
  };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export function createTablistMcpServer(
  client?: TablistClient,
  options?: { appOrigin?: string }
): McpServer {
  const api = client ?? createTablistClientFromEnv();
  const appOrigin =
    options?.appOrigin?.trim() ||
    process.env.TABLIST_API_BASE?.trim() ||
    process.env.TABLIST_APP_ORIGIN?.trim() ||
    "https://tablist.app";

  const server = new McpServer({
    name: "tablist",
    version: "0.1.0",
  });

  server.registerTool(
    "tablist_whoami",
    {
      description:
        "Confirm Tablist auth and return the signed-in profile summary (display name, username, collection id).",
      inputSchema: {},
    },
    async () => {
      try {
        const me = await api.request<Record<string, unknown>>("GET", "/api/me");
        const profile = me.profile as Record<string, unknown> | null;
        const summary = profile
          ? `${profile.displayName ?? "User"}${profile.username ? ` (@${profile.username})` : ""}`
          : String(me.userId);
        return textResult(
          `Authenticated as ${summary}. BGG server key configured: ${Boolean(me.bggConfigured)}.`,
          me
        );
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  server.registerTool(
    "tablist_list_collection",
    {
      description:
        "List games in the user's Tablist collection with the same filters as the web UI.",
      inputSchema: {
        ...filterShape,
        limit: z.number().int().positive().max(500).optional(),
        offset: z.number().int().nonnegative().optional(),
      },
    },
    async (args) => {
      try {
        const data = await api.request<{
          collectionId: string;
          total: number;
          games: Record<string, unknown>[];
        }>("GET", "/api/collection", {
          query: {
            search: args.search,
            players: args.players,
            maxPlaytime: args.maxPlaytime,
            weightMax: args.weightMax,
            categories: args.categories?.join(","),
            wishlist: args.wishlist,
            limit: args.limit,
            offset: args.offset,
          },
        });
        const games = (data.games ?? []).map(compactGame);
        const payload = {
          collectionId: data.collectionId,
          total: data.total,
          games,
        };
        return textResult(
          `Collection has ${data.total} matching game(s); returning ${games.length}.`,
          payload
        );
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  server.registerTool(
    "tablist_search_games",
    {
      description: "Search the BoardGameGeek catalog via Tablist (server-side BGG key).",
      inputSchema: {
        query: z.string().min(1),
        offset: z.number().int().nonnegative().optional(),
        limit: z.number().int().positive().max(50).optional(),
      },
    },
    async (args) => {
      try {
        const data = await api.request<Record<string, unknown>>("GET", "/api/bgg/search", {
          query: {
            q: args.query,
            offset: args.offset,
            limit: args.limit,
          },
        });
        return textResult(JSON.stringify(data, null, 2), data);
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  server.registerTool(
    "tablist_add_game",
    {
      description: "Add a BGG game to the user's collection (upserts cache + collection item).",
      inputSchema: {
        bggId: z.number().int().positive(),
        isWishlist: z.boolean().optional(),
        notes: z.string().optional(),
      },
    },
    async (args) => {
      try {
        const data = await api.request<Record<string, unknown>>("POST", "/api/collection", {
          body: {
            bggId: args.bggId,
            isWishlist: args.isWishlist,
            notes: args.notes,
          },
        });
        return textResult(
          `Added ${(data.game as { name?: string })?.name ?? "game"} (item ${data.itemId}).`,
          data
        );
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  server.registerTool(
    "tablist_remove_game",
    {
      description: "Remove a game from the user's collection by collectionItemId or gameId.",
      inputSchema: {
        collectionItemId: z.string().optional(),
        gameId: z.string().optional(),
      },
    },
    async (args) => {
      try {
        if (!args.collectionItemId && !args.gameId) {
          return errorResult({
            error: "collectionItemId or gameId required",
            code: "validation",
          });
        }
        const data = await api.request<Record<string, unknown>>("DELETE", "/api/collection", {
          query: {
            itemId: args.collectionItemId,
            gameId: args.gameId,
          },
        });
        return textResult("Removed from collection.", data);
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  server.registerTool(
    "tablist_get_game",
    {
      description: "Get a cached game by gameId or bggId; optionally refresh from BGG.",
      inputSchema: {
        gameId: z.string().optional(),
        bggId: z.number().int().positive().optional(),
        refresh: z.boolean().optional(),
      },
    },
    async (args) => {
      try {
        const data = await api.request<Record<string, unknown>>("GET", "/api/games", {
          query: {
            gameId: args.gameId,
            bggId: args.bggId,
            refresh: args.refresh ? "1" : undefined,
          },
        });
        return textResult(JSON.stringify(data, null, 2), data);
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  registerAppTool(
    server,
    "tablist_pick_random_game",
    {
      title: "Pick random game",
      description:
        "Uniform random pick from the filtered collection. Always returns structuredContent.ui.kind = tablist.random_game_reel (same spinMs/reel length as the web app). MCP Apps hosts (Claude.ai, ChatGPT, VS Code) render ui://tablist/random-game-reel as a sandboxed iframe reel. Hosts without MCP Apps: (1) paste presentationMarkdown verbatim so cover frames appear in order, (2) embed ui.animationUrl (animated SVG) if the host shows images, (3) optionally link ui.animationPageUrl, (4) highlight the winner. Do not re-roll locally; call again with excludeGameIds. Not persisted.",
      inputSchema: {
        ...filterShape,
        excludeGameIds: z.array(z.string()).optional(),
        ui: z.enum(["auto", "structured", "media", "text"]).optional(),
      },
      _meta: {
        ui: { resourceUri: RANDOM_GAME_UI_URI },
      },
    },
    async (args) => {
      try {
        const data = await api.request<{
          game: Record<string, unknown>;
          poolSize: number;
          filtersApplied: unknown;
          text?: string;
          coverUrl?: string | null;
          frames?: unknown;
          presentationMarkdown?: string;
          ui: Record<string, unknown>;
        }>("POST", "/api/collection/random", {
          body: {
            search: args.search,
            players: args.players,
            maxPlaytime: args.maxPlaytime,
            weightMax: args.weightMax,
            categories: args.categories,
            wishlist: args.wishlist,
            excludeGameIds: args.excludeGameIds,
            ui: args.ui ?? "auto",
          },
        });
        const name = String(data.game?.name ?? "Unknown");
        const presentation =
          typeof data.presentationMarkdown === "string" &&
          data.presentationMarkdown.trim()
            ? data.presentationMarkdown
            : `${data.text ?? `Picked ${name}.`}${
                data.coverUrl ? `\n\n![${name}](${data.coverUrl})` : ""
              }${
                typeof data.ui?.deepLink === "string"
                  ? `\nOpen in Tablist: ${data.ui.deepLink}`
                  : ""
              }`;
        return textResult(presentation, data);
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  server.registerTool(
    "tablist_list_sessions",
    {
      description:
        "List the user's hosted game sessions. Supports status filter, title search (q), and pagination. Returns id/title/date/status/game/players/notes so you can pick one and call tablist_get_session or tablist_find_session. Requires sessions:read on the PAT.",
      inputSchema: {
        status: z
          .enum(["planned", "in_progress", "completed", "cancelled"])
          .optional(),
        q: z
          .string()
          .optional()
          .describe("Case-insensitive title substring search"),
        limit: z.number().int().positive().max(100).optional(),
        offset: z.number().int().nonnegative().optional(),
      },
    },
    async (args) => {
      try {
        const data = await api.request<{
          sessions: Record<string, unknown>[];
          total?: number;
        }>("GET", "/api/sessions", {
          query: {
            status: args.status,
            q: args.q,
            limit: args.limit,
            offset: args.offset,
          },
        });
        const sessions = (data.sessions ?? []).map(serializeSessionListItem);
        const payload = { sessions, total: data.total ?? sessions.length };
        const preview = sessions
          .slice(0, 5)
          .map(
            (s) =>
              `- ${s.title} (${s.status}) ${s.sessionDate ?? ""} · ${s.game?.name ?? "no game"} · id=${s.id}`
          )
          .join("\n");
        return textResult(
          `${payload.total} session(s); returning ${sessions.length}.${
            preview ? `\n${preview}` : ""
          }`,
          payload
        );
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  server.registerTool(
    "tablist_get_session",
    {
      description:
        "Get full session detail matching the app: host, games, roster (players), teams, scores, notes, dates. Pass sessionId (UUID). For title/recency lookup use tablist_find_session. Requires sessions:read.",
      inputSchema: {
        sessionId: z.string().min(1),
      },
    },
    async (args) => {
      try {
        const data = await api.request<{ session: Record<string, unknown> }>(
          "GET",
          "/api/sessions",
          { query: { id: args.sessionId } }
        );
        const session = serializeSessionDetail(data.session ?? data);
        return textResult(summarizeSession(session), { session });
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  server.registerTool(
    "tablist_find_session",
    {
      description:
        "Find a session by id, title substring, or recency (latest / most recent), then return the same full detail as tablist_get_session (roster, games, scores, notes, dates). Prefer this when the user says 'last session' or names a night by title. Requires sessions:read.",
      inputSchema: {
        sessionId: z.string().optional(),
        title: z.string().optional(),
        query: z.string().optional(),
        which: z.enum(["latest", "most_recent"]).optional(),
        status: z
          .enum(["planned", "in_progress", "completed", "cancelled"])
          .optional(),
      },
    },
    async (args) => {
      try {
        const titleOrQuery = (args.title ?? args.query)?.trim();
        let sessionId = args.sessionId?.trim();

        if (sessionId && isUuid(sessionId)) {
          const data = await api.request<{ session: Record<string, unknown> }>(
            "GET",
            "/api/sessions",
            { query: { id: sessionId } }
          );
          const session = serializeSessionDetail(data.session ?? data);
          return textResult(summarizeSession(session), { session, match: "id" });
        }

        if (
          args.which === "latest" ||
          args.which === "most_recent" ||
          (!sessionId && !titleOrQuery)
        ) {
          const data = await api.request<{
            session?: Record<string, unknown>;
            sessions?: Record<string, unknown>[];
          }>("GET", "/api/sessions", {
            query: {
              latest: "1",
              status: args.status,
              q: titleOrQuery,
            },
          });
          const raw = data.session ?? data.sessions?.[0];
          if (!raw) {
            return errorResult({
              error: "No sessions found",
              code: "not_found",
              status: 404,
            });
          }
          const session = serializeSessionDetail(raw);
          return textResult(summarizeSession(session), {
            session,
            match: "latest",
          });
        }

        // Title / free-text: if it looks like a UUID we already handled; otherwise search.
        if (sessionId && !isUuid(sessionId) && !titleOrQuery) {
          // Treat non-UUID sessionId as a title search for convenience.
        }
        const q = titleOrQuery || sessionId;
        const listed = await api.request<{
          sessions: Record<string, unknown>[];
          total?: number;
        }>("GET", "/api/sessions", {
          query: {
            q,
            status: args.status,
            limit: 10,
          },
        });
        const hits = listed.sessions ?? [];
        if (hits.length === 0) {
          return errorResult({
            error: `No sessions matching "${q}"`,
            code: "not_found",
            status: 404,
          });
        }
        if (hits.length === 1) {
          const session = serializeSessionDetail(hits[0]!);
          return textResult(summarizeSession(session), {
            session,
            match: "title",
            candidates: hits.map(serializeSessionListItem),
          });
        }
        const candidates = hits.map(serializeSessionListItem);
        // Return the most recent match as session, plus candidates for disambiguation.
        const session = serializeSessionDetail(hits[0]!);
        return textResult(
          `Found ${hits.length} sessions matching "${q}". Showing most recent; see candidates to pick another.\n${summarizeSession(session)}`,
          { session, match: "title_ambiguous", candidates }
        );
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  const playerInput = z.union([
    z.string(),
    z.object({
      id: z.string().optional().nullable(),
      displayName: z.string(),
      userId: z.string().optional().nullable(),
      teamName: z.string().optional().nullable(),
    }),
  ]);

  server.registerTool(
    "tablist_create_session",
    {
      description:
        "Create a planned game session for one gameId, optionally with roster/teams.",
      inputSchema: {
        gameId: z.string().min(1),
        title: z.string().optional(),
        sessionDate: z.string().optional(),
        location: z.string().optional(),
        notes: z.string().optional(),
        scoringMode: z.enum(["individual", "team"]).optional(),
        players: z.array(playerInput).optional(),
        teams: z.array(z.string()).optional(),
      },
    },
    async (args) => {
      try {
        const data = await api.request<Record<string, unknown>>("POST", "/api/sessions", {
          body: {
            gameId: args.gameId,
            title: args.title,
            sessionDate: args.sessionDate,
            location: args.location,
            notes: args.notes,
            scoringMode: args.scoringMode,
            players: args.players,
            teams: args.teams,
          },
        });
        const session = data.session as { id?: string; title?: string } | undefined;
        return textResult(
          `Created session ${session?.title ?? ""} (${session?.id ?? "?"}).`,
          data
        );
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  server.registerTool(
    "tablist_update_session",
    {
      description:
        "Update session metadata, roster, and/or scores (host only). Prefer tablist_set_session_roster for roster-only changes.",
      inputSchema: {
        sessionId: z.string().min(1),
        title: z.string().optional(),
        status: z
          .enum(["planned", "in_progress", "completed", "cancelled"])
          .optional(),
        notes: z.string().nullable().optional(),
        location: z.string().nullable().optional(),
        sessionDate: z.string().optional(),
        scoringMode: z.enum(["individual", "team"]).optional(),
        players: z.array(playerInput).optional(),
        teams: z.array(z.string()).optional(),
        scores: z
          .array(
            z.object({
              playerId: z.string().nullable().optional(),
              teamId: z.string().nullable().optional(),
              gameId: z.string(),
              score: z.number().nullable(),
              isWinner: z.boolean().optional(),
              notes: z.string().nullable().optional(),
            })
          )
          .optional(),
      },
    },
    async (args) => {
      try {
        const data = await api.request<Record<string, unknown>>("PATCH", "/api/sessions", {
          body: {
            sessionId: args.sessionId,
            title: args.title,
            status: args.status,
            notes: args.notes,
            location: args.location,
            sessionDate: args.sessionDate,
            scoringMode: args.scoringMode,
            players: args.players,
            teams: args.teams,
            scores: args.scores,
          },
        });
        return textResult("Session updated.", data);
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  server.registerTool(
    "tablist_set_session_roster",
    {
      description: "Replace session roster / scoring mode / teams (host only).",
      inputSchema: {
        sessionId: z.string().min(1),
        players: z.array(playerInput).min(1),
        scoringMode: z.enum(["individual", "team"]).optional(),
        teams: z.array(z.string()).optional(),
      },
    },
    async (args) => {
      try {
        const data = await api.request<Record<string, unknown>>("PATCH", "/api/sessions", {
          body: {
            sessionId: args.sessionId,
            players: args.players,
            scoringMode: args.scoringMode,
            teams: args.teams,
          },
        });
        return textResult("Roster updated.", data);
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  server.registerTool(
    "tablist_delete_session",
    {
      description: "Delete a session (host only).",
      inputSchema: {
        sessionId: z.string().min(1),
      },
    },
    async (args) => {
      try {
        const data = await api.request<Record<string, unknown>>("DELETE", "/api/sessions", {
          query: { id: args.sessionId },
        });
        return textResult("Session deleted.", data);
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  registerAppTool(
    server,
    "tablist_pick_first_player",
    {
      title: "Pick first player",
      description:
        "Uniform random first-player pick from the session roster. Returns structuredContent.ui.kind = tablist.first_player_reel. MCP Apps hosts render ui://tablist/first-player-reel as a sandboxed iframe reel (same pattern as random game). Hosts without MCP Apps: paste presentationMarkdown / highlight the winner. Result is ephemeral (persisted: false). Do not re-roll locally; call again with excludePlayerIds.",
      inputSchema: {
        sessionId: z.string().min(1),
        excludePlayerIds: z.array(z.string()).optional(),
      },
      _meta: {
        ui: { resourceUri: FIRST_PLAYER_UI_URI },
      },
    },
    async (args) => {
      try {
        const data = await api.request<{
          player: Record<string, unknown>;
          poolSize: number;
          persisted: false;
          text?: string;
          presentationMarkdown?: string;
          ui?: Record<string, unknown>;
        }>("POST", "/api/sessions/first-player", {
          body: {
            sessionId: args.sessionId,
            excludePlayerIds: args.excludePlayerIds,
          },
        });
        const presentation =
          typeof data.presentationMarkdown === "string" &&
          data.presentationMarkdown.trim()
            ? data.presentationMarkdown
            : data.text ??
              `First player: ${data.player.displayName} (not persisted).`;
        return textResult(presentation, data);
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  server.registerResource(
    "tablist-me",
    "tablist://me",
    {
      description: "Profile + collectionId for the authenticated user",
      mimeType: "application/json",
    },
    async () => {
      const me = await api.request("GET", "/api/me");
      return {
        contents: [
          {
            uri: "tablist://me",
            mimeType: "application/json",
            text: JSON.stringify(me, null, 2),
          },
        ],
      };
    }
  );

  server.registerResource(
    "tablist-collection",
    "tablist://collection",
    {
      description: "Compact owned-game index",
      mimeType: "application/json",
    },
    async () => {
      const data = await api.request<{ games: Record<string, unknown>[] }>(
        "GET",
        "/api/collection",
        { query: { wishlist: "exclude", limit: 500 } }
      );
      const compact = (data.games ?? []).map((g) => ({
        id: g.id,
        name: g.name,
        minPlayers: g.min_players,
        maxPlayers: g.max_players,
        playingTime: g.playing_time,
      }));
      return {
        contents: [
          {
            uri: "tablist://collection",
            mimeType: "application/json",
            text: JSON.stringify(compact, null, 2),
          },
        ],
      };
    }
  );

  server.registerResource(
    "tablist-sessions-recent",
    "tablist://sessions/recent",
    {
      description: "Recent sessions summary",
      mimeType: "application/json",
    },
    async () => {
      const data = await api.request<{ sessions: Record<string, unknown>[] }>(
        "GET",
        "/api/sessions",
        { query: { limit: 20 } }
      );
      const sessions = (data.sessions ?? []).map(serializeSessionListItem);
      return {
        contents: [
          {
            uri: "tablist://sessions/recent",
            mimeType: "application/json",
            text: JSON.stringify(sessions, null, 2),
          },
        ],
      };
    }
  );

  server.registerResource(
    "tablist-docs-filters",
    "tablist://docs/filters",
    {
      description: "Filter semantics matching the web UI",
      mimeType: "text/markdown",
    },
    async () => ({
      contents: [
        {
          uri: "tablist://docs/filters",
          mimeType: "text/markdown",
          text: FILTER_DOCS,
        },
      ],
    })
  );

  server.registerResource(
    "tablist-docs-mcp-setup",
    "tablist://docs/mcp-setup",
    {
      description: "Connect Tablist MCP instructions",
      mimeType: "text/markdown",
    },
    async () => ({
      contents: [
        {
          uri: "tablist://docs/mcp-setup",
          mimeType: "text/markdown",
          text: buildConnectInstructions(appOrigin),
        },
      ],
    })
  );

  server.registerPrompt(
    "connect_tablist_mcp",
    {
      description: "Full wire-up instructions so an LLM can configure Tablist MCP alone",
      argsSchema: {
        client: z
          .enum(["claude_ai", "cursor", "claude_desktop", "other"])
          .optional(),
      },
    },
    async () => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: buildConnectInstructions(appOrigin),
          },
        },
      ],
    })
  );

  server.registerPrompt(
    "plan_game_night",
    {
      description:
        "Filter collection → pick random game → create planned session → optionally pick first player after roster",
      argsSchema: {
        playerCount: z.string(),
        maxMinutes: z.string().optional(),
        moodCategories: z.string().optional(),
      },
    },
    async (args) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Plan a Tablist game night for ${args.playerCount} players${
              args.maxMinutes ? ` under ${args.maxMinutes} minutes` : ""
            }${args.moodCategories ? ` (mood/categories: ${args.moodCategories})` : ""}.
Use tablist_list_collection / tablist_pick_random_game with matching filters, then tablist_create_session with guest names if needed, then tablist_pick_first_player after the roster is set. Prefer tools over guessing.`,
          },
        },
      ],
    })
  );

  server.registerPrompt(
    "add_game_from_name",
    {
      description: "Search BGG by name, confirm top hit, add to collection",
      argsSchema: {
        name: z.string(),
      },
    },
    async (args) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Add the board game named "${args.name}" to my Tablist collection. Use tablist_search_games, confirm the best match with me if ambiguous, then tablist_add_game.`,
          },
        },
      ],
    })
  );

  server.registerPrompt(
    "wrap_up_session",
    {
      description: "Fetch session, collect scores/winners, mark completed",
      argsSchema: {
        sessionId: z.string(),
      },
    },
    async (args) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Wrap up Tablist session ${args.sessionId}: call tablist_get_session, ask for scores/winners if missing, then tablist_update_session with scores and status completed.`,
          },
        },
      ],
    })
  );

  registerAppResource(
    server,
    "Random game reel",
    RANDOM_GAME_UI_URI,
    {
      description:
        "MCP App slot-reel UI for tablist_pick_random_game (sandboxed HTML iframe)",
    },
    async () => ({
      contents: [
        {
          uri: RANDOM_GAME_UI_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: buildRandomGameAppHtml(),
          _meta: {
            ui: {
              // Claude extension: open in side panel when available.
              preferredDisplayMode: "fullscreen",
              csp: {
                resourceDomains: [...MCP_APP_RESOURCE_DOMAINS],
              },
            },
          },
        },
      ],
    })
  );

  registerAppResource(
    server,
    "First player reel",
    FIRST_PLAYER_UI_URI,
    {
      description:
        "MCP App slot-reel UI for tablist_pick_first_player (sandboxed HTML iframe)",
    },
    async () => ({
      contents: [
        {
          uri: FIRST_PLAYER_UI_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: buildFirstPlayerAppHtml(),
          _meta: {
            ui: {
              preferredDisplayMode: "fullscreen",
              csp: {
                resourceDomains: [...MCP_APP_RESOURCE_DOMAINS],
              },
            },
          },
        },
      ],
    })
  );

  return server;
}
