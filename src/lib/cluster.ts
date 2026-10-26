// Systemic-failure clustering. Pure core (groupCases/isSystemic) plus a DB wrapper
// (recluster) that upserts the `clusters` table and links member cases.
import { db } from "@/lib/db";

export interface ClusterInput {
  id: string;
  category: string;
  geohash6: string | null;
  created_at: string;
  status: string;
  overdue: boolean;
  locality?: string | null;
}

const OVERDUE_STATUSES = new Set(["overdue", "rti_ready", "rti_filed", "appeal_ready", "appeal_filed", "second_appeal_ready"]);

export function isOverdueStatus(status: string): boolean {
  return OVERDUE_STATUSES.has(status);
}

export function groupCases(cases: ClusterInput[], windowDays: number, now: Date): Map<string, ClusterInput[]> {
  const m = new Map<string, ClusterInput[]>();
  for (const c of cases) {
    if (!c.geohash6 || c.category === "other") continue;
    if ((now.getTime() - new Date(c.created_at).getTime()) / 86400000 > windowDays) continue;
    const k = `${c.category}|${c.geohash6}`;
    const arr = m.get(k);
    if (arr) arr.push(c);
    else m.set(k, [c]);
  }
  return m;
}

export function isSystemic(group: ClusterInput[], t: { cases: number; overdue: number }): boolean {
  return group.length >= t.cases || group.filter((g) => g.overdue).length >= t.overdue;
}

export async function recluster(packId: string, windowDays: number, threshold: { cases: number; overdue: number }): Promise<{ clusters: number; systemic: number }> {
  const supa = db();
  const { data: rows } = await supa
    .from("cases")
    .select("id, category, geohash6, created_at, status, facts")
    .eq("pack", packId)
    .not("geohash6", "is", null);

  const inputs: ClusterInput[] = (rows ?? []).map((r) => ({
    id: r.id,
    category: r.category,
    geohash6: r.geohash6,
    created_at: r.created_at,
    status: r.status,
    overdue: isOverdueStatus(r.status),
    locality: r.facts?.locality ?? null,
  }));

  const groups = groupCases(inputs, windowDays, new Date());
  let systemicCount = 0;

  for (const [key, members] of groups) {
    const [category, geohash6] = key.split("|");
    const systemic = isSystemic(members, threshold);
    if (systemic) systemicCount++;

    const localityCounts = new Map<string, number>();
    for (const m of members) if (m.locality) localityCounts.set(m.locality, (localityCounts.get(m.locality) ?? 0) + 1);
    const locality = [...localityCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    const { data: clusterRow } = await supa
      .from("clusters")
      .upsert(
        {
          pack: packId,
          category,
          geohash6,
          locality,
          status: systemic ? "systemic" : "watching",
          case_count: members.length,
          overdue_count: members.filter((m) => m.overdue).length,
          first_seen: members.map((m) => m.created_at.slice(0, 10)).sort()[0],
          last_seen: members.map((m) => m.created_at.slice(0, 10)).sort().slice(-1)[0],
        },
        { onConflict: "pack,category,geohash6" }
      )
      .select("id")
      .single();

    if (clusterRow) {
      await supa
        .from("cases")
        .update({ cluster_id: clusterRow.id })
        .in(
          "id",
          members.map((m) => m.id)
        );
    }
  }

  return { clusters: groups.size, systemic: systemicCount };
}
