import { NextResponse } from "next/server";
import { generateTopic, slugify, writeArticle } from "@/lib/article-writer";

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

  // ── Batch 2 ──────────────────────────────────────────────────
  // Insurance
  { title: "Dental Insurance Options for International Students in the USA", category: "Insurance", keywords: "dental insurance international students USA" },
  { title: "Vision Insurance for F-1 Students — Is It Worth It?", category: "Insurance", keywords: "vision insurance F-1 students USA" },
  { title: "What to Do If You Get Sick Without Insurance in the USA", category: "Insurance", keywords: "sick without insurance international student USA" },
  // Banking & Finance
  { title: "How to Use Zelle, Venmo, and Cash App as an International Student", category: "Banking", keywords: "Zelle Venmo Cash App international student USA" },
  { title: "What Is a W-8BEN Form and Do International Students Need It?", category: "Banking", keywords: "W-8BEN form international students USA" },
  { title: "How to Avoid Bank Fees as an International Student in the USA", category: "Banking", keywords: "avoid bank fees international student USA" },
  { title: "Best Online Banks for International Students in the USA", category: "Banking", keywords: "online banks international students USA" },
  { title: "How to Get an ITIN as an International Student", category: "Banking", keywords: "ITIN international student USA" },
  // Visa & OPT
  { title: "F-1 to H-1B: Complete Timeline and What to Expect", category: "Visa & OPT", keywords: "F-1 to H-1B transition timeline" },
  { title: "What Happens If You Overstay Your F-1 Visa Grace Period", category: "Visa & OPT", keywords: "overstay F-1 visa grace period consequences" },
  { title: "F-1 Reinstatement — What It Is and How to Apply", category: "Visa & OPT", keywords: "F-1 reinstatement application process" },
  { title: "Traveling Outside the USA on OPT — What You Need to Know", category: "Visa & OPT", keywords: "travel outside USA during OPT F-1" },
  { title: "Can International Students Start a Business in the USA on F-1?", category: "Visa & OPT", keywords: "start business F-1 student USA" },
  // Housing
  { title: "Short-Term Housing Options for International Students on Arrival", category: "Housing", keywords: "short term housing international students USA arrival" },
  { title: "Understanding a US Lease Agreement — Key Terms Explained", category: "Housing", keywords: "US lease agreement terms international students" },
  { title: "How to Get Your Security Deposit Back in the USA", category: "Housing", keywords: "security deposit return tenant rights USA" },
  { title: "Furnished vs Unfurnished Apartments — What to Choose as a Student", category: "Housing", keywords: "furnished unfurnished apartment student USA" },
  // Jobs & Career
  { title: "How to Ask for a Recommendation Letter in the USA", category: "Jobs", keywords: "recommendation letter USA international student" },
  { title: "Remote Work and F-1 Visa — What Is Allowed?", category: "Jobs", keywords: "remote work F-1 visa rules USA" },
  { title: "How to Prepare for a US Job Interview as an International Student", category: "Jobs", keywords: "job interview preparation international student USA" },
  { title: "Understanding Your US Paycheck and Tax Withholding", category: "Jobs", keywords: "US paycheck tax withholding international employee" },
  { title: "Networking Tips for International Students in the USA", category: "Jobs", keywords: "networking tips international students USA" },
  // City Guides
  { title: "Chicago Guide for International Students", category: "City Guides", keywords: "Chicago international students guide" },
  { title: "Los Angeles Guide for International Students", category: "City Guides", keywords: "Los Angeles international students guide" },
  { title: "San Francisco Bay Area Guide for International Students", category: "City Guides", keywords: "San Francisco Bay Area international students guide" },
  { title: "Houston Texas Guide for International Students", category: "City Guides", keywords: "Houston Texas international students guide" },
  { title: "Washington DC Guide for International Students", category: "City Guides", keywords: "Washington DC international students guide" },
  { title: "Atlanta Georgia Guide for International Students", category: "City Guides", keywords: "Atlanta Georgia international students guide" },
  // Daily Life
  { title: "How to Get an American Phone Number as an International Student", category: "Daily Life", keywords: "phone number SIM card international student USA" },
  { title: "Grocery Shopping in the USA — Tips for International Students", category: "Daily Life", keywords: "grocery shopping tips international students USA" },
  { title: "How to Use Public Transportation in US Cities", category: "Daily Life", keywords: "public transportation US cities international student" },
  { title: "Understanding Tipping Culture in the USA", category: "Daily Life", keywords: "tipping culture USA international student guide" },
  { title: "What to Do in Your First Week After Landing in the USA", category: "Daily Life", keywords: "first week USA international student checklist" },
  { title: "How to Make Friends as an International Student in the USA", category: "Daily Life", keywords: "make friends international student USA" },
  { title: "US Healthcare System Explained for International Students", category: "Daily Life", keywords: "US healthcare system explained international student" },
  { title: "Homesickness Abroad — How International Students Cope", category: "Daily Life", keywords: "homesickness international students USA coping" },
  { title: "Best Budgeting Apps for International Students in the USA", category: "Daily Life", keywords: "budgeting apps international students USA" },
  { title: "How to Ship Belongings to the USA Before You Arrive", category: "Daily Life", keywords: "ship belongings USA international student" },
  { title: "Understanding US Culture Shock — What to Expect", category: "Daily Life", keywords: "culture shock USA international student" },
];

// Throws instead of returning an empty list: picking topics without knowing what exists
// just produces a duplicate slug that the unique constraint rejects.
async function getPublishedArticles(): Promise<{ slugs: Set<string>; titles: string[] }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase config");
  const res = await fetch(`${url}/rest/v1/articles?select=slug,title&limit=10000`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Could not load published articles (${res.status})`);
  const rows: { slug?: string; title?: string }[] = await res.json();
  return {
    slugs: new Set(rows.map((r) => r.slug || "").filter(Boolean)),
    titles: rows.map((r) => r.title || "").filter(Boolean),
  };
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

  if (res.status === 200 || res.status === 201) return true;
  const detail = await res.text().catch(() => "");
  throw new Error(`Supabase insert failed (${res.status}): ${detail.slice(0, 200)}`);
}

export const maxDuration = 300;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  // Fail closed: an unset secret must not leave paid article generation open to anyone.
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const published = await getPublishedArticles();
    const available = TOPICS.filter((t) => !published.slugs.has(slugify(t.title)));

    let topic: { title: string; category: string; keywords: string } | null = null;
    if (available.length > 0) {
      // Pick randomly from remaining predefined topics
      topic = available[Math.floor(Math.random() * available.length)];
    } else {
      // All predefined topics used — ask Claude for a fresh one. It must see every published
      // title (including earlier generated ones), and a title that still collides is retried.
      for (let attempt = 0; attempt < 3 && !topic; attempt++) {
        const candidate = await generateTopic(published.titles);
        if (!published.slugs.has(slugify(candidate.title))) topic = candidate;
        else published.titles.push(candidate.title);
      }
      if (!topic) throw new Error("Could not find an unused topic after 3 attempts");
    }

    // Keep the planned title and slug: the slug was checked against published articles above.
    const slug = slugify(topic.title);
    const article = await writeArticle({ topic: topic.title, category: topic.category, keywords: topic.keywords });

    const saved = await publishToSupabase({
      title: topic.title,
      slug,
      excerpt: article.excerpt,
      content: article.content,
      category: topic.category,
      image_url: article.image_url,
      read_time: article.read_time,
      published_at: new Date().toISOString(),
    });

    if (!saved) return NextResponse.json({ error: "Failed to publish to Supabase" }, { status: 500 });

    return NextResponse.json({ ok: true, slug, title: topic.title });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
