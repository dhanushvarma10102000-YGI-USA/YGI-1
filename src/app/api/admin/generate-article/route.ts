import { NextResponse } from "next/server";
import { requireAdminDashboard } from "@/lib/admin-auth";

const ANTHROPIC_ENDPOINT = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";

const DEFAULT_REVIEW_CHECKLIST = [
  "Verify every date, deadline, fee, policy, and form name against an official source.",
  "Remove any claim that sounds legal, immigration, financial, or medical if it cannot be verified.",
  "Check that the article gives specific YourGuideInUSA help instead of generic web advice.",
  "Read the FAQ for over-promising, outdated rules, or advice that could harm a reader.",
];

const DEFAULT_SOURCES_TO_VERIFY = [
  {
    label: "Official government, university, or provider pages for the claims in this draft",
    why: "Use primary sources before publishing anything that can affect visas, money, housing, health, or safety.",
  },
];

const SITE_FOCUS = [
  "guide page discovery and map-based local help",
  "city arrival basics",
  "campus and university-specific setup",
  "housing search and rental safety",
  "banking, credit, phone plans, insurance, transport, groceries, and daily life",
  "visa, CPT, OPT, STEM OPT, SSN, taxes, and document checklists",
  "YourGuideInUSA community and blogs",
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function cleanStringArray(value: unknown, fallback: string[], limit = 8) {
  if (!Array.isArray(value)) return fallback;
  const cleaned = value
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, limit);
  return cleaned.length ? cleaned : fallback;
}

function cleanSources(value: unknown) {
  if (!Array.isArray(value)) return DEFAULT_SOURCES_TO_VERIFY;
  const cleaned = value
    .map((item) => {
      if (typeof item === "string") {
        return { label: item.trim(), why: "Verify this before publishing." };
      }
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const label = String(row.label || "").trim();
      const url = String(row.url || "").trim();
      const why = String(row.why || "").trim();
      if (!label && !url) return null;
      return {
        label: label || url,
        ...(url ? { url } : {}),
        why: why || "Verify this before publishing.",
      };
    })
    .filter(Boolean)
    .slice(0, 8);
  return cleaned.length ? cleaned : DEFAULT_SOURCES_TO_VERIFY;
}

function parseArticleJSON(text: string, topic: string, category: string) {
  let parsed: any;
  try {
    const match = text.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(match ? match[0] : text);
  } catch {
    parsed = {
      title: topic,
      excerpt: text.slice(0, 180),
      readTime: Math.max(1, Math.round(text.split(/\s+/).length / 200)),
      content: text,
    };
  }

  const title = String(parsed.title || topic).trim();
  const content = String(parsed.content || "").trim();
  const readTime =
    Number(parsed.readTime) ||
    Math.max(1, Math.round(content.split(/\s+/).filter(Boolean).length / 200));

  return {
    title,
    category,
    excerpt: String(parsed.excerpt || "").slice(0, 220),
    readTime,
    content,
    slug: slugify(title),
    searchIntent: String(parsed.searchIntent || "Needs human review for current search demand.").slice(0, 240),
    trafficAngle: String(parsed.trafficAngle || "Specific, practical guide content for YourGuideInUSA readers.").slice(0, 240),
    reviewChecklist: cleanStringArray(parsed.reviewChecklist, DEFAULT_REVIEW_CHECKLIST),
    sourcesToVerify: cleanSources(parsed.sourcesToVerify),
    riskNotes: cleanStringArray(
      parsed.riskNotes,
      ["Fact-check before publishing. Do not publish unverified rules, prices, deadlines, or official requirements."],
      6
    ),
  };
}

export async function POST(request: Request) {
  const auth = await requireAdminDashboard(request);
  if (!auth.ok) return auth.response;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing ANTHROPIC_API_KEY on the server." },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => null);
  const topic = String(body?.topic || "").trim();
  const category = String(body?.category || "General").trim();
  if (!topic) {
    return NextResponse.json({ error: "Topic is required." }, { status: 400 });
  }

  const prompt = `You are writing for "YourGuideInUSA", a website with guide, blog, map discovery, and community features for people planning or settling in the United States.

Do not write generic SEO filler. Do not keyword-stuff. Do not try to evade AI detectors. Write original, people-first content that a real editor can fact-check and improve.

Site focus areas:
${SITE_FOCUS.map((item) => `- ${item}`).join("\n")}

Accuracy rules:
- Do not invent laws, dates, prices, forms, eligibility rules, school policies, business hours, official phone numbers, or addresses.
- For immigration, legal, financial, insurance, health, housing, or safety claims, use cautious language and mark exact claims for verification.
- If a detail changes often, say what the reader should verify instead of pretending it is current.
- Do not cite fake sources. Only list sources that should be checked by the human editor.
- Keep the article tightly connected to YourGuideInUSA topics, especially guide discovery, blogs, community, campus/city arrival, or newcomer setup.
- Give a timely traffic angle from the topic, but do not claim live trend data unless the topic itself includes it.

Write a complete, practical article on this topic:

TOPIC: ${topic}
CATEGORY: ${category}

Return ONLY valid JSON with this exact shape:
{
  "title": "an SEO-friendly, specific title",
  "excerpt": "a 1-2 sentence summary, max 200 chars",
  "readTime": <integer minutes>,
  "searchIntent": "what people are likely searching for and why this topic can bring relevant traffic",
  "trafficAngle": "the specific timely or high-need angle to lead with",
  "content": "the full article in markdown, 800-1200 words, with ## headings, practical steps, a YourGuideInUSA angle, and a short FAQ",
  "reviewChecklist": ["specific checks the editor must complete before publishing"],
  "sourcesToVerify": [{"label":"source/page to check", "url":"optional official URL if known", "why":"what claim it verifies"}],
  "riskNotes": ["claims or sections that could be wrong, outdated, or harmful if not verified"]
}`;

  const res = await fetch(ANTHROPIC_ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { error: `Anthropic API ${res.status}: ${text.slice(0, 180)}` },
      { status: 502 }
    );
  }

  const data = await res.json();
  const text = (data.content || []).map((block: any) => block.text || "").join("");
  return NextResponse.json(parseArticleJSON(text, topic, category));
}
