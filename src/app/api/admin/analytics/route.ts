import { NextResponse } from "next/server";
import { sign as cryptoSign } from "crypto";
import { requireAdmin } from "@/lib/admin-auth";

const SCOPES = "https://www.googleapis.com/auth/analytics.readonly";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const GA4_API = "https://analyticsdata.googleapis.com/v1beta/properties";

function normalizePEM(raw: string): string {
  // Replace literal \n sequences (as stored in env vars)
  let pem = raw.replace(/\\n/g, "\n").replace(/\r/g, "").trim();
  // If still no real newlines, reconstruct from a flat base64 blob
  if (!pem.includes("\n")) {
    const begin = pem.match(/-----BEGIN [^-]+-----/)?.[0] ?? "";
    const end = pem.match(/-----END [^-]+-----/)?.[0] ?? "";
    const b64 = pem.replace(begin, "").replace(end, "").replace(/\s/g, "");
    const wrapped = b64.match(/.{1,64}/g)?.join("\n") ?? b64;
    pem = `${begin}\n${wrapped}\n${end}`;
  }
  return pem;
}

function makeJWT(email: string, rawKey: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const claim = Buffer.from(JSON.stringify({
    iss: email,
    scope: SCOPES,
    aud: TOKEN_URL,
    exp: now + 3600,
    iat: now,
  })).toString("base64url");
  const payload = `${header}.${claim}`;
  const pem = normalizePEM(rawKey);
  const sig = cryptoSign("sha256", Buffer.from(payload), pem)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `${payload}.${sig}`;
}

async function getToken(email: string, key: string): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: makeJWT(email, key),
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("Failed to get GA4 access token");
  return data.access_token;
}

async function runReport(
  propertyId: string,
  token: string,
  body: object
): Promise<any> {
  const res = await fetch(`${GA4_API}/${propertyId}:runReport`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GA4 API error: ${err}`);
  }
  return res.json();
}

function fmtDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function countryFlag(countryCode: string): string {
  if (!countryCode || countryCode === "(not set)") return "🌐";
  return countryCode
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

function countryName(code: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

function parseMetrics(report: any) {
  const row = report.rows?.[0]?.metricValues ?? [{ value: "0" }, { value: "0" }, { value: "0" }, { value: "0" }];
  return {
    visitors: parseInt(row[0]?.value ?? "0"),
    views: parseInt(row[1]?.value ?? "0"),
    bounce: Math.round(parseFloat(row[2]?.value ?? "0") * 100),
    avgTime: fmtDuration(parseFloat(row[3]?.value ?? "0")),
  };
}

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const propertyId = process.env.GA_PROPERTY_ID;
  const clientEmail = process.env.GA_CLIENT_EMAIL;
  const privateKeyRaw = process.env.GA_PRIVATE_KEY;

  if (!propertyId || !clientEmail || !privateKeyRaw) {
    return NextResponse.json({ error: "GA4 env vars not configured" }, { status: 503 });
  }

  try {
    const token = await getToken(clientEmail, privateKeyRaw);

    const [todayReport, weekReport, monthReport, pagesReport, sourcesReport, countriesReport] =
      await Promise.all([
        runReport(propertyId, token, {
          dateRanges: [{ startDate: "today", endDate: "today" }],
          metrics: [
            { name: "activeUsers" },
            { name: "screenPageViews" },
            { name: "bounceRate" },
            { name: "averageSessionDuration" },
          ],
        }),
        runReport(propertyId, token, {
          dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
          metrics: [
            { name: "activeUsers" },
            { name: "screenPageViews" },
            { name: "bounceRate" },
            { name: "averageSessionDuration" },
          ],
        }),
        runReport(propertyId, token, {
          dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
          metrics: [
            { name: "activeUsers" },
            { name: "screenPageViews" },
            { name: "bounceRate" },
            { name: "averageSessionDuration" },
          ],
        }),
        runReport(propertyId, token, {
          dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
          dimensions: [{ name: "pagePath" }],
          metrics: [{ name: "screenPageViews" }],
          orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
          limit: 8,
        }),
        runReport(propertyId, token, {
          dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
          dimensions: [{ name: "sessionDefaultChannelGroup" }],
          metrics: [{ name: "sessions" }],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          limit: 6,
        }),
        runReport(propertyId, token, {
          dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
          dimensions: [{ name: "country" }],
          metrics: [{ name: "activeUsers" }],
          orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
          limit: 5,
        }),
      ]);

    const topPages = (pagesReport.rows ?? []).map((row: any) => ({
      url: row.dimensionValues[0].value,
      views: parseInt(row.metricValues[0].value),
      trend: 0,
    }));

    const totalSessions = (sourcesReport.rows ?? []).reduce(
      (sum: number, row: any) => sum + parseInt(row.metricValues[0].value),
      0
    );
    const sources = (sourcesReport.rows ?? []).map((row: any) => ({
      name: row.dimensionValues[0].value,
      pct: totalSessions > 0 ? Math.round((parseInt(row.metricValues[0].value) / totalSessions) * 100) : 0,
    }));

    const totalUsers = (countriesReport.rows ?? []).reduce(
      (sum: number, row: any) => sum + parseInt(row.metricValues[0].value),
      0
    );
    const countries = (countriesReport.rows ?? []).map((row: any) => {
      const code = row.dimensionValues[0].value;
      return {
        name: countryName(code),
        flag: countryFlag(code),
        pct: totalUsers > 0 ? Math.round((parseInt(row.metricValues[0].value) / totalUsers) * 100) : 0,
      };
    });

    return NextResponse.json({
      today: parseMetrics(todayReport),
      week: parseMetrics(weekReport),
      month: parseMetrics(monthReport),
      topPages,
      sources,
      countries,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Unknown error" }, { status: 500 });
  }
}
