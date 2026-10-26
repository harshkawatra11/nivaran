// POST: create a case from a multipart form (citizen text + optional photos + location).
// GET: list the current session's cases.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionId } from "@/lib/session";
import { geohash } from "@/lib/geohash";
import { sha256Hex } from "@/lib/hash";


export async function POST(req: NextRequest) {
  const sid = await getSessionId(true);
  const supa = db();
  const form = await req.formData();

  const text = String(form.get("text") ?? "").trim();
  if (!text) return NextResponse.json({ error: "text is required" }, { status: 400 });

  const location = form.get("location") ? String(form.get("location")) : null;
  const latRaw = form.get("lat");
  const lngRaw = form.get("lng");
  const lat = latRaw ? Number(latRaw) : null;
  const lng = lngRaw ? Number(lngRaw) : null;
  const language = form.get("language") ? String(form.get("language")) : "en";
  const gh6 = lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng) ? geohash(lat, lng, 6) : null;

  const { data: caseRow, error } = await supa
    .from("cases")
    .insert({
      session_id: sid,
      citizen_text: text,
      location_text: location,
      lat,
      lng,
      geohash6: gh6,
      language,
      pack: "in-dl",
      status: "intake",
    })
    .select("id")
    .single();

  if (error || !caseRow) return NextResponse.json({ error: error?.message ?? "Failed to create case" }, { status: 500 });

  const photos = form.getAll("photos").filter((p): p is File => p instanceof File && p.size > 0).slice(0, 3);
  for (const photo of photos) {
    if (!/^image\/(jpeg|png)$/.test(photo.type)) continue;
    if (photo.size > 1_500_000) continue;
    const buf = Buffer.from(await photo.arrayBuffer());
    const hash = await sha256Hex(buf);
    const ext = photo.type === "image/png" ? "png" : "jpg";
    const path = `${caseRow.id}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadErr } = await supa.storage.from("evidence").upload(path, buf, { contentType: photo.type, upsert: false });
    if (uploadErr) continue;
    await supa.from("evidence").insert({ case_id: caseRow.id, kind: "photo", storage_path: path, sha256: hash, mime: photo.type, bytes: buf.byteLength });
  }

  return NextResponse.json({ id: caseRow.id });
}

export async function GET() {
  const sid = await getSessionId(false);
  if (!sid) return NextResponse.json({ cases: [] });
  const { data } = await db().from("cases").select("id, status, category, citizen_text, created_at, updated_at").eq("session_id", sid).order("created_at", { ascending: false });
  return NextResponse.json({ cases: data ?? [] });
}
