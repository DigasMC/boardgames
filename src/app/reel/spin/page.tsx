import type { Metadata } from "next";
import { ReelSpinClient } from "./ReelSpinClient";

export const metadata: Metadata = {
  title: "Tablist · Random pick reel",
  description: "Animated random game reel for chat hosts that open a link.",
  robots: { index: false, follow: false },
};

type CompactPayload = {
  r?: Array<{ n?: string; t?: string | null }>;
  c?: number;
  ms?: number;
};

function decodePayload(raw: string | undefined): CompactPayload | null {
  if (!raw) return null;
  try {
    const json = Buffer.from(raw, "base64url").toString("utf8");
    return JSON.parse(json) as CompactPayload;
  } catch {
    return null;
  }
}

export default async function ReelSpinPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}) {
  const params = await searchParams;
  const payload = decodePayload(params.p);
  const reel = (payload?.r ?? [])
    .filter((item) => item && typeof item.n === "string")
    .map((item) => ({
      name: String(item.n),
      thumbnailUrl: item.t ?? null,
    }));
  const chosenIndex =
    typeof payload?.c === "number" && payload.c >= 0
      ? Math.min(payload.c, Math.max(0, reel.length - 1))
      : Math.max(0, reel.length - 1);
  const spinMs =
    typeof payload?.ms === "number" && payload.ms >= 800 && payload.ms <= 8000
      ? payload.ms
      : 3400;

  if (reel.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f3ea] p-6 text-center text-[#4a5568]">
        <p>Missing or invalid reel payload. Run tablist_pick_random_game again.</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#f7f3ea] p-6">
      <p className="mb-4 text-3xl font-bold text-[#1a1a1a]">Tablist</p>
      <ReelSpinClient reel={reel} chosenIndex={chosenIndex} spinMs={spinMs} />
    </main>
  );
}
