import { getArticles } from "@/lib/articles";
import { SITE_URL, SITE_NAME } from "@/lib/seo";

export const dynamic = "force-static";
export const revalidate = 3600;

export async function GET() {
  const articles = await getArticles(30);

  const articleLines = articles
    .filter((a) => a.slug && a.title)
    .slice(0, 30)
    .map((a) => `- [${a.title}](${SITE_URL}/blog/${a.slug})${a.excerpt ? `: ${a.excerpt.slice(0, 120)}` : ""}`)
    .join("\n");

  const body = `# ${SITE_NAME}

> Complete guide, blog, and community platform for international students living in or moving to the USA.

${SITE_NAME} helps international students navigate every stage of settling in America — from pre-arrival paperwork to building community on campus. Content is written for F-1, J-1, and OPT/STEM OPT visa holders at universities and in cities across the United States.

## Key pages

- [Guide](${SITE_URL}/guide): Interactive map-based local guide. Search housing, restaurants, banking, healthcare, and campus services near any US city or university.
- [Blog](${SITE_URL}/blog): Practical articles on visas, OPT, banking, insurance, housing, jobs, city life, and daily essentials for international students.
- [Community](${SITE_URL}/community): University and city community groups where international students connect, ask questions, and share advice.
- [Sign up](${SITE_URL}/signup): Create a free account to join community groups and participate.

## Topics covered

- F-1 visa, OPT, STEM OPT, CPT, and immigration document checklists
- Opening a US bank account and building credit as an international student
- Health insurance options for F-1 students, OPT holders, and new arrivals
- Student housing search, rental safety, and lease advice
- City arrival guides: New York, Boston, Chicago, Los Angeles, San Francisco, Seattle, Austin, Washington DC, Miami, and more
- University campus guides: Harvard, MIT, Stanford, Yale, Columbia, NYU, UCLA, UC Berkeley, Cornell, Princeton, and more
- US taxes for international students (Form 1040-NR, ITIN, treaty benefits)
- Phone plans, transport, groceries, and daily life tips

## Recent articles

${articleLines}

## About

${SITE_NAME} is an independent platform built for international students. All content is reviewed before publication. Immigration, legal, financial, and health information is provided for general guidance only and should be verified with official sources.

Contact: via the [contact page](${SITE_URL}/contact)
`;

  return new Response(body.trim(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
