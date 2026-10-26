import { ownsCase, canFileStep } from "@/lib/input";
import { validDate } from "@/lib/input";
// POST {step: "rti"|"first_appeal"|"second_appeal", date}: the citizen confirms they filed
// the drafted document. Updates the *_filed_at column and the document status, then
// advances the ladder so the next deadline is added.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionId, getClockOffsetDays } from "@/lib/session";
import { effectiveNow, isoDate } from "@/lib/clock";
import { applyLadder } from "@/lib/ladder/apply";

const STEP_MAP: Record<
  string,
  { column: string; status: string; docKind: string }
> = {
  rti: { column: "rti_filed_at", status: "rti_filed", docKind: "rti" },
  first_appeal: {
    column: "appeal_filed_at",
    status: "appeal_filed",
    docKind: "first_appeal",
  },
  second_appeal: {
    column: "second_appeal_filed_at",
    status: "second_appeal_ready",
    docKind: "second_appeal",
  },
};

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sid = await getSessionId(false);
  const supa = db();

  const { data: caseRow } = await supa
    .from("cases")
    .select("session_id, status")
    .eq("id", id)
    .single();
  if (!caseRow || !ownsCase(sid, caseRow.session_id))
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const step = STEP_MAP[body.step];
  if (!step)
    return NextResponse.json({ error: "Invalid step" }, { status: 400 });

  if (!canFileStep(caseRow.status, body.step))
    return NextResponse.json(
      { error: "This escalation has not been prepared for filing." },
      { status: 409 },
    );
  const offset = await getClockOffsetDays(sid!);
  const now = effectiveNow(offset);
  if (body.date !== undefined && !validDate(body.date))
    return NextResponse.json({ error: "Invalid filing date" }, { status: 400 });
  const date = body.date ?? isoDate(now);
  if (date > isoDate(now))
    return NextResponse.json(
      { error: "Date cannot be in the future" },
      { status: 400 },
    );

  await supa
    .from("cases")
    .update({ [step.column]: date, status: step.status })
    .eq("id", id);
  await supa
    .from("documents")
    .update({ status: "filed" })
    .eq("case_id", id)
    .eq("kind", step.docKind);

  const result = await applyLadder(id, now);
  return NextResponse.json({ ok: true, ladder: result });
}
