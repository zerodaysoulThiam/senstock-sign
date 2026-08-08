import { supabase } from "@/integrations/supabase/client";

/** Empreinte SHA-256 (hex) calculée localement dans le navigateur. */
export async function sha256Hex(data: ArrayBuffer | Uint8Array | Blob): Promise<string> {
  let buffer: ArrayBuffer;
  if (data instanceof Blob) buffer = await data.arrayBuffer();
  else if (data instanceof Uint8Array) buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
  else buffer = data;
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function formatHash(hash: string): string {
  return (hash.match(/.{1,8}/g) ?? []).join(" ");
}

export interface VerificationRecord {
  signatureId: string;
  signerName: string;
  fileName: string;
  signedAt: string;
  authMethod: string | null;
  cryptoSigned: boolean;
  certSubject: string | null;
  pagesSigned: string | null;
  expectedSha256: string;
}

export interface VerificationResult {
  status: "verified" | "mismatch" | "unknown";
  message: string;
  record?: VerificationRecord;
}

/** Vérification publique : seule l'empreinte quitte le navigateur, jamais le fichier. */
export async function verifyByHash(sha256: string, signatureId?: string): Promise<VerificationResult> {
  const { data, error } = await supabase.functions.invoke("verify-signature", {
    body: { sha256, signatureId: signatureId || undefined },
  });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as VerificationResult;
}
