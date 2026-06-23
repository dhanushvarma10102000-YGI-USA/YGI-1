"use client";

import Link from "next/link";

const panelBg =
  "radial-gradient(circle at 12% 20%, rgba(47,143,134,.18), transparent 28%), radial-gradient(circle at 88% 12%, rgba(194,104,63,.14), transparent 24%), linear-gradient(180deg,#fbfaf8 0%,#f6f5f2 62%,#f0efeb 100%)";

export function AnimatedGradientBg({ className = "", rounded = "rounded-b-[48px]" }: { className?: string; rounded?: string }) {
  return <div className={`absolute inset-0 ${rounded} ${className}`} style={{ background: panelBg }} />;
}

export function AnimatedNavBg() {
  return <div className="absolute inset-0 bg-[#f6f5f2]/95" />;
}

export function AnimatedBtn({ children, className = "", onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-[13px] bg-[#1a1916] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_16px_30px_-18px_rgba(0,0,0,.6)] transition hover:-translate-y-0.5 hover:bg-black ${className}`}
    >
      {children}
    </button>
  );
}

export function AnimatedBtnOutline({
  children,
  className = "",
  onClick,
  href,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  href?: string;
}) {
  const cls = `inline-flex items-center justify-center rounded-[13px] border border-[#e3e1db] bg-white px-5 py-2.5 text-sm font-semibold text-[#1a1916] shadow-[0_14px_30px_-22px_rgba(30,28,22,.45)] transition hover:-translate-y-0.5 hover:border-[#d4d1c8] ${className}`;
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return <button onClick={onClick} className={cls}>{children}</button>;
}

export function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-[22px] border border-[#e3e1db] bg-[#f6f5f2] shadow-[0_18px_36px_-28px_rgba(30,28,22,.4)] transition duration-300 hover:bg-white hover:shadow-[0_28px_46px_-32px_rgba(30,28,22,.5)] ${className}`}>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/60 via-white/10 to-transparent" />
      <div className="relative">{children}</div>
    </div>
  );
}

export function GradientText({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`text-[#2f8f86] ${className}`}>{children}</span>;
}
