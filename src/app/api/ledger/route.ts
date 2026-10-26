// GET: aggregate model usage stats for the /how transparency page, grouped by model tier.
import { NextResponse } from "next/server";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { MODELS } from "@/lib/llm/models";

export async function GET() {
  await connection(); // ledger totals are always live; never prerender this at build time
  const supa = db();
  const { data: rows } = await supa.from("llm_calls").select("model_key, cost_usd, latency_ms, ok");

  const byModel = new Map<string, { count: number; totalCost: number; totalMs: number; errors: number }>();
  for (const r of rows ?? []) {
    const entry = byModel.get(r.model_key) ?? { count: 0, totalCost: 0, totalMs: 0, errors: 0 };
    entry.count++;
    entry.totalCost += r.cost_usd ?? 0;
    entry.totalMs += r.latency_ms ?? 0;
    if (!r.ok) entry.errors++;
    byModel.set(r.model_key, entry);
  }

  const models = Object.keys(MODELS).map((key) => {
    const spec = MODELS[key as keyof typeof MODELS];
    const stats = byModel.get(key) ?? { count: 0, totalCost: 0, totalMs: 0, errors: 0 };
    return {
      key,
      label: spec.label,
      role: spec.role,
      calls: stats.count,
      avgMs: stats.count ? Math.round(stats.totalMs / stats.count) : 0,
      avgCostUsd: stats.count ? stats.totalCost / stats.count : 0,
      totalCostUsd: stats.totalCost,
      errors: stats.errors,
    };
  });

  const { data: nightly } = await supa.from("web_cache").select("payload, at").eq("key", "nightly:last").maybeSingle();

  return NextResponse.json({
    models,
    totalCostUsd: models.reduce((s, m) => s + m.totalCostUsd, 0),
    totalCalls: models.reduce((s, m) => s + m.calls, 0),
    nightlyLastRun: nightly ?? null,
  });
}
