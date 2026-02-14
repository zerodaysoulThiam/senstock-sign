import { motion } from 'framer-motion';
import { FileText, Calendar, Clock, TrendingUp, Users, Award } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface DashboardStatsProps {
  stats: {
    total: number;
    thisMonth: number;
    pending: number;
    byUser: { name: string; count: number }[];
    byMonth: { month: string; count: number }[];
    topSigner: string;
    recentSigners: any[];
  };
}

const COLORS = [
  'hsl(201, 70%, 42%)',
  'hsl(201, 62%, 70%)',
  'hsl(210, 60%, 28%)',
  'hsl(170, 50%, 45%)',
  'hsl(340, 60%, 55%)',
  'hsl(45, 80%, 55%)',
];

export default function DashboardStats({ stats }: DashboardStatsProps) {
  const cards = [
    { label: 'Total signés', value: stats.total, icon: FileText, color: 'from-primary to-brand-dark' },
    { label: 'Ce mois-ci', value: stats.thisMonth, icon: Calendar, color: 'from-emerald-500 to-emerald-600' },
    { label: 'En attente', value: stats.pending, icon: Clock, color: 'from-amber-500 to-amber-600' },
    { label: 'Top signataire', value: stats.topSigner, icon: Award, color: 'from-purple-500 to-purple-600', isText: true },
  ];

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass rounded-2xl p-5 group hover:shadow-xl transition-all duration-300"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{card.label}</p>
                <p className={`mt-2 font-bold ${card.isText ? 'text-lg truncate' : 'text-3xl'}`}>
                  {card.value}
                </p>
              </div>
              <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                <card.icon className="h-5 w-5 text-primary-foreground" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Area Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass rounded-2xl p-6"
        >
          <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Activité mensuelle
          </h3>
          <p className="text-xs text-muted-foreground mb-4">Évolution des signatures</p>
          {stats.byMonth.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={stats.byMonth}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(201, 70%, 42%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(201, 70%, 42%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(201,20%,90%)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="hsl(201,70%,42%)" fillOpacity={1} fill="url(#colorCount)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">Aucune donnée</div>
          )}
        </motion.div>

        {/* Pie Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass rounded-2xl p-6"
        >
          <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Répartition par signataire
          </h3>
          <p className="text-xs text-muted-foreground mb-4">Contribution de chaque utilisateur</p>
          {stats.byUser.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={stats.byUser}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={40}
                  paddingAngle={3}
                  label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}
                >
                  {stats.byUser.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">Aucune donnée</div>
          )}
        </motion.div>
      </div>

      {/* Recent Signatories */}
      {stats.recentSigners.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass rounded-2xl p-6"
        >
          <h3 className="text-sm font-semibold mb-4">10 derniers signataires</h3>
          <div className="flex flex-wrap gap-3">
            {stats.recentSigners.map((doc, i) => (
              <div key={doc.id || i} className="flex items-center gap-2 bg-muted/50 rounded-full px-3 py-1.5">
                <div className="h-6 w-6 rounded-full bg-accent flex items-center justify-center text-[10px] font-bold text-accent-foreground">
                  {doc.signedByName?.split(' ').map((n: string) => n[0]).join('')}
                </div>
                <span className="text-xs font-medium">{doc.signedByName}</span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(doc.signedAt).toLocaleDateString('fr-FR')}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
