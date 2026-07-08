import { PDFDocument } from 'pdf-lib';

export type SignaturePosition = 'first' | 'last' | 'all' | 'middle';

export interface StampPlacement {
  // Position in PDF points (origin bottom-left), for the stamp's bottom-left corner
  x: number;
  y: number;
  width: number; // in PDF points
}

export async function signPDF(
  pdfBytes: ArrayBuffer,
  stampBytes: Uint8Array,
  stampType: 'png' | 'jpg',
  signerName: string,
  position: SignaturePosition,
  placement?: StampPlacement
): Promise<{ signedPdf: Uint8Array; pageCount: number }> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  const totalPages = pages.length;

  const stampImage = stampType === 'png'
    ? await pdfDoc.embedPng(stampBytes)
    : await pdfDoc.embedJpg(stampBytes);

  const pagesToSign = getPageIndices(position, totalPages);

  for (const pageIndex of pagesToSign) {
    const page = pages[pageIndex];
    const { width: pw, height: ph } = page.getSize();

    const stampWidth = placement?.width ?? 120;
    const stampHeight = (stampImage.height / stampImage.width) * stampWidth;

    let x: number;
    let y: number;
    if (placement) {
      x = Math.max(0, Math.min(placement.x, pw - stampWidth));
      y = Math.max(0, Math.min(placement.y, ph - stampHeight));
    } else {
      x = pw - stampWidth - 50;
      y = 50;
    }

    page.drawImage(stampImage, {
      x,
      y,
      width: stampWidth,
      height: stampHeight,
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
