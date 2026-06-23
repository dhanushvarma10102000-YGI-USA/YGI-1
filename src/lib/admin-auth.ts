import { NextResponse } from "next/server";
import { requireAdminTwoStep } from "@/lib/admin-2fa";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export interface AdminUser {
  id: string;
  email: string;
}

type AdminAuthResult =
  | { ok: true; user: AdminUser }
  | { ok: false; response: NextResponse };

function normalizeEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function splitEmails(value: unknown) {
  return String(value || "")
    .split(/[\s,;]+/)
    .map(normalizeEmail)
    .filter((item) => item.includes("@"));
}

function configuredAdminEmails() {
  return new Set([
    ...splitEmails(process.env.ADMIN_EMAILS),
    ...splitEmails(process.env.COMMUNITY_MODERATOR_EMAILS),
  ]);
}

function noStoreJson(data: unknown, status: number) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function bearerToken(request: Request) {
  const value = request.headers.get("authorization") || "";
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

async function getSupabaseUser(token: string): Promise<AdminUser | null> {
  const apiKey = SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !apiKey) return null;

  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) return null;

  const user = await response.json().catch(() => null);
  const email = normalizeEmail(user?.email);
  if (!user?.id || !email) return null;

  return { id: String(user.id), email };
}

async function isSavedModerator(email: string) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !email) return false;

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/community_moderators?select=email&email=eq.${encodeURIComponent(email)}&enabled=eq.true&limit=1`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      cache: "no-store",
    }
  );

  if (!response.ok) return false;

  const rows = await response.json().catch(() => []);
  return Array.isArray(rows) && rows.length > 0;
}

export async function requireAdmin(request: Request): Promise<AdminAuthResult> {
  if (!SUPABASE_URL || (!SUPABASE_ANON_KEY && !SUPABASE_SERVICE_ROLE_KEY)) {
    return {
      ok: false,
      response: noStoreJson({ error: "Missing Supabase auth environment variables." }, 503),
    };
  }

  const token = bearerToken(request);
  if (!token) {
    return {
      ok: false,
      response: noStoreJson({ error: "Please sign in to use the admin dashboard." }, 401),
    };
  }

  const user = await getSupabaseUser(token);
  if (!user) {
    return {
      ok: false,
      response: noStoreJson({ error: "Your session expired. Please sign in again." }, 401),
    };
  }

  const adminEmails = configuredAdminEmails();
  if (adminEmails.has(user.email) || (await isSavedModerator(user.email))) {
    return { ok: true, user };
  }

  return {
    ok: false,
    response: noStoreJson({ error: "Admin access is required for this page." }, 403),
  };
}

export async function requireAdminDashboard(request: Request): Promise<AdminAuthResult> {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth;

  const twoStep = requireAdminTwoStep(request, auth.user.id);
  if (!twoStep.ok) return twoStep;

  return auth;
}
