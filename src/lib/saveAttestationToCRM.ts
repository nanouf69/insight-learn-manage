import { supabase } from "@/integrations/supabase/client";

/**
 * Upload une attestation de formation continue (PDF) dans le storage et
 * l'enregistre dans le dossier de l'apprenant (documents_inscription) avec
 * type_document = 'attestation-fc'. Idempotent par apprenant.
 */
export async function saveAttestationToCRM(params: {
  apprenantId: string;
  fileName: string;
  blob: Blob;
  formation?: "VTC" | "TAXI";
}): Promise<boolean> {
  try {
    const filePath = `${params.apprenantId}/attestation-fc-${Date.now()}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from("documents-inscription")
      .upload(filePath, params.blob, {
        upsert: true,
        contentType: "application/pdf",
      });

    if (uploadError) {
      console.error("[saveAttestationToCRM] upload error:", uploadError);
      return false;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("documents-inscription")
      .getPublicUrl(filePath);

    // Supprimer les anciennes attestations FC pour ne garder que la dernière
    await supabase
      .from("documents_inscription")
      .delete()
      .eq("apprenant_id", params.apprenantId)
      .eq("type_document", "attestation-fc");

    const { error: insertError } = await supabase
      .from("documents_inscription")
      .insert({
        apprenant_id: params.apprenantId,
        titre: `Attestation formation continue ${params.formation || "VTC"}`,
        nom_fichier: params.fileName,
        type_document: "attestation-fc",
        url: publicUrl,
        statut: "valide",
      });

    if (insertError) {
      console.error("[saveAttestationToCRM] insert error:", insertError);
      return false;
    }

    return true;
  } catch (e) {
    console.error("[saveAttestationToCRM] unexpected error:", e);
    return false;
  }
}
