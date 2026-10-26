import { PDFDocument, rgb } from "pdf-lib";
import { documentFonts, wrapText } from "./fonts";
export async function generateClusterPdf(input: {
  headline: string;
  body: string;
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const { font, bold } = await documentFonts(doc);
  const W = 595.28,
    H = 841.89,
    M = 56;
  let page = doc.addPage([W, H]);
  let y = H - 75;
  page.drawText("Nivaran: Collective Representation", {
    x: M,
    y,
    size: 18,
    font: bold,
    color: rgb(0.11, 0.1, 0.09),
  });
  y -= 32;
  for (const line of wrapText(input.headline, font, 12, W - 2 * M)) {
    page.drawText(line, { x: M, y, size: 12, font });
    y -= 18;
  }
  y -= 22;
  for (const paragraph of input.body.split("\n")) {
    for (const line of wrapText(paragraph, font, 11, W - 2 * M)) {
      if (y < M) {
        page = doc.addPage([W, H]);
        y = H - M;
      }
      page.drawText(line, { x: M, y, size: 11, font });
      y -= 18;
    }
  }
  return doc.save();
}
