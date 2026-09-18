import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  Clock,
  Library,
  Layers,
  Minus,
  TrendingDown,
  TrendingUp,
  Trophy,
} from "lucide-react";

type SessionStatsProps = {
  thisMonth: number;
  lastMonth: number;
  mostPlayed: [string, number] | undefined;
  totalSessions: number;
  uniqueGames: number;
};

function monthDeltaLabel(thisMonth: number, lastMonth: number) {
  const delta = thisMonth - lastMonth;
  if (delta === 0) return "Same as last month";
  if (delta > 0) return `+${delta} from last month`;
  return `${delta} from last month`;
}

function getMonthDeltaIcon(thisMonth: number, lastMonth: number): LucideIcon {
  const delta = thisMonth - lastMonth;
  if (delta > 0) return TrendingUp;
  if (delta < 0) return TrendingDown;
  return Minus;
}

function StatCard({
  label,
  value,
  valueClassName = "text-5xl",
  WatermarkIcon,
  FooterIcon,
  footer,
  footerClassName = "text-on-surface-variant",
}: {
  label: string;
  value: string | number;
  valueClassName?: string;
  WatermarkIcon: LucideIcon;
  FooterIcon: LucideIcon;
  footer: string;
  footerClassName?: string;
}) {
  return (
    <div className="card-shadow card-hover group relative overflow-hidden rounded-xl border border-outline-variant/20 bg-gradient-to-br from-surface-container-low to-white p-6">
      <div className="pointer-events-none absolute -right-4 -top-4 opacity-5 transition-opacity group-hover:opacity-10">
        <WatermarkIcon className="size-[120px]" strokeWidth={1.25} aria-hidden />
      </div>
      <h3 className="relative mb-2 text-sm font-semibold uppercase tracking-wider text-on-surface-variant">
        {label}
      </h3>
      <p
        className={`relative truncate font-[family-name:var(--font-headline)] font-bold text-primary ${valueClassName}`}
      >
        {value}
      </p>
      <div
        className={`relative mt-4 flex items-center gap-1 text-sm font-medium ${footerClassName}`}
      >
        <FooterIcon className="size-3.5 shrink-0" aria-hidden />
        <span>{footer}</span>
      </div>
    </div>
  );
}

export function SessionStats({
  thisMonth,
  lastMonth,
  mostPlayed,
  totalSessions,
  uniqueGames,
}: SessionStatsProps) {
  const DeltaIcon = getMonthDeltaIcon(thisMonth, lastMonth);
  const uniqueLabel =
    uniqueGames === 1 ? "1 game in the vault" : `${uniqueGames} games in the vault`;

  return (
    <section className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-3">
      <StatCard
        label="Games This Month"
        value={thisMonth}
        WatermarkIcon={CalendarDays}
        FooterIcon={DeltaIcon}
        footer={monthDeltaLabel(thisMonth, lastMonth)}
        footerClassName="text-surface-tint"
      />
      <StatCard
        label="Most Played"
        value={mostPlayed?.[0] ?? "—"}
        valueClassName="text-2xl"
        WatermarkIcon={Trophy}
        FooterIcon={Clock}
        footer={
          mostPlayed
            ? `${mostPlayed[1]} sessions logged`
            : "Play a game to start tracking"
        }
      />
      <StatCard
        label="Total Sessions"
        value={totalSessions}
        WatermarkIcon={Layers}
        FooterIcon={Library}
        footer={uniqueLabel}
        footerClassName="text-surface-tint"
      />
    </section>
  );
}
