import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, extractName } from '@/lib/auth';
import { saveDocument } from '@/lib/documents';
import { signPDF, type SignaturePosition, type CustomSignaturePosition } from '@/lib/pdf-signer';
import AppHeader from '@/components/AppHeader';
import SignatureCanvas from '@/components/SignatureCanvas';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, FileText, Image, CheckCircle, Download, ArrowLeft, Loader2, Eye } from 'lucide-react';
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

  const [stampFile, setStampFile] = useState<File | null>(null);
  const [stampPreview, setStampPreview] = useState('');
  const [stampBytes, setStampBytes] = useState<Uint8Array | null>(null);
  const [stampType, setStampType] = useState<'png' | 'jpg'>('png');

  const [pagePosition, setPagePosition] = useState<SignaturePosition>('last');
  const [customPos, setCustomPos] = useState<CustomSignaturePosition>({
    x: 70, y: 80, width: 120, height: 72, nameX: 70, nameY: 76,
  });
  const [signing, setSigning] = useState(false);
  const [signedPdfUrl, setSignedPdfUrl] = useState('');
  const [signedFileName, setSignedFileName] = useState('');
  const [docLabel, setDocLabel] = useState('');

  // For canvas preview - generate a simple placeholder
  const [pagePreviewUrl, setPagePreviewUrl] = useState('');

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
    setDocLabel(file.name.replace('.pdf', ''));
    setStep('read');
  };

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
      const { signedPdf, pageCount } = await signPDF(pdfBytes, stampBytes, stampType, signerName, pagePosition, customPos);
      const blob = new Blob([signedPdf.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setSignedPdfUrl(url);

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

  const resetAll = () => {
    setStep('upload');
    setPdfFile(null); setPdfUrl(''); setPdfBytes(null);
    setStampFile(null); setStampPreview(''); setStampBytes(null);
    setSignedPdfUrl(''); setSignedFileName(''); setDocLabel('');
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
    { key: 'stamp', label: 'Cachet', num: 3 },
    { key: 'position', label: 'Position', num: 4 },
    { key: 'done', label: 'Terminé', num: 5 },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === step);

  return (
    <div className="min-h-screen bg-secondary/30">
      <AppHeader />
      <main className="container py-8 max-w-5xl space-y-8">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-1 sm:gap-2">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center gap-1 sm:gap-2">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                i <= currentStepIndex
                  ? 'bg-primary text-primary-foreground shadow-lg'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {i < currentStepIndex ? <CheckCircle className="h-4 w-4" /> : s.num}
              </div>
              <span className={`text-xs hidden sm:inline ${i <= currentStepIndex ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                {s.label}
              </span>
              {i < steps.length - 1 && <div className={`w-4 sm:w-8 h-0.5 ${i < currentStepIndex ? 'bg-primary' : 'bg-muted'}`} />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Upload PDF */}
          {step === 'upload' && (
            <motion.div key="upload" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="glass rounded-2xl p-10 text-center">
                <input ref={pdfInputRef} type="file" accept="application/pdf" onChange={handlePdfUpload} className="hidden" />
                <div className="inline-flex h-20 w-20 rounded-2xl bg-accent/50 items-center justify-center mb-6">
                  <FileText className="h-10 w-10 text-primary" />
                </div>
                <h2 className="text-xl font-bold mb-2">Téléchargez votre document PDF</h2>
                <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                  Sélectionnez le fichier PDF que vous souhaitez signer. Vous pourrez le lire avant de procéder.
                </p>
                <Button size="lg" onClick={() => pdfInputRef.current?.click()} className="gap-2 shadow-lg">
                  <Upload className="h-5 w-5" />
                  Choisir un fichier PDF
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Read Document */}
          {step === 'read' && (
            <motion.div key="read" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="glass rounded-2xl overflow-hidden">
                <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold">Lecture du document : {pdfFile?.name}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Vérifiez le contenu avant de signer</p>
                </div>
                <object data={pdfUrl} type="application/pdf" className="w-full h-[600px]">
                  <p className="p-8 text-center text-muted-foreground">
                    Aperçu PDF non disponible dans ce navigateur.
                    <br />
                    <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline mt-2 inline-block">
                      Ouvrir dans un nouvel onglet
                    </a>
                  </p>
                </object>
              </div>

              {/* Label input */}
              <div className="glass rounded-2xl p-4">
                <Label className="text-sm font-medium mb-2 block">Libellé du document (optionnel)</Label>
                <input
                  type="text"
                  value={docLabel}
                  onChange={e => setDocLabel(e.target.value)}
                  placeholder="Ex: Contrat de service N°2024-001"
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
                />
              </div>

              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep('upload')} className="gap-2">
                  <ArrowLeft className="h-4 w-4" /> Retour
                </Button>
                <Button onClick={() => setStep('stamp')} className="gap-2 shadow-lg">
                  Document vérifié, continuer
                  <CheckCircle className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Upload Stamp */}
          {step === 'stamp' && (
            <motion.div key="stamp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="glass rounded-2xl overflow-hidden">
                  <div className="p-3 border-b bg-muted/30">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" /> {pdfFile?.name}
                    </p>
                  </div>
                  <object data={pdfUrl} type="application/pdf" className="w-full h-[400px]">
                    <p className="p-4 text-sm text-muted-foreground">Aperçu non disponible</p>
                  </object>
                </div>

                <div className="glass rounded-2xl p-8 flex flex-col items-center justify-center">
                  <input ref={stampInputRef} type="file" accept="image/png,image/jpeg,image/jpg" onChange={handleStampUpload} className="hidden" />
                  {stampPreview ? (
                    <div className="text-center space-y-4">
                      <p className="text-sm font-semibold">Aperçu du cachet</p>
                      <img src={stampPreview} alt="Cachet" className="max-h-40 mx-auto border-2 border-dashed border-border rounded-xl p-3" />
                      <Button variant="outline" onClick={() => stampInputRef.current?.click()}>Changer le cachet</Button>
                    </div>
                  ) : (
                    <>
                      <div className="h-16 w-16 rounded-2xl bg-accent/50 flex items-center justify-center mb-4">
                        <Image className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="text-lg font-bold mb-2">Votre cachet professionnel</h3>
                      <p className="text-sm text-muted-foreground text-center mb-6">Image PNG ou JPG</p>
                      <Button variant="outline" onClick={() => stampInputRef.current?.click()} className="gap-2">
                        <Upload className="h-4 w-4" />
                        Choisir une image
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <div className="flex justify-start">
                <Button variant="ghost" onClick={() => setStep('read')} className="gap-2">
                  <ArrowLeft className="h-4 w-4" /> Retour
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Position Signature with Drag & Drop */}
          {step === 'position' && (
            <motion.div key="position" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              {/* Page selection */}
              <div className="glass rounded-2xl p-5">
                <h3 className="text-sm font-semibold mb-3">Pages à signer</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {positionOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setPagePosition(opt.value)}
                      className={`p-3 rounded-xl border-2 text-left transition-all text-sm ${
                        pagePosition === opt.value
                          ? 'border-primary bg-accent/50 shadow-sm'
                          : 'border-border hover:border-primary/40'
                      }`}
                    >
                      <p className="font-semibold text-xs">{opt.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Drag & drop positioning */}
              <div className="glass rounded-2xl p-5">
                <h3 className="text-sm font-semibold mb-1">Positionnez votre signature</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Déplacez le cachet et le nom du signataire où vous souhaitez sur le document. Ajustez la taille avec le curseur.
                </p>

                <SignatureCanvas
                  pdfPageImage={pdfUrl ? '' : ''}
                  stampPreview={stampPreview}
                  signerName={signerName}
                  onPositionChange={setCustomPos}
                  pageWidth={595}
                  pageHeight={842}
                />
              </div>

              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep('stamp')} className="gap-2">
                  <ArrowLeft className="h-4 w-4" /> Retour
                </Button>
                <Button onClick={handleSign} disabled={signing} className="gap-2 shadow-lg" size="lg">
                  {signing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  {signing ? 'Signature en cours...' : 'Signer le document'}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 5: Done */}
          {step === 'done' && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass rounded-2xl p-10 text-center space-y-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                className="inline-flex h-20 w-20 rounded-full bg-accent items-center justify-center"
              >
                <CheckCircle className="h-10 w-10 text-primary" />
              </motion.div>
              <div>
                <h2 className="text-2xl font-bold">Document signé avec succès !</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Signature appliquée sur {pagePosition === 'all' ? 'toutes les pages' : pagePosition === 'first' ? 'la première page' : pagePosition === 'last' ? 'la dernière page' : 'la page du milieu'}
                </p>
              </div>

              {signedPdfUrl && (
                <div className="rounded-xl border overflow-hidden">
                  <object data={signedPdfUrl} type="application/pdf" className="w-full h-[400px]">
                    <p className="p-4 text-muted-foreground">Aperçu non disponible</p>
                  </object>
                </div>
              )}

              <div className="flex justify-center gap-3">
                <Button size="lg" onClick={handleDownload} className="gap-2 shadow-lg">
                  <Download className="h-5 w-5" />
                  Télécharger le PDF signé
                </Button>
                <Button variant="outline" size="lg" onClick={resetAll}>
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
