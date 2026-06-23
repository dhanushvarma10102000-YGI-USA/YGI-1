import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "USA City & Campus Guide for International Students",
  description:
    "Search nearby housing, restaurants, shopping, attractions, and campus areas for international students moving to cities and universities across the USA.",
  alternates: {
    canonical: "/guide",
  },
  openGraph: {
    title: "USA City & Campus Guide for International Students",
    description:
      "Find student housing, restaurants, shopping, places, and campus highlights near your city or university.",
    url: "/guide",
  },
};

export default function GuideLayout({ children }: { children: React.ReactNode }) {
  return children;
}

