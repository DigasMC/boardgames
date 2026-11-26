import type { ReelItem } from "@/lib/collection/reel";
import {
  RANDOM_GAME_ITEM_HEIGHT,
  RANDOM_GAME_SPIN_MS,
} from "@/lib/collection/reel";

/** How many intermediate cover frames to include in chat markdown (plus winner). */
export const RANDOM_GAME_CHAT_FRAME_COUNT = 6;

export type RandomGamePresentationMode = "auto" | "structured" | "media" | "text";

export type RandomGameUiPayload = {
  kind: "tablist.random_game_reel";
  version: 1;
  spinMs: number;
  itemHeight: number;
  reel: ReelItem[];
  chosenIndex: number;
  deepLink: string;
  /** Hosted SVG spin (names + settle) — embeddable where hosts render image URLs. */
  animationUrl: string;
  /** Richer HTML/CSS reel page (covers) when payload fits in the URL. */
  animationPageUrl: string | null;
  /** Instructions for chat hosts / models that cannot run React. */
  hostHints: {
    canForceReactReel: false;
    preferredChatBehavior: string;
    claudeAi: string;
    cursor: string;
  };
};

export function pickChatFrames(
  reel: ReelItem[],
  frameCount: number = RANDOM_GAME_CHAT_FRAME_COUNT
): ReelItem[] {
  if (reel.length === 0) return [];
  if (reel.length <= frameCount) return reel;
  const winner = reel[reel.length - 1]!;
  const step = Math.max(1, Math.floor((reel.length - 1) / (frameCount - 1)));
  const frames: ReelItem[] = [];
  for (let i = 0; i < reel.length - 1 && frames.length < frameCount - 1; i += step) {
    frames.push(reel[i]!);
  }
  frames.push(winner);
  return frames;
}

export function buildRandomGamePresentationMarkdown(options: {
  gameName: string;
  poolSize: number;
  coverUrl: string | null;
  frames: ReelItem[];
  deepLink: string;
  animationUrl: string;
  animationPageUrl: string | null;
}): string {
  const {
    gameName,
    poolSize,
    coverUrl,
    frames,
    deepLink,
    animationUrl,
    animationPageUrl,
  } = options;

  const lines: string[] = [
    `🎰 **Tablist random pick** — spinning ${poolSize} matching game${poolSize === 1 ? "" : "s"}…`,
    "",
    "_Chat hosts cannot run the in-app React reel. Show the frames below in order (or open the animated reel link), then reveal the winner._",
    "",
  ];

  const intermediates = frames.slice(0, -1);
  for (let i = 0; i < intermediates.length; i++) {
    const item = intermediates[i]!;
    const thumb = item.thumbnailUrl;
    lines.push(`**${i + 1}.** ${item.name}`);
    if (thumb) {
      lines.push(`![${item.name}](${thumb})`);
    }
    lines.push("");
  }

  lines.push(`### 🎯 Winner: **${gameName}**`);
  lines.push("");
  if (coverUrl) {
    lines.push(`![${gameName}](${coverUrl})`);
    lines.push("");
  }
  lines.push(`Animated reel (SVG): ${animationUrl}`);
  if (animationPageUrl) {
    lines.push(`Animated reel (covers): ${animationPageUrl}`);
  }
  lines.push(`Open in Tablist: ${deepLink}`);
  return lines.join("\n");
}

export function buildSpinSvgUrl(
  origin: string,
  options: {
    winnerName: string;
    winnerThumbnailUrl?: string | null;
    reelNames: string[];
    spinMs?: number;
  }
): string {
  const url = new URL("/api/collection/random/spin", origin);
  url.searchParams.set("w", options.winnerName.slice(0, 80));
  if (options.winnerThumbnailUrl) {
    url.searchParams.set("i", options.winnerThumbnailUrl);
  }
  // Cap names for URL size; keep order so the last is the winner.
  const names = options.reelNames
    .slice(-12)
    .map((n) => n.replace(/[|]/g, "/").slice(0, 40));
  url.searchParams.set("n", names.join("|"));
  url.searchParams.set(
    "ms",
    String(options.spinMs ?? RANDOM_GAME_SPIN_MS)
  );
  return url.toString();
}

export function buildSpinPageUrl(
  origin: string,
  options: {
    reel: ReelItem[];
    chosenIndex: number;
    spinMs?: number;
  }
): string | null {
  const compact = {
    r: options.reel.slice(-14).map((item) => ({
      n: item.name.slice(0, 48),
      t: item.thumbnailUrl ?? null,
    })),
    c: Math.min(options.chosenIndex, 13),
    ms: options.spinMs ?? RANDOM_GAME_SPIN_MS,
  };
  const encoded = Buffer.from(JSON.stringify(compact), "utf8").toString(
    "base64url"
  );
  // Keep well under typical ~2k–8k URL limits for chat embeds.
  if (encoded.length > 1800) return null;
  const url = new URL("/reel/spin", origin);
  url.searchParams.set("p", encoded);
  return url.toString();
}

export function buildRandomGameUi(options: {
  origin: string;
  reel: ReelItem[];
  chosenIndex: number;
  deepLinkPath?: string;
}): RandomGameUiPayload {
  const origin = options.origin.replace(/\/$/, "");
  const winner = options.reel[options.chosenIndex] ?? options.reel.at(-1);
  const animationUrl = buildSpinSvgUrl(origin, {
    winnerName: winner?.name ?? "Winner",
    winnerThumbnailUrl: winner?.thumbnailUrl,
    reelNames: options.reel.map((r) => r.name),
  });
  const animationPageUrl = buildSpinPageUrl(origin, {
    reel: options.reel,
    chosenIndex: options.chosenIndex,
  });

  return {
    kind: "tablist.random_game_reel",
    version: 1,
    spinMs: RANDOM_GAME_SPIN_MS,
    itemHeight: RANDOM_GAME_ITEM_HEIGHT,
    reel: options.reel,
    chosenIndex: options.chosenIndex,
    deepLink: `${origin}${options.deepLinkPath ?? "/collection?random=1"}`,
    animationUrl,
    animationPageUrl,
    hostHints: {
      canForceReactReel: false,
      preferredChatBehavior:
        "Render presentationMarkdown (or frames) in order, embed animationUrl if the host shows images, then highlight the winner cover. Do not re-roll locally.",
      claudeAi:
        "Claude.ai shows tool text/markdown and image URLs — not arbitrary React. Prefer the markdown frame sequence + SVG animationUrl; open animationPageUrl when present.",
      cursor:
        "Cursor cannot inject the Tablist React modal into chat. Use structured ui / Canvas if available; otherwise markdown + animation links; deepLink opens the real app reel.",
    },
  };
}
