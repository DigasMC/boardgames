import { GameCardSkeleton } from "./GameCardSkeleton";
import { Skeleton } from "./Skeleton";

export function PublicProfileSkeleton() {
  return (
    <div
      className="mx-auto flex w-full max-w-4xl flex-col gap-8"
      aria-busy="true"
      aria-label="Loading profile"
    >
      <div className="flex flex-wrap items-start gap-4">
        <Skeleton className="size-20 shrink-0 rounded-2xl" />
        <div className="min-w-0 flex-1 flex flex-col gap-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </section>

      <section>
        <Skeleton className="mb-4 h-7 w-40" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <GameCardSkeleton key={i} />
          ))}
        </div>
      </section>
    </div>
  );
}
