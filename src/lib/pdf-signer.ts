import { PDFDocument, degrees } from 'pdf-lib';

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
    // Use the visible PDF box (CropBox) instead of the full MediaBox.
    // Excel/large exported PDFs often have a CropBox offset or a rotated
    // visible area; the preview is based on that visible box, so signing
    // must use it too or the stamp drifts on heavy/non-A4 documents.
    const cropBox = page.getCropBox();
    const boxX = cropBox.x;
    const boxY = cropBox.y;
    const boxW = cropBox.width;
    const boxH = cropBox.height;
    // Page /Rotate — display rotation applied at view time (0/90/180/270 CW)
    const rot = ((page.getRotation().angle % 360) + 360) % 360;
    const sideways = rot === 90 || rot === 270;
    // Visible dimensions (what the user saw in the preview and what ratios refer to)
    const Wv = sideways ? boxH : boxW;
    const Hv = sideways ? boxW : boxH;
    const aspect = stampImage.height / stampImage.width;

    // Compute stamp size + visible bottom-left (xv, yv) target
    let sw: number; // visible stamp width
    let sh: number; // visible stamp height
    let xv: number;
    let yv: number;
    if (placement && placement.widthRatio != null && placement.xRatio != null && placement.yRatio != null) {
      sw = placement.widthRatio * Wv;
      sh = aspect * sw;
      xv = placement.xRatio * Wv;
      yv = placement.yRatio * Hv;
    } else if (placement) {
      sw = placement.width;
      sh = aspect * sw;
      xv = placement.x;
      yv = placement.y;
    } else {
      sw = 120;
      sh = aspect * sw;
      xv = Wv - sw - 50;
      yv = 50;
    }
    // Keep the stamp inside the visible page, including very small or
    // mixed-format pages in large documents.
    if (sw > Wv) {
      sw = Wv;
      sh = aspect * sw;
    }
    if (sh > Hv) {
      sh = Hv;
      sw = sh / aspect;
    }
    xv = Math.max(0, Math.min(xv, Wv - sw));
    yv = Math.max(0, Math.min(yv, Hv - sh));

    // Map (xv, yv) in VISIBLE bottom-left space to the DRAW coords
    // (unrotated page) + a matching drawImage rotation so the stamp
    // appears upright at the intended visible position regardless of
    // the page's /Rotate value.
    let dx: number, dy: number;
    switch (rot) {
      case 90:
        dx = boxX + boxW - yv;
        dy = boxY + xv;
        break;
      case 180:
        dx = boxX + boxW - xv;
        dy = boxY + boxH - yv;
        break;
      case 270:
        dx = boxX + yv;
        dy = boxY + boxH - xv;
        break;
      case 0:
      default:
        dx = boxX + xv;
        dy = boxY + yv;
    }

    page.drawImage(stampImage, {
      x: dx,
      y: dy,
      width: sw,
      height: sh,
      rotate: degrees(rot),
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
