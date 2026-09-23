import Link from "next/link";

export const dynamic = "force-static";

export default function OfflineFallbackPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <h1 className="font-[family-name:var(--font-brand)] text-4xl text-primary">
        Tablist
      </h1>
      <p className="mt-4 max-w-sm text-on-surface-variant">
        You&apos;re offline. Open a page you&apos;ve visited while online — your
        collection and sessions are cached on this device.
      </p>
      <Link
        href="/collection"
        className="mt-8 rounded-lg bg-primary px-5 py-3 text-sm font-bold text-on-primary"
      >
        Try collection
      </Link>
    </main>
  );
}
