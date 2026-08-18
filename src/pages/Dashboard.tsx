import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, extractName } from '@/lib/auth';
import { getDocuments, downloadSignedDocument, deleteDocument, deleteDocuments, type SignedDocument } from '@/lib/documents';
import AppHeader from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { PenTool, FileText, Calendar, Download, Plus, FileSignature, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import EmailShareMenu from '@/components/EmailShareMenu';
import SignatureReceipt, { receiptFromDoc } from '@/components/SignatureReceipt';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function Dashboard() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [docs, setDocs] = useState<SignedDocument[]>([]);
  const [receiptDoc, setReceiptDoc] = useState<SignedDocument | null>(null);
  const [toDelete, setToDelete] = useState<SignedDocument | null>(null);
  const [purgeOpen, setPurgeOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    getDocuments(user.email).then(setDocs).catch(() => setDocs([]));
  }, []);

  if (!user) return null;

  const name = extractName(user.email);

  const handleDownload = async (doc: SignedDocument) => {
    try {
      await downloadSignedDocument(doc);
    } catch (e: any) {
      toast.error(e?.message || "Téléchargement impossible");
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setBusy(true);
    try {
      await deleteDocument(toDelete);
      setDocs((prev) => prev.filter((d) => d.id !== toDelete.id));
      toast.success('Document supprimé');
    } catch (e: any) {
      toast.error(e?.message || 'Suppression impossible');
    } finally {
      setBusy(false);
      setToDelete(null);
    }
  };

  const confirmPurge = async () => {
    setBusy(true);
    try {
      await deleteDocuments(docs);
      setDocs([]);
      toast.success('Tous les documents ont été supprimés');
    } catch (e: any) {
      toast.error(e?.message || 'Suppression impossible');
    } finally {
      setBusy(false);
      setPurgeOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <AppHeader />
      <main className="container py-8 space-y-8">
        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl font-bold">Bonjour, {name} 👋</h1>
            <p className="text-muted-foreground">Gérez vos documents et signatures électroniques</p>
          </div>
          <Button onClick={() => navigate('/sign')} className="gap-2">
            <Plus className="h-4 w-4" />
            Nouvelle signature
          </Button>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Documents signés', value: docs.length, icon: FileText },
            { label: 'Ce mois-ci', value: docs.filter(d => d.signedAt.startsWith(new Date().toISOString().substring(0, 7))).length, icon: Calendar },
            { label: 'Total pages', value: docs.reduce((a, d) => a + d.pageCount, 0), icon: PenTool },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-card rounded-xl p-5 border shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Document History */}
        <div>
          <div className="flex items-center justify-between mb-4 gap-3">
            <h2 className="text-lg font-semibold">Historique des signatures</h2>
            {docs.length > 0 && (
              <Button variant="outline" size="sm" className="gap-2 text-destructive" onClick={() => setPurgeOpen(true)}>
                <Trash2 className="h-4 w-4" />
                Tout supprimer
              </Button>
            )}
          </div>
          {docs.length === 0 ? (
            <div className="bg-card rounded-xl border p-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">Aucun document signé</p>
              <Button variant="outline" className="mt-4 gap-2" onClick={() => navigate('/sign')}>
                <PenTool className="h-4 w-4" />
                Signer votre premier document
              </Button>
            </div>
          ) : (
            <div className="grid gap-3">
              {docs.map((doc, i) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card rounded-xl border p-4 flex items-center justify-between hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-accent/60 flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{doc.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(doc.signedAt).toLocaleDateString('fr-FR')} · {doc.pageCount} pages · Position: {doc.signaturePosition}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" title="Voir le journal de signature" onClick={() => setReceiptDoc(doc)}>
                      <FileSignature className="h-4 w-4" />
                    </Button>
                    <EmailShareMenu fileName={doc.fileName} signerName={doc.signedByName} signedAt={doc.signedAt} variant="ghost" size="icon" iconOnly />
                    <Button variant="ghost" size="icon" title="Télécharger" onClick={() => handleDownload(doc)} disabled={!doc.storagePath}>
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Supprimer" className="text-destructive" onClick={() => setToDelete(doc)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Dialog open={!!receiptDoc} onOpenChange={(o) => !o && setReceiptDoc(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto p-4 sm:p-6">
          {receiptDoc && <SignatureReceipt data={receiptFromDoc(receiptDoc)} onClose={() => setReceiptDoc(null)} />}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce document ?</AlertDialogTitle>
            <AlertDialogDescription>
              « {toDelete?.fileName} » et son fichier signé seront définitivement supprimés du cloud.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={busy}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={purgeOpen} onOpenChange={setPurgeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer tous les documents ?</AlertDialogTitle>
            <AlertDialogDescription>
              Les {docs.length} documents signés et leurs fichiers seront définitivement supprimés. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPurge} disabled={busy}>Tout supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
