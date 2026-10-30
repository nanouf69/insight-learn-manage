// Contrôle de connaissances (module 13) : la correction des QRC est faite par le
// serveur (copie figée + file durable). Le navigateur lance seulement la mise en file
// et lit les résultats publiés. Aucune note n'est calculée ni inventée ici.
import { supabase } from "@/integrations/supabase/client";

export const MODULE_CONTROLE_SERVEUR = 13;

export type ItemServeur = { question_id: string; statut: string; est_correct: boolean | null; points: number | null; commentaire: string | null; motif: string | null };
export type ResultatAffiche =
  | { estCorrect: boolean; pointsObtenus: number; explication: string }
  | { indisponible: true; revue: true; explication: string }
  | "loading";

/** Traduit l'état serveur d'une QRC : « corrigée » seulement si le serveur l'a publiée. */
export function resultatDepuisServeur(it: ItemServeur): ResultatAffiche {
  if (it.statut === "corrigee" && typeof it.est_correct === "boolean") {
    return { estCorrect: it.est_correct, pointsObtenus: it.points ?? (it.est_correct ? 1 : 0), explication: it.commentaire ?? "" };
  }
  if (it.statut === "a_verifier") {
    return { indisponible: true, revue: true, explication: "Correction à vérifier par un formateur : aucune note n'est attribuée en attendant." };
  }
  return "loading";
}

export async function soumettreCopieControle(exerciceId: string): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke("controle-qrc-ia", { body: { action: "soumettre", exercice_id: exerciceId } });
  if (error || !data?.ok) return null;
  return String(data.copie_id);
}

export async function lireCopieControle(copieId: string): Promise<{ statut: string; items: ItemServeur[] } | null> {
  const [{ data: c, error: ce }, { data: items, error: ie }] = await Promise.all([
    supabase.from("controle_qrc_copies").select("statut").eq("id", copieId).maybeSingle(),
    supabase.from("controle_qrc_items").select("question_id, statut, est_correct, points, commentaire, motif").eq("copie_id", copieId),
  ]);
  if (ce || ie || !c) return null;
  return { statut: c.statut, items: (items ?? []) as ItemServeur[] };
}
