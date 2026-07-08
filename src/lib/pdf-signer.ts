import { PDFDocument } from 'pdf-lib';

export type SignaturePosition = 'first' | 'last' | 'all' | 'middle';

export interface StampPlacement {
  // Position in PDF points (origin bottom-left), for the stamp's bottom-left corner
  x: number;
  y: number;
  width: number; // in PDF points
  // Optional ratios relative to the preview page size. When provided,
  // the placement is re-computed per page so it stays at the same visual
  // spot regardless of individual page dimensions.
  xRatio?: number; // x / pageWidth
  yRatio?: number; // y / pageHeight (bottom-left origin)
  widthRatio?: number; // width / pageWidth
  refPageWidth?: number;
  refPageHeight?: number;
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

    let stampWidth: number;
    let x: number;
    let y: number;
    if (placement && placement.widthRatio != null && placement.xRatio != null && placement.yRatio != null) {
      // Ratio-based placement — consistent across pages of different sizes
      stampWidth = placement.widthRatio * pw;
      const stampHeight = (stampImage.height / stampImage.width) * stampWidth;
      x = placement.xRatio * pw;
      y = placement.yRatio * ph;
      x = Math.max(0, Math.min(x, pw - stampWidth));
      y = Math.max(0, Math.min(y, ph - stampHeight));
    } else if (placement) {
      stampWidth = placement.width;
      const stampHeight = (stampImage.height / stampImage.width) * stampWidth;
      x = Math.max(0, Math.min(placement.x, pw - stampWidth));
      y = Math.max(0, Math.min(placement.y, ph - stampHeight));
    } else {
      stampWidth = 120;
      x = pw - stampWidth - 50;
      y = 50;
    }
    const stampHeight = (stampImage.height / stampImage.width) * stampWidth;

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
