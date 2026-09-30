"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, UserPlus, Users, X } from "lucide-react";
import { BackLink } from "@/components/BackLink";
import { GameSelect } from "@/components/GameSelect";
import { createClient } from "@/lib/supabase/client";
import type { CollectionGame, FriendProfile } from "@/types/database";

type DraftPlayer = {
  key: string;
  displayName: string;
  userId: string | null;
  avatarUrl: string | null;
  teamName: string;
  locked?: boolean;
};

function newKey() {
  return crypto.randomUUID();
}

function NewSessionForm() {
  const router = useRouter();
  const params = useSearchParams();
  const presetGameId = params.get("gameId");
  const presetTitle = params.get("title");

  const [title, setTitle] = useState(presetTitle || "Game Night");
  const [sessionDate, setSessionDate] = useState(
    new Date().toISOString().slice(0, 16)
  );
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [players, setPlayers] = useState<DraftPlayer[]>([]);
  const [selfReady, setSelfReady] = useState(false);
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [teamMode, setTeamMode] = useState(false);
  const [teams, setTeams] = useState<string[]>(["Team A", "Team B"]);
  const [games, setGames] = useState<CollectionGame[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(
    presetGameId
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [friendPickerOpen, setFriendPickerOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { loadCollectionOfflineAware } = await import(
        "@/lib/offline/mutations"
      );
      const games = await loadCollectionOfflineAware();
      if (!cancelled) setGames(games);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      const displayName =
        profile?.display_name?.trim() ||
        profile?.username ||
        user.email?.split("@")[0] ||
        "You";

      if (!cancelled) {
        setPlayers([
          {
            key: newKey(),
            displayName,
            userId: user.id,
            avatarUrl: profile?.avatar_url ?? null,
            teamName: "Team A",
            locked: true,
          },
        ]);
        setSelfReady(true);
      }

      try {
        const res = await fetch("/api/friends");
        const data = await res.json();
        if (res.ok && !cancelled) {
          setFriends((data.friends ?? []) as FriendProfile[]);
        }
      } catch {
        // friends optional offline
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const availableFriends = useMemo(() => {
    const taken = new Set(
      players.map((p) => p.userId).filter(Boolean) as string[]
    );
    return friends.filter((f) => !taken.has(f.id));
  }, [friends, players]);

  function updatePlayer(key: string, patch: Partial<DraftPlayer>) {
    setPlayers((prev) =>
      prev.map((p) => (p.key === key ? { ...p, ...patch } : p))
    );
  }

  function addGuest() {
    setPlayers((prev) => [
      ...prev,
      {
        key: newKey(),
        displayName: "",
        userId: null,
        avatarUrl: null,
        teamName: teams[0] ?? "Team A",
      },
    ]);
  }

  function addFriend(friend: FriendProfile) {
    setPlayers((prev) => [
      ...prev,
      {
        key: newKey(),
        displayName:
          friend.display_name?.trim() || friend.username || "Friend",
        userId: friend.id,
        avatarUrl: friend.avatar_url,
        teamName: teams[prev.length % Math.max(teams.length, 1)] ?? "Team A",
      },
    ]);
    setFriendPickerOpen(false);
  }

  function removePlayer(key: string) {
    setPlayers((prev) => {
      const target = prev.find((p) => p.key === key);
      if (target?.locked) return prev;
      return prev.filter((p) => p.key !== key);
    });
  }

  function updateTeamName(index: number, value: string) {
    setTeams((prev) => {
      const next = [...prev];
      const old = next[index] ?? "";
      next[index] = value;
      setPlayers((playersPrev) =>
        playersPrev.map((p) =>
          p.teamName === old ? { ...p, teamName: value } : p
        )
      );
      return next;
    });
  }

  function addTeam() {
    setTeams((prev) => [...prev, `Team ${String.fromCharCode(65 + prev.length)}`]);
  }

  function removeTeam(index: number) {
    setTeams((prev) => {
      if (prev.length <= 2) return prev;
      const removed = prev[index];
      const next = prev.filter((_, i) => i !== index);
      const fallback = next[0] ?? "Team A";
      setPlayers((playersPrev) =>
        playersPrev.map((p) =>
          p.teamName === removed ? { ...p, teamName: fallback } : p
        )
      );
      return next;
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedGameId) {
      setError("Please select a game");
      return;
    }

    const trimmed = players
      .map((p) => ({
        ...p,
        displayName: p.displayName.trim(),
      }))
      .filter((p) => p.displayName);

    if (trimmed.length === 0) {
      setError("Add at least one player");
      return;
    }

    if (teamMode) {
      const teamNames = teams.map((t) => t.trim()).filter(Boolean);
      if (teamNames.length < 2) {
        setError("Team mode needs at least 2 named teams");
        return;
      }
      if (trimmed.some((p) => !p.teamName.trim())) {
        setError("Assign every player to a team");
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const { createSessionOfflineAware } = await import(
        "@/lib/offline/mutations"
      );
      const { session } = await createSessionOfflineAware({
        title,
        sessionDate: new Date(sessionDate).toISOString(),
        location: location || null,
        notes: notes || null,
        gameId: selectedGameId,
        scoringMode: teamMode ? "team" : "individual",
        teams: teamMode ? teams.map((t) => t.trim()).filter(Boolean) : [],
        players: trimmed.map((p) => ({
          displayName: p.displayName,
          userId: p.userId,
          teamName: teamMode ? p.teamName.trim() : null,
        })),
      });
      router.push(`/sessions/${session.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create session");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <BackLink
          href={presetGameId ? `/games/${presetGameId}` : "/sessions"}
          label={presetGameId ? "Back to Game" : "Back to Sessions"}
        />
        <h2 className="mb-1 font-[family-name:var(--font-headline)] text-2xl font-semibold text-primary md:text-[32px]">
          New Session
        </h2>
        <p className="text-on-surface-variant">
          Plan a game night and track scores afterward.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="card-shadow flex flex-col gap-6 rounded-xl border border-secondary/10 bg-surface p-6 md:p-8"
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-on-surface-variant">Title</span>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-md bg-surface-container px-3 py-2 outline-none ring-primary focus:ring-1"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-on-surface-variant">
              Date & time
            </span>
            <input
              required
              type="datetime-local"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              className="rounded-md bg-surface-container px-3 py-2 outline-none ring-primary focus:ring-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-on-surface-variant">Location</span>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Home, café…"
              className="rounded-md bg-surface-container px-3 py-2 outline-none ring-primary focus:ring-1"
            />
          </label>
        </div>

        <div className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-on-surface-variant">Game</span>
          <GameSelect
            games={games}
            value={selectedGameId}
            onChange={setSelectedGameId}
          />
        </div>

        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={teamMode}
            onChange={(e) => setTeamMode(e.target.checked)}
            className="size-4"
          />
          <span className="font-semibold text-on-surface-variant">
            Team scoring (one score per team)
          </span>
        </label>

        {teamMode && (
          <div className="flex flex-col gap-2 rounded-lg bg-surface-container-low p-4 text-sm">
            <span className="font-semibold text-on-surface-variant">Teams</span>
            {teams.map((team, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  value={team}
                  onChange={(e) => updateTeamName(index, e.target.value)}
                  className="min-w-0 flex-1 rounded-md bg-surface px-3 py-2 outline-none ring-primary focus:ring-1"
                />
                <button
                  type="button"
                  onClick={() => removeTeam(index)}
                  disabled={teams.length <= 2}
                  aria-label={`Remove ${team}`}
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-on-surface-variant hover:bg-error-container/40 hover:text-error disabled:opacity-40"
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addTeam}
              className="inline-flex items-center gap-1.5 self-start rounded-md px-2 py-2 text-sm font-semibold text-primary hover:bg-surface"
            >
              <Plus className="size-4" />
              Add team
            </button>
          </div>
        )}

        <div className="flex flex-col gap-2 text-sm">
          <span className="font-semibold text-on-surface-variant">Players</span>
          {!selfReady ? (
            <p className="text-on-surface-variant">Loading your profile…</p>
          ) : (
            <div className="space-y-2">
              {players.map((player) => (
                <div
                  key={player.key}
                  className="flex flex-wrap items-center gap-2 rounded-lg bg-surface-container-low p-2"
                >
                  {player.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={player.avatarUrl}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="size-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex size-8 items-center justify-center rounded-full bg-primary-container text-[10px] font-semibold text-on-primary-container">
                      {(player.displayName || "?").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  {player.userId ? (
                    <span className="min-w-0 flex-1 font-medium text-on-surface">
                      {player.displayName}
                      {player.locked ? (
                        <span className="ml-2 text-xs font-normal text-on-surface-variant">
                          (you)
                        </span>
                      ) : null}
                    </span>
                  ) : (
                    <input
                      value={player.displayName}
                      onChange={(e) =>
                        updatePlayer(player.key, {
                          displayName: e.target.value,
                        })
                      }
                      placeholder="Guest name"
                      className="min-w-0 flex-1 rounded-md bg-surface px-3 py-2 outline-none ring-primary focus:ring-1"
                    />
                  )}
                  {teamMode && (
                    <select
                      value={player.teamName}
                      onChange={(e) =>
                        updatePlayer(player.key, { teamName: e.target.value })
                      }
                      className="rounded-md bg-surface px-2 py-2 outline-none ring-primary focus:ring-1"
                    >
                      {teams.map((team) => (
                        <option key={team} value={team}>
                          {team}
                        </option>
                      ))}
                    </select>
                  )}
                  {!player.locked ? (
                    <button
                      type="button"
                      onClick={() => removePlayer(player.key)}
                      aria-label="Remove player"
                      className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-on-surface-variant hover:bg-error-container/40 hover:text-error"
                    >
                      <X className="size-4" />
                    </button>
                  ) : (
                    <span className="size-9" />
                  )}
                </div>
              ))}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={addGuest}
                  className="inline-flex items-center gap-1.5 rounded-md px-2 py-2 text-sm font-semibold text-primary hover:bg-surface-container"
                >
                  <Plus className="size-4" />
                  Add guest
                </button>
                <button
                  type="button"
                  onClick={() => setFriendPickerOpen((v) => !v)}
                  disabled={availableFriends.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-md px-2 py-2 text-sm font-semibold text-primary hover:bg-surface-container disabled:opacity-40"
                >
                  <UserPlus className="size-4" />
                  Add friend
                </button>
              </div>
              {friendPickerOpen && availableFriends.length > 0 && (
                <ul className="mt-1 max-h-48 overflow-y-auto rounded-lg border border-outline-variant/20 bg-surface">
                  {availableFriends.map((friend) => {
                    const name =
                      friend.display_name?.trim() ||
                      friend.username ||
                      "Friend";
                    return (
                      <li key={friend.id}>
                        <button
                          type="button"
                          onClick={() => addFriend(friend)}
                          className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-surface-container"
                        >
                          {friend.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={friend.avatar_url}
                              alt=""
                              referrerPolicy="no-referrer"
                              className="size-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex size-8 items-center justify-center rounded-full bg-primary-container text-[10px] font-semibold text-on-primary-container">
                              {name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <span className="text-sm font-medium text-on-surface">
                            {name}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              {friends.length === 0 && (
                <p className="text-xs text-on-surface-variant">
                  <Users className="mr-1 inline size-3.5" />
                  Add friends from the Friends page to invite them here.
                </p>
              )}
            </div>
          )}
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-on-surface-variant">Notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="rounded-md bg-surface-container px-3 py-2 outline-none ring-primary focus:ring-1"
          />
        </label>

        {error && (
          <p className="rounded-md bg-error-container px-3 py-2 text-sm text-on-error-container">
            {error}
          </p>
        )}

        <div className="flex md:justify-end">
          <button
            type="submit"
            disabled={loading || !selectedGameId || !selfReady}
            className="w-full rounded-lg bg-primary px-5 py-3 font-bold text-on-primary disabled:opacity-60 md:w-auto"
          >
            {loading ? "Creating…" : "Create session"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NewSessionPage() {
  return (
    <Suspense fallback={<div className="text-on-surface-variant">Loading…</div>}>
      <NewSessionForm />
    </Suspense>
  );
}
