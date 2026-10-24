import { db } from "@/lib/db";

export type StageId = "perceive" | "understand" | "triage" | "decide" | "research" | "draft" | "bench" | "package";

export const STAGES: Array<{ id: StageId; label: string; actor: "superVL" | "lightning" | "code" | "super" | "ultra" }> = [
  { id: "perceive", label: "Reading the photo", actor: "superVL" },
  { id: "understand", label: "Understanding the complaint", actor: "lightning" },
  { id: "triage", label: "Safety and missing details", actor: "code" },
  { id: "decide", label: "Deciding the responsible office", actor: "code" },
  { id: "research", label: "Checking official sources live", actor: "super" },
  { id: "draft", label: "Drafting the complaint", actor: "super" },
  { id: "bench", label: "Adversarial review", actor: "ultra" },
  { id: "package", label: "Preparing your filing packet", actor: "code" },
];

export type EmitFn = (type: string, payload: Record<string, unknown>) => Promise<void>;

export function makeEmitter(caseId: string, send?: (ev: { type: string; payload: unknown }) => void): EmitFn {
  return async (type: string, payload: Record<string, unknown>) => {
    await db().from("case_events").insert({ case_id: caseId, type, payload });
    send?.({ type, payload });
  };
}
