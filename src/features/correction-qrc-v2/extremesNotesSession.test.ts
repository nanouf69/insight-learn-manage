import { expect, it } from 'vitest';
import { extremesNotesSession, rangNoteSession } from './extremesNotesSession';
import type { ExamenNotesSession, NoteSession, ReleveSession } from './notesSession';
const examen: ExamenNotesSession = { id: 'EB1', numero: 1, filiere: 'VTC', matieres: [] };
const definitive = (note: number): NoteSession => ({ etat: 'definitif', note });
function fixture(notes: NoteSession[]): ReleveSession {
  return { inscrits: notes.map((_, i) => ({ id: String(i), nom: 'Test', prenom: '', type_apprenant: 'vtc' })), notes: Object.fromEntries(notes.map((n, i) => [String(i), { 1: n }])), erreur: null };
}
it('inclut le vrai zéro et laisse les valeurs intermédiaires neutres', () => {
  const extremes = extremesNotesSession(fixture([definitive(0), definitive(10), definitive(18)]), examen);
  expect(extremes).toEqual({ basse: 0, meilleure: 18 });
  expect(rangNoteSession(definitive(0), extremes)).toBe('basse');
  expect(rangNoteSession(definitive(18), extremes)).toBe('meilleure');
  expect(rangNoteSession(definitive(10), extremes)).toBeNull();
});
it('marque tous les ex æquo aux deux extrêmes', () => {
  const notes = [0, 0, 12, 20, 20].map(definitive);
  const extremes = extremesNotesSession(fixture(notes), examen);
  expect(notes.map(n => rangNoteSession(n, extremes))).toEqual(['basse', 'basse', null, 'meilleure', 'meilleure']);
});
it('une seule valeur distincte ou aucune note reste neutre', () => {
  for (const notes of [[], [definitive(0)], [definitive(12), definitive(12)]]) {
    expect(extremesNotesSession(fixture(notes), examen)).toBeNull();
  }
});
it('exclut provisoires, non passés, lectures indisponibles et non vérifiables', () => {
  const notes: NoteSession[] = [definitive(8), definitive(12), { etat: 'attente', note: 20 }, { etat: 'non_passe', note: 0 }, { etat: 'indisponible', note: 0 }, definitive(NaN)];
  const extremes = extremesNotesSession(fixture(notes), examen);
  expect(extremes).toEqual({ basse: 8, meilleure: 12 });
  expect(rangNoteSession(notes[2], extremes)).toBeNull();
});
it('isole les filières et les numéros d’examen', () => {
  const releve = fixture([definitive(8), definitive(12), definitive(20)]);
  releve.inscrits[2].type_apprenant = 'taxi';
  releve.notes['0'][2] = definitive(19);
  releve.notes['1'][2] = definitive(2);
  expect(extremesNotesSession(releve, examen)).toEqual({ basse: 8, meilleure: 12 });
  expect(extremesNotesSession(releve, { ...examen, id: 'EB1-TAXI', filiere: 'TAXI' })).toBeNull();
  expect(extremesNotesSession(releve, { ...examen, id: 'EB2', numero: 2 })).toEqual({ basse: 2, meilleure: 19 });
});