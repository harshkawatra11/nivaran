import { describe, it, expect } from "vitest";
import { effectiveNow, isoDate, addDays, daysBetween, isPast } from "@/lib/clock";

describe("clock", () => {
  it("effectiveNow shifts by offsetDays", () => {
    const real = new Date("2026-10-25T10:00:00Z");
    expect(isoDate(effectiveNow(0, real))).toBe("2026-10-25");
    expect(isoDate(effectiveNow(30, real))).toBe("2026-11-24");
  });

  it("addDays handles month and year rollover", () => {
    expect(addDays("2026-10-25", 30)).toBe("2026-11-24");
    expect(addDays("2026-12-20", 15)).toBe("2027-01-04");
  });

  it("daysBetween counts whole days", () => {
    expect(daysBetween("2026-10-01", new Date("2026-10-11T12:00:00Z"))).toBe(10);
  });

  it("isPast compares against end-of-day UTC", () => {
    expect(isPast("2026-10-24", new Date("2026-10-25T00:00:00Z"))).toBe(true);
    expect(isPast("2026-10-25", new Date("2026-10-25T10:00:00Z"))).toBe(false);
  });
});
