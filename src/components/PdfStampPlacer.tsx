import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown } from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export interface PlacementResult {
  x: number; // PDF points, bottom-left origin
  y: number;
  width: number; // PDF points
  pageWidth: number;
  pageHeight: number;
  pageIndex: number; // page under the stamp (0-based)
}

interface Props {
  pdfBytes: ArrayBuffer;
  stampSrc: string;
  onChange: (p: PlacementResult) => void;
  // Persisted ratio-based placement so late PDF loads (heavy files) or
  // re-mounts do not reset the stamp position.
  initialRatio?: { xRatio: number; yRatio: number; widthRatio: number } | null;
  // Page to scroll to when the preview opens (0-based)
  initialPageIndex?: number;
}

interface PageInfo {
  pdfW: number;
  pdfH: number;
  w: number; // CSS px
  h: number; // CSS px
  top: number; // CSS px offset inside the stack
}

const GAP = 16;

export default function PdfStampPlacer({ pdfBytes, stampSrc, onChange, initialRatio, initialPageIndex = 0 }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const renderedRef = useRef<Set<number>>(new Set());
  const pdfRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const bytesKeyRef = useRef<ArrayBuffer | null>(null);
  const scrolledOnceRef = useRef(false);
  const placedRef = useRef(false);

  const [pages, setPages] = useState<PageInfo[]>([]);
  const [docWidth, setDocWidth] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  // Stamp in CSS px, top-left origin, relative to the whole page stack
  const [stamp, setStamp] = useState({ x: 20, y: 20, w: 140, h: 70 });
  const [imgAspect, setImgAspect] = useState(2);
  const dragRef = useRef<{ dx: number; dy: number; mode: 'move' | 'resize' } | null>(null);

  const totalHeight = pages.length ? pages[pages.length - 1].top + pages[pages.length - 1].h : 0;

  // ---- Load document + compute page layout -------------------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        if (bytesKeyRef.current !== pdfBytes) {
          bytesKeyRef.current = pdfBytes;
          pdfRef.current = null;
          renderedRef.current = new Set();
          scrolledOnceRef.current = false;
        }
        if (!pdfRef.current) {
          pdfRef.current = await pdfjsLib.getDocument({ data: pdfBytes.slice(0) }).promise;
        }
        const pdf = pdfRef.current;

        // Wait for the container to have a real width (mobile layout can be 0)
        let container = scrollRef.current;
        let tries = 0;
        while ((!container || container.clientWidth < 50) && tries < 20 && !cancelled) {
          await new Promise(r => setTimeout(r, 50));
          container = scrollRef.current;
          tries++;
        }
        if (cancelled) return;

        const avail = Math.max(280, (container ? container.clientWidth : window.innerWidth - 32) - 24);
        const first = await pdf.getPage(1);
        const firstVp = first.getViewport({ scale: 1 });
        const isMobile = window.innerWidth < 768;
        const scale = Math.min(isMobile ? 1.4 : 2, avail / firstVp.width);

        const infos: PageInfo[] = [];
        let top = 0;
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = i === 1 ? first : await pdf.getPage(i);
          const vp = page.getViewport({ scale: 1 });
          const w = vp.width * scale;
          const h = vp.height * scale;
          infos.push({ pdfW: vp.width, pdfH: vp.height, w, h, top });
          top += h + GAP;
          if (cancelled) return;
        }
        setPages(infos);
        setDocWidth(Math.max(...infos.map(p => p.w)));
        setLoading(false);
      } catch (err) {
        console.error('PDF layout error:', err);
        if (!cancelled) {
          setError("Impossible d'afficher l'aperçu du PDF. Vous pouvez tout de même signer.");
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [pdfBytes]);

  useEffect(() => () => {
    (pdfRef.current as { destroy?: () => void } | null)?.destroy?.();
    pdfRef.current = null;
  }, []);

  // ---- Lazy render of visible pages --------------------------------------
  const renderPage = useCallback(async (index: number) => {
    const pdf = pdfRef.current;
    const info = pages[index];
    const canvas = canvasRefs.current[index];
    if (!pdf || !info || !canvas || renderedRef.current.has(index)) return;
    renderedRef.current.add(index);
    try {
      const page = await pdf.getPage(index + 1);
      const scale = info.w / info.pdfW;
      const viewport = page.getViewport({ scale });
      const isMobile = window.innerWidth < 768;
      const ratio = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);
      canvas.width = Math.floor(viewport.width * ratio);
      canvas.height = Math.floor(viewport.height * ratio);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      const ctx = canvas.getContext('2d')!;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
    } catch (err) {
      renderedRef.current.delete(index);
      console.error('PDF page render error', index, err);
    }
  }, [pages]);

  const syncVisiblePages = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !pages.length) return;
    const top = el.scrollTop;
    const bottom = top + el.clientHeight;
    let current = 0;
    pages.forEach((p, i) => {
      const visible = p.top < bottom + p.h && p.top + p.h > top - p.h; // 1 page margin
      if (visible) renderPage(i);
      if (p.top <= top + el.clientHeight / 3) current = i;
    });
    setCurrentPage(current);
  }, [pages, renderPage]);

  useLayoutEffect(() => {
    if (!pages.length) return;
    const el = scrollRef.current;
    if (el && !scrolledOnceRef.current) {
      scrolledOnceRef.current = true;
      const target = pages[Math.min(Math.max(initialPageIndex, 0), pages.length - 1)];
      el.scrollTop = target.top;
    }
    syncVisiblePages();
  }, [pages, initialPageIndex, syncVisiblePages]);

  // ---- Stamp aspect ratio -------------------------------------------------
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const a = img.width / img.height;
      setImgAspect(a);
      setStamp(s => ({ ...s, h: s.w / a }));
    };
    img.src = stampSrc;
  }, [stampSrc]);

  // ---- Default / restored placement --------------------------------------
  useEffect(() => {
    if (!pages.length || placedRef.current) return;
    placedRef.current = true;
    const idx = Math.min(Math.max(initialPageIndex, 0), pages.length - 1);
    const page = pages[idx];
    const left = (docWidth - page.w) / 2;
    if (initialRatio) {
      const w = Math.max(40, initialRatio.widthRatio * page.w);
      const h = w / imgAspect;
      const x = left + Math.max(0, Math.min(initialRatio.xRatio * page.w, page.w - w));
      const yLocal = Math.max(0, Math.min((1 - initialRatio.yRatio) * page.h - h, page.h - h));
      setStamp({ x, y: page.top + yLocal, w, h });
    } else {
      const margin = Math.max(12, page.w * 0.04);
      const w = Math.max(60, Math.min(page.w * 0.28, page.w - margin * 2));
      const h = w / imgAspect;
      setStamp({
        x: left + Math.max(0, page.w - w - margin),
        y: page.top + Math.max(0, page.h - h - margin),
        w,
        h,
      });
    }
  }, [pages, docWidth, initialRatio, initialPageIndex, imgAspect]);

  // ---- Report placement ---------------------------------------------------
  useEffect(() => {
    if (!pages.length) return;
    const center = stamp.y + stamp.h / 2;
    let idx = pages.findIndex(p => center >= p.top && center <= p.top + p.h);
    if (idx === -1) {
      idx = pages.reduce((best, p, i) => {
        const d = Math.abs(p.top + p.h / 2 - center);
        return d < Math.abs(pages[best].top + pages[best].h / 2 - center) ? i : best;
      }, 0);
    }
    const page = pages[idx];
    const left = (docWidth - page.w) / 2;
    const scale = page.pdfW / page.w;
    const localX = Math.max(0, Math.min(stamp.x - left, page.w - stamp.w));
    const localY = Math.max(0, Math.min(stamp.y - page.top, page.h - stamp.h));
    onChange({
      x: localX * scale,
      y: page.pdfH - (localY + stamp.h) * scale,
      width: stamp.w * scale,
      pageWidth: page.pdfW,
      pageHeight: page.pdfH,
      pageIndex: idx,
    });
  }, [stamp, pages, docWidth]);

  // ---- Drag & resize ------------------------------------------------------
  const clampStamp = (x: number, y: number, w: number, h: number) => ({
    x: Math.max(0, Math.min(x, Math.max(0, docWidth - w))),
    y: Math.max(0, Math.min(y, Math.max(0, totalHeight - h))),
    w,
    h,
  });

  const onPointerDown = (e: React.PointerEvent, mode: 'move' | 'resize') => {
    e.stopPropagation();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const rect = stackRef.current!.getBoundingClientRect();
    dragRef.current = {
      dx: e.clientX - rect.left - stamp.x,
      dy: e.clientY - rect.top - stamp.y,
      mode,
    };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const rect = stackRef.current!.getBoundingClientRect();
    const localX = e.clientX - rect.left;
    const localY = e.clientY - rect.top;
    if (dragRef.current.mode === 'move') {
      setStamp(s => clampStamp(localX - dragRef.current!.dx, localY - dragRef.current!.dy, s.w, s.h));
    } else {
      const newW = Math.max(40, Math.min(docWidth - stamp.x, localX - stamp.x));
      setStamp(s => clampStamp(s.x, s.y, newW, newW / imgAspect));
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    dragRef.current = null;
    try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  };

  const scrollBy = (dir: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ top: dir * Math.round(el.clientHeight * 0.85), behavior: 'smooth' });
  };
  const goToPage = (dir: -1 | 1) => {
    const el = scrollRef.current;
    if (!el || !pages.length) return;
    const next = Math.min(Math.max(currentPage + dir, 0), pages.length - 1);
    el.scrollTo({ top: pages[next].top, behavior: 'smooth' });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs text-muted-foreground">
          Glissez le cachet à l'emplacement souhaité. Poignée en bas à droite pour redimensionner.
        </p>
        {pages.length > 1 && (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground">Page {currentPage + 1} / {pages.length}</span>
            <Button type="button" size="icon" variant="outline" className="h-7 w-7"
              title="Monter" onClick={() => scrollBy(-1)}>
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button type="button" size="icon" variant="outline" className="h-7 w-7"
              title="Descendre" onClick={() => scrollBy(1)}>
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button type="button" size="sm" variant="ghost" className="h-7 px-2"
              onClick={() => goToPage(-1)}>Page préc.</Button>
            <Button type="button" size="sm" variant="ghost" className="h-7 px-2"
              onClick={() => goToPage(1)}>Page suiv.</Button>
          </div>
        )}
      </div>

      <div
        ref={scrollRef}
        onScroll={syncVisiblePages}
        className="relative border rounded-lg bg-muted/30 overflow-y-auto overflow-x-hidden"
        style={{ height: 'min(70vh, 760px)' }}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            Chargement de l'aperçu…
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-destructive p-4 text-center">
            {error}
          </div>
        )}
        {pages.length > 0 && (
          <div
            ref={stackRef}
            className="relative mx-auto select-none touch-none"
            style={{ width: docWidth, height: totalHeight }}
          >
            {pages.map((p, i) => (
              <div
                key={i}
                className="absolute bg-background shadow-sm"
                style={{ top: p.top, left: (docWidth - p.w) / 2, width: p.w, height: p.h }}
              >
                <canvas ref={el => { canvasRefs.current[i] = el; }} className="block" style={{ width: p.w, height: p.h }} />
                <span className="absolute top-1 left-1 rounded bg-foreground/60 px-1.5 py-0.5 text-[10px] font-medium text-background">
                  {i + 1}
                </span>
              </div>
            ))}
            <div
              className="absolute cursor-move ring-2 ring-primary/70 rounded-sm shadow-md"
              style={{ left: stamp.x, top: stamp.y, width: stamp.w, height: stamp.h }}
              onPointerDown={(e) => onPointerDown(e, 'move')}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              <img src={stampSrc} alt="cachet" draggable={false} className="w-full h-full object-contain pointer-events-none" />
              <div
                onPointerDown={(e) => onPointerDown(e, 'resize')}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                className="absolute -right-1.5 -bottom-1.5 h-4 w-4 bg-primary rounded-full cursor-nwse-resize border-2 border-background"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
