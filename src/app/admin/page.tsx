"use client";

/**
 * YourGuideInUSA — Admin Dashboard
 * Single-file Next.js client component. Paste into: src/app/admin/page.tsx
 *
 * Self-contained: styles + fonts are injected at runtime, so no extra config
 * is required. Tailwind is NOT needed (all styling is inline / scoped CSS).
 *
 * Notes:
 *  - Admin data is fetched through protected route handlers so service keys
 *    stay on the server. Adjust the TABLES map in the route if needed.
 *  - The Generate tab calls a protected route handler so API keys stay on
 *    the server.
 */

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  useId,
} from "react";
import { supabase } from "@/lib/supabase";

/* ============================================================
   CONFIG
   ============================================================ */
const CATEGORY_COLORS: Record<string, string> = {
  Insurance: "#8b5cf6",
  Banking: "#3b82f6",
  "Visa & OPT": "#10b981",
  "City Guides": "#f59e0b",
  Housing: "#ec4899",
  Jobs: "#f97316",
  "Daily Life": "#14b8a6",
  General: "#6366f1",
};
const CATEGORIES = Object.keys(CATEGORY_COLORS);

/* ============================================================
   TYPES
   ============================================================ */
interface Article {
  id: string | number;
  raw?: any;
  title: string;
  category: string;
  content: string;
  excerpt: string;
  slug: string;
  readTime: number;
  image: string | null;
  date: Date | null;
  views: number | null;
}
interface QueueTopic {
  title: string;
  category: string;
}
interface Counts {
  articles: number;
  users: number;
  posts: number;
  groups: number;
}
interface Draft {
  title: string;
  category: string;
  excerpt: string;
  readTime: number;
  content: string;
  slug: string;
  date?: Date;
  searchIntent?: string;
  trafficAngle?: string;
  reviewChecklist?: string[];
  sourcesToVerify?: { label: string; url?: string; why?: string }[];
  riskNotes?: string[];
}
interface Store {
  articles: Article[];
  counts: Counts;
  loading: { articles: boolean; counts: boolean };
  queue: QueueTopic[];
  setQueue: React.Dispatch<React.SetStateAction<QueueTopic[]>>;
  setTab: (t: string) => void;
  onView: (a: Article) => void;
  onDelete: (a: Article) => void;
  onPublish: (draft: Draft) => Promise<Article>;
  push: (msg: string, type?: ToastType) => void;
  refresh: () => void;
  prefillTopic: { title: string; category: string } | null;
  setPrefillTopic: (t: { title: string; category: string } | null) => void;
}
type ToastType = "info" | "success" | "error";

interface AdminCommunityGroup {
  id: string;
  name: string;
  description?: string;
  type?: string;
  location?: string;
  member_count?: number;
  created_by?: string | null;
  created_at?: string;
}
interface AdminCommunityMember {
  group_id: string;
  user_id: string;
  joined_at?: string;
  role?: "member" | "admin" | string;
  display_name?: string;
  avatar_url?: string | null;
}
interface AdminCommunityMessage {
  id: string;
  group_id: string;
  author_id?: string | null;
  author_name?: string;
  body?: string;
  message_type?: string;
  media_url?: string | null;
  file_name?: string | null;
  created_at?: string;
}
interface AdminCommunityModerator {
  email: string;
  enabled?: boolean;
  created_at?: string;
}
interface AdminChannelMessage {
  id: string;
  channel: "general" | "announcements";
  author_name?: string;
  body: string;
  group_id?: string | null;
  media_url?: string | null;
  created_at?: string;
}
interface AdminCommunityData {
  groups: AdminCommunityGroup[];
  members: AdminCommunityMember[];
  messages: AdminCommunityMessage[];
  moderators: AdminCommunityModerator[];
  channelMessages: AdminChannelMessage[];
}
interface AdminSessionUser {
  id: string;
  email: string;
}
interface AdminTwoStepState {
  configured: boolean;
  verified: boolean;
}
type AdminApiError = Error & { status?: number };

/* ============================================================
   HELPERS
   ============================================================ */
function catColor(name: string): string {
  return CATEGORY_COLORS[name] || "#6366f1";
}
function hexToRgba(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
function fmtDate(d: Date | string | null): string {
  if (!d) return "—";
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

async function adminApi<T>(input: string, init?: RequestInit): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) {
    const error = new Error("Please sign in to use the admin dashboard.") as AdminApiError;
    error.status = 401;
    throw error;
  }

  const res = await fetch(input, {
    credentials: "same-origin",
    cache: "no-store",
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const error = new Error(json?.error || `Admin API ${res.status}`) as AdminApiError;
    error.status = res.status;
    throw error;
  }
  return json as T;
}

async function fetchAdminSession(): Promise<{ user: AdminSessionUser; twoStep: AdminTwoStepState }> {
  return adminApi<{ user: AdminSessionUser; twoStep: AdminTwoStepState }>("/api/admin/session");
}

async function verifyAdminTwoStep(code: string): Promise<{ ok: boolean; twoStep: AdminTwoStepState }> {
  return adminApi<{ ok: boolean; twoStep: AdminTwoStepState }>("/api/admin/2fa", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

async function fetchAdminContent(): Promise<{ articles: any[]; counts: Counts }> {
  return adminApi<{ articles: any[]; counts: Counts }>("/api/admin/content");
}

async function insertAdminArticle(row: Record<string, any>): Promise<any> {
  const data = await adminApi<{ article: any }>("/api/admin/content", {
    method: "POST",
    body: JSON.stringify(row),
  });
  return data.article;
}

async function deleteAdminArticle(id: string | number): Promise<boolean> {
  await adminApi<{ ok: boolean }>(`/api/admin/content?id=${encodeURIComponent(String(id))}`, {
    method: "DELETE",
  });
  return true;
}

async function fetchAdminCommunity(): Promise<AdminCommunityData> {
  return adminApi<AdminCommunityData>("/api/admin/community");
}

async function adminCommunityAction<T = any>(body: Record<string, any>): Promise<T> {
  return adminApi<T>("/api/admin/community", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function normalizeArticle(row: any, i = 0): Article {
  const title = row.title || row.name || row.headline || "Untitled article";
  const category = row.category || row.cat || row.topic_category || "General";
  const created = row.created_at || row.published_at || row.date || row.inserted_at;
  const content = row.content || row.body || row.markdown || row.text || "";
  const excerpt =
    row.excerpt ||
    row.summary ||
    row.description ||
    (typeof content === "string" ? content.replace(/[#*_>`[\]]/g, "").slice(0, 160) : "");
  const slug =
    row.slug ||
    (title || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const words = typeof content === "string" ? content.split(/\s+/).filter(Boolean).length : 0;
  const readTime = row.read_time || row.reading_time || Math.max(1, Math.round(words / 200)) || 5;
  return {
    id: row.id != null ? row.id : `local-${i}`,
    raw: row,
    title,
    category,
    content,
    excerpt,
    slug,
    readTime,
    image: row.image || row.image_url || row.cover || row.thumbnail || null,
    date: created ? new Date(created) : null,
    views: row.views || row.view_count || null,
  };
}

/* ---- Anthropic (Generate tab) ---- */
async function generateArticle({
  topic,
  category,
}: {
  topic: string;
  category: string;
}): Promise<Draft> {
  const { data: authData } = await supabase.auth.getSession();
  const token = authData.session?.access_token;
  if (!token) {
    const error = new Error("Please sign in to use the admin dashboard.") as AdminApiError;
    error.status = 401;
    throw error;
  }

  const res = await fetch("/api/admin/generate-article", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ topic, category }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const error = new Error(data?.error || `Article generation failed (${res.status})`) as AdminApiError;
    error.status = res.status;
    throw error;
  }
  return {
    title: data.title,
    category: data.category,
    excerpt: data.excerpt,
    readTime: data.readTime,
    content: data.content,
    slug: data.slug,
    searchIntent: data.searchIntent,
    trafficAngle: data.trafficAngle,
    reviewChecklist: Array.isArray(data.reviewChecklist) ? data.reviewChecklist : [],
    sourcesToVerify: Array.isArray(data.sourcesToVerify) ? data.sourcesToVerify : [],
    riskNotes: Array.isArray(data.riskNotes) ? data.riskNotes : [],
  };
}

/* ============================================================
   ADMIN DEFAULTS
   ============================================================ */
const EMPTY_COUNTS: Counts = { articles: 0, users: 0, posts: 0, groups: 0 };

const QUEUE_TOPICS: QueueTopic[] = [
  { title: "2026-27 University Health Insurance Waiver Checklist: What to Verify Before You Decline a School Plan", category: "Insurance" },
  { title: "F-1 Summer Internship Timeline: CPT, Pre-OPT, Offer Letter, and DSO Steps to Verify", category: "Visa & OPT" },
  { title: "Apartment Scam Checklist for Newcomers Signing a Lease Before Reaching the USA", category: "Housing" },
  { title: "First 72 Hours After Landing in the USA: SIM, Bank, Groceries, Transit, and Campus Tasks", category: "Daily Life" },
  { title: "Best eSIM and Phone Plan Setup for People Arriving in the USA This Semester", category: "Daily Life" },
  { title: "Opening a US Bank Account Without SSN History: Documents to Confirm Before Visiting a Branch", category: "Banking" },
  { title: "CPT vs On-Campus Work vs Volunteering: Common Mistakes to Check Before Starting", category: "Visa & OPT" },
  { title: "How to Use YourGuideInUSA Guide Search to Compare Housing, Food, Transit, and Campus Areas", category: "City Guides" },
  { title: "Move-In Week Grocery and Essentials List for a First Apartment Near Campus", category: "Daily Life" },
  { title: "Credit Score From Zero: Secured Card, Authorized User, Rent Reporting, and What to Avoid", category: "Banking" },
  { title: "City Safety Checklist Before Choosing Off-Campus Housing Near a University", category: "Housing" },
  { title: "OPT Application Prep: Photos, I-765 Details, Timing, and Official Pages to Recheck", category: "Visa & OPT" },
  { title: "How to Ask Useful Questions in YourGuideInUSA Community Groups Before You Move", category: "General" },
  { title: "Public Transit, Rideshare, and Bike Costs to Compare Before Picking a Neighborhood", category: "City Guides" },
  { title: "Resume and Job Search Basics for Newcomers: What to Customize Before Applying", category: "Jobs" },
];

const TRAFFIC = {
  today: { visitors: 0, views: 0, bounce: 0, avgTime: "0m 00s" },
  week: { visitors: 0, views: 0, bounce: 0, avgTime: "0m 00s" },
  month: { visitors: 0, views: 0, bounce: 0, avgTime: "0m 00s" },
  topPages: [] as { url: string; views: number; trend: number }[],
  sources: [] as { name: string; pct: number }[],
  countries: [] as { name: string; flag: string; pct: number }[],
};

const TRAFFIC_SERIES = [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
];

/* ============================================================
   STYLES (injected once)
   ============================================================ */
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
.ygc-app {
  --bg:#f6f8fc; --bg-2:#ffffff; --card:#ffffff; --card-2:#f1f5f9;
  --border:rgba(15,23,42,0.10); --border-2:rgba(15,23,42,0.16);
  --accent:#4f46e5; --accent-2:#6366f1; --success:#10b981; --amber:#d97706;
  --text:#111827; --muted:#64748b; --muted-2:#94a3b8;
  --sans:"Inter",ui-sans-serif,system-ui,sans-serif; --mono:"JetBrains Mono",ui-monospace,monospace;
  color:var(--text); font-family:var(--sans); font-size:14px; -webkit-font-smoothing:antialiased;
  min-height:100vh;
  background:
    radial-gradient(1000px 520px at 80% -10%, rgba(79,70,229,0.10), transparent 60%),
    radial-gradient(760px 440px at -10% 8%, rgba(16,185,129,0.08), transparent 55%),
    var(--bg);
}
.ygc-app *{ box-sizing:border-box; }
.ygc-app button{ font-family:inherit; cursor:pointer; }
.ygc-app input,.ygc-app select,.ygc-app textarea{ font-family:inherit; }
.ygc-app ::selection{ background:#6366f1; color:#fff; }
.ygc-app ::-webkit-scrollbar{ width:10px; height:10px; }
.ygc-app ::-webkit-scrollbar-thumb{ background:rgba(100,116,139,0.24); border-radius:999px; border:2px solid transparent; background-clip:padding-box; }
.ygc-app ::-webkit-scrollbar-thumb:hover{ background:rgba(100,116,139,0.38); background-clip:padding-box; }
.ygc-spin{ animation:ygcspin .8s linear infinite; }
@keyframes ygcspin{ to{ transform:rotate(360deg); } }
.ygc-pulse{ animation:ygcpulse 1.8s ease-in-out infinite; }
@keyframes ygcpulse{ 0%,100%{ opacity:1; } 50%{ opacity:.35; } }
.ygc-fade{ animation:ygcfade .4s ease both; }
@keyframes ygcfade{ from{ opacity:0; transform:translateY(6px); } to{ opacity:1; transform:none; } }
.ygc-shimmer{ background:linear-gradient(90deg,rgba(148,163,184,0.12) 25%,rgba(148,163,184,0.22) 37%,rgba(148,163,184,0.12) 63%); background-size:400% 100%; animation:ygcshimmer 1.4s ease infinite; }
@keyframes ygcshimmer{ 0%{ background-position:100% 0; } 100%{ background-position:-100% 0; } }
@keyframes ygcshake{ 0%,100%{ transform:translateX(0); } 20%,60%{ transform:translateX(-7px); } 40%,80%{ transform:translateX(7px); } }
`;

function StyleInjector() {
  return <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />;
}

/* ============================================================
   ICONS
   ============================================================ */
function Icon({
  name,
  size = 18,
  color = "currentColor",
  strokeWidth = 1.7,
  style,
  className,
}: {
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
  className?: string;
}) {
  const p: any = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style,
    className,
  };
  switch (name) {
    case "overview": return <svg {...p}><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>;
    case "traffic": return <svg {...p}><path d="M3 17l6-6 4 4 8-8" /><path d="M14 7h7v7" /></svg>;
    case "revenue": return <svg {...p}><path d="M12 2v20M17 6H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>;
    case "articles": return <svg {...p}><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>;
    case "queue": return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
    case "generate": return <svg {...p}><path d="M12 3l1.8 4.8L18.6 9.6l-4.8 1.8L12 16.2l-1.8-4.8L5.4 9.6l4.8-1.8z" /><path d="M19 15l.6 1.6L21.2 17l-1.6.6L19 19.2l-.6-1.6L16.8 17l1.6-.4z" /></svg>;
    case "community": return <svg {...p}><circle cx="8" cy="9" r="3" /><circle cx="16" cy="9" r="3" /><path d="M2 20v-1a4 4 0 014-4h4a4 4 0 014 4v1M14 15h4a4 4 0 014 4v1" /></svg>;
    case "users": return <svg {...p}><circle cx="9" cy="8" r="3.2" /><path d="M3 20v-1.5a4 4 0 014-4h4a4 4 0 014 4V20" /><path d="M16 5.5a3 3 0 010 5.8M21 20v-1.4a4 4 0 00-3-3.8" /></svg>;
    case "posts": return <svg {...p}><path d="M21 12a8 8 0 11-3.2-6.4L21 4l-1.2 3.6A8 8 0 0121 12z" /></svg>;
    case "groups": return <svg {...p}><circle cx="12" cy="8" r="3.2" /><path d="M5 21v-1a5 5 0 0114 0v1" /></svg>;
    case "eye": return <svg {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>;
    case "trash": return <svg {...p}><path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2M6 6l1 14a2 2 0 002 2h6a2 2 0 002-2l1-14" /></svg>;
    case "plus": return <svg {...p}><path d="M12 5v14M5 12h14" /></svg>;
    case "arrow": return <svg {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
    case "up": return <svg {...p}><path d="M12 19V5M6 11l6-6 6 6" /></svg>;
    case "down": return <svg {...p}><path d="M12 5v14M6 13l6 6 6-6" /></svg>;
    case "close": return <svg {...p}><path d="M6 6l12 12M18 6L6 18" /></svg>;
    case "check": return <svg {...p}><path d="M5 12l5 5 9-11" /></svg>;
    case "refresh": return <svg {...p}><path d="M21 12a9 9 0 11-2.6-6.4M21 4v5h-5" /></svg>;
    case "external": return <svg {...p}><path d="M14 3h7v7M21 3l-9 9M19 14v6H4V5h6" /></svg>;
    case "lock": return <svg {...p}><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 018 0v3" /></svg>;
    case "logout": return <svg {...p}><path d="M15 17l5-5-5-5M20 12H9M12 3H6a2 2 0 00-2 2v14a2 2 0 002 2h6" /></svg>;
    case "info": return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>;
    case "calendar": return <svg {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>;
    case "bolt": return <svg {...p}><path d="M13 2L4 14h7l-1 8 9-12h-7z" /></svg>;
    case "link": return <svg {...p}><path d="M10 14a4 4 0 005.66 0l3-3a4 4 0 00-5.66-5.66l-1.5 1.5M14 10a4 4 0 00-5.66 0l-3 3a4 4 0 005.66 5.66l1.5-1.5" /></svg>;
    case "edit": return <svg {...p}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;
    default: return null;
  }
}

/* ============================================================
   UI PRIMITIVES
   ============================================================ */
function Card({
  children,
  className = "",
  style,
  hover,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  hover?: boolean;
  onClick?: () => void;
}) {
  const [h, setH] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      className={className}
      style={{
        background: "var(--card)",
        border: `1px solid ${hover && h ? "var(--border-2)" : "var(--border)"}`,
        borderRadius: 16,
        transition: "border-color .2s, transform .2s, background .2s",
        transform: hover && h ? "translateY(-2px)" : "none",
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Badge({ category, size = "sm" }: { category: string; size?: "sm" | "md" }) {
  const c = catColor(category);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: size === "sm" ? "2px 9px" : "4px 11px",
        borderRadius: 999,
        background: hexToRgba(c, 0.14),
        color: c,
        border: `1px solid ${hexToRgba(c, 0.3)}`,
        fontSize: size === "sm" ? 11 : 12.5,
        fontWeight: 600,
        letterSpacing: 0.2,
        whiteSpace: "nowrap",
      }}
    >
      {category}
    </span>
  );
}

function Sparkline({
  data,
  width = 200,
  height = 32,
  stroke = "currentColor",
  fill = "none",
  strokeWidth = 1.6,
}: {
  data: number[];
  width?: number | string;
  height?: number;
  stroke?: string;
  fill?: string;
  strokeWidth?: number;
}) {
  const w = typeof width === "number" ? width : 240;
  const rawId = useId();
  const gid = "g" + rawId.replace(/:/g, "");
  if (!data || !data.length) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const stepX = w / (data.length - 1 || 1);
  const pts = data.map((v, i) => [i * stepX, height - ((v - min) / range) * (height - 4) - 2]);
  const path = pts.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(" ");
  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${w} ${height}`}
      preserveAspectRatio="none"
      style={{ display: "block", overflow: "visible" }}
    >
      {fill !== "none" && (
        <>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={fill} stopOpacity="0.28" />
              <stop offset="100%" stopColor={fill} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${path} L${w},${height} L0,${height} Z`} fill={`url(#${gid})`} stroke="none" />
        </>
      )}
      <path d={path} fill="none" stroke={stroke} strokeWidth={strokeWidth} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function StatCard({
  label,
  value,
  prefix,
  suffix,
  icon,
  accent = "var(--accent)",
  sub,
  loading,
  delta,
  sparkData,
}: {
  label: string;
  value: number | string;
  prefix?: string;
  suffix?: string;
  icon: string;
  accent?: string;
  sub?: string;
  loading?: boolean;
  delta?: number;
  sparkData?: number[];
}) {
  return (
    <Card hover style={{ padding: 18, display: "flex", flexDirection: "column", gap: 0, minHeight: 132 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12.5, color: "var(--muted)", fontWeight: 500 }}>{label}</span>
        <span
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            background: hexToRgba(accent.startsWith("#") ? accent : "#6366f1", 0.14),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: accent,
          }}
        >
          <Icon name={icon} size={16} color={accent} />
        </span>
      </div>
      <div style={{ marginTop: 14, display: "flex", alignItems: "baseline", gap: 6 }}>
        {loading ? (
          <div className="ygc-shimmer" style={{ width: 76, height: 34, borderRadius: 8 }} />
        ) : (
          <span style={{ fontSize: 34, fontWeight: 700, letterSpacing: -1, color: "var(--text)", lineHeight: 1 }}>
            {prefix}
            {typeof value === "number" ? value.toLocaleString() : value}
            {suffix}
          </span>
        )}
        {delta != null && !loading && (
          <span style={{ fontSize: 12, fontWeight: 600, color: delta >= 0 ? "var(--success)" : "#f87171" }}>
            {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}%
          </span>
        )}
      </div>
      {sub && <div style={{ fontSize: 12, color: "var(--muted-2)", marginTop: 7 }}>{sub}</div>}
      {sparkData && (
        <div style={{ marginTop: "auto", paddingTop: 12, color: accent }}>
          <Sparkline data={sparkData} width={240} height={30} stroke="currentColor" fill="currentColor" />
        </div>
      )}
    </Card>
  );
}

const btnVariants: Record<string, (h: boolean) => React.CSSProperties> = {
  primary: (h) => ({ background: h ? "var(--accent-2)" : "var(--accent)", color: "#fff", borderColor: "transparent", boxShadow: h ? "0 6px 20px -6px rgba(99,102,241,0.6)" : "none" }),
  success: (h) => ({ background: h ? "#059669" : "var(--success)", color: "#052e1b", borderColor: "transparent", boxShadow: h ? "0 6px 20px -6px rgba(16,185,129,0.45)" : "none" }),
  ghost: (h) => ({ background: h ? "var(--card-2)" : "var(--card)", color: "var(--text)", borderColor: "var(--border)" }),
  danger: (h) => ({ background: h ? "rgba(248,113,113,0.16)" : "transparent", color: "#f87171", borderColor: h ? "rgba(248,113,113,0.4)" : "var(--border)" }),
  gradient: (h) => ({ background: "linear-gradient(100deg, #6366f1, #8b5cf6 55%, #ec4899)", color: "#fff", borderColor: "transparent", boxShadow: h ? "0 10px 30px -8px rgba(139,92,246,0.6)" : "0 4px 14px -6px rgba(139,92,246,0.4)" }),
};

function Btn({
  children,
  variant = "ghost",
  size = "md",
  onClick,
  disabled,
  style,
  title,
  type,
}: {
  children: React.ReactNode;
  variant?: "primary" | "success" | "ghost" | "danger" | "gradient";
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  disabled?: boolean;
  style?: React.CSSProperties;
  title?: string;
  type?: "button" | "submit" | "reset";
}) {
  const [h, setH] = useState(false);
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    padding: size === "sm" ? "6px 11px" : size === "lg" ? "12px 20px" : "9px 15px",
    fontSize: size === "sm" ? 12.5 : size === "lg" ? 15 : 13.5,
    fontWeight: 600,
    borderRadius: 9,
    border: "1px solid transparent",
    transition: "all .15s",
    whiteSpace: "nowrap",
    opacity: disabled ? 0.5 : 1,
    pointerEvents: disabled ? "none" : "auto",
  };
  return (
    <button
      type={type}
      title={title}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{ ...base, ...btnVariants[variant](h), ...style }}
    >
      {children}
    </button>
  );
}

function IconBtn({
  name,
  onClick,
  title,
  color = "var(--muted)",
  danger,
  size = 15,
}: {
  name: string;
  onClick?: () => void;
  title?: string;
  color?: string;
  danger?: boolean;
  size?: number;
}) {
  const [h, setH] = useState(false);
  return (
    <button
      title={title}
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        width: 30,
        height: 30,
        borderRadius: 8,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        border: `1px solid ${h ? (danger ? "rgba(248,113,113,0.4)" : "var(--border-2)") : "var(--border)"}`,
        background: h ? (danger ? "rgba(248,113,113,0.14)" : "var(--card-2)") : "var(--card)",
        color: danger ? (h ? "#f87171" : "var(--muted)") : h ? "var(--text)" : color,
        transition: "all .15s",
      }}
    >
      <Icon name={name} size={size} />
    </button>
  );
}

function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24, gap: 16, flexWrap: "wrap" }}>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: -0.6, color: "var(--text)" }}>{title}</h1>
        {subtitle && <p style={{ margin: "6px 0 0", color: "var(--muted)", fontSize: 14 }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: "flex", gap: 10, alignItems: "center" }}>{actions}</div>}
    </div>
  );
}

function Thumb({ article, size = 46 }: { article: Article; size?: number }) {
  const c = catColor(article.category);
  const letter = (article.title || "?").trim()[0] || "?";
  if (article.image) {
    return <img src={article.image} alt="" style={{ width: size, height: size, borderRadius: 10, objectFit: "cover", border: "1px solid var(--border)", flexShrink: 0 }} />;
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 10,
        flexShrink: 0,
        background: `linear-gradient(135deg, ${hexToRgba(c, 0.35)}, ${hexToRgba(c, 0.12)})`,
        border: `1px solid ${hexToRgba(c, 0.3)}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: c,
        fontWeight: 700,
        fontSize: size * 0.42,
      }}
    >
      {letter.toUpperCase()}
    </div>
  );
}

interface Toast {
  id: string;
  msg: string;
  type: ToastType;
}
function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);
  const push = useCallback((msg: string, type: ToastType = "info") => {
    const id = "t" + ++idRef.current;
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  }, []);
  const node = (
    <div style={{ position: "fixed", bottom: 22, right: 22, zIndex: 1000, display: "flex", flexDirection: "column", gap: 10 }}>
      {toasts.map((t) => (
        <div
          key={t.id}
          className="ygc-fade"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 16px",
            borderRadius: 11,
            minWidth: 220,
            maxWidth: 360,
            background: "rgba(255,255,255,0.96)",
            backdropFilter: "blur(12px)",
            border: `1px solid ${t.type === "success" ? "rgba(52,211,153,0.4)" : t.type === "error" ? "rgba(248,113,113,0.4)" : "var(--border-2)"}`,
            color: "var(--text)",
            fontSize: 13.5,
            fontWeight: 500,
            boxShadow: "0 18px 44px -18px rgba(15,23,42,0.28)",
          }}
        >
          <span style={{ color: t.type === "success" ? "var(--success)" : t.type === "error" ? "#f87171" : "var(--accent-2)" }}>
            <Icon name={t.type === "success" ? "check" : t.type === "error" ? "close" : "info"} size={16} />
          </span>
          {t.msg}
        </div>
      ))}
    </div>
  );
  return { push, node };
}

function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div
      onClick={onCancel}
      style={{ position: "fixed", inset: 0, zIndex: 900, background: "rgba(15,23,42,0.34)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="ygc-fade"
        style={{ width: 400, maxWidth: "100%", background: "var(--bg-2)", border: "1px solid var(--border-2)", borderRadius: 16, padding: 24, boxShadow: "0 28px 80px -28px rgba(15,23,42,0.38)" }}
      >
        <div style={{ display: "flex", gap: 13, alignItems: "flex-start" }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: "rgba(248,113,113,0.14)", border: "1px solid rgba(248,113,113,0.3)", display: "flex", alignItems: "center", justifyContent: "center", color: "#f87171" }}>
            <Icon name="trash" size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 16.5, fontWeight: 700 }}>{title}</h3>
            <p style={{ margin: "7px 0 0", color: "var(--muted)", fontSize: 13.5, lineHeight: 1.5 }}>{body}</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 22 }}>
          <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
          <Btn variant="danger" onClick={onConfirm} style={{ background: "rgba(248,113,113,0.16)", borderColor: "rgba(248,113,113,0.4)" }}>{confirmLabel}</Btn>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   SIDEBAR
   ============================================================ */
const NAV = [
  { id: "overview", label: "Overview", icon: "overview" },
  { id: "traffic", label: "Traffic", icon: "traffic" },
  { id: "revenue", label: "Revenue", icon: "revenue" },
  { id: "articles", label: "Articles", icon: "articles" },
  { id: "queue", label: "Queue", icon: "queue" },
  { id: "generate", label: "Generate", icon: "generate", badge: "AI" },
  { id: "community", label: "Community", icon: "community" },
];

function Sidebar({
  tab,
  setTab,
  onLogout,
  counts,
}: {
  tab: string;
  setTab: (t: string) => void;
  onLogout: () => void;
  counts: Record<string, number>;
}) {
  return (
    <aside style={{ width: 210, minWidth: 210, height: "100vh", position: "sticky", top: 0, background: "rgba(255,255,255,0.78)", backdropFilter: "blur(14px)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", padding: "20px 14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "2px 8px 20px" }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 17, color: "#fff", boxShadow: "0 8px 20px -8px rgba(99,102,241,0.7)" }}>Y</div>
        <div style={{ lineHeight: 1.15 }}>
          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: -0.2 }}>YourGuide</div>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>inUSA · Admin</div>
        </div>
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1 }}>
        {NAV.map((n) => {
          const active = tab === n.id;
          const count = counts[n.id];
          return (
            <button
              key={n.id}
              onClick={() => setTab(n.id)}
              style={{ display: "flex", alignItems: "center", gap: 11, width: "100%", padding: "9px 11px", borderRadius: 10, border: "none", textAlign: "left", background: active ? "var(--accent)" : "transparent", color: active ? "#fff" : "var(--muted)", fontSize: 13.5, fontWeight: active ? 600 : 500, transition: "all .15s", position: "relative", boxShadow: active ? "0 8px 22px -10px rgba(99,102,241,0.8)" : "none" }}
              onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = "var(--card-2)"; e.currentTarget.style.color = "var(--text)"; } }}
              onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--muted)"; } }}
            >
              <Icon name={n.icon} size={17} color={active ? "#fff" : "currentColor"} />
              <span style={{ flex: 1 }}>{n.label}</span>
              {n.badge && <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.5, padding: "2px 5px", borderRadius: 5, background: active ? "rgba(255,255,255,0.2)" : "linear-gradient(100deg,#6366f1,#8b5cf6)", color: "#fff" }}>{n.badge}</span>}
              {count != null && !n.badge && <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: active ? "rgba(255,255,255,0.8)" : "var(--muted-2)" }}>{count}</span>}
            </button>
          );
        })}
      </nav>

      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, marginTop: 12, display: "flex", flexDirection: "column", gap: 4 }}>
        <a
          href="https://yourguideinusa.com"
          target="_blank"
          rel="noreferrer"
          style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 11px", borderRadius: 10, color: "var(--muted)", textDecoration: "none", fontSize: 13, fontWeight: 500, transition: "all .15s" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--card-2)"; e.currentTarget.style.color = "var(--text)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--muted)"; }}
        >
          <Icon name="external" size={16} /> <span style={{ flex: 1 }}>View live site</span>
        </a>
        <button
          onClick={onLogout}
          style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 11px", borderRadius: 10, border: "none", background: "transparent", color: "var(--muted)", fontSize: 13, fontWeight: 500, textAlign: "left", transition: "all .15s" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(248,113,113,0.12)"; e.currentTarget.style.color = "#f87171"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--muted)"; }}
        >
          <Icon name="logout" size={16} /> <span style={{ flex: 1 }}>Sign out</span>
        </button>
      </div>
    </aside>
  );
}

/* ============================================================
   OVERVIEW TAB
   ============================================================ */
function NextInQueueBanner({ topic, onWrite }: { topic?: QueueTopic; onWrite: () => void }) {
  if (!topic) return null;
  return (
    <Card style={{ padding: 20, marginBottom: 22, background: "linear-gradient(100deg, rgba(52,211,153,0.12), rgba(52,211,153,0.03))", border: "1px solid rgba(52,211,153,0.28)", display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
      <div style={{ width: 42, height: 42, borderRadius: 11, flexShrink: 0, background: "rgba(52,211,153,0.16)", border: "1px solid rgba(52,211,153,0.35)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--success)" }}>
        <Icon name="calendar" size={20} color="var(--success)" />
      </div>
      <div style={{ flex: 1, minWidth: 220 }}>
        <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: "var(--success)", marginBottom: 4 }}>Next article in queue · ready for review</div>
        <div style={{ fontSize: 16.5, fontWeight: 600, color: "var(--text)", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {topic.title} <Badge category={topic.category} />
        </div>
      </div>
      <Btn variant="success" onClick={onWrite}>Write custom article <Icon name="arrow" size={15} color="#052e1b" /></Btn>
    </Card>
  );
}

function RecentArticleRow({ a, onView, onDelete }: { a: Article; onView: (a: Article) => void; onDelete: (a: Article) => void }) {
  const [h, setH] = useState(false);
  return (
    <div onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 16px", borderRadius: 12, background: h ? "var(--card-2)" : "transparent", transition: "background .15s" }}>
      <Thumb article={a} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.title}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 5 }}>
          <Badge category={a.category} />
          <span style={{ fontSize: 12, color: "var(--muted-2)", fontFamily: "var(--mono)" }}>{fmtDate(a.date)} · {a.readTime} min</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 7, opacity: h ? 1 : 0.55, transition: "opacity .15s" }}>
        <IconBtn name="eye" title="View" onClick={() => onView(a)} />
        <IconBtn name="trash" title="Delete" danger onClick={() => onDelete(a)} />
      </div>
    </div>
  );
}

function OverviewTab({ store }: { store: Store }) {
  const { articles, counts, loading, queue, setTab, onView, onDelete } = store;
  const recent = articles.slice(0, 5);

  const stats = [
    { label: "Articles", value: counts.articles, icon: "articles", accent: "#6366f1", loading: loading.counts, sub: `${queue.length} in queue` },
    { label: "Visitors this week", value: 0, icon: "traffic", accent: "#34d399", sub: "connect analytics" },
    { label: "Revenue", value: "$0", icon: "revenue", accent: "#fbbf24", sub: "AdSense pending" },
    { label: "Users", value: counts.users, icon: "users", accent: "#8b5cf6", loading: loading.counts, sub: "community members" },
    { label: "Posts", value: counts.posts, icon: "posts", accent: "#3b82f6", loading: loading.counts, sub: "across all groups" },
    { label: "Groups", value: counts.groups, icon: "groups", accent: "#ec4899", loading: loading.counts, sub: "active groups" },
  ];

  return (
    <div className="ygc-fade">
      <PageHeader title="Overview" subtitle="Your site at a glance — content, audience, and community." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 22 }}>
        {stats.map((s, i) => <StatCard key={i} {...s} />)}
      </div>
      <NextInQueueBanner topic={queue[0]} onWrite={() => setTab("generate")} />
      <Card style={{ padding: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 12px 10px" }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Recent articles</h2>
          <Btn variant="ghost" size="sm" onClick={() => setTab("articles")}>View all <Icon name="arrow" size={14} /></Btn>
        </div>
        {loading.articles ? (
          <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            {[0, 1, 2, 3].map((i) => <div key={i} className="ygc-shimmer" style={{ height: 56, borderRadius: 12 }} />)}
          </div>
        ) : recent.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>No articles yet — generate your first one.</div>
        ) : (
          <div>{recent.map((a) => <RecentArticleRow key={a.id} a={a} onView={onView} onDelete={onDelete} />)}</div>
        )}
      </Card>
    </div>
  );
}

/* ============================================================
   TRAFFIC TAB
   ============================================================ */
function TrafficTab({ store }: { store: Store }) {
  const [range, setRange] = useState<"today" | "week" | "month">("week");
  const [traffic, setTraffic] = useState(TRAFFIC);
  const [loading, setLoading] = useState(true);
  const [gaError, setGaError] = useState("");

  useEffect(() => {
    setLoading(true);
    supabase.auth.getSession().then(({ data: sd }) => {
      const token = sd.session?.access_token ?? "";
      return fetch("/api/admin/analytics", {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json());
    })
      .then((data) => {
        if (data.error) { setGaError(data.error); return; }
        setTraffic(data);
      })
      .catch(() => setGaError("Could not reach analytics API."))
      .finally(() => setLoading(false));
  }, []);

  const d = traffic[range];
  const stats = [
    { label: "Visitors", value: loading ? "—" : d.visitors, icon: "traffic", accent: "#6366f1" },
    { label: "Page views", value: loading ? "—" : d.views, icon: "eye", accent: "#34d399" },
    { label: "Bounce rate", value: loading ? "—" : d.bounce, suffix: loading ? "" : "%", icon: "arrow", accent: "#fbbf24" },
    { label: "Avg. time on site", value: loading ? "—" : d.avgTime, icon: "queue", accent: "#8b5cf6" },
  ];
  const sourceColors = ["#6366f1", "#34d399", "#8b5cf6", "#fbbf24", "#f87171", "#38bdf8"];
  return (
    <div className="ygc-fade">
      <PageHeader
        title="Traffic"
        subtitle="Live data from Google Analytics 4."
        actions={
          <div style={{ display: "flex", gap: 4, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: 4 }}>
            {(["today", "week", "month"] as const).map((r) => (
              <button key={r} onClick={() => setRange(r)} style={{ padding: "7px 15px", borderRadius: 7, border: "none", textTransform: "capitalize", background: range === r ? "var(--accent)" : "transparent", color: range === r ? "#fff" : "var(--muted)", fontSize: 13, fontWeight: 600, transition: "all .15s" }}>{r}</button>
            ))}
          </div>
        }
      />
      {gaError && (
        <div style={{ marginBottom: 16, padding: "12px 16px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.22)", color: "#ef4444", fontSize: 13.5 }}>
          <strong>GA4 error:</strong> {gaError}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 18 }}>
        {stats.map((s, i) => <StatCard key={i} {...s} />)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 18, marginBottom: 18 }}>
        <Card style={{ padding: 0 }}>
          <h2 style={{ margin: 0, fontSize: 15.5, fontWeight: 700, padding: "18px 20px 14px", borderBottom: "1px solid var(--border)" }}>Top pages <span style={{ fontSize: 12, fontWeight: 500, color: "var(--muted)" }}>(last 30 days)</span></h2>
          {loading ? (
            <div style={{ padding: 30, color: "var(--muted)", fontSize: 13.5, textAlign: "center" }}>Loading…</div>
          ) : traffic.topPages.length === 0 ? (
            <div style={{ padding: 30, color: "var(--muted)", fontSize: 13.5, textAlign: "center" }}>No data yet — add your Measurement ID to start tracking.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {traffic.topPages.map((p, i) => (
                  <tr key={i} style={{ borderBottom: i < traffic.topPages.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <td style={{ padding: "12px 20px", fontFamily: "var(--mono)", fontSize: 13, color: "var(--accent-2)" }}>{p.url}</td>
                    <td style={{ padding: "12px 20px", textAlign: "right", fontSize: 14, fontWeight: 600 }}>{p.views.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
        <Card style={{ padding: 20 }}>
          <h2 style={{ margin: "0 0 16px", fontSize: 15.5, fontWeight: 700 }}>Traffic sources</h2>
          {loading && <div style={{ color: "var(--muted)", fontSize: 13.5 }}>Loading…</div>}
          {!loading && traffic.sources.length === 0 && <div style={{ color: "var(--muted)", fontSize: 13.5, lineHeight: 1.5 }}>No source data yet.</div>}
          {traffic.sources.map((s, i) => (
            <div key={i} style={{ marginBottom: 15 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
                <span style={{ color: "var(--text)" }}>{s.name}</span>
                <span style={{ color: "var(--muted)", fontFamily: "var(--mono)" }}>{s.pct}%</span>
              </div>
              <div style={{ height: 8, borderRadius: 999, background: "rgba(148,163,184,0.18)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: s.pct + "%", borderRadius: 999, background: sourceColors[i % sourceColors.length], transition: "width .8s ease" }} />
              </div>
            </div>
          ))}
        </Card>
      </div>
      <Card style={{ padding: 20, marginBottom: 18 }}>
        <h2 style={{ margin: "0 0 16px", fontSize: 15.5, fontWeight: 700 }}>Top countries</h2>
        {loading ? (
          <div style={{ color: "var(--muted)", fontSize: 13.5 }}>Loading…</div>
        ) : traffic.countries.length === 0 ? (
          <div style={{ color: "var(--muted)", fontSize: 13.5 }}>Country data will appear once visitors arrive.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
            {traffic.countries.map((c, i) => (
              <div key={i} style={{ padding: 16, borderRadius: 12, background: "var(--card)", border: "1px solid var(--border)", textAlign: "center" }}>
                <div style={{ fontSize: 30 }}>{c.flag}</div>
                <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 8 }}>{c.name}</div>
                <div style={{ fontSize: 19, fontWeight: 700, color: "var(--accent-2)", marginTop: 3 }}>{c.pct}%</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ============================================================
   REVENUE TAB
   ============================================================ */
function RevenueTab() {
  const stats = [
    { label: "AdSense today", icon: "revenue", accent: "#fbbf24" },
    { label: "AdSense this month", icon: "revenue", accent: "#fbbf24" },
    { label: "Affiliate earnings", icon: "link", accent: "#8b5cf6" },
    { label: "Total all time", icon: "revenue", accent: "#34d399" },
  ];
  return (
    <div className="ygc-fade">
      <PageHeader
        title="Revenue"
        subtitle="Earnings will appear after real revenue sources are connected."
        actions={
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 13px", borderRadius: 999, background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.35)", color: "var(--amber)", fontSize: 12.5, fontWeight: 600 }}>
            <span className="ygc-pulse" style={{ width: 7, height: 7, borderRadius: 999, background: "var(--amber)" }} /> AdSense: Pending approval
          </span>
        }
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
        {stats.map((s, i) => <StatCard key={i} {...s} value="$0.00" sub="—" />)}
      </div>
      <Card style={{ padding: 28, textAlign: "center" }}>
        <div style={{ width: 58, height: 58, borderRadius: 16, margin: "0 auto 16px", background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.28)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--amber)" }}>
          <Icon name="revenue" size={25} color="var(--amber)" />
        </div>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>No revenue data yet</h2>
        <p style={{ margin: "8px auto 0", maxWidth: 430, color: "var(--muted)", fontSize: 13.5, lineHeight: 1.6 }}>
          AdSense and affiliate earnings will appear here after you connect real revenue sources.
        </p>
      </Card>
    </div>
  );
}

/* ============================================================
   ARTICLES TAB
   ============================================================ */
function ArticleRow({ a, onView, onDelete }: { a: Article; onView: (a: Article) => void; onDelete: (a: Article) => void }) {
  const [h, setH] = useState(false);
  return (
    <div onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{ display: "flex", alignItems: "center", gap: 15, padding: "13px 14px", borderRadius: 12, background: h ? "var(--card-2)" : "transparent", transition: "background .15s" }}>
      <Thumb article={a} size={52} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.title}</div>
        {a.excerpt && <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 520 }}>{a.excerpt}</div>}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 7 }}>
          <Badge category={a.category} />
          <span style={{ fontSize: 12, color: "var(--muted-2)", fontFamily: "var(--mono)" }}>{fmtDate(a.date)} · {a.readTime} min read{a.views ? ` · ${a.views.toLocaleString()} views` : ""}</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, opacity: h ? 1 : 0.55, transition: "opacity .15s" }}>
        <Btn variant="ghost" size="sm" onClick={() => onView(a)}><Icon name="eye" size={14} /> View</Btn>
        <Btn variant="danger" size="sm" onClick={() => onDelete(a)}><Icon name="trash" size={14} /></Btn>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ padding: "56px 20px", textAlign: "center" }}>
      <div style={{ width: 60, height: 60, borderRadius: 16, margin: "0 auto 18px", background: "var(--card-2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
        <Icon name="articles" size={26} />
      </div>
      <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>No articles yet</h3>
      <p style={{ margin: "8px auto 0", color: "var(--muted)", fontSize: 13.5, maxWidth: 340 }}>Head to the Generate tab to write and publish your first article — it&apos;ll appear here automatically.</p>
    </div>
  );
}

function ArticlesTab({ store }: { store: Store }) {
  const { articles, loading, refresh, onView, onDelete } = store;
  const [filter, setFilter] = useState("All");
  const cats = ["All", ...CATEGORIES.filter((c) => articles.some((a) => a.category === c))];
  const list = filter === "All" ? articles : articles.filter((a) => a.category === filter);
  return (
    <div className="ygc-fade">
      <PageHeader
        title="Articles"
        subtitle={`${articles.length} published ${articles.length === 1 ? "article" : "articles"}`}
        actions={<Btn variant="ghost" onClick={refresh}><Icon name="refresh" size={15} className={loading.articles ? "ygc-spin" : ""} /> Refresh</Btn>}
      />
      {cats.length > 1 && (
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 16 }}>
          {cats.map((c) => (
            <button key={c} onClick={() => setFilter(c)} style={{ padding: "6px 13px", borderRadius: 999, fontSize: 12.5, fontWeight: 600, transition: "all .15s", border: `1px solid ${filter === c ? (c === "All" ? "var(--accent)" : hexToRgba(catColor(c), 0.5)) : "var(--border)"}`, background: filter === c ? (c === "All" ? "var(--accent)" : hexToRgba(catColor(c), 0.16)) : "var(--card)", color: filter === c ? (c === "All" ? "#fff" : catColor(c)) : "var(--muted)" }}>{c}</button>
          ))}
        </div>
      )}
      <Card style={{ padding: 8 }}>
        {loading.articles ? (
          <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 8 }}>
            {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="ygc-shimmer" style={{ height: 64, borderRadius: 12 }} />)}
          </div>
        ) : list.length === 0 ? (
          <EmptyState />
        ) : (
          <div>{list.map((a) => <ArticleRow key={a.id} a={a} onView={onView} onDelete={onDelete} />)}</div>
        )}
      </Card>
    </div>
  );
}

function ArticleViewer({ article, onClose }: { article: Article | null; onClose: () => void }) {
  if (!article) return null;
  const paras = (article.content || article.excerpt || "No content available.").split("\n").filter(Boolean);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 950, background: "rgba(15,23,42,0.34)", backdropFilter: "blur(5px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div onClick={(e) => e.stopPropagation()} className="ygc-fade" style={{ width: 720, maxWidth: "100%", maxHeight: "86vh", overflow: "hidden", display: "flex", flexDirection: "column", background: "var(--bg-2)", border: "1px solid var(--border-2)", borderRadius: 18, boxShadow: "0 36px 90px -28px rgba(15,23,42,0.34)" }}>
        <div style={{ padding: "20px 26px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
          <div>
            <Badge category={article.category} />
            <h2 style={{ margin: "12px 0 0", fontSize: 23, fontWeight: 700, letterSpacing: -0.4, lineHeight: 1.2 }}>{article.title}</h2>
            <div style={{ fontSize: 12.5, color: "var(--muted)", fontFamily: "var(--mono)", marginTop: 8 }}>{fmtDate(article.date)} · {article.readTime} min read</div>
          </div>
          <IconBtn name="close" onClick={onClose} title="Close" />
        </div>
        <div style={{ padding: "22px 26px", overflowY: "auto" }}>
          {paras.map((para, i) => {
            if (para.startsWith("## ")) return <h3 key={i} style={{ fontSize: 17, fontWeight: 700, margin: "20px 0 8px" }}>{para.replace(/^##\s*/, "")}</h3>;
            if (para.startsWith("# ")) return <h2 key={i} style={{ fontSize: 20, fontWeight: 700, margin: "18px 0 8px" }}>{para.replace(/^#\s*/, "")}</h2>;
            if (para.startsWith("- ") || para.startsWith("* ")) return <li key={i} style={{ fontSize: 14.5, color: "var(--muted)", lineHeight: 1.7, marginLeft: 18 }}>{para.replace(/^[-*]\s*/, "")}</li>;
            return <p key={i} style={{ fontSize: 14.5, color: "var(--muted)", lineHeight: 1.75, margin: "0 0 12px" }}>{para.replace(/\*\*(.+?)\*\*/g, "$1")}</p>;
          })}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   QUEUE TAB
   ============================================================ */
function QueueTab({ store }: { store: Store }) {
  const { queue, setQueue, setTab, setPrefillTopic } = store;
  const move = (i: number, dir: number) => {
    setQueue((q) => {
      const next = [...q];
      const j = i + dir;
      if (j < 0 || j >= next.length) return q;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };
  const remove = (i: number) => setQueue((q) => q.filter((_, idx) => idx !== i));
  return (
    <div className="ygc-fade">
      <PageHeader
        title="Queue"
        subtitle={`${queue.length} topics queued for review and publishing`}
        actions={<Btn variant="primary" onClick={() => setTab("generate")}><Icon name="plus" size={15} color="#fff" /> Add custom topic</Btn>}
      />
      {queue[0] && (
        <Card style={{ padding: 18, marginBottom: 18, background: "linear-gradient(100deg, rgba(52,211,153,0.12), rgba(52,211,153,0.03))", border: "1px solid rgba(52,211,153,0.28)", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: "rgba(52,211,153,0.16)", border: "1px solid rgba(52,211,153,0.35)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--success)" }}>
            <Icon name="bolt" size={18} color="var(--success)" />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: "var(--success)", marginBottom: 3 }}>Ready for review today</div>
            <div style={{ fontSize: 15.5, fontWeight: 600 }}>{queue[0].title}</div>
          </div>
          <Badge category={queue[0].category} size="md" />
        </Card>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {queue.map((t, i) => {
          const isNext = i === 0;
          return (
            <Card key={t.title + i} hover style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 14, borderColor: isNext ? "rgba(52,211,153,0.3)" : "var(--border)", background: isNext ? "rgba(52,211,153,0.06)" : "var(--card)" }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--mono)", fontSize: 13, fontWeight: 600, background: isNext ? "var(--success)" : "var(--card-2)", color: isNext ? "#052e1b" : "var(--muted)", border: isNext ? "none" : "1px solid var(--border)" }}>{i + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</div>
                {isNext && <div style={{ fontSize: 11, fontWeight: 700, color: "var(--success)", marginTop: 3, letterSpacing: 0.5 }}>REVIEW NEXT</div>}
              </div>
              <Badge category={t.category} />
              <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                <Btn size="sm" variant="primary" onClick={() => { setPrefillTopic({ title: t.title, category: t.category }); setTab("generate"); }} style={{ fontSize: 12, padding: "4px 10px", height: 28 }}>
                  Write →
                </Btn>
                <IconBtn name="up" title="Move up" onClick={() => move(i, -1)} size={14} />
                <IconBtn name="down" title="Move down" onClick={() => move(i, 1)} size={14} />
                <IconBtn name="close" title="Remove" danger onClick={() => remove(i)} size={14} />
              </div>
            </Card>
          );
        })}
        {queue.length === 0 && (
          <div style={{ padding: "48px 20px", textAlign: "center", color: "var(--muted)" }}>
            Queue is empty. <button onClick={() => setTab("generate")} style={{ color: "var(--accent-2)", background: "none", border: "none", fontWeight: 600, fontSize: 14 }}>Add a topic →</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   GENERATE TAB
   ============================================================ */
const GEN_STEPS = [
  { key: "writing", label: "Claude is writing the article…", icon: "generate" },
  { key: "safety", label: "Adding source and risk notes…", icon: "info" },
  { key: "publish", label: "Publishing to the blog…", icon: "external" },
];

const fieldLabel: React.CSSProperties = { display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--muted)", marginBottom: 8 };
const fieldInput: React.CSSProperties = { width: "100%", padding: "11px 14px", borderRadius: 10, background: "#ffffff", border: "1px solid var(--border-2)", color: "var(--text)", fontSize: 14, outline: "none" };

function LoadingSteps({ active }: { active: number }) {
  return (
    <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 10 }}>
      {GEN_STEPS.map((s, i) => {
        const done = i < active;
        const current = i === active;
        return (
          <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 11, background: current ? "rgba(99,102,241,0.1)" : "transparent", border: `1px solid ${current ? "rgba(99,102,241,0.3)" : "transparent"}`, opacity: done || current ? 1 : 0.4, transition: "all .3s" }}>
            <span style={{ width: 26, height: 26, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: done ? "var(--success)" : current ? "var(--accent)" : "var(--card-2)", color: done ? "#052e1b" : "#fff", flexShrink: 0 }}>
              {done ? <Icon name="check" size={14} color="#052e1b" /> : current ? <Icon name="refresh" size={14} color="#fff" className="ygc-spin" /> : <Icon name={s.icon} size={13} />}
            </span>
            <span style={{ fontSize: 13.5, fontWeight: 500, color: done || current ? "var(--text)" : "var(--muted)" }}>{s.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function GenerateTab({ store }: { store: Store }) {
  const { onPublish, push, prefillTopic, setPrefillTopic } = store;
  const [topic, setTopic] = useState("");
  const [category, setCategory] = useState("Daily Life");
  const [phase, setPhase] = useState<"idle" | "loading" | "preview" | "published" | "error">("idle");
  const [activeStep, setActiveStep] = useState(0);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errMsg, setErrMsg] = useState("");
  const [published, setPublished] = useState<Draft | Article | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [reviewConfirmed, setReviewConfirmed] = useState(false);

  useEffect(() => {
    if (prefillTopic) {
      setTopic(prefillTopic.title);
      setCategory(prefillTopic.category);
      setPhase("idle");
      setDraft(null);
      setPublished(null);
      setPrefillTopic(null);
    }
  }, [prefillTopic]);

  const run = async () => {
    if (!topic.trim()) {
      push("Enter a topic first", "error");
      return;
    }
    setPhase("loading");
    setActiveStep(0);
    setErrMsg("");
    setReviewConfirmed(false);
    const stepTimer = setInterval(() => setActiveStep((s) => Math.min(s + 1, GEN_STEPS.length - 1)), 1800);
    let readyDraft: Draft | null = null;
    try {
      const result = await generateArticle({ topic: topic.trim(), category });
      readyDraft = { ...result, date: new Date() };
      setDraft(readyDraft);
      setActiveStep(GEN_STEPS.length - 1);
      const saved = await onPublish(readyDraft);
      clearInterval(stepTimer);
      setPublished(saved || readyDraft);
      setPhase("published");
    } catch (e: any) {
      clearInterval(stepTimer);
      setErrMsg(
        readyDraft
          ? e.message || "Article was generated, but publishing failed. Check Supabase and try again."
          : e.message || "Generation failed. Check the server API key and try again."
      );
      setPhase("error");
    }
  };

  const publish = async () => {
    if (!draft) return;
    if (!reviewConfirmed) {
      push("Review the sources and risk notes before publishing.", "error");
      return;
    }
    setPublishing(true);
    try {
      const saved = await onPublish(draft);
      setPublished(saved || draft);
      setPhase("published");
    } catch (e: any) {
      push("Saved locally — Supabase insert failed: " + e.message, "error");
      setPublished(draft);
      setPhase("published");
    } finally {
      setPublishing(false);
    }
  };

  const reset = () => {
    setDraft(null);
    setPhase("idle");
    setTopic("");
    setPublished(null);
    setReviewConfirmed(false);
  };

  return (
    <div className="ygc-fade" style={{ maxWidth: 760 }}>
      <PageHeader title="Generate article" subtitle="Describe a topic and it publishes automatically after generation." />
      {(phase === "idle" || phase === "loading" || phase === "error") && (
        <Card style={{ padding: 24 }}>
          <label style={fieldLabel}>Article topic</label>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. How to survive your first winter in the USA as an international student"
            rows={2}
            disabled={phase === "loading"}
            style={{ ...fieldInput, resize: "vertical", lineHeight: 1.5 }}
          />
          <div style={{ marginTop: 16 }}>
            <label style={fieldLabel}>Category</label>
            <div style={{ position: "relative", maxWidth: 300 }}>
              <select value={category} onChange={(e) => setCategory(e.target.value)} disabled={phase === "loading"} style={{ ...fieldInput, appearance: "none", cursor: "pointer", paddingRight: 36 }}>
                {CATEGORIES.map((c) => <option key={c} value={c} style={{ background: "#ffffff", color: "#111827" }}>{c}</option>)}
              </select>
              <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--muted)" }}>▾</span>
            </div>
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: "var(--muted-2)", display: "flex", alignItems: "center", gap: 7 }}>
            <Icon name="lock" size={13} /> Uses the server API key from your deployment environment.
          </div>
          {phase !== "loading" && (
            <Btn variant="gradient" size="lg" onClick={run} style={{ marginTop: 20, width: "100%" }}>
              <Icon name="generate" size={18} color="#fff" /> Generate and publish
            </Btn>
          )}
          {phase === "loading" && <LoadingSteps active={activeStep} />}
          {phase === "error" && <div style={{ marginTop: 18, padding: 14, borderRadius: 11, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", color: "#b91c1c", fontSize: 13, lineHeight: 1.5 }}>{errMsg}</div>}
        </Card>
      )}
      {phase === "preview" && draft && (
        <Card className="ygc-fade" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "10px 18px", background: "rgba(99,102,241,0.1)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 600, color: "var(--accent-2)" }}>
            <Icon name="check" size={15} color="var(--accent-2)" /> Draft ready - fact-check before publishing
          </div>
          <div style={{ padding: 26 }}>
            <Badge category={draft.category} size="md" />
            <h2 style={{ margin: "14px 0 0", fontSize: 25, fontWeight: 700, letterSpacing: -0.5, lineHeight: 1.2 }}>{draft.title}</h2>
            <div style={{ fontSize: 12.5, color: "var(--muted)", fontFamily: "var(--mono)", marginTop: 9 }}>{draft.readTime} min read · ~{(draft.content || "").split(/\s+/).filter(Boolean).length} words</div>
            {draft.excerpt && <p style={{ fontSize: 15, color: "var(--text)", lineHeight: 1.6, marginTop: 16, fontWeight: 500 }}>{draft.excerpt}</p>}
            <div style={{ marginTop: 18, padding: 18, borderRadius: 12, background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.24)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--amber)", fontSize: 12.5, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 12 }}>
                <Icon name="info" size={15} color="var(--amber)" /> Review gate
              </div>
              <div style={{ display: "grid", gap: 14 }}>
                {(draft.trafficAngle || draft.searchIntent) && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
                    {draft.trafficAngle && (
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>Traffic angle</div>
                        <div style={{ fontSize: 13, lineHeight: 1.55, color: "var(--muted)" }}>{draft.trafficAngle}</div>
                      </div>
                    )}
                    {draft.searchIntent && (
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>Search intent</div>
                        <div style={{ fontSize: 13, lineHeight: 1.55, color: "var(--muted)" }}>{draft.searchIntent}</div>
                      </div>
                    )}
                  </div>
                )}
                {!!draft.reviewChecklist?.length && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 7 }}>Before publishing</div>
                    <div style={{ display: "grid", gap: 6 }}>
                      {draft.reviewChecklist.map((item, i) => (
                        <div key={`${item}-${i}`} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
                          <span style={{ width: 18, height: 18, borderRadius: 6, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.25)", color: "var(--amber)", fontSize: 11, fontWeight: 800 }}>{i + 1}</span>
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {!!draft.sourcesToVerify?.length && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 7 }}>Sources to verify</div>
                    <div style={{ display: "grid", gap: 7 }}>
                      {draft.sourcesToVerify.map((source, i) => (
                        <div key={`${source.label}-${i}`} style={{ padding: "9px 10px", borderRadius: 10, background: "rgba(79,70,229,0.04)", border: "1px solid var(--border)" }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
                            {source.url ? <a href={source.url} target="_blank" rel="noreferrer" style={{ color: "var(--accent-2)", textDecoration: "none" }}>{source.label}</a> : source.label}
                          </div>
                          {source.why && <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.45, marginTop: 3 }}>{source.why}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {!!draft.riskNotes?.length && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 7 }}>Risk notes</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                      {draft.riskNotes.map((note, i) => (
                        <span key={`${note}-${i}`} style={{ padding: "6px 9px", borderRadius: 999, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", color: "#b91c1c", fontSize: 12, fontWeight: 600 }}>{note}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div style={{ marginTop: 14, padding: 18, borderRadius: 12, background: "#f8fafc", border: "1px solid var(--border)", maxHeight: 280, overflow: "hidden", position: "relative" }}>
              <div style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{(draft.content || "").replace(/[#*`]/g, "").slice(0, 600)}…</div>
              <div style={{ position: "absolute", inset: "auto 0 0 0", height: 70, background: "linear-gradient(transparent, var(--card))" }} />
            </div>
          </div>
          <div style={{ padding: "16px 26px", borderTop: "1px solid var(--border)", display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 260, flex: "1 1 360px", color: "var(--muted)", fontSize: 13.5, lineHeight: 1.45 }}>
              <input
                type="checkbox"
                checked={reviewConfirmed}
                onChange={(e) => setReviewConfirmed(e.target.checked)}
                style={{ width: 17, height: 17, accentColor: "var(--success)" }}
              />
              I reviewed sources, dates, risky claims, and the article is ready to publish.
            </label>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Btn variant="ghost" onClick={reset}>Discard</Btn>
              <Btn variant="success" onClick={publish} disabled={publishing || !reviewConfirmed}>
                {publishing ? <><Icon name="refresh" size={15} color="#052e1b" className="ygc-spin" /> Publishing…</> : <><Icon name="external" size={15} color="#052e1b" /> Publish to blog</>}
              </Btn>
            </div>
          </div>
        </Card>
      )}
      {phase === "published" && published && (
        <Card className="ygc-fade" style={{ padding: 36, textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, margin: "0 auto 18px", background: "rgba(52,211,153,0.14)", border: "1px solid rgba(52,211,153,0.4)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--success)" }}>
            <Icon name="check" size={30} color="var(--success)" />
          </div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Published!</h2>
          <p style={{ margin: "8px auto 0", color: "var(--muted)", fontSize: 14, maxWidth: 380 }}>&quot;<strong style={{ color: "var(--text)" }}>{published.title}</strong>&quot; is now live on your blog and added to your articles.</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 22 }}>
            <a href={`/blog/${published.slug || ""}`} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
              <Btn variant="primary"><Icon name="external" size={15} color="#fff" /> View article</Btn>
            </a>
            <Btn variant="ghost" onClick={reset}><Icon name="plus" size={15} /> Write another</Btn>
          </div>
        </Card>
      )}
    </div>
  );
}

/* ============================================================
   COMMUNITY TAB
   ============================================================ */
const EMPTY_COMMUNITY_DATA: AdminCommunityData = {
  groups: [],
  members: [],
  messages: [],
  moderators: [],
  channelMessages: [],
};

function cleanEmail(value: string) {
  return String(value || "").trim().toLowerCase();
}

function groupInitials(group: AdminCommunityGroup) {
  return (group.name || "Group")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function memberName(member: AdminCommunityMember) {
  return member.display_name || member.user_id || "Member";
}

function fmtTime(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function CommunityGroupAvatar({ group }: { group: AdminCommunityGroup }) {
  const color = group.type === "City" ? "#14b8a6" : group.type === "Custom" ? "#ec4899" : "#6366f1";
  return (
    <span style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, background: hexToRgba(color, 0.14), border: `1px solid ${hexToRgba(color, 0.28)}`, color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13 }}>
      {groupInitials(group)}
    </span>
  );
}

function MiniRedDot({ show }: { show: boolean }) {
  if (!show) return null;
  return <span title="New official update" style={{ width: 8, height: 8, borderRadius: 999, background: "#dc2626", boxShadow: "0 0 0 3px #fee2e2", flex: "0 0 auto" }} />;
}

function MemberAvatar({ name, isAdmin }: { name: string; isAdmin?: boolean }) {
  const initials = name.trim().split(/\s+/).map((w) => w[0] || "").join("").slice(0, 2).toUpperCase() || "?";
  return (
    <span style={{
      width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
      background: isAdmin ? "rgba(99,102,241,0.15)" : "var(--card-2)",
      color: isAdmin ? "var(--accent)" : "var(--muted)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 800, fontSize: 13, border: `2px solid ${isAdmin ? "rgba(99,102,241,0.3)" : "var(--border)"}`,
    }}>{initials}</span>
  );
}

function ChannelBadge({ channel }: { channel: string }) {
  const isAnnouncement = channel === "announcements";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      background: isAnnouncement ? "rgba(245,158,11,0.12)" : "rgba(99,102,241,0.1)",
      color: isAnnouncement ? "#b45309" : "var(--accent)",
      border: `1px solid ${isAnnouncement ? "rgba(245,158,11,0.25)" : "rgba(99,102,241,0.25)"}`,
      borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 750, letterSpacing: 0.3,
    }}>
      {isAnnouncement ? "📢 Announcements" : "# General"}
    </span>
  );
}

function CommunityTab({ store }: { store: Store }) {
  const { counts, loading, push } = store;
  const [data, setData] = useState<AdminCommunityData>(EMPTY_COMMUNITY_DATA);
  const [communityLoading, setCommunityLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [selectedChannel, setSelectedChannel] = useState<"general" | "announcements">("general");
  const [channelDraft, setChannelDraft] = useState("");
  const [authorName, setAuthorName] = useState("Admin");
  const [announcementGroupId, setAnnouncementGroupId] = useState("");
  const [emailDraft, setEmailDraft] = useState("");
  const [busy, setBusy] = useState("");
  const [groupTab, setGroupTab] = useState<"messages" | "members">("messages");
  const [editingChannelMsgId, setEditingChannelMsgId] = useState<string | null>(null);
  const [editingChannelDraft, setEditingChannelDraft] = useState("");

  const loadCommunity = useCallback(async () => {
    setCommunityLoading(true);
    try {
      const nextData = await fetchAdminCommunity();
      setData({
        groups: Array.isArray(nextData.groups) ? nextData.groups : [],
        members: Array.isArray(nextData.members) ? nextData.members : [],
        messages: Array.isArray(nextData.messages) ? nextData.messages : [],
        moderators: Array.isArray(nextData.moderators) ? nextData.moderators : [],
        channelMessages: Array.isArray(nextData.channelMessages) ? nextData.channelMessages : [],
      });
    } catch (error: any) {
      push(error?.message || "Could not load community admin data", "error");
      setData(EMPTY_COMMUNITY_DATA);
    } finally {
      setCommunityLoading(false);
    }
  }, [push]);

  useEffect(() => { loadCommunity(); }, [loadCommunity]);

  useEffect(() => {
    if (!selectedGroupId && data.groups.length) setSelectedGroupId(data.groups[0].id);
    if (selectedGroupId && !data.groups.some((g) => g.id === selectedGroupId)) {
      setSelectedGroupId(data.groups[0]?.id || "");
    }
  }, [data.groups, selectedGroupId]);

  const filteredGroups = useMemo(() => {
    const clean = query.trim().toLowerCase();
    const groups = [...data.groups].sort((a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" }));
    if (!clean) return groups;
    return groups.filter((g) => `${g.name} ${g.location || ""} ${g.type || ""}`.toLowerCase().includes(clean));
  }, [data.groups, query]);

  const selectedGroup = data.groups.find((g) => g.id === selectedGroupId) || filteredGroups[0] || null;
  const selectedGroupMessages = selectedGroup ? data.messages.filter((m) => m.group_id === selectedGroup.id) : [];
  const selectedGroupMembers = selectedGroup ? data.members.filter((m) => m.group_id === selectedGroup.id) : [];
  const activeChannelMessages = [...data.channelMessages]
    .filter((m) => {
      if (m.channel !== selectedChannel) return false;
      if (selectedChannel === "announcements") {
        const gid = (m as any).group_id || "";
        if (announcementGroupId) return gid === announcementGroupId;
        return !gid;
      }
      return true;
    })
    .reverse();

  async function runAction(label: string, body: Record<string, any>, success: string) {
    setBusy(label);
    try {
      await adminCommunityAction(body);
      push(success, "success");
      await loadCommunity();
    } catch (error: any) {
      push(error?.message || "Action failed", "error");
    } finally {
      setBusy("");
    }
  }

  async function sendChannelMessage() {
    const body = channelDraft.trim();
    if (!body) { push("Write a message before posting", "error"); return; }
    setChannelDraft("");
    await runAction("send-channel", {
      action: "send_channel",
      channel: selectedChannel,
      body,
      author_name: authorName.trim() || "Admin",
      group_id: selectedChannel === "announcements" ? (announcementGroupId || undefined) : undefined,
    }, `Posted to ${selectedChannel === "general" ? "General" : "Announcements"}`);
  }

  async function deleteChannelMessage(message: AdminChannelMessage) {
    if (!window.confirm("Delete this channel message?")) return;
    await runAction("del-ch-msg", { action: "delete_channel_message", id: message.id }, "Channel message deleted");
  }

  function beginEditChannelMsg(message: AdminChannelMessage) {
    setEditingChannelMsgId(message.id);
    setEditingChannelDraft(message.body);
  }

  function cancelEditChannelMsg() {
    setEditingChannelMsgId(null);
    setEditingChannelDraft("");
  }

  async function saveEditChannelMsg(message: AdminChannelMessage) {
    const text = editingChannelDraft.trim();
    if (!text) { push("Message cannot be empty", "error"); return; }
    cancelEditChannelMsg();
    await runAction("upd-ch-msg", { action: "update_channel_message", id: message.id, body: text }, "Message updated");
  }

  async function addModeratorEmail() {
    const email = cleanEmail(emailDraft);
    if (!email || !email.includes("@")) { push("Enter a valid email", "error"); return; }
    setEmailDraft("");
    await runAction("add-moderator", { action: "add_moderator", email }, "Moderator added");
  }

  async function removeModeratorEmail(email: string) {
    if (!window.confirm(`Remove moderator access for ${email}?`)) return;
    await runAction("remove-moderator", { action: "remove_moderator", email }, "Moderator removed");
  }

  async function deleteMessage(message: AdminCommunityMessage) {
    if (!window.confirm("Delete this group message?")) return;
    await runAction("delete-message", { action: "delete_message", id: message.id }, "Message deleted");
  }

  async function setMemberRole(member: AdminCommunityMember, role: "member" | "admin") {
    await runAction(`${member.user_id}:${role}`, { action: "set_member_role", group_id: member.group_id, user_id: member.user_id, role }, role === "admin" ? "Promoted to admin" : "Reverted to member");
  }

  async function removeMember(member: AdminCommunityMember) {
    if (!selectedGroup || !window.confirm(`Remove ${memberName(member)} from ${selectedGroup.name}?`)) return;
    await runAction(`${member.user_id}:remove`, { action: "remove_member", group_id: member.group_id, user_id: member.user_id }, "Member removed");
  }

  const sectionLabel: React.CSSProperties = { fontSize: 11, fontWeight: 750, letterSpacing: 0.8, textTransform: "uppercase" as const, color: "var(--muted)", marginBottom: 10 };
  const emptyBox: React.CSSProperties = { color: "var(--muted)", fontSize: 13, padding: "28px 0", textAlign: "center" as const, border: "1.5px dashed var(--border)", borderRadius: 14 };

  return (
    <div className="ygc-fade">
      <PageHeader
        title="Community"
        subtitle="Broadcast to official channels, manage groups, members and moderator access."
        actions={<Btn variant="ghost" onClick={loadCommunity}><Icon name="refresh" size={15} className={communityLoading ? "ygc-spin" : ""} /> Refresh</Btn>}
      />

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 26 }}>
        <StatCard label="Members" value={data.members.length || counts.users} icon="users" accent="#8b5cf6" loading={communityLoading && loading.counts} sub="across all groups" />
        <StatCard label="Group posts" value={data.messages.length || counts.posts} icon="posts" accent="#3b82f6" loading={communityLoading && loading.counts} sub="in group chats" />
        <StatCard label="Groups" value={data.groups.length || counts.groups} icon="groups" accent="#ec4899" loading={communityLoading && loading.counts} sub="total community groups" />
      </div>

      {/* Main flex row: [channels 350px] [groups 290px] [detail flex-1] */}
      <div style={{ display: "flex", gap: 18, alignItems: "stretch", marginBottom: 18 }}>

        {/* ── Official Channels ── */}
        <Card style={{ padding: 0, overflow: "hidden", width: 350, flexShrink: 0, display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "16px 18px 14px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", marginBottom: 2 }}>Official Channels</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>Broadcast to General or Announcements</div>
            </div>

            {/* Channel tabs */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "1px solid var(--border)" }}>
              {(["general", "announcements"] as const).map((ch) => {
                const active = selectedChannel === ch;
                return (
                  <button key={ch} onClick={() => setSelectedChannel(ch)} style={{
                    border: "none", borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
                    background: active ? "var(--card-2)" : "transparent",
                    color: active ? "var(--accent)" : "var(--muted)", padding: "10px 0",
                    fontWeight: 750, fontSize: 13, cursor: "pointer", transition: "all .15s",
                  }}>
                    {ch === "general" ? "# General" : "📢 Announcements"}
                  </button>
                );
              })}
            </div>

            {/* Compose */}
            <div style={{ padding: "14px 16px" }}>
              <input
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Your name (e.g. Admin)"
                style={{ ...fieldInput, height: 36, padding: "0 11px", fontSize: 13, marginBottom: 8 }}
              />
              {selectedChannel === "announcements" && (
                <select
                  value={announcementGroupId}
                  onChange={(e) => setAnnouncementGroupId(e.target.value)}
                  style={{ ...fieldInput, height: 36, padding: "0 11px", fontSize: 13, marginBottom: 8 }}
                >
                  <option value="">Global (all groups)</option>
                  {data.groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}{g.location ? ` — ${g.location}` : ""}</option>
                  ))}
                </select>
              )}
              <textarea
                value={channelDraft}
                onChange={(e) => setChannelDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) sendChannelMessage(); }}
                placeholder={`Write a ${selectedChannel} message… (⌘↵ to send)`}
                rows={3}
                style={{ ...fieldInput, resize: "vertical", lineHeight: 1.5, minHeight: 78, fontSize: 13.5 }}
              />
              <Btn variant="primary" onClick={sendChannelMessage} disabled={busy === "send-channel" || !channelDraft.trim()} style={{ marginTop: 8, width: "100%" }}>
                <Icon name={busy === "send-channel" ? "refresh" : "posts"} size={14} color="#fff" className={busy === "send-channel" ? "ygc-spin" : ""} />
                {busy === "send-channel" ? "Posting…" : "Post message"}
              </Btn>
            </div>

            {/* Channel message list */}
            <div style={{ borderTop: "1px solid var(--border)", maxHeight: 360, overflowY: "auto" }}>
              {activeChannelMessages.length === 0 && (
                <div style={{ color: "var(--muted)", fontSize: 13, padding: "20px 18px", textAlign: "center" }}>No messages yet in {selectedChannel}.</div>
              )}
              {activeChannelMessages.map((msg) => {
                const editing = editingChannelMsgId === msg.id;
                return (
                  <div key={msg.id} style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <MemberAvatar name={msg.author_name || "Admin"} isAdmin />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 13, fontWeight: 750, color: "var(--text)" }}>{msg.author_name || "Admin"}</span>
                        <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{fmtTime(msg.created_at)}</span>
                        {selectedChannel === "announcements" && msg.group_id && (
                          <span style={{ fontSize: 11, fontWeight: 700, background: "rgba(245,158,11,0.1)", color: "#b45309", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 5, padding: "1px 6px" }}>
                            {data.groups.find((g) => g.id === msg.group_id)?.name || "Group"}
                          </span>
                        )}
                        {selectedChannel === "announcements" && !msg.group_id && (
                          <span style={{ fontSize: 11, fontWeight: 700, background: "rgba(99,102,241,0.08)", color: "var(--accent)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 5, padding: "1px 6px" }}>Global</span>
                        )}
                      </div>
                      {editing ? (
                        <div style={{ display: "grid", gap: 7 }}>
                          <textarea
                            autoFocus
                            value={editingChannelDraft}
                            onChange={(e) => setEditingChannelDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) saveEditChannelMsg(msg);
                              if (e.key === "Escape") cancelEditChannelMsg();
                            }}
                            rows={3}
                            style={{ ...fieldInput, resize: "vertical", lineHeight: 1.45, fontSize: 13.5 }}
                          />
                          <div style={{ display: "flex", gap: 7 }}>
                            <Btn size="sm" variant="primary" disabled={busy === "upd-ch-msg"} onClick={() => saveEditChannelMsg(msg)}>
                              <Icon name={busy === "upd-ch-msg" ? "refresh" : "check"} size={12} color="#fff" className={busy === "upd-ch-msg" ? "ygc-spin" : ""} /> Save
                            </Btn>
                            <Btn size="sm" variant="ghost" onClick={cancelEditChannelMsg}>Cancel</Btn>
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontSize: 13.5, color: "var(--muted-2)", lineHeight: 1.55, wordBreak: "break-word" }}>{msg.body}</div>
                      )}
                    </div>
                    {!editing && (
                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                        <button onClick={() => beginEditChannelMsg(msg)} title="Edit message" style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid transparent", background: "transparent", color: "var(--muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s" }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(99,102,241,0.08)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--accent)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(99,102,241,0.2)"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "transparent"; }}
                        >
                          <Icon name="edit" size={13} />
                        </button>
                        <button onClick={() => deleteChannelMessage(msg)} title="Delete message" style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid transparent", background: "transparent", color: "var(--muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s" }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.08)"; (e.currentTarget as HTMLButtonElement).style.color = "#ef4444"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(239,68,68,0.2)"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "transparent"; }}
                        >
                          <Icon name="trash" size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

        {/* ── Groups browser ── */}
        <Card style={{ padding: 0, overflow: "hidden", width: 290, flexShrink: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800 }}>All Groups</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 1 }}>{data.groups.length} total groups</div>
            </div>
          </div>
          <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, city, or type…" style={{ ...fieldInput, height: 38, padding: "0 12px", fontSize: 13 }} />
          </div>
          <div style={{ maxHeight: 680, overflowY: "auto" }}>
            {filteredGroups.map((group) => {
              const active = selectedGroup?.id === group.id;
              const mCount = data.members.filter((m) => m.group_id === group.id).length || group.member_count || 0;
              const msgCount = data.messages.filter((m) => m.group_id === group.id).length;
              return (
                <button key={group.id} onClick={() => { setSelectedGroupId(group.id); setGroupTab("messages"); }} style={{
                  width: "100%", border: "none", borderBottom: "1px solid var(--border)",
                  background: active ? "rgba(99,102,241,0.07)" : "transparent",
                  borderLeft: active ? "3px solid var(--accent)" : "3px solid transparent",
                  padding: "11px 14px", display: "flex", alignItems: "center", gap: 10, textAlign: "left", cursor: "pointer",
                }}>
                  <CommunityGroupAvatar group={group} />
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ display: "block", fontSize: 13.5, fontWeight: 750, color: active ? "var(--accent)" : "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{group.name}</span>
                    <span style={{ display: "block", marginTop: 2, color: "var(--muted)", fontSize: 12 }}>{group.location || group.type || "Community"}</span>
                  </span>
                  <span style={{ display: "flex", flexDirection: "column" as const, alignItems: "flex-end", gap: 3, flexShrink: 0 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 750, color: "var(--muted)" }}>{mCount} member{mCount !== 1 ? "s" : ""}</span>
                    {msgCount > 0 && <span style={{ fontSize: 11, background: "rgba(99,102,241,0.1)", color: "var(--accent)", borderRadius: 5, padding: "1px 6px", fontWeight: 700 }}>{msgCount} msg{msgCount !== 1 ? "s" : ""}</span>}
                  </span>
                </button>
              );
            })}
            {!filteredGroups.length && <div style={{ color: "var(--muted)", padding: "28px 16px", textAlign: "center", fontSize: 13 }}>No groups match your search.</div>}
          </div>
        </Card>

        {/* ── Group detail panel ── */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>
          {selectedGroup ? (
            <>
              {/* Group header */}
              <Card style={{ padding: 18 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <CommunityGroupAvatar group={selectedGroup} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 17, fontWeight: 800, color: "var(--text)", letterSpacing: -0.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedGroup.name}</div>
                    <div style={{ color: "var(--muted)", fontSize: 12.5, marginTop: 3 }}>{selectedGroup.location || selectedGroup.type || "Community group"}</div>
                    <div style={{ display: "flex", gap: 14, marginTop: 10 }}>
                      {[
                        { label: "Messages", value: selectedGroupMessages.length, color: "#3b82f6" },
                        { label: "Members", value: selectedGroupMembers.length, color: "#8b5cf6" },
                        { label: "Type", value: selectedGroup.type || "Group", color: "#10b981" },
                      ].map((stat) => (
                        <div key={stat.label} style={{ textAlign: "center" as const }}>
                          <div style={{ fontSize: 18, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>{stat.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <a href={`/community/${encodeURIComponent(selectedGroup.id)}`} target="_blank" rel="noreferrer" style={{ textDecoration: "none", flexShrink: 0 }}>
                    <Btn variant="ghost" size="sm"><Icon name="external" size={13} /> Open</Btn>
                  </a>
                </div>
              </Card>

              {/* Messages / Members tabs */}
              <Card style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "1px solid var(--border)" }}>
                  {(["messages", "members"] as const).map((tab) => {
                    const active = groupTab === tab;
                    const count = tab === "messages" ? selectedGroupMessages.length : selectedGroupMembers.length;
                    return (
                      <button key={tab} onClick={() => setGroupTab(tab)} style={{
                        border: "none", borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
                        background: active ? "var(--card-2)" : "transparent",
                        color: active ? "var(--accent)" : "var(--muted)",
                        padding: "11px 0", fontWeight: 750, fontSize: 13.5, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                      }}>
                        {tab === "messages" ? "Messages" : "Members"}
                        <span style={{ background: active ? "var(--accent)" : "var(--border)", color: active ? "#fff" : "var(--muted)", borderRadius: 20, padding: "1px 7px", fontSize: 11, fontWeight: 800 }}>{count}</span>
                      </button>
                    );
                  })}
                </div>

                <div style={{ maxHeight: 520, overflowY: "auto" }}>
                  {/* Messages tab */}
                  {groupTab === "messages" && (
                    <>
                      {selectedGroupMessages.length === 0 && <div style={emptyBox}>No messages in this group yet.</div>}
                      {selectedGroupMessages.map((msg) => (
                        <div key={msg.id} style={{ padding: "13px 16px", borderBottom: "1px solid var(--border)", display: "flex", gap: 10, alignItems: "flex-start" }}>
                          <MemberAvatar name={msg.author_name || "Member"} />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexWrap: "wrap" }}>
                              <span style={{ fontSize: 13.5, fontWeight: 750, color: "var(--text)" }}>{msg.author_name || "Member"}</span>
                              <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{fmtTime(msg.created_at)}</span>
                              {msg.message_type && msg.message_type !== "text" && (
                                <span style={{ fontSize: 11, background: "var(--card-2)", border: "1px solid var(--border)", color: "var(--muted)", borderRadius: 5, padding: "1px 6px" }}>{msg.message_type}</span>
                              )}
                            </div>
                            {msg.media_url && <img src={msg.media_url} alt={msg.file_name || "media"} style={{ width: "100%", maxHeight: 180, objectFit: "cover", borderRadius: 9, marginBottom: 6, border: "1px solid var(--border)" }} />}
                            {msg.body && <div style={{ fontSize: 13.5, color: "var(--muted-2)", lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{msg.body}</div>}
                            {!msg.body && msg.media_url && <div style={{ fontSize: 12.5, color: "var(--muted)", fontStyle: "italic" }}>Image shared</div>}
                          </div>
                          <button onClick={() => deleteMessage(msg)} title="Delete message" style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 7, border: "1px solid rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.07)", color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s" }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.18)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(239,68,68,0.4)"; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.07)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(239,68,68,0.25)"; }}
                          >
                            <Icon name="trash" size={13} />
                          </button>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Members tab */}
                  {groupTab === "members" && (
                    <>
                      {selectedGroupMembers.length === 0 && <div style={emptyBox}>No members in this group yet.</div>}
                      {selectedGroupMembers.map((member) => {
                        const isAdmin = member.role === "admin";
                        const actionBusy = busy.startsWith(`${member.user_id}:`);
                        return (
                          <div key={`${member.group_id}:${member.user_id}`} style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
                            <MemberAvatar name={memberName(member)} isAdmin={isAdmin} />
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontSize: 13.5, fontWeight: 750, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{memberName(member)}</div>
                              <span style={{
                                display: "inline-block", marginTop: 3,
                                fontSize: 11, fontWeight: 750, padding: "2px 7px", borderRadius: 5,
                                background: isAdmin ? "rgba(99,102,241,0.12)" : "var(--card-2)",
                                color: isAdmin ? "var(--accent)" : "var(--muted)",
                                border: `1px solid ${isAdmin ? "rgba(99,102,241,0.25)" : "var(--border)"}`,
                              }}>{isAdmin ? "Admin" : "Member"}</span>
                            </div>
                            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                              <Btn size="sm" variant="ghost" disabled={actionBusy} onClick={() => setMemberRole(member, isAdmin ? "member" : "admin")} style={{ fontSize: 12 }}>
                                <Icon name={actionBusy ? "refresh" : "check"} size={12} className={actionBusy ? "ygc-spin" : ""} />
                                {isAdmin ? "Demote" : "Make admin"}
                              </Btn>
                              <Btn size="sm" variant="danger" disabled={actionBusy} onClick={() => removeMember(member)} style={{ fontSize: 12 }}>
                                <Icon name="trash" size={12} /> Remove
                              </Btn>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              </Card>
            </>
          ) : (
            <Card style={{ padding: 40, textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>👈</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>Select a group</div>
              <div style={{ fontSize: 13, color: "var(--muted)" }}>Click any group from the list to moderate its messages and members.</div>
            </Card>
          )}
        </div>
      </div>{/* end main flex row */}

      {/* ── Moderator Access ── */}
      <Card style={{ padding: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <span style={{ width: 38, height: 38, borderRadius: 11, background: "rgba(99,102,241,0.12)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon name="users" size={18} />
          </span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>Moderator Access</div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>Users who log in with these emails get moderator access to every group.</div>
          </div>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); addModeratorEmail(); }} style={{ display: "flex", gap: 10, maxWidth: 560, marginBottom: 14 }}>
          <input value={emailDraft} onChange={(e) => setEmailDraft(e.target.value)} placeholder="email@domain.com" style={{ ...fieldInput, flex: 1, height: 42, padding: "0 13px", fontSize: 14 }} />
          <Btn type="submit" variant="primary" disabled={busy === "add-moderator"} style={{ flexShrink: 0, height: 42, padding: "0 22px" }}>Add</Btn>
        </form>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 560 }}>
          {data.moderators.filter((m) => m.enabled !== false).map((mod) => (
            <div key={mod.email} style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--card-2)", border: "1px solid var(--border)", borderRadius: 11, padding: "11px 14px" }}>
              <span style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(99,102,241,0.12)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon name="users" size={15} />
              </span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mod.email}</span>
              <button onClick={() => removeModeratorEmail(mod.email)} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "transparent", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 9, padding: "6px 12px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.06)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
              >
                <Icon name="close" size={13} /> Remove
              </button>
            </div>
          ))}
          {!data.moderators.length && <div style={{ color: "var(--muted)", fontSize: 13 }}>No moderator emails added yet.</div>}
        </div>
      </Card>
    </div>
  );
}

/* ============================================================
   ROOT PAGE
   ============================================================ */
export default function AdminPage() {
  const [tab, setTab] = useState("overview");
  const [authStatus, setAuthStatus] = useState<"checking" | "login" | "twoStep" | "ready" | "denied">("checking");
  const [authError, setAuthError] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginShowPw, setLoginShowPw] = useState(false);
  const [loginForgot, setLoginForgot] = useState(false);
  const [loginResetSent, setLoginResetSent] = useState(false);
  const [twoStepCode, setTwoStepCode] = useState("");
  const [twoStepLoading, setTwoStepLoading] = useState(false);
  const [twoStepError, setTwoStepError] = useState("");

  const [articles, setArticles] = useState<Article[]>([]);
  const [counts, setCounts] = useState<Counts>(EMPTY_COUNTS);
  const [loading, setLoading] = useState({ articles: true, counts: true });
  const [queue, setQueue] = useState<QueueTopic[]>(QUEUE_TOPICS);
  const [prefillTopic, setPrefillTopic] = useState<{ title: string; category: string } | null>(null);

  const { push, node: toastNode } = useToasts();
  const [viewing, setViewing] = useState<Article | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Article | null>(null);

  useEffect(() => {
    let active = true;

    async function verifyAdminAccess() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setAuthStatus("login");
        return;
      }

      try {
        const session = await fetchAdminSession();
        if (!active) return;
        setAdminEmail(session.user.email);
        if (!session.twoStep?.configured) {
          setAuthError("Admin two-step authentication is not configured. Set ADMIN_TOTP_SECRET first.");
          setAuthStatus("denied");
          return;
        }
        setAuthStatus(session.twoStep.verified ? "ready" : "twoStep");
      } catch (error: any) {
        if (!active) return;
        if (error?.status === 401 || error?.status === 403) {
          setAuthError(error?.message || "This account does not have admin access.");
          setAuthStatus("denied");
          return;
        }
        setAuthError(error?.message || "Admin access is required for this page.");
        setAuthStatus("denied");
      }
    }

    verifyAdminAccess();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) setAuthStatus("login");
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const loadAdminData = useCallback(async () => {
    setLoading({ articles: true, counts: true });
    try {
      const data = await fetchAdminContent();
      setArticles(data.articles.map((r, i) => normalizeArticle(r, i)));
      setCounts(data.counts);
    } catch (error: any) {
      if (error?.status === 401) {
        setAuthStatus("login");
        return;
      }
      if (error?.status === 403) {
        setAuthError(error?.message || "Admin access is required for this page.");
        setAuthStatus("denied");
        return;
      }
      if (error?.status === 428) {
        setAuthStatus("twoStep");
        return;
      }
      setArticles([]);
      setCounts(EMPTY_COUNTS);
    } finally {
      setLoading({ articles: false, counts: false });
    }
  }, []);

  useEffect(() => {
    if (authStatus === "ready") loadAdminData();
  }, [authStatus, loadAdminData]);

  const onView = useCallback((a: Article) => setViewing(a), []);
  const onDelete = useCallback((a: Article) => setPendingDelete(a), []);

  const confirmDelete = useCallback(async () => {
    const a = pendingDelete;
    setPendingDelete(null);
    if (!a) return;
    setArticles((arr) => arr.filter((x) => x.id !== a.id));
    const idStr = String(a.id);
    if (idStr.indexOf("local-") !== 0) {
      try {
        await deleteAdminArticle(a.id);
        push("Article deleted", "success");
      } catch (e: any) {
        push("Delete failed on server: " + e.message, "error");
      }
    } else {
      push("Article removed", "success");
    }
    setCounts((c) => ({ ...c, articles: Math.max(0, c.articles - 1) }));
  }, [pendingDelete, push]);

  const onPublish = useCallback(
    async (draft: Draft): Promise<Article> => {
      const row = await insertAdminArticle({
        title: draft.title,
        category: draft.category,
        excerpt: draft.excerpt,
        content: draft.content,
        slug: draft.slug,
        read_time: draft.readTime,
      });
      if (!row) throw new Error("Supabase did not return the published article.");
      const saved = normalizeArticle(row);
      push("Published to Supabase", "success");
      setArticles((arr) => [saved, ...arr]);
      setCounts((c) => ({ ...c, articles: c.articles + 1 }));
      return saved;
    },
    [push]
  );

  const submitTwoStep = useCallback(async () => {
    const code = twoStepCode.replace(/\D/g, "");
    if (code.length !== 6) {
      setTwoStepError("Enter the 6-digit code from your authenticator app.");
      return;
    }

    setTwoStepLoading(true);
    setTwoStepError("");
    try {
      await verifyAdminTwoStep(code);
      setTwoStepCode("");
      setAuthStatus("ready");
      push("Admin two-step verified", "success");
    } catch (error: any) {
      setTwoStepError(error?.message || "Invalid two-step code.");
    } finally {
      setTwoStepLoading(false);
    }
  }, [push, twoStepCode]);

  const logout = useCallback(async () => {
    await adminApi("/api/admin/2fa", { method: "DELETE" }).catch(() => null);
    await supabase.auth.signOut();
    window.location.href = "/";
  }, []);

  const store: Store = {
    articles,
    counts,
    loading,
    queue,
    setQueue,
    setTab,
    onView,
    onDelete,
    onPublish,
    push,
    refresh: () => {
      loadAdminData();
    },
    prefillTopic,
    setPrefillTopic,
  };

  const sidebarCounts = { articles: counts.articles, queue: queue.length };

  const TABS: Record<string, React.ComponentType<{ store: Store }>> = {
    overview: OverviewTab,
    traffic: TrafficTab,
    revenue: RevenueTab,
    articles: ArticlesTab,
    queue: QueueTab,
    generate: GenerateTab,
    community: CommunityTab,
  };
  const Current = TABS[tab] || OverviewTab;

  if (authStatus === "login") {
    const jakartaSans = "'Plus Jakarta Sans', -apple-system, system-ui, sans-serif";
    const inputStyle: React.CSSProperties = {
      width: "100%", height: 56, padding: "0 18px 0 50px",
      border: "1px solid rgba(255,255,255,0.6)", borderRadius: 15,
      background: "rgba(255,255,255,0.55)", fontFamily: jakartaSans,
      fontSize: 15.5, fontWeight: 500, color: "#16181d", outline: "none",
      boxSizing: "border-box",
    };

    const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!loginEmail || !loginPassword) { setLoginError("Enter your email and password."); return; }
      setLoginLoading(true); setLoginError("");
      const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
      if (error) { setLoginError(error.message); setLoginLoading(false); }
      else setAuthStatus("checking");
    };

    const handleForgot = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!loginEmail) { setLoginError("Enter your email first."); return; }
      setLoginLoading(true); setLoginError("");
      const { error } = await supabase.auth.resetPasswordForEmail(loginEmail, {
        redirectTo: `${window.location.origin}/admin`,
      });
      setLoginLoading(false);
      if (error) setLoginError(error.message);
      else setLoginResetSent(true);
    };

    return (
      <div style={{ position: "relative", minHeight: "100vh", width: "100%", fontFamily: jakartaSans, overflow: "hidden", background: "linear-gradient(180deg,#7db8e8 0%,#a9d2f0 30%,#cfe6f7 55%,#e9f4fb 78%,#ffffff 100%)" }}>
        <StyleInjector />
        {/* cloud overlay */}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "46%", background: "radial-gradient(120% 80% at 20% 100%,rgba(255,255,255,0.95) 0%,rgba(255,255,255,0) 60%),radial-gradient(120% 80% at 75% 100%,rgba(255,255,255,0.9) 0%,rgba(255,255,255,0) 58%),linear-gradient(180deg,rgba(255,255,255,0) 0%,rgba(255,255,255,0.85) 80%,#ffffff 100%)", pointerEvents: "none" }} />
        {/* orbit arcs */}
        <div style={{ position: "absolute", left: "50%", top: "54%", width: 1180, height: 1180, transform: "translate(-50%,-50%)", borderRadius: "50%", border: "1px solid rgba(255,255,255,0.5)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", left: "50%", top: "54%", width: 1480, height: 1480, transform: "translate(-50%,-50%)", borderRadius: "50%", border: "1px solid rgba(255,255,255,0.35)", pointerEvents: "none" }} />

        {/* brand */}
        <div style={{ position: "absolute", top: 42, left: 52, display: "flex", alignItems: "center", gap: 12, zIndex: 5 }}>
          <div style={{ width: 46, height: 46, borderRadius: 13, background: "#1c1d22", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 18px rgba(20,30,50,0.25)" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 2.5l8 4.6v9.2L12 21.5l-8-4.7V7.1l8-4.6z" stroke="#ffffff" strokeWidth="1.6" strokeLinejoin="round"/><circle cx="12" cy="11.8" r="3" fill="#7db8e8"/></svg>
          </div>
          <span style={{ fontSize: 26, fontWeight: 800, color: "#1c1d22", letterSpacing: -0.5 }}>DVR Admin</span>
        </div>

        {/* centered card */}
        <div style={{ position: "relative", zIndex: 5, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
          <div style={{ width: 430, maxWidth: "100%", borderRadius: 30, padding: "44px 40px 38px", background: "linear-gradient(180deg,rgba(216,236,247,0.72) 0%,rgba(255,255,255,0.82) 42%,rgba(255,255,255,0.92) 100%)", border: "1px solid rgba(255,255,255,0.85)", boxShadow: "0 30px 70px -20px rgba(60,110,160,0.45),inset 0 1px 0 rgba(255,255,255,0.9)", backdropFilter: "blur(22px)", WebkitBackdropFilter: "blur(22px)", animation: "ygcfade .6s ease both" }}>

            {/* icon badge */}
            <div style={{ width: 74, height: 74, margin: "0 auto 26px", borderRadius: 20, background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 26px -8px rgba(60,110,160,0.4),inset 0 1px 0 rgba(255,255,255,1)" }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" stroke="#1c1d22" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/><path d="M10 17l5-5-5-5" stroke="#1c1d22" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/><path d="M15 12H3" stroke="#1c1d22" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>

            {loginForgot ? (
              /* ── Forgot password ── */
              <>
                <h1 style={{ margin: "0 0 10px", textAlign: "center", fontSize: 28, fontWeight: 800, color: "#16181d", letterSpacing: -0.5 }}>Reset password</h1>
                <p style={{ margin: "0 0 30px", textAlign: "center", fontSize: 15, lineHeight: 1.5, color: "#5b6470", fontWeight: 500 }}>Enter your email and we&apos;ll send a reset link.</p>
                {loginResetSent ? (
                  <div style={{ padding: "16px 18px", borderRadius: 14, background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", color: "#065f46", fontSize: 14.5, fontWeight: 600, textAlign: "center", marginBottom: 20 }}>
                    ✅ Check your email for the reset link!
                  </div>
                ) : (
                  <form onSubmit={handleForgot} style={{ display: "grid", gap: 14 }}>
                    <div style={{ position: "relative" }}>
                      <span style={{ position: "absolute", left: 18, top: "50%", transform: "translateY(-50%)", display: "flex" }}>
                        <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="#8b95a3" strokeWidth="1.8"/><path d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6" stroke="#8b95a3" strokeWidth="1.8" strokeLinecap="round"/></svg>
                      </span>
                      <input type="email" placeholder="Email address" value={loginEmail} onChange={(e) => { setLoginEmail(e.target.value); setLoginError(""); }} autoComplete="email" style={inputStyle} />
                    </div>
                    {loginError && <div style={{ padding: "11px 14px", borderRadius: 12, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", color: "#b91c1c", fontSize: 13.5 }}>{loginError}</div>}
                    <button type="submit" disabled={loginLoading} style={{ width: "100%", height: 58, border: "none", borderRadius: 16, background: "linear-gradient(180deg,#34373f 0%,#1c1d22 100%)", color: "#fff", fontFamily: jakartaSans, fontSize: 16.5, fontWeight: 700, cursor: loginLoading ? "default" : "pointer", boxShadow: "0 14px 28px -10px rgba(20,25,35,0.6)", opacity: loginLoading ? 0.7 : 1 }}>
                      {loginLoading ? "Sending…" : "Send reset link"}
                    </button>
                  </form>
                )}
                <div style={{ textAlign: "center", marginTop: 22 }}>
                  <button onClick={() => { setLoginForgot(false); setLoginResetSent(false); setLoginError(""); }} style={{ border: "none", background: "transparent", fontFamily: jakartaSans, fontSize: 14, fontWeight: 700, color: "#16181d", cursor: "pointer" }}>← Back to sign in</button>
                </div>
              </>
            ) : (
              /* ── Sign in ── */
              <>
                <h1 style={{ margin: "0 0 10px", textAlign: "center", fontSize: 30, fontWeight: 800, color: "#16181d", letterSpacing: -0.6 }}>Hey DVR, welcome 👋</h1>
                <p style={{ margin: "0 0 30px", textAlign: "center", fontSize: 15.5, lineHeight: 1.5, color: "#5b6470", fontWeight: 500 }}>Sign in to the admin dashboard to manage<br />your workspace.</p>

                <form onSubmit={handleLogin} style={{ display: "grid", gap: 0 }}>
                  {/* email */}
                  <div style={{ position: "relative", marginBottom: 14 }}>
                    <span style={{ position: "absolute", left: 18, top: "50%", transform: "translateY(-50%)", display: "flex" }}>
                      <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="#8b95a3" strokeWidth="1.8"/><path d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6" stroke="#8b95a3" strokeWidth="1.8" strokeLinecap="round"/></svg>
                    </span>
                    <input type="email" placeholder="Email" value={loginEmail} onChange={(e) => { setLoginEmail(e.target.value); setLoginError(""); }} autoComplete="email" style={inputStyle} />
                  </div>

                  {/* password */}
                  <div style={{ position: "relative", marginBottom: 14 }}>
                    <span style={{ position: "absolute", left: 18, top: "50%", transform: "translateY(-50%)", display: "flex" }}>
                      <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><rect x="4.5" y="10.5" width="15" height="10" rx="2.5" stroke="#8b95a3" strokeWidth="1.8"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" stroke="#8b95a3" strokeWidth="1.8" strokeLinecap="round"/></svg>
                    </span>
                    <input type={loginShowPw ? "text" : "password"} placeholder="Password" value={loginPassword} onChange={(e) => { setLoginPassword(e.target.value); setLoginError(""); }} autoComplete="current-password" style={{ ...inputStyle, paddingRight: 50 }} />
                    <button onClick={() => setLoginShowPw((v) => !v)} type="button" aria-label="Toggle password" style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", border: "none", background: "transparent", cursor: "pointer", padding: 8, display: "flex" }}>
                      {loginShowPw ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 4l16 16" stroke="#8b95a3" strokeWidth="1.8" strokeLinecap="round"/><path d="M9.5 5.4A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3 3.6M6.4 6.9C3.7 8.6 2 12 2 12s3.5 7 10 7a10 10 0 0 0 3.3-.55" stroke="#8b95a3" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" stroke="#8b95a3" strokeWidth="1.8" strokeLinejoin="round"/><circle cx="12" cy="12" r="3" stroke="#8b95a3" strokeWidth="1.8"/></svg>
                      )}
                    </button>
                  </div>

                  <div style={{ textAlign: "right", marginBottom: 24 }}>
                    <button type="button" onClick={() => { setLoginForgot(true); setLoginError(""); }} style={{ border: "none", background: "transparent", fontFamily: jakartaSans, fontSize: 14, fontWeight: 700, color: "#16181d", cursor: "pointer" }}>Forgot password?</button>
                  </div>

                  {loginError && <div style={{ padding: "11px 14px", borderRadius: 12, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", color: "#b91c1c", fontSize: 13.5, marginBottom: 14 }}>{loginError}</div>}

                  <button type="submit" disabled={loginLoading} style={{ width: "100%", height: 58, border: "none", borderRadius: 16, background: "linear-gradient(180deg,#34373f 0%,#1c1d22 100%)", color: "#fff", fontFamily: jakartaSans, fontSize: 16.5, fontWeight: 700, cursor: loginLoading ? "default" : "pointer", boxShadow: "0 14px 28px -10px rgba(20,25,35,0.6)", letterSpacing: 0.2, opacity: loginLoading ? 0.7 : 1 }}>
                    {loginLoading ? "Signing in…" : "Sign in"}
                  </button>
                </form>
              </>
            )}

            <p style={{ margin: "24px 0 0", textAlign: "center", fontSize: 13, color: "#7a828e", fontWeight: 500 }}>Authorized personnel only · DVR Admin Panel</p>
          </div>
        </div>
      </div>
    );
  }

  if (authStatus === "checking") {
    return (
      <div className="ygc-app">
        <StyleInjector />
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
          <Card style={{ padding: 28, width: 360, maxWidth: "100%", textAlign: "center" }}>
            <div style={{ width: 44, height: 44, borderRadius: 13, margin: "0 auto 14px", background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.24)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)" }}>
              <Icon name="lock" size={20} />
            </div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Checking admin access</h1>
            <p style={{ margin: "8px 0 0", color: "var(--muted)", fontSize: 13.5 }}>Confirming your signed-in account before opening the dashboard.</p>
          </Card>
        </div>
      </div>
    );
  }

  if (authStatus === "twoStep") {
    return (
      <div className="ygc-app">
        <StyleInjector />
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
          <Card style={{ padding: 28, width: 420, maxWidth: "100%" }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.26)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", marginBottom: 16 }}>
              <Icon name="lock" size={21} />
            </div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Two-step verification</h1>
            <p style={{ margin: "8px 0 0", color: "var(--muted)", fontSize: 13.5, lineHeight: 1.55 }}>
              Enter the 6-digit code from your authenticator app to open the admin dashboard.
            </p>
            {adminEmail && <p style={{ margin: "10px 0 0", color: "var(--muted-2)", fontSize: 12.5 }}>Signed in as {adminEmail}</p>}
            <form
              onSubmit={(event) => {
                event.preventDefault();
                submitTwoStep();
              }}
              style={{ marginTop: 22, display: "grid", gap: 12 }}
            >
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={twoStepCode}
                onChange={(event) => {
                  setTwoStepCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                  setTwoStepError("");
                }}
                placeholder="000000"
                style={{
                  ...fieldInput,
                  height: 52,
                  textAlign: "center",
                  fontFamily: "var(--mono)",
                  fontSize: 24,
                  letterSpacing: 8,
                  fontWeight: 800,
                }}
              />
              {twoStepError && (
                <div style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(248,113,113,0.28)", background: "rgba(248,113,113,0.1)", color: "#b91c1c", fontSize: 13 }}>
                  {twoStepError}
                </div>
              )}
              <Btn type="submit" variant="primary" disabled={twoStepLoading || twoStepCode.length !== 6} style={{ width: "100%", height: 42 }}>
                {twoStepLoading ? <><Icon name="refresh" size={15} color="#fff" className="ygc-spin" /> Verifying</> : "Verify and open dashboard"}
              </Btn>
            </form>
            <button
              onClick={logout}
              style={{ marginTop: 14, width: "100%", border: "none", background: "transparent", color: "var(--muted)", fontSize: 13, fontWeight: 650 }}
            >
              Use a different account
            </button>
          </Card>
        </div>
        {toastNode}
      </div>
    );
  }

  if (authStatus === "denied") {
    return (
      <div className="ygc-app">
        <StyleInjector />
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
          <Card style={{ padding: 28, width: 430, maxWidth: "100%" }}>
            <div style={{ width: 44, height: 44, borderRadius: 13, background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.26)", display: "flex", alignItems: "center", justifyContent: "center", color: "#dc2626", marginBottom: 16 }}>
              <Icon name="lock" size={20} />
            </div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Admin access required</h1>
            <p style={{ margin: "8px 0 0", color: "var(--muted)", fontSize: 13.5, lineHeight: 1.55 }}>{authError || "This account is not allowed to open the admin dashboard."}</p>
            {adminEmail && <p style={{ margin: "10px 0 0", color: "var(--muted-2)", fontSize: 12.5 }}>Signed in as {adminEmail}</p>}
            <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
              <Btn variant="primary" onClick={() => (window.location.href = "/")}>Back to site</Btn>
              <Btn variant="ghost" onClick={logout}>Sign out</Btn>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="ygc-app">
      <StyleInjector />
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar tab={tab} setTab={setTab} onLogout={logout} counts={sidebarCounts} />
        <main style={{ flex: 1, minWidth: 0, maxHeight: "100vh", overflowY: "auto" }}>
          <div style={{ padding: "30px 34px 60px", maxWidth: 1180, margin: "0 auto" }}>
            <Current store={store} />
          </div>
        </main>
        <ArticleViewer article={viewing} onClose={() => setViewing(null)} />
        <ConfirmDialog
          open={!!pendingDelete}
          title="Delete this article?"
          body={pendingDelete ? `"${pendingDelete.title}" will be permanently removed. This can't be undone.` : ""}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
        {toastNode}
      </div>
    </div>
  );
}
