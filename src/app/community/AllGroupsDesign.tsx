// @ts-nocheck
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

const QUIET_THRESHOLD = 12;
const AVCOLORS = ["#2f8f86", "#c2683f", "#4a6fb0", "#8a5aa8", "#317a52", "#b0593f", "#2f6f8f", "#7a6aa8"];
const NAMES = ["Aarav", "Lucia", "Daniel", "Mei", "Sofia", "Yusuf", "Priya", "Carlos", "Nina", "Omar", "Hana", "Leo", "Zara", "Ravi", "Ana", "Tom"];

const CATS = ["All", "City", "University", "Interest"];
const NUDGE_DISMISSED_KEY = "ygiu_groups_corner_nudge_dismissed";

const COVER_BY_ID = {
  ucla: "ucla",
  "uc-berkeley": "berkeley",
  stanford: "stanford",
  nyu: "nyu",
  columbia: "columbia",
  "ut-austin": "austin",
  "university-of-washington": "seattle",
  "washington-dc": "washingtondc",
  "new-york-city": "newyork",
  "los-angeles": "losangeles",
  "san-francisco-bay-area": "sanfrancisco",
  boston: "boston",
  chicago: "chicago",
  austin: "austin",
  seattle: "seattle",
  miami: "miami",
  asu: "austin",
  gcu: "lasvegas",
  "university-of-arizona": "lasvegas",
  phoenix: "lasvegas",
  tempe: "austin",
};

const COVER_KEYS = [
  ["princeton", "princeton"],
  ["harvard", "harvard"],
  ["yale", "yale"],
  ["cornell", "cornell"],
  ["mit", "mit"],
  ["berkeley", "berkeley"],
  ["stanford", "stanford"],
  ["columbia", "columbia"],
  ["nyu", "nyu"],
  ["ucla", "ucla"],
  ["boston", "boston"],
  ["chicago", "chicago"],
  ["seattle", "seattle"],
  ["miami", "miami"],
  ["washington", "washingtondc"],
  ["new york", "newyork"],
  ["los angeles", "losangeles"],
  ["san francisco", "sanfrancisco"],
  ["austin", "austin"],
  ["las vegas", "lasvegas"],
];

function hash(value = "") {
  let total = 0;
  for (const char of value) total = (total * 31 + char.charCodeAt(0)) >>> 0;
  return total;
}

function avColor(seed) {
  return AVCOLORS[hash(seed) % AVCOLORS.length];
}

function typeFor(group) {
  if (group?.type === "School" || group?.type === "University") return "University";
  if (group?.type === "City") return "City";
  return "Interest";
}

function coverFor(group) {
  if (group?.coverImage) return group.coverImage;
  if (group?.cover) return `/community-photos/${group.cover}.png`;
  if (COVER_BY_ID[group?.id]) return `/community-photos/${COVER_BY_ID[group.id]}.png`;

  const haystack = `${group?.id || ""} ${group?.name || ""} ${group?.location || ""}`.toLowerCase();
  const match = COVER_KEYS.find(([needle]) => haystack.includes(needle));
  if (match) return `/community-photos/${match[1]}.png`;

  const fallback = ["newyork", "boston", "austin", "seattle", "miami", "chicago", "sanfrancisco", "losangeles"];
  return `/community-photos/${fallback[hash(haystack) % fallback.length]}.png`;
}

function onlineFor(group, members) {
  const explicit = group?.onlineCount ?? group?.online_count ?? group?.online;
  if (Number.isFinite(Number(explicit))) return Math.max(0, Number(explicit));
  if (members < QUIET_THRESHOLD) return Math.min(2, members);
  return Math.max(1, Math.min(99, Math.round(members * 0.045) + (hash(group?.id || group?.name) % 4)));
}

function toDesignGroup(group, joined = false) {
  const members = Math.max(Number(group?.memberCount ?? group?.member_count ?? 0) || 0, joined ? 1 : 0);
  return {
    ...group,
    cat: typeFor(group),
    type: typeFor(group),
    loc: group?.location || "United States",
    coverUrl: coverFor(group),
    members,
    online: onlineFor(group, members),
    desc: group?.description || "A friendly community space for newcomers, students, and people finding their way in the USA.",
  };
}

function normalizedGroupName(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function membersFor(group) {
  const out = [];
  for (let index = 0; index < Math.min(group.members, 4); index += 1) {
    out.push(NAMES[(String(group.name || "").length + index * 5) % NAMES.length]);
  }
  return out;
}

function Stack({ group, waiting = false }) {
  const people = membersFor(group);
  const extra = group.members - people.length;
  return (
    <div className="stack">
      {people.map((name) => (
        <span key={name} className="av" style={{ background: avColor(name) }}>
          {name[0]}
        </span>
      ))}
      {waiting && people.length < 2 ? (
        <>
          <span className="av" style={{ background: "#2f8f86" }}>A</span>
          <span className="av" style={{ background: "#c2683f" }}>M</span>
        </>
      ) : null}
      {extra > 0 ? <span className="av more">+{extra > 99 ? "99" : extra}</span> : null}
    </div>
  );
}

function SearchSvg() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function CloseSvg() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function PlusSvg() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function CheckSvg() {
  return (
    <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function JoinSvg() {
  return (
    <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 11l2 2 4-4" />
      <circle cx="9" cy="8" r="4" />
      <path d="M3 20c0-4 3-6 6-6 1.6 0 3 .4 4 1" />
    </svg>
  );
}

function Toast({ message }) {
  return (
    <div className={`toast ${message ? "show" : ""}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5" />
      </svg>
      <span>{message}</span>
    </div>
  );
}

function CountUp({ target, active }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const start = performance.now();
    const duration = 900;
    function step(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) raf = requestAnimationFrame(step);
    }
    setValue(0);
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, active]);

  return <b>{value.toLocaleString()}</b>;
}

function Ticker({ group, quiet, active }) {
  const [index, setIndex] = useState(0);
  const pool = useMemo(() => {
    const count = quiet ? Math.max(2, Math.min(group.members || 1, 4)) : 7;
    return Array.from({ length: count }, (_, itemIndex) => {
      const name = NAMES[(String(group.name || "").length + itemIndex * 7) % NAMES.length];
      const ago = quiet ? ["just now", "2d ago", "5d ago", "1w ago"][itemIndex % 4] : ["just now", "1m ago", "3m ago", "7m ago", "12m ago"][itemIndex % 5];
      const verb = quiet ? "joined" : itemIndex % 3 === 0 ? "said hi" : "joined";
      return { name, ago, verb };
    });
  }, [group.id, group.members, group.name, quiet]);

  useEffect(() => {
    if (!active) return;
    setIndex(0);
    const interval = window.setInterval(() => setIndex((value) => value + 1), 2600);
    return () => window.clearInterval(interval);
  }, [active, pool.length]);

  const item = pool[index % pool.length] || pool[0];
  if (!item) return null;

  return (
    <div className="ticker reveal">
      <div className="thead">
        <span className="pd"></span>
        <span>{quiet ? "Recent activity" : "Joining now"}</span>
      </div>
      <div className="feed">
        <div key={`${group.id}-${index}`} className="item show">
          <span className="av" style={{ background: avColor(item.name) }}>{item.name[0]}</span>
          <span><b>{item.name}</b> {item.verb}</span>
          <span className="ago">{item.ago}</span>
        </div>
      </div>
    </div>
  );
}

function sparkleBurst(button) {
  if (!button || typeof document === "undefined") return;
  const root = getComputedStyle(document.documentElement);
  const cols = ["#5fd6a8", "#7fc9c0", "#e8b964", "#ffffff", root.getPropertyValue("--accent").trim() || "#2f8f86"];
  const rect = button.getBoundingClientRect();
  for (let index = 0; index < 16; index += 1) {
    const spark = document.createElement("span");
    spark.className = "spark";
    spark.style.background = cols[index % cols.length];
    spark.style.left = `${rect.left + rect.width / 2}px`;
    spark.style.top = `${rect.top + rect.height / 2}px`;
    document.body.appendChild(spark);
    const angle = (Math.PI * 2 * index) / 16 + Math.random() * 0.5;
    const distance = 60 + Math.random() * 70;
    spark.animate(
      [
        { transform: "translate(-50%,-50%) translate(0,0) scale(1)", opacity: 1 },
        { transform: `translate(-50%,-50%) translate(${Math.cos(angle) * distance}px,${Math.sin(angle) * distance}px) scale(0)`, opacity: 0 },
      ],
      { duration: 680 + Math.random() * 260, easing: "cubic-bezier(.2,.7,.2,1)" }
    ).onfinish = () => spark.remove();
  }
}

export default function AllGroupsDesign({
  user,
  groups = [],
  joinedIds = [],
  exitedIds = [],
  isModerator = false,
  onAuthRequired,
  onJoinGroup,
  onCreateGroup,
  onOpenGroup,
  onOpenDashboard,
  onOpenSettings,
  onSignOut,
  quietThreshold = QUIET_THRESHOLD,
}) {
  const [activeCat, setActiveCat] = useState("All");
  const [query, setQuery] = useState("");
  const [cardsIn, setCardsIn] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinState, setJoinState] = useState("idle");
  const [createState, setCreateState] = useState("idle");
  const [toast, setToast] = useState("");
  const [fillReady, setFillReady] = useState(false);
  const [nudgeVisible, setNudgeVisible] = useState(false);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [quietNudgeDismissed, setQuietNudgeDismissed] = useState(false);
  const [nudgeIndex, setNudgeIndex] = useState(0);
  const [nudgePaused, setNudgePaused] = useState(false);
  const [createType, setCreateType] = useState("City");
  const [createName, setCreateName] = useState("");
  const [createLocation, setCreateLocation] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createPrivacy, setCreatePrivacy] = useState("Public - anyone can join");
  const joinButtonRef = useRef(null);
  const createButtonRef = useRef(null);
  const createNameRef = useRef(null);

  const joinedSet = useMemo(() => new Set(joinedIds), [joinedIds]);
  const exitedSet = useMemo(() => new Set(exitedIds), [exitedIds]);
  const designGroups = useMemo(
    () =>
      groups.map((group) => {
        const joined = Boolean((user && group?.createdBy === user.id) || joinedSet.has(group.id)) && !exitedSet.has(group.id);
        return toDesignGroup(group, joined);
      }),
    [groups, joinedSet, exitedSet, user?.id]
  );

  const filteredGroups = useMemo(() => {
    const search = query.trim().toLowerCase();
    return designGroups.filter((group) => {
      const matchesCat = activeCat === "All" || group.type === activeCat;
      const matchesSearch = !search || `${group.name} ${group.loc} ${group.desc}`.toLowerCase().includes(search);
      return matchesCat && matchesSearch;
    });
  }, [activeCat, query, designGroups]);

  const selected = selectedGroup ? toDesignGroup(selectedGroup, joinedSet.has(selectedGroup.id) || (user && selectedGroup.createdBy === user.id)) : null;
  const selectedJoined = Boolean(selectedGroup && user && (isModerator || joinedSet.has(selectedGroup.id) || selectedGroup.createdBy === user.id));
  const selectedQuiet = Boolean(selected && selected.members < quietThreshold);
  const drawerOpen = Boolean(selectedGroup) || createOpen;
  const quietNudgeGroup = designGroups.find((group) => group.members < quietThreshold) || designGroups[0];
  const nudgeItem = nudgeIndex % 2 === 0 ? { kind: "create" } : { kind: "wait", group: quietNudgeGroup };

  useEffect(() => {
    setCardsIn(false);
    const frame = requestAnimationFrame(() => setCardsIn(true));
    return () => cancelAnimationFrame(frame);
  }, [activeCat, query, designGroups.length]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!drawerOpen) return;
    document.body.classList.add("drawer-open");
    document.body.style.overflow = "hidden";
    return () => {
      document.body.classList.remove("drawer-open");
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  useEffect(() => {
    if (!selected) return;
    setJoinState("idle");
    setFillReady(false);
    const timer = window.setTimeout(() => setFillReady(true), 180);
    return () => window.clearTimeout(timer);
  }, [selected?.id]);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(NUDGE_DISMISSED_KEY) === "1") {
        setNudgeDismissed(true);
        return;
      }
    } catch {}

    const bottomTimer = window.setTimeout(() => {
      if (!nudgeDismissed && designGroups.length) setNudgeVisible(true);
    }, 2600);
    return () => {
      window.clearTimeout(bottomTimer);
    };
  }, [designGroups.length, nudgeDismissed]);

  useEffect(() => {
    if (!nudgeVisible || nudgePaused || nudgeDismissed || !designGroups.length) return;
    const timer = window.setTimeout(() => setNudgeIndex((value) => value + 1), 8000);
    return () => window.clearTimeout(timer);
  }, [nudgeVisible, nudgePaused, nudgeDismissed, nudgeIndex, designGroups.length]);

  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key === "Escape") {
        setSelectedGroup(null);
        setCreateOpen(false);
      }
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, []);

  function showToast(message) {
    setToast(message);
  }

  function openJoin(group) {
    setSelectedGroup(group);
    setCreateOpen(false);
  }

  function openCreate() {
    setCreateOpen(true);
    setSelectedGroup(null);
    setCreateState("idle");
  }

  function openDashboard() {
    if (user) {
      onOpenDashboard?.();
      return;
    }
    onAuthRequired?.(null, "dashboard");
  }

  function dismissNudge() {
    setNudgeDismissed(true);
    setNudgeVisible(false);
    try {
      sessionStorage.setItem(NUDGE_DISMISSED_KEY, "1");
    } catch {}
  }

  function closeDrawers() {
    setSelectedGroup(null);
    setCreateOpen(false);
  }

  async function handleJoin() {
    if (!selectedGroup || joinState === "loading" || joinState === "done") return;
    if (selectedJoined) {
      onOpenGroup?.(selectedGroup);
      return;
    }
    if (!user) {
      onAuthRequired?.(selectedGroup, "join");
      return;
    }

    setJoinState("loading");
    try {
      const joinedGroup = (await onJoinGroup?.(selectedGroup)) || selectedGroup;
      setJoinState("done");
      window.setTimeout(() => sparkleBurst(joinButtonRef.current), 20);
      showToast(selectedQuiet ? `You're in! We'll ping you as ${selected.name} grows.` : `Welcome to ${selected.name} - say hi in the chat room.`);
      window.setTimeout(() => {
        closeDrawers();
        onOpenGroup?.(joinedGroup);
      }, 1100);
    } catch (error) {
      setJoinState("idle");
      showToast(error?.message || "Unable to join right now. Please try again.");
    }
  }

  function resetCreate() {
    setCreateState("idle");
    setCreateName("");
    setCreateLocation("");
    setCreateDescription("");
    setCreatePrivacy("Public - anyone can join");
    setCreateType("City");
    if (createNameRef.current) createNameRef.current.style.borderColor = "";
  }

  async function handleCreate() {
    const cleanName = createName.trim();
    if (!cleanName) {
      const input = createNameRef.current;
      if (input) {
        input.style.borderColor = "#c2683f";
        input.focus();
        input.animate([{ transform: "translateX(0)" }, { transform: "translateX(-6px)" }, { transform: "translateX(6px)" }, { transform: "translateX(0)" }], { duration: 300 });
      }
      return;
    }
    if (!user) {
      onAuthRequired?.(null, "create");
      return;
    }

    const cleanKey = normalizedGroupName(cleanName);
    const duplicate = cleanKey && designGroups.some((group) => normalizedGroupName(group.name) === cleanKey);
    if (duplicate) {
      if (createNameRef.current) createNameRef.current.style.borderColor = "#c2683f";
      showToast("That group already exists. Open the existing group or choose another name.");
      return;
    }

    setCreateState("loading");
    try {
      const created = await onCreateGroup?.({
        name: cleanName,
        type: createType === "University" ? "School" : createType === "City" ? "City" : "Custom",
        location: createLocation.trim(),
        description: createDescription.trim(),
        privacy: createPrivacy,
      });
      setCreateState("done");
      window.setTimeout(() => sparkleBurst(createButtonRef.current), 20);
      showToast(`"${cleanName}" is live! Invite a few friends to kick it off.`);
      window.setTimeout(() => {
        closeDrawers();
        resetCreate();
        if (created) onOpenGroup?.(created);
      }, 1150);
    } catch (error) {
      setCreateState("idle");
      showToast(error?.message || "Unable to create this group right now.");
    }
  }

  return (
    <div className="yg-groups-design">
      <style dangerouslySetInnerHTML={{ __html: groupsDesignCss }} />

      <div className="shell">
        <div className="panel">
          <nav>
            <a className="brand" href="/">
              <span className="mark"><img src="/statue-liberty-mark.png" alt="" /></span>
              yourguideinusa
            </a>
            <div className="navlinks">
              <a href="/">Home</a>
              <a href="/guide">Guide</a>
              <a href="/blog">Blogs</a>
              <a href="/community" className="active">Community</a>
              <a href="/contact">Contact us</a>
            </div>
            <div className="navtools">
              <button className="dash-btn" type="button" onClick={openDashboard}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" />
                  <rect x="14" y="14" width="7" height="7" rx="1.5" />
                </svg>
                Dashboard
              </button>
              <button className="icon-btn" type="button" aria-label="Account" onClick={() => (user ? onOpenSettings?.() : (window.location.href = "/login"))}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 4-6 8-6s8 2 8 6" /></svg>
              </button>
              {user ? (
                <button className="icon-btn" type="button" aria-label="Sign out" onClick={onSignOut}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 17l5-5-5-5" /><path d="M20 12H9" /><path d="M12 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6" /></svg>
                </button>
              ) : null}
            </div>
          </nav>

          <div className="ghead">
            <div>
              <div className="eyebrow">Community</div>
              <h1>All groups</h1>
              <p>Find people on the same journey - by city, campus or what you're into. Or start your own and we'll help it grow.</p>
            </div>
            <div className="ghead-actions">
              <div className="search">
                <SearchSvg />
                <input value={query} onChange={(event) => setQuery(event.target.value)} type="text" placeholder="Find a group..." autoComplete="off" />
              </div>
              <button className="btn btn-accent" type="button" onClick={openCreate}><PlusSvg />Create group</button>
            </div>
          </div>

          <div className="chips">
            {CATS.map((cat) => {
              const count = cat === "All" ? designGroups.length : designGroups.filter((group) => group.type === cat).length;
              return (
                <button key={cat} className={`chip ${activeCat === cat ? "active" : ""}`} type="button" onClick={() => setActiveCat(cat)}>
                  {cat}<span className="c-count">{count}</span>
                </button>
              );
            })}
          </div>

          <div className="grid">
            {filteredGroups.length ? (
              filteredGroups.map((group, index) => {
                const quiet = group.members < quietThreshold;
                return (
                  <article key={group.id} className={`gcard ${cardsIn ? "in" : ""}`} style={{ transitionDelay: `${index * 40}ms` }} onClick={() => openJoin(group)}>
                    <div className="cover" style={{ backgroundImage: `url('${group.coverUrl}')` }}>
                      <span className="cat">{group.cat}</span>
                      <span className={`live ${quiet ? "quiet" : ""}`}><span className="dot"></span>{quiet ? "New" : `${group.online} online`}</span>
                    </div>
                    <div className="body">
                      <h3>{group.name}</h3>
                      <div className="desc">{group.desc}</div>
                      <div className="meta">
                        <Stack group={group} />
                        <div className="mcount"><b>{group.members.toLocaleString()}</b> {group.members === 1 ? "member" : "members"}</div>
                      </div>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="empty-match">
                No groups match <b>{query}</b>. <button type="button" onClick={openCreate}>Create it -&gt;</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <footer>
        <div className="foot-inner">
          <div>© 2026 yourguideinusa - made with care for people far from home.</div>
          <div>
            <a href="/">Home</a><a href="/guide">Guide</a><a href="/blog">Blogs</a><a href="/community">Community</a><a href="/contact">Contact us</a>
          </div>
        </div>
      </footer>

      <div className={`scrim ${selected ? "open" : ""}`} onClick={(event) => event.target === event.currentTarget && setSelectedGroup(null)}>
        {selected ? (
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="jmTitle">
            <button className="x" type="button" onClick={() => setSelectedGroup(null)} aria-label="Close"><CloseSvg /></button>
            <div className="m-cover" style={{ backgroundImage: `url('${selected.coverUrl}')` }}>
              <span className="orb o1"></span><span className="orb o2"></span><span className="orb o3"></span>
              <span className="cat">{selected.cat}</span>
              <span className={`cstat ${selectedQuiet ? "quiet" : ""}`}><span className="d"></span><span>{selectedQuiet ? "Just getting started" : `${selected.online} online now`}</span></span>
            </div>
            <div className="m-body">
              <div className="m-title reveal" id="jmTitle">{selected.name}</div>
              <div className="m-loc reveal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11Z" /><circle cx="12" cy="10" r="2.4" /></svg>
                <span>{selected.loc}</span>
              </div>

              <div className="m-members reveal">
                <Stack group={selected} />
                <div className="mtext">
                  {selectedQuiet ? (
                    <><CountUp target={selected.members} active={Boolean(selected)} /> {selected.members === 1 ? "person has" : "people have"} joined so far</>
                  ) : (
                    <><CountUp target={selected.members} active={Boolean(selected)} /> members · <b>{selected.online}</b> online now</>
                  )}
                </div>
              </div>

              <div className={`status reveal ${selectedQuiet ? "quiet" : "active"}`}>
                <div className="ico">
                  {selectedQuiet ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M8 12h8M8 8h8M8 16h5" /><path d="M21 12a9 9 0 1 1-3.6-7.2" /></svg>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <h4>{selectedQuiet ? "It's quiet in here - for now" : "This group is buzzing"}</h4>
                  <p>
                    {selectedQuiet ? (
                      <>Only a few people so far. Join now and we'll notify you the moment more newcomers arrive<span className="waitdots"><i></i><i></i><i></i></span></>
                    ) : (
                      <><b style={{ color: "var(--ink)" }}>{selected.online} people</b> are chatting right now. Jump in and say hi - no waiting around.</>
                    )}
                  </p>
                  <div className="prog">
                    <div className="bar"><div className="fill" style={{ width: fillReady ? (selectedQuiet ? `${Math.min(100, (selected.members / quietThreshold) * 100)}%` : "100%") : "0%" }}></div></div>
                    <div className="lab">
                      <span>{selectedQuiet ? `${selected.members} / ${quietThreshold} to get active` : "Active community"}</span>
                      <span>{selectedQuiet ? `${Math.round((selected.members / quietThreshold) * 100)}%` : `${selected.online} online`}</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
            <div className="m-foot">
              <button ref={joinButtonRef} className={`joinbtn ${joinState}`} type="button" onClick={handleJoin}>
                <span className="spin"></span>
                {joinState === "done" ? <CheckSvg /> : <JoinSvg />}
                <span className="lbl">{joinState === "done" ? "Joined" : selectedJoined ? "Open chat room" : selectedQuiet ? "Join & wait for members" : "Join group now"}</span>
              </button>
              <div className="m-sub">{selectedJoined ? "You are already in - open the chat room anytime" : selectedQuiet ? "Be one of the first - early members shape the vibe" : "Instant access · start chatting the moment you join"}</div>
            </div>
          </div>
        ) : null}
      </div>

      <div className={`scrim ${createOpen ? "open" : ""}`} onClick={(event) => event.target === event.currentTarget && setCreateOpen(false)}>
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="cmTitle">
          <button className="x" type="button" onClick={() => setCreateOpen(false)} aria-label="Close"><CloseSvg /></button>
          <div className="m-body" style={{ paddingTop: 30 }}>
            <div className="m-title" id="cmTitle">Start a new group</div>
            <p style={{ color: "var(--ink-soft)", fontSize: 14.5, marginTop: 8, textWrap: "pretty" }}>Create a space, invite a few people, and we'll surface it to newcomers near you so it fills up fast.</p>

            <div className="field">
              <label>Group name</label>
              <input ref={createNameRef} value={createName} onChange={(event) => {
                setCreateName(event.target.value);
                if (createNameRef.current) createNameRef.current.style.borderColor = "";
              }} type="text" placeholder="e.g. Bay Area Indian Students" />
            </div>
            <div className="field">
              <label>Type</label>
              <div className="seg">
                {[
                  ["City", "City", "Neighbors & locals"],
                  ["University", "Campus", "Your university"],
                  ["Interest", "Interest", "Hobbies & topics"],
                ].map(([key, title, desc]) => (
                  <button key={key} type="button" className={`opt ${createType === key ? "sel" : ""}`} onClick={() => setCreateType(key)}>
                    {key === "City" ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 21h18M5 21V7l7-4 7 4v14" /><path d="M9 9h.01M9 13h.01M15 9h.01M15 13h.01" /></svg>
                    ) : key === "University" ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 10 12 5 2 10l10 5 10-5Z" /><path d="M6 12v5c0 1 3 3 6 3s6-2 6-3v-5" /></svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" /></svg>
                    )}
                    <div><div className="ot">{title}</div><div className="od">{desc}</div></div>
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <div className="row">
                <div>
                  <label>Location</label>
                  <input value={createLocation} onChange={(event) => setCreateLocation(event.target.value)} type="text" placeholder="City, State" />
                </div>
                <div>
                  <label>Privacy</label>
                  <select value={createPrivacy} onChange={(event) => setCreatePrivacy(event.target.value)}>
                    <option>Public - anyone can join</option>
                    <option>Request to join</option>
                    <option>Invite only</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="field">
              <label>What's it about?</label>
              <textarea value={createDescription} onChange={(event) => setCreateDescription(event.target.value)} rows={3} placeholder="A friendly group for..." />
            </div>
          </div>
          <div className="m-foot">
            <button ref={createButtonRef} className={`joinbtn ${createState}`} type="button" onClick={handleCreate}>
              <span className="spin"></span>
              {createState === "done" ? <CheckSvg /> : <PlusSvg />}
              <span className="lbl">{createState === "done" ? "Created" : "Create group"}</span>
            </button>
            <div className="m-sub">{user ? "You'll be the admin · invite people right after" : "Sign in is required before the group goes live"}</div>
          </div>
        </div>
      </div>

      <div className="nudge-stack">
        {quietNudgeGroup && (
          <div
            className={`nudge quiet ${nudgeVisible && !quietNudgeDismissed ? "show" : ""}`}
            onMouseEnter={() => setNudgePaused(true)}
            onMouseLeave={() => setNudgePaused(false)}
          >
            <div className="accentbar"></div>
            <div className="nbody">
              <div className="ntop">
                <div className="nthumb" style={{ background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>👥</div>
                <div style={{ minWidth: 0 }}>
                  <div className="ntitle">Not many people yet</div>
                  <div className="ncat"><span className="ld"></span>Groups are just getting started</div>
                </div>
                <button className="nx" type="button" onClick={() => setQuietNudgeDismissed(true)} aria-label="Dismiss"><CloseSvg /></button>
              </div>
              <div className="nmsg">
                Most groups are still new. <b>Join one now</b> and be among the first — your classmates will follow.
              </div>
              <div className="nrow">
                <div className="stack"></div>
                <button className="njoin" type="button" onClick={() => { setQuietNudgeDismissed(true); openJoin(quietNudgeGroup); }}>
                  Join a group
                </button>
              </div>
            </div>
          </div>
        )}
        <div
          className={`nudge active ${nudgeVisible && !nudgeDismissed ? "show" : ""}`}
          onMouseEnter={() => setNudgePaused(true)}
          onMouseLeave={() => setNudgePaused(false)}
        >
          <div className="accentbar"></div>
          <div className="nbody">
            <div className="ntop">
              <div className="nthumb" style={{ background: "var(--accent)" }}><PlusSvg /></div>
              <div style={{ minWidth: 0 }}>
                <div className="ntitle">Can't find your group?</div>
                <div className="ncat"><span className="ld"></span>Start something new</div>
              </div>
              <button className="nx" type="button" onClick={dismissNudge} aria-label="Dismiss"><CloseSvg /></button>
            </div>
            <div className="nmsg">
              Create one in seconds - we'll surface it to newcomers nearby so it <b>fills up fast</b>.
            </div>
            <div className="nrow">
              <div className="stack"></div>
              <button className="njoin" type="button" onClick={() => { setNudgeVisible(false); openCreate(); }}>
                Create group
              </button>
            </div>
          </div>
          <div className="ntimer"><i key={`${nudgeIndex}-${nudgePaused}`} className={nudgePaused ? "paused" : ""}></i></div>
        </div>
      </div>

      <Toast message={toast} />
    </div>
  );
}

const groupsDesignCss = `
  :root{
    --bg:#e9e8e4;
    --panel:#f6f5f2;
    --panel-2:#f0efeb;
    --ink:#1a1916;
    --ink-soft:#5d5a52;
    --muted:#a3a097;
    --line:#e3e1db;
    --accent:#2f8f86;
    --accent-soft:#e6f0ee;
    --speed:1;
    --radius-card:26px;
    --shadow-card:0 14px 30px -18px rgba(30,28,22,.45), 0 2px 6px -2px rgba(30,28,22,.12);
  }
  .yg-groups-design,.yg-groups-design *{box-sizing:border-box}
  .yg-groups-design{
    min-height:100vh;
    max-width:100vw;
    overflow-x:hidden;
    font-family:'Schibsted Grotesk',system-ui,sans-serif;
    background:var(--bg);
    color:var(--ink);
    -webkit-font-smoothing:antialiased;
    line-height:1.5;
  }
  .yg-groups-design .mono{font-family:'JetBrains Mono',monospace;}
  .yg-groups-design .shell{max-width:1480px;margin:0 auto 40px;padding:0 16px 16px;}
  .yg-groups-design .panel{
    background:linear-gradient(180deg,#fbfaf8 0%,var(--panel) 60%,var(--panel-2) 100%);
    border-radius:30px;
    box-shadow:0 40px 80px -50px rgba(30,28,22,.4),0 2px 0 rgba(255,255,255,.6) inset;
    position:relative;overflow:hidden;
    min-height:calc(100vh - 90px);
    display:flex;flex-direction:column;
  }
  .yg-groups-design nav{
    display:flex;align-items:center;justify-content:space-between;
    padding:26px 40px;position:relative;z-index:30;
  }
  .yg-groups-design .brand{display:flex;align-items:center;gap:11px;font-weight:700;font-size:20px;letter-spacing:-.02em;text-decoration:none;color:var(--ink)}
  .yg-groups-design .brand .mark{
    width:30px;height:30px;border-radius:9px;
    background:conic-gradient(from 200deg,var(--accent),#7fc9c0,var(--accent));
    display:grid;place-items:center;color:#fff;overflow:hidden;
    box-shadow:0 4px 10px -3px rgba(47,143,134,.6);
  }
  .yg-groups-design .brand .mark img{width:22px;height:25px;object-fit:contain;filter:drop-shadow(0 1px 1px rgba(0,0,0,.18))}
  .yg-groups-design .navlinks{display:flex;gap:34px;align-items:center}
  .yg-groups-design .navlinks a{
    color:var(--ink-soft);text-decoration:none;font-size:15px;font-weight:500;
    position:relative;transition:color .2s;
  }
  .yg-groups-design .navlinks a:hover,.yg-groups-design .navlinks a.active{color:var(--ink)}
  .yg-groups-design .navlinks a::after{
    content:"";position:absolute;left:0;bottom:-6px;height:2px;width:0;
    background:var(--accent);transition:width .25s;border-radius:2px;
  }
  .yg-groups-design .navlinks a:hover::after,.yg-groups-design .navlinks a.active::after{width:100%}
  .yg-groups-design .navtools{display:flex;gap:10px;align-items:center}
  .yg-groups-design .dash-btn{
    height:40px;border-radius:999px;border:1px solid var(--line);
    background:#fff;color:var(--ink-soft);display:inline-flex;align-items:center;gap:8px;
    padding:0 15px;cursor:pointer;font-family:inherit;font-size:14px;font-weight:600;
    transition:.2s;white-space:nowrap;
  }
  .yg-groups-design .dash-btn:hover{color:var(--ink);box-shadow:var(--shadow-card);transform:translateY(-1px)}
  .yg-groups-design .dash-btn svg{width:17px;height:17px}
  .yg-groups-design .icon-btn{
    width:40px;height:40px;border-radius:50%;border:1px solid var(--line);
    background:#fff;display:grid;place-items:center;cursor:pointer;color:var(--ink-soft);
    transition:.2s;
  }
  .yg-groups-design .icon-btn:hover{color:var(--ink);box-shadow:var(--shadow-card)}
  .yg-groups-design .icon-btn svg{width:18px;height:18px}
  .yg-groups-design .ghead{padding:6px 40px 0;display:flex;flex-wrap:wrap;align-items:flex-end;gap:24px;justify-content:space-between}
  .yg-groups-design .ghead .eyebrow{
    font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:.18em;
    text-transform:uppercase;color:var(--accent);font-weight:500;
  }
  .yg-groups-design .ghead h1{font-size:clamp(30px,4.2vw,52px);font-weight:700;letter-spacing:-.03em;line-height:1.0;margin-top:12px}
  .yg-groups-design .ghead p{color:var(--ink-soft);font-size:16.5px;margin-top:12px;max-width:440px;text-wrap:pretty}
  .yg-groups-design .ghead-actions{display:flex;gap:12px;align-items:center}
  .yg-groups-design .search{
    display:flex;align-items:center;gap:10px;background:#fff;border:1px solid var(--line);
    border-radius:13px;padding:12px 16px;min-width:240px;transition:.2s;
  }
  .yg-groups-design .search:focus-within{box-shadow:0 0 0 4px var(--accent-soft);border-color:var(--accent)}
  .yg-groups-design .search svg{width:17px;height:17px;color:var(--muted);flex:0 0 auto}
  .yg-groups-design .search input{border:none;outline:none;background:none;font-family:inherit;font-size:15px;color:var(--ink);width:100%}
  .yg-groups-design .search input::placeholder{color:var(--muted)}
  .yg-groups-design .btn{
    font-family:inherit;font-size:15px;font-weight:600;cursor:pointer;border:none;
    padding:13px 22px;border-radius:13px;transition:.22s;display:inline-flex;align-items:center;gap:9px;white-space:nowrap;
  }
  .yg-groups-design .btn svg{width:17px;height:17px}
  .yg-groups-design .btn-accent{background:var(--accent);color:#fff}
  .yg-groups-design .btn-accent:hover{filter:brightness(.95);transform:translateY(-2px);box-shadow:0 16px 30px -14px rgba(47,143,134,.6)}
  .yg-groups-design .chips{display:flex;gap:10px;flex-wrap:wrap;padding:30px 40px 22px}
  .yg-groups-design .chip{
    font-size:14px;font-weight:500;color:var(--ink-soft);background:#fff;border:1px solid var(--line);
    border-radius:999px;padding:9px 17px;cursor:pointer;transition:.2s;display:inline-flex;align-items:center;gap:7px;
  }
  .yg-groups-design .chip:hover{color:var(--ink);box-shadow:var(--shadow-card)}
  .yg-groups-design .chip.active{background:var(--ink);color:#fff;border-color:var(--ink)}
  .yg-groups-design .chip .c-count{font-size:12px;opacity:.6;font-family:'JetBrains Mono',monospace}
  .yg-groups-design .grid{
    display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:22px;
    padding:6px 40px 60px;
  }
  .yg-groups-design .gcard{
    background:#fff;border:1px solid var(--line);border-radius:var(--radius-card);
    overflow:hidden;cursor:pointer;display:flex;flex-direction:column;
    transition:transform .3s cubic-bezier(.2,.7,.2,1),box-shadow .3s,opacity .35s ease;
    opacity:0;transform:translateY(16px);
  }
  .yg-groups-design .gcard.in{opacity:1;transform:none}
  .yg-groups-design .gcard:hover{transform:translateY(-6px);box-shadow:0 26px 44px -26px rgba(30,28,22,.5)}
  .yg-groups-design .gcard .cover{position:relative;height:148px;background:#dcdad4 center/cover no-repeat}
  .yg-groups-design .gcard .cover::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 40%,rgba(0,0,0,.42))}
  .yg-groups-design .gcard .cat{
    position:absolute;top:12px;left:12px;z-index:2;font-size:11.5px;font-weight:600;
    background:rgba(255,255,255,.92);backdrop-filter:blur(4px);color:var(--ink);
    padding:5px 11px;border-radius:999px;letter-spacing:.01em;
  }
  .yg-groups-design .gcard .live{
    position:absolute;top:12px;right:12px;z-index:2;font-size:11px;font-weight:600;
    background:rgba(20,18,14,.55);backdrop-filter:blur(4px);color:#fff;
    padding:5px 10px 5px 8px;border-radius:999px;display:flex;align-items:center;gap:6px;
  }
  .yg-groups-design .gcard .live .dot{width:7px;height:7px;border-radius:50%;background:#5fd6a8;box-shadow:0 0 0 0 rgba(95,214,168,.7);animation:livePulse calc(2.4s / var(--speed)) infinite}
  .yg-groups-design .gcard .live.quiet .dot{background:#e6b450;animation:none}
  @keyframes livePulse{0%{box-shadow:0 0 0 0 rgba(95,214,168,.6)}70%{box-shadow:0 0 0 7px rgba(95,214,168,0)}100%{box-shadow:0 0 0 0 rgba(95,214,168,0)}}
  .yg-groups-design .gcard .body{padding:16px 18px 18px;display:flex;flex-direction:column;gap:12px;flex:1}
  .yg-groups-design .gcard h3{font-size:18.5px;font-weight:600;letter-spacing:-.01em;line-height:1.15}
  .yg-groups-design .gcard .desc{font-size:13.7px;color:var(--ink-soft);line-height:1.5;flex:1}
  .yg-groups-design .gcard .meta{display:flex;align-items:center;justify-content:space-between;margin-top:2px}
  .yg-groups-design .stack{display:flex;align-items:center}
  .yg-groups-design .stack .av{
    width:30px;height:30px;border-radius:50%;border:2px solid #fff;display:grid;place-items:center;
    color:#fff;font-size:11px;font-weight:700;margin-left:-9px;
  }
  .yg-groups-design .stack .av:first-child{margin-left:0}
  .yg-groups-design .stack .more{background:var(--panel-2);color:var(--ink-soft);border:2px solid #fff;font-size:10.5px}
  .yg-groups-design .gcard .mcount{font-size:13px;color:var(--muted);font-weight:500}
  .yg-groups-design .gcard .mcount b{color:var(--ink);font-weight:600}
  .yg-groups-design .empty-match{grid-column:1/-1;text-align:center;padding:50px 0;color:var(--muted)}
  .yg-groups-design .empty-match b{color:var(--ink)}
  .yg-groups-design .empty-match button{border:none;background:transparent;color:var(--accent);cursor:pointer;font:inherit;font-weight:600}
  .yg-groups-design .scrim{
    position:fixed;inset:0;z-index:100;display:flex;align-items:stretch;justify-content:flex-end;
    background:rgba(26,25,22,0);backdrop-filter:blur(0px);
    opacity:0;pointer-events:none;transition:opacity .4s ease, backdrop-filter .4s ease, background .4s ease;
  }
  .yg-groups-design .scrim.open{opacity:1;pointer-events:auto;background:rgba(26,25,22,.5);backdrop-filter:blur(7px)}
  .yg-groups-design .modal{
    width:min(452px,100%);height:100vh;background:#fff;overflow:hidden;position:relative;
    border-radius:30px 0 0 30px;
    box-shadow:-44px 0 110px -34px rgba(20,18,14,.6);
    transform:translateX(102%);
    transition:transform .6s cubic-bezier(.16,1,.3,1);
    display:flex;flex-direction:column;
  }
  .yg-groups-design .scrim.open .modal{transform:none}
  .yg-groups-design .reveal{opacity:0;transform:translateY(18px);transition:opacity .55s ease, transform .65s cubic-bezier(.16,1,.3,1)}
  .yg-groups-design .scrim.open .reveal{opacity:1;transform:none}
  .yg-groups-design .scrim.open .reveal:nth-of-type(1){transition-delay:.14s}
  .yg-groups-design .scrim.open .reveal:nth-of-type(2){transition-delay:.20s}
  .yg-groups-design .scrim.open .reveal:nth-of-type(3){transition-delay:.26s}
  .yg-groups-design .scrim.open .reveal:nth-of-type(4){transition-delay:.32s}
  .yg-groups-design .scrim.open .reveal:nth-of-type(5){transition-delay:.38s}
  .yg-groups-design .modal .x{
    position:absolute;top:18px;right:18px;z-index:6;width:38px;height:38px;border-radius:50%;
    border:none;background:rgba(255,255,255,.85);backdrop-filter:blur(4px);color:var(--ink);
    cursor:pointer;display:grid;place-items:center;transition:.2s;
  }
  .yg-groups-design .modal .x:hover{background:#fff;box-shadow:var(--shadow-card);transform:rotate(90deg)}
  .yg-groups-design .modal .x svg{width:17px;height:17px}
  .yg-groups-design .m-cover{height:188px;position:relative;background:#dcdad4 center/cover no-repeat;flex:0 0 auto;overflow:hidden}
  .yg-groups-design .m-cover::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.05) 25%,rgba(0,0,0,.55))}
  .yg-groups-design .m-cover .orb{position:absolute;border-radius:50%;filter:blur(26px);mix-blend-mode:screen;opacity:.7;pointer-events:none;z-index:1}
  .yg-groups-design .m-cover .orb.o1{width:170px;height:170px;left:-30px;top:-50px;background:var(--accent);animation:drift1 calc(11s / var(--speed)) ease-in-out infinite}
  .yg-groups-design .m-cover .orb.o2{width:130px;height:130px;right:-20px;top:10px;background:#7fc9c0;animation:drift2 calc(14s / var(--speed)) ease-in-out infinite}
  .yg-groups-design .m-cover .orb.o3{width:90px;height:90px;right:40%;bottom:-30px;background:#e8b964;opacity:.5;animation:drift1 calc(9s / var(--speed)) ease-in-out infinite reverse}
  @keyframes drift1{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(26px,18px) scale(1.15)}}
  @keyframes drift2{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-22px,22px) scale(1.2)}}
  .yg-groups-design .m-cover .cat{
    position:absolute;bottom:16px;left:24px;z-index:3;font-size:12px;font-weight:600;
    background:rgba(255,255,255,.92);color:var(--ink);padding:6px 13px;border-radius:999px;
  }
  .yg-groups-design .m-cover .cstat{
    position:absolute;bottom:16px;right:24px;z-index:3;font-size:12px;font-weight:600;color:#fff;
    background:rgba(20,18,14,.42);backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,.18);
    padding:6px 12px 6px 10px;border-radius:999px;display:flex;align-items:center;gap:7px;
  }
  .yg-groups-design .m-cover .cstat .d{width:7px;height:7px;border-radius:50%;background:#5fd6a8;box-shadow:0 0 0 0 rgba(95,214,168,.7);animation:livePulse calc(2.2s / var(--speed)) infinite}
  .yg-groups-design .m-cover .cstat.quiet .d{background:#e8b964;animation:none}
  .yg-groups-design .m-body{padding:22px 26px 8px;overflow-y:auto;flex:1}
  .yg-groups-design .m-title{font-size:25px;font-weight:700;letter-spacing:-.02em;line-height:1.1}
  .yg-groups-design .m-loc{display:flex;align-items:center;gap:7px;color:var(--ink-soft);font-size:14px;margin-top:7px}
  .yg-groups-design .m-loc svg{width:15px;height:15px;color:var(--muted)}
  .yg-groups-design .m-members{display:flex;align-items:center;gap:14px;margin-top:20px}
  .yg-groups-design .m-members .stack .av{width:38px;height:38px;font-size:13px;margin-left:-12px}
  .yg-groups-design .m-members .stack .av:first-child{margin-left:0}
  .yg-groups-design .m-members .stack .av{opacity:0;transform:scale(.4)}
  .yg-groups-design .scrim.open .m-members .stack .av{animation:avPop .5s cubic-bezier(.2,1.4,.4,1) forwards}
  @keyframes avPop{to{opacity:1;transform:scale(1)}}
  .yg-groups-design .m-members .mtext{font-size:14px;color:var(--ink-soft);line-height:1.35}
  .yg-groups-design .m-members .mtext b{color:var(--ink);font-weight:700}
  .yg-groups-design .status{
    margin-top:22px;border-radius:18px;padding:18px 18px;display:flex;gap:14px;align-items:flex-start;
    border:1px solid var(--line);position:relative;overflow:hidden;
  }
  .yg-groups-design .status.quiet{background:linear-gradient(180deg,#fbf6ec,#f8f1e2);border-color:#efe2c8}
  .yg-groups-design .status.active{background:var(--accent-soft);border-color:color-mix(in srgb,var(--accent) 22%,white)}
  .yg-groups-design .status .ico{flex:0 0 auto;width:42px;height:42px;border-radius:12px;display:grid;place-items:center}
  .yg-groups-design .status.quiet .ico{background:#f3e4c4;color:#a9803a}
  .yg-groups-design .status.active .ico{background:#fff;color:var(--accent)}
  .yg-groups-design .status .ico svg{width:21px;height:21px}
  .yg-groups-design .status h4{font-size:15.5px;font-weight:700;letter-spacing:-.01em}
  .yg-groups-design .status p{font-size:13.8px;color:var(--ink-soft);margin-top:4px;text-wrap:pretty;line-height:1.5}
  .yg-groups-design .waitdots{display:inline-flex;gap:4px;margin-left:2px;vertical-align:middle}
  .yg-groups-design .waitdots i{width:5px;height:5px;border-radius:50%;background:#c39a4e;display:inline-block;animation:wd 1.3s infinite}
  .yg-groups-design .waitdots i:nth-child(2){animation-delay:.18s}
  .yg-groups-design .waitdots i:nth-child(3){animation-delay:.36s}
  @keyframes wd{0%,60%,100%{opacity:.3;transform:translateY(0)}30%{opacity:1;transform:translateY(-3px)}}
  .yg-groups-design .prog{margin-top:14px}
  .yg-groups-design .prog .bar{height:7px;border-radius:999px;background:#fff;overflow:hidden;box-shadow:inset 0 0 0 1px rgba(0,0,0,.04)}
  .yg-groups-design .prog .fill{height:100%;border-radius:999px;width:0;transition:width 1.1s cubic-bezier(.2,.7,.2,1)}
  .yg-groups-design .status.quiet .prog .fill{background:linear-gradient(90deg,#e6b450,#d79a35)}
  .yg-groups-design .status.active .prog .fill{background:var(--accent)}
  .yg-groups-design .prog .lab{display:flex;justify-content:space-between;font-size:11.5px;color:var(--ink-soft);margin-top:7px;font-family:'JetBrains Mono',monospace}
  .yg-groups-design .ticker{
    margin-top:18px;border:1px solid var(--line);border-radius:16px;background:var(--panel);
    padding:12px 14px;overflow:hidden;position:relative;
  }
  .yg-groups-design .ticker .thead{display:flex;align-items:center;gap:8px;font-size:11.5px;font-weight:600;
    text-transform:uppercase;letter-spacing:.08em;color:var(--muted);font-family:'JetBrains Mono',monospace;margin-bottom:8px}
  .yg-groups-design .ticker .thead .pd{width:7px;height:7px;border-radius:50%;background:var(--accent);animation:livePulse calc(2.2s / var(--speed)) infinite}
  .yg-groups-design .ticker .feed{height:34px;position:relative}
  .yg-groups-design .ticker .item{
    position:absolute;inset:0;display:flex;align-items:center;gap:10px;font-size:13.5px;color:var(--ink);
    opacity:0;transform:translateY(12px);transition:opacity .5s ease, transform .5s cubic-bezier(.16,1,.3,1);
  }
  .yg-groups-design .ticker .item.show{opacity:1;transform:none}
  .yg-groups-design .ticker .item .av{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;color:#fff;font-size:11px;font-weight:700;flex:0 0 auto}
  .yg-groups-design .ticker .item b{font-weight:600}
  .yg-groups-design .ticker .item .ago{margin-left:auto;font-size:11.5px;color:var(--muted);font-family:'JetBrains Mono',monospace}
  .spark{position:fixed;width:7px;height:7px;border-radius:50%;pointer-events:none;z-index:9999}
  .yg-groups-design .nudge-stack{
    position:fixed;right:22px;bottom:22px;z-index:90;
    display:flex;flex-direction:column;gap:12px;align-items:flex-end;
    max-width:calc(100vw - 28px);
  }
  body.drawer-open .yg-groups-design .nudge-stack{opacity:0;transform:translateY(150%);pointer-events:none;transition:opacity .35s,transform .5s cubic-bezier(.16,1,.3,1)}
  .yg-groups-design .nudge{
    position:relative;width:330px;max-width:100%;
    background:#fff;border:1px solid var(--line);border-radius:20px;overflow:hidden;
    box-shadow:0 26px 64px -22px rgba(20,18,14,.5);
    transform:translateY(40px) scale(.96);opacity:0;pointer-events:none;
    transition:transform .6s cubic-bezier(.16,1,.3,1), opacity .4s ease;
  }
  .yg-groups-design .nudge.show{transform:none;opacity:1;pointer-events:auto}
  .yg-groups-design .nudge .accentbar{height:4px;width:100%}
  .yg-groups-design .nudge.quiet .accentbar{background:linear-gradient(90deg,#e8b964,#d79a35)}
  .yg-groups-design .nudge.active .accentbar{background:linear-gradient(90deg,var(--accent),#7fc9c0)}
  .yg-groups-design .nudge .nbody{padding:15px 16px 16px}
  .yg-groups-design .nudge .ntop{display:flex;align-items:center;gap:11px}
  .yg-groups-design .nudge .nthumb{width:46px;height:46px;border-radius:13px;background:#dcdad4 center/cover no-repeat;flex:0 0 auto;position:relative;overflow:hidden}
  .yg-groups-design .nudge .nthumb::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent,rgba(0,0,0,.25))}
  .yg-groups-design .nudge.active .nthumb svg{width:22px;height:22px;position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:2;color:#fff}
  .yg-groups-design .nudge .ntitle{font-size:15px;font-weight:700;letter-spacing:-.01em;line-height:1.2}
  .yg-groups-design .nudge .ncat{font-size:11.5px;color:var(--muted);font-family:'JetBrains Mono',monospace;margin-top:2px;display:flex;align-items:center;gap:6px}
  .yg-groups-design .nudge .ncat .ld{width:6px;height:6px;border-radius:50%}
  .yg-groups-design .nudge.active .ncat .ld{background:#5fd6a8;box-shadow:0 0 0 0 rgba(95,214,168,.7);animation:livePulse calc(2.2s / var(--speed)) infinite}
  .yg-groups-design .nudge.quiet .ncat .ld{background:#e8b964}
  .yg-groups-design .nudge .nx{margin-left:auto;width:26px;height:26px;border-radius:50%;border:none;background:var(--panel-2);color:var(--ink-soft);cursor:pointer;display:grid;place-items:center;transition:.2s;flex:0 0 auto}
  .yg-groups-design .nudge .nx:hover{background:var(--line);color:var(--ink);transform:rotate(90deg)}
  .yg-groups-design .nudge .nx svg{width:13px;height:13px}
  .yg-groups-design .nudge .nmsg{font-size:13.2px;color:var(--ink-soft);line-height:1.5;margin-top:11px;text-wrap:pretty}
  .yg-groups-design .nudge .nmsg b{color:var(--ink);font-weight:600}
  .yg-groups-design .nudge .nrow{display:flex;align-items:center;gap:10px;margin-top:14px}
  .yg-groups-design .nudge .nrow .stack .av{width:26px;height:26px;font-size:10px;margin-left:-8px;border-width:2px}
  .yg-groups-design .nudge .nrow .stack .av:first-child{margin-left:0}
  .yg-groups-design .nudge .njoin{
    margin-left:auto;border:none;cursor:pointer;font-family:inherit;font-size:13.5px;font-weight:600;color:#fff;
    padding:9px 16px;border-radius:11px;transition:.2s;white-space:nowrap;
  }
  .yg-groups-design .nudge.active .njoin{background:var(--ink)}
  .yg-groups-design .nudge.quiet .njoin{background:var(--accent)}
  .yg-groups-design .nudge .njoin:hover{transform:translateY(-2px);box-shadow:0 12px 22px -10px rgba(0,0,0,.5)}
  .yg-groups-design .nudge .ntimer{height:2px;background:var(--line);position:relative;overflow:hidden}
  .yg-groups-design .nudge .ntimer i{position:absolute;left:0;top:0;bottom:0;width:100%;transform-origin:left;background:var(--muted);opacity:.5;animation:nTimer 8s linear forwards}
  .yg-groups-design .nudge .ntimer i.paused{animation-play-state:paused}
  @keyframes nTimer{from{transform:scaleX(1)}to{transform:scaleX(0)}}
  .yg-groups-design .wslots{display:flex;align-items:center;margin-top:13px}
  .yg-groups-design .wslots .av{width:28px;height:28px;border-radius:50%;border:2px solid #fff;display:grid;place-items:center;color:#fff;font-size:11px;font-weight:700;margin-left:-8px}
  .yg-groups-design .wslots .av:first-child{margin-left:0}
  .yg-groups-design .wslots .slot{width:28px;height:28px;border-radius:50%;border:2px dashed #d8c4a0;background:#fbf4e6;margin-left:-8px;animation:slotP 1.9s ease-in-out infinite}
  .yg-groups-design .wslots .slot:nth-of-type(2){animation-delay:.3s}
  .yg-groups-design .wslots .slot:nth-of-type(3){animation-delay:.6s}
  @keyframes slotP{0%,100%{opacity:.4;transform:scale(.9)}50%{opacity:1;transform:scale(1)}}
  .yg-groups-design .wslots .wlab{margin-left:11px;font-size:12px;color:var(--ink-soft);font-weight:500}
  .yg-groups-design .m-foot{padding:18px 26px 26px;flex:0 0 auto}
  .yg-groups-design .joinbtn{
    width:100%;border:none;cursor:pointer;font-family:inherit;font-size:16px;font-weight:600;
    padding:17px;border-radius:16px;background:var(--ink);color:#fff;
    display:flex;align-items:center;justify-content:center;gap:10px;
    transition:.25s;position:relative;overflow:hidden;
  }
  .yg-groups-design .joinbtn:hover{background:#000;transform:translateY(-2px);box-shadow:0 18px 34px -16px rgba(0,0,0,.55)}
  .yg-groups-design .joinbtn svg{width:19px;height:19px}
  .yg-groups-design .joinbtn .spin{width:18px;height:18px;border:2.5px solid rgba(255,255,255,.35);border-top-color:#fff;border-radius:50%;animation:sp .7s linear infinite;display:none}
  @keyframes sp{to{transform:rotate(360deg)}}
  .yg-groups-design .joinbtn.loading{pointer-events:none}
  .yg-groups-design .joinbtn.loading .lbl,.yg-groups-design .joinbtn.loading svg.ic{display:none}
  .yg-groups-design .joinbtn.loading .spin{display:block}
  .yg-groups-design .joinbtn.done{background:var(--accent);pointer-events:none}
  .yg-groups-design .joinbtn.done .spin{display:none}
  .yg-groups-design .m-sub{text-align:center;font-size:12.5px;color:var(--muted);margin-top:13px}
  .yg-groups-design .field{margin-top:16px}
  .yg-groups-design .field label{display:block;font-size:13px;font-weight:600;color:var(--ink);margin-bottom:7px}
  .yg-groups-design .field input,.yg-groups-design .field textarea,.yg-groups-design .field select{
    width:100%;font-family:inherit;font-size:14.5px;color:var(--ink);background:var(--panel);
    border:1px solid var(--line);border-radius:13px;padding:13px 15px;outline:none;transition:.2s;resize:none;
  }
  .yg-groups-design .field input:focus,.yg-groups-design .field textarea:focus,.yg-groups-design .field select:focus{border-color:var(--accent);box-shadow:0 0 0 4px var(--accent-soft);background:#fff}
  .yg-groups-design .field .row{display:flex;gap:12px}
  .yg-groups-design .field .row > *{flex:1}
  .yg-groups-design .seg{display:flex;gap:8px;flex-wrap:wrap}
  .yg-groups-design .seg .opt{
    flex:1;min-width:120px;border:1px solid var(--line);border-radius:13px;padding:12px 14px;cursor:pointer;
    background:var(--panel);transition:.2s;display:flex;gap:11px;align-items:flex-start;text-align:left;font:inherit;color:inherit;
  }
  .yg-groups-design .seg .opt:hover{border-color:var(--accent)}
  .yg-groups-design .seg .opt.sel{border-color:var(--accent);background:var(--accent-soft);box-shadow:0 0 0 1px var(--accent)}
  .yg-groups-design .seg .opt .od{font-size:12px;color:var(--ink-soft);margin-top:2px}
  .yg-groups-design .seg .opt .ot{font-size:14px;font-weight:600}
  .yg-groups-design .seg .opt svg{width:18px;height:18px;color:var(--accent);flex:0 0 auto;margin-top:1px}
  .yg-groups-design .toast{
    position:fixed;left:50%;bottom:30px;transform:translate(-50%,80px);z-index:200;
    background:var(--ink);color:#fff;padding:14px 20px;border-radius:14px;font-size:14.5px;font-weight:500;
    display:flex;align-items:center;gap:11px;box-shadow:0 20px 40px -16px rgba(0,0,0,.6);
    opacity:0;transition:transform .45s cubic-bezier(.16,1,.3,1),opacity .3s;pointer-events:none;
  }
  .yg-groups-design .toast.show{transform:translate(-50%,0);opacity:1}
  .yg-groups-design .toast svg{width:18px;height:18px;color:#7fe0b8}
  .yg-groups-design footer{max-width:1480px;margin:0 auto;padding:0 28px 50px;color:var(--ink-soft);font-size:14px}
  .yg-groups-design .foot-inner{border-top:1px solid var(--line);padding-top:26px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:18px}
  .yg-groups-design .foot-inner a{color:var(--ink-soft);text-decoration:none;margin-left:22px}
  .yg-groups-design .foot-inner a:hover{color:var(--ink)}
  @media(max-width:900px){
    .yg-groups-design .navlinks{display:none}
  }
  @media(max-width:640px){
    .yg-groups-design .dash-btn{width:40px;padding:0;justify-content:center}
    .yg-groups-design .dash-btn svg{width:18px;height:18px}
    .yg-groups-design .dash-btn{font-size:0;gap:0}
    .yg-groups-design .ghead{padding:6px 24px 0}
    .yg-groups-design .chips{padding:24px 24px 18px}
    .yg-groups-design .grid{padding:6px 24px 50px}
    .yg-groups-design .ghead-actions{width:100%;flex-wrap:wrap}
    .yg-groups-design .search{flex:1;min-width:0}
    .yg-groups-design .modal{width:100%;border-radius:0}
    .yg-groups-design .field .row{flex-direction:column}
  }
`;
