import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, ShieldAlert, ShieldQuestion, Upload, Loader2, FileText, ArrowLeft, Fingerprint } from 'lucide-react';
import { sha256Hex, verifyByHash, formatHash, type VerificationResult } from '@/lib/proof';
import { toast } from 'sonner';

const MAX_BYTES = 200 * 1024 * 1024;

export default function VerifyDocument() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [checking, setChecking] = useState(false);
  const [fileName, setFileName] = useState('');
  const [hash, setHash] = useState('');
  const [signatureId, setSignatureId] = useState('');
  const [result, setResult] = useState<VerificationResult | null>(null);

  const runCheck = async (file: File) => {
    if (file.type !== 'application/pdf') {
      toast.error('Veuillez déposer un fichier PDF');
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error('Fichier trop volumineux (200 Mo maximum)');
      return;
    }
    setChecking(true);
    setResult(null);
    try {
      const digest = await sha256Hex(file);
      setFileName(file.name);
      setHash(digest);
      const res = await verifyByHash(digest, signatureId.trim() || undefined);
      setResult(res);
    } catch (e: any) {
      toast.error(e?.message || 'Vérification impossible');
    }
    setChecking(false);
  };

  const status = result?.status;
  const rec = result?.record;

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="border-b bg-card">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 font-bold">
            <ShieldCheck className="h-5 w-5 text-primary" />
            SENSTOCK · Vérification
          </div>
          <Button asChild variant="ghost" size="sm" className="gap-1.5">
            <Link to="/login"><ArrowLeft className="h-4 w-4" /> Connexion</Link>
          </Button>
        </div>
      </header>

      <main className="container max-w-2xl py-10 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Vérifier l'intégrité d'un document signé</h1>
          <p className="text-sm text-muted-foreground">
            Déposez le PDF reçu. Son empreinte SHA-256 est calculée dans votre navigateur puis comparée
            au registre SENSTOCK. Le fichier lui-même n'est jamais transmis.
          </p>
        </div>

        <div className="bg-card rounded-xl border p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sigid">Identifiant de signature (facultatif)</Label>
            <Input
              id="sigid"
              placeholder="SIGN-XXXXXXXXXX"
              maxLength={26}
              value={signatureId}
              onChange={(e) => setSignatureId(e.target.value.toUpperCase())}
            />
          </div>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) runCheck(f); }}
            className="border-2 border-dashed rounded-xl p-8 text-center"
          >
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) runCheck(f); }}
            />
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground mb-4">Glissez le PDF ici ou sélectionnez-le</p>
            <Button onClick={() => inputRef.current?.click()} disabled={checking} className="gap-2">
              {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {checking ? 'Vérification…' : 'Choisir un PDF'}
            </Button>
          </div>

          {hash && (
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <Fingerprint className="h-3 w-3" /> Empreinte du fichier déposé
              </p>
              <p className="font-mono text-[11px] break-all mt-1">{formatHash(hash)}</p>
              {fileName && <p className="text-xs text-muted-foreground mt-1">{fileName}</p>}
            </div>
          )}
        </div>

        {result && (
          <div className={`rounded-xl border-2 p-6 space-y-4 ${
            status === 'verified' ? 'border-primary bg-accent/40'
            : status === 'mismatch' ? 'border-destructive bg-destructive/5'
            : 'border-border bg-card'
          }`}>
            <div className="flex items-start gap-3">
              {status === 'verified' ? <ShieldCheck className="h-7 w-7 text-primary shrink-0" />
                : status === 'mismatch' ? <ShieldAlert className="h-7 w-7 text-destructive shrink-0" />
                : <ShieldQuestion className="h-7 w-7 text-muted-foreground shrink-0" />}
              <div>
                <h2 className="font-bold">
                  {status === 'verified' ? 'DOCUMENT VÉRIFIÉ'
                    : status === 'mismatch' ? 'DOCUMENT NON CONFORME'
                    : 'SIGNATURE INCONNUE'}
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">{result.message}</p>
                {status === 'mismatch' && (
                  <p className="text-sm text-destructive mt-1">
                    L'intégrité de ce fichier ne peut pas être confirmée : il a été modifié après signature.
                  </p>
                )}
              </div>
            </div>

            {rec && (
              <dl className="divide-y rounded-lg border bg-card">
                {[
                  ['Signataire', rec.signerName],
                  ['Signature', rec.signatureId],
                  ['Document enregistré', rec.fileName],
                  ['Signé le', new Date(rec.signedAt).toLocaleString('fr-FR')],
                  ['Méthode d\u2019authentification', rec.authMethod ?? '—'],
                  ['Signature PDF', rec.cryptoSigned ? 'Cryptographique (PAdES) intégrée au PDF' : 'Cachet + empreinte SHA-256'],
                  ['Certificat', rec.certSubject ?? '—'],
                  ['Intégrité', status === 'verified' ? 'vérifiée' : 'non confirmée'],
                ].map(([k, v]) => (
                  <div key={k as string} className="grid sm:grid-cols-3 gap-1 px-3 py-2">
                    <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{k}</dt>
                    <dd className="sm:col-span-2 text-sm font-medium break-words">{v as string}</dd>
                  </div>
                ))}
                <div className="px-3 py-2">
                  <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Empreinte enregistrée</dt>
                  <dd className="font-mono text-[11px] break-all mt-1">{formatHash(rec.expectedSha256)}</dd>
                </div>
              </dl>
            )}
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">
          Les documents signés par SENSTOCK contiennent également une signature cryptographique PAdES :
          un lecteur compatible (Adobe Acrobat) signale directement toute modification postérieure à la signature.
        </p>
      </main>
    </div>
  );
}
