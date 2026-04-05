import { useState, useMemo } from 'react';
import { type SignedDocument } from '@/lib/documents';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, Search, ChevronLeft, ChevronRight, Eye, ArrowUpDown, Mail } from 'lucide-react';

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

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      signed: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      pending: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      rejected: 'bg-destructive/10 text-destructive',
    };
    const labels: Record<string, string> = {
      signed: 'Signé',
      pending: 'En attente',
      rejected: 'Rejeté',
    };
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[status] || 'bg-muted text-muted-foreground'}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="pl-9 h-9"
        />
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left p-3 font-medium text-xs text-muted-foreground">
                  <button onClick={() => toggleSort('date')} className="flex items-center gap-1 hover:text-foreground">
                    Date <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="text-left p-3 font-medium text-xs text-muted-foreground hidden sm:table-cell">Heure</th>
                <th className="text-left p-3 font-medium text-xs text-muted-foreground">
                  <button onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-foreground">
                    Document <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="text-left p-3 font-medium text-xs text-muted-foreground">
                  <button onClick={() => toggleSort('signatory')} className="flex items-center gap-1 hover:text-foreground">
                    Signataire <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="text-left p-3 font-medium text-xs text-muted-foreground hidden sm:table-cell">Statut</th>
                <th className="text-right p-3 font-medium text-xs text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-muted-foreground text-sm">
                    Aucun document trouvé
                  </td>
                </tr>
              ) : (
                paginated.map(doc => {
                  const date = new Date(doc.signedAt);
                  return (
                    <tr key={doc.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="p-3 text-sm">{date.toLocaleDateString('fr-FR')}</td>
                      <td className="p-3 hidden sm:table-cell text-muted-foreground text-sm">
                        {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-3">
                        <span className="font-medium text-sm">{doc.label || doc.fileName}</span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-semibold text-primary shrink-0">
                            {doc.signedByName.split(' ').map(n => n[0]).join('')}
                          </div>
                          <span className="text-sm">{doc.signedByName}</span>
                        </div>
                      </td>
                      <td className="p-3 hidden sm:table-cell">
                        {statusBadge(doc.status)}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          {onPreview && doc.signedPdfUrl && (
                            <Button variant="ghost" size="icon" onClick={() => onPreview(doc)} title="Aperçu" className="h-7 w-7">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {onDownload && doc.signedPdfUrl && (
                            <Button variant="ghost" size="icon" onClick={() => onDownload(doc)} title="Télécharger" className="h-7 w-7">
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {doc.signedPdfUrl && (
                            <a
                              href={`mailto:?subject=${encodeURIComponent(`Document signé : ${doc.label || doc.fileName}`)}&body=${encodeURIComponent(`Document signé "${doc.label || doc.fileName}".`)}`}
                              title="Envoyer par email"
                            >
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <Mail className="h-3.5 w-3.5" />
                              </Button>
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {filtered.length} document{filtered.length > 1 ? 's' : ''} · Page {page}/{totalPages}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="h-7 text-xs gap-1">
              <ChevronLeft className="h-3 w-3" /> Préc.
            </Button>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="h-7 text-xs gap-1">
              Suiv. <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
