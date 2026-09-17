import { NextResponse } from "next/server";
import { fetchBggThing } from "@/lib/bgg/client";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    const game = await fetchBggThing(id);
    return NextResponse.json({ game });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "BGG lookup failed" },
      { status: 502 }
    );
  }
}
