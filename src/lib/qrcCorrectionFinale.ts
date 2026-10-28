// Correction IA des QRC déclenchée UNE SEULE FOIS à la validation finale d'un quiz e-learning.
// Logique pure (testée) : quelles QRC corriger, état global, note affichée.

export type QrcResultat =
  | { estCorrect: boolean; pointsObtenus: number; explication: string; indisponible?: boolean }
  | { indisponible: true; estCorrect?: undefined; pointsObtenus?: undefined; explication?: undefined }
  | "loading";

export const estQuestionQrc = (q: any): boolean =>
  q?.type === "qrc" || (Array.isArray(q?.choix) && q.choix.length === 0 && !!q?.reponsesAttendues);

/** Réponse texte de l'élève (saisie en cours prioritaire, sinon réponse enregistrée). */
export const reponseQrc = (key: string, qrcAnswers: Record<string, string>, selected: Record<string, any>): string => {
  const v = qrcAnswers[key] ?? (typeof selected[key] === "string" ? selected[key] : "");
  return String(v ?? "").trim();
};

/** QRC répondues sans aucun résultat (ni en cours, ni corrigée, ni en échec) : à corriger. */
export function qrcACorriger(
  exoId: number | string,
  questions: any[],
  qrcAnswers: Record<string, string>,
  selected: Record<string, any>,
  results: Record<string, QrcResultat | undefined>,
): string[] {
  return questions
    .filter(estQuestionQrc)
    .map((q) => `${exoId}-${q.id}`)
    .filter((k) => reponseQrc(k, qrcAnswers, selected).length > 0 && results[k] === undefined);
}

export type EtatCorrection = "aucune" | "en_cours" | "echec" | "terminee";

/** État global : note définitive affichable uniquement si "aucune" ou "terminee". */
export function etatCorrectionQrc(
  exoId: number | string,
  questions: any[],
  qrcAnswers: Record<string, string>,
  selected: Record<string, any>,
  results: Record<string, QrcResultat | undefined>,
): EtatCorrection {
  const keys = questions
    .filter(estQuestionQrc)
    .map((q) => `${exoId}-${q.id}`)
    .filter((k) => reponseQrc(k, qrcAnswers, selected).length > 0);
  if (keys.length === 0) return "aucune";
  let echec = false;
  for (const k of keys) {
    const r = results[k];
    if (r === undefined || r === "loading") return "en_cours";
    if (r.indisponible) echec = true;
  }
  return echec ? "echec" : "terminee";
}

/** Barème existant : 1 point par question juste. Une QRC compte juste si l'IA la juge correcte. */
export function pointsAvecQrc(
  exoId: number | string,
  questions: any[],
  results: Record<string, QrcResultat | undefined>,
  isQcmCorrect: (q: any) => boolean,
): number {
  return questions.filter((q) => {
    if (estQuestionQrc(q)) {
      const r = results[`${exoId}-${q.id}`];
      return !!r && r !== "loading" && !r.indisponible && r.estCorrect === true;
    }
    return isQcmCorrect(q);
  }).length;
}

/** Réponse IA valide (sinon : échec technique, jamais une note zéro). */
export const resultatIaValide = (d: any): boolean =>
  !!d && typeof d === "object" && typeof d.estCorrect === "boolean" && typeof d.pointsObtenus === "number";

/** Seuls 429 / 5xx / réseau sont retentés (2 fois max). */
export const echecRetentable = (status: number | undefined): boolean =>
  status === undefined || status === 429 || status >= 500;

export const cleCacheQrc = (apprenantId: string, key: string, reponse: string): string => {
  let h = 0;
  for (let i = 0; i < reponse.length; i++) h = (h * 31 + reponse.charCodeAt(i)) | 0;
  return `qrc-ia-finale:${apprenantId}:${key}:${h}`;
};
