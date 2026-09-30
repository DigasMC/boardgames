import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { FriendProfile, Friendship } from "@/types/database";

type FriendshipRow = Friendship & {
  requester: FriendProfile | FriendProfile[] | null;
  addressee: FriendProfile | FriendProfile[] | null;
};

function asProfile(
  value: FriendProfile | FriendProfile[] | null
): FriendProfile | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("friendships")
    .select(
      `
      id, requester_id, addressee_id, status, created_at, updated_at,
      requester:profiles!friendships_requester_id_fkey(id, username, display_name, avatar_url),
      addressee:profiles!friendships_addressee_id_fkey(id, username, display_name, avatar_url)
    `
    )
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
    .in("status", ["pending", "accepted"])
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as FriendshipRow[];
  const friends: Array<FriendProfile & { friendship_id: string }> = [];
  const incoming: Array<Friendship & { from: FriendProfile }> = [];
  const outgoing: Array<Friendship & { to: FriendProfile }> = [];

  for (const row of rows) {
    const requester = asProfile(row.requester);
    const addressee = asProfile(row.addressee);
    if (row.status === "accepted") {
      const other =
        row.requester_id === user.id ? addressee : requester;
      if (other) friends.push({ ...other, friendship_id: row.id });
      continue;
    }
    if (row.status === "pending") {
      if (row.addressee_id === user.id && requester) {
        incoming.push({
          id: row.id,
          requester_id: row.requester_id,
          addressee_id: row.addressee_id,
          status: row.status,
          created_at: row.created_at,
          updated_at: row.updated_at,
          from: requester,
        });
      } else if (row.requester_id === user.id && addressee) {
        outgoing.push({
          id: row.id,
          requester_id: row.requester_id,
          addressee_id: row.addressee_id,
          status: row.status,
          created_at: row.created_at,
          updated_at: row.updated_at,
          to: addressee,
        });
      }
    }
  }

  return NextResponse.json({ friends, incoming, outgoing });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: me } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  if (!me?.username) {
    return NextResponse.json(
      { error: "Set a username on your profile before sending friend requests" },
      { status: 400 }
    );
  }

  let body: { userId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }
  if (userId === user.id) {
    return NextResponse.json(
      { error: "Cannot friend yourself" },
      { status: 400 }
    );
  }

  const { data: target } = await supabase
    .from("profiles")
    .select("id, username")
    .eq("id", userId)
    .maybeSingle();

  if (!target?.username) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { data: existing } = await supabase
    .from("friendships")
    .select("id, requester_id, addressee_id, status")
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${user.id})`
    )
    .maybeSingle();

  if (existing) {
    if (existing.status === "accepted") {
      return NextResponse.json({ error: "Already friends" }, { status: 400 });
    }
    if (existing.status === "pending") {
      return NextResponse.json(
        { error: "Friend request already pending" },
        { status: 400 }
      );
    }
    // Re-request after decline: update row
    const { data: updated, error } = await supabase
      .from("friendships")
      .update({
        requester_id: user.id,
        addressee_id: userId,
        status: "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ friendship: updated });
  }

  const { data, error } = await supabase
    .from("friendships")
    .insert({
      requester_id: user.id,
      addressee_id: userId,
      status: "pending",
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ friendship: data });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { friendshipId?: unknown; action?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const friendshipId =
    typeof body.friendshipId === "string" ? body.friendshipId.trim() : "";
  const action = typeof body.action === "string" ? body.action.trim() : "";

  if (!friendshipId || !["accept", "decline"].includes(action)) {
    return NextResponse.json(
      { error: "friendshipId and action (accept|decline) required" },
      { status: 400 }
    );
  }

  const { data: row } = await supabase
    .from("friendships")
    .select("*")
    .eq("id", friendshipId)
    .eq("addressee_id", user.id)
    .eq("status", "pending")
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("friendships")
    .update({
      status: action === "accept" ? "accepted" : "declined",
      updated_at: new Date().toISOString(),
    })
    .eq("id", friendshipId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ friendship: data });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const friendshipId = new URL(request.url).searchParams.get("id");
  if (!friendshipId) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("friendships")
    .delete()
    .eq("id", friendshipId)
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
