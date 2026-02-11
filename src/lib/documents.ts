export interface SignedDocument {
  id: string;
  fileName: string;
  signedBy: string;
  signedByName: string;
  signedAt: string;
  signaturePosition: string;
  pageCount: number;
}

const DOCS_KEY = 'senstock_documents';

export function getDocuments(email?: string): SignedDocument[] {
  const docs: SignedDocument[] = JSON.parse(localStorage.getItem(DOCS_KEY) || '[]');
  if (email) return docs.filter(d => d.signedBy === email);
  return docs;
}

export function saveDocument(doc: Omit<SignedDocument, 'id'>) {
  const docs = getDocuments();
  const newDoc: SignedDocument = { ...doc, id: crypto.randomUUID() };
  docs.unshift(newDoc);
  localStorage.setItem(DOCS_KEY, JSON.stringify(docs));
  return newDoc;
}

export function getStats() {
  const docs = getDocuments();
  const byUser: Record<string, number> = {};
  const byMonth: Record<string, number> = {};

  docs.forEach(d => {
    byUser[d.signedByName] = (byUser[d.signedByName] || 0) + 1;
    const month = d.signedAt.substring(0, 7);
    byMonth[month] = (byMonth[month] || 0) + 1;
  });

  return {
    total: docs.length,
    byUser: Object.entries(byUser).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    byMonth: Object.entries(byMonth).map(([month, count]) => ({ month, count })).sort((a, b) => a.month.localeCompare(b.month)),
    topSigner: Object.entries(byUser).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A',
  };
}
