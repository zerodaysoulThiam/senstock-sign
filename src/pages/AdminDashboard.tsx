import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, getUsers, extractName, addUser, toggleUserActive, type User } from '@/lib/auth';
import { getDocuments, getStats, type SignedDocument } from '@/lib/documents';
import AppHeader from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Users, BarChart3, UserPlus, Shield, UserX, UserCheck } from 'lucide-react';
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
          <p className="text-muted-foreground text-sm">Supervision de la plateforme SENSTOCK</p>
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            {docs.length === 0 ? (
              <div className="bg-card rounded-xl border p-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">Aucun document signé</p>
              </div>
            ) : (
              <div className="bg-card rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Document</th>
                      <th className="text-left p-3 font-medium hidden sm:table-cell">Signé par</th>
                      <th className="text-left p-3 font-medium hidden md:table-cell">Position</th>
                      <th className="text-left p-3 font-medium">Date</th>
                      <th className="text-left p-3 font-medium hidden md:table-cell">Pages</th>
                    </tr>
                  </thead>
                  <tbody>
                    {docs.map(doc => (
                      <tr key={doc.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="p-3 font-medium">{doc.fileName}</td>
                        <td className="p-3 hidden sm:table-cell text-muted-foreground">{doc.signedByName}</td>
                        <td className="p-3 hidden md:table-cell text-muted-foreground capitalize">{doc.signaturePosition}</td>
                        <td className="p-3 text-muted-foreground">{new Date(doc.signedAt).toLocaleDateString('fr-FR')}</td>
                        <td className="p-3 hidden md:table-cell text-muted-foreground">{doc.pageCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}

        {/* Users Tab */}
        {tab === 'users' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Add User Form */}
            <div className="bg-card rounded-xl border p-6">
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

            {/* Users List */}
            <div className="bg-card rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Utilisateur</th>
                    <th className="text-left p-3 font-medium hidden sm:table-cell">Rôle</th>
                    <th className="text-left p-3 font-medium">Statut</th>
                    <th className="text-right p-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.email} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3">
                        <p className="font-medium">{extractName(u.email)}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </td>
                      <td className="p-3 hidden sm:table-cell">
                        <span className={`text-xs px-2 py-1 rounded-full ${u.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                          {u.role === 'admin' ? 'Admin' : 'Utilisateur'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${u.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {u.active ? 'Actif' : 'Désactivé'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {u.role !== 'admin' && (
                          <Button variant="ghost" size="sm" onClick={() => handleToggle(u.email)} className="gap-1 text-xs">
                            {u.active ? <UserX className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />}
                            {u.active ? 'Désactiver' : 'Activer'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Stats Tab */}
        {tab === 'stats' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-card rounded-xl border p-5">
                <p className="text-3xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Documents signés</p>
              </div>
              <div className="bg-card rounded-xl border p-5">
                <p className="text-3xl font-bold">{stats.byUser.length}</p>
                <p className="text-sm text-muted-foreground">Signataires actifs</p>
              </div>
              <div className="bg-card rounded-xl border p-5">
                <p className="text-3xl font-bold truncate">{stats.topSigner}</p>
                <p className="text-sm text-muted-foreground">Top signataire</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Bar Chart - Signatures by user */}
              <div className="bg-card rounded-xl border p-6">
                <h3 className="text-sm font-semibold mb-4">Signatures par utilisateur</h3>
                {stats.byUser.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={stats.byUser}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(201,20%,90%)" />
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

              {/* Pie Chart - Distribution */}
              <div className="bg-card rounded-xl border p-6">
                <h3 className="text-sm font-semibold mb-4">Répartition des signatures</h3>
                {stats.byUser.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={stats.byUser} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
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

            {/* Monthly Activity */}
            {stats.byMonth.length > 0 && (
              <div className="bg-card rounded-xl border p-6">
                <h3 className="text-sm font-semibold mb-4">Activité mensuelle</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={stats.byMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(201,20%,90%)" />
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
    </div>
  );
}
