import { Skeleton } from "./Skeleton";

function FriendRowSkeleton() {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <Skeleton className="size-10 shrink-0 rounded-full" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="h-9 w-20 rounded-md" />
    </div>
  );
}

export function FriendsPageSkeleton() {
  return (
    <div
      className="mx-auto flex w-full max-w-2xl flex-col gap-8"
      aria-busy="true"
      aria-label="Loading friends"
    >
      <div>
        <Skeleton className="mb-2 h-9 w-36 md:h-10 md:w-40" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>

      <div className="card-shadow rounded-xl border border-secondary/10 bg-surface p-6">
        <Skeleton className="mb-2 h-4 w-24" />
        <Skeleton className="h-10 w-full rounded-md" />
      </div>

      <div className="card-shadow rounded-xl border border-secondary/10 bg-surface p-6">
        <Skeleton className="mb-4 h-5 w-28" />
        <div className="divide-y divide-outline-variant/15">
          <FriendRowSkeleton />
          <FriendRowSkeleton />
          <FriendRowSkeleton />
          <FriendRowSkeleton />
        </div>
      </div>
    </div>
  );
}
