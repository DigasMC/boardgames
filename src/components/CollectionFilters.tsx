"use client";

import { useMemo, useState, type ChangeEvent } from "react";

export type CollectionFiltersState = {
  players: number | null;
  maxPlaytime: number;
  /** Inclusive BGG weight floor (1–5). Default 1 = Any. */
  weightMin: number;
  /** Inclusive BGG weight ceiling (1–5). Default 5 = Any. */
  weightMax: number;
  categories: string[];
  search: string;
};

export const WEIGHT_FILTER_MIN = 1;
export const WEIGHT_FILTER_MAX = 5;
export const WEIGHT_FILTER_STEP = 0.1;

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

function roundWeight(n: number): number {
  return Math.round(n * 10) / 10;
}

function clampWeight(n: number): number {
  return Math.min(
    WEIGHT_FILTER_MAX,
    Math.max(WEIGHT_FILTER_MIN, roundWeight(n))
  );
}

function formatWeightLabel(min: number, max: number): string {
  if (min <= WEIGHT_FILTER_MIN && max >= WEIGHT_FILTER_MAX) return "Any";
  return `${min.toFixed(1)}–${max.toFixed(1)}`;
}

function isWeightFilterActive(min: number, max: number): boolean {
  return min > WEIGHT_FILTER_MIN || max < WEIGHT_FILTER_MAX;
}

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

  const [minDraft, setMinDraft] = useState<string | null>(null);
  const [maxDraft, setMaxDraft] = useState<string | null>(null);

  const weightLabel = formatWeightLabel(value.weightMin, value.weightMax);
  const rangeActive = isWeightFilterActive(value.weightMin, value.weightMax);

  function setWeightRange(nextMin: number, nextMax: number) {
    const weightMin = clampWeight(Math.min(nextMin, nextMax));
    const weightMax = clampWeight(Math.max(nextMin, nextMax));
    onChange({ ...value, weightMin, weightMax });
  }

  function onMinRangeChange(event: ChangeEvent<HTMLInputElement>) {
    const next = clampWeight(Number(event.target.value));
    setWeightRange(next, Math.max(next, value.weightMax));
  }

  function onMaxRangeChange(event: ChangeEvent<HTMLInputElement>) {
    const next = clampWeight(Number(event.target.value));
    setWeightRange(Math.min(value.weightMin, next), next);
  }

  function commitMinInput(raw: string) {
    setMinDraft(null);
    if (raw.trim() === "") {
      setWeightRange(WEIGHT_FILTER_MIN, value.weightMax);
      return;
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return;
    setWeightRange(parsed, value.weightMax);
  }

  function commitMaxInput(raw: string) {
    setMaxDraft(null);
    if (raw.trim() === "") {
      setWeightRange(value.weightMin, WEIGHT_FILTER_MAX);
      return;
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return;
    setWeightRange(value.weightMin, parsed);
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

  const minPct =
    ((value.weightMin - WEIGHT_FILTER_MIN) /
      (WEIGHT_FILTER_MAX - WEIGHT_FILTER_MIN)) *
    100;
  const maxPct =
    ((value.weightMax - WEIGHT_FILTER_MIN) /
      (WEIGHT_FILTER_MAX - WEIGHT_FILTER_MIN)) *
    100;

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
            className={`cursor-pointer rounded-sm px-3 py-1 text-xs font-medium transition-colors ${
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
                className={`cursor-pointer rounded-sm px-3 py-1 text-xs font-medium transition-colors ${
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

      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <label className="block text-xs font-medium text-on-surface-variant">
            Weight
            <span className="ml-1.5 font-normal text-outline">
              · {weightLabel}
            </span>
          </label>
          {rangeActive ? (
            <button
              type="button"
              className="text-[11px] font-semibold text-primary hover:opacity-80"
              onClick={() =>
                setWeightRange(WEIGHT_FILTER_MIN, WEIGHT_FILTER_MAX)
              }
            >
              Reset
            </button>
          ) : null}
        </div>

        <div
          className="relative mb-3 h-8"
          role="group"
          aria-label="Weight range"
        >
          <div className="pointer-events-none absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-surface-container-high" />
          <div
            className="pointer-events-none absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-primary"
            style={{ left: `${minPct}%`, right: `${100 - maxPct}%` }}
          />
          <input
            type="range"
            min={WEIGHT_FILTER_MIN}
            max={WEIGHT_FILTER_MAX}
            step={WEIGHT_FILTER_STEP}
            value={value.weightMin}
            onChange={onMinRangeChange}
            onMouseDown={() => setMinDraft(null)}
            aria-label="Minimum weight"
            className="weight-range absolute inset-0 z-[3] w-full appearance-none bg-transparent"
          />
          <input
            type="range"
            min={WEIGHT_FILTER_MIN}
            max={WEIGHT_FILTER_MAX}
            step={WEIGHT_FILTER_STEP}
            value={value.weightMax}
            onChange={onMaxRangeChange}
            onMouseDown={() => setMaxDraft(null)}
            aria-label="Maximum weight"
            className="weight-range absolute inset-0 z-[4] w-full appearance-none bg-transparent"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-outline">Min</span>
            <input
              type="number"
              inputMode="decimal"
              min={WEIGHT_FILTER_MIN}
              max={WEIGHT_FILTER_MAX}
              step={WEIGHT_FILTER_STEP}
              value={minDraft ?? value.weightMin.toFixed(1)}
              onChange={(e) => setMinDraft(e.target.value)}
              onBlur={(e) => commitMinInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  (e.target as HTMLInputElement).blur();
                }
              }}
              className="w-full rounded-md bg-surface-container px-3 py-2 text-sm text-on-surface outline-none ring-primary placeholder:text-outline focus:ring-1"
              aria-label="Minimum weight"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-outline">Max</span>
            <input
              type="number"
              inputMode="decimal"
              min={WEIGHT_FILTER_MIN}
              max={WEIGHT_FILTER_MAX}
              step={WEIGHT_FILTER_STEP}
              value={maxDraft ?? value.weightMax.toFixed(1)}
              onChange={(e) => setMaxDraft(e.target.value)}
              onBlur={(e) => commitMaxInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  (e.target as HTMLInputElement).blur();
                }
              }}
              className="w-full rounded-md bg-surface-container px-3 py-2 text-sm text-on-surface outline-none ring-primary placeholder:text-outline focus:ring-1"
              aria-label="Maximum weight"
            />
          </label>
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
