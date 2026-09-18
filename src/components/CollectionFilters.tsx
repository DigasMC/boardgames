"use client";

import { useMemo } from "react";

export type CollectionFiltersState = {
  players: number | null;
  maxPlaytime: number;
  categories: string[];
  search: string;
};

const PLAYER_COUNTS = Array.from({ length: 15 }, (_, i) => i + 1);

const PLAYTIME_PRESETS: { value: number; label: string }[] = [
  { value: 15, label: "15m" },
  { value: 30, label: "30m" },
  { value: 45, label: "45m" },
  { value: 60, label: "1h" },
  { value: 90, label: "90m" },
  { value: 120, label: "2h" },
  { value: 180, label: "3h+" },
];

const CATEGORY_GROUPS: { label: string; categories: string[] }[] = [
  {
    label: "Style",
    categories: [
      "Abstract Strategy",
      "Card Game",
      "Dice",
      "Party Game",
      "Children's Game",
      "Trivia",
      "Word Game",
      "Puzzle",
      "Memory",
      "Bluffing",
      "Negotiation",
      "Deduction",
      "Real-time",
      "Action / Dexterity",
    ],
  },
  {
    label: "Theme",
    categories: [
      "Economic",
      "Civilization",
      "City Building",
      "Territory Building",
      "Exploration",
      "Adventure",
      "Farming",
      "Industry / Manufacturing",
      "Racing",
      "Sports",
      "Humor",
      "Educational",
      "Murder/Mystery",
      "Spies/Secret Agents",
    ],
  },
  {
    label: "Setting",
    categories: [
      "Fantasy",
      "Science Fiction",
      "Horror",
      "Zombies",
      "Medieval",
      "Ancient",
      "Renaissance",
      "Nautical",
      "Pirates",
      "Trains",
      "Transportation",
      "Animals",
      "Mythology",
      "Space Exploration",
      "Movies / TV / Radio theme",
      "Video Game Theme",
      "Comic Book / Strip",
      "Novel-based",
    ],
  },
  {
    label: "Conflict",
    categories: [
      "Wargame",
      "Fighting",
      "Miniatures",
      "Political",
      "Modern Warfare",
      "World War I",
      "World War II",
      "Napoleonic",
      "Civil War",
      "American West",
    ],
  },
];

const chipActive =
  "bg-primary-container text-on-primary-container";
const chipInactive =
  "bg-surface-container text-on-surface hover:bg-surface-container-high";
const catActive =
  "bg-primary-container text-on-primary-container";
const catInactive =
  "bg-surface-container text-on-surface hover:bg-surface-container-high";

export function CollectionFilters({
  value,
  onChange,
  availableCategories = [],
  embedded = false,
}: {
  value: CollectionFiltersState;
  onChange: (next: CollectionFiltersState) => void;
  availableCategories?: string[];
  embedded?: boolean;
}) {
  function toggleCategory(cat: string) {
    const categories = value.categories.includes(cat)
      ? value.categories.filter((c) => c !== cat)
      : [...value.categories, cat];
    onChange({ ...value, categories });
  }

  const visibleGroups = useMemo(() => {
    const available = new Set(
      availableCategories.map((c) => c.toLowerCase())
    );
    return CATEGORY_GROUPS.map((group) => ({
      label: group.label,
      categories: group.categories.filter((cat) =>
        available.has(cat.toLowerCase())
      ),
    })).filter((group) => group.categories.length > 0);
  }, [availableCategories]);

  const body = (
    <>
      <div className="mb-4">
        <label className="mb-2 block text-xs font-medium text-on-surface-variant">
          Players
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onChange({ ...value, players: null })}
            className={`flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-xs font-medium transition-colors ${
              value.players == null ? chipActive : chipInactive
            }`}
          >
            Any
          </button>
          {PLAYER_COUNTS.map((n) => {
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
                  active ? chipActive : chipInactive
                }`}
              >
                {n}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-4">
        <label className="mb-2 block text-xs font-medium text-on-surface-variant">
          Max play time
        </label>
        <div className="flex flex-wrap gap-2">
          {PLAYTIME_PRESETS.map(({ value: minutes, label }) => {
            const active = value.maxPlaytime === minutes;
            return (
              <button
                key={minutes}
                type="button"
                onClick={() => onChange({ ...value, maxPlaytime: minutes })}
                className={`cursor-pointer rounded-sm px-3 py-1 text-xs font-medium transition-colors ${
                  active ? chipActive : chipInactive
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs font-medium text-on-surface-variant">
          Category
        </label>
        {visibleGroups.length === 0 ? (
          <p className="text-xs text-outline">
            No categories in your collection yet.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {visibleGroups.map((group) => (
              <div key={group.label}>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-outline">
                  {group.label}
                </p>
                <div className="flex flex-wrap gap-2">
                  {group.categories.map((cat) => {
                    const active = value.categories.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleCategory(cat)}
                        className={`cursor-pointer rounded-sm px-3 py-1 text-xs font-medium ${
                          active ? catActive : catInactive
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );

  if (embedded) {
    return <div className="flex w-full flex-col">{body}</div>;
  }

  return (
    <aside className="flex w-full flex-col gap-4 lg:w-72">
      <div className="card-shadow rounded-lg border border-secondary/10 bg-surface p-6">
        <h3 className="mb-4 border-b border-outline-variant/20 pb-2 text-sm font-semibold tracking-wide text-primary">
          Filters
        </h3>
        {body}
      </div>
    </aside>
  );
}
