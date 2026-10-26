import { PDFDocument, PDFFont } from "pdf-lib";
import * as fontkit from "fontkit";
import { readFile } from "node:fs/promises";
import path from "node:path";
export async function documentFonts(doc: PDFDocument) {
  doc.registerFontkit(
    fontkit as unknown as Parameters<PDFDocument["registerFontkit"]>[0],
  );
  const [regular, bold] = await Promise.all([
    readFile(
      path.join(process.cwd(), "public/fonts/TiroDevanagariHindi-Regular.ttf"),
    ),
    readFile(
      path.join(process.cwd(), "public/fonts/TiroDevanagariHindi-Regular.ttf"),
    ),
  ]);
  return {
    font: await doc.embedFont(regular, { subset: false }),
    bold: await doc.embedFont(bold, { subset: false }),
  };
}
export function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  width: number,
): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const candidate = line ? line + " " + word : word;
    if (font.widthOfTextAtSize(candidate, size) <= width) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = "";
    for (const ch of Array.from(word)) {
      if (line && font.widthOfTextAtSize(line + ch, size) > width) {
        lines.push(line);
        line = "";
      }
      line += ch;
    }
  }
  if (line || !lines.length) lines.push(line);
  return lines;
}
