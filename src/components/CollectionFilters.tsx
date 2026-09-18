"use client";

export type CollectionFiltersState = {
  players: number | null;
  maxPlaytime: number;
  categories: string[];
  search: string;
};

const CATEGORIES = ["Strategy", "Thematic", "Party", "Family"];

export function CollectionFilters({
  value,
  onChange,
  embedded = false,
}: {
  value: CollectionFiltersState;
  onChange: (next: CollectionFiltersState) => void;
  embedded?: boolean;
}) {
  function toggleCategory(cat: string) {
    const categories = value.categories.includes(cat)
      ? value.categories.filter((c) => c !== cat)
      : [...value.categories, cat];
    onChange({ ...value, categories });
  }

  const body = (
    <>
      <div className="mb-4">
        <label className="mb-2 block text-xs font-medium text-on-surface-variant">
          Players
        </label>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((n) => {
            const label = n === 4 ? "4+" : String(n);
            const active = value.players === n;
            return (
              <button
                key={n}
                type="button"
                onClick={() =>
                  onChange({
                    ...value,
                    players: active ? null : n,
                  })
                }
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                  active
                    ? "bg-primary-container text-on-primary-container"
                    : "bg-surface-container text-on-surface hover:bg-secondary-container hover:text-on-secondary-container"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-4">
        <label className="mb-2 block text-xs font-medium text-on-surface-variant">
          Play Time (max{" "}
          {value.maxPlaytime >= 180 ? "3h+" : `${value.maxPlaytime}m`})
        </label>
        <input
          className="w-full accent-primary"
          type="range"
          min={15}
          max={180}
          step={15}
          value={value.maxPlaytime}
          onChange={(e) =>
            onChange({ ...value, maxPlaytime: Number(e.target.value) })
          }
        />
        <div className="mt-1 flex justify-between text-xs text-outline">
          <span>15m</span>
          <span>3h+</span>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs font-medium text-on-surface-variant">
          Category
        </label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => {
            const active = value.categories.includes(cat);
            return (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                className={`cursor-pointer rounded-sm px-3 py-1 text-xs font-medium ${
                  active
                    ? "bg-secondary-container text-on-secondary-container"
                    : "bg-surface-container text-on-surface hover:bg-surface-container-high"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );

  if (embedded) {
    return <div className="flex w-full flex-col">{body}</div>;
  }

  return (
    <aside className="flex w-full flex-col gap-4 lg:w-64">
      <div className="card-shadow rounded-lg border border-secondary/10 bg-surface p-6">
        <h3 className="mb-4 border-b border-outline-variant/20 pb-2 text-sm font-semibold tracking-wide text-primary">
          Filters
        </h3>
        {body}
      </div>
    </aside>
  );
}
