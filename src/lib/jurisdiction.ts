// The jurisdiction triage engine. Deterministic by design, in the same spirit as Adhikaar's
// jurisdiction.ts: an LLM may extract or phrase text elsewhere in the pipeline, but the
// verdict produced here is plain code, testable and auditable.
import type { Pack, Authority, OwnerRule } from "@/lib/packs/types";
import type { GrievanceFacts } from "@/lib/schemas";

export interface JurisdictionDecision {
  ok: boolean;
  authority?: Authority;
  rule?: OwnerRule;
  slaDays?: number;
  slaBasis?: string;
  slaSourceUrl?: string;
  verified: boolean;
  explanation: string;
  blocked?: "uncovered_category" | "needs_input";
}

export function resolveJurisdiction(pack: Pack, facts: GrievanceFacts, answers: Record<string, string> = {}): JurisdictionDecision {
  const cat = pack.categories.find((c) => c.category === facts.category);
  if (!cat || facts.category === "other") {
    return {
      ok: false,
      verified: false,
      explanation: "This problem type is not covered by the Delhi pack yet. Nivaran will not guess an office.",
      blocked: "uncovered_category",
    };
  }

  const loc = (facts.locationText + " " + (answers.location ?? "")).toLowerCase();
  const widthFt =
    answers.road_width === "wide" ? 80 : answers.road_width === "narrow" ? 30 : facts.roadWidthHint === "wide" ? 80 : facts.roadWidthHint === "narrow" ? 30 : undefined;
  const operator = (answers.facility_operator ?? facts.facilityOperatorHint) as string | undefined;

  for (const r of cat.owners) {
    const w = r.when;
    if (w?.localityIn && !w.localityIn.some((key) => (pack.localities[key] ?? []).some((n) => loc.includes(n.toLowerCase())))) continue;
    if (w?.roadWidthFtGte !== undefined && !(widthFt !== undefined && widthFt >= w.roadWidthFtGte)) continue;
    if (w?.roadWidthFtLt !== undefined && !(widthFt !== undefined && widthFt < w.roadWidthFtLt)) continue;
    if (w?.facilityOperator && operator !== w.facilityOperator) continue;

    const authority = pack.authorities.find((a) => a.id === r.authorityId)!;
    return {
      ok: true,
      authority,
      rule: r,
      slaDays: cat.slaDays,
      slaBasis: cat.slaBasis,
      slaSourceUrl: cat.slaSourceUrl,
      verified: r.verified && authority.verified && cat.slaVerified,
      explanation: r.explanation,
    };
  }

  return { ok: false, verified: false, explanation: "Not enough information to decide the responsible office.", blocked: "needs_input" };
}
