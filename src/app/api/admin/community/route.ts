import { NextResponse } from "next/server";
import { requireAdminDashboard } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function serviceHeaders(extra?: HeadersInit) {
  if (!SUPABASE_SERVICE_ROLE_KEY) return null;
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    ...extra,
  };
}

function configError() {
  return NextResponse.json(
    { error: "Missing Supabase server environment variables." },
    { status: 503, headers: { "Cache-Control": "no-store" } }
  );
}

function adminJson(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

async function restSelect(table: string, query = "select=*") {
  const headers = serviceHeaders();
  if (!SUPABASE_URL || !headers) throw new Error("Missing Supabase config");

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers,
    cache: "no-store",
  });

  if (!res.ok) return [];
  return res.json();
}

async function restMutation(table: string, init: RequestInit, query = "") {
  const headers = serviceHeaders({
    "Content-Type": "application/json",
    Prefer: "return=representation",
    ...(init.headers || {}),
  });
  if (!SUPABASE_URL || !headers) throw new Error("Missing Supabase config");

  const suffix = query ? `?${query}` : "";
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${suffix}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${table} failed (${res.status}): ${text.slice(0, 180)}`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function syncGroupMemberCount(groupId: string) {
  const headers = serviceHeaders({ Prefer: "count=exact" });
  if (!SUPABASE_URL || !headers) return;

  const countRes = await fetch(
    `${SUPABASE_URL}/rest/v1/community_memberships?select=*&group_id=eq.${encodeURIComponent(groupId)}`,
    { method: "HEAD", headers, cache: "no-store" }
  );
  const total = countRes.headers.get("content-range")?.split("/")[1];
  const memberCount = total && total !== "*" ? Number(total) : 0;

  await restMutation(
    "community_groups",
    { method: "PATCH", body: JSON.stringify({ member_count: memberCount }) },
    `id=eq.${encodeURIComponent(groupId)}`
  ).catch(() => {});
}

export async function GET(request: Request) {
  const auth = await requireAdminDashboard(request);
  if (!auth.ok) return auth.response;

  const headers = serviceHeaders();
  if (!SUPABASE_URL || !headers) return configError();

  const [groups, members, messages, moderators, channelMessages] = await Promise.all([
    restSelect("community_groups", "select=id,name,description,type,location,member_count,created_by,created_at&order=name.asc"),
    restSelect("community_memberships", "select=group_id,user_id,joined_at,role,display_name,avatar_url&order=joined_at.asc"),
    restSelect("community_messages", "select=id,group_id,author_id,author_name,body,message_type,media_url,file_name,created_at&order=created_at.desc&limit=300"),
    restSelect("community_moderators", "select=email,enabled,created_at&order=email.asc"),
    restSelect("community_channel_messages", "select=id,channel,author_name,body,media_url,group_id,created_at&order=created_at.desc&limit=100"),
  ]);

  return adminJson({ groups, members, messages, moderators, channelMessages });
}

export async function POST(request: Request) {
  const auth = await requireAdminDashboard(request);
  if (!auth.ok) return auth.response;

  const headers = serviceHeaders();
  if (!SUPABASE_URL || !headers) return configError();

  const body = await request.json().catch(() => null);
  const action = String(body?.action || "");

  try {
    if (action === "send_channel") {
      const channel = String(body?.channel || "").trim().toLowerCase();
      const text = String(body?.body || "").trim();
      if (!["general", "announcements"].includes(channel) || !text) {
        return adminJson({ error: "Channel and message are required." }, 400);
      }
      const groupId = String(body?.group_id || "").trim() || null;
      const payload: Record<string, unknown> = {
        channel,
        body: text,
        author_name: String(body?.author_name || "Admin").trim() || "Admin",
      };
      if (groupId) payload.group_id = groupId;
      const rows = await restMutation("community_channel_messages", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      return adminJson({ message: rows?.[0] || null });
    }

    if (action === "add_moderator") {
      const email = String(body?.email || "").trim().toLowerCase();
      if (!email || !email.includes("@")) return adminJson({ error: "Valid email is required." }, 400);
      const rows = await restMutation(
        "community_moderators",
        {
          method: "POST",
          body: JSON.stringify({ email, enabled: true }),
          headers: { Prefer: "resolution=merge-duplicates,return=representation" },
        },
        "on_conflict=email"
      );
      return adminJson({ moderator: rows?.[0] || null });
    }

    if (action === "remove_moderator") {
      const email = String(body?.email || "").trim().toLowerCase();
      if (!email) return adminJson({ error: "Email is required." }, 400);
      await restMutation("community_moderators", { method: "DELETE" }, `email=eq.${encodeURIComponent(email)}`);
      return adminJson({ ok: true });
    }

    if (action === "delete_message") {
      const id = String(body?.id || "").trim();
      if (!id) return adminJson({ error: "Message id is required." }, 400);
      await restMutation("community_messages", { method: "DELETE" }, `id=eq.${encodeURIComponent(id)}`);
      return adminJson({ ok: true });
    }

    if (action === "delete_channel_message") {
      const id = String(body?.id || "").trim();
      if (!id) return adminJson({ error: "Channel message id is required." }, 400);
      await restMutation("community_channel_messages", { method: "DELETE" }, `id=eq.${encodeURIComponent(id)}`);
      return adminJson({ ok: true });
    }

    if (action === "update_channel_message") {
      const id = String(body?.id || "").trim();
      const text = String(body?.body || "").trim();
      if (!id || !text) return adminJson({ error: "Message id and body are required." }, 400);
      const rows = await restMutation(
        "community_channel_messages",
        { method: "PATCH", body: JSON.stringify({ body: text }) },
        `id=eq.${encodeURIComponent(id)}`
      );
      return adminJson({ message: rows?.[0] || null });
    }

    if (action === "set_member_role") {
      const groupId = String(body?.group_id || "").trim();
      const userId = String(body?.user_id || "").trim();
      const role = String(body?.role || "").trim();
      if (!groupId || !userId || !["member", "admin"].includes(role)) {
        return adminJson({ error: "Group, user, and role are required." }, 400);
      }
      const rows = await restMutation(
        "community_memberships",
        { method: "PATCH", body: JSON.stringify({ role }) },
        `group_id=eq.${encodeURIComponent(groupId)}&user_id=eq.${encodeURIComponent(userId)}`
      );
      return adminJson({ member: rows?.[0] || null });
    }

    if (action === "remove_member") {
      const groupId = String(body?.group_id || "").trim();
      const userId = String(body?.user_id || "").trim();
      if (!groupId || !userId) return adminJson({ error: "Group and user are required." }, 400);
      await restMutation(
        "community_memberships",
        { method: "DELETE" },
        `group_id=eq.${encodeURIComponent(groupId)}&user_id=eq.${encodeURIComponent(userId)}`
      );
      await syncGroupMemberCount(groupId);
      return adminJson({ ok: true });
    }

    return adminJson({ error: "Unknown community admin action." }, 400);
  } catch (error: any) {
    return adminJson({ error: error?.message || "Community admin action failed." }, 502);
  }
}
