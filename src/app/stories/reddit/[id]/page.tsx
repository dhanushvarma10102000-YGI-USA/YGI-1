import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import PostPageClient from "./PostPageClient";

type Post = {
  id: string; title: string; selftext: string; subreddit: string;
  author: string; permalink: string; created_utc: number;
};

async function getPost(id: string): Promise<Post | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  try {
    const db = createClient(url, key);
    const { data } = await db.from("reddit_posts").select("*").eq("id", id).single();
    return (data as Post) ?? null;
  } catch { return null; }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const post = await getPost(id);
  const title = post?.title ?? "Community Discussion";
  const description = post?.selftext
    ? post.selftext.slice(0, 155) + (post.selftext.length > 155 ? "…" : "")
    : "Real experiences from immigrants and international students navigating life in the USA.";

  return {
    title: `${title} | YourGuideInUSA`,
    description,
    alternates: { canonical: `/stories/reddit/${id}` },
    openGraph: { title, description, url: `/stories/reddit/${id}`, type: "article" },
  };
}

export default async function RedditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await getPost(id);
  // Pass post to client — may be null if Supabase table not yet created or post not yet cached.
  // Client component falls back to sessionStorage (saved when user clicked the card).
  return <PostPageClient id={id} serverPost={post} />;
}

export const revalidate = 86400;
