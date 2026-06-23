import type { Metadata } from "next";
import { getArticle } from "@/lib/articles";
import type { Article } from "@/lib/articles";
import { absoluteUrl, SITE_NAME } from "@/lib/seo";

type Props = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

type MetadataProps = {
  params: Promise<{ slug: string }>;
};

function titleFromSlug(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function textDescription(article: Article | null) {
  const text = article?.excerpt || article?.content || "Practical guidance from YourGuideInUSA guides and articles.";
  return text
    .replace(/[#*_`>\[\]()]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 155);
}

export async function generateMetadata({ params }: MetadataProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);
  const title = `${article?.title || titleFromSlug(slug)} | ${SITE_NAME}`;
  const description = textDescription(article);
  const url = absoluteUrl(`/blog/${slug}`);

  return {
    title,
    description,
    keywords: article?.category
      ? [article.category, "international students USA", "F1 visa", SITE_NAME]
      : undefined,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type: "article",
      publishedTime: article?.published_at,
      modifiedTime: article?.updated_at || article?.published_at,
      authors: [SITE_NAME],
      section: article?.category,
      images: article?.image_url
        ? [{ url: article.image_url, alt: article.title, width: 1200, height: 630 }]
        : undefined,
    },
    twitter: {
      card: article?.image_url ? "summary_large_image" : "summary",
      title,
      description,
      images: article?.image_url ? [article.image_url] : undefined,
    },
  };
}

export default function BlogArticleLayout({ children }: Props) {
  return children;
}
