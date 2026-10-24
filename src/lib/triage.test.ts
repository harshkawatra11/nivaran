import { describe, it, expect } from "vitest";
import { triage } from "@/lib/triage";
import { getPack } from "@/lib/packs/index";
import type { GrievanceFacts } from "@/lib/schemas";

const pack = getPack("in-dl");
const baseFacts = (overrides: Partial<GrievanceFacts> = {}): GrievanceFacts => ({
  category: "water_supply",
  summary: "Hand pump broken",
  locationText: "Gali no. 4",
  locality: null,
  sinceText: "41 days",
  sinceDays: 41,
  affectedEstimate: "300 families",
  priorComplaints: [],
  hazards: [],
  roadWidthHint: "not_applicable",
  facilityOperatorHint: "not_applicable",
  language: "hi",
  citizenAsk: "Fix the hand pump",
  ...overrides,
});

describe("triage", () => {
  it("flags a live-wire hazard as an emergency and calls 112", () => {
    const r = triage(baseFacts({ hazards: ["live_wire"] }), pack);
    expect(r.emergency).toEqual({ reason: "live_wire", call: "112" });
    expect(r.questions).toEqual([]);
  });

  it("flags fire as an emergency", () => {
    expect(triage(baseFacts({ hazards: ["fire"] }), pack).emergency?.reason).toBe("fire");
  });

  it("does not flag an ordinary complaint as an emergency", () => {
    expect(triage(baseFacts(), pack).emergency).toBeNull();
  });

  it("asks for road width when a road category hint is unknown", () => {
    const r = triage(baseFacts({ category: "road_pothole", roadWidthHint: "unknown" }), pack);
    expect(r.questions.some((q) => q.field === "road_width")).toBe(true);
  });

  it("does not ask for road width when already answered", () => {
    const r = triage(baseFacts({ category: "road_pothole", roadWidthHint: "unknown" }), pack, { road_width: "wide" });
    expect(r.questions.some((q) => q.field === "road_width")).toBe(false);
  });

  it("asks for location when none is given", () => {
    const r = triage(baseFacts({ locationText: "" }), pack);
    expect(r.questions.some((q) => q.field === "location")).toBe(true);
  });

  it("marks sustained water shortage as life-or-liberty track", () => {
    const r = triage(baseFacts({ hazards: ["no_drinking_water_days"] }), pack);
    expect(r.lifeOrLiberty).toBe(true);
    expect(r.emergency).toBeNull();
  });

  it("caps questions at two", () => {
    const r = triage(baseFacts({ category: "health_facility", facilityOperatorHint: "unknown", locationText: "" }), pack);
    expect(r.questions.length).toBeLessThanOrEqual(2);
  });
});
