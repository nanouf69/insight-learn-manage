import { supabase } from "@/integrations/supabase/client";

/**
 * Upload une facture PDF (blob) dans le storage et l'enregistre dans le
 * dossier de formation de l'apprenant (documents_inscription) avec
 * type_document = 'facture-fc'. Idempotent par numéro de facture.
 */
export async function saveFactureToCRM(params: {
  apprenantId: string;
  numero: string;
  fileName: string;
  blob: Blob;
}): Promise<boolean> {
  try {
    const safeNumero = (params.numero || `FC-${Date.now()}`).replace(/[^a-zA-Z0-9_-]+/g, '_');
    const filePath = `${params.apprenantId}/facture-fc-${safeNumero}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from('documents-inscription')
      .upload(filePath, params.blob, {
        upsert: true,
        contentType: 'application/pdf',
      });

    if (uploadError) {
      console.error('[saveFactureToCRM] upload error:', uploadError);
      return false;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('documents-inscription')
      .getPublicUrl(filePath);

    // Supprimer un éventuel doublon pour le même numéro pour éviter l'empilement
    await supabase
      .from('documents_inscription')
      .delete()
      .eq('apprenant_id', params.apprenantId)
      .eq('type_document', 'facture-fc')
      .eq('nom_fichier', params.fileName);

    const { error: insertError } = await supabase
      .from('documents_inscription')
      .insert({
        apprenant_id: params.apprenantId,
        titre: `Facture ${params.numero}`,
        nom_fichier: params.fileName,
        type_document: 'facture-fc',
        url: publicUrl,
        statut: 'valide',
      });

    if (insertError) {
      console.error('[saveFactureToCRM] insert error:', insertError);
      return false;
    }

    return true;
  } catch (e) {
    console.error('[saveFactureToCRM] unexpected error:', e);
    return false;
  }
}
