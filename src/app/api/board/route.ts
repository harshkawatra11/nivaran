// GET: ward accountability board data. Per-authority open/overdue scorecards plus the
// list of clusters (watching and systemic), for the map and list view.
import { NextResponse } from "next/server";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { getPack } from "@/lib/packs/index";
import { isOverdueStatus } from "@/lib/cluster";

export async function GET() {
  await connection(); // board data is always live; never prerender this at build time
  const supa = db();
  const pack = getPack("in-dl");

  const { data: cases } = await supa.from("cases").select("status, jurisdiction, created_at").eq("pack", "in-dl");
  const { data: clusters } = await supa.from("clusters").select("*").eq("pack", "in-dl").order("case_count", { ascending: false });

  const byAuthority = new Map<string, { name: string; open: number; overdue: number; daysSum: number; daysCount: number }>();
  const now = Date.now();
  for (const c of cases ?? []) {
    const authorityId = (c.jurisdiction as any)?.authority?.id;
    if (!authorityId) continue;
    const authority = pack.authorities.find((a) => a.id === authorityId);
    if (!authority) continue;
    if (c.status === "resolved" || c.status === "failed") continue;

    const entry = byAuthority.get(authorityId) ?? { name: authority.name, open: 0, overdue: 0, daysSum: 0, daysCount: 0 };
    entry.open++;
    if (isOverdueStatus(c.status)) entry.overdue++;
    entry.daysSum += Math.floor((now - new Date(c.created_at).getTime()) / 86400000);
    entry.daysCount++;
    byAuthority.set(authorityId, entry);
  }

  const scorecards = [...byAuthority.entries()]
    .map(([id, v]) => ({ authorityId: id, name: v.name, open: v.open, overdue: v.overdue, medianDaysOpen: v.daysCount ? Math.round(v.daysSum / v.daysCount) : 0 }))
    .sort((a, b) => b.overdue - a.overdue);

  return NextResponse.json({ scorecards, clusters: clusters ?? [] });
}
