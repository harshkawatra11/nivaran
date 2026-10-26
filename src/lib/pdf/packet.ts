// Document-to-PDF rendering with pdf-lib. Simple paginated text layout: a cover page plus
// the letter body, word-wrapped at a fixed column width. Adapted in spirit from Adhikaar's
// src/lib/pdf/generate.ts (same author's earlier project), simplified for Nivaran's single
// English-letter-body shape.
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const PAGE_W = 595.28; // A4
const PAGE_H = 841.89;
const MARGIN = 56;
const FONT_SIZE = 11;
const LINE_HEIGHT = 15;

function wrapLine(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > maxChars) {
      if (cur) lines.push(cur);
      cur = w;
    } else {
      cur = (cur + " " + w).trim();
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

export async function generatePacketPdf(input: {
  caseId: string;
  title: string;
  body: string;
  authorityName: string;
  caseUrl: string;
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  // Cover page
  const cover = doc.addPage([PAGE_W, PAGE_H]);
  cover.drawText("Nivaran", { x: MARGIN, y: PAGE_H - 100, size: 28, font: bold, color: rgb(0.11, 0.1, 0.09) });
  cover.drawText(input.title, { x: MARGIN, y: PAGE_H - 140, size: 14, font, color: rgb(0.3, 0.27, 0.24) });
  cover.drawText(`Authority: ${input.authorityName}`, { x: MARGIN, y: PAGE_H - 170, size: 11, font });
  cover.drawText(`Case: ${input.caseUrl}`, { x: MARGIN, y: PAGE_H - 190, size: 10, font, color: rgb(0.2, 0.44, 0.39) });
  cover.drawText("Prepared by Nivaran. Not legal advice. Review before filing.", { x: MARGIN, y: 60, size: 9, font, color: rgb(0.48, 0.45, 0.4) });

  // Letter body, paginated
  const maxChars = Math.floor((PAGE_W - 2 * MARGIN) / (FONT_SIZE * 0.52));
  const paragraphs = input.body.split("\n");
  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  for (const para of paragraphs) {
    const lines = para.length ? wrapLine(para, maxChars) : [""];
    for (const line of lines) {
      if (y < MARGIN) {
        page = doc.addPage([PAGE_W, PAGE_H]);
        y = PAGE_H - MARGIN;
      }
      page.drawText(line, { x: MARGIN, y, size: FONT_SIZE, font });
      y -= LINE_HEIGHT;
    }
  }

  return doc.save();
}
