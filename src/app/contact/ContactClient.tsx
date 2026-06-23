"use client";

import React, { useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock3,
  Mail,
  MessageSquareText,
  Send,
  ShieldCheck,
} from "lucide-react";
import { Nav } from "@/components/ds/Nav";
import { Footer } from "@/components/ds/Footer";
import { supabase } from "@/lib/supabase";

type FormState = {
  name: string;
  email: string;
  topic: string;
  message: string;
};

const CONTACT_EMAIL = "yourguideinusa@gmail.com";

const topics = [
  "General question",
  "Report incorrect information",
  "Request a city guide",
  "Partnership",
  "Advertising",
  "Technical issue",
];

const contactCards = [
  {
    icon: Mail,
    title: "General inbox",
    value: CONTACT_EMAIL,
    detail: "Questions, support, feedback, and collaboration ideas.",
    href: `mailto:${CONTACT_EMAIL}`,
  },
  {
    icon: AlertCircle,
    title: "Corrections",
    value: "Report wrong info",
    detail: "Send the city, place, page link, and what needs to change.",
    topic: "Report incorrect information",
  },
  {
    icon: Building2,
    title: "Partnerships",
    value: "Work with us",
    detail: "For universities, local businesses, creators, and student groups.",
    topic: "Partnership",
  },
  
];

const faqs = [
  {
    q: "Can I request a new city or university guide?",
    a: "Yes. Share the city or university name and what information would help you most.",
  },
  {
    q: "How do I report incorrect information?",
    a: "Send the page or place name, the correct details, and any source we should verify.",
  },
  {
    q: "Do you work with student groups or local businesses?",
    a: "Yes. We review partnerships that are useful for students, newcomers, and families.",
  },
];

const initialForm: FormState = {
  name: "",
  email: "",
  topic: "",
  message: "",
};

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-2 block text-xs font-bold uppercase text-[#6f6b62]">
      {children}
    </label>
  );
}

export default function ContactClient() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement | null>(null);

  function updateForm(next: Partial<FormState>) {
    setForm((current) => ({ ...current, ...next }));
    setSubmitted(false);
    setError("");
  }

  function chooseTopic(topic: string) {
    updateForm({ topic });
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setError("");

    const payload = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      topic: form.topic.trim() || null,
      message: form.message.trim(),
      page_url: typeof window === "undefined" ? null : window.location.href,
      user_agent: typeof navigator === "undefined" ? null : navigator.userAgent,
    };

    if (!payload.name || !payload.email || !payload.message) {
      setError("Please add your name, email, and message.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
      setError("Please add a valid email address.");
      return;
    }
    if (payload.message.length < 10) {
      setError("Please add a little more detail to your message.");
      return;
    }

    setSubmitting(true);
    const { error: submitError } = await supabase.from("contact_messages").insert(payload);
    setSubmitting(false);

    if (submitError) {
      setError("Unable to submit right now. Please try again, or use the General inbox email link.");
      return;
    }

    setForm(initialForm);
    setSubmitted(true);
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#e9e8e4] text-[#1a1916]">
      <Nav />

      <section className="relative overflow-hidden border-b border-[#e3e1db] bg-[#f6f5f2] pt-28">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(47,143,134,.16),transparent_26%),radial-gradient(circle_at_85%_10%,rgba(194,104,63,.12),transparent_25%)]" />
        <div className="relative mx-auto grid max-w-[1180px] gap-10 px-5 pb-16 pt-10 md:grid-cols-[1fr_360px] md:px-8 md:pb-20">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#e3e1db] bg-white px-3 py-1.5 text-xs font-bold uppercase text-[#2f8f86] shadow-[0_18px_36px_-30px_rgba(30,28,22,.4)]">
              <MessageSquareText className="h-4 w-4" />
              Contact
            </div>
            <h1 className="max-w-3xl text-[36px] font-extrabold leading-[1.02] text-[#1a1916] sm:text-[58px] sm:leading-[0.98]">
              We are here to help you move with confidence.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#5d5a52]">
              Ask a question, report incorrect information, request a guide, or reach out about a useful partnership for students and newcomers.
            </p>
          </div>

          <div className="rounded-[18px] border border-[#e3e1db] bg-white p-5 shadow-[0_28px_56px_-44px_rgba(30,28,22,.55)]">
            <div className="flex items-start gap-3 border-b border-[#eeeae3] pb-4">
              <span className="grid h-10 w-10 place-items-center rounded-[12px] bg-[#e6f0ee] text-[#2f8f86]">
                <Clock3 className="h-5 w-5" />
              </span>
              <div>
                <div className="font-bold text-[#1a1916]">Typical response</div>
                <p className="mt-1 text-sm leading-6 text-[#5d5a52]">Most messages are reviewed within one business day.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 pt-4">
              <span className="grid h-10 w-10 place-items-center rounded-[12px] bg-[#f5ece6] text-[#c2683f]">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <div className="font-bold text-[#1a1916]">Privacy minded</div>
                <p className="mt-1 text-sm leading-6 text-[#5d5a52]">Your message is used only to respond to your request.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1180px] gap-8 px-5 py-12 md:px-8 lg:grid-cols-[0.82fr_1.18fr]">
        <aside className="space-y-4">
          {contactCards.map((card) => {
            const Icon = card.icon;
            const cardContent = (
              <div className="flex gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white text-[#2f8f86] ring-1 ring-[#e3e1db] transition group-hover:ring-[#c9d8d5]">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <div className="text-xs font-bold uppercase text-[#8b877e]">{card.title}</div>
                  <div className="mt-1 font-bold text-[#1a1916]">{card.value}</div>
                  <p className="mt-1 text-sm leading-6 text-[#5d5a52]">{card.detail}</p>
                </div>
              </div>
            );

            return card.href ? (
              <a
                key={card.title}
                href={card.href}
                className="group block rounded-[14px] border border-[#e3e1db] bg-[#f6f5f2] p-5 shadow-[0_18px_36px_-32px_rgba(30,28,22,.45)] transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_26px_46px_-36px_rgba(30,28,22,.5)]"
              >
                {cardContent}
              </a>
            ) : (
              <button
                key={card.title}
                type="button"
                onClick={() => card.topic && chooseTopic(card.topic)}
                className="group block w-full rounded-[14px] border border-[#e3e1db] bg-[#f6f5f2] p-5 text-left shadow-[0_18px_36px_-32px_rgba(30,28,22,.45)] transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_26px_46px_-36px_rgba(30,28,22,.5)]"
              >
                {cardContent}
              </button>
            );
          })}
        </aside>

        <div className="rounded-[18px] border border-[#e3e1db] bg-white p-5 shadow-[0_32px_70px_-52px_rgba(30,28,22,.6)] sm:p-7">
          <div className="mb-6 flex items-start justify-between gap-4 border-b border-[#eeeae3] pb-5">
            <div>
              <h2 className="text-2xl font-extrabold text-[#1a1916]">Send a message</h2>
              <p className="mt-2 text-sm leading-6 text-[#5d5a52]">Submit here without opening your email app.</p>
            </div>
            {submitted && (
              <div className="hidden items-center gap-2 rounded-full bg-[#e6f0ee] px-3 py-1.5 text-sm font-bold text-[#2f8f86] sm:flex">
                <CheckCircle2 className="h-4 w-4" />
                Submitted
              </div>
            )}
          </div>

          <form ref={formRef} onSubmit={handleSubmit} className="grid gap-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <FieldLabel htmlFor="name">Name</FieldLabel>
                <input
                  id="name"
                  required
                  value={form.name}
                  onChange={(event) => updateForm({ name: event.target.value })}
                  autoComplete="name"
                  className="h-12 w-full rounded-[12px] border border-[#e3e1db] bg-[#fbfaf8] px-4 text-sm text-[#1a1916] outline-none transition placeholder:text-[#a3a097] focus:border-[#2f8f86] focus:bg-white focus:ring-4 focus:ring-[#2f8f86]/10"
                  placeholder="Your name"
                />
              </div>

              <div>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <input
                  id="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(event) => updateForm({ email: event.target.value })}
                  autoComplete="email"
                  className="h-12 w-full rounded-[12px] border border-[#e3e1db] bg-[#fbfaf8] px-4 text-sm text-[#1a1916] outline-none transition placeholder:text-[#a3a097] focus:border-[#2f8f86] focus:bg-white focus:ring-4 focus:ring-[#2f8f86]/10"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <FieldLabel htmlFor="topic">Topic</FieldLabel>
              <select
                id="topic"
                value={form.topic}
                onChange={(event) => updateForm({ topic: event.target.value })}
                className="h-12 w-full rounded-[12px] border border-[#e3e1db] bg-[#fbfaf8] px-4 text-sm text-[#1a1916] outline-none transition focus:border-[#2f8f86] focus:bg-white focus:ring-4 focus:ring-[#2f8f86]/10"
              >
                <option value="">Select a topic</option>
                {topics.map((topic) => (
                  <option key={topic} value={topic}>
                    {topic}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <FieldLabel htmlFor="message">Message</FieldLabel>
              <textarea
                id="message"
                required
                value={form.message}
                onChange={(event) => updateForm({ message: event.target.value })}
                rows={7}
                className="w-full resize-none rounded-[12px] border border-[#e3e1db] bg-[#fbfaf8] px-4 py-3 text-sm leading-6 text-[#1a1916] outline-none transition placeholder:text-[#a3a097] focus:border-[#2f8f86] focus:bg-white focus:ring-4 focus:ring-[#2f8f86]/10"
                placeholder="Tell us what you need help with."
              />
            </div>

            {error && (
              <div aria-live="polite" className="flex items-center gap-2 rounded-[12px] border border-[#f2c7bd] bg-[#fff7f5] px-4 py-3 text-sm font-semibold text-[#a6422a]">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            {submitted && (
              <div aria-live="polite" className="flex items-center gap-2 rounded-[12px] border border-[#c9d8d5] bg-[#edf7f5] px-4 py-3 text-sm font-semibold text-[#2f8f86]">
                <CheckCircle2 className="h-4 w-4" />
                Your message was submitted. We will review it from the dashboard.
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-[13px] bg-[#1a1916] px-5 text-sm font-bold text-white shadow-[0_18px_34px_-22px_rgba(0,0,0,.7)] transition hover:-translate-y-0.5 hover:bg-black"
            >
              <Send className="h-4 w-4" />
              {submitting ? "Submitting..." : "Submit"}
            </button>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-[1180px] px-5 pb-6 md:px-8">
        <div className="grid gap-4 rounded-[18px] border border-[#e3e1db] bg-[#f6f5f2] p-5 sm:grid-cols-3 sm:p-6">
          {faqs.map((item) => (
            <div key={item.q} className="rounded-[12px] bg-white p-5 ring-1 ring-[#e3e1db]">
              <h3 className="text-sm font-extrabold text-[#1a1916]">{item.q}</h3>
              <p className="mt-3 text-sm leading-6 text-[#5d5a52]">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1180px] px-5 pb-4 md:px-8">
        <a
          href="/guide"
          className="flex flex-col justify-between gap-4 rounded-[18px] border border-[#d8d5cc] bg-[#1a1916] p-6 text-white shadow-[0_32px_70px_-52px_rgba(0,0,0,.75)] transition hover:-translate-y-0.5 sm:flex-row sm:items-center"
        >
          <div>
            <div className="text-lg font-extrabold">Need help choosing a city?</div>
            <p className="mt-1 text-sm leading-6 text-white/72">Explore housing, food, places, and student-friendly areas on the guide map.</p>
          </div>
          <span className="inline-flex items-center gap-2 text-sm font-bold">
            Open guide
            <ArrowRight className="h-4 w-4" />
          </span>
        </a>
      </section>

      <Footer />
    </main>
  );
}
