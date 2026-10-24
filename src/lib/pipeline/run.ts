// The 8-stage case pipeline. Perceive and Understand call cheap/fast models to build
// structured facts; Triage and Decide are pure code; Research is a Nemotron Super agent
// with Tavily tools; Draft/Bench loop Super against Ultra up to 3 rounds; Package renders
// the final documents. Every LLM output is zod-validated before it touches the database.
import { db } from "@/lib/db";
import { chat } from "@/lib/llm/client";
import { chatJson, extractJson } from "@/lib/llm/json";
import { dbLedger } from "@/lib/llm/ledger";
import { runToolAgent, type AgentCtx } from "@/lib/llm/agent";
import { researchTools } from "@/lib/tools/registry";
import { getPack } from "@/lib/packs/index";
import { resolveJurisdiction, type JurisdictionDecision } from "@/lib/jurisdiction";
import { triage } from "@/lib/triage";
import { renderTemplate } from "@/lib/ladder/templates";
import { makeEmitter, STAGES } from "@/lib/pipeline/events";
import { EvidenceFindings, GrievanceFacts, ResearchNotes, DraftOut, BenchReview, type EvidenceFindings as EvidenceFindingsT, type DraftOut as DraftOutT } from "@/lib/schemas";
import { PERCEIVE_SYSTEM, UNDERSTAND_SYSTEM, RESEARCH_SYSTEM, DRAFT_SYSTEM, BENCH_SYSTEM, REVISE_SYSTEM, HINDI_SYSTEM } from "@/lib/llm/prompts";

export async function runPipeline(caseId: string, send?: (ev: { type: string; payload: unknown }) => void): Promise<void> {
  const supa = db();
  const emit = makeEmitter(caseId, send);
  const t0 = Date.now();

  const { data: caseRow } = await supa.from("cases").select("*").eq("id", caseId).single();
  if (!caseRow) throw new Error(`Case not found: ${caseId}`);

  const pack = getPack(caseRow.pack ?? "in-dl");
  const ledger = dbLedger({ caseId });
  const answers: Record<string, string> = caseRow.followup_answers ?? {};

  await supa.from("cases").update({ status: "processing" }).eq("id", caseId);

  try {
    // ---- Stage: perceive ----
    await runStage(emit, "perceive", async () => {
      const { data: photos } = await supa.from("evidence").select("*").eq("case_id", caseId).eq("kind", "photo").limit(3);
      if (!photos?.length) return { result: null, summary: "No photo provided" };

      const findingsList: EvidenceFindingsT[] = [];
      for (const photo of photos) {
        const { data: fileBlob } = await supa.storage.from("evidence").download(photo.storage_path);
        if (!fileBlob) continue;
        const buf = Buffer.from(await fileBlob.arrayBuffer());
        const dataUrl = `data:${photo.mime};base64,${buf.toString("base64")}`;
        const { data: findings } = await chatJson(
          {
            model: "superVL",
            step: "perceive",
            thinking: false,
            messages: [
              { role: "system", content: PERCEIVE_SYSTEM },
              { role: "user", content: [{ type: "text", text: "Citizen photo of the problem." }, { type: "image_url", image_url: { url: dataUrl } }] },
            ],
            ledger,
          },
          EvidenceFindings,
          "evidence_findings"
        );
        await supa.from("evidence").update({ findings }).eq("id", photo.id);
        findingsList.push(findings);
      }
      if (findingsList.length) await supa.from("cases").update({ evidence_findings: findingsList[0] }).eq("id", caseId);
      return {
        result: findingsList[0] ?? null,
        summary: findingsList.length ? `Read ${findingsList.length} photo(s): ${findingsList[0].issueSeen}` : "Photo(s) present but unreadable",
      };
    });

    // ---- Stage: understand ----
    const { data: evRow } = await supa.from("evidence").select("findings").eq("case_id", caseId).eq("kind", "photo").limit(1).maybeSingle();
    const facts = await runStage(emit, "understand", async () => {
      const { data: parsed } = await chatJson(
        {
          model: "lightning",
          step: "understand",
          thinking: false,
          messages: [
            { role: "system", content: UNDERSTAND_SYSTEM },
            {
              role: "user",
              content: `Citizen wrote:\n"""${caseRow.citizen_text}"""\nLocation given: ${caseRow.location_text ?? "none"}\nFollow-up answers: ${JSON.stringify(answers)}\nPhoto notes: ${JSON.stringify(evRow?.findings ?? null)}`,
            },
          ],
          ledger,
        },
        GrievanceFacts,
        "grievance_facts"
      );
      // Code override: if the citizen's category came back "other" but the photo strongly
      // suggests otherwise, trust the photo. Never the reverse.
      if (parsed.category === "other" && evRow?.findings?.categoryGuess && evRow.findings.categoryGuess !== "other" && evRow.findings.confidence >= 0.7) {
        parsed.category = evRow.findings.categoryGuess;
      }
      await supa.from("cases").update({ facts: parsed, category: parsed.category }).eq("id", caseId);
      return { result: parsed, summary: `Category: ${parsed.category}. ${parsed.summary}` };
    });

    // ---- Stage: triage (code) ----
    const triageResult = await runStage(emit, "triage", async () => {
      const result = triage(facts, pack, answers);
      await supa.from("cases").update({ triage: result, life_or_liberty: result.lifeOrLiberty }).eq("id", caseId);
      const summary = result.emergency ? `EMERGENCY: ${result.emergency.reason}` : result.questions.length ? `${result.questions.length} question(s) needed` : "No blockers";
      return { result, summary };
    });

    if (triageResult.emergency) {
      await supa.from("cases").update({ status: "emergency" }).eq("id", caseId);
      await emit("emergency", { reason: triageResult.emergency.reason, call: triageResult.emergency.call });
      return;
    }
    if (triageResult.questions.length) {
      await supa.from("cases").update({ status: "needs_input", followup_questions: triageResult.questions }).eq("id", caseId);
      await emit("needs_input", { questions: triageResult.questions });
      return;
    }

    // ---- Stage: decide (code) ----
    const decisionData: JurisdictionDecision = await runStage(emit, "decide", async () => {
      const decision = resolveJurisdiction(pack, facts, answers);
      await supa.from("cases").update({ jurisdiction: decision }).eq("id", caseId);
      const summary = decision.ok ? `${decision.authority!.name} (${decision.verified ? "source verified" : "source pending"})` : `Blocked: ${decision.blocked}`;
      return { result: decision, summary };
    });

    if (!decisionData.ok || !decisionData.authority) {
      await supa.from("cases").update({ status: "failed" }).eq("id", caseId);
      await emit("error", { stage: "decide", message: decisionData.explanation });
      return;
    }
    const authority = decisionData.authority;

    // ---- Stage: research (agent) ----
    await runStage(emit, "research", async () => {
      const ctx: AgentCtx = { caseId, ledger, emit, fetchedUrls: new Set() };
      const { final } = await runToolAgent({
        model: "super",
        step: "research",
        system: RESEARCH_SYSTEM,
        user: `Authority: ${authority.name} (expected channel: ${authority.grievanceChannel.name}, ${authority.grievanceChannel.url})\nCategory: ${facts.category}\nLocation: ${facts.locationText}\nFacts: ${facts.summary}`,
        tools: researchTools(),
        ctx,
        maxRounds: 5,
        finalInstruction: "Stop searching. Reply now with ONLY the final JSON.",
      });

      let parsedResearch: unknown = null;
      try {
        parsedResearch = extractJson(final);
      } catch {
        /* fall through to repair below */
      }
      let notesParsed = ResearchNotes.safeParse(parsedResearch);
      if (!notesParsed.success) {
        try {
          const repaired = await chatJson(
            { model: "super", step: "research.repair", thinking: false, messages: [{ role: "user", content: `Reformat this as the required JSON only: ${final.slice(0, 4000)}` }], ledger },
            ResearchNotes,
            "research_notes"
          );
          notesParsed = { success: true, data: repaired.data } as ReturnType<typeof ResearchNotes.safeParse>;
        } catch {
          /* fall through to the not_found default below */
        }
      }
      const data = notesParsed.success
        ? notesParsed.data
        : {
            channelConfirmed: { name: authority.grievanceChannel.name, url: null, helpline: null, status: "not_found" as const, note: "Live check unavailable" },
            officerDesignation: null,
            relevantNotices: [],
            newsCorroboration: [],
            citations: [],
          };

      // Code filter: drop any citation/notice/news whose URL was not actually fetched by a tool.
      const fetched = ctx.fetchedUrls;
      const beforeCount = data.relevantNotices.length + data.newsCorroboration.length + data.citations.length;
      data.relevantNotices = data.relevantNotices.filter((n) => fetched.has(n.url));
      data.newsCorroboration = data.newsCorroboration.filter((n) => fetched.has(n.url));
      data.citations = data.citations.filter((c) => fetched.has(c.url));
      const droppedCount = beforeCount - (data.relevantNotices.length + data.newsCorroboration.length + data.citations.length);

      await supa.from("cases").update({ research: { ...data, droppedUnfetched: droppedCount } }).eq("id", caseId);
      return { result: data, summary: `Channel: ${data.channelConfirmed.status}. ${data.citations.length} citation(s), ${droppedCount} unverifiable link(s) removed.` };
    });

    // ---- Stage: draft ----
    const { data: researchRow } = await supa.from("cases").select("research").eq("id", caseId).single();
    let currentDraft: DraftOutT = await runStage(emit, "draft", async () => {
      const { data } = await chatJson(
        {
          model: "super",
          step: "draft",
          messages: [
            { role: "system", content: DRAFT_SYSTEM },
            {
              role: "user",
              content: `Facts: ${JSON.stringify(facts)}\nAuthority: ${authority.name}\nResearch: ${JSON.stringify(researchRow?.research ?? {})}\nSLA: ${decisionData.slaDays} days (${decisionData.slaBasis})`,
            },
          ],
          ledger,
        },
        DraftOut,
        "draft_out"
      );
      return { result: data, summary: `Subject: ${data.subject}` };
    });

    // ---- Stage: bench (loop) ----
    const benchRounds: Array<{ round: number; verdict: string; risks: unknown[] }> = [];
    for (let round = 1; round <= 3; round++) {
      const letterText = renderTemplate("grievance", {
        applicantName: "Citizen",
        authority,
        subject: currentDraft.subject,
        factsParagraph: currentDraft.factsParagraph,
        requestedActions: currentDraft.requestedActions,
      }).body;

      const { data: review } = await chatJson(
        {
          model: "ultra",
          step: `bench.${round}`,
          messages: [
            { role: "system", content: BENCH_SYSTEM },
            { role: "user", content: `Letter:\n${letterText}\n\nFacts available: ${JSON.stringify(facts)}` },
          ],
          ledger,
        },
        BenchReview,
        "bench_review"
      );
      benchRounds.push({ round, verdict: review.verdict, risks: review.rejectionRisks });
      await emit("bench", { round, verdict: review.verdict, risks: review.rejectionRisks });

      if (review.verdict === "pass" || round === 3) break;

      const { data: revised } = await chatJson(
        {
          model: "super",
          step: `revise.${round}`,
          messages: [
            { role: "system", content: REVISE_SYSTEM },
            { role: "user", content: `Current draft: ${JSON.stringify(currentDraft)}\nRisks to fix: ${JSON.stringify(review.rejectionRisks)}\nFacts available: ${JSON.stringify(facts)}` },
          ],
          ledger,
        },
        DraftOut,
        "draft_out"
      );
      currentDraft = revised;
    }
    await supa.from("cases").update({ bench: benchRounds }).eq("id", caseId);

    // ---- Stage: package (code) ----
    await runStage(emit, "package", async () => {
      const rendered = renderTemplate("grievance", {
        applicantName: "Citizen",
        authority,
        subject: currentDraft.subject,
        factsParagraph: currentDraft.factsParagraph,
        requestedActions: currentDraft.requestedActions,
      });
      await supa.from("documents").insert({ case_id: caseId, kind: "grievance", title: rendered.title, body: rendered.body, status: "ready", bench: benchRounds.at(-1) ?? null });

      try {
        const hi = await chat({
          model: "lightning",
          step: "package.hindi",
          thinking: false,
          messages: [
            { role: "system", content: HINDI_SYSTEM },
            { role: "user", content: rendered.body },
          ],
          ledger,
        });
        await supa.from("documents").update({ body_hi: hi.content }).eq("case_id", caseId).eq("kind", "grievance").eq("status", "ready");
      } catch {
        /* Hindi translation is best-effort; never block packaging on it */
      }

      await supa.from("cases").update({ status: "ready" }).eq("id", caseId);
      return { result: null, summary: "Filing packet ready" };
    });

    await emit("done", { ms: Date.now() - t0 });
  } catch (e) {
    await supa.from("cases").update({ status: "failed" }).eq("id", caseId);
    await emit("error", { message: e instanceof Error ? e.message : String(e) });
    throw e;
  }
}

async function runStage<T>(
  emit: ReturnType<typeof makeEmitter>,
  id: (typeof STAGES)[number]["id"],
  fn: () => Promise<{ result: T; summary: string }>
): Promise<T> {
  const t0 = Date.now();
  await emit("stage", { id, state: "start" });
  try {
    const { result, summary } = await fn();
    await emit("stage", { id, state: "done", summary, ms: Date.now() - t0 });
    return result;
  } catch (e) {
    await emit("stage", { id, state: "error", summary: e instanceof Error ? e.message : String(e), ms: Date.now() - t0 });
    throw e;
  }
}
