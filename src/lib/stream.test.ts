import { describe, expect, it } from "vitest";
import { readEvents } from "./stream";

describe("pipeline stream", () => {
  it("handles split UTF-8, chunk boundaries, heartbeats, and CRLF", async () => {
    const bytes = new TextEncoder().encode(
      ': ping\r\n\r\nevent: stage\r\ndata: {"summary":"पानी"}\r\n\r\nevent: done\ndata: {}\n\n',
    );
    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        for (let i = 0; i < bytes.length; i += 3)
          c.enqueue(bytes.slice(i, i + 3));
        c.close();
      },
    });
    const events: unknown[] = [];
    await readEvents(stream, (e) => events.push(e));
    expect(events).toEqual([
      { type: "stage", payload: { summary: "पानी" } },
      { type: "done", payload: {} },
    ]);
  });
  it("reports corrupt event data instead of silently losing progress", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(new TextEncoder().encode("event: stage\ndata: invalid\n\n"));
        c.close();
      },
    });
    await expect(readEvents(stream, () => {})).rejects.toThrow();
  });
});
