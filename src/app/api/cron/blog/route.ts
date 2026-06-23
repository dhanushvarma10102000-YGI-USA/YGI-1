import { NextResponse } from "next/server";

const TOPICS = [
  { title: "Health Insurance for F-1 Students in the USA", category: "Insurance", keywords: "health insurance F-1 visa students USA" },
  { title: "Car Insurance for International Students — Complete Guide", category: "Insurance", keywords: "car insurance international students USA" },
  { title: "Renters Insurance for Students — Is It Worth It?", category: "Insurance", keywords: "renters insurance international students" },
  { title: "Travel Insurance When Visiting Home on F-1 Visa", category: "Insurance", keywords: "travel insurance F-1 students visiting home" },
  { title: "Health Insurance on OPT and STEM OPT Explained", category: "Insurance", keywords: "health insurance OPT visa USA" },
  { title: "How to Open a Bank Account in the USA as an F-1 Student", category: "Banking", keywords: "bank account F-1 student USA" },
  { title: "Best Credit Cards for International Students with No Credit History", category: "Banking", keywords: "credit cards international students no credit history" },
  { title: "How to Build a Credit Score From Zero in the USA", category: "Banking", keywords: "build credit score international student USA" },
  { title: "Cheapest Ways to Send Money Home from the USA", category: "Banking", keywords: "send money home cheapest way USA" },
  { title: "How to File Taxes as an F-1 International Student", category: "Banking", keywords: "tax filing F-1 student USA" },
  { title: "OPT Application Step by Step Guide 2026", category: "Visa & OPT", keywords: "OPT application guide F-1 students 2026" },
  { title: "STEM OPT Extension — Complete 24 Month Guide", category: "Visa & OPT", keywords: "STEM OPT extension guide" },
  { title: "H-1B Visa Lottery Explained Simply for F-1 Students", category: "Visa & OPT", keywords: "H-1B visa lottery F-1 students" },
  { title: "How to Maintain F-1 Status — What Not to Do", category: "Visa & OPT", keywords: "maintain F-1 status rules" },
  { title: "CPT vs OPT — What Is the Difference?", category: "Visa & OPT", keywords: "CPT vs OPT difference F-1 students" },
  { title: "How to Find an Apartment as an International Student in the USA", category: "Housing", keywords: "apartment international student USA" },
  { title: "Student Housing Guide — What to Check Before Signing a Lease", category: "Housing", keywords: "student housing lease signing guide USA" },
  { title: "Best Cities in the USA for International Students", category: "Housing", keywords: "best cities international students USA" },
  { title: "Cost of Living in Phoenix Arizona for Students", category: "Housing", keywords: "cost of living Phoenix Arizona students" },
  { title: "How to Find a Roommate as an International Student", category: "Housing", keywords: "find roommate international student USA" },
  { title: "How to Get an Internship in the USA on F-1 Visa", category: "Jobs", keywords: "internship USA F-1 visa students" },
  { title: "How to Write a US-Style Resume as an International Student", category: "Jobs", keywords: "US resume international student" },
  { title: "LinkedIn Tips for International Students in the USA", category: "Jobs", keywords: "LinkedIn tips international students USA" },
  { title: "Best Job Boards for International Students in the USA", category: "Jobs", keywords: "job boards international students USA" },
  { title: "How to Negotiate Salary in the USA as an International Student", category: "Jobs", keywords: "salary negotiation international student USA" },
  { title: "Phoenix Arizona — Complete Guide for International Students", category: "City Guides", keywords: "Phoenix Arizona international students guide" },
  { title: "New York City Guide for International Students", category: "City Guides", keywords: "New York City international students guide" },
  { title: "Boston Guide for International Students", category: "City Guides", keywords: "Boston international students guide" },
  { title: "Austin Texas Guide for International Students", category: "City Guides", keywords: "Austin Texas international students guide" },
  { title: "Seattle Guide for International Students", category: "City Guides", keywords: "Seattle international students guide" },
  { title: "How to Get a US Driver's License on F-1 Visa", category: "Daily Life", keywords: "US driver license F-1 visa international student" },
  { title: "Getting a Social Security Number as an F-1 Student", category: "Daily Life", keywords: "social security number F-1 student" },
  { title: "Best Apps for International Students in the USA", category: "Daily Life", keywords: "best apps international students USA" },
  { title: "How to Get from the Airport to Your University on Arrival", category: "Daily Life", keywords: "airport to university international student USA" },
  { title: "Mental Health Resources for International Students in the USA", category: "Daily Life", keywords: "mental health international students USA" },
];

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

async function getUsedSlugs(): Promise<string[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return [];
  try {
    const res = await fetch(`${url}/rest/v1/articles?select=slug`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!res.ok) return [];
    const rows = await res.json();
    return Array.isArray(rows) ? rows.map((r: any) => r.slug) : [];
  } catch {
    return [];
  }
}

async function fetchImage(keywords: string): Promise<string> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return "";
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(keywords)}&per_page=5&orientation=landscape`,
      { headers: { Authorization: key } }
    );
    if (!res.ok) return "";
    const data = await res.json();
    const photos = data.photos ?? [];
    if (!photos.length) return "";
    const photo = photos[Math.floor(Math.random() * photos.length)];
    return photo.src?.large ?? "";
  } catch {
    return "";
  }
}

async function writeArticle(topic: { title: string; category: string; keywords: string }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");

  const prompt = `You are writing for "YourGuideInUSA", a helpful website for international students and newcomers settling in the United States.

Do NOT write generic SEO filler. Do NOT keyword-stuff. Write original, people-first content that reads like honest advice from someone who has actually been through the process.

Topic: ${topic.title}
Target keyword: ${topic.keywords}
Category: ${topic.category}

Accuracy rules:
- Do not invent laws, dates, prices, deadlines, or official form names.
- For immigration, legal, financial, or health claims, use cautious language (e.g. "typically", "check with your DSO").
- If a detail changes often, tell the reader what to verify rather than stating it as fact.

Writing rules:
- Length: 1,200–1,500 words
- Tone: Direct and warm — like advice from a friend who has been through it, not a corporate blog
- Structure: ## for main headings, ### for subheadings
- Include: specific practical steps, real cost ranges where known, a short FAQ at the end
- Vary sentence length. Mix short punchy sentences with longer ones.
- Write in plain markdown (no code blocks, no HTML)

At the very end (after the article), add:
---META---
EXCERPT: (2 sentence summary under 160 characters)
READ_TIME: (e.g. "8 min read")
---END---

Write the full article now:`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`Claude API error: ${res.status}`);

  const data = await res.json();
  const fullText: string = data.content?.[0]?.text ?? "";

  let content = fullText;
  let excerpt = "";
  let readTime = "7 min read";

  if (fullText.includes("---META---")) {
    const parts = fullText.split("---META---");
    content = parts[0].trim();
    const meta = parts[1].split("---END---")[0] ?? parts[1];
    for (const line of meta.trim().split("\n")) {
      if (line.startsWith("EXCERPT:")) excerpt = line.replace("EXCERPT:", "").trim();
      if (line.startsWith("READ_TIME:")) readTime = line.replace("READ_TIME:", "").trim();
    }
  }

  if (!excerpt) {
    const lines = content.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
    excerpt = (lines[0] ?? topic.title).slice(0, 200);
  }

  return { content, excerpt, readTime };
}

async function publishToSupabase(article: Record<string, unknown>): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return false;

  const res = await fetch(`${url}/rest/v1/articles`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(article),
  });

  return res.status === 200 || res.status === 201;
}

export const maxDuration = 60;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const usedSlugs = await getUsedSlugs();
    const available = TOPICS.filter((t) => !usedSlugs.includes(slugify(t.title)));
    const pool = available.length > 0 ? available : TOPICS;
    const topic = pool[Math.floor(Math.random() * pool.length)];
    const slug = slugify(topic.title);

    const article = await writeArticle(topic);
    const imageUrl = await fetchImage(topic.keywords);

    const published = await publishToSupabase({
      title: topic.title,
      slug,
      excerpt: article.excerpt,
      content: article.content,
      category: topic.category,
      image_url: imageUrl,
      read_time: article.readTime,
      published_at: new Date().toISOString(),
    });

    if (!published) return NextResponse.json({ error: "Failed to publish to Supabase" }, { status: 500 });

    return NextResponse.json({ ok: true, slug, title: topic.title });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}
