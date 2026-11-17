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
  onNavigate,
  icons = false,
}: {
  onNavigate?: () => void;
  icons?: boolean;
}) {
  const pathname = usePathname();

  return (
    <div
      className={
        icons ? "flex items-center gap-2" : "mb-6 flex flex-col gap-2"
      }
      role="group"
      aria-label="Main actions"
    >
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
            aria-label={icons ? action.label : undefined}
            aria-current={current ? "page" : undefined}
            className={`inline-flex items-center justify-center rounded-lg shadow-sm transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${tone} ${
              current ? "ring-2 ring-inset ring-white" : ""
            } ${
              icons
                ? "size-10"
                : "w-full gap-2 px-3 py-3 text-sm font-bold tracking-wide"
            }`}
          >
            <Icon className="size-5 shrink-0" aria-hidden />
            {icons ? null : action.label}
          </Link>
        );
      })}
    </div>
  );
}
