import { Skeleton } from "./Skeleton";

export function AuthFormSkeleton() {
  return (
    <div
      className="card-shadow w-full max-w-md rounded-xl border border-secondary/10 bg-surface p-8"
      aria-busy="true"
      aria-label="Loading sign in"
    >
      <Skeleton className="h-9 w-28" />
      <Skeleton className="mt-2 h-4 w-full max-w-xs" />

      <div className="mt-8 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
        <div className="flex flex-col gap-1">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>

      <div className="my-6 flex items-center gap-3">
        <Skeleton className="h-px flex-1" />
        <Skeleton className="h-3 w-6" />
        <Skeleton className="h-px flex-1" />
      </div>

      <Skeleton className="h-11 w-full rounded-lg" />
      <Skeleton className="mt-6 h-4 w-48" />
    </div>
  );
}
