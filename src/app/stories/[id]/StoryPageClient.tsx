"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Nav } from "@/components/ds/Nav";
import { supabase } from "@/lib/supabase";

type StoryRow = {
  id: string; title: string; excerpt: string | null; body_html: string | null;
  category: string | null; city: string | null; uni: string | null;
  anon: boolean; display_name: string | null; upvotes: number;
  comments: number; read_time: number; created_at: string;
};

function timeAgo(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return days === 0 ? "Today" : days === 1 ? "Yesterday" : `${days} days ago`;
}

export default function StoryPageClient({ story }: { story: StoryRow }) {
  const [upvotes, setUpvotes] = useState(story.upvotes);
  const [voted, setVoted] = useState(false);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      if (u) {
        const { data: v } = await supabase.from("story_votes").select("story_id").eq("story_id", story.id).eq("user_id", u.id).maybeSingle();
        setVoted(!!v);
      }
    });
    const { data: l } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => l.subscription.unsubscribe();
  }, [story.id]);

  const toggleVote = async () => {
    if (!user || voting) return;
    setVoting(true);
    const wasVoted = voted;
    setVoted(!wasVoted);
    setUpvotes((n) => n + (wasVoted ? -1 : 1));
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const res = await fetch("/api/stories/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ story_id: story.id, vote: !wasVoted }),
      });
      if (res.ok) {
        const json = await res.json();
        setUpvotes(json.upvotes ?? upvotes);
      }
    }
    setVoting(false);
  };

  const authorName = story.anon ? "Anonymous" : (story.display_name || "Member");
  const initials = story.anon ? "?" : (story.display_name?.[0]?.toUpperCase() ?? "M");

  const css = `
    .sp-page{min-height:100vh;background:#e9e8e4;font-family:'Public Sans',system-ui,sans-serif;}
    .sp-vote:hover:not(:disabled){background:#0f6f67!important;color:#fff!important;border-color:#0f6f67!important;}
    .sp-back:hover{color:#0f6f67!important;}
    .sp-link:hover{background:#f4f0e8!important;}
    .sp-body h1,.sp-body h2,.sp-body h3{font-family:'Newsreader',Georgia,serif;color:#221f1b;margin:1.4em 0 .5em;line-height:1.25;}
    .sp-body h1{font-size:1.6em;} .sp-body h2{font-size:1.35em;} .sp-body h3{font-size:1.15em;}
    .sp-body p{margin:0 0 1em;line-height:1.8;}
    .sp-body a{color:#0f6f67;text-decoration:underline;}
    .sp-body ul,.sp-body ol{margin:0 0 1em 1.4em;line-height:1.8;}
    .sp-body img{max-width:100%;border-radius:10px;margin:1em 0;}
    .sp-body blockquote{border-left:3px solid #d6cfc0;margin:0 0 1em;padding:.5em 1em;color:#69605a;font-style:italic;}
  `;

  return (
    <>
      <style>{css}</style>
      <div className="sp-page">
        <Nav />
        <div style={{ padding: "90px clamp(20px,3vw,60px) 60px", maxWidth: 860, margin: "0 auto" }}>

          {/* Breadcrumb */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 28, fontSize: 13, color: "#9a9082", flexWrap: "wrap" }}>
            <Link href="/" style={{ color: "#9a9082", textDecoration: "none" }} className="sp-back">Home</Link>
            <span>›</span>
            <Link href="/stories" style={{ color: "#9a9082", textDecoration: "none" }} className="sp-back">Journeys</Link>
            <span>›</span>
            <span style={{ color: "#46423a", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 260 }}>{story.title}</span>
          </div>

          {/* Main card */}
          <div style={{ background: "#fff", border: "1px solid #ece6dc", borderRadius: 20, padding: "clamp(24px,4vw,48px)", boxShadow: "0 2px 10px rgba(40,33,20,0.06)", marginBottom: 18 }}>

            {/* Tags */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
              {story.category && (
                <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.06em", padding: "4px 12px", borderRadius: 999, background: "#e6f0ee", color: "#0b544e" }}>{story.category}</span>
              )}
              {story.city && (
                <span style={{ fontSize: 11.5, fontWeight: 600, padding: "4px 12px", borderRadius: 999, background: "#f1ece3", color: "#6f685c" }}>📍 {story.city}</span>
              )}
              {story.uni && (
                <span style={{ fontSize: 11.5, fontWeight: 600, padding: "4px 12px", borderRadius: 999, background: "#f8ebe2", color: "#b5562d" }}>🎓 {story.uni}</span>
              )}
            </div>

            {/* Title */}
            <h1 style={{ fontFamily: "'Newsreader',Georgia,serif", fontSize: "clamp(24px,3.5vw,38px)", fontWeight: 600, color: "#1f1c18", margin: "0 0 20px", lineHeight: 1.2, letterSpacing: "-0.02em" }}>
              {story.title}
            </h1>

            {/* Author row */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 24, borderBottom: "1px solid #f0ebe0", marginBottom: 28, flexWrap: "wrap" }}>
              <div style={{ width: 36, height: 36, borderRadius: 999, background: story.anon ? "#e8e4dc" : "#e6f0ee", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: story.anon ? "#8a8378" : "#0f6f67", flexShrink: 0 }}>
                {initials}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#221f1b" }}>{authorName}</div>
                <div style={{ fontSize: 12.5, color: "#9a9082", marginTop: 2 }}>
                  {timeAgo(story.created_at)} · {story.read_time} min read
                </div>
              </div>
              {/* Upvote */}
              <button
                onClick={toggleVote}
                disabled={!user || voting}
                className="sp-vote"
                style={{
                  marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 7,
                  background: voted ? "#e6f0ee" : "#fff",
                  border: `1px solid ${voted ? "#0f6f67" : "#e2dccf"}`,
                  borderRadius: 999, padding: "8px 18px", fontSize: 14, fontWeight: 700,
                  color: voted ? "#0b544e" : "#46423a", cursor: user ? "pointer" : "default",
                  fontFamily: "inherit", transition: "all .15s",
                }}
                title={user ? (voted ? "Remove upvote" : "Upvote this story") : "Sign in to upvote"}
              >
                <span style={{ fontSize: 12 }}>▲</span> {upvotes}
              </button>
            </div>

            {/* Body */}
            {story.body_html ? (
              // body_html is sanitized on the server in page.tsx before it reaches this component.
              <div className="sp-body" style={{ fontSize: 16, color: "#3a362f", lineHeight: 1.8 }} dangerouslySetInnerHTML={{ __html: story.body_html }} />
            ) : story.excerpt ? (
              <p style={{ fontSize: 16, color: "#3a362f", lineHeight: 1.8 }}>{story.excerpt}</p>
            ) : (
              <p style={{ color: "#9a9082", fontSize: 15 }}>No content available for this story.</p>
            )}
          </div>

          {/* Sign-in nudge for upvote */}
          {!user && (
            <div style={{ background: "#f5f0e8", border: "1px solid #ece6dc", borderRadius: 16, padding: "18px 22px", marginBottom: 18, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 600, color: "#221f1b", marginBottom: 3 }}>Found this helpful?</div>
                <div style={{ fontSize: 13, color: "#8a8378" }}>Sign in to upvote and support this journey.</div>
              </div>
              <Link href="/community" style={{ background: "#0f6f67", color: "#fff", borderRadius: 10, padding: "9px 20px", fontSize: 13.5, fontWeight: 600, textDecoration: "none", flexShrink: 0 }}>
                Sign in
              </Link>
            </div>
          )}

          {/* Quick links */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12 }}>
            {[
              { href: "/stories", emoji: "✍️", label: "More Journeys", sub: "Read other real experiences" },
              { href: "/guide", emoji: "📘", label: "Newcomer Guide", sub: "Visas, banking, housing & more" },
              { href: "/community", emoji: "🤝", label: "Community", sub: "Ask questions, get answers" },
              { href: "/blog", emoji: "📝", label: "Articles", sub: "In-depth guides for students" },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="sp-link" style={{ background: "#fff", border: "1px solid #ece6dc", borderRadius: 14, padding: "16px 18px", textDecoration: "none", display: "block", transition: "background .15s" }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>{l.emoji}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#221f1b", marginBottom: 3 }}>{l.label}</div>
                <div style={{ fontSize: 12.5, color: "#8a8378" }}>{l.sub}</div>
              </Link>
            ))}
          </div>

        </div>
      </div>
    </>
  );
}
