import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Guides & Articles — Complete USA Life Guide",
  description:
    "Practical guides covering housing, banking, visas, jobs, insurance, city life, and everything you need to settle in the USA.",
  alternates: {
    canonical: "/blog",
  },
  openGraph: {
    title: "Guides & Articles — Complete USA Life Guide",
    description:
      "Read practical USA guides on housing, banking, visas, jobs, and daily life for newcomers and students.",
    url: "/blog",
  },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children;
}

