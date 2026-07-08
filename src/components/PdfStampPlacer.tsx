import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export interface PlacementResult {
  x: number; // PDF points, bottom-left origin
  y: number;
  width: number; // PDF points
  pageWidth: number;
  pageHeight: number;
}

interface Props {
  pdfBytes: ArrayBuffer;
  pageIndex: number; // 0-based
  stampSrc: string;
  onChange: (p: PlacementResult) => void;
  // Persisted ratio-based placement so switching preview page or
  // late PDF loads (heavy files) do not reset the stamp position.
  initialRatio?: { xRatio: number; yRatio: number; widthRatio: number } | null;
}

export default function PdfStampPlacer({ pdfBytes, pageIndex, stampSrc, onChange, initialRatio }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageSize, setPageSize] = useState<{ w: number; h: number } | null>(null); // PDF points
  const [displaySize, setDisplaySize] = useState<{ w: number; h: number }>({ w: 0, h: 0 }); // CSS px
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // stamp state in CSS px, top-left origin
  const [stamp, setStamp] = useState({ x: 20, y: 20, w: 140, h: 70 });
  const [imgAspect, setImgAspect] = useState(2); // w/h
  const dragRef = useRef<{ dx: number; dy: number; mode: 'move' | 'resize' } | null>(null);
  const restoredForSizeRef = useRef<string>('');

  // Render the PDF page
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const bytes = pdfBytes.slice(0);
      try {
        const loadingTask = pdfjsLib.getDocument({ data: bytes });
        const pdf = await loadingTask.promise;
        const idx = Math.min(Math.max(pageIndex, 0), pdf.numPages - 1);
        const page = await pdf.getPage(idx + 1);
        const baseViewport = page.getViewport({ scale: 1 });
        const container = containerRef.current;
        const maxWidth = container ? container.clientWidth : 600;
        const scale = Math.min(2, maxWidth / baseViewport.width);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;
        const ratio = window.devicePixelRatio || 1;
        canvas.width = viewport.width * ratio;
        canvas.height = viewport.height * ratio;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        const ctx = canvas.getContext('2d')!;
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
        if (cancelled) return;
        setPageSize({ w: baseViewport.width, h: baseViewport.height });
        setDisplaySize({ w: viewport.width, h: viewport.height });
        setLoading(false);
      } catch (err) {
        console.error('PDF render error:', err);
        if (!cancelled) {
          setError("Impossible d'afficher l'aperçu du PDF. Vous pouvez tout de même signer.");
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [pdfBytes, pageIndex]);

  // Restore persisted ratio placement whenever the page (re)renders at a
  // new display size. Uses ratios so it lands at the same visual spot
  // even if page dimensions differ.
  useEffect(() => {
    if (displaySize.w === 0) return;
    const key = `${displaySize.w}x${displaySize.h}:${pageIndex}`;
    if (restoredForSizeRef.current === key) return;
    restoredForSizeRef.current = key;
    if (initialRatio) {
      const w = Math.max(40, initialRatio.widthRatio * displaySize.w);
      const h = w / imgAspect;
      const x = Math.max(0, Math.min(initialRatio.xRatio * displaySize.w, displaySize.w - w));
      // yRatio uses PDF bottom-left origin; convert to CSS top-left
      const yFromBottomCss = (1 - initialRatio.yRatio) * displaySize.h - h;
      const y = Math.max(0, Math.min(yFromBottomCss, displaySize.h - h));
      setStamp({ x, y, w, h });
    }
  }, [displaySize, pageIndex, initialRatio, imgAspect]);

  // Load stamp aspect
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const a = img.width / img.height;
      setImgAspect(a);
      setStamp(s => ({ ...s, h: s.w / a }));
    };
    img.src = stampSrc;
  }, [stampSrc]);

  // Report placement in PDF coords whenever things change
  useEffect(() => {
    if (!pageSize || displaySize.w === 0) return;
    const scale = pageSize.w / displaySize.w;
    const pdfW = stamp.w * scale;
    const pdfX = stamp.x * scale;
    // Convert top-left CSS y to bottom-left PDF y
    const pdfY = pageSize.h - (stamp.y + stamp.h) * scale;
    onChange({ x: pdfX, y: pdfY, width: pdfW, pageWidth: pageSize.w, pageHeight: pageSize.h });
  }, [stamp, pageSize, displaySize]);

  const clamp = (x: number, y: number, w: number, h: number) => {
    const maxX = displaySize.w - w;
    const maxY = displaySize.h - h;
    return {
      x: Math.max(0, Math.min(x, maxX)),
      y: Math.max(0, Math.min(y, maxY)),
      w, h,
    };
  };

  const onPointerDown = (e: React.PointerEvent, mode: 'move' | 'resize') => {
    e.stopPropagation();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const rect = containerRef.current!.getBoundingClientRect();
    dragRef.current = {
      dx: e.clientX - rect.left - stamp.x,
      dy: e.clientY - rect.top - stamp.y,
      mode,
    };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const rect = containerRef.current!.getBoundingClientRect();
    const localX = e.clientX - rect.left;
    const localY = e.clientY - rect.top;
    if (dragRef.current.mode === 'move') {
      const nx = localX - dragRef.current.dx;
      const ny = localY - dragRef.current.dy;
      setStamp(s => clamp(nx, ny, s.w, s.h));
    } else {
      // resize: new width from pointer relative to stamp origin
      const newW = Math.max(40, Math.min(displaySize.w - stamp.x, localX - stamp.x));
      const newH = newW / imgAspect;
      setStamp(s => clamp(s.x, s.y, newW, newH));
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    dragRef.current = null;
    try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Glissez le cachet à l'emplacement souhaité. Utilisez la poignée en bas à droite pour redimensionner.
      </p>
      <div
        ref={containerRef}
        className="relative mx-auto border rounded-lg overflow-hidden bg-muted/30 select-none touch-none"
        style={{ width: displaySize.w || '100%', maxWidth: '100%', minHeight: displaySize.w ? undefined : 400 }}
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
        <canvas ref={canvasRef} className="block" />
        {displaySize.w > 0 && (
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
        )}
      </div>
    </div>
  );
}