export interface StreamEvent {
  type: string;
  payload: Record<string, unknown>;
}
export async function readEvents(
  stream: ReadableStream<Uint8Array>,
  receive: (event: StreamEvent) => void,
) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  function flush() {
    let match: RegExpExecArray | null;
    while ((match = /\r?\n\r?\n/.exec(buffer))) {
      const lines = buffer.slice(0, match.index).split(/\r?\n/);
      buffer = buffer.slice(match.index + match[0].length);
      const type =
        lines
          .find((l) => l.startsWith("event:"))
          ?.slice(6)
          .trim() ?? "message";
      const data = lines
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.slice(5).trimStart())
        .join("\n");
      if (data) receive({ type, payload: JSON.parse(data) });
    }
  }
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      flush();
    }
    buffer += decoder.decode();
    flush();
  } finally {
    reader.releaseLock();
  }
}
