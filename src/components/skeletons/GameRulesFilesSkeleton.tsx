import { Skeleton } from "./Skeleton";

export function GameRulesFilesSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-hidden>
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-[4.5rem] w-full rounded-lg" />
      ))}
    </div>
  );
}
