import { useState, useRef, useCallback, useEffect } from 'react';
import { Move, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface SignatureCanvasProps {
  pdfPageImage: string;
  stampPreview: string;
  signerName: string;
  onPositionChange: (pos: { x: number; y: number; width: number; height: number; nameX: number; nameY: number }) => void;
  pageWidth: number;
  pageHeight: number;
}

export default function SignatureCanvas({
  pdfPageImage,
  stampPreview,
  signerName,
  onPositionChange,
  pageWidth,
  pageHeight,
}: SignatureCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [stampPos, setStampPos] = useState({ x: 70, y: 80 });
  const [stampSize, setStampSize] = useState(120);
  const [namePos, setNamePos] = useState({ x: 70, y: 76 });
  const [dragging, setDragging] = useState<'stamp' | 'name' | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

  const handleMouseDown = useCallback((target: 'stamp' | 'name', e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const pos = target === 'stamp' ? stampPos : namePos;
    const xPx = (pos.x / 100) * rect.width;
    const yPx = (pos.y / 100) * rect.height;
    setDragOffset({ x: e.clientX - rect.left - xPx, y: e.clientY - rect.top - yPx });
    setDragging(target);
  }, [stampPos, namePos]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const xPct = clamp(((e.clientX - rect.left - dragOffset.x) / rect.width) * 100, 2, 95);
    const yPct = clamp(((e.clientY - rect.top - dragOffset.y) / rect.height) * 100, 2, 95);
    if (dragging === 'stamp') setStampPos({ x: xPct, y: yPct });
    else setNamePos({ x: xPct, y: yPct });
  }, [dragging, dragOffset]);

  const handleMouseUp = useCallback(() => setDragging(null), []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragging, handleMouseMove, handleMouseUp]);

  // Touch support
  const handleTouchStart = useCallback((target: 'stamp' | 'name', e: React.TouchEvent) => {
    e.stopPropagation();
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const touch = e.touches[0];
    const pos = target === 'stamp' ? stampPos : namePos;
    const xPx = (pos.x / 100) * rect.width;
    const yPx = (pos.y / 100) * rect.height;
    setDragOffset({ x: touch.clientX - rect.left - xPx, y: touch.clientY - rect.top - yPx });
    setDragging(target);
  }, [stampPos, namePos]);

  useEffect(() => {
    if (!dragging) return;
    const handleTouchMove = (e: TouchEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const touch = e.touches[0];
      const xPct = clamp(((touch.clientX - rect.left - dragOffset.x) / rect.width) * 100, 2, 95);
      const yPct = clamp(((touch.clientY - rect.top - dragOffset.y) / rect.height) * 100, 2, 95);
      if (dragging === 'stamp') setStampPos({ x: xPct, y: yPct });
      else setNamePos({ x: xPct, y: yPct });
    };
    const handleTouchEnd = () => setDragging(null);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [dragging, dragOffset]);

  useEffect(() => {
    onPositionChange({
      x: stampPos.x,
      y: stampPos.y,
      width: stampSize,
      height: stampSize * 0.6,
      nameX: namePos.x,
      nameY: namePos.y,
    });
  }, [stampPos, stampSize, namePos]);

  const resetPositions = () => {
    setStampPos({ x: 70, y: 80 });
    setNamePos({ x: 70, y: 76 });
    setStampSize(120);
  };

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 p-2.5 bg-muted/50 rounded-lg border">
        <div className="flex items-center gap-2">
          <ZoomOut className="h-3.5 w-3.5 text-muted-foreground" />
          <Slider
            value={[stampSize]}
            onValueChange={([v]) => setStampSize(v)}
            min={40}
            max={250}
            step={5}
            className="w-28"
          />
          <ZoomIn className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">{stampSize}px</span>
        </div>
        <Button variant="ghost" size="sm" onClick={resetPositions} className="gap-1 text-xs h-7">
          <RotateCcw className="h-3 w-3" /> Reset
        </Button>
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Move className="h-3 w-3" /> Glissez pour positionner
        </p>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="relative border border-border rounded-lg overflow-hidden bg-muted/20 select-none"
        style={{ aspectRatio: `${pageWidth} / ${pageHeight}` }}
      >
        {pdfPageImage && (
          <img
            src={pdfPageImage}
            alt="Page PDF"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            draggable={false}
          />
        )}

        {/* Draggable stamp */}
        <div
          onMouseDown={(e) => handleMouseDown('stamp', e)}
          onTouchStart={(e) => handleTouchStart('stamp', e)}
          className={`absolute cursor-grab active:cursor-grabbing transition-shadow ${
            dragging === 'stamp' ? 'ring-2 ring-primary shadow-md z-20' : 'hover:ring-1 hover:ring-primary/50 z-10'
          }`}
          style={{
            left: `${stampPos.x}%`,
            top: `${stampPos.y}%`,
            transform: 'translate(-50%, -50%)',
            width: `${stampSize}px`,
          }}
        >
          <img
            src={stampPreview}
            alt="Signature"
            className="w-full h-auto rounded"
            draggable={false}
          />
          <div className="absolute -top-1 -right-1 h-4 w-4 bg-primary rounded-full flex items-center justify-center">
            <Move className="h-2.5 w-2.5 text-primary-foreground" />
          </div>
        </div>

        {/* Draggable name label */}
        <div
          onMouseDown={(e) => handleMouseDown('name', e)}
          onTouchStart={(e) => handleTouchStart('name', e)}
          className={`absolute cursor-grab active:cursor-grabbing transition-shadow ${
            dragging === 'name' ? 'ring-2 ring-primary shadow-md z-20' : 'hover:ring-1 hover:ring-primary/50 z-10'
          }`}
          style={{
            left: `${namePos.x}%`,
            top: `${namePos.y}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="bg-card border border-border rounded px-2.5 py-1.5 shadow-sm whitespace-nowrap">
            <p className="text-xs font-semibold text-foreground">{signerName}</p>
            <p className="text-[9px] text-muted-foreground">{new Date().toLocaleDateString('fr-FR')} · SENSTOCK</p>
          </div>
          <div className="absolute -top-1 -right-1 h-4 w-4 bg-muted rounded-full flex items-center justify-center border">
            <Move className="h-2.5 w-2.5 text-muted-foreground" />
          </div>
        </div>
      </div>
    </div>
  );
}
