import { NextResponse } from "next/server";
import { requireAdminDashboard } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

// Admin topic queue, stored in public.article_queue (service role only).

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

async function rest(query: string, init: RequestInit = {}) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing Supabase server environment variables.");
  const res = await fetch(`${SUPABASE_URL}/rest/v1/article_queue${query}`, {
    ...init,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Queue request failed (${res.status}): ${text.slice(0, 180)}`);
  return text ? JSON.parse(text) : null;
}

const listQuery = "?select=id,title,category,position&order=position.asc,created_at.asc";

export async function GET(request: Request) {
  const auth = await requireAdminDashboard(request);
  if (!auth.ok) return auth.response;
  try {
    return json({ queue: await rest(listQuery) });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Could not load the queue." }, 502);
  }
}

// { title, category } adds a topic at the end.
export async function POST(request: Request) {
  const auth = await requireAdminDashboard(request);
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => null);
  const title = String(body?.title || "").trim();
  const category = String(body?.category || "Daily Life").trim();
  if (!title) return json({ error: "Title is required." }, 400);
  try {
    const last = await rest("?select=position&order=position.desc&limit=1");
    const position = (Number(last?.[0]?.position) || 0) + 1;
    const rows = await rest("", { method: "POST", body: JSON.stringify({ title, category, position }) });
    return json({ item: rows?.[0] || null });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Could not add the topic." }, 502);
  }
}

// { order: [id, id, ...] } saves a new order.
export async function PATCH(request: Request) {
  const auth = await requireAdminDashboard(request);
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => null);
  const order: string[] = Array.isArray(body?.order) ? body.order.map(String) : [];
  if (!order.length) return json({ error: "order is required." }, 400);
  try {
    await Promise.all(
      order.map((id, index) =>
        rest(`?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ position: index + 1 }), headers: { Prefer: "return=minimal" } })
      )
    );
    return json({ queue: await rest(listQuery) });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Could not reorder the queue." }, 502);
  }
}

// ?id=... removes a topic (after it is published or when it is no longer wanted).
export async function DELETE(request: Request) {
  const auth = await requireAdminDashboard(request);
  if (!auth.ok) return auth.response;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return json({ error: "id is required." }, 400);
  try {
    await rest(`?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
    return json({ ok: true });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Could not remove the topic." }, 502);
  }
}
