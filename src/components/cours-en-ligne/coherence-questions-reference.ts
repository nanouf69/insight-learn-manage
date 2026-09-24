// CONTRÔLE « MATIÈRE / QUESTION IDENTIQUE = MÊME CORRECTION »
//
// Fonction PURE, en LECTURE SEULE : elle compare les bonnes réponses d'une
// question d'examen blanc avec celles de la même question (même énoncé
// normalisé) dans les banques de référence. Elle ne corrige RIEN : toute
// divergence est seulement signalée, pour décision explicite de l'admin.

import type { ExamenBlanc, Question } from "./examens-blancs-data";

export interface DivergenceCorrection {
  examenId: string;
  matiereId: string;
  questionId: number | string;
  enonce: string;
  bonnesExamen: string[];
  bonnesReference: string[];
}

export const normaliserTexte = (v: unknown): string =>
  String(v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9'€]+/g, " ")
    .trim();

/** Textes normalisés des propositions marquées correctes (indépendant des lettres). */
export function bonnesReponsesTexte(q: Question | null | undefined): string[] {
  const choix = Array.isArray((q as any)?.choix) ? (q as any).choix : [];
  return choix
    .filter((c: any) => c?.correct === true)
    .map((c: any) => normaliserTexte(c?.texte))
    .sort();
}

/**
 * Compare chaque QCM des examens avec la référence. Une question n'est
 * signalée que si la référence est UNIVOQUE (toutes ses occurrences ont les
 * mêmes bonnes réponses) et que l'examen en diffère.
 */
export function detecterDivergencesCorrection(
  examens: ExamenBlanc[],
  reference: Question[],
): DivergenceCorrection[] {
  const refParEnonce = new Map<string, Set<string>>();
  for (const q of reference) {
    if ((q as any)?.type !== "QCM") continue;
    const cle = normaliserTexte(q.enonce);
    const bonnes = bonnesReponsesTexte(q);
    if (!cle || bonnes.length === 0) continue;
    const set = refParEnonce.get(cle) ?? new Set<string>();
    set.add(JSON.stringify(bonnes));
    refParEnonce.set(cle, set);
  }

  const out: DivergenceCorrection[] = [];
  for (const ex of examens) {
    for (const m of ex?.matieres ?? []) {
      for (const q of (m as any)?.questions ?? []) {
        if (q?.type !== "QCM") continue;
        const variantes = refParEnonce.get(normaliserTexte(q.enonce));
        if (!variantes || variantes.size !== 1) continue;
        const bonnesRef: string[] = JSON.parse([...variantes][0]);
        const bonnesEx = bonnesReponsesTexte(q);
        if (JSON.stringify(bonnesEx) !== JSON.stringify(bonnesRef)) {
          out.push({
            examenId: ex.id,
            matiereId: (m as any).id,
            questionId: q.id,
            enonce: q.enonce,
            bonnesExamen: bonnesEx,
            bonnesReference: bonnesRef,
          });
        }
      }
    }
  }
  return out;
}
