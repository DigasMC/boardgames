import { Skeleton } from "./Skeleton";

export function NewSessionFormSkeleton() {
  return (
    <div
      className="mx-auto flex w-full max-w-2xl flex-col gap-6"
      aria-busy="true"
      aria-label="Loading new session form"
    >
      <div>
        <Skeleton className="mb-4 h-5 w-36" />
        <Skeleton className="mb-2 h-8 w-48 md:h-9 md:w-56" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>

      <div className="card-shadow flex flex-col gap-6 rounded-xl border border-secondary/10 bg-surface p-6 md:p-8">
        <div className="flex flex-col gap-1">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
          <div className="flex flex-col gap-1">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>

        <Skeleton className="h-5 w-56" />

        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-16" />
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="size-10 shrink-0 rounded-full" />
              <Skeleton className="h-10 flex-1 rounded-md" />
            </div>
          ))}
        </div>

        <Skeleton className="h-11 w-full rounded-lg md:w-40" />
      </div>
    </div>
  );
}
