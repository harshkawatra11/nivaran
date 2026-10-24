import { describe, it, expect } from "vitest";
import { resolveJurisdiction } from "@/lib/jurisdiction";
import { getPack } from "@/lib/packs/index";
import type { GrievanceFacts } from "@/lib/schemas";

const pack = getPack("in-dl");
const facts = (overrides: Partial<GrievanceFacts> = {}): GrievanceFacts => ({
  category: "water_supply",
  summary: "x",
  locationText: "",
  locality: null,
  sinceText: null,
  sinceDays: null,
  affectedEstimate: null,
  priorComplaints: [],
  hazards: [],
  roadWidthHint: "not_applicable",
  facilityOperatorHint: "not_applicable",
  language: "en",
  citizenAsk: "x",
  ...overrides,
});

describe("resolveJurisdiction", () => {
  it("routes water supply to Delhi Jal Board", () => {
    const r = resolveJurisdiction(pack, facts({ category: "water_supply" }));
    expect(r.ok).toBe(true);
    expect(r.authority?.shortName).toBe("DJB");
  });

  it("routes garbage in an NDMC locality to NDMC, not MCD", () => {
    const r = resolveJurisdiction(pack, facts({ category: "garbage_sanitation", locationText: "near Khan Market" }));
    expect(r.authority?.shortName).toBe("NDMC");
  });

  it("routes garbage outside NDMC/Cantonment to MCD by default", () => {
    const r = resolveJurisdiction(pack, facts({ category: "garbage_sanitation", locationText: "Rohini sector 5" }));
    expect(r.authority?.shortName).toBe("MCD");
  });

  it("routes a wide road to PWD", () => {
    const r = resolveJurisdiction(pack, facts({ category: "road_pothole", roadWidthHint: "wide" }));
    expect(r.authority?.shortName).toBe("PWD Delhi");
  });

  it("routes a narrow road to MCD", () => {
    const r = resolveJurisdiction(pack, facts({ category: "road_pothole", roadWidthHint: "narrow" }));
    expect(r.authority?.shortName).toBe("MCD");
  });

  it("is blocked needing input when road width is unknown and unanswered", () => {
    const r = resolveJurisdiction(pack, facts({ category: "road_pothole", roadWidthHint: "unknown" }));
    expect(r.ok).toBe(false);
    expect(r.blocked).toBe("needs_input");
  });

  it("uses the road_width answer when provided", () => {
    const r = resolveJurisdiction(pack, facts({ category: "road_pothole", roadWidthHint: "unknown" }), { road_width: "wide" });
    expect(r.ok).toBe(true);
    expect(r.authority?.shortName).toBe("PWD Delhi");
  });

  it("routes a Delhi Govt dispensary to the Delhi Health Dept", () => {
    const r = resolveJurisdiction(pack, facts({ category: "health_facility", facilityOperatorHint: "delhi_govt" }));
    expect(r.authority?.shortName).toBe("Delhi Health Dept");
  });

  it("routes an MCD dispensary to MCD Health", () => {
    const r = resolveJurisdiction(pack, facts({ category: "health_facility", facilityOperatorHint: "mcd" }));
    expect(r.authority?.shortName).toBe("MCD Health");
  });

  it("refuses to guess for an uncovered category", () => {
    const r = resolveJurisdiction(pack, facts({ category: "other" }));
    expect(r.ok).toBe(false);
    expect(r.blocked).toBe("uncovered_category");
  });

  it("routes pension requests to the Social Welfare Dept", () => {
    const r = resolveJurisdiction(pack, facts({ category: "pension_welfare" }));
    expect(r.authority?.shortName).toBe("Social Welfare Dept");
  });

  it("routes a Cantonment-area complaint to the Cantonment Board", () => {
    const r = resolveJurisdiction(pack, facts({ category: "garbage_sanitation", locationText: "Delhi Cantt area" }));
    expect(r.authority?.shortName).toBe("Cantonment Board");
  });
});
