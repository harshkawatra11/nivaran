import { describe, it, expect } from "vitest";
import { groupCases, isSystemic, isOverdueStatus, type ClusterInput } from "@/lib/cluster";

const mk = (overrides: Partial<ClusterInput>): ClusterInput => ({
  id: crypto.randomUUID(),
  category: "water_supply",
  geohash6: "ttnfuc",
  created_at: new Date().toISOString(),
  status: "filed",
  overdue: false,
  ...overrides,
});

describe("isOverdueStatus", () => {
  it("treats overdue and later ladder statuses as overdue", () => {
    expect(isOverdueStatus("overdue")).toBe(true);
    expect(isOverdueStatus("rti_filed")).toBe(true);
    expect(isOverdueStatus("second_appeal_ready")).toBe(true);
  });
  it("does not treat filed or resolved as overdue", () => {
    expect(isOverdueStatus("filed")).toBe(false);
    expect(isOverdueStatus("resolved")).toBe(false);
  });
});

describe("groupCases", () => {
  const now = new Date("2026-10-25T00:00:00Z");

  it("groups by category + geohash6", () => {
    const cases = [mk({}), mk({}), mk({ category: "garbage_sanitation" })];
    const groups = groupCases(cases, 60, now);
    expect(groups.size).toBe(2);
    expect(groups.get("water_supply|ttnfuc")?.length).toBe(2);
  });

  it("excludes cases with no geohash6", () => {
    const groups = groupCases([mk({ geohash6: null })], 60, now);
    expect(groups.size).toBe(0);
  });

  it("excludes category 'other'", () => {
    const groups = groupCases([mk({ category: "other" })], 60, now);
    expect(groups.size).toBe(0);
  });

  it("excludes cases older than the window", () => {
    const old = mk({ created_at: new Date("2026-01-01T00:00:00Z").toISOString() });
    const groups = groupCases([old], 60, now);
    expect(groups.size).toBe(0);
  });
});

describe("isSystemic", () => {
  const t = { cases: 5, overdue: 3 };
  it("is systemic once the case-count threshold is reached", () => {
    const group = Array.from({ length: 5 }, () => mk({}));
    expect(isSystemic(group, t)).toBe(true);
  });
  it("is systemic once the overdue threshold is reached, even with fewer total cases", () => {
    const group = [mk({ overdue: true }), mk({ overdue: true }), mk({ overdue: true })];
    expect(isSystemic(group, t)).toBe(true);
  });
  it("is not systemic below both thresholds", () => {
    const group = [mk({}), mk({ overdue: true })];
    expect(isSystemic(group, t)).toBe(false);
  });
});
