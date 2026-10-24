import { describe, it, expect } from "vitest";
import { geohash } from "@/lib/geohash";

describe("geohash", () => {
  it("encodes a known Delhi coordinate at precision 6", () => {
    // Verified against a standalone reference implementation (base32 geohash, see
    // docs/FEEDBACK-LOG.md for the verification note).
    expect(geohash(28.6139, 77.209, 6)).toBe("ttnfuc");
  });

  it("encodes at precision 7", () => {
    expect(geohash(28.6139, 77.209, 7)).toBe("ttnfucj");
  });

  it("nearby points share the same geohash6 prefix", () => {
    const a = geohash(28.6139, 77.209, 6);
    const b = geohash(28.6142, 77.2093, 6);
    expect(a).toBe(b);
  });

  it("distant points differ", () => {
    expect(geohash(28.6139, 77.209, 6)).not.toBe(geohash(19.076, 72.8777, 6));
  });
});
