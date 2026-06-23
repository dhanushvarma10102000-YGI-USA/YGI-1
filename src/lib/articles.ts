export type Article = {
  slug: string;
  title: string;
  excerpt?: string;
  category: string;
  image_url?: string;
  published_at: string;
  updated_at?: string;
  read_time?: string;
  content?: string;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function headers() {
  if (!SUPABASE_URL || !SUPABASE_ANON) return null;
  return {
    apikey: SUPABASE_ANON,
    Authorization: `Bearer ${SUPABASE_ANON}`,
  };
}

export async function getArticles(limit?: number): Promise<Article[]> {
  const authHeaders = headers();
  if (!SUPABASE_URL || !authHeaders) return [];

  const params = new URLSearchParams({
    select: "*",
    order: "published_at.desc",
  });
  if (limit) params.set("limit", String(limit));

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/articles?${params.toString()}`, {
      headers: authHeaders,
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function getArticle(slug: string): Promise<Article | null> {
  const authHeaders = headers();
  if (!SUPABASE_URL || !authHeaders) return null;

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/articles?slug=eq.${encodeURIComponent(slug)}&select=*&limit=1`, {
      headers: authHeaders,
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) && data[0] ? data[0] : null;
  } catch {
    return null;
  }
}

export async function getRelatedArticles(category: string, slug: string): Promise<Article[]> {
  const authHeaders = headers();
  if (!SUPABASE_URL || !authHeaders || !category) return [];

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/articles?category=eq.${encodeURIComponent(category)}&slug=neq.${encodeURIComponent(slug)}&select=slug,title,category,image_url,published_at,read_time,excerpt&limit=3`,
      {
        headers: authHeaders,
        next: { revalidate: 300 },
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

