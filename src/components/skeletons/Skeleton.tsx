export function Skeleton({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded bg-outline/20 ${className}`.trim()}
      {...props}
    />
  );
}
