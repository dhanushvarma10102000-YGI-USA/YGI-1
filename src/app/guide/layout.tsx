import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "USA City & Campus Guide — Find Your Place in America",
  description:
    "Search housing, restaurants, shopping, attractions, and campus areas across 50+ US cities and universities.",
  alternates: {
    canonical: "/guide",
  },
  openGraph: {
    title: "USA City & Campus Guide — Find Your Place in America",
    description:
      "Find housing, restaurants, shopping, and campus highlights near your city or university in the USA.",
    url: "/guide",
  },
};

export default function GuideLayout({ children }: { children: React.ReactNode }) {
  return children;
}

