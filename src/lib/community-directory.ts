import { PRESET_GROUPS, type CommunityGroup } from "@/lib/community-groups";

type CommunityGroupRow = {
  id: string;
  name: string;
  description?: string | null;
  type?: "School" | "City" | "Custom" | string | null;
  location?: string | null;
  member_count?: number | null;
  created_by?: string | null;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function headers() {
  if (!SUPABASE_URL || !SUPABASE_ANON) return null;
  return {
    apikey: SUPABASE_ANON,
    Authorization: `Bearer ${SUPABASE_ANON}`,
  };
}

function normalizeGroupType(value?: string | null): CommunityGroup["type"] {
  if (value === "School" || value === "City" || value === "Custom") return value;
  return "Custom";
}

function rowToGroup(row: CommunityGroupRow): CommunityGroup {
  return {
    id: row.id,
    name: row.name,
    description: row.description || "",
    type: normalizeGroupType(row.type),
    location: row.location || undefined,
    memberCount: Number(row.member_count || 0),
    createdBy: row.created_by || undefined,
    messages: [],
  };
}

function mergeGroups(groups: CommunityGroup[]) {
  const map = new Map<string, CommunityGroup>();
  PRESET_GROUPS.forEach((group) => map.set(group.id, group));
  groups.forEach((group) => map.set(group.id, group));
  return Array.from(map.values()).sort((left, right) =>
    left.name.localeCompare(right.name, undefined, { sensitivity: "base" })
  );
}

export async function getCommunityGroups(): Promise<CommunityGroup[]> {
  const authHeaders = headers();
  if (!SUPABASE_URL || !authHeaders) return PRESET_GROUPS;

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/community_groups?select=id,name,description,type,location,member_count,created_by&order=name.asc`,
      {
        headers: authHeaders,
        next: { revalidate: 300 },
      }
    );
    if (!res.ok) return PRESET_GROUPS;
    const data = await res.json();
    return mergeGroups(Array.isArray(data) ? data.map(rowToGroup) : []);
  } catch {
    return PRESET_GROUPS;
  }
}

export async function getCommunityGroupById(groupId: string): Promise<CommunityGroup | null> {
  const localGroup = PRESET_GROUPS.find((group) => group.id === groupId) || null;
  const authHeaders = headers();
  if (!SUPABASE_URL || !authHeaders) return localGroup;

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/community_groups?id=eq.${encodeURIComponent(groupId)}&select=id,name,description,type,location,member_count,created_by&limit=1`,
      {
        headers: authHeaders,
        next: { revalidate: 300 },
      }
    );
    if (!res.ok) return localGroup;
    const data = await res.json();
    return Array.isArray(data) && data[0] ? rowToGroup(data[0]) : localGroup;
  } catch {
    return localGroup;
  }
}
