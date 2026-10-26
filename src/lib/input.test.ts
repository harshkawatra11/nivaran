import { describe, it, expect } from "vitest";
import {
  validDate,
  imageError,
  reportError,
  ownsCase,
  canFileStep,
  median,
} from "./input";
describe("citizen input validation", () => {
  it("rejects impossible calendar dates", () => {
    expect(validDate("2026-02-30")).toBe(false);
    expect(validDate("2024-02-29")).toBe(true);
    expect(validDate("2026-13-01")).toBe(false);
  });
  it("refuses unsupported or oversized evidence", () => {
    expect(imageError({ type: "image/svg+xml", size: 30 })).toBeTruthy();
    expect(imageError({ type: "image/jpeg", size: 1500001 })).toBeTruthy();
    expect(imageError({ type: "image/png", size: 50 })).toBeNull();
  });
  it("rejects invalid location coordinates and oversized text", () => {
    expect(
      reportError({ text: "Pump broken", lat: 100, lng: 77 }),
    ).toBeTruthy();
    expect(
      reportError({ text: "Pump broken", lat: 28, lng: null }),
    ).toBeTruthy();
    expect(reportError({ text: " ", lat: null, lng: null })).toBeTruthy();
    expect(
      reportError({ text: "a".repeat(6001), lat: null, lng: null }),
    ).toBeTruthy();
    expect(
      reportError({ text: "पानी नहीं आ रहा", lat: 28.49, lng: 77.24 }),
    ).toBeNull();
  });
  it("never treats two missing sessions as ownership", () => {
    expect(ownsCase(null, null)).toBe(false);
    expect(ownsCase("owner", "owner")).toBe(true);
    expect(ownsCase("owner", "other")).toBe(false);
  });
  it("requires a prepared escalation before recording its filing", () => {
    expect(canFileStep("ready", "first_appeal")).toBe(false);
    expect(canFileStep("rti_ready", "rti")).toBe(true);
    expect(canFileStep("appeal_ready", "first_appeal")).toBe(true);
  });
  it("reports the median instead of the average", () => {
    expect(median([1, 2, 90])).toBe(2);
    expect(median([1, 3])).toBe(2);
    expect(median([])).toBe(0);
  });
});
