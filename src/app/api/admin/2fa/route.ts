import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  clearAdminTwoStepCookie,
  createAdminTwoStepCookie,
  getAdminTwoStepState,
  verifyAdminTotpCode,
} from "@/lib/admin-2fa";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MAX_FAILURES = 5;
const WINDOW_MINUTES = 15;

// Failed codes are counted in Supabase because serverless instances don't share memory.
// Without a limit, a stolen admin session could brute-force the 6-digit code.
async function recentFailures(userId: string) {
  if (!SUPABASE_URL || !SERVICE_KEY) return 0;
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/admin_2fa_attempts?select=id&user_id=eq.${encodeURIComponent(userId)}&attempted_at=gte.${encodeURIComponent(since)}`,
    { method: "HEAD", headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, Prefer: "count=exact" }, cache: "no-store" }
  );
  // Fail closed if the table is unreachable: better a locked-out admin than an unlimited guesser.
  if (!res.ok) return MAX_FAILURES;
  const total = res.headers.get("content-range")?.split("/")[1];
  return total && total !== "*" ? Number(total) : 0;
}

async function recordFailure(userId: string) {
  if (!SUPABASE_URL || !SERVICE_KEY) return;
  await fetch(`${SUPABASE_URL}/rest/v1/admin_2fa_attempts`, {
    method: "POST",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ user_id: userId }),
    cache: "no-store",
  }).catch(() => {});
}

async function clearFailures(userId: string) {
  if (!SUPABASE_URL || !SERVICE_KEY) return;
  await fetch(`${SUPABASE_URL}/rest/v1/admin_2fa_attempts?user_id=eq.${encodeURIComponent(userId)}`, {
    method: "DELETE",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    cache: "no-store",
  }).catch(() => {});
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  return NextResponse.json(
    { twoStep: getAdminTwoStepState(request, auth.user.id) },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  if ((await recentFailures(auth.user.id)) >= MAX_FAILURES) {
    return NextResponse.json(
      { error: `Too many wrong codes. Try again in ${WINDOW_MINUTES} minutes.` },
      { status: 429, headers: { "Cache-Control": "no-store" } }
    );
  }

  const body = await request.json().catch(() => null);
  const code = String(body?.code || "");

  if (!verifyAdminTotpCode(code)) {
    await recordFailure(auth.user.id);
    return NextResponse.json(
      { error: "Invalid two-step code." },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  await clearFailures(auth.user.id);
  const response = NextResponse.json(
    { ok: true, twoStep: { configured: true, verified: true } },
    { headers: { "Cache-Control": "no-store" } }
  );
  response.headers.append("Set-Cookie", createAdminTwoStepCookie(auth.user.id));
  return response;
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const response = NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } }
  );
  response.headers.append("Set-Cookie", clearAdminTwoStepCookie());
  return response;
}
