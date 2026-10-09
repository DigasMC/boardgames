"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import type { Game } from "@/types/database";
import { CoverImage } from "@/components/CoverImage";

type GameSelectProps = {
  games: Game[];
  value: string | null;
  onChange: (gameId: string) => void;
  disabled?: boolean;
  placeholder?: string;
  emptyMessage?: string;
};

export function GameSelect({
  games,
  value,
  onChange,
  disabled = false,
  placeholder = "Select a game",
  emptyMessage = "Your collection is empty — add games first.",
}: GameSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const selected = games.find((g) => g.id === value) ?? null;
  const isEmpty = games.length === 0;
  const isDisabled = disabled || isEmpty;

  const trimmedQuery = query.trim().toLowerCase();
  const filteredGames = trimmedQuery
    ? games.filter((game) => game.name.toLowerCase().includes(trimmedQuery))
    : games;

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }

    searchRef.current?.focus();

    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function selectGame(id: string) {
    onChange(id);
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={isDisabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center gap-3 rounded-md bg-surface-container px-3 py-2 text-left outline-none ring-primary transition-shadow focus:ring-1 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {selected ? (
          <>
            <GameThumb game={selected} />
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-on-surface">
              {selected.name}
            </span>
          </>
        ) : (
          <>
            <span
              aria-hidden
              className="h-8 w-8 shrink-0 rounded border border-outline-variant/20 bg-surface-container-high"
            />
            <span className="min-w-0 flex-1 truncate text-sm text-on-surface-variant">
              {isEmpty ? emptyMessage : placeholder}
            </span>
          </>
        )}
        <ChevronDown
          className={`size-4 shrink-0 text-on-surface-variant transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && !isEmpty ? (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-outline-variant/20 bg-surface shadow-lg">
          <div className="sticky top-0 border-b border-outline-variant/10 bg-surface p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-outline" />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search games..."
                aria-label="Search games"
                className="w-full rounded-md bg-surface-container py-2 pl-9 pr-3 text-sm text-on-surface outline-none ring-primary placeholder:text-outline focus:ring-1"
              />
            </div>
          </div>
          <ul
            id={listId}
            role="listbox"
            className="max-h-52 overflow-y-auto py-1"
          >
            {filteredGames.length === 0 ? (
              <li className="px-3 py-2 text-sm text-on-surface-variant">
                No games match…
              </li>
            ) : (
              filteredGames.map((game) => {
                const isSelected = game.id === value;
                return (
                  <li key={game.id} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      onClick={() => selectGame(game.id)}
                      className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-surface-container ${
                        isSelected ? "bg-surface-container-high" : ""
                      }`}
                    >
                      <GameThumb game={game} />
                      <span
                        className={`min-w-0 flex-1 truncate text-sm ${
                          isSelected
                            ? "font-semibold text-primary"
                            : "font-medium text-on-surface"
                        }`}
                      >
                        {game.name}
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function GameThumb({ game }: { game: Game }) {
  const src = game.thumbnail_url || game.image_url;
  return (
    <CoverImage
      src={src}
      alt=""
      className="h-8 w-8 shrink-0 rounded border border-outline-variant/20"
    />
  );
}
