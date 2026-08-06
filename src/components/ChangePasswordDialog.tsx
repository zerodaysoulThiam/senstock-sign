import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PasswordPolicyField from '@/components/PasswordPolicyField';
import { changeOwnPassword } from '@/lib/auth';
import { validatePassword } from '@/lib/password';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ChangePasswordDialog({ open, onOpenChange }: Props) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const reset = () => { setCurrent(''); setNext(''); setConfirm(''); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePassword(next).valid) {
      toast.error('Le nouveau mot de passe ne respecte pas la politique de sécurité');
      return;
    }
    if (next !== confirm) {
      toast.error('Les deux mots de passe ne correspondent pas');
      return;
    }
    setBusy(true);
    const res = await changeOwnPassword(current, next);
    setBusy(false);
    if (res.ok) {
      toast.success('Mot de passe mis à jour');
      reset();
      onOpenChange(false);
    } else {
      toast.error(res.error || 'Modification impossible');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Changer mon mot de passe</DialogTitle>
          <DialogDescription className="text-xs">
            Saisissez votre mot de passe actuel puis un nouveau mot de passe conforme à la politique de sécurité.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentpwd" className="text-xs text-muted-foreground">Mot de passe actuel</Label>
            <Input
              id="currentpwd"
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <PasswordPolicyField
            id="nextpwd"
            label="Nouveau mot de passe"
            value={next}
            onChange={setNext}
            autoComplete="new-password"
          />
          <div className="space-y-2">
            <Label htmlFor="confirmpwd" className="text-xs text-muted-foreground">Confirmer le nouveau mot de passe</Label>
            <Input
              id="confirmpwd"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={busy}>{busy ? 'Modification…' : 'Mettre à jour'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
