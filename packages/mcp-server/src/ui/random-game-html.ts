import { EXT_APPS_CDN } from "./constants.js";

/**
 * MCP App HTML for tablist_pick_random_game — slot reel close to RandomGamePickerModal.
 * Hosts that support MCP Apps load this via resources/read (text/html;profile=mcp-app).
 */
export function buildRandomGameAppHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>Tablist · Random pick</title>
  <style>
    :root {
      --primary: #012d1d;
      --on-primary: #ffffff;
      --surface: #f5f3ee;
      --surface-low: #ebe8e1;
      --surface-high: #eae8e3;
      --on-surface: #1b1c19;
      --on-variant: #414844;
      --outline: rgba(113, 121, 115, 0.2);
      --item-h: 152px;
      --spin-ms: 3400ms;
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      min-height: 100%;
      background: var(--surface);
      color: var(--on-surface);
      font: 14px/1.4 "Segoe UI", system-ui, sans-serif;
    }
    body {
      display: flex;
      flex-direction: column;
      padding: 0;
      overflow: hidden;
    }
    .panel {
      display: flex;
      flex-direction: column;
      width: 100%;
      max-width: 28rem;
      margin: 0 auto;
      background: var(--surface);
      border: 1px solid var(--outline);
      border-radius: 1rem;
      overflow: hidden;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.9rem 1.1rem;
      border-bottom: 1px solid var(--outline);
    }
    .brand {
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--on-variant);
    }
    h1 {
      margin: 0.15rem 0 0;
      font-size: 1.05rem;
      font-weight: 650;
      color: var(--primary);
    }
    .expand {
      border: 0;
      background: transparent;
      color: var(--on-variant);
      font-size: 0.8rem;
      font-weight: 650;
      cursor: pointer;
      padding: 0.35rem 0.5rem;
      border-radius: 0.4rem;
    }
    .expand:hover { background: var(--surface-high); }
    .expand[hidden] { display: none; }
    .window {
      position: relative;
      height: var(--item-h);
      overflow: hidden;
      background: var(--surface-low);
    }
    .window::before,
    .window::after {
      content: "";
      position: absolute;
      left: 0; right: 0;
      height: 28px;
      z-index: 2;
      pointer-events: none;
    }
    .window::before {
      top: 0;
      background: linear-gradient(to bottom, var(--surface-low), transparent);
    }
    .window::after {
      bottom: 0;
      background: linear-gradient(to top, var(--surface-low), transparent);
    }
    .reel { will-change: transform; }
    .item {
      display: flex;
      align-items: center;
      gap: 1rem;
      height: var(--item-h);
      padding: 0 0.85rem;
    }
    .cover {
      width: 7rem;
      height: 7rem;
      border-radius: 0.55rem;
      object-fit: cover;
      background: var(--surface-high);
      flex-shrink: 0;
    }
    .cover.ph {
      display: grid;
      place-items: center;
      color: var(--on-variant);
      font-size: 0.75rem;
    }
    .name {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 650;
      color: var(--primary);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .meta {
      margin: 0.45rem 0 0;
      font-size: 0.75rem;
      font-weight: 550;
      color: var(--on-variant);
    }
    .footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.5rem;
      min-height: 3.25rem;
      padding: 0.85rem 1rem;
      border-top: 1px solid var(--outline);
    }
    .status {
      flex: 1;
      margin: 0;
      text-align: center;
      color: var(--on-variant);
      font-size: 0.875rem;
    }
    .btn {
      border: 0;
      border-radius: 0.4rem;
      padding: 0.5rem 0.85rem;
      font-size: 0.85rem;
      font-weight: 700;
      cursor: pointer;
      background: transparent;
      color: var(--on-variant);
    }
    .btn:hover { background: var(--surface-high); }
    .btn:disabled { opacity: 0.45; cursor: default; }
    .btn.primary {
      background: var(--primary);
      color: var(--on-primary);
    }
    .btn.primary:hover { filter: brightness(1.08); }
    .waiting {
      padding: 2rem 1.25rem;
      text-align: center;
      color: var(--on-variant);
    }
    a.link {
      color: inherit;
      text-decoration: none;
    }
    body.compact .cover { width: 5.5rem; height: 5.5rem; }
    body.compact .name { font-size: 0.95rem; }
  </style>
</head>
<body>
  <div class="panel" id="root">
    <div class="waiting" id="waiting">Waiting for a random pick…</div>
  </div>
  <script type="module">
    import { App } from "${EXT_APPS_CDN}";

    const ITEM_H = 152;
    const DEFAULT_SPIN_MS = 3400;
    const $ = (id) => document.getElementById(id);

    const app = new App(
      { name: "Tablist Random Game Reel", version: "1.0.0" },
      { availableDisplayModes: ["inline", "fullscreen"] }
    );

    let lastArgs = {};
    let spinning = false;

    function esc(s) {
      return String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    function playersLabel(game) {
      const min = game?.minPlayers;
      const max = game?.maxPlayers;
      if (min == null && max == null) return "—";
      if (min != null && max != null && min === max) return String(min);
      if (min != null && max != null) return min + "-" + max;
      return String(min ?? max);
    }

    function playtimeLabel(game) {
      const t = game?.playingTime;
      return t != null ? t + "m" : "—";
    }

    function layOut() {
      const ctx = app.getHostContext?.() ?? null;
      const size = ctx?.containerDimensions;
      const canExpand =
        ctx?.availableDisplayModes?.includes("fullscreen") ?? false;
      const expand = $("expand");
      if (expand) {
        expand.hidden = !canExpand || ctx?.displayMode === "fullscreen";
      }
      document.body.classList.toggle(
        "compact",
        !!size && "width" in size && size.width < 420
      );
    }

    function render(sc) {
      const ui = sc?.ui ?? {};
      const reel = Array.isArray(ui.reel) ? ui.reel : [];
      const chosenIndex =
        typeof ui.chosenIndex === "number"
          ? ui.chosenIndex
          : Math.max(0, reel.length - 1);
      const spinMs =
        typeof ui.spinMs === "number" && ui.spinMs >= 800
          ? ui.spinMs
          : DEFAULT_SPIN_MS;
      const itemH =
        typeof ui.itemHeight === "number" && ui.itemHeight > 0
          ? ui.itemHeight
          : ITEM_H;
      const game = sc?.game ?? reel[chosenIndex] ?? {};
      const deepLink = typeof ui.deepLink === "string" ? ui.deepLink : null;
      const poolSize = sc?.poolSize ?? reel.length;

      document.documentElement.style.setProperty("--item-h", itemH + "px");
      document.documentElement.style.setProperty("--spin-ms", spinMs + "ms");

      const itemsHtml = (reel.length ? reel : [{ name: game.name, thumbnailUrl: game.thumbnailUrl || game.imageUrl }])
        .map((item, i) => {
          const thumb = item.thumbnailUrl || item.imageUrl || null;
          const cover = thumb
            ? '<img class="cover" src="' + esc(thumb) + '" alt="" referrerpolicy="no-referrer" />'
            : '<div class="cover ph">No art</div>';
          return (
            '<div class="item" data-i="' + i + '">' +
              cover +
              '<div><p class="name">' + esc(item.name || "Game") + '</p>' +
              (i === chosenIndex
                ? '<p class="meta">' + esc(playersLabel(game)) + " players · " + esc(playtimeLabel(game)) + "</p>"
                : "") +
              "</div></div>"
          );
        })
        .join("");

      $("root").innerHTML =
        '<div class="header">' +
          '<div><div class="brand">Tablist</div>' +
          '<h1 id="title">Picking a game…</h1></div>' +
          '<button type="button" class="expand" id="expand" hidden>Expand</button>' +
        "</div>" +
        '<div class="window" aria-live="polite"><div class="reel" id="reel">' +
          itemsHtml +
        "</div></div>" +
        '<div class="footer" id="footer">' +
          '<p class="status" id="status">Spinning through ' +
          esc(String(poolSize)) +
          " matching game" +
          (poolSize === 1 ? "" : "s") +
          "…</p>" +
        "</div>";

      const expand = $("expand");
      if (expand) {
        expand.addEventListener("click", async () => {
          await app.requestDisplayMode({ mode: "fullscreen" });
          layOut();
        });
      }
      layOut();

      const reelEl = $("reel");
      const reduced =
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const targetY = -(chosenIndex * itemH);

      const finish = () => {
        spinning = false;
        const title = $("title");
        if (title) title.textContent = "Tonight's pick";
        const footer = $("footer");
        if (footer) {
          footer.innerHTML =
            '<button type="button" class="btn" id="reroll">Re-roll</button>' +
            (deepLink
              ? '<a class="btn link" href="' + esc(deepLink) + '" target="_blank" rel="noopener">Open in Tablist</a>'
              : "") +
            '<button type="button" class="btn primary" id="done">Done</button>';
          $("reroll")?.addEventListener("click", async () => {
            if (spinning) return;
            const exclude = [];
            if (game?.id) exclude.push(String(game.id));
            const args = { ...lastArgs, excludeGameIds: exclude };
            lastArgs = args;
            const result = await app.callServerTool({
              name: "tablist_pick_random_game",
              arguments: args,
            });
            show(result);
          });
          $("done")?.addEventListener("click", () => {
            app.requestDisplayMode?.({ mode: "inline" }).catch(() => {});
          });
        }
      };

      spinning = true;
      if (!reelEl || reduced || reel.length <= 1) {
        if (reelEl) reelEl.style.transform = "translateY(" + targetY + "px)";
        finish();
        return;
      }

      const animation = reelEl.animate(
        [
          { transform: "translateY(0)" },
          { transform: "translateY(" + targetY + "px)" },
        ],
        {
          duration: spinMs,
          easing: "cubic-bezier(0.08, 0.7, 0.12, 1)",
          fill: "forwards",
        }
      );
      animation.onfinish = finish;
    }

    function show(result) {
      const sc = result?.structuredContent;
      if (sc?.error) {
        $("root").innerHTML =
          '<div class="waiting">' + esc(sc.error) + "</div>";
        return;
      }
      if (!sc) {
        const text = result?.content?.[0]?.text ?? "No result";
        $("root").innerHTML = '<div class="waiting">' + esc(text) + "</div>";
        return;
      }
      render(sc);
    }

    app.ontoolinput = ({ arguments: args }) => {
      if (args && typeof args === "object") {
        lastArgs = { ...lastArgs, ...args };
      }
    };
    app.ontoolresult = show;
    app.addEventListener?.("hostcontextchanged", layOut);

    await app.connect();
    layOut();
  </script>
</body>
</html>`;
}
