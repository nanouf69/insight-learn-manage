import { answersAreEqual } from "@/lib/answerPersistence";

const renseignee = (v: unknown) =>
  Array.isArray(v) ? v.length > 0 : typeof v === "string" ? v.trim() !== "" : v != null;

/**
 * Preuve stricte de la tentative V2 AFFICHÉE : même attempt_id, même apprenant,
 * même examen, même matière, et ensemble exact question_id → valeur identique
 * aux réponses à l'écran (aucune réponse manquante, différente ou en trop).
 * Lecture seule : ne décide jamais d'une écriture.
 */
export function tentativeNoyauConfirmee(params: {
  attemptIdAffiche: string | null | undefined;
  apprenantId: string;
  examenId: string;
  matiereId: string;
  tentative: { attempt_id?: string | null; apprenant_id?: string | null; exam_id?: string | null; snapshot?: any } | null | undefined;
  lignes: ReadonlyArray<{ question_id?: string | null; valeur?: unknown }> | null | undefined;
  reponses: Record<string, unknown> | null | undefined;
}): boolean {
  const { attemptIdAffiche, tentative, matiereId } = params;
  if (!attemptIdAffiche || !tentative || tentative.attempt_id !== attemptIdAffiche) return false;
  if (String(tentative.apprenant_id ?? "") !== params.apprenantId) return false;
  if (String(tentative.exam_id ?? "") !== params.examenId) return false;
  if (String(tentative.snapshot?.matiere ?? "") !== String(matiereId)) return false;
  const local = new Map(Object.entries(params.reponses ?? {}).filter(([, v]) => renseignee(v)));
  if (local.size === 0) return false;
  const serveur = new Map<string, unknown>();
  for (const l of params.lignes ?? []) {
    const brut = String(l?.question_id ?? "");
    if (!brut || !renseignee(l?.valeur)) continue;
    const id = brut.startsWith(`${matiereId}:`) ? brut.slice(String(matiereId).length + 1) : brut;
    if (serveur.has(id) && !answersAreEqual(serveur.get(id), l.valeur)) return false;
    serveur.set(id, l.valeur);
  }
  if (serveur.size !== local.size) return false;
  for (const [id, v] of local) {
    if (!serveur.has(id) || !answersAreEqual(serveur.get(id), v)) return false;
  }
  return true;
}
