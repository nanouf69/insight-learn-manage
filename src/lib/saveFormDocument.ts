import { supabase } from "@/integrations/supabase/client";

export async function saveFormDocument(params: {
  apprenantId: string;
  typeDocument: string;
  titre: string;
  donnees: Record<string, any>;
  moduleId?: number;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error("No authenticated user for saving form document");
    return false;
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
    console.error("Error saving form document:", error);
    return false;
  }
  return true;
}
