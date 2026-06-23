"use client";

import { useState } from "react";
import Link from "next/link";
import { Nav } from "@/components/ds/Nav";
import { Footer } from "@/components/ds/Footer";
import { AnimatedGradientBg, GlassCard } from "@/components/ds/AnimatedGradient";
import type { Article } from "@/lib/articles";

const CAT_COLORS: Record<string, string> = {
  "Insurance": "#8b5cf6",
  "Banking": "#3b82f6",
  "Visa & OPT": "#10b981",
  "City Guides": "#f59e0b",
  "Housing": "#ec4899",
  "Jobs": "#f97316",
  "Daily Life": "#14b8a6",
};
const CATEGORIES = ["All", "Insurance", "Banking", "Visa & OPT", "City Guides", "Housing", "Jobs", "Daily Life"];

export default function BlogClient({ initialPosts }: { initialPosts: Article[] }) {
  const [cat, setCat] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = initialPosts.filter((p) => {
    const matchesCategory = cat === "All" || p.category === cat;
    const term = search.toLowerCase();
    const matchesSearch = p.title.toLowerCase().includes(term) || (p.excerpt || "").toLowerCase().includes(term);
    return matchesCategory && matchesSearch;
  });
  const featured = filtered.slice(0, 2);
  const rest = filtered.slice(2);
  const fmt = (d: string) => {
    try {
      return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return d;
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#e9e8e4] font-[Inter,sans-serif]">
      <div className="absolute inset-x-0 top-0 overflow-hidden rounded-b-[48px]" style={{ height: "320px" }}>
        <AnimatedGradientBg rounded="rounded-b-[48px]" />
        <div className="absolute inset-0 rounded-b-[48px] bg-gradient-to-b from-white/20 via-transparent to-transparent pointer-events-none" />
      </div>

      <div className="relative z-10">
        <Nav />
        <div className="mx-auto max-w-6xl px-4 pb-20 pt-24 sm:px-6">
          <div className="mb-12 text-center">
            <h1 className="mb-3 text-3xl font-bold leading-tight text-[#1a1916] drop-shadow-lg sm:text-5xl">Guides & Articles</h1>
            <p className="mx-auto mb-8 max-w-2xl text-base leading-7 text-[#5d5a52] sm:text-lg">Clear guides and blog posts to help you understand each step faster.</p>

            <div className="relative max-w-lg mx-auto mb-6">
              <div className="relative flex items-center bg-white/85 backdrop-blur-md rounded-full shadow-lg border border-white/20 overflow-hidden">
                <span className="absolute left-4 text-gray-400">Search</span>
                <input
                  className="w-full pl-20 pr-4 py-3 bg-transparent text-gray-900 focus:outline-none text-sm placeholder:text-gray-400"
                  placeholder="Search articles..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${cat === c ? "bg-white text-[#2f8f86] border-white shadow-md" : "bg-white/20 text-[#1a1916] border-white/30 hover:bg-white/30"}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="py-20 text-center text-gray-400">
              <div className="mb-3 text-2xl font-bold sm:text-5xl">No articles found</div>
              <div>Try another search or category.</div>
            </div>
          ) : (
            <>
              {featured.length > 0 && (
                <div className="mb-10">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Featured articles</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {featured.map((p) => {
                      const color = CAT_COLORS[p.category] || "#2f8f86";
                      return (
                        <Link key={p.slug} href={`/blog/${p.slug}`}>
                          <GlassCard className="overflow-hidden hover:-translate-y-1 h-full">
                            {p.image_url && <img src={p.image_url} alt={p.title} className="w-full h-48 object-cover" />}
                            <div className="p-5">
                              <span className="inline-block text-xs font-bold uppercase tracking-wide rounded-md px-2 py-1 mb-2" style={{ background: color + "22", color }}>{p.category}</span>
                              <h2 className="text-lg font-bold text-gray-900 mb-2 leading-tight">{p.title}</h2>
                              <p className="text-sm text-gray-500 line-clamp-2 mb-3">{p.excerpt}</p>
                              <div className="flex gap-3 text-xs text-gray-400">
                                <span>{fmt(p.published_at)}</span>
                                {p.read_time && <span>{p.read_time}</span>}
                              </div>
                            </div>
                          </GlassCard>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {rest.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">{cat === "All" ? "All articles" : cat}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {rest.map((p) => {
                      const color = CAT_COLORS[p.category] || "#2f8f86";
                      return (
                        <Link key={p.slug} href={`/blog/${p.slug}`}>
                          <GlassCard className="overflow-hidden hover:-translate-y-1 h-full">
                            {p.image_url && <img src={p.image_url} alt={p.title} className="w-full h-40 object-cover" />}
                            <div className="p-4">
                              <span className="inline-block text-xs font-bold uppercase tracking-wide rounded-md px-2 py-1 mb-2" style={{ background: color + "22", color }}>{p.category}</span>
                              <h2 className="text-sm font-bold text-gray-900 mb-1 leading-snug">{p.title}</h2>
                              <p className="text-xs text-gray-500 line-clamp-2 mb-3">{p.excerpt}</p>
                              <div className="flex gap-3 text-xs text-gray-400">
                                <span>{fmt(p.published_at)}</span>
                                {p.read_time && <span>{p.read_time}</span>}
                              </div>
                            </div>
                          </GlassCard>
                        </Link>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}

        </div>
        <Footer />
      </div>
    </div>
  );
}
