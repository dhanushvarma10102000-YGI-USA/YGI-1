"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Nav } from "@/components/ds/Nav";
import { supabase } from "@/lib/supabase";

// Every column except user_id, which is hidden so anonymous stories can't be traced to an account.
const PUBLIC_STORY_COLUMNS = "id,title,excerpt,body_html,category,city,uni,anon,display_name,upvotes,comments,read_time,created_at";

type View = "feed" | "form" | "mystories";
type RedditPost = {
  id: string;
  title: string;
  selftext: string;
  subreddit: string;
  author: string;
  score: number;
  num_comments: number;
  created_utc: number;
  permalink: string;
};
type TrendTab = "trending" | "top" | "new";
type Chip = { k: string; v: string };
type SortKey = "newest" | "popular" | "most_comments" | "oldest";

type Story = {
  id?: string;
  title: string;
  excerpt: string;
  author: { named: boolean; anon: boolean; name?: string; initials?: string; color?: string };
  tags: { label: string; bg: string; fg: string }[];
  upvotes: number;
  comments: number;
  readTime: number;
  city: string;
  uni: string;
  category: string;
  daysAgo: number;
};
type EditableStory = {
  id: string; title: string; body_html: string | null; category: string | null;
  city: string | null; uni: string | null; anon: boolean; display_name: string | null;
  created_at: string; upvotes: number; excerpt: string | null;
};


const PLACEHOLDER_BG =
  "repeating-linear-gradient(135deg,#ece2d2 0 11px,#e6dccb 11px 22px)";

function tag(label: string, kind: "orange" | "teal" | "neutral") {
  const m = {
    teal: ["#e6f0ee", "#0b544e"],
    orange: ["#f8ebe2", "#b5562d"],
    neutral: ["#f1ece3", "#6f685c"],
  };
  return { label, bg: m[kind][0], fg: m[kind][1] };
}

// Cities grouped by state — all 50 US states
const CITY_GROUPS: { state: string; cities: { name: string }[] }[] = [
  { state: "Alabama", cities: [{ name: "Birmingham" }, { name: "Huntsville" }, { name: "Mobile" }, { name: "Montgomery" }, { name: "Tuscaloosa" }] },
  { state: "Alaska", cities: [{ name: "Anchorage" }, { name: "Fairbanks" }, { name: "Juneau" }] },
  { state: "Arizona", cities: [
    { name: "Phoenix" }, { name: "Tucson" }, { name: "Mesa" },
    { name: "Scottsdale" }, { name: "Flagstaff" }, { name: "Tempe" },
    { name: "Chandler" }, { name: "Gilbert" }, { name: "Glendale" },
    { name: "Peoria" }, { name: "Surprise" }, { name: "Casa Grande" },
    { name: "Prescott" }, { name: "Yuma" }, { name: "Avondale" },
    { name: "Goodyear" }, { name: "Buckeye" }, { name: "Queen Creek" },
    { name: "Maricopa" }, { name: "Lake Havasu City" }, { name: "Sierra Vista" },
    { name: "Bullhead City" }, { name: "Apache Junction" }, { name: "El Mirage" },
    { name: "Kingman" },
  ]},
  { state: "Arkansas", cities: [{ name: "Little Rock" }, { name: "Fayetteville" }, { name: "Fort Smith" }, { name: "Jonesboro" }, { name: "Springdale" }] },
  { state: "California", cities: [
    { name: "Los Angeles" }, { name: "San Francisco" }, { name: "San Diego" },
    { name: "San Jose" }, { name: "Sacramento" }, { name: "Oakland" },
    { name: "Fresno" }, { name: "Long Beach" }, { name: "Berkeley" },
    { name: "Irvine" }, { name: "Riverside" }, { name: "Santa Ana" },
  ]},
  { state: "Colorado", cities: [{ name: "Denver" }, { name: "Colorado Springs" }, { name: "Aurora" }, { name: "Fort Collins" }, { name: "Boulder" }, { name: "Pueblo" }] },
  { state: "Connecticut", cities: [{ name: "Bridgeport" }, { name: "New Haven" }, { name: "Hartford" }, { name: "Stamford" }, { name: "Waterbury" }] },
  { state: "Delaware", cities: [{ name: "Wilmington" }, { name: "Dover" }, { name: "Newark" }] },
  { state: "Florida", cities: [
    { name: "Miami" }, { name: "Orlando" }, { name: "Tampa" },
    { name: "Jacksonville" }, { name: "St. Petersburg" }, { name: "Fort Lauderdale" },
    { name: "Tallahassee" }, { name: "Gainesville" }, { name: "Cape Coral" },
  ]},
  { state: "Georgia", cities: [{ name: "Atlanta" }, { name: "Columbus" }, { name: "Augusta" }, { name: "Savannah" }, { name: "Athens" }] },
  { state: "Hawaii", cities: [{ name: "Honolulu" }, { name: "Hilo" }, { name: "Kailua" }, { name: "Pearl City" }] },
  { state: "Idaho", cities: [{ name: "Boise" }, { name: "Nampa" }, { name: "Meridian" }, { name: "Idaho Falls" }, { name: "Pocatello" }] },
  { state: "Illinois", cities: [{ name: "Chicago" }, { name: "Aurora" }, { name: "Naperville" }, { name: "Joliet" }, { name: "Rockford" }, { name: "Springfield" }, { name: "Evanston" }] },
  { state: "Indiana", cities: [{ name: "Indianapolis" }, { name: "Fort Wayne" }, { name: "Evansville" }, { name: "South Bend" }, { name: "Carmel" }, { name: "Bloomington" }] },
  { state: "Iowa", cities: [{ name: "Des Moines" }, { name: "Cedar Rapids" }, { name: "Davenport" }, { name: "Sioux City" }, { name: "Iowa City" }] },
  { state: "Kansas", cities: [{ name: "Wichita" }, { name: "Overland Park" }, { name: "Kansas City" }, { name: "Olathe" }, { name: "Lawrence" }] },
  { state: "Kentucky", cities: [{ name: "Louisville" }, { name: "Lexington" }, { name: "Bowling Green" }, { name: "Owensboro" }, { name: "Covington" }] },
  { state: "Louisiana", cities: [{ name: "New Orleans" }, { name: "Baton Rouge" }, { name: "Shreveport" }, { name: "Lafayette" }, { name: "Lake Charles" }] },
  { state: "Maine", cities: [{ name: "Portland" }, { name: "Lewiston" }, { name: "Bangor" }, { name: "South Portland" }] },
  { state: "Maryland", cities: [{ name: "Baltimore" }, { name: "Rockville" }, { name: "Gaithersburg" }, { name: "Bowie" }, { name: "College Park" }, { name: "Annapolis" }] },
  { state: "Massachusetts", cities: [{ name: "Boston" }, { name: "Worcester" }, { name: "Springfield" }, { name: "Cambridge" }, { name: "Lowell" }, { name: "Somerville" }] },
  { state: "Michigan", cities: [{ name: "Detroit" }, { name: "Grand Rapids" }, { name: "Warren" }, { name: "Sterling Heights" }, { name: "Ann Arbor" }, { name: "Lansing" }, { name: "Dearborn" }] },
  { state: "Minnesota", cities: [{ name: "Minneapolis" }, { name: "Saint Paul" }, { name: "Rochester" }, { name: "Duluth" }, { name: "Bloomington" }] },
  { state: "Mississippi", cities: [{ name: "Jackson" }, { name: "Gulfport" }, { name: "Southaven" }, { name: "Hattiesburg" }, { name: "Biloxi" }] },
  { state: "Missouri", cities: [{ name: "Kansas City" }, { name: "St. Louis" }, { name: "Springfield" }, { name: "Columbia" }, { name: "Independence" }] },
  { state: "Montana", cities: [{ name: "Billings" }, { name: "Missoula" }, { name: "Great Falls" }, { name: "Bozeman" }] },
  { state: "Nebraska", cities: [{ name: "Omaha" }, { name: "Lincoln" }, { name: "Bellevue" }, { name: "Grand Island" }] },
  { state: "Nevada", cities: [{ name: "Las Vegas" }, { name: "Henderson" }, { name: "Reno" }, { name: "North Las Vegas" }, { name: "Sparks" }] },
  { state: "New Hampshire", cities: [{ name: "Manchester" }, { name: "Nashua" }, { name: "Concord" }, { name: "Dover" }] },
  { state: "New Jersey", cities: [{ name: "Newark" }, { name: "Jersey City" }, { name: "Paterson" }, { name: "Elizabeth" }, { name: "Trenton" }, { name: "Edison" }] },
  { state: "New Mexico", cities: [{ name: "Albuquerque" }, { name: "Las Cruces" }, { name: "Rio Rancho" }, { name: "Santa Fe" }] },
  { state: "New York", cities: [
    { name: "New York City" }, { name: "Buffalo" }, { name: "Rochester" },
    { name: "Yonkers" }, { name: "Syracuse" }, { name: "Albany" }, { name: "Ithaca" },
  ]},
  { state: "North Carolina", cities: [{ name: "Charlotte" }, { name: "Raleigh" }, { name: "Greensboro" }, { name: "Durham" }, { name: "Winston-Salem" }, { name: "Chapel Hill" }] },
  { state: "North Dakota", cities: [{ name: "Fargo" }, { name: "Bismarck" }, { name: "Grand Forks" }, { name: "Minot" }] },
  { state: "Ohio", cities: [{ name: "Columbus" }, { name: "Cleveland" }, { name: "Cincinnati" }, { name: "Toledo" }, { name: "Akron" }, { name: "Dayton" }] },
  { state: "Oklahoma", cities: [{ name: "Oklahoma City" }, { name: "Tulsa" }, { name: "Norman" }, { name: "Broken Arrow" }, { name: "Edmond" }] },
  { state: "Oregon", cities: [{ name: "Portland" }, { name: "Salem" }, { name: "Eugene" }, { name: "Gresham" }, { name: "Hillsboro" }, { name: "Corvallis" }] },
  { state: "Pennsylvania", cities: [{ name: "Philadelphia" }, { name: "Pittsburgh" }, { name: "Allentown" }, { name: "Erie" }, { name: "Reading" }, { name: "State College" }] },
  { state: "Rhode Island", cities: [{ name: "Providence" }, { name: "Warwick" }, { name: "Cranston" }, { name: "Pawtucket" }] },
  { state: "South Carolina", cities: [{ name: "Columbia" }, { name: "Charleston" }, { name: "North Charleston" }, { name: "Greenville" }, { name: "Rock Hill" }] },
  { state: "South Dakota", cities: [{ name: "Sioux Falls" }, { name: "Rapid City" }, { name: "Aberdeen" }] },
  { state: "Tennessee", cities: [{ name: "Nashville" }, { name: "Memphis" }, { name: "Knoxville" }, { name: "Chattanooga" }, { name: "Clarksville" }] },
  { state: "Texas", cities: [
    { name: "Houston" }, { name: "Dallas" }, { name: "Austin" },
    { name: "San Antonio" }, { name: "Fort Worth" }, { name: "El Paso" },
    { name: "Arlington" }, { name: "Plano" }, { name: "Lubbock" },
    { name: "Irving" }, { name: "Garland" }, { name: "College Station" },
  ]},
  { state: "Utah", cities: [{ name: "Salt Lake City" }, { name: "West Valley City" }, { name: "Provo" }, { name: "West Jordan" }, { name: "Orem" }] },
  { state: "Vermont", cities: [{ name: "Burlington" }, { name: "Essex" }, { name: "South Burlington" }] },
  { state: "Virginia", cities: [{ name: "Virginia Beach" }, { name: "Norfolk" }, { name: "Chesapeake" }, { name: "Richmond" }, { name: "Arlington" }, { name: "Alexandria" }, { name: "Charlottesville" }] },
  { state: "Washington", cities: [{ name: "Seattle" }, { name: "Spokane" }, { name: "Tacoma" }, { name: "Bellevue" }, { name: "Kirkland" }, { name: "Redmond" }] },
  { state: "West Virginia", cities: [{ name: "Charleston" }, { name: "Huntington" }, { name: "Morgantown" }, { name: "Parkersburg" }] },
  { state: "Wisconsin", cities: [{ name: "Milwaukee" }, { name: "Madison" }, { name: "Green Bay" }, { name: "Kenosha" }, { name: "Racine" }] },
  { state: "Wyoming", cities: [{ name: "Cheyenne" }, { name: "Casper" }, { name: "Laramie" }] },
];

// Flat city list for filtering logic
const CITIES = CITY_GROUPS.flatMap((g) => g.cities);

const UNIS = [
  // Arizona Public Universities
  { name: "Arizona State University" },
  { name: "University of Arizona" },
  { name: "Northern Arizona University" },
  // Arizona Private Universities
  { name: "Grand Canyon University" },
  { name: "University of Phoenix" },
  { name: "Embry-Riddle Aeronautical University" },
  { name: "Western International University" },
  { name: "Midwestern University" },
  { name: "University of Advancing Technology" },
  { name: "Thunderbird School of Global Management" },
  { name: "A.T. Still University" },
  { name: "Prescott College" },
  { name: "Ottawa University Arizona" },
  // Maricopa County Community Colleges
  { name: "Maricopa Community College" },
  { name: "Scottsdale Community College" },
  { name: "Glendale Community College" },
  { name: "Mesa Community College" },
  { name: "Phoenix College" },
  { name: "South Mountain Community College" },
  { name: "Chandler-Gilbert Community College" },
  { name: "GateWay Community College" },
  { name: "Paradise Valley Community College" },
  { name: "Rio Salado College" },
  { name: "Estrella Mountain Community College" },
  // Pima County
  { name: "Pima Community College" },
  // Other AZ
  { name: "Cochise College" },
  { name: "Central Arizona College" },
  { name: "Eastern Arizona College" },
  { name: "Mohave Community College" },
  { name: "Northland Pioneer College" },
  { name: "Yavapai College" },
  { name: "Arizona Western College" },
  { name: "Tohono O'odham Community College" },
];

const CATEGORIES = [
  "Daily Life",
  "Money & Banking",
  "Community",
  "Housing",
  "Visa & Immigration",
  "Campus Life",
  "Transportation",
  "Health & Wellness",
];

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "Newest" },
  { key: "popular", label: "Most Upvoted" },
  { key: "most_comments", label: "Most Comments" },
  { key: "oldest", label: "Oldest" },
];

const EMPTY_STORIES: Story[] = [];

function countBy(stories: Story[], key: "city" | "uni"): Record<string, number> {
  const map: Record<string, number> = {};
  for (const st of stories) {
    const value = st[key];
    if (value) map[value] = (map[value] || 0) + 1;
  }
  return map;
}

function dbRowToStory(row: Record<string, any>): Story {
  const daysAgo = Math.floor((Date.now() - new Date(row.created_at).getTime()) / 86_400_000);
  const displayName: string = row.display_name || "Member";
  return {
    id: row.id,
    title: row.title || "",
    excerpt: row.excerpt || "",
    author: row.anon
      ? { named: false, anon: true }
      : { named: true, anon: false, name: displayName, initials: displayName[0]?.toUpperCase() ?? "M", color: "#0f6f67" },
    tags: row.category ? [tag(row.category, "teal")] : [],
    upvotes: row.upvotes ?? 0,
    comments: row.comments ?? 0,
    readTime: row.read_time ?? 1,
    city: row.city || "",
    uni: row.uni || "",
    category: row.category || "",
    daysAgo: Math.max(0, daysAgo),
  };
}



const CSS = `
.sy-page { min-height:100vh; background:#e9e8e4; font-family:'Public Sans',system-ui,sans-serif; }
.sy-frame { background:transparent; border:none; border-radius:0; padding:0; box-shadow:none; }
.sy-btn-teal { transition:background .15s; }
.sy-btn-teal:hover { background:#0c5d56 !important; }
.sy-btn-terra { transition:background .15s; }
.sy-btn-terra:hover { background:#c0612f !important; }
.sy-story-card { transition:box-shadow .18s,transform .18s,border-color .18s; }
.sy-story-card:hover { box-shadow:0 10px 30px rgba(40,33,20,0.09) !important; transform:translateY(-2px) !important; border-color:#e0d8c8 !important; }
.sy-list-row { transition:background .12s; }
.sy-list-row:hover { background:#f4f0e8 !important; }
.sy-chip-x:hover { background:#0f6f67 !important; color:#fff !important; }
.sy-clear-all:hover { color:#d4703f !important; }
.sy-upvote-pill { transition:background .15s,border-color .15s; }
.sy-upvote-pill:hover { background:#e9f0ee !important; border-color:#0f6f67 !important; }
.sy-upvote-large { transition:background .15s,color .15s; }
.sy-upvote-large:hover { background:#0f6f67 !important; color:#fff !important; }
.sy-back-btn { transition:color .15s; }
.sy-back-btn:hover { color:#0f6f67 !important; }
.sy-reaction-btn { transition:border-color .15s,background .15s; }
.sy-reaction-btn:hover { border-color:#d4703f !important; background:#fdf6f1 !important; }
.sy-comment-like { transition:color .15s; }
.sy-comment-like:hover { color:#d4703f !important; }
.sy-comment-reply { transition:color .15s; }
.sy-comment-reply:hover { color:#0f6f67 !important; }
.sy-trend-item { transition:background .15s; }
.sy-trend-item:hover { background:#f4f0e8 !important; }
.sy-filter-btn { transition:border-color .15s; }
.sy-filter-btn:hover { border-color:#cdc6b6 !important; }
.sy-load-more:hover { background:#e9f0ee !important; border-color:#0f6f67 !important; }
.sy-draft-btn:hover { background:#f4f0e8 !important; }
.sy-toolbar-btn:hover { background:#ece6dc !important; }
.sy-add-photo-btn:hover { border-color:#0f6f67 !important; color:#0f6f67 !important; }
.sy-post-comment-btn { transition:background .15s; }
.sy-post-comment-btn:hover { background:#0c5d56 !important; }
.sy-drop-item { transition:background .12s; }
.sy-drop-item:hover { background:#f4f0e8 !important; }
.sy-see-all:hover { text-decoration:underline; }
.sy-search-sug:hover { background:#f4f0e8 !important; }
.sy-ms-edit:hover { background:#e6f0ee !important; border-color:#0f6f67 !important; }
.sy-ms-delete:hover { background:#fdecea !important; border-color:#d4433a !important; color:#d4433a !important; }
.sy-sort-chip { transition:background .12s,border-color .12s; }
.sy-sort-chip:hover { border-color:#0f6f67 !important; }
[contenteditable][data-placeholder]:empty:before { content:attr(data-placeholder); color:#a8a195; pointer-events:none; }
/* nudge popup */
.sy-nudge-stack { position:fixed; right:20px; bottom:20px; z-index:200; display:flex; flex-direction:column; gap:10px; align-items:flex-end; max-width:calc(100vw - 28px); pointer-events:none; }
.sy-nudge { position:relative; width:320px; max-width:100%; background:#fff; border:1px solid #e9e2d6; border-radius:18px; overflow:hidden; box-shadow:0 24px 60px -20px rgba(40,33,20,0.45); transform:translateY(40px) scale(.96); opacity:0; pointer-events:none; transition:transform .55s cubic-bezier(.16,1,.3,1),opacity .38s ease; }
.sy-nudge.show { transform:none; opacity:1; pointer-events:auto; }
.sy-nudge-bar { height:3px; width:100%; }
.sy-nudge-bar-teal { background:linear-gradient(90deg,#0f6f67,#5ebfb5); }
.sy-nudge-bar-terra { background:linear-gradient(90deg,#d4703f,#e8a87c); }
.sy-nudge-body { padding:14px 15px 15px; }
.sy-nudge-top { display:flex; align-items:center; gap:10px; }
.sy-nudge-icon { width:44px; height:44px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0; }
.sy-nudge-title { font-size:14.5px; font-weight:700; color:#221f1b; line-height:1.2; }
.sy-nudge-sub { font-size:11px; color:#a8a195; font-family:'JetBrains Mono',monospace; margin-top:2px; display:flex; align-items:center; gap:5px; }
.sy-nudge-dot { width:6px; height:6px; border-radius:50%; background:#5fd6a8; }
.sy-nudge-x { margin-left:auto; width:26px; height:26px; border-radius:50%; border:none; background:#f4f0e8; color:#8a8378; cursor:pointer; display:grid; place-items:center; transition:.18s; flex-shrink:0; }
.sy-nudge-x:hover { background:#ece6dc; color:#221f1b; transform:rotate(90deg); }
.sy-nudge-msg { font-size:13px; color:#5f594f; line-height:1.5; margin-top:10px; }
.sy-nudge-msg b { color:#221f1b; font-weight:600; }
.sy-nudge-row { display:flex; align-items:center; justify-content:flex-end; margin-top:13px; }
.sy-nudge-cta { border:none; cursor:pointer; font-family:inherit; font-size:13px; font-weight:600; color:#fff; padding:8px 15px; border-radius:10px; transition:.18s; white-space:nowrap; }
.sy-nudge-cta:hover { transform:translateY(-2px); box-shadow:0 10px 20px -8px rgba(0,0,0,0.4); }
.sy-nudge-timer { height:2px; background:#f0ebe3; position:relative; overflow:hidden; }
.sy-nudge-timer-bar { position:absolute; left:0; top:0; bottom:0; width:100%; transform-origin:left; background:#cdc6b6; opacity:.6; animation:syNTimer 9s linear forwards; }
@keyframes syNTimer { from{transform:scaleX(1)} to{transform:scaleX(0)} }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
`;

/* ── SVG icons ── */
const IconSearch = ({ size = 14, color = "#a8a195" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
    <circle cx="6" cy="6" r="4.2" stroke={color} strokeWidth="1.3" />
    <path d="M9.2 9.2L12 12" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);
const IconChevron = ({ rotated = false, color = "#9a9082" }: { rotated?: boolean; color?: string }) => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none"
    style={{ transform: rotated ? "rotate(180deg)" : "none", transition: "transform .2s", flexShrink: 0 }}>
    <path d="M3 5l3.5 3.5L10 5" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconComment = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M2.5 2.5h9a1 1 0 011 1v4.6a1 1 0 01-1 1H6.4l-2.9 2.1V9.1H2.5a1 1 0 01-1-1V3.5a1 1 0 011-1z" stroke="#a8a195" strokeWidth="1.2" strokeLinejoin="round" />
  </svg>
);
const IconClock = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="7" cy="7" r="5.2" stroke="#a8a195" strokeWidth="1.2" />
    <path d="M7 4.3V7l1.9 1.3" stroke="#a8a195" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);
const IconBack = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M8.5 3L4.5 7l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconPencil = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <path d="M10.5 2.2l2.3 2.3-7.4 7.4-3 .7.7-3 7.4-7.4z" stroke="#fff" strokeWidth="1.3" strokeLinejoin="round" />
  </svg>
);
const IconPhoto = ({ color = "#46423a" }: { color?: string }) => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <rect x="1.5" y="2.5" width="12" height="10" rx="2" stroke={color} strokeWidth="1.3" />
    <circle cx="5" cy="6" r="1.2" fill={color} />
    <path d="M2.5 11l3-3 2.4 2.4L10 8l2.5 2.5" stroke={color} strokeWidth="1.3" strokeLinejoin="round" fill="none" />
  </svg>
);
const IconList = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <circle cx="2" cy="4" r="1" fill="#46423a" /><circle cx="2" cy="8" r="1" fill="#46423a" /><circle cx="2" cy="12" r="1" fill="#46423a" />
    <path d="M5 4h8M5 8h8M5 12h8" stroke="#46423a" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);
const IconLink = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <path d="M6 9.5a2.5 2.5 0 010-3.5l2-2a2.5 2.5 0 013.5 3.5l-1 1M9 5.5a2.5 2.5 0 010 3.5l-2 2a2.5 2.5 0 01-3.5-3.5l1-1" stroke="#46423a" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconClose = () => (
  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
    <path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);
const IconCheck = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <path d="M2.5 6.5l3 3 5-5" stroke="#0b544e" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ── Toast ── */
function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div style={{
      position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
      background: "#1f1c18", color: "#fff", borderRadius: 12, padding: "12px 22px",
      fontSize: 14, fontWeight: 600, zIndex: 9999, boxShadow: "0 8px 28px rgba(0,0,0,0.22)",
      fontFamily: "'Public Sans',system-ui,sans-serif",
    }}>
      {msg}
    </div>
  );
}

/* ── Scrollable filter dropdown with built-in search ── */
function FilterDrop({ options, selected, onSelect, onClose, counts }: {
  options: { name: string }[];
  selected: string;
  onSelect: (v: string) => void;
  onClose: () => void;
  counts?: Record<string, number>;
}) {
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  const filtered = q
    ? options.filter((o) => o.name.toLowerCase().includes(q.toLowerCase()))
    : options;

  return (
    <div ref={ref} style={{
      position: "absolute", top: "calc(100% + 6px)", left: 0, minWidth: 230,
      background: "#fff", border: "1px solid #e2dccf", borderRadius: 14,
      boxShadow: "0 12px 36px rgba(40,33,20,0.13)", overflow: "hidden", zIndex: 50,
    }}>
      <div style={{ padding: "8px 10px 6px", borderBottom: "1px solid #f0ece4" }}>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", display: "flex" }}>
            <IconSearch size={13} />
          </span>
          <input ref={inputRef} placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)}
            style={{ width: "100%", height: 34, border: "1px solid #e6dfd2", borderRadius: 8, background: "#faf8f3", padding: "0 10px 0 30px", fontSize: 13, fontFamily: "inherit", outline: "none", color: "#221f1b" }} />
        </div>
      </div>
      <div style={{ maxHeight: 260, overflowY: "auto" }}>
        {filtered.length === 0 && (
          <div style={{ padding: "12px 15px", fontSize: 13, color: "#a8a195", textAlign: "center" }}>No results</div>
        )}
        {filtered.map((opt) => {
          const active = selected === opt.name;
          return (
            <button key={opt.name} className="sy-drop-item" onClick={() => { onSelect(opt.name); onClose(); }}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "9px 13px", background: active ? "#eef3f1" : "none",
                border: "none", fontSize: 13.5, color: "#221f1b", cursor: "pointer",
                textAlign: "left", fontFamily: "inherit", fontWeight: active ? 600 : 400, gap: 10,
              }}>
              <span style={{ flex: 1 }}>{opt.name}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                {(counts?.[opt.name] ?? 0) > 0 && (
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: "#0b544e", background: "#e9f0ee", padding: "1px 7px", borderRadius: 999 }}>{counts?.[opt.name]}</span>
                )}
                {active && <IconCheck />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Search suggestions dropdown ── */
function SearchSuggestions({ query, onSelect, onClose, stories }: {
  query: string;
  onSelect: (v: string) => void;
  onClose: () => void;
  stories: Story[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  const q = query.toLowerCase();
  const storyMatches = stories.filter(
    (s) =>
      s.title.toLowerCase().includes(q) ||
      s.excerpt.toLowerCase().includes(q) ||
      (s.author.named && (s.author as { name: string }).name.toLowerCase().includes(q))
  ).slice(0, 4);
  const cityMatches = CITIES.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 3);
  const uniMatches = UNIS.filter((u) => u.name.toLowerCase().includes(q)).slice(0, 2);
  const hasResults = storyMatches.length > 0 || cityMatches.length > 0 || uniMatches.length > 0;

  // Real counts from loaded stories
  const suggUniCounts = useMemo(() => countBy(stories, "uni"), [stories]);
  const suggCityCounts = useMemo(() => countBy(stories, "city"), [stories]);

  return (
    <div ref={ref} style={{
      position: "absolute", left: 0, right: 0, top: "calc(100% + 6px)",
      background: "#fff", border: "1px solid #e2dccf", borderRadius: 14,
      boxShadow: "0 12px 36px rgba(40,33,20,0.13)", zIndex: 50, overflow: "hidden",
    }}>
      {!hasResults && (
        <div style={{ padding: "14px 15px", fontSize: 13.5, color: "#a8a195" }}>
          No results for &ldquo;{query}&rdquo;
        </div>
      )}
      {storyMatches.length > 0 && (
        <>
          <div style={{ padding: "8px 13px 4px", fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", color: "#a8a195", textTransform: "uppercase" }}>Journeys</div>
          {storyMatches.map((s, i) => (
            <button key={i} className="sy-search-sug" onClick={() => { onSelect(s.title); onClose(); }} style={{
              width: "100%", display: "flex", alignItems: "flex-start", gap: 11, padding: "9px 13px",
              background: "none", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit",
            }}>
              <span style={{ marginTop: 3, flexShrink: 0, display: "flex" }}><IconSearch size={13} color="#cdc6b6" /></span>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "#221f1b", lineHeight: 1.3 }}>{s.title}</div>
                <div style={{ fontSize: 12, color: "#9a9082", marginTop: 2 }}>{s.tags[0]?.label} · {s.readTime} min read</div>
              </div>
            </button>
          ))}
        </>
      )}
      {cityMatches.length > 0 && (
        <>
          <div style={{ padding: "8px 13px 4px", fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", color: "#a8a195", textTransform: "uppercase", borderTop: storyMatches.length > 0 ? "1px solid #f0ece4" : "none" }}>Cities</div>
          {cityMatches.map((c, i) => (
            <button key={i} className="sy-search-sug" onClick={() => { onSelect(c.name); onClose(); }} style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "9px 13px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
            }}>
              <span style={{ fontSize: 13.5, fontWeight: 500, color: "#221f1b" }}>{c.name}</span>
              {(suggCityCounts[c.name] ?? 0) > 0 && (
                <span style={{ fontSize: 11.5, fontWeight: 600, color: "#0b544e", background: "#e9f0ee", padding: "1px 8px", borderRadius: 999 }}>{suggCityCounts[c.name]} stories</span>
              )}
            </button>
          ))}
        </>
      )}
      {uniMatches.length > 0 && (
        <>
          <div style={{ padding: "8px 13px 4px", fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", color: "#a8a195", textTransform: "uppercase", borderTop: (storyMatches.length > 0 || cityMatches.length > 0) ? "1px solid #f0ece4" : "none" }}>Universities</div>
          {uniMatches.map((u, i) => (
            <button key={i} className="sy-search-sug" onClick={() => { onSelect(u.name); onClose(); }} style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "9px 13px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
            }}>
              <span style={{ fontSize: 13.5, fontWeight: 500, color: "#221f1b" }}>{u.name}</span>
              {(suggUniCounts[u.name] ?? 0) > 0 && (
                <span style={{ fontSize: 11.5, fontWeight: 600, color: "#b5562d", background: "#f7ebe2", padding: "1px 8px", borderRadius: 999 }}>{suggUniCounts[u.name]} stories</span>
              )}
            </button>
          ))}
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   FEED VIEW
═══════════════════════════════════════ */
function FeedView({
  onShareStory, onMyStories,
  upvoteCounts, votedIds, onToggleVote, stories, storiesLoading, user,
}: {
  onShareStory: () => void;
  onMyStories: () => void;
  upvoteCounts: number[];
  votedIds: Set<string>;
  onToggleVote: (id: string, idx: number) => void;
  stories: Story[];
  storiesLoading: boolean;
  user: { id: string } | null;
}) {
  const [feedSource, setFeedSource] = useState<"local" | "reddit">("local");
  const [redditPosts, setRedditPosts] = useState<RedditPost[]>([]);
  const [redditSort, setRedditSort] = useState<"hot" | "top" | "new">("hot");
  const [redditLoading, setRedditLoading] = useState(false);
  const [redditError, setRedditError] = useState("");
  const [redditFetched, setRedditFetched] = useState(false);
  const [redditSearch, setRedditSearch] = useState("");

  const [cityOpen, setCityOpen] = useState(true);
  const [uniOpen, setUniOpen] = useState(true);
  const [trendTab, setTrendTab] = useState<TrendTab>("trending");
  const [chips, setChips] = useState<Chip[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [searchActive, setSearchActive] = useState("");
  const [showSearchDrop, setShowSearchDrop] = useState(false);
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const [activeSorts, setActiveSorts] = useState<SortKey[]>(["newest"]);
  const [displayCount, setDisplayCount] = useState(3);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [citySearch, setCitySearch] = useState("");
  const [stateSearch, setStateSearch] = useState("");
  const [uniSearch, setUniSearch] = useState("");
  const [showAllUnis, setShowAllUnis] = useState(false);

  const fetchReddit = useCallback(async (sort: "hot" | "top" | "new") => {
    setRedditLoading(true);
    setRedditError("");
    setRedditFetched(true);
    try {
      const res = await fetch(`/api/reddit-stories?sort=${sort}`);
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      setRedditPosts(data.posts ?? []);
    } catch (e) {
      console.error("Reddit fetch error", e);
      setRedditError("Could not load posts right now. Try again.");
    } finally {
      setRedditLoading(false);
    }
  }, []);

  useEffect(() => {
    if (feedSource === "reddit" && !redditFetched) {
      fetchReddit(redditSort);
    }
  // redditSort is read inside fetchReddit via closure; redditFetched triggers re-fetch when sort changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedSource, redditFetched]);

  const removeChip = (i: number) => { setChips((c) => c.filter((_, j) => j !== i)); setDisplayCount(3); };
  const clearAll = () => { setChips([]); setSearchActive(""); setSearchInput(""); setDisplayCount(3); };
  const addChip = (k: string, v: string) => {
    setChips((prev) => [...prev.filter((c) => c.k !== k), { k, v }]);
    setOpenFilter(null);
    setDisplayCount(3);
  };

  const toggleSort = (key: SortKey) => {
    setActiveSorts((prev) => {
      if (prev.includes(key)) {
        const next = prev.filter((k) => k !== key);
        return next.length === 0 ? ["newest"] : next;
      }
      return [...prev, key];
    });
    setDisplayCount(3);
  };

  const doSearch = (q: string) => {
    setSearchActive(q);
    setSearchInput(q);
    setShowSearchDrop(false);
    setDisplayCount(3);
  };

  const cityChip = chips.find((c) => c.k === "City");
  const uniChip = chips.find((c) => c.k === "University");
  const catChip = chips.find((c) => c.k === "Category");

  const headline = cityChip
    ? "Journeys from " + cityChip.v
    : uniChip
    ? "Journeys from " + uniChip.v.split(" ").slice(0, 3).join(" ")
    : searchActive
    ? `Results for "${searchActive}"`
    : "Latest Journeys";

  const filteredStories = stories.filter((s) => {
    if (searchActive) {
      const q = searchActive.toLowerCase();
      const nameMatch = s.author.named && (s.author as { name: string }).name.toLowerCase().includes(q);
      const cityMatch = CITIES.find((c) => c.name.toLowerCase() === q);
      const uniMatch = UNIS.find((u) => u.name.toLowerCase() === q);
      if (cityMatch) {
        if (s.city.toLowerCase() !== q) return false;
      } else if (uniMatch) {
        if (s.uni.toLowerCase() !== uniMatch.name.toLowerCase()) return false;
      } else if (!s.title.toLowerCase().includes(q) && !s.excerpt.toLowerCase().includes(q) && !nameMatch) {
        return false;
      }
    }
    if (cityChip && s.city !== cityChip.v) return false;
    if (uniChip && s.uni !== uniChip.v) return false;
    if (catChip && s.category !== catChip.v) return false;
    return true;
  });

  const sortedStories = [...filteredStories].sort((a, b) => {
    for (const sk of activeSorts) {
      if (sk === "popular") { const d = b.upvotes - a.upvotes; if (d !== 0) return d; }
      if (sk === "most_comments") { const d = b.comments - a.comments; if (d !== 0) return d; }
      if (sk === "newest") { const d = a.daysAgo - b.daysAgo; if (d !== 0) return d; }
      if (sk === "oldest") { const d = b.daysAgo - a.daysAgo; if (d !== 0) return d; }
    }
    return 0;
  });

  const headlineSub = (cityChip || uniChip || catChip || searchActive)
    ? `${filteredStories.length} ${filteredStories.length === 1 ? "journey" : "journeys"} found`
    : "The newest experiences from people finding their footing in the U.S.";

  const visibleStories = sortedStories.slice(0, displayCount);
  const hasMore = displayCount < sortedStories.length;

  // City sidebar: state-list or city-list depending on selectedState
  // Real per-university story counts derived from loaded stories
  const uniCounts = useMemo(() => countBy(stories, "uni"), [stories]);
  const cityCounts = useMemo(() => countBy(stories, "city"), [stories]);

  // Trending sidebar from the real, saved stories (only ones with an id can be opened)
  const trendData = useMemo<Record<TrendTab, { id: string; title: string; votes: number }[]>>(() => {
    const saved = stories
      .map((st, i) => ({ id: st.id || "", title: st.title, votes: upvoteCounts[i] ?? st.upvotes, daysAgo: st.daysAgo }))
      .filter((st) => st.id);
    const pick = (sorted: typeof saved) => sorted.slice(0, 5).map(({ id, title, votes }) => ({ id, title, votes }));
    return {
      trending: pick([...saved].sort((a, b) => b.votes / (b.daysAgo + 2) - a.votes / (a.daysAgo + 2))),
      top: pick([...saved].sort((a, b) => b.votes - a.votes)),
      new: pick([...saved].sort((a, b) => a.daysAgo - b.daysAgo)),
    };
  }, [stories, upvoteCounts]);

  const filteredStates = stateSearch
    ? CITY_GROUPS.filter((g) => g.state.toLowerCase().includes(stateSearch.toLowerCase()))
    : CITY_GROUPS;
  const activeCityGroup = selectedState ? CITY_GROUPS.find((g) => g.state === selectedState) : null;
  const filteredCities = activeCityGroup
    ? citySearch
      ? activeCityGroup.cities.filter((c) => c.name.toLowerCase().includes(citySearch.toLowerCase()))
      : activeCityGroup.cities
    : [];

  const filteredUnis = uniSearch
    ? UNIS.filter((u) => u.name.toLowerCase().includes(uniSearch.toLowerCase()))
    : UNIS;
  const visibleUnis = showAllUnis ? filteredUnis : filteredUnis.slice(0, 6);

  return (
    <div className="sy-frame" style={{ maxWidth: 1800, margin: "0 auto" }}>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 500, letterSpacing: "0.16em", textTransform: "uppercase", color: "#0f6f67", marginBottom: 8 }}>Community</div>
          <h1 style={{ fontFamily: "'Newsreader',Georgia,serif", fontSize: "clamp(26px,3.5vw,40px)", fontWeight: 600, color: "#221f1b", margin: 0, lineHeight: 1.05, letterSpacing: "-0.02em" }}>Journeys</h1>
          <p style={{ fontSize: 14.5, color: "#8a8378", margin: "7px 0 0", lineHeight: 1.5 }}>Real experiences from people finding their footing in the U.S.</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
          {user && (
            <button onClick={onMyStories} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "#fff", color: "#0f6f67", border: "1px solid #c8dedd", borderRadius: 11, padding: "11px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "background .15s" }}
              onMouseOver={(e) => (e.currentTarget.style.background = "#e9f0ee")}
              onMouseOut={(e) => (e.currentTarget.style.background = "#fff")}>
              📖 My Stories
            </button>
          )}
          <button onClick={onShareStory} className="sy-btn-teal" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#0f6f67", color: "#fff", border: "none", borderRadius: 11, padding: "11px 22px", fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 8px rgba(15,111,103,0.28)", fontFamily: "inherit" }}>
            <IconPencil /> Share your story
          </button>
        </div>
      </div>

      {/* 3-col */}
      <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>

        {/* LEFT SIDEBAR */}
        <aside style={{ flex: "0 0 240px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Browse by City — two-step: state → city */}
          <section style={{ background: "#fff", border: "1px solid #ece6dc", borderRadius: 15, padding: "15px 15px 12px", boxShadow: "0 1px 2px rgba(40,33,20,0.04)" }}>
            <button onClick={() => { setCityOpen((o) => !o); if (cityOpen) { setSelectedState(null); setStateSearch(""); setCitySearch(""); } }} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", padding: "2px 0", cursor: "pointer", fontFamily: "inherit" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 7, height: 7, borderRadius: 2, background: "#0f6f67" }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: "#221f1b" }}>Browse by City</span>
              </span>
              <IconChevron rotated={cityOpen} />
            </button>
            {cityOpen && (
              <div style={{ marginTop: 12 }}>
                {/* Step 2: city list for selected state */}
                {selectedState ? (
                  <>
                    <button onClick={() => { setSelectedState(null); setCitySearch(""); setStateSearch(""); }} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", padding: "2px 2px 8px", cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600, color: "#0f6f67" }}>
                      ← {selectedState}
                    </button>
                    <div style={{ position: "relative", marginBottom: 8 }}>
                      <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", display: "flex" }}><IconSearch /></span>
                      <input placeholder="Search cities" value={citySearch}
                        onChange={(e) => setCitySearch(e.target.value)}
                        style={{ width: "100%", height: 33, border: "1px solid #e6dfd2", borderRadius: 9, background: "#faf8f3", padding: "0 10px 0 30px", fontSize: 12.5, fontFamily: "inherit", color: "#3a362f", outline: "none" }} />
                    </div>
                    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 1 }}>
                      {filteredCities.map((c) => (
                        <li key={c.name}>
                          <button onClick={() => addChip("City", c.name)} className="sy-list-row" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: cityChip?.v === c.name ? "#eef3f1" : "none", border: "none", padding: "6px 9px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit" }}>
                            <span style={{ fontSize: 13, color: "#46423a", fontWeight: 500 }}>{c.name}</span>
                            {(cityCounts[c.name] ?? 0) > 0 && (
                              <span style={{ fontSize: 11, fontWeight: 600, color: "#0b544e", background: "#e9f0ee", padding: "1px 7px", borderRadius: 999 }}>{cityCounts[c.name]}</span>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  /* Step 1: state list */
                  <>
                    <div style={{ position: "relative", marginBottom: 8 }}>
                      <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", display: "flex" }}><IconSearch /></span>
                      <input placeholder="Search states" value={stateSearch}
                        onChange={(e) => setStateSearch(e.target.value)}
                        style={{ width: "100%", height: 33, border: "1px solid #e6dfd2", borderRadius: 9, background: "#faf8f3", padding: "0 10px 0 30px", fontSize: 12.5, fontFamily: "inherit", color: "#3a362f", outline: "none" }} />
                    </div>
                    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 1, maxHeight: 300, overflowY: "auto" }}>
                      {filteredStates.map((g) => {
                        const hasActive = cityChip && g.cities.some((c) => c.name === cityChip.v);
                        return (
                          <li key={g.state}>
                            <button onClick={() => { setSelectedState(g.state); setCitySearch(""); }} className="sy-list-row" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: hasActive ? "#eef3f1" : "none", border: "none", padding: "6px 9px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit" }}>
                              <span style={{ fontSize: 13, color: "#46423a", fontWeight: hasActive ? 700 : 500 }}>{g.state}</span>
                              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                <span style={{ fontSize: 11, color: "#a8a195" }}>{g.cities.length} cities</span>
                                <span style={{ fontSize: 11, color: "#bbb5ab" }}>›</span>
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </div>
            )}
          </section>

          {/* Browse by University */}
          <section style={{ background: "#fff", border: "1px solid #ece6dc", borderRadius: 15, padding: "15px 15px 12px", boxShadow: "0 1px 2px rgba(40,33,20,0.04)" }}>
            <button onClick={() => setUniOpen((o) => !o)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", padding: "2px 0", cursor: "pointer", fontFamily: "inherit" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 7, height: 7, borderRadius: 2, background: "#d4703f" }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: "#221f1b" }}>Browse by University</span>
              </span>
              <IconChevron rotated={uniOpen} />
            </button>
            {uniOpen && (
              <div style={{ marginTop: 12 }}>
                <div style={{ position: "relative", marginBottom: 10 }}>
                  <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", display: "flex" }}><IconSearch /></span>
                  <input placeholder="Search universities" value={uniSearch}
                    onChange={(e) => { setUniSearch(e.target.value); setShowAllUnis(true); }}
                    style={{ width: "100%", height: 34, border: "1px solid #e6dfd2", borderRadius: 10, background: "#faf8f3", padding: "0 10px 0 30px", fontSize: 13, fontFamily: "inherit", color: "#3a362f", outline: "none" }} />
                </div>
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 1 }}>
                  {visibleUnis.map((u) => (
                    <li key={u.name}>
                      <button onClick={() => addChip("University", u.name)} className="sy-list-row" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, background: uniChip?.v === u.name ? "#f7ebe2" : "none", border: "none", padding: "6px 9px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
                        <span style={{ fontSize: 13, color: "#46423a", fontWeight: 500, lineHeight: 1.3 }}>{u.name}</span>
                        {(uniCounts[u.name] ?? 0) > 0 && (
                          <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 600, color: "#b5562d", background: "#f7ebe2", padding: "1px 7px", borderRadius: 999 }}>{uniCounts[u.name]}</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
                {!showAllUnis && filteredUnis.length > 6 && (
                  <button className="sy-see-all" onClick={() => setShowAllUnis(true)} style={{ marginTop: 8, background: "none", border: "none", padding: "4px 9px", fontSize: 12.5, fontWeight: 600, color: "#0f6f67", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "inherit" }}>
                    See all {filteredUnis.length} universities ›
                  </button>
                )}
                {showAllUnis && !uniSearch && (
                  <button className="sy-see-all" onClick={() => setShowAllUnis(false)} style={{ marginTop: 8, background: "none", border: "none", padding: "4px 9px", fontSize: 12.5, fontWeight: 600, color: "#9a9082", cursor: "pointer", fontFamily: "inherit" }}>
                    Show less ↑
                  </button>
                )}
              </div>
            )}
          </section>
        </aside>

        {/* CENTER */}
        <main style={{ flex: 1, minWidth: 0 }}>

          {/* Source tabs: Journeys vs From Reddit */}
          <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#fff", border: "1px solid #ece6dc", borderRadius: 14, padding: 5, width: "fit-content", boxShadow: "0 1px 2px rgba(40,33,20,0.04)" }}>
            {(["local", "reddit"] as const).map((src) => {
              const active = feedSource === src;
              return (
                <button key={src} onClick={() => setFeedSource(src)} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 18px", borderRadius: 10, border: "none", background: active ? "#0f6f67" : "transparent", color: active ? "#fff" : "#6f685c", fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "background .15s,color .15s" }}>
                  {src === "local" ? (
                    <><IconPencil />Journeys</>
                  ) : (
                    <><span style={{ fontSize: 15 }}>🔺</span>From Reddit</>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── REDDIT FEED ── */}
          {feedSource === "reddit" && (
            <div>
              {/* Reddit sort tabs + search */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
                <div style={{ display: "flex", gap: 6 }}>
                  {(["hot", "top", "new"] as const).map((s) => {
                    const active = redditSort === s;
                    const labels: Record<string, string> = { hot: "🔥 Hot", top: "⭐ Top", new: "🆕 New" };
                    return (
                      <button key={s} onClick={() => { const newSort = s; setRedditSort(newSort); setRedditPosts([]); setRedditFetched(false); }} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 15px", borderRadius: 999, border: active ? "1px solid #ff4500" : "1px solid #e2dccf", background: active ? "#fff1ed" : "#fff", color: active ? "#d93900" : "#6f685c", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all .15s" }}>
                        {labels[s]}
                      </button>
                    );
                  })}
                </div>
                {/* Search within Reddit posts */}
                <div style={{ position: "relative", flex: "0 0 220px" }}>
                  <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", display: "flex" }}><IconSearch size={14} /></span>
                  <input value={redditSearch} onChange={(e) => setRedditSearch(e.target.value)} placeholder="Search these posts…" style={{ width: "100%", height: 36, border: "1px solid #e2dccf", borderRadius: 999, background: "#fff", padding: "0 12px 0 32px", fontSize: 13, fontFamily: "inherit", color: "#221f1b", outline: "none", boxSizing: "border-box" }} />
                  {redditSearch && <button onClick={() => setRedditSearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#9a9082", lineHeight: 1 }}>✕</button>}
                </div>
              </div>

              {/* Loading skeleton */}
              {redditLoading && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} style={{ background: "#fff", border: "1px solid #ece6dc", borderRadius: 16, padding: 20, animation: "pulse 1.4s ease-in-out infinite" }}>
                      <div style={{ height: 14, background: "#f0ebe0", borderRadius: 6, width: "30%", marginBottom: 10 }} />
                      <div style={{ height: 20, background: "#f0ebe0", borderRadius: 6, width: "85%", marginBottom: 8 }} />
                      <div style={{ height: 14, background: "#f0ebe0", borderRadius: 6, width: "60%" }} />
                    </div>
                  ))}
                </div>
              )}

              {/* Error */}
              {!redditLoading && redditError && (
                <div style={{ background: "#fff", border: "1px solid #ece6dc", borderRadius: 16, padding: "32px 24px", textAlign: "center" }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>⚠️</div>
                  <p style={{ color: "#69605a", fontSize: 14, margin: "0 0 16px" }}>{redditError}</p>
                  <button onClick={() => fetchReddit(redditSort)} className="sy-btn-teal" style={{ background: "#0f6f67", color: "#fff", border: "none", borderRadius: 10, padding: "9px 20px", fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                    Try again
                  </button>
                </div>
              )}

              {/* Reddit post cards */}
              {!redditLoading && !redditError && redditPosts.length > 0 && (() => {
                const q = redditSearch.toLowerCase();
                const filtered = q
                  ? redditPosts.filter((p) => p.title.toLowerCase().includes(q) || p.selftext.toLowerCase().includes(q) || p.subreddit.toLowerCase().includes(q))
                  : redditPosts;
                if (filtered.length === 0) return (
                  <div style={{ background: "#fff", border: "1px solid #ece6dc", borderRadius: 16, padding: "36px 24px", textAlign: "center" }}>
                    <p style={{ fontSize: 15, color: "#8a8378", margin: 0 }}>No posts match "<strong>{redditSearch}</strong>"</p>
                    <button onClick={() => setRedditSearch("")} style={{ marginTop: 12, background: "none", border: "1px solid #e2dccf", borderRadius: 8, padding: "7px 16px", fontSize: 13, cursor: "pointer", fontFamily: "inherit", color: "#46423a" }}>Clear search</button>
                  </div>
                );
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {q && <p style={{ fontSize: 12.5, color: "#a89c88", margin: "0 0 2px" }}>{filtered.length} result{filtered.length !== 1 ? "s" : ""} for "{redditSearch}"</p>}
                    {filtered.map((post) => {
                      const daysAgo = Math.floor((Date.now() / 1000 - post.created_utc) / 86400);
                      const timeLabel = daysAgo === 0 ? "today" : daysAgo === 1 ? "yesterday" : `${daysAgo}d ago`;
                      return (
                        <a key={post.id} href={`/stories/reddit/${post.id}`}
                          onClick={() => { try { sessionStorage.setItem(`reddit_post_${post.id}`, JSON.stringify(post)); } catch {} }}
                          className="sy-story-card" style={{ display: "flex", flexDirection: "column", background: "#fff", border: "1px solid #ece6dc", borderRadius: 16, padding: "18px 20px", cursor: "pointer", boxShadow: "0 1px 2px rgba(40,33,20,0.04)", textDecoration: "none", color: "inherit" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 700, color: "#ff4500", background: "#fff1ed", border: "1px solid #ffd7c8", borderRadius: 999, padding: "3px 10px" }}>
                              🔺 r/{post.subreddit}
                            </span>
                            <span style={{ fontSize: 12, color: "#a89c88" }}>u/{post.author}</span>
                            <span style={{ fontSize: 12, color: "#c9c1b6", marginLeft: "auto" }}>{timeLabel}</span>
                          </div>
                          <h3 style={{ fontFamily: "'Newsreader',Georgia,serif", fontSize: 18, fontWeight: 600, color: "#221f1b", margin: "0 0 8px", lineHeight: 1.3, letterSpacing: "-0.01em" }}>
                            {post.title}
                          </h3>
                          {post.selftext && (
                            <p style={{ fontSize: 13.5, color: "#69605a", lineHeight: 1.6, margin: "0 0 14px" }}>
                              {post.selftext}
                            </p>
                          )}
                          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: "auto" }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#0f6f67" }}>Read more →</span>
                            <a href={post.permalink} target="_blank" rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "#ff4500", textDecoration: "none", fontWeight: 600, border: "1px solid #ffd7c8", borderRadius: 999, padding: "3px 10px", background: "#fff1ed" }}>
                              🔺 Open in Reddit
                            </a>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Empty state */}
              {!redditLoading && !redditError && redditPosts.length === 0 && (
                <div style={{ background: "#fff", border: "1px solid #ece6dc", borderRadius: 16, padding: "48px 28px", textAlign: "center" }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
                  <p style={{ fontFamily: "'Newsreader',Georgia,serif", fontSize: 18, fontWeight: 600, color: "#221f1b", margin: "0 0 8px" }}>No posts found</p>
                  <p style={{ fontSize: 14, color: "#8a8378", margin: 0 }}>Try switching to a different sort.</p>
                </div>
              )}

              {/* Attribution */}
              <p style={{ fontSize: 11.5, color: "#b4aca0", textAlign: "center", marginTop: 24, lineHeight: 1.5 }}>
                Posts sourced from Reddit. Content belongs to respective authors. <a href="https://reddit.com" target="_blank" rel="noopener noreferrer" style={{ color: "#ff4500", textDecoration: "none" }}>reddit.com</a>
              </p>
            </div>
          )}

          {/* ── LOCAL JOURNEYS FEED ── */}
          {feedSource === "local" && (
          <div>

          {/* Search bar */}
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <div style={{ flex: 1, position: "relative" }}>
              <span style={{ position: "absolute", left: 15, top: "50%", transform: "translateY(-50%)", display: "flex" }}>
                <IconSearch size={17} />
              </span>
              <input
                placeholder="Search stories, cities, universities, or authors…"
                value={searchInput}
                onChange={(e) => { setSearchInput(e.target.value); setShowSearchDrop(!!e.target.value); }}
                onKeyDown={(e) => { if (e.key === "Enter") doSearch(searchInput); if (e.key === "Escape") setShowSearchDrop(false); }}
                onFocus={() => { if (searchInput) setShowSearchDrop(true); }}
                style={{ width: "100%", height: 48, border: "1px solid #e6dfd2", borderRadius: 13, background: "#fff", padding: "0 16px 0 42px", fontSize: 14.5, fontFamily: "inherit", color: "#221f1b", outline: "none", boxShadow: "0 1px 2px rgba(40,33,20,0.04)" }}
              />
              {searchInput && showSearchDrop && (
                <SearchSuggestions query={searchInput} onSelect={doSearch} onClose={() => setShowSearchDrop(false)} stories={stories} />
              )}
            </div>
            <button onClick={() => doSearch(searchInput)} className="sy-btn-teal" style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", background: "#0f6f67", color: "#fff", border: "none", borderRadius: 13, padding: "0 24px", fontSize: 14.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              Search
            </button>
          </div>

          {/* Filter bar */}
          <div style={{ display: "flex", gap: 10, background: "#fff", border: "1px solid #ece6dc", borderRadius: 14, padding: 10, boxShadow: "0 1px 2px rgba(40,33,20,0.04)" }}>
            {/* University */}
            <div style={{ flex: 1, position: "relative" }}>
              <button onClick={() => setOpenFilter(openFilter === "uni" ? null : "uni")} className="sy-filter-btn" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, height: 42, padding: "0 12px", border: `1px solid ${uniChip ? "#0f6f67" : "#e6dfd2"}`, borderRadius: 10, background: uniChip ? "#e9f0ee" : "#faf8f3", cursor: "pointer", fontFamily: "inherit" }}>
                <span style={{ fontSize: 13, color: uniChip ? "#0b544e" : "#8a8378", fontWeight: uniChip ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {uniChip ? uniChip.v.split(" ").slice(0, 2).join(" ") + "…" : "University"}
                </span>
                <IconChevron rotated={openFilter === "uni"} />
              </button>
              {openFilter === "uni" && (
                <FilterDrop options={UNIS} selected={uniChip?.v || ""} onSelect={(v) => addChip("University", v)} onClose={() => setOpenFilter(null)} counts={uniCounts} />
              )}
            </div>
            {/* City */}
            <div style={{ flex: 1, position: "relative" }}>
              <button onClick={() => setOpenFilter(openFilter === "city" ? null : "city")} className="sy-filter-btn" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, height: 42, padding: "0 12px", border: `1px solid ${cityChip ? "#0f6f67" : "#e6dfd2"}`, borderRadius: 10, background: cityChip ? "#e9f0ee" : "#faf8f3", cursor: "pointer", fontFamily: "inherit" }}>
                <span style={{ fontSize: 13, color: cityChip ? "#0b544e" : "#8a8378", fontWeight: cityChip ? 600 : 400 }}>
                  {cityChip ? cityChip.v : "City"}
                </span>
                <IconChevron rotated={openFilter === "city"} />
              </button>
              {openFilter === "city" && (
                <FilterDrop options={CITIES} selected={cityChip?.v || ""} onSelect={(v) => addChip("City", v)} onClose={() => setOpenFilter(null)} counts={cityCounts} />
              )}
            </div>
            {/* Category */}
            <div style={{ flex: 1, position: "relative" }}>
              <button onClick={() => setOpenFilter(openFilter === "cat" ? null : "cat")} className="sy-filter-btn" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, height: 42, padding: "0 12px", border: `1px solid ${catChip ? "#0f6f67" : "#e6dfd2"}`, borderRadius: 10, background: catChip ? "#e9f0ee" : "#faf8f3", cursor: "pointer", fontFamily: "inherit" }}>
                <span style={{ fontSize: 13, color: catChip ? "#0b544e" : "#8a8378", fontWeight: catChip ? 600 : 400 }}>
                  {catChip ? catChip.v : "Category"}
                </span>
                <IconChevron rotated={openFilter === "cat"} />
              </button>
              {openFilter === "cat" && (
                <FilterDrop options={CATEGORIES.map((c) => ({ name: c }))} selected={catChip?.v || ""} onSelect={(v) => addChip("Category", v)} onClose={() => setOpenFilter(null)} />
              )}
            </div>
          </div>

          {/* Multi-sort chips */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: "#8a8378" }}>Sort by:</span>
            {SORT_OPTIONS.map((opt) => {
              const active = activeSorts.includes(opt.key);
              return (
                <button key={opt.key} onClick={() => toggleSort(opt.key)} className="sy-sort-chip" style={{
                  display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 13px", borderRadius: 999,
                  border: active ? "1px solid #0f6f67" : "1px solid #e2dccf",
                  background: active ? "#e9f0ee" : "#fff",
                  color: active ? "#0b544e" : "#6f685c",
                  fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                }}>
                  {active && <IconCheck />} {opt.label}
                </button>
              );
            })}
          </div>

          {/* Active filter chips */}
          {(chips.length > 0 || searchActive) && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              {searchActive && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 600, color: "#0b544e", background: "#eef3f1", border: "1px solid #d9e6e2", padding: "4px 6px 4px 11px", borderRadius: 999 }}>
                  Search: {searchActive}
                  <button onClick={() => { setSearchActive(""); setSearchInput(""); }} className="sy-chip-x" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 17, height: 17, borderRadius: 999, border: "none", background: "#d9e6e2", color: "#0b544e", cursor: "pointer", padding: 0 }}>
                    <IconClose />
                  </button>
                </span>
              )}
              {chips.map((chip, i) => (
                <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 600, color: "#0b544e", background: "#eef3f1", border: "1px solid #d9e6e2", padding: "4px 6px 4px 11px", borderRadius: 999 }}>
                  {chip.k}: {chip.v}
                  <button onClick={() => removeChip(i)} className="sy-chip-x" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 17, height: 17, borderRadius: 999, border: "none", background: "#d9e6e2", color: "#0b544e", cursor: "pointer", padding: 0 }}>
                    <IconClose />
                  </button>
                </span>
              ))}
              <button onClick={clearAll} className="sy-clear-all" style={{ background: "none", border: "none", fontSize: 12.5, fontWeight: 600, color: "#9a9082", cursor: "pointer", padding: "4px 6px", fontFamily: "inherit" }}>
                Clear all
              </button>
            </div>
          )}

          {/* Headline */}
          <h1 style={{ fontFamily: "'Newsreader',Georgia,serif", fontSize: 31, fontWeight: 600, color: "#221f1b", margin: "22px 0 4px", letterSpacing: "-0.01em" }}>{headline}</h1>
          <p style={{ fontSize: 14, color: "#8a8378", margin: "0 0 22px" }}>{headlineSub}</p>

          {/* Story cards */}
          {storiesLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{ background: "#fff", border: "1px solid #ece6dc", borderRadius: 18, padding: "22px 24px", animation: "pulse 1.4s ease-in-out infinite" }}>
                  <div style={{ height: 12, background: "#f0ebe0", borderRadius: 6, width: "25%", marginBottom: 14 }} />
                  <div style={{ height: 22, background: "#f0ebe0", borderRadius: 6, width: "80%", marginBottom: 10 }} />
                  <div style={{ height: 14, background: "#f0ebe0", borderRadius: 6, width: "65%", marginBottom: 16 }} />
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ height: 26, background: "#f0ebe0", borderRadius: 999, width: 70 }} />
                    <div style={{ height: 26, background: "#f0ebe0", borderRadius: 999, width: 55 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : visibleStories.length === 0 ? (
            <div style={{ background: "#fff", border: "1px solid #ece6dc", borderRadius: 18, padding: "48px 28px", textAlign: "center" }}>
              {(cityChip || uniChip || catChip || searchActive) ? (
                <>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
                  <p style={{ fontFamily: "'Newsreader',Georgia,serif", fontSize: 18, fontWeight: 600, color: "#221f1b", margin: "0 0 8px" }}>No stories match these filters</p>
                  <p style={{ fontSize: 13.5, color: "#8a8378", margin: "0 0 18px", lineHeight: 1.5 }}>Try removing a filter or be the first to share a story from this area.</p>
                  <button onClick={clearAll} style={{ background: "none", border: "1px solid #e2dccf", color: "#0f6f67", fontWeight: 600, cursor: "pointer", fontSize: 13.5, fontFamily: "inherit", borderRadius: 10, padding: "8px 18px" }}>Clear filters</button>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 36, marginBottom: 14 }}>✍️</div>
                  <p style={{ fontFamily: "'Newsreader',Georgia,serif", fontSize: 20, fontWeight: 600, color: "#221f1b", margin: "0 0 10px", lineHeight: 1.25 }}>Stories are just getting started</p>
                  <p style={{ fontSize: 14, color: "#8a8378", margin: "0 0 22px", lineHeight: 1.55, maxWidth: 320, marginLeft: "auto", marginRight: "auto" }}>Be the first to share your experience. Someone new to the U.S. is looking for exactly what you have been through.</p>
                  <button onClick={onShareStory} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#0f6f67", color: "#fff", border: "none", borderRadius: 11, padding: "11px 22px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 14px rgba(15,111,103,0.3)" }}>
                    <IconPencil /> Share your story
                  </button>
                </>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {visibleStories.map((s) => {
                const idx = stories.indexOf(s);
                const voted = s.id ? votedIds.has(s.id) : false;
                const CardEl = s.id ? "a" : "article";
                return (
                  <CardEl key={idx} {...(s.id ? { href: `/stories/${s.id}` } : {})} className="sy-story-card" style={{ display: "flex", gap: 18, background: "#fff", border: "1px solid #ece6dc", borderRadius: 16, padding: 18, cursor: "pointer", boxShadow: "0 1px 2px rgba(40,33,20,0.04)", textDecoration: "none", color: "inherit" }}>
                    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 9 }}>
                        {s.tags.map((t, ti) => (
                          <span key={ti} style={{ display: "inline-flex", alignItems: "center", fontSize: 11, fontWeight: 600, letterSpacing: "0.01em", padding: "3px 9px", borderRadius: 999, background: t.bg, color: t.fg }}>{t.label}</span>
                        ))}
                      </div>
                      <h3 style={{ fontFamily: "'Newsreader',Georgia,serif", fontSize: 21, fontWeight: 600, lineHeight: 1.25, color: "#221f1b", margin: 0 }}>{s.title}</h3>
                      <p style={{ fontSize: 14, color: "#5f594f", lineHeight: 1.6, margin: "7px 0 0", display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2, overflow: "hidden" }}>{s.excerpt}</p>
                      <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 14 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                          {s.author.named ? (
                            <>
                              <span style={{ width: 24, height: 24, borderRadius: 999, background: (s.author as { color: string }).color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10.5, fontWeight: 700 }}>{(s.author as { initials: string }).initials}</span>
                              <span style={{ fontSize: 13, color: "#46423a", fontWeight: 600 }}>{(s.author as { name: string }).name}</span>
                            </>
                          ) : (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "#6f685c", background: "#f1ece3", padding: "3px 10px 3px 8px", borderRadius: 999 }}>
                              <span style={{ width: 16, height: 16, borderRadius: 999, background: "#ddd6c8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9 }}>?</span>
                              Anonymous
                            </span>
                          )}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                          <button className="sy-upvote-pill" onClick={(e) => { e.stopPropagation(); if (s.id) onToggleVote(s.id, idx); }} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: voted ? "#e9f0ee" : "#fff", border: voted ? "1px solid #0f6f67" : "1px solid #e2dccf", borderRadius: 999, padding: "5px 12px", fontSize: 13, fontWeight: 600, color: "#0b544e", cursor: "pointer", fontFamily: "inherit" }}>
                            <span style={{ fontSize: 11, lineHeight: 1 }}>▲</span> {upvoteCounts[idx] ?? 0}
                          </button>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, color: "#8a8378" }}><IconComment /> {s.comments}</span>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, color: "#8a8378" }}><IconClock /> {s.readTime} min</span>
                        </div>
                      </div>
                    </div>
                  </CardEl>
                );
              })}
            </div>
          )}

          {/* Load more */}
          <div style={{ display: "flex", justifyContent: "center", marginTop: 26 }}>
            {hasMore ? (
              <button onClick={() => setDisplayCount((n) => n + 2)} className="sy-load-more" style={{ background: "#fff", border: "1px solid #d6cfc0", borderRadius: 12, padding: "12px 26px", fontSize: 14, fontWeight: 600, color: "#0b544e", cursor: "pointer", fontFamily: "inherit" }}>
                Load more journeys
              </button>
            ) : sortedStories.length > 0 ? (
              <span style={{ fontSize: 13.5, color: "#9a9082", fontWeight: 500 }}>You&rsquo;re all caught up ✓</span>
            ) : null}
          </div>

          </div>
          )}
        </main>

        {/* RIGHT SIDEBAR */}
        <aside style={{ flex: "0 0 300px", display: "flex", flexDirection: "column", gap: 18 }}>
          <section style={{ background: "#fff", border: "1px solid #ece6dc", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 2px rgba(40,33,20,0.04)" }}>
            <div style={{ padding: "16px 16px 0" }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: "#221f1b", margin: "0 0 12px" }}>Trending Journeys</h4>
            </div>
            <div style={{ display: "flex", padding: "0 10px", borderBottom: "1px solid #ece6dc" }}>
              {(["trending", "top", "new"] as TrendTab[]).map((tab) => {
                const labels: Record<TrendTab, string> = { trending: "🔥 Trending", top: "⭐ Top", new: "🆕 New" };
                const active = trendTab === tab;
                return (
                  <button key={tab} onClick={() => setTrendTab(tab)} style={{ flex: 1, background: "none", border: "none", borderBottom: active ? "2px solid #0f6f67" : "2px solid transparent", padding: "10px 2px 11px", fontSize: 12, fontWeight: 600, color: active ? "#0b544e" : "#9a9082", cursor: "pointer", fontFamily: "inherit", transition: "color .15s" }}>
                    {labels[tab]}
                  </button>
                );
              })}
            </div>
            <div style={{ padding: 7, display: "flex", flexDirection: "column", gap: 1 }}>
              {trendData[trendTab].length === 0 ? (
                <div style={{ padding: "20px 10px", textAlign: "center" }}>
                  <p style={{ fontSize: 13, color: "#b0a898", margin: 0, lineHeight: 1.5 }}>No stories yet.<br />Be the first to share.</p>
                </div>
              ) : trendData[trendTab].map((ti) => (
                <a key={ti.id} href={`/stories/${ti.id}`} className="sy-trend-item" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 11, background: "none", border: "none", padding: "9px 9px", borderRadius: 11, cursor: "pointer", textAlign: "left", fontFamily: "inherit", width: "100%" }}>
                  <span style={{ flexShrink: 0, position: "relative", width: 46, height: 46, borderRadius: 9, overflow: "hidden", border: "1px solid #ece6dc" }}>
                    <span style={{ position: "absolute", inset: 0, background: PLACEHOLDER_BG }} />
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "-webkit-box", fontSize: 13, fontWeight: 600, color: "#2c2823", lineHeight: 1.3, overflow: "hidden", WebkitBoxOrient: "vertical", WebkitLineClamp: 2 }}>{ti.title}</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, color: "#9a9082", fontWeight: 600, marginTop: 3 }}>
                      <span style={{ color: "#0f6f67", fontSize: 9 }}>▲</span> {ti.votes}
                    </span>
                  </span>
                </a>
              ))}
            </div>
          </section>

          <section style={{ background: "linear-gradient(160deg,#fbf1e9,#f8ebe2)", border: "1px solid #f0ddcf", borderRadius: 16, padding: 20 }}>
            <p style={{ fontFamily: "'Newsreader',Georgia,serif", fontSize: 17, fontWeight: 600, color: "#7d3f1d", margin: "0 0 6px", lineHeight: 1.35 }}>Your journey matters here.</p>
            <p style={{ fontSize: 13, color: "#8a6a50", margin: "0 0 14px", lineHeight: 1.5 }}>Whatever stage you&rsquo;re at, someone behind you is looking for exactly your experience.</p>
            <button onClick={onShareStory} className="sy-btn-terra" style={{ width: "100%", background: "#d4703f", color: "#fff", border: "none", borderRadius: 11, padding: 10, fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              Share your story
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   MY STORIES VIEW
═══════════════════════════════════════ */
function MyStoriesView({ user, onBack, onEdit }: {
  user: { id: string; email?: string } | null;
  onBack: () => void;
  onEdit: (story: EditableStory) => void;
}) {
  const [myStories, setMyStories] = useState<EditableStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!user) return;
    // Reading user_id is blocked for the public, so the owner's list comes from a SECURITY DEFINER function.
    supabase.rpc("my_stories")
      .then(({ data }) => { setMyStories((data ?? []) as EditableStory[]); setLoading(false); });
  }, [user]);

  const deleteStory = async (id: string) => {
    if (!window.confirm("Delete this story? This cannot be undone.")) return;
    setDeleting(id);
    await supabase.from("stories").delete().eq("id", id);
    setMyStories((prev) => prev.filter((s) => s.id !== id));
    setDeleting(null);
    setToast("Story deleted.");
  };

  function msTimeAgo(iso: string) {
    const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
    return days === 0 ? "Today" : days === 1 ? "Yesterday" : `${days} days ago`;
  }

  return (
    <div className="sy-frame">
      {toast && <Toast msg={toast} onDone={() => setToast("")} />}
      <button onClick={onBack} className="sy-back-btn" style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "none", border: "none", fontSize: 13.5, fontWeight: 600, color: "#8a8378", cursor: "pointer", padding: 0, marginBottom: 28, fontFamily: "inherit" }}>
        <IconBack /> Back to journeys
      </button>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <h2 style={{ fontFamily: "'Newsreader',Georgia,serif", fontSize: 30, fontWeight: 600, color: "#1f1c18", margin: "0 0 6px", letterSpacing: "-0.01em" }}>My Journeys</h2>
        <p style={{ fontSize: 14.5, color: "#8a8378", margin: "0 0 26px" }}>Stories you&rsquo;ve shared. Edit or delete anytime.</p>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ background: "#fff", border: "1px solid #ece6dc", borderRadius: 16, padding: "18px 20px", animation: "pulse 1.4s ease-in-out infinite" }}>
                <div style={{ height: 12, background: "#f0ebe0", borderRadius: 6, width: "20%", marginBottom: 10 }} />
                <div style={{ height: 20, background: "#f0ebe0", borderRadius: 6, width: "75%", marginBottom: 8 }} />
                <div style={{ height: 13, background: "#f0ebe0", borderRadius: 6, width: "55%" }} />
              </div>
            ))}
          </div>
        ) : myStories.length === 0 ? (
          <div style={{ background: "#fff", border: "1px solid #ece6dc", borderRadius: 18, padding: "48px 28px", textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 14 }}>✍️</div>
            <p style={{ fontFamily: "'Newsreader',Georgia,serif", fontSize: 20, fontWeight: 600, color: "#221f1b", margin: "0 0 10px" }}>No stories yet</p>
            <p style={{ fontSize: 14, color: "#8a8378", margin: "0 0 22px", lineHeight: 1.55 }}>Share your first journey — someone new to the U.S. is looking for exactly your experience.</p>
            <button onClick={onBack} className="sy-btn-teal" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#0f6f67", color: "#fff", border: "none", borderRadius: 11, padding: "11px 22px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              Back to feed
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {myStories.map((s) => (
              <div key={s.id} style={{ background: "#fff", border: "1px solid #ece6dc", borderRadius: 16, padding: "18px 20px", display: "flex", alignItems: "flex-start", gap: 14 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                    {s.category && <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: "#e6f0ee", color: "#0b544e" }}>{s.category}</span>}
                    {s.city && <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 999, background: "#f1ece3", color: "#6f685c" }}>📍 {s.city}</span>}
                    {s.anon && <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 999, background: "#f5f0e8", color: "#8a8378" }}>Anonymous</span>}
                  </div>
                  <h3 style={{ fontFamily: "'Newsreader',Georgia,serif", fontSize: 19, fontWeight: 600, color: "#221f1b", margin: "0 0 6px", lineHeight: 1.25 }}>{s.title}</h3>
                  {s.excerpt && <p style={{ fontSize: 13.5, color: "#69605a", margin: 0, lineHeight: 1.55, display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2, overflow: "hidden" }}>{s.excerpt}</p>}
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 10, fontSize: 12.5, color: "#9a9082" }}>
                    <span>{msTimeAgo(s.created_at)}</span>
                    <span>▲ {s.upvotes} upvotes</span>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
                  <button onClick={() => onEdit(s)} className="sy-ms-edit" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 9, border: "1px solid #d6cfc0", background: "#fff", fontSize: 13, fontWeight: 600, color: "#0f6f67", cursor: "pointer", fontFamily: "inherit", transition: "all .15s" }}>
                    ✏️ Edit
                  </button>
                  <button onClick={() => deleteStory(s.id)} disabled={deleting === s.id} className="sy-ms-delete" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 9, border: "1px solid #d6cfc0", background: "#fff", fontSize: 13, fontWeight: 600, color: "#8a8378", cursor: deleting === s.id ? "default" : "pointer", fontFamily: "inherit", transition: "all .15s", opacity: deleting === s.id ? 0.5 : 1 }}>
                    {deleting === s.id ? "Deleting…" : "🗑 Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   FORM VIEW
═══════════════════════════════════════ */
function sanitizeStoryHtml(html: string): string {
  if (typeof document === "undefined") return "";
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  tmp.querySelectorAll("script,style,iframe,object,embed,form,meta,link").forEach((el) => el.remove());
  tmp.querySelectorAll("*").forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();
      const val = attr.value.trim().toLowerCase();
      if (name.startsWith("on") || /^(javascript|data|vbscript):/.test(val)) {
        el.removeAttribute(attr.name);
      }
    });
  });
  return tmp.innerHTML;
}

function FormView({ onBack, onPublish, user, initialData, uniCounts, cityCounts }: { onBack: () => void; onPublish: (story: Story, editedId?: string) => void; user: { id: string; email?: string; user_metadata?: Record<string, string> } | null; initialData?: EditableStory; uniCounts: Record<string, number>; cityCounts: Record<string, number> }) {
  const isEdit = !!initialData?.id;
  const [anon, setAnon] = useState(initialData?.anon ?? true);
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [uniQuery, setUniQuery] = useState(initialData?.uni ?? "");
  const [cityQuery, setCityQuery] = useState(initialData?.city ?? "");
  const [showUniDrop, setShowUniDrop] = useState(false);
  const [showCityDrop, setShowCityDrop] = useState(false);
  const [selectedUni, setSelectedUni] = useState(initialData?.uni ?? "");
  const [selectedCity, setSelectedCity] = useState(initialData?.city ?? "");
  const [selectedCategory, setSelectedCategory] = useState(initialData?.category ?? "");
  const [catOpen, setCatOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState("");
  const editorRef = useRef<HTMLDivElement>(null);
  const catRef = useRef<HTMLDivElement>(null);
  const uniRef = useRef<HTMLDivElement>(null);
  const cityRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (catRef.current && !catRef.current.contains(e.target as Node)) setCatOpen(false);
      if (uniRef.current && !uniRef.current.contains(e.target as Node)) setShowUniDrop(false);
      if (cityRef.current && !cityRef.current.contains(e.target as Node)) setShowCityDrop(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    if (initialData?.body_html && editorRef.current) {
      editorRef.current.innerHTML = sanitizeStoryHtml(initialData.body_html);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const uniSuggestions = uniQuery ? UNIS.filter((u) => u.name.toLowerCase().includes(uniQuery.toLowerCase())).slice(0, 5) : [];
  const citySuggestions = cityQuery ? CITIES.filter((c) => c.name.toLowerCase().includes(cityQuery.toLowerCase())).slice(0, 5) : [];

  const highlight = (text: string, query: string) => {
    if (!query) return <>{text}</>;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return <>{text}</>;
    return <>{text.slice(0, idx)}<span style={{ fontWeight: 700, color: "#0f6f67" }}>{text.slice(idx, idx + query.length)}</span>{text.slice(idx + query.length)}</>;
  };

  const execCmd = useCallback((cmd: string, value?: string) => { editorRef.current?.focus(); document.execCommand(cmd, false, value); }, []);
  const handleLink = () => {
    const url = window.prompt("Enter URL:");
    if (!url) return;
    // Reject javascript: and data: scheme links
    if (/^(javascript|data|vbscript):/i.test(url.trim())) return;
    execCmd("createLink", url);
  };
  const handleImageInsert = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { editorRef.current?.focus(); document.execCommand("insertImage", false, ev.target?.result as string); };
    reader.readAsDataURL(file); e.target.value = "";
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = "Title is required.";
    if (!(editorRef.current?.innerText?.trim())) errs.body = "Story body is required.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const saveDraft = () => setToast("Draft saved!");
  const publish = async () => {
    if (!validate()) return;
    const bodyText = editorRef.current?.innerText?.trim() ?? "";
    const bodyHtml = sanitizeStoryHtml(editorRef.current?.innerHTML ?? "");
    const excerpt = bodyText.slice(0, 160) + (bodyText.length > 160 ? "…" : "");
    const wordCount = bodyText.split(/\s+/).filter(Boolean).length;
    const readTime = Math.max(1, Math.round(wordCount / 200));
    const displayName = anon
      ? null
      : (user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0] || "Member");
    const story: Story = {
      title: title.trim(),
      excerpt,
      author: anon
        ? { named: false, anon: true }
        : { named: true, anon: false, name: displayName || "Member", initials: (displayName || "M")[0].toUpperCase(), color: "#0f6f67" },
      tags: selectedCategory ? [tag(selectedCategory, "teal")] : [],
      upvotes: 0,
      comments: 0,
      readTime,
      city: selectedCity || "",
      uni: selectedUni || "",
      category: selectedCategory || "",
      daysAgo: 0,
    };
    if (!user) { setToast("Please sign in to share your story."); return; }
    const { error } = isEdit && initialData?.id
      ? await supabase.from("stories").update({
          title: title.trim(), excerpt, body_html: bodyHtml,
          category: selectedCategory || null, city: selectedCity || null,
          uni: selectedUni || null, anon, read_time: readTime, display_name: displayName,
        }).eq("id", initialData.id)
      : await supabase.from("stories").insert({
          user_id: user.id, title: title.trim(), excerpt, body_html: bodyHtml,
          category: selectedCategory || null, city: selectedCity || null,
          uni: selectedUni || null, anon, read_time: readTime, display_name: displayName,
        });
    // Only report success once the story is actually saved.
    if (error) { setToast("Couldn't save your story. Please try again."); return; }
    setToast(isEdit ? "Story updated!" : "Story published!");
    setTimeout(() => onPublish(story, isEdit ? initialData?.id : undefined), 1400);
  };

  return (
    <div className="sy-frame">
      {toast && <Toast msg={toast} onDone={() => setToast("")} />}
      <button onClick={onBack} className="sy-back-btn" style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "none", border: "none", fontSize: 13.5, fontWeight: 600, color: "#8a8378", cursor: "pointer", padding: 0, marginBottom: 28, fontFamily: "inherit" }}>
        <IconBack /> Back to journeys
      </button>

      <div style={{ maxWidth: 680, margin: "0 auto", background: "#fff", border: "1px solid #ece6dc", borderRadius: 18, padding: 36, boxShadow: "0 2px 8px rgba(40,33,20,0.04)" }}>
        <h2 style={{ fontFamily: "'Newsreader',Georgia,serif", fontSize: 30, fontWeight: 600, color: "#1f1c18", margin: "0 0 6px", letterSpacing: "-0.01em" }}>{isEdit ? "Edit your story" : "Share your story"}</h2>
        <p style={{ fontSize: 14.5, color: "#8a8378", margin: "0 0 30px", lineHeight: 1.5 }}>{isEdit ? "Update your story below. Changes will be live immediately." : "Your experience could be the thing that helps someone else feel less alone. Take your time — there’s no wrong way to tell it."}</p>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: "#3a362f", marginBottom: 8 }}>Title</label>
          <input placeholder="Give your story a title" value={title} onChange={(e) => { setTitle(e.target.value); if (errors.title) setErrors((er) => ({ ...er, title: "" })); }}
            style={{ width: "100%", height: 46, border: `1px solid ${errors.title ? "#e87070" : "#e2dccf"}`, borderRadius: 11, background: "#faf8f3", padding: "0 15px", fontSize: 15, fontFamily: "inherit", color: "#221f1b", outline: "none" }} />
          {errors.title && <p style={{ fontSize: 12.5, color: "#c0392b", margin: "5px 2px 0" }}>{errors.title}</p>}
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: "#3a362f", marginBottom: 8 }}>Your story</label>
          <div style={{ border: `1px solid ${errors.body ? "#e87070" : "#e2dccf"}`, borderRadius: 11, background: "#fff" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 2, padding: "7px 8px", borderBottom: "1px solid #ece6dc", background: "#faf8f3", borderRadius: "11px 11px 0 0" }}>
              <button className="sy-toolbar-btn" onMouseDown={(e) => { e.preventDefault(); execCmd("bold"); }} style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "none", cursor: "pointer", fontSize: 15, fontWeight: 800, color: "#46423a", fontFamily: "Georgia,serif" }}>B</button>
              <button className="sy-toolbar-btn" onMouseDown={(e) => { e.preventDefault(); execCmd("italic"); }} style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "none", cursor: "pointer", fontSize: 15, fontStyle: "italic", color: "#46423a", fontFamily: "Georgia,serif" }}>I</button>
              <span style={{ width: 1, height: 18, background: "#ddd6c8", margin: "0 4px" }} />
              <button className="sy-toolbar-btn" onMouseDown={(e) => { e.preventDefault(); execCmd("insertUnorderedList"); }} style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><IconList /></button>
              <button className="sy-toolbar-btn" onMouseDown={(e) => { e.preventDefault(); execCmd("formatBlock", "blockquote"); }} style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "none", cursor: "pointer", fontSize: 18, color: "#46423a", fontFamily: "Georgia,serif", lineHeight: 1 }}>&ldquo;</button>
              <button className="sy-toolbar-btn" onMouseDown={(e) => { e.preventDefault(); handleLink(); }} style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><IconLink /></button>
              <span style={{ width: 1, height: 18, background: "#ddd6c8", margin: "0 4px" }} />
              <button className="sy-toolbar-btn" onClick={() => photoInputRef.current?.click()} style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 32, padding: "0 10px", borderRadius: 8, border: "none", background: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: "#0f6f67", fontFamily: "inherit" }}>
                <IconPhoto color="#0f6f67" /> Image
              </button>
              <input ref={photoInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageInsert} />
            </div>
            <div ref={editorRef} contentEditable suppressContentEditableWarning onInput={() => { if (errors.body) setErrors((er) => ({ ...er, body: "" })); }}
              data-placeholder="Start where it feels natural. What happened, how it felt, what you'd tell someone going through the same thing…"
              style={{ minHeight: 170, padding: 15, fontSize: 15, lineHeight: 1.7, color: "#221f1b", outline: "none", fontFamily: "'Public Sans',system-ui,sans-serif" }} />
          </div>
          {errors.body && <p style={{ fontSize: 12.5, color: "#c0392b", margin: "5px 2px 0" }}>{errors.body}</p>}
        </div>

        <div style={{ marginBottom: 24 }} ref={catRef}>
          <label style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: "#3a362f", marginBottom: 8 }}>Category</label>
          <div style={{ position: "relative" }}>
            <button onClick={() => setCatOpen((o) => !o)} className="sy-filter-btn" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", height: 46, border: "1px solid #e2dccf", borderRadius: 11, background: selectedCategory ? "#fff" : "#faf8f3", padding: "0 15px", cursor: "pointer", fontFamily: "inherit" }}>
              <span style={{ fontSize: 14.5, color: selectedCategory ? "#221f1b" : "#a8a195", fontWeight: selectedCategory ? 500 : 400 }}>{selectedCategory || "Choose a category"}</span>
              <IconChevron rotated={catOpen} />
            </button>
            {catOpen && (
              <div style={{ position: "absolute", left: 0, right: 0, top: "calc(100% + 6px)", background: "#fff", border: "1px solid #e2dccf", borderRadius: 12, boxShadow: "0 12px 30px rgba(40,33,20,0.12)", overflow: "hidden", zIndex: 10 }}>
                {CATEGORIES.map((cat) => (
                  <button key={cat} className="sy-drop-item" onClick={() => { setSelectedCategory(cat); setCatOpen(false); }} style={{ width: "100%", padding: "10px 15px", background: selectedCategory === cat ? "#f4f0e8" : "none", border: "none", fontSize: 14, color: "#221f1b", cursor: "pointer", textAlign: "left", fontFamily: "inherit", fontWeight: selectedCategory === cat ? 600 : 400 }}>{cat}</button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ marginBottom: 24, position: "relative" }} ref={uniRef}>
          <label style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: "#3a362f", marginBottom: 8 }}>
            Tag your university <span style={{ color: "#a8a195", fontWeight: 500 }}>(optional)</span>
          </label>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", display: "flex" }}><IconSearch size={15} /></span>
            <input value={selectedUni || uniQuery} onChange={(e) => { setUniQuery(e.target.value); setSelectedUni(""); setShowUniDrop(true); }} onFocus={() => { if (uniQuery) setShowUniDrop(true); }} placeholder="Search all 25 universities…"
              style={{ width: "100%", height: 46, border: `1px solid ${showUniDrop && uniQuery ? "#0f6f67" : "#e2dccf"}`, borderRadius: 11, background: "#fff", padding: "0 15px 0 38px", fontSize: 14.5, fontFamily: "inherit", color: "#221f1b", outline: "none" }} />
            {selectedUni && <button onClick={() => { setSelectedUni(""); setUniQuery(""); }} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9a9082", padding: 4 }}><IconClose /></button>}
          </div>
          {showUniDrop && uniSuggestions.length > 0 && (
            <div style={{ position: "absolute", left: 0, right: 0, top: "100%", marginTop: 6, background: "#fff", border: "1px solid #e2dccf", borderRadius: 12, boxShadow: "0 12px 30px rgba(40,33,20,0.12)", overflow: "hidden", zIndex: 5 }}>
              {uniSuggestions.map((u, i) => (
                <button key={u.name} className="sy-list-row" onClick={() => { setSelectedUni(u.name); setUniQuery(u.name); setShowUniDrop(false); }} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 15px", background: i === 0 ? "#fafaf7" : "#fff", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}>
                  <span style={{ fontSize: 14, color: "#221f1b" }}>{highlight(u.name, uniQuery)}</span>
                  {(uniCounts[u.name] ?? 0) > 0 && (
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: "#0b544e", background: "#e9f0ee", padding: "1px 8px", borderRadius: 999 }}>{uniCounts[u.name]}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginBottom: 26, position: "relative" }} ref={cityRef}>
          <label style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: "#3a362f", marginBottom: 8 }}>
            Tag your city <span style={{ color: "#a8a195", fontWeight: 500 }}>(optional)</span>
          </label>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", display: "flex" }}><IconSearch size={15} /></span>
            <input value={selectedCity || cityQuery} onChange={(e) => { setCityQuery(e.target.value); setSelectedCity(""); setShowCityDrop(true); }} onFocus={() => { if (cityQuery) setShowCityDrop(true); }} placeholder="Start typing a city…"
              style={{ width: "100%", height: 46, border: `1px solid ${showCityDrop && cityQuery ? "#0f6f67" : "#e2dccf"}`, borderRadius: 11, background: "#faf8f3", padding: "0 15px 0 38px", fontSize: 14.5, fontFamily: "inherit", color: "#221f1b", outline: "none" }} />
            {selectedCity && <button onClick={() => { setSelectedCity(""); setCityQuery(""); }} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9a9082", padding: 4 }}><IconClose /></button>}
          </div>
          {showCityDrop && citySuggestions.length > 0 && (
            <div style={{ position: "absolute", left: 0, right: 0, top: "100%", marginTop: 6, background: "#fff", border: "1px solid #e2dccf", borderRadius: 12, boxShadow: "0 12px 30px rgba(40,33,20,0.12)", overflow: "hidden", zIndex: 5 }}>
              {citySuggestions.map((c, i) => (
                <button key={c.name} className="sy-list-row" onClick={() => { setSelectedCity(c.name); setCityQuery(c.name); setShowCityDrop(false); }} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 15px", background: i === 0 ? "#fafaf7" : "#fff", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}>
                  <span style={{ fontSize: 14, color: "#221f1b" }}>{highlight(c.name, cityQuery)}</span>
                  {(cityCounts[c.name] ?? 0) > 0 && (
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: "#0b544e", background: "#e9f0ee", padding: "1px 8px", borderRadius: 999 }}>{cityCounts[c.name]}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, background: "#faf8f3", border: "1px solid #ece6dc", borderRadius: 13, padding: "16px 18px", marginBottom: 30 }}>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 600, color: "#221f1b" }}>Post anonymously</div>
            <div style={{ fontSize: 13, color: "#8a8378", marginTop: 2 }}>Your name and avatar won&rsquo;t be shown on this story.</div>
          </div>
          <button onClick={() => setAnon((a) => !a)} style={{ flexShrink: 0, width: 48, height: 28, borderRadius: 999, border: "none", cursor: "pointer", padding: 0, position: "relative", background: anon ? "#0f6f67" : "#d8d2c6", transition: "background .2s" }}>
            <span style={{ position: "absolute", top: 3, left: 3, width: 22, height: 22, borderRadius: 999, background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transform: anon ? "translateX(20px)" : "translateX(0)", transition: "transform .2s" }} />
          </button>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <button onClick={saveDraft} className="sy-draft-btn" style={{ background: "#fff", border: "1px solid #d6cfc0", borderRadius: 11, padding: "12px 22px", fontSize: 14, fontWeight: 600, color: "#46423a", cursor: "pointer", fontFamily: "inherit" }}>Save as draft</button>
          <button onClick={publish} className="sy-btn-teal" style={{ background: "#0f6f67", border: "none", borderRadius: 11, padding: "12px 26px", fontSize: 14, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "inherit", boxShadow: "0 2px 8px rgba(15,111,103,0.25)" }}>{isEdit ? "Save changes" : "Publish story"}</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   MAIN
═══════════════════════════════════════ */
const NUDGE_KEY = "ygiu_stories_nudge_dismissed";

export default function StoriesClient() {
  const [view, setView] = useState<View>("feed");
  const [editStory, setEditStory] = useState<EditableStory | null>(null);
  const [toast, setToast] = useState("");
  const [stories, setStories] = useState<Story[]>(EMPTY_STORIES);
  const [storiesLoading, setStoriesLoading] = useState(true);
  const uniCounts = useMemo(() => countBy(stories, "uni"), [stories]);
  const cityCounts = useMemo(() => countBy(stories, "city"), [stories]);
  const [upvoteCounts, setUpvoteCounts] = useState<number[]>([]);
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const [nudgeVisible, setNudgeVisible] = useState(false);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [nudge2Dismissed, setNudge2Dismissed] = useState(false);
  const [user, setUser] = useState<{ id: string; email?: string; user_metadata?: Record<string, string> } | null>(null);
  const [showLoginWall, setShowLoginWall] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    return () => listener.subscription.unsubscribe();
  }, []);

  const loadStories = useCallback(async () => {
    setStoriesLoading(true);
    try {
      const [storiesRes, sessionRes] = await Promise.all([
        supabase.from("stories").select(PUBLIC_STORY_COLUMNS).order("created_at", { ascending: false }).limit(100),
        supabase.auth.getSession(),
      ]);
      if (!storiesRes.error && storiesRes.data) {
        const loaded = storiesRes.data.map(dbRowToStory);
        setStories(loaded);
        setUpvoteCounts(loaded.map((s) => s.upvotes));
      }
      const uid = sessionRes.data.session?.user?.id;
      if (uid) {
        const { data: votes } = await supabase.from("story_votes").select("story_id").eq("user_id", uid);
        if (votes) setVotedIds(new Set(votes.map((v: Record<string, string>) => v.story_id)));
      }
    } finally {
      setStoriesLoading(false);
    }
  }, []);

  useEffect(() => { loadStories(); }, [loadStories]);

  const openForm = useCallback(() => {
    if (!user) { setShowLoginWall(true); return; }
    setEditStory(null);
    setView("form");
  }, [user]);

  useEffect(() => {
    const dismissed = typeof window !== "undefined" && localStorage.getItem(NUDGE_KEY) === "1";
    if (dismissed) { setNudgeDismissed(true); setNudge2Dismissed(true); return; }
    const t = setTimeout(() => setNudgeVisible(true), 1800);
    return () => clearTimeout(t);
  }, []);

  const dismissNudge = () => {
    setNudgeDismissed(true);
    if (typeof window !== "undefined") localStorage.setItem(NUDGE_KEY, "1");
  };
  const dismissNudge2 = () => setNudge2Dismissed(true);

  const toggleStoryVote = useCallback(async (storyId: string, idx: number) => {
    if (!user) { setShowLoginWall(true); return; }
    const wasVoted = votedIds.has(storyId);
    // Optimistic update
    setVotedIds((prev) => { const next = new Set(prev); wasVoted ? next.delete(storyId) : next.add(storyId); return next; });
    setUpvoteCounts((prev) => prev.map((v, i) => i === idx ? v + (wasVoted ? -1 : 1) : v));
    // Persist
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await fetch("/api/stories/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ story_id: storyId, vote: !wasVoted }),
    });
  }, [user, votedIds]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      {toast && <Toast msg={toast} onDone={() => setToast("")} />}
      <div className="sy-page">
        <Nav />
        <div style={{ padding: "90px clamp(20px,3vw,60px) 60px" }}>
          {view === "feed" && (
            <FeedView
              onShareStory={openForm}
              onMyStories={() => setView("mystories")}
              upvoteCounts={upvoteCounts}
              votedIds={votedIds}
              onToggleVote={toggleStoryVote}
              stories={stories}
              storiesLoading={storiesLoading}
              user={user}
            />
          )}
          {view === "mystories" && (
            <MyStoriesView
              user={user}
              onBack={() => setView("feed")}
              onEdit={(story) => { setEditStory(story); setView("form"); }}
            />
          )}
          {view === "form" && (
            <FormView
              onBack={() => editStory ? setView("mystories") : setView("feed")}
              user={user}
              uniCounts={uniCounts}
              cityCounts={cityCounts}
              initialData={editStory ?? undefined}
              onPublish={(story, editedId) => {
                if (editedId) {
                  setStories((prev) => prev.map((s) => s.id === editedId ? { ...s, ...story } : s));
                } else {
                  setStories((prev) => [story, ...prev]);
                  setUpvoteCounts((prev) => [0, ...prev]);
                }
                setView(editedId ? "mystories" : "feed");
                setToast(editedId ? "Story updated!" : "Your journey is live!");
                loadStories();
              }}
            />
          )}
        </div>

        {/* Login wall modal */}
        {showLoginWall && (
          <div onClick={() => setShowLoginWall(false)} style={{ position: "fixed", inset: 0, background: "rgba(20,18,14,0.52)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 20px" }}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 20, padding: "40px 36px 32px", maxWidth: 420, width: "100%", boxShadow: "0 24px 64px rgba(20,18,14,0.22)", textAlign: "center", position: "relative" }}>
              <button onClick={() => setShowLoginWall(false)} aria-label="Close" style={{ position: "absolute", top: 14, right: 16, background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#9c9487", lineHeight: 1 }}>✕</button>
              <div style={{ width: 56, height: 56, borderRadius: 999, background: "#e6f0ee", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
                <IconPencil />
              </div>
              <h2 style={{ fontFamily: "'Newsreader',Georgia,serif", fontSize: 24, fontWeight: 600, color: "#1f1c18", margin: "0 0 10px", letterSpacing: "-0.01em" }}>Sign in to share your journey</h2>
              <p style={{ fontSize: 14.5, color: "#69605a", lineHeight: 1.6, margin: "0 0 28px" }}>
                Reading is open to everyone. To write and share your story, you need a free account.
              </p>
              <a href="/community" style={{ display: "block", background: "#0f6f67", color: "#fff", borderRadius: 12, padding: "13px 0", fontSize: 15, fontWeight: 600, textDecoration: "none", marginBottom: 12, transition: "background .15s" }}
                onMouseOver={(e) => (e.currentTarget.style.background = "#0c5d56")}
                onMouseOut={(e) => (e.currentTarget.style.background = "#0f6f67")}>
                Sign in / Create account
              </a>
              <button onClick={() => setShowLoginWall(false)} style={{ display: "block", width: "100%", background: "none", border: "1px solid #e0d8c8", borderRadius: 12, padding: "12px 0", fontSize: 14.5, fontWeight: 500, color: "#46423a", cursor: "pointer" }}>
                Continue reading
              </button>
            </div>
          </div>
        )}

        {/* Nudge popups — bottom-right, community page style */}
        <div className="sy-nudge-stack">
          {/* Nudge 1: stories just getting started */}
          <div className={`sy-nudge${nudgeVisible && !nudge2Dismissed ? " show" : ""}`}>
            <div className="sy-nudge-bar sy-nudge-bar-terra" />
            <div className="sy-nudge-body">
              <div className="sy-nudge-top">
                <div className="sy-nudge-icon" style={{ background: "#fef3c7" }}>📖</div>
                <div style={{ minWidth: 0 }}>
                  <div className="sy-nudge-title">Stories are just getting started</div>
                  <div className="sy-nudge-sub"><span className="sy-nudge-dot" style={{ background: "#e8b964" }} />Be among the first</div>
                </div>
                <button className="sy-nudge-x" onClick={dismissNudge2} aria-label="Dismiss">
                  <IconClose />
                </button>
              </div>
              <div className="sy-nudge-msg">
                This is a new space. <b>Your experience matters</b> — someone landing in the U.S. next month needs it.
              </div>
              <div className="sy-nudge-row">
                <button className="sy-nudge-cta" style={{ background: "#d4703f" }}
                  onClick={() => { dismissNudge2(); openForm(); }}>
                  Share your story
                </button>
              </div>
            </div>
          </div>

          {/* Nudge 2: start your story journey */}
          <div className={`sy-nudge${nudgeVisible && !nudgeDismissed ? " show" : ""}`}>
            <div className="sy-nudge-bar sy-nudge-bar-teal" />
            <div className="sy-nudge-body">
              <div className="sy-nudge-top">
                <div className="sy-nudge-icon" style={{ background: "#0f6f67", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <IconPencil />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="sy-nudge-title">Start your story journey here</div>
                  <div className="sy-nudge-sub"><span className="sy-nudge-dot" />Write anonymously or with your name</div>
                </div>
                <button className="sy-nudge-x" onClick={dismissNudge} aria-label="Dismiss">
                  <IconClose />
                </button>
              </div>
              <div className="sy-nudge-msg">
                Every detail helps. From visa steps to finding a grocery store — <b>real stories fill the gap</b> no guide can.
              </div>
              <div className="sy-nudge-row">
                <button className="sy-nudge-cta" style={{ background: "#0f6f67" }}
                  onClick={() => { dismissNudge(); openForm(); }}>
                  Write now
                </button>
              </div>
            </div>
            <div className="sy-nudge-timer"><div className="sy-nudge-timer-bar" /></div>
          </div>
        </div>
      </div>
    </>
  );
}
