import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getAdminTwoStepState } from "@/lib/admin-2fa";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  return NextResponse.json(
    { user: auth.user, twoStep: getAdminTwoStepState(request, auth.user.id) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
