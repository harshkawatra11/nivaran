import { NextResponse } from "next/server";
import { connection } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await connection(); // always live; never prerender this at build time
  const { id } = await params;
  const supa = db();

  const { data: cluster } = await supa.from("clusters").select("*").eq("id", id).single();
  if (!cluster) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: members } = await supa.from("cases").select("id, status, facts, created_at").eq("cluster_id", id);
  const { data: documents } = await supa.from("documents").select("*").eq("cluster_id", id).order("created_at", { ascending: false });

  return NextResponse.json({
    cluster,
    members: (members ?? []).map((m) => ({ id: m.id, status: m.status, summary: (m.facts?.summary ?? "").slice(0, 60), createdAt: m.created_at })),
    documents: documents ?? [],
  });
}
