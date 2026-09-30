import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    displayName?: unknown;
    bggUsername?: unknown;
    username?: unknown;
    isPublic?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const hasDisplayName = "displayName" in body;
  const hasBggUsername = "bggUsername" in body;
  const hasUsername = "username" in body;
  const hasIsPublic = "isPublic" in body;

  if (!hasDisplayName && !hasBggUsername && !hasUsername && !hasIsPublic) {
    return NextResponse.json(
      { error: "Nothing to update" },
      { status: 400 }
    );
  }

  const updates: {
    display_name?: string;
    bgg_username?: string | null;
    username?: string;
    is_public?: boolean;
    updated_at: string;
  } = {
    updated_at: new Date().toISOString(),
  };

  if (hasDisplayName) {
    const displayName =
      typeof body.displayName === "string" ? body.displayName.trim() : "";
    if (!displayName) {
      return NextResponse.json(
        { error: "Display name is required" },
        { status: 400 }
      );
    }
    updates.display_name = displayName;
  }

  if (hasBggUsername) {
    const bggUsername =
      typeof body.bggUsername === "string" ? body.bggUsername.trim() : "";
    updates.bgg_username = bggUsername || null;
  }

  if (hasUsername) {
    const username =
      typeof body.username === "string"
        ? body.username.trim().toLowerCase()
        : "";
    if (!USERNAME_RE.test(username)) {
      return NextResponse.json(
        {
          error:
            "Username must be 3–20 characters: lowercase letters, numbers, underscores",
        },
        { status: 400 }
      );
    }
    updates.username = username;
  }

  if (hasIsPublic) {
    if (typeof body.isPublic !== "boolean") {
      return NextResponse.json(
        { error: "isPublic must be a boolean" },
        { status: 400 }
      );
    }
    updates.is_public = body.isPublic;
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id)
    .select(
      "id, display_name, avatar_url, bgg_username, username, is_public, created_at, updated_at"
    )
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Username is already taken" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: data });
}
