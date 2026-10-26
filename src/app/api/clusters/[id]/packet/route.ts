import { NextResponse } from "next/server";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { generateClusterPdf } from "@/lib/pdf/cluster";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await connection(); // always live; never prerender this at build time
  const { id } = await params;
  const { data: doc } = await db().from("documents").select("*").eq("cluster_id", id).eq("kind", "collective").order("created_at", { ascending: false }).limit(1).single();
  if (!doc) return NextResponse.json({ error: "No collective representation yet for this cluster" }, { status: 404 });

  const pdf = await generateClusterPdf({ headline: doc.title, body: doc.body });
  return new NextResponse(Buffer.from(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="nivaran-cluster-${id.slice(0, 8)}.pdf"` } });
}
