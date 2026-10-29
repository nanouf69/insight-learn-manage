// Détection unique d'une question à réponse libre (QRC) côté élève.
// Le type est comparé sans tenir compte de la casse ("QRC" / "qrc"), et une
// question sans choix portant une réponse attendue (liste ou reponseQRC) est une QRC.
type QuestionLike = { type?: unknown; choix?: unknown; reponsesAttendues?: unknown; reponseQRC?: unknown } | null | undefined;

export function isQuestionQrc(q: QuestionLike): boolean {
  if (!q) return false;
  if (String(q.type ?? "").trim().toLowerCase() === "qrc") return true;
  const sansChoix = !Array.isArray(q.choix) || q.choix.length === 0;
  if (!sansChoix) return false;
  return qrcReponsesAttendues(q).length > 0;
}

/** Réponses attendues transmises à la correction, sans en inventer. */
export function qrcReponsesAttendues(q: QuestionLike): string[] {
  if (!q) return [];
  const liste = Array.isArray(q.reponsesAttendues)
    ? (q.reponsesAttendues as unknown[]).map((r) => String(r ?? "").trim()).filter(Boolean)
    : [];
  if (liste.length > 0) return liste;
  const unique = typeof q.reponseQRC === "string" ? q.reponseQRC.trim() : "";
  return unique ? [unique] : [];
}
