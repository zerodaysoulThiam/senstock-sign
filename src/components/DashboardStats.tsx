import { motion } from 'framer-motion';
import { TrendingUp, Users } from 'lucide-react';
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
  'hsl(220, 80%, 50%)',
  'hsl(220, 60%, 70%)',
  'hsl(142, 60%, 45%)',
  'hsl(38, 80%, 50%)',
  'hsl(280, 60%, 50%)',
  'hsl(340, 60%, 55%)',
];

export default function DashboardStats({ stats }: DashboardStatsProps) {
  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        {/* Area Chart */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-lg p-5"
        >
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Activité mensuelle</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Évolution des signatures</p>
          {stats.byMonth.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={stats.byMonth}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(220, 80%, 50%)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="hsl(220, 80%, 50%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="hsl(220, 80%, 50%)" fillOpacity={1} fill="url(#colorCount)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">Aucune donnée disponible</div>
          )}
        </motion.div>

        {/* Pie Chart */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-card border border-border rounded-lg p-5"
        >
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Par signataire</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Répartition des signatures</p>
          {stats.byUser.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={stats.byUser}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  innerRadius={40}
                  paddingAngle={2}
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
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">Aucune donnée disponible</div>
          )}
        </motion.div>
      </div>

      {/* Recent Signatories */}
      {stats.recentSigners.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-lg p-5"
        >
          <h3 className="text-sm font-semibold text-foreground mb-3">Dernières signatures</h3>
          <div className="flex flex-wrap gap-2">
            {stats.recentSigners.map((doc, i) => (
              <div key={doc.id || i} className="flex items-center gap-2 bg-muted rounded-full px-3 py-1.5">
                <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary">
                  {doc.signedByName?.split(' ').map((n: string) => n[0]).join('')}
                </div>
                <span className="text-xs font-medium text-foreground">{doc.signedByName}</span>
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
