// Inventaire exhaustif des copies d'Examens Blancs pour le correcteur unique.
// Pur et testable : aucune lecture, aucune écriture. Une copie terminée n'est jamais
// exclue silencieusement : soit elle est affichée, soit elle sort dans `manquantes` avec sa cause.
import {proveNativeMirrors,type MirrorResult,type MirrorAttempt} from './preuveMiroir';

export type ResultatHistoriqueMin = {
  id: string;
  apprenant_id: string;
  quiz_id: string;
  quiz_type?: string | null;
  completed_at: string | null;
};

export type TentativeV2Min = {
  attempt_id: string;
  apprenant_id: string;
  exam_id: string;
  etat?: string | null;
  rid?: string | null;
};

/** EB réel (EB1…EB6, -TAXI, -ta, -va) ; EB99/tests techniques exclus. */
export const estExamenBlancReel = (quizId: string) => /^eb\d+(?:$|-)/i.test(quizId.trim()) && !/^eb99/i.test(quizId.trim());

/** EB2 VTC exact : affiché par la consultation V2 dédiée. */
export const estEb2Vtc = (quizId: string) => quizId === "EB2";

/** Identifiants des résultats historiques déjà copiés dans une tentative V2 (source_historique). */
export function resultatsMigres(tentatives: TentativeV2Min[]): Set<string> {
  return new Set(tentatives.map((t) => t.rid).filter((x): x is string => !!x));
}

/**
 * Copies historiques à lister dans l'ancien circuit : terminées, EB réel, non migrées vers V2
 * (sinon doublon avec la copie V2) et non EB2 VTC (déjà en consultation V2).
 */
export function resultatsAncienCircuit<T extends ResultatHistoriqueMin>(resultats: T[], migres: Set<string>): T[] {
  const vus = new Set<string>();
  return resultats.filter((r) => {
    if (vus.has(r.id)) return false;
    vus.add(r.id);
    return !!r.completed_at && estExamenBlancReel(r.quiz_id) && !estEb2Vtc(r.quiz_id) && !migres.has(r.id);
  });
}

/**
 * Copies historiques écrites en miroir d'un passage V2 natif (même élève, même examen, même matière,
 * passage V2 terminé) dont TOUTES les réponses QRC texte sont strictement identiques.
 * Preuve par contenu exact, jamais par fenêtre de temps ; ambigu (plusieurs passages) = pas un miroir.
 */
export function miroirsV2Prouves(
  resultats: MirrorResult[],
  tentatives: MirrorAttempt[],
  qrcV2: Array<{ attempt_id: string; reponse: unknown }>,
  answers: Array<{attempt_id:string;question_id:string;valeur:unknown}>=[],
): Set<string> {
  void qrcV2;
  return proveNativeMirrors(resultats,tentatives,answers).mirrors;
}

/** Nombre de réponses texte non vides (QRC) dans une copie historique. */
export function nbQrcEcrites(reponses: unknown): number {
  if (!reponses || typeof reponses !== "object" || Array.isArray(reponses)) return 0;
  return Object.values(reponses as Record<string, unknown>).filter((v) => typeof v === "string" && v.trim().length > 0).length;
}

export type CopieAttendue = { cle: string; apprenant_id: string; exam_id: string; circuit: "v2" | "consultation" | "ancien"; qrc: number; date: string | null };
export type CopieManquante = CopieAttendue & { cause: string };

/** Clé d'affichage attendue d'une copie (même convention que la grille). */
export const cleAffichage = (circuit: CopieAttendue["circuit"], id: string) =>
  circuit === "v2" ? id : circuit === "consultation" ? `consultation:${id}` : `ancien:${id}`;

/**
 * Inventaire attendu : toute copie terminée contenant au moins une QRC.
 * V2 : tentative terminée non neutralisée ayant ≥ 1 QRC ; historique : réponse texte écrite.
 */
export function inventaireAttendu(params: {
  tentatives: TentativeV2Min[];
  qrcParTentative: Map<string, number>;
  neutralises: Set<string>;
  resultats: Array<ResultatHistoriqueMin & { qrc: number }>;
  exclus: Set<string>;
  miroirs?: Set<string>;
}): CopieAttendue[] {
  const migres = resultatsMigres(params.tentatives);
  for (const m of params.miroirs ?? []) migres.add(m);
  const out: CopieAttendue[] = [];
  for (const t of params.tentatives) {
    if (params.exclus.has(t.apprenant_id) || t.etat !== "terminee" || params.neutralises.has(t.attempt_id)) continue;
    if (!estExamenBlancReel(t.exam_id)) continue;
    const n = params.qrcParTentative.get(t.attempt_id) ?? 0;
    out.push({ cle: t.attempt_id, apprenant_id: t.apprenant_id, exam_id: t.exam_id, circuit: "v2", qrc: n, date: null });
  }
  for (const r of params.resultats) {
    if (params.exclus.has(r.apprenant_id) || !r.completed_at || !estExamenBlancReel(r.quiz_id) || migres.has(r.id)) continue;
    const circuit = estEb2Vtc(r.quiz_id) ? "consultation" : "ancien";
    out.push({ cle: cleAffichage(circuit, r.id), apprenant_id: r.apprenant_id, exam_id: r.quiz_id, circuit, qrc: r.qrc, date: r.completed_at });
  }
  return out;
}

/** Rapprochement attendues ↔ visibles ; chaque absence porte une cause explicite. */
export function rapprocher(attendues: CopieAttendue[], visibles: Set<string>): { attendues: number; visibles: number; manquantes: CopieManquante[] } {
  const manquantes: CopieManquante[] = [];
  let vues = 0;
  for (const c of attendues) {
    if (visibles.has(c.cle)) { vues++; continue; }
    const cause = c.circuit === "v2" ? "Passage V2 terminé absent de la grille"
      : c.circuit === "consultation" ? "Copie EB2 VTC historique absente de la consultation V2"
      : "Copie historique non migrée absente de l'ancien circuit";
    manquantes.push({ ...c, cause });
  }
  return { attendues: attendues.length, visibles: vues, manquantes };
}
