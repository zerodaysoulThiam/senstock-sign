import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '@/lib/auth';
import AppHeader from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Upload, Trash2, Stamp, Loader2, CheckCircle2, PenTool } from 'lucide-react';
import { toast } from 'sonner';
import { loadDefaultSignature, saveDefaultSignature, deleteDefaultSignature } from '@/lib/signature';

export default function MySignature() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!user) navigate('/login');
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const sig = await loadDefaultSignature();
      if (cancelled) return;
      if (sig) setPreview(sig.url);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  if (!user) return null;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image PNG ou JPG');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image trop lourde (5 Mo maximum)');
      return;
    }
    setSaving(true);
    const type = file.type.includes('png') ? 'png' : 'jpg';
    const ok = await saveDefaultSignature(file, type);
    setSaving(false);
    if (!ok) {
      toast.error("Impossible d'enregistrer le cachet, réessayez");
      return;
    }
    setPreview(URL.createObjectURL(file));
    toast.success('Cachet enregistré sur votre compte');
  };

  const handleDelete = async () => {
    setSaving(true);
    await deleteDefaultSignature();
    setSaving(false);
    setPreview('');
    setConfirmOpen(false);
    toast.success('Cachet supprimé');
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <AppHeader />
      <main className="container py-8 max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Mon cachet</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enregistrez votre cachet une seule fois : il sera appliqué automatiquement à chacune de vos signatures.
            Vous pouvez le remplacer ou le supprimer à tout moment.
          </p>
        </div>

        <div className="bg-card rounded-xl border p-6 space-y-6">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            onChange={handleUpload}
            className="hidden"
          />

          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Chargement de votre cachet…
            </div>
          ) : preview ? (
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-sm text-primary">
                <CheckCircle2 className="h-4 w-4" />
                Cachet enregistré et actif
              </div>
              <div className="rounded-xl border bg-muted/30 p-6 flex items-center justify-center">
                <img src={preview} alt="Mon cachet" className="max-h-52 object-contain" />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => inputRef.current?.click()} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Remplacer le cachet
                </Button>
                <Button variant="outline" onClick={() => setConfirmOpen(true)} disabled={saving} className="gap-2">
                  <Trash2 className="h-4 w-4" /> Supprimer
                </Button>
                <Button variant="ghost" onClick={() => navigate('/sign')} className="gap-2">
                  <PenTool className="h-4 w-4" /> Signer un document
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 space-y-4">
              <Stamp className="h-14 w-14 mx-auto text-muted-foreground/30" />
              <div>
                <h2 className="font-semibold">Aucun cachet enregistré</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Image PNG (fond transparent recommandé) ou JPG, 5 Mo maximum.
                </p>
              </div>
              <Button onClick={() => inputRef.current?.click()} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Téléverser mon cachet
              </Button>
            </div>
          )}
        </div>
      </main>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer votre cachet ?</AlertDialogTitle>
            <AlertDialogDescription>
              Il ne sera plus appliqué automatiquement. Vous devrez en téléverser un nouveau pour signer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
