import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { displayName?: unknown; bggUsername?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const hasDisplayName = "displayName" in body;
  const hasBggUsername = "bggUsername" in body;

  if (!hasDisplayName && !hasBggUsername) {
    return NextResponse.json(
      { error: "Nothing to update" },
      { status: 400 }
    );
  }

  const updates: {
    display_name?: string;
    bgg_username?: string | null;
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

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id)
    .select(
      "id, display_name, avatar_url, bgg_username, created_at, updated_at"
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: data });
}
