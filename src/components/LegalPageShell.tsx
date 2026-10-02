import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/SiteFooter";

type LegalPageShellProps = {
  title: string;
  lastUpdated: string;
  children: ReactNode;
};

export function LegalPageShell({
  title,
  lastUpdated,
  children,
}: LegalPageShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-on-surface">
      <header className="sticky top-0 z-50 border-b border-outline-variant/10 bg-background/95 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-[family-name:var(--font-brand)] text-xl tracking-tight text-primary transition-transform active:scale-95 sm:text-2xl"
          >
            <Image
              src="/tablist.png"
              alt=""
              width={44}
              height={44}
              className="aspect-square size-11 shrink-0 object-contain"
              priority
            />
            Tablist
          </Link>
          <Link
            href="/"
            className="text-sm font-semibold text-on-surface-variant transition-colors hover:text-primary"
          >
            Home
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="font-[family-name:var(--font-headline)] text-3xl font-semibold tracking-tight text-primary sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 text-sm text-on-surface-variant">
          Last updated: {lastUpdated}
        </p>
        <div className="legal-prose mt-10 space-y-8 text-base leading-relaxed text-on-surface">
          {children}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-[family-name:var(--font-headline)] text-xl font-semibold text-primary">
        {title}
      </h2>
      {children}
    </section>
  );
}
