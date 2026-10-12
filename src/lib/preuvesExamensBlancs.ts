/**
 * Preuves de passage des Examens blancs (lecture seule, affichage Admin).
 * Même règle que la garde serveur des modules 35–38 :
 * une épreuve est « soumise » si passage V2 terminé, OU toutes les matières
 * requises ont une note, OU toutes les matières requises ont une soumission
 * (status submitted) avec au moins une réponse non vide.
 * Une note absente sur une épreuve soumise = « correction manquante », jamais « inachevé ».
 */

export type EtatEpreuve =
  | "notee" // toutes les matières notées
  | "soumise_correction_manquante" // soumise, note(s) manquante(s)
  | "soumission_incomplete" // marquée envoyée mais matière(s) vide(s)/non envoyée(s)
  | "en_cours"
  | "non_commencee";

export interface ReponseEB { exercice_id: string; status: string | null; reponses: unknown; submitted_at?: string | null; updated_at?: string | null }
export interface NoteEB { quiz_id: string; matiere_id: string; completed_at?: string | null }
export interface PassageV2 { exam_id: string; etat: string; is_test?: boolean | null }

export interface EpreuvePreuve {
  examId: string;
  requises: number;
  notees: number;
  soumisesNonVides: number;
  soumisesVides: string[];
  enCours: number;
  v2Terminee: boolean;
  etat: EtatEpreuve;
  prouvee: boolean;
  dateSoumission: string | null;
}

const vide = (v: unknown) => v == null || v === "" || (Array.isArray(v) && v.length === 0) ||
  (typeof v === "object" && !Array.isArray(v) && Object.keys(v as object).length === 0);

export const nbReponsesNonVides = (r: unknown): number =>
  r && typeof r === "object" && !Array.isArray(r) ? Object.values(r as object).filter((v) => !vide(v)).length : 0;

/** `EB1__anglais` / `EB1__anglais__t2` → `anglais`. */
export const matiereDe = (exerciceId: string, examId: string): string | null => {
  const p = `${examId}__`;
  if (!exerciceId.startsWith(p)) return null;
  return exerciceId.slice(p.length).split("__")[0] || null;
};

export function evaluerEpreuve(
  examId: string,
  requises: number,
  reponses: ReponseEB[],
  notes: NoteEB[],
  passages: PassageV2[],
): EpreuvePreuve {
  const v2Terminee = passages.some((p) => p.exam_id === examId && p.etat === "terminee" && !p.is_test);
  const notees = new Set(notes.filter((n) => n.quiz_id === examId).map((n) => n.matiere_id.split("__")[0])).size;
  const ok = new Set<string>(); const videsSet = new Set<string>(); const cours = new Set<string>();
  let date: string | null = null;
  for (const r of reponses) {
    const m = matiereDe(r.exercice_id, examId);
    if (!m) continue;
    if (r.status === "submitted") {
      if (nbReponsesNonVides(r.reponses) > 0) {
        ok.add(m);
        const d = r.submitted_at ?? null;
        if (d && (!date || d > date)) date = d;
      } else videsSet.add(m);
    } else if (nbReponsesNonVides(r.reponses) > 0) cours.add(m);
  }
  ok.forEach((m) => videsSet.delete(m));
  const prouvee = v2Terminee || (requises > 0 && (notees >= requises || ok.size >= requises));
  let etat: EtatEpreuve;
  if (requises > 0 && notees >= requises) etat = "notee";
  else if (prouvee) etat = "soumise_correction_manquante";
  else if (ok.size + videsSet.size > 0 && videsSet.size > 0) etat = "soumission_incomplete";
  else if (ok.size + cours.size + notees > 0) etat = "en_cours";
  else etat = "non_commencee";
  return { examId, requises, notees, soumisesNonVides: ok.size, soumisesVides: [...videsSet].sort(), enCours: cours.size,
    v2Terminee, etat, prouvee, dateSoumission: date };
}

export const LIBELLE_ETAT: Record<EtatEpreuve, string> = {
  notee: "Soumise et notée",
  soumise_correction_manquante: "Soumise — note manquante",
  soumission_incomplete: "Envoi incomplet (matière vide)",
  en_cours: "Commencée, non soumise",
  non_commencee: "Non commencée",
};
