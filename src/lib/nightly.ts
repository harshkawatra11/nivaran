// The nightly sweep: advance every open case's ladder, write cheap per-case status digests
// with Nemotron Nano, recluster systemic failures, and refresh Ultra briefs for clusters
// that grew. Called by both the Nebius Serverless Job entry (scripts/nightly.ts) and the
// Vercel cron fallback (/api/cron/nightly).
import { db } from "@/lib/db";
import { getPack } from "@/lib/packs/index";
import { applyLadder } from "@/lib/ladder/apply";
import { recluster } from "@/lib/cluster";
import { chatJson } from "@/lib/llm/json";
import { dbLedger } from "@/lib/llm/ledger";
import { Digest, ClusterBrief } from "@/lib/schemas";
import { DIGEST_SYSTEM, CLUSTER_SYSTEM } from "@/lib/llm/prompts";
import { renderTemplate } from "@/lib/ladder/templates";

export interface NightlySummary {
  swept: number;
  transitions: number;
  digests: number;
  clusters: number;
  systemicClusters: number;
  briefsRefreshed: number;
  errors: string[];
  ms: number;
}

const OPEN_STATUSES = ["filed", "overdue", "rti_filed", "appeal_filed"];

export async function runNightly(opts: { realNow?: Date } = {}): Promise<NightlySummary> {
  const t0 = Date.now();
  const supa = db();
  const now = opts.realNow ?? new Date();
  const summary: NightlySummary = { swept: 0, transitions: 0, digests: 0, clusters: 0, systemicClusters: 0, briefsRefreshed: 0, errors: [], ms: 0 };

  const { data: cases } = await supa.from("cases").select("id, pack").in("status", OPEN_STATUSES);
  for (const c of cases ?? []) {
    try {
      const result = await applyLadder(c.id, now);
      summary.swept++;
      if (result.changed) {
        summary.transitions += result.transitions.length;
        for (const t of result.transitions) {
          try {
            const { data: digest } = await chatJson(
              {
                model: "nano",
                step: "digest",
                thinking: false,
                messages: [
                  { role: "system", content: DIGEST_SYSTEM },
                  { role: "user", content: `Status change: ${t.to}. Details: ${JSON.stringify(t.payload)}` },
                ],
                ledger: dbLedger({ caseId: c.id }),
              },
              Digest,
              "digest"
            );
            await supa.from("case_events").insert({ case_id: c.id, type: "digest", payload: digest });
            summary.digests++;
          } catch (e) {
            summary.errors.push(`digest ${c.id}: ${String((e as Error)?.message ?? e)}`);
          }
        }
      }
    } catch (e) {
      summary.errors.push(`sweep ${c.id}: ${String((e as Error)?.message ?? e)}`);
    }
  }

  const packIds = [...new Set((cases ?? []).map((c) => c.pack))];
  for (const packId of packIds.length ? packIds : ["in-dl"]) {
    try {
      const pack = getPack(packId);
      const { clusters, systemic } = await recluster(packId, pack.systemicThreshold.windowDays, pack.systemicThreshold);
      summary.clusters += clusters;
      summary.systemicClusters += systemic;
    } catch (e) {
      summary.errors.push(`recluster ${packId}: ${String((e as Error)?.message ?? e)}`);
    }
  }

  const { data: systemicClusters } = await supa.from("clusters").select("*").eq("status", "systemic");
  for (const cluster of systemicClusters ?? []) {
    if (cluster.brief && cluster.brief_case_count === cluster.case_count) continue;
    try {
      await refreshClusterBrief(cluster.id);
      summary.briefsRefreshed++;
    } catch (e) {
      summary.errors.push(`brief ${cluster.id}: ${String((e as Error)?.message ?? e)}`);
    }
  }

  summary.ms = Date.now() - t0;
  await db()
    .from("web_cache")
    .upsert({ key: "nightly:last", payload: summary as any, at: new Date().toISOString() });
  return summary;
}

export async function refreshClusterBrief(clusterId: string): Promise<void> {
  const supa = db();
  const { data: cluster } = await supa.from("clusters").select("*").eq("id", clusterId).single();
  if (!cluster) return;

  const { data: members } = await supa.from("cases").select("id, facts, status, created_at, research").eq("cluster_id", clusterId);
  const memberSummaries = (members ?? []).map((m) => ({ id: m.id.slice(0, 8), summary: m.facts?.summary ?? "", status: m.status, since: m.created_at.slice(0, 10) }));
  const deadlinesMissedCount = (
    await supa
      .from("deadlines")
      .select("id", { count: "exact", head: true })
      .in(
        "case_id",
        (members ?? []).map((m) => m.id)
      )
      .eq("status", "missed")
  ).count ?? 0;

  const { data: brief } = await chatJson(
    {
      model: "ultra",
      step: "cluster_brief",
      messages: [
        { role: "system", content: CLUSTER_SYSTEM },
        { role: "user", content: `Category: ${cluster.category}\nLocality: ${cluster.locality ?? "unknown"}\nMembers: ${JSON.stringify(memberSummaries)}\nMissed deadlines so far: ${deadlinesMissedCount}` },
      ],
      ledger: dbLedger({ clusterId }),
    },
    ClusterBrief,
    "cluster_brief"
  );

  // Code correction: trust the computed count over the model's count.
  const corrected = { ...brief, deadlinesMissed: deadlinesMissedCount, caveats: brief.deadlinesMissed !== deadlinesMissedCount ? [...brief.caveats, "count corrected by code"] : brief.caveats };

  await supa.from("clusters").update({ brief: corrected, brief_case_count: cluster.case_count, brief_updated_at: new Date().toISOString() }).eq("id", clusterId);

  // Draft (or re-draft) the collective representation document from the same brief.
  const pack = getPack(cluster.pack);
  const authority = pack.authorities.find((a) =>
    pack.categories.find((c) => c.category === cluster.category)?.owners.some((o) => o.authorityId === a.id)
  ) ?? pack.authorities[0];
  const rendered = renderTemplate("collective", {
    applicantName: "Multiple citizens",
    authority,
    subject: corrected.headline,
    factsParagraph: corrected.pattern,
    requestedActions: corrected.systemicAsk,
  });
  await supa.from("documents").insert({ cluster_id: clusterId, kind: "collective", title: rendered.title, body: rendered.body, status: "ready" });
}
