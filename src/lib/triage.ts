// Safety gate and missing-information triage. Pure, deterministic: an LLM may have flagged
// hazards in GrievanceFacts, but whether that triggers the emergency banner is decided here.
import type { GrievanceFacts } from "@/lib/schemas";
import type { Pack } from "@/lib/packs/types";

export interface TriageResult {
  emergency: null | { reason: string; call: string };
  questions: Array<{ field: string; question: string; questionHi: string }>;
  lifeOrLiberty: boolean;
}

const EMERGENCY_FLAGS = new Set(["live_wire", "fire", "building_collapse", "violence", "medical_emergency", "gas_leak", "drowning_risk"]);

export function triage(facts: GrievanceFacts, pack: Pack, answers: Record<string, string> = {}): TriageResult {
  const hit = facts.hazards.find((h) => EMERGENCY_FLAGS.has(h));
  if (hit) return { emergency: { reason: hit, call: "112" }, questions: [], lifeOrLiberty: true };

  const rule = pack.categories.find((c) => c.category === facts.category);
  const questions: TriageResult["questions"] = (rule?.needs ?? [])
    .filter((n) => {
      if (n.field === "road_width") return facts.roadWidthHint === "unknown" && !answers.road_width;
      if (n.field === "facility_operator") return facts.facilityOperatorHint === "unknown" && !answers.facility_operator;
      return false;
    })
    .map((n) => ({ field: n.field as string, question: n.question, questionHi: n.questionHi }));

  if (!facts.locationText && !answers.location) {
    questions.push({
      field: "location",
      question: "Where exactly is this? A street, landmark or house number helps the office find it.",
      questionHi: "यह ठीक कहाँ है? गली, निशानी या मकान नंबर बताइए।",
    });
  }

  const lifeOrLiberty = facts.hazards.some((h) => ["no_drinking_water_days", "disease_outbreak", "medicine_unavailable_critical"].includes(h));

  return { emergency: null, questions: questions.slice(0, 2), lifeOrLiberty };
}
