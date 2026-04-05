import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, ShieldCheck } from 'lucide-react';

interface SigningCeremonyProps {
  show: boolean;
  signerName: string;
  onComplete: () => void;
}

export default function SigningCeremony({ show, signerName, onComplete }: SigningCeremonyProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onComplete, 2500);
      return () => clearTimeout(timer);
    }
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="text-center space-y-4"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="inline-flex h-20 w-20 rounded-full bg-emerald-500/10 items-center justify-center mx-auto"
            >
              <CheckCircle className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-center justify-center gap-2 mb-1.5">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <h2 className="text-xl font-bold text-foreground">Document signé</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Signé par <span className="font-semibold text-foreground">{signerName}</span>
              </p>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
