// deno-lint-ignore-file no-explicit-any
// Applique une signature cryptographique PAdES au PDF déjà cacheté,
// calcule son empreinte SHA-256 et enregistre le dossier de preuve.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { Buffer } from "node:buffer";
import { PDFDocument } from "npm:pdf-lib@1.17.1";
import { pdflibAddPlaceholder } from "npm:@signpdf/placeholder-pdf-lib@3.2.4";
import * as signpdfModule from "npm:@signpdf/signpdf@3.2.4";
import { P12Signer } from "npm:@signpdf/signer-p12@3.2.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const P12_B64 = Deno.env.get("PDF_SIGNING_P12_BASE64") ?? "";
const P12_PASSWORD = Deno.env.get("PDF_SIGNING_P12_PASSWORD") ?? "";
const BUCKET = "signed-documents";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  return (fwd.split(",")[0] || req.headers.get("cf-connecting-ip") || "unknown").trim();
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function signatureIdFrom(hash: string): string {
  return "SIGN-" + hash.slice(0, 10).toUpperCase();
}

/** Le chemin doit rester strictement dans le dossier de l'utilisateur. */
function safePath(path: string, userId: string): string | null {
  if (typeof path !== "string" || path.length === 0 || path.length > 400) return null;
  if (path.includes("..") || path.includes("\\") || path.startsWith("/")) return null;
  if (!/^[A-Za-z0-9._\/-]+$/.test(path)) return null;
  if (!path.startsWith(`${userId}/`)) return null;
  return path;
}

async function cryptoSign(pdfBytes: Uint8Array, signerName: string, reason: string) {
  const p12 = Buffer.from(P12_B64, "base64");
  const pdfDoc = await PDFDocument.load(pdfBytes);
  pdflibAddPlaceholder({
    pdfDoc,
    reason,
    contactInfo: "senstock",
    name: signerName,
    location: "Dakar, Senegal",
    signatureLength: 8192,
  });
  const withPlaceholder = Buffer.from(await pdfDoc.save({ useObjectStreams: false }));
  const signer = new P12Signer(p12, { passphrase: P12_PASSWORD });
  const mod: any = signpdfModule;
  const engine = typeof mod?.sign === "function"
    ? mod
    : typeof mod?.default?.sign === "function"
      ? mod.default
      : new (mod.SignPdf ?? mod.default?.SignPdf)();
  const signed = await engine.sign(withPlaceholder, signer);
  return new Uint8Array(signed);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) return json({ error: "Non authentifié" }, 401);
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    const user = userData?.user;
    if (userErr || !user) return json({ error: "Session invalide" }, 401);

    const body = await req.json().catch(() => ({}));
    const path = safePath(String(body.storagePath ?? ""), user.id);
    const fileName = String(body.fileName ?? "document.pdf").slice(0, 250);
    const position = String(body.position ?? "all").slice(0, 20);
    const pageCount = Number.isFinite(body.pageCount) ? Math.max(0, Math.floor(body.pageCount)) : 0;
    const device = String(body.device ?? "").slice(0, 200);
    if (!path) return json({ error: "Chemin de fichier invalide" }, 400);
    if (!["first", "last", "all", "middle"].includes(position)) {
      return json({ error: "Position invalide" }, 400);
    }

    const { data: file, error: dlErr } = await admin.storage.from(BUCKET).download(path);
    if (dlErr || !file) return json({ error: "Document introuvable dans le cloud" }, 404);
    const original = new Uint8Array(await file.arrayBuffer());
    if (original.length < 5 || String.fromCharCode(...original.slice(0, 4)) !== "%PDF") {
      return json({ error: "Le fichier n'est pas un PDF valide" }, 400);
    }

    const signerName = (user.email ?? "").split("@")[0].replace(/[._-]+/g, " ").trim() || "Signataire";
    let finalBytes = original;
    let cryptoSigned = false;
    let certSerial: string | null = null;
    let certSubject: string | null = null;

    if (P12_B64 && P12_PASSWORD) {
      try {
        finalBytes = await cryptoSign(original, signerName, `Signé électroniquement par ${signerName} — SENSTOCK`);
        cryptoSigned = true;
        certSerial = "4F9A4B4AA293F9DD5FFC723D66BE3E03DA51250D";
        certSubject = "CN=SENSTOCK Document Signing, O=SENSTOCK, C=SN";
        const { error: upErr } = await admin.storage
          .from(BUCKET)
          .upload(path, new Blob([finalBytes], { type: "application/pdf" }), {
            contentType: "application/pdf",
            upsert: true,
          });
        if (upErr) throw upErr;
      } catch (e) {
        console.error("crypto signature failed, fallback empreinte seule", e);
        finalBytes = original;
        cryptoSigned = false;
        certSerial = null;
        certSubject = null;
      }
    }

    const sha256 = await sha256Hex(finalBytes);
    const signedAt = new Date().toISOString();
    const ip = clientIp(req);
    const signatureId = signatureIdFrom(sha256);
    const authMethod = "Email + mot de passe (session authentifiée)";

    const { data: row, error: insErr } = await admin
      .from("documents")
      .insert({
        owner_id: user.id,
        name: fileName,
        status: "signed",
        placement: { position, pageCount },
        signed_at: signedAt,
        storage_path: path,
        sha256,
        signature_id: signatureId,
        auth_method: authMethod,
        signer_ip: ip,
        cert_serial: certSerial,
        cert_subject: certSubject,
        crypto_signed: cryptoSigned,
        audit_trail: [
          { event: "document.uploaded", at: signedAt, by: user.email, device },
          { event: "stamp.placed", at: signedAt, by: user.email, position },
          { event: "pdf.hashed", at: signedAt, algorithm: "SHA-256", value: sha256 },
          cryptoSigned
            ? { event: "pdf.crypto_signed", at: signedAt, standard: "PAdES", cert_serial: certSerial }
            : { event: "pdf.crypto_signature_skipped", at: signedAt, reason: "signature cryptographique indisponible" },
          { event: "signature.registered", at: signedAt, by: user.email, ip, auth_method: authMethod, signature_id: signatureId },
        ],
      })
      .select("id")
      .single();
    if (insErr) throw insErr;

    return json({
      id: row.id,
      signatureId,
      sha256,
      signedAt,
      ip,
      authMethod,
      cryptoSigned,
      certSerial,
      certSubject,
      storagePath: path,
      signerName,
    });
  } catch (err: any) {
    console.error(err);
    return json({ error: err?.message ?? String(err) }, 500);
  }
});
