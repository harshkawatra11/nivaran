import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { generatePacketPdf } from "./packet";
describe("filing PDF", () => {
  it("renders model punctuation and Hindi evidence without losing the filing", async () => {
    const bytes = await generatePacketPdf({
      caseId: "demo",
      title: "Non‑functional handpump — पानी",
      body: "The community’s pump is non‑functional.\nहैंडपंप खराब है।",
      authorityName: "Delhi Jal Board",
      caseUrl: "https://example.com/case/demo",
    });
    expect(
      (await PDFDocument.load(bytes)).getPageCount(),
    ).toBeGreaterThanOrEqual(2);
  });
});
