import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, getUsers, extractName, addUser, toggleUserActive, type User } from '@/lib/auth';
import { getDocuments, getStats, type SignedDocument } from '@/lib/documents';
import { methodLabel } from '@/lib/audit';
import AppHeader from '@/components/AppHeader';
import DocumentHistoryTable from '@/components/DocumentHistoryTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import SignatureProof from '@/components/SignatureProof';
import {
  FileText, Users, BarChart3, UserPlus, Shield, UserX, UserCheck,
  Eye, ShieldCheck, Hash, Download
} from 'lucide-react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { toast } from 'sonner';

type Tab = 'documents' | 'users' | 'stats';

const CHART_COLORS = [
  'hsl(201, 70%, 42%)',
  'hsl(201, 62%, 86%)',
  'hsl(210, 60%, 28%)',
  'hsl(170, 50%, 45%)',
  'hsl(340, 60%, 55%)',
  'hsl(45, 80%, 55%)',
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [tab, setTab] = useState<Tab>('documents');
  const [docs, setDocs] = useState<SignedDocument[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState(getStats());
  const [selectedDoc, setSelectedDoc] = useState<SignedDocument | null>(null);

  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'admin') { navigate('/login'); return; }
    reload();
  }, []);

  const reload = () => {
    setDocs(getDocuments());
    setUsers(getUsers());
    setStats(getStats());
  };

  if (!user || user.role !== 'admin') return null;

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newPassword) return;
    const ok = addUser(newEmail, newPassword);
    if (ok) {
      toast.success('Utilisateur ajouté');
      setNewEmail('');
      setNewPassword('');
      reload();
    } else {
      toast.error('Cet email existe déjà');
    }
  };

  const handleToggle = (email: string) => {
    toggleUserActive(email);
    reload();
  };

  const handleDownload = (doc: SignedDocument) => {
    if (doc.signedPdfUrl) {
      const a = document.createElement('a');
      a.href = doc.signedPdfUrl;
      a.download = `signé_${doc.fileName}`;
      a.click();
    } else {
      toast.info('Le fichier signé n\'est plus disponible');
    }
  };

  const handlePreview = (doc: SignedDocument) => {
    if (doc.signedPdfUrl) window.open(doc.signedPdfUrl, '_blank');
  };

  const tabs = [
    { key: 'documents' as Tab, label: 'Documents', icon: FileText, count: docs.length },
    { key: 'users' as Tab, label: 'Utilisateurs', icon: Users, count: users.length },
    { key: 'stats' as Tab, label: 'Statistiques', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-secondary/30">
      <AppHeader />
      <main className="container py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Administration
          </h1>
          <p className="text-muted-foreground text-sm">Supervision complète de la plateforme SENSTOCK</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Documents', value: docs.length, icon: FileText },
            { label: 'Utilisateurs', value: users.length, icon: Users },
            { label: 'En attente', value: docs.filter(d => d.status === 'pending').length, icon: ShieldCheck },
            { label: 'Top signataire', value: stats.topSigner, icon: Hash, isText: true },
          ].map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <card.icon className="h-4 w-4 text-primary" />
              </div>
              <p className={`font-bold ${card.isText ? 'text-sm truncate' : 'text-2xl'}`}>{card.value}</p>
              <p className="text-xs text-muted-foreground">{card.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
              {t.count !== undefined && (
                <span className="bg-accent text-accent-foreground text-xs px-2 py-0.5 rounded-full">{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Documents Tab */}
        {tab === 'documents' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {docs.length === 0 ? (
              <div className="glass rounded-xl p-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">Aucun document signé</p>
              </div>
            ) : (
              <div className="glass rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left p-3 font-semibold">ID Signature</th>
                        <th className="text-left p-3 font-semibold">Document</th>
                        <th className="text-left p-3 font-semibold hidden sm:table-cell">Signataire</th>
                        <th className="text-left p-3 font-semibold hidden md:table-cell">Méthode</th>
                        <th className="text-left p-3 font-semibold hidden md:table-cell">IP</th>
                        <th className="text-left p-3 font-semibold">Date</th>
                        <th className="text-left p-3 font-semibold hidden lg:table-cell">Appareil</th>
                        <th className="text-right p-3 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {docs.map(doc => (
                        <tr key={doc.id} className="border-b last:border-0 hover:bg-accent/20 transition-colors">
                          <td className="p-3">
                            <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                              {doc.audit?.signatureId || '—'}
                            </span>
                          </td>
                          <td className="p-3">
                            <p className="font-medium text-sm">{doc.label || doc.fileName}</p>
                            <p className="text-xs text-muted-foreground">{doc.fileName}</p>
                          </td>
                          <td className="p-3 hidden sm:table-cell">
                            <p className="text-sm font-medium">{doc.signedByName}</p>
                            <p className="text-xs text-muted-foreground">{doc.signedBy}</p>
                          </td>
                          <td className="p-3 hidden md:table-cell">
                            <span className="text-xs bg-accent/50 px-2 py-1 rounded-full">
                              {doc.audit ? methodLabel(doc.audit.method) : '—'}
                            </span>
                          </td>
                          <td className="p-3 hidden md:table-cell font-mono text-xs text-muted-foreground">
                            {doc.audit?.ipAddress || '—'}
                          </td>
                          <td className="p-3">
                            <p className="text-sm">{new Date(doc.signedAt).toLocaleDateString('fr-FR')}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(doc.signedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </td>
                          <td className="p-3 hidden lg:table-cell text-xs text-muted-foreground max-w-[180px] truncate">
                            {doc.audit?.device || '—'}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {doc.audit && (
                                <Button variant="ghost" size="icon" className="h-8 w-8" title="Voir l'audit" onClick={() => setSelectedDoc(doc)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                              )}
                              {doc.signedPdfUrl && (
                                <Button variant="ghost" size="icon" className="h-8 w-8" title="Télécharger" onClick={() => handleDownload(doc)}>
                                  <Download className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Users Tab */}
        {tab === 'users' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="glass rounded-xl p-6">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Ajouter un utilisateur
              </h3>
              <form onSubmit={handleAddUser} className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <Label htmlFor="newemail" className="sr-only">Email</Label>
                  <Input id="newemail" type="email" placeholder="prenom.nom@senstock.sn" value={newEmail} onChange={e => setNewEmail(e.target.value)} required />
                </div>
                <div className="flex-1">
                  <Label htmlFor="newpwd" className="sr-only">Mot de passe</Label>
                  <Input id="newpwd" type="password" placeholder="Mot de passe" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Ajouter
                </Button>
              </form>
            </div>

            <div className="glass rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left p-3 font-semibold">Utilisateur</th>
                    <th className="text-left p-3 font-semibold hidden sm:table-cell">Rôle</th>
                    <th className="text-left p-3 font-semibold">Statut</th>
                    <th className="text-left p-3 font-semibold hidden md:table-cell">Documents signés</th>
                    <th className="text-right p-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => {
                    const userDocs = docs.filter(d => d.signedBy === u.email).length;
                    return (
                      <tr key={u.email} className="border-b last:border-0 hover:bg-accent/20 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-xs font-semibold text-accent-foreground">
                              {extractName(u.email).split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <p className="font-medium">{extractName(u.email)}</p>
                              <p className="text-xs text-muted-foreground">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 hidden sm:table-cell">
                          <span className={`text-xs px-2.5 py-1 rounded-full ${u.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                            {u.role === 'admin' ? 'Administrateur' : 'Utilisateur'}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`text-xs px-2.5 py-1 rounded-full border ${u.active ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30' : 'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30'}`}>
                            {u.active ? 'Actif' : 'Désactivé'}
                          </span>
                        </td>
                        <td className="p-3 hidden md:table-cell text-muted-foreground">{userDocs}</td>
                        <td className="p-3 text-right">
                          {u.role !== 'admin' && (
                            <Button variant="ghost" size="sm" onClick={() => handleToggle(u.email)} className="gap-1 text-xs">
                              {u.active ? <UserX className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />}
                              {u.active ? 'Désactiver' : 'Activer'}
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Stats Tab */}
        {tab === 'stats' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="glass rounded-xl p-6">
                <h3 className="text-sm font-semibold mb-4">Signatures par utilisateur</h3>
                {stats.byUser.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={stats.byUser}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(201,70%,42%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-12">Aucune donnée</p>
                )}
              </div>

              <div className="glass rounded-xl p-6">
                <h3 className="text-sm font-semibold mb-4">Répartition des signatures</h3>
                {stats.byUser.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={stats.byUser} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={40} paddingAngle={3} label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}>
                        {stats.byUser.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-12">Aucune donnée</p>
                )}
              </div>
            </div>

            {stats.byMonth.length > 0 && (
              <div className="glass rounded-xl p-6">
                <h3 className="text-sm font-semibold mb-4">Activité mensuelle</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={stats.byMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(201,62%,86%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </motion.div>
        )}
      </main>

      {/* Audit Detail Dialog */}
      <Dialog open={!!selectedDoc} onOpenChange={() => setSelectedDoc(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Détails de l'audit — {selectedDoc?.audit?.signatureId}
            </DialogTitle>
          </DialogHeader>
          {selectedDoc?.audit && <SignatureProof audit={selectedDoc.audit} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
