import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Community Dashboard",
  description: "Your private student community dashboard on YourGuideInUSA.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CommunityDashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}

