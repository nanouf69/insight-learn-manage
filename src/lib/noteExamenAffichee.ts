import { matchCoreState, coreStateScore, type CoreMatiereState } from "@/lib/coreExamPublication";
import { isQrcPendingCorrection, isExamAttemptPublicationPending, computeReussiForResult } from "@/components/cours-en-ligne/exam-helpers";
import { MENTION_NOTE_RECALCULEE, verifierPassageV2, verifierContenuPassage, contenuFicheTronqueCompatible } from "@/lib/passagesV2NonFiables";
import { nativeSnapshotSupportsResult } from "./nativeExamResultIdentity";

/**
 * FONCTION COMMUNE — note et statut affichés d'un résultat d'examen blanc.
 * Utilisée par « Mes notes » (élève) et la fiche Résultats (admin) :
 * les deux écrans ne peuvent plus diverger.
 *
 * Règles :
 * 1. Lecture du nouveau moteur impossible → « Note en attente » (jamais une note douteuse).
 * 2. Passage nouveau moteur fiable → note et statut viennent uniquement de ce passage.
 * 3. Passage nouveau moteur non fiable (défaut du 23/09) → note de l'ancien système,
 *    avec la mention « note recalculée depuis les réponses complètes ».
 * 4. Pas de passage nouveau moteur → ancien affichage inchangé.
 * Lecture seule : aucune écriture.
 */

/** Marqueur de lecture impossible (fail-closed) : compris par isExamAttemptPublicationPending. */
export const CORE_LECTURE_IMPOSSIBLE = Object.freeze({ pending: true, lectureImpossible: true, note20: null });

export function estExamenBlanc(row: any): boolean {
  return row?.quiz_type === "examen_blanc" || row?.quiz_type === "examen_blanc_taxi";
}

/**
 * Rattache à une ligne de résultat la source unique à utiliser.
 * - `coreStates` null = lecture du nouveau moteur impossible.
 * - `nonFiables` null = repérage des passages non fiables impossible.
 */
export function attacherSourceUnique<T extends Record<string, any>>(
  row: T,
  coreStates: CoreMatiereState[] | null,
  nonFiables: Set<string> | null,
): T & { __core: any; __noteRecalculee?: boolean } {
  if (!estExamenBlanc(row)) return { ...row, __core: null };
  if (coreStates === null) return { ...row, __core: CORE_LECTURE_IMPOSSIBLE };
  const core = matchCoreState(coreStates, row.quiz_id, row.matiere_id, row.completed_at, row.id, row.tentative, row.apprenant_id);
  if (!core) {
    const t = new Date(String(row.completed_at)).getTime();
    const plausible = coreStates.some((s) => s.examId === String(row.quiz_id) && s.matiereId === String(row.matiere_id) && (!s.resultId || s.resultId === row.id) && Math.abs(new Date(s.finishedAt).getTime() - t) <= 120000);
    return { ...row, __core: plausible ? CORE_LECTURE_IMPOSSIBLE : null };
  }
  if (!core.resultId && core.provenResultIds !== undefined && !core.provenResultIds.includes(String(row.id))) {
    return { ...row, __core: CORE_LECTURE_IMPOSSIBLE };
  }
  if (nonFiables === null) return { ...row, __core: CORE_LECTURE_IMPOSSIBLE };
  const original = row?.__preuveOriginaleDetails ?? row?.details;
  const reponsesFiables = !nonFiables.has(core.attemptId) && verifierPassageV2(core, original?.reponses ?? row?.reponses) === "fiable";
  // Copie V2 de CETTE ligne précise (result_id d'origine) dont la fiche figée est
  // strictement identique à la ligne : même passage prouvé. Les anciens résumés
  // (sans choix ni « reponseQRC ») ne peuvent pas passer la comparaison de contenu
  // et resteraient « en attente » alors que leurs QRC sont corrigées dans le V2.
  // Seulement pour une note V2 DÉFINITIVE : ne remet jamais « en attente » un résultat déjà publié.
  if (reponsesFiables && !core.pending && core.resultId && core.resultId === String(row.id) && fichesIdentiques(core.historicalDetails, original)) {
    return { ...row, __core: core };
  }
  // Unique native passage established from server-owned frozen answers. Current
  // questions, legacy pending flags and timestamps cannot invalidate its note.
  if (!core.resultId && core.provenResultIds?.includes(String(row.id))) {
    return { ...row, __core: reponsesFiables && nativeSnapshotSupportsResult(core.questions) ? core : CORE_LECTURE_IMPOSSIBLE };
  }
  // Matière à QRC, passage natif définitif, mêmes réponses : une ancienne fiche tronquée
  // (sans corrigé) ne peut pas porter la correction QRC ; le passage moteur fait foi.
  const qrcDefinitif = reponsesFiables && core.qrcTotal > 0 && !core.pending;
  // Ancienne fiche qui ne porte pas la correction QRC : passage moteur définitif fait foi si
  // la fiche est tronquée OU si seul un énoncé a été retouché (choix, bonnes réponses,
  // réponses attendues et réponses élève identiques). Cas HASNAT 06/11, Gestion Q15.
  const ficheTronqueQrc = qrcDefinitif && (contenuFicheTronqueCompatible(core, original) || verifierContenuPassage(core, original, { enonceLibre: true }));
  if (!reponsesFiables || (!ficheTronqueQrc && !verifierContenuPassage(core, original))) {
    if (core.pending) return { ...row, __core: CORE_LECTURE_IMPOSSIBLE, __noteRecalculee: true };
    return { ...row, __core: null, __noteRecalculee: true };
  }
  return { ...row, __core: core };
}

function jsonCanonique(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(jsonCanonique).join(",")}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj).filter((k) => obj[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${jsonCanonique(obj[k])}`).join(",")}}`;
}

/** Fiche historique copiée = fiche de la ligne, octet pour octet (hors ordre des clés). */
export function fichesIdentiques(a: unknown, b: unknown): boolean {
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  return jsonCanonique(a) === jsonCanonique(b);
}

/** Screens with mapped rows use the same strict same-attempt rule. */
export function coreFiablePourLigne(states: CoreMatiereState[] | null, row: any): CoreMatiereState | null {
  return attacherSourceUnique({ ...row, quiz_type: "examen_blanc", quiz_id: row?.quiz_id ?? row?.quizId, matiere_id: row?.matiere_id ?? row?.matiereId, completed_at: row?.completed_at ?? row?.completedAt, id: row?.id ?? row?.resultId }, states, states === null ? null : new Set()).__core;
}

export type NoteAffichee =
  | { etat: "note"; note20: number; source: "noyau" | "ancien"; mention: string | null }
  | { etat: "en_attente"; note20: null; source: "noyau" | "ancien"; mention: string | null }
  | { etat: "lecture_impossible"; note20: null; source: null; mention: null };

function noteAncienSur20(row: any): number | null {
  const score = row?.score_obtenu == null ? NaN : Number(row.score_obtenu);
  const max = Number(row?.score_max ?? 0);
  if (Number.isFinite(score) && Number.isFinite(max) && max > 0) {
    const s = Math.min(Math.max(score, 0), max);
    return Number(((s / max) * 20).toFixed(1));
  }
  if (row?.note_sur_20 == null) return null;
  const f = Number(row.note_sur_20);
  return Number.isFinite(f) ? Number(Math.min(Math.max(f, 0), 20).toFixed(1)) : null;
}

/** Note et statut d'une ligne déjà passée par attacherSourceUnique. */
export function noteExamenAffichee(row: any): NoteAffichee {
  const core = row?.__core;
  const mention = row?.__noteRecalculee ? MENTION_NOTE_RECALCULEE : null;
  if (core?.lectureImpossible) return { etat: "lecture_impossible", note20: null, source: null, mention: null };
  if (core) {
    const sc = coreStateScore(core);
    if (!sc) return { etat: "en_attente", note20: null, source: "noyau", mention: null };
    return { etat: "note", note20: Number(sc.noteSur20.toFixed(1)), source: "noyau", mention: null };
  }
  if (estExamenBlanc(row) && isQrcPendingCorrection(row?.details)) {
    return { etat: "en_attente", note20: null, source: "ancien", mention };
  }
  const n = noteAncienSur20(row);
  if (n == null) return { etat: "en_attente", note20: null, source: "ancien", mention };
  return { etat: "note", note20: n, source: "ancien", mention };
}

/**
 * Lignes NON publiées d'un écran de notes : chaque matière est jugée seule,
 * sur l'état serveur de son propre passage. Une matière à QRC encore non
 * corrigée ne masque jamais la note définitive d'une autre matière du même
 * examen ; une ligne sans état fiable (lecture impossible) reste masquée.
 * Lecture seule.
 */
export function idsResultatsNonPublies(rows: Array<{ id: string } & Record<string, any>>): Set<string> {
  const ids = new Set<string>();
  for (const row of rows) {
    if (noteExamenAffichee(row).etat === "lecture_impossible" || isExamAttemptPublicationPending([row])) ids.add(String(row.id));
  }
  return ids;
}

/**
 * Verdict « Réussi / Échoué » d'une matière, calculé sur la MÊME note que celle
 * affichée : note du passage V2 (seuil figé du passage, sinon règle de la
 * matière) ; sinon règle historique. null = aucun verdict (attente/lecture
 * impossible). Lecture seule, aucun recalcul enregistré.
 */
export function verdictMatiereAffiche(row: any): boolean | null {
  const n = noteExamenAffichee(row);
  if (n.etat !== "note") return null;
  if (n.source === "noyau") {
    const core = row?.__core;
    return computeReussiForResult({
      ...row,
      score_obtenu: n.note20,
      score_max: 20,
      details: {
        ...(row?.details || {}),
        qrc_pending_correction: false,
        ...(typeof core?.noteEliminatoire === "number"
          ? { snapshot: { ...(row?.details?.snapshot || {}), noteEliminatoire: core.noteEliminatoire } }
          : {}),
      },
    });
  }
  return computeReussiForResult(row);
}
