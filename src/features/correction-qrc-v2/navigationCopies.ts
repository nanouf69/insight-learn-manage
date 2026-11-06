import type { QrcReelle, SessionReelle } from "./noyauReel";

export type DirectionCopie = -1 | 1;

/**
 * Navigation d'affichage entre les copies déjà filtrées par l'écran.
 * L'ordre des tentatives et l'identité des QRC ne sont jamais modifiés.
 */
export function copieVoisine(
  session: Pick<SessionReelle, "tentatives" | "qrc"> | null,
  selection: string | null,
  direction: DirectionCopie,
): QrcReelle | null {
  if (!session || !selection) return null;
  const courante = session.qrc.find((q) => q.qrc_instance_id === selection);
  const tentativeCourante = courante
    ? session.tentatives.find((t) => t.attempt_id === courante.attempt_id)
    : undefined;
  const questionCourante = tentativeCourante?.snapshot.questions.find((q) => q.id === courante?.question_id);
  if (!courante || !tentativeCourante || !questionCourante) return null;

  const matiere = questionCourante.matiere;
  const tentatives = session.tentatives.filter((t) =>
    (t.snapshot.matieres ?? []).some((m) => m.subject_id === matiere),
  );
  const index = tentatives.findIndex((t) => t.attempt_id === courante.attempt_id);
  if (index < 0) return null;

  for (let i = index + direction; i >= 0 && i < tentatives.length; i += direction) {
    const tentative = tentatives[i];
    const memeQuestion = session.qrc.find((q) =>
      q.attempt_id === tentative.attempt_id && q.question_id === courante.question_id,
    );
    if (memeQuestion) return memeQuestion;

    // Si cette question n'existe pas dans la copie voisine, rester dans la même
    // matière et prendre la première QRC réellement affichée dans son snapshot.
    for (const question of tentative.snapshot.questions ?? []) {
      if (question.matiere !== matiere || question.type !== "QRC") continue;
      const qrc = session.qrc.find((q) =>
        q.attempt_id === tentative.attempt_id && q.question_id === question.id,
      );
      if (qrc) return qrc;
    }
  }
  return null;
}
