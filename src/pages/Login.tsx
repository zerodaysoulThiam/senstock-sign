import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, initUsers } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PenTool, Mail, Lock, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import loginBg from '@/assets/login-bg.jpg';

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

    await new Promise(r => setTimeout(r, 500));

    const user = login(email, password);
    if (user) {
      navigate('/dashboard');
    } else {
      setError('Email ou mot de passe incorrect');
    }
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <img
        src={loginBg}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-background/40 backdrop-blur-sm" />

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="glass rounded-2xl p-8 shadow-2xl">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex h-14 w-14 rounded-xl brand-gradient items-center justify-center mb-4 shadow-lg">
              <PenTool className="h-7 w-7 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-gradient">SENSTOCK</h1>
            <p className="text-sm text-muted-foreground mt-1">Plateforme de Signature Électronique</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email professionnel</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="prenom.nom@senstock.sn"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </motion.div>
            )}

            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground mt-6">
            Accès réservé aux employés SENSTOCK
          </p>
        </div>
      </motion.div>
    </div>
  );
}
