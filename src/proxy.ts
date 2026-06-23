import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const REALM = "YourGuideInUSA Admin";

function unauthorized() {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${REALM}", charset="UTF-8"`,
      "Cache-Control": "no-store",
    },
  });
}

// Constant-time string comparison — works in Edge Runtime without Node.js crypto
function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  let diff = ab.length ^ bb.length;
  const len = Math.max(ab.length, bb.length);
  for (let i = 0; i < len; i++) {
    diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0);
  }
  return diff === 0;
}

function validAdminCredentials(request: NextRequest) {
  const expectedUser = process.env.ADMIN_USER || "admin";
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedPassword) return false;

  const header = request.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return false;

  try {
    const decoded = atob(header.slice(6));
    const separator = decoded.indexOf(":");
    if (separator === -1) return false;
    const user = decoded.slice(0, separator);
    const password = decoded.slice(separator + 1);
    return safeEqual(user, expectedUser) && safeEqual(password, expectedPassword);
  } catch {
    return false;
  }
}

export function proxy(request: NextRequest) {
  if (!validAdminCredentials(request)) return unauthorized();

  const response = NextResponse.next();
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export const config = {
  matcher: [],
};
