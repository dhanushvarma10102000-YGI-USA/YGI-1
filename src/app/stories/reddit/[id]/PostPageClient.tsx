"use client";

import { useState, useEffect } from "react";
import { Nav } from "@/components/ds/Nav";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type Post = {
  id: string; title: string; selftext: string;
  subreddit: string; author: string; permalink: string; created_utc: number;
};
type Comment = {
  id: string; post_id: string; user_id: string; body: string;
  anon: boolean; display_name: string | null; created_at: string;
};

const TOPIC_INFO: Record<string, { label: string; desc: string; color: string }> = {
  immigration:           { label: "US Immigration",         color: "#0f6f67", desc: "Discussions about US immigration law, processes, and experiences." },
  f1visa:                { label: "F-1 Student Visa",        color: "#d4703f", desc: "The F-1 visa for international students studying full-time in the USA." },
  internationalstudents: { label: "International Students",  color: "#0f6f67", desc: "Everything international students need to know about life in the USA." },
  USCIS:                 { label: "USCIS",                   color: "#5b6af0", desc: "US Citizenship and Immigration Services — applications, timelines, status." },
  UsaVisa:               { label: "US Visa",                 color: "#d4703f", desc: "Questions and experiences about all types of US visas." },
  ImmigrationIndia:      { label: "Immigration from India",  color: "#0f6f67", desc: "Immigration topics specific to people moving from India to the USA." },
  h1b:                   { label: "H-1B Visa",               color: "#5b6af0", desc: "The H-1B work visa — lottery, sponsorship, and cap-exempt jobs." },
  greencard:             { label: "Green Card",              color: "#0f6f67", desc: "Permanent residency — EB-1, EB-2, EB-3, family-based, and more." },
  TN_Visa:               { label: "TN Visa",                 color: "#5b6af0", desc: "TN visa for Canadian and Mexican professionals under USMCA." },
  DACA:                  { label: "DACA",                    color: "#d4703f", desc: "Deferred Action for Childhood Arrivals — renewals, work permits, news." },
  usvisa:                { label: "US Visa",                 color: "#d4703f", desc: "General US visa discussions, experiences, and tips." },
  gradadmissions:        { label: "Graduate Admissions",     color: "#5b6af0", desc: "Applying to US graduate programs — requirements, deadlines, funding." },
  studyabroad:           { label: "Study Abroad",            color: "#0f6f67", desc: "Experiences studying abroad including in the United States." },
  banking:               { label: "Banking",                 color: "#5b6af0", desc: "US banking — accounts, credit cards, transfers for newcomers." },
  personalfinance:       { label: "Personal Finance",        color: "#0f6f67", desc: "Personal finance in the USA — budgeting, investing, taxes." },
};

function timeAgoStr(utc: number) {
  const days = Math.floor((Date.now() / 1000 - utc) / 86400);
  return days === 0 ? "Today" : days === 1 ? "Yesterday" : `${days} days ago`;
}

export default function PostPageClient({ id, serverPost }: { id: string; serverPost: Post | null }) {
  const [post, setPost] = useState<Post | null>(serverPost);
  const [notFound, setNotFound] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [commentAnon, setCommentAnon] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<{ id: string; email?: string; user_metadata?: Record<string, string> } | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: l } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => l.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (post) return;
    try {
      const stored = sessionStorage.getItem(`reddit_post_${id}`);
      if (stored) { setPost(JSON.parse(stored)); return; }
    } catch {}
    setNotFound(true);
  }, [id, post]);

  useEffect(() => {
    supabase.from("reddit_post_comments").select("*").eq("post_id", id)
      .order("created_at", { ascending: true })
      .then(({ data }) => setComments(data ?? []));
  }, [id]);

  const submitComment = async () => {
    if (!user || !commentBody.trim()) return;
    setSubmitting(true);
    const name = commentAnon ? null : (user.user_metadata?.full_name || user.user_metadata?.name || user.email || "User");
    const { error } = await supabase.from("reddit_post_comments").insert({
      post_id: id, user_id: user.id, body: commentBody.trim(), anon: commentAnon, display_name: name,
    });
    if (!error) {
      setCommentBody("");
      setToast("Comment posted!");
      setTimeout(() => setToast(""), 2500);
      const { data } = await supabase.from("reddit_post_comments").select("*").eq("post_id", id).order("created_at", { ascending: true });
      setComments(data ?? []);
    }
    setSubmitting(false);
  };

  const css = `
    .rp-page{min-height:100vh;background:#e9e8e4;font-family:'Public Sans',system-ui,sans-serif;}
    .rp-btn-reddit{transition:background .15s,transform .1s;}
    .rp-btn-reddit:hover{background:#c93700!important;transform:translateY(-1px);}
    .rp-btn-teal{transition:background .15s,transform .1s;}
    .rp-btn-teal:hover{background:#0c5d56!important;transform:translateY(-1px);}
    .rp-submit:hover:not(:disabled){background:#0c5d56!important;}
    .rp-crumb a:hover{color:#0f6f67!important;}
  `;

  if (notFound && !post) return (
    <>
      <style>{css}</style>
      <div className="rp-page"><Nav />
        <div style={{padding:"90px 24px 60px",maxWidth:700,margin:"0 auto",textAlign:"center"}}>
          <div style={{fontSize:40,marginBottom:16}}>🔍</div>
          <h1 style={{fontFamily:"'Newsreader',Georgia,serif",fontSize:26,fontWeight:600,color:"#1f1c18",margin:"0 0 12px"}}>Post not cached yet</h1>
          <p style={{fontSize:15,color:"#69605a",marginBottom:28}}>Go back to the Journeys page and click the post again — it will be saved automatically.</p>
          <Link href="/stories" style={{background:"#0f6f67",color:"#fff",borderRadius:12,padding:"12px 24px",fontSize:15,fontWeight:600,textDecoration:"none"}}>← Back to Journeys</Link>
        </div>
      </div>
    </>
  );

  if (!post) return (
    <>
      <style>{css}</style>
      <div className="rp-page"><Nav /><div style={{padding:"110px 24px",textAlign:"center",color:"#9a9082",fontSize:15}}>Loading…</div></div>
    </>
  );

  const info = TOPIC_INFO[post.subreddit] ?? { label: `r/${post.subreddit}`, color: "#6f685c", desc: "Community discussions on Reddit." };

  return (
    <>
      <style>{css}</style>
      {toast && <div style={{position:"fixed",bottom:28,left:"50%",transform:"translateX(-50%)",background:"#0f6f67",color:"#fff",borderRadius:12,padding:"12px 22px",fontSize:14,fontWeight:600,zIndex:9999,boxShadow:"0 4px 20px rgba(0,0,0,0.18)"}}>{toast}</div>}
      <div className="rp-page">
        <Nav />
        <div style={{padding:"90px clamp(20px,3vw,60px) 60px",maxWidth:900,margin:"0 auto"}}>

          {/* Breadcrumb */}
          <div className="rp-crumb" style={{display:"flex",alignItems:"center",gap:6,marginBottom:24,fontSize:13,color:"#9a9082",flexWrap:"wrap"}}>
            <Link href="/" style={{color:"#9a9082",textDecoration:"none"}}>Home</Link>
            <span>›</span>
            <Link href="/stories" style={{color:"#9a9082",textDecoration:"none"}}>Journeys</Link>
            <span>›</span>
            <Link href="/stories" style={{color:"#9a9082",textDecoration:"none"}}>From Reddit</Link>
            <span>›</span>
            <span style={{color:"#46423a",fontWeight:500}}>{info.label}</span>
          </div>

          {/* ── Main post card ── */}
          <div style={{background:"#fff",border:"1px solid #ece6dc",borderRadius:20,padding:"clamp(24px,4vw,44px)",boxShadow:"0 2px 10px rgba(40,33,20,0.07)",marginBottom:20}}>

            {/* Header row */}
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:22,flexWrap:"wrap"}}>
              <span style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:12,fontWeight:700,color:"#ff4500",background:"#fff1ed",border:"1px solid #ffd7c8",borderRadius:999,padding:"4px 13px"}}>
                🔺 r/{post.subreddit}
              </span>
              <span style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:12,color:"#a89c88"}}>
                <span style={{width:18,height:18,borderRadius:999,background:"#e6f0ee",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#0f6f67"}}>u</span>
                {post.author}
              </span>
              <span style={{fontSize:12,color:"#c9c1b6"}}>·</span>
              <span style={{fontSize:12,color:"#c9c1b6"}}>{timeAgoStr(post.created_utc)}</span>
            </div>

            {/* Title */}
            <h1 style={{fontFamily:"'Newsreader',Georgia,serif",fontSize:"clamp(22px,3.5vw,36px)",fontWeight:600,color:"#1f1c18",margin:"0 0 24px",lineHeight:1.2,letterSpacing:"-0.02em"}}>
              {post.title}
            </h1>

            {/* Body */}
            {post.selftext && (
              <div style={{fontSize:15.5,color:"#3a362f",lineHeight:1.85,whiteSpace:"pre-wrap",background:"#faf8f4",borderRadius:14,padding:"20px 22px",borderLeft:"3px solid #d6cfc0",marginBottom:28}}>
                {post.selftext}
              </div>
            )}

            {/* Action buttons */}
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
              <a href={post.permalink} target="_blank" rel="noopener noreferrer" className="rp-btn-reddit"
                style={{display:"inline-flex",alignItems:"center",gap:7,background:"#ff4500",color:"#fff",borderRadius:11,padding:"11px 20px",fontSize:14,fontWeight:600,textDecoration:"none"}}>
                🔺 Open in Reddit
              </a>
              <Link href="/stories" className="rp-btn-teal"
                style={{display:"inline-flex",alignItems:"center",gap:7,background:"#0f6f67",color:"#fff",borderRadius:11,padding:"11px 20px",fontSize:14,fontWeight:600,textDecoration:"none"}}>
                ✍️ Share your own journey
              </Link>
            </div>
          </div>

          {/* ── Topic context strip ── */}
          <div style={{background:`${info.color}12`,border:`1px solid ${info.color}28`,borderRadius:16,padding:"18px 22px",marginBottom:20,display:"flex",alignItems:"flex-start",gap:16}}>
            <div style={{flexShrink:0,width:40,height:40,borderRadius:12,background:info.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>
              {post.subreddit === "f1visa" || post.subreddit === "gradadmissions" || post.subreddit === "studyabroad" || post.subreddit === "internationalstudents" ? "🎓" :
               post.subreddit === "h1b" || post.subreddit === "TN_Visa" || post.subreddit === "USCIS" ? "💼" :
               post.subreddit === "greencard" || post.subreddit === "immigration" || post.subreddit === "ImmigrationIndia" || post.subreddit === "usvisa" || post.subreddit === "UsaVisa" || post.subreddit === "DACA" ? "🗽" :
               "💬"}
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.13em",textTransform:"uppercase",color:info.color,marginBottom:4}}>About This Topic</div>
              <div style={{fontSize:14,fontWeight:600,color:"#1f1c18",marginBottom:4}}>{info.label}</div>
              <div style={{fontSize:13.5,color:"#69605a",lineHeight:1.6}}>{info.desc}</div>
            </div>
          </div>

          {/* ── Comment section ── */}
          <div style={{background:"#fff",border:"1px solid #ece6dc",borderRadius:20,padding:"clamp(20px,3vw,36px)",boxShadow:"0 1px 4px rgba(40,33,20,0.05)",marginBottom:20}}>
            <div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:20}}>
              <h2 style={{fontFamily:"'Newsreader',Georgia,serif",fontSize:22,fontWeight:600,color:"#1f1c18",margin:0}}>Discussion</h2>
              {comments.length > 0 && <span style={{fontSize:14,color:"#9a9082"}}>({comments.length})</span>}
            </div>

            {/* Write a comment */}
            {user ? (
              <div style={{marginBottom:comments.length > 0 ? 28 : 0}}>
                <textarea value={commentBody} onChange={(e) => setCommentBody(e.target.value)}
                  placeholder="Share your experience or ask a follow-up question…" rows={3}
                  style={{width:"100%",border:"1px solid #e2dccf",borderRadius:12,padding:"13px 15px",fontSize:14.5,fontFamily:"inherit",color:"#221f1b",resize:"vertical",outline:"none",boxSizing:"border-box",background:"#faf8f4",lineHeight:1.6}}/>
                <div style={{display:"flex",alignItems:"center",gap:12,marginTop:10,flexWrap:"wrap"}}>
                  <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:"#69605a",cursor:"pointer",userSelect:"none"}}>
                    <div onClick={() => setCommentAnon(a => !a)} style={{width:36,height:20,borderRadius:999,background:commentAnon?"#0f6f67":"#ddd",position:"relative",transition:"background .2s",flexShrink:0,cursor:"pointer"}}>
                      <div style={{position:"absolute",top:2,left:commentAnon?18:2,width:16,height:16,borderRadius:999,background:"#fff",transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,0.18)"}}/>
                    </div>
                    Post anonymously
                  </label>
                  <button onClick={submitComment} disabled={submitting||!commentBody.trim()} className="rp-submit"
                    style={{marginLeft:"auto",background:"#0f6f67",color:"#fff",border:"none",borderRadius:10,padding:"10px 24px",fontSize:14,fontWeight:600,cursor:submitting||!commentBody.trim()?"not-allowed":"pointer",opacity:submitting||!commentBody.trim()?0.55:1,fontFamily:"inherit",transition:"background .15s"}}>
                    {submitting ? "Posting…" : "Post comment"}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{background:"#f5f0e8",borderRadius:12,padding:"16px 20px",marginBottom:comments.length>0?24:0,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
                <div>
                  <div style={{fontSize:14,fontWeight:600,color:"#221f1b",marginBottom:3}}>Join the discussion</div>
                  <div style={{fontSize:13,color:"#8a8378"}}>Sign in to share your experience or ask a question.</div>
                </div>
                <Link href="/community" style={{background:"#0f6f67",color:"#fff",borderRadius:10,padding:"9px 20px",fontSize:13.5,fontWeight:600,textDecoration:"none",flexShrink:0}}>
                  Sign in
                </Link>
              </div>
            )}

            {/* Comments list */}
            {comments.length > 0 && (
              <div style={{display:"flex",flexDirection:"column",gap:18}}>
                {comments.map((c) => {
                  const name = c.anon ? "Anonymous" : (c.display_name || "User");
                  const initials = name.slice(0,2).toUpperCase();
                  const mins = Math.floor((Date.now()-new Date(c.created_at).getTime())/60000);
                  const tStr = mins<1?"just now":mins<60?`${mins}m ago`:mins<1440?`${Math.floor(mins/60)}h ago`:`${Math.floor(mins/1440)}d ago`;
                  return (
                    <div key={c.id} style={{display:"flex",gap:12,paddingTop:18,borderTop:"1px solid #f0ebe0"}}>
                      <div style={{flexShrink:0,width:36,height:36,borderRadius:999,background:"#e6f0ee",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#0f6f67"}}>
                        {c.anon ? "?" : initials}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                          <span style={{fontSize:13.5,fontWeight:600,color:"#221f1b"}}>{name}</span>
                          <span style={{fontSize:12,color:"#c9c1b6"}}>{tStr}</span>
                        </div>
                        <p style={{fontSize:14.5,color:"#3a362f",lineHeight:1.7,margin:0,whiteSpace:"pre-wrap"}}>{c.body}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {comments.length === 0 && !user && (
              <div style={{textAlign:"center",padding:"20px 0 4px",color:"#b4aca0",fontSize:14}}>
                Be the first to comment on this discussion.
              </div>
            )}
          </div>

          {/* ── Quick links ── */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12}}>
            {[
              {href:"/guide",emoji:"📘",label:"Newcomer Guide",sub:"Visas, banking, housing & more"},
              {href:"/blog",emoji:"📝",label:"Articles",sub:"In-depth guides for students"},
              {href:"/community",emoji:"🤝",label:"Community",sub:"Ask questions, get answers"},
              {href:"/stories",emoji:"📖",label:"More Journeys",sub:"Real stories from people like you"},
            ].map((l) => (
              <Link key={l.href} href={l.href} style={{background:"#fff",border:"1px solid #ece6dc",borderRadius:14,padding:"16px 18px",textDecoration:"none",display:"block",transition:"box-shadow .15s"}}>
                <div style={{fontSize:22,marginBottom:6}}>{l.emoji}</div>
                <div style={{fontSize:14,fontWeight:600,color:"#221f1b",marginBottom:3}}>{l.label}</div>
                <div style={{fontSize:12.5,color:"#8a8378"}}>{l.sub}</div>
              </Link>
            ))}
          </div>

        </div>
      </div>
    </>
  );
}
