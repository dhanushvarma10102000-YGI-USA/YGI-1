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
  { path: "/community", changeFrequency: "daily", priority: 0.9 },
  { path: "/blog", changeFrequency: "weekly", priority: 0.85 },
  { path: "/stories", changeFrequency: "daily", priority: 0.88 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.55 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.25 },
];

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Public rows only (anon key). Story and Reddit discussion pages are otherwise only linked
// from client-loaded feeds, so without this Google has no way to discover them.
async function publicRows<T>(query: string): Promise<T[]> {
  if (!SUPABASE_URL || !SUPABASE_ANON) return [];
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${query}`, {
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const rows = await res.json();
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

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

  const [stories, redditPosts] = await Promise.all([
    publicRows<{ id: string; created_at: string }>("stories?select=id,created_at&order=created_at.desc&limit=1000"),
    publicRows<{ id: string; created_utc: number }>("reddit_posts?select=id,created_utc&order=fetched_at.desc&limit=1000"),
  ]);

  const storyRoutes = stories.map((story) => ({
    url: `${SITE_URL}/stories/${story.id}`,
    lastModified: new Date(story.created_at),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const redditRoutes = redditPosts.map((post) => ({
    url: `${SITE_URL}/stories/reddit/${post.id}`,
    lastModified: post.created_utc ? new Date(post.created_utc * 1000) : lastModified,
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));

  return [...staticRoutes, ...groupRoutes, ...articleRoutes, ...storyRoutes, ...redditRoutes];
}
