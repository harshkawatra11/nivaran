// POST {days} | {reset:true}: time-travel this session's clock for the demo, then sweep
// every one of this session's cases through the ladder at the new effective time.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getSessionId } from "@/lib/session";
import { effectiveNow } from "@/lib/clock";
import { applyLadder } from "@/lib/ladder/apply";

export const maxDuration = 120;

export async function POST(req: Request) {
  if (!env.demoMode()) return NextResponse.json({ error: "Demo mode is disabled" }, { status: 403 });

  const sid = await getSessionId(true);
  const supa = db();
  const body = await req.json().catch(() => ({}));

  const { data: session } = await supa.from("sessions").select("clock_offset_days").eq("id", sid).single();
  let offset = session?.clock_offset_days ?? 0;
  offset = body.reset === true ? 0 : offset + (Number.isFinite(body.days) ? Number(body.days) : 0);
  await supa.from("sessions").update({ clock_offset_days: offset }).eq("id", sid);

  const now = effectiveNow(offset);
  const { data: cases } = await supa.from("cases").select("id, status").eq("session_id", sid).not("status", "in", "(resolved,failed,emergency,intake,processing,needs_input,ready)");

  const changes: Array<{ caseId: string; from: string; to: string }> = [];
  for (const c of cases ?? []) {
    const result = await applyLadder(c.id, now);
    if (result.changed) changes.push({ caseId: c.id, from: c.status, to: result.finalStatus });
  }

  return NextResponse.json({ offset, now: now.toISOString(), changes });
}
