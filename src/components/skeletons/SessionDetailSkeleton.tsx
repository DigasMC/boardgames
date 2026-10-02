import { Skeleton } from "./Skeleton";

function ScoreRowSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-outline-variant/20 p-3">
      <Skeleton className="size-10 shrink-0 rounded-full" />
      <Skeleton className="h-5 flex-1 max-w-[12rem]" />
      <Skeleton className="h-9 w-16 rounded-md" />
    </div>
  );
}

export function SessionDetailSkeleton() {
  return (
    <div
      className="mx-auto max-w-4xl"
      aria-busy="true"
      aria-label="Loading session"
    >
      <Skeleton className="mb-6 h-5 w-36" />

      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-64 max-w-full" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>

      <div className="mb-8 flex gap-4">
        <Skeleton className="size-20 shrink-0 rounded-lg" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>

      <Skeleton className="mb-4 h-6 w-32" />
      <div className="flex flex-col gap-3">
        <ScoreRowSkeleton />
        <ScoreRowSkeleton />
        <ScoreRowSkeleton />
        <ScoreRowSkeleton />
      </div>
    </div>
  );
}
