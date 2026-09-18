import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="mb-4 inline-flex items-center gap-2 text-on-surface-variant transition-colors hover:text-primary"
    >
      <ArrowLeft className="size-4" />
      <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
    </Link>
  );
}
