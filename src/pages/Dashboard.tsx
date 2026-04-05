import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, extractName } from '@/lib/auth';
import { getDocuments, getStats, type SignedDocument } from '@/lib/documents';
import AppHeader from '@/components/AppHeader';
import DashboardStats from '@/components/DashboardStats';
import DocumentHistoryTable from '@/components/DocumentHistoryTable';
import { Button } from '@/components/ui/button';
import { Plus, FileText, BarChart3, History, Clock, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

type Tab = 'overview' | 'history';

export default function Dashboard() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [docs, setDocs] = useState<SignedDocument[]>([]);
  const [stats, setStats] = useState(getStats());
  const [tab, setTab] = useState<Tab>('overview');

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
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-6 space-y-6 max-w-6xl">
        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Bonjour, {name}
            </h1>
            <p className="text-sm text-muted-foreground">Votre espace de signature électronique</p>
          </div>
          <Button onClick={() => navigate('/sign')} className="gap-2 h-9 text-sm">
            <Plus className="h-4 w-4" />
            Nouvelle signature
          </Button>
        </motion.div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total signés', value: stats.total, icon: FileText, iconBg: 'bg-primary/10 text-primary' },
            { label: 'Ce mois-ci', value: stats.thisMonth, icon: BarChart3, iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
            { label: 'En attente', value: stats.pending, icon: Clock, iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
            { label: 'Top signataire', value: stats.topSigner, icon: CheckCircle, iconBg: 'bg-violet-500/10 text-violet-600 dark:text-violet-400', isText: true },
          ].map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card border border-border rounded-lg p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`h-7 w-7 rounded-md flex items-center justify-center ${card.iconBg}`}>
                  <card.icon className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs text-muted-foreground font-medium">{card.label}</span>
              </div>
              <p className={`font-bold ${card.isText ? 'text-sm truncate' : 'text-2xl'} text-foreground`}>
                {card.value}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-0.5 border-b border-border">
          {[
            { key: 'overview' as Tab, label: 'Vue d\'ensemble', icon: BarChart3 },
            { key: 'history' as Tab, label: 'Historique', icon: History },
          ].map(t => (
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
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <DashboardStats stats={stats} />
          </motion.div>
        )}
        {tab === 'history' && (
          <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <DocumentHistoryTable
              documents={docs}
              onDownload={handleDownload}
              onPreview={handlePreview}
            />
          </motion.div>
        )}
      </main>
    </div>
  );
}
