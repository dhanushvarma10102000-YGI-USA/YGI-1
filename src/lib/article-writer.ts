import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

// One writer for both the daily cron and the admin Generate tab, so every article
// follows the same accuracy rules and comes back in the same shape.

export const ARTICLE_CATEGORIES = ["Insurance", "Banking", "Visa & OPT", "Housing", "Jobs", "City Guides", "Daily Life"] as const;

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";
// Server-side refusal fallback ("default" routing) is only accepted on these models.
const FALLBACK_MODELS = new Set(["claude-opus-5-5", "claude-opus-5", "claude-fable-5-1", "claude-sonnet-5-5"]);

const SITE_FOCUS = [
  "city arrival basics",
  "campus and university-specific setup",
  "housing search and rental safety",
  "banking, credit, phone plans, insurance, transport, groceries, and daily life",
  "visa, CPT, OPT, STEM OPT, SSN, taxes, and document checklists",
  "YourGuideInUSA community groups, journeys, and blog",
];

const ArticleSchema = z.object({
  title: z.string(),
  excerpt: z.string(),
  readTimeMinutes: z.number().int(),
  content: z.string(),
  searchIntent: z.string(),
  trafficAngle: z.string(),
  reviewChecklist: z.array(z.string()),
  sourcesToVerify: z.array(z.object({ label: z.string(), url: z.string(), why: z.string() })),
  riskNotes: z.array(z.string()),
});

const TopicSchema = z.object({
  title: z.string(),
  category: z.enum(ARTICLE_CATEGORIES),
  keywords: z.string(),
});

export type WrittenArticle = z.infer<typeof ArticleSchema> & {
  slug: string;
  category: string;
  read_time: string;
  image_url: string;
};

export function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

let client: Anthropic | null = null;
function anthropic() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("Missing ANTHROPIC_API_KEY on the server.");
  client ??= new Anthropic();
  return client;
}

async function structured<T extends z.ZodType>(schema: T, prompt: string, maxTokens: number): Promise<z.infer<T>> {
  const useFallback = FALLBACK_MODELS.has(MODEL);
  const response = await anthropic().beta.messages.parse({
    model: MODEL,
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
    output_config: { format: betaZodOutputFormat(schema) },
    ...(useFallback ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
  });
  if (response.stop_reason === "refusal") throw new Error("Claude declined to write this topic. Try rewording it.");
  if (response.stop_reason === "max_tokens") throw new Error("The article was cut off before it finished. Try again.");
  if (!response.parsed_output) throw new Error("Claude returned an article that didn't match the expected format.");
  return response.parsed_output as z.infer<T>;
}

function articlePrompt(topic: string, category: string, keywords?: string) {
  return `You are writing for "YourGuideInUSA", a website that helps international students and newcomers settle in the United States.

Write original, people-first content that reads like honest advice from someone who has been through it. No generic SEO filler, no keyword stuffing.

Site focus areas:
${SITE_FOCUS.map((item) => `- ${item}`).join("\n")}

Accuracy rules:
- Do not invent laws, dates, prices, deadlines, forms, eligibility rules, school policies, phone numbers, or addresses.
- For immigration, legal, financial, insurance, health, housing, or safety claims, use cautious language ("typically", "check with your DSO") and flag exact claims for verification.
- If a detail changes often, tell the reader what to verify instead of stating it as current fact.
- Only list sources a human editor should check; never cite sources you are unsure exist. Leave "url" empty when you don't know the official address.

Topic: ${topic}
Category: ${category}${keywords ? `\nTarget search phrase: ${keywords}` : ""}

The "content" field is the full article in Markdown, 1,000-1,400 words: ## for main headings, ### for subheadings, practical steps, real cost ranges only where well established, a YourGuideInUSA angle where it fits naturally, and a short "## FAQ" section at the end with each question as a ### heading.
"excerpt" is 1-2 sentences under 200 characters. "searchIntent" and "trafficAngle" explain who searches for this and why. "reviewChecklist", "sourcesToVerify", and "riskNotes" are for the human editor who reviews the draft before it is published.`;
}

async function pexelsImage(query: string) {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return "";
  try {
    const res = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`, {
      headers: { Authorization: key },
    });
    if (!res.ok) return "";
    const photos: { src?: { large?: string } }[] = (await res.json()).photos ?? [];
    return photos.length ? photos[Math.floor(Math.random() * photos.length)].src?.large ?? "" : "";
  } catch {
    return "";
  }
}

export async function writeArticle(input: { topic: string; category: string; keywords?: string }): Promise<WrittenArticle> {
  const [article, image_url] = await Promise.all([
    structured(ArticleSchema, articlePrompt(input.topic, input.category, input.keywords), 16000),
    pexelsImage(input.keywords || input.topic),
  ]);
  const minutes = Math.max(1, article.readTimeMinutes || Math.round(article.content.split(/\s+/).length / 200));
  return {
    ...article,
    title: article.title.trim() || input.topic,
    excerpt: article.excerpt.slice(0, 220),
    category: input.category,
    slug: slugify(article.title || input.topic),
    read_time: `${minutes} min read`,
    image_url,
  };
}

// Invents a fresh topic that isn't one of `usedTitles` (used when the cron's topic list runs out).
export async function generateTopic(usedTitles: string[]) {
  return structured(
    TopicSchema,
    `You are a content strategist for "YourGuideInUSA", a website helping international students and newcomers settle in the United States.

Suggest ONE new article topic that is practical, specific, and useful for F-1 students or recent immigrants, and that is not already covered.

Already published (do not repeat or closely paraphrase):
${usedTitles.map((t) => `- ${t}`).join("\n")}

"title" is clear and specific, 6-12 words. "keywords" is the 4-7 word search phrase people would type.`,
    1000
  );
}
