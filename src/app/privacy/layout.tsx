import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Read the YourGuideInUSA privacy policy for account data, community posts, cookies, Google services, Supabase, and user privacy rights.",
  alternates: {
    canonical: "/privacy",
  },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}

