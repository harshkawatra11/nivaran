// Thin, swappable OpenAI-compatible client for Nebius Token Factory. Adapted from the
// retry/backoff and error-shape pattern in arch-decision/api/_lib/llm.ts, extended with
// tool calling, vision content parts, reasoning-content splitting, and a cost ledger hook.
import { env } from "@/lib/env";
import { MODELS, costUsd, type ModelKey } from "@/lib/llm/models";

export type ContentPart = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };
export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}
export type ChatMessage =
  | { role: "system" | "user"; content: string | ContentPart[] }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

export interface OpenAITool {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

export interface CallRecord {
  step: string;
  modelKey: ModelKey;
  modelId: string;
  promptTokens: number;
  completionTokens: number;
  cachedTokens: number;
  latencyMs: number;
  costUsd: number;
  ok: boolean;
  error?: string;
}
export type LedgerSink = (r: CallRecord) => Promise<void> | void;

export interface ChatOptions {
  model: ModelKey;
  step: string; // e.g. "perceive", "research.r2", "bench.1"
  messages: ChatMessage[];
  thinking?: boolean; // default: true for super/ultra, false otherwise
  temperature?: number;
  maxTokens?: number;
  tools?: OpenAITool[];
  toolChoice?: "auto" | "none" | { type: "function"; function: { name: string } };
  jsonSchema?: { name: string; schema: Record<string, unknown> };
  ledger?: LedgerSink;
  timeoutMs?: number;
}
export interface ChatResult {
  content: string;
  reasoning: string | null;
  toolCalls: ToolCall[];
  record: CallRecord;
}

const RETRYABLE = new Set([408, 429, 500, 502, 503, 504]);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Separate inline <think>...</think> blocks (or a sibling reasoning_content field) from the
 *  final answer text. */
export function splitReasoning(content: string, field?: string | null): { content: string; reasoning: string | null } {
  const m = content.match(/<think>([\s\S]*?)<\/think>/);
  if (m) return { content: content.replace(m[0], "").trim(), reasoning: (field ?? m[1]).trim() };
  return { content: content.trim(), reasoning: field ? String(field).trim() : null };
}

export async function chat(o: ChatOptions): Promise<ChatResult> {
  const spec = MODELS[o.model];
  const thinking = o.thinking ?? (o.model === "super" || o.model === "ultra");
  const body: Record<string, unknown> = {
    model: spec.id,
    messages: o.messages,
    temperature: o.temperature ?? (thinking ? 0.6 : 0.2),
    top_p: 0.95,
    max_tokens: o.maxTokens ?? (thinking ? 8192 : 2048),
  };
  if (!thinking && env.thinkingKwarg()) body.chat_template_kwargs = { enable_thinking: false };
  if (o.tools?.length) {
    body.tools = o.tools;
    body.tool_choice = o.toolChoice ?? "auto";
  }
  if (o.jsonSchema) {
    const mode = env.jsonMode();
    if (mode === "schema") {
      body.response_format = {
        type: "json_schema",
        json_schema: { name: o.jsonSchema.name, schema: o.jsonSchema.schema, strict: env.jsonStrict() },
      };
    } else if (mode === "object") {
      body.response_format = { type: "json_object" };
    }
  }

  const t0 = Date.now();
  let lastErr = "";
  for (let attempt = 0; attempt < 4; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), o.timeoutMs ?? 120_000);
    try {
      const res = await fetch(`${env.nebiusBase()}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${env.nebiusKey()}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (!res.ok) {
        lastErr = `${res.status} ${(await res.text()).slice(0, 400)}`;
        // If the provider rejects an option we sent, drop it once and retry immediately.
        if (res.status === 400 && body.chat_template_kwargs && /chat_template_kwargs|enable_thinking/i.test(lastErr)) {
          delete body.chat_template_kwargs;
          continue;
        }
        if (res.status === 400 && body.response_format && /response_format|json_schema/i.test(lastErr)) {
          delete body.response_format;
          continue;
        }
        if (RETRYABLE.has(res.status) && attempt < 3) {
          await sleep(700 * 2 ** attempt + Math.random() * 300);
          continue;
        }
        break;
      }
      const data = await res.json();
      const msg = data.choices?.[0]?.message ?? {};
      const split = splitReasoning(msg.content ?? "", msg.reasoning_content ?? msg.reasoning ?? null);
      const u = data.usage ?? {};
      const cached = u.prompt_tokens_details?.cached_tokens ?? 0;
      const record: CallRecord = {
        step: o.step,
        modelKey: o.model,
        modelId: spec.id,
        promptTokens: u.prompt_tokens ?? 0,
        completionTokens: u.completion_tokens ?? 0,
        cachedTokens: cached,
        latencyMs: Date.now() - t0,
        costUsd: costUsd(o.model, u.prompt_tokens ?? 0, u.completion_tokens ?? 0, cached),
        ok: true,
      };
      await o.ledger?.(record);
      return { content: split.content, reasoning: split.reasoning, toolCalls: msg.tool_calls ?? [], record };
    } catch (e) {
      clearTimeout(timer);
      lastErr = e instanceof Error ? e.message : String(e);
      if (attempt < 3) {
        await sleep(700 * 2 ** attempt);
        continue;
      }
    }
  }
  const record: CallRecord = {
    step: o.step,
    modelKey: o.model,
    modelId: spec.id,
    promptTokens: 0,
    completionTokens: 0,
    cachedTokens: 0,
    latencyMs: Date.now() - t0,
    costUsd: 0,
    ok: false,
    error: lastErr,
  };
  await o.ledger?.(record);
  throw new Error(`LLM ${o.model} failed at ${o.step}: ${lastErr}`);
}
