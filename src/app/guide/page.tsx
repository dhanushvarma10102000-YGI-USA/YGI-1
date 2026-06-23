"use client";

/**
 * YourGuideInUSA — City Guide
 * Single-file Next.js client page. Paste into: src/app/guide/page.tsx
 *
 * Requires a Google Maps JS API key with the Maps JavaScript API + Places API
 * enabled, exposed as NEXT_PUBLIC_GOOGLE_MAPS_KEY.
 *
 * Reads ?state= & ?city= & ?university= & ?mode= from the URL.
 * Professional light theme; split list + map layout with curated place cards,
 * photo-backed info cards, skeleton loading, and "search this area".
 */

import { useSearchParams } from "next/navigation";
import {
  Suspense,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/ds/Nav";

/* ─────────────────────────  Types  ───────────────────────── */
type Category = "housing" | "restaurants" | "places" | "shopping";
type HousingFilter = "all" | "studio" | "1bhk" | "2bhk";
type CuisineFilter =
  | "all" | "indian" | "chinese" | "mexican" | "halal"
  | "italian" | "japanese" | "american";

/* ─────────────────────────  Design tokens  ───────────────────────── */
const CATEGORY: Record<Category, { color: string; label: string; icon: IconName }> = {
  housing:     { color: "#6366f1", label: "Housing",     icon: "home" },
  restaurants: { color: "#f59e0b", label: "Restaurants", icon: "food" },
  places:      { color: "#10b981", label: "Places",      icon: "pin" },
  shopping:    { color: "#ec4899", label: "Shopping",    icon: "bag" },
};

/* Curated one-line label per category (replaces raw Google type spam). */
const TYPE_LABELS: Record<Category, string> = {
  housing: "Apartments",
  restaurants: "Restaurant",
  places: "Attraction",
  shopping: "Shopping",
};

/* ─────────────────────────  Google Maps loader  ───────────────────────── */
let mapsPromise: Promise<void> | null = null;
function loadGoogleMaps(apiKey: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if ((window as any).google?.maps) return Promise.resolve();
  if (mapsPromise) return mapsPromise;
  mapsPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });
  return mapsPromise;
}

/* ─────────────────────────  Helpers  ───────────────────────── */
function priceStr(p?: number): string {
  if (!p || p <= 0) return "";
  return "$".repeat(Math.min(4, p));
}

function escapeHtml(value?: string | null): string {
  return (value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char] ?? char));
}

/* Light, professional map styling. */
const MAP_STYLE: any[] = [
  { elementType: "geometry", stylers: [{ color: "#f4f6fb" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#7a869a" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f4f6fb" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#e6eaf2" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#f5ecd9" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#e7d9bf" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#cfe6f2" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#eef2f6" }] },
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#dcebd8" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#dfe4ec" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#f4f6fb" }] },
];

/* SVG pin marker (data URL) with a number label. */
function pinIcon(color: string, n: number, active: boolean) {
  const scale = active ? 1.12 : 1;
  const w = 38 * scale, h = 46 * scale;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 38 46">
    <path d="M19 45 C19 45 35 26 35 16 A16 16 0 1 0 3 16 C3 26 19 45 19 45 Z" fill="${color}" stroke="#fff" stroke-width="2.5"/>
    <circle cx="19" cy="16" r="11" fill="rgba(255,255,255,0.22)"/>
    <text x="19" y="20.5" text-anchor="middle" font-family="Inter, sans-serif" font-size="13" font-weight="800" fill="#fff">${n}</text>
  </svg>`;
  return {
    url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg),
    scaledSize: new (window as any).google.maps.Size(w, h),
    anchor: new (window as any).google.maps.Point(w / 2, h),
    labelOrigin: new (window as any).google.maps.Point(w / 2, h * 0.35),
  };
}

/* ─────────────────────────  Icons  ───────────────────────── */
type IconName =
  | "home" | "food" | "pin" | "bag" | "warn" | "star" | "search"
  | "directions" | "phone" | "globe" | "save" | "close" | "back" | "clock" | "locate" | "panel" | "chevronLeft" | "chevronRight";

function Glyph({ name, size = 16, color = "currentColor", sw = 1.7 }: { name: IconName; size?: number; color?: string; sw?: number }) {
  const p: any = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: sw, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "home": return <svg {...p}><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /><path d="M9 20v-6h6v6" /></svg>;
    case "food": return <svg {...p}><path d="M4 3v7a3 3 0 003 3v8M7 3v6M10 3v6M17 3c-1.5 0-2.5 2-2.5 5s1 4 2.5 4v8" /></svg>;
    case "pin": return <svg {...p}><path d="M12 21s-7-6.5-7-11a7 7 0 1114 0c0 4.5-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>;
    case "bag": return <svg {...p}><path d="M6 7h12l-1 13H7L6 7z" /><path d="M9 7V5a3 3 0 016 0v2" /></svg>;
    case "warn": return <svg {...p}><path d="M12 3l9.5 16H2.5L12 3z" /><path d="M12 10v4M12 17h.01" /></svg>;
    case "star": return <svg {...p} fill={color} stroke="none"><path d="M12 3l2.7 5.7 6.3.9-4.6 4.4 1.1 6.2L12 17.8 6.5 20.2l1.1-6.2L3 9.6l6.3-.9z" /></svg>;
    case "search": return <svg {...p}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.5-4.5" /></svg>;
    case "directions": return <svg {...p}><path d="M12 2l10 10-10 10L2 12 12 2z" /><path d="M9 12h4v3M13 12l-2-2" /></svg>;
    case "phone": return <svg {...p}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" /></svg>;
    case "globe": return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" /></svg>;
    case "save": return <svg {...p}><path d="M19 21l-7-4-7 4V5a2 2 0 012-2h10a2 2 0 012 2z" /></svg>;
    case "close": return <svg {...p}><path d="M6 6l12 12M18 6L6 18" /></svg>;
    case "back": return <svg {...p}><path d="M15 18l-6-6 6-6" /></svg>;
    case "clock": return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
    case "locate": return <svg {...p}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /><circle cx="12" cy="12" r="8" /></svg>;
    case "panel": return <svg {...p}><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M9 4v16" /><path d="M6.5 12h.01" /></svg>;
    case "chevronLeft": return <svg {...p}><path d="M15 18l-6-6 6-6" /></svg>;
    case "chevronRight": return <svg {...p}><path d="M9 18l6-6-6-6" /></svg>;
    default: return null;
  }
}

/* ─────────────────────────  Small UI pieces  ───────────────────────── */
function StarRating({ rating, reviews }: { rating?: number; reviews?: number }) {
  if (rating == null) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, color: "#334155", fontWeight: 600 }}>
      <Glyph name="star" size={13} color="#f59e0b" />
      <span style={{ color: "#0f172a" }}>{rating.toFixed(1)}</span>
      {reviews != null && <span style={{ color: "#94a3b8", fontWeight: 500 }}>({reviews.toLocaleString()})</span>}
    </span>
  );
}

function latLngParts(location: any): { lat: number; lng: number } | null {
  if (!location) return null;
  const lat = typeof location.lat === "function" ? location.lat() : location.lat;
  const lng = typeof location.lng === "function" ? location.lng() : location.lng;
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  return { lat, lng };
}

function streetViewPhotoUrl(place: Place): string | null {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  const coords = latLngParts(place.location);
  if (!key || !coords) return null;
  const location = `${coords.lat},${coords.lng}`;
  return `https://maps.googleapis.com/maps/api/streetview?size=360x360&location=${encodeURIComponent(location)}&fov=70&pitch=0&source=outdoor&key=${encodeURIComponent(key)}`;
}

function fallbackPhotoDataUrl(cat: Category): string {
  const color = CATEGORY[cat].color;
  const label = CATEGORY[cat].label;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 360">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop stop-color="${color}"/>
        <stop offset="1" stop-color="#0f172a"/>
      </linearGradient>
    </defs>
    <rect width="360" height="360" rx="42" fill="url(#g)"/>
    <circle cx="286" cy="76" r="54" fill="#fff" opacity=".14"/>
    <circle cx="82" cy="286" r="72" fill="#fff" opacity=".1"/>
    <path d="M88 244h184v24H88zM112 130h136v102H112zM100 112l80-48 80 48z" fill="#fff" opacity=".72"/>
    <path d="M136 152h18v80h-18zM171 152h18v80h-18zM206 152h18v80h-18z" fill="#0f172a" opacity=".2"/>
    <text x="180" y="312" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="30" font-weight="800" fill="#fff">${escapeHtml(label)}</text>
  </svg>`;
  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
}

function PlaceImage({ place, cat, width, height, radius, style = {} }: { place: Place; cat: Category; width: number | string; height: number | string; radius: number; style?: React.CSSProperties }) {
  const sources = [place.photo, streetViewPhotoUrl(place), fallbackPhotoDataUrl(cat)].filter(Boolean) as string[];
  const [sourceIndex, setSourceIndex] = useState(0);
  const src = sources[Math.min(sourceIndex, sources.length - 1)] || fallbackPhotoDataUrl(cat);

  useEffect(() => {
    setSourceIndex(0);
  }, [place.id, place.photo, cat]);

  return (
    <img
      src={src}
      alt=""
      onError={() => setSourceIndex((index) => Math.min(index + 1, sources.length - 1))}
      style={{
        width,
        height,
        borderRadius: radius,
        objectFit: "cover",
        display: "block",
        flexShrink: 0,
        ...style,
      }}
    />
  );
}

function Thumb({ cat, place }: { cat: Category; place: Place }) {
  const c = CATEGORY[cat].color;
  return <PlaceImage place={place} cat={cat} width={60} height={60} radius={12} style={{ border: `1px solid ${c}33` }} />;
}

/* ─────────────────────────  Place model  ───────────────────────── */
interface Place {
  id: string;
  name: string;
  address: string;
  rating?: number;
  reviews?: number;
  price?: number;
  photo?: string | null;
  location: any; // google.maps.LatLng
  raw: any;
  phone?: string;
  website?: string;
  mapsUrl?: string;
  openNow?: boolean;
  hours?: string[];
  businessStatus?: string;
  types?: string[];
  category?: Category;
}

type CampusTarget = {
  name: string;
  city: string | null;
  state: string | null;
  latitude: number;
  longitude: number;
  campus_radius: number | null;
};

function getOpenNow(place: any): boolean | undefined {
  const openingHours = place?.opening_hours;
  if (!openingHours || typeof openingHours.isOpen !== "function") return undefined;
  if (typeof place?.utc_offset_minutes !== "number") return undefined;
  try {
    return openingHours.isOpen(new Date());
  } catch {
    return undefined;
  }
}

function toPlace(p: any, category?: Category): Place {
  let photo: string | null = null;
  try {
    if (p.photos && p.photos[0]) photo = p.photos[0].getUrl({ maxWidth: 160, maxHeight: 160 });
  } catch {}

  return {
    id: p.place_id || p.reference || p.name,
    name: p.name,
    address: p.formatted_address || p.vicinity || "",
    rating: p.rating,
    reviews: p.user_ratings_total,
    price: p.price_level,
    photo,
    location: p.geometry?.location,
    raw: p,
    phone: p.formatted_phone_number || p.international_phone_number,
    website: p.website,
    mapsUrl: p.url,
    openNow: getOpenNow(p),
    hours: p.opening_hours?.weekday_text,
    businessStatus: p.business_status,
    types: p.types,
    category,
  };
}

/* ─────────────────────────  Cards  ───────────────────────── */
function PlaceCard({ place, i, cat, active, onClick }: { place: Place; i: number; cat: Category; active: boolean; onClick: () => void }) {
  const [h, setH] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        width: "100%", textAlign: "left", display: "flex", gap: 13, alignItems: "flex-start",
        padding: 12, marginBottom: 9, borderRadius: 12, cursor: "pointer",
        background: active ? "#f4f5ff" : h ? "#fbfdff" : "#fff",
        border: `1px solid ${active ? "rgba(79,70,229,0.4)" : h ? "rgba(100,116,139,0.22)" : "#e2e8f0"}`,
        boxShadow: active ? "0 12px 28px -24px rgba(79,70,229,0.9)" : h ? "0 10px 24px -24px rgba(15,23,42,0.5)" : "none",
        transition: "background .16s, border-color .16s, box-shadow .16s, transform .16s",
        transform: h && !active ? "translateY(-1px)" : "none",
      }}
    >
      <div style={{ position: "relative" }}>
        <Thumb cat={cat} place={place} />
        <div style={{ position: "absolute", top: -6, left: -6, width: 22, height: 22, borderRadius: 7, background: CATEGORY[cat].color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11.5, fontWeight: 800, border: "2px solid #fff", boxShadow: "0 5px 12px -7px rgba(15,23,42,0.7)" }}>{i + 1}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 750, color: "#0f172a", lineHeight: 1.25, marginBottom: 3 }}>{place.name}</div>
        <div style={{ fontSize: 12.2, color: "#64748b", lineHeight: 1.4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{place.address}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 7, flexWrap: "wrap" }}>
          <StarRating rating={place.rating} reviews={place.reviews} />
          {place.price ? <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>{priceStr(place.price)}</span> : null}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 750, color: CATEGORY[cat].color, background: `${CATEGORY[cat].color}12`, border: `1px solid ${CATEGORY[cat].color}28`, padding: "3px 9px", borderRadius: 999 }}>{TYPE_LABELS[cat]}</span>
        </div>
      </div>
    </button>
  );
}

function SkeletonCard() {
  return (
    <div style={{ display: "flex", gap: 13, padding: 12, marginBottom: 8, borderRadius: 14, border: "1px solid #e8edf5", background: "#fff" }}>
      <div className="ygg-sk" style={{ width: 60, height: 60, borderRadius: 12, flexShrink: 0 }} />
      <div style={{ flex: 1, paddingTop: 4 }}>
        <div className="ygg-sk" style={{ width: "70%", height: 13, borderRadius: 6, marginBottom: 9 }} />
        <div className="ygg-sk" style={{ width: "90%", height: 10, borderRadius: 6, marginBottom: 12 }} />
        <div className="ygg-sk" style={{ width: "40%", height: 10, borderRadius: 6 }} />
      </div>
    </div>
  );
}

function InfoCard({ place, cat, onClose }: { place: Place; cat: Category; onClose: () => void }) {
  const dir = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(place.name + " " + place.address)}`;
  const mapsLink = place.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name + " " + place.address)}&query_place_id=${place.id}`;
  const phoneLink = place.phone ? `tel:${place.phone.replace(/[^\d+]/g, "")}` : "";
  const sourceType = place.types?.find((type) => !["point_of_interest", "establishment"].includes(type));
  const typeLabel = sourceType ? sourceType.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()) : TYPE_LABELS[cat];
  const statusLabel = place.businessStatus && place.businessStatus !== "OPERATIONAL"
    ? place.businessStatus.replace(/_/g, " ").toLowerCase()
    : "";
  const openColor = place.openNow ? "#059669" : "#dc2626";
  const websiteLabel = place.website?.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
  const action: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "10px 12px", borderRadius: 11, background: "#fff", border: "1px solid #e2e8f0", color: "#334155", fontSize: 13, fontWeight: 750, cursor: "pointer", textDecoration: "none" };
  const row: React.CSSProperties = { display: "grid", gridTemplateColumns: "20px minmax(0,1fr)", gap: 11, alignItems: "start", fontSize: 13, color: "#475569", lineHeight: 1.48 };

  return (
    <div className="ygg-info-card" style={{ position: "absolute", bottom: 22, left: 22, width: 392, maxWidth: "calc(100% - 44px)", maxHeight: "calc(100% - 112px)", background: "rgba(255,255,255,0.98)", borderRadius: 16, border: "1px solid rgba(226,232,240,0.95)", boxShadow: "0 24px 70px rgba(15,23,42,0.18)", backdropFilter: "blur(14px)", overflow: "hidden", zIndex: 40, animation: "yggUp .22s ease" }}>
      <div style={{ height: 132, position: "relative", background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <PlaceImage place={place} cat={cat} width="100%" height="100%" radius={0} />
        <div style={{ position: "absolute", inset: "55% 0 0", background: "linear-gradient(180deg, transparent, rgba(15,23,42,0.55))" }} />
        <button onClick={onClose} title="Close" style={{ position: "absolute", top: 10, right: 10, width: 32, height: 32, borderRadius: 10, border: "1px solid rgba(255,255,255,0.28)", cursor: "pointer", background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)" }}><Glyph name="close" size={15} color="#fff" /></button>
      </div>
      <div className="ygg-vscroll" style={{ padding: 16, maxHeight: "calc(100vh - 260px)", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: CATEGORY[cat].color, background: `${CATEGORY[cat].color}12`, border: `1px solid ${CATEGORY[cat].color}28`, padding: "4px 9px", borderRadius: 999 }}>{typeLabel}</span>
          {statusLabel && <span style={{ fontSize: 11, fontWeight: 750, color: "#b45309", background: "#fffbeb", border: "1px solid #fde68a", padding: "4px 9px", borderRadius: 999 }}>{statusLabel}</span>}
        </div>

        <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginBottom: 7, lineHeight: 1.22 }}>{place.name}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
          <StarRating rating={place.rating} reviews={place.reviews} />
          {place.price ? <span style={{ fontSize: 12.5, color: "#64748b", fontWeight: 700 }}>{priceStr(place.price)}</span> : null}
          {place.openNow != null && (
            <span style={{ fontSize: 12.5, color: openColor, fontWeight: 800 }}>
              {place.openNow ? "Open now" : "Closed"}
            </span>
          )}
        </div>

        <div style={{ display: "grid", gap: 0, marginBottom: 14, borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0", overflow: "hidden" }}>
          {place.address && (
            <div style={{ ...row, padding: "12px", borderBottom: "1px solid #e2e8f0" }}>
              <Glyph name="pin" size={16} color="#64748b" />
              <span>{place.address}</span>
            </div>
          )}
          {place.hours?.length ? (
            <div style={{ ...row, padding: "12px", borderBottom: "1px solid #e2e8f0" }}>
              <Glyph name="clock" size={16} color={place.openNow == null ? "#64748b" : openColor} />
              <div style={{ display: "grid", gap: 3 }}>
                {place.openNow != null && <span style={{ color: openColor, fontWeight: 800 }}>{place.openNow ? "Open now" : "Closed"}</span>}
                {place.hours.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </div>
            </div>
          ) : null}
          {place.phone && (
            <a href={phoneLink} style={{ ...row, padding: "12px", color: "#475569", fontWeight: 700, textDecoration: "none", borderBottom: "1px solid #e2e8f0" }}>
              <Glyph name="phone" size={16} color="#64748b" />
              <span>{place.phone}</span>
            </a>
          )}
          {place.website && (
            <a href={place.website} target="_blank" rel="noreferrer" style={{ ...row, padding: "12px", color: "#4f46e5", fontWeight: 800, textDecoration: "none", borderBottom: "1px solid #e2e8f0" }}>
              <Glyph name="globe" size={16} color="#4f46e5" />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{websiteLabel}</span>
            </a>
          )}
          <a href={mapsLink} target="_blank" rel="noreferrer" style={{ ...row, padding: "12px", color: "#4f46e5", fontWeight: 800, textDecoration: "none" }}>
            <Glyph name="globe" size={16} color="#4f46e5" />
            <span>Open in Google Maps</span>
          </a>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: place.website ? "1fr 1fr" : "1fr", gap: 8 }}>
          <a href={dir} target="_blank" rel="noreferrer" style={{ ...action, background: "#4f46e5", color: "#fff", border: "1px solid #4f46e5", boxShadow: "0 10px 22px -14px rgba(79,70,229,0.8)" }}>
            <Glyph name="directions" size={15} color="#fff" /> Directions
          </a>
          {place.website && (
            <a href={place.website} target="_blank" rel="noreferrer" style={action}>
              <Glyph name="globe" size={15} color="#334155" /> Website
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterRow({ options, value, onChange }: { options: [string, string][]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="ygg-hscroll" style={{ display: "flex", gap: 7, padding: "10px 14px", borderBottom: "1px solid #eef2f8", overflowX: "auto", flexShrink: 0, background: "#fbfcff" }}>
      {options.map(([id, label]) => {
        const on = value === id;
        return (
          <button key={id} onClick={() => onChange(id)} style={{ whiteSpace: "nowrap", padding: "6px 13px", borderRadius: 999, fontSize: 12.5, fontWeight: on ? 600 : 500, cursor: "pointer", color: on ? "#4f46e5" : "#64748b", background: on ? "#eef0fe" : "#fff", border: `1px solid ${on ? "rgba(79,70,229,0.35)" : "#e8edf5"}` }}>{label}</button>
        );
      })}
    </div>
  );
}

/* ─────────────────────────  Main content  ───────────────────────── */
function GuideContent() {
  const params = useSearchParams();
  const state = params.get("state") ?? "";
  const city = params.get("city") ?? "";
  const university = params.get("university") ?? "";
  const searchParam = params.get("search") ?? "";
  const mode = params.get("mode") ?? "city";

  const router = useRouter();
  const [showCityInput, setShowCityInput] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [cityInput, setCityInput] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [locationLabel, setLocationLabel] = useState("");
  const suggestTimer = useRef<number | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapObj = useRef<any>(null);
  const markers = useRef<any[]>([]);
  const selectedLocationMarker = useRef<any>(null);
  const currentLocationMarker = useRef<any>(null);
  const currentLocationCircle = useRef<any>(null);
  const uniMarker = useRef<any>(null);
  const campusInfoWindow = useRef<any>(null);
  const routeSearchResetting = useRef(false);
  const askedForInitialLocation = useRef(false);

  const extractCityState = (components: any[] = []) => {
    const cityPart = components.find((part) => part.types?.includes("locality"))
      || components.find((part) => part.types?.includes("postal_town"))
      || components.find((part) => part.types?.includes("administrative_area_level_2"));
    const statePart = components.find((part) => part.types?.includes("administrative_area_level_1"));

    return {
      nextCity: cityPart?.long_name || "",
      nextState: statePart?.short_name || statePart?.long_name || "",
    };
  };

  const looksLikeUniversity = (name: string, types: string[] = []) => {
    const text = name.toLowerCase();
    return types.some((type) => ["university", "school"].includes(type))
      || /\b(university|college|institute|campus)\b/.test(text);
  };

  const applyLocation = (label: string, latLng?: any, nextCity?: string, nextState?: string, placeName?: string, types: string[] = []) => {
    setLocationLabel(label);
    const google = (window as any).google;
    const isUniversitySearch = looksLikeUniversity(placeName || label, types);

    if (isUniversitySearch) {
      markers.current.forEach((m) => m.setMap(null));
      markers.current = [];
      setPlaces([]);
      setTab(null);
      setActive(null);
    } else {
      clearCampusHighlight();
      setSelectedUniversityFallback(null);
    }
    if (latLng && mapObj.current && google?.maps) {
      const lat = typeof latLng.lat === "function" ? latLng.lat() : latLng.lat;
      const lng = typeof latLng.lng === "function" ? latLng.lng() : latLng.lng;
      if (isUniversitySearch && lat != null && lng != null) {
        const fallback = {
          name: placeName || label.split(",")[0],
          city: nextCity || null,
          state: nextState || null,
          latitude: lat,
          longitude: lng,
          campus_radius: null,
        };
        setSelectedUniversityFallback(fallback);
        drawCampusHighlight(fallback);
      } else {
        if (selectedLocationMarker.current) selectedLocationMarker.current.setMap(null);
        selectedLocationMarker.current = new google.maps.Marker({
          position: latLng,
          map: mapObj.current,
          title: label,
          zIndex: 900,
          animation: google.maps.Animation.DROP,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 11,
            fillColor: "#4f46e5",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 4,
          },
        });
        mapObj.current.panTo(latLng);
        mapObj.current.setZoom(15);
      }
    }

    const qp = new URLSearchParams();
    const resolvedCity = nextCity || city;
    const resolvedState = nextState || state;
    if (resolvedCity) qp.set("city", resolvedCity);
    if (resolvedState) qp.set("state", resolvedState);
    if (isUniversitySearch) {
      qp.set("university", placeName || label.split(",")[0]);
      qp.set("mode", "university");
    } else {
      qp.set("mode", "city");
    }
    router.push(`/guide?${qp.toString()}`);
    setShowCityInput(false);
    setSuggestions([]);
    setCityInput("");
    setActive(null);
  };

  const submitCityValue = (v: string, placeId?: string) => {
    const val = v.trim();
    if (!val) return;
    const google = (window as any).google;

    if (google?.maps?.places && placeId) {
      const places = new google.maps.places.PlacesService(mapObj.current || document.createElement("div"));
      places.getDetails({
        placeId,
        fields: [
          "place_id",
          "name",
          "formatted_address",
          "formatted_phone_number",
          "international_phone_number",
          "website",
          "url",
          "rating",
          "user_ratings_total",
          "price_level",
          "photos",
          "geometry",
          "opening_hours",
          "utc_offset_minutes",
          "address_components",
          "business_status",
          "types",
        ],
      }, (place: any, status: string) => {
        if (status === "OK" && place) {
          const { nextCity, nextState } = extractCityState(place.address_components);
          const placeTypes = place.types || [];
          const isUniversitySearch = looksLikeUniversity(place.name || val, placeTypes);
          const isAreaSearch = placeTypes.some((type: string) => [
            "administrative_area_level_1",
            "administrative_area_level_2",
            "country",
            "locality",
            "postal_code",
            "postal_town",
            "route",
          ].includes(type));

          if (!isUniversitySearch && !isAreaSearch && place.geometry?.location && mapObj.current) {
            const mapped = toPlace(place, "places");
            markers.current.forEach((m) => m.setMap(null));
            markers.current = [];
            clearCampusHighlight();
            clearSelectedLocation();
            setSelectedUniversityFallback(null);
            setTab(null);
            setPlaces([mapped]);
            setActive(mapped.id);
            setLocationLabel(mapped.name);
            const marker = new google.maps.Marker({ position: mapped.location, map: mapObj.current, icon: pinIcon(CATEGORY.places.color, 1, true) });
            marker.addListener("click", () => openPlaceDetails(mapped));
            markers.current.push(marker);
            mapObj.current?.panTo(mapped.location);
            mapObj.current?.setZoom(16);
            const qp = new URLSearchParams();
            qp.set("search", mapped.name);
            router.push(`/guide?${qp.toString()}`);
            setShowCityInput(false);
            setSuggestions([]);
            setCityInput("");
            return;
          }

          applyLocation(place.formatted_address || place.name || val, place.geometry?.location, nextCity, nextState, place.name || val, placeTypes);
        } else {
          applyLocation(val);
        }
      });
      return;
    }

    if (google?.maps?.places && mapObj.current) {
      setLoading(true);
      const service = new google.maps.places.PlacesService(mapObj.current);
      service.textSearch({ query: val, bounds: mapObj.current.getBounds() }, (res: any[], status: string) => {
        setLoading(false);
        if (status === "OK" && res?.length) {
          const mapped = res.slice(0, 20).map((place) => toPlace(place, "places"));
          const bounds = new google.maps.LatLngBounds();
          markers.current.forEach((m) => m.setMap(null));
          markers.current = [];
          clearCampusHighlight();
          clearSelectedLocation();
          mapped.forEach((pl, i) => {
            if (!pl.location) return;
            const marker = new google.maps.Marker({ position: pl.location, map: mapObj.current, icon: pinIcon(CATEGORY.places.color, i + 1, false) });
            marker.addListener("click", () => openPlaceDetails(pl));
            markers.current.push(marker);
            bounds.extend(pl.location);
          });
          setTab(null);
          setActive(null);
          setPlaces(mapped);
          setLocationLabel(`Search: ${val}`);
          if (!bounds.isEmpty()) {
            if (mapped.length > 1) mapObj.current.fitBounds(bounds, 64);
            else mapObj.current.panTo(mapped[0].location);
          }

          const campusPlace = mapped.find((pl) => looksLikeUniversity(pl.name, pl.raw?.types || pl.types || []));
          if (campusPlace?.location) {
            const lat = typeof campusPlace.location.lat === "function" ? campusPlace.location.lat() : campusPlace.location.lat;
            const lng = typeof campusPlace.location.lng === "function" ? campusPlace.location.lng() : campusPlace.location.lng;
            const { nextCity, nextState } = extractCityState(campusPlace.raw?.address_components || []);
            const fallback = {
              name: campusPlace.name,
              city: nextCity || null,
              state: nextState || null,
              latitude: lat,
              longitude: lng,
              campus_radius: null,
            };
            const genericCampusQuery = /^(universities|university|colleges|college|campus|schools|school)$/i.test(val.trim());

            if (!genericCampusQuery) {
              setSelectedUniversityFallback(fallback);
              drawCampusHighlight(fallback);
              const qp = new URLSearchParams();
              if (nextCity) qp.set("city", nextCity);
              if (nextState) qp.set("state", nextState);
              qp.set("university", campusPlace.name);
              qp.set("mode", "university");
              router.push(`/guide?${qp.toString()}`);
            } else {
              setSelectedUniversityFallback(null);
              const qp = new URLSearchParams();
              qp.set("search", val);
              router.push(`/guide?${qp.toString()}`);
            }
          } else {
            setSelectedUniversityFallback(null);
            const qp = new URLSearchParams();
            qp.set("search", val);
            router.push(`/guide?${qp.toString()}`);
          }

          setShowCityInput(false);
          setSuggestions([]);
          setCityInput("");
          return;
        }

        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ address: val, componentRestrictions: { country: "US" } }, (geoRes: any[], geoStatus: string) => {
          if (geoStatus === "OK" && geoRes?.[0]) {
            const { nextCity, nextState } = extractCityState(geoRes[0].address_components);
            applyLocation(geoRes[0].formatted_address || val, geoRes[0].geometry.location, nextCity, nextState, val);
          } else {
            applyLocation(val);
          }
        });
      });
      return;
    }

    if (google?.maps) {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ address: val, componentRestrictions: { country: "US" } }, (res: any[], status: string) => {
        if (status === "OK" && res?.[0]) {
          const { nextCity, nextState } = extractCityState(res[0].address_components);
          applyLocation(res[0].formatted_address || val, res[0].geometry.location, nextCity, nextState, val);
        } else {
          applyLocation(val);
        }
      });
      return;
    }

    applyLocation(val);
  };

  const handleCitySubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    submitCityValue(cityInput);
  };

  /* fetch autocomplete suggestions (debounced) */
  useEffect(() => {
    if (!showCityInput) return;
    if (suggestTimer.current) window.clearTimeout(suggestTimer.current);
    if (!cityInput || cityInput.trim().length < 2) {
      setSuggestions([]);
      setSuggestLoading(false);
      return;
    }
    setSuggestLoading(true);
    suggestTimer.current = window.setTimeout(() => {
      const google = (window as any).google;
      if (!google?.maps?.places) {
        setSuggestions([]);
        setSuggestLoading(false);
        return;
      }
      const svc = new google.maps.places.AutocompleteService();
      svc.getPlacePredictions({ input: cityInput, componentRestrictions: { country: 'us' } }, (preds: any[], status: string) => {
        if (status === 'OK' && preds) setSuggestions(preds.slice(0, 6));
        else setSuggestions([]);
        setSuggestLoading(false);
      });
    }, 260);
    return () => { if (suggestTimer.current) window.clearTimeout(suggestTimer.current); };
  }, [cityInput, showCityInput]);

  const [tab, setTab] = useState<Category | null>(null);
  const [housing, setHousing] = useState<HousingFilter>("all");
  const [cuisine, setCuisine] = useState<CuisineFilter>("all");
  const [mapReady, setMapReady] = useState(false);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [armed, setArmed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [universityLoading, setUniversityLoading] = useState(false);
  const [selectedUniversityFallback, setSelectedUniversityFallback] = useState<CampusTarget | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");

  useEffect(() => setMounted(true), []);

  const clearCampusHighlight = useCallback(() => {
    if (uniMarker.current) {
      uniMarker.current.setMap(null);
      uniMarker.current = null;
    }
    if (campusInfoWindow.current) {
      campusInfoWindow.current.close();
      campusInfoWindow.current = null;
    }
  }, []);

  const clearSelectedLocation = useCallback(() => {
    if (selectedLocationMarker.current) {
      selectedLocationMarker.current.setMap(null);
      selectedLocationMarker.current = null;
    }
  }, []);

  const clearCurrentLocation = useCallback(() => {
    if (currentLocationMarker.current) {
      currentLocationMarker.current.setMap(null);
      currentLocationMarker.current = null;
    }
    if (currentLocationCircle.current) {
      currentLocationCircle.current.setMap(null);
      currentLocationCircle.current = null;
    }
  }, []);

  const loadNearbyMix = useCallback((center: { lat: number; lng: number }) => {
    const google = (window as any).google;
    const map = mapObj.current;
    if (!mapReady || !map || !google?.maps?.places) return;

    setLoading(true);
    setActive(null);
    setArmed(false);
    setTab(null);
    setHousing("all");
    setCuisine("all");
    setSelectedUniversityFallback(null);
    clearCampusHighlight();
    clearSelectedLocation();
    markers.current.forEach((m) => m.setMap(null));
    markers.current = [];

    const service = new google.maps.places.PlacesService(map);
    const groups: { category: Category; type: string; keyword?: string }[] = [
      { category: "housing", type: "real_estate_agency", keyword: "apartments" },
      { category: "restaurants", type: "restaurant" },
      { category: "places", type: "tourist_attraction" },
      { category: "shopping", type: "shopping_mall" },
    ];

    Promise.all(groups.map((group) => new Promise<Place[]>((resolve) => {
      const req: any = { location: center, radius: 6500, type: group.type };
      if (group.keyword) req.keyword = group.keyword;
      service.nearbySearch(req, (res: any[], status: string) => {
        if (status !== "OK" || !res?.length) {
          resolve([]);
          return;
        }
        resolve(res.slice(0, 6).map((place) => toPlace(place, group.category)));
      });
    }))).then((resultGroups) => {
      const seen = new Set<string>();
      const mixed: Place[] = [];

      for (let i = 0; i < 6; i += 1) {
        resultGroups.forEach((group) => {
          const place = group[i];
          if (!place || seen.has(place.id)) return;
          seen.add(place.id);
          mixed.push(place);
        });
      }

      const selected = mixed.slice(0, 20);
      setPlaces(selected);

      selected.forEach((place, i) => {
        if (!place.location) return;
        const markerCategory = place.category || "places";
        const marker = new google.maps.Marker({
          position: place.location,
          map,
          icon: pinIcon(CATEGORY[markerCategory].color, i + 1, false),
        });
        marker.addListener("click", () => {
          setActive(place.id);
          map.panTo(place.location);
          map.setZoom(16);
        });
        markers.current.push(marker);
      });
    }).finally(() => setLoading(false));
  }, [mapReady, clearCampusHighlight, clearSelectedLocation]);

  const showCurrentLocation = useCallback(() => {
    const google = (window as any).google;
    const map = mapObj.current;
    setLocationError("");

    if (!mapReady || !map || !google?.maps) {
      setLocationError("Map is still loading. Try again in a moment.");
      return;
    }
    if (!navigator.geolocation) {
      setLocationError("Current location is not available in this browser.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const current = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        const accuracy = Math.max(position.coords.accuracy || 40, 40);

        clearCurrentLocation();
        currentLocationCircle.current = new google.maps.Circle({
          map,
          center: current,
          radius: accuracy,
          strokeColor: "#4f46e5",
          strokeOpacity: 0.35,
          strokeWeight: 1,
          fillColor: "#4f46e5",
          fillOpacity: 0.12,
          clickable: false,
          zIndex: 800,
        });
        currentLocationMarker.current = new google.maps.Marker({
          position: current,
          map,
          title: "Your current location",
          zIndex: 1200,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 9,
            fillColor: "#2563eb",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 4,
          },
        });

        map.panTo(current);
        map.setZoom(Math.max(map.getZoom() || 15, 15));
        setLocationLabel("Current location");
        setShowCityInput(false);
        setCityInput("");
        setSuggestions([]);
        setSuggestLoading(false);
        loadNearbyMix(current);
        setLocating(false);
        setLocationError("");
      },
      (error) => {
        const messageByCode: Record<number, string> = {
          1: "Location permission is blocked. Allow location access in your browser and try again.",
          2: "Your location could not be found right now.",
          3: "Finding your location took too long. Try again.",
        };
        setLocationError(messageByCode[error.code] || "Unable to get your current location.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [mapReady, clearCurrentLocation, loadNearbyMix]);

  const drawCampusHighlight = useCallback((data: CampusTarget, shouldFocus = true) => {
    const google = (window as any).google;
    const map = mapObj.current;
    if (!map || !google?.maps) return false;

    clearCampusHighlight();
    clearSelectedLocation();

    const position = { lat: data.latitude, lng: data.longitude };

    if (shouldFocus) {
      map.panTo(position);
      map.setZoom(15);
    }

    uniMarker.current = new google.maps.Marker({
      position,
      map,
      title: data.name,
      zIndex: 1000,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 13,
        fillColor: "#4D40CA",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 4,
      },
    });

    campusInfoWindow.current = new google.maps.InfoWindow({
      content: `
        <div style="font-family: Inter, system-ui, sans-serif; min-width: 190px; padding: 2px 0;">
          <div style="font-size: 14px; font-weight: 800; color: #0f172a; margin-bottom: 4px;">${escapeHtml(data.name)}</div>
          <div style="font-size: 12px; color: #64748b;">${escapeHtml(data.city)}${data.city && data.state ? ", " : ""}${escapeHtml(data.state)}</div>
          <div style="font-size: 11px; color: #4D40CA; font-weight: 700; margin-top: 6px;">Google Maps location</div>
        </div>
      `,
    });
    campusInfoWindow.current.open({ map, anchor: uniMarker.current });
    uniMarker.current.addListener("click", () => {
      campusInfoWindow.current?.open({ map, anchor: uniMarker.current });
    });

    return true;
  }, [clearCampusHighlight, clearSelectedLocation]);

  const clearCategorySelection = useCallback(() => {
    setTab(null);
    setPlaces([]);
    setActive(null);
    setLoading(false);
    setArmed(false);
    setHousing("all");
    setCuisine("all");
    markers.current.forEach((m) => m.setMap(null));
    markers.current = [];
  }, []);

  const clearMapSearch = useCallback(() => {
    if (suggestTimer.current) window.clearTimeout(suggestTimer.current);

    routeSearchResetting.current = true;
    setShowCityInput(false);
    setCityInput("");
    setSuggestions([]);
    setSuggestLoading(false);
    setLocationLabel("");
    setSelectedUniversityFallback(null);
    setUniversityLoading(false);
    setDetailLoading(false);
    clearCampusHighlight();
    clearSelectedLocation();
    clearCategorySelection();

    const qp = new URLSearchParams();
    if (city) qp.set("city", city);
    if (state) qp.set("state", state);
    if (city || state) qp.set("mode", "city");
    const nextUrl = qp.toString() ? `/guide?${qp.toString()}` : "/guide";
    router.push(nextUrl);

    const google = (window as any).google;
    const map = mapObj.current;
    if (map && google?.maps) {
      const fallback = `${city || "Tempe"}, ${state || "Arizona"}, USA`;
      new google.maps.Geocoder().geocode({ address: fallback }, (res: any[], status: string) => {
        if (status === "OK" && res?.[0]) {
          map.panTo(res[0].geometry.location);
          map.setZoom(12);
        }
      });
    }
  }, [city, state, router, clearCampusHighlight, clearSelectedLocation, clearCategorySelection]);

  /* init map */
  useEffect(() => {
    if (!mounted || !mapRef.current) return;
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? "";
    loadGoogleMaps(key)
      .then(() => {
        const google = (window as any).google;
        const map = new google.maps.Map(mapRef.current, {
          center: { lat: 33.4255, lng: -111.94 },
          zoom: 12,
          styles: MAP_STYLE,
          disableDefaultUI: true,
          zoomControl: true,
          fullscreenControl: true,
          clickableIcons: false,
        });
        mapObj.current = map;
        setMapReady(true);

        const geocoder = new google.maps.Geocoder();
        const q = `${city || "Tempe"}, ${state || "Arizona"}, USA`;
        geocoder.geocode({ address: q }, (res: any[], status: string) => {
          if (status === "OK" && res[0]) {
            map.setCenter(res[0].geometry.location);
            map.setZoom(12);
          }
        });

        let first = true;
        map.addListener("idle", () => { if (first) { first = false; return; } setArmed(true); });
      })
      .catch(() => setMapError(true));
    return () => {
      clearCampusHighlight();
      clearSelectedLocation();
      clearCurrentLocation();
    };
  }, [mounted, clearCampusHighlight, clearSelectedLocation, clearCurrentLocation]);

  useEffect(() => {
    if (!mapReady || askedForInitialLocation.current) return;
    if (university || searchParam || mode === "university") return;
    askedForInitialLocation.current = true;
    showCurrentLocation();
  }, [mapReady, university, searchParam, mode, showCurrentLocation]);

  useEffect(() => {
    const google = (window as any).google;
    const map = mapObj.current;
    if (!mapReady || !map || !google) return;

    let cancelled = false;
    const geocoder = new google.maps.Geocoder();

    const returnToDefaultMapState = () => {
      const fallback = `${city || "Tempe"}, ${state || "Arizona"}, USA`;
      geocoder.geocode({ address: fallback }, (res: any[], status: string) => {
        if (cancelled) return;
        if (status === "OK" && res?.[0]) {
          map.panTo(res[0].geometry.location);
          map.setZoom(12);
        }
      });
    };

    if (routeSearchResetting.current && (university || searchParam || mode === "university")) {
      setUniversityLoading(false);
      return () => {
        cancelled = true;
      };
    }
    routeSearchResetting.current = false;

    clearCampusHighlight();

    const resolveUniversityFromGoogle = (query: string) => new Promise<CampusTarget | null>((resolve) => {
      if (!google?.maps?.places) {
        resolve(null);
        return;
      }

      const service = new google.maps.places.PlacesService(map);
      const scopedQuery = `${query} ${city} ${state} USA`.trim();
      service.textSearch({ query: scopedQuery, location: map.getCenter(), radius: 50000 }, (results: any[], status: string) => {
        if (status !== "OK" || !results?.length) {
          resolve(null);
          return;
        }

        const match = results.find((place) => looksLikeUniversity(place.name || "", place.types || [])) || results[0];
        const location = match.geometry?.location;
        if (!location) {
          resolve(null);
          return;
        }

        const lat = typeof location.lat === "function" ? location.lat() : location.lat;
        const lng = typeof location.lng === "function" ? location.lng() : location.lng;
        if (lat == null || lng == null) {
          resolve(null);
          return;
        }

        resolve({
          name: match.name || query,
          city: city || null,
          state: state || null,
          latitude: lat,
          longitude: lng,
          campus_radius: null,
        });
      });
    });

    if (!university || mode !== "university") {
      setUniversityLoading(false);
      if (selectedUniversityFallback) {
        drawCampusHighlight(selectedUniversityFallback, false);
      } else if (!locationLabel) {
        returnToDefaultMapState();
      }
      return () => {
        cancelled = true;
      };
    }

    clearSelectedLocation();

    const loadUniversity = async () => {
      setUniversityLoading(true);
      const baseName = university.split(",")[0].replace(/\b(main|tempe|west|downtown|polytechnic)?\s*campus\b/gi, "").trim();
      const aliases: Record<string, string> = {
        asu: "Arizona State University",
        gcu: "Grand Canyon University",
        ucla: "UCLA",
      };
      const candidates = Array.from(new Set([
        university,
        baseName,
        aliases[baseName.toLowerCase()],
      ].filter(Boolean)));

      let target = selectedUniversityFallback;
      for (const candidate of candidates) {
        if (target || cancelled) break;
        target = await resolveUniversityFromGoogle(candidate);
      }

      if (cancelled) return;
      if (target) {
        setSelectedUniversityFallback(target);
        drawCampusHighlight(target);
      } else {
        returnToDefaultMapState();
      }
      setUniversityLoading(false);
    };

    loadUniversity().finally(() => {
      if (!cancelled) setUniversityLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [mapReady, university, searchParam, mode, city, state, locationLabel, selectedUniversityFallback, clearCampusHighlight, clearSelectedLocation, drawCampusHighlight]);

  const openPlaceDetails = useCallback((place: Place) => {
    const google = (window as any).google;
    if (!mapObj.current || !google?.maps?.places) {
      setActive(place.id);
      return;
    }

    setActive(place.id);
    if (place.location) {
      mapObj.current.panTo(place.location);
      mapObj.current.setZoom(16);
    }

    setDetailLoading(true);
    const service = new google.maps.places.PlacesService(mapObj.current);
    service.getDetails({
      placeId: place.id,
      fields: [
        "place_id",
        "name",
        "formatted_address",
        "formatted_phone_number",
        "website",
        "url",
        "rating",
        "user_ratings_total",
        "price_level",
        "photos",
        "geometry",
        "opening_hours",
        "utc_offset_minutes",
        "business_status",
        "international_phone_number",
        "types",
      ],
    }, (details: any, status: string) => {
      setDetailLoading(false);
      if (status !== "OK" || !details) return;
      const enriched = toPlace(details, place.category);
      setPlaces((current) => current.map((item) => item.id === place.id ? { ...item, ...enriched, category: item.category || enriched.category } : item));
    });
  }, []);

  /* search */
  const search = useCallback((cat: Category, cui: string, hou: string, useCenter?: boolean) => {
    const google = (window as any).google;
    if (!mapObj.current || !mapReady || !google) return;
    setLoading(true);
    setActive(null);
    setArmed(false);
    markers.current.forEach((m) => m.setMap(null));
    markers.current = [];

    const service = new google.maps.places.PlacesService(mapObj.current);
    const center = mapObj.current.getCenter();
    const zoom = mapObj.current.getZoom();

    const place = (top: any[]) => {
      const mapped = top.slice(0, 20).map((place) => toPlace(place, cat));
      setPlaces(mapped);
      setLoading(false);
      const bounds = new google.maps.LatLngBounds();
      mapped.forEach((pl, i) => {
        if (!pl.location) return;
        const marker = new google.maps.Marker({ position: pl.location, map: mapObj.current, icon: pinIcon(CATEGORY[cat].color, i + 1, false) });
        marker.addListener("click", () => {
          openPlaceDetails(pl);
        });
        markers.current.push(marker);
        bounds.extend(pl.location);
      });
      if (!useCenter && mapped.length) mapObj.current.fitBounds(bounds, 64);
    };

    if (useCenter) {
      const type = cat === "housing" ? "real_estate_agency" : cat === "restaurants" ? "restaurant" : cat === "places" ? "tourist_attraction" : cat === "shopping" ? "shopping_mall" : "establishment";
      // compute a radius based on zoom level, but allow large radii when zoomed far out
      let radius = zoom >= 15 ? 1200 : zoom >= 14 ? 2400 : zoom >= 13 ? 4500 : zoom >= 12 ? 9000 : zoom >= 10 ? 20000 : 50000;
      // clamp to Places API max radius
      radius = Math.min(radius, 50000);
      const req: any = { location: center, radius, type };
      if (cat === "restaurants" && cui !== "all") req.keyword = cui;
      service.nearbySearch(req, (res: any[], status: string) => {
        if (status === "OK" && res) place(res);
        else { setPlaces([]); setLoading(false); }
      });
      return;
    }

    let query = "";
    const selectedWhere = locationLabel || `${city} ${state}`.trim();
    const where = university && mode === "university" ? `${university} ${selectedWhere}` : selectedWhere;
    if (cat === "housing") {
      const t = hou === "studio" ? "studio apartments" : hou === "1bhk" ? "1 bedroom apartments" : hou === "2bhk" ? "2 bedroom apartments" : "apartments";
      query = `${t} for rent near ${where}`;
    } else if (cat === "restaurants") {
      query = cui !== "all" ? `${cui} restaurant ${where}` : `restaurants ${where}`;
    } else if (cat === "places") {
      query = `top attractions ${where}`;
    } else if (cat === "shopping") {
      query = `shopping ${where}`;
    } else {
      query = `${where} neighborhoods`;
    }
    service.textSearch({ query }, (res: any[], status: string) => {
      if (status === "OK" && res) place(res);
      else { setPlaces([]); setLoading(false); }
    });
  }, [mapReady, city, state, university, mode, locationLabel, openPlaceDetails]);

  /* auto-search on tab change / map ready */
  useEffect(() => {
    if (mapReady && tab) search(tab, cuisine, housing);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, tab]);

  /* keep markers' active state in sync */
  useEffect(() => {
    const google = (window as any).google;
    if (!google) return;
    const markerCategory = tab || "places";
    markers.current.forEach((m, i) => {
      const pl = places[i];
      if (!pl) return;
      m.setIcon(pinIcon(CATEGORY[markerCategory].color, i + 1, pl.id === active));
      m.setZIndex(pl.id === active ? 999 : 1);
    });
  }, [active, places, tab]);

  if (!mounted) return null;

  const tabs: { id: Category; icon: IconName; label: string }[] = [
    { id: "housing", icon: "home", label: "Housing" },
    { id: "restaurants", icon: "food", label: "Restaurants" },
    { id: "places", icon: "pin", label: "Places" },
    { id: "shopping", icon: "bag", label: "Shopping" },
  ];
  const housingTypes: [string, string][] = [["all", "All types"], ["studio", "Studio"], ["1bhk", "1 BHK"], ["2bhk", "2 BHK"]];
  const cuisines: [string, string][] = [["all", "All"], ["indian", "Indian"], ["chinese", "Chinese"], ["mexican", "Mexican"], ["halal", "Halal"], ["italian", "Italian"], ["japanese", "Japanese"], ["american", "American"]];
  const activePlace = places.find((p) => p.id === active) || null;
  const activePlaceCategory = activePlace?.category || tab || "places";
  const hasSearchContext = Boolean(locationLabel);

  return (
    <div className="ygg-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        .ygg-root * { box-sizing: border-box; }
        .ygg-root { height: 100vh; display: flex; flex-direction: column; padding-top: 65px; font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; color: #0f172a; background: #f6f8fc; -webkit-font-smoothing: antialiased; }
        .ygg-hscroll::-webkit-scrollbar { height: 0; }
        .ygg-vscroll::-webkit-scrollbar { width: 5px; }
        .ygg-vscroll::-webkit-scrollbar-thumb { background: rgba(79,70,229,0.2); border-radius: 999px; }
        .ygg-sk { background: linear-gradient(90deg,#eef2f8 25%,#e2e8f2 37%,#eef2f8 63%); background-size: 400% 100%; animation: yggShimmer 1.3s ease infinite; }
        .ygg-sidebar { position: relative; transition: width .2s ease, flex-basis .2s ease, padding .2s ease, box-shadow .2s ease; }
        .ygg-sidebar-toggle-shell { position: absolute; top: 22px; right: -14px; z-index: 75; width: 28px; height: 58px; display: flex; align-items: center; justify-content: center; }
        .ygg-sidebar-toggle { width: 28px !important; height: 58px !important; border: 1px solid #e8edf5 !important; border-left: 0 !important; border-radius: 0 14px 14px 0 !important; background: rgba(255,255,255,.97) !important; color: #94a3b8 !important; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 10px 0 24px -18px rgba(15,23,42,.55) !important; transition: background .14s ease, border-color .14s ease, color .14s ease, box-shadow .14s ease, transform .14s ease; }
        .ygg-sidebar-toggle:hover { background: #fff !important; border-color: #dfe2f4 !important; color: #4f46e5 !important; box-shadow: 12px 0 28px -18px rgba(79,70,229,.55) !important; }
        .ygg-sidebar-toggle:active { transform: scale(.95); }
        .ygg-mobile-backdrop { display: none; }
        @keyframes yggShimmer { 0%{background-position:100% 0} 100%{background-position:-100% 0} }
        @keyframes yggUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
        @keyframes yggSpin { to { transform: rotate(360deg); } }
        @media (max-width: 900px) {
          .ygg-body { position: relative; grid-template-columns: 1fr !important; grid-template-rows: 1fr !important; overflow: hidden; }
          .ygg-sidebar { position: absolute !important; inset: 0 auto 0 0 !important; z-index: 70; width: min(404px, 88vw) !important; height: 100%; border-right: 1px solid #e8edf5 !important; border-top: 0 !important; box-shadow: 18px 0 50px -34px rgba(15,23,42,.55); }
          .ygg-sidebar-collapsed { width: 0 !important; min-width: 0 !important; flex-basis: 0 !important; border-right: 0 !important; box-shadow: none !important; overflow: visible !important; background: transparent !important; }
          .ygg-sidebar-open .ygg-sidebar-toggle-shell { top: 18px !important; right: -14px !important; left: auto !important; }
          .ygg-sidebar-collapsed .ygg-sidebar-toggle-shell { position: absolute !important; top: 14px !important; left: 14px !important; right: auto !important; z-index: 76 !important; width: 34px !important; height: 48px !important; margin: 0 !important; }
          .ygg-sidebar-collapsed .ygg-sidebar-toggle { width: 34px !important; height: 48px !important; border-left: 1px solid #e8edf5 !important; border-radius: 14px !important; box-shadow: 0 16px 34px -22px rgba(15,23,42,.7) !important; }
          .ygg-mobile-backdrop { display: block; position: absolute; inset: 0; z-index: 60; border: 0; background: rgba(15,23,42,.18); backdrop-filter: blur(1px); padding: 0; }
          .ygg-map-pane { min-height: 100%; }
          .ygg-info-card { left: 12px !important; right: 12px !important; bottom: 12px !important; width: auto !important; max-width: none !important; }
        }
        @media (max-width: 640px) {
          .ygg-location-control { right: 12px !important; bottom: 112px !important; }
        }
      `}</style>

      <Nav />

      {/* BODY */}
      <div className="ygg-body" style={{ flex: 1, display: "grid", gridTemplateColumns: `${sidebarOpen ? "404px" : "58px"} 1fr`, minHeight: 0 }}>
        {/* LEFT */}
        <div
          className={`ygg-sidebar ${sidebarOpen ? "ygg-sidebar-open" : "ygg-sidebar-collapsed"}`}
          style={{
            width: sidebarOpen ? 404 : 58,
            minWidth: sidebarOpen ? 404 : 58,
            background: "#fff",
            borderRight: "1px solid #e8edf5",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            overflow: "visible",
          }}
        >
          <div className="ygg-sidebar-toggle-shell">
            <button
              type="button"
              className="ygg-sidebar-toggle"
              onClick={() => setSidebarOpen((value) => !value)}
              aria-label={sidebarOpen ? "Close guide panel" : "Open guide panel"}
              aria-expanded={sidebarOpen}
              title={sidebarOpen ? "Close guide panel" : "Open guide panel"}
            >
              <Glyph name={sidebarOpen ? "chevronLeft" : "chevronRight"} size={15} />
            </button>
          </div>

          {sidebarOpen && (
            <>
          <div style={{ position: "relative", borderBottom: "1px solid #eef2f8" }}>
  {/* Left Button */}
  <button
    onClick={() =>
      document.getElementById("tabs-scroll")?.scrollBy({
        left: -200,
        behavior: "smooth",
      })
    }
    style={{
      position: "absolute",
      left: 8,
      top: "50%",
      transform: "translateY(-50%)",
      zIndex: 10,
      width: 32,
      height: 32,
      borderRadius: "50%",
      border: "1px solid rgba(255,255,255,0.25)",
      background: "rgba(255,255,255,0.75)",
      backdropFilter: "blur(10px)",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    }}
  >
    ‹
  </button>

  {/* Right Button */}
  <button
    onClick={() =>
      document.getElementById("tabs-scroll")?.scrollBy({
        left: 200,
        behavior: "smooth",
      })
    }
    style={{
      position: "absolute",
      right: 8,
      top: "50%",
      transform: "translateY(-50%)",
      zIndex: 10,
      width: 32,
      height: 32,
      borderRadius: "50%",
      border: "1px solid rgba(255,255,255,0.25)",
      background: "rgba(255,255,255,0.75)",
      backdropFilter: "blur(10px)",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    }}
  >
    ›
  </button>

  <div
    id="tabs-scroll"
    className="ygg-hscroll"
    style={{
      display: "flex",
      gap: 6,
      padding: "12px 48px",
      overflowX: "auto",
      scrollBehavior: "smooth",
      scrollbarWidth: "none",
    }}
  >
    {tabs.map((t) => {
      const on = tab === t.id;

      return (
        <button
          key={t.id}
          onClick={() => {
            const next = tab === t.id ? null : t.id;
            if (!next) {
              clearCategorySelection();
              return;
            }
            setTab(next);
            setActive(null);
          }}
          title={on ? "Clear this category" : `Show ${t.label}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            whiteSpace: "nowrap",
            padding: "8px 14px",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: on ? 600 : 500,
            cursor: "pointer",
            color: on ? "#fff" : "#334155",
            background: on ? CATEGORY[t.id].color : "#fff",
            border: `1px solid ${
              on ? CATEGORY[t.id].color : "#e8edf5"
            }`,
            boxShadow: on
              ? `0 4px 12px -4px ${CATEGORY[t.id].color}80`
              : "none",
            flexShrink: 0,
          }}
        >
          <Glyph
            name={t.icon}
            size={15}
            color={on ? "#fff" : CATEGORY[t.id].color}
          />
          {t.label}
        </button>
      );
    })}
  </div>
</div>

          {tab === "housing" && <FilterRow options={housingTypes} value={housing} onChange={(v) => { setHousing(v as HousingFilter); search("housing", cuisine, v); }} />}
          {tab === "restaurants" && <FilterRow options={cuisines} value={cuisine} onChange={(v) => { setCuisine(v as CuisineFilter); search("restaurants", v, housing); }} />}
          {/* Removed avoid informational block */}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "14px 16px 8px", flexShrink: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "#94a3b8" }}>{tab ? CATEGORY[tab].label : "Explore"}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {tab && (
                <button onClick={clearCategorySelection} style={{ border: "1px solid #e8edf5", background: "#fff", color: "#64748b", borderRadius: 999, padding: "5px 9px", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>
                  Clear
                </button>
              )}
              {!loading && <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>{places.length} results</span>}
            </div>
          </div>

          <div className="ygg-vscroll" style={{ flex: 1, overflowY: "auto", padding: "0 12px 16px", minHeight: 0 }}>
            {loading ? (
              [0, 1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)
            ) : places.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "56px 20px", gap: 10, textAlign: "center" }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: "#f1f5fb", display: "flex", alignItems: "center", justifyContent: "center" }}><Glyph name="search" size={24} color="#94a3b8" /></div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#475569" }}>{locating ? "Allow location access" : tab || hasSearchContext ? "No results found" : "Choose what to explore"}</div>
                <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.5 }}>{locating ? <>We’ll use your current location to show<br />nearby housing, food, places, and shopping.</> : tab ? <>Try a different filter, or move the map and<br />press "Search this area".</> : hasSearchContext ? <>Try another map search from the<br />search bar above.</> : <>Search any place on the map, or pick a category<br />when you want nearby results.</>}</div>
              </div>
            ) : (
              places.map((p, i) => {
                const placeCategory = p.category || tab || "places";
                return <PlaceCard key={p.id} place={p} i={i} cat={placeCategory} active={active === p.id} onClick={() => openPlaceDetails(p)} />;
              })
            )}
          </div>
            </>
          )}
        </div>

        {sidebarOpen && (
          <button
            type="button"
            className="ygg-mobile-backdrop"
            aria-label="Close guide panel"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* RIGHT — MAP */}
        <div className="ygg-map-pane" style={{ position: "relative", minWidth: 0 }}>
          <div ref={mapRef} style={{ position: "absolute", inset: 0 }} />

          <div style={{ position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)", width: "min(620px, calc(100% - 32px))", zIndex: 35 }}>
            {showCityInput ? (
              <div style={{ position: "relative" }}>
                <form onSubmit={handleCitySubmit} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
	                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, flex: 1, padding: '7px 8px 7px 15px', borderRadius: 999, background: 'rgba(255,255,255,0.98)', border: '1px solid rgba(99,102,241,0.24)', boxShadow: '0 18px 44px -28px rgba(15,23,42,0.55)', backdropFilter: "blur(14px)" }}>
                    <Glyph name="search" size={16} color="#4f46e5" />
                    <input
                      value={cityInput}
                      onChange={(e) => setCityInput((e.target as HTMLInputElement).value)}
                      autoFocus
                      placeholder="Search any address, university, restaurant, store, or place"
                      style={{ padding: '8px 4px', borderRadius: 8, border: 'none', minWidth: 0, width: "100%", background: 'transparent', outline: 'none', fontSize: 14, color: '#0f172a' }}
                    />
	                    <button type="submit" style={{ width: 40, height: 40, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 999, background: '#4f46e5', color: '#fff', border: 'none', cursor: 'pointer', boxShadow: "0 10px 22px -14px rgba(79,70,229,0.8)" }} title="Search">
                      <Glyph name="search" size={15} color="#fff" />
                    </button>
                  </div>
	                  <button type="button" onClick={() => { setShowCityInput(false); setSuggestions([]); }} title="Cancel" style={{ width: 42, height: 42, borderRadius: 999, background: 'rgba(255,255,255,0.98)', border: '1px solid #e2e8f0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 18px 44px -30px rgba(15,23,42,0.55)' }}>
                    <Glyph name="close" size={14} color="#64748b" />
                  </button>
                </form>

                {(suggestions.length > 0 || suggestLoading) && (
	                  <div style={{ position: 'absolute', left: 0, right: 50, top: 'calc(100% + 8px)', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, boxShadow: '0 24px 54px -26px rgba(15,23,42,0.55)', zIndex: 80, overflow: 'hidden' }}>
                    {suggestLoading ? (
                      <div style={{ padding: 14, color: '#64748b', fontSize: 14 }}>Searching places…</div>
                    ) : (
                      suggestions.map((s: any) => (
                        <button key={s.place_id || s.description} onClick={() => submitCityValue(s.description, s.place_id)} style={{ display: 'flex', gap: 11, width: '100%', textAlign: 'left', padding: '12px 14px', border: 'none', borderBottom: '1px solid #f1f5f9', background: 'transparent', cursor: 'pointer', color: '#0f172a' }} onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                          <span style={{ display: "grid", placeItems: "center", width: 30, height: 30, borderRadius: 999, background: "#eef0fe", color: "#4f46e5", flexShrink: 0 }}>
                            <Glyph name="pin" size={14} color="#4f46e5" />
                          </span>
                          <span style={{ minWidth: 0 }}>
                            <span style={{ display: "block", fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.structured_formatting?.main_text || s.description}</span>
                            <span style={{ display: "block", marginTop: 2, fontSize: 12.5, color: '#64748b', overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.structured_formatting?.secondary_text || s.description}</span>
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button onClick={() => setShowCityInput(true)} title="Search the map" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flex: 1, minWidth: 0, padding: "13px 18px", borderRadius: 999, background: "rgba(255,255,255,0.98)", border: "1px solid rgba(99,102,241,0.24)", cursor: "pointer", color: "#4f46e5", boxShadow: "0 18px 44px -28px rgba(15,23,42,0.55)", backdropFilter: "blur(14px)" }}>
                  <Glyph name="search" size={16} color="#4f46e5" />
                  <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 14, fontWeight: 800 }}>
                    {locationLabel || "Search any place, university, restaurant, or store"}
                  </span>
                </button>
                {locationLabel && (
                  <button type="button" onClick={clearMapSearch} title="Clear map search" aria-label="Clear map search" style={{ width: 46, height: 46, flexShrink: 0, borderRadius: 999, background: "rgba(255,255,255,0.98)", border: "1px solid #e2e8f0", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 18px 44px -30px rgba(15,23,42,0.55)", backdropFilter: "blur(14px)" }}>
                    <Glyph name="close" size={15} color="#64748b" />
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="ygg-location-control" style={{ position: "absolute", right: 16, bottom: 118, zIndex: 34, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, maxWidth: "min(290px, calc(100% - 32px))" }}>
            <button
              type="button"
              onClick={showCurrentLocation}
              disabled={!mapReady || locating}
              title="Show my current location"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                width: 44,
                height: 44,
                padding: 0,
                borderRadius: 10,
                border: "1px solid rgba(99,102,241,0.24)",
                background: "rgba(255,255,255,0.98)",
                color: locating ? "#64748b" : "#4f46e5",
                fontSize: 13,
                fontWeight: 800,
                cursor: !mapReady || locating ? "not-allowed" : "pointer",
                opacity: !mapReady ? 0.7 : 1,
                boxShadow: "0 18px 44px -30px rgba(15,23,42,0.55)",
                backdropFilter: "blur(14px)",
              }}
            >
              <span style={{ display: "inline-flex", animation: locating ? "yggSpin 1s linear infinite" : "none" }}>
                <Glyph name="locate" size={16} color={locating ? "#64748b" : "#4f46e5"} />
              </span>
            </button>

            {locationError && (
              <div role="alert" style={{ display: "flex", alignItems: "flex-start", gap: 10, width: "100%", padding: "10px 11px", borderRadius: 12, background: "rgba(255,255,255,0.98)", border: "1px solid #fecaca", color: "#991b1b", boxShadow: "0 18px 44px -30px rgba(15,23,42,0.55)", backdropFilter: "blur(14px)" }}>
                <Glyph name="warn" size={16} color="#dc2626" />
                <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, lineHeight: 1.35, fontWeight: 700 }}>{locationError}</span>
                <button type="button" onClick={() => setLocationError("")} aria-label="Dismiss location error" style={{ width: 24, height: 24, flexShrink: 0, border: "none", background: "transparent", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <Glyph name="close" size={13} color="#991b1b" />
                </button>
              </div>
            )}
          </div>

          {mapError && (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, background: "#f4f6fb", color: "#64748b", textAlign: "center", padding: 24 }}>
              <Glyph name="pin" size={32} color="#94a3b8" />
              <div style={{ fontWeight: 600, color: "#475569" }}>Map unavailable</div>
              <div style={{ fontSize: 13 }}>Set <code style={{ background: "#e8edf5", padding: "1px 5px", borderRadius: 4 }}>NEXT_PUBLIC_GOOGLE_MAPS_KEY</code> to enable the map.</div>
            </div>
          )}

          {universityLoading && (
            <div style={{ position: "absolute", top: 18, right: 18, maxWidth: 280, padding: "10px 13px", borderRadius: 12, background: "rgba(255,255,255,0.96)", border: "1px solid rgba(77,64,202,0.25)", color: "#4D40CA", fontSize: 12.5, fontWeight: 600, boxShadow: "0 4px 16px rgba(15,23,42,0.08)", zIndex: 25 }}>
              Loading university location...
            </div>
          )}

          {tab && (
            <button
              onClick={() => search(tab, cuisine, housing, true)}
              style={{ position: "absolute", top: 78, left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 8, padding: "9px 18px", borderRadius: 999, cursor: "pointer", whiteSpace: "nowrap", background: armed ? "#4f46e5" : "rgba(255,255,255,0.96)", color: armed ? "#fff" : "#4f46e5", border: `1px solid ${armed ? "#4f46e5" : "rgba(79,70,229,0.25)"}`, fontSize: 13.5, fontWeight: 600, boxShadow: "0 4px 16px rgba(15,23,42,0.08)", backdropFilter: "blur(8px)", transition: "all .2s", zIndex: 20 }}
            >
              <Glyph name="search" size={15} color={armed ? "#fff" : "#4f46e5"} /> Search this area
            </button>
          )}

          {activePlace && !loading && <InfoCard place={activePlace} cat={activePlaceCategory} onClose={() => setActive(null)} />}
          {detailLoading && (
            <div style={{ position: "absolute", bottom: 22, left: 22, zIndex: 45, padding: "8px 12px", borderRadius: 999, background: "rgba(255,255,255,0.96)", border: "1px solid #e8edf5", color: "#4f46e5", fontSize: 12.5, fontWeight: 700, boxShadow: "0 8px 22px rgba(15,23,42,0.08)" }}>
              Loading details…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────  Page (Suspense wrapper)  ───────────────────────── */
export default function GuidePage() {
  return (
    <Suspense
      fallback={
        <div style={{ height: "100vh", background: "#f6f8fc", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 34, height: 34, margin: "0 auto 14px", borderRadius: "50%", border: "3px solid rgba(79,70,229,0.15)", borderTopColor: "#4f46e5", animation: "yggSpin .7s linear infinite" }} />
            <div style={{ fontSize: 14, color: "#64748b" }}>Loading your guide…</div>
          </div>
          <style>{`@keyframes yggSpin { to { transform: rotate(360deg); } }`}</style>
        </div>
      }
    >
      <GuideContent />
    </Suspense>
  );
}
