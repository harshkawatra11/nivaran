// Tool-calling loop for the research agent (Nemotron Super + Tavily tools).
import { z } from "zod";
import {
  chat,
  type ChatMessage,
  type LedgerSink,
  type OpenAITool,
} from "@/lib/llm/client";
import type { ModelKey } from "@/lib/llm/models";

export interface AgentTool<A extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string;
  description: string;
  args: A;
  run: (args: z.infer<A>, ctx: AgentCtx) => Promise<unknown>;
}
export interface AgentCtx {
  caseId: string;
  ledger: LedgerSink;
  emit: (type: string, payload: Record<string, unknown>) => Promise<void>;
  fetchedUrls: Set<string>;
}

export function toOpenAITool(t: AgentTool): OpenAITool {
  const params = z.toJSONSchema(t.args) as Record<string, unknown>;
  delete params.$schema;
  return {
    type: "function",
    function: { name: t.name, description: t.description, parameters: params },
  };
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s || "{}");
  } catch {
    return {};
  }
}

export async function runToolAgent(p: {
  model: ModelKey;
  step: string;
  system: string;
  user: string;
  tools: AgentTool[];
  ctx: AgentCtx;
  maxRounds?: number;
  finalInstruction: string;
}): Promise<{ final: string; rounds: number }> {
  const messages: ChatMessage[] = [
    { role: "system", content: p.system },
    { role: "user", content: p.user },
  ];
  const oaTools = p.tools.map(toOpenAITool);
  const max = p.maxRounds ?? 6;

  for (let round = 0; round < max; round++) {
    const r = await chat({
      model: p.model,
      step: `${p.step}.r${round}`,
      messages,
      tools: oaTools,
      ledger: p.ctx.ledger,
    });
    messages.push({
      role: "assistant",
      content: r.content || null,
      tool_calls: r.toolCalls.length ? r.toolCalls : undefined,
    });
    if (!r.toolCalls.length) return { final: r.content, rounds: round + 1 };

    for (const tc of r.toolCalls) {
      const tool = p.tools.find((t) => t.name === tc.function.name);
      let out: unknown;
      if (!tool) {
        out = { error: `Unknown tool ${tc.function.name}` };
      } else {
        const parsed = tool.args.safeParse(safeJson(tc.function.arguments));
        out = parsed.success
          ? await tool
              .run(parsed.data, p.ctx)
              .catch((e) => ({ error: String((e as Error)?.message ?? e) }))
          : { error: "Invalid arguments", issues: parsed.error.issues };
      }
      await p.ctx.emit("tool", {
        name: tc.function.name,
        args: safeJson(tc.function.arguments),
        ok: !(out && typeof out === "object" && "error" in out),
      });
      messages.push({
        role: "tool",
        tool_call_id: tc.id,
        content: JSON.stringify(out).slice(0, 12_000),
      });
    }
  }

  const r = await chat({
    model: p.model,
    step: `${p.step}.final`,
    messages: [...messages, { role: "user", content: p.finalInstruction }],
    ledger: p.ctx.ledger,
    toolChoice: "none",
    tools: oaTools,
  });
  return { final: r.content, rounds: max + 1 };
}
