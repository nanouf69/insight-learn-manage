import { supabase } from "@/integrations/supabase/client";
import { savePublicFormDocument } from "@/lib/savePublicFormDocument";

export async function saveFormDocument(params: {
  apprenantId: string;
  typeDocument: string;
  titre: string;
  donnees: Record<string, any>;
  moduleId?: number;
}) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.warn("No authenticated user, fallback to backend save-public-form");
    return savePublicFormDocument({
      apprenantId: params.apprenantId,
      typeDocument: params.typeDocument,
      titre: params.titre,
      donnees: {
        ...params.donnees,
        module_id: params.moduleId || null,
      },
    });
  }

  const { error } = await supabase
    .from("apprenant_documents_completes" as any)
    .insert({
      apprenant_id: params.apprenantId,
      user_id: user.id,
      type_document: params.typeDocument,
      titre: params.titre,
      donnees: params.donnees,
      module_id: params.moduleId || null,
    } as any);

  if (error) {
    console.error("Error saving form document (direct insert):", error);
    const fallbackOk = await savePublicFormDocument({
      apprenantId: params.apprenantId,
      typeDocument: params.typeDocument,
      titre: params.titre,
      donnees: {
        ...params.donnees,
        module_id: params.moduleId || null,
      },
    });

    if (fallbackOk) {
      console.warn("Fallback save-public-form succeeded after direct insert failure");
      return true;
    }

    return false;
  }

  return true;
}

