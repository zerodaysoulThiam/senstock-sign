import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, initUsers } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PenTool, Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  initUsers();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    await new Promise(r => setTimeout(r, 400));

    const user = login(email, password);
    if (user) {
      navigate('/dashboard');
    } else {
      setError('Email ou mot de passe incorrect');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 brand-gradient relative items-center justify-center p-12">
        <div className="relative z-10 text-primary-foreground max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-12 w-12 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
              <PenTool className="h-6 w-6" />
            </div>
            <span className="text-2xl font-bold tracking-tight">SENSTOCK</span>
          </div>
          <h1 className="text-4xl font-bold leading-tight mb-4">
            Signature électronique<br />simple et sécurisée
          </h1>
          <p className="text-primary-foreground/80 text-lg leading-relaxed">
            Signez vos documents en quelques clics. Sécurisé, horodaté et conforme.
          </p>
          <div className="mt-10 space-y-4">
            {['Signature en 3 étapes', 'Audit trail complet', 'Export PDF certifié'].map((text, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-full bg-primary-foreground/20 flex items-center justify-center text-xs font-bold">✓</div>
                <span className="text-sm font-medium text-primary-foreground/90">{text}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/20" />
      </div>

      {/* Right panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="h-10 w-10 rounded-xl brand-gradient flex items-center justify-center">
              <PenTool className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">SENSTOCK</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">Connexion</h2>
            <p className="text-sm text-muted-foreground mt-1">Accédez à votre espace de signature</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="prenom.nom@senstock.sn"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="pl-10 h-10"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium">Mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="pl-10 h-10"
                  required
                />
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-sm text-destructive bg-destructive/8 rounded-lg p-3"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </motion.div>
            )}

            <Button type="submit" className="w-full h-10 gap-2" disabled={loading}>
              {loading ? 'Connexion...' : (
                <>Se connecter <ArrowRight className="h-4 w-4" /></>
              )}
            </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground mt-8">
            Plateforme sécurisée SENSTOCK · Accès réservé
          </p>
        </motion.div>
      </div>
    </div>
  );
}
