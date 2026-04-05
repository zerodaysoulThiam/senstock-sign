import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mail, ChevronDown } from 'lucide-react';

interface EmailDropdownProps {
  fileName: string;
  pdfUrl: string;
}

export default function EmailDropdown({ fileName, pdfUrl }: EmailDropdownProps) {
  const [open, setOpen] = useState(false);

  const subject = encodeURIComponent(`Document signé : ${fileName}`);
  const body = encodeURIComponent(
    `Bonjour,\n\nVeuillez trouver ci-joint le document signé "${fileName}".\n\nCordialement,\nSENSTOCK`
  );

  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`;
  const outlookUrl = `https://outlook.live.com/mail/0/deeplink/compose?subject=${subject}&body=${body}`;
  const mailtoUrl = `mailto:?subject=${subject}&body=${body}`;

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setOpen(!open)}
        className="gap-2 h-9"
      >
        <Mail className="h-4 w-4" />
        Envoyer par email
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full mb-1 left-0 w-52 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
            <a
              href={gmailUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-muted transition-colors text-sm"
            >
              <Mail className="h-4 w-4 text-destructive" />
              Gmail
            </a>
            <a
              href={outlookUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-muted transition-colors text-sm border-t"
            >
              <Mail className="h-4 w-4 text-primary" />
              Outlook
            </a>
            <a
              href={mailtoUrl}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-muted transition-colors text-sm border-t"
            >
              <Mail className="h-4 w-4" />
              Application par défaut
            </a>
          </div>
        </>
      )}
    </div>
  );
}
