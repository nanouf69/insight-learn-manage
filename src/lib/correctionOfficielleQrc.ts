/**
 * Note QRC officielle (correcteur / serveur) d'un passage du nouveau moteur.
 * Prioritaire sur toute correction déterministe ou ancienne fiche figée :
 * le détail par question doit afficher exactement la note validée.
 * Lecture seule — ne modifie aucune donnée.
 */
export interface QrcProof { questionId: string; etat: string; note: number | null; commentaire?: string | null }

export function correctionOfficielleQrc(
  core: { qrcProofs?: QrcProof[] } | null | undefined,
  matiereId: unknown,
  questionId: unknown,
  pts: number,
): { estCorrect: boolean; pointsObtenus: number; nombrefautes: number; explication: string } | null {
  const proofs = core && typeof core === "object" ? core.qrcProofs : undefined;
  if (!Array.isArray(proofs)) return null;
  const cle = `${String(matiereId)}:${String(questionId)}`;
  const p = proofs.find((x) => x.questionId === cle);
  if (!p || p.etat !== "corrigee" || p.note == null || !Number.isFinite(Number(p.note))) return null;
  const max = Math.max(Number(pts) || 0, 0);
  const note = Math.min(Math.max(Number(p.note), 0), max > 0 ? max : Number(p.note));
  return {
    estCorrect: max > 0 && note >= max,
    pointsObtenus: note,
    nombrefautes: 0,
    explication: [`Correction validée par le correcteur : ${note}/${max} pts`, p.commentaire].filter(Boolean).join("\n"),
  };
}
