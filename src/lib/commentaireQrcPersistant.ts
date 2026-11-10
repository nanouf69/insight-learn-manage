export interface EvenementCommentaireQrc {
  correction_event_id: string;
  qrc_instance_id: string;
  attempt_id: string;
  question_id: string;
  apprenant_id: string;
  note_nouvelle: number | null;
  commentaire: string | null;
  created_at: string;
}

/** Le journal n'est affichable que pour la même instance et la note actuellement enregistrée. */
export function commentaireQrcPersistant(events: EvenementCommentaireQrc[], qrc: {
  qrc_instance_id: string; attempt_id: string; question_id: string; apprenant_id: string; note: number | null;
}): string | null {
  const identiques = events.filter(e => e.qrc_instance_id === qrc.qrc_instance_id
    && e.attempt_id === qrc.attempt_id && e.question_id === qrc.question_id && e.apprenant_id === qrc.apprenant_id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.correction_event_id.localeCompare(a.correction_event_id));
  const dernier = identiques[0];
  if (!dernier || dernier.note_nouvelle == null || qrc.note == null || Number(dernier.note_nouvelle) !== Number(qrc.note)) return null;
  return dernier.commentaire;
}