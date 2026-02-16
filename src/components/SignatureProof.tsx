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
    { icon: Globe, label: 'Adresse IP', value: audit.ipAddress },
    { icon: Monitor, label: 'Appareil', value: audit.device },
    { icon: PenTool, label: 'Méthode', value: methodLabel(audit.method) },
    { icon: FileText, label: 'Document', value: audit.documentLabel || audit.documentName },
    { icon: MapPin, label: 'Pages signées', value: audit.signaturePosition === 'all' ? 'Toutes' : audit.signaturePosition === 'first' ? 'Première' : audit.signaturePosition === 'last' ? 'Dernière' : 'Milieu' },
    { icon: ShieldCheck, label: 'Statut', value: 'Document officiellement signé' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="glass rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 to-accent/20 px-6 py-4 border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Journal de signature — Preuve d'authenticité</h3>
            <p className="text-xs text-muted-foreground">Audit trail · SENSTOCK e-Signature</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-full">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span className="text-xs font-semibold">Vérifié</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="divide-y divide-border/30">
        {rows.map((row, i) => (
          <motion.div
            key={row.label}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.04 }}
            className="flex items-center px-6 py-3 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-3 w-44 shrink-0">
              <row.icon className="h-4 w-4 text-primary/70" />
              <span className="text-xs font-medium text-muted-foreground">{row.label}</span>
            </div>
            <span className="text-sm font-medium text-foreground">{row.value}</span>
          </motion.div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 bg-muted/20 border-t border-border/30">
        <p className="text-[10px] text-muted-foreground text-center">
          Ce journal de signature est généré automatiquement par la plateforme SENSTOCK. Il constitue une preuve
          d'authenticité horodatée et non modifiable. Les informations sont intégrées dans les propriétés du document PDF.
        </p>
      </div>
    </motion.div>
  );
}
