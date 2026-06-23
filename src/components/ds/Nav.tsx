"use client";

import { ChangeEvent, FormEvent, MouseEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { Image as ImageIcon, LayoutDashboard, LogOut, Menu, Save, Settings, Trash2, User, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { AnimatedBtn, AnimatedBtnOutline } from "./AnimatedGradient";

const PROFILE_PHOTO_BUCKET = "community-media";
const MAX_PROFILE_PHOTO_SIZE = 10 * 1024 * 1024;

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/guide", label: "Guide" },
  { href: "/blog", label: "Blogs" },
  { href: "/community", label: "Community" },
  { href: "/contact", label: "Contact us" },
];

type ProfileMetadata = {
  full_name?: string;
  name?: string;
  avatar_url?: string;
  picture?: string;
  avatar_path?: string;
  university?: string;
  city?: string;
};

function profileMetadata(user: SupabaseUser | null): ProfileMetadata {
  return (user?.user_metadata || {}) as ProfileMetadata;
}

function profileName(user: SupabaseUser | null) {
  const metadata = profileMetadata(user);
  return metadata.full_name || metadata.name || user?.email || "Your profile";
}

function profileInitials(user: SupabaseUser | null) {
  return (
    profileName(user)
      .split(/\s|@/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U"
  );
}

function profileImage(user: SupabaseUser | null) {
  const metadata = profileMetadata(user);
  return metadata.avatar_url || metadata.picture || "";
}

function profilePhotoExtension(file: File) {
  const fromName = file.name.split(".").pop();
  if (fromName) return fromName.toLowerCase();
  if (file.type.includes("png")) return "png";
  if (file.type.includes("jpeg")) return "jpg";
  if (file.type.includes("webp")) return "webp";
  if (file.type.includes("gif")) return "gif";
  return "jpg";
}

async function signedProfilePhotoUrl(path: string) {
  const { data, error } = await supabase.storage
    .from(PROFILE_PHOTO_BUCKET)
    .createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data?.signedUrl || "";
}

function ProfileAvatar({ user }: { user: SupabaseUser | null }) {
  const avatarPath = profileMetadata(user).avatar_path || "";
  const [signedImage, setSignedImage] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (!avatarPath) {
      return;
    }

    signedProfilePhotoUrl(avatarPath)
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

  const image = signedImage || profileImage(user);

  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-[#eef7f5] text-sm font-black text-[#2f8f86] ring-1 ring-[#d5ebe7]">
      {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : profileInitials(user)}
    </span>
  );
}

export function Nav({ user, onCommunityClick }: { user?: SupabaseUser | null; onCommunityClick?: () => void }) {
  const pathname = usePathname();
  const initialMetadata = profileMetadata(user ?? null);
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(user ?? null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [displayName, setDisplayName] = useState(() => initialMetadata.full_name || initialMetadata.name || "");
  const [university, setUniversity] = useState(() => initialMetadata.university || "");
  const [city, setCity] = useState(() => initialMetadata.city || "");
  const [profilePhoto, setProfilePhoto] = useState(() => profileImage(user ?? null));
  const [profilePhotoPath, setProfilePhotoPath] = useState(() => initialMetadata.avatar_path || "");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const profilePhotoInputRef = useRef<HTMLInputElement | null>(null);

  function hydrateProfileForm(nextUser: SupabaseUser | null) {
    const metadata = profileMetadata(nextUser);
    setDisplayName(metadata.full_name || metadata.name || "");
    setUniversity(metadata.university || "");
    setCity(metadata.city || "");
    setProfilePhoto(profileImage(nextUser));
    setProfilePhotoPath(metadata.avatar_path || "");
    setStatus("");
  }

  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        const nextUser = data.session?.user ?? null;
        setCurrentUser(nextUser);
        hydrateProfileForm(nextUser);
        setSessionLoading(false);
      })
      .catch(() => {
        if (mounted) setSessionLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const nextUser = session?.user ?? null;
      setCurrentUser(nextUser);
      hydrateProfileForm(nextUser);
      setSessionLoading(false);
      if (!session?.user) {
        setProfileOpen(false);
        setSettingsOpen(false);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!profileOpen) return;

    function closeOnOutsideClick(event: PointerEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [profileOpen]);

  async function handleLogout() {
    await supabase.auth.signOut();
    try {
      localStorage.removeItem("ygiu_joined_groups");
      localStorage.removeItem("ygiu_pending_group");
      localStorage.removeItem("ygiu_pending_action");
    } catch {}
    setCurrentUser(null);
    hydrateProfileForm(null);
    setOpen(false);
    setProfileOpen(false);
    setSettingsOpen(false);
  }

  function isActiveLink(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname?.startsWith(`${href}/`);
  }

  function handleCommunityNavigate(event: MouseEvent<HTMLAnchorElement>) {
    if (!onCommunityClick) return;
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) return;
    event.preventDefault();
    setOpen(false);
    setProfileOpen(false);
    onCommunityClick();
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentUser || saving) return;

    setSaving(true);
    setStatus("");
    const metadata = profileMetadata(currentUser);
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
    setCurrentUser(data.user);
    hydrateProfileForm(data.user);
    setStatus("Profile settings saved.");
  }

  async function deleteAccount() {
    if (!currentUser || deleting) return;
    const email = currentUser.email || "";
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
    try {
      localStorage.removeItem("ygiu_joined_groups");
      localStorage.removeItem("ygiu_pending_group");
      localStorage.removeItem("ygiu_pending_action");
    } catch {}
    setCurrentUser(null);
    hydrateProfileForm(null);
    setSettingsOpen(false);
    setProfileOpen(false);
    window.location.assign("/");
  }

  async function uploadProfilePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !currentUser || photoUploading) return;

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

    const extension = profilePhotoExtension(file);
    const path = `profile-photos/${currentUser.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from(PROFILE_PHOTO_BUCKET).upload(path, file, {
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
      signedUrl = await signedProfilePhotoUrl(path);
    } catch {
      setStatus("Profile photo uploaded, but preview could not be created. Try again after refreshing.");
      return;
    }
    setProfilePhoto(signedUrl);
    setProfilePhotoPath(path);
    setStatus("Profile photo uploaded. Save settings to keep it.");
  }

  const signedIn = Boolean(currentUser);
  const isCommunityRoute = pathname === "/community" || pathname?.startsWith("/community/");
  const showMyCommunity = signedIn && !isCommunityRoute;
  const profilePhotoPreview = profilePhoto.trim();

  return (
    <>
      <nav className="fixed left-0 right-0 top-0 z-50 bg-white border-b border-[#e8e5de]">
        <div className="mx-auto max-w-[1480px] flex items-center justify-between px-5 py-[18px] sm:px-10">

          {/* Brand */}
          <Link href="/" className="flex items-center gap-[11px] text-[19px] font-bold tracking-[-.02em] text-[#1a1916] shrink-0">
            <span style={{ width: 30, height: 30, borderRadius: 9, background: "conic-gradient(from 200deg,#2f8f86,#7fc9c0,#2f8f86)", display: "grid", placeItems: "center", overflow: "hidden", boxShadow: "0 4px 10px -3px rgba(47,143,134,.6)", flexShrink: 0 }}>
              <img src="/statue-liberty-mark.png" alt="" style={{ width: 22, height: 25, objectFit: "contain", filter: "drop-shadow(0 1px 1px rgba(0,0,0,.18))" }} />
            </span>
            yourguideinusa
          </Link>

          {/* Mobile toggle */}
          <button className="grid h-10 w-10 place-items-center rounded-full border border-[#e8e5de] bg-white text-[#706d65] lg:hidden" onClick={() => setOpen(!open)} aria-label="Toggle navigation">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Desktop nav links */}
          <div className="hidden lg:flex items-center gap-[34px]">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={link.href === "/community" ? handleCommunityNavigate : undefined}
                className={`relative text-[15px] font-[500] transition-colors after:absolute after:left-0 after:-bottom-1.5 after:h-0.5 after:rounded-full after:bg-[#2f8f86] after:transition-all hover:text-[#1a1916] hover:after:w-full ${isActiveLink(link.href) ? "text-[#1a1916] after:w-full" : "text-[#706d65] after:w-0"}`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop tools */}
          <div className="hidden lg:flex items-center gap-[10px]">
            {signedIn ? (
              <>
                {showMyCommunity && (
                  <Link
                    href="/community/dashboard"
                    className="inline-flex h-10 items-center gap-2 rounded-full border border-[#e8e5de] bg-white px-[15px] text-[14px] font-[600] text-[#706d65] transition hover:text-[#1a1916] hover:-translate-y-px hover:shadow-[0_4px_16px_-6px_rgba(0,0,0,.15)] whitespace-nowrap"
                  >
                    <LayoutDashboard className="h-[17px] w-[17px]" /> Dashboard
                  </Link>
                )}
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setProfileOpen((v) => !v)}
                    className="grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-[#e8e5de] bg-white text-[#706d65] transition hover:-translate-y-px hover:shadow-[0_4px_16px_-6px_rgba(0,0,0,.15)]"
                    aria-expanded={profileOpen}
                    aria-label="Open profile menu"
                  >
                    <ProfileAvatar user={currentUser} />
                  </button>
                  {profileOpen && (
                    <div className="absolute right-0 mt-3 w-[310px] overflow-hidden rounded-[18px] border border-[#e8e5de] bg-white shadow-[0_28px_70px_-34px_rgba(30,28,22,.55)]">
                      <div className="flex gap-3 border-b border-[#e8e5de] p-4">
                        <ProfileAvatar user={currentUser} />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-black text-[#1a1916]">{profileName(currentUser)}</div>
                          <div className="truncate text-xs font-medium text-[#706d65]">{currentUser?.email}</div>
                        </div>
                      </div>
                      <div className="grid p-2">
                        <button onClick={() => { setSettingsOpen(true); setProfileOpen(false); }} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-[#38352f] transition hover:bg-[#f6f5f2]">
                          <Settings className="h-4 w-4 text-[#2f8f86]" /> Profile settings
                        </button>
                        <button onClick={handleLogout} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-[#38352f] transition hover:bg-[#f6f5f2]">
                          <LogOut className="h-4 w-4 text-[#9b4e33]" /> Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <button onClick={handleLogout} className="grid h-10 w-10 place-items-center rounded-full border border-[#e8e5de] bg-white text-[#706d65] transition hover:text-[#1a1916] hover:-translate-y-px hover:shadow-[0_4px_16px_-6px_rgba(0,0,0,.15)]" aria-label="Logout">
                  <LogOut className="h-[18px] w-[18px]" />
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="grid h-10 w-10 place-items-center rounded-full border border-[#e8e5de] bg-white text-[#706d65] transition hover:text-[#1a1916] hover:-translate-y-px hover:shadow-[0_4px_16px_-6px_rgba(0,0,0,.15)]" aria-label="Sign in">
                  <User className="h-[18px] w-[18px]" />
                </Link>
                {!sessionLoading && (
                  <AnimatedBtn>
                    <Link href="/signup">Join Free</Link>
                  </AnimatedBtn>
                )}
              </>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="border-t border-[#e8e5de] px-5 pb-4 pt-3 lg:hidden">
            <div className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`block rounded-xl px-3 py-2.5 text-[15px] font-[500] transition hover:bg-[#f6f5f2] hover:text-[#1a1916] ${isActiveLink(link.href) ? "bg-[#f6f5f2] text-[#1a1916]" : "text-[#706d65]"}`}
                  onClick={(event) => {
                    if (link.href === "/community") { handleCommunityNavigate(event); return; }
                    setOpen(false);
                  }}
                >
                  {link.label}
                </Link>
              ))}
            </div>
            {signedIn ? (
              <div className="mt-3 flex flex-col gap-2 border-t border-[#e8e5de] pt-3">
                <div className="flex items-center gap-3 rounded-2xl border border-[#e8e5de] bg-white p-3">
                  <ProfileAvatar user={currentUser} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-black text-[#1a1916]">{profileName(currentUser)}</div>
                    <div className="truncate text-xs font-medium text-[#706d65]">{currentUser?.email}</div>
                  </div>
                </div>
                {showMyCommunity && <AnimatedBtnOutline href="/community/dashboard" className="w-full">My Dashboard</AnimatedBtnOutline>}
                <AnimatedBtnOutline className="w-full" onClick={() => { setSettingsOpen(true); setOpen(false); }}>Profile settings</AnimatedBtnOutline>
                <button onClick={handleLogout} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[13px] border border-[#e8e5de] bg-white px-5 text-sm font-semibold text-[#1a1916]">
                  <LogOut className="h-4 w-4" /> Logout
                </button>
              </div>
            ) : (
              <div className="mt-3 flex flex-col gap-2 border-t border-[#e8e5de] pt-3">
                <AnimatedBtnOutline href="/login" className="w-full">Sign In</AnimatedBtnOutline>
                {!sessionLoading && <AnimatedBtn className="w-full"><Link href="/signup">Join Free</Link></AnimatedBtn>}
              </div>
            )}
          </div>
        )}
      </nav>

      {settingsOpen && signedIn && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#1a1916]/45 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Profile settings">
          <div className="max-h-[92vh] w-full max-w-[560px] overflow-y-auto rounded-[22px] border border-[#e3e1db] bg-[#fbfaf8] shadow-[0_34px_90px_-42px_rgba(0,0,0,.65)]">
            <div className="flex items-start justify-between gap-4 border-b border-[#e3e1db] bg-white p-5">
              <div className="flex min-w-0 gap-3">
                <ProfileAvatar user={currentUser} />
                <div className="min-w-0">
                  <h2 className="m-0 text-xl font-black tracking-[-.02em] text-[#1a1916]">Profile settings</h2>
                  <p className="m-0 mt-1 truncate text-sm text-[#706d65]">{currentUser?.email}</p>
                </div>
              </div>
              <button className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#e3e1db] bg-white text-[#706d65]" onClick={() => setSettingsOpen(false)} aria-label="Close profile settings">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={saveSettings} className="grid gap-5 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-bold text-[#38352f]">
                  Display name
                  <input
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    className="h-12 rounded-[13px] border border-[#ddd8cd] bg-white px-3 text-sm font-medium text-[#1a1916] outline-none transition focus:border-[#2f8f86] focus:ring-4 focus:ring-[#2f8f86]/10"
                    placeholder="Your name"
                  />
                </label>
                <label className="grid gap-2 text-sm font-bold text-[#38352f]">
                  Email address
                  <input value={currentUser?.email || ""} readOnly className="h-12 rounded-[13px] border border-[#ddd8cd] bg-[#f2f0eb] px-3 text-sm font-medium text-[#706d65] outline-none" />
                </label>
                <label className="grid gap-2 text-sm font-bold text-[#38352f]">
                  University
                  <input
                    value={university}
                    onChange={(event) => setUniversity(event.target.value)}
                    className="h-12 rounded-[13px] border border-[#ddd8cd] bg-white px-3 text-sm font-medium text-[#1a1916] outline-none transition focus:border-[#2f8f86] focus:ring-4 focus:ring-[#2f8f86]/10"
                    placeholder="School or university"
                  />
                </label>
                <label className="grid gap-2 text-sm font-bold text-[#38352f]">
                  City
                  <input
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    className="h-12 rounded-[13px] border border-[#ddd8cd] bg-white px-3 text-sm font-medium text-[#1a1916] outline-none transition focus:border-[#2f8f86] focus:ring-4 focus:ring-[#2f8f86]/10"
                    placeholder="Current city"
                  />
                </label>
              </div>

              <div className="rounded-[16px] border border-[#e3e1db] bg-white p-4">
                <div className="text-sm font-black text-[#1a1916]">Profile photo</div>
                <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
                  <span className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full bg-[#eef7f5] text-xl font-black text-[#2f8f86] ring-1 ring-[#d5ebe7]">
                    {profilePhotoPreview ? <img src={profilePhotoPreview} alt="" className="h-full w-full object-cover" /> : profileInitials(currentUser)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="m-0 text-sm font-semibold leading-relaxed text-[#706d65]">
                      Upload a profile photo from your device.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <input ref={profilePhotoInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={uploadProfilePhoto} />
                      <button type="button" onClick={() => profilePhotoInputRef.current?.click()} disabled={photoUploading} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[13px] border border-[#d5ebe7] bg-[#eef7f5] px-3 text-sm font-black text-[#24766d] transition hover:bg-[#e3f2ef] disabled:cursor-not-allowed disabled:opacity-60">
                        <ImageIcon className="h-4 w-4" /> {photoUploading ? "Uploading..." : "Upload photo"}
                      </button>
                      {profilePhotoPreview ? (
                        <button type="button" onClick={() => setProfilePhoto("")} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[13px] border border-[#e3e1db] bg-white px-3 text-sm font-black text-[#706d65] transition hover:bg-[#f6f5f2]">
                          <X className="h-4 w-4" /> Remove
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              {status && (
                <div className={`rounded-[13px] border px-3 py-2 text-sm font-semibold ${status.includes("Unable") || status.includes("error") ? "border-[#f1b8b0] bg-[#fff4f2] text-[#9b2d20]" : "border-[#b8dfd6] bg-[#effaf7] text-[#24766d]"}`}>
                  {status}
                </div>
              )}

              <div className="flex flex-wrap justify-between gap-3 border-t border-[#e3e1db] pt-4">
                <button type="button" onClick={deleteAccount} disabled={deleting} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[13px] border border-[#f0c6bd] bg-white px-4 text-sm font-black text-[#9b2d20] transition hover:bg-[#fff4f2] disabled:cursor-not-allowed disabled:opacity-60">
                  <Trash2 className="h-4 w-4" /> {deleting ? "Deleting..." : "Delete account"}
                </button>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setSettingsOpen(false)} className="min-h-11 rounded-[13px] border border-[#e3e1db] bg-white px-4 text-sm font-black text-[#38352f]">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[13px] bg-[#1a1916] px-5 text-sm font-black text-white shadow-[0_16px_30px_-18px_rgba(0,0,0,.6)] disabled:cursor-not-allowed disabled:opacity-60">
                    <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save settings"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
