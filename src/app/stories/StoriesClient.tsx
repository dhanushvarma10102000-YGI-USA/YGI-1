"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Nav } from "@/components/ds/Nav";
import { supabase } from "@/lib/supabase";

type View = "feed" | "story" | "form";
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
type CommentData = {
  id: number;
  initials: string;
  color: string;
  name: string;
  isAuthor?: boolean;
  time: string;
  text: string;
  likes: number;
  photo?: boolean;
  replies: ReplyData[];
};

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
type ReplyData = {
  id: number;
  initials: string;
  color: string;
  name: string;
  isAuthor?: boolean;
  time: string;
  text: string;
  likes: number;
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
const CITY_GROUPS: { state: string; cities: { name: string; n: number }[] }[] = [
  { state: "Alabama", cities: [{ name: "Birmingham", n: 1 }, { name: "Huntsville", n: 1 }, { name: "Mobile", n: 1 }, { name: "Montgomery", n: 1 }, { name: "Tuscaloosa", n: 1 }] },
  { state: "Alaska", cities: [{ name: "Anchorage", n: 1 }, { name: "Fairbanks", n: 1 }, { name: "Juneau", n: 1 }] },
  { state: "Arizona", cities: [
    { name: "Phoenix", n: 24 }, { name: "Tucson", n: 11 }, { name: "Mesa", n: 8 },
    { name: "Scottsdale", n: 6 }, { name: "Flagstaff", n: 5 }, { name: "Tempe", n: 5 },
    { name: "Chandler", n: 4 }, { name: "Gilbert", n: 3 }, { name: "Glendale", n: 3 },
    { name: "Peoria", n: 2 }, { name: "Surprise", n: 2 }, { name: "Casa Grande", n: 2 },
    { name: "Prescott", n: 2 }, { name: "Yuma", n: 1 }, { name: "Avondale", n: 1 },
    { name: "Goodyear", n: 1 }, { name: "Buckeye", n: 1 }, { name: "Queen Creek", n: 1 },
    { name: "Maricopa", n: 1 }, { name: "Lake Havasu City", n: 1 }, { name: "Sierra Vista", n: 1 },
    { name: "Bullhead City", n: 1 }, { name: "Apache Junction", n: 1 }, { name: "El Mirage", n: 1 },
    { name: "Kingman", n: 1 },
  ]},
  { state: "Arkansas", cities: [{ name: "Little Rock", n: 1 }, { name: "Fayetteville", n: 1 }, { name: "Fort Smith", n: 1 }, { name: "Jonesboro", n: 1 }, { name: "Springdale", n: 1 }] },
  { state: "California", cities: [
    { name: "Los Angeles", n: 3 }, { name: "San Francisco", n: 2 }, { name: "San Diego", n: 2 },
    { name: "San Jose", n: 1 }, { name: "Sacramento", n: 1 }, { name: "Oakland", n: 1 },
    { name: "Fresno", n: 1 }, { name: "Long Beach", n: 1 }, { name: "Berkeley", n: 1 },
    { name: "Irvine", n: 1 }, { name: "Riverside", n: 1 }, { name: "Santa Ana", n: 1 },
  ]},
  { state: "Colorado", cities: [{ name: "Denver", n: 2 }, { name: "Colorado Springs", n: 1 }, { name: "Aurora", n: 1 }, { name: "Fort Collins", n: 1 }, { name: "Boulder", n: 1 }, { name: "Pueblo", n: 1 }] },
  { state: "Connecticut", cities: [{ name: "Bridgeport", n: 1 }, { name: "New Haven", n: 1 }, { name: "Hartford", n: 1 }, { name: "Stamford", n: 1 }, { name: "Waterbury", n: 1 }] },
  { state: "Delaware", cities: [{ name: "Wilmington", n: 1 }, { name: "Dover", n: 1 }, { name: "Newark", n: 1 }] },
  { state: "Florida", cities: [
    { name: "Miami", n: 2 }, { name: "Orlando", n: 2 }, { name: "Tampa", n: 1 },
    { name: "Jacksonville", n: 1 }, { name: "St. Petersburg", n: 1 }, { name: "Fort Lauderdale", n: 1 },
    { name: "Tallahassee", n: 1 }, { name: "Gainesville", n: 1 }, { name: "Cape Coral", n: 1 },
  ]},
  { state: "Georgia", cities: [{ name: "Atlanta", n: 2 }, { name: "Columbus", n: 1 }, { name: "Augusta", n: 1 }, { name: "Savannah", n: 1 }, { name: "Athens", n: 1 }] },
  { state: "Hawaii", cities: [{ name: "Honolulu", n: 1 }, { name: "Hilo", n: 1 }, { name: "Kailua", n: 1 }, { name: "Pearl City", n: 1 }] },
  { state: "Idaho", cities: [{ name: "Boise", n: 1 }, { name: "Nampa", n: 1 }, { name: "Meridian", n: 1 }, { name: "Idaho Falls", n: 1 }, { name: "Pocatello", n: 1 }] },
  { state: "Illinois", cities: [{ name: "Chicago", n: 3 }, { name: "Aurora", n: 1 }, { name: "Naperville", n: 1 }, { name: "Joliet", n: 1 }, { name: "Rockford", n: 1 }, { name: "Springfield", n: 1 }, { name: "Evanston", n: 1 }] },
  { state: "Indiana", cities: [{ name: "Indianapolis", n: 1 }, { name: "Fort Wayne", n: 1 }, { name: "Evansville", n: 1 }, { name: "South Bend", n: 1 }, { name: "Carmel", n: 1 }, { name: "Bloomington", n: 1 }] },
  { state: "Iowa", cities: [{ name: "Des Moines", n: 1 }, { name: "Cedar Rapids", n: 1 }, { name: "Davenport", n: 1 }, { name: "Sioux City", n: 1 }, { name: "Iowa City", n: 1 }] },
  { state: "Kansas", cities: [{ name: "Wichita", n: 1 }, { name: "Overland Park", n: 1 }, { name: "Kansas City", n: 1 }, { name: "Olathe", n: 1 }, { name: "Lawrence", n: 1 }] },
  { state: "Kentucky", cities: [{ name: "Louisville", n: 1 }, { name: "Lexington", n: 1 }, { name: "Bowling Green", n: 1 }, { name: "Owensboro", n: 1 }, { name: "Covington", n: 1 }] },
  { state: "Louisiana", cities: [{ name: "New Orleans", n: 2 }, { name: "Baton Rouge", n: 1 }, { name: "Shreveport", n: 1 }, { name: "Lafayette", n: 1 }, { name: "Lake Charles", n: 1 }] },
  { state: "Maine", cities: [{ name: "Portland", n: 1 }, { name: "Lewiston", n: 1 }, { name: "Bangor", n: 1 }, { name: "South Portland", n: 1 }] },
  { state: "Maryland", cities: [{ name: "Baltimore", n: 2 }, { name: "Rockville", n: 1 }, { name: "Gaithersburg", n: 1 }, { name: "Bowie", n: 1 }, { name: "College Park", n: 1 }, { name: "Annapolis", n: 1 }] },
  { state: "Massachusetts", cities: [{ name: "Boston", n: 3 }, { name: "Worcester", n: 1 }, { name: "Springfield", n: 1 }, { name: "Cambridge", n: 1 }, { name: "Lowell", n: 1 }, { name: "Somerville", n: 1 }] },
  { state: "Michigan", cities: [{ name: "Detroit", n: 2 }, { name: "Grand Rapids", n: 1 }, { name: "Warren", n: 1 }, { name: "Sterling Heights", n: 1 }, { name: "Ann Arbor", n: 1 }, { name: "Lansing", n: 1 }, { name: "Dearborn", n: 1 }] },
  { state: "Minnesota", cities: [{ name: "Minneapolis", n: 2 }, { name: "Saint Paul", n: 1 }, { name: "Rochester", n: 1 }, { name: "Duluth", n: 1 }, { name: "Bloomington", n: 1 }] },
  { state: "Mississippi", cities: [{ name: "Jackson", n: 1 }, { name: "Gulfport", n: 1 }, { name: "Southaven", n: 1 }, { name: "Hattiesburg", n: 1 }, { name: "Biloxi", n: 1 }] },
  { state: "Missouri", cities: [{ name: "Kansas City", n: 1 }, { name: "St. Louis", n: 1 }, { name: "Springfield", n: 1 }, { name: "Columbia", n: 1 }, { name: "Independence", n: 1 }] },
  { state: "Montana", cities: [{ name: "Billings", n: 1 }, { name: "Missoula", n: 1 }, { name: "Great Falls", n: 1 }, { name: "Bozeman", n: 1 }] },
  { state: "Nebraska", cities: [{ name: "Omaha", n: 1 }, { name: "Lincoln", n: 1 }, { name: "Bellevue", n: 1 }, { name: "Grand Island", n: 1 }] },
  { state: "Nevada", cities: [{ name: "Las Vegas", n: 2 }, { name: "Henderson", n: 1 }, { name: "Reno", n: 1 }, { name: "North Las Vegas", n: 1 }, { name: "Sparks", n: 1 }] },
  { state: "New Hampshire", cities: [{ name: "Manchester", n: 1 }, { name: "Nashua", n: 1 }, { name: "Concord", n: 1 }, { name: "Dover", n: 1 }] },
  { state: "New Jersey", cities: [{ name: "Newark", n: 1 }, { name: "Jersey City", n: 1 }, { name: "Paterson", n: 1 }, { name: "Elizabeth", n: 1 }, { name: "Trenton", n: 1 }, { name: "Edison", n: 1 }] },
  { state: "New Mexico", cities: [{ name: "Albuquerque", n: 1 }, { name: "Las Cruces", n: 1 }, { name: "Rio Rancho", n: 1 }, { name: "Santa Fe", n: 1 }] },
  { state: "New York", cities: [
    { name: "New York City", n: 2 }, { name: "Buffalo", n: 1 }, { name: "Rochester", n: 1 },
    { name: "Yonkers", n: 1 }, { name: "Syracuse", n: 1 }, { name: "Albany", n: 1 }, { name: "Ithaca", n: 1 },
  ]},
  { state: "North Carolina", cities: [{ name: "Charlotte", n: 2 }, { name: "Raleigh", n: 1 }, { name: "Greensboro", n: 1 }, { name: "Durham", n: 1 }, { name: "Winston-Salem", n: 1 }, { name: "Chapel Hill", n: 1 }] },
  { state: "North Dakota", cities: [{ name: "Fargo", n: 1 }, { name: "Bismarck", n: 1 }, { name: "Grand Forks", n: 1 }, { name: "Minot", n: 1 }] },
  { state: "Ohio", cities: [{ name: "Columbus", n: 2 }, { name: "Cleveland", n: 1 }, { name: "Cincinnati", n: 1 }, { name: "Toledo", n: 1 }, { name: "Akron", n: 1 }, { name: "Dayton", n: 1 }] },
  { state: "Oklahoma", cities: [{ name: "Oklahoma City", n: 1 }, { name: "Tulsa", n: 1 }, { name: "Norman", n: 1 }, { name: "Broken Arrow", n: 1 }, { name: "Edmond", n: 1 }] },
  { state: "Oregon", cities: [{ name: "Portland", n: 2 }, { name: "Salem", n: 1 }, { name: "Eugene", n: 1 }, { name: "Gresham", n: 1 }, { name: "Hillsboro", n: 1 }, { name: "Corvallis", n: 1 }] },
  { state: "Pennsylvania", cities: [{ name: "Philadelphia", n: 2 }, { name: "Pittsburgh", n: 1 }, { name: "Allentown", n: 1 }, { name: "Erie", n: 1 }, { name: "Reading", n: 1 }, { name: "State College", n: 1 }] },
  { state: "Rhode Island", cities: [{ name: "Providence", n: 1 }, { name: "Warwick", n: 1 }, { name: "Cranston", n: 1 }, { name: "Pawtucket", n: 1 }] },
  { state: "South Carolina", cities: [{ name: "Columbia", n: 1 }, { name: "Charleston", n: 1 }, { name: "North Charleston", n: 1 }, { name: "Greenville", n: 1 }, { name: "Rock Hill", n: 1 }] },
  { state: "South Dakota", cities: [{ name: "Sioux Falls", n: 1 }, { name: "Rapid City", n: 1 }, { name: "Aberdeen", n: 1 }] },
  { state: "Tennessee", cities: [{ name: "Nashville", n: 2 }, { name: "Memphis", n: 1 }, { name: "Knoxville", n: 1 }, { name: "Chattanooga", n: 1 }, { name: "Clarksville", n: 1 }] },
  { state: "Texas", cities: [
    { name: "Houston", n: 2 }, { name: "Dallas", n: 1 }, { name: "Austin", n: 1 },
    { name: "San Antonio", n: 1 }, { name: "Fort Worth", n: 1 }, { name: "El Paso", n: 1 },
    { name: "Arlington", n: 1 }, { name: "Plano", n: 1 }, { name: "Lubbock", n: 1 },
    { name: "Irving", n: 1 }, { name: "Garland", n: 1 }, { name: "College Station", n: 1 },
  ]},
  { state: "Utah", cities: [{ name: "Salt Lake City", n: 1 }, { name: "West Valley City", n: 1 }, { name: "Provo", n: 1 }, { name: "West Jordan", n: 1 }, { name: "Orem", n: 1 }] },
  { state: "Vermont", cities: [{ name: "Burlington", n: 1 }, { name: "Essex", n: 1 }, { name: "South Burlington", n: 1 }] },
  { state: "Virginia", cities: [{ name: "Virginia Beach", n: 1 }, { name: "Norfolk", n: 1 }, { name: "Chesapeake", n: 1 }, { name: "Richmond", n: 1 }, { name: "Arlington", n: 1 }, { name: "Alexandria", n: 1 }, { name: "Charlottesville", n: 1 }] },
  { state: "Washington", cities: [{ name: "Seattle", n: 2 }, { name: "Spokane", n: 1 }, { name: "Tacoma", n: 1 }, { name: "Bellevue", n: 1 }, { name: "Kirkland", n: 1 }, { name: "Redmond", n: 1 }] },
  { state: "West Virginia", cities: [{ name: "Charleston", n: 1 }, { name: "Huntington", n: 1 }, { name: "Morgantown", n: 1 }, { name: "Parkersburg", n: 1 }] },
  { state: "Wisconsin", cities: [{ name: "Milwaukee", n: 1 }, { name: "Madison", n: 1 }, { name: "Green Bay", n: 1 }, { name: "Kenosha", n: 1 }, { name: "Racine", n: 1 }] },
  { state: "Wyoming", cities: [{ name: "Cheyenne", n: 1 }, { name: "Casper", n: 1 }, { name: "Laramie", n: 1 }] },
];

// Flat city list for filtering logic
const CITIES = CITY_GROUPS.flatMap((g) => g.cities);

const UNIS = [
  // Arizona Public Universities
  { name: "Arizona State University", n: 15 },
  { name: "University of Arizona", n: 12 },
  { name: "Northern Arizona University", n: 7 },
  // Arizona Private Universities
  { name: "Grand Canyon University", n: 5 },
  { name: "University of Phoenix", n: 3 },
  { name: "Embry-Riddle Aeronautical University", n: 2 },
  { name: "Western International University", n: 1 },
  { name: "Midwestern University", n: 1 },
  { name: "University of Advancing Technology", n: 1 },
  { name: "Thunderbird School of Global Management", n: 1 },
  { name: "A.T. Still University", n: 1 },
  { name: "Prescott College", n: 1 },
  { name: "Ottawa University Arizona", n: 1 },
  // Maricopa County Community Colleges
  { name: "Maricopa Community College", n: 4 },
  { name: "Scottsdale Community College", n: 2 },
  { name: "Glendale Community College", n: 2 },
  { name: "Mesa Community College", n: 2 },
  { name: "Phoenix College", n: 2 },
  { name: "South Mountain Community College", n: 1 },
  { name: "Chandler-Gilbert Community College", n: 1 },
  { name: "GateWay Community College", n: 1 },
  { name: "Paradise Valley Community College", n: 1 },
  { name: "Rio Salado College", n: 1 },
  { name: "Estrella Mountain Community College", n: 1 },
  // Pima County
  { name: "Pima Community College", n: 3 },
  // Other AZ
  { name: "Cochise College", n: 1 },
  { name: "Central Arizona College", n: 1 },
  { name: "Eastern Arizona College", n: 1 },
  { name: "Mohave Community College", n: 1 },
  { name: "Northland Pioneer College", n: 1 },
  { name: "Yavapai College", n: 1 },
  { name: "Arizona Western College", n: 1 },
  { name: "Tohono O'odham Community College", n: 1 },
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

const TREND_DATA: Record<TrendTab, { title: string; votes: number; storyIdx: number }[]> = {
  trending: [],
  top: [],
  new: [],
};

const INITIAL_COMMENTS: CommentData[] = [];

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
function FilterDrop({ options, selected, onSelect, onClose, multiCount }: {
  options: { name: string; n?: number }[];
  selected: string;
  onSelect: (v: string) => void;
  onClose: () => void;
  multiCount?: boolean;
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
                {multiCount && opt.n !== undefined && (
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: "#0b544e", background: "#e9f0ee", padding: "1px 7px", borderRadius: 999 }}>{opt.n}</span>
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
              <span style={{ fontSize: 11.5, fontWeight: 600, color: "#0b544e", background: "#e9f0ee", padding: "1px 8px", borderRadius: 999 }}>{c.n} stories</span>
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
              <span style={{ fontSize: 11.5, fontWeight: 600, color: "#b5562d", background: "#f7ebe2", padding: "1px 8px", borderRadius: 999 }}>{u.n} stories</span>
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
  onShareStory, onOpenStory,
  upvoteCounts, votedIds, onToggleVote, stories, storiesLoading,
}: {
  onShareStory: () => void;
  onOpenStory: (idx: number) => void;
  upvoteCounts: number[];
  votedIds: Set<string>;
  onToggleVote: (id: string, idx: number) => void;
  stories: Story[];
  storiesLoading: boolean;
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
        <button onClick={onShareStory} className="sy-btn-teal" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#0f6f67", color: "#fff", border: "none", borderRadius: 11, padding: "11px 22px", fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 8px rgba(15,111,103,0.28)", fontFamily: "inherit", flexShrink: 0 }}>
          <IconPencil /> Share your story
        </button>
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
                            <span style={{ fontSize: 11, fontWeight: 600, color: "#0b544e", background: "#e9f0ee", padding: "1px 7px", borderRadius: 999 }}>{c.n}</span>
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
                        <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 600, color: "#b5562d", background: "#f7ebe2", padding: "1px 7px", borderRadius: 999 }}>{u.n}</span>
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
                <FilterDrop options={UNIS} selected={uniChip?.v || ""} onSelect={(v) => addChip("University", v)} onClose={() => setOpenFilter(null)} multiCount />
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
                <FilterDrop options={CITIES} selected={cityChip?.v || ""} onSelect={(v) => addChip("City", v)} onClose={() => setOpenFilter(null)} multiCount />
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
                  <CardEl key={idx} {...(s.id ? { href: `/stories/${s.id}` } : { onClick: () => onOpenStory(idx) })} className="sy-story-card" style={{ display: "flex", gap: 18, background: "#fff", border: "1px solid #ece6dc", borderRadius: 16, padding: 18, cursor: "pointer", boxShadow: "0 1px 2px rgba(40,33,20,0.04)", textDecoration: "none", color: "inherit" }}>
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
              {TREND_DATA[trendTab].length === 0 ? (
                <div style={{ padding: "20px 10px", textAlign: "center" }}>
                  <p style={{ fontSize: 13, color: "#b0a898", margin: 0, lineHeight: 1.5 }}>No stories yet.<br />Be the first to share.</p>
                </div>
              ) : TREND_DATA[trendTab].map((ti, i) => (
                <button key={i} className="sy-trend-item" onClick={() => onOpenStory(ti.storyIdx)} style={{ display: "flex", alignItems: "center", gap: 11, background: "none", border: "none", padding: "9px 9px", borderRadius: 11, cursor: "pointer", textAlign: "left", fontFamily: "inherit", width: "100%" }}>
                  <span style={{ flexShrink: 0, position: "relative", width: 46, height: 46, borderRadius: 9, overflow: "hidden", border: "1px solid #ece6dc" }}>
                    <span style={{ position: "absolute", inset: 0, background: PLACEHOLDER_BG }} />
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "-webkit-box", fontSize: 13, fontWeight: 600, color: "#2c2823", lineHeight: 1.3, overflow: "hidden", WebkitBoxOrient: "vertical", WebkitLineClamp: 2 }}>{ti.title}</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, color: "#9a9082", fontWeight: 600, marginTop: 3 }}>
                      <span style={{ color: "#0f6f67", fontSize: 9 }}>▲</span> {ti.votes}
                    </span>
                  </span>
                </button>
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
   STORY VIEW
═══════════════════════════════════════ */
function StoryView({ onBack, onShareStory }: { onBack: () => void; onShareStory: () => void }) {
  const [upvoted, setUpvoted] = useState(false);
  const [upvoteCount, setUpvoteCount] = useState(342);
  const [reacted, setReacted] = useState<Set<string>>(new Set());
  const [reactionCounts, setReactionCounts] = useState<Record<string, number>>({ Relate: 128, Inspiring: 94, Helpful: 211, Touched: 67 });
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<CommentData[]>(INITIAL_COMMENTS);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyTexts, setReplyTexts] = useState<Record<number, string>>({});
  const [commentLikes, setCommentLikes] = useState<Record<string, number>>({ "c1": 24, "r1-11": 6, "c2": 31, "r2-21": 9 });
  const [commentLiked, setCommentLiked] = useState<Set<string>>(new Set());
  const [sortOpen, setSortOpen] = useState(false);
  const [commentSort, setCommentSort] = useState<"helpful" | "newest">("helpful");
  const sortRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(100);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const toggleUpvote = () => { setUpvoted((v) => { setUpvoteCount((c) => v ? c - 1 : c + 1); return !v; }); };
  const toggleReaction = (label: string) => {
    setReacted((prev) => {
      const next = new Set(prev);
      if (next.has(label)) { next.delete(label); setReactionCounts((c) => ({ ...c, [label]: c[label] - 1 })); }
      else { next.add(label); setReactionCounts((c) => ({ ...c, [label]: c[label] + 1 })); }
      return next;
    });
  };
  const toggleCommentLike = (key: string, init: number) => {
    setCommentLiked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) { next.delete(key); setCommentLikes((c) => ({ ...c, [key]: (c[key] ?? init) - 1 })); }
      else { next.add(key); setCommentLikes((c) => ({ ...c, [key]: (c[key] ?? init) + 1 })); }
      return next;
    });
  };
  const postComment = () => {
    if (!commentText.trim()) return;
    const id = ++nextId.current;
    setComments((prev) => [{ id, initials: "YO", color: "#ddd6c8", name: "You", time: "just now", text: commentText.trim(), likes: 0, replies: [] }, ...prev]);
    setCommentText("");
  };
  const postReply = (ci: number) => {
    const text = replyTexts[ci]?.trim();
    if (!text) return;
    const id = ++nextId.current;
    setComments((prev) => prev.map((c, i) => i === ci ? { ...c, replies: [...c.replies, { id, initials: "YO", color: "#ddd6c8", name: "You", time: "just now", text, likes: 0 }] } : c));
    setReplyTexts((r) => ({ ...r, [ci]: "" }));
    setReplyingTo(null);
  };

  const sortedComments = commentSort === "newest" ? [...comments].reverse() : comments;
  const reactions = [{ emoji: "❤️", label: "Relate" }, { emoji: "🙌", label: "Inspiring" }, { emoji: "🙏", label: "Helpful" }, { emoji: "😢", label: "Touched" }];

  return (
    <div className="sy-frame">
      <div style={{ maxWidth: 720, margin: "0 auto", background: "#fff", borderRadius: 18, padding: "32px 36px", boxShadow: "0 1px 3px rgba(40,33,20,0.06),0 8px 24px rgba(40,33,20,0.05)" }}>
        <button onClick={onBack} className="sy-back-btn" style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "none", border: "none", fontSize: 13.5, fontWeight: 600, color: "#8a8378", cursor: "pointer", padding: 0, marginBottom: 24, fontFamily: "inherit" }}>
          <IconBack /> Back to journeys
        </button>

        <div style={{ marginBottom: 16 }}>
          <span style={{ display: "inline-flex", alignItems: "center", fontSize: 11.5, fontWeight: 600, letterSpacing: "0.02em", padding: "4px 11px", borderRadius: 999, background: "#f8ebe2", color: "#b5562d" }}>Daily Life</span>
        </div>

        <h1 style={{ fontFamily: "'Newsreader',Georgia,serif", fontSize: 42, fontWeight: 600, lineHeight: 1.14, color: "#1f1c18", margin: "0 0 22px", letterSpacing: "-0.015em" }}>The morning my SSN card finally arrived</h1>

        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 30 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 40, height: 40, borderRadius: 999, background: "#0f6f67", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700 }}>LM</span>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: "#221f1b", lineHeight: 1.2 }}>Lina M.</div>
              <div style={{ fontSize: 12.5, color: "#9a9082", marginTop: 2 }}>Posted March 12, 2026 · 6 min read</div>
            </div>
          </div>
          <span style={{ width: 1, height: 26, background: "#e2dccf" }} />
          <div style={{ display: "flex", gap: 7 }}>
            <span style={{ display: "inline-flex", alignItems: "center", fontSize: 11.5, fontWeight: 600, padding: "4px 11px", borderRadius: 999, background: "#e9f0ee", color: "#0b544e" }}>Arizona State University</span>
            <span style={{ display: "inline-flex", alignItems: "center", fontSize: 11.5, fontWeight: 600, padding: "4px 11px", borderRadius: 999, background: "#f1ece3", color: "#6f685c" }}>Phoenix</span>
          </div>
        </div>

        <div style={{ fontFamily: "'Newsreader',Georgia,serif", fontSize: 19, lineHeight: 1.85, color: "#332f28" }}>
          <p style={{ margin: "0 0 22px" }}>I had been in the country for three months and eleven days when the envelope showed up. Plain, official, almost disappointing in how ordinary it looked for something I had thought about every single day.</p>
          <p style={{ margin: "0 0 22px" }}>Before it came, nothing worked the way I expected. I couldn&rsquo;t open a real bank account. I couldn&rsquo;t sign a lease in my own name. Every form had a box I couldn&rsquo;t fill, and every &ldquo;we&rsquo;ll need your Social&rdquo; felt like a small door closing.</p>
          <blockquote style={{ margin: "30px 0", padding: "6px 0 6px 22px", borderLeft: "3px solid #0f6f67", fontStyle: "italic", color: "#1f1c18", fontSize: 21, lineHeight: 1.6 }}>
            The hardest part was never the paperwork. It was feeling like I didn&rsquo;t quite exist yet.
          </blockquote>
          <p style={{ margin: "0 0 22px" }}>What got me through the waiting wasn&rsquo;t a website or a checklist, though I read plenty of both. It was a librarian named Gloria at the Burton Barr branch who sat with me twice, read the forms out loud, and circled the lines I&rsquo;d missed in soft pencil so I could erase them later.</p>
          <figure style={{ margin: "8px 0 26px" }}>
            <div style={{ position: "relative", width: "100%", height: 300, borderRadius: 14, overflow: "hidden", border: "1px solid #ece6dc" }}>
              <div style={{ position: "absolute", inset: 0, background: PLACEHOLDER_BG }} />
              <span style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", fontFamily: "ui-monospace,monospace", fontSize: 11, letterSpacing: "0.1em", color: "#a89c88", textTransform: "uppercase" }}>photo added by author</span>
            </div>
            <figcaption style={{ fontFamily: "'Public Sans',system-ui,sans-serif", fontSize: 13, color: "#9a9082", marginTop: 9 }}>The envelope, on my kitchen table that morning.</figcaption>
          </figure>
          <p style={{ margin: "0 0 22px" }}>So if you&rsquo;re in the waiting part right now — the part where everything feels provisional — I want you to know it ends. Not all at once, and not as dramatically as you hope. But one ordinary morning, the envelope shows up, and you get to start being a full person here.</p>
        </div>

        {/* Reactions + upvote */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", margin: "36px 0 0", padding: "20px 0", borderTop: "1px solid #ece6dc", borderBottom: "1px solid #ece6dc" }}>
          {reactions.map((r) => {
            const active = reacted.has(r.label);
            return (
              <button key={r.label} onClick={() => toggleReaction(r.label)} className="sy-reaction-btn" style={{ display: "inline-flex", alignItems: "center", gap: 8, border: active ? "1px solid #d4703f" : "1px solid #e2dccf", borderRadius: 999, padding: "8px 15px", background: active ? "#fdf6f1" : "#fff", fontSize: 13.5, fontWeight: 600, color: "#46423a", cursor: "pointer", fontFamily: "inherit" }}>
                <span style={{ fontSize: 15 }}>{r.emoji}</span> {r.label} <span style={{ color: "#9a9082" }}>{reactionCounts[r.label]}</span>
              </button>
            );
          })}
          <span style={{ flex: 1 }} />
          <button onClick={toggleUpvote} className="sy-upvote-large" style={{ display: "inline-flex", alignItems: "center", gap: 8, border: "1px solid #0f6f67", borderRadius: 999, padding: "8px 17px", background: upvoted ? "#0f6f67" : "#e9f0ee", color: upvoted ? "#fff" : "#0b544e", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            <span style={{ fontSize: 12 }}>▲</span> Upvote · {upvoteCount}
          </button>
        </div>

        {/* CTA */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, background: "linear-gradient(135deg,#fbf1e9,#f8ece3)", border: "1px solid #f0ddcf", borderRadius: 16, padding: "24px 26px", margin: "32px 0" }}>
          <div>
            <div style={{ fontFamily: "'Newsreader',Georgia,serif", fontSize: 21, fontWeight: 600, color: "#7d3f1d", lineHeight: 1.3 }}>Been through something similar?</div>
            <div style={{ fontSize: 14, color: "#8a6a50", marginTop: 4 }}>Your story could be the one that helps the next person feel less alone.</div>
          </div>
          <button onClick={onShareStory} className="sy-btn-terra" style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 8, background: "#d4703f", color: "#fff", border: "none", borderRadius: 12, padding: "13px 22px", fontSize: 14.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            Share your own story <span style={{ fontSize: 16 }}>→</span>
          </button>
        </div>

        {/* Comments */}
        <div style={{ marginTop: 40 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <h3 style={{ fontFamily: "'Newsreader',Georgia,serif", fontSize: 23, fontWeight: 600, color: "#221f1b", margin: 0 }}>
              Comments · {47 + comments.length - INITIAL_COMMENTS.length}
            </h3>
            <div ref={sortRef} style={{ position: "relative" }}>
              <button onClick={() => setSortOpen((o) => !o)} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "#fff", border: "1px solid #e2dccf", borderRadius: 10, padding: "8px 13px", fontSize: 13, fontWeight: 600, color: "#46423a", cursor: "pointer", fontFamily: "inherit" }}>
                {commentSort === "helpful" ? "Most Helpful" : "Newest"} <IconChevron rotated={sortOpen} />
              </button>
              {sortOpen && (
                <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", background: "#fff", border: "1px solid #e2dccf", borderRadius: 10, overflow: "hidden", boxShadow: "0 8px 20px rgba(40,33,20,0.1)", zIndex: 10, minWidth: 150 }}>
                  {(["helpful", "newest"] as const).map((s) => (
                    <button key={s} className="sy-drop-item" onClick={() => { setCommentSort(s); setSortOpen(false); }} style={{ width: "100%", padding: "10px 15px", background: commentSort === s ? "#f4f0e8" : "none", border: "none", fontSize: 13.5, color: "#221f1b", cursor: "pointer", textAlign: "left", fontFamily: "inherit", fontWeight: commentSort === s ? 600 : 400 }}>
                      {s === "helpful" ? "Most Helpful" : "Newest"}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Composer */}
          <div style={{ display: "flex", gap: 12, marginBottom: 28 }}>
            <span style={{ flexShrink: 0, width: 38, height: 38, borderRadius: 999, background: "#ddd6c8", color: "#7a7264", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 }}>You</span>
            <div style={{ flex: 1 }}>
              <textarea placeholder="Add a comment… (Cmd+Enter to post)" value={commentText} onChange={(e) => setCommentText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) postComment(); }} rows={commentText ? 3 : 1}
                style={{ width: "100%", border: "1px solid #e2dccf", borderRadius: 13, background: "#fff", padding: "12px 15px", fontSize: 14, color: "#221f1b", fontFamily: "inherit", resize: "none", outline: "none", lineHeight: 1.6 }} />
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                <button onClick={postComment} className="sy-post-comment-btn" style={{ background: "#0f6f67", color: "#fff", border: "none", borderRadius: 10, padding: "9px 18px", fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Post comment</button>
              </div>
            </div>
          </div>

          {/* Comments list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
            {sortedComments.map((c, ci) => {
              const cKey = `c${c.id}`;
              return (
                <div key={c.id}>
                  <div style={{ display: "flex", gap: 12 }}>
                    <span style={{ flexShrink: 0, width: 38, height: 38, borderRadius: 999, background: c.color, color: c.color === "#ddd6c8" ? "#7a7264" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 }}>{c.initials}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 5 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "#221f1b" }}>{c.name}</span>
                        {c.isAuthor && <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "#0b544e", background: "#e0ece9", padding: "2px 8px", borderRadius: 999 }}>Author</span>}
                        <span style={{ fontSize: 12.5, color: "#a8a195" }}>{c.time}</span>
                      </div>
                      <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "#3a362f", margin: "0 0 9px" }}>{c.text}</p>
                      {c.photo && (
                        <div style={{ position: "relative", width: 220, height: 140, borderRadius: 11, overflow: "hidden", border: "1px solid #ece6dc", margin: "0 0 11px" }}>
                          <div style={{ position: "absolute", inset: 0, background: PLACEHOLDER_BG }} />
                          <span style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", fontFamily: "ui-monospace,monospace", fontSize: 10, letterSpacing: "0.08em", color: "#a89c88", textTransform: "uppercase" }}>photo</span>
                        </div>
                      )}
                      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                        <button onClick={() => toggleCommentLike(cKey, c.likes)} className="sy-comment-like" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", fontSize: 13, fontWeight: 600, color: commentLiked.has(cKey) ? "#d4703f" : "#8a8378", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
                          <span style={{ fontSize: 15 }}>{commentLiked.has(cKey) ? "♥" : "♡"}</span> {commentLikes[cKey] ?? c.likes}
                        </button>
                        <button onClick={() => setReplyingTo(replyingTo === ci ? null : ci)} className="sy-comment-reply" style={{ background: "none", border: "none", fontSize: 13, fontWeight: 600, color: "#8a8378", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>Reply</button>
                      </div>
                      {replyingTo === ci && (
                        <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
                          <textarea placeholder={`Reply to ${c.name}…`} value={replyTexts[ci] || ""} onChange={(e) => setReplyTexts((r) => ({ ...r, [ci]: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) postReply(ci); }} rows={2} autoFocus
                            style={{ flex: 1, border: "1px solid #e2dccf", borderRadius: 10, background: "#fff", padding: "10px 12px", fontSize: 13.5, fontFamily: "inherit", color: "#221f1b", resize: "none", outline: "none", lineHeight: 1.5 }} />
                          <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                            <button onClick={() => postReply(ci)} className="sy-post-comment-btn" style={{ background: "#0f6f67", color: "#fff", border: "none", borderRadius: 9, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Reply</button>
                            <button onClick={() => setReplyingTo(null)} style={{ background: "none", border: "1px solid #e2dccf", borderRadius: 9, padding: "7px 14px", fontSize: 13, fontWeight: 600, color: "#8a8378", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {c.replies.map((r) => {
                    const rKey = `r${c.id}-${r.id}`;
                    return (
                      <div key={r.id} style={{ display: "flex", gap: 12, margin: "18px 0 0 30px", paddingLeft: 20, borderLeft: "2px solid #ece6dc" }}>
                        <span style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 999, background: r.color, color: r.color === "#ddd6c8" ? "#7a7264" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>{r.initials}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 5 }}>
                            <span style={{ fontSize: 13.5, fontWeight: 700, color: "#221f1b" }}>{r.name}</span>
                            {r.isAuthor && <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "#0b544e", background: "#e0ece9", padding: "2px 8px", borderRadius: 999 }}>Author</span>}
                            <span style={{ fontSize: 12.5, color: "#a8a195" }}>{r.time}</span>
                          </div>
                          <p style={{ fontSize: 14, lineHeight: 1.6, color: "#3a362f", margin: "0 0 9px" }}>{r.text}</p>
                          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                            <button onClick={() => toggleCommentLike(rKey, r.likes)} className="sy-comment-like" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", fontSize: 12.5, fontWeight: 600, color: commentLiked.has(rKey) ? "#d4703f" : "#8a8378", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
                              <span style={{ fontSize: 14 }}>{commentLiked.has(rKey) ? "♥" : "♡"}</span> {commentLikes[rKey] ?? r.likes}
                            </button>
                            <button onClick={() => setReplyingTo(ci)} className="sy-comment-reply" style={{ background: "none", border: "none", fontSize: 12.5, fontWeight: 600, color: "#8a8378", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>Reply</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
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

function FormView({ onBack, onPublish, user }: { onBack: () => void; onPublish: (story: Story) => void; user: { id: string; email?: string; user_metadata?: Record<string, string> } | null }) {
  const [anon, setAnon] = useState(true);
  const [title, setTitle] = useState("");
  const [uniQuery, setUniQuery] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const [showUniDrop, setShowUniDrop] = useState(false);
  const [showCityDrop, setShowCityDrop] = useState(false);
  const [selectedUni, setSelectedUni] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
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
    if (user) {
      await supabase.from("stories").insert({
        user_id: user.id,
        title: title.trim(),
        excerpt,
        body_html: bodyHtml,
        category: selectedCategory || null,
        city: selectedCity || null,
        uni: selectedUni || null,
        anon,
        read_time: readTime,
        display_name: displayName,
      });
    }
    setToast("Story published!");
    setTimeout(() => onPublish(story), 1400);
  };

  return (
    <div className="sy-frame">
      {toast && <Toast msg={toast} onDone={() => setToast("")} />}
      <button onClick={onBack} className="sy-back-btn" style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "none", border: "none", fontSize: 13.5, fontWeight: 600, color: "#8a8378", cursor: "pointer", padding: 0, marginBottom: 28, fontFamily: "inherit" }}>
        <IconBack /> Back to journeys
      </button>

      <div style={{ maxWidth: 680, margin: "0 auto", background: "#fff", border: "1px solid #ece6dc", borderRadius: 18, padding: 36, boxShadow: "0 2px 8px rgba(40,33,20,0.04)" }}>
        <h2 style={{ fontFamily: "'Newsreader',Georgia,serif", fontSize: 30, fontWeight: 600, color: "#1f1c18", margin: "0 0 6px", letterSpacing: "-0.01em" }}>Share your story</h2>
        <p style={{ fontSize: 14.5, color: "#8a8378", margin: "0 0 30px", lineHeight: 1.5 }}>Your experience could be the thing that helps someone else feel less alone. Take your time — there&rsquo;s no wrong way to tell it.</p>

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
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: "#0b544e", background: "#e9f0ee", padding: "1px 8px", borderRadius: 999 }}>{u.n}</span>
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
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: "#0b544e", background: "#e9f0ee", padding: "1px 8px", borderRadius: 999 }}>{c.n}</span>
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
          <button onClick={publish} className="sy-btn-teal" style={{ background: "#0f6f67", border: "none", borderRadius: 11, padding: "12px 26px", fontSize: 14, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "inherit", boxShadow: "0 2px 8px rgba(15,111,103,0.25)" }}>Publish story</button>
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
  const [toast, setToast] = useState("");
  const [stories, setStories] = useState<Story[]>(EMPTY_STORIES);
  const [storiesLoading, setStoriesLoading] = useState(true);
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
        supabase.from("stories").select("*").order("created_at", { ascending: false }).limit(100),
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
              onOpenStory={() => setView("story")}
              upvoteCounts={upvoteCounts}
              votedIds={votedIds}
              onToggleVote={toggleStoryVote}
              stories={stories}
              storiesLoading={storiesLoading}
            />
          )}
          {view === "story" && <StoryView onBack={() => setView("feed")} onShareStory={openForm} />}
          {view === "form" && (
            <FormView
              onBack={() => setView("feed")}
              user={user}
              onPublish={(story) => {
                setStories((prev) => [story, ...prev]);
                setUpvoteCounts((prev) => [0, ...prev]);
                setView("feed");
                setToast("Your journey is live!");
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
