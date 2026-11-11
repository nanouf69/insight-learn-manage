import { filiereInscrit, type ExamenNotesSession, type NoteSession, type ReleveSession } from './notesSession';

export function extremesNotesSession(releve: ReleveSession, examen: ExamenNotesSession) {
  const valeurs = releve.inscrits
    .filter(a => filiereInscrit(a.type_apprenant) === examen.filiere)
    .map(a => releve.notes[a.id]?.[examen.numero])
    .filter((n): n is NoteSession & { note: number } =>
      n?.etat === 'definitif' && typeof n.note === 'number' && Number.isFinite(n.note))
    .map(n => n.note);
  if (new Set(valeurs).size < 2) return null;
  return { basse: Math.min(...valeurs), meilleure: Math.max(...valeurs) };
}

export function rangNoteSession(note: NoteSession | undefined, extremes: ReturnType<typeof extremesNotesSession>) {
  if (!extremes || note?.etat !== 'definitif' || typeof note.note !== 'number') return null;
  if (note.note === extremes.meilleure) return 'meilleure';
  if (note.note === extremes.basse) return 'basse';
  return null;
}