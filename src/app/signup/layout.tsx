import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Create a YourGuideInUSA account to join student communities and connect with international students.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}

