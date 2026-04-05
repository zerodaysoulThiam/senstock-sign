import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, extractName } from '@/lib/auth';
import { saveDocument } from '@/lib/documents';
import { signPDF, type SignaturePosition, type CustomSignaturePosition } from '@/lib/pdf-signer';
import { createAuditTrail, getPublicIP, type AuditTrail } from '@/lib/audit';
import AppHeader from '@/components/AppHeader';
import SignatureCanvas from '@/components/SignatureCanvas';
import SignatureDrawPad from '@/components/SignatureDrawPad';
import SigningCeremony from '@/components/SigningCeremony';
import SignatureProof from '@/components/SignatureProof';
import EmailDropdown from '@/components/EmailDropdown';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, FileText, Image, CheckCircle, Download, ArrowLeft, Loader2, Eye, PenTool, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

type Step = 'upload' | 'read' | 'stamp' | 'position' | 'done';

export default function SignDocument() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [step, setStep] = useState<Step>('upload');

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);

  const [stampPreview, setStampPreview] = useState('');
  const [stampBytes, setStampBytes] = useState<Uint8Array | null>(null);
  const [stampType, setStampType] = useState<'png' | 'jpg'>('png');
  const [signMethod, setSignMethod] = useState<'draw' | 'type' | 'upload'>('draw');

  const [pagePosition, setPagePosition] = useState<SignaturePosition>('last');
  const [customPos, setCustomPos] = useState<CustomSignaturePosition>({
    x: 70, y: 80, width: 120, height: 72, nameX: 70, nameY: 76,
  });
  const [signing, setSigning] = useState(false);
  const [signedPdfUrl, setSignedPdfUrl] = useState('');
  const [signedFileName, setSignedFileName] = useState('');
  const [docLabel, setDocLabel] = useState('');
  const [showCeremony, setShowCeremony] = useState(false);
  const [auditTrail, setAuditTrail] = useState<AuditTrail | null>(null);

  const [pdfPageImages, setPdfPageImages] = useState<string[]>([]);
  const [selectedPageIndex, setSelectedPageIndex] = useState(0);

  const pdfInputRef = useRef<HTMLInputElement>(null);
  const stampInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) navigate('/login');
  }, []);

  if (!user) return null;
  const signerName = extractName(user.email);

  const renderPdfPages = async (bytes: ArrayBuffer) => {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(bytes) }).promise;
    const images: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d')!;
      await page.render({ canvasContext: ctx, viewport }).promise;
      images.push(canvas.toDataURL('image/png'));
    }
    setPdfPageImages(images);
    setSelectedPageIndex(0);
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      const { PDFDocument } = await import('pdf-lib');
      const imgBytes = new Uint8Array(await file.arrayBuffer());
      const pdfDoc = await PDFDocument.create();
      const img = file.type.includes('png')
        ? await pdfDoc.embedPng(imgBytes)
        : await pdfDoc.embedJpg(imgBytes);
      const page = pdfDoc.addPage([img.width, img.height]);
      page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
      const pdfBytesResult = await pdfDoc.save();
      const arrayBuf = pdfBytesResult.slice(0).buffer as ArrayBuffer;
      const blob = new Blob([arrayBuf], { type: 'application/pdf' });
      setPdfFile(new File([blob], file.name.replace(/\.\w+$/, '.pdf'), { type: 'application/pdf' }));
      setPdfBytes(arrayBuf);
      setPdfUrl(URL.createObjectURL(blob));
      setDocLabel(file.name.replace(/\.\w+$/, ''));
      renderPdfPages(arrayBuf);
      setStep('read');
      toast.success('Image convertie en PDF');
      return;
    }

    if (file.type !== 'application/pdf') {
      toast.error('Formats acceptés : PDF, PNG, JPG');
      return;
    }
    setPdfFile(file);
    const bytes = await file.arrayBuffer();
    setPdfBytes(bytes);
    setPdfUrl(URL.createObjectURL(file));
    setDocLabel(file.name.replace('.pdf', ''));
    renderPdfPages(bytes);
    setStep('read');
  };

  const handleStampUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image PNG ou JPG');
      return;
    }
    setStampPreview(URL.createObjectURL(file));
    const bytes = new Uint8Array(await file.arrayBuffer());
    setStampBytes(bytes);
    setStampType(file.type.includes('png') ? 'png' : 'jpg');
    setSignMethod('upload');
    setStep('position');
  };

  const handleDrawnSignature = (dataUrl: string, bytes: Uint8Array, type: 'png') => {
    setStampPreview(dataUrl);
    setStampBytes(bytes);
    setStampType(type);
    setSignMethod('draw');
    setStep('position');
    toast.success('Signature prête');
  };

  const handleSign = async () => {
    if (!pdfBytes || !stampBytes || !pdfFile) return;
    setSigning(true);
    try {
      const userIP = getPublicIP();
      const audit = createAuditTrail({
        signerName,
        signerEmail: user.email,
        ipAddress: userIP,
        method: signMethod,
        documentName: pdfFile.name,
        documentLabel: docLabel || pdfFile.name,
        pageCount: pdfPageImages.length || 1,
        signaturePosition: pagePosition,
      });

      const { signedPdf, pageCount } = await signPDF(pdfBytes, stampBytes, stampType, signerName, pagePosition, customPos, audit);
      const blob = new Blob([signedPdf.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setSignedPdfUrl(url);
      setAuditTrail({ ...audit, pageCount });

      const fileName = `signé_${pdfFile.name}`;
      setSignedFileName(fileName);

      saveDocument({
        fileName: pdfFile.name,
        label: docLabel || pdfFile.name,
        signedBy: user.email,
        signedByName: signerName,
        signedAt: new Date().toISOString(),
        signaturePosition: pagePosition,
        pageCount,
        status: 'signed',
        signedPdfUrl: url,
        audit: { ...audit, pageCount },
      });

      setShowCeremony(true);
    } catch (err) {
      toast.error('Erreur lors de la signature du document');
      console.error(err);
    }
    setSigning(false);
  };

  const handleCeremonyComplete = () => {
    setShowCeremony(false);
    setStep('done');
    toast.success('Document signé avec succès');
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = signedPdfUrl;
    a.download = signedFileName;
    a.click();
  };

  const resetAll = () => {
    setStep('upload');
    setPdfFile(null); setPdfUrl(''); setPdfBytes(null);
    setStampPreview(''); setStampBytes(null);
    setSignedPdfUrl(''); setSignedFileName(''); setDocLabel('');
    setPdfPageImages([]); setSelectedPageIndex(0);
    setAuditTrail(null);
  };

  const positionOptions: { value: SignaturePosition; label: string; desc: string }[] = [
    { value: 'first', label: 'Première page', desc: 'Signer la première page' },
    { value: 'last', label: 'Dernière page', desc: 'Signer la dernière page' },
    { value: 'all', label: 'Toutes les pages', desc: 'Signer chaque page' },
    { value: 'middle', label: 'Page du milieu', desc: 'Signer la page centrale' },
  ];

  const steps = [
    { key: 'upload', label: 'Document', num: 1 },
    { key: 'read', label: 'Lecture', num: 2 },
    { key: 'stamp', label: 'Signature', num: 3 },
    { key: 'position', label: 'Position', num: 4 },
    { key: 'done', label: 'Terminé', num: 5 },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === step);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <SigningCeremony show={showCeremony} signerName={signerName} onComplete={handleCeremonyComplete} />

      <main className="container py-6 max-w-5xl space-y-6">
        {/* Progress Steps - DocuSign style */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            {steps.map((s, i) => (
              <div key={s.key} className="flex items-center flex-1 last:flex-none">
                <div className="flex items-center gap-2">
                  <div
                    className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                      i < currentStepIndex
                        ? 'bg-primary text-primary-foreground'
                        : i === currentStepIndex
                        ? 'bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2 ring-offset-card'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {i < currentStepIndex ? <CheckCircle className="h-4 w-4" /> : s.num}
                  </div>
                  <span className={`text-xs font-medium hidden sm:inline ${
                    i <= currentStepIndex ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    {s.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-px mx-3 ${i < currentStepIndex ? 'bg-primary' : 'bg-border'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <motion.div key="upload" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
              <div className="bg-card border border-border rounded-lg p-10 text-center">
                <input ref={pdfInputRef} type="file" accept="application/pdf,image/png,image/jpeg,image/jpg" onChange={handlePdfUpload} className="hidden" />
                <div className="inline-flex h-16 w-16 rounded-full bg-primary/10 items-center justify-center mb-5">
                  <Upload className="h-7 w-7 text-primary" />
                </div>
                <h2 className="text-lg font-semibold mb-1.5">Téléchargez votre document</h2>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                  PDF, PNG ou JPG — les images seront automatiquement converties en PDF
                </p>
                <Button onClick={() => pdfInputRef.current?.click()} className="gap-2 h-10">
                  <Upload className="h-4 w-4" />
                  Choisir un fichier
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Read */}
          {step === 'read' && (
            <motion.div key="read" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-4">
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-primary" />
                    <p className="text-sm font-medium">{pdfFile?.name}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">Vérifiez le contenu avant de signer</span>
                </div>
                <object data={pdfUrl} type="application/pdf" className="w-full h-[500px]">
                  <p className="p-8 text-center text-muted-foreground">
                    Aperçu non disponible.
                    <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline ml-1">Ouvrir</a>
                  </p>
                </object>
              </div>
              <div className="bg-card border border-border rounded-lg p-4">
                <Label className="text-xs font-medium mb-1.5 block">Libellé du document (optionnel)</Label>
                <input
                  type="text"
                  value={docLabel}
                  onChange={e => setDocLabel(e.target.value)}
                  placeholder="Ex: Contrat de service N°2024-001"
                  className="w-full px-3 py-2 rounded-md border bg-background text-sm"
                />
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep('upload')} className="gap-2 h-9">
                  <ArrowLeft className="h-4 w-4" /> Retour
                </Button>
                <Button onClick={() => setStep('stamp')} className="gap-2 h-9">
                  Continuer <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Signature */}
          {step === 'stamp' && (
            <motion.div key="stamp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                  <div className="p-3 border-b bg-muted/30">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" /> {pdfFile?.name}
                    </p>
                  </div>
                  <object data={pdfUrl} type="application/pdf" className="w-full h-[380px]">
                    <p className="p-4 text-sm text-muted-foreground">Aperçu non disponible</p>
                  </object>
                </div>

                <div className="bg-card border border-border rounded-lg p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <PenTool className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold">Créez votre signature</h3>
                  </div>

                  <SignatureDrawPad onSignatureReady={handleDrawnSignature} />

                  <div className="relative flex items-center gap-3 py-1">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">ou importez un cachet</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  <div className="text-center">
                    <input ref={stampInputRef} type="file" accept="image/png,image/jpeg,image/jpg" onChange={handleStampUpload} className="hidden" />
                    {stampPreview ? (
                      <div className="space-y-2">
                        <img src={stampPreview} alt="Cachet" className="max-h-20 mx-auto border border-border rounded-lg p-2" />
                        <Button variant="outline" size="sm" onClick={() => stampInputRef.current?.click()} className="text-xs">Changer</Button>
                      </div>
                    ) : (
                      <Button variant="outline" onClick={() => stampInputRef.current?.click()} className="gap-2 text-sm h-9">
                        <Image className="h-4 w-4" />
                        Importer un cachet
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex justify-start">
                <Button variant="outline" onClick={() => setStep('read')} className="gap-2 h-9">
                  <ArrowLeft className="h-4 w-4" /> Retour
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Position */}
          {step === 'position' && (
            <motion.div key="position" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-4">
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="text-sm font-semibold mb-3">Pages à signer</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {positionOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setPagePosition(opt.value)}
                      className={`p-2.5 rounded-lg border text-left transition-all text-sm ${
                        pagePosition === opt.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/40'
                      }`}
                    >
                      <p className="font-medium text-xs">{opt.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="text-sm font-semibold mb-1">Positionnez votre signature</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Glissez le cachet et le nom sur le document
                </p>

                {pdfPageImages.length > 1 && (
                  <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                    {pdfPageImages.map((img, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedPageIndex(i)}
                        className={`flex-shrink-0 w-14 h-18 rounded border overflow-hidden transition-all ${
                          selectedPageIndex === i ? 'border-primary ring-1 ring-primary/30' : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <img src={img} alt={`Page ${i + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}

                <SignatureCanvas
                  pdfPageImage={pdfPageImages[selectedPageIndex] || ''}
                  stampPreview={stampPreview}
                  signerName={signerName}
                  onPositionChange={setCustomPos}
                  pageWidth={595}
                  pageHeight={842}
                />
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep('stamp')} className="gap-2 h-9">
                  <ArrowLeft className="h-4 w-4" /> Retour
                </Button>
                <Button onClick={handleSign} disabled={signing} className="gap-2 h-10" size="lg">
                  {signing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  {signing ? 'Signature en cours...' : 'Signer le document'}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 5: Done */}
          {step === 'done' && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }} className="space-y-4">
              <div className="bg-card border border-border rounded-lg p-8 text-center space-y-5">
                <div className="inline-flex h-14 w-14 rounded-full bg-emerald-500/10 items-center justify-center">
                  <CheckCircle className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Document signé avec succès</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Signature sur {pagePosition === 'all' ? 'toutes les pages' : pagePosition === 'first' ? 'la première page' : pagePosition === 'last' ? 'la dernière page' : 'la page du milieu'}
                  </p>
                </div>

                {signedPdfUrl && (
                  <div className="rounded-lg border overflow-hidden">
                    <object data={signedPdfUrl} type="application/pdf" className="w-full h-[350px]">
                      <p className="p-4 text-muted-foreground">Aperçu non disponible</p>
                    </object>
                  </div>
                )}

                <div className="flex flex-wrap justify-center gap-2">
                  <Button onClick={handleDownload} className="gap-2 h-9">
                    <Download className="h-4 w-4" />
                    Télécharger
                  </Button>
                  <EmailDropdown fileName={signedFileName} pdfUrl={signedPdfUrl} />
                  <Button variant="outline" onClick={resetAll} className="h-9">
                    Signer un autre document
                  </Button>
                </div>
              </div>

              {auditTrail && <SignatureProof audit={auditTrail} />}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
