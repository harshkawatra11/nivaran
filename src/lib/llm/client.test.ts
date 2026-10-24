import { describe, it, expect } from "vitest";
import { splitReasoning } from "@/lib/llm/client";

describe("splitReasoning", () => {
  it("extracts a <think> block and strips it from content", () => {
    const r = splitReasoning("<think>pondering</think>Final answer.", null);
    expect(r.reasoning).toBe("pondering");
    expect(r.content).toBe("Final answer.");
  });

  it("uses the sibling reasoning_content field when no think tag exists", () => {
    const r = splitReasoning("Final answer.", "separate reasoning");
    expect(r.reasoning).toBe("separate reasoning");
    expect(r.content).toBe("Final answer.");
  });

  it("returns null reasoning when neither is present", () => {
    const r = splitReasoning("Just the answer.", null);
    expect(r.reasoning).toBeNull();
    expect(r.content).toBe("Just the answer.");
  });
});
