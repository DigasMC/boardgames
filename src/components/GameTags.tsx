type GameTagKind = "category" | "mechanic";

type GameTagItem = {
  label: string;
  kind: GameTagKind;
};

function collectTags(categories: string[], mechanics: string[]): GameTagItem[] {
  const seen = new Set<string>();
  const tags: GameTagItem[] = [];

  for (const [kind, labels] of [
    ["category", categories],
    ["mechanic", mechanics],
  ] as const) {
    for (const label of labels) {
      if (!label || seen.has(label)) continue;
      seen.add(label);
      tags.push({ label, kind });
    }
  }

  return tags;
}

function chipClass(size: "sm" | "md") {
  const sizing =
    size === "sm"
      ? "px-2 py-0.5 text-[10px] leading-4 sm:text-[11px]"
      : "px-2.5 py-1 text-xs leading-4";

  return `inline-flex shrink-0 items-center rounded-full border border-outline-variant/40 bg-surface-container font-medium tracking-wide whitespace-nowrap text-on-surface-variant ${sizing}`;
}

export function GameTags({
  categories = [],
  mechanics = [],
  max,
  size = "md",
}: {
  categories?: string[];
  mechanics?: string[];
  max?: number;
  size?: "sm" | "md";
}) {
  const tags = collectTags(categories, mechanics);
  if (tags.length === 0) return null;

  const visible = max == null ? tags : tags.slice(0, max);
  const hidden = tags.slice(visible.length);
  const remainingLabel = hidden.map((tag) => tag.label).join(", ");

  return (
    <div
      className={`flex items-center ${
        size === "sm" ? "flex-wrap gap-1" : "flex-wrap gap-1.5"
      }`}
    >
      {visible.map((tag) => (
        <span key={`${tag.kind}-${tag.label}`} className={chipClass(size)}>
          {tag.label}
        </span>
      ))}
      {hidden.length > 0 && (
        <span
          className={`shrink-0 font-semibold tabular-nums text-outline ${
            size === "sm" ? "text-[10px] sm:text-[11px]" : "text-xs"
          }`}
          title={remainingLabel}
          aria-label={`${hidden.length} more tags: ${remainingLabel}`}
        >
          +{hidden.length}
        </span>
      )}
    </div>
  );
}
