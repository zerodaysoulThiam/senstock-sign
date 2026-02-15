import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, Sparkles } from 'lucide-react';

interface SigningCeremonyProps {
  show: boolean;
  signerName: string;
  onComplete: () => void;
}

export default function SigningCeremony({ show, signerName, onComplete }: SigningCeremonyProps) {
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; delay: number; size: number }[]>([]);

  useEffect(() => {
    if (show) {
      // Generate confetti particles
      const p = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 0.5,
        size: Math.random() * 8 + 4,
      }));
      setParticles(p);

      // Play subtle sound
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15); // E5
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.3); // G5
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.8);
      } catch {}

      const timer = setTimeout(onComplete, 3000);
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
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/60 backdrop-blur-md"
        >
          {/* Confetti */}
          {particles.map(p => (
            <motion.div
              key={p.id}
              initial={{ opacity: 1, y: '50vh', x: `${p.x}vw`, scale: 0 }}
              animate={{
                opacity: [1, 1, 0],
                y: [`50vh`, `${p.y - 30}vh`],
                scale: [0, 1.5, 0.5],
                rotate: [0, 360],
              }}
              transition={{ duration: 2, delay: p.delay, ease: 'easeOut' }}
              className="absolute rounded-full"
              style={{
                width: p.size,
                height: p.size,
                background: `hsl(${Math.random() * 60 + 180}, 70%, 60%)`,
              }}
            />
          ))}

          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
            className="text-center space-y-4 z-10"
          >
            <motion.div
              animate={{ rotate: [0, -5, 5, 0] }}
              transition={{ repeat: 2, duration: 0.5, delay: 0.5 }}
              className="inline-flex h-24 w-24 rounded-full bg-primary/20 items-center justify-center mx-auto"
            >
              <Award className="h-12 w-12 text-primary" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="text-2xl font-bold text-foreground">Document officiellement signé</h2>
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <p className="text-muted-foreground">Signé par <span className="font-semibold text-foreground">{signerName}</span></p>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
