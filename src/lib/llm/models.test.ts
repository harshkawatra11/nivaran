import { describe, it, expect } from "vitest";
import { costUsd } from "@/lib/llm/models";

describe("costUsd", () => {
  it("prices a pure-output ultra call at its out rate", () => {
    expect(costUsd("ultra", 1_000_000, 0, 0)).toBeCloseTo(1, 6);
  });

  it("prices cached tokens at the cached rate, not the input rate", () => {
    const withoutCache = costUsd("lightning", 1_000_000, 0, 0);
    const withCache = costUsd("lightning", 1_000_000, 0, 1_000_000);
    expect(withCache).toBeLessThanOrEqual(withoutCache);
  });

  it("zero usage costs zero", () => {
    expect(costUsd("super", 0, 0, 0)).toBe(0);
  });
});
