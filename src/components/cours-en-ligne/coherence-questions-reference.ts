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

const compact = (v: unknown) => normaliserTexte(v).replace(/[^a-z0-9€]/g, "");

/**
 * Compare chaque QCM des examens avec la référence, proposition par
 * proposition (même texte compacté). Une question est signalée seulement si
 * une MÊME proposition est correcte d'un côté et incorrecte de l'autre, et si
 * la référence est univoque pour cette proposition. Les différences de simple
 * formulation ou de découpage ne sont pas signalées.
 */
export function detecterDivergencesCorrection(
  examens: ExamenBlanc[],
  reference: Question[],
): DivergenceCorrection[] {
  // énoncé → (proposition → ensemble des statuts observés en référence)
  const ref = new Map<string, { statuts: Map<string, Set<boolean>>; bonnes: Set<string> }>();
  for (const q of reference) {
    if ((q as any)?.type !== "QCM" || !Array.isArray((q as any).choix)) continue;
    const cle = compact(q.enonce);
    if (!cle) continue;
    const entree = ref.get(cle) ?? { statuts: new Map(), bonnes: new Set<string>() };
    for (const c of (q as any).choix) {
      const t = compact(c?.texte);
      if (!t) continue;
      const set = entree.statuts.get(t) ?? new Set<boolean>();
      set.add(c?.correct === true);
      entree.statuts.set(t, set);
    }
    for (const b of bonnesReponsesTexte(q)) entree.bonnes.add(b);
    ref.set(cle, entree);
  }

  const out: DivergenceCorrection[] = [];
  for (const ex of examens) {
    for (const m of ex?.matieres ?? []) {
      for (const q of (m as any)?.questions ?? []) {
        if (q?.type !== "QCM" || !Array.isArray(q.choix)) continue;
        const entree = ref.get(compact(q.enonce));
        if (!entree) continue;
        const diverge = q.choix.some((c: any) => {
          const statuts = entree.statuts.get(compact(c?.texte));
          return !!statuts && statuts.size === 1 && [...statuts][0] !== (c?.correct === true);
        });
        if (diverge) {
          out.push({
            examenId: ex.id,
            matiereId: (m as any).id,
            questionId: q.id,
            enonce: q.enonce,
            bonnesExamen: bonnesReponsesTexte(q),
            bonnesReference: [...entree.bonnes].sort(),
          });
        }
      }
    }
  }
  return out;
}
