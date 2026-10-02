import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { CacheFirst, ExpirationPlugin, NetworkFirst, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

/** Minimal Edge PWA Widgets API typings (Windows 11 Widgets Board). */
type WidgetDefinition = {
  tag: string;
  msAcTemplate?: string;
  data?: string;
  update?: number;
};

type WidgetInstance = {
  definition: WidgetDefinition;
  instances: unknown[];
};

type WidgetContentOptions = {
  template: string;
  data: string;
};

type WidgetsAPI = {
  getByTag(tag: string): Promise<WidgetInstance | undefined>;
  updateByTag(tag: string, content: WidgetContentOptions): Promise<void>;
};

type WidgetLifecycleEvent = Event & {
  widget: WidgetInstance;
  waitUntil(promise: Promise<unknown>): void;
};

type WidgetClickEvent = Event & {
  action: string;
  widget: WidgetInstance;
  waitUntil(promise: Promise<unknown>): void;
};

type PeriodicSyncEvent = Event & {
  tag: string;
  waitUntil(promise: Promise<unknown>): void;
};

type PeriodicSyncManager = {
  getTags(): Promise<string[]>;
  register(tag: string, options: { minInterval: number }): Promise<void>;
  unregister(tag: string): Promise<void>;
};

type ServiceWorkerGlobalScopeWithWidgets = ServiceWorkerGlobalScope & {
  widgets?: WidgetsAPI;
  registration: ServiceWorkerRegistration & {
    periodicSync?: PeriodicSyncManager;
  };
};

declare const self: ServiceWorkerGlobalScopeWithWidgets;

type CollectionGameRow = {
  id: string;
  name: string;
  image_url?: string | null;
  thumbnail_url?: string | null;
  is_wishlist?: boolean;
};

const RANDOM_WIDGET_TAG = "random-game";

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ url, sameOrigin }) =>
        sameOrigin &&
        (url.pathname === "/api/collection" ||
          url.pathname.startsWith("/api/sessions")),
      handler: new NetworkFirst({
        cacheName: "tablist-api",
        networkTimeoutSeconds: 8,
        plugins: [
          new ExpirationPlugin({
            maxEntries: 64,
            maxAgeSeconds: 7 * 24 * 60 * 60,
          }),
        ],
      }),
    },
    {
      matcher: ({ url }) =>
        url.hostname === "cf.geekdo-images.com" ||
        url.hostname === "boardgamegeek.com",
      handler: new CacheFirst({
        cacheName: "bgg-images",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 500,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          }),
        ],
      }),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();

function originBase(): string {
  try {
    return new URL(self.registration.scope).origin;
  } catch {
    return self.location.origin;
  }
}

function absoluteUrl(path: string): string {
  return new URL(path, originBase()).href;
}

function defaultWidgetData() {
  return {
    title: "Tap Pick a game",
    subtitle: "Spin a random title from your collection",
    image: "",
    hasImage: false,
    hasGame: false,
    gameUrl: absoluteUrl("/collection"),
    sessionUrl: absoluteUrl("/sessions/new"),
    collectionUrl: absoluteUrl("/collection"),
    newSessionUrl: absoluteUrl("/sessions/new"),
  };
}

async function fetchOwnedGames(): Promise<CollectionGameRow[] | null> {
  try {
    const response = await fetch("/api/collection", {
      credentials: "include",
    });
    if (response.status === 401) return null;
    if (!response.ok) return [];
    const payload = (await response.json()) as { games?: CollectionGameRow[] };
    const games = payload.games ?? [];
    return games.filter((game) => !game.is_wishlist);
  } catch {
    return [];
  }
}

function pickRandomGame(games: CollectionGameRow[]): CollectionGameRow | null {
  if (games.length === 0) return null;
  return games[Math.floor(Math.random() * games.length)] ?? null;
}

function dataForGame(game: CollectionGameRow | null, emptyMessage?: string) {
  const base = defaultWidgetData();
  if (!game) {
    return {
      ...base,
      title: emptyMessage ?? "No games yet",
      subtitle: emptyMessage
        ? "Open Tablist to sync your collection"
        : "Add games in Tablist, then pick again",
    };
  }

  const image = game.image_url || game.thumbnail_url || "";
  return {
    ...base,
    title: game.name,
    subtitle: "Tonight's pick from your collection",
    image,
    hasImage: Boolean(image),
    hasGame: true,
    gameUrl: absoluteUrl(`/games/${game.id}`),
    sessionUrl: absoluteUrl(
      `/sessions/new?gameId=${encodeURIComponent(game.id)}&title=${encodeURIComponent(game.name)}`
    ),
  };
}

async function renderRandomWidget(
  widget: WidgetInstance,
  options?: { pick?: boolean }
) {
  if (!self.widgets) return;

  const templateUrl =
    widget.definition.msAcTemplate ?? "/widgets/random-game-template.json";
  const template = await (await fetch(templateUrl)).text();

  let dataPayload = defaultWidgetData();

  if (options?.pick) {
    const games = await fetchOwnedGames();
    if (games === null) {
      dataPayload = dataForGame(null, "Sign in to Tablist");
    } else {
      dataPayload = dataForGame(pickRandomGame(games));
    }
  } else {
    const dataUrl =
      widget.definition.data ?? "/widgets/random-game-data.json";
    try {
      const seed = await (await fetch(dataUrl)).json();
      dataPayload = {
        ...defaultWidgetData(),
        ...seed,
        collectionUrl: absoluteUrl("/collection"),
        newSessionUrl: absoluteUrl("/sessions/new"),
        gameUrl: absoluteUrl(
          typeof seed.gameUrl === "string" ? seed.gameUrl : "/collection"
        ),
        sessionUrl: absoluteUrl(
          typeof seed.sessionUrl === "string"
            ? seed.sessionUrl
            : "/sessions/new"
        ),
      };
    } catch {
      dataPayload = defaultWidgetData();
    }
  }

  await self.widgets.updateByTag(widget.definition.tag, {
    template,
    data: JSON.stringify(dataPayload),
  });
}

async function onWidgetInstall(widget: WidgetInstance) {
  const periodicSync = self.registration.periodicSync;
  if (periodicSync && typeof widget.definition.update === "number") {
    try {
      const tags = await periodicSync.getTags();
      if (!tags.includes(widget.definition.tag)) {
        await periodicSync.register(widget.definition.tag, {
          minInterval: widget.definition.update,
        });
      }
    } catch {
      // Periodic sync is optional; ignore unsupported environments.
    }
  }
  await renderRandomWidget(widget);
}

async function onWidgetUninstall(widget: WidgetInstance) {
  const periodicSync = self.registration.periodicSync;
  if (
    periodicSync &&
    widget.instances.length === 1 &&
    typeof widget.definition.update === "number"
  ) {
    try {
      await periodicSync.unregister(widget.definition.tag);
    } catch {
      // ignore
    }
  }
}

async function refreshInstalledRandomWidget(options?: { pick?: boolean }) {
  if (!self.widgets) return;
  const widget = await self.widgets.getByTag(RANDOM_WIDGET_TAG);
  if (!widget) return;
  await renderRandomWidget(widget, options);
}

self.addEventListener("widgetinstall", ((event: WidgetLifecycleEvent) => {
  event.waitUntil(onWidgetInstall(event.widget));
}) as EventListener);

self.addEventListener("widgetuninstall", ((event: WidgetLifecycleEvent) => {
  event.waitUntil(onWidgetUninstall(event.widget));
}) as EventListener);

self.addEventListener("widgetclick", ((event: WidgetClickEvent) => {
  if (event.action === "pick-random") {
    event.waitUntil(renderRandomWidget(event.widget, { pick: true }));
  }
}) as EventListener);

self.addEventListener("periodicsync", ((event: PeriodicSyncEvent) => {
  if (event.tag !== RANDOM_WIDGET_TAG) return;
  event.waitUntil(refreshInstalledRandomWidget());
}) as EventListener);

self.addEventListener("activate", (event) => {
  event.waitUntil(refreshInstalledRandomWidget());
});
