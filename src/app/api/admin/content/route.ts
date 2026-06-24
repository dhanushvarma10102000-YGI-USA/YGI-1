import { NextResponse } from "next/server";
import { requireAdminDashboard } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const TABLES = {
  articles: "articles",
  users: "profiles",
  posts: "community_messages",
  groups: "community_groups",
} as const;

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

async function countRows(table: string) {
  const headers = serviceHeaders({ Prefer: "count=exact" });
  if (!SUPABASE_URL || !headers) throw new Error("Missing Supabase config");

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
    method: "HEAD",
    headers,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${table} count failed`);
  const range = res.headers.get("content-range");
  const total = range?.split("/")[1];
  return total && total !== "*" ? Number(total) : 0;
}

export async function GET(request: Request) {
  const auth = await requireAdminDashboard(request);
  if (!auth.ok) return auth.response;

  const headers = serviceHeaders();
  if (!SUPABASE_URL || !headers) return configError();

  const articlesRes = await fetch(
    `${SUPABASE_URL}/rest/v1/${TABLES.articles}?select=*&order=created_at.desc&limit=50`,
    { headers, cache: "no-store" }
  );
  if (!articlesRes.ok) {
    return NextResponse.json(
      { error: `Could not load articles (${articlesRes.status}).` },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }

  const counts = { articles: 0, users: 0, posts: 0, groups: 0 };
  await Promise.all(
    (Object.entries(TABLES) as [keyof typeof counts, string][]).map(async ([key, table]) => {
      try {
        counts[key] = await countRows(table);
      } catch {
        counts[key] = 0;
      }
    })
  );

  return NextResponse.json(
    { articles: await articlesRes.json(), counts },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: Request) {
  const auth = await requireAdminDashboard(request);
  if (!auth.ok) return auth.response;

  const headers = serviceHeaders({
    "Content-Type": "application/json",
    Prefer: "return=representation",
  });
  if (!SUPABASE_URL || !headers) return configError();

  const body = await request.json().catch(() => null);
  const title = String(body?.title || "").trim();
  const content = String(body?.content || "").trim();
  const category = String(body?.category || "General").trim();
  const slug = String(body?.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, "-")).replace(/^-|-$/g, "");

  if (!title || !content || !slug) {
    return NextResponse.json(
      { error: "Title, slug, and content are required." },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABLES.articles}`, {
    method: "POST",
    headers,
    cache: "no-store",
    body: JSON.stringify({
      title,
      category,
      excerpt: String(body?.excerpt || "").slice(0, 220),
      content,
      slug,
      read_time: Number(body?.read_time) || 1,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { error: `Insert failed (${res.status}): ${text.slice(0, 180)}` },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }

  const rows = await res.json();
  return NextResponse.json(
    { article: rows?.[0] || null },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function DELETE(request: Request) {
  const auth = await requireAdminDashboard(request);
  if (!auth.ok) return auth.response;

  const headers = serviceHeaders();
  if (!SUPABASE_URL || !headers) return configError();

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { error: "Article id is required." },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${TABLES.articles}?id=eq.${encodeURIComponent(id)}`,
    {
      method: "DELETE",
      headers: { ...headers, Prefer: "return=minimal" },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    return NextResponse.json(
      { error: `Delete failed (${res.status}): ${errText.slice(0, 200)}` },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
