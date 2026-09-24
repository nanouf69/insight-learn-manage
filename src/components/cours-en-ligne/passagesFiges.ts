/**
 * Passages historiques figés (archive bilan_passages_figes).
 * Quand un passage est archivé, l'affichage utilise EXCLUSIVEMENT
 * les réponses, la clé et le score archivés — jamais le contenu actuel.
 * Fonctions pures : aucune écriture.
 */

export type ChoixFige = { lettre: string; texte?: string; correct?: boolean };
export type QuestionFigee = { choix?: ChoixFige[]; correctes?: string[]; image?: string; enonce?: string };

export type PassageFige = {
  exercice_id: string; // ex. "module_5_exo_502"
  reponses: Record<string, string | string[]>; // clé "502-1"
  cle_figee: Record<string, QuestionFigee>;
  score_bonnes: number;
  nb_repondues: number;
  nb_questions: number;
  fige_at?: string;
};

/** "module_5_exo_502" -> 502 */
export function exoIdDepuisArchive(exerciceId: string): number | null {
  const m = /exo_(\d+)$/.exec(exerciceId || "");
  return m ? Number(m[1]) : null;
}

/** Remplace les propositions et la correction de la question par celles de l'archive. */
export function questionAvecCleFigee<Q extends { id: number | string; choix?: ChoixFige[] }>(
  q: Q,
  exoId: number,
  passage: PassageFige | null | undefined,
): Q {
  if (!passage || !q) return q;
  const figee = passage.cle_figee?.[`${exoId}-${q.id}`];
  if (!figee || !Array.isArray(figee.choix)) return q;
  const correctes = new Set(figee.correctes ?? figee.choix.filter((c) => c.correct).map((c) => c.lettre));
  return { ...q, choix: figee.choix.map((c) => ({ ...c, correct: correctes.has(c.lettre) })) };
}

function estCorrecte(sel: string | string[] | undefined, correctes: string[]): boolean {
  const s = (Array.isArray(sel) ? sel : sel ? [sel] : []).filter(Boolean).sort();
  const c = [...correctes].sort();
  return s.length > 0 && c.length > 0 && JSON.stringify(s) === JSON.stringify(c);
}

/** Score affiché d'un passage figé : calculé uniquement depuis l'archive. */
export function scoreAffichePassageFige(passage: PassageFige): { bonnes: number; total: number } {
  let bonnes = 0;
  for (const [k, q] of Object.entries(passage.cle_figee || {})) {
    const correctes = q.correctes ?? (q.choix || []).filter((c) => c.correct).map((c) => c.lettre);
    if (estCorrecte(passage.reponses?.[k], correctes)) bonnes++;
  }
  return { bonnes, total: passage.nb_questions };
}
