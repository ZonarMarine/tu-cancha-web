import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }

  const url     = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const svcKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !svcKey || svcKey === "PASTE_YOUR_SERVICE_ROLE_KEY_HERE") {
    // Key not configured — return empty so the UI doesn't explode
    console.warn("[search-players] SUPABASE_SERVICE_ROLE_KEY not set");
    return NextResponse.json([]);
  }

  // Lazy-create the admin client so the module loads even without the key
  const supabaseAdmin = createClient(url, svcKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, name, stat_atk, stat_def, stat_str, stat_skl, avatar_url")
    .ilike("name", `%${q}%`)
    .limit(12);

  if (error) {
    console.error("[search-players]", error.message);
    return NextResponse.json([], { status: 200 });
  }

  return NextResponse.json(data ?? []);
}
