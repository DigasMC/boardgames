import { GameCardSkeleton } from "./GameCardSkeleton";
import { Skeleton } from "./Skeleton";

export function CollectionPageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading collection">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-48 md:h-10 md:w-56" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-11 w-28 rounded-lg" />
      </div>

      <div className="sticky top-16 z-40 -mx-4 mb-6 border-b border-outline-variant/10 bg-surface/70 px-4 py-3 backdrop-blur-sm md:top-0 md:-mx-12 md:px-12">
        <div className="flex w-full flex-wrap items-center gap-3">
          <Skeleton className="h-10 min-w-[10rem] flex-1 md:max-w-xs" />
          <Skeleton className="h-10 w-10 rounded-md md:w-24" />
          <Skeleton className="h-10 w-10 rounded-md md:w-32" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {Array.from({ length: 10 }, (_, i) => (
          <GameCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
