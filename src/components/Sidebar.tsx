"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const nav = [
  { href: "/collection", label: "My Collection", icon: "library_books" },
  { href: "/sessions", label: "Recent Sessions", icon: "history" },
  { href: "/picker", label: "Game Picker", icon: "casino" },
  { href: "/games/add", label: "Add New Game", icon: "add_circle" },
];

function isNavActive(pathname: string, href: string) {
  if (href === "/collection") {
    return (
      pathname === "/collection" ||
      (pathname.startsWith("/games/") && pathname !== "/games/add")
    );
  }
  if (href === "/games/add") {
    return pathname === "/games/add";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <>
      <nav className="fixed left-0 top-0 z-50 hidden h-screen w-64 flex-col gap-2 border-r border-outline-variant/20 bg-surface-container-low p-6 shadow-md md:flex">
        <div className="mb-8">
          <h1 className="font-[family-name:var(--font-headline)] text-2xl font-bold text-primary">
            Vault &amp; Board
          </h1>
          <p className="mt-1 text-xs font-medium tracking-wide text-on-surface-variant">
            Game Night Ready
          </p>
        </div>

        <div className="flex flex-1 flex-col gap-2">
          {nav.map((item) => {
            const active = isNavActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold tracking-wide transition-all ${
                  active
                    ? "bg-primary-container text-on-primary-container"
                    : "text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                <span
                  className={`material-symbols-outlined ${active ? "filled" : ""}`}
                >
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="mt-auto flex flex-col gap-2">
          <Link
            href="/games/add"
            className="w-full rounded-lg bg-primary px-4 py-3 text-center text-sm font-bold tracking-wide text-on-primary shadow-sm transition-colors hover:bg-primary-container hover:text-on-primary-container"
          >
            Add New Game
          </Link>
          <Link
            href="/sessions/new"
            className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold tracking-wide text-on-surface-variant transition-all hover:bg-surface-container-high"
          >
            <span className="material-symbols-outlined">event</span>
            New Session
          </Link>
          <button
            type="button"
            onClick={signOut}
            className="flex items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-semibold tracking-wide text-on-surface-variant transition-all hover:bg-surface-container-high"
          >
            <span className="material-symbols-outlined">logout</span>
            Sign out
          </button>
        </div>
      </nav>

      <header className="fixed top-0 z-50 w-full border-b border-outline-variant/10 bg-background shadow-sm md:hidden">
        <div className="mx-auto flex w-full items-center justify-between px-4 py-4">
          <h1 className="font-[family-name:var(--font-headline)] text-xl font-bold text-primary">
            Vault &amp; Board
          </h1>
          <Link
            href="/games/add"
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-on-primary"
          >
            Add
          </Link>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2">
          {nav.map((item) => {
            const active = isNavActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold ${
                  active
                    ? "bg-primary-container text-on-primary-container"
                    : "text-on-surface-variant"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
    </>
  );
}
