import crypto from "node:crypto";
import { NextResponse } from "next/server";

const COOKIE_NAME = "ygiu_admin_2fa";
const TOTP_STEP_SECONDS = 30;
const COOKIE_TTL_SECONDS = 8 * 60 * 60;

const ADMIN_TOTP_SECRET = process.env.ADMIN_TOTP_SECRET;
const COOKIE_SECRET =
  process.env.ADMIN_2FA_COOKIE_SECRET ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.ADMIN_TOTP_SECRET ||
  "";

export interface AdminTwoStepState {
  configured: boolean;
  verified: boolean;
}

type AdminTwoStepResult =
  | { ok: true }
  | { ok: false; response: NextResponse };

function noStoreJson(data: unknown, status: number) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function base32Decode(value: string) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = value.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let current = 0;
  const bytes: number[] = [];

  for (const char of clean) {
    const index = alphabet.indexOf(char);
    if (index === -1) continue;
    current = (current << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((current >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

function hotp(secret: Buffer, counter: number) {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));

  const hmac = crypto.createHmac("sha1", secret).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return String(binary % 1_000_000).padStart(6, "0");
}

function timingSafeCodeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function isAdminTwoStepConfigured() {
  return Boolean(ADMIN_TOTP_SECRET && base32Decode(ADMIN_TOTP_SECRET).length);
}

export function verifyAdminTotpCode(code: string) {
  const clean = String(code || "").replace(/\D/g, "");
  if (!/^\d{6}$/.test(clean) || !isAdminTwoStepConfigured()) return false;

  const secret = base32Decode(ADMIN_TOTP_SECRET || "");
  const counter = Math.floor(Date.now() / 1000 / TOTP_STEP_SECONDS);

  for (let drift = -1; drift <= 1; drift += 1) {
    if (timingSafeCodeEqual(clean, hotp(secret, counter + drift))) return true;
  }

  return false;
}

function sign(value: string) {
  return crypto.createHmac("sha256", COOKIE_SECRET).update(value).digest("base64url");
}

function cookiePayload(userId: string) {
  return Buffer.from(
    JSON.stringify({
      sub: userId,
      exp: Math.floor(Date.now() / 1000) + COOKIE_TTL_SECONDS,
      v: 1,
    }),
    "utf8"
  ).toString("base64url");
}

function parseCookies(request: Request) {
  return Object.fromEntries(
    (request.headers.get("cookie") || "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        if (index === -1) return [part, ""];
        return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      })
  );
}

function isValidTwoStepCookie(request: Request, userId: string) {
  if (!isAdminTwoStepConfigured() || !COOKIE_SECRET) return false;

  const value = parseCookies(request)[COOKIE_NAME] || "";
  const [payload, signature] = value.split(".");
  if (!payload || !signature || !timingSafeCodeEqual(signature, sign(payload))) return false;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return data?.sub === userId && Number(data?.exp) > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export function getAdminTwoStepState(request: Request, userId: string): AdminTwoStepState {
  const configured = isAdminTwoStepConfigured();
  return {
    configured,
    verified: configured && isValidTwoStepCookie(request, userId),
  };
}

export function requireAdminTwoStep(request: Request, userId: string): AdminTwoStepResult {
  if (!isAdminTwoStepConfigured()) {
    return {
      ok: false,
      response: noStoreJson(
        { error: "Admin two-step authentication is not configured. Set ADMIN_TOTP_SECRET." },
        503
      ),
    };
  }

  if (!isValidTwoStepCookie(request, userId)) {
    return {
      ok: false,
      response: noStoreJson(
        { error: "Two-step verification is required.", requiresTwoStep: true },
        428
      ),
    };
  }

  return { ok: true };
}

export function createAdminTwoStepCookie(userId: string) {
  const payload = cookiePayload(userId);
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE_NAME}=${encodeURIComponent(`${payload}.${sign(payload)}`)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${COOKIE_TTL_SECONDS}${secure}`;
}

export function clearAdminTwoStepCookie() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}
