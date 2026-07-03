import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const SUBREDDIT_COMBO =
  "immigration+f1visa+internationalstudents+USCIS+UsaVisa+ImmigrationIndia+h1b+greencard" +
  "+TN_Visa+DACA+usvisa+gradadmissions+studyabroad+banking+personalfinance";

export type RedditPost = {
  id: string;
  title: string;
  selftext: string;
  subreddit: string;
  author: string;
  score: number;
  num_comments: number;
  created_utc: number;
  permalink: string;
};

/* ── Atom XML helpers ── */
function tagInner(xml: string, tag: string): string {
  const s = xml.indexOf(`<${tag}`);
  if (s === -1) return "";
  const cs = xml.indexOf(">", s) + 1;
  const e = xml.indexOf(`</${tag}>`, cs);
  return e === -1 ? "" : xml.slice(cs, e).trim();
}
function htmlDecode(s: string) {
  return s
    .replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&")
    .replace(/&quot;/g,'"').replace(/&apos;/g,"'")
    // numeric entities: &#32; &#160; etc.
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}
function stripHtml(s: string) { return s.replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim(); }
function cleanBody(html: string): string {
  // Remove Reddit HTML comments and "submitted by" footer
  const stripped = html
    .replace(/<!--[\s\S]*?-->/g, "")           // <!-- SC_OFF --> etc.
    .replace(/<a[^>]*>\[link\]<\/a>/gi, "")    // [link]
    .replace(/<a[^>]*>\[comments\]<\/a>/gi, "") // [comments]
    .replace(/submitted by[\s\S]{0,200}$/i, ""); // "submitted by u/..." footer
  const text = stripHtml(htmlDecode(stripped));
  // Remove leftover trailing punctuation from truncation
  return text.replace(/\s+/g, " ").trim();
}
function toExcerpt(html: string, max = 1200) {
  const t = cleanBody(html);
  return t.length > max ? t.slice(0, max).trimEnd() + "…" : t;
}

function parseEntries(xml: string): RedditPost[] {
  const posts: RedditPost[] = [];
  let cursor = 0;
  while (true) {
    const start = xml.indexOf("<entry>", cursor);
    if (start === -1) break;
    const end = xml.indexOf("</entry>", start);
    if (end === -1) break;
    const entry = xml.slice(start, end + 8);
    cursor = end + 8;

    const linkMatch = entry.match(/<link href="([^"]+)"/i);
    const permalink = linkMatch?.[1] ?? "";
    if (!permalink.includes("/comments/")) continue;

    const id = tagInner(entry, "id").split("_").pop() ?? "";
    if (!id) continue;

    const title = htmlDecode(tagInner(entry, "title"));
    const author = tagInner(entry, "name").replace(/^\/u\//, "");
    const subreddit = entry.match(/label="r\/([^"]+)"/)?.[1] ?? "";
    const updatedStr = tagInner(entry, "updated");
    const created_utc = updatedStr ? Math.floor(new Date(updatedStr).getTime() / 1000) : 0;
    const contentHtml = tagInner(entry, "content");
    const selftext = toExcerpt(contentHtml);

    posts.push({ id, title, selftext, subreddit, author, score: 0, num_comments: 0, created_utc, permalink });
  }
  return posts;
}

async function saveToSupabase(posts: RedditPost[]) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || posts.length === 0) return;
  try {
    const db = createClient(url, key);
    await db.from("reddit_posts").upsert(
      posts.map((p) => ({
        id: p.id,
        title: p.title,
        selftext: p.selftext,
        subreddit: p.subreddit,
        author: p.author,
        permalink: p.permalink,
        created_utc: p.created_utc,
        fetched_at: new Date().toISOString(),
      })),
      { onConflict: "id" }
    );
  } catch (e) {
    console.error("Supabase save error", e);
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawSort = searchParams.get("sort") ?? "hot";
  if (!["hot", "top", "new"].includes(rawSort)) {
    return NextResponse.json({ error: "Invalid sort parameter" }, { status: 400 });
  }
  const sort = rawSort as "hot" | "top" | "new";
  // top needs a time window; new and hot don't
  const t = sort === "top" ? "&t=week" : sort === "new" ? "&t=day" : "";

  try {
    const res = await fetch(
      `https://www.reddit.com/r/${SUBREDDIT_COMBO}/${sort}.rss?limit=40${t}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; YourGuideInUSA/1.0)",
          "Accept": "application/atom+xml, text/xml",
        },
        next: { revalidate: sort === "new" ? 3600 : 43200 },
      }
    );

    if (!res.ok) {
      return NextResponse.json({ error: `Reddit returned ${res.status}` }, { status: 502 });
    }

    const xml = await res.text();
    const posts = parseEntries(xml);

    // Deduplicate + sort newest first
    const seen = new Set<string>();
    const unique = posts.filter((p) => { if (seen.has(p.id)) return false; seen.add(p.id); return true; });
    unique.sort((a, b) => b.created_utc - a.created_utc);
    const final = unique.slice(0, 30);

    // Store to Supabase in background (non-blocking)
    saveToSupabase(final).catch(() => {});

    return NextResponse.json(
      { posts: final },
      { headers: { "Cache-Control": `public, s-maxage=${sort === "new" ? 3600 : 43200}, stale-while-revalidate=600` } }
    );
  } catch (err) {
    console.error("Reddit RSS error", err);
    return NextResponse.json({ error: "Failed to fetch Reddit posts" }, { status: 500 });
  }
}
