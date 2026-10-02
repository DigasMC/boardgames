import { GameCardSkeleton } from "./GameCardSkeleton";
import { Skeleton } from "./Skeleton";

export function AddGamePageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading add game">
      <div className="mb-6">
        <Skeleton className="mb-4 h-5 w-40" />
        <Skeleton className="mb-2 h-8 w-48 md:h-9 md:w-56" />
        <Skeleton className="h-4 w-full max-w-lg" />
      </div>

      <div className="sticky top-16 z-40 -mx-4 mb-6 border-b border-outline-variant/10 bg-surface/70 px-4 py-3 backdrop-blur-sm md:top-0 md:-mx-12 md:px-12">
        <div className="flex w-full flex-wrap items-center gap-3">
          <Skeleton className="h-10 min-w-[10rem] flex-1 md:max-w-xs" />
          <Skeleton className="h-10 w-20 rounded-md md:w-24" />
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
