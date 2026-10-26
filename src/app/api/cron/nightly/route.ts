import { NextRequest, NextResponse } from "next/server";
import { connection } from "next/server";
import { env } from "@/lib/env";
import { runNightly } from "@/lib/nightly";

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  await connection(); // the nightly sweep must never be prerendered or cached
  const secret = env.cronSecret();
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const summary = await runNightly();
  return NextResponse.json(summary);
}
