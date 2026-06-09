import { supabase } from "@/integrations/supabase/client";

/**
 * Upload une feuille d'émargement PDF (blob) dans le storage et l'enregistre
 * dans le dossier de formation de chaque apprenant (documents_inscription)
 * avec type_document = 'emargement'. Idempotent par nom de fichier.
 */
export async function saveEmargementToCRM(params: {
  apprenantId: string;
  fileName: string;
  blob: Blob;
  titre?: string;
  dateRef?: string; // optional ISO date for metadata
}): Promise<boolean> {
  try {
    if (!params.apprenantId || !params.blob) return false;
    const safeName = params.fileName.replace(/[^a-zA-Z0-9_.-]+/g, "_");
    const filePath = `${params.apprenantId}/emargement-${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("documents-inscription")
      .upload(filePath, params.blob, {
        upsert: true,
        contentType: "application/pdf",
      });

    if (uploadError) {
      console.error("[saveEmargementToCRM] upload error:", uploadError);
      return false;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("documents-inscription")
      .getPublicUrl(filePath);

    // Supprimer les doublons éventuels (même nom de fichier "logique")
    await supabase
      .from("documents_inscription")
      .delete()
      .eq("apprenant_id", params.apprenantId)
      .eq("type_document", "emargement")
      .eq("nom_fichier", safeName);

    const { error: insertError } = await supabase
      .from("documents_inscription")
      .insert({
        apprenant_id: params.apprenantId,
        titre: params.titre || "Feuille d'émargement",
        nom_fichier: safeName,
        type_document: "emargement",
        url: publicUrl,
        statut: "valide",
        donnees: params.dateRef ? { date_emargement: params.dateRef } : null,
      } as any);

    if (insertError) {
      console.error("[saveEmargementToCRM] insert error:", insertError);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[saveEmargementToCRM] unexpected error:", e);
    return false;
  }
}

export async function saveEmargementToCRMForMany(
  apprenantIds: string[],
  fileName: string,
  blob: Blob,
  titre?: string,
  dateRef?: string,
): Promise<number> {
  let ok = 0;
  for (const id of apprenantIds) {
    const r = await saveEmargementToCRM({ apprenantId: id, fileName, blob, titre, dateRef });
    if (r) ok++;
  }
  return ok;
}
