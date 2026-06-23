import BlogClient from "./BlogClient";
import { getArticles } from "@/lib/articles";
import { buildArticleListJsonLd } from "@/lib/seo";

export default async function BlogPage() {
  const posts = await getArticles();
  const listJsonLd = buildArticleListJsonLd(posts);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(listJsonLd) }} />
      <BlogClient initialPosts={posts} />
    </>
  );
}

