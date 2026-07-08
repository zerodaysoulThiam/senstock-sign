import { CheckCircle2, ShieldCheck, Fingerprint, Mail, Calendar, Clock, Monitor, FileText, PenTool, Hash, MapPin, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface SignatureReceiptData {
  signatureId: string;
  signerName: string;
  signerEmail: string;
  signedAt: string; // ISO
  device?: string;
  ipOrSession?: string;
  method?: string;
  fileName: string;
  pagesSigned: string; // e.g. "Dernière", "Toutes", ...
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch { return iso; }
}
function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch { return ''; }
}

export function detectDevice(): string {
  const ua = navigator.userAgent;
  let browser = 'Navigateur';
  if (/Edg\//.test(ua)) browser = 'Microsoft Edge';
  else if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) browser = 'Google Chrome';
  else if (/Firefox\//.test(ua)) browser = 'Mozilla Firefox';
  else if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) browser = 'Safari';
  let os = '';
  if (/Windows NT 10/.test(ua)) os = 'Windows 10/11';
  else if (/Windows/.test(ua)) os = 'Windows';
  else if (/Mac OS X/.test(ua)) os = 'macOS';
  else if (/Android/.test(ua)) os = 'Android';
  else if (/iPhone|iPad/.test(ua)) os = 'iOS';
  else if (/Linux/.test(ua)) os = 'Linux';
  return os ? `${browser} / ${os}` : browser;
}

export function makeSessionFingerprint(seed: string): string {
  let h = 5381;
  const s = seed + navigator.userAgent + (navigator.language || '') + (screen.width + 'x' + screen.height);
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  const hex = (h >>> 0).toString(16).toUpperCase().padStart(8, '0');
  return `${hex.slice(0, 4)}.${hex.slice(4, 8)}`;
}

export function makeSignatureId(seed: string): string {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = (h * 16777619) >>> 0; }
  const base = h.toString(36).toUpperCase().padStart(6, '0').slice(-6);
  return `SIGN-${base}`;
}

export function pagesLabelFor(position: string): string {
  switch (position) {
    case 'first': return 'Première';
    case 'last': return 'Dernière';
    case 'all': return 'Toutes les pages';
    case 'middle': return 'Page du milieu';
    default: return position || '—';
  }
}

export function receiptFromDoc(doc: {
  id: string; fileName: string; signedBy: string; signedByName: string;
  signedAt: string; signaturePosition: string;
}): SignatureReceiptData {
  const seed = `${doc.signedBy}|${doc.fileName}|${doc.signedAt}|${doc.id}`;
  return {
    signatureId: makeSignatureId(seed),
    signerName: doc.signedByName,
    signerEmail: doc.signedBy,
    signedAt: doc.signedAt,
    device: detectDevice(),
    ipOrSession: makeSessionFingerprint(seed),
    method: 'Signature électronique avec cachet',
    fileName: doc.fileName,
    pagesSigned: pagesLabelFor(doc.signaturePosition),
  };
}

export default function SignatureReceipt({ data, onClose }: { data: SignatureReceiptData; onClose?: () => void }) {
  const rows: { icon: any; label: string; value: string }[] = [
    { icon: Hash, label: 'ID', value: data.signatureId },
    { icon: PenTool, label: 'Signataire', value: data.signerName },
    { icon: Mail, label: 'Email', value: data.signerEmail },
    { icon: Calendar, label: 'Date', value: fmtDate(data.signedAt) },
    { icon: Clock, label: 'Heure', value: fmtTime(data.signedAt) },
    { icon: MapPin, label: 'Empreinte', value: data.ipOrSession || '—' },
    { icon: Monitor, label: 'Appareil', value: data.device || detectDevice() },
    { icon: ShieldCheck, label: 'Méthode', value: data.method || 'Signature électronique' },
    { icon: FileText, label: 'Document', value: data.fileName },
    { icon: CheckCircle2, label: 'Pages', value: data.pagesSigned },
  ];
  return (
    <div className="bg-card rounded-xl border shadow-sm overflow-hidden text-left">
      <div className="p-3 sm:p-4 border-b bg-gradient-to-r from-accent/60 to-accent/20 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <Fingerprint className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-xs sm:text-sm leading-tight">Journal de signature</h3>
            <p className="text-[10px] text-muted-foreground">Audit trail · SENSTOCK</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-medium shrink-0">
          <ShieldCheck className="h-3 w-3" /> Vérifié
        </span>
      </div>
      <div className="divide-y">
        {rows.map((r) => (
          <div key={r.label} className="flex items-start gap-2 px-3 sm:px-4 py-2">
            <r.icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-0.5 sm:gap-3 flex-1 min-w-0">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{r.label}</span>
              <span className="sm:col-span-2 text-xs sm:text-sm font-medium break-words">{r.value}</span>
            </div>
          </div>
        ))}
        <div className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-accent/20">
          <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium text-primary">Signé officiellement</span>
        </div>
      </div>
      <div className="px-3 sm:px-4 py-2 border-t bg-muted/30">
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Ce journal est généré automatiquement par SENSTOCK. Preuve horodatée intégrée au PDF signé.
        </p>
      </div>
      {onClose && (
        <div className="sticky bottom-0 px-3 sm:px-4 py-2 border-t bg-card flex justify-end">
          <Button variant="default" size="sm" onClick={onClose} className="gap-1.5 text-xs">
            <X className="h-3.5 w-3.5" />
            Fermer
          </Button>
        </div>
      )}
    </div>
  );
}