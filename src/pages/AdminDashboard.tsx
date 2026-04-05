import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, getUsers, extractName, addUser, toggleUserActive, type User } from '@/lib/auth';
import { getDocuments, getStats, type SignedDocument } from '@/lib/documents';
import { methodLabel } from '@/lib/audit';
import AppHeader from '@/components/AppHeader';
import SignatureProof from '@/components/SignatureProof';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  FileText, Users, BarChart3, UserPlus, Shield, UserX, UserCheck,
  Eye, ShieldCheck, Hash, Download
} from 'lucide-react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { toast } from 'sonner';

type Tab = 'documents' | 'users' | 'stats';

const CHART_COLORS = [
  'hsl(220, 80%, 50%)',
  'hsl(220, 60%, 70%)',
  'hsl(142, 60%, 45%)',
  'hsl(38, 80%, 50%)',
  'hsl(280, 60%, 50%)',
  'hsl(340, 60%, 55%)',
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
      toast.info('Fichier non disponible');
    }
  };

  const tabs = [
    { key: 'documents' as Tab, label: 'Documents', icon: FileText, count: docs.length },
    { key: 'users' as Tab, label: 'Utilisateurs', icon: Users, count: users.length },
    { key: 'stats' as Tab, label: 'Statistiques', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-6 space-y-5 max-w-6xl">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2 text-foreground">
            <Shield className="h-5 w-5 text-primary" />
            Administration
          </h1>
          <p className="text-sm text-muted-foreground">Supervision de la plateforme SENSTOCK</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Documents', value: docs.length, icon: FileText, iconBg: 'bg-primary/10 text-primary' },
            { label: 'Utilisateurs', value: users.length, icon: Users, iconBg: 'bg-violet-500/10 text-violet-600 dark:text-violet-400' },
            { label: 'En attente', value: docs.filter(d => d.status === 'pending').length, icon: ShieldCheck, iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
            { label: 'Top signataire', value: stats.topSigner, icon: Hash, iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', isText: true },
          ].map((card, i) => (
            <div key={card.label} className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`h-7 w-7 rounded-md flex items-center justify-center ${card.iconBg}`}>
                  <card.icon className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs text-muted-foreground font-medium">{card.label}</span>
              </div>
              <p className={`font-bold ${card.isText ? 'text-sm truncate' : 'text-2xl'} text-foreground`}>{card.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 border-b border-border">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === t.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
              {t.count !== undefined && (
                <span className="bg-muted text-muted-foreground text-xs px-1.5 py-0.5 rounded">{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Documents Tab */}
        {tab === 'documents' && (
          <div className="space-y-3">
            {docs.length === 0 ? (
              <div className="bg-card border border-border rounded-lg p-10 text-center">
                <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Aucun document signé</p>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left p-3 font-medium text-xs text-muted-foreground">ID</th>
                        <th className="text-left p-3 font-medium text-xs text-muted-foreground">Document</th>
                        <th className="text-left p-3 font-medium text-xs text-muted-foreground hidden sm:table-cell">Signataire</th>
                        <th className="text-left p-3 font-medium text-xs text-muted-foreground hidden md:table-cell">Méthode</th>
                        <th className="text-left p-3 font-medium text-xs text-muted-foreground hidden md:table-cell">Empreinte</th>
                        <th className="text-left p-3 font-medium text-xs text-muted-foreground">Date</th>
                        <th className="text-right p-3 font-medium text-xs text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {docs.map(doc => (
                        <tr key={doc.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="p-3">
                            <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                              {doc.audit?.signatureId || '—'}
                            </span>
                          </td>
                          <td className="p-3">
                            <p className="font-medium text-sm">{doc.label || doc.fileName}</p>
                            <p className="text-xs text-muted-foreground">{doc.fileName}</p>
                          </td>
                          <td className="p-3 hidden sm:table-cell">
                            <p className="text-sm">{doc.signedByName}</p>
                            <p className="text-xs text-muted-foreground">{doc.signedBy}</p>
                          </td>
                          <td className="p-3 hidden md:table-cell">
                            <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
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
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-0.5">
                              {doc.audit && (
                                <Button variant="ghost" size="icon" className="h-7 w-7" title="Audit" onClick={() => setSelectedDoc(doc)}>
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              {doc.signedPdfUrl && (
                                <Button variant="ghost" size="icon" className="h-7 w-7" title="Télécharger" onClick={() => handleDownload(doc)}>
                                  <Download className="h-3.5 w-3.5" />
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
          </div>
        )}

        {/* Users Tab */}
        {tab === 'users' && (
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-primary" />
                Ajouter un utilisateur
              </h3>
              <form onSubmit={handleAddUser} className="flex flex-col sm:flex-row gap-2">
                <Input placeholder="prenom.nom@senstock.sn" value={newEmail} onChange={e => setNewEmail(e.target.value)} type="email" required className="h-9" />
                <Input placeholder="Mot de passe" value={newPassword} onChange={e => setNewPassword(e.target.value)} type="password" required className="h-9" />
                <Button type="submit" className="gap-1.5 h-9 text-sm">
                  <UserPlus className="h-3.5 w-3.5" />
                  Ajouter
                </Button>
              </form>
            </div>

            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left p-3 font-medium text-xs text-muted-foreground">Utilisateur</th>
                    <th className="text-left p-3 font-medium text-xs text-muted-foreground hidden sm:table-cell">Rôle</th>
                    <th className="text-left p-3 font-medium text-xs text-muted-foreground">Statut</th>
                    <th className="text-left p-3 font-medium text-xs text-muted-foreground hidden md:table-cell">Documents</th>
                    <th className="text-right p-3 font-medium text-xs text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => {
                    const userDocs = docs.filter(d => d.signedBy === u.email).length;
                    return (
                      <tr key={u.email} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-semibold text-primary">
                              {extractName(u.email).split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{extractName(u.email)}</p>
                              <p className="text-xs text-muted-foreground">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 hidden sm:table-cell">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                            {u.role === 'admin' ? 'Admin' : 'Utilisateur'}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            u.active
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'bg-destructive/10 text-destructive'
                          }`}>
                            {u.active ? 'Actif' : 'Inactif'}
                          </span>
                        </td>
                        <td className="p-3 hidden md:table-cell text-muted-foreground">{userDocs}</td>
                        <td className="p-3 text-right">
                          {u.role !== 'admin' && (
                            <Button variant="ghost" size="sm" onClick={() => handleToggle(u.email)} className="gap-1 text-xs h-7">
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
          </div>
        )}

        {/* Stats Tab */}
        {tab === 'stats' && (
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-card border border-border rounded-lg p-5">
                <h3 className="text-sm font-semibold mb-3 text-foreground">Par utilisateur</h3>
                {stats.byUser.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={stats.byUser}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(220, 80%, 50%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-10">Aucune donnée</p>
                )}
              </div>

              <div className="bg-card border border-border rounded-lg p-5">
                <h3 className="text-sm font-semibold mb-3 text-foreground">Répartition</h3>
                {stats.byUser.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={stats.byUser} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={2}
                        label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}
                      >
                        {stats.byUser.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-10">Aucune donnée</p>
                )}
              </div>
            </div>

            {stats.byMonth.length > 0 && (
              <div className="bg-card border border-border rounded-lg p-5">
                <h3 className="text-sm font-semibold mb-3 text-foreground">Activité mensuelle</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={stats.byMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(220, 60%, 70%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Audit Dialog */}
      <Dialog open={!!selectedDoc} onOpenChange={() => setSelectedDoc(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Audit — {selectedDoc?.audit?.signatureId}
            </DialogTitle>
          </DialogHeader>
          {selectedDoc?.audit && <SignatureProof audit={selectedDoc.audit} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
