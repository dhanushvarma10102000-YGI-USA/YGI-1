import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to YourGuideInUSA to join student communities and manage your account.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}

