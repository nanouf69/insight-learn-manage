import { filiereInscrit, type ExamenNotesSession, type InscritNotes, type NoteSession } from './notesSession';

/** Display-only: unknown reads retain their unavailable status, not a missing-grade warning. */
export function noteDefinitiveManquante(inscrit: InscritNotes, examen: ExamenNotesSession | undefined, note: NoteSession | undefined) {
  return !!examen && filiereInscrit(inscrit.type_apprenant) === examen.filiere
    && (note?.etat === 'attente' || note?.etat === 'non_passe' || note?.etat === 'incomplet');
}