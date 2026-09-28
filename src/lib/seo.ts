export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://yourguideinusa.com").replace(/\/$/, "");

export const SITE_NAME = "Your Guide In USA";

export const DEFAULT_TITLE = "Your Guide In USA — City Guides, Visas, Housing & Student Community";

export const DEFAULT_DESCRIPTION =
  "Your Guide In USA helps international students and newcomers explore US cities, find housing, understand visas, open bank accounts, and connect with community. Free, practical advice for life in the USA.";

export const SEO_KEYWORDS = [
  "your guide in USA",
  "guide to living in USA",
  "international student guide USA",
  "study in USA guide",
  "F1 visa student guide",
  "housing for international students",
  "USA city guide for students",
  "newcomer guide USA",
  "move to USA guide",
  "life in USA guide",
];

export function absoluteUrl(path = "/") {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function buildArticleJsonLd(article: {
  title: string;
  excerpt?: string;
  category: string;
  image_url?: string;
  published_at: string;
  updated_at?: string;
  content?: string;
}, url: string) {
  const wordCount = article.content
    ? article.content.replace(/[#*_`>\[\]()]/g, " ").split(/\s+/).filter(Boolean).length
    : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": url,
    headline: article.title,
    ...(article.excerpt ? { description: article.excerpt } : {}),
    url,
    datePublished: article.published_at,
    dateModified: article.updated_at || article.published_at,
    author: {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl("/statue-liberty-mark.png"),
      },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    articleSection: article.category,
    inLanguage: "en-US",
    ...(wordCount ? { wordCount } : {}),
    ...(article.image_url
      ? { image: { "@type": "ImageObject", url: article.image_url, caption: article.title } }
      : {}),
  };
}

export function buildBreadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.url),
    })),
  };
}

export function extractFaqItems(content: string): { question: string; answer: string }[] {
  const faqSection = content.match(
    /##\s+(?:FAQ|Frequently Asked Questions)[^\n]*\n([\s\S]+?)(?=\n##\s|$)/i
  );
  if (!faqSection) return [];

  const pairs: { question: string; answer: string }[] = [];
  const qaRe = /###\s+(.+?)\n([\s\S]+?)(?=\n###\s|\n##\s|$)/g;
  let m;
  while ((m = qaRe.exec(faqSection[1])) !== null) {
    const question = m[1].trim();
    const answer = m[2]
      .replace(/[#*_`>\[\]()-]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 500);
    if (question && answer) pairs.push({ question, answer });
  }
  return pairs;
}

export function buildFaqJsonLd(items: { question: string; answer: string }[]) {
  if (!items.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  };
}

export function buildArticleListJsonLd(
  articles: { title: string; slug: string; excerpt?: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Guides & Articles — Complete USA Life Guide",
    description: "Practical guides for newcomers and students settling in the USA",
    url: absoluteUrl("/blog"),
    itemListElement: articles.slice(0, 20).map((a, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: absoluteUrl(`/blog/${a.slug}`),
      name: a.title,
      ...(a.excerpt ? { description: a.excerpt } : {}),
    })),
  };
}

// JSON for a <script type="application/ld+json"> tag. JSON.stringify alone leaves "</script>"
// intact, so a user-controlled value (like a custom group name) could close the tag and inject HTML.
export function jsonLdHtml(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
