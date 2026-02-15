import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mail, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface EmailDropdownProps {
  fileName: string;
  pdfUrl: string;
}

export default function EmailDropdown({ fileName, pdfUrl }: EmailDropdownProps) {
  const [open, setOpen] = useState(false);

  const subject = encodeURIComponent(`Document signé : ${fileName}`);
  const body = encodeURIComponent(
    `Bonjour,\n\nVeuillez trouver ci-joint le document signé "${fileName}".\n\nCordialement,\nSENSTOCK - Signature Électronique`
  );

  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`;
  const outlookUrl = `https://outlook.live.com/mail/0/deeplink/compose?subject=${subject}&body=${body}`;
  const mailtoUrl = `mailto:?subject=${subject}&body=${body}`;

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="lg"
        onClick={() => setOpen(!open)}
        className="gap-2"
      >
        <Mail className="h-5 w-5" />
        Envoyer par email
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </Button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 5, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.95 }}
              className="absolute bottom-full mb-2 left-0 w-56 bg-card border rounded-xl shadow-xl z-50 overflow-hidden"
            >
              <a
                href={gmailUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors text-sm"
              >
                <img src="https://www.google.com/gmail/about/static-2.0/images/logo-gmail.png" alt="Gmail" className="h-5 w-5 object-contain" />
                Ouvrir Gmail
              </a>
              <a
                href={outlookUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors text-sm border-t"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none"><rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M2 8l10 5 10-5" stroke="currentColor" strokeWidth="2"/></svg>
                Ouvrir Outlook
              </a>
              <a
                href={mailtoUrl}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors text-sm border-t"
              >
                <Mail className="h-5 w-5" />
                Application par défaut
              </a>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
