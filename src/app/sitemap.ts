import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { getArticles } from "@/lib/articles";
import { getCommunityGroups } from "@/lib/community-directory";

const routes: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}> = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/guide", changeFrequency: "weekly", priority: 0.95 },
  { path: "/community", changeFrequency: "daily", priority: 0.9 },
  { path: "/blog", changeFrequency: "weekly", priority: 0.85 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.55 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.25 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();

  const staticRoutes = routes.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const groups = await getCommunityGroups();
  const groupRoutes = groups.map((group) => ({
    url: `${SITE_URL}/community/${group.id}`,
    lastModified,
    changeFrequency: "weekly" as const,
    priority: group.type === "School" ? 0.82 : 0.72,
  }));

  const articles = await getArticles(100);
  const articleRoutes = articles
    .filter((article) => article.slug)
    .map((article) => ({
      url: `${SITE_URL}/blog/${article.slug}`,
      lastModified: article.published_at ? new Date(article.published_at) : lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.75,
    }));

  return [...staticRoutes, ...groupRoutes, ...articleRoutes];
}
