import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Communities in the USA — Connect with People Near You",
  description:
    "Browse university and city communities across the USA. Join groups, ask questions, and connect with people near your campus or city.",
  alternates: {
    canonical: "/community",
  },
  openGraph: {
    title: "Communities in the USA — Connect with People Near You",
    description:
      "Find university and city communities in the USA, then join when you are ready to connect.",
    url: "/community",
  },
};

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return children;
}

