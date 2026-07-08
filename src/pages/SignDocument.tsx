import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, extractName } from '@/lib/auth';
import { saveDocument } from '@/lib/documents';
import { signPDF, type SignaturePosition } from '@/lib/pdf-signer';
import AppHeader from '@/components/AppHeader';
import PdfStampPlacer, { type PlacementResult } from '@/components/PdfStampPlacer';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, FileText, Image, CheckCircle, Download, ArrowLeft, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

type Step = 'upload' | 'stamp' | 'position' | 'done';

export default function SignDocument() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [step, setStep] = useState<Step>('upload');

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);

  const [stampFile, setStampFile] = useState<File | null>(null);
  const [stampPreview, setStampPreview] = useState<string>('');
  const [stampBytes, setStampBytes] = useState<Uint8Array | null>(null);
  const [stampType, setStampType] = useState<'png' | 'jpg'>('png');

  const [position, setPosition] = useState<SignaturePosition>('last');
  const [placement, setPlacement] = useState<PlacementResult | null>(null);
  const [previewPageIndex, setPreviewPageIndex] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const initialPageChosenRef = useRef(false);
  const [signing, setSigning] = useState(false);
  const [signedPdfUrl, setSignedPdfUrl] = useState<string>('');
  const [signedFileName, setSignedFileName] = useState('');

  const pdfInputRef = useRef<HTMLInputElement>(null);
  const stampInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) navigate('/login');
  }, []);

  if (!user) return null;

  const signerName = extractName(user.email);

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf') {
      toast.error('Veuillez sélectionner un fichier PDF');
      return;
    }
    setPdfFile(file);
    const bytes = await file.arrayBuffer();
    setPdfBytes(bytes);
    setPdfUrl(URL.createObjectURL(file));
    setStep('stamp');
  };

  // Choose preview page ONCE per entry into position step, and only after
  // pageCount is known. This prevents the placer from remounting (and
  // resetting the stamp position) when pageCount loads late on heavy PDFs.
  useEffect(() => {
    if (step !== 'position') {
      initialPageChosenRef.current = false;
      return;
    }
    if (initialPageChosenRef.current) return;
    if (!pageCount) return; // wait until we know the real page count
    const total = pageCount;
    let idx = 0;
    if (position === 'first') idx = 0;
    else if (position === 'last') idx = total - 1;
    else if (position === 'middle') idx = Math.floor(total / 2);
    else if (position === 'all') idx = 0;
    setPreviewPageIndex(idx);
    initialPageChosenRef.current = true;
  }, [step, position, pageCount]);

  // Extract page count once PDF loaded
  useEffect(() => {
    if (!pdfBytes) return;
    (async () => {
      try {
        const { PDFDocument } = await import('pdf-lib');
        const doc = await PDFDocument.load(pdfBytes.slice(0));
        setPageCount(doc.getPageCount());
      } catch {}
    })();
  }, [pdfBytes]);

  const handleStampUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image PNG ou JPG');
      return;
    }
    setStampFile(file);
    setStampPreview(URL.createObjectURL(file));
    const bytes = new Uint8Array(await file.arrayBuffer());
    setStampBytes(bytes);
    setStampType(file.type.includes('png') ? 'png' : 'jpg');
    setStep('position');
  };

  const handleSign = async () => {
    if (!pdfBytes || !stampBytes || !pdfFile) return;
    setSigning(true);
    try {
      const { signedPdf, pageCount } = await signPDF(
        pdfBytes,
        stampBytes,
        stampType,
        signerName,
        position,
        placement ? {
          x: placement.x,
          y: placement.y,
          width: placement.width,
          xRatio: placement.x / placement.pageWidth,
          yRatio: placement.y / placement.pageHeight,
          widthRatio: placement.width / placement.pageWidth,
          refPageWidth: placement.pageWidth,
          refPageHeight: placement.pageHeight,
        } : undefined
      );
      const blob = new Blob([signedPdf.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setSignedPdfUrl(url);

      const fileName = `signé_${pdfFile.name}`;
      setSignedFileName(fileName);

      saveDocument({
        fileName: pdfFile.name,
        signedBy: user.email,
        signedByName: signerName,
        signedAt: new Date().toISOString(),
        signaturePosition: position,
        pageCount,
      });

      setStep('done');
      toast.success('Document signé avec succès !');
    } catch (err) {
      toast.error('Erreur lors de la signature du document');
      console.error(err);
    }
    setSigning(false);
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = signedPdfUrl;
    a.download = signedFileName;
    a.click();
  };

  const positionOptions: { value: SignaturePosition; label: string; desc: string }[] = [
    { value: 'first', label: 'Première page', desc: 'Signer uniquement la première page' },
    { value: 'last', label: 'Dernière page', desc: 'Signer uniquement la dernière page' },
    { value: 'all', label: 'Toutes les pages', desc: 'Appliquer la signature sur chaque page' },
    { value: 'middle', label: 'Page du milieu', desc: 'Signer la page centrale du document' },
  ];

  const steps = [
    { key: 'upload', label: 'Document', num: 1 },
    { key: 'stamp', label: 'Cachet', num: 2 },
    { key: 'position', label: 'Position', num: 3 },
    { key: 'done', label: 'Terminé', num: 4 },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === step);

  return (
    <div className="min-h-screen bg-secondary/30">
      <AppHeader />
      <main className="container py-8 max-w-4xl space-y-8">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                i <= currentStepIndex ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {i < currentStepIndex ? <CheckCircle className="h-4 w-4" /> : s.num}
              </div>
              <span className={`text-sm hidden sm:inline ${i <= currentStepIndex ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                {s.label}
              </span>
              {i < steps.length - 1 && <div className={`w-8 h-0.5 ${i < currentStepIndex ? 'bg-primary' : 'bg-muted'}`} />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Upload PDF */}
          {step === 'upload' && (
            <motion.div key="upload" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="bg-card rounded-xl border p-8 text-center">
                <input ref={pdfInputRef} type="file" accept="application/pdf" onChange={handlePdfUpload} className="hidden" />
                <FileText className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Téléchargez votre document PDF</h2>
                <p className="text-sm text-muted-foreground mb-6">Sélectionnez le fichier PDF que vous souhaitez signer</p>
                <Button onClick={() => pdfInputRef.current?.click()} className="gap-2">
                  <Upload className="h-4 w-4" />
                  Choisir un fichier PDF
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Upload Stamp */}
          {step === 'stamp' && (
            <motion.div key="stamp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* PDF Preview */}
                <div className="bg-card rounded-xl border overflow-hidden">
                  <div className="p-3 border-b bg-muted/50">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4" /> {pdfFile?.name}
                    </p>
                  </div>
                  <object data={pdfUrl} type="application/pdf" className="w-full h-[500px]">
                    <p className="p-4 text-sm text-muted-foreground">Aperçu PDF non disponible</p>
                  </object>
                </div>

                {/* Stamp Upload */}
                <div className="bg-card rounded-xl border p-6 flex flex-col items-center justify-center">
                  <input ref={stampInputRef} type="file" accept="image/png,image/jpeg,image/jpg" onChange={handleStampUpload} className="hidden" />
                  {stampPreview ? (
                    <div className="text-center space-y-4">
                      <p className="text-sm font-medium">Aperçu du cachet</p>
                      <img src={stampPreview} alt="Cachet" className="max-h-40 mx-auto border rounded-lg p-2" />
                      <Button variant="outline" onClick={() => stampInputRef.current?.click()}>Changer</Button>
                    </div>
                  ) : (
                    <>
                      <Image className="h-16 w-16 text-muted-foreground/30 mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Téléchargez votre cachet</h3>
                      <p className="text-sm text-muted-foreground text-center mb-4">Image PNG ou JPG de votre cachet professionnel</p>
                      <Button variant="outline" onClick={() => stampInputRef.current?.click()} className="gap-2">
                        <Upload className="h-4 w-4" />
                        Choisir une image
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <div className="flex justify-start">
                <Button variant="ghost" onClick={() => setStep('upload')} className="gap-2">
                  <ArrowLeft className="h-4 w-4" /> Retour
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Choose Position */}
          {step === 'position' && (
            <motion.div key="position" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="bg-card rounded-xl border p-6">
                <h3 className="text-lg font-semibold mb-2">Position de la signature</h3>
                <p className="text-sm text-muted-foreground mb-6">Choisissez les pages puis glissez le cachet à l'endroit exact souhaité</p>

                <div className="grid sm:grid-cols-2 gap-3">
                  {positionOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setPosition(opt.value)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        position === opt.value
                          ? 'border-primary bg-accent/50 shadow-sm'
                          : 'border-border hover:border-primary/40'
                      }`}
                    >
                      <p className="font-medium text-sm">{opt.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">{opt.desc}</p>
                    </button>
                  ))}
                </div>

                {/* Free placement on the PDF */}
                {pdfBytes && stampPreview && (
                  <div className="mt-6 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <Label className="text-sm font-medium">Placement libre du cachet</Label>
                      {pageCount > 1 && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground">Page d'aperçu :</span>
                          <Button size="sm" variant="outline" disabled={previewPageIndex <= 0}
                            onClick={() => setPreviewPageIndex(i => Math.max(0, i - 1))}>‹</Button>
                          <span className="font-medium">{previewPageIndex + 1} / {pageCount}</span>
                          <Button size="sm" variant="outline" disabled={previewPageIndex >= pageCount - 1}
                            onClick={() => setPreviewPageIndex(i => Math.min(pageCount - 1, i + 1))}>›</Button>
                        </div>
                      )}
                    </div>
                    <PdfStampPlacer
                      pdfBytes={pdfBytes}
                      pageIndex={previewPageIndex}
                      stampSrc={stampPreview}
                      onChange={setPlacement}
                      initialRatio={placement ? {
                        xRatio: placement.x / placement.pageWidth,
                        yRatio: placement.y / placement.pageHeight,
                        widthRatio: placement.width / placement.pageWidth,
                      } : null}
                    />
                    {position === 'all' && (
                      <p className="text-xs text-muted-foreground">La position choisie sera appliquée à toutes les pages.</p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep('stamp')} className="gap-2">
                  <ArrowLeft className="h-4 w-4" /> Retour
                </Button>
                <Button onClick={handleSign} disabled={signing} className="gap-2">
                  {signing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  {signing ? 'Signature en cours...' : 'Signer le document'}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Done */}
          {step === 'done' && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card rounded-xl border p-8 text-center space-y-6">
              <div className="inline-flex h-16 w-16 rounded-full bg-accent items-center justify-center">
                <CheckCircle className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Document signé avec succès !</h2>
                <p className="text-sm text-muted-foreground mt-1">Votre signature a été appliquée sur {position === 'all' ? 'toutes les pages' : position === 'first' ? 'la première page' : position === 'last' ? 'la dernière page' : 'la page du milieu'}</p>
              </div>

              {/* Preview signed PDF */}
              {signedPdfUrl && (
                <object data={signedPdfUrl} type="application/pdf" className="w-full h-[400px] rounded-lg border">
                  <p className="p-4">Aperçu non disponible</p>
                </object>
              )}

              <div className="flex justify-center gap-3">
                <Button onClick={handleDownload} className="gap-2">
                  <Download className="h-4 w-4" />
                  Télécharger le PDF signé
                </Button>
                <Button variant="outline" onClick={() => {
                  setStep('upload');
                  setPdfFile(null);
                  setPdfUrl('');
                  setPdfBytes(null);
                  setStampFile(null);
                  setStampPreview('');
                  setStampBytes(null);
                  setSignedPdfUrl('');
                }}>
                  Signer un autre document
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
