import { RANDOM_GAME_SPIN_MS } from "@/lib/collection/reel";

export const runtime = "nodejs";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Lightweight animated SVG stand-in for the in-app random reel.
 * Claude.ai / markdown hosts can embed this image URL; it is not identical
 * to RandomGamePickerModal but conveys a spin → settle on the winner.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const winner = (url.searchParams.get("w") || "Winner").slice(0, 80);
  const namesParam = url.searchParams.get("n") || winner;
  const msRaw = Number(url.searchParams.get("ms") ?? RANDOM_GAME_SPIN_MS);
  const spinMs =
    Number.isFinite(msRaw) && msRaw >= 800 && msRaw <= 8000
      ? Math.floor(msRaw)
      : RANDOM_GAME_SPIN_MS;

  let names = namesParam
    .split("|")
    .map((n) => n.trim())
    .filter(Boolean)
    .slice(0, 14);
  if (names.length === 0) names = [winner];
  if (names[names.length - 1] !== winner) names = [...names, winner];

  const rowH = 36;
  const viewH = 160;
  const viewW = 420;
  const totalH = names.length * rowH;
  const finalY = -(totalH - viewH);

  const rows = names
    .map((name, i) => {
      const y = i * rowH + 26;
      const isWinner = i === names.length - 1;
      return `<text x="24" y="${y}" font-family="system-ui,Segoe UI,sans-serif" font-size="${
        isWinner ? 18 : 15
      }" font-weight="${isWinner ? 700 : 500}" fill="${
        isWinner ? "#1a1a1a" : "#4a5568"
      }">${escapeXml(name.slice(0, 42))}</text>`;
    })
    .join("");

  const duration = (spinMs / 1000).toFixed(2);

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${viewW}" height="${viewH}" viewBox="0 0 ${viewW} ${viewH}" role="img" aria-label="Tablist random game reel settling on ${escapeXml(winner)}">
  <defs>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f7f3ea" stop-opacity="1"/>
      <stop offset="18%" stop-color="#f7f3ea" stop-opacity="0"/>
      <stop offset="82%" stop-color="#f7f3ea" stop-opacity="0"/>
      <stop offset="100%" stop-color="#f7f3ea" stop-opacity="1"/>
    </linearGradient>
    <clipPath id="window">
      <rect x="0" y="0" width="${viewW}" height="${viewH}" rx="16"/>
    </clipPath>
  </defs>
  <rect width="${viewW}" height="${viewH}" rx="16" fill="#f7f3ea" stroke="#d4c4a8" stroke-width="2"/>
  <g clip-path="url(#window)">
    <g>
      <animateTransform attributeName="transform" type="translate" values="0 0; 0 ${finalY}" keyTimes="0;1" calcMode="spline" keySplines="0.12 0.7 0.1 1" dur="${duration}s" fill="freeze"/>
      ${rows}
    </g>
    <rect width="${viewW}" height="${viewH}" fill="url(#fade)" pointer-events="none"/>
    <rect x="8" y="${viewH / 2 - 20}" width="${viewW - 16}" height="40" rx="8" fill="none" stroke="#c45c26" stroke-width="2.5" opacity="0.85"/>
  </g>
  <text x="16" y="18" font-family="system-ui,Segoe UI,sans-serif" font-size="11" fill="#8a7a62">Tablist · random pick</text>
</svg>`;

  return new Response(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
