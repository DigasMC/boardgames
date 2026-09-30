"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Plus, UserPlus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type {
  FriendProfile,
  SessionPlayer,
  SessionPlayerInput,
  SessionTeam,
} from "@/types/database";

type DraftPlayer = {
  key: string;
  existingId: string | null;
  displayName: string;
  userId: string | null;
  avatarUrl: string | null;
  teamName: string;
};

type LinkableAccount = FriendProfile & { isSelf?: boolean };

function newKey() {
  return crypto.randomUUID();
}

function playersFromSession(
  players: SessionPlayer[],
  teams: SessionTeam[],
  teamMode: boolean
): DraftPlayer[] {
  const teamNameById = new Map(teams.map((t) => [t.id, t.name]));
  const defaultTeam = teams[0]?.name ?? "Team A";
  return players.map((p) => ({
    key: p.id,
    existingId: p.id,
    displayName: p.display_name,
    userId: p.user_id,
    avatarUrl: p.profile?.avatar_url ?? null,
    teamName: teamMode
      ? (p.team_id ? (teamNameById.get(p.team_id) ?? defaultTeam) : defaultTeam)
      : defaultTeam,
  }));
}

function accountLabel(account: LinkableAccount) {
  if (account.isSelf) {
    return `You (${account.display_name?.trim() || account.username || "me"})`;
  }
  return account.display_name?.trim() || account.username || "Friend";
}

export function SessionRosterEditor({
  initialPlayers,
  initialTeams,
  initialTeamMode,
  onSave,
  onCancel,
  busy,
  error,
}: {
  initialPlayers: SessionPlayer[];
  initialTeams: SessionTeam[];
  initialTeamMode: boolean;
  onSave: (payload: {
    scoringMode: "individual" | "team";
    teams: string[];
    players: SessionPlayerInput[];
  }) => Promise<void>;
  onCancel: () => void;
  busy?: boolean;
  error?: string | null;
}) {
  const [teamMode, setTeamMode] = useState(initialTeamMode);
  const [teams, setTeams] = useState<string[]>(() =>
    initialTeams.length >= 2
      ? [...initialTeams]
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((t) => t.name)
      : ["Team A", "Team B"]
  );
  const [players, setPlayers] = useState<DraftPlayer[]>(() =>
    playersFromSession(initialPlayers, initialTeams, initialTeamMode)
  );
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [selfAccount, setSelfAccount] = useState<LinkableAccount | null>(null);
  const [friendPickerOpen, setFriendPickerOpen] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user && !cancelled) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, username, display_name, avatar_url")
            .eq("id", user.id)
            .maybeSingle();
          if (profile && !cancelled) {
            setSelfAccount({
              id: profile.id,
              username: profile.username,
              display_name: profile.display_name,
              avatar_url: profile.avatar_url,
              isSelf: true,
            });
          }
        }
      } catch {
        // optional
      }

      try {
        const res = await fetch("/api/friends");
        const data = await res.json();
        if (res.ok && !cancelled) {
          setFriends((data.friends ?? []) as FriendProfile[]);
        }
      } catch {
        // optional
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const takenUserIds = useMemo(
    () => new Set(players.map((p) => p.userId).filter(Boolean) as string[]),
    [players]
  );

  const selfAvailable =
    selfAccount && !takenUserIds.has(selfAccount.id) ? selfAccount : null;

  const availableFriends = useMemo(
    () => friends.filter((f) => !takenUserIds.has(f.id)),
    [friends, takenUserIds]
  );

  const linkableAccounts = useMemo(() => {
    const list: LinkableAccount[] = [];
    if (selfAvailable) list.push(selfAvailable);
    list.push(...availableFriends);
    return list;
  }, [selfAvailable, availableFriends]);

  function updatePlayer(key: string, patch: Partial<DraftPlayer>) {
    setPlayers((prev) =>
      prev.map((p) => (p.key === key ? { ...p, ...patch } : p))
    );
  }

  function linkAccount(key: string, account: LinkableAccount) {
    updatePlayer(key, {
      userId: account.id,
      displayName:
        account.display_name?.trim() ||
        account.username ||
        (account.isSelf ? "You" : "Friend"),
      avatarUrl: account.avatar_url,
    });
  }

  function unlinkAccount(key: string) {
    updatePlayer(key, { userId: null, avatarUrl: null });
  }

  function addGuest() {
    setPlayers((prev) => [
      ...prev,
      {
        key: newKey(),
        existingId: null,
        displayName: "",
        userId: null,
        avatarUrl: null,
        teamName: teams[0] ?? "Team A",
      },
    ]);
  }

  function addAccount(account: LinkableAccount) {
    setPlayers((prev) => [
      ...prev,
      {
        key: newKey(),
        existingId: null,
        displayName:
          account.display_name?.trim() ||
          account.username ||
          (account.isSelf ? "You" : "Friend"),
        userId: account.id,
        avatarUrl: account.avatar_url,
        teamName: teams[prev.length % Math.max(teams.length, 1)] ?? "Team A",
      },
    ]);
    setFriendPickerOpen(false);
  }

  function removePlayer(key: string) {
    setPlayers((prev) => {
      if (prev.length <= 1) return prev;
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
    setTeams((prev) => [
      ...prev,
      `Team ${String.fromCharCode(65 + prev.length)}`,
    ]);
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
    setLocalError(null);
    const trimmed = players
      .map((p) => ({
        ...p,
        displayName: p.displayName.trim(),
      }))
      .filter((p) => p.displayName);

    if (trimmed.length === 0) {
      setLocalError("Add at least one player");
      return;
    }

    const teamNames = teams.map((t) => t.trim()).filter(Boolean);
    if (teamMode) {
      if (teamNames.length < 2) {
        setLocalError("Team mode needs at least 2 named teams");
        return;
      }
      if (trimmed.some((p) => !p.teamName.trim())) {
        setLocalError("Assign every player to a team");
        return;
      }
    }

    await onSave({
      scoringMode: teamMode ? "team" : "individual",
      teams: teamMode ? teamNames : [],
      players: trimmed.map((p) => ({
        id: p.existingId,
        displayName: p.displayName,
        userId: p.userId,
        teamName: teamMode ? p.teamName.trim() : null,
      })),
    });
  }

  const displayError = localError || error;

  return (
    <form
      onSubmit={onSubmit}
      className="card-shadow flex flex-col gap-5 rounded-xl border border-secondary/10 bg-surface p-6"
    >
      <div>
        <h3 className="font-[family-name:var(--font-headline)] text-xl font-semibold text-primary">
          Edit players & teams
        </h3>
        <p className="mt-1 text-sm text-on-surface-variant">
          Link guests to yourself or friends, rearrange teams, or switch scoring
          mode. Scores are kept: linking accounts keeps seat scores; switching
          to teams sums each team&apos;s member scores; switching to individual
          copies each team score onto its members.
        </p>
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
        <div className="space-y-2">
          {players.map((player) => {
            const linkedSelf = Boolean(
              selfAccount && player.userId === selfAccount.id
            );
            return (
              <div
                key={player.key}
                className="flex flex-col gap-2 rounded-lg bg-surface-container-low p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
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
                  <input
                    value={player.displayName}
                    onChange={(e) =>
                      updatePlayer(player.key, {
                        displayName: e.target.value,
                      })
                    }
                    placeholder="Player name"
                    className="min-w-0 flex-1 rounded-md bg-surface px-3 py-2 outline-none ring-primary focus:ring-1"
                  />
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
                  <button
                    type="button"
                    onClick={() => removePlayer(player.key)}
                    disabled={players.length <= 1}
                    aria-label="Remove player"
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-on-surface-variant hover:bg-error-container/40 hover:text-error disabled:opacity-40"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2 pl-10">
                  {player.userId ? (
                    <>
                      <span className="text-xs font-medium text-primary">
                        {linkedSelf
                          ? "Linked to your account"
                          : "Linked to friend account"}
                      </span>
                      <button
                        type="button"
                        onClick={() => unlinkAccount(player.key)}
                        className="text-xs font-semibold text-on-surface-variant hover:text-error"
                      >
                        Unlink
                      </button>
                    </>
                  ) : linkableAccounts.length > 0 ? (
                    <label className="flex items-center gap-2 text-xs text-on-surface-variant">
                      <span>Link account:</span>
                      <select
                        defaultValue=""
                        onChange={(e) => {
                          const account = linkableAccounts.find(
                            (a) => a.id === e.target.value
                          );
                          if (account) linkAccount(player.key, account);
                        }}
                        className="rounded-md bg-surface px-2 py-1 outline-none ring-primary focus:ring-1"
                      >
                        <option value="" disabled>
                          Choose…
                        </option>
                        {linkableAccounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {accountLabel(account)}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <span className="text-xs text-on-surface-variant">
                      Guest (no linked account)
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={addGuest}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-2 text-sm font-semibold text-primary hover:bg-surface-container"
            >
              <Plus className="size-4" />
              Add guest
            </button>
            {selfAvailable ? (
              <button
                type="button"
                onClick={() => addAccount(selfAvailable)}
                className="inline-flex items-center gap-1.5 rounded-md px-2 py-2 text-sm font-semibold text-primary hover:bg-surface-container"
              >
                <UserPlus className="size-4" />
                Add myself
              </button>
            ) : null}
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
            <ul className="max-h-48 overflow-y-auto rounded-lg border border-outline-variant/20 bg-surface">
              {availableFriends.map((friend) => {
                const name =
                  friend.display_name?.trim() || friend.username || "Friend";
                return (
                  <li key={friend.id}>
                    <button
                      type="button"
                      onClick={() => addAccount(friend)}
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
        </div>
      </div>

      {displayError && (
        <p className="rounded-md bg-error-container px-3 py-2 text-sm text-on-error-container">
          {displayError}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-primary px-5 py-3 font-bold text-on-primary disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save roster"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="rounded-lg border border-secondary/20 px-5 py-3 font-bold text-on-surface-variant disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
