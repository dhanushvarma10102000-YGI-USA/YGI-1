import type { Metadata } from "next";
import ContactClient from "./ContactClient";

export const metadata: Metadata = {
  title: "Contact YourGuideInUSA",
  description:
    "Contact YourGuideInUSA for student guide questions, city guide corrections, partnerships, and support for international students in the USA.",
  alternates: {
    canonical: "/contact",
  },
  openGraph: {
    title: "Contact YourGuideInUSA",
    description:
      "Get in touch for support, partnerships, corrections, and student guide questions.",
    url: "/contact",
  },
};

export default function ContactPage() {
  return <ContactClient />;
}
