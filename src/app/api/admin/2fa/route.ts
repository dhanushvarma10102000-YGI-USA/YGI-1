import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  clearAdminTwoStepCookie,
  createAdminTwoStepCookie,
  getAdminTwoStepState,
  verifyAdminTotpCode,
} from "@/lib/admin-2fa";

export const dynamic = "force-dynamic";

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

  const body = await request.json().catch(() => null);
  const code = String(body?.code || "");

  if (!verifyAdminTotpCode(code)) {
    return NextResponse.json(
      { error: "Invalid two-step code." },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

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
