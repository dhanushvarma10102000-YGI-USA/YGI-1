"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import { ArrowRight, BookOpen, Map, MessageSquare, Star, Users, Zap } from "lucide-react";
import { Nav } from "@/components/ds/Nav";

type ArchCard = {
  label: string;
  image: string;
  kind: "city" | "uni";
  ratio: number;
  rotation: number;
  row: "top" | "bot";
};

const fallbackCardImage =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 440 520'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop stop-color='%232f8f86'/%3E%3Cstop offset='.58' stop-color='%234f46e5'/%3E%3Cstop offset='1' stop-color='%23f6f5f2'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='440' height='520' fill='url(%23g)'/%3E%3Ccircle cx='330' cy='110' r='82' fill='white' opacity='.16'/%3E%3Cpath d='M72 384h296v30H72zM110 202h220v164H110zM92 176l128-72 128 72z' fill='white' opacity='.78'/%3E%3Cpath d='M150 232h36v134h-36zM202 232h36v134h-36zM254 232h36v134h-36z' fill='%231a1916' opacity='.16'/%3E%3C/svg%3E";

const topCards: ArchCard[] = [
  { label: "NYC", image: "https://images.unsplash.com/photo-1485871981521-5b1fd3805eee?auto=format&fit=crop&w=440&h=520&q=80", kind: "city", ratio: 1, rotation: -5, row: "top" },
  { label: "Harvard", image: "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=440&h=520&q=80", kind: "uni", ratio: 0.82, rotation: 3, row: "top" },
  { label: "L.A", image: "https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?auto=format&fit=crop&w=440&h=520&q=80", kind: "city", ratio: 1, rotation: -3, row: "top" },
  { label: "MIT", image: "https://images.unsplash.com/photo-1564981797816-1043664bf78d?auto=format&fit=crop&w=440&h=520&q=80", kind: "uni", ratio: 1, rotation: 4, row: "top" },
  { label: "CHI", image: "https://images.unsplash.com/photo-1494522855154-9297ac14b55f?auto=format&fit=crop&w=440&h=520&q=80", kind: "city", ratio: 0.86, rotation: -2, row: "top" },
  { label: "Stanford", image: "https://images.unsplash.com/photo-1607237138185-eedd9c632b0b?auto=format&fit=crop&w=440&h=520&q=80", kind: "uni", ratio: 1, rotation: 3, row: "top" },
  { label: "MIA", image: "https://images.unsplash.com/photo-1535498730771-e735b998cd64?auto=format&fit=crop&w=440&h=520&q=80", kind: "city", ratio: 1, rotation: -4, row: "top" },
  { label: "Yale", image: "https://images.unsplash.com/photo-1606761568499-6d2451b23c66?auto=format&fit=crop&w=440&h=520&q=80", kind: "uni", ratio: 0.9, rotation: 2, row: "top" },
  { label: "SEA", image: "https://images.unsplash.com/photo-1502175353174-a7a70e73b362?auto=format&fit=crop&w=440&h=520&q=80", kind: "city", ratio: 1, rotation: -3, row: "top" },
  { label: "Columbia", image: "https://images.unsplash.com/photo-1571260899304-425eee4c7efc?auto=format&fit=crop&w=440&h=520&q=80", kind: "uni", ratio: 1, rotation: 4, row: "top" },
];

const bottomCards: ArchCard[] = [
  { label: "S.F", image: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=440&h=520&q=80", kind: "city", ratio: 1, rotation: 4, row: "bot" },
  { label: "Princeton", image: "https://images.unsplash.com/photo-1568792923760-d70635a89fdc?auto=format&fit=crop&w=440&h=520&q=80", kind: "uni", ratio: 0.84, rotation: -3, row: "bot" },
  { label: "BOS", image: "https://images.unsplash.com/photo-1501979376754-2ff867a4f659?auto=format&fit=crop&w=440&h=520&q=80", kind: "city", ratio: 1, rotation: 3, row: "bot" },
  { label: "NYU", image: "https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&w=440&h=520&q=80", kind: "uni", ratio: 1, rotation: -4, row: "bot" },
  { label: "DC", image: "https://images.unsplash.com/photo-1501466044931-62695aada8e9?auto=format&fit=crop&w=440&h=520&q=80", kind: "city", ratio: 0.88, rotation: 2, row: "bot" },
  { label: "UCLA", image: "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?auto=format&fit=crop&w=440&h=520&q=80", kind: "uni", ratio: 1, rotation: -2, row: "bot" },
  { label: "ATX", image: "https://images.unsplash.com/photo-1531218150217-54595bc2b934?auto=format&fit=crop&w=440&h=520&q=80", kind: "city", ratio: 1, rotation: 3, row: "bot" },
  { label: "Berkeley", image: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=440&h=520&q=80", kind: "uni", ratio: 0.9, rotation: -4, row: "bot" },
  { label: "VEGAS", image: "https://images.unsplash.com/photo-1581351721010-8cf859cb14a4?auto=format&fit=crop&w=440&h=520&q=80", kind: "city", ratio: 1, rotation: 2, row: "bot" },
];

const reviews = [
  { quote: "The guide is clean, simple and easy to follow. I found what I needed without opening ten different tabs.", name: "Aarav Mehta", role: "Graduate student, NYC", color: "#2f8f86" },
  { quote: "The guide feels organized from the first click. Search, places and details all work together in a way that makes sense.", name: "Lucia Romano", role: "Exchange student, L.A", color: "#c2683f" },
  { quote: "The blogs are clear and useful. They explain things in plain words without making the page feel heavy.", name: "Daniel Okafor", role: "PhD student, Boston", color: "#4a6fb0" },
  { quote: "I like how the guide keeps the important information in one place. It saves time and feels professional.", name: "Mei Lin", role: "Undergrad, Chicago", color: "#8a5aa8" },
  { quote: "The map guide is easy to use. The results, address details and directions feel quick and polished.", name: "Sofia Alvarez", role: "Visiting scholar, D.C", color: "#317a52" },
  { quote: "The blog section is exactly what I wanted: focused, readable and not filled with unnecessary text.", name: "Yusuf Demir", role: "MBA student, Stanford", color: "#b0593f" },
  { quote: "The guide looks modern and trustworthy. Every page feels built with care, especially the search experience.", name: "Priya Nair", role: "Researcher, Seattle", color: "#2f6f8f" },
  { quote: "The blogs and guide pages work well together. I can read first, then use the guide to find what I need.", name: "Carlos Mendes", role: "Student, Miami", color: "#7a6aa8" },
];

const features = [
  {
    icon: Map,
    title: "City & Campus Guide",
    desc: "Explore 50+ US cities and top universities. Find neighborhoods, services, costs of living, and everything you need before you arrive.",
    href: "/guide",
    cta: "Open the guide",
    accent: "#2f8f86",
    bg: "#e6f0ee",
  },
  {
    icon: Users,
    title: "Community Groups",
    desc: "Connect with people from your city, university, or background. Share experiences, ask questions, and find your people.",
    href: "/community",
    cta: "Join the community",
    accent: "#4a6fb0",
    bg: "#eaeff8",
  },
  {
    icon: BookOpen,
    title: "Real-life Blogs",
    desc: "Read honest stories written by people who have already been through it — visa process, housing, culture shock, and more.",
    href: "/blog",
    cta: "Read the blogs",
    accent: "#8a5aa8",
    bg: "#f0eaf6",
  },
];

const stats = [
  { value: "50+", label: "Cities covered" },
  { value: "100+", label: "Universities" },
  { value: "Free", label: "Always" },
  { value: "Real", label: "People, real tips" },
];

const steps = [
  { num: "01", title: "Explore a city or campus", desc: "Use the guide to search any US city or university. Get a quick overview of what matters — neighborhoods, costs, transport, and more." },
  { num: "02", title: "Read from people like you", desc: "Our blogs are written by students and expats who have lived it. Skip the generic advice and get the real story." },
  { num: "03", title: "Join the community", desc: "Find others from your city, country, or school. Ask questions, share tips, and make connections before you even land." },
];

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("");
}

function ReviewCard({ review }: { review: (typeof reviews)[number] }) {
  return (
    <article className="yg-review">
      <div className="yg-stars" aria-label="Five star review">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} fill="currentColor" strokeWidth={0} />
        ))}
      </div>
      <p>&ldquo;{review.quote}&rdquo;</p>
      <div className="yg-reviewer">
        <div className="yg-avatar" style={{ background: review.color }}>{initials(review.name)}</div>
        <div className="yg-who">
          {review.name}
          <span>{review.role}</span>
        </div>
      </div>
    </article>
  );
}

function ArchField() {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const cards = useMemo(() => [...topCards, ...bottomCards], []);

  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;

    let width = field.clientWidth;
    let height = field.clientHeight;
    let time = 0;
    let last = performance.now();
    let frameId = 0;

    const topCount = topCards.length;
    const bottomCount = bottomCards.length;
    const state = cards.map((card, index) => ({
      index, row: card.row, ratio: card.ratio,
      direction: card.row === "top" ? -1 : 1,
      speed: card.row === "top" ? 26 : 23,
      jitter: (((index * 41) % 5) - 2) * 11,
      xi: 0, span: 0,
    }));

    const cardSize = () => {
      const raw = getComputedStyle(document.documentElement).getPropertyValue("--yg-card-size");
      return Number.parseInt(raw, 10) || 96;
    };

    const layout = () => {
      width = field.clientWidth;
      height = field.clientHeight;
      const size = cardSize();
      state.forEach((card) => {
        const el = cardRefs.current[card.index];
        if (!el) return;
        const cardWidth = size;
        const cardHeight = Math.round(size / card.ratio);
        const count = card.row === "top" ? topCount : bottomCount;
        const rowIndex = card.row === "top" ? card.index : card.index - topCount;
        const step = (width + size + 70) / count;
        el.style.width = `${cardWidth}px`;
        el.style.height = `${cardHeight}px`;
        card.span = step * count;
        card.xi = rowIndex * step;
      });
    };

    const yTop = (p: number) => {
      if (width <= 700) {
        const edge = height * 0.61, mid = height * 0.56;
        return edge + (mid - edge) * Math.sin(Math.PI * p);
      }
      return height * 0.01 + height * 0.3 * (1 - Math.sin(Math.PI * p));
    };
    const yBottom = (p: number) => {
      if (width <= 700) {
        const edge = height * 0.74, mid = height * 0.82;
        return edge + (mid - edge) * Math.sin(Math.PI * p);
      }
      const edge = height * 0.46, mid = height * 0.73;
      return edge + (mid - edge) * Math.sin(Math.PI * p);
    };

    const animate = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const rawSpeed = getComputedStyle(document.documentElement).getPropertyValue("--yg-speed");
      const speedMultiplier = Number.parseFloat(rawSpeed) || 1;
      time += dt;

      state.forEach((card) => {
        const el = cardRefs.current[card.index];
        if (!el || !card.span || !width) return;
        const velocity = card.speed * speedMultiplier;
        let pos = card.direction < 0 ? card.xi - time * velocity : card.xi + time * velocity;
        pos = ((pos % card.span) + card.span) % card.span;
        const progress = pos / width;
        const y = (card.row === "top" ? yTop(progress) : yBottom(progress)) + card.jitter;
        el.style.transform = `translate(${pos}px, ${y}px)`;
      });
      frameId = requestAnimationFrame(animate);
    };

    layout();
    frameId = requestAnimationFrame(animate);
    window.addEventListener("resize", layout);
    return () => { cancelAnimationFrame(frameId); window.removeEventListener("resize", layout); };
  }, [cards]);

  return (
    <div className="yg-arch-field" ref={fieldRef}>
      <div className="yg-hero-center">
        <div className="yg-hero-badge">
          <span className="yg-dot" />
          Your guide to life in the USA
        </div>
        <h1 className="yg-hero-title">
          Find your place<br />
          <span>in the</span> <strong>U.S.A</strong>
        </h1>
        <p className="yg-hero-sub">
          From city streets to campus halls — explore, settle in, and connect with people who have already walked the road.
        </p>
        
      </div>

      {cards.map((card, index) => (
        <div
          key={`${card.row}-${card.label}`}
          ref={(node) => { cardRefs.current[index] = node; }}
          className="yg-arch-card"
        >
          <div className="yg-ac-inner" style={{ ["--yg-rot" as string]: `${card.rotation}deg` }}>
            <img
              src={card.image}
              alt={`${card.label} ${card.kind === "uni" ? "university" : "city"}`}
              className="yg-card-img"
              referrerPolicy="no-referrer"
              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = fallbackCardImage; }}
            />
            <span className={card.kind === "uni" ? "yg-kind yg-kind-uni" : "yg-kind"} />
            <span className="yg-label">{card.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function HomePage() {
  const reviewRowA = [...reviews.slice(0, 4), ...reviews.slice(0, 4)];
  const reviewRowB = [...reviews.slice(4), ...reviews.slice(4)];

  return (
    <main className="yg-home">
      <style>{homeStyles}</style>
      <Nav />

      {/* ── Hero ── */}
      <div className="yg-shell">
        <div className="yg-panel">
          <section className="yg-hero">
            <ArchField />
          </section>

          {/* ── Stats strip ── */}
          <div className="yg-stats">
            {stats.map((s) => (
              <div key={s.label} className="yg-stat">
                <div className="yg-stat-val">{s.value}</div>
                <div className="yg-stat-lbl">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Features ── */}
      <section className="yg-features" id="features">
        <div className="yg-sec-head">
          <div className="yg-sec-eyebrow">Everything in one place</div>
          <h2 className="yg-sec-title">Built for people starting fresh in the US</h2>
          <p className="yg-sec-desc">
            Whether you are choosing a city, starting a degree, or just landed — we have what you need.
          </p>
        </div>
        <div className="yg-feat-grid">
          {features.map((f) => (
            <div key={f.title} className="yg-feat-card">
              <div className="yg-feat-icon" style={{ background: f.bg, color: f.accent }}>
                <f.icon size={24} strokeWidth={1.8} />
              </div>
              <h3 className="yg-feat-title">{f.title}</h3>
              <p className="yg-feat-desc">{f.desc}</p>
              <Link href={f.href} className="yg-feat-link" style={{ color: f.accent }}>
                {f.cta} <ArrowRight size={14} />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="yg-how">
        <div className="yg-how-inner">
          <div className="yg-how-left">
            <div className="yg-sec-eyebrow">How it works</div>
            <h2 className="yg-sec-title yg-how-title">Three steps to feeling at home</h2>
            <p className="yg-sec-desc" style={{ marginTop: 14 }}>
              No complicated setup. Just open the guide, read real stories, and find your people.
            </p>
            <Link href="/guide" className="yg-btn yg-btn-primary" style={{ marginTop: 32, display: "inline-flex" }}>
              Get started <ArrowRight size={17} />
            </Link>
          </div>
          <div className="yg-how-steps">
            {steps.map((step, i) => (
              <div key={step.num} className="yg-step">
                <div className="yg-step-num">{step.num}</div>
                <div className="yg-step-body">
                  <div className="yg-step-title">{step.title}</div>
                  <div className="yg-step-desc">{step.desc}</div>
                </div>
                {i < steps.length - 1 && <div className="yg-step-line" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Quick CTA banner ── */}
      <section className="yg-banner">
        <div className="yg-banner-inner">
          <div className="yg-banner-icon"><Zap size={22} strokeWidth={2} /></div>
          <div className="yg-banner-text">
            <div className="yg-banner-title">Ready to explore?</div>
            <div className="yg-banner-sub">It is free and always will be. No sign-up needed to start browsing.</div>
          </div>
          <div className="yg-banner-cta">
            <Link href="/guide" className="yg-btn yg-btn-primary">Open the guide <ArrowRight size={16} /></Link>
            <Link href="/community" className="yg-btn yg-btn-ghost-light">Join community</Link>
          </div>
        </div>
      </section>

      {/* ── Reviews ── */}
      <section className="yg-reviews" id="reviews">
        <div className="yg-sec-head">
          <div className="yg-sec-eyebrow">Real words, real journeys</div>
          <h2 className="yg-sec-title">Loved by guide readers</h2>
          <p className="yg-sec-desc">
            People use the guide and blogs to find clear answers faster. Here is what a few of them say.
          </p>
        </div>
        <div className="yg-rev-row yg-row-a">
          <div className="yg-rev-track">
            {reviewRowA.map((review, i) => (
              <ReviewCard key={`${review.name}-${i}`} review={review} />
            ))}
          </div>
        </div>
        <div className="yg-rev-row yg-row-b">
          <div className="yg-rev-track">
            {reviewRowB.map((review, i) => (
              <ReviewCard key={`${review.name}-${i}`} review={review} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="yg-footer">
        <div className="yg-foot-inner">
          <div className="yg-foot-brand">
            <div className="yg-foot-logo">
              <span className="yg-foot-mark" />
              <span className="yg-foot-name">yourguideinusa</span>
            </div>
            <div className="yg-foot-copy">© 2026 yourguideinusa — made with care for people far from home.</div>
          </div>
          <div className="yg-foot-links">
            <Link href="/">Home</Link>
            <Link href="/guide">Guide</Link>
            <Link href="/blog">Blogs</Link>
            <Link href="/community">Community</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/privacy">Privacy</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

const homeStyles = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Schibsted+Grotesk:wght@400;500;600;700;800&display=swap');

  :root{
    --yg-bg:#e9e8e4;
    --yg-panel:#f6f5f2;
    --yg-panel-2:#f0efeb;
    --yg-ink:#1a1916;
    --yg-ink-soft:#5d5a52;
    --yg-muted:#a3a097;
    --yg-line:#e3e1db;
    --yg-accent:#2f8f86;
    --yg-accent-soft:#e6f0ee;
    --yg-card-size:96px;
    --yg-speed:1;
    --yg-radius-card:26px;
    --yg-shadow-card:0 14px 30px -18px rgba(30,28,22,.45),0 2px 6px -2px rgba(30,28,22,.12);
  }
  *{box-sizing:border-box}
  .yg-home{
    min-height:100vh;
    width:100%;
    max-width:100vw;
    overflow-x:hidden;
    background:var(--yg-bg);
    color:var(--yg-ink);
    font-family:'Schibsted Grotesk',Inter,system-ui,sans-serif;
    line-height:1.5;
    -webkit-font-smoothing:antialiased;
  }
  .yg-home a{text-decoration:none;color:inherit}
  .yg-home svg{flex-shrink:0}

  /* ── Shell / Panel ── */
  .yg-shell{
    width:100%;
    max-width:min(1480px,100vw);
    margin:0 auto 40px;
    padding:92px 16px 16px;
  }
  .yg-panel{
    width:100%;
    background:linear-gradient(180deg,#fbfaf8 0%,var(--yg-panel) 60%,var(--yg-panel-2) 100%);
    border-radius:30px;
    box-shadow:0 40px 80px -50px rgba(30,28,22,.4),0 2px 0 rgba(255,255,255,.6) inset;
    overflow:hidden;
  }

  /* ── Hero ── */
  .yg-hero{position:relative;padding:0 8px 0}
  .yg-arch-field{
    position:relative;
    width:100%;
    height:650px;
    overflow:hidden;
    -webkit-mask-image:linear-gradient(90deg,transparent 0,#000 5%,#000 95%,transparent 100%);
    mask-image:linear-gradient(90deg,transparent 0,#000 5%,#000 95%,transparent 100%);
  }
  .yg-arch-card{position:absolute;top:0;left:0;z-index:10;will-change:transform}
  .yg-ac-inner{
    position:relative;width:100%;height:100%;
    border-radius:var(--yg-radius-card);overflow:hidden;
    box-shadow:var(--yg-shadow-card);
    transform:rotate(var(--yg-rot,0deg));
    transition:transform .35s cubic-bezier(.2,.7,.2,1),box-shadow .35s;
    background:#e9e7e2;cursor:grab;
  }
  .yg-ac-inner:hover{transform:rotate(0deg) scale(1.08);box-shadow:0 28px 46px -22px rgba(30,28,22,.6);z-index:50}
  .yg-card-img{display:block;width:100%;height:100%;object-fit:cover;filter:saturate(1.08) contrast(1.04)}
  .yg-label{
    position:absolute;left:8px;bottom:8px;z-index:3;pointer-events:none;
    font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10px;font-weight:500;
    color:#fff;background:rgba(20,18,14,.5);backdrop-filter:blur(3px);
    padding:3px 7px;border-radius:7px;letter-spacing:.02em;
  }
  .yg-kind{
    position:absolute;top:8px;right:8px;z-index:3;
    width:7px;height:7px;border-radius:50%;pointer-events:none;
    background:rgba(255,255,255,.95);box-shadow:0 0 0 3px rgba(255,255,255,.3);
  }
  .yg-kind-uni{background:var(--yg-accent)}

  /* Hero center */
  .yg-hero-center{
    position:absolute;left:50%;top:46%;
    transform:translate(-50%,-50%);
    z-index:30;text-align:center;
    width:min(860px,90%);pointer-events:none;
  }
  .yg-hero-badge,.yg-hero-cta{pointer-events:auto}
  .yg-hero-badge{
    display:inline-flex;align-items:center;gap:8px;
    background:#fff;border:1px solid var(--yg-line);
    border-radius:999px;padding:7px 16px 7px 10px;
    font-size:13px;color:var(--yg-ink-soft);font-weight:500;
    box-shadow:var(--yg-shadow-card);margin-bottom:20px;
  }
  .yg-dot{
    width:8px;height:8px;border-radius:50%;
    background:var(--yg-accent);box-shadow:0 0 0 4px var(--yg-accent-soft);
  }
  .yg-hero-title{
    font-size:clamp(40px,6.4vw,86px);line-height:.96;
    letter-spacing:-.038em;font-weight:800;text-wrap:balance;
    margin:0;
  }
  .yg-hero-title span{color:var(--yg-muted)}
  .yg-hero-title strong{color:var(--yg-accent);font-weight:800}
  .yg-hero-sub{
    margin:22px auto 0;max-width:500px;
    font-size:17.5px;color:var(--yg-ink-soft);text-wrap:pretty;line-height:1.6;
  }
  .yg-hero-cta{
    display:flex;gap:12px;justify-content:center;align-items:center;
    margin:28px auto 0;flex-wrap:wrap;
  }

  /* Buttons */
  .yg-btn{
    font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;
    border:none;padding:13px 22px;border-radius:13px;transition:.22s;
    display:inline-flex;align-items:center;gap:8px;white-space:nowrap;
  }
  .yg-btn svg{width:17px;height:17px;stroke-width:2}
  .yg-btn-primary{
    background:linear-gradient(135deg,#2f8f86,#3faaa0);color:#fff;
    box-shadow:0 14px 28px -16px rgba(47,143,134,.72);
  }
  .yg-btn-primary:hover{background:linear-gradient(135deg,#267870,#349990);transform:translateY(-2px);box-shadow:0 18px 32px -14px rgba(47,143,134,.8)}
  .yg-btn-ghost{
    background:rgba(255,255,255,.8);color:var(--yg-ink);
    border:1px solid var(--yg-line);backdrop-filter:blur(6px);
    box-shadow:0 2px 8px -3px rgba(30,28,22,.12);
  }
  .yg-btn-ghost:hover{background:#fff;box-shadow:var(--yg-shadow-card)}
  .yg-btn-ghost-light{
    background:rgba(255,255,255,.18);color:#fff;
    border:1px solid rgba(255,255,255,.3);backdrop-filter:blur(6px);
  }
  .yg-btn-ghost-light:hover{background:rgba(255,255,255,.28)}

  /* ── Stats strip ── */
  .yg-stats{
    display:flex;align-items:center;justify-content:center;
    gap:0;border-top:1px solid var(--yg-line);
    background:rgba(255,255,255,.4);
  }
  .yg-stat{
    flex:1;text-align:center;padding:22px 16px;
    border-right:1px solid var(--yg-line);
  }
  .yg-stat:last-child{border-right:none}
  .yg-stat-val{font-size:28px;font-weight:800;letter-spacing:-.03em;color:var(--yg-ink)}
  .yg-stat-lbl{font-size:13px;color:var(--yg-muted);font-weight:500;margin-top:2px}

  /* ── Features ── */
  .yg-features{
    padding:88px 0 80px;
    max-width:min(1280px,100vw);
    margin:0 auto;
    padding-left:24px;padding-right:24px;
  }
  .yg-feat-grid{
    display:grid;
    grid-template-columns:repeat(3,1fr);
    gap:20px;
    margin-top:52px;
  }
  .yg-feat-card{
    background:#fff;
    border:1px solid var(--yg-line);
    border-radius:24px;
    padding:32px;
    display:flex;flex-direction:column;gap:14px;
    transition:.25s;
    box-shadow:0 4px 16px -8px rgba(30,28,22,.1);
  }
  .yg-feat-card:hover{
    transform:translateY(-4px);
    box-shadow:0 20px 40px -24px rgba(30,28,22,.22);
  }
  .yg-feat-icon{
    width:52px;height:52px;border-radius:14px;
    display:grid;place-items:center;flex-shrink:0;
  }
  .yg-feat-title{font-size:20px;font-weight:800;letter-spacing:-.02em;margin:0}
  .yg-feat-desc{font-size:15px;color:var(--yg-ink-soft);line-height:1.6;margin:0;flex:1}
  .yg-feat-link{
    display:inline-flex;align-items:center;gap:6px;
    font-size:14px;font-weight:700;margin-top:4px;
    transition:.18s;
  }
  .yg-feat-link:hover{gap:10px}

  /* ── Section headings ── */
  .yg-sec-head{text-align:center;max-width:620px;margin:0 auto}
  .yg-sec-eyebrow{
    font-family:'JetBrains Mono',ui-monospace,monospace;
    font-size:12px;letter-spacing:.18em;text-transform:uppercase;
    color:var(--yg-accent);font-weight:500;margin-bottom:14px;
  }
  .yg-sec-title{font-size:clamp(28px,4vw,44px);font-weight:800;letter-spacing:-.03em;margin:0;line-height:1.02}
  .yg-sec-desc{color:var(--yg-ink-soft);font-size:17px;margin-top:14px;line-height:1.6}

  /* ── How it works ── */
  .yg-how{
    background:#fff;border-top:1px solid var(--yg-line);border-bottom:1px solid var(--yg-line);
    padding:88px 24px;
  }
  .yg-how-inner{
    max-width:1200px;margin:0 auto;
    display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:center;
  }
  .yg-how-left .yg-sec-head{text-align:left;margin:0}
  .yg-how-title{text-align:left!important}
  .yg-how-steps{display:flex;flex-direction:column;gap:0}
  .yg-step{display:flex;gap:20px;align-items:flex-start;position:relative}
  .yg-step-num{
    flex-shrink:0;width:44px;height:44px;border-radius:13px;
    border:2px solid var(--yg-line);
    display:grid;place-items:center;
    font-family:'JetBrains Mono',ui-monospace,monospace;
    font-size:12px;font-weight:500;color:var(--yg-accent);
    background:#fff;position:relative;z-index:2;
  }
  .yg-step-body{padding:10px 0 32px;flex:1}
  .yg-step:last-child .yg-step-body{padding-bottom:0}
  .yg-step-title{font-size:17px;font-weight:800;letter-spacing:-.02em;margin-bottom:6px}
  .yg-step-desc{font-size:15px;color:var(--yg-ink-soft);line-height:1.6}
  .yg-step-line{
    position:absolute;left:22px;top:44px;bottom:0;
    width:2px;background:var(--yg-line);z-index:1;
  }

  /* ── Banner ── */
  .yg-banner{
    background:linear-gradient(135deg,#1a6b64 0%,#2f8f86 50%,#3a9e95 100%);
    padding:56px 24px;
  }
  .yg-banner-inner{
    max-width:1100px;margin:0 auto;
    display:flex;align-items:center;gap:28px;flex-wrap:wrap;
  }
  .yg-banner-icon{
    width:52px;height:52px;border-radius:14px;
    background:rgba(255,255,255,.15);
    display:grid;place-items:center;color:#fff;flex-shrink:0;
  }
  .yg-banner-text{flex:1;min-width:200px}
  .yg-banner-title{font-size:22px;font-weight:800;color:#fff;letter-spacing:-.02em}
  .yg-banner-sub{font-size:15px;color:rgba(255,255,255,.75);margin-top:4px}
  .yg-banner-cta{display:flex;gap:12px;flex-wrap:wrap;align-items:center}

  /* ── Reviews ── */
  .yg-reviews{
    padding:88px 0 96px;max-width:min(1480px,100vw);
    margin:0 auto;overflow:hidden;
  }
  .yg-rev-row{overflow:hidden;width:100%;position:relative;padding:6px 0}
  .yg-rev-row::before,.yg-rev-row::after{
    content:"";position:absolute;top:0;bottom:0;width:120px;z-index:5;pointer-events:none;
  }
  .yg-rev-row::before{left:0;background:linear-gradient(90deg,var(--yg-bg),transparent)}
  .yg-rev-row::after{right:0;background:linear-gradient(-90deg,var(--yg-bg),transparent)}
  .yg-rev-track{display:flex;gap:20px;width:max-content;padding:12px 11px;will-change:transform}
  .yg-row-a .yg-rev-track{animation:yg-scroll-left calc(70s / var(--yg-speed)) linear infinite}
  .yg-row-b{margin-top:8px}
  .yg-row-b .yg-rev-track{animation:yg-scroll-right calc(82s / var(--yg-speed)) linear infinite}
  .yg-review{
    flex:0 0 auto;width:360px;background:#fff;
    border:1px solid var(--yg-line);border-radius:20px;padding:24px 24px 22px;
    box-shadow:0 10px 28px -18px rgba(30,28,22,.3);
    display:flex;flex-direction:column;gap:14px;
  }
  .yg-stars{display:flex;gap:3px;color:var(--yg-accent)}
  .yg-stars svg{width:15px;height:15px}
  .yg-review p{font-size:15px;color:var(--yg-ink);line-height:1.58;text-wrap:pretty;margin:0}
  .yg-reviewer{display:flex;align-items:center;gap:12px;margin-top:2px}
  .yg-avatar{width:40px;height:40px;border-radius:50%;flex:0 0 auto;display:grid;place-items:center;color:#fff;font-weight:700;font-size:14px}
  .yg-who{font-weight:700;font-size:14px;line-height:1.2}
  .yg-who span{display:block;color:var(--yg-muted);font-size:12px;font-weight:500;margin-top:3px}

  /* ── Footer ── */
  .yg-footer{max-width:1480px;margin:0 auto;padding:0 28px 60px}
  .yg-foot-inner{
    border-top:1px solid var(--yg-line);padding-top:36px;
    display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:24px;
  }
  .yg-foot-brand{display:flex;flex-direction:column;gap:8px}
  .yg-foot-logo{display:flex;align-items:center;gap:9px}
  .yg-foot-mark{
    width:24px;height:24px;border-radius:7px;flex-shrink:0;
    background:conic-gradient(from 200deg,#2f8f86,#7fc9c0,#2f8f86);
  }
  .yg-foot-name{font-size:15px;font-weight:800;letter-spacing:-.02em;color:var(--yg-ink)}
  .yg-foot-copy{font-size:13.5px;color:var(--yg-muted)}
  .yg-foot-links{display:flex;flex-wrap:wrap;gap:6px 4px;align-items:center}
  .yg-foot-links a{font-size:14px;color:var(--yg-ink-soft);padding:6px 12px;border-radius:8px;transition:.15s;font-weight:500}
  .yg-foot-links a:hover{color:var(--yg-ink);background:rgba(30,28,22,.05)}

  /* Animations */
  @keyframes yg-scroll-left{from{transform:translateX(0)}to{transform:translateX(-50%)}}
  @keyframes yg-scroll-right{from{transform:translateX(-50%)}to{transform:translateX(0)}}

  /* ── Responsive ── */
  @media (max-width:1024px){
    .yg-feat-grid{grid-template-columns:1fr 1fr}
    .yg-how-inner{grid-template-columns:1fr;gap:48px}
    .yg-how-left .yg-sec-head{margin:0 auto;text-align:center}
    .yg-how-title{text-align:center!important}
    .yg-how-left .yg-btn{margin-left:auto;margin-right:auto}
    .yg-how-left{display:flex;flex-direction:column;align-items:center;text-align:center}
  }
  @media (max-width:900px){
    :root{--yg-card-size:96px}
    .yg-feat-grid{grid-template-columns:1fr}
    .yg-feat-card{flex-direction:row;gap:20px;align-items:flex-start}
    .yg-feat-link{margin-top:0}
  }
  @media (max-width:700px){
    :root{--yg-card-size:76px;--yg-radius-card:21px}
    .yg-home{overflow-x:hidden;touch-action:pan-y}
    .yg-shell{max-width:100vw;padding:86px 6px 10px;margin-bottom:22px;overflow:hidden}
    .yg-panel{border-radius:26px}
    .yg-hero{padding:0}
    .yg-arch-field{
      height:620px;
      -webkit-mask-image:none;mask-image:none;
    }
    .yg-arch-field::before{
      content:"";position:absolute;left:50%;top:34%;
      width:min(360px,84vw);height:300px;
      transform:translate(-50%,-50%);
      background:radial-gradient(circle at 50% 46%,rgba(246,245,242,.96) 0%,rgba(246,245,242,.88) 50%,rgba(246,245,242,0) 72%);
      z-index:20;pointer-events:none;
    }
    .yg-hero-center{top:33%;width:min(310px,84vw)}
    .yg-hero-title{font-size:clamp(36px,11.4vw,45px);line-height:1.02;letter-spacing:-.018em}
    .yg-hero-sub{max-width:286px;margin-top:14px;font-size:15px;line-height:1.55}
    .yg-hero-badge{font-size:12px;padding:6px 12px 6px 9px}
    .yg-arch-card{z-index:8}
    .yg-ac-inner{box-shadow:0 14px 28px -20px rgba(30,28,22,.52)}
    .yg-label{left:7px;bottom:7px;font-size:8.5px;padding:2px 6px;border-radius:6px}
    .yg-kind{top:7px;right:7px;width:6px;height:6px}
    .yg-stats{flex-wrap:wrap}
    .yg-stat{flex:1 1 50%;border-bottom:1px solid var(--yg-line)}
    .yg-stat:nth-child(2){border-right:none}
    .yg-stat:nth-child(3){border-bottom:none}
    .yg-stat:last-child{border-bottom:none}
    .yg-features{padding:56px 16px 48px}
    .yg-feat-card{flex-direction:column}
    .yg-how{padding:56px 20px}
    .yg-how-steps{gap:0}
    .yg-banner-inner{flex-direction:column;text-align:center}
    .yg-banner-cta{justify-content:center}
    .yg-reviews{padding:54px 0 72px;max-width:100vw}
    .yg-rev-row::before,.yg-rev-row::after{width:54px}
    .yg-rev-track{gap:14px;padding:10px 8px}
    .yg-review{width:min(300px,76vw)}
    .yg-sec-head{padding:0 22px}
    .yg-sec-title{font-size:clamp(26px,8vw,34px)}
    .yg-foot-inner{flex-direction:column;align-items:flex-start;gap:20px}
    .yg-foot-links{gap:4px 0}
  }
  @media (max-width:560px){
    :root{--yg-card-size:68px}
    .yg-shell{padding-left:6px;padding-right:6px}
    .yg-arch-field{height:570px}
    .yg-hero-center{top:30%;width:min(300px,84vw)}
    .yg-hero-title{font-size:clamp(34px,11.8vw,43px)}
    .yg-hero-sub{max-width:272px;font-size:14.5px}
    .yg-review{width:min(292px,78vw)}
  }
`;
