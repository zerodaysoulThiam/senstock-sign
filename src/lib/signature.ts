import { supabase } from "@/integrations/supabase/client";
import { getCurrentUser } from "./auth";

const BUCKET = "user-signatures";

function pathFor(userId: string, ext: "png" | "jpg") {
  return `${userId}/signature.${ext}`;
}

/** Enregistre le cachet de l'utilisateur comme signature par défaut. */
export async function saveDefaultSignature(file: Blob, type: "png" | "jpg"): Promise<boolean> {
  const user = getCurrentUser();
  if (!user) return false;
  // Une seule signature par compte : on supprime l'autre extension éventuelle.
  const other = type === "png" ? "jpg" : "png";
  await supabase.storage.from(BUCKET).remove([pathFor(user.id, other)]);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(pathFor(user.id, type), file, {
      contentType: type === "png" ? "image/png" : "image/jpeg",
      upsert: true,
    });
  if (error) console.error("saveDefaultSignature", error);
  return !error;
}

/**
 * Re-encode le cachet en PNG standard via le canvas.
 * Certaines images (PNG 16 bits, entrelacés, profils exotiques) ne sont pas
 * lisibles par pdf-lib : la normalisation garantit une signature toujours
 * intégrable au PDF, en conservant la transparence.
 */
export async function normalizeToPngBytes(src: Blob): Promise<Uint8Array> {
  const bitmap = await createImageBitmap(src);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponible");
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close?.();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Conversion du cachet impossible");
  return new Uint8Array(await blob.arrayBuffer());
}

export interface DefaultSignature {
  bytes: Uint8Array;
  type: "png" | "jpg";
  url: string;
}

/** Récupère la signature par défaut du compte connecté, si elle existe. */
export async function loadDefaultSignature(): Promise<DefaultSignature | null> {
  const user = getCurrentUser();
  if (!user) return null;
  for (const type of ["png", "jpg"] as const) {
    const { data, error } = await supabase.storage.from(BUCKET).download(pathFor(user.id, type));
    if (!error && data) {
      try {
        const bytes = await normalizeToPngBytes(data);
        return { bytes, type: "png", url: URL.createObjectURL(data) };
      } catch (e) {
        console.error("normalizeToPngBytes", e);
        return { bytes: new Uint8Array(await data.arrayBuffer()), type, url: URL.createObjectURL(data) };
      }
    }
  }
  return null;
}

/** Supprime la signature par défaut du compte connecté. */
export async function deleteDefaultSignature(): Promise<void> {
  const user = getCurrentUser();
  if (!user) return;
  await supabase.storage.from(BUCKET).remove([pathFor(user.id, "png"), pathFor(user.id, "jpg")]);
}
