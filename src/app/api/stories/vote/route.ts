import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createAnonClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return json({ error: "Not authenticated" }, 401);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !serviceKey) return json({ error: "Server config missing" }, 503);

  // Verify the user token
  const anonDb = createAnonClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data: { user }, error: authErr } = await anonDb.auth.getUser(token);
  if (authErr || !user) return json({ error: "Invalid token" }, 401);

  const body = await request.json().catch(() => null);
  const storyId = String(body?.story_id ?? "").trim();
  const vote = Boolean(body?.vote); // true = upvote, false = remove
  if (!storyId) return json({ error: "story_id required" }, 400);

  const db = createClient(url, serviceKey);

  if (vote) {
    await db.from("story_votes").upsert({ story_id: storyId, user_id: user.id }, { onConflict: "story_id,user_id" });
  } else {
    await db.from("story_votes").delete().eq("story_id", storyId).eq("user_id", user.id);
  }

  // Sync the upvotes count back to stories table
  const { count } = await db
    .from("story_votes")
    .select("*", { count: "exact", head: true })
    .eq("story_id", storyId);

  await db.from("stories").update({ upvotes: count ?? 0 }).eq("id", storyId);

  return json({ ok: true, upvotes: count ?? 0 });
}
