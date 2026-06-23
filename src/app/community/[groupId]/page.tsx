import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Footer } from "@/components/ds/Footer";
import { Nav } from "@/components/ds/Nav";
import { absoluteUrl, SITE_NAME } from "@/lib/seo";
import type { CommunityGroup } from "@/lib/community-groups";
import { getCommunityGroupById, getCommunityGroups } from "@/lib/community-directory";

type Props = {
  params: Promise<{ groupId: string }>;
};

function labelFor(groupType: string) {
  return groupType === "School" ? "University group" : groupType === "City" ? "City group" : "Community group";
}

function descriptionFor(group: CommunityGroup) {
  return `${group.name} community on ${SITE_NAME}. Find local guidance, ask questions, and connect around ${group.location || "the USA"}.`;
}

export async function generateStaticParams() {
  const groups = await getCommunityGroups();
  return groups.map((group) => ({ groupId: group.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { groupId } = await params;
  const group = await getCommunityGroupById(groupId);
  if (!group) return {};

  const title = `${group.name} Community | ${SITE_NAME}`;
  const description = descriptionFor(group);
  const url = absoluteUrl(`/community/${group.id}`);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function CommunityGroupPage({ params }: Props) {
  const { groupId } = await params;
  const group = await getCommunityGroupById(groupId);
  if (!group) notFound();

  const url = absoluteUrl(`/community/${group.id}`);
  const label = labelFor(group.type);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${group.name} Community`,
    description: descriptionFor(group),
    url,
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: absoluteUrl("/"),
    },
    about: {
      "@type": group.type === "School" ? "CollegeOrUniversity" : "Place",
      name: group.name,
      address: group.location,
    },
  };

  return (
    <main className="min-h-screen bg-[#f6f8fb] font-[Inter,sans-serif] text-[#101828]">
      <Nav />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="mx-auto grid max-w-6xl gap-8 px-5 pb-16 pt-28 md:grid-cols-[1fr_340px] lg:px-8">
        <div className="rounded-[22px] border border-[#dfe3eb] bg-white p-6 shadow-[0_24px_70px_-48px_rgba(15,23,42,.45)] sm:p-9">
          <div className="mb-6 flex flex-wrap items-center gap-3 text-sm font-black text-[#4f46e5]">
            <span className="rounded-full border border-[#c7d2fe] bg-[#eef2ff] px-4 py-2">{label}</span>
            {group.location && <span className="text-[#667085]">{group.location}</span>}
          </div>

          <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-normal text-[#101828] sm:text-5xl">
            {group.name} Community
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[#667085]">
            {group.description} Use this page to find the right group quickly, then open the community space to view or join.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={`/community?group=${group.id}`} className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#dfe3eb] bg-white px-5 text-sm font-black text-[#101828] shadow-sm">
              Open this group
            </Link>
            <Link href={`/community?group=${group.id}&action=join`} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#4f46e5] px-5 text-sm font-black text-white shadow-[0_18px_40px_-24px_rgba(79,70,229,.75)]">
              Join group
            </Link>
            <Link href="/community" className="inline-flex min-h-12 items-center justify-center rounded-xl px-4 text-sm font-black text-[#4f46e5]">
              Browse all groups
            </Link>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            <section className="rounded-2xl border border-[#e7ebf2] bg-[#f8fafc] p-5">
              <h2 className="text-lg font-black text-[#101828]">What this group is for</h2>
              <p className="mt-3 leading-7 text-[#667085]">
                Ask practical questions, find local context, and connect with people around {group.name}{group.location ? ` in ${group.location}` : ""}.
              </p>
            </section>
            <section className="rounded-2xl border border-[#e7ebf2] bg-[#f8fafc] p-5">
              <h2 className="text-lg font-black text-[#101828]">Helpful topics</h2>
              <ul className="mt-3 space-y-2 leading-7 text-[#667085]">
                <li>Housing and neighborhoods nearby</li>
                <li>Arrival questions and local basics</li>
                <li>Campus, city, banking, SIM, and food tips</li>
              </ul>
            </section>
          </div>
        </div>

        <aside className="h-fit rounded-[22px] border border-[#dfe3eb] bg-white p-6 shadow-[0_24px_70px_-52px_rgba(15,23,42,.45)]">
          <div className="text-sm font-black uppercase tracking-[.14em] text-[#98a2b3]">Group profile</div>
          <dl className="mt-5 grid gap-4">
            <div>
              <dt className="text-sm font-bold text-[#667085]">Name</dt>
              <dd className="mt-1 text-lg font-black text-[#101828]">{group.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-bold text-[#667085]">Type</dt>
              <dd className="mt-1 font-black text-[#101828]">{label}</dd>
            </div>
            {group.location && (
              <div>
                <dt className="text-sm font-bold text-[#667085]">Location</dt>
                <dd className="mt-1 font-black text-[#101828]">{group.location}</dd>
              </div>
            )}
          </dl>
        </aside>
      </section>
      <Footer />
    </main>
  );
}
