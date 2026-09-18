import { Star } from "lucide-react";

export function RatingBadge({
  rating,
  size = "sm",
}: {
  rating: number;
  size?: "sm" | "md";
}) {
  const compact = size === "sm";

  return (
    <div
      className={`absolute z-10 flex items-center rounded-full border border-white bg-white/70 font-medium tabular-nums text-primary backdrop-blur-md ${
        compact
          ? "left-1.5 top-1.5 gap-0.5 px-2 py-0.5 text-[10px] sm:left-2 sm:top-2 sm:gap-1 sm:px-2.5 sm:py-1 sm:text-xs"
          : "left-3 top-3 gap-1 px-3 py-1 text-sm"
      }`}
      title={`BGG rating ${rating.toFixed(1)}`}
    >
      <Star
        className={compact ? "size-[11px] sm:size-3.5" : "size-4"}
        fill="currentColor"
      />
      {rating.toFixed(1)}
    </div>
  );
}
