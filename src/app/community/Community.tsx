
// @ts-nocheck
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  ChevronDown,
  Copy,
  FileText,
  Grid2X2,
  GraduationCap,
  HelpCircle,
  Image as ImageIcon,
  LayoutDashboard,
  List,
  LogOut,
  MapPin,
  MessageCircle,
  MoreVertical,
  Paperclip,
  Plus,
  Save,
  Search,
  Send as SendIcon,
  Settings,
  ShieldCheck,
  Smile,
  Trash2,
  UserMinus,
  Users,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { PRESET_GROUPS } from "@/lib/community-groups";
import CommunityDesign from "./CommunityDesign";
import AllGroupsDesign from "./AllGroupsDesign";
import { Nav } from "@/components/ds/Nav";

const STORAGE_VERSION = "community-directory-launch-v1";
const CUSTOM_GROUPS_KEY = "ygiu_custom_groups";
const JOINED_GROUPS_KEY = "ygiu_joined_groups";
const EXITED_GROUPS_KEY = "ygiu_exited_groups";
const MUTED_GROUPS_KEY = "ygiu_muted_groups";
const UNREAD_GROUPS_KEY = "ygiu_unread_groups";
const CLEARED_MESSAGES_KEY = "ygiu_cleared_messages";
const CREATE_HINT_DISMISSED_KEY = "ygiu_create_group_hint_dismissed";
const COMMUNITY_MODERATOR_EMAILS_KEY = "ygiu_community_moderator_emails";
const COMMUNITY_MEDIA_BUCKET = "community-media";
const MAX_PROFILE_PHOTO_SIZE = 10 * 1024 * 1024;

const C = {
  page: "#f6f8fb",
  card: "#ffffff",
  text: "#101828",
  sub: "#667085",
  muted: "#98a2b3",
  line: "#e7ebf2",
  lineStrong: "#d9deea",
  brand: "#4f6ff6",
  brandSoft: "#eef2ff",
  green: "#079455",
  danger: "#b42318",
};

const CARD_TONES = [
  { bg: "#eef2ff", border: "#c7d2fe", text: "#4f46e5", iconBg: "#4f46e5", iconText: "#ffffff" },
  { bg: "#ecfdf5", border: "#bbf7d0", text: "#047857", iconBg: "#14b8a6", iconText: "#ffffff" },
  { bg: "#fff7ed", border: "#fed7aa", text: "#c2410c", iconBg: "#f97316", iconText: "#ffffff" },
  { bg: "#fdf2f8", border: "#fbcfe8", text: "#be185d", iconBg: "#db2777", iconText: "#ffffff" },
  { bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8", iconBg: "#2563eb", iconText: "#ffffff" },
  { bg: "#f5f3ff", border: "#ddd6fe", text: "#6d28d9", iconBg: "#7c3aed", iconText: "#ffffff" },
];

function toneForGroup(group, index = 0) {
  if (group?.type === "School") return CARD_TONES[index % CARD_TONES.length];
  if (group?.type === "City") return CARD_TONES[(index + 1) % CARD_TONES.length];
  return CARD_TONES[(index + 2) % CARD_TONES.length];
}

function groupTypeLabel(group) {
  return group?.type === "School" ? "University" : group?.type || "Group";
}

function groupCategory(group) {
  const type = String(group?.type || "").toLowerCase();
  if (type === "school" || type === "university" || type === "universities") return "School";
  if (type === "city" || type === "cities") return "City";
  return "Custom";
}

function isGroupCreatedByUser(group, user) {
  if (!user?.id) return false;
  return group?.createdBy === user.id || (!group?.createdBy && group?.id?.startsWith("custom-"));
}

function sortGroupsAlphabetically(groups) {
  return [...(groups || [])].sort((left, right) =>
    String(left?.name || "").localeCompare(String(right?.name || ""), undefined, { sensitivity: "base" })
  );
}

function GroupGlyph({ group, tone, size = 46 }) {
  const Icon = group?.type === "School" ? GraduationCap : group?.type === "City" ? Building2 : Users;
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: Math.max(12, Math.round(size * 0.3)),
        background: tone?.iconBg || C.brand,
        color: tone?.iconText || "#fff",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        boxShadow: "0 14px 30px -20px rgba(31,41,55,.55)",
      }}
    >
      <Icon size={Math.round(size * 0.46)} strokeWidth={2.2} />
    </span>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m20 6-11 11-5-5" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function Button({ children, onClick, variant = "primary", disabled = false, style = {} }) {
  const styles = {
    primary: {
      background: "linear-gradient(100deg,#4f6ff6 0%,#13b98a 100%)",
      color: "#fff",
      border: "1px solid transparent",
      boxShadow: "0 10px 22px -14px rgba(79,111,246,.7)",
    },
    secondary: {
      background: "#fff",
      color: C.text,
      border: `1px solid ${C.lineStrong}`,
      boxShadow: "none",
    },
    soft: {
      background: C.brandSoft,
      color: C.brand,
      border: "1px solid rgba(79,111,246,.22)",
      boxShadow: "none",
    },
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        borderRadius: 12,
        minHeight: 42,
        padding: "0 16px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        font: "inherit",
        fontSize: 14,
        fontWeight: 800,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.62 : 1,
        whiteSpace: "nowrap",
        ...styles[variant],
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function UserMark({ user }) {
  const metadata = user?.user_metadata || {};
  const avatarPath = metadata.avatar_path || "";
  const [signedImage, setSignedImage] = useState("");
  const label = metadata.full_name || metadata.name || user?.email || "User";
  const initials = label
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";

  useEffect(() => {
    let cancelled = false;
    if (!avatarPath) {
      setSignedImage("");
      return;
    }

    signedCommunityMediaUrl(avatarPath)
      .then((url) => {
        if (!cancelled) setSignedImage(url);
      })
      .catch(() => {
        if (!cancelled) setSignedImage("");
      });

    return () => {
      cancelled = true;
    };
  }, [avatarPath]);

  const image = signedImage || metadata.avatar_url || metadata.picture;

  return (
    <span
      title={label}
      style={{
        width: 38,
        height: 38,
        borderRadius: 99,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        background: C.brandSoft,
        color: C.brand,
        fontSize: 13,
        fontWeight: 900,
        border: `1px solid ${C.line}`,
        flexShrink: 0,
      }}
    >
      {image ? <img src={image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
    </span>
  );
}

function profileName(user) {
  return user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || "Student";
}

function profileInitials(user) {
  return profileName(user)
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";
}

function WorkspaceProfileButton({ user, onSettings, onSignOut, variant = "header" }) {
  const [open, setOpen] = useState(false);
  const [signedImage, setSignedImage] = useState("");
  const ref = useRef(null);
  const name = profileName(user);
  const firstName = name.split(" ")[0] || "Student";
  const initials = profileInitials(user);
  const avatarPath = user?.user_metadata?.avatar_path || "";
  const image = signedImage || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || "";

  useEffect(() => {
    let cancelled = false;
    if (!avatarPath) {
      setSignedImage("");
      return;
    }

    signedCommunityMediaUrl(avatarPath)
      .then((url) => {
        if (!cancelled) setSignedImage(url);
      })
      .catch(() => {
        if (!cancelled) setSignedImage("");
      });

    return () => {
      cancelled = true;
    };
  }, [avatarPath]);

  useEffect(() => {
    if (!open) return;
    function close(event) {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    }
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const isFooter = variant === "footer";

  return (
    <div ref={ref} style={{ position: "relative", minWidth: 0 }}>
      <button
        onClick={() => setOpen((value) => !value)}
        style={{
          width: isFooter ? "100%" : "auto",
          height: isFooter ? 44 : 38,
          borderRadius: isFooter ? 12 : 11,
          border: isFooter ? "none" : "1px solid #dfe3eb",
          background: "#fff",
          padding: isFooter ? 0 : "0 11px",
          display: "flex",
          alignItems: "center",
          gap: 9,
          color: "#181b23",
          font: "inherit",
          fontSize: 14,
          fontWeight: 850,
          cursor: "pointer",
          textAlign: "left",
        }}
        aria-expanded={open}
        aria-label="Open profile menu"
      >
        <span style={{ width: isFooter ? 34 : 28, height: isFooter ? 34 : 28, borderRadius: 999, background: "#181b23", color: "#fff", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 950, flexShrink: 0, overflow: "hidden" }}>
          {image ? <img src={image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
        </span>
        <span style={{ minWidth: 0, flex: isFooter ? 1 : "initial" }}>
          <span style={{ display: "block", maxWidth: isFooter ? "100%" : 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{isFooter ? name : firstName}</span>
          {isFooter && <span style={{ display: "block", color: "#69707d", fontSize: 12, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.email}</span>}
        </span>
        <ChevronDown size={14} color="#69707d" />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            bottom: isFooter ? 52 : "auto",
            top: isFooter ? "auto" : 48,
            width: 282,
            borderRadius: 16,
            border: "1px solid #dfe3eb",
            background: "#fff",
            boxShadow: "0 24px 70px -34px rgba(15,23,42,.55)",
            overflow: "hidden",
            zIndex: 40,
          }}
        >
          <div style={{ display: "flex", gap: 10, padding: 14, borderBottom: "1px solid #eef1f6" }}>
            <UserMark user={user} />
            <div style={{ minWidth: 0 }}>
              <div style={{ color: "#181b23", fontSize: 13.5, fontWeight: 950, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
              <div style={{ color: "#69707d", fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.email}</div>
            </div>
          </div>
          <div style={{ display: "grid", padding: 8 }}>
            <button
              onClick={() => {
                setOpen(false);
                onSettings();
              }}
              style={{ minHeight: 40, border: "none", borderRadius: 10, background: "transparent", color: "#181b23", font: "inherit", fontSize: 13.5, fontWeight: 850, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, padding: "0 10px", textAlign: "left" }}
            >
              <Settings size={16} color="#2f8f86" /> Profile settings
            </button>
            <button
              onClick={() => {
                setOpen(false);
                onSignOut();
              }}
              style={{ minHeight: 40, border: "none", borderRadius: 10, background: "transparent", color: "#181b23", font: "inherit", fontSize: 13.5, fontWeight: 850, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, padding: "0 10px", textAlign: "left" }}
            >
              <LogOut size={16} color="#9b4e33" /> Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileSettingsModal({ user, onClose, onUserUpdate, onAccountDeleted }) {
  const metadata = user?.user_metadata || {};
  const [displayName, setDisplayName] = useState(metadata.full_name || metadata.name || "");
  const [university, setUniversity] = useState(metadata.university || "");
  const [city, setCity] = useState(metadata.city || "");
  const [profilePhoto, setProfilePhoto] = useState(metadata.avatar_url || metadata.picture || "");
  const [profilePhotoPath, setProfilePhotoPath] = useState(metadata.avatar_path || "");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const profilePhotoInputRef = useRef(null);
  const profilePhotoPreview = profilePhoto.trim();

  useEffect(() => {
    setDisplayName(metadata.full_name || metadata.name || "");
    setUniversity(metadata.university || "");
    setCity(metadata.city || "");
    setProfilePhoto(metadata.avatar_url || metadata.picture || "");
    setProfilePhotoPath(metadata.avatar_path || "");
    setStatus("");
  }, [user?.id]);

  async function saveSettings(event) {
    event.preventDefault();
    if (!user || saving) return;

    setSaving(true);
    setStatus("");
    const { data, error } = await supabase.auth.updateUser({
      data: {
        ...metadata,
        full_name: displayName.trim(),
        university: university.trim(),
        city: city.trim(),
        avatar_url: profilePhoto.trim(),
        picture: profilePhoto.trim(),
        avatar_path: profilePhotoPath,
      },
    });
    setSaving(false);

    if (error) {
      setStatus(error.message);
      return;
    }

    onUserUpdate(data.user);
    setStatus("Profile settings saved.");
  }

  async function deleteAccount() {
    if (!user || deleting) return;
    const email = user.email || "";
    const confirmation = window.prompt(`Delete your account permanently? Type ${email} to confirm.`);
    if (!confirmation || confirmation.trim().toLowerCase() !== email.toLowerCase()) {
      setStatus("Account deletion cancelled. The email confirmation did not match.");
      return;
    }

    setDeleting(true);
    setStatus("");
    const { error } = await supabase.rpc("delete_current_user", {
      confirmation_email: confirmation.trim(),
    });
    setDeleting(false);

    if (error) {
      setStatus(`Unable to delete account: ${error.message}`);
      return;
    }

    await supabase.auth.signOut();
    onAccountDeleted();
    window.location.assign("/");
  }

  async function uploadProfilePhoto(event) {
    const file = event.target.files?.[0];
    if (!file || !user || photoUploading) return;

    if (!file.type.startsWith("image/")) {
      setStatus("Unable to upload profile photo: choose an image file.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_PROFILE_PHOTO_SIZE) {
      setStatus("Unable to upload profile photo: image must be 10 MB or smaller.");
      event.target.value = "";
      return;
    }

    setPhotoUploading(true);
    setStatus("");

    const extension = fileExtension(file);
    const path = `profile-photos/${user.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from(COMMUNITY_MEDIA_BUCKET).upload(path, file, {
      cacheControl: "3600",
      contentType: (file.type || "image/jpeg").split(";")[0],
      upsert: false,
    });

    event.target.value = "";
    setPhotoUploading(false);

    if (error) {
      setStatus(`Unable to upload profile photo: ${error.message}`);
      return;
    }

    let signedUrl = "";
    try {
      signedUrl = await signedCommunityMediaUrl(path);
    } catch (signedError) {
      setStatus("Profile photo uploaded, but preview could not be created. Try again after refreshing.");
      return;
    }
    setProfilePhoto(signedUrl);
    setProfilePhotoPath(path);
    setStatus("Profile photo uploaded. Save settings to keep it.");
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(15,23,42,.45)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }} role="dialog" aria-modal="true" aria-label="Profile settings">
      <div style={{ width: "min(560px,100%)", maxHeight: "92vh", overflowY: "auto", borderRadius: 22, border: "1px solid #dfe3eb", background: "#fbfcfe", boxShadow: "0 34px 90px -42px rgba(0,0,0,.65)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, padding: 20, borderBottom: "1px solid #dfe3eb", background: "#fff" }}>
          <div style={{ display: "flex", gap: 12, minWidth: 0 }}>
            <UserMark user={user} />
            <div style={{ minWidth: 0 }}>
              <h2 style={{ margin: 0, color: "#181b23", fontSize: 21, fontWeight: 950, letterSpacing: "-.02em" }}>Profile settings</h2>
              <p style={{ margin: "4px 0 0", color: "#69707d", fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.email}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close profile settings" style={{ width: 36, height: 36, borderRadius: 999, border: "1px solid #dfe3eb", background: "#fff", color: "#69707d", display: "grid", placeItems: "center", cursor: "pointer" }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={saveSettings} style={{ display: "grid", gap: 18, padding: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 14 }}>
            <label style={{ display: "grid", gap: 7, color: "#181b23", fontSize: 13, fontWeight: 900 }}>
              Display name
              <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Your name" style={{ height: 46, borderRadius: 12, border: "1px solid #dfe3eb", background: "#fff", color: "#181b23", font: "inherit", padding: "0 12px", outline: "none" }} />
            </label>
            <label style={{ display: "grid", gap: 7, color: "#181b23", fontSize: 13, fontWeight: 900 }}>
              Email address
              <input value={user?.email || ""} readOnly style={{ height: 46, borderRadius: 12, border: "1px solid #dfe3eb", background: "#f1f3f7", color: "#69707d", font: "inherit", padding: "0 12px", outline: "none" }} />
            </label>
            <label style={{ display: "grid", gap: 7, color: "#181b23", fontSize: 13, fontWeight: 900 }}>
              University
              <input value={university} onChange={(event) => setUniversity(event.target.value)} placeholder="School or university" style={{ height: 46, borderRadius: 12, border: "1px solid #dfe3eb", background: "#fff", color: "#181b23", font: "inherit", padding: "0 12px", outline: "none" }} />
            </label>
            <label style={{ display: "grid", gap: 7, color: "#181b23", fontSize: 13, fontWeight: 900 }}>
              City
              <input value={city} onChange={(event) => setCity(event.target.value)} placeholder="Current city" style={{ height: 46, borderRadius: 12, border: "1px solid #dfe3eb", background: "#fff", color: "#181b23", font: "inherit", padding: "0 12px", outline: "none" }} />
            </label>
          </div>

          <div style={{ borderRadius: 16, border: "1px solid #dfe3eb", background: "#fff", padding: 15 }}>
            <div style={{ color: "#181b23", fontSize: 14, fontWeight: 950 }}>Profile photo</div>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 14, flexWrap: "wrap" }}>
              <span
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 999,
                  display: "grid",
                  placeItems: "center",
                  overflow: "hidden",
                  background: C.brandSoft,
                  color: C.brand,
                  fontSize: 22,
                  fontWeight: 950,
                  border: "1px solid #dfe3eb",
                  flexShrink: 0,
                }}
              >
                {profilePhotoPreview ? <img src={profilePhotoPreview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : profileInitials(user)}
              </span>
              <div style={{ minWidth: 220, flex: 1 }}>
                <div style={{ color: "#69707d", fontSize: 13, fontWeight: 750, lineHeight: 1.45 }}>
                  Upload a profile photo from your device.
                </div>
                <div style={{ display: "flex", gap: 9, marginTop: 11, flexWrap: "wrap" }}>
                  <input ref={profilePhotoInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={uploadProfilePhoto} style={{ display: "none" }} />
                  <button type="button" onClick={() => profilePhotoInputRef.current?.click()} disabled={photoUploading} style={{ minHeight: 40, borderRadius: 12, border: "1px solid #bbf7d0", background: "#f0fdf4", color: C.green, font: "inherit", fontSize: 13.5, fontWeight: 950, padding: "0 12px", cursor: photoUploading ? "not-allowed" : "pointer", opacity: photoUploading ? 0.65 : 1, display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <ImageIcon size={16} /> {photoUploading ? "Uploading..." : "Upload photo"}
                  </button>
                  {profilePhotoPreview && (
                    <button type="button" onClick={() => setProfilePhoto("")} style={{ minHeight: 40, borderRadius: 12, border: "1px solid #dfe3eb", background: "#fff", color: "#69707d", font: "inherit", fontSize: 13.5, fontWeight: 900, padding: "0 12px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <X size={16} /> Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {status && (
            <div style={{ borderRadius: 12, border: `1px solid ${status.includes("Unable") ? "#fecdca" : "#bbf7d0"}`, background: status.includes("Unable") ? "#fff4f2" : "#f0fdf4", color: status.includes("Unable") ? C.danger : C.green, padding: "10px 12px", fontSize: 13, fontWeight: 850 }}>
              {status}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", borderTop: "1px solid #dfe3eb", paddingTop: 16 }}>
            <button type="button" onClick={deleteAccount} disabled={deleting} style={{ minHeight: 42, borderRadius: 12, border: "1px solid #fecdca", background: "#fff", color: C.danger, font: "inherit", fontSize: 13.5, fontWeight: 950, padding: "0 14px", cursor: deleting ? "not-allowed" : "pointer", opacity: deleting ? 0.65 : 1, display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Trash2 size={16} /> {deleting ? "Deleting..." : "Delete account"}
            </button>
            <div style={{ display: "flex", gap: 9 }}>
              <button type="button" onClick={onClose} style={{ minHeight: 42, borderRadius: 12, border: "1px solid #dfe3eb", background: "#fff", color: "#181b23", font: "inherit", fontSize: 13.5, fontWeight: 900, padding: "0 14px", cursor: "pointer" }}>Cancel</button>
              <button type="submit" disabled={saving} style={{ minHeight: 42, borderRadius: 12, border: "none", background: "#181b23", color: "#fff", font: "inherit", fontSize: 13.5, fontWeight: 950, padding: "0 16px", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.65 : 1, display: "inline-flex", alignItems: "center", gap: 8 }}>
                <Save size={16} /> {saving ? "Saving..." : "Save settings"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function CommunityToast({ toast, chromeOffset = 0, onClose }) {
  if (!toast) return null;

  return (
    <aside
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        top: chromeOffset ? chromeOffset + 18 : 18,
        right: "clamp(14px,3vw,28px)",
        zIndex: 120,
        width: "min(360px,calc(100vw - 28px))",
        borderRadius: 16,
        border: "1px solid #dfe6f4",
        background: "rgba(255,255,255,.96)",
        boxShadow: "0 24px 70px -34px rgba(15,23,42,.55)",
        backdropFilter: "blur(14px)",
        padding: 14,
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        color: C.text,
      }}
    >
      <span style={{ width: 36, height: 36, borderRadius: 12, background: "#eef2ff", color: "#4f46e5", display: "grid", placeItems: "center", flexShrink: 0 }}>
        <ShieldCheck size={18} />
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 950, lineHeight: 1.25 }}>{toast.title}</div>
        <div style={{ marginTop: 3, color: C.sub, fontSize: 13.5, fontWeight: 750, lineHeight: 1.4 }}>{toast.message}</div>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss"
        style={{
          width: 28,
          height: 28,
          borderRadius: 9,
          border: "1px solid #edf0f6",
          background: "#fff",
          color: C.sub,
          display: "grid",
          placeItems: "center",
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        <X size={15} />
      </button>
    </aside>
  );
}

function EmptyState({ title = "No groups found", message = "Try a different search or create a new group." }) {
  return (
    <section
      style={{
        background: C.card,
        border: `1px solid ${C.line}`,
        borderRadius: 18,
        padding: "clamp(32px,6vw,64px)",
        textAlign: "center",
        boxShadow: "0 18px 54px -38px rgba(16,24,40,.25)",
      }}
    >
      <div
        style={{
          width: 58,
          height: 58,
          borderRadius: 16,
          margin: "0 auto 18px",
          background: C.brandSoft,
          color: C.brand,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 24,
          fontWeight: 900,
        }}
      >
        0
      </div>
      <h2 style={{ margin: 0, fontSize: "clamp(22px,3vw,30px)", color: C.text, letterSpacing: 0 }}>
        {title}
      </h2>
      <p style={{ margin: "10px auto 0", maxWidth: 520, color: C.sub, fontSize: 15.5, lineHeight: 1.6 }}>
        {message}
      </p>
    </section>
  );
}

function GroupCard({ group, joined, onView, onJoin }) {
  const displayedMemberCount = Number(group.memberCount || 0) || (joined ? 1 : 0);
  return (
    <article
      style={{
        background: C.card,
        border: `1px solid ${C.line}`,
        borderRadius: 16,
        padding: 22,
        boxShadow: "0 14px 40px -30px rgba(16,24,40,.22)",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        minHeight: 210,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 20, letterSpacing: 0 }}>
            <a href={`/community/${group.id}`} style={{ color: C.text, textDecoration: "none" }}>
              {group.name}
            </a>
          </h3>
          <p style={{ margin: "7px 0 0", color: C.sub, fontSize: 14.5, lineHeight: 1.5 }}>{group.description}</p>
        </div>
        <span
          style={{
            height: 28,
            padding: "0 10px",
            borderRadius: 999,
            background: C.brandSoft,
            color: C.brand,
            display: "inline-flex",
            alignItems: "center",
            fontSize: 12,
            fontWeight: 800,
            flexShrink: 0,
          }}
        >
          {group.type}
        </span>
      </div>

      <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <span style={{ color: C.muted, fontSize: 13.5, fontWeight: 700 }}>{displayedMemberCount} members</span>
        <div style={{ display: "flex", gap: 8 }}>
          {joined ? (
            <Button variant="soft" onClick={() => onView(group)}>
              <CheckIcon /> Open
            </Button>
          ) : (
            <>
              <Button variant="secondary" onClick={() => onView(group)}>
                View <ArrowIcon />
              </Button>
              <Button onClick={() => onJoin(group)}>Join</Button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

function AuthPanel({ pending, onAuthed, onCancel }) {
  const [mode, setMode] = useState("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const valid = email.includes("@") && password.length >= 6 && (mode === "signin" || name.trim().length > 1);

  async function handleGoogle() {
    setLoading(true);
    setError("");
    setNotice("");
    const { error: googleError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/community` },
    });
    if (googleError) {
      setError(googleError.message);
      setLoading(false);
    }
  }

  async function handleEmail() {
    if (!valid || loading) return;
    setLoading(true);
    setError("");
    setNotice("");

    const result =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { full_name: name.trim() },
              emailRedirectTo: `${window.location.origin}/community`,
            },
          });

    setLoading(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    if (mode === "signup" && !result.data?.session) {
      setNotice("Check your email to confirm your account.");
      return;
    }
    onAuthed();
  }

  return (
    <section style={{ padding: "clamp(28px,6vw,72px) 0", display: "flex", justifyContent: "center" }}>
      <div
        style={{
          width: "min(440px,100%)",
          background: C.card,
          border: `1px solid ${C.line}`,
          borderRadius: 20,
          padding: "clamp(24px,4vw,36px)",
          boxShadow: "0 24px 70px -36px rgba(16,24,40,.35)",
        }}
      >
        <button
          onClick={onCancel}
          style={{
            border: "none",
            background: "transparent",
            color: C.sub,
            font: "inherit",
            fontSize: 14,
            fontWeight: 800,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            cursor: "pointer",
            padding: 0,
            marginBottom: 22,
          }}
        >
          <BackIcon /> Community
        </button>

        <h1 style={{ margin: 0, color: C.text, fontSize: 26, letterSpacing: 0 }}>
          {mode === "signin" ? "Sign in" : "Create account"}
        </h1>
        <p style={{ margin: "8px 0 22px", color: C.sub, fontSize: 14.5, lineHeight: 1.55 }}>
          {pending?.group
            ? `Sign in to ${pending.action === "join" ? "join" : "view"} ${pending.group.name}.`
            : pending?.action === "create"
              ? "Sign in to create a group."
              : pending?.action === "dashboard"
                ? "Sign in to open your community dashboard."
                : "Sign in to continue."}
        </p>

        <Button variant="secondary" onClick={handleGoogle} disabled={loading} style={{ width: "100%", minHeight: 50 }}>
          <GoogleIcon /> Continue with Google
        </Button>

        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
          <span style={{ height: 1, background: C.line, flex: 1 }} />
          <span style={{ fontSize: 12, fontWeight: 800, color: C.muted }}>or use email</span>
          <span style={{ height: 1, background: C.line, flex: 1 }} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", padding: 4, borderRadius: 12, background: "#f2f4f7", marginBottom: 16 }}>
          {[
            ["signin", "Sign in"],
            ["signup", "Join free"],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => {
                setMode(key);
                setError("");
                setNotice("");
              }}
              style={{
                border: "none",
                borderRadius: 9,
                minHeight: 38,
                background: mode === key ? "#fff" : "transparent",
                color: mode === key ? C.text : C.sub,
                boxShadow: mode === key ? "0 1px 4px rgba(16,24,40,.08)" : "none",
                font: "inherit",
                fontSize: 14,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {error && <div style={{ color: C.danger, background: "#fff1f0", border: "1px solid #ffd3cf", borderRadius: 12, padding: 12, fontSize: 13.5, marginBottom: 14 }}>{error}</div>}
        {notice && <div style={{ color: C.green, background: "#ecfdf3", border: "1px solid #abefc6", borderRadius: 12, padding: 12, fontSize: 13.5, marginBottom: 14 }}>{notice}</div>}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {mode === "signup" && <Input value={name} onChange={setName} placeholder="Full name" />}
          <Input value={email} onChange={setEmail} type="email" placeholder="Email address" />
          <Input value={password} onChange={setPassword} type="password" placeholder="Password" onEnter={handleEmail} />
          <Button onClick={handleEmail} disabled={!valid || loading} style={{ width: "100%", minHeight: 48 }}>
            {loading ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"} <ArrowIcon />
          </Button>
        </div>
      </div>
    </section>
  );
}

function Input({ value, onChange, type = "text", placeholder, onEnter }) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter" && onEnter) onEnter();
      }}
      type={type}
      placeholder={placeholder}
      style={{
        height: 50,
        borderRadius: 12,
        border: `1px solid ${C.lineStrong}`,
        padding: "0 14px",
        font: "inherit",
        fontSize: 15,
        outline: "none",
        color: C.text,
        background: "#fff",
      }}
    />
  );
}

function TextArea({ value, onChange, placeholder }) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      rows={4}
      style={{
        borderRadius: 12,
        border: `1px solid ${C.lineStrong}`,
        padding: "13px 14px",
        font: "inherit",
        fontSize: 15,
        outline: "none",
        resize: "vertical",
        color: C.text,
        background: "#fff",
      }}
    />
  );
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeGroup(group) {
  return {
    ...group,
    memberCount: Number(group.memberCount || 0),
    messages: Array.isArray(group.messages) ? group.messages : [],
  };
}

function rowToGroup(row) {
  return normalizeGroup({
    id: row.id,
    name: row.name,
    description: row.description || "",
    type: row.type || "Custom",
    location: row.location || "",
    memberCount: row.member_count || 0,
    createdBy: row.created_by || "",
    messages: [],
  });
}

function mergeGroups(baseGroups, extraGroups) {
  const map = new Map();
  [...baseGroups, ...extraGroups].forEach((group) => {
    if (group?.id) map.set(group.id, normalizeGroup(group));
  });
  return sortGroupsAlphabetically(Array.from(map.values()));
}

function loadStoredGroups() {
  if (typeof window === "undefined") return PRESET_GROUPS;
  try {
    const customGroups = JSON.parse(localStorage.getItem(CUSTOM_GROUPS_KEY) || "[]");
    return mergeGroups(PRESET_GROUPS, Array.isArray(customGroups) ? customGroups : []);
  } catch {
    return PRESET_GROUPS;
  }
}

function loadStoredJoinedIds() {
  if (typeof window === "undefined") return [];
  try {
    const ids = JSON.parse(localStorage.getItem(JOINED_GROUPS_KEY) || "[]");
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
}

function loadStoredIds(key) {
  if (typeof window === "undefined") return [];
  try {
    const ids = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
}

async function persistGroupJoin(groupId, userId) {
  if (!groupId || !userId) return;

  const { error } = await supabase.rpc("join_community_group", { target_group_id: groupId });
  if (error) throw error;
}

async function persistMembershipOnly(groupId, userId) {
  return persistGroupJoin(groupId, userId);
}

function isGroupJoinedByUser(group, joinedIds, user, exitedIds = []) {
  if (group?.id && (exitedIds || []).includes(group.id)) return false;
  return Boolean(group?.id && (joinedIds || []).includes(group.id)) || Boolean(user?.id && group?.createdBy === user.id);
}

function normalizeGroupNameForCompare(value) {
  return slugify(value || "");
}

function groupNameExists(groups, name) {
  const targetName = normalizeGroupNameForCompare(name);
  return Boolean(targetName) && (groups || []).some((group) => normalizeGroupNameForCompare(group?.name || "") === targetName);
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function uniqueEmails(values) {
  return Array.from(new Set((values || []).map(normalizeEmail).filter((email) => email && email.includes("@"))));
}

function parseEmailList(value) {
  if (Array.isArray(value)) return uniqueEmails(value);
  return uniqueEmails(String(value || "").split(/[\s,;]+/));
}

function envCommunityModeratorEmails() {
  return [];
}

function loadLocalModeratorEmails() {
  if (typeof window === "undefined") return [];
  try {
    return parseEmailList(JSON.parse(localStorage.getItem(COMMUNITY_MODERATOR_EMAILS_KEY) || "[]"));
  } catch {
    return [];
  }
}

function saveLocalModeratorEmails(emails) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(COMMUNITY_MODERATOR_EMAILS_KEY, JSON.stringify(uniqueEmails(emails)));
  } catch {}
}

function isCommunityModerator(user, extraEmails = []) {
  if (!user) return false;
  const metadata = user.user_metadata || {};
  const appMetadata = user.app_metadata || {};
  const role = String(metadata.community_role || metadata.role || appMetadata.community_role || appMetadata.role || "").toLowerCase();
  const email = normalizeEmail(user.email);
  const moderatorEmails = uniqueEmails([...envCommunityModeratorEmails(), ...extraEmails]);
  return (
    role === "admin" ||
    role === "moderator" ||
    role === "owner" ||
    metadata.is_admin === true ||
    appMetadata.is_admin === true ||
    metadata.is_community_moderator === true ||
    appMetadata.is_community_moderator === true ||
    moderatorEmails.includes(email)
  );
}

function creatorLabelForGroup(group, user) {
  if (user?.id && group?.createdBy === user.id) return "You";
  if (group?.id?.startsWith("custom-") && group?.createdBy) return "Member";
  return "Moderator";
}

function CreateGroupPage({ onBack, onCreate, groups = [] }) {
  const [type, setType] = useState("School");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const valid = name.trim().length >= 3;

  function submit() {
    if (!valid) return;
    const cleanName = name.trim();
    if (groupNameExists(groups, cleanName)) {
      setError("Group already present. Choose a different name.");
      return;
    }
    setError("");
    onCreate({
      id: `custom-${slugify(cleanName)}-${Date.now()}`,
      name: cleanName,
      description: description.trim() || `${type === "City" ? "City" : "Community"} group for ${cleanName}.`,
      type,
      location: location.trim(),
      memberCount: 0,
      messages: [],
    });
  }

  return (
    <section style={{ padding: "clamp(28px,6vw,72px) 0", display: "flex", justifyContent: "center" }}>
      <div
        style={{
          width: "min(640px,100%)",
          background: C.card,
          border: `1px solid ${C.line}`,
          borderRadius: 20,
          padding: "clamp(24px,4vw,36px)",
          boxShadow: "0 24px 70px -36px rgba(16,24,40,.35)",
        }}
      >
        <button
          onClick={onBack}
          style={{
            border: "none",
            background: "transparent",
            color: C.sub,
            font: "inherit",
            fontSize: 14,
            fontWeight: 800,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            cursor: "pointer",
            padding: 0,
            marginBottom: 22,
          }}
        >
          <BackIcon /> Community
        </button>

        <h1 style={{ margin: 0, color: C.text, fontSize: 28, letterSpacing: 0 }}>Create a group</h1>
        <p style={{ margin: "8px 0 24px", color: C.sub, fontSize: 15, lineHeight: 1.6 }}>
          Add a group for a university, city, or specific student need. The chat starts empty.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 7, color: C.text, fontSize: 13, fontWeight: 900 }}>
            Group type
            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
              style={{
                height: 50,
                borderRadius: 12,
                border: `1px solid ${C.lineStrong}`,
                padding: "0 14px",
                font: "inherit",
                fontSize: 15,
                color: C.text,
                background: "#fff",
              }}
            >
              <option value="School">University</option>
              <option value="City">City</option>
              <option value="Custom">Custom</option>
            </select>
          </label>
          <Input value={name} onChange={setName} placeholder={type === "City" ? "City name" : type === "School" ? "University name" : "Group name"} />
          <Input value={location} onChange={setLocation} placeholder="Location" />
          <TextArea value={description} onChange={setDescription} placeholder="Short group description" />
          {error && <div style={{ color: C.danger, fontSize: 13, fontWeight: 850 }}>{error}</div>}
          <Button onClick={submit} disabled={!valid} style={{ width: "fit-content", minWidth: 150 }}>
            Create group
          </Button>
        </div>
      </div>
    </section>
  );
}

function HintCard({ children, onClose, onClick, accentColor = "linear-gradient(180deg,#4f46e5,#14b8a6)", borderColor = "#cfd8ff", ariaLabel = "" }) {
  return (
    <aside
      aria-label={ariaLabel}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") onClick(); } : undefined}
      style={{
        position: "relative",
        borderRadius: 20,
        border: `1px solid ${borderColor}`,
        background: "linear-gradient(135deg,#f7f8ff 0%,#ffffff 54%,#f0fbf8 100%)",
        boxShadow: "0 30px 78px -48px rgba(34,40,102,.62)",
        backdropFilter: "blur(16px)",
        padding: 17,
        color: C.text,
        cursor: onClick ? "pointer" : "default",
        overflow: "hidden",
      }}
    >
      <span style={{ position: "absolute", inset: "0 auto 0 0", width: 4, background: accentColor }} />
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        title="Close"
        aria-label="Close"
        style={{ position: "absolute", top: 10, right: 10, width: 30, height: 30, borderRadius: 10, border: "1px solid #edf0f6", background: "#fff", color: C.sub, display: "grid", placeItems: "center", cursor: "pointer" }}
      >
        <X size={15} />
      </button>
      {children}
    </aside>
  );
}

function CommunityCreateHint({ visible, onClose, onCreateGroup, workspaceMode, chromeOffset = 0 }) {
  if (!visible) return null;
  return (
    <HintCard onClose={onClose} onClick={onCreateGroup} ariaLabel="Create a community group">
      <div style={{ display: "flex", gap: 13, padding: "2px 28px 2px 4px" }}>
        <span style={{ width: 44, height: 44, borderRadius: 14, background: "#eef2ff", color: "#4f46e5", display: "grid", placeItems: "center", flexShrink: 0, boxShadow: "0 16px 34px -28px rgba(79,70,229,.78)" }}>
          <Users size={20} />
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: "#4f46e5", fontSize: 11, fontWeight: 950, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 5 }}>Community suggestion</div>
          <div style={{ color: C.text, fontSize: 16, fontWeight: 950, lineHeight: 1.22 }}>Can’t find the right group?</div>
          <p style={{ margin: "6px 0 9px", color: C.sub, fontSize: 13.25, lineHeight: 1.48 }}>
            Start one for your university, city, or topic and share the invite link.
          </p>
          <div style={{ color: "#0f766e", fontSize: 13, fontWeight: 950 }}>Create one in under a minute →</div>
        </div>
      </div>
    </HintCard>
  );
}

function FewMembersHint({ visible, onClose, groupId }) {
  if (!visible || !groupId) return null;

  async function copyLink() {
    const link = `${window.location.origin}/community/${encodeURIComponent(groupId)}`;
    try { await navigator.clipboard.writeText(link); } catch { window.prompt("Copy invite link", link); }
  }

  return (
    <HintCard onClose={onClose} accentColor="linear-gradient(180deg,#f59e0b,#10b981)" borderColor="#fde68a" ariaLabel="Not many people in this group yet">
      <div style={{ display: "flex", gap: 13, padding: "2px 28px 2px 4px" }}>
        <span style={{ width: 44, height: 44, borderRadius: 14, background: "#fffbeb", color: "#d97706", display: "grid", placeItems: "center", flexShrink: 0, fontSize: 22 }}>
          👋
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: "#b45309", fontSize: 11, fontWeight: 950, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 5 }}>Grow your group</div>
          <div style={{ color: C.text, fontSize: 15, fontWeight: 950, lineHeight: 1.22 }}>Not many people here yet</div>
          <p style={{ margin: "6px 0 9px", color: C.sub, fontSize: 13.25, lineHeight: 1.48 }}>
            Share the invite link so your classmates can join and start chatting.
          </p>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); copyLink(); }}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#d97706", color: "#fff", border: "none", borderRadius: 9, padding: "6px 13px", fontSize: 12.5, fontWeight: 900, cursor: "pointer" }}
          >
            <Copy size={13} /> Copy invite link
          </button>
        </div>
      </div>
    </HintCard>
  );
}

function MainPage({
  user,
  groups,
  joinedIds,
  exitedIds = [],
  unreadTotal = 0,
  filter = "All",
  onFilterChange,
  onSignIn,
  onSignOut,
  onView,
  onJoin,
  onCreateGroup,
  onDashboard,
  onMessages,
  onOpenSettings,
  chromeOffset = 0,
}) {
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [showCreateHint, setShowCreateHint] = useState(false);
  const [showFewMembersHint, setShowFewMembersHint] = useState(false);
  const workspaceMode = false;
  const effectiveJoinedIds = user ? joinedIds : [];
  const smallJoinedGroup = useMemo(
    () => user ? groups.find((g) => joinedIds.includes(g.id) && Number(g.memberCount || 0) < 5) : null,
    [groups, joinedIds, user?.id]
  );
  const selectedFilter = filter || "All";
  const createdGroupCount = useMemo(() => groups.filter((group) => isGroupCreatedByUser(group, user)).length, [groups, user?.id]);
  const filteredGroups = useMemo(() => {
    const value = query.trim().toLowerCase();
    return sortGroupsAlphabetically(groups.filter((group) => {
      const matchesFilter = selectedFilter === "All" || (selectedFilter === "Created" ? isGroupCreatedByUser(group, user) : groupCategory(group) === selectedFilter);
      const matchesQuery = !value || `${group.name} ${group.description} ${group.location || ""}`.toLowerCase().includes(value);
      return matchesFilter && matchesQuery;
    }));
  }, [groups, query, selectedFilter, user?.id]);

  useEffect(() => {
    try {
      setShowCreateHint(sessionStorage.getItem(CREATE_HINT_DISMISSED_KEY) !== "1");
    } catch {
      setShowCreateHint(true);
    }
  }, []);

  useEffect(() => {
    setShowFewMembersHint(Boolean(smallJoinedGroup));
  }, [smallJoinedGroup?.id]);

  function dismissCreateHint() {
    setShowCreateHint(false);
    try {
      sessionStorage.setItem(CREATE_HINT_DISMISSED_KEY, "1");
    } catch {}
  }

  function createFromHint() {
    dismissCreateHint();
    onCreateGroup();
  }

  function handleFilterClick(nextFilter) {
    onFilterChange?.(nextFilter);
    if (nextFilter === "Created" && !user) {
      onSignIn("created");
    }
  }

  const availableHeight = chromeOffset ? `calc(100vh - ${chromeOffset}px)` : "100vh";

  return (
    <section style={workspaceMode ? { minHeight: availableHeight, background: "#f7f8fb", color: "#181b23", display: "flex" } : { minHeight: availableHeight, padding: 0, background: "#fbfcfe" }}>
      <div style={{ position: "fixed", right: "clamp(16px,3vw,34px)", top: workspaceMode ? 104 : chromeOffset ? chromeOffset + 48 : 118, zIndex: 45, width: "min(340px,calc(100vw - 32px))", display: "flex", flexDirection: "column", gap: 8 }}>
        <FewMembersHint visible={showFewMembersHint} onClose={() => setShowFewMembersHint(false)} groupId={smallJoinedGroup?.id} />
        <CommunityCreateHint visible={showCreateHint} onClose={dismissCreateHint} onCreateGroup={createFromHint} workspaceMode={workspaceMode} chromeOffset={chromeOffset} />
      </div>
      <div
        style={workspaceMode
          ? {
              width: "100%",
              minHeight: availableHeight,
              background: "#fff",
              display: "flex",
              alignItems: "stretch",
            }
          : {
              width: "100%",
              minHeight: availableHeight,
              margin: 0,
              borderRadius: 0,
              overflow: "hidden",
              border: "none",
              background: "#fff",
              boxShadow: "none",
              display: "block",
              alignItems: "stretch",
            }}
      >
        {workspaceMode && (
        <aside style={workspaceMode ? { width: 268, flex: "0 0 268px", minHeight: availableHeight, background: "#fff", borderRight: "1px solid #dfe3eb", display: "flex", flexDirection: "column" } : { width: 292, flex: "0 0 292px", minHeight: 680, background: "#fff", borderRight: `1px solid ${C.line}`, padding: 22, display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={workspaceMode ? { padding: "30px 14px 18px", display: "grid", gap: 22 } : { display: "contents" }}>
          <div style={workspaceMode ? { display: "flex", alignItems: "center", gap: 11, padding: "0 8px" } : { display: "flex", alignItems: "center", gap: 10, color: C.text, fontSize: 20, fontWeight: 950 }}>
            <span style={workspaceMode ? { width: 36, height: 36, borderRadius: 11, background: "#3b46c4", color: "#fff", display: "grid", placeItems: "center", boxShadow: "0 12px 24px -18px rgba(59,70,196,.75)" } : { width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg,#2f8f86,#4f46e5)", color: "#fff", display: "grid", placeItems: "center", boxShadow: "0 14px 28px -20px rgba(79,70,229,.8)" }}>
              <GraduationCap size={18} />
            </span>
            {workspaceMode ? (
              <div>
                <div style={{ fontSize: 15, fontWeight: 950, color: "#181b23", lineHeight: 1.1 }}>YGIU</div>
                <div style={{ fontSize: 12, color: "#69707d", marginTop: 3 }}>Community workspace</div>
              </div>
            ) : (
              "YGIU Community"
            )}
          </div>

          <button onClick={onCreateGroup} style={workspaceMode ? { minHeight: 38, border: "none", borderRadius: 10, background: "#3644bb", color: "#fff", font: "inherit", fontSize: 14, fontWeight: 850, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 9, boxShadow: "0 12px 24px -18px rgba(54,68,187,.7)" } : { minHeight: 46, border: "none", borderRadius: 10, background: "#4f46e5", color: "#fff", font: "inherit", fontSize: 15, fontWeight: 900, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 9, boxShadow: "0 20px 32px -24px rgba(79,70,229,.75)" }}>
            <Plus size={workspaceMode ? 16 : 18} /> {workspaceMode ? "New group" : "Create group"}
          </button>

          <div style={{ display: "grid", gap: workspaceMode ? 4 : 7 }}>
            <div style={workspaceMode ? { color: "#69707d", fontSize: 12, fontWeight: 950, letterSpacing: ".08em", textTransform: "uppercase", padding: "0 0 4px" } : { color: C.sub, fontSize: 12, fontWeight: 900, letterSpacing: ".08em", textTransform: "uppercase", padding: "0 12px" }}>{workspaceMode ? "Workspace" : "Menu"}</div>
            {[
              { label: "Dashboard", icon: Grid2X2, active: false, onClick: onDashboard },
              { label: "Communities", icon: Users, active: true, onClick: () => {} },
              { label: "Messages", icon: MessageCircle, active: false, onClick: onMessages, badge: unreadTotal ? String(unreadTotal) : "" },
              { label: "Student guide", icon: BookOpen, active: false, onClick: () => (window.location.href = "/guide") },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  style={{
                    minHeight: workspaceMode ? 36 : 46,
                    border: "none",
                    borderRadius: workspaceMode ? 9 : 12,
                    background: item.active ? (workspaceMode ? "#e9eefc" : "#f0f1f5") : "transparent",
                    color: item.active ? (workspaceMode ? "#3644bb" : "#4f46e5") : (workspaceMode ? "#565d68" : "#4b5563"),
                    font: "inherit",
                    fontSize: workspaceMode ? 14 : 15,
                    fontWeight: item.active ? 900 : 750,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: workspaceMode ? "0 10px" : "0 12px",
                    textAlign: "left",
                  }}
                >
                  <Icon size={workspaceMode ? 17 : 18} /> <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge ? <span style={{ minWidth: workspaceMode ? 20 : 22, height: workspaceMode ? 20 : 22, borderRadius: 999, background: workspaceMode ? "#dfe3ff" : "#ef4444", color: workspaceMode ? "#4f46e5" : "#fff", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 950 }}>{item.badge}</span> : null}
                </button>
              );
            })}
          </div>

          </div>

          {!workspaceMode && (
            <div style={{ marginTop: "auto", borderRadius: 18, border: "1px solid #dbe4ff", background: "linear-gradient(180deg,#f7f7ff 0%,#eef7f5 100%)", padding: 18, textAlign: "center" }}>
            <div style={{ width: 54, height: 54, borderRadius: 18, background: "#fff", margin: "0 auto 12px", display: "grid", placeItems: "center", color: "#4f46e5", boxShadow: "0 16px 34px -28px rgba(15,23,42,.6)" }}>
              <Users size={25} />
            </div>
            <div style={{ color: C.text, fontSize: 15, fontWeight: 950 }}>Your student network</div>
            <p style={{ margin: "8px 0 14px", color: C.sub, fontSize: 13, lineHeight: 1.45 }}>{effectiveJoinedIds.length} joined groups ready in your dashboard.</p>
            <button onClick={user ? onDashboard : onSignIn} style={{ width: "100%", minHeight: 40, borderRadius: 10, border: "1px solid #4f46e5", background: "transparent", color: "#4f46e5", font: "inherit", fontSize: 14, fontWeight: 900, cursor: "pointer" }}>
              {user ? "View dashboard" : "Sign in"}
            </button>
          </div>
          )}

          {user ? (
            <div style={workspaceMode ? { marginTop: "auto", borderTop: "1px solid #dfe3eb", padding: 14 } : undefined}>
              <WorkspaceProfileButton user={user} onSettings={onOpenSettings} onSignOut={onSignOut} variant="footer" />
            </div>
          ) : null}
        </aside>
        )}

        <main style={workspaceMode ? { flex: 1, minWidth: 0, minHeight: availableHeight, background: "#f7f8fb" } : { width: "100%", minWidth: 0, background: "#fbfcfe" }}>
          <div style={workspaceMode ? { height: 80, padding: "0 28px", borderBottom: "1px solid #dfe3eb", background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 } : { minHeight: 86, padding: "0 clamp(18px,3vw,28px)", borderBottom: `1px solid ${C.line}`, background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, flexWrap: "wrap" }}>
            <div>
              {workspaceMode && <div style={{ color: "#69707d", fontSize: 12, marginBottom: 4 }}>Workspace</div>}
              <h1 style={{ margin: 0, color: workspaceMode ? "#181b23" : C.text, fontSize: workspaceMode ? 21 : 22, lineHeight: 1, fontWeight: workspaceMode ? 950 : undefined, letterSpacing: 0 }}>Communities</h1>
              {!workspaceMode && <p style={{ margin: "5px 0 0", color: C.sub, fontSize: 13.5 }}>Browse universities and cities. Login is required only when you view or join.</p>}
            </div>
            {workspaceMode ? (
              <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                <label style={{ width: "min(360px,30vw)", height: 38, borderRadius: 11, border: "1px solid #dfe3eb", background: "#f8fafc", display: "flex", alignItems: "center", gap: 10, padding: "0 12px", color: "#69707d" }}>
                  <Search size={16} />
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search..." style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", color: C.text, font: "inherit", fontSize: 14 }} />
                  <span style={{ borderRadius: 6, border: "1px solid #dfe3eb", background: "#fff", padding: "2px 5px", fontSize: 11, color: "#69707d" }}>⌘K</span>
                </label>
                <span style={{ position: "relative", width: 34, height: 34, display: "grid", placeItems: "center", color: "#181b23" }}>
                  <Bell size={19} />
                  {unreadTotal > 0 && (
                    <span style={{ position: "absolute", right: 6, top: 7, width: 7, height: 7, borderRadius: 999, background: "#dc2626" }} />
                  )}
                </span>
                <WorkspaceProfileButton user={user} onSettings={onOpenSettings} onSignOut={onSignOut} />
              </div>
            ) : (
              <label style={{ width: "min(420px,100%)", minHeight: 50, borderRadius: 10, background: "#f0f2f6", display: "flex", alignItems: "center", gap: 12, padding: "0 14px", color: "#312e81" }}>
                <Search size={18} />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search groups, cities, universities" style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", color: C.text, font: "inherit", fontSize: 14 }} />
              </label>
            )}
          </div>

          <div style={workspaceMode ? { padding: "38px 36px", display: "grid", gap: 22 } : { padding: "clamp(18px,3vw,28px)", display: "grid", gap: 22 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {[
                  ["All", `All (${groups.length})`],
                  ["School", "Universities"],
                  ["City", "Cities"],
                  ["Created", user ? `Created (${createdGroupCount})` : "Created"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => handleFilterClick(key)}
                    style={{
                      minHeight: 42,
                      borderRadius: 999,
                      border: `1px solid ${selectedFilter === key ? "#ede9fe" : C.line}`,
                      background: selectedFilter === key ? "#fff" : "#fff",
                      color: selectedFilter === key ? "#6d28d9" : C.sub,
                      padding: "0 17px",
                      boxShadow: selectedFilter === key ? "0 12px 28px -24px rgba(109,40,217,.8)" : "0 10px 24px -24px rgba(15,23,42,.4)",
                      font: "inherit",
                      fontSize: 14,
                      fontWeight: 900,
                      cursor: "pointer",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 9, borderRadius: 999, background: "#eef1f7", padding: 6 }}>
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  title="Box view"
                  aria-label="Box view"
                  style={{ width: 36, height: 36, border: "none", borderRadius: 999, background: viewMode === "grid" ? "#fff" : "transparent", color: viewMode === "grid" ? "#312e81" : C.sub, display: "grid", placeItems: "center", cursor: "pointer", boxShadow: viewMode === "grid" ? "0 10px 24px -20px rgba(15,23,42,.6)" : "none" }}
                >
                  <Grid2X2 size={17} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  title="List view"
                  aria-label="List view"
                  style={{ width: 36, height: 36, border: "none", borderRadius: 999, background: viewMode === "list" ? "#fff" : "transparent", color: viewMode === "list" ? "#312e81" : C.sub, display: "grid", placeItems: "center", cursor: "pointer", boxShadow: viewMode === "list" ? "0 10px 24px -20px rgba(15,23,42,.6)" : "none" }}
                >
                  <List size={18} />
                </button>
              </div>
            </div>

            {groups.length === 0 ? (
              <EmptyState title="No community groups are live right now" message="Create the first group for your university or city." />
            ) : (
              <section style={{ display: "grid", gridTemplateColumns: viewMode === "grid" ? "repeat(auto-fill,minmax(min(300px,100%),1fr))" : "1fr", gap: viewMode === "grid" ? 22 : 12 }}>
                {filteredGroups.map((group, index) => {
                  const joined = isGroupJoinedByUser(group, effectiveJoinedIds, user, exitedIds);
                  const tone = toneForGroup(group, index);
                  const creator = creatorLabelForGroup(group, user);
                  return (
                    <article
                      key={group.id}
                      onClick={() => onView(group)}
                      style={{
                        minHeight: viewMode === "grid" ? 214 : 0,
                        borderRadius: 17,
                        border: `1.5px solid ${joined ? tone.text : C.line}`,
                        background: joined ? tone.bg : "#fff",
                        padding: viewMode === "grid" ? 19 : "15px 17px",
                        display: "flex",
                        flexDirection: viewMode === "grid" ? "column" : "row",
                        alignItems: viewMode === "grid" ? "stretch" : "center",
                        gap: viewMode === "grid" ? 16 : 15,
                        boxShadow: joined ? "0 18px 46px -34px rgba(79,70,229,.65)" : "0 18px 48px -38px rgba(15,23,42,.28)",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexShrink: 0 }}>
                        <GroupGlyph group={group} tone={tone} size={52} />
                        {viewMode === "grid" && <span style={{ height: 32, padding: "0 12px", borderRadius: 999, border: `1px solid ${joined ? tone.text : C.line}`, color: joined ? tone.text : C.sub, background: "#fff", display: "inline-flex", alignItems: "center", fontSize: 13, fontWeight: 900 }}>
                          {groupTypeLabel(group)}
                        </span>}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <h3 style={{ margin: 0, fontSize: 19, lineHeight: 1.25, letterSpacing: 0 }}>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onView(group);
                            }}
                            style={{ border: "none", background: "transparent", color: C.text, textDecoration: "none", padding: 0, font: "inherit", fontWeight: "inherit", cursor: "pointer", textAlign: "left" }}
                          >
                            {group.name}
                          </button>
                        </h3>
                        <p style={{ margin: viewMode === "grid" ? "10px 0 0" : "5px 0 0", color: C.sub, fontSize: 14.5, lineHeight: 1.5, overflow: viewMode === "list" ? "hidden" : "visible", textOverflow: "ellipsis", whiteSpace: viewMode === "list" ? "nowrap" : "normal" }}>{group.description}</p>
                        <div style={{ marginTop: 10, color: C.muted, fontSize: 12.5, fontWeight: 850 }}>Created by {creator}</div>
                      </div>
                      <div style={{ marginTop: viewMode === "grid" ? "auto" : 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexShrink: 0, flexWrap: "wrap" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, color: C.sub, fontSize: 13.5, fontWeight: 850 }}>
                          <Users size={16} /> {Number(group.memberCount || 0) || (joined ? 1 : 0)} members
                        </span>
                        {viewMode === "list" && <span style={{ height: 30, padding: "0 10px", borderRadius: 999, border: `1px solid ${joined ? tone.text : C.line}`, color: joined ? tone.text : C.sub, background: "#fff", display: "inline-flex", alignItems: "center", fontSize: 12.5, fontWeight: 900 }}>
                          {groupTypeLabel(group)}
                        </span>}
                        <div style={{ display: "flex", gap: 8 }}>
                          {joined ? (
                            <Button variant="soft" onClick={(event) => { event?.stopPropagation?.(); onView(group); }}><CheckIcon /> Open</Button>
                          ) : (
                            <>
                              <Button variant="secondary" onClick={(event) => { event?.stopPropagation?.(); onView(group); }}>View <ArrowIcon /></Button>
                              <Button onClick={(event) => { event?.stopPropagation?.(); onJoin(group); }}>Join</Button>
                            </>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
                {filteredGroups.length === 0 && (
                  <div style={{ gridColumn: "1 / -1" }}>
                    <EmptyState
                      title={selectedFilter === "Created" ? (user ? "No groups created yet" : "Login required") : undefined}
                      message={selectedFilter === "Created" ? (user ? "Groups you create will appear here." : "Login to see groups you created.") : undefined}
                    />
                  </div>
                )}
              </section>
            )}
          </div>
        </main>
      </div>
    </section>
  );
}

function DashboardStat({ label, value, helper, icon: Icon, trend }) {
  return (
    <div
      style={{
        background: C.card,
        border: "1px solid #eaecf3",
        borderRadius: 18,
        padding: "22px 22px",
        minHeight: 142,
        boxShadow: "0 18px 44px -36px rgba(15,23,42,.42)",
        display: "grid",
        alignContent: "space-between",
        gap: 18,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "flex-start" }}>
        <div style={{ color: "#5a6072", fontSize: 13, fontWeight: 850 }}>{label}</div>
        {Icon && (
          <span style={{ width: 34, height: 34, borderRadius: 11, background: "#f5f6fb", color: "#5a6072", display: "grid", placeItems: "center" }}>
            <Icon size={17} />
          </span>
        )}
      </div>
      <div>
        <div style={{ color: "#1a1d29", fontSize: 34, lineHeight: 1, fontWeight: 950, letterSpacing: "-.02em" }}>{value}</div>
        <div style={{ color: trend ? "#157f4b" : "#5a6072", fontSize: 13, fontWeight: 800, marginTop: 13 }}>{helper}</div>
      </div>
    </div>
  );
}

function DashboardGroupCard({ group, onOpen, index = 0 }) {
  const tone = toneForGroup(group, index);
  const displayedMemberCount = Number(group.memberCount || 0) || 1;

  return (
    <article
      style={{
        minHeight: 80,
        background: "#fff",
        borderTop: index === 0 ? "none" : "1px solid #eaecf3",
        padding: "18px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 18,
      }}
    >
      <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 12 }}>
        <GroupGlyph group={group} tone={tone} size={44} />
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
            <h3 style={{ margin: 0, color: "#1a1d29", fontSize: 15.5, fontWeight: 950, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{group.name}</h3>
            <span style={{ borderRadius: 999, padding: "4px 8px", background: "#e7f6ee", color: "#157f4b", fontSize: 11, fontWeight: 950 }}>Joined</span>
          </div>
          <p style={{ margin: "7px 0 0", color: "#5a6072", fontSize: 13, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><MapPin size={13} /> {group.location || "United States"}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Users size={13} /> {displayedMemberCount.toLocaleString()}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><CalendarDays size={13} /> {groupTypeLabel(group)}</span>
          </p>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
        <button onClick={() => onOpen(group)} style={{ minHeight: 36, borderRadius: 10, border: "1px solid #eaecf3", background: "#fff", color: "#1a1d29", font: "inherit", fontSize: 13, fontWeight: 850, padding: "0 16px", cursor: "pointer" }}>
          Open
        </button>
      </div>
    </article>
  );
}

function DashboardPage({ user, groups, joinedIds, unreadTotal = 0, onBrowse, onCreateGroup, onOpenGroup, onMessages, onSignOut, onOpenSettings }) {
  const joinedGroups = groups.filter((group) => joinedIds.includes(group.id));
  const createdGroups = groups.filter((group) => group.createdBy === user?.id || (!group.createdBy && group.id?.startsWith("custom-")));
  const displayGroups = joinedGroups;
  const sidebarJoinedGroups = displayGroups.slice(0, 5);
  const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || "Member";
  const firstName = userName.split(" ")[0] || "Member";
  const unreadCount = unreadTotal;
  const metadata = user?.user_metadata || {};
  const hasCompletedProfile = Boolean(
    (metadata.full_name || metadata.name || "").trim() &&
      (metadata.university || "").trim() &&
      (metadata.city || "").trim()
  );

  return (
    <section style={{ height: "calc(100vh - 70px)", minHeight: 0, background: "#eef0f6", color: "#1a1d29", display: "flex", overflow: "hidden" }}>
      <aside style={{ width: 264, flex: "0 0 264px", height: "100%", minHeight: 0, background: "#fff", borderRight: "1px solid #eaecf3", display: "flex", flexDirection: "column", padding: "16px 12px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "8px 9px", borderRadius: 12, border: "1px solid #eaecf3", marginBottom: 16 }}>
          <span style={{ width: 38, height: 38, borderRadius: 11, background: "linear-gradient(150deg,#4f46e5,#7c73f0)", color: "#fff", display: "grid", placeItems: "center", boxShadow: "0 4px 12px rgba(79,70,229,.28)", flexShrink: 0 }}>
            <GraduationCap size={21} />
          </span>
          <span style={{ minWidth: 0, flex: 1 }}>
            <span style={{ display: "block", color: "#1a1d29", fontSize: 14.5, fontWeight: 850, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>yourguideinusa</span>
            <span style={{ display: "block", color: "#8a90a2", fontSize: 12, marginTop: 2 }}>Community workspace</span>
          </span>
          <ChevronDown size={15} color="#aeb3c2" />
        </div>

        <button onClick={onCreateGroup} style={{ minHeight: 42, border: "none", borderRadius: 11, background: "#4f46e5", color: "#fff", font: "inherit", fontSize: 14, fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 9, boxShadow: "0 10px 24px -18px rgba(79,70,229,.75)", marginBottom: 22 }}>
          <Plus size={17} /> New group
        </button>

        <div style={{ display: "grid", gap: 5, marginBottom: 20 }}>
          <div style={{ color: "#8a90a2", fontSize: 11, fontWeight: 900, letterSpacing: ".08em", textTransform: "uppercase", padding: "0 6px 5px" }}>Workspace</div>
          {[
            { label: "Dashboard", icon: Grid2X2, active: true, onClick: () => {}, badge: "" },
            { label: "Communities", icon: Users, active: false, onClick: onBrowse, badge: "" },
            { label: "Messages", icon: MessageCircle, active: false, onClick: onMessages, badge: unreadCount ? String(unreadCount) : "" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={item.onClick}
                style={{
                  minHeight: 40,
                  border: "none",
                  borderRadius: 10,
                  background: item.active ? "#f0f1ff" : "transparent",
                  color: item.active ? "#4f46e5" : "#5a6072",
                  font: "inherit",
                  fontSize: 14,
                  fontWeight: item.active ? 850 : 650,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  padding: "0 10px",
                  textAlign: "left",
                  position: "relative",
                }}
              >
                {item.active && <span style={{ position: "absolute", left: -12, top: "50%", transform: "translateY(-50%)", width: 3, height: 20, borderRadius: 99, background: "#4f46e5" }} />}
                <Icon size={17} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge ? <span style={{ minWidth: 20, height: 20, borderRadius: 999, background: "#eef0ff", color: "#4f46e5", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 950 }}>{item.badge}</span> : null}
              </button>
            );
          })}
        </div>

        <div style={{ display: "grid", gap: 6, minHeight: 0, overflowY: "auto" }}>
          <div style={{ color: "#8a90a2", fontSize: 11, fontWeight: 900, letterSpacing: ".08em", textTransform: "uppercase", padding: "0 6px 5px" }}>Joined · {displayGroups.length}</div>
          {sidebarJoinedGroups.length ? (
            sidebarJoinedGroups.map((group, index) => {
              const tone = toneForGroup(group, index);
              return (
                <button key={group.id} onClick={() => onOpenGroup(group)} style={{ width: "100%", minHeight: 48, border: "none", background: "transparent", borderRadius: 10, padding: "7px 6px 7px 10px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", textAlign: "left", font: "inherit" }}>
                  <GroupGlyph group={group} tone={tone} size={30} />
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ display: "block", color: "#1a1d29", fontSize: 13.5, fontWeight: 750, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{group.name}</span>
                    <span style={{ display: "block", color: "#8a90a2", fontSize: 11.5, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{group.location || groupTypeLabel(group)}</span>
                  </span>
                </button>
              );
            })
          ) : (
            <div style={{ color: "#8a90a2", fontSize: 13, lineHeight: 1.5, padding: "6px 8px" }}>Joined groups will appear here.</div>
          )}
        </div>

        <div style={{ marginTop: "auto", borderTop: "1px solid #eaecf3", paddingTop: 10 }}>
          <WorkspaceProfileButton user={user} onSettings={onOpenSettings} onSignOut={onSignOut} variant="footer" />
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0, height: "100%", minHeight: 0, background: "#eef0f6", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <header style={{ height: 72, flex: "0 0 72px", borderBottom: "1px solid #eaecf3", background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, padding: "0 28px" }}>
          <div>
            <div style={{ color: "#8a90a2", fontSize: 12, marginBottom: 4 }}>Overview</div>
            <h1 style={{ margin: 0, color: "#1a1d29", fontSize: 22, lineHeight: 1, fontWeight: 900, letterSpacing: 0 }}>Dashboard</h1>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={onBrowse} style={{ minHeight: 38, borderRadius: 10, border: "1px solid #eaecf3", background: "#fff", color: "#1a1d29", font: "inherit", fontSize: 13, fontWeight: 850, padding: "0 14px", cursor: "pointer" }}>Find groups</button>
            <span style={{ position: "relative", width: 36, height: 36, borderRadius: 10, display: "grid", placeItems: "center", color: "#5a6072", background: "#f5f6fb" }}>
              <Bell size={18} />
              {unreadCount > 0 && (
                <span style={{ position: "absolute", right: 8, top: 8, width: 7, height: 7, borderRadius: 999, background: "#dc2626" }} />
              )}
            </span>
          </div>
        </header>

        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "34px clamp(24px,3vw,40px)", display: "grid", gap: 26 }}>
          <section style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
            <div>
              <h2 style={{ margin: 0, color: "#1a1d29", fontSize: 28, lineHeight: 1.12, letterSpacing: "-.02em", fontWeight: 950 }}>Welcome back, {firstName}</h2>
              <p style={{ margin: "10px 0 0", color: "#5a6072", fontSize: 15 }}>Your community groups, messages, and created rooms stay together here.</p>
            </div>
            <button onClick={onMessages} style={{ minHeight: 38, borderRadius: 10, border: "none", background: "#4f46e5", color: "#fff", font: "inherit", fontSize: 13, fontWeight: 850, padding: "0 15px", cursor: "pointer", boxShadow: "0 12px 24px -18px rgba(79,70,229,.75)" }}>Open inbox</button>
          </section>

          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 16 }}>
            <DashboardStat label="Joined groups" value={joinedGroups.length} helper={joinedGroups.length ? "Current total" : "No joined groups"} icon={Users} />
            <DashboardStat label="Created groups" value={createdGroups.length} helper="Current total" icon={GraduationCap} />
            <DashboardStat label="Available groups" value={groups.length} helper="Total groups" icon={Grid2X2} />
            <DashboardStat label="Unread messages" value={unreadCount} helper={unreadCount ? "Needs attention" : "No unread messages"} icon={MessageCircle} trend={unreadCount > 0} />
          </section>

          <section style={{ display: "grid", gridTemplateColumns: "minmax(0,2fr) minmax(320px,.9fr)", gap: 22, alignItems: "start" }}>
            <div style={{ display: "grid", gap: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 18 }}>
                <div>
                  <h3 style={{ margin: 0, color: "#1a1d29", fontSize: 17, fontWeight: 950 }}>Your groups</h3>
                  <p style={{ margin: "4px 0 0", color: "#5a6072", fontSize: 13.5 }}>Groups you joined and can open right away.</p>
                </div>
                <button onClick={onBrowse} style={{ border: "none", background: "transparent", color: "#4f46e5", font: "inherit", fontSize: 13, fontWeight: 900, cursor: "pointer" }}>Browse groups -&gt;</button>
              </div>

              <div style={{ border: "1px solid #eaecf3", borderRadius: 18, background: "#fff", overflow: "hidden", boxShadow: "0 18px 44px -36px rgba(15,23,42,.42)" }}>
                {displayGroups.length ? (
                  displayGroups.map((group, index) => <DashboardGroupCard key={group.id} group={group} index={index} onOpen={onOpenGroup} />)
                ) : (
                  <div style={{ padding: 28 }}>
                    <EmptyState title="No joined groups yet" message="Join a university or city group to see it here." />
                  </div>
                )}
              </div>

              {!hasCompletedProfile && (
                <div style={{ minHeight: 76, borderRadius: 16, border: "1px dashed #d7daf4", background: "#f7f8ff", padding: "15px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
                    <span style={{ width: 38, height: 38, borderRadius: 12, background: "#eef0ff", color: "#4f46e5", display: "grid", placeItems: "center" }}><CheckIcon /></span>
                    <div>
                      <div style={{ color: "#1a1d29", fontSize: 14, fontWeight: 950 }}>Complete your profile</div>
                      <div style={{ color: "#5a6072", fontSize: 13.5, marginTop: 3 }}>Add your name, university, and city so members can recognize you.</div>
                    </div>
                  </div>
                  <button onClick={onOpenSettings} style={{ minHeight: 34, borderRadius: 10, border: "none", background: "#1a1d29", color: "#fff", font: "inherit", fontSize: 13, fontWeight: 850, padding: "0 16px", cursor: "pointer" }}>Continue</button>
                </div>
              )}
            </div>

            <div style={{ display: "grid", gap: 16 }}>
              <div>
                <h3 style={{ margin: 0, color: "#1a1d29", fontSize: 17, fontWeight: 950 }}>Activity</h3>
                <p style={{ margin: "4px 0 0", color: "#5a6072", fontSize: 13.5 }}>Recent updates across your groups.</p>
              </div>

              <div style={{ border: "1px solid #eaecf3", borderRadius: 18, background: "#fff", padding: "22px 18px", boxShadow: "0 18px 44px -36px rgba(15,23,42,.42)" }}>
                <div style={{ padding: "8px 4px", color: "#5a6072", fontSize: 13.5, lineHeight: 1.55 }}>
                  <strong style={{ display: "block", color: "#1a1d29", fontSize: 14, marginBottom: 5 }}>No activity yet</strong>
                  Real joins and chat updates will appear here after members start using your groups.
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </section>
  );
}

function ChatGroupRow({ group, selected, onClick, unread = 0, muted = false }) {
  const tone = toneForGroup(group);
  return (
    <button
      onClick={onClick}
      style={{
        width: "calc(100% - 36px)",
        margin: "4px 18px",
        border: `1px solid ${selected ? "#c7d2fe" : "transparent"}`,
        borderRadius: 16,
        background: selected ? "linear-gradient(135deg,#eef2ff 0%,#ffffff 82%)" : "transparent",
        padding: "13px 14px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        textAlign: "left",
        cursor: "pointer",
        font: "inherit",
        position: "relative",
        boxShadow: selected ? "0 18px 46px -32px rgba(79,70,229,.72)" : "none",
      }}
    >
      {selected && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            left: -1,
            top: 14,
            bottom: 14,
            width: 4,
            borderRadius: 999,
            background: "#4f46e5",
          }}
        />
      )}
      <GroupGlyph group={group} tone={tone} size={46} />
      <span style={{ minWidth: 0, flex: 1 }}>
        <span style={{ display: "block", color: selected ? "#312e81" : C.text, fontSize: 15, fontWeight: 950, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {group.name}
        </span>
        <span style={{ display: "block", color: selected ? "#667085" : C.muted, fontSize: 13, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {group.location || groupTypeLabel(group)}
        </span>
      </span>
      {muted && <span style={{ color: C.muted, fontSize: 11, fontWeight: 900, flexShrink: 0 }}>Muted</span>}
      {unread > 0 ? (
        <span style={{ minWidth: 22, height: 22, borderRadius: 999, background: "#ef4444", color: "#fff", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 950, flexShrink: 0 }}>
          {unread > 9 ? "9+" : unread}
        </span>
      ) : selected ? (
        <span style={{ height: 24, borderRadius: 999, background: "#e0e7ff", color: "#4f46e5", display: "inline-flex", alignItems: "center", padding: "0 8px", fontSize: 11, fontWeight: 950, flexShrink: 0 }}>
          Open
        </span>
      ) : null}
    </button>
  );
}

function messageFromRow(item) {
  return {
    id: item.id,
    authorId: item.author_id || "",
    author: item.author_name,
    body: item.body || "",
    createdAt: item.created_at,
    messageType: item.message_type || "text",
    mediaUrl: item.media_url || "",
    mediaPath: item.media_path || "",
    fileName: item.file_name || "",
    mimeType: item.mime_type || "",
  };
}

function memberFromRow(item) {
  return {
    groupId: item.group_id || "",
    userId: item.user_id || "",
    joinedAt: item.joined_at || "",
    role: item.role === "admin" ? "admin" : "member",
    displayName: item.display_name || "Member",
    avatarUrl: item.avatar_url || "",
  };
}

function memberFromUser(user, group) {
  const metadata = user?.user_metadata || {};
  const displayName = metadata.full_name || metadata.name || user?.email || "Member";
  return {
    groupId: group?.id || "",
    userId: user?.id || "",
    joinedAt: "",
    role: group?.createdBy && group.createdBy === user?.id ? "admin" : "member",
    displayName,
    avatarUrl: metadata.avatar_url || metadata.picture || "",
  };
}

function memberLabel(member) {
  return member?.displayName || "Member";
}

function MemberAvatar({ member, size = 40 }) {
  const label = memberLabel(member);
  const initials = label
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "M";

  return (
    <span style={{ width: size, height: size, borderRadius: 999, background: "#eef7f5", color: "#0f766e", display: "grid", placeItems: "center", fontSize: Math.max(11, Math.round(size * 0.34)), fontWeight: 950, flexShrink: 0, overflow: "hidden", border: "1px solid #d5ebe7" }}>
      {member?.avatarUrl ? <img src={member.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
    </span>
  );
}

function isMissingMediaPathError(error) {
  const text = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`;
  return text.includes("media_path") && text.toLowerCase().includes("schema cache");
}

function fileExtension(file) {
  const fromName = file?.name?.split(".").pop();
  if (fromName) return fromName.toLowerCase();
  if (file?.type?.includes("png")) return "png";
  if (file?.type?.includes("jpeg")) return "jpg";
  if (file?.type?.includes("webp")) return "webp";
  return "file";
}

async function signedCommunityMediaUrl(path) {
  if (!path) return "";
  const { data, error } = await supabase.storage
    .from(COMMUNITY_MEDIA_BUCKET)
    .createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data?.signedUrl || "";
}

async function messagesFromRows(rows) {
  return Promise.all(
    rows.map(async (row) => {
      const message = messageFromRow(row);
      if (message.mediaPath) {
        try {
          message.mediaUrl = await signedCommunityMediaUrl(message.mediaPath);
        } catch {
          message.mediaUrl = "";
        }
      }
      return message;
    })
  );
}

async function uploadChatMedia({ file, groupId, userId }) {
  const extension = fileExtension(file);
  const path = `${groupId}/${userId || "member"}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(COMMUNITY_MEDIA_BUCKET).upload(path, file, {
    cacheControl: "3600",
    contentType: (file.type || "application/octet-stream").split(";")[0],
    upsert: false,
  });
  if (error) throw error;
  const signedUrl = await signedCommunityMediaUrl(path);
  return { path, signedUrl };
}

function ChatIconButton({ children, onClick, disabled = false, active = false, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      style={{
        width: 38,
        height: 38,
        borderRadius: 12,
        border: `1px solid ${active ? "rgba(79,111,246,.28)" : C.lineStrong}`,
        background: active ? C.brandSoft : "#fff",
        color: active ? C.brand : C.sub,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

function MessageBubble({ item, isMine, isAuthorAdmin = false, canDelete = false, onDelete, onEdit }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const isImage = item.messageType === "image";
  const createdAt = item.createdAt ? new Date(item.createdAt).getTime() : 0;
  const canEdit = isMine && item.messageType === "text" && !item.uploading && createdAt && Date.now() - createdAt <= 3 * 60 * 1000;
  const showMenu = !item.uploading && (canEdit || canDelete);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setMenuOpen(false);
      }}
      style={{ maxWidth: isImage ? 420 : 560, alignSelf: isMine ? "flex-end" : "flex-start", position: "relative", paddingRight: showMenu ? 34 : 0 }}
    >
      <div style={{ color: C.sub, fontSize: 12.5, fontWeight: 800, margin: isMine ? "0 8px 6px 0" : "0 0 6px 8px", textAlign: isMine ? "right" : "left", display: "flex", gap: 6, justifyContent: isMine ? "flex-end" : "flex-start", alignItems: "center" }}>
        <span>{isMine ? "You" : item.author}</span>
        {isAuthorAdmin && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, borderRadius: 999, background: "#eef2ff", color: "#4f46e5", padding: "2px 6px", fontSize: 10.5, fontWeight: 950 }}>
            <ShieldCheck size={11} /> Admin
          </span>
        )}
      </div>
      {showMenu && (
        <div style={{ position: "absolute", right: 0, top: 21, zIndex: 8 }}>
          <button
            onClick={() => setMenuOpen((value) => !value)}
            title="Message options"
            aria-label="Message options"
            style={{
              width: 28,
              height: 28,
              borderRadius: 999,
              border: `1px solid ${C.lineStrong}`,
              background: "#fff",
              color: C.sub,
              display: hovered || menuOpen ? "grid" : "none",
              placeItems: "center",
              cursor: "pointer",
              boxShadow: "0 12px 24px -18px rgba(15,23,42,.6)",
            }}
          >
            <MoreVertical size={14} />
          </button>
          {menuOpen && (
            <div style={{ position: "absolute", right: 0, top: 34, minWidth: 132, borderRadius: 12, border: `1px solid ${C.line}`, background: "#fff", boxShadow: "0 18px 44px -24px rgba(15,23,42,.45)", padding: 6 }}>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit(item);
                  }}
                  style={{ width: "100%", minHeight: 34, border: "none", borderRadius: 8, background: "transparent", color: C.text, font: "inherit", fontSize: 13, fontWeight: 850, cursor: "pointer", textAlign: "left", padding: "0 9px" }}
                >
                  Edit
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete(item);
                  }}
                  style={{ width: "100%", minHeight: 34, border: "none", borderRadius: 8, background: "transparent", color: C.danger, font: "inherit", fontSize: 13, fontWeight: 850, cursor: "pointer", textAlign: "left", padding: "0 9px" }}
                >
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      )}
      <div
        style={{
          background: isMine ? "#fff3e4" : "#f4f5f9",
          color: C.text,
          border: `1px solid ${isMine ? "#ffead0" : C.line}`,
          borderRadius: 16,
          borderTopRightRadius: isMine ? 5 : 16,
          borderTopLeftRadius: isMine ? 16 : 5,
          padding: isImage ? 6 : "11px 14px",
          fontSize: 14.5,
          lineHeight: 1.5,
          display: "grid",
          gap: item.body && isImage ? 8 : 0,
        }}
      >
        {isImage && item.mediaUrl && (
          <img
            src={item.mediaUrl}
            alt={item.fileName || "Shared photo"}
            style={{
              display: "block",
              width: "100%",
              maxHeight: 360,
              objectFit: "cover",
              borderRadius: 12,
              background: "#e9edf5",
            }}
          />
        )}

        {item.body ? <div style={{ padding: isImage ? "2px 6px 5px" : 0 }}>{item.body}</div> : null}
        {item.uploading ? <div style={{ fontSize: 12.5, opacity: 0.82, padding: isImage ? "0 6px 4px" : "4px 0 0" }}>Sending...</div> : null}
        {item.error ? <div style={{ color: C.danger, fontSize: 12.5, fontWeight: 800, padding: isImage ? "0 6px 4px" : "4px 0 0" }}>{item.error}</div> : null}
      </div>
    </div>
  );
}

function ChatPage({ groups, group, joined, joinedIds, user, onBack, onJoin, onSelectGroup, isMuted, onToggleMute, onExitGroup, onDashboard, onBrowse, onCreateGroup, onOpenSettings, onSignOut, unreadTotal = 0, unreadByGroup = {}, mutedIds = [] }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState(group.messages || []);
  const [width, setWidth] = useState(typeof window === "undefined" ? 1280 : window.innerWidth);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState("");
  const [groupMenuOpen, setGroupMenuOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [clearedAt, setClearedAt] = useState(0);
  const [members, setMembers] = useState([]);
  const [memberActionId, setMemberActionId] = useState("");
  const [inviteStatus, setInviteStatus] = useState("");
  const [fewMembersBannerDismissed, setFewMembersBannerDismissed] = useState(false);
  const fileInputRef = useRef(null);
  const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || "Member";
  const joinedGroups = groups.filter((item) => joinedIds.includes(item.id));
  const clearMessagesStorageKey = `${user?.id || "guest"}:${group.id}`;
  const showRail = width >= 760;
  const showWorkspaceNav = width >= 980;
  const showInfo = detailsOpen && width >= 1120;
  const visibleUnreadTotal = unreadTotal || Object.values(unreadByGroup).reduce((sum, value) => sum + Number(value || 0), 0);
  const currentMemberFallback = user ? memberFromUser(user, group) : null;
  const displayedMembers = members.length ? members : currentMemberFallback && joined ? [currentMemberFallback] : [];
  const currentMember = displayedMembers.find((member) => member.userId === user?.id) || currentMemberFallback;
  const usingMemberFallback = !members.length;
  const isCurrentAdmin = Boolean(currentMember?.role === "admin" || (usingMemberFallback && group.createdBy && group.createdBy === user?.id));
  const adminUserIds = useMemo(() => {
    const ids = new Set(displayedMembers.filter((member) => member.role === "admin").map((member) => member.userId));
    if (usingMemberFallback && group.createdBy) ids.add(group.createdBy);
    return ids;
  }, [displayedMembers, group.createdBy, usingMemberFallback]);
  const displayedMemberCount = Math.max(displayedMembers.length, Number(group.memberCount || 0) || (joined ? 1 : 0));
  const visibleMessages = useMemo(
    () =>
      messages.filter((item) => {
        if (!clearedAt) return true;
        if (!item.createdAt) return false;
        return new Date(item.createdAt).getTime() > clearedAt;
      }),
    [clearedAt, messages]
  );
  const sharedPhotos = visibleMessages.filter((item) => item.messageType === "image" && item.mediaUrl).slice(-6).reverse();

  async function loadGroupMembers() {
    if (!group?.id || !joined) {
      setMembers([]);
      return;
    }

    const extended = await supabase
      .from("community_memberships")
      .select("group_id,user_id,joined_at,role,display_name,avatar_url")
      .eq("group_id", group.id)
      .order("joined_at", { ascending: true });

    if (!extended.error && extended.data) {
      const nextMembers = extended.data.map(memberFromRow);
      if (currentMemberFallback && !nextMembers.some((member) => member.userId === currentMemberFallback.userId)) {
        nextMembers.push(currentMemberFallback);
      }
      setMembers(nextMembers);
      return;
    }

    const basic = await supabase
      .from("community_memberships")
      .select("group_id,user_id,joined_at")
      .eq("group_id", group.id)
      .order("joined_at", { ascending: true });

    if (!basic.error && basic.data) {
      const basicMembers = basic.data.map((row) => ({
        ...memberFromRow(row),
        displayName: row.user_id === user?.id ? userName : "Member",
        role: group.createdBy && group.createdBy === row.user_id ? "admin" : "member",
      }));
      if (currentMemberFallback && !basicMembers.some((member) => member.userId === currentMemberFallback.userId)) {
        basicMembers.push(currentMemberFallback);
      }
      setMembers(basicMembers);
      return;
    }

    setMembers(currentMemberFallback && joined ? [currentMemberFallback] : []);
  }

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    setDetailsOpen(false);
    setGroupMenuOpen(false);
    setInviteStatus("");
  }, [group.id]);

  useEffect(() => {
    loadGroupMembers();
  }, [group.id, joined, user?.id]);

  useEffect(() => {
    try {
      const clearedMessages = JSON.parse(localStorage.getItem(CLEARED_MESSAGES_KEY) || "{}");
      setClearedAt(Number(clearedMessages?.[clearMessagesStorageKey] || 0));
    } catch {
      setClearedAt(0);
    }
  }, [clearMessagesStorageKey]);

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  useEffect(() => {
    let cancelled = false;
    setMessages([]);
    setSelectedPhoto(null);
    setPhotoPreview("");
    setChatError("");

    async function loadMessages() {
      const extended = await supabase
        .from("community_messages")
        .select("id,author_id,author_name,body,created_at,message_type,media_url,media_path,file_name,mime_type")
        .eq("group_id", group.id)
        .order("created_at", { ascending: true });

      if (!cancelled && !extended.error && extended.data) {
        setMessages(await messagesFromRows(extended.data));
        return;
      }

      const basic = await supabase
        .from("community_messages")
        .select("id,author_id,author_name,body,created_at")
        .eq("group_id", group.id)
        .order("created_at", { ascending: true });

      if (cancelled || basic.error || !basic.data) return;
      setMessages(basic.data.map(messageFromRow));
    }

    loadMessages();
    return () => {
      cancelled = true;
    };
  }, [group.id]);

  function clearPhoto() {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setSelectedPhoto(null);
    setPhotoPreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handlePhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setChatError("Please choose an image file.");
      event.target.value = "";
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setChatError("Photo must be under 8 MB.");
      event.target.value = "";
      return;
    }
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setSelectedPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setChatError("");
  }

  async function sendMessage(options = {}) {
    const file = options.file || selectedPhoto;
    const messageType = options.messageType || (file ? "image" : "text");
    const body = (options.body ?? message).trim();
    if (!joined || sending || (!body && !file)) return;

    setSending(true);
    setChatError("");
    const localUrl = file ? URL.createObjectURL(file) : "";
    const optimisticMessage = {
      id: crypto.randomUUID(),
      authorId: user?.id,
      author: userName,
      body,
      createdAt: new Date().toISOString(),
      messageType,
      mediaUrl: localUrl,
      fileName: file?.name || "",
      mimeType: file?.type || "",
      uploading: true,
    };
    setMessages((items) => [...items, optimisticMessage]);
    setMessage("");
    if (!options.file) clearPhoto();

    let mediaUrl = "";
    let mediaPath = "";
    if (file) {
      try {
        const upload = await uploadChatMedia({ file, groupId: group.id, userId: user?.id });
        mediaUrl = upload.signedUrl;
        mediaPath = upload.path;
      } catch (error) {
        setMessages((items) =>
          items.map((item) =>
            item.id === optimisticMessage.id
              ? { ...item, uploading: false, error: "Media will not persist until Supabase storage is configured." }
              : item
          )
        );
        setChatError("Media upload needs the community-media Supabase storage bucket.");
        setSending(false);
        return;
      }
    }

    const { data, error } = await supabase
      .from("community_messages")
      .insert({
        group_id: group.id,
        author_id: user?.id,
        author_name: userName,
        body,
        message_type: messageType,
        media_url: null,
        media_path: mediaPath || null,
        file_name: file?.name || null,
        mime_type: file?.type || null,
      })
      .select("id,author_id,author_name,body,created_at,message_type,media_url,media_path,file_name,mime_type")
      .single();

    if (error && isMissingMediaPathError(error) && file) {
      const legacyInsert = await supabase
        .from("community_messages")
        .insert({
          group_id: group.id,
          author_id: user?.id,
          author_name: userName,
          body,
          message_type: messageType,
          media_url: mediaUrl,
          file_name: file?.name || null,
          mime_type: file?.type || null,
        })
        .select("id,author_id,author_name,body,created_at,message_type,media_url,file_name,mime_type")
        .single();

      if (!legacyInsert.error && legacyInsert.data) {
        const persistedMessage = messageFromRow(legacyInsert.data);
        persistedMessage.mediaUrl = mediaUrl;
        setMessages((items) =>
          items.map((item) =>
            item.id === optimisticMessage.id
              ? persistedMessage
              : item
          )
        );
      } else {
        setMessages((items) =>
          items.map((item) =>
            item.id === optimisticMessage.id
              ? { ...item, uploading: false, error: legacyInsert.error?.message || error.message }
              : item
          )
        );
        setChatError(legacyInsert.error?.message || error.message);
      }
      setSending(false);
      return;
    }

    if (error && messageType === "text") {
      const fallback = await supabase
        .from("community_messages")
        .insert({
          group_id: group.id,
          author_id: user?.id,
          author_name: userName,
          body,
        })
        .select("id,author_id,author_name,body,created_at")
        .single();

      if (!fallback.error && fallback.data) {
        setMessages((items) => items.map((item) => (item.id === optimisticMessage.id ? messageFromRow(fallback.data) : item)));
      } else {
        setMessages((items) => items.filter((item) => item.id !== optimisticMessage.id));
        setChatError(fallback.error?.message || error.message);
      }
      setSending(false);
      return;
    }

    if (!error && data) {
      const persistedMessage = messageFromRow(data);
      if (mediaPath) persistedMessage.mediaUrl = mediaUrl;
      setMessages((items) =>
        items.map((item) =>
          item.id === optimisticMessage.id
            ? persistedMessage
            : item
        )
      );
    } else {
      setMessages((items) =>
        items.map((item) =>
          item.id === optimisticMessage.id
            ? { ...item, uploading: false, error: error?.message || "Could not send message." }
            : item
        )
      );
      setChatError(error?.message || "Could not send message.");
    }
    setSending(false);
  }

  async function deleteMessage(item) {
    if (!item?.id || (!isCurrentAdmin && item.authorId !== user?.id)) return;
    const confirmed = window.confirm("Delete this message?");
    if (!confirmed) return;

    const previous = messages;
    setMessages((items) => items.filter((messageItem) => messageItem.id !== item.id));
    setChatError("");

    const { error } = await supabase.rpc("delete_community_message", { target_message_id: item.id });

    if (error) {
      if (item.authorId === user?.id) {
        const fallback = await supabase
          .from("community_messages")
          .delete()
          .eq("id", item.id)
          .eq("author_id", user.id);

        if (!fallback.error) return;
        setChatError(fallback.error.message || error.message);
      } else {
        setChatError(error.message);
      }
      setMessages(previous);
    }
  }

  function clearGroupMessages() {
    if (!visibleMessages.length) {
      setChatError("");
      return;
    }

    const nextClearedAt = Date.now();
    setClearedAt(nextClearedAt);
    setChatError("");
    try {
      const clearedMessages = JSON.parse(localStorage.getItem(CLEARED_MESSAGES_KEY) || "{}");
      localStorage.setItem(
        CLEARED_MESSAGES_KEY,
        JSON.stringify({
          ...(clearedMessages && typeof clearedMessages === "object" ? clearedMessages : {}),
          [clearMessagesStorageKey]: nextClearedAt,
        })
      );
    } catch {}
  }

  async function editMessage(item) {
    if (!item?.id || item.authorId !== user?.id || item.messageType !== "text") return;
    const createdAt = item.createdAt ? new Date(item.createdAt).getTime() : 0;
    if (!createdAt || Date.now() - createdAt > 3 * 60 * 1000) {
      setChatError("Messages can only be edited for 3 minutes after sending.");
      return;
    }

    const nextBody = window.prompt("Edit message", item.body || "");
    if (nextBody == null) return;
    const cleanBody = nextBody.trim();
    if (!cleanBody) return;

    const previous = messages;
    setMessages((items) => items.map((messageItem) => messageItem.id === item.id ? { ...messageItem, body: cleanBody } : messageItem));
    setChatError("");

    const { error } = await supabase
      .from("community_messages")
      .update({ body: cleanBody })
      .eq("id", item.id)
      .eq("author_id", user.id);

    if (error) {
      setMessages(previous);
      setChatError(error.message);
    }
  }

  async function copyGroupLink() {
    const link = `${window.location.origin}/community/${encodeURIComponent(group.id)}`;
    try {
      await navigator.clipboard.writeText(link);
      setInviteStatus("Group link copied");
    } catch {
      window.prompt("Copy group link", link);
      setInviteStatus("Copy the group link from the box");
    }
    window.setTimeout(() => setInviteStatus(""), 2400);
  }

  async function updateMemberRole(member, nextRole) {
    if (!isCurrentAdmin || !member?.userId || member.userId === user?.id) return;
    const action = nextRole === "admin" ? "make this member an admin" : "remove admin access";
    const confirmed = window.confirm(`Are you sure you want to ${action} for ${memberLabel(member)}?`);
    if (!confirmed) return;

    setMemberActionId(`${member.userId}:${nextRole}`);
    setChatError("");
    const { error } = await supabase.rpc("set_community_member_role", {
      target_group_id: group.id,
      target_user_id: member.userId,
      next_role: nextRole,
    });
    setMemberActionId("");

    if (error) {
      setChatError(error.message);
      return;
    }

    setMembers((items) => items.map((item) => item.userId === member.userId ? { ...item, role: nextRole } : item));
  }

  async function removeMember(member) {
    if (!isCurrentAdmin || !member?.userId || member.userId === user?.id) return;
    const confirmed = window.confirm(`Remove ${memberLabel(member)} from ${group.name}?`);
    if (!confirmed) return;

    setMemberActionId(`${member.userId}:remove`);
    setChatError("");
    const { error } = await supabase.rpc("remove_community_member", {
      target_group_id: group.id,
      target_user_id: member.userId,
    });
    setMemberActionId("");

    if (error) {
      setChatError(error.message);
      return;
    }

    setMembers((items) => items.filter((item) => item.userId !== member.userId));
  }

  return (
    <section
      style={{
        height: "calc(100vh - 70px)",
        minHeight: 0,
        display: "flex",
        background: "#f7f8fb",
        overflow: "hidden",
      }}
    >
      {showWorkspaceNav && (
        <aside style={{ width: 268, flex: "0 0 268px", height: "100%", minHeight: 0, background: "#fff", borderRight: "1px solid #dfe3eb", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "30px 14px 18px", display: "grid", gap: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "0 8px" }}>
              <span style={{ width: 36, height: 36, borderRadius: 11, background: "#3b46c4", color: "#fff", display: "grid", placeItems: "center", boxShadow: "0 12px 24px -18px rgba(59,70,196,.75)" }}>
                <GraduationCap size={18} />
              </span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 950, color: "#181b23", lineHeight: 1.1 }}>YGIU</div>
                <div style={{ fontSize: 12, color: "#69707d", marginTop: 3 }}>Community workspace</div>
              </div>
            </div>

            <button onClick={onCreateGroup} style={{ minHeight: 38, border: "none", borderRadius: 10, background: "#3644bb", color: "#fff", font: "inherit", fontSize: 14, fontWeight: 850, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 9, boxShadow: "0 12px 24px -18px rgba(54,68,187,.7)" }}>
              <Plus size={16} /> New group
            </button>

            <div style={{ display: "grid", gap: 4 }}>
              <div style={{ color: "#69707d", fontSize: 12, fontWeight: 950, letterSpacing: ".08em", textTransform: "uppercase", padding: "0 0 4px" }}>Workspace</div>
              {[
                { label: "Dashboard", icon: Grid2X2, active: false, onClick: onDashboard, badge: "" },
                { label: "Communities", icon: Users, active: false, onClick: onBrowse, badge: "" },
                { label: "Messages", icon: MessageCircle, active: true, onClick: () => {}, badge: visibleUnreadTotal ? String(visibleUnreadTotal) : "" },
                { label: "Student guide", icon: BookOpen, active: false, onClick: () => (window.location.href = "/guide"), badge: "" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    onClick={item.onClick}
                    style={{
                      minHeight: 36,
                      border: "none",
                      borderRadius: 9,
                      background: item.active ? "#e9eefc" : "transparent",
                      color: item.active ? "#3644bb" : "#565d68",
                      font: "inherit",
                      fontSize: 14,
                      fontWeight: item.active ? 900 : 750,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "0 10px",
                      textAlign: "left",
                    }}
                  >
                    <Icon size={17} />
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.badge ? <span style={{ minWidth: 20, height: 20, borderRadius: 999, background: "#dfe3ff", color: "#4f46e5", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 950 }}>{item.badge}</span> : null}
                  </button>
                );
              })}
            </div>

          </div>

          <div style={{ marginTop: "auto", borderTop: "1px solid #dfe3eb", padding: 14 }}>
            <WorkspaceProfileButton user={user} onSettings={onOpenSettings} onSignOut={onSignOut} variant="footer" />
          </div>
        </aside>
      )}

      <div
        style={{
          flex: 1,
          minWidth: 0,
          height: "100%",
          minHeight: 0,
          display: "flex",
          background: "#f7f8fb",
          overflow: "hidden",
        }}
      >
      {showRail && (
        <aside
          style={{
            width: showWorkspaceNav ? 360 : 420,
            flexShrink: 0,
            borderRight: "1px solid #dfe3eb",
            background: "#fff",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          <div style={{ padding: "28px 30px 18px", display: "grid", gap: 22 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ color: "#1f1956", fontSize: 20, fontWeight: 950 }}>Messages</div>
              <button
                onClick={onBack}
                title="Back to community"
                style={{ width: 38, height: 38, borderRadius: 999, border: "none", background: "#f4f1fa", color: "#312e81", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
              >
                <BackIcon />
              </button>
            </div>
            <label style={{ minHeight: 52, borderRadius: 8, background: "#efedf4", display: "flex", alignItems: "center", gap: 12, padding: "0 16px", color: "#312e81" }}>
              <Search size={19} />
              <input readOnly value="" placeholder="Search groups" style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", color: C.text, font: "inherit", fontSize: 14.5 }} />
            </label>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div style={{ color: "#111827", fontSize: 21, fontWeight: 950 }}>Inbox <span style={{ color: "#ef4444", fontSize: 13, marginLeft: 5 }}>{Object.values(unreadByGroup).reduce((sum, value) => sum + Number(value || 0), 0)}</span></div>
              <button onClick={onBack} style={{ border: "none", background: "transparent", color: "#7c7794", font: "inherit", fontSize: 14, cursor: "pointer" }}>See all</button>
            </div>
          </div>

          <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0 0 18px" }}>
            {!joined && (
              <>
                <div style={{ color: C.muted, fontSize: 11, fontWeight: 900, letterSpacing: ".08em", padding: "4px 30px 8px" }}>VIEWING</div>
                <ChatGroupRow group={group} selected onClick={() => onSelectGroup(group)} />
              </>
            )}

            <div style={{ color: C.muted, fontSize: 11, fontWeight: 900, letterSpacing: ".08em", padding: joined ? "4px 30px 8px" : "18px 30px 8px" }}>
              JOINED · {joinedGroups.length}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {joinedGroups.length ? (
                joinedGroups.map((item) => (
                  <ChatGroupRow key={item.id} group={item} selected={item.id === group.id} unread={Number(unreadByGroup[item.id] || 0)} muted={mutedIds.includes(item.id)} onClick={() => onSelectGroup(item)} />
                ))
              ) : (
                <div style={{ color: C.muted, fontSize: 13, lineHeight: 1.5, padding: "8px" }}>
                  Joined groups will appear here.
                </div>
              )}
            </div>
          </div>
        </aside>
      )}

      <section style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", minHeight: 0, background: "#fff" }}>
        <div style={{ minHeight: 104, padding: "0 clamp(20px,3vw,34px)", borderBottom: `1px solid ${C.line}`, display: "flex", justifyContent: "space-between", gap: 18, alignItems: "center", background: "#fff" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
            {!showRail && (
              <button
                onClick={onBack}
                style={{ border: "none", background: "#f4f1fa", borderRadius: 999, width: 38, height: 38, color: "#312e81", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
              >
                <BackIcon />
              </button>
            )}
            <button
              type="button"
              onClick={() => setDetailsOpen(true)}
              aria-expanded={detailsOpen}
              title="Open group details"
              style={{ minWidth: 0, border: "none", background: "transparent", padding: 0, display: "flex", alignItems: "center", gap: 14, textAlign: "left", cursor: "pointer", borderRadius: 16 }}
            >
              <GroupGlyph group={group} tone={toneForGroup(group)} size={58} />
              <div style={{ minWidth: 0 }}>
                <h1 style={{ margin: 0, color: C.text, fontSize: 20, fontWeight: 950, letterSpacing: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{group.name}</h1>
                <p style={{ margin: "4px 0 0", color: C.muted, fontSize: 14, display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                  <span>{groupTypeLabel(group)}</span>
                  {isCurrentAdmin && (
                    <>
                      <span style={{ width: 6, height: 6, borderRadius: 99, background: "#22c55e" }} />
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#4f46e5", fontWeight: 900 }}>
                        <ShieldCheck size={14} /> Admin
                      </span>
                    </>
                  )}
                  <span style={{ width: 6, height: 6, borderRadius: 99, background: "#22c55e" }} />
                  <span>{group.location || "Community room"}</span>
                </p>
              </div>
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            {joined ? (
              <div style={{ position: "relative" }}>
                <ChatIconButton title="Group options" onClick={() => setGroupMenuOpen((value) => !value)} active={groupMenuOpen}>
                  <MoreVertical size={19} />
                </ChatIconButton>
                {groupMenuOpen && (
                  <div style={{ position: "absolute", right: 0, top: 46, minWidth: 168, borderRadius: 14, border: `1px solid ${C.line}`, background: "#fff", boxShadow: "0 22px 54px -28px rgba(15,23,42,.48)", padding: 7, zIndex: 20 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setGroupMenuOpen(false);
                        copyGroupLink();
                      }}
                      style={{ width: "100%", minHeight: 38, border: "none", borderRadius: 9, background: "transparent", color: C.text, font: "inherit", fontSize: 13.5, fontWeight: 850, cursor: "pointer", textAlign: "left", padding: "0 10px", display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <Copy size={15} /> Copy group link
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setGroupMenuOpen(false);
                        onToggleMute(group.id);
                      }}
                      style={{ width: "100%", minHeight: 38, border: "none", borderRadius: 9, background: "transparent", color: C.text, font: "inherit", fontSize: 13.5, fontWeight: 850, cursor: "pointer", textAlign: "left", padding: "0 10px" }}
                    >
                      {isMuted ? "Unmute group" : "Mute group"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setGroupMenuOpen(false);
                        clearGroupMessages();
                      }}
                      style={{ width: "100%", minHeight: 38, border: "none", borderRadius: 9, background: "transparent", color: C.text, font: "inherit", fontSize: 13.5, fontWeight: 850, cursor: "pointer", textAlign: "left", padding: "0 10px" }}
                    >
                      Clear messages
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setGroupMenuOpen(false);
                        onExitGroup(group);
                      }}
                      style={{ width: "100%", minHeight: 38, border: "none", borderRadius: 9, background: "transparent", color: C.danger, font: "inherit", fontSize: 13.5, fontWeight: 850, cursor: "pointer", textAlign: "left", padding: "0 10px" }}
                    >
                      Exit group
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <ChatIconButton title="Copy group link" onClick={copyGroupLink}>
                  <Copy size={18} />
                </ChatIconButton>
                <Button onClick={() => onJoin(group)}>Join group</Button>
              </>
            )}
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "clamp(22px,4vw,38px)", display: "flex", flexDirection: "column", gap: 18, background: "#fff" }}>
          {joined && displayedMemberCount < 5 && !fewMembersBannerDismissed && (
            <div style={{ borderRadius: 14, border: "1px solid #e0e7ff", background: "linear-gradient(135deg,#f5f7ff 0%,#f0fbf8 100%)", padding: "13px 14px 13px 16px", display: "flex", alignItems: "flex-start", gap: 12, flexShrink: 0 }}>
              <span style={{ fontSize: 22, lineHeight: 1, marginTop: 1 }}>👋</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: C.text, fontSize: 14, fontWeight: 900, marginBottom: 3 }}>Not many people here yet</div>
                <div style={{ color: C.sub, fontSize: 13, lineHeight: 1.5 }}>Share the invite link so your classmates can join and start chatting.</div>
                <button
                  type="button"
                  onClick={copyGroupLink}
                  style={{ marginTop: 9, display: "inline-flex", alignItems: "center", gap: 6, background: C.brand, color: "#fff", border: "none", borderRadius: 9, padding: "6px 13px", fontSize: 12.5, fontWeight: 900, cursor: "pointer" }}
                >
                  <Copy size={13} /> Copy invite link
                </button>
              </div>
              <button
                type="button"
                onClick={() => setFewMembersBannerDismissed(true)}
                title="Dismiss"
                aria-label="Dismiss"
                style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", padding: 2, display: "grid", placeItems: "center", flexShrink: 0 }}
              >
                <X size={15} />
              </button>
            </div>
          )}
          {visibleMessages.length === 0 ? (
            <div style={{ margin: "auto", maxWidth: 360, color: C.sub, textAlign: "center", fontSize: 15, lineHeight: 1.6 }}>
              <div style={{ width: 54, height: 54, borderRadius: 16, background: C.brandSoft, color: C.brand, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", fontWeight: 900 }}>
                0
              </div>
              No messages yet.
              <div style={{ color: C.muted, fontSize: 13.5, marginTop: 4 }}>
                {joined ? "Start the first conversation in this group." : "Join this group to send the first message."}
              </div>
            </div>
          ) : (
            visibleMessages.map((item) => (
              <MessageBubble
                key={item.id}
                item={item}
                isMine={item.authorId === user?.id}
                isAuthorAdmin={adminUserIds.has(item.authorId)}
                canDelete={isCurrentAdmin || item.authorId === user?.id}
                onDelete={deleteMessage}
                onEdit={editMessage}
              />
            ))
          )}
        </div>

        <div style={{ borderTop: `1px solid ${C.line}`, padding: "14px clamp(16px,3vw,24px)", background: "#fff" }}>
          {joined ? (
            <div style={{ display: "grid", gap: 10 }}>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display: "none" }} />

              {selectedPhoto && (
                <div style={{ display: "flex", alignItems: "center", gap: 12, border: `1px solid ${C.lineStrong}`, background: "#fbfcfe", borderRadius: 14, padding: 8 }}>
                  <img src={photoPreview} alt="" style={{ width: 54, height: 54, borderRadius: 10, objectFit: "cover", background: "#eef2ff" }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ color: C.text, fontSize: 13.5, fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedPhoto.name}</div>
                    <div style={{ color: C.muted, fontSize: 12.5, marginTop: 2 }}>Photo ready to send</div>
                  </div>
                  <ChatIconButton title="Remove photo" onClick={clearPhoto} disabled={sending}>
                    <X size={17} />
                  </ChatIconButton>
                </div>
              )}

              {chatError && (
                <div style={{ color: C.danger, background: "#fff4f2", border: "1px solid #fecdca", borderRadius: 12, padding: "9px 12px", fontSize: 13, fontWeight: 800 }}>
                  {chatError}
                </div>
              )}

              {inviteStatus && (
                <div style={{ color: C.green, background: "#ecfdf3", border: "1px solid #abefc6", borderRadius: 12, padding: "9px 12px", fontSize: 13, fontWeight: 850 }}>
                  {inviteStatus}
                </div>
              )}

              <div style={{ display: "flex", gap: 9, minHeight: 52, alignItems: "center", border: `1px solid ${C.lineStrong}`, borderRadius: 15, padding: "0 8px" }}>
                <ChatIconButton title="Share photo" onClick={() => fileInputRef.current?.click()} disabled={sending}>
                  <ImageIcon size={18} />
                </ChatIconButton>
                <input
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) sendMessage();
                  }}
                  placeholder={selectedPhoto ? "Add a caption" : "Write a message"}
                  disabled={sending}
                  style={{ flex: 1, minWidth: 0, height: 46, border: "none", padding: 0, font: "inherit", outline: "none", background: "transparent", color: C.text }}
                />
                <Button onClick={() => sendMessage()} disabled={sending || (!message.trim() && !selectedPhoto)} style={{ minWidth: 92 }}>
                  <SendIcon size={16} /> Send
                </Button>
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {inviteStatus && <div style={{ color: C.green, fontSize: 12.5, fontWeight: 850 }}>{inviteStatus}</div>}
              <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ color: C.sub, fontSize: 14 }}>Join this group to send messages.</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <ChatIconButton title="Copy group link" onClick={copyGroupLink}>
                    <Copy size={18} />
                  </ChatIconButton>
                  <Button onClick={() => onJoin(group)}>Join group</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {showInfo && (
        <aside
          style={{
            width: 390,
            flexShrink: 0,
            borderLeft: `1px solid ${C.line}`,
            background: "#fff",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          <div style={{ position: "relative", padding: "36px 28px 26px", borderBottom: `1px solid ${C.line}`, textAlign: "center" }}>
            <button
              type="button"
              onClick={() => setDetailsOpen(false)}
              title="Close group details"
              aria-label="Close group details"
              style={{ position: "absolute", right: 18, top: 18, width: 34, height: 34, borderRadius: 11, border: `1px solid ${C.lineStrong}`, background: "#fff", color: C.sub, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              <X size={16} />
            </button>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
              <GroupGlyph group={group} tone={toneForGroup(group)} size={82} />
            </div>
            <div style={{ color: C.text, fontSize: 21, fontWeight: 950 }}>{group.name}</div>
            <div style={{ color: C.sub, fontSize: 14.5, lineHeight: 1.45, marginTop: 7 }}>{groupTypeLabel(group)}</div>
            <div style={{ color: "#7c7794", fontSize: 14.5, marginTop: 15, display: "flex", justifyContent: "center", alignItems: "center", gap: 7 }}>
              <MapPin size={16} /> {group.location || "United States"}
            </div>
            {!joined && <div style={{ marginTop: 18 }}><Button onClick={() => onJoin(group)}>Join group</Button></div>}
          </div>

          <div style={{ padding: "24px 28px", display: "grid", gap: 25, overflowY: "auto" }}>
            <div>
              <div style={{ color: "#1f1956", fontSize: 18, fontWeight: 950, marginBottom: 12 }}>Group details</div>
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, color: C.sub, fontSize: 14.5 }}>
                  <span>Members</span>
                  <strong style={{ color: C.text }}>{displayedMemberCount}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, color: C.sub, fontSize: 14.5 }}>
                  <span>Messages</span>
                  <strong style={{ color: C.text }}>{visibleMessages.length}</strong>
                </div>
              </div>
              <button
                type="button"
                onClick={copyGroupLink}
                style={{ marginTop: 14, width: "100%", minHeight: 40, borderRadius: 10, border: `1px solid ${C.lineStrong}`, background: "#fff", color: C.text, font: "inherit", fontSize: 13.5, fontWeight: 900, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              >
                <Copy size={15} /> Copy group link
              </button>
              {inviteStatus && <div style={{ marginTop: 8, color: C.green, fontSize: 12.5, fontWeight: 850, textAlign: "center" }}>{inviteStatus}</div>}
            </div>

            <div>
              <div style={{ color: "#1f1956", fontSize: 18, fontWeight: 950, marginBottom: 12 }}>Members</div>
              {joined && displayedMembers.length ? (
                <div style={{ display: "grid", gap: 8 }}>
                  {displayedMembers.map((member) => {
                    const isSelf = member.userId === user?.id;
                    const isAdmin = member.role === "admin" || (usingMemberFallback && member.userId === group.createdBy);
                    const actionBusy = memberActionId.startsWith(`${member.userId}:`);
                    return (
                      <div key={member.userId || member.displayName} style={{ display: "grid", gap: 8, border: `1px solid ${C.line}`, borderRadius: 13, padding: 10, background: isSelf ? "#f8fafc" : "#fff" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                          <MemberAvatar member={member} />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flexWrap: "wrap" }}>
                              <span style={{ color: C.text, fontSize: 14, fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{memberLabel(member)}</span>
                              {isAdmin && (
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, borderRadius: 999, background: "#eef2ff", color: "#4f46e5", padding: "3px 7px", fontSize: 10.5, fontWeight: 950 }}>
                                  <ShieldCheck size={11} /> Admin
                                </span>
                              )}
                            </div>
                            <div style={{ color: isSelf ? C.green : C.sub, fontSize: 12.5, fontWeight: 800, marginTop: 2 }}>{isSelf ? "You" : "Member"}</div>
                          </div>
                        </div>
                        {isCurrentAdmin && !isSelf && (
                          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", paddingLeft: 50 }}>
                            <button
                              type="button"
                              onClick={() => updateMemberRole(member, isAdmin ? "member" : "admin")}
                              disabled={actionBusy}
                              style={{ minHeight: 30, borderRadius: 8, border: `1px solid ${C.lineStrong}`, background: "#fff", color: "#4f46e5", font: "inherit", fontSize: 12, fontWeight: 900, cursor: actionBusy ? "not-allowed" : "pointer", padding: "0 9px", display: "inline-flex", alignItems: "center", gap: 5, opacity: actionBusy ? 0.62 : 1 }}
                            >
                              <ShieldCheck size={13} /> {isAdmin ? "Make member" : "Make admin"}
                            </button>
                            <button
                              type="button"
                              onClick={() => removeMember(member)}
                              disabled={actionBusy}
                              style={{ minHeight: 30, borderRadius: 8, border: "1px solid #fecdca", background: "#fff", color: C.danger, font: "inherit", fontSize: 12, fontWeight: 900, cursor: actionBusy ? "not-allowed" : "pointer", padding: "0 9px", display: "inline-flex", alignItems: "center", gap: 5, opacity: actionBusy ? 0.62 : 1 }}
                            >
                              <UserMinus size={13} /> Remove
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ color: C.sub, fontSize: 13.5, lineHeight: 1.5 }}>Join to appear in the member list.</div>
              )}
            </div>

            <div>
              <div style={{ color: "#1f1956", fontSize: 18, fontWeight: 950, marginBottom: 12 }}>Shared photos</div>
              {sharedPhotos.length ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                  {sharedPhotos.map((item) => (
                    <img key={item.id} src={item.mediaUrl} alt={item.fileName || "Shared photo"} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 8, background: "#eef2ff" }} />
                  ))}
                </div>
              ) : (
                <div style={{ color: C.sub, fontSize: 13.5, lineHeight: 1.5 }}>Photos shared in this group will appear here.</div>
              )}
            </div>

            <div>
              <div style={{ color: "#1f1956", fontSize: 18, fontWeight: 950, marginBottom: 12 }}>Resources</div>
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, borderRadius: 10, background: "#eef7f5", padding: 11 }}>
                  <FileText size={19} color="#2f8f86" />
                  <div>
                    <div style={{ color: C.text, fontSize: 13.5, fontWeight: 900 }}>Student notes</div>
                    <div style={{ color: C.sub, fontSize: 12.5 }}>{visibleMessages.length} chat items</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, borderRadius: 10, background: "#f5f3ff", padding: 11 }}>
                  <HelpCircle size={19} color="#6d28d9" />
                  <div>
                    <div style={{ color: C.text, fontSize: 13.5, fontWeight: 900 }}>Community help</div>
                    <div style={{ color: C.sub, fontSize: 12.5 }}>Ask members in chat</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      )}
      </div>
    </section>
  );
}

export default function Community({ initialPage = "community", chromeOffset = 0 } = {}) {
  const startsOnDashboard = initialPage === "dashboard";
  const [user, setUser] = useState(null);
  const [groups, setGroups] = useState(PRESET_GROUPS);
  const [page, setPage] = useState(startsOnDashboard ? "auth" : "community");
  const [pending, setPending] = useState(startsOnDashboard ? { action: "dashboard" } : null);
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [joinedIds, setJoinedIds] = useState([]);
  const [exitedIds, setExitedIds] = useState([]);
  const [mutedIds, setMutedIds] = useState([]);
  const [unreadByGroup, setUnreadByGroup] = useState({});
  const [savedModeratorEmails, setSavedModeratorEmails] = useState([]);
  const [lastListPage, setLastListPage] = useState(startsOnDashboard ? "dashboard" : "community");
  const [communityFilter, setCommunityFilter] = useState("All");
  const [toast, setToast] = useState(null);
  const [profileSettingsOpen, setProfileSettingsOpen] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const deepLinkHandled = useRef(false);

  const activeGroup = useMemo(() => groups.find((group) => group.id === activeGroupId) || null, [activeGroupId, groups]);
  const moderatorEmails = useMemo(() => uniqueEmails([...envCommunityModeratorEmails(), ...savedModeratorEmails]), [savedModeratorEmails]);
  const isModerator = isCommunityModerator(user, moderatorEmails);
  const dashboardJoinedGroups = useMemo(
    () => (user ? (isModerator ? groups : groups.filter((group) => isGroupJoinedByUser(group, joinedIds, user, exitedIds))) : []),
    [groups, joinedIds, exitedIds, user?.id, isModerator]
  );

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast?.id]);

  useEffect(() => {
    try {
      const currentVersion = localStorage.getItem("ygiu_community_version");
      if (currentVersion !== STORAGE_VERSION) {
        localStorage.removeItem("ygiu_auth");
        localStorage.removeItem("ygiu_joined");
        localStorage.removeItem("ygiu_page");
        localStorage.removeItem("ygiu_pending_group");
        localStorage.removeItem("ygiu_pending_action");
        localStorage.setItem("ygiu_community_version", STORAGE_VERSION);
      }
      setGroups(loadStoredGroups());
      setMutedIds(loadStoredIds(MUTED_GROUPS_KEY));
      setExitedIds(loadStoredIds(EXITED_GROUPS_KEY));
      setSavedModeratorEmails(loadLocalModeratorEmails());
      const storedUnread = JSON.parse(localStorage.getItem(UNREAD_GROUPS_KEY) || "{}");
      setUnreadByGroup(storedUnread && typeof storedUnread === "object" ? storedUnread : {});
    } catch {}

    let mounted = true;
    const syncSession = (session) => {
      if (!mounted) return;
      setUser(session?.user || null);
      setSessionReady(true);

      if (session?.user) {
        setJoinedIds(loadStoredJoinedIds());
        try {
          const pendingGroupId = localStorage.getItem("ygiu_pending_group");
          const storedPendingAction = localStorage.getItem("ygiu_pending_action");
          const pendingAction = startsOnDashboard ? storedPendingAction || "dashboard" : storedPendingAction === "dashboard" ? "view" : storedPendingAction || "view";
          if (!startsOnDashboard && storedPendingAction === "dashboard") {
            localStorage.removeItem("ygiu_pending_action");
            localStorage.removeItem("ygiu_pending_group");
          }
          if (pendingAction === "create") {
            localStorage.removeItem("ygiu_pending_group");
            localStorage.removeItem("ygiu_pending_action");
            setPending(null);
            setPage("create");
          } else if (pendingAction === "dashboard") {
            localStorage.removeItem("ygiu_pending_group");
            localStorage.removeItem("ygiu_pending_action");
            setPending(null);
            setLastListPage("dashboard");
            setPage("dashboard");
          } else if (pendingAction === "created") {
            localStorage.removeItem("ygiu_pending_group");
            localStorage.removeItem("ygiu_pending_action");
            setPending(null);
            setCommunityFilter("Created");
            setLastListPage("community");
            setPage("community");
          } else {
            const group = loadStoredGroups().find((item) => item.id === pendingGroupId);
            if (group) {
              localStorage.removeItem("ygiu_pending_group");
              localStorage.removeItem("ygiu_pending_action");
              continueGroupAction(group, pendingAction, true);
            }
          }
        } catch {}
      } else {
        setJoinedIds([]);
        setExitedIds([]);
        setActiveGroupId(null);
        setProfileSettingsOpen(false);
        try {
          localStorage.removeItem(JOINED_GROUPS_KEY);
          localStorage.removeItem(EXITED_GROUPS_KEY);
        } catch {}
      }

      if (!session?.user && startsOnDashboard) {
        setPending({ action: "dashboard" });
        try {
          localStorage.setItem("ygiu_pending_action", "dashboard");
          localStorage.removeItem("ygiu_pending_group");
        } catch {}
        setPage("auth");
      } else if (!session?.user) {
        setPage("community");
      }
    };

    supabase.auth.getSession().then(({ data }) => syncSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => syncSession(session));

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!sessionReady || deepLinkHandled.current || typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const groupId = params.get("group");
    if (!groupId) return;

    const group = groups.find((item) => item.id === groupId);
    if (!group) return;

    deepLinkHandled.current = true;
    const action = params.get("action") === "join" ? "join" : "view";

    if (user) {
      continueGroupAction(group, action, true);
    } else {
      setPending({ group, action });
      try {
        localStorage.setItem("ygiu_pending_group", group.id);
        localStorage.setItem("ygiu_pending_action", action);
      } catch {}
      setPage("auth");
      window.scrollTo(0, 0);
    }

    window.history.replaceState(null, "", "/community");
  }, [groups, sessionReady, user?.id]);

  useEffect(() => {
    let cancelled = false;
    async function loadCommunityGroups() {
      const { data, error } = await supabase
        .from("community_groups")
        .select("id,name,description,type,location,member_count,created_by")
        .order("name", { ascending: true });

      if (cancelled || error || !data) return;
      setGroups(mergeGroups(loadStoredGroups(), data.map(rowToGroup)));
    }

    loadCommunityGroups();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id) return () => {};

    async function loadMemberships() {
      const { data, error } = await supabase
        .from("community_memberships")
        .select("group_id")
        .eq("user_id", user.id);

      if (cancelled || error || !data) return;
      const databaseIds = data.map((item) => item.group_id).filter(Boolean);
      setJoinedIds((currentIds) => {
        const nextIds = Array.from(new Set([...currentIds, ...databaseIds]));
        try {
          localStorage.setItem(JOINED_GROUPS_KEY, JSON.stringify(nextIds));
        } catch {}
        return nextIds;
      });
    }

    loadMemberships();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id) return () => {};

    async function loadModeratorEmails() {
      const { data, error } = await supabase
        .from("community_moderators")
        .select("email,enabled")
        .eq("enabled", true)
        .order("email", { ascending: true });

      if (cancelled || error || !data) return;
      const nextEmails = uniqueEmails(data.map((item) => item.email));
      setSavedModeratorEmails(nextEmails);
      saveLocalModeratorEmails(nextEmails);
    }

    loadModeratorEmails();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !activeGroupId) return;
    setUnreadByGroup((current) => {
      if (!current[activeGroupId]) return current;
      const next = { ...current };
      delete next[activeGroupId];
      try {
        localStorage.setItem(UNREAD_GROUPS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, [activeGroupId, user?.id]);

  useEffect(() => {
    if (!user?.id) return () => {};
    const channel = supabase
      .channel(`community-notifications-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "community_messages" },
        (payload) => {
          const row = payload.new || {};
          const groupId = row.group_id;
          if (!groupId || row.author_id === user.id) return;
          if ((!isModerator && !joinedIds.includes(groupId)) || mutedIds.includes(groupId) || groupId === activeGroupId) return;

          setUnreadByGroup((current) => {
            const next = { ...current, [groupId]: Number(current[groupId] || 0) + 1 };
            try {
              localStorage.setItem(UNREAD_GROUPS_KEY, JSON.stringify(next));
            } catch {}
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, joinedIds, mutedIds, activeGroupId, isModerator]);

  function requireLogin(group, action) {
    if (user) {
      continueGroupAction(group, action, true);
      return;
    }
    setPending({ group, action });
    try {
      localStorage.setItem("ygiu_pending_group", group.id);
      localStorage.setItem("ygiu_pending_action", action);
    } catch {}
    setPage("auth");
    window.scrollTo(0, 0);
  }

  function showCommunityToast(message, title = "Community access") {
    setToast({
      id: `${Date.now()}-${Math.random()}`,
      title,
      message,
    });
  }

  async function updateModeratorEmails(nextEmails) {
    const cleanEmails = uniqueEmails(nextEmails);
    const previousEmails = savedModeratorEmails;
    setSavedModeratorEmails(cleanEmails);
    saveLocalModeratorEmails(cleanEmails);
    if (!user?.id || !isModerator) return;

    const toAdd = cleanEmails.filter((email) => !previousEmails.includes(email));
    const toRemove = previousEmails.filter((email) => !cleanEmails.includes(email));
    let syncFailed = false;

    if (toAdd.length) {
      const { error } = await supabase.from("community_moderators").upsert(
        toAdd.map((email) => ({
          email,
          enabled: true,
          created_by: user.id,
        })),
        { onConflict: "email" }
      );
      if (error) syncFailed = true;
    }

    if (toRemove.length) {
      const { error } = await supabase.from("community_moderators").delete().in("email", toRemove);
      if (error) syncFailed = true;
    }

    if (syncFailed) {
      showCommunityToast("Saved on this browser. Run the updated Supabase script to sync moderator emails for everyone.", "Saved locally");
    }
  }

  function openGroupInDashboard(group) {
    setPending(null);
    setLastListPage("dashboard");
    setActiveGroupId(group.id);
    setPage("dashboard");
    if (typeof window !== "undefined") {
      if (window.location.pathname !== "/community/dashboard") window.history.pushState(null, "", "/community/dashboard");
      window.scrollTo(0, 0);
    }
  }

  function viewGroupFromCommunity(group) {
    if (!user) {
      showCommunityToast("Login to view group.", "Login required");
      return;
    }
    if (!isModerator && !isGroupJoinedByUser(group, joinedIds, user, exitedIds)) {
      showCommunityToast("Join the group to view.", "Join required");
      return;
    }
    openGroupInDashboard(group);
  }

  function continueGroupAction(group, action, alreadyAuthed = Boolean(user)) {
    if (!alreadyAuthed) {
      requireLogin(group, action);
      return;
    }
    setLastListPage(page === "dashboard" ? "dashboard" : "community");
    setActiveGroupId(group.id);
    if (action === "join") {
      setExitedIds((ids) => {
        const nextIds = ids.filter((id) => id !== group.id);
        try {
          localStorage.setItem(EXITED_GROUPS_KEY, JSON.stringify(nextIds));
        } catch {}
        return nextIds;
      });
      setJoinedIds((ids) => {
        const alreadyJoined = ids.includes(group.id);
        const nextIds = ids.includes(group.id) ? ids : [...ids, group.id];
        if (!alreadyJoined) {
          setGroups((items) =>
            items.map((item) =>
              item.id === group.id
                ? { ...item, memberCount: Number(item.memberCount || 0) + 1 }
                : item
            )
          );
        }
        try {
          localStorage.setItem(JOINED_GROUPS_KEY, JSON.stringify(nextIds));
        } catch {}
        if (!alreadyJoined) persistGroupJoin(group.id, user?.id).catch(() => {});
        return nextIds;
      });
    }
    setPending(null);
    if (action === "join" || action === "view") {
      openGroupInDashboard(group);
      return;
    }
    setPage("chat");
    window.scrollTo(0, 0);
  }

  function handleAuthed() {
    if (pending?.action === "create") {
      setPending(null);
      setPage("create");
      return;
    }
    if (pending?.action === "dashboard") {
      setPending(null);
      setLastListPage("dashboard");
      setPage("dashboard");
      return;
    }
    if (pending?.action === "created") {
      setPending(null);
      setCommunityFilter("Created");
      setLastListPage("community");
      setPage("community");
      return;
    }
    if (pending?.group) {
      continueGroupAction(pending.group, pending.action, true);
      return;
    }
    setPage("community");
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setPending(null);
    setActiveGroupId(null);
    setJoinedIds([]);
    setExitedIds([]);
    setProfileSettingsOpen(false);
    try {
      localStorage.removeItem(JOINED_GROUPS_KEY);
      localStorage.removeItem(EXITED_GROUPS_KEY);
      localStorage.removeItem("ygiu_pending_group");
      localStorage.removeItem("ygiu_pending_action");
    } catch {}
    setPage("community");
  }

  function showCommunity() {
    setPending(null);
    try {
      localStorage.removeItem("ygiu_pending_group");
      localStorage.removeItem("ygiu_pending_action");
    } catch {}
    setLastListPage("community");
    setPage("community");
    if (typeof window !== "undefined") {
      if (window.location.pathname !== "/community") window.history.pushState(null, "", "/community");
      window.scrollTo(0, 0);
    }
  }

  function requestSignIn(action) {
    if (action === "created") {
      setCommunityFilter("Created");
      setPending({ action: "created" });
      try {
        localStorage.setItem("ygiu_pending_action", "created");
        localStorage.removeItem("ygiu_pending_group");
      } catch {}
    } else {
      setPending(null);
      try {
        localStorage.removeItem("ygiu_pending_group");
        localStorage.removeItem("ygiu_pending_action");
      } catch {}
    }
    setPage("auth");
    window.scrollTo(0, 0);
  }

  function showDashboard() {
    if (user) {
      setPending(null);
      setLastListPage("dashboard");
      setPage("dashboard");
      if (typeof window !== "undefined") {
        if (window.location.pathname !== "/community/dashboard") window.history.pushState(null, "", "/community/dashboard");
        window.scrollTo(0, 0);
      }
      return;
    }

    setPending({ action: "dashboard" });
    try {
      localStorage.setItem("ygiu_pending_action", "dashboard");
      localStorage.removeItem("ygiu_pending_group");
    } catch {}
    setPage("auth");
    window.scrollTo(0, 0);
  }

  function openMessages() {
    if (!user) {
      setPending({ action: "dashboard" });
      try {
        localStorage.setItem("ygiu_pending_action", "dashboard");
        localStorage.removeItem("ygiu_pending_group");
      } catch {}
      setPage("auth");
      window.scrollTo(0, 0);
      return;
    }

    const firstJoinedGroup = groups.find((group) => isModerator || isGroupJoinedByUser(group, joinedIds, user, exitedIds));
    if (firstJoinedGroup) {
      openGroupInDashboard(firstJoinedGroup);
    } else {
      setPending(null);
      setLastListPage("community");
      setPage("community");
      if (typeof window !== "undefined" && window.location.pathname !== "/community") {
        window.history.pushState(null, "", "/community");
      }
    }
    window.scrollTo(0, 0);
  }

  function openDirectoryDashboard() {
    if (!user) {
      showDashboard();
      return;
    }

    const firstJoinedGroup =
      activeGroup && (isModerator || isGroupJoinedByUser(activeGroup, joinedIds, user, exitedIds))
        ? activeGroup
        : groups.find((group) => isModerator || isGroupJoinedByUser(group, joinedIds, user, exitedIds));

    if (firstJoinedGroup) {
      openGroupInDashboard(firstJoinedGroup);
      return;
    }

    showDashboard();
  }

  function openDashboardGroup(group) {
    openGroupInDashboard(group);
  }

  function requestCreateGroup() {
    if (user) {
      setLastListPage(page === "dashboard" ? "dashboard" : "community");
      setPage("create");
      window.scrollTo(0, 0);
      return;
    }
    setPending({ action: "create" });
    try {
      localStorage.setItem("ygiu_pending_action", "create");
      localStorage.removeItem("ygiu_pending_group");
    } catch {}
    setPage("auth");
    window.scrollTo(0, 0);
  }

  function handleDirectoryAuthRequired(group, action = "join") {
    if (action === "dashboard") {
      showDashboard();
      return;
    }
    if (action === "create") {
      requestCreateGroup();
      return;
    }
    if (group) requireLogin(group, action);
  }

  async function joinGroupFromDirectory(group) {
    if (!user?.id) {
      requireLogin(group, "join");
      return null;
    }

    const alreadyJoined = isModerator || isGroupJoinedByUser(group, joinedIds, user, exitedIds);
    setLastListPage("community");
    setActiveGroupId(group.id);
    setExitedIds((ids) => {
      const nextIds = ids.filter((id) => id !== group.id);
      try {
        localStorage.setItem(EXITED_GROUPS_KEY, JSON.stringify(nextIds));
      } catch {}
      return nextIds;
    });

    if (!alreadyJoined) {
      await persistGroupJoin(group.id, user.id);
    }

    let nextGroup = alreadyJoined ? normalizeGroup(group) : normalizeGroup({ ...group, memberCount: Number(group.memberCount || 0) + 1 });
    const { data } = await supabase
      .from("community_groups")
      .select("id,name,description,type,location,member_count,created_by")
      .eq("id", group.id)
      .single();

    if (data) nextGroup = rowToGroup(data);

    setGroups((items) => mergeGroups(items, [nextGroup]));
    setJoinedIds((ids) => {
      const nextIds = ids.includes(group.id) ? ids : [...ids, group.id];
      try {
        localStorage.setItem(JOINED_GROUPS_KEY, JSON.stringify(nextIds));
      } catch {}
      return nextIds;
    });
    setPending(null);

    return nextGroup;
  }

  async function createGroupFromDirectory(groupDraft) {
    if (!user?.id) {
      requestCreateGroup();
      return null;
    }

    const cleanName = String(groupDraft?.name || "").trim();
    if (!cleanName) throw new Error("Group name is required.");
    if (groupNameExists(groups, cleanName)) throw new Error("Group already present. Choose a different name.");

    const type = groupDraft?.type === "School" || groupDraft?.type === "City" ? groupDraft.type : "Custom";
    const nextId = `custom-${slugify(cleanName)}-${Date.now()}`;
    const description =
      String(groupDraft?.description || "").trim() ||
      `${type === "City" ? "City" : type === "School" ? "University" : "Community"} group for ${cleanName}.`;

    const { data, error } = await supabase
      .from("community_groups")
      .insert({
        id: nextId,
        name: cleanName,
        description,
        type,
        location: String(groupDraft?.location || "").trim() || null,
        created_by: user.id,
      })
      .select("id,name,description,type,location,member_count,created_by")
      .single();

    if (error) throw error;

    await persistGroupJoin(data.id, user.id);

    const refreshed = await supabase
      .from("community_groups")
      .select("id,name,description,type,location,member_count,created_by")
      .eq("id", data.id)
      .single();

    const nextGroup = rowToGroup(refreshed.data || data);
    setGroups((items) => {
      const nextGroups = mergeGroups(items, [nextGroup]);
      try {
        const customGroups = nextGroups.filter((item) => item.type === "Custom" || item.id.startsWith("custom-"));
        localStorage.setItem(CUSTOM_GROUPS_KEY, JSON.stringify(customGroups));
      } catch {}
      return nextGroups;
    });
    setJoinedIds((ids) => {
      const nextIds = ids.includes(nextGroup.id) ? ids : [...ids, nextGroup.id];
      try {
        localStorage.setItem(JOINED_GROUPS_KEY, JSON.stringify(nextIds));
      } catch {}
      return nextIds;
    });
    setExitedIds((ids) => {
      const nextIds = ids.filter((id) => id !== nextGroup.id);
      try {
        localStorage.setItem(EXITED_GROUPS_KEY, JSON.stringify(nextIds));
      } catch {}
      return nextIds;
    });
    setPending(null);
    setActiveGroupId(nextGroup.id);

    return nextGroup;
  }

  async function createGroup(group) {
    if (groupNameExists(groups, group?.name || "")) {
      showCommunityToast("A group with that name already exists. Open the existing group or choose another name.", "Group already exists");
      return;
    }

    let nextGroup = normalizeGroup({ ...group, memberCount: 1, createdBy: user?.id });
    if (user) {
      const { data, error } = await supabase
        .from("community_groups")
        .insert({
          id: nextGroup.id,
          name: nextGroup.name,
          description: nextGroup.description,
          type: nextGroup.type,
          location: nextGroup.location || null,
          created_by: user.id,
        })
        .select("id,name,description,type,location,member_count,created_by")
        .single();

      if (error) {
        showCommunityToast(error.message || "Unable to create this group right now.", "Create group failed");
        return;
      }

      if (!error && data) {
        nextGroup = normalizeGroup({ ...rowToGroup(data), memberCount: 1 });
      }
      await persistGroupJoin(nextGroup.id, user.id).catch(() => {});
    }

    setGroups((items) => {
      const nextGroups = mergeGroups(items, [nextGroup]);
      try {
        const customGroups = nextGroups.filter((item) => item.type === "Custom" || item.id.startsWith("custom-"));
        localStorage.setItem(CUSTOM_GROUPS_KEY, JSON.stringify(customGroups));
      } catch {}
      return nextGroups;
    });
    setJoinedIds((ids) => {
      const nextIds = ids.includes(nextGroup.id) ? ids : [...ids, nextGroup.id];
      try {
        localStorage.setItem(JOINED_GROUPS_KEY, JSON.stringify(nextIds));
      } catch {}
      return nextIds;
    });
    setExitedIds((ids) => {
      const nextIds = ids.filter((id) => id !== nextGroup.id);
      try {
        localStorage.setItem(EXITED_GROUPS_KEY, JSON.stringify(nextIds));
      } catch {}
      return nextIds;
    });
    setActiveGroupId(nextGroup.id);
    setPage("dashboard");
    window.scrollTo(0, 0);
  }

  function toggleMuteGroup(groupId) {
    setMutedIds((currentIds) => {
      const nextIds = currentIds.includes(groupId)
        ? currentIds.filter((id) => id !== groupId)
        : [...currentIds, groupId];
      try {
        localStorage.setItem(MUTED_GROUPS_KEY, JSON.stringify(nextIds));
      } catch {}
      return nextIds;
    });
    setUnreadByGroup((current) => {
      if (!current[groupId]) return current;
      const next = { ...current };
      delete next[groupId];
      try {
        localStorage.setItem(UNREAD_GROUPS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  async function exitGroup(group) {
    if (!user?.id || !group?.id) return;
    const confirmed = window.confirm(`Exit ${group.name}?`);
    if (!confirmed) return;

    const { error } = await supabase.rpc("leave_community_group", { target_group_id: group.id });
    if (error) {
      console.warn("Unable to leave group in Supabase; removing locally instead.", error.message);
    }

    const nextJoinedIds = joinedIds.filter((id) => id !== group.id);
    setJoinedIds((ids) => {
      const nextIds = ids.filter((id) => id !== group.id);
      try {
        localStorage.setItem(JOINED_GROUPS_KEY, JSON.stringify(nextIds));
      } catch {}
      return nextIds;
    });
    setExitedIds((ids) => {
      const nextIds = ids.includes(group.id) ? ids : [...ids, group.id];
      try {
        localStorage.setItem(EXITED_GROUPS_KEY, JSON.stringify(nextIds));
      } catch {}
      return nextIds;
    });
    setMutedIds((ids) => {
      const nextIds = ids.filter((id) => id !== group.id);
      try {
        localStorage.setItem(MUTED_GROUPS_KEY, JSON.stringify(nextIds));
      } catch {}
      return nextIds;
    });
    setUnreadByGroup((current) => {
      const next = { ...current };
      delete next[group.id];
      try {
        localStorage.setItem(UNREAD_GROUPS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

    setGroups((items) =>
      items.map((item) =>
        item.id === group.id
          ? { ...item, memberCount: Math.max(0, Number(item.memberCount || 0) - 1) }
        : item
      )
    );

    const fallbackGroup = groups.find((item) => item.id !== group.id && isGroupJoinedByUser(item, nextJoinedIds, user, [...exitedIds, group.id]));
    setActiveGroupId(fallbackGroup?.id || null);
    setPage(page === "dashboard" ? "dashboard" : lastListPage || "community");
  }

  const unreadTotal = Object.values(unreadByGroup).reduce((sum, value) => sum + Number(value || 0), 0);

  const content =
    page === "auth" && !user ? (
      <AuthPanel pending={pending} onAuthed={handleAuthed} onCancel={showCommunity} />
    ) : page === "create" && user ? (
      <CreateGroupPage groups={groups} onBack={() => setPage(lastListPage)} onCreate={createGroup} />
    ) : page === "dashboard" && user ? (
      <CommunityDesign
        initialPage="dashboard"
        groups={dashboardJoinedGroups}
        activeGroupId={activeGroupId}
        user={user}
        isModerator={isModerator}
        moderatorEmails={moderatorEmails}
        savedModeratorEmails={savedModeratorEmails}
        onModeratorEmailsChange={updateModeratorEmails}
        onSelectGroup={(group) => setActiveGroupId(group.id)}
        onBrowse={showCommunity}
        onCreateGroup={requestCreateGroup}
        onOpenSettings={() => setProfileSettingsOpen(true)}
        onSignOut={signOut}
        onExitGroup={(groupId) => {
          const group = groups.find((item) => item.id === groupId);
          if (group) exitGroup(group);
        }}
      />
    ) : page === "chat" && activeGroup ? (
      <ChatPage
        groups={groups}
        group={activeGroup}
        joined={Boolean(user && (isModerator || isGroupJoinedByUser(activeGroup, joinedIds, user, exitedIds)))}
        joinedIds={user ? joinedIds : []}
        user={user}
        onBack={showCommunity}
        onJoin={(group) => continueGroupAction(group, "join", Boolean(user))}
        onSelectGroup={(group) => setActiveGroupId(group.id)}
        isMuted={mutedIds.includes(activeGroup.id)}
        mutedIds={mutedIds}
        unreadByGroup={unreadByGroup}
        onToggleMute={toggleMuteGroup}
        onExitGroup={exitGroup}
        onDashboard={showDashboard}
        onBrowse={showCommunity}
        onCreateGroup={requestCreateGroup}
        onOpenSettings={() => setProfileSettingsOpen(true)}
        onSignOut={signOut}
        unreadTotal={unreadTotal}
      />
    ) : (
      <AllGroupsDesign
        user={user}
        groups={groups}
        joinedIds={user ? joinedIds : []}
        exitedIds={exitedIds}
        isModerator={isModerator}
        onAuthRequired={handleDirectoryAuthRequired}
        onSignOut={signOut}
        onJoinGroup={joinGroupFromDirectory}
        onCreateGroup={createGroupFromDirectory}
        onOpenGroup={openGroupInDashboard}
        onOpenDashboard={openDirectoryDashboard}
        onOpenSettings={() => setProfileSettingsOpen(true)}
      />
    );
  const fullBleed = page === "chat" || page === "community" || page === "dashboard";
  const embeddedCommunityHeader = !startsOnDashboard && (page === "dashboard" || page === "chat");

  return (
    <main style={{ minHeight: embeddedCommunityHeader ? "100vh" : page === "chat" ? "calc(100vh - 70px)" : "100vh", background: C.page, color: C.text }}>
      {embeddedCommunityHeader ? <Nav user={user} onCommunityClick={showCommunity} /> : null}
      <div style={{ width: fullBleed ? "100%" : "min(1180px,100%)", margin: "0 auto", padding: fullBleed ? (embeddedCommunityHeader ? "70px 0 0" : 0) : "0 clamp(18px,4vw,40px) 64px" }}>
        {content}
      </div>
      <CommunityToast toast={toast} chromeOffset={chromeOffset} onClose={() => setToast(null)} />
      {profileSettingsOpen && user ? (
        <ProfileSettingsModal
          user={user}
          onClose={() => setProfileSettingsOpen(false)}
          onUserUpdate={setUser}
          onAccountDeleted={() => {
            setUser(null);
            setPending(null);
            setJoinedIds([]);
            setActiveGroupId(null);
            setProfileSettingsOpen(false);
          }}
        />
      ) : null}
    </main>
  );
}
