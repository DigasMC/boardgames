"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Search, UserPlus, X } from "lucide-react";
import type {
  FriendProfile,
  Friendship,
  UserSearchResult,
} from "@/types/database";

type FriendsPayload = {
  friends: Array<FriendProfile & { friendship_id: string }>;
  incoming: Array<Friendship & { from: FriendProfile }>;
  outgoing: Array<Friendship & { to: FriendProfile }>;
};

function Avatar({
  name,
  avatarUrl,
  size = "md",
}: {
  name: string;
  avatarUrl: string | null;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "size-8 text-[10px]" : "size-10 text-xs";
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        referrerPolicy="no-referrer"
        className={`${dim} shrink-0 rounded-full object-cover`}
      />
    );
  }
  return (
    <div
      className={`flex ${dim} shrink-0 items-center justify-center rounded-full bg-primary-container font-semibold text-on-primary-container`}
    >
      {(name || "?").slice(0, 2).toUpperCase()}
    </div>
  );
}

function labelFor(user: {
  display_name: string | null;
  username: string | null;
}) {
  return user.display_name?.trim() || user.username || "Player";
}

export function FriendsView() {
  const [data, setData] = useState<FriendsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/friends");
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Failed to load friends");
    setData(json as FriendsPayload);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await load();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const handle = window.setTimeout(() => {
      void (async () => {
        setSearching(true);
        try {
          const res = await fetch(
            `/api/users/search?q=${encodeURIComponent(q)}`
          );
          const json = await res.json();
          if (res.ok) setResults((json.users ?? []) as UserSearchResult[]);
        } finally {
          setSearching(false);
        }
      })();
    }, 250);
    return () => window.clearTimeout(handle);
  }, [query]);

  async function sendRequest(userId: string) {
    setBusyId(userId);
    setError(null);
    try {
      const res = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Request failed");
      await load();
      setQuery("");
      setResults([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusyId(null);
    }
  }

  async function respond(friendshipId: string, action: "accept" | "decline") {
    setBusyId(friendshipId);
    setError(null);
    try {
      const res = await fetch("/api/friends", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendshipId, action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusyId(null);
    }
  }

  async function removeFriendship(friendshipId: string) {
    setBusyId(friendshipId);
    setError(null);
    try {
      const res = await fetch(
        `/api/friends?id=${encodeURIComponent(friendshipId)}`,
        { method: "DELETE" }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusyId(null);
    }
  }

  if (!data && !error) {
    return <p className="text-on-surface-variant">Loading friends…</p>;
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <div>
        <h1 className="font-[family-name:var(--font-headline)] text-3xl font-bold text-primary md:text-4xl">
          Friends
        </h1>
        <p className="mt-2 text-on-surface-variant">
          Find people by username, name, or email and connect for game nights.
        </p>
      </div>

      {error && (
        <p className="rounded-md bg-error-container px-3 py-2 text-sm text-on-error-container">
          {error}
        </p>
      )}

      <div className="card-shadow rounded-xl border border-secondary/10 bg-surface p-6">
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-semibold text-on-surface-variant">
            Find people
          </span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-on-surface-variant" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search username, name, or email"
              className="w-full rounded-md bg-surface-container py-2 pl-10 pr-3 outline-none ring-primary focus:ring-1"
            />
          </div>
        </label>
        {searching && (
          <p className="mt-3 text-xs text-on-surface-variant">Searching…</p>
        )}
        {results.length > 0 && (
          <ul className="mt-4 divide-y divide-outline-variant/20">
            {results.map((user) => {
              const name = labelFor(user);
              const status = user.friendship_status;
              return (
                <li
                  key={user.id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <Link
                    href={user.username ? `/u/${user.username}` : "#"}
                    className="flex min-w-0 items-center gap-3"
                  >
                    <Avatar name={name} avatarUrl={user.avatar_url} />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-on-surface">
                        {name}
                      </p>
                      {user.username ? (
                        <p className="truncate text-xs text-on-surface-variant">
                          @{user.username}
                        </p>
                      ) : null}
                    </div>
                  </Link>
                  {status === "accepted" ? (
                    <span className="text-xs font-semibold text-primary">
                      Friends
                    </span>
                  ) : status === "pending" ? (
                    <span className="text-xs text-on-surface-variant">
                      {user.is_requester ? "Pending" : "Incoming"}
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={busyId === user.id}
                      onClick={() => sendRequest(user.id)}
                      className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-on-primary disabled:opacity-60"
                    >
                      <UserPlus className="size-3.5" />
                      Add
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {(data?.incoming.length ?? 0) > 0 && (
        <section className="card-shadow rounded-xl border border-secondary/10 bg-surface p-6">
          <h2 className="font-[family-name:var(--font-headline)] text-xl font-semibold text-primary">
            Incoming requests
          </h2>
          <ul className="mt-4 space-y-3">
            {data!.incoming.map((req) => {
              const name = labelFor(req.from);
              return (
                <li
                  key={req.id}
                  className="flex flex-wrap items-center justify-between gap-3"
                >
                  <Link
                    href={req.from.username ? `/u/${req.from.username}` : "#"}
                    className="flex min-w-0 items-center gap-3"
                  >
                    <Avatar name={name} avatarUrl={req.from.avatar_url} />
                    <span className="font-medium text-on-surface">{name}</span>
                  </Link>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busyId === req.id}
                      onClick={() => respond(req.id, "accept")}
                      className="rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-on-primary disabled:opacity-60"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      disabled={busyId === req.id}
                      onClick={() => respond(req.id, "decline")}
                      className="rounded-md px-3 py-1.5 text-xs font-bold text-on-surface-variant hover:bg-surface-container-high disabled:opacity-60"
                    >
                      Decline
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {(data?.outgoing.length ?? 0) > 0 && (
        <section className="card-shadow rounded-xl border border-secondary/10 bg-surface p-6">
          <h2 className="font-[family-name:var(--font-headline)] text-xl font-semibold text-primary">
            Sent requests
          </h2>
          <ul className="mt-4 space-y-3">
            {data!.outgoing.map((req) => {
              const name = labelFor(req.to);
              return (
                <li
                  key={req.id}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={name} avatarUrl={req.to.avatar_url} />
                    <span className="font-medium text-on-surface">{name}</span>
                  </div>
                  <button
                    type="button"
                    disabled={busyId === req.id}
                    onClick={() => removeFriendship(req.id)}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-bold text-on-surface-variant hover:bg-error-container/40 hover:text-error disabled:opacity-60"
                  >
                    <X className="size-3.5" />
                    Cancel
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="card-shadow rounded-xl border border-secondary/10 bg-surface p-6">
        <h2 className="font-[family-name:var(--font-headline)] text-xl font-semibold text-primary">
          Your friends
        </h2>
        {(data?.friends.length ?? 0) === 0 ? (
          <p className="mt-3 text-sm text-on-surface-variant">
            No friends yet. Search above to send a request.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-outline-variant/20">
            {data!.friends.map((friend) => {
              const name = labelFor(friend);
              return (
                <li
                  key={friend.id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <Link
                    href={friend.username ? `/u/${friend.username}` : "#"}
                    className="flex min-w-0 items-center gap-3"
                  >
                    <Avatar name={name} avatarUrl={friend.avatar_url} />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-on-surface">
                        {name}
                      </p>
                      {friend.username ? (
                        <p className="text-xs text-on-surface-variant">
                          @{friend.username}
                        </p>
                      ) : null}
                    </div>
                  </Link>
                  <button
                    type="button"
                    disabled={busyId === friend.friendship_id}
                    onClick={() => removeFriendship(friend.friendship_id)}
                    className="rounded-md px-2 py-1.5 text-xs font-bold text-on-surface-variant hover:bg-error-container/40 hover:text-error disabled:opacity-60"
                  >
                    Unfriend
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
