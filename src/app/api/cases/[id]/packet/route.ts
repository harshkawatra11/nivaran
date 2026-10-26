import type { JurisdictionDecision } from "@/lib/jurisdiction";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionId } from "@/lib/session";
import { generatePacketPdf } from "@/lib/pdf/packet";
import { getPack } from "@/lib/packs/index";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sid = await getSessionId(false);
  const supa = db();

  const { data: caseRow } = await supa
    .from("cases")
    .select("*")
    .eq("id", id)
    .single();
  if (!caseRow)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (caseRow.session_id !== sid && !caseRow.is_demo_seed)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const docId = req.nextUrl.searchParams.get("doc");
  const query = supa.from("documents").select("*").eq("case_id", id);
  const { data: doc } = docId
    ? await query.eq("id", docId).single()
    : await query.order("created_at", { ascending: false }).limit(1).single();
  if (!doc)
    return NextResponse.json({ error: "Document not found" }, { status: 404 });

  const pack = getPack(caseRow.pack ?? "in-dl");
  const jurisdiction = caseRow.jurisdiction as JurisdictionDecision | null;
  const authorityName =
    pack.authorities.find((a) => a.id === jurisdiction?.authority?.id)?.name ??
    "Unknown authority";
  const caseUrl = `${req.nextUrl.origin}/case/${id}`;

  const pdf = await generatePacketPdf({
    caseId: id,
    title: doc.title,
    body: doc.body,
    bodyHi: doc.body_hi,
    authorityName,
    caseUrl,
  });

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="nivaran-${doc.kind}-${id.slice(0, 8)}.pdf"`,
    },
  });
}
