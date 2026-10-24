// DB wrapper around the pure advance() state machine. Loads a case and its deadlines,
// applies ladder actions in a loop (up to 5 iterations, so a multi-day clock jump can walk
// through several transitions in one sweep), and persists the results.
import { db } from "@/lib/db";
import { getPack } from "@/lib/packs/index";
import { advance, type LadderCase } from "@/lib/ladder/advance";
import { renderTemplate, RTI_QUESTION_TEMPLATES } from "@/lib/ladder/templates";
import { lintQuestion } from "@/lib/rti/linter";
import { chat } from "@/lib/llm/client";
import { dbLedger } from "@/lib/llm/ledger";
import type { DocumentKind } from "@/lib/ladder/types";

export interface ApplyLadderResult {
  changed: boolean;
  finalStatus: string;
  transitions: Array<{ to: string; payload: Record<string, unknown> }>;
  draftedDocs: DocumentKind[];
}

export async function applyLadder(caseId: string, now: Date): Promise<ApplyLadderResult> {
  const supa = db();
  const { data: caseRow } = await supa.from("cases").select("*").eq("id", caseId).single();
  if (!caseRow) throw new Error(`Case not found: ${caseId}`);
  const pack = getPack(caseRow.pack);

  const { data: deadlineRows } = await supa.from("deadlines").select("*").eq("case_id", caseId);
  let deadlines = (deadlineRows ?? []).map((d) => ({ step: d.step, due_on: d.due_on, status: d.status as "pending" | "met" | "missed" }));

  const jurisdiction = caseRow.jurisdiction as { slaDays?: number } | null;
  const slaDays = jurisdiction?.slaDays ?? 7;

  let status = caseRow.status as string;
  const result: ApplyLadderResult = { changed: false, finalStatus: status, transitions: [], draftedDocs: [] };

  for (let iter = 0; iter < 5; iter++) {
    const ladderCase: LadderCase = {
      status,
      filed_at: caseRow.filed_at,
      rti_filed_at: caseRow.rti_filed_at,
      appeal_filed_at: caseRow.appeal_filed_at,
      life_or_liberty: caseRow.life_or_liberty ?? false,
      slaDays,
      deadlines,
    };
    const actions = advance(ladderCase, pack, now);
    if (actions.length === 0) break;
    result.changed = true;

    for (const a of actions) {
      if (a.kind === "add_deadline") {
        deadlines.push({ step: a.step, due_on: a.dueOn, status: "pending" });
        await supa.from("deadlines").upsert(
          { case_id: caseId, step: a.step, label: a.label, basis: a.basis, starts_on: a.startsOn, due_on: a.dueOn, status: "pending" },
          { onConflict: "case_id,step" }
        );
      } else if (a.kind === "miss_deadline") {
        const d = deadlines.find((x) => x.step === a.step);
        if (d) d.status = "missed";
        await supa.from("deadlines").update({ status: "missed" }).eq("case_id", caseId).eq("step", a.step);
      } else if (a.kind === "set_status") {
        status = a.status;
      } else if (a.kind === "draft") {
        await draftDocument(caseId, caseRow, pack, a.doc);
        result.draftedDocs.push(a.doc);
      } else if (a.kind === "event") {
        result.transitions.push({ to: String(a.payload.to ?? ""), payload: a.payload });
        await supa.from("case_events").insert({ case_id: caseId, type: a.type, payload: a.payload });
      }
    }
  }

  if (result.changed) {
    await supa.from("cases").update({ status, updated_at: new Date().toISOString() }).eq("id", caseId);
  }
  result.finalStatus = status;
  return result;
}

async function draftDocument(caseId: string, caseRow: any, pack: ReturnType<typeof getPack>, doc: "reminder" | "rti" | "first_appeal" | "second_appeal") {
  const supa = db();
  const jurisdiction = caseRow.jurisdiction as any;
  const authority = pack.authorities.find((a) => a.id === jurisdiction?.authority?.id) ?? pack.authorities[0];
  const facts = caseRow.facts as any;
  const subject = facts?.summary ?? caseRow.citizen_text?.slice(0, 80) ?? "Civic grievance";

  let factsParagraph = facts?.citizenAsk ? `The citizen reports: ${facts.summary ?? caseRow.citizen_text}.` : caseRow.citizen_text;
  // For reminder/rti, ask Super (thinking off) to write one plain facts paragraph. Non-fatal
  // on failure: fall back to the raw citizen text so the ladder never blocks on an LLM call.
  if (doc === "reminder" || doc === "rti") {
    try {
      const r = await chat({
        model: "super",
        step: `ladder.${doc}.facts`,
        thinking: false,
        temperature: 0.3,
        messages: [
          { role: "system", content: "Write one plain, factual paragraph (max 120 words, no em dashes) summarising this civic grievance for a formal letter. State only what is given." },
          { role: "user", content: `Grievance: ${caseRow.citizen_text}\nLocation: ${caseRow.location_text ?? "not given"}\nCategory: ${facts?.category ?? "unknown"}` },
        ],
        ledger: dbLedger({ caseId }),
      });
      if (r.content.trim()) factsParagraph = r.content.trim();
    } catch {
      /* fall back to raw text; the ladder must never block on an LLM failure */
    }
  }

  const questions = RTI_QUESTION_TEMPLATES.map((q) => q.replace("{{REF}}", caseRow.portal_ref ?? "[reference pending]").replace("{{FILED}}", caseRow.filed_at ?? "[date pending]"));
  if (doc === "rti" || doc === "first_appeal" || doc === "second_appeal") {
    for (const q of questions) {
      const findings = lintQuestion(q);
      if (findings.some((f) => f.severity === "block")) throw new Error(`RTI question template failed the linter: ${q}`);
    }
  }

  const rendered = renderTemplate(doc, {
    applicantName: "Citizen",
    authority,
    subject,
    factsParagraph,
    requestedActions: ["Resolve the issue described above.", "Confirm the action taken in writing."],
    ref: caseRow.portal_ref,
    filedDate: caseRow.filed_at,
    rtiQuestions: questions,
  });

  await supa.from("documents").insert({ case_id: caseId, kind: doc, title: rendered.title, body: rendered.body, status: "ready" });
}
