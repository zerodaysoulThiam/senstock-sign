import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export type SignaturePosition = 'first' | 'last' | 'all' | 'middle';

export interface CustomSignaturePosition {
  x: number; // percentage 0-100
  y: number;
  width: number; // pixels at 72dpi reference
  height: number;
  nameX: number;
  nameY: number;
}

export async function signPDF(
  pdfBytes: ArrayBuffer,
  stampBytes: Uint8Array,
  stampType: 'png' | 'jpg',
  signerName: string,
  position: SignaturePosition,
  customPos?: CustomSignaturePosition,
): Promise<{ signedPdf: Uint8Array; pageCount: number }> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  const totalPages = pages.length;

  const stampImage = stampType === 'png'
    ? await pdfDoc.embedPng(stampBytes)
    : await pdfDoc.embedJpg(stampBytes);

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const now = new Date();
  const dateStr = now.toLocaleDateString('fr-FR') + ' à ' + now.toLocaleTimeString('fr-FR');

  const pagesToSign = getPageIndices(position, totalPages);

  for (const pageIndex of pagesToSign) {
    const page = pages[pageIndex];
    const { width: pageW, height: pageH } = page.getSize();

    if (customPos) {
      // Custom drag-and-drop position
      const stampWidth = customPos.width * (pageW / 600); // scale from preview to PDF
      const stampHeight = (stampImage.height / stampImage.width) * stampWidth;
      const x = (customPos.x / 100) * pageW - stampWidth / 2;
      const y = pageH - (customPos.y / 100) * pageH - stampHeight / 2;

      page.drawImage(stampImage, { x, y, width: stampWidth, height: stampHeight });

      const nameX = (customPos.nameX / 100) * pageW;
      const nameY = pageH - (customPos.nameY / 100) * pageH;

      page.drawText(signerName, {
        x: nameX - 30,
        y: nameY + 5,
        size: 8,
        font,
        color: rgb(0.1, 0.1, 0.3),
      });

      page.drawText(dateStr, {
        x: nameX - 30,
        y: nameY - 5,
        size: 6.5,
        font,
        color: rgb(0.3, 0.3, 0.5),
      });

      page.drawText('Signature électronique SENSTOCK', {
        x: nameX - 30,
        y: nameY - 14,
        size: 5.5,
        font,
        color: rgb(0.4, 0.4, 0.6),
      });
    } else {
      // Legacy fixed position
      const stampWidth = 100;
      const stampHeight = (stampImage.height / stampImage.width) * stampWidth;
      const x = pageW - stampWidth - 50;
      const yBase = 50;

      page.drawImage(stampImage, { x, y: yBase + 35, width: stampWidth, height: stampHeight });
      page.drawText(signerName, { x, y: yBase + 22, size: 8, font, color: rgb(0.1, 0.1, 0.3) });
      page.drawText(dateStr, { x, y: yBase + 12, size: 6.5, font, color: rgb(0.3, 0.3, 0.5) });
      page.drawText('Signature électronique SENSTOCK', { x, y: yBase + 2, size: 5.5, font, color: rgb(0.4, 0.4, 0.6) });
    }
  }

  const signedPdf = await pdfDoc.save();
  return { signedPdf, pageCount: totalPages };
}

function getPageIndices(position: SignaturePosition, total: number): number[] {
  switch (position) {
    case 'first': return [0];
    case 'last': return [total - 1];
    case 'middle': return [Math.floor(total / 2)];
    case 'all': return Array.from({ length: total }, (_, i) => i);
    default: return [0];
  }
}
