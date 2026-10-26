// POST: save follow-up answers (location, road_width, facility_operator). The client then
// calls /run again, which resumes from triage using the saved answers.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionId } from "@/lib/session";


export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sid = await getSessionId(false);
  const supa = db();

  const { data: caseRow } = await supa.from("cases").select("session_id, followup_answers").eq("id", id).single();
  if (!caseRow || caseRow.session_id !== sid) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const answers = body.answers && typeof body.answers === "object" ? body.answers : {};
  const merged = { ...(caseRow.followup_answers ?? {}), ...answers };

  await supa.from("cases").update({ followup_answers: merged, status: "intake" }).eq("id", id);
  return NextResponse.json({ ok: true });
}
