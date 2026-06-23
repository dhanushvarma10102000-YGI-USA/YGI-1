import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

async function getAuthenticatedUser(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!jwt) return null;
  const client = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false },
  });
  const { data } = await client.auth.getUser();
  return data?.user ?? null;
}

async function isGlobalModerator(userId: string): Promise<boolean> {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data } = await admin
    .from("community_moderators")
    .select("email")
    .eq("enabled", true)
    .limit(200);
  if (!data) return false;

  const adminClient2 = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: userRow } = await adminClient2.auth.admin.getUserById(userId);
  const email = (userRow?.user?.email || "").toLowerCase().trim();
  return data.some((row) => (row.email || "").toLowerCase().trim() === email);
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return json({ error: "Not authenticated." }, 401);

  const isMod = await isGlobalModerator(user.id);
  if (!isMod) return json({ error: "Moderator access required." }, 403);

  const body = await request.json().catch(() => null);
  const action = String(body?.action || "");
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    if (action === "set_role") {
      const groupId = String(body?.group_id || "").trim();
      const targetUserId = String(body?.user_id || "").trim();
      const role = String(body?.role || "").trim();
      if (!groupId || !targetUserId || !["member", "admin"].includes(role)) {
        return json({ error: "group_id, user_id, and role (member|admin) are required." }, 400);
      }
      const { error } = await admin
        .from("community_memberships")
        .update({ role })
        .eq("group_id", groupId)
        .eq("user_id", targetUserId);
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === "remove") {
      const groupId = String(body?.group_id || "").trim();
      const targetUserId = String(body?.user_id || "").trim();
      if (!groupId || !targetUserId) {
        return json({ error: "group_id and user_id are required." }, 400);
      }
      const { error } = await admin
        .from("community_memberships")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", targetUserId);
      if (error) throw error;
      // Sync member_count
      const { count } = await admin
        .from("community_memberships")
        .select("*", { count: "exact", head: true })
        .eq("group_id", groupId);
      await admin
        .from("community_groups")
        .update({ member_count: count ?? 0 })
        .eq("id", groupId);
      return json({ ok: true });
    }

    return json({ error: "Unknown action." }, 400);
  } catch (err: any) {
    return json({ error: err?.message || "Moderation action failed." }, 502);
  }
}
