import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pen, Type, Upload, Eraser } from 'lucide-react';

interface SignatureDrawPadProps {
  onSignatureReady: (dataUrl: string, bytes: Uint8Array, type: 'png') => void;
}

const SIGNATURE_FONTS = [
  { name: 'Dancing Script', style: "'Dancing Script', cursive" },
  { name: 'Great Vibes', style: "'Great Vibes', cursive" },
  { name: 'Pacifico', style: "'Pacifico', cursive" },
  { name: 'Satisfy', style: "'Satisfy', cursive" },
];

export default function SignatureDrawPad({ onSignatureReady }: SignatureDrawPadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [typedName, setTypedName] = useState('');
  const [selectedFont, setSelectedFont] = useState(0);
  const uploadRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Great+Vibes&family=Pacifico&family=Satisfy&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);

  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCanvasCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  }, []);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCanvasCoords(e);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineTo(x, y);
    ctx.stroke();
  }, [isDrawing]);

  const stopDraw = useCallback(() => setIsDrawing(false), []);

  const clearCanvas = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
  };

  const exportCanvas = () => {
    const canvas = canvasRef.current!;
    const dataUrl = canvas.toDataURL('image/png');
    canvas.toBlob(blob => {
      if (!blob) return;
      blob.arrayBuffer().then(buf => {
        onSignatureReady(dataUrl, new Uint8Array(buf), 'png');
      });
    }, 'image/png');
  };

  const generateTypedSignature = () => {
    if (!typedName.trim()) return;
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 150;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 400, 150);
    ctx.font = `48px ${SIGNATURE_FONTS[selectedFont].style}`;
    ctx.fillStyle = '#1a1a2e';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(typedName, 200, 75);
    const dataUrl = canvas.toDataURL('image/png');
    canvas.toBlob(blob => {
      if (!blob) return;
      blob.arrayBuffer().then(buf => {
        onSignatureReady(dataUrl, new Uint8Array(buf), 'png');
      });
    }, 'image/png');
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      file.arrayBuffer().then(buf => {
        onSignatureReady(dataUrl, new Uint8Array(buf), 'png');
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <Tabs defaultValue="draw" className="w-full">
      <TabsList className="grid w-full grid-cols-3 h-8">
        <TabsTrigger value="draw" className="gap-1.5 text-xs h-7"><Pen className="h-3 w-3" /> Dessiner</TabsTrigger>
        <TabsTrigger value="type" className="gap-1.5 text-xs h-7"><Type className="h-3 w-3" /> Taper</TabsTrigger>
        <TabsTrigger value="upload" className="gap-1.5 text-xs h-7"><Upload className="h-3 w-3" /> Importer</TabsTrigger>
      </TabsList>

      <TabsContent value="draw" className="space-y-2 mt-3">
        <div className="relative border border-border rounded-lg overflow-hidden bg-card">
          <canvas
            ref={canvasRef}
            width={500}
            height={200}
            className="w-full cursor-crosshair touch-none"
            style={{ height: '140px' }}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={stopDraw}
            onMouseLeave={stopDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={stopDraw}
          />
          <div className="absolute bottom-3 left-4 right-4 border-t border-dashed border-muted-foreground/20" />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={clearCanvas} className="gap-1 text-xs h-7">
            <Eraser className="h-3 w-3" /> Effacer
          </Button>
          <Button size="sm" onClick={exportCanvas} className="text-xs h-7">
            Utiliser cette signature
          </Button>
        </div>
      </TabsContent>

      <TabsContent value="type" className="space-y-3 mt-3">
        <div>
          <Label className="text-xs mb-1 block">Votre nom</Label>
          <Input
            value={typedName}
            onChange={e => setTypedName(e.target.value)}
            placeholder="Tapez votre nom..."
            className="h-9"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {SIGNATURE_FONTS.map((f, i) => (
            <button
              key={f.name}
              onClick={() => setSelectedFont(i)}
              className={`p-3 rounded-lg border text-center transition-all ${
                selectedFont === i ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
              }`}
            >
              <span style={{ fontFamily: f.style, fontSize: '18px' }}>
                {typedName || 'Signature'}
              </span>
              <p className="text-[10px] text-muted-foreground mt-1">{f.name}</p>
            </button>
          ))}
        </div>
        <Button size="sm" onClick={generateTypedSignature} disabled={!typedName.trim()} className="text-xs h-7">
          Utiliser cette signature
        </Button>
      </TabsContent>

      <TabsContent value="upload" className="mt-3">
        <input ref={uploadRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
        <div
          onClick={() => uploadRef.current?.click()}
          className="border border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
        >
          <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium">Importez votre signature</p>
          <p className="text-xs text-muted-foreground mt-0.5">PNG, JPG ou image scannée</p>
        </div>
      </TabsContent>
    </Tabs>
  );
}
