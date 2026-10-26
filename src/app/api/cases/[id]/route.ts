// GET: the full case bundle for the case page: case row, evidence (with signed URLs),
// documents, deadlines, recent events, and the model ledger totals.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionId } from "@/lib/session";


export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supa = db();
  const sid = await getSessionId(false);

  const { data: caseRow } = await supa.from("cases").select("*").eq("id", id).single();
  if (!caseRow) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = sid && caseRow.session_id === sid;
  const isPublic = caseRow.is_demo_seed === true;
  if (!isOwner && !isPublic) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [{ data: evidence }, { data: documents }, { data: deadlines }, { data: events }, { data: ledgerRows }] = await Promise.all([
    supa.from("evidence").select("*").eq("case_id", id),
    supa.from("documents").select("*").eq("case_id", id).order("created_at", { ascending: false }),
    supa.from("deadlines").select("*").eq("case_id", id),
    supa.from("case_events").select("*").eq("case_id", id).order("id", { ascending: true }).limit(200),
    supa.from("llm_calls").select("model_key, cost_usd, latency_ms, step, ok").eq("case_id", id),
  ]);

  const evidenceWithUrls = await Promise.all(
    (evidence ?? []).map(async (e) => {
      const { data: signed } = await supa.storage.from("evidence").createSignedUrl(e.storage_path, 3600);
      return { ...e, url: signed?.signedUrl ?? null };
    })
  );

  const ledger = ledgerRows ?? [];
  const totalUsd = ledger.reduce((s, r) => s + (r.cost_usd ?? 0), 0);
  const totalMs = ledger.reduce((s, r) => s + (r.latency_ms ?? 0), 0);

  return NextResponse.json({
    case: caseRow,
    evidence: evidenceWithUrls,
    documents: documents ?? [],
    deadlines: deadlines ?? [],
    events: events ?? [],
    ledger: { calls: ledger, totalUsd, totalMs },
    readOnly: !isOwner,
  });
}
