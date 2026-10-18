// Keep-alive for the Supabase free tier, which pauses a project after ~7 days
// without database traffic (sign-in + sync then fail until it's restored by
// hand). A daily Vercel cron (vercel.json) hits this route; one trivial read
// against user_state is enough to count as activity. RLS keeps it owner-only,
// so the anon key sees zero rows — nothing is exposed.

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const db = supabase();
  if (!db) return NextResponse.json({ ok: false, error: "no_supabase_env" }, { status: 503 });

  const { error } = await db.from("user_state").select("user_id", { head: true, count: "exact" }).limit(1);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 502 });
  return NextResponse.json({ ok: true, at: new Date().toISOString() });
}
