/**
 * Corrigé officiel ACTUEL (affichage pédagogique seulement).
 *
 * La note d'une copie reste calculée sur le corrigé figé dans son snapshot.
 * Quand l'administration a publié depuis un corrigé QCM différent, l'élève voit
 * en plus la dernière version officielle, avec sa date — sans recalcul de note.
 */
import { supabase } from "@/integrations/supabase/client";

export type CorrigeActuel = {
  attempt_id: string;
  question_id: string;
  bonnes_passage: string[];
  bonnes_actuelles: string[];
  version: number;
  publiee_le: string | null;
};

/** Clé : `${attemptId}|${matiere}:${questionId}` */
export type CarteCorrigesActuels = Map<string, CorrigeActuel>;

export const cleCorrigeActuel = (attemptId: string, matiereId: string, questionId: string | number) =>
  `${attemptId}|${matiereId}:${questionId}`;

export function indexerCorrigesActuels(lignes: unknown): CarteCorrigesActuels {
  const carte: CarteCorrigesActuels = new Map();
  if (!Array.isArray(lignes)) return carte;
  for (const l of lignes as CorrigeActuel[]) {
    if (!l?.attempt_id || !l?.question_id || !Array.isArray(l.bonnes_actuelles) || l.bonnes_actuelles.length === 0) continue;
    carte.set(`${l.attempt_id}|${l.question_id}`, l);
  }
  return carte;
}

/** Affiché seulement si le corrigé actuel diffère réellement de celui du passage. */
export function corrigeActuelPour(
  carte: CarteCorrigesActuels,
  attemptId: string | null | undefined,
  matiereId: string | null | undefined,
  questionId: string | number,
  bonnesAffichees: string[],
): CorrigeActuel | null {
  if (!attemptId || !matiereId) return null;
  const l = carte.get(cleCorrigeActuel(attemptId, matiereId, questionId));
  if (!l) return null;
  const a = [...l.bonnes_actuelles].sort().join(",");
  const b = [...bonnesAffichees].sort().join(",");
  return a === b ? null : l;
}

export async function lireCorrigesActuels(attemptIds: string[]): Promise<CarteCorrigesActuels> {
  const ids = [...new Set(attemptIds.filter(Boolean))].slice(0, 50);
  if (ids.length === 0) return new Map();
  const { data, error } = await supabase.rpc("corrige_officiel_actuel" as never, { p_attempt_ids: ids } as never);
  if (error) throw error;
  return indexerCorrigesActuels(data);
}
