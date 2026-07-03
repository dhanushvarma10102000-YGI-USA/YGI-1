import type { Metadata } from "next";
import StoriesClient from "./StoriesClient";

export const metadata: Metadata = {
  title: "Journeys",
  description:
    "Real journeys from immigrants, international students, and newcomers finding their footing in the United States. Share your own experience.",
  alternates: { canonical: "/stories" },
  openGraph: {
    title: "Journeys | Your Guide in USA",
    description:
      "Real experiences from people navigating life in the U.S. — visas, banking, housing, community, and everything in between.",
    url: "/stories",
    type: "website",
  },
};

export default function StoriesPage() {
  return <StoriesClient />;
}
