// POST: start (or resume) the pipeline for a case and stream progress as SSE.
import { db } from "@/lib/db";
import { getSessionId } from "@/lib/session";
import { runPipeline } from "@/lib/pipeline/run";

export const maxDuration = 300;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!process.env.NEBIUS_API_KEY)
    return Response.json(
      {
        error:
          "Complaint processing is not configured yet. Your report is saved; please return later.",
      },
      { status: 503 },
    );
  const sid = await getSessionId(false);
  const supa = db();

  const { data: caseRow } = await supa
    .from("cases")
    .select("id, session_id, is_demo_seed")
    .eq("id", id)
    .single();
  if (!caseRow) return new Response("Not found", { status: 404 });
  const isOwner = sid && caseRow.session_id === sid;
  if (!isOwner) return new Response("Not found", { status: 404 });

  const { data: claimed, error: claimError } = await supa
    .from("cases")
    .update({ status: "processing" })
    .eq("id", id)
    .in("status", ["intake", "failed"])
    .select("id")
    .maybeSingle();
  if (claimError)
    return Response.json(
      { error: "Could not start processing." },
      { status: 500 },
    );
  if (!claimed)
    return Response.json(
      { error: "This case is already processing or has completed." },
      { status: 409 },
    );
  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (ev: { type: string; payload: unknown }) => {
        try {
          controller.enqueue(
            enc.encode(
              `event: ${ev.type}\ndata: ${JSON.stringify(ev.payload)}\n\n`,
            ),
          );
        } catch {
          /* controller already closed */
        }
      };
      const ping = setInterval(() => {
        try {
          controller.enqueue(enc.encode(`: ping\n\n`));
        } catch {
          clearInterval(ping);
        }
      }, 10_000);

      try {
        await runPipeline(id, send);
      } catch (e) {
        send({
          type: "error",
          payload: { message: e instanceof Error ? e.message : String(e) },
        });
      } finally {
        clearInterval(ping);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
