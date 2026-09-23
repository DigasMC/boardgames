"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type ComponentType } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  History,
  Library,
  LogOut,
  Menu,
  User,
  X,
  type LucideProps,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { InstallAppBanner } from "@/components/InstallAppBanner";
import { SyncStatus } from "@/components/SyncStatus";

const nav: {
  href: string;
  label: string;
  icon: ComponentType<LucideProps>;
}[] = [
  { href: "/collection", label: "My Collection", icon: Library },
  { href: "/sessions", label: "Recent Sessions", icon: History },
  { href: "/profile", label: "Profile", icon: User },
];

function isNavActive(pathname: string, href: string) {
  if (href === "/collection") {
    return (
      pathname === "/collection" ||
      (pathname.startsWith("/games/") && pathname !== "/games/add")
    );
  }
  if (href === "/sessions") {
    return (
      pathname === "/sessions" ||
      (pathname.startsWith("/sessions/") && pathname !== "/sessions/new")
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavPanel({
  pathname,
  onNavigate,
  onSignOut,
  showClose,
}: {
  pathname: string;
  onNavigate?: () => void;
  onSignOut: () => void;
  showClose?: boolean;
}) {
  return (
    <>
      <div className="mb-8 flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2.5">
            <Image
              src="/tablist.png"
              alt=""
              width={32}
              height={32}
              className="size-8 shrink-0"
              priority
            />
            <h1 className="font-[family-name:var(--font-brand)] text-2xl text-primary">
              Tablist
            </h1>
          </div>
          <p className="mt-1 text-xs font-medium tracking-wide text-on-surface-variant">
            Game Night Ready
          </p>
        </div>
        {showClose ? (
          <button
            type="button"
            onClick={onNavigate}
            aria-label="Close menu"
            className="rounded-lg p-1 text-on-surface-variant transition-colors hover:bg-surface-container-high"
          >
            <X className="size-6" />

          </button>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2">
        {nav.map((item) => {
          const active = isNavActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold tracking-wide transition-all ${
                active
                  ? "bg-surface-container-high text-primary"
                  : "text-on-surface-variant hover:bg-surface-container-high/70"
              }`}
            >
              <Icon className={`size-6 ${active ? "text-primary" : ""}`} />
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="mt-auto space-y-3">
        <SyncStatus />
        <InstallAppBanner />
        <button
          type="button"
          onClick={onSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-semibold tracking-wide text-on-surface-variant transition-all hover:bg-surface-container-high"
        >
          <LogOut className="size-6" />

          Sign out
        </button>
        <a
          href="https://boardgamegeek.com"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 block border-t border-outline-variant/20 pt-4"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://cf.geekdo-images.com/HZy35cmzmmyV9BarSuk6ug__imagepage/img/FOGhR5OgYhcg-1jdqT5i5W8Xfbg=/fit-in/900x600/filters:no_upscale():strip_icc()/pic7779581.png"
            alt="Powered by BGG"
            className="mx-auto h-auto w-full"
          />
        </a>
      </div>
    </>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  async function signOut() {
    setOpen(false);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function closeMenu() {
    setOpen(false);
  }

  return (
    <>
      <nav className="fixed left-0 top-0 z-50 hidden h-screen w-64 flex-col gap-2 border-r border-outline-variant/20 bg-surface-container-low p-6 shadow-md md:flex">
        <NavPanel pathname={pathname} onSignOut={signOut} />
      </nav>

      <header className="fixed top-0 z-50 w-full border-b border-outline-variant/10 bg-background shadow-sm md:hidden">
        <div className="mx-auto flex w-full items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <Image
              src="/tablist.png"
              alt=""
              width={28}
              height={28}
              className="size-7 shrink-0"
              priority
            />
            <h1 className="font-[family-name:var(--font-brand)] text-xl text-primary">
              Tablist
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            aria-expanded={open}
            className="rounded-lg p-1 text-on-surface-variant transition-colors hover:bg-surface-container-high"
          >
            <Menu className="size-6" />

          </button>
        </div>
      </header>

      <div
        className={`fixed inset-0 z-[60] bg-black/40 transition-opacity md:hidden ${
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        onClick={closeMenu}
        aria-hidden={!open}
      />

      <nav
        className={`fixed left-0 top-0 z-[70] flex h-screen w-64 flex-col gap-2 border-r border-outline-variant/20 bg-surface-container-low p-6 shadow-md transition-transform duration-300 ease-out md:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!open}
      >
        <NavPanel
          pathname={pathname}
          onNavigate={closeMenu}
          onSignOut={signOut}
          showClose
        />
      </nav>
    </>
  );
}
