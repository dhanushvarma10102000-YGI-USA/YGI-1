import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "International Student Guides & Articles",
  description:
    "Practical articles for international students in the USA covering visas, OPT, housing, banking, insurance, jobs, city guides, and daily life.",
  alternates: {
    canonical: "/blog",
  },
  openGraph: {
    title: "International Student Guides & Articles",
    description:
      "Read practical USA guides for international students, from visa and OPT basics to housing, banking, jobs, and city life.",
    url: "/blog",
  },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children;
}

