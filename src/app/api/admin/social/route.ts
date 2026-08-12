import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

const DISTRIBUTOR_URL = process.env.SOCIAL_DISTRIBUTOR_URL || "http://localhost:4000";

async function proxyPost(path: string, body: unknown) {
  const res = await fetch(`${DISTRIBUTOR_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  return res.json();
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const [runsRes, postsRes, statsRes] = await Promise.all([
      fetch(`${DISTRIBUTOR_URL}/api/runs?limit=30`, { cache: "no-store", signal: AbortSignal.timeout(3000) }),
      fetch(`${DISTRIBUTOR_URL}/api/posts`, { cache: "no-store", signal: AbortSignal.timeout(3000) }),
      fetch(`${DISTRIBUTOR_URL}/api/platform-stats`, { cache: "no-store", signal: AbortSignal.timeout(3000) }),
    ]);
    const [runs, posts, platformData] = await Promise.all([runsRes.json(), postsRes.json(), statsRes.json()]);
    return NextResponse.json({ online: true, runs, posts, platformData });
  } catch {
    return NextResponse.json(
      { online: false, runs: [], posts: [], platformData: null, error: "Social distributor is offline — start it with npm run dev in the social-distributor directory." },
      { status: 503 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const { action, ...rest } = body;

    // action=unsplash → fetch a relevant image URL for preview
    if (action === "unsplash") {
      const q = encodeURIComponent(String((rest as any).query || "usa life"));
      const r = await fetch(`${DISTRIBUTOR_URL}/api/unsplash-image?q=${q}`, { signal: AbortSignal.timeout(10_000) });
      return NextResponse.json(await r.json());
    }

    // action=generate → preview captions without posting
    if (action === "generate") {
      const data = await proxyPost("/api/generate", rest);
      return NextResponse.json(data);
    }

    // action=publish → full pipeline with optional pre-built captions
    if (action === "publish") {
      const data = await proxyPost("/api/publish", rest);
      return NextResponse.json(data);
    }

    // default → trigger detection / manual run
    const data = await proxyPost("/api/trigger", rest);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Social distributor is offline." }, { status: 503 });
  }
}
