import { describe, it, expect } from "vitest";
import { extractJson } from "@/lib/llm/json";

describe("extractJson", () => {
  it("parses plain JSON", () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });

  it("strips a fenced code block", () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it("extracts JSON surrounded by prose", () => {
    expect(extractJson('Sure, here it is:\n{"a":1}\nHope that helps.')).toEqual({ a: 1 });
  });

  it("throws on genuinely invalid content", () => {
    expect(() => extractJson("not json at all")).toThrow();
  });

  it("extracts an array wrapped in prose", () => {
    expect(extractJson("Result: [1,2,3] done")).toEqual([1, 2, 3]);
  });
});
