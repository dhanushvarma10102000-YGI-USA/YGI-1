"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Bell,
  BellOff,
  ChevronLeft,
  ChevronRight,
  Check,
  Copy,
  Globe2,
  GraduationCap,
  Hash,
  Image as ImageIcon,
  Lock,
  LogOut,
  Mail,
  Megaphone,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Pin,
  Search,
  Send,
  Settings,
  Smile,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";

type IconComponent = React.ComponentType<{ size?: number; style?: React.CSSProperties }>;

type Channel = {
  id: string;
  icon: IconComponent;
  label: string;
};

type JoinedGroup = {
  id: string;
  label: string;
  sub: string;
  memberCount?: number;
};

type CommunityDesignGroup = {
  id: string;
  name?: string;
  label?: string;
  location?: string;
  sub?: string;
  type?: string;
  memberCount?: number;
};

type GroupMember = {
  user_id: string;
  display_name: string;
  avatar_url?: string | null;
  role: string;
  joined_at?: string;
};

type CommunityDesignUser = {
  id?: string | null;
  email?: string | null;
  user_metadata?: Record<string, string | undefined> | null;
  app_metadata?: Record<string, string | boolean | undefined> | null;
};

type LocalMessage = {
  id: string;
  body: string;
  authorName?: string;
  fileName?: string;
  imageName?: string;
  imageUrl?: string;
  createdAt: string;
  createdAtMs: number;
  editedAt?: string;
};

type Member = {
  name: string;
  short: string;
  presence?: Presence;
};

type Presence = "online" | "idle" | "offline" | null;

const theme = {
  app: "#eef0f6",
  sidebar: "#ffffff",
  panel: "#ffffff",
  header: "#ffffff",
  composer: "#f4f5fa",
  ink: "#1a1d29",
  ink2: "#5a6072",
  muted: "#8a90a2",
  faint: "#aeb3c2",
  line: "#eaecf3",
  accent: "#4f46e5",
  accentHover: "#4338ca",
  accentSoft: "#eef0ff",
  onAccent: "#ffffff",
  activeBg: "#f0f1ff",
  hover: "#f5f6fb",
  logoGrad: "linear-gradient(150deg,#4f46e5,#7c73f0)",
  radius: 16,
  glow: "rgba(79,70,229,.28)",
};

const channels: Channel[] = [
  { id: "general", icon: Hash, label: "General" },
  { id: "announcements", icon: Megaphone, label: "Announcements" },
];

const MESSAGE_EDIT_WINDOW_MS = 2 * 60 * 1000;
const CLEARED_MESSAGES_KEY = "ygiu_cleared_messages";

const fallbackJoinedGroups: JoinedGroup[] = [
  { id: "gcu", label: "Grand Canyon University", sub: "Phoenix, Arizona", memberCount: 3 },
  { id: "asu", label: "Arizona State University", sub: "Tempe, Arizona", memberCount: 3 },
  { id: "uoa", label: "University of Arizona", sub: "Tucson, Arizona", memberCount: 3 },
];

const emojiList = "😀 😃 😄 😁 😆 😅 😂 🙂 🙃 😉 😊 😇 🥰 😍 🤩 😘 😗 😚 😋 😛 😜 🤪 🤗 🤔 🤭 🤫 😎 🥳 😏 😐 😬 🙄 😴 🤤 😮 😲 😢 😭 😤 😡 🤯 😳 🥺 😱 👋 🤚 ✋ 🖐️ 👌 🤌 🤏 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 👇 👍 👎 👊 🤝 🙏 💪 🫶 ❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💯 ✨ ⭐ 🔥 🎉 🎓 📚 📝 💡 📌 📣 ✅ ❌ ⚠️ 🌎 🏫 🏙️ 🏠 ✈️ 🚗 🍕 ☕ 🍜 🎧 💻 📱".split(" ");

const members: Member[] = [
  { name: "Priya Nair", short: "PI", presence: "online" },
  { name: "Marcus Bell", short: "ME", presence: "online" },
  { name: "Sofia Romero", short: "SR", presence: "idle" },
];

const avatarColors = [
  ["#4f46e5", "#a5b4fc"],
  ["#0e7490", "#67e8f9"],
  ["#b45309", "#fcd34d"],
  ["#9333ea", "#d8b4fe"],
  ["#15803d", "#86efac"],
  ["#be123c", "#fda4af"],
  ["#1d4ed8", "#93c5fd"],
  ["#0f766e", "#5eead4"],
];

function avatarHash(name: string) {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) | 0;
  }
  return Math.abs(hash) % avatarColors.length;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function groupSubLabel(group: CommunityDesignGroup) {
  if (group.location) return group.location;
  if (group.sub) return group.sub;
  if (group.type === "City") return "City group";
  if (group.type === "School") return "University";
  return "Community group";
}

function mapJoinedGroups(groups?: CommunityDesignGroup[]) {
  if (!groups) return fallbackJoinedGroups;
  if (!groups.length) return [];
  return [...groups]
    .map((group) => ({
      id: group.id,
      label: group.name || group.label || "Community group",
      sub: groupSubLabel(group),
      memberCount: Number(group.memberCount || 0),
    }))
    .sort((left, right) => left.label.localeCompare(right.label, undefined, { sensitivity: "base" }));
}

function normalizeEmail(value: string) {
  return String(value || "").trim().toLowerCase();
}

function uniqueEmails(values?: string[]) {
  return Array.from(
    new Set(
      (values || [])
        .map(normalizeEmail)
        .filter((email) => email && email.includes("@"))
    )
  );
}

function displayName(user?: CommunityDesignUser | null) {
  return user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || "Student";
}

function Avatar({
  name,
  size = 38,
  presence = null,
  ring = "#fff",
  square = false,
  bg,
  short,
}: {
  name: string;
  size?: number;
  presence?: Presence;
  ring?: string;
  square?: boolean;
  bg?: string;
  short?: string;
}) {
  const [first, second] = avatarColors[avatarHash(name)];
  const presenceColors = { online: "#22c55e", idle: "#f59e0b", offline: "#9ca3af" };
  const dot = presence ? presenceColors[presence] : null;
  const dotSize = Math.max(9, Math.round(size * 0.28));

  return (
    <span style={{ position: "relative", display: "inline-flex", flex: "0 0 auto", width: size, height: size }}>
      <span
        style={{
          width: size,
          height: size,
          borderRadius: square ? Math.round(size * 0.3) : "50%",
          background: bg || `linear-gradient(150deg, ${first}, ${second})`,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: Math.round(size * 0.38),
          letterSpacing: 0,
          boxShadow: ring ? `0 0 0 2px ${ring}` : "none",
          userSelect: "none",
        }}
      >
        {short || initials(name)}
      </span>
      {dot && (
        <span
          className={presence === "online" ? "gc-online" : ""}
          style={{
            position: "absolute",
            right: -1,
            bottom: -1,
            width: dotSize,
            height: dotSize,
            borderRadius: "50%",
            background: dot,
            boxShadow: ring ? `0 0 0 2.5px ${ring}` : "0 0 0 2.5px #fff",
          }}
        />
      )}
    </span>
  );
}

function IconButton({
  children,
  title,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}) {
  return (
    <button
      className="gc-ibtn"
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      style={{
        border: "none",
        background: "transparent",
        color: theme.muted,
        width: 34,
        height: 34,
        borderRadius: 9,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function SectionLabel({ children, action = null }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 6px", margin: "2px 0 6px" }}>
      <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".07em", color: theme.faint, textTransform: "uppercase", whiteSpace: "nowrap" }}>
        {children}
      </span>
      {action}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  children,
  danger = false,
  onClick,
}: {
  icon: IconComponent;
  children: React.ReactNode;
  danger?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}) {
  return (
    <button
      className="gc-menuitem"
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 11,
        width: "100%",
        padding: "9px 10px",
        border: "none",
        background: "transparent",
        borderRadius: 8,
        cursor: "pointer",
        fontFamily: "inherit",
        fontSize: 13.5,
        fontWeight: 650,
        textAlign: "left",
        whiteSpace: "nowrap",
        color: danger ? "#c2453a" : theme.ink2,
      }}
    >
      <Icon size={17} />
      {children}
    </button>
  );
}

function GroupMenu({
  id,
  owned = false,
  muted,
  onToggleMute,
  onCopyLink,
  onClearMessages,
  onExitGroup,
  onClose,
  style,
}: {
  id: string;
  owned?: boolean;
  muted?: boolean;
  onToggleMute: (id: string) => void;
  onCopyLink: (id: string) => void;
  onClearMessages: (id: string) => void;
  onExitGroup?: (id: string) => void;
  onClose: () => void;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className="gc-fade"
      onClick={(event) => event.stopPropagation()}
      style={{
        position: "absolute",
        zIndex: 60,
        minWidth: 212,
        padding: 6,
        borderRadius: 12,
        background: theme.panel,
        border: `1px solid ${theme.line}`,
        boxShadow: "0 16px 38px rgba(20,20,40,.16)",
        ...style,
      }}
    >
      <MenuItem
        icon={Copy}
        onClick={() => {
          onCopyLink(id);
          onClose();
        }}
      >
        Copy group link
      </MenuItem>
      {!owned && (
        <>
          <MenuItem
            icon={muted ? Bell : BellOff}
            onClick={() => {
              onToggleMute(id);
              onClose();
            }}
          >
            {muted ? "Unmute group" : "Mute group"}
          </MenuItem>
          <MenuItem
            icon={Trash2}
            onClick={() => {
              onClearMessages(id);
              onClose();
            }}
          >
            Clear for me
          </MenuItem>
          <div style={{ height: 1, background: theme.line, margin: "5px 6px" }} />
          <MenuItem
            icon={LogOut}
            danger
            onClick={() => {
              onExitGroup?.(id);
              onClose();
            }}
          >
            Exit group
          </MenuItem>
        </>
      )}
    </div>
  );
}

type AccessStatus = "pending" | "allowed" | "blocked";

function AccessButton({
  kind,
  onClick,
  children,
}: {
  kind: "primary" | "ghost" | "danger";
  onClick: () => void;
  children: React.ReactNode;
}) {
  const base: React.CSSProperties = {
    border: "none",
    cursor: "pointer",
    fontFamily: "inherit",
    fontWeight: 700,
    fontSize: 12.5,
    padding: "6px 12px",
    borderRadius: 8,
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
  };
  const styles = {
    primary: { ...base, background: theme.accent, color: theme.onAccent },
    ghost: { ...base, background: "transparent", color: theme.ink2, border: `1px solid ${theme.line}` },
    danger: { ...base, background: "transparent", color: "#c2453a", border: "1px solid #ecc1bd" },
  };

  return (
    <button className="gc-send" type="button" style={styles[kind]} onClick={onClick}>
      {children}
    </button>
  );
}

function AccessPill({ color, icon: Icon, children }: { color: string; icon: IconComponent; children: React.ReactNode }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 700, color, marginRight: 4 }}>
      <Icon size={14} />
      {children}
    </span>
  );
}

function AccessControlBar({
  channelLabel,
  locked,
  onLockedChange,
}: {
  channelLabel: string;
  locked: boolean;
  onLockedChange: (locked: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Record<string, AccessStatus>>(() => {
    const initial: Record<string, AccessStatus> = {};
    members.forEach((member, index) => {
      initial[member.name] = index === 0 ? "allowed" : "pending";
    });
    return initial;
  });
  const pending = members.filter((member) => status[member.name] === "pending").length;

  function setMemberStatus(name: string, nextStatus: AccessStatus) {
    setStatus((items) => ({ ...items, [name]: nextStatus }));
  }

  return (
    <div style={{ padding: "2px 18px 0" }}>
      <div
        className="gc-pill"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 11,
          padding: "9px 10px 9px 13px",
          border: `1px solid ${theme.line}`,
          borderRadius: 12,
          background: theme.composer,
        }}
      >
        <span
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            flex: "0 0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: locked ? theme.accentSoft : theme.hover,
            color: locked ? theme.accent : theme.muted,
          }}
        >
          {locked ? <Pin size={17} /> : <Globe2 size={17} />}
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 750, color: theme.ink, letterSpacing: 0 }}>
            {locked ? `Only the moderator can write in ${channelLabel}` : `Approved members can write in ${channelLabel}`}
          </div>
          <div style={{ fontSize: 12, color: theme.muted, marginTop: 1 }}>
            {locked ? "Moderator access is automatic. Members can read until writing is opened." : `Lock ${channelLabel} again whenever you want it read-only.`}
          </div>
        </div>
        <button
          className="gc-ibtn"
          type="button"
          onClick={() => onLockedChange(!locked)}
          title={locked ? "Unlock writing" : "Lock writing"}
          style={{
            border: `1px solid ${theme.line}`,
            background: "transparent",
            color: locked ? theme.accent : theme.muted,
            height: 32,
            padding: "0 11px",
            borderRadius: 8,
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: 12.5,
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {locked ? <Pin size={14} /> : <Globe2 size={14} />}
          {locked ? "Locked" : "Open"}
        </button>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          style={{
            position: "relative",
            border: "none",
            background: theme.accent,
            color: theme.onAccent,
            height: 32,
            padding: "0 13px",
            borderRadius: 8,
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: 12.5,
            fontWeight: 750,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
          className="gc-send"
        >
          <Users size={15} />
          Manage access
          {pending > 0 && (
            <span style={{ minWidth: 18, height: 18, borderRadius: 9, background: "#fff", color: theme.accent, fontSize: 11, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
              {pending}
            </span>
          )}
        </button>
      </div>

      {open && (
        <div
          className="gc-fade"
          style={{
            marginTop: 7,
            border: `1px solid ${theme.line}`,
            borderRadius: 12,
            background: theme.panel,
            boxShadow: "0 12px 30px rgba(20,20,40,.1)",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "10px 14px", borderBottom: `1px solid ${theme.line}`, fontSize: 11, fontWeight: 800, letterSpacing: ".07em", textTransform: "uppercase", color: theme.faint }}>
            Members · write access
          </div>
          {members.map((member) => {
            const memberStatus = status[member.name];
            return (
              <div key={member.name} className="gc-row" style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 14px" }}>
                <Avatar name={member.name} short={member.short} size={34} presence={member.presence} ring={theme.panel} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 750, color: theme.ink, whiteSpace: "nowrap" }}>{member.name}</span>
                    <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 7px", borderRadius: 6, background: "#eef0ff", color: theme.accent }}>Member</span>
                  </div>
                  <div style={{ fontSize: 12, color: theme.muted, marginTop: 1 }}>
                    {memberStatus === "pending" ? "Requested to write & reply" : memberStatus === "allowed" ? "Can write & reply" : "Blocked from writing"}
                  </div>
                </div>
                {memberStatus === "pending" && (
                  <>
                    <AccessButton kind="primary" onClick={() => setMemberStatus(member.name, "allowed")}>
                      <Check size={14} />
                      Approve
                    </AccessButton>
                    <AccessButton kind="danger" onClick={() => setMemberStatus(member.name, "blocked")}>
                      Block
                    </AccessButton>
                  </>
                )}
                {memberStatus === "allowed" && (
                  <>
                    <AccessPill color="#157f4b" icon={Check}>
                      Allowed
                    </AccessPill>
                    <AccessButton kind="danger" onClick={() => setMemberStatus(member.name, "blocked")}>
                      <BellOff size={13} />
                      Block
                    </AccessButton>
                  </>
                )}
                {memberStatus === "blocked" && (
                  <>
                    <AccessPill color="#c2453a" icon={BellOff}>
                      Blocked
                    </AccessPill>
                    <AccessButton kind="ghost" onClick={() => setMemberStatus(member.name, "allowed")}>
                      Allow
                    </AccessButton>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ChannelRow({ item, active, alert, onClick }: { item: Channel; active: boolean; alert?: boolean; onClick: () => void }) {
  const Icon = item.icon;

  return (
    <button
      className="gc-chan"
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 10px",
        border: "none",
        borderRadius: 9,
        cursor: "pointer",
        background: active ? theme.activeBg : "transparent",
        color: active ? theme.accent : theme.ink2,
        font: "inherit",
        fontWeight: active ? 700 : 600,
        position: "relative",
        textAlign: "left",
      }}
    >
      {active && <span style={{ position: "absolute", left: -12, top: "50%", transform: "translateY(-50%)", width: 3, height: 18, borderRadius: 3, background: theme.accent }} />}
      <Icon size={17} style={{ color: active ? theme.accent : theme.muted }} />
      <span style={{ fontSize: 14, flex: 1 }}>{item.label}</span>
      {alert && (
        <span
          aria-label="New channel update"
          title="New channel update"
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#dc2626",
            boxShadow: "0 0 0 3px #fee2e2",
            flex: "0 0 auto",
          }}
        />
      )}
    </button>
  );
}

function JoinedRow({
  group,
  active,
  muted,
  menuOpen,
  onClick,
  onMenu,
  menu,
}: {
  group: JoinedGroup;
  active: boolean;
  muted?: boolean;
  menuOpen: boolean;
  onClick: () => void;
  onMenu: () => void;
  menu: React.ReactNode;
}) {
  return (
    <button
      className="gc-chan"
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "7px 6px 7px 10px",
        border: "none",
        borderRadius: 9,
        cursor: "pointer",
        background: active ? theme.activeBg : "transparent",
        position: "relative",
        font: "inherit",
        textAlign: "left",
      }}
    >
      {active && <span style={{ position: "absolute", left: -12, top: "50%", transform: "translateY(-50%)", width: 3, height: 18, borderRadius: 3, background: theme.accent }} />}
      <Avatar name={group.label} size={30} square ring={theme.sidebar} />
      <span style={{ minWidth: 0, flex: 1 }}>
        <span style={{ display: "block", fontSize: 13.5, fontWeight: 700, color: active ? theme.accent : theme.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {group.label}
        </span>
        <span style={{ display: "block", fontSize: 11.5, color: theme.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {muted ? "Muted" : group.sub}
        </span>
      </span>
      <span style={{ position: "relative", flex: "0 0 auto" }}>
        <span
          className="gc-rowmore gc-ibtn"
          title="Group options"
          onClick={(event) => {
            event.stopPropagation();
            onMenu();
          }}
          style={{
            opacity: menuOpen ? 1 : undefined,
            color: theme.muted,
            width: 26,
            height: 26,
            borderRadius: 7,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <MoreHorizontal size={16} />
        </span>
        {menu}
      </span>
    </button>
  );
}

export default function CommunityDesign({
  initialPage,
  groups,
  activeGroupId,
  user,
  onSelectGroup,
  onBrowse,
  onOpenSettings,
  onSignOut,
  onExitGroup,
  isModerator = false,
  moderatorEmails = [],
  savedModeratorEmails = [],
  onModeratorEmailsChange,
}: {
  initialPage?: string;
  groups?: CommunityDesignGroup[];
  activeGroupId?: string | null;
  user?: CommunityDesignUser | null;
  onSelectGroup?: (group: JoinedGroup) => void;
  onBrowse?: () => void;
  onCreateGroup?: () => void;
  onOpenSettings?: () => void;
  onSignOut?: () => void;
  onExitGroup?: (groupId: string) => void;
  isModerator?: boolean;
  moderatorEmails?: string[];
  savedModeratorEmails?: string[];
  onModeratorEmailsChange?: (emails: string[]) => void;
} = {}) {
  void initialPage;
  const joinedGroups = useMemo(() => mapJoinedGroups(groups), [groups]);
  const [selectedGroupId, setSelectedGroupId] = useState(activeGroupId || "");
  const [activeChannelId, setActiveChannelId] = useState(activeGroupId ? "" : "general");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [muted, setMuted] = useState<Record<string, boolean>>({});
  const [channelAccessLocked, setChannelAccessLocked] = useState<Record<string, boolean>>({ general: false, announcements: true });
  const [channelAlerts, setChannelAlerts] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [notice, setNotice] = useState<{ id: string; title: string; message: string } | null>(null);
  const [draftMessage, setDraftMessage] = useState("");
  const [draftAttachment, setDraftAttachment] = useState<File | null>(null);
  const [draftImage, setDraftImage] = useState<File | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [localMessages, setLocalMessages] = useState<Record<string, LocalMessage[]>>({});
  const [remoteChannelMessages, setRemoteChannelMessages] = useState<Record<string, LocalMessage[]>>({});
  const [clearedMessages, setClearedMessages] = useState<Record<string, number>>({});
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState("");
  const [moderatorEmailDraft, setModeratorEmailDraft] = useState("");
  const [moderatorEmailError, setModeratorEmailError] = useState("");
  const [memberPanelOpen, setMemberPanelOpen] = useState(false);
  const [memberActionBusy, setMemberActionBusy] = useState("");
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [groupMembersLoading, setGroupMembersLoading] = useState(false);
  const [userGroupRole, setUserGroupRole] = useState<"admin" | "member" | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const messageInputRef = useRef<HTMLInputElement | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const lastActiveGroupIdRef = useRef<string | null | undefined>(undefined);
  const userName = displayName(user);
  const allModeratorEmails = useMemo(() => uniqueEmails(moderatorEmails), [moderatorEmails]);
  const editableModeratorEmails = useMemo(() => uniqueEmails(savedModeratorEmails), [savedModeratorEmails]);

  useEffect(() => {
    if (!openMenu) return undefined;
    const close = () => setOpenMenu(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [openMenu]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(null), 3000);
    return () => window.clearTimeout(timer);
  }, [notice?.id]);

  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
        window.setTimeout(() => searchInputRef.current?.focus(), 0);
      }
    }
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 10000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(CLEARED_MESSAGES_KEY) || "{}");
      if (stored && typeof stored === "object") {
        setClearedMessages(stored as Record<string, number>);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const activeGroupChanged = activeGroupId !== lastActiveGroupIdRef.current;
    if (activeGroupChanged) {
      lastActiveGroupIdRef.current = activeGroupId;
    }

    if (activeGroupChanged && activeGroupId && joinedGroups.some((group) => group.id === activeGroupId)) {
      setSelectedGroupId(activeGroupId);
      setActiveChannelId("");
      return;
    }
    if (!selectedGroupId && !activeChannelId) {
      setActiveChannelId("general");
      return;
    }
    if (selectedGroupId && !joinedGroups.some((group) => group.id === selectedGroupId)) {
      setSelectedGroupId("");
      setActiveChannelId("general");
    }
  }, [activeGroupId, activeChannelId, joinedGroups, selectedGroupId]);

  const selectedGroup = useMemo(() => joinedGroups.find((item) => item.id === selectedGroupId) || null, [selectedGroupId, joinedGroups]);
  const activeChannel = useMemo(() => channels.find((item) => item.id === activeChannelId) || null, [activeChannelId]);
  const activeItem = selectedGroup || activeChannel || channels[0];
  const ActiveIcon = activeChannel?.icon || GraduationCap;
  const isJoined = Boolean(selectedGroup);
  const isChannelRoom = Boolean(activeChannel);
  const isGeneral = activeChannelId === "general";
  const isAnnouncement = activeChannelId === "announcements";
  const isAccessControlledChannel = isChannelRoom && (isGeneral || isAnnouncement);
  const isGroupAdmin = userGroupRole === "admin";
  const activeChannelLocked = isAnnouncement ? true : false;
  // Announcements: global moderator OR group admin (for their specific group)
  const canPostAnnouncement = isModerator || (isGroupAdmin && Boolean(selectedGroupId));
  const composerLocked = isAnnouncement ? !canPostAnnouncement : isGeneral ? !user : false;
  const composerTarget = selectedGroup?.label || activeChannel?.label || "General";
  const activeMessageKey = selectedGroup ? `group:${selectedGroup.id}` : `channel:${activeChannel?.id || "general"}`;
  const activeMuteId = selectedGroup?.id || activeChannel?.id || "general";
  const viewerKey = user?.id || user?.email || "guest";
  const activeClearedKey = `${viewerKey}:${activeMessageKey}`;
  const activeClearedAt = Number(clearedMessages[activeClearedKey] || 0);
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const activeMessages = [
    ...(remoteChannelMessages[activeMessageKey] || []),
    ...(localMessages[activeMessageKey] || []),
  ];
  const visibleMessagesForViewer = activeClearedAt
    ? activeMessages.filter((message) => Number(message.createdAtMs || 0) > activeClearedAt)
    : activeMessages;
  const displayedMessages = normalizedSearch
    ? visibleMessagesForViewer.filter((message) => `${message.body} ${message.fileName || ""} ${message.imageName || ""}`.toLowerCase().includes(normalizedSearch))
    : visibleMessagesForViewer;
  const headerMemberCount = Math.max(Number(selectedGroup?.memberCount || 0), 1);
  const headerMembers = [{ name: userName, short: initials(userName), presence: "online" as Presence }, ...members].slice(0, Math.min(4, headerMemberCount));
  const extraMemberCount = Math.max(0, headerMemberCount - headerMembers.length);
  const isTyping = Boolean(draftMessage.trim()) && !composerLocked;

  useEffect(() => {
    cancelEditMessage();
  }, [activeMessageKey]);

  // Fetch the logged-in user's role in the currently selected group
  useEffect(() => {
    if (!selectedGroupId || !user?.id) { setUserGroupRole(null); return; }
    supabase
      .from("community_memberships")
      .select("role")
      .eq("group_id", selectedGroupId)
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => setUserGroupRole((data?.role as "admin" | "member") || null));
  }, [selectedGroupId, user?.id]);

  useEffect(() => {
    if (!activeChannelId || !["general", "announcements"].includes(activeChannelId)) return;
    const key = `channel:${activeChannelId}`;
    let query = supabase
      .from("community_channel_messages")
      .select("id,channel,author_name,body,media_url,created_at,group_id")
      .eq("channel", activeChannelId)
      .order("created_at", { ascending: true })
      .limit(100);
    if (activeChannelId === "announcements") {
      if (selectedGroupId) {
        query = (query as any).eq("group_id", selectedGroupId);
      } else {
        query = (query as any).is("group_id", null);
      }
    }
    query.then(({ data }) => {
      if (!data) return;
      setRemoteChannelMessages((prev) => ({
        ...prev,
        [key]: data.map((row) => ({
          id: row.id,
          body: row.body,
          authorName: row.author_name || "Admin",
          imageUrl: row.media_url || undefined,
          createdAt: new Date(row.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
          createdAtMs: new Date(row.created_at).getTime(),
        })),
      }));
    });
  }, [activeChannelId, selectedGroupId]);

  function showNotice(title: string, message: string) {
    setNotice({ id: `${Date.now()}-${Math.random()}`, title, message });
  }

  function addModeratorEmail() {
    const email = normalizeEmail(moderatorEmailDraft);
    if (!email || !email.includes("@")) {
      setModeratorEmailError("Enter a valid email.");
      return;
    }
    const nextEmails = uniqueEmails([...editableModeratorEmails, email]);
    onModeratorEmailsChange?.(nextEmails);
    setModeratorEmailDraft("");
    setModeratorEmailError("");
    showNotice("Moderator added", `${email} will have moderator access after login.`);
  }

  function removeModeratorEmail(email: string) {
    const nextEmails = editableModeratorEmails.filter((item) => item !== email);
    onModeratorEmailsChange?.(nextEmails);
    setModeratorEmailError("");
    showNotice("Moderator removed", `${email} was removed from dashboard access.`);
  }

  function toggleMute(groupId: string) {
    const cleanGroupId = groupId.split(":")[0];
    const label = joinedGroups.find((group) => group.id === cleanGroupId)?.label || channels.find((channel) => channel.id === cleanGroupId)?.label || "Group";
    setMuted((items) => {
      const nextMuted = !items[cleanGroupId];
      showNotice(nextMuted ? "Notifications muted" : "Notifications on", `${label} notifications ${nextMuted ? "are muted" : "are on"}.`);
      return { ...items, [cleanGroupId]: nextMuted };
    });
  }

  function copyGroupLink(groupId: string) {
    const cleanGroupId = groupId.split(":")[0];
    const isChannel = channels.some((channel) => channel.id === cleanGroupId);
    const url = isChannel
      ? `${window.location.origin}/community/dashboard`
      : `${window.location.origin}/community/${encodeURIComponent(cleanGroupId)}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
    showNotice("Link copied", "The group link is ready to share.");
  }

  function messageKeyForItem(itemId: string) {
    if (itemId.includes(":")) return itemId;
    if (channels.some((channel) => channel.id === itemId)) return `channel:${itemId}`;
    return `group:${itemId}`;
  }

  function clearMessages(groupId: string) {
    const messageKey = messageKeyForItem(groupId);
    const clearedKey = `${viewerKey}:${messageKey}`;
    const nextClearedAt = Date.now();
    setClearedMessages((items) => {
      const nextItems = { ...items, [clearedKey]: nextClearedAt };
      try {
        localStorage.setItem(CLEARED_MESSAGES_KEY, JSON.stringify(nextItems));
      } catch {}
      return nextItems;
    });
    cancelEditMessage();
    showNotice("Cleared for you", "Messages were hidden only from your view.");
  }

  function exitCurrentGroup(groupId: string) {
    const cleanGroupId = groupId.split(":")[0];
    if (onExitGroup) {
      onExitGroup(cleanGroupId);
      return;
    }
    showNotice("Exit group", "Exit group is connected when the app provides membership access.");
  }

  function canEditMessage(message: LocalMessage) {
    return Number.isFinite(message.createdAtMs) && nowMs - message.createdAtMs <= MESSAGE_EDIT_WINDOW_MS;
  }

  function beginEditMessage(message: LocalMessage) {
    if (!canEditMessage(message)) {
      showNotice("Edit expired", "Messages can only be edited for 2 minutes.");
      return;
    }
    setEditingMessageId(message.id);
    setEditingDraft(message.body);
  }

  function cancelEditMessage() {
    setEditingMessageId(null);
    setEditingDraft("");
  }

  async function fetchGroupMembers(groupId: string) {
    setGroupMembersLoading(true);
    const { data } = await supabase
      .from("community_memberships")
      .select("user_id,display_name,avatar_url,role,joined_at")
      .eq("group_id", groupId)
      .order("joined_at", { ascending: true });
    setGroupMembers(data || []);
    setGroupMembersLoading(false);
  }

  async function moderateSetRole(member: GroupMember, role: "member" | "admin") {
    if (!selectedGroupId) return;
    setMemberActionBusy(`${member.user_id}:role`);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      await fetch("/api/community/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "set_role", group_id: selectedGroupId, user_id: member.user_id, role }),
      });
      await fetchGroupMembers(selectedGroupId);
    } finally {
      setMemberActionBusy("");
    }
  }

  async function moderateRemove(member: GroupMember) {
    if (!selectedGroupId || !window.confirm(`Remove ${member.display_name} from this group?`)) return;
    setMemberActionBusy(`${member.user_id}:remove`);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      await fetch("/api/community/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "remove", group_id: selectedGroupId, user_id: member.user_id }),
      });
      await fetchGroupMembers(selectedGroupId);
    } finally {
      setMemberActionBusy("");
    }
  }

  function saveEditedMessage(message: LocalMessage) {
    if (!canEditMessage(message)) {
      cancelEditMessage();
      showNotice("Edit expired", "Messages can only be edited for 2 minutes.");
      return;
    }
    const body = editingDraft.trim();
    if (!body && !message.fileName && !message.imageName) {
      showNotice("Message empty", "Add text before saving the edit.");
      return;
    }
    setLocalMessages((items) => ({
      ...items,
      [activeMessageKey]: (items[activeMessageKey] || []).map((item) =>
        item.id === message.id
          ? {
              ...item,
              body,
              editedAt: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
            }
          : item
      ),
    }));
    cancelEditMessage();
  }

  async function sendMessage() {
    if (composerLocked) {
      showNotice("Read only", `${activeChannel?.label || "This room"} is locked until writing access is opened.`);
      return;
    }
    const body = draftMessage.trim();
    if (!body && !draftAttachment && !draftImage) {
      showNotice("Write a message", "Add a message or attachment before sending.");
      messageInputRef.current?.focus();
      return;
    }

    // Persist channel messages to Supabase
    // General: any logged-in user; Announcements: moderators only
    const canSaveToChannel = isChannelRoom && user && ((isGeneral) || (isAnnouncement && canPostAnnouncement));
    if (canSaveToChannel && (body || draftImage)) {
      (async () => {
        let mediaUrl: string | undefined;
        if (draftImage) {
          const safeName = draftImage.name.replace(/[^a-zA-Z0-9._-]/g, "_");
          const uid = (user.id || "anon").replace(/[^a-zA-Z0-9]/g, "").slice(0, 16);
          const path = `channels/${activeChannelId}/${uid}-${Date.now()}-${safeName}`;
          const { error: uploadErr } = await supabase.storage
            .from("community-media")
            .upload(path, draftImage, { upsert: false });
          if (!uploadErr) {
            const { data: urlData } = supabase.storage.from("community-media").getPublicUrl(path);
            mediaUrl = urlData.publicUrl;
          }
        }
        const row: Record<string, unknown> = {
          channel: activeChannelId,
          body: body || "",
          author_name: userName,
        };
        if (isAnnouncement && selectedGroupId) row.group_id = selectedGroupId;
        if (mediaUrl) row.media_url = mediaUrl;
        supabase.from("community_channel_messages").insert(row).then(({ error }) => {
          if (!error) {
            const key = `channel:${activeChannelId}`;
            const newMsg: LocalMessage = {
              id: `remote-${Date.now()}-${Math.random()}`,
              body: body || "",
              authorName: userName,
              imageUrl: mediaUrl,
              createdAt: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
              createdAtMs: Date.now(),
            };
            setRemoteChannelMessages((prev) => ({
              ...prev,
              [key]: [...(prev[key] || []), newMsg],
            }));
          }
        });
      })();
    }

    setLocalMessages((items) => ({
      ...items,
      [activeMessageKey]: [
        ...(items[activeMessageKey] || []),
        {
          id: `${Date.now()}-${Math.random()}`,
          body,
          authorName: isModerator ? userName : undefined,
          fileName: draftAttachment?.name,
          imageName: draftImage?.name,
          createdAt: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
          createdAtMs: Date.now(),
        },
      ],
    }));
    if (isModerator && activeChannel?.id) {
      setChannelAlerts((items) => ({ ...items, [activeChannel.id]: true }));
    }
    setDraftMessage("");
    setDraftAttachment(null);
    setDraftImage(null);
    setEmojiOpen(false);
  }

  return (
    <main
      className="gc-root"
      style={{
        width: "100%",
        height: "calc(100dvh - 70px)",
        maxHeight: "calc(100dvh - 70px)",
        minHeight: 0,
        display: "flex",
        background: theme.app,
        color: theme.ink,
        fontFamily: 'var(--gc-font, "Geist", ui-sans-serif, system-ui, sans-serif)',
        overflow: "hidden",
      }}
    >
      <style>{`
        .gc-root *{box-sizing:border-box}
        .gc-row{transition:background .14s ease}
        .gc-row:hover{background:${theme.hover}}
        .gc-chan{transition:background .14s ease,color .14s ease}
        .gc-chan:hover{background:${theme.hover}!important}
        .gc-ibtn{transition:background .14s ease,color .14s ease,transform .14s ease}
        .gc-ibtn:hover{background:${theme.hover};color:${theme.ink}}
        .gc-ibtn:active{transform:scale(.92)}
        .gc-send{transition:transform .16s cubic-bezier(.2,.7,.3,1),box-shadow .16s,filter .16s}
        .gc-send:hover{transform:translateY(-1px);filter:brightness(1.05);box-shadow:0 8px 20px ${theme.glow}}
        .gc-send:active{transform:translateY(0) scale(.97)}
        .gc-pill{transition:border-color .15s,box-shadow .15s,background .15s}
        .gc-pill:hover{border-color:${theme.accent}55}
        .gc-fade{animation:gcFade .5s cubic-bezier(.2,.7,.3,1) both}
        .gc-menuitem:hover{background:${theme.hover}!important}
        .gc-rowmore{opacity:0;transition:opacity .14s ease}
        .gc-chan:hover .gc-rowmore{opacity:1}
        .gc-typing-dot{animation:gcTyping 1s infinite ease-in-out}
        .gc-typing-dot:nth-child(2){animation-delay:.14s}
        .gc-typing-dot:nth-child(3){animation-delay:.28s}
        .gc-sidebar{position:relative;transition:width .2s ease,flex-basis .2s ease,padding .2s ease}
        .gc-sidebar-body{min-height:0;display:flex;flex-direction:column;flex:1}
        .gc-browse-home{width:100%;min-height:38px;border:1px solid ${theme.line};border-radius:10px;background:#fff;color:${theme.ink2};font:inherit;font-size:13.5px;font-weight:750;display:flex;align-items:center;gap:9px;padding:0 10px;cursor:pointer;margin-bottom:14px;transition:background .14s ease,color .14s ease,border-color .14s ease,box-shadow .14s ease}
        .gc-browse-home:hover{background:${theme.hover};color:${theme.ink};border-color:#dfe2f4;box-shadow:0 12px 26px -22px rgba(20,20,40,.5)}
        .gc-sidebar-toggle-shell{position:absolute;top:50%;right:-15px;z-index:110;width:30px;height:30px;display:flex;align-items:center;justify-content:center;transform:translateY(-50%)}
        .gc-sidebar-toggle{width:30px!important;height:30px!important;display:inline-flex;align-items:center;justify-content:center;border:1px solid ${theme.line}!important;border-radius:999px!important;background:rgba(255,255,255,.98)!important;color:${theme.faint}!important;cursor:pointer;box-shadow:0 10px 24px -18px rgba(20,20,40,.75)!important;transition:background .14s ease,border-color .14s ease,color .14s ease,box-shadow .14s ease,transform .14s ease}
        .gc-sidebar-toggle:hover{background:#fff!important;border-color:#dfe2f4!important;color:${theme.accent}!important;box-shadow:0 14px 30px -18px rgba(79,70,229,.55)!important}
        .gc-sidebar-toggle:active{transform:scale(.95)}
        .gc-mobile-backdrop{display:none}
        .gc-message-scroll{scrollbar-width:thin}
        @keyframes gcFade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        @keyframes gcTyping{0%,80%,100%{opacity:.3;transform:translateY(0)}40%{opacity:1;transform:translateY(-3px)}}
        @keyframes gcPulse{0%{box-shadow:0 0 0 0 rgba(34,197,94,.5)}70%{box-shadow:0 0 0 5px transparent}100%{box-shadow:0 0 0 0 transparent}}
        .gc-online{animation:gcPulse 2.4s ease-out infinite}
        @media (prefers-reduced-motion: reduce){.gc-fade,.gc-online{animation:none!important}}
        @media (max-width: 980px){
          .gc-header-title{min-width:0!important;flex:1 1 auto!important}
          .gc-header-actions{display:none!important}
          .gc-searchbox{width:min(230px,38vw)!important;min-width:150px!important}
        }
        @media (max-width: 760px){
          .gc-root{height:calc(100dvh - 70px)!important;min-height:calc(100dvh - 70px)!important;overflow:hidden!important;flex-direction:row!important;position:relative}
          .gc-sidebar{position:absolute!important;inset:0 auto 0 0!important;z-index:90;width:min(292px,82vw)!important;flex:0 0 min(292px,82vw)!important;border-right:1px solid ${theme.line}!important;border-bottom:0!important;background:#fff!important;box-shadow:18px 0 50px -34px rgba(20,20,40,.55)!important;padding:14px 12px 12px!important;max-height:none!important}
          .gc-sidebar-collapsed{width:0!important;flex-basis:0!important;min-height:0!important;padding:0!important;border-right:0!important;background:transparent!important;box-shadow:none!important;overflow:visible!important}
          .gc-sidebar-open .gc-sidebar-toggle-shell{top:50%!important;right:-15px!important;left:auto!important}
          .gc-sidebar-collapsed .gc-sidebar-toggle-shell{position:absolute!important;top:12px!important;left:12px!important;right:auto!important;width:34px!important;height:34px!important;z-index:96!important;margin:0!important;transform:none!important}
          .gc-sidebar-collapsed .gc-sidebar-toggle{width:34px!important;height:34px!important;border-radius:999px!important;box-shadow:0 16px 34px -22px rgba(20,20,40,.75)!important}
          .gc-mobile-backdrop{display:block;position:absolute;inset:0;z-index:70;border:0;background:rgba(15,23,42,.18);backdrop-filter:blur(1px);padding:0}
          .gc-main{min-height:calc(100dvh - 70px)!important;width:100%!important;flex:1 1 auto!important}
          .gc-sidebar-collapsed + .gc-main{padding-left:0!important}
          .gc-sidebar-collapsed + .gc-main header{padding-left:64px!important}
          .gc-header-actions{gap:4px!important}
          .gc-member-count{display:none!important}
        }
        @media (max-width: 560px){
          .gc-main header{height:auto!important;min-height:64px!important;align-items:flex-start!important;padding:12px!important;gap:9px!important}
          .gc-searchbox{order:8;width:100%!important;min-width:0!important}
          .gc-message-panel{padding:16px!important}
          .gc-composer-wrap{padding:8px 12px 12px!important}
          .gc-composer-inner{align-items:stretch!important;flex-wrap:wrap!important}
          .gc-composer-tools{width:100%;justify-content:flex-end}
        }
      `}</style>
      {notice && (
        <aside
          className="gc-fade"
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            top: 88,
            right: 22,
            zIndex: 140,
            width: "min(340px,calc(100vw - 32px))",
            border: `1px solid ${theme.line}`,
            borderRadius: 14,
            background: "rgba(255,255,255,.96)",
            boxShadow: "0 18px 46px rgba(20,20,40,.16)",
            backdropFilter: "blur(14px)",
            padding: 13,
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          <span style={{ width: 30, height: 30, borderRadius: 10, background: theme.accentSoft, color: theme.accent, display: "grid", placeItems: "center", flexShrink: 0 }}>
            <Check size={16} />
          </span>
          <span style={{ minWidth: 0, flex: 1 }}>
            <span style={{ display: "block", color: theme.ink, fontSize: 13.5, fontWeight: 800 }}>{notice.title}</span>
            <span style={{ display: "block", color: theme.muted, fontSize: 12.5, lineHeight: 1.4, marginTop: 2 }}>{notice.message}</span>
          </span>
        </aside>
      )}

      <aside
        className={`gc-sidebar ${sidebarOpen ? "gc-sidebar-open" : "gc-sidebar-collapsed"}`}
        style={{
          width: sidebarOpen ? 264 : 58,
          flex: `0 0 ${sidebarOpen ? 264 : 58}px`,
          background: theme.sidebar,
          borderRight: `1px solid ${theme.line}`,
          display: "flex",
          flexDirection: "column",
          padding: sidebarOpen ? "16px 12px 12px" : "12px 8px",
          overflow: "visible",
        }}
      >
        <div className="gc-sidebar-toggle-shell">
          <button
            type="button"
            className="gc-sidebar-toggle"
            onClick={() => setSidebarOpen((value) => !value)}
            aria-expanded={sidebarOpen}
            aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>

        {sidebarOpen && (
          <div className="gc-sidebar-body">
            <button type="button" className="gc-browse-home" onClick={onBrowse}>
              <Globe2 size={16} />
              Community
            </button>
            <SectionLabel>Channels</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 1, marginBottom: 18 }}>
              {channels.map((channel) => (
                <ChannelRow
                  key={channel.id}
                  item={channel}
                  active={!selectedGroup && activeChannelId === channel.id}
                  alert={Boolean(channelAlerts[channel.id])}
                  onClick={() => {
                    setSelectedGroupId("");
                    setActiveChannelId(channel.id);
                    setChannelAlerts((items) => ({ ...items, [channel.id]: false }));
                  }}
                />
              ))}
            </div>

            <SectionLabel>{isModerator ? "All groups" : "Joined"} · {joinedGroups.length}</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 1, marginBottom: 8 }}>
              {joinedGroups.map((group) => (
                <JoinedRow
                  key={group.id}
                  group={group}
                  active={selectedGroupId === group.id}
                  muted={muted[group.id]}
                  menuOpen={openMenu === group.id}
                  onClick={() => {
                    setSelectedGroupId(group.id);
                    setActiveChannelId("");
                    onSelectGroup?.(group);
                  }}
                  onMenu={() => setOpenMenu(openMenu === group.id ? null : group.id)}
                  menu={
                    openMenu === group.id ? (
                      <GroupMenu
                        id={group.id}
                        muted={muted[group.id]}
                        onToggleMute={toggleMute}
                        onCopyLink={copyGroupLink}
                        onClearMessages={clearMessages}
                        onExitGroup={exitCurrentGroup}
                        onClose={() => setOpenMenu(null)}
                        style={{ top: 30, right: 0 }}
                      />
                    ) : null
                  }
                />
              ))}
              {!joinedGroups.length && <div style={{ color: theme.faint, fontSize: 12.5, padding: "8px 10px" }}>{isModerator ? "No groups found." : "No joined groups yet."}</div>}
            </div>

            {isModerator && (
              <div style={{ borderTop: `1px solid ${theme.line}`, marginTop: 10, paddingTop: 12, display: "grid", gap: 8 }}>
                <SectionLabel>Moderators</SectionLabel>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    addModeratorEmail();
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    minHeight: 38,
                    border: `1px solid ${theme.line}`,
                    borderRadius: 10,
                    background: theme.hover,
                    padding: "0 6px 0 9px",
                  }}
                >
                  <Mail size={15} style={{ color: theme.muted, flex: "0 0 auto" }} />
                  <input
                    value={moderatorEmailDraft}
                    onChange={(event) => {
                      setModeratorEmailDraft(event.target.value);
                      if (moderatorEmailError) setModeratorEmailError("");
                    }}
                    placeholder="email@domain.com"
                    style={{
                      minWidth: 0,
                      flex: 1,
                      border: "none",
                      outline: "none",
                      background: "transparent",
                      color: theme.ink,
                      font: "inherit",
                      fontSize: 12.5,
                    }}
                  />
                  <button
                    type="submit"
                    title="Add moderator"
                    aria-label="Add moderator"
                    className="gc-ibtn"
                    style={{
                      width: 28,
                      height: 28,
                      border: "none",
                      borderRadius: 8,
                      background: "#fff",
                      color: theme.accent,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      flex: "0 0 auto",
                    }}
                  >
                    <UserPlus size={15} />
                  </button>
                </form>
                {moderatorEmailError && <div style={{ color: "#c2453a", fontSize: 11.5, fontWeight: 700, padding: "0 6px" }}>{moderatorEmailError}</div>}
                <div style={{ display: "grid", gap: 5 }}>
                  {allModeratorEmails.length ? (
                    allModeratorEmails.slice(0, 6).map((email) => {
                      const editable = editableModeratorEmails.includes(email);
                      return (
                        <div key={email} style={{ minWidth: 0, minHeight: 28, display: "flex", alignItems: "center", gap: 7, borderRadius: 8, background: "#fff", border: `1px solid ${theme.line}`, padding: "0 7px" }}>
                          <span style={{ minWidth: 0, flex: 1, color: theme.ink2, fontSize: 11.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email}</span>
                          {editable ? (
                            <button
                              type="button"
                              title="Remove moderator"
                              aria-label={`Remove ${email}`}
                              className="gc-ibtn"
                              onClick={() => removeModeratorEmail(email)}
                              style={{ width: 22, height: 22, border: "none", borderRadius: 7, background: "transparent", color: theme.muted, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flex: "0 0 auto" }}
                            >
                              <X size={13} />
                            </button>
                          ) : (
                            <span style={{ color: theme.faint, fontSize: 10.5, fontWeight: 800, flex: "0 0 auto" }}>ENV</span>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ color: theme.faint, fontSize: 12.5, lineHeight: 1.45, padding: "2px 6px" }}>Add trusted moderator emails here.</div>
                  )}
                  {allModeratorEmails.length > 6 && <div style={{ color: theme.faint, fontSize: 11.5, padding: "0 6px" }}>+{allModeratorEmails.length - 6} more</div>}
                </div>
              </div>
            )}

            <div style={{ flex: 1 }} />

            <div style={{ borderTop: `1px solid ${theme.line}`, marginTop: 10, paddingTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
              <Avatar name={userName} size={34} presence="online" ring={theme.sidebar} bg="linear-gradient(150deg,#3fa85f,#7ee089)" />
              <span style={{ minWidth: 0, flex: 1 }}>
                <span style={{ display: "block", fontSize: 13.5, fontWeight: 750, color: theme.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{userName}</span>
                <span style={{ display: "block", fontSize: 12, color: theme.muted }}>Active now</span>
              </span>
              <IconButton title="Settings" onClick={onOpenSettings || (() => showNotice("Settings", "Profile settings are available from your account menu."))}>
                <Settings size={17} />
              </IconButton>
              <IconButton title="Logout" onClick={onSignOut || (() => showNotice("Logout", "Logout is available from your account menu."))}>
                <LogOut size={17} />
              </IconButton>
            </div>
          </div>
        )}
      </aside>

      {sidebarOpen && (
        <button
          type="button"
          className="gc-mobile-backdrop"
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <section className="gc-main" style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", background: theme.panel }}>
        <header
          style={{
            height: 64,
            flex: "0 0 64px",
            borderBottom: `1px solid ${theme.line}`,
            display: "flex",
            alignItems: "center",
            padding: "0 18px",
            gap: 12,
            background: theme.header,
          }}
        >
          {isJoined ? (
            <Avatar name={activeItem.label} size={38} square ring={theme.header} />
          ) : (
            <span style={{ width: 38, height: 38, borderRadius: 11, background: theme.accentSoft, color: theme.accent, display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto" }}>
              <ActiveIcon size={20} />
            </span>
          )}
          <div className="gc-header-title" style={{ minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <span style={{ fontWeight: 800, fontSize: 16, color: theme.ink, letterSpacing: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{activeItem.label}</span>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: theme.muted, background: theme.hover, border: `1px solid ${theme.line}`, padding: "2px 8px", borderRadius: 6, whiteSpace: "nowrap" }}>{isJoined ? "Group" : "Channel"}</span>
              {isModerator && <span style={{ fontSize: 11.5, fontWeight: 700, color: "#047857", background: "#ecfdf5", border: "1px solid #bbf7d0", padding: "2px 8px", borderRadius: 6, whiteSpace: "nowrap" }}>Moderator</span>}
              {muted[activeMuteId] && <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 700, color: theme.muted, background: theme.hover, border: `1px solid ${theme.line}`, padding: "2px 8px", borderRadius: 6, whiteSpace: "nowrap" }}><BellOff size={12} />Muted</span>}
            </div>
            {selectedGroup && <div style={{ fontSize: 12.5, color: theme.faint, whiteSpace: "nowrap", marginTop: 1 }}>{selectedGroup.sub}</div>}
          </div>

          <div style={{ flex: 1 }} />

          <div className="gc-header-actions" style={{ display: "flex", alignItems: "center", gap: 9, marginRight: 4 }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              {headerMembers.map((member, index) => (
                <span key={member.name} style={{ marginLeft: index ? -9 : 0, borderRadius: "50%", boxShadow: `0 0 0 2px ${theme.header}` }}>
                  <Avatar name={member.name} short={member.short} size={28} ring={theme.header} />
                </span>
              ))}
              {extraMemberCount > 0 && (
                <span style={{ marginLeft: -9, width: 28, height: 28, borderRadius: "50%", background: theme.hover, color: theme.ink2, boxShadow: `0 0 0 2px ${theme.header}`, display: "grid", placeItems: "center", fontSize: 11, fontWeight: 800 }}>
                  +{extraMemberCount}
                </span>
              )}
            </div>
            {isModerator && selectedGroup ? (
              <button
                onClick={() => {
                  setMemberPanelOpen((v) => {
                    if (!v) fetchGroupMembers(selectedGroup.id);
                    return !v;
                  });
                }}
                style={{ background: memberPanelOpen ? theme.accentSoft : "transparent", border: memberPanelOpen ? `1px solid ${theme.accent}` : "1px solid transparent", borderRadius: 8, padding: "3px 9px", cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: memberPanelOpen ? theme.accent : theme.muted, whiteSpace: "nowrap" }}
              >
                <Users size={13} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
                {headerMemberCount} members
              </button>
            ) : (
              <span className="gc-member-count" style={{ fontSize: 12.5, fontWeight: 700, color: theme.muted, whiteSpace: "nowrap" }}>{headerMemberCount} members</span>
            )}
          </div>

          {searchOpen || searchQuery ? (
            <div
              className="gc-pill gc-searchbox"
              style={{
                width: "min(260px,28vw)",
                minWidth: 180,
                height: 38,
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "0 9px",
                borderRadius: 11,
                background: theme.app,
                border: `1px solid ${theme.line}`,
              }}
            >
              <Search size={16} style={{ color: theme.muted }} />
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search messages"
                style={{
                  minWidth: 0,
                  flex: 1,
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  color: theme.ink,
                  font: "inherit",
                  fontSize: 13,
                }}
              />
              <button
                type="button"
                className="gc-ibtn"
                title="Close search"
                aria-label="Close search"
                onClick={() => {
                  setSearchQuery("");
                  setSearchOpen(false);
                }}
                style={{ border: "none", background: "transparent", width: 26, height: 26, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", color: theme.muted, cursor: "pointer" }}
              >
                <X size={15} />
              </button>
            </div>
          ) : (
            <IconButton
              title="Search in room"
              onClick={() => {
                setSearchOpen(true);
                window.setTimeout(() => searchInputRef.current?.focus(), 0);
              }}
            >
              <Search size={18} />
            </IconButton>
          )}
          <span style={{ position: "relative" }}>
            <IconButton title="More" onClick={(event) => {
              event.stopPropagation();
              setOpenMenu(openMenu === "header" ? null : "header");
            }}>
              <MoreHorizontal size={18} />
            </IconButton>
            {openMenu === "header" && (
              <GroupMenu
                id={selectedGroup ? selectedGroup.id : activeChannel?.id || "general"}
                owned={!isJoined}
                muted={muted[activeMuteId]}
                onToggleMute={toggleMute}
                onCopyLink={copyGroupLink}
                onClearMessages={clearMessages}
                onExitGroup={exitCurrentGroup}
                onClose={() => setOpenMenu(null)}
                style={{ top: 42, right: 0 }}
              />
            )}
          </span>
        </header>

        {/* ── Announcements group filter bar ── */}
        {isAnnouncement && (
          <div style={{ padding: "8px 18px", borderBottom: `1px solid ${theme.line}`, background: theme.sidebar, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: theme.muted, whiteSpace: "nowrap" }}>Viewing announcements for:</span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button
                onClick={() => setSelectedGroupId("")}
                style={{ fontSize: 12, fontWeight: 700, padding: "4px 11px", borderRadius: 7, border: `1px solid ${!selectedGroupId ? theme.accent : theme.line}`, background: !selectedGroupId ? theme.accentSoft : "transparent", color: !selectedGroupId ? theme.accent : theme.muted, cursor: "pointer" }}
              >
                Global
              </button>
              {joinedGroups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setSelectedGroupId(g.id)}
                  style={{ fontSize: 12, fontWeight: 700, padding: "4px 11px", borderRadius: 7, border: `1px solid ${selectedGroupId === g.id ? theme.accent : theme.line}`, background: selectedGroupId === g.id ? theme.accentSoft : "transparent", color: selectedGroupId === g.id ? theme.accent : theme.muted, cursor: "pointer" }}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="gc-message-panel" style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", padding: 24, display: "flex", alignItems: displayedMessages.length ? "stretch" : "center", justifyContent: displayedMessages.length ? "flex-start" : "center" }}>
          {displayedMessages.length ? (
            <div className="gc-fade" style={{ width: "100%", maxWidth: 820, margin: "0 auto", display: "grid", alignContent: "start", gap: 14 }}>
              {displayedMessages.map((message) => {
                const editing = editingMessageId === message.id;
                const editable = canEditMessage(message);

                return (
                  <article key={message.id} style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
                    <Avatar name={message.authorName || userName} size={34} ring={theme.panel} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ color: theme.ink, fontSize: 13.5, fontWeight: 800 }}>{message.authorName || userName}</span>
                        <span style={{ color: theme.faint, fontSize: 12 }}>{message.createdAt}</span>
                        {message.editedAt && <span style={{ color: theme.faint, fontSize: 11.5, fontWeight: 700 }}>edited</span>}
                        {editable && !editing && (
                          <button
                            type="button"
                            className="gc-ibtn"
                            onClick={() => beginEditMessage(message)}
                            style={{
                              border: `1px solid ${theme.line}`,
                              background: "#fff",
                              color: theme.muted,
                              height: 24,
                              padding: "0 7px",
                              borderRadius: 7,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              fontFamily: "inherit",
                              fontSize: 11.5,
                              fontWeight: 750,
                              cursor: "pointer",
                            }}
                          >
                            <Pencil size={12} />
                            Edit
                          </button>
                        )}
                      </div>
                      <div style={{ marginTop: 5, display: "inline-grid", gap: 7, width: editing ? "min(620px,100%)" : undefined, maxWidth: "min(620px,100%)", border: `1px solid ${theme.line}`, borderRadius: 13, background: "#fff", padding: "10px 12px", color: theme.ink2, fontSize: 14, lineHeight: 1.5 }}>
                        {editing ? (
                          <div style={{ display: "grid", gap: 8 }}>
                            <input
                              autoFocus
                              value={editingDraft}
                              onChange={(event) => setEditingDraft(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  saveEditedMessage(message);
                                }
                                if (event.key === "Escape") {
                                  event.preventDefault();
                                  cancelEditMessage();
                                }
                              }}
                              style={{
                                width: "100%",
                                minHeight: 34,
                                border: `1px solid ${theme.line}`,
                                borderRadius: 9,
                                outline: "none",
                                background: theme.composer,
                                color: theme.ink,
                                font: "inherit",
                                fontSize: 14,
                                padding: "7px 9px",
                              }}
                            />
                            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                              <button
                                type="button"
                                className="gc-send"
                                onClick={() => saveEditedMessage(message)}
                                style={{
                                  border: "none",
                                  background: theme.accent,
                                  color: theme.onAccent,
                                  height: 30,
                                  padding: "0 10px",
                                  borderRadius: 8,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 5,
                                  fontFamily: "inherit",
                                  fontSize: 12.5,
                                  fontWeight: 800,
                                  cursor: "pointer",
                                }}
                              >
                                <Check size={14} />
                                Save
                              </button>
                              <button
                                type="button"
                                className="gc-ibtn"
                                onClick={cancelEditMessage}
                                style={{
                                  border: `1px solid ${theme.line}`,
                                  background: "#fff",
                                  color: theme.ink2,
                                  height: 30,
                                  padding: "0 10px",
                                  borderRadius: 8,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 5,
                                  fontFamily: "inherit",
                                  fontSize: 12.5,
                                  fontWeight: 800,
                                  cursor: "pointer",
                                }}
                              >
                                <X size={14} />
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          message.body && <span>{message.body}</span>
                        )}
                        {message.fileName && <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: theme.accent, fontWeight: 750 }}><Paperclip size={14} /> {message.fileName}</span>}
                        {message.imageUrl && (
                          <img
                            src={message.imageUrl}
                            alt="Shared image"
                            style={{ display: "block", maxWidth: "min(100%, 420px)", maxHeight: 320, borderRadius: 10, marginTop: 6, objectFit: "contain", cursor: "pointer" }}
                            onClick={() => window.open(message.imageUrl, "_blank")}
                          />
                        )}
                        {message.imageName && !message.imageUrl && <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: theme.accent, fontWeight: 750 }}><ImageIcon size={14} /> {message.imageName}</span>}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="gc-fade" style={{ textAlign: "center", maxWidth: 360 }}>
              <div
                style={{
                  width: 74,
                  height: 74,
                  borderRadius: 22,
                  margin: "0 auto 18px",
                  background: theme.accentSoft,
                  color: theme.accent,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: `0 10px 30px ${theme.glow}`,
                }}
              >
                {isJoined ? <GraduationCap size={34} /> : <ActiveIcon size={34} />}
              </div>
              <div style={{ fontSize: 18.5, fontWeight: 800, color: theme.ink, letterSpacing: 0, marginBottom: 7 }}>
                {normalizedSearch ? "No messages found" : `Welcome to ${activeItem.label}`}
              </div>
              <div style={{ fontSize: 14, color: theme.muted, lineHeight: 1.65 }}>
                {normalizedSearch
                  ? "Try a different search in this conversation."
                  : selectedGroup
                    ? "This is the start of the group conversation."
                    : isGeneral
                    ? "General is open for everyone — say hello, ask questions, or share tips."
                    : isAnnouncement && selectedGroupId
                    ? `No announcements for ${joinedGroups.find((g) => g.id === selectedGroupId)?.label || "this group"} yet.`
                    : "No global announcements yet. Only moderators can post here."}
              </div>
            </div>
          )}
        </div>

        {isTyping && (
          <div style={{ padding: isAccessControlledChannel ? "7px 18px 0" : "0 18px 6px", minHeight: 25, display: "flex", alignItems: "center", gap: 7, color: theme.muted, fontSize: 12.5, fontWeight: 700 }}>
            <span>{userName} is typing</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
              {[0, 1, 2].map((dot) => (
                <span key={dot} className="gc-typing-dot" style={{ width: 5, height: 5, borderRadius: "50%", background: theme.accent, display: "inline-block" }} />
              ))}
            </span>
          </div>
        )}

        <div className="gc-composer-wrap" style={{ padding: isAccessControlledChannel ? "8px 18px 18px" : "6px 18px 18px" }}>
          {composerLocked ? (
            <div
              className="gc-pill gc-composer-inner"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 11,
                background: theme.composer,
                border: `1px solid ${theme.line}`,
                borderRadius: theme.radius,
                padding: "12px 14px",
                color: theme.muted,
              }}
            >
              <span style={{ width: 32, height: 32, borderRadius: 9, background: theme.accentSoft, color: theme.accent, display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto" }}>
                <Lock size={17} />
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ color: theme.ink2, fontSize: 14, fontWeight: 750 }}>{isAnnouncement ? "Announcements are restricted" : "Sign in to participate"}</div>
                <div style={{ color: theme.muted, fontSize: 12.5, marginTop: 2 }}>
                  {isAnnouncement
                    ? selectedGroupId
                      ? "Only group admins and moderators can post here."
                      : "Only moderators can post global announcements."
                    : "Log in to send messages in General."}
                </div>
              </div>
            </div>
          ) : (
            <div
              className="gc-pill"
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: 8,
                background: theme.composer,
                border: `1px solid ${theme.line}`,
                borderRadius: theme.radius,
                padding: "8px 8px 8px 14px",
              }}
            >
              <div style={{ flex: 1, minWidth: 0, display: "grid", gap: draftAttachment || draftImage ? 6 : 0 }}>
                {(draftAttachment || draftImage) && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", paddingTop: 3 }}>
                    {draftAttachment && <span style={{ display: "inline-flex", alignItems: "center", gap: 5, maxWidth: "100%", border: `1px solid ${theme.line}`, borderRadius: 8, background: "#fff", color: theme.ink2, fontSize: 12.5, fontWeight: 700, padding: "4px 7px" }}><Paperclip size={13} /> {draftAttachment.name}</span>}
                    {draftImage && <span style={{ display: "inline-flex", alignItems: "center", gap: 5, maxWidth: "100%", border: `1px solid ${theme.line}`, borderRadius: 8, background: "#fff", color: theme.ink2, fontSize: 12.5, fontWeight: 700, padding: "4px 7px" }}><ImageIcon size={13} /> {draftImage.name}</span>}
                  </div>
                )}
                <input
                  ref={messageInputRef}
                  value={draftMessage}
                  onChange={(event) => setDraftMessage(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder={`Message ${composerTarget}`}
                  style={{
                    width: "100%",
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    color: theme.ink,
                    font: "inherit",
                    fontSize: 14.5,
                    padding: "9px 2px",
                    lineHeight: 1.4,
                  }}
                />
              </div>
              <div className="gc-composer-tools" style={{ display: "flex", alignItems: "center", gap: 2, paddingBottom: 2 }}>
                <input
                  ref={attachmentInputRef}
                  type="file"
                  style={{ display: "none" }}
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    setDraftAttachment(file);
                    if (file) showNotice("File attached", file.name);
                    event.target.value = "";
                  }}
                />
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    setDraftImage(file);
                    if (file) showNotice("Image attached", file.name);
                    event.target.value = "";
                  }}
                />
                <button type="button" className="gc-ibtn" onClick={() => attachmentInputRef.current?.click()} style={{ border: "none", background: "transparent", width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: theme.muted, cursor: "pointer" }}>
                  <Paperclip size={18} />
                </button>
                <button type="button" className="gc-ibtn" onClick={() => imageInputRef.current?.click()} style={{ border: "none", background: "transparent", width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: theme.muted, cursor: "pointer" }}>
                  <ImageIcon size={18} />
                </button>
                <span style={{ position: "relative", display: "inline-flex" }}>
                  <button type="button" className="gc-ibtn" onClick={() => setEmojiOpen((value) => !value)} style={{ border: "none", background: "transparent", width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: theme.muted, cursor: "pointer" }}>
                    <Smile size={18} />
                  </button>
                  {emojiOpen && (
                    <div
                      className="gc-fade"
                      style={{
                        position: "absolute",
                        right: 0,
                        bottom: 40,
                        zIndex: 80,
                        width: 292,
                        maxHeight: 240,
                        overflowY: "auto",
                        border: `1px solid ${theme.line}`,
                        borderRadius: 14,
                        background: "#fff",
                        boxShadow: "0 18px 46px rgba(20,20,40,.16)",
                        padding: 8,
                        display: "grid",
                        gridTemplateColumns: "repeat(8,1fr)",
                        gap: 3,
                      }}
                    >
                      {emojiList.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            setDraftMessage((value) => `${value}${value ? " " : ""}${emoji}`);
                            setEmojiOpen(false);
                            messageInputRef.current?.focus();
                          }}
                          style={{
                            height: 30,
                            border: "none",
                            borderRadius: 8,
                            background: "transparent",
                            cursor: "pointer",
                            fontSize: 18,
                            lineHeight: 1,
                          }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </span>
                <button
                  className="gc-send"
                  type="button"
                  onClick={sendMessage}
                  style={{
                    marginLeft: 6,
                    height: 38,
                    padding: "0 16px",
                    borderRadius: 10,
                    border: "none",
                    cursor: "pointer",
                    background: theme.accent,
                    color: theme.onAccent,
                    fontWeight: 750,
                    fontSize: 14,
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    fontFamily: "inherit",
                  }}
                >
                  <Send size={17} />
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Moderator member panel ── */}
      {isModerator && memberPanelOpen && selectedGroup && (
        <aside style={{ width: 280, flexShrink: 0, background: theme.sidebar, borderLeft: `1px solid ${theme.line}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "16px 16px 10px", borderBottom: `1px solid ${theme.line}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: theme.ink }}>Members</span>
            <button onClick={() => setMemberPanelOpen(false)} style={{ width: 28, height: 28, borderRadius: 7, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: theme.muted }}>
              <X size={16} />
            </button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
            {groupMembersLoading && (
              <div style={{ padding: "24px 16px", textAlign: "center", color: theme.muted, fontSize: 13 }}>Loading…</div>
            )}
            {!groupMembersLoading && groupMembers.map((member) => {
              const isAdmin = member.role === "admin";
              const busy = memberActionBusy.startsWith(member.user_id);
              return (
                <div key={member.user_id} style={{ padding: "10px 14px", borderBottom: `1px solid ${theme.line}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <Avatar name={member.display_name} size={34} ring={theme.sidebar} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 750, color: theme.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{member.display_name}</div>
                      <span style={{ display: "inline-block", marginTop: 2, fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 5, background: isAdmin ? theme.accentSoft : theme.hover, color: isAdmin ? theme.accent : theme.muted }}>{isAdmin ? "Admin" : "Member"}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      disabled={busy}
                      onClick={() => moderateSetRole(member, isAdmin ? "member" : "admin")}
                      style={{ flex: 1, height: 30, border: `1px solid ${theme.line}`, borderRadius: 8, background: theme.hover, color: theme.ink2, fontSize: 12, fontWeight: 700, cursor: busy ? "default" : "pointer", opacity: busy ? 0.5 : 1 }}
                    >
                      {isAdmin ? "Remove admin" : "Make admin"}
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => moderateRemove(member)}
                      style={{ height: 30, width: 30, border: "1px solid #fecaca", borderRadius: 8, background: "#fff5f5", color: "#ef4444", fontSize: 12, fontWeight: 700, cursor: busy ? "default" : "pointer", opacity: busy ? 0.5 : 1, display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
            {!groupMembersLoading && !groupMembers.length && (
              <div style={{ padding: "24px 16px", textAlign: "center", color: theme.muted, fontSize: 13 }}>No members yet.</div>
            )}
          </div>
        </aside>
      )}
    </main>
  );
}
