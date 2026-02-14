import { useState, useMemo } from 'react';
import { type SignedDocument } from '@/lib/documents';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Download, Search, ChevronLeft, ChevronRight, Eye, ArrowUpDown } from 'lucide-react';
import { motion } from 'framer-motion';

interface DocumentHistoryTableProps {
  documents: SignedDocument[];
  onDownload?: (doc: SignedDocument) => void;
  onPreview?: (doc: SignedDocument) => void;
  itemsPerPage?: number;
}

export default function DocumentHistoryTable({
  documents,
  onDownload,
  onPreview,
  itemsPerPage = 10,
}: DocumentHistoryTableProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'signatory'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const filtered = useMemo(() => {
    let result = documents.filter(d =>
      d.fileName.toLowerCase().includes(search.toLowerCase()) ||
      d.signedByName.toLowerCase().includes(search.toLowerCase()) ||
      (d.label || '').toLowerCase().includes(search.toLowerCase())
    );

    result.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'date') cmp = a.signedAt.localeCompare(b.signedAt);
      else if (sortBy === 'name') cmp = a.fileName.localeCompare(b.fileName);
      else cmp = a.signedByName.localeCompare(b.signedByName);
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [documents, search, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'signed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'signed': return 'Signé';
      case 'pending': return 'En attente';
      case 'rejected': return 'Rejeté';
      default: return status;
    }
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un document..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left p-3 font-semibold">
                  <button onClick={() => toggleSort('date')} className="flex items-center gap-1 hover:text-primary transition-colors">
                    Date <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="text-left p-3 font-semibold hidden sm:table-cell">Heure</th>
                <th className="text-left p-3 font-semibold">
                  <button onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-primary transition-colors">
                    Libellé <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="text-left p-3 font-semibold hidden md:table-cell">Document</th>
                <th className="text-left p-3 font-semibold">
                  <button onClick={() => toggleSort('signatory')} className="flex items-center gap-1 hover:text-primary transition-colors">
                    Signataire <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="text-left p-3 font-semibold hidden sm:table-cell">Statut</th>
                <th className="text-right p-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-muted-foreground">
                    Aucun document trouvé
                  </td>
                </tr>
              ) : (
                paginated.map((doc, i) => {
                  const date = new Date(doc.signedAt);
                  return (
                    <motion.tr
                      key={doc.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b last:border-0 hover:bg-accent/20 transition-colors"
                    >
                      <td className="p-3 font-medium">{date.toLocaleDateString('fr-FR')}</td>
                      <td className="p-3 hidden sm:table-cell text-muted-foreground">
                        {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-3">
                        <span className="font-medium">{doc.label || doc.fileName}</span>
                      </td>
                      <td className="p-3 hidden md:table-cell text-muted-foreground truncate max-w-[200px]">
                        {doc.fileName}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-accent flex items-center justify-center text-xs font-semibold text-accent-foreground shrink-0">
                            {doc.signedByName.split(' ').map(n => n[0]).join('')}
                          </div>
                          <span className="text-sm">{doc.signedByName}</span>
                        </div>
                      </td>
                      <td className="p-3 hidden sm:table-cell">
                        <span className={`text-xs px-2.5 py-1 rounded-full border ${statusColor(doc.status)}`}>
                          {statusLabel(doc.status)}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {onPreview && doc.signedPdfUrl && (
                            <Button variant="ghost" size="icon" onClick={() => onPreview(doc)} title="Aperçu" className="h-8 w-8">
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          {onDownload && doc.signedPdfUrl && (
                            <Button variant="ghost" size="icon" onClick={() => onDownload(doc)} title="Télécharger" className="h-8 w-8">
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {filtered.length} document{filtered.length > 1 ? 's' : ''} · Page {page}/{totalPages}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" /> Précédent
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = page <= 3 ? i + 1 : page + i - 2;
              if (p < 1 || p > totalPages) return null;
              return (
                <Button
                  key={p}
                  variant={p === page ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPage(p)}
                  className="w-8 h-8 p-0"
                >
                  {p}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="gap-1"
            >
              Suivant <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
