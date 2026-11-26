import { EXT_APPS_CDN } from "./constants.js";

/**
 * MCP App HTML for tablist_pick_first_player — roster reel close to FirstPlayerPickerModal.
 */
export function buildFirstPlayerAppHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>Tablist · First player</title>
  <style>
    :root {
      --primary: #012d1d;
      --on-primary: #ffffff;
      --primary-container: #1b4332;
      --on-primary-container: #86af99;
      --surface: #f5f3ee;
      --surface-low: #ebe8e1;
      --surface-high: #eae8e3;
      --on-surface: #1b1c19;
      --on-variant: #414844;
      --outline: rgba(113, 121, 115, 0.2);
      --item-h: 112px;
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
    body { display: flex; flex-direction: column; overflow: hidden; }
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
    .reel { will-change: transform; }
    .item {
      display: flex;
      align-items: center;
      gap: 1rem;
      height: var(--item-h);
      padding: 0 1rem;
    }
    .avatar {
      width: 4rem;
      height: 4rem;
      border-radius: 999px;
      object-fit: cover;
      flex-shrink: 0;
      background: var(--primary-container);
      color: var(--on-primary-container);
      display: grid;
      place-items: center;
      font-size: 1.05rem;
      font-weight: 700;
    }
    .name {
      margin: 0;
      font-size: 1.2rem;
      font-weight: 650;
      color: var(--primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
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
      font-size: 0.875rem;
      color: var(--on-variant);
    }
    .status strong { color: var(--primary); }
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
    .btn.primary {
      background: var(--primary);
      color: var(--on-primary);
    }
    .waiting {
      padding: 2rem 1.25rem;
      text-align: center;
      color: var(--on-variant);
    }
    .note {
      margin: 0;
      padding: 0 1rem 0.75rem;
      font-size: 0.75rem;
      color: var(--on-variant);
    }
  </style>
</head>
<body>
  <div class="panel" id="root">
    <div class="waiting" id="waiting">Waiting for a first-player pick…</div>
  </div>
  <script type="module">
    import { App } from "${EXT_APPS_CDN}";

    const ITEM_H = 112;
    const DEFAULT_SPIN_MS = 3400;
    const $ = (id) => document.getElementById(id);

    const app = new App(
      { name: "Tablist First Player Reel", version: "1.0.0" },
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

    function initials(name) {
      return String(name || "?").slice(0, 2).toUpperCase();
    }

    function layOut() {
      const ctx = app.getHostContext?.() ?? null;
      const canExpand =
        ctx?.availableDisplayModes?.includes("fullscreen") ?? false;
      const expand = $("expand");
      if (expand) {
        expand.hidden = !canExpand || ctx?.displayMode === "fullscreen";
      }
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
      const player = sc?.player ?? {};
      const winnerName =
        player.displayName || reel[chosenIndex]?.name || "Player";
      const poolSize = sc?.poolSize ?? reel.length;

      document.documentElement.style.setProperty("--item-h", itemH + "px");
      document.documentElement.style.setProperty("--spin-ms", spinMs + "ms");

      const itemsHtml = (reel.length ? reel : [{ name: winnerName }])
        .map((item, i) => {
          const name = item.name || item.displayName || "Player";
          return (
            '<div class="item"><div class="avatar">' +
            esc(initials(name)) +
            '</div><p class="name">' +
            esc(name) +
            "</p></div>"
          );
        })
        .join("");

      $("root").innerHTML =
        '<div class="header">' +
          '<div><div class="brand">Tablist</div>' +
          '<h1 id="title">Picking who goes first…</h1></div>' +
          '<button type="button" class="expand" id="expand" hidden>Expand</button>' +
        "</div>" +
        '<div class="window" aria-live="polite"><div class="reel" id="reel">' +
          itemsHtml +
        "</div></div>" +
        '<div class="footer" id="footer">' +
          '<p class="status" id="status">Spinning through the roster (' +
          esc(String(poolSize)) +
          ")…</p>" +
        "</div>" +
        '<p class="note">Not saved in Tablist — first player is ephemeral.</p>';

      $("expand")?.addEventListener("click", async () => {
        await app.requestDisplayMode({ mode: "fullscreen" });
        layOut();
      });
      layOut();

      const reelEl = $("reel");
      const reduced =
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const targetY = -(chosenIndex * itemH);

      const finish = () => {
        spinning = false;
        const title = $("title");
        if (title) title.textContent = "First player";
        const footer = $("footer");
        if (footer) {
          footer.innerHTML =
            '<p class="status"><strong>' +
            esc(winnerName) +
            "</strong> goes first</p>" +
            '<button type="button" class="btn" id="reroll">Re-roll</button>' +
            '<button type="button" class="btn primary" id="done">Done</button>';
          $("reroll")?.addEventListener("click", async () => {
            if (spinning) return;
            const exclude = [];
            if (player?.id) exclude.push(String(player.id));
            const args = {
              ...lastArgs,
              sessionId: lastArgs.sessionId,
              excludePlayerIds: exclude,
            };
            lastArgs = args;
            const result = await app.callServerTool({
              name: "tablist_pick_first_player",
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
