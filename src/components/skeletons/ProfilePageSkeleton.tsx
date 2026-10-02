import { Skeleton } from "./Skeleton";

export function ProfilePageSkeleton() {
  return (
    <div
      className="mx-auto flex w-full max-w-lg flex-col gap-8"
      aria-busy="true"
      aria-label="Loading profile"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-32 md:h-10 md:w-36" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-10 w-24 rounded-lg" />
      </div>

      <div className="card-shadow flex flex-col gap-6 rounded-xl border border-secondary/10 bg-surface p-6 md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <Skeleton className="size-16 shrink-0 rounded-xl" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-44" />
            </div>
          </div>
          <Skeleton className="h-9 w-16 rounded-md" />
        </div>
      </div>

      <div className="card-shadow flex flex-col gap-4 rounded-xl border border-secondary/10 bg-surface p-6 md:p-8">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-full max-w-sm" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>

      <div className="card-shadow flex flex-col gap-4 rounded-xl border border-secondary/10 bg-surface p-6 md:p-8">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}
