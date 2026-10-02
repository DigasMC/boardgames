import { Skeleton } from "./Skeleton";

export function GameDetailsSkeleton() {
  return (
    <div
      className="relative mx-auto flex w-full max-w-7xl flex-col gap-8 pb-24 md:gap-12 md:pb-0"
      aria-busy="true"
      aria-label="Loading game"
    >
      <Skeleton className="h-5 w-40" />

      <section className="card-shadow flex flex-col overflow-hidden rounded-xl border border-secondary/10 bg-surface md:flex-row">
        <Skeleton className="h-64 w-full shrink-0 md:h-auto md:min-h-[280px] md:w-1/3" />
        <div className="flex flex-1 flex-col gap-4 p-6 md:w-2/3 md:p-8">
          <Skeleton className="ml-auto h-9 w-24 rounded-md" />
          <Skeleton className="h-10 w-3/4 max-w-lg md:h-14" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-7 w-20 rounded-full" />
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-4">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-5 w-24" />
          </div>
          <Skeleton className="mt-4 h-11 w-full rounded-lg md:w-48" />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </section>
    </div>
  );
}
