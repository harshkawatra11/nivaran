// Schema-validated JSON extraction with one repair retry. Every LLM output that feeds code
// (jurisdiction, deadlines, ladder transitions) goes through here, never through raw content.
import { z } from "zod";
import { chat, type ChatOptions } from "@/lib/llm/client";

export function extractJson(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    /* fall through to brace-matching below */
  }
  const s = cleaned.search(/[[{]/);
  const e = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
  if (s !== -1 && e > s) return JSON.parse(cleaned.slice(s, e + 1));
  throw new Error("Model did not return JSON");
}

export async function chatJson<T extends z.ZodTypeAny>(
  o: Omit<ChatOptions, "jsonSchema">,
  schema: T,
  name: string,
): Promise<{ data: z.infer<T>; reasoning: string | null }> {
  const jsonSchema = {
    name,
    schema: z.toJSONSchema(schema) as Record<string, unknown>,
  };
  const first = await chat({ ...o, jsonSchema });

  const tryParse = (txt: string) => {
    try {
      return schema.safeParse(extractJson(txt));
    } catch (e) {
      return { success: false as const, error: { message: String(e) } };
    }
  };

  let parsed = tryParse(first.content);
  if (parsed.success) return { data: parsed.data, reasoning: first.reasoning };

  const issues =
    "issues" in parsed.error ? parsed.error.issues : parsed.error.message;
  const repair = await chat({
    ...o,
    step: `${o.step}.repair`,
    jsonSchema,
    messages: [
      ...o.messages,
      { role: "assistant", content: first.content },
      {
        role: "user",
        content: `Your previous answer was not valid for the required JSON schema. Problems: ${JSON.stringify(
          issues,
        ).slice(
          0,
          1500,
        )}. Return ONLY corrected JSON matching this schema: ${JSON.stringify(jsonSchema.schema).slice(0, 4000)}`,
      },
    ],
  });
  parsed = tryParse(repair.content);
  if (parsed.success) return { data: parsed.data, reasoning: repair.reasoning };
  throw new Error(`Invalid JSON from ${o.model} at ${o.step}`);
}
