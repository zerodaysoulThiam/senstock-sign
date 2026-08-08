// deno-lint-ignore-file no-explicit-any
// Vérification publique : on compare l'empreinte SHA-256 fournie
// (calculée dans le navigateur du destinataire) au registre des signatures.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const sha256 = String(body.sha256 ?? "").trim().toLowerCase();
    const signatureId = String(body.signatureId ?? "").trim().toUpperCase();

    if (sha256 && !/^[a-f0-9]{64}$/.test(sha256)) {
      return json({ error: "Empreinte SHA-256 invalide" }, 400);
    }
    if (signatureId && !/^SIGN-[A-F0-9]{4,20}$/.test(signatureId)) {
      return json({ error: "Identifiant de signature invalide" }, 400);
    }
    if (!sha256 && !signatureId) return json({ error: "Empreinte ou identifiant requis" }, 400);

    const select = "id, name, signature_id, sha256, signed_at, auth_method, crypto_signed, cert_subject, owner_id, placement";

    let matched: any = null;
    if (sha256) {
      const { data } = await admin.from("documents").select(select).eq("sha256", sha256).limit(1);
      matched = data?.[0] ?? null;
    }

    let reference: any = null;
    if (!matched && signatureId) {
      const { data } = await admin.from("documents").select(select).eq("signature_id", signatureId).limit(1);
      reference = data?.[0] ?? null;
    }

    const found = matched ?? reference;
    if (!found) {
      return json({ status: "unknown", message: "Aucune signature SENSTOCK ne correspond à ce fichier." });
    }

    const { data: profile } = await admin.from("profiles").select("email, full_name").eq("id", found.owner_id).maybeSingle();
    const signerName = profile?.full_name ||
      (profile?.email ?? "").split("@")[0].replace(/[._-]+/g, " ").trim() || "Signataire";

    // On ne divulgue jamais l'email complet ni le chemin de stockage.
    const publicRecord = {
      signatureId: found.signature_id,
      signerName,
      fileName: found.name,
      signedAt: found.signed_at,
      authMethod: found.auth_method,
      cryptoSigned: found.crypto_signed,
      certSubject: found.cert_subject,
      pagesSigned: found.placement?.position ?? null,
      expectedSha256: found.sha256,
    };

    return json({
      status: matched ? "verified" : "mismatch",
      message: matched
        ? "L'empreinte SHA-256 correspond au document enregistré."
        : "L'empreinte du fichier ne correspond pas au document signé enregistré.",
      record: publicRecord,
    });
  } catch (err: any) {
    console.error(err);
    return json({ error: err?.message ?? String(err) }, 500);
  }
});
