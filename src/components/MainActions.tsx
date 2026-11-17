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

export function MainActions({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="mb-6 flex flex-col gap-2" role="group" aria-label="Main actions">
      {actions.map((action) => {
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
            className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm font-bold tracking-wide shadow-sm transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${tone} ${
              current ? "ring-2 ring-inset ring-white" : ""
            }`}
          >
            <Icon className="size-5 shrink-0" aria-hidden />
            {action.label}
          </Link>
        );
      })}
    </div>
  );
}
