import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function generateClusterPdf(input: { headline: string; body: string }): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const PAGE_W = 595.28;
  const PAGE_H = 841.89;
  const MARGIN = 56;

  let page = doc.addPage([PAGE_W, PAGE_H]);
  page.drawText("Nivaran: Collective Representation", { x: MARGIN, y: PAGE_H - 80, size: 20, font: bold, color: rgb(0.11, 0.1, 0.09) });
  page.drawText(input.headline, { x: MARGIN, y: PAGE_H - 110, size: 12, font, color: rgb(0.3, 0.27, 0.24) });

  const maxChars = Math.floor((PAGE_W - 2 * MARGIN) / (11 * 0.52));
  let y = PAGE_H - 150;
  for (const para of input.body.split("\n")) {
    const words = para.split(" ");
    let cur = "";
    const lines: string[] = [];
    for (const w of words) {
      if ((cur + " " + w).trim().length > maxChars) {
        lines.push(cur);
        cur = w;
      } else cur = (cur + " " + w).trim();
    }
    if (cur) lines.push(cur);
    for (const line of lines.length ? lines : [""]) {
      if (y < MARGIN) {
        page = doc.addPage([PAGE_W, PAGE_H]);
        y = PAGE_H - MARGIN;
      }
      page.drawText(line, { x: MARGIN, y, size: 11, font });
      y -= 15;
    }
  }
  return doc.save();
}
