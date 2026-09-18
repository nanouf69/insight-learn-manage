// IDENTITÉ DE SYNCHRONISATION DES EXAMENS BLANCS
//
// RÈGLE ABSOLUE : le NUMÉRO de l'examen fait partie de l'identité d'une matière.
// Une matière de l'examen N°1 ne doit JAMAIS être synchronisée avec le N°2…N°6,
// même si elle porte le même identifiant technique (t3p, gestion, F(V), G(V)…).
//
// Synchronisation autorisée (même numéro uniquement) :
//   VTC N°x ↔ TAXI N°x  (matières communes A, B, C, D, E)
//   VTC N°x ↔ VA   N°x  (F(V), G(V))
//   TAXI N°x ↔ TA  N°x  (F(T), G(T))
//
// Interdit : VTC N°1 G(V) ≠ VTC N°4 G(V), TAXI N°2 F(T) ≠ TAXI N°5 F(T)…
//
// Ces fonctions sont PURES et en LECTURE SEULE.

export type ExamFiliere = "VTC" | "TAXI" | "TA" | "VA" | "BILAN" | "AUTRE";

export interface ExamIdentity {
  /** Numéro d'examen blanc (1..6), null pour les bilans / formats hors série. */
  numero: number | null;
  filiere: ExamFiliere;
  /** Clé de regroupement : seuls les examens partageant cette clé peuvent se synchroniser. */
  scope: string;
}

/**
 * Déduit numéro + filière depuis l'identifiant d'examen.
 * Identifiants connus : EB1..EB6, EB1-TAXI.., eb1-ta.., eb1-va.., bilan-*.
 */
export function getExamIdentity(examId: string): ExamIdentity {
  const raw = String(examId ?? "").trim();
  const id = raw.toLowerCase();

  if (id.startsWith("bilan")) {
    // Un bilan n'est jamais synchronisé avec un autre examen : scope propre.
    return { numero: null, filiere: "BILAN", scope: `bilan:${id}` };
  }

  const match = id.match(/^eb\s*(\d+)(?:[-_](taxi|ta|va))?$/);
  if (match) {
    const numero = Number(match[1]);
    const suffix = match[2];
    const filiere: ExamFiliere =
      suffix === "taxi" ? "TAXI" : suffix === "ta" ? "TA" : suffix === "va" ? "VA" : "VTC";
    return { numero, filiere, scope: `n${numero}` };
  }

  // Identifiant inconnu → isolé, aucune synchronisation possible.
  return { numero: null, filiere: "AUTRE", scope: `iso:${id}` };
}

/**
 * Clé d'identité d'une matière DANS son groupe de synchronisation.
 * = numéro d'examen + identifiant de matière (puis filière compatible implicite,
 * car les filières compatibles partagent le même identifiant de matière).
 */
export function getMatiereSyncKey(examId: string, matiereId: string): string {
  return `${getExamIdentity(examId).scope}::${String(matiereId ?? "")}`;
}

/** Deux examens peuvent-ils partager une matière ? (même numéro d'examen) */
export function canSyncExams(examIdA: string, examIdB: string): boolean {
  return getExamIdentity(examIdA).scope === getExamIdentity(examIdB).scope;
}

/**
 * Identité STABLE d'une question : examen + matière + question.
 * Une Q2 du N°1 et une Q2 du N°4 sont deux questions différentes.
 */
export function getQuestionIdentity(
  examId: string,
  matiereId: string,
  questionId: number | string,
): string {
  return `${getMatiereSyncKey(examId, matiereId)}::q${String(questionId ?? "")}`;
}
