export function GameCardSkeleton() {
  return (
    <article
      aria-hidden
      className="card-shadow flex animate-pulse flex-row overflow-hidden rounded-lg border border-secondary/10 bg-surface sm:flex-col sm:rounded-xl"
    >
      <div className="w-24 shrink-0 self-stretch bg-surface-container sm:h-40 sm:w-full" />
      <div className="flex flex-1 flex-col p-2.5 sm:p-3">
        <div className="mb-2 h-5 w-3/4 rounded bg-outline/20" />
        <div className="mb-2 h-4 w-1/3 rounded bg-outline/20" />
        <div className="mt-auto h-8 w-full rounded bg-outline/20" />
      </div>
    </article>
  );
}
