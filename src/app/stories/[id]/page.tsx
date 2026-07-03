import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import StoryPageClient from "./StoryPageClient";

type StoryRow = {
  id: string; title: string; excerpt: string | null; body_html: string | null;
  category: string | null; city: string | null; uni: string | null;
  anon: boolean; display_name: string | null; upvotes: number;
  comments: number; read_time: number; created_at: string; user_id: string;
};

async function getStory(id: string): Promise<StoryRow | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  try {
    const db = createClient(url, key);
    const { data } = await db.from("stories").select("*").eq("id", id).single();
    return (data as StoryRow) ?? null;
  } catch { return null; }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const story = await getStory(id);
  const title = story?.title ?? "A Journey in the USA";
  const description = story?.excerpt
    ? story.excerpt.slice(0, 155) + (story.excerpt.length > 155 ? "…" : "")
    : "A real experience shared by someone navigating life in the United States.";
  return {
    title: `${title} | YourGuideInUSA`,
    description,
    alternates: { canonical: `/stories/${id}` },
    openGraph: { title, description, url: `/stories/${id}`, type: "article" },
  };
}

export default async function StoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const story = await getStory(id);
  if (!story) notFound();
  return <StoryPageClient story={story} />;
}

export const revalidate = 3600;
