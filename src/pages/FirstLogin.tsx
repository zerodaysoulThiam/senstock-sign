import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, completeFirstLogin, logout } from '@/lib/auth';
import PasswordPolicyField from '@/components/PasswordPolicyField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ShieldCheck, KeyRound } from 'lucide-react';

export default function FirstLogin() {
  const navigate = useNavigate();
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const user = getCurrentUser();

  useEffect(() => {
    if (!user) navigate('/login', { replace: true });
    else if (!user.mustChangePassword) navigate('/dashboard', { replace: true });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== confirm) {
      toast.error('Les deux mots de passe ne correspondent pas');
      return;
    }
    setBusy(true);
    const res = await completeFirstLogin(next);
    setBusy(false);
    if (res.ok) {
      toast.success('Mot de passe défini. Bienvenue sur SENSTOCK.');
      navigate('/dashboard', { replace: true });
    } else {
      toast.error(res.error || 'Impossible de définir le mot de passe');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/40 px-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl brand-gradient">
            <ShieldCheck className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold">Première connexion</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pour votre sécurité, définissez vous-même votre mot de passe personnel.
            Le mot de passe provisoire fourni par l'administrateur sera désactivé.
          </p>
        </div>

        <div className="mb-4 flex items-start gap-2 rounded-lg bg-secondary p-3 text-xs text-muted-foreground">
          <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>Compte : <strong>{user?.email}</strong></span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordPolicyField
            id="firstpwd"
            label="Nouveau mot de passe"
            value={next}
            onChange={setNext}
            autoComplete="new-password"
          />
          <div className="space-y-2">
            <Label htmlFor="firstpwd2" className="text-xs text-muted-foreground">Confirmer le mot de passe</Label>
            <Input
              id="firstpwd2"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
          <Button type="submit" className="w-full h-11" disabled={busy}>
            {busy ? 'Enregistrement…' : 'Définir mon mot de passe'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={async () => { await logout(); navigate('/login', { replace: true }); }}
          >
            Se déconnecter
          </Button>
        </form>
      </div>
    </div>
  );
}
