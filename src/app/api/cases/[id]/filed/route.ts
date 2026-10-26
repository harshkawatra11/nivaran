// POST: record that the citizen filed the grievance. Either an acknowledgement image (read
// by Nemotron Super VL for the registration number/date) or a manual {ref, date} JSON body.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionId, getClockOffsetDays } from "@/lib/session";
import { effectiveNow, isoDate } from "@/lib/clock";
import { applyLadder } from "@/lib/ladder/apply";
import { chatJson } from "@/lib/llm/json";
import { dbLedger } from "@/lib/llm/ledger";
import { AckRead } from "@/lib/schemas";
import { ACK_SYSTEM } from "@/lib/llm/prompts";
import { sha256Hex } from "@/lib/hash";

export const maxDuration = 60;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sid = await getSessionId(false);
  const supa = db();

  const { data: caseRow } = await supa.from("cases").select("session_id, status").eq("id", id).single();
  if (!caseRow || caseRow.session_id !== sid) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const contentType = req.headers.get("content-type") ?? "";
  let ref: string | null = null;
  let filedDate: string | null = null;

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const ack = form.get("ack");
    if (!(ack instanceof File)) return NextResponse.json({ error: "ack image required" }, { status: 400 });
    const buf = Buffer.from(await ack.arrayBuffer());
    const hash = await sha256Hex(buf);
    const ext = ack.type === "image/png" ? "png" : "jpg";
    const path = `${id}/ack-${crypto.randomUUID()}.${ext}`;
    await supa.storage.from("evidence").upload(path, buf, { contentType: ack.type, upsert: false });
    await supa.from("evidence").insert({ case_id: id, kind: "ack", storage_path: path, sha256: hash, mime: ack.type, bytes: buf.byteLength });

    const dataUrl = `data:${ack.type};base64,${buf.toString("base64")}`;
    const { data: read } = await chatJson(
      {
        model: "superVL",
        step: "ack",
        thinking: false,
        messages: [
          { role: "system", content: ACK_SYSTEM },
          { role: "user", content: [{ type: "text", text: "Acknowledgement image." }, { type: "image_url", image_url: { url: dataUrl } }] },
        ],
        ledger: dbLedger({ caseId: id }),
      },
      AckRead,
      "ack_read"
    );

    if (!read.isAcknowledgement || read.confidence < 0.6 || !read.filedDate) {
      return NextResponse.json({ needsConfirm: true, read }, { status: 200 });
    }
    ref = read.registrationNumber;
    filedDate = read.filedDate;
  } else {
    const body = await req.json().catch(() => ({}));
    ref = typeof body.ref === "string" ? body.ref : null;
    filedDate = typeof body.date === "string" ? body.date : null;
  }

  if (!filedDate || !/^\d{4}-\d{2}-\d{2}$/.test(filedDate)) return NextResponse.json({ error: "Invalid or missing filed date" }, { status: 400 });

  const offset = await getClockOffsetDays(sid!);
  const now = effectiveNow(offset);
  if (filedDate > isoDate(now)) return NextResponse.json({ error: "Filed date cannot be in the future" }, { status: 400 });

  await supa.from("cases").update({ portal_ref: ref, filed_at: filedDate, status: "filed" }).eq("id", id);
  const result = await applyLadder(id, now);

  return NextResponse.json({ ok: true, ref, filedDate, ladder: result });
}
