import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { validatePassword, PASSWORD_RULES_TEXT } from '@/lib/password';
import { Check, X } from 'lucide-react';

interface Props {
  id: string;
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
}

export default function PasswordPolicyField({ id, label, value, onChange, placeholder, autoComplete }: Props) {
  const check = validatePassword(value);
  const barColors = ['bg-destructive', 'bg-destructive', 'bg-yellow-500', 'bg-yellow-500', 'bg-emerald-500'];

  return (
    <div className="space-y-2">
      {label && <Label htmlFor={id} className="text-xs text-muted-foreground">{label}</Label>}
      <Input
        id={id}
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? 'Mot de passe conforme'}
        autoComplete={autoComplete}
        required
      />
      <div className="flex gap-1" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full ${i < check.score ? barColors[check.score] : 'bg-muted'}`}
          />
        ))}
      </div>
      {value.length === 0 ? (
        <p className="text-xs text-muted-foreground">{PASSWORD_RULES_TEXT}</p>
      ) : check.valid ? (
        <p className="text-xs text-emerald-600 flex items-center gap-1">
          <Check className="h-3 w-3" /> Mot de passe conforme
        </p>
      ) : (
        <ul className="space-y-0.5">
          {check.errors.map((err) => (
            <li key={err} className="text-xs text-muted-foreground flex items-center gap-1">
              <X className="h-3 w-3 text-destructive" /> {err}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
