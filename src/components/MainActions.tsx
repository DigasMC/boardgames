"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarPlus, Plus } from "lucide-react";

const actions = [
  {
    href: "/games/add",
    label: "Add game",
    icon: Plus,
  },
  {
    href: "/sessions/new",
    label: "Create session",
    icon: CalendarPlus,
  },
] as const;

function isCurrent(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MainActions({
  variant,
  onNavigate,
}: {
  variant: "sidebar" | "bar";
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  const links = actions.map((action) => {
    const current = isCurrent(pathname, action.href);
    const Icon = action.icon;
    const tone =
      action.href === "/games/add"
        ? "bg-primary text-on-primary hover:opacity-90"
        : "bg-accent text-white hover:opacity-90";

    return (
      <Link
        key={action.href}
        href={action.href}
        onClick={onNavigate}
        aria-current={current ? "page" : undefined}
        className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm font-bold tracking-wide shadow-sm transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${tone} ${
          current ? "ring-2 ring-inset ring-white" : ""
        } ${variant === "sidebar" ? "w-full" : "min-w-0 flex-1"}`}
      >
        <Icon className="size-5 shrink-0" aria-hidden />
        {action.label}
      </Link>
    );
  });

  if (variant === "bar") {
    return (
      <nav
        aria-label="Main actions"
        className="fixed inset-x-0 bottom-0 z-40 w-full max-w-[100vw] border-t border-outline-variant/20 bg-surface/95 px-3 pt-2 shadow-[0_-4px_16px_rgba(1,45,29,0.06)] backdrop-blur-md md:hidden"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex max-w-lg gap-2">{links}</div>
      </nav>
    );
  }

  return (
    <div className="mb-6 flex flex-col gap-2" role="group" aria-label="Main actions">
      {links}
    </div>
  );
}
