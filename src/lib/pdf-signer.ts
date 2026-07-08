import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export type SignaturePosition = 'first' | 'last' | 'all' | 'middle';

export async function signPDF(
  pdfBytes: ArrayBuffer,
  stampBytes: Uint8Array,
  stampType: 'png' | 'jpg',
  signerName: string,
  position: SignaturePosition
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
    const { width } = page.getSize();

    const stampWidth = 100;
    const stampHeight = (stampImage.height / stampImage.width) * stampWidth;
    const x = width - stampWidth - 50;
    const yBase = 50;

    page.drawImage(stampImage, {
      x,
      y: yBase + 35,
      width: stampWidth,
      height: stampHeight,
    });

    page.drawText(signerName, {
      x,
      y: yBase + 22,
      size: 8,
      font,
      color: rgb(0.1, 0.1, 0.3),
    });

    page.drawText(dateStr, {
      x,
      y: yBase + 12,
      size: 6.5,
      font,
      color: rgb(0.3, 0.3, 0.5),
    });

    page.drawText('Signature électronique SENSTOCK', {
      x,
      y: yBase + 2,
      size: 5.5,
      font,
      color: rgb(0.4, 0.4, 0.6),
    });
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
