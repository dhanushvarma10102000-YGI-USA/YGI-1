import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/ds/Nav";
import { Footer } from "@/components/ds/Footer";
import { AnimatedGradientBg, GlassCard } from "@/components/ds/AnimatedGradient";
import { getArticle, getRelatedArticles } from "@/lib/articles";
import type { Article } from "@/lib/articles";
import ShareActions from "./ShareActions";
import { absoluteUrl, buildArticleJsonLd, buildBreadcrumbJsonLd, buildFaqJsonLd, extractFaqItems } from "@/lib/seo";

const CAT_COLORS: Record<string, string> = {
  "Insurance": "#8b5cf6",
  "Banking": "#3b82f6",
  "Visa & OPT": "#10b981",
  "City Guides": "#f59e0b",
  "Housing": "#ec4899",
  "Jobs": "#f97316",
  "Daily Life": "#14b8a6",
};

function renderInline(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return <span key={index}>{part}</span>;
  });
}

function renderMd(content: string) {
  const elements: React.ReactNode[] = [];
  let list: React.ReactNode[] = [];
  let key = 0;
  const flush = () => {
    if (!list.length) return;
    elements.push(<ul key={key++} style={{ paddingLeft: "20px", margin: "8px 0 16px" }}>{list}</ul>);
    list = [];
  };

  content.trim().split("\n").forEach((raw) => {
    const line = raw.trim();
    if (!line) {
      flush();
      return;
    }
    if (line.startsWith("## ")) {
      flush();
      elements.push(<h2 key={key++} style={{ fontSize: "22px", fontWeight: 700, color: "#111827", margin: "32px 0 12px", letterSpacing: "-0.5px" }}>{line.slice(3)}</h2>);
    } else if (line.startsWith("### ")) {
      flush();
      elements.push(<h3 key={key++} style={{ fontSize: "17px", fontWeight: 600, color: "#111827", margin: "20px 0 8px" }}>{line.slice(4)}</h3>);
    } else if (line.startsWith("- ") || /^\d+\.\s/.test(line)) {
      const text = line.startsWith("- ") ? line.slice(2) : line.replace(/^\d+\.\s/, "");
      list.push(<li key={key++} style={{ color: "#4B5563", marginBottom: "6px", lineHeight: 1.7, fontSize: "15px" }}>{renderInline(text)}</li>);
    } else {
      flush();
      elements.push(<p key={key++} style={{ color: "#4B5563", lineHeight: 1.85, fontSize: "16px", margin: "0 0 16px" }}>{renderInline(line)}</p>);
    }
  });
  flush();
  return elements;
}

function fmt(date: string) {
  try {
    return new Date(date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  } catch {
    return date;
  }
}

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) notFound();

  const related = await getRelatedArticles(article.category, slug);
  const color = CAT_COLORS[article.category] || "#2f8f86";
  const articleUrl = absoluteUrl(`/blog/${slug}`);
  const faqItems = extractFaqItems(article.content || "");
  const faqJsonLd = buildFaqJsonLd(faqItems);

  const jsonLdScripts = [
    buildArticleJsonLd(article, articleUrl),
    buildBreadcrumbJsonLd([
      { name: "Home", url: "/" },
      { name: "Blog", url: "/blog" },
      { name: article.category, url: `/blog?category=${encodeURIComponent(article.category)}` },
      { name: article.title, url: `/blog/${slug}` },
    ]),
    ...(faqJsonLd ? [faqJsonLd] : []),
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#e9e8e4] font-[Inter,sans-serif]">
      {jsonLdScripts.map((ld, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      ))}
      <div className="absolute inset-x-0 top-0 overflow-hidden rounded-b-[48px]" style={{ height: "280px" }}>
        <AnimatedGradientBg rounded="rounded-b-[48px]" />
        <div className="absolute inset-0 rounded-b-[48px] bg-gradient-to-b from-white/20 via-transparent to-transparent pointer-events-none" />
      </div>
      <div className="relative z-10">
        <Nav />
        <div className="mx-auto max-w-3xl px-4 pb-20 pt-24 sm:px-6">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-[#5d5a52] mb-6 flex-wrap">
            <Link href="/" className="hover:text-[#1a1916] transition-colors">Home</Link>
            <span aria-hidden="true">/</span>
            <Link href="/blog" className="hover:text-[#1a1916] transition-colors">Blog</Link>
            <span aria-hidden="true">/</span>
            <span className="text-[#a3a097]">{article.category}</span>
          </nav>

          <GlassCard className="overflow-hidden mb-8">
            {article.image_url && (
              <img
                src={article.image_url}
                alt={article.title}
                className="w-full h-72 sm:h-96 object-cover"
                loading="eager"
                fetchPriority="high"
              />
            )}
            <article className="p-6 sm:p-8">
              <span className="inline-block text-xs font-bold uppercase tracking-wide rounded-lg px-3 py-1 mb-4" style={{ background: color + "22", color }}>{article.category}</span>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 leading-tight" style={{ letterSpacing: "-0.5px" }}>{article.title}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-400 pb-6 border-b border-gray-100 flex-wrap">
                <span>YourGuideInUSA Team</span>
                <time dateTime={article.published_at}>{fmt(article.published_at)}</time>
                {article.read_time && <span>{article.read_time}</span>}
              </div>

              <div className="mt-6">{renderMd(article.content || "")}</div>
              <ShareActions title={article.title} />
            </article>
          </GlassCard>

          {related.length > 0 && (
            <section aria-label="Related articles">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Related articles</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {related.map((p: Article) => (
                  <Link key={p.slug} href={`/blog/${p.slug}`}>
                    <GlassCard className="overflow-hidden hover:-translate-y-1">
                      {p.image_url && <img src={p.image_url} alt={p.title} className="w-full h-28 object-cover" loading="lazy" />}
                      <div className="p-3">
                        <div className="text-xs font-bold uppercase mb-1" style={{ color: CAT_COLORS[p.category] || "#2f8f86" }}>{p.category}</div>
                        <div className="text-sm font-semibold text-gray-900 leading-snug">{p.title}</div>
                      </div>
                    </GlassCard>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
        <Footer />
      </div>
    </div>
  );
}
