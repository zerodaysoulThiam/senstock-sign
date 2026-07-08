import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Mail, ExternalLink } from 'lucide-react';

interface Props {
  fileName: string;
  signerName: string;
  signedAt?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'icon';
  label?: string;
  iconOnly?: boolean;
}

export default function EmailShareMenu({ fileName, signerName, signedAt, variant = 'outline', size = 'default', label = 'Envoyer par email', iconOnly = false }: Props) {
  const dateStr = signedAt ? new Date(signedAt).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR');
  const subject = `Document signé : ${fileName}`;
  const body = `Bonjour,\n\nVeuillez trouver ci-joint le document "${fileName}" signé électroniquement par ${signerName} le ${dateStr}.\n\nMerci de joindre manuellement le PDF téléchargé à cet e-mail avant l'envoi.\n\nCordialement,\n${signerName}`;
  const eSub = encodeURIComponent(subject);
  const eBody = encodeURIComponent(body);

  const openGmail = () => {
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&su=${eSub}&body=${eBody}`, '_blank', 'noopener,noreferrer');
  };
  const openOutlook = () => {
    window.open(`https://outlook.live.com/mail/0/deeplink/compose?subject=${eSub}&body=${eBody}`, '_blank', 'noopener,noreferrer');
  };
  const openDefault = () => {
    window.location.href = `mailto:?subject=${eSub}&body=${eBody}`;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className="gap-2" title="Envoyer par email">
          <Mail className="h-4 w-4" />
          {!iconOnly && <span>{label}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-popover">
        <DropdownMenuLabel>Envoyer via</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={openGmail} className="gap-2 cursor-pointer">
          <Mail className="h-4 w-4 text-red-500" /> Gmail <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
        </DropdownMenuItem>
        <DropdownMenuItem onClick={openOutlook} className="gap-2 cursor-pointer">
          <Mail className="h-4 w-4 text-blue-500" /> Outlook <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
        </DropdownMenuItem>
        <DropdownMenuItem onClick={openDefault} className="gap-2 cursor-pointer">
          <Mail className="h-4 w-4" /> Application par défaut
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}