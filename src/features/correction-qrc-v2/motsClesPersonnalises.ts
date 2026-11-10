import { supabase } from "@/integrations/supabase/client";

export interface MotCleQrc {
  id: string;
  texte: string;
  version: number;
  archive: boolean;
}

export const MOTS_CLES_QUERY = ["qrc-mots-cles-admin"] as const;

export async function lireMotsClesQrc(): Promise<MotCleQrc[]> {
  const lignes: MotCleQrc[] = [];
  let curseur: string | null = null;
  for (;;) {
    let requete = supabase.from("qrc_commentaires_rapides")
      .select("id,texte,version,archive").eq("archive", false).order("id").limit(500);
    if (curseur) requete = requete.gt("id", curseur);
    const { data, error } = await requete;
    if (error) throw error;
    lignes.push(...data);
    if (data.length < 500) return lignes;
    curseur = data[data.length - 1]?.id ?? null;
    if (!curseur) throw new Error("Lecture des mots-clés incomplète.");
  }
}

export async function enregistrerMotCleQrc(mot: {
  id: string; texte: string; version?: number; archive?: boolean;
}): Promise<MotCleQrc> {
  const { data, error } = await supabase.rpc("qrc_commentaire_rapide_enregistrer", {
    p_id: mot.id, p_texte: mot.texte, p_version: mot.version, p_archive: mot.archive ?? false,
  });
  if (error) throw error;
  const { data: relu, error: erreurLecture } = await supabase.from("qrc_commentaires_rapides")
    .select("id,texte,version,archive").eq("id", mot.id).single();
  if (erreurLecture) throw erreurLecture;
  if (!relu || relu.version !== data.version || relu.texte !== mot.texte || relu.archive !== (mot.archive ?? false)) {
    throw new Error("Le mot-clé a changé entre-temps. Relisez la liste avant de réessayer.");
  }
  return relu;
}