export interface SignedDocument {
  id: string;
  fileName: string;
  label: string;
  signedBy: string;
  signedByName: string;
  signedAt: string;
  signaturePosition: string;
  pageCount: number;
  status: 'signed' | 'pending' | 'rejected';
  signedPdfUrl?: string;
}

const DOCS_KEY = 'senstock_documents';

export function getDocuments(email?: string): SignedDocument[] {
  const docs: SignedDocument[] = JSON.parse(localStorage.getItem(DOCS_KEY) || '[]');
  if (email) return docs.filter(d => d.signedBy === email);
  return docs;
}

export function saveDocument(doc: Omit<SignedDocument, 'id'>): SignedDocument {
  const docs = getDocuments();
  const newDoc: SignedDocument = { ...doc, id: crypto.randomUUID() };
  docs.unshift(newDoc);
  localStorage.setItem(DOCS_KEY, JSON.stringify(docs));
  return newDoc;
}

export function updateDocumentPdfUrl(id: string, url: string) {
  const docs = getDocuments();
  const doc = docs.find(d => d.id === id);
  if (doc) {
    doc.signedPdfUrl = url;
    localStorage.setItem(DOCS_KEY, JSON.stringify(docs));
  }
}

export function getStats() {
  const docs = getDocuments();
  const byUser: Record<string, number> = {};
  const byMonth: Record<string, number> = {};
  const byDay: Record<string, number> = {};

  docs.forEach(d => {
    byUser[d.signedByName] = (byUser[d.signedByName] || 0) + 1;
    const month = d.signedAt.substring(0, 7);
    byMonth[month] = (byMonth[month] || 0) + 1;
    const day = d.signedAt.substring(0, 10);
    byDay[day] = (byDay[day] || 0) + 1;
  });

  const now = new Date();
  const thisMonth = now.toISOString().substring(0, 7);
  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(now.getDate() - now.getDay());

  return {
    total: docs.length,
    thisMonth: docs.filter(d => d.signedAt.startsWith(thisMonth)).length,
    pending: docs.filter(d => d.status === 'pending').length,
    byUser: Object.entries(byUser).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    byMonth: Object.entries(byMonth).map(([month, count]) => ({ month, count })).sort((a, b) => a.month.localeCompare(b.month)),
    topSigner: Object.entries(byUser).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A',
    recentSigners: docs.slice(0, 10),
  };
}
