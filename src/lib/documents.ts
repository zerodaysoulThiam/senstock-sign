import { supabase } from "@/integrations/supabase/client";
import { getCurrentUser, extractName } from "./auth";

export interface SignedDocument {
  id: string;
  fileName: string;
  signedBy: string;
  signedByName: string;
  signedAt: string;
  signaturePosition: string;
  pageCount: number;
  storagePath?: string | null;
}

async function fetchOwnersMap(ownerIds: string[]): Promise<Record<string, string>> {
  if (ownerIds.length === 0) return {};
  const unique = Array.from(new Set(ownerIds));
  const { data } = await supabase.from("profiles").select("id, email").in("id", unique);
  const map: Record<string, string> = {};
  (data ?? []).forEach((p: any) => { map[p.id] = p.email; });
  return map;
}

function rowToDoc(row: any, emailByOwner: Record<string, string>): SignedDocument {
  const email = emailByOwner[row.owner_id] ?? "";
  return {
    id: row.id,
    fileName: row.name,
    signedBy: email,
    signedByName: extractName(email),
    signedAt: row.signed_at ?? row.created_at,
    signaturePosition: row.placement?.position ?? "-",
    pageCount: row.placement?.pageCount ?? 0,
    storagePath: row.storage_path ?? null,
  };
}

export async function getDocuments(email?: string): Promise<SignedDocument[]> {
  let query = supabase
    .from("documents")
    .select("id, owner_id, name, status, placement, signed_at, created_at, audit_trail, storage_path")
    .order("created_at", { ascending: false });
  if (email) {
    const { data: prof } = await supabase.from("profiles").select("id").eq("email", email.toLowerCase()).maybeSingle();
    if (!prof) return [];
    query = query.eq("owner_id", prof.id);
  }
  const { data, error } = await query;
  if (error || !data) return [];
  const owners = await fetchOwnersMap(data.map((d: any) => d.owner_id));
  return data.map((d: any) => rowToDoc(d, owners));
}

export async function saveDocument(doc: Omit<SignedDocument, "id">, pdfBlob?: Blob) {
  const user = getCurrentUser();
  if (!user) throw new Error("Non authentifié");
  let storagePath: string | null = null;
  if (pdfBlob) {
    const safeName = doc.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    storagePath = `${user.id}/${Date.now()}_${safeName}`;
    const { error: upErr } = await supabase.storage
      .from("signed-documents")
      .upload(storagePath, pdfBlob, { contentType: "application/pdf", upsert: false });
    if (upErr) {
      console.error("upload failed", upErr);
      storagePath = null;
    }
  }
  const { data, error } = await supabase
    .from("documents")
    .insert({
      owner_id: user.id,
      name: doc.fileName,
      status: "signed",
      placement: { position: doc.signaturePosition, pageCount: doc.pageCount },
      signed_at: doc.signedAt,
      audit_trail: [{ event: "signed", at: doc.signedAt, by: doc.signedBy }],
      storage_path: storagePath,
    })
    .select()
    .single();
  if (error) throw error;
  return { ...doc, id: data.id, storagePath } as SignedDocument;
}

export async function downloadSignedDocument(doc: SignedDocument): Promise<void> {
  if (!doc.storagePath) throw new Error("Aucun fichier disponible pour ce document");
  const { data, error } = await supabase.storage
    .from("signed-documents")
    .createSignedUrl(doc.storagePath, 60);
  if (error || !data?.signedUrl) throw error ?? new Error("URL indisponible");
  const res = await fetch(data.signedUrl);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `signé_${doc.fileName}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function getStats() {
  const docs = await getDocuments();
  const byUser: Record<string, number> = {};
  const byMonth: Record<string, number> = {};
  docs.forEach((d) => {
    byUser[d.signedByName] = (byUser[d.signedByName] || 0) + 1;
    const month = d.signedAt.substring(0, 7);
    byMonth[month] = (byMonth[month] || 0) + 1;
  });
  return {
    total: docs.length,
    byUser: Object.entries(byUser).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    byMonth: Object.entries(byMonth).map(([month, count]) => ({ month, count })).sort((a, b) => a.month.localeCompare(b.month)),
    topSigner: Object.entries(byUser).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A",
  };
}
