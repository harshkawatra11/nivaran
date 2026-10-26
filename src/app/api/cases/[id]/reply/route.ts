// POST: the citizen uploads an official reply image. Super VL transcribes it, Ultra judges
// the outcome, and CODE maps that outcome to the next ladder step (never the LLM).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionId } from "@/lib/session";
import { sha256Hex } from "@/lib/hash";
import { chatJson } from "@/lib/llm/json";
import { dbLedger } from "@/lib/llm/ledger";
import { ReplyRead, ReplyJudgment } from "@/lib/schemas";
import { REPLY_READ_SYSTEM, REPLY_JUDGE_SYSTEM } from "@/lib/llm/prompts";
import { renderTemplate, RTI_QUESTION_TEMPLATES } from "@/lib/ladder/templates";
import { getPack } from "@/lib/packs/index";

export const maxDuration = 60;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sid = await getSessionId(false);
  const supa = db();

  const { data: caseRow } = await supa.from("cases").select("*").eq("id", id).single();
  if (!caseRow || caseRow.session_id !== sid) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const form = await req.formData();
  const replyFile = form.get("reply");
  if (!(replyFile instanceof File)) return NextResponse.json({ error: "reply image required" }, { status: 400 });

  const buf = Buffer.from(await replyFile.arrayBuffer());
  const hash = await sha256Hex(buf);
  const ext = replyFile.type === "image/png" ? "png" : "jpg";
  const path = `${id}/reply-${crypto.randomUUID()}.${ext}`;
  await supa.storage.from("evidence").upload(path, buf, { contentType: replyFile.type, upsert: false });
  await supa.from("evidence").insert({ case_id: id, kind: "reply", storage_path: path, sha256: hash, mime: replyFile.type, bytes: buf.byteLength });

  const ledger = dbLedger({ caseId: id });
  const dataUrl = `data:${replyFile.type};base64,${buf.toString("base64")}`;
  const { data: read } = await chatJson(
    {
      model: "superVL",
      step: "reply.read",
      thinking: false,
      messages: [
        { role: "system", content: REPLY_READ_SYSTEM },
        { role: "user", content: [{ type: "text", text: "Reply image." }, { type: "image_url", image_url: { url: dataUrl } }] },
      ],
      ledger,
    },
    ReplyRead,
    "reply_read"
  );

  const { data: documents } = await supa.from("documents").select("*").eq("case_id", id).order("created_at", { ascending: false }).limit(1);
  const originalDoc = documents?.[0];

  const { data: judgment } = await chatJson(
    {
      model: "ultra",
      step: "reply.judge",
      messages: [
        { role: "system", content: REPLY_JUDGE_SYSTEM },
        { role: "user", content: `Original request:\n${originalDoc?.body ?? caseRow.citizen_text}\n\nOfficial reply:\n${read.fullText}` },
      ],
      ledger,
    },
    ReplyJudgment,
    "reply_judgment"
  );

  // CODE maps the outcome to the next step. The LLM never changes status directly.
  let nextStatus = caseRow.status;
  let draftedKind: string | null = null;

  if (judgment.outcome === "resolved") {
    nextStatus = "resolved";
    await supa.from("deadlines").update({ status: "met" }).eq("case_id", id).eq("status", "pending");
  } else if (judgment.outcome === "transferred") {
    await supa.from("case_events").insert({ case_id: id, type: "transferred", payload: { quote: judgment.reasons[0] ?? "" } });
  } else if (["partial", "evasive", "rejected"].includes(judgment.outcome)) {
    const pack = getPack(caseRow.pack);
    const jurisdiction = caseRow.jurisdiction as any;
    const authority = pack.authorities.find((a: any) => a.id === jurisdiction?.authority?.id) ?? pack.authorities[0];
    if (caseRow.status === "filed" || caseRow.status === "overdue") {
      nextStatus = "rti_ready";
      draftedKind = "rti";
      const questions = RTI_QUESTION_TEMPLATES.map((q) => q.replace("{{REF}}", caseRow.portal_ref ?? "[reference pending]").replace("{{FILED}}", caseRow.filed_at ?? "[date pending]"));
      const rendered = renderTemplate("rti", { applicantName: "Citizen", authority, subject: caseRow.facts?.summary ?? "Civic grievance", factsParagraph: "", requestedActions: [], rtiQuestions: questions });
      await supa.from("documents").insert({ case_id: id, kind: "rti", title: rendered.title, body: rendered.body, status: "ready" });
    } else if (caseRow.status === "rti_filed") {
      nextStatus = "appeal_ready";
      draftedKind = "first_appeal";
      const rendered = renderTemplate("first_appeal", {
        applicantName: "Citizen",
        authority,
        subject: caseRow.facts?.summary ?? "Civic grievance",
        factsParagraph: "",
        requestedActions: [],
        groundsOfAppeal: judgment.appealGrounds,
        missedDeadlineDate: caseRow.filed_at,
      });
      await supa.from("documents").insert({ case_id: id, kind: "first_appeal", title: rendered.title, body: rendered.body, status: "ready" });
    }
  }

  if (nextStatus !== caseRow.status) await supa.from("cases").update({ status: nextStatus }).eq("id", id);
  await supa.from("case_events").insert({ case_id: id, type: "reply", payload: { outcome: judgment.outcome, summary: judgment.citizenSummary } });

  return NextResponse.json({ outcome: judgment.outcome, summary: judgment.citizenSummary, nextStatus, draftedKind });
}
