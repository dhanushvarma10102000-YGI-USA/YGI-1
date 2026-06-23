import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "International Student Communities in the USA",
  description:
    "Browse university and city communities for international students in the USA. Join groups, ask questions, and connect with students near your campus.",
  alternates: {
    canonical: "/community",
  },
  openGraph: {
    title: "International Student Communities in the USA",
    description:
      "Find university and city communities for international students, then join when you are ready to connect.",
    url: "/community",
  },
};

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return children;
}

