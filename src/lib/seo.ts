export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://yourguideinusa.com").replace(/\/$/, "");

export const SITE_NAME = "YourGuideInUSA";

export const DEFAULT_TITLE = "YourGuideInUSA - Your Complete Guide to Life in the USA";

export const DEFAULT_DESCRIPTION =
  "Explore housing, city guides, campus life, banking, visa help, jobs, and communities for students and newcomers moving to the USA.";

export const SEO_KEYWORDS = [
  "international student guide USA",
  "study in USA guide",
  "F1 visa student guide",
  "housing for international students",
  "USA city guide for students",
  "international student community",
  "student housing near universities",
  "new students in USA",
  "move to USA guide",
  "YourGuideInUSA",
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
    name: "International Student Guides & Articles",
    description: "Practical articles for international students in the USA",
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
