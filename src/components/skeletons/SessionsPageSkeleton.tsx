import { Skeleton } from "./Skeleton";

function StatCardSkeleton() {
  return (
    <div className="card-shadow relative overflow-hidden rounded-xl border border-outline-variant/20 bg-gradient-to-br from-surface-container-low to-white p-6">
      <Skeleton className="mb-2 h-3 w-32" />
      <Skeleton className="mb-4 h-12 w-16" />
      <Skeleton className="h-4 w-40" />
    </div>
  );
}

function TimelineCardSkeleton() {
  return (
    <div className="relative pl-8 md:pl-10">
      <Skeleton className="absolute -left-[9px] top-2 size-4 rounded-full" />
      <div className="card-shadow rounded-xl border border-secondary/10 bg-surface p-4 md:p-6">
        <Skeleton className="mb-2 h-3 w-24" />
        <Skeleton className="mb-3 h-7 w-3/4 max-w-xs" />
        <div className="flex gap-2">
          <Skeleton className="size-16 shrink-0 rounded-lg" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SessionsPageSkeleton() {
  return (
    <div
      className="mx-auto max-w-6xl"
      aria-busy="true"
      aria-label="Loading sessions"
    >
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-56 md:h-12 md:w-72" />
          <Skeleton className="h-5 w-full max-w-md" />
        </div>
        <Skeleton className="h-11 w-32 rounded-lg" />
      </div>

      <section className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-3">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </section>

      <section>
        <Skeleton className="mb-6 h-8 w-40" />
        <div className="relative ml-4 space-y-10 border-l-2 border-surface-container-high pb-8 md:ml-6">
          <TimelineCardSkeleton />
          <TimelineCardSkeleton />
          <TimelineCardSkeleton />
        </div>
      </section>
    </div>
  );
}
