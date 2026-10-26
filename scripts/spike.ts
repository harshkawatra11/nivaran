type ProbeResponse = {
  choices?: {
    message?: {
      content?: string;
      reasoning_content?: string;
      reasoning?: string;
      tool_calls?: unknown[];
    };
  }[];
};
// T02: Token Factory spike. Run with `npm run spike` after filling .env.local.
// Probes every Nemotron model tier on Token Factory for: catalog presence, plain chat,
// the `enable_thinking` toggle, structured JSON output, tool calling, and vision input.
// Writes docs/SPIKE-RESULTS.md with a table plus the decisions to copy into .env.local.
import fs from "node:fs";
import path from "node:path";

const BASE = (
  process.env.NEBIUS_BASE_URL ?? "https://api.tokenfactory.nebius.com/v1"
).replace(/\/$/, "");
const KEY = process.env.NEBIUS_API_KEY;

const IDS = {
  lightning: "nvidia/Nemotron-3_5-Lightning",
  nano: "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B",
  super: "nvidia/nemotron-3-super-120b-a12b",
  superVL: "nvidia/Nemotron-3.5-Super-VL",
  ultra: "nvidia/Nemotron-3-Ultra-550b-a55b",
} as const;

interface PostResult {
  status: number;
  ms: number;
  json: ProbeResponse | null;
  text: string;
  rl: { req: string | null; tok: string | null };
}

async function post(body: unknown): Promise<PostResult> {
  const t0 = Date.now();
  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: ProbeResponse | null = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* non-JSON error body */
  }
  return {
    status: res.status,
    ms: Date.now() - t0,
    json,
    text: text.slice(0, 500),
    rl: {
      req: res.headers.get("x-ratelimit-remaining-requests"),
      tok: res.headers.get("x-ratelimit-remaining-tokens"),
    },
  };
}

const rows: string[] = [
  "| test | model | status | ms | note |",
  "|---|---|---|---|---|",
];
function row(t: string, m: string, r: PostResult, note: string) {
  rows.push(
    `| ${t} | ${m} | ${r.status} | ${r.ms} | ${note.replace(/\|/g, "/").slice(0, 160)} |`,
  );
}

let jsonSchemaOkCount = 0;
let jsonObjectOkCount = 0;
let thinkingKwargOkCount = 0;

async function main() {
  if (!KEY) {
    console.error(
      "NEBIUS_API_KEY is not set. Fill .env.local from .env.example and retry.",
    );
    process.exit(1);
  }

  let nvIds: string[] = [];
  try {
    const modelsRes = await fetch(`${BASE}/models`, {
      headers: { Authorization: `Bearer ${KEY}` },
    });
    const models = await modelsRes.json();
    const ids: string[] = (models.data ?? []).map((m: { id: string }) => m.id);
    nvIds = ids.filter((i) => i.toLowerCase().startsWith("nvidia/"));
    for (const [k, id] of Object.entries(IDS)) {
      if (!ids.includes(id))
        rows.push(
          `| catalog-miss | ${k} (${id}) | - | - | NOT FOUND in /models |`,
        );
    }
  } catch (e) {
    rows.push(`| catalog | - | - | - | /models fetch failed: ${String(e)} |`);
  }

  for (const [k, id] of Object.entries(IDS)) {
    // 1. Plain chat
    const r1 = await post({
      model: id,
      messages: [{ role: "user", content: "Reply with the word OK" }],
      max_tokens: 256,
    });
    const msg1 = r1.json?.choices?.[0]?.message ?? {};
    row(
      "plain",
      k,
      r1,
      `reasoning=${!!(msg1.reasoning_content ?? msg1.reasoning)} thinkTag=${/<think>/.test(msg1.content ?? "")} content=${JSON.stringify(msg1.content)?.slice(0, 60)} rl=${r1.rl.req}/${r1.rl.tok}`,
    );

    // 2. enable_thinking:false toggle
    const r2 = await post({
      model: id,
      messages: [{ role: "user", content: "Reply with the word OK" }],
      max_tokens: 256,
      chat_template_kwargs: { enable_thinking: false },
    });
    if (r2.status === 200) thinkingKwargOkCount++;
    row("thinking-off", k, r2, r2.status === 200 ? "accepted" : r2.text);

    // 3. json_schema structured output
    const schema = {
      type: "object",
      properties: { a: { type: "string" } },
      required: ["a"],
      additionalProperties: false,
    };
    const r3 = await post({
      model: id,
      messages: [{ role: "user", content: 'Return JSON: {"a":"hello"}' }],
      max_tokens: 256,
      response_format: {
        type: "json_schema",
        json_schema: { name: "t", schema, strict: true },
      },
    });
    let parsedOk = false;
    try {
      JSON.parse(r3.json?.choices?.[0]?.message?.content ?? "");
      parsedOk = true;
    } catch {
      /* not valid json */
    }
    if (r3.status === 200 && parsedOk) jsonSchemaOkCount++;
    row("json-schema", k, r3, `parsed=${parsedOk}`);

    // 4. json_object fallback
    const r4 = await post({
      model: id,
      messages: [{ role: "user", content: 'Return JSON: {"a":"hello"}' }],
      max_tokens: 256,
      response_format: { type: "json_object" },
    });
    let parsedOk4 = false;
    try {
      JSON.parse(r4.json?.choices?.[0]?.message?.content ?? "");
      parsedOk4 = true;
    } catch {
      /* not valid json */
    }
    if (r4.status === 200 && parsedOk4) jsonObjectOkCount++;
    row("json-object", k, r4, `parsed=${parsedOk4}`);
  }

  // 5. Tool calling (super + ultra)
  const tool = {
    type: "function",
    function: {
      name: "get_time",
      description: "Get the current time in a timezone",
      parameters: {
        type: "object",
        properties: { tz: { type: "string" } },
        required: ["tz"],
      },
    },
  };
  for (const k of ["super", "ultra"] as const) {
    const r = await post({
      model: IDS[k],
      messages: [
        {
          role: "user",
          content: "What time is it in Asia/Kolkata? Use the tool.",
        },
      ],
      tools: [tool],
      tool_choice: "auto",
      max_tokens: 512,
    });
    const calls = r.json?.choices?.[0]?.message?.tool_calls;
    row(
      "tool-call",
      k,
      r,
      `tool_calls=${JSON.stringify(calls)?.slice(0, 120)}`,
    );
  }

  // 6. Vision (superVL) - use a 1x1 pixel jpeg if no demo photo exists yet
  let dataUrl: string;
  const photoPath = path.join(process.cwd(), "public/demo/photos/pump.jpg");
  if (fs.existsSync(photoPath)) {
    const buf = fs.readFileSync(photoPath);
    dataUrl = `data:image/jpeg;base64,${buf.toString("base64")}`;
  } else {
    // 1x1 white jpeg
    const tiny = Buffer.from(
      "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=",
      "base64",
    );
    dataUrl = `data:image/jpeg;base64,${tiny.toString("base64")}`;
  }
  const rv = await post({
    model: IDS.superVL,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "Describe this image in one sentence." },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
    max_tokens: 256,
  });
  row(
    "vision",
    "superVL",
    rv,
    `content=${JSON.stringify(rv.json?.choices?.[0]?.message?.content)?.slice(0, 100)}`,
  );

  const thinkingKwarg =
    thinkingKwargOkCount === Object.keys(IDS).length ? "on" : "off";
  const jsonMode =
    jsonSchemaOkCount >= 3
      ? "schema"
      : jsonObjectOkCount >= 3
        ? "object"
        : "prompt";
  const jsonStrict = jsonSchemaOkCount === Object.keys(IDS).length;

  const out = `# Spike results ${new Date().toISOString()}

NVIDIA ids in /models: ${nvIds.join(", ") || "(fetch failed or empty)"}

${rows.join("\n")}

## Decisions (copy into .env.local)
\`\`\`
NV_THINKING_KWARG=${thinkingKwarg}
NV_JSON_MODE=${jsonMode}
NV_JSON_STRICT=${jsonStrict}
\`\`\`
- thinking-off accepted by ${thinkingKwargOkCount}/${Object.keys(IDS).length} models
- json-schema parsed by ${jsonSchemaOkCount}/${Object.keys(IDS).length} models
- json-object parsed by ${jsonObjectOkCount}/${Object.keys(IDS).length} models

If any model ID was NOT FOUND above, update src/lib/llm/models.ts defaults and note it in docs/FEEDBACK-LOG.md.
`;

  fs.writeFileSync(path.join(process.cwd(), "docs/SPIKE-RESULTS.md"), out);
  console.log(out);
  console.log("Written to docs/SPIKE-RESULTS.md");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
