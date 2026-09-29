import { NextResponse } from "next/server";
import { requireAdminDashboard } from "@/lib/admin-auth";
import { writeArticle } from "@/lib/article-writer";

export const dynamic = "force-dynamic";
// Writing a full article takes longer than the default function timeout.
export const maxDuration = 300;

// Returns a DRAFT only. Nothing is saved here: the admin reviews the checklist,
// sources, and risk notes, then publishes through /api/admin/content.
export async function POST(request: Request) {
  const auth = await requireAdminDashboard(request);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const topic = String(body?.topic || "").trim();
  const category = String(body?.category || "General").trim();
  if (!topic) {
    return NextResponse.json({ error: "Topic is required." }, { status: 400 });
  }

  try {
    const article = await writeArticle({ topic, category });
    return NextResponse.json({
      title: article.title,
      category: article.category,
      excerpt: article.excerpt,
      readTime: parseInt(article.read_time, 10) || 1,
      content: article.content,
      slug: article.slug,
      image_url: article.image_url,
      searchIntent: article.searchIntent,
      trafficAngle: article.trafficAngle,
      reviewChecklist: article.reviewChecklist,
      sourcesToVerify: article.sourcesToVerify.map((s) => ({ label: s.label, why: s.why, ...(s.url ? { url: s.url } : {}) })),
      riskNotes: article.riskNotes,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Article generation failed." },
      { status: 502 }
    );
  }
}
