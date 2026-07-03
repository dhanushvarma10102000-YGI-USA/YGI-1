import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Called daily by Vercel cron — fetches fresh Reddit posts for all sorts and warms the cache
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://yourguideinusa.com";
  const sorts = ["hot", "top", "new"] as const;

  const results = await Promise.allSettled(
    sorts.map((sort) =>
      fetch(`${base}/api/reddit-stories?sort=${sort}`, {
        headers: { "Cache-Control": "no-cache" },
      }).then((r) => ({ sort, ok: r.ok, status: r.status }))
    )
  );

  const summary = results.map((r, i) =>
    r.status === "fulfilled"
      ? `${sorts[i]}: ${r.value.ok ? "ok" : `error ${r.value.status}`}`
      : `${sorts[i]}: failed`
  );

  console.log("Reddit cron result:", summary);
  return NextResponse.json({ refreshed: summary, at: new Date().toISOString() });
}
