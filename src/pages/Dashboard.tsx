import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, extractName } from '@/lib/auth';
import { getDocuments, getStats, type SignedDocument } from '@/lib/documents';
import AppHeader from '@/components/AppHeader';
import DashboardStats from '@/components/DashboardStats';
import DocumentHistoryTable from '@/components/DocumentHistoryTable';
import { Button } from '@/components/ui/button';
import { Plus, Bell, FileText, BarChart3, History } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

type Tab = 'overview' | 'history';

export default function Dashboard() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [docs, setDocs] = useState<SignedDocument[]>([]);
  const [stats, setStats] = useState(getStats());
  const [tab, setTab] = useState<Tab>('overview');
  const [notifications] = useState([
    { id: '1', text: 'Bienvenue sur SENSTOCK !', time: 'Maintenant' },
  ]);
  const [showNotifs, setShowNotifs] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    setDocs(getDocuments(user.email));
    setStats(getStats());
  }, []);

  if (!user) return null;

  const name = extractName(user.email);

  const handleDownload = (doc: SignedDocument) => {
    if (doc.signedPdfUrl) {
      const a = document.createElement('a');
      a.href = doc.signedPdfUrl;
      a.download = `signé_${doc.fileName}`;
      a.click();
    } else {
      toast.info('Le fichier signé n\'est plus disponible dans cette session');
    }
  };

  const handlePreview = (doc: SignedDocument) => {
    if (doc.signedPdfUrl) {
      window.open(doc.signedPdfUrl, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <AppHeader />
      <main className="container py-8 space-y-6">
        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl font-bold">
              Bonjour, <span className="text-gradient">{name}</span> 👋
            </h1>
            <p className="text-muted-foreground text-sm">Votre espace de signature électronique SENSTOCK</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <div className="relative">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowNotifs(!showNotifs)}
                className="relative"
              >
                <Bell className="h-4 w-4" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </Button>
              <AnimatePresence>
                {showNotifs && (
                  <motion.div
                    initial={{ opacity: 0, y: 5, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 5, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-72 glass rounded-xl p-3 z-50 shadow-2xl"
                  >
                    <p className="text-xs font-semibold mb-2">Notifications</p>
                    {notifications.map(n => (
                      <div key={n.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
                        <div>
                          <p className="text-xs">{n.text}</p>
                          <p className="text-[10px] text-muted-foreground">{n.time}</p>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <Button onClick={() => navigate('/sign')} className="gap-2 shadow-lg">
              <Plus className="h-4 w-4" />
              Nouvelle signature
            </Button>
          </div>
        </motion.div>

        {/* Tab Switcher */}
        <div className="flex gap-1 bg-muted/50 p-1 rounded-xl w-fit">
          {[
            { key: 'overview' as Tab, label: 'Vue d\'ensemble', icon: BarChart3 },
            { key: 'history' as Tab, label: 'Historique', icon: History },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.key
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {tab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <DashboardStats stats={stats} />
            </motion.div>
          )}
          {tab === 'history' && (
            <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Liste des signatures
              </h2>
              <DocumentHistoryTable
                documents={docs}
                onDownload={handleDownload}
                onPreview={handlePreview}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
