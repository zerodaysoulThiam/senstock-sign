import { motion } from 'framer-motion';
import { type AuditTrail, methodLabel } from '@/lib/audit';
import {
  User, Mail, Calendar, Clock, Globe, Monitor,
  PenTool, ShieldCheck, Hash, FileText, MapPin, CheckCircle2
} from 'lucide-react';

interface SignatureProofProps {
  audit: AuditTrail;
}

export default function SignatureProof({ audit }: SignatureProofProps) {
  const date = new Date(audit.signedAt);

  const rows: { icon: React.ElementType; label: string; value: string }[] = [
    { icon: Hash, label: 'ID de signature', value: audit.signatureId },
    { icon: User, label: 'Nom du signataire', value: audit.signerName },
    { icon: Mail, label: 'Email', value: audit.signerEmail },
    { icon: Calendar, label: 'Date', value: date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) },
    { icon: Clock, label: 'Heure', value: date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) },
    { icon: Globe, label: 'Empreinte session', value: audit.ipAddress },
    { icon: Monitor, label: 'Appareil', value: audit.device },
    { icon: PenTool, label: 'Méthode', value: methodLabel(audit.method) },
    { icon: FileText, label: 'Document', value: audit.documentLabel || audit.documentName },
    { icon: MapPin, label: 'Pages signées', value: audit.signaturePosition === 'all' ? 'Toutes' : audit.signaturePosition === 'first' ? 'Première' : audit.signaturePosition === 'last' ? 'Dernière' : 'Milieu' },
    { icon: ShieldCheck, label: 'Statut', value: 'Document officiellement signé' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-lg overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 py-3 border-b bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <div>
            <h3 className="text-sm font-semibold text-foreground">Preuve de signature</h3>
            <p className="text-[10px] text-muted-foreground">Audit trail · SENSTOCK</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full">
          <CheckCircle2 className="h-3 w-3" />
          <span className="text-xs font-medium">Vérifié</span>
        </div>
      </div>

      {/* Body */}
      <div className="divide-y divide-border">
        {rows.map((row, i) => (
          <div
            key={row.label}
            className="flex items-center px-5 py-2.5 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2.5 w-40 shrink-0">
              <row.icon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{row.label}</span>
            </div>
            <span className="text-sm font-medium text-foreground">{row.value}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-5 py-2.5 bg-muted/20 border-t">
        <p className="text-[10px] text-muted-foreground text-center">
          Ce journal de signature est généré automatiquement par SENSTOCK. Les informations sont intégrées dans les propriétés du PDF.
        </p>
      </div>
    </motion.div>
  );
}
