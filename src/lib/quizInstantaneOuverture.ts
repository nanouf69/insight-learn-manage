/**
 * Instantané SERVEUR des questions d'un quiz, pris à l'ouverture de la tentative d'origine.
 * Le navigateur n'envoie jamais de liste : il reçoit celle du serveur et la compare à l'écran.
 *
 * DÉSACTIVÉ tant que le candidat SQL docs/sql-revue/2026-11-27-quiz-instantane-ouverture.sql
 * n'est pas appliqué : la dérivation serveur ne reproduit pas encore l'affichage des Bilans
 * projetés ni des quiz complétés par du contenu défini dans le code.
 */
import { supabase } from "@/integrations/supabase/client";

export const INSTANTANE_OUVERTURE_ACTIF = false;

export type ResultatOuverture =
  | { etat: "ok"; questionIds: string[]; empreinte: string }
  | { etat: "regle_precedente" } // tentative antérieure ou quiz non couvert : règle déjà en place
  | { etat: "erreur"; message: string; reessayable: true };

export const MESSAGE_INSTANTANE_INDISPONIBLE =
  "La liste des questions n'a pas pu être confirmée par le serveur. Vos réponses sont conservées : réessayez.";

export async function ouvrirInstantaneQuiz(apprenantId: string, exerciceId: string): Promise<ResultatOuverture> {
  if (!/^module_\d+_exo_\d+$/.test(exerciceId)) return { etat: "regle_precedente" };
  try {
    const { data, error } = await (supabase as any).rpc("ouvrir_quiz_instantane", {
      _apprenant_id: apprenantId,
      _exercice_id: exerciceId,
    });
    if (error) {
      if (error.code === "P0571" || error.code === "P0572") return { etat: "regle_precedente" };
      return { etat: "erreur", message: MESSAGE_INSTANTANE_INDISPONIBLE, reessayable: true };
    }
    const ligne = Array.isArray(data) ? data[0] : data;
    const ids = ligne?.question_ids;
    if (!Array.isArray(ids) || ids.length === 0 || typeof ligne?.empreinte !== "string") {
      return { etat: "erreur", message: MESSAGE_INSTANTANE_INDISPONIBLE, reessayable: true };
    }
    return { etat: "ok", questionIds: ids.map(String), empreinte: ligne.empreinte };
  } catch {
    return { etat: "erreur", message: MESSAGE_INSTANTANE_INDISPONIBLE, reessayable: true };
  }
}

/** L'écran doit montrer exactement l'instantané serveur (même ensemble, sans doublon). */
export function affichageConformeInstantane(affiches: string[], instantane: string[]): boolean {
  const a = affiches.map(String);
  if (new Set(a).size !== a.length || a.length !== instantane.length) return false;
  const s = new Set(instantane.map(String));
  return a.every((id) => s.has(id));
}

/** Questions de l'instantané sans réponse dans la remise (clé `${exo}-${question}`). */
export function questionsSansReponse(exoId: string | number, instantane: string[], reponses: Record<string, unknown>): string[] {
  const vide = (v: unknown): boolean =>
    v == null || (typeof v === "string" && v.trim() === "") || (Array.isArray(v) && v.every(vide)) ||
    (typeof v === "object" && !Array.isArray(v) && Object.values(v as object).every(vide));
  return instantane.filter((id) => vide(reponses[`${exoId}-${id}`]));
}
