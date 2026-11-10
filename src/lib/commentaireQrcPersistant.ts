export interface EvenementCommentaireQrc {
  correction_event_id: string | number;
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
    // Identifiant numérique (bigint renvoyé en nombre) : comparaison numérique, jamais lexicale (« 9 » > « 10 »).
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      || Number(b.correction_event_id) - Number(a.correction_event_id));
  const dernier = identiques[0];
  if (!dernier || dernier.note_nouvelle == null || qrc.note == null || Number(dernier.note_nouvelle) !== Number(qrc.note)) return null;
  return dernier.commentaire;
}