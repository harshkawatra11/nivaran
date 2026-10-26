import { PDFDocument, rgb } from "pdf-lib";
import { documentFonts, wrapText } from "./fonts";
const W = 595.28,
  H = 841.89,
  M = 56;
export async function generatePacketPdf(input: {
  caseId: string;
  title: string;
  body: string;
  bodyHi?: string | null;
  authorityName: string;
  caseUrl: string;
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const { font, bold } = await documentFonts(doc);
  doc.setTitle(input.title);
  doc.setAuthor("Nivaran");
  const cover = doc.addPage([W, H]);
  cover.drawText("Nivaran", {
    x: M,
    y: H - 100,
    size: 28,
    font: bold,
    color: rgb(0.11, 0.1, 0.09),
  });
  let y = H - 145;
  for (const line of wrapText(input.title, font, 14, W - 2 * M)) {
    cover.drawText(line, { x: M, y, size: 14, font });
    y -= 21;
  }
  y -= 20;
  for (const text of [
    `Authority: ${input.authorityName}`,
    `Case: ${input.caseUrl}`,
  ]) {
    for (const line of wrapText(text, font, 10, W - 2 * M)) {
      cover.drawText(line, { x: M, y, size: 10, font });
      y -= 17;
    }
    y -= 8;
  }
  cover.drawText(
    "Prepared by Nivaran. Not legal advice. Review before filing.",
    { x: M, y: 60, size: 9, font, color: rgb(0.4, 0.4, 0.35) },
  );
  for (const [language, body] of [
    ["English", input.body],
    ["हिंदी", input.bodyHi],
  ] as const) {
    if (!body) continue;
    let page = doc.addPage([W, H]);
    y = H - M;
    page.drawText(language, { x: M, y, size: 12, font: bold });
    y -= 30;
    for (const paragraph of body.split("\n")) {
      for (const line of wrapText(paragraph, font, 11, W - 2 * M)) {
        if (y < M) {
          page = doc.addPage([W, H]);
          y = H - M;
        }
        page.drawText(line, { x: M, y, size: 11, font });
        y -= 18;
      }
    }
  }
  return doc.save();
}
