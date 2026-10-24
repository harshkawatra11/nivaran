import { db } from "@/lib/db";
import type { CallRecord, LedgerSink } from "@/lib/llm/client";

export function dbLedger(ids: { caseId?: string; clusterId?: string }, onRecord?: (r: CallRecord) => void | Promise<void>): LedgerSink {
  return async (r) => {
    await db()
      .from("llm_calls")
      .insert({
        case_id: ids.caseId ?? null,
        cluster_id: ids.clusterId ?? null,
        step: r.step,
        model_key: r.modelKey,
        model_id: r.modelId,
        prompt_tokens: r.promptTokens,
        completion_tokens: r.completionTokens,
        cached_tokens: r.cachedTokens,
        latency_ms: r.latencyMs,
        cost_usd: r.costUsd,
        ok: r.ok,
        error: r.error ?? null,
      });
    await onRecord?.(r);
  };
}
