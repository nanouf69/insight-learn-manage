import { expect, it } from 'vitest';
import { noteDefinitiveManquante } from './noteDefinitiveManquante';
import type { ExamenNotesSession, InscritNotes, NoteSession } from './notesSession';
const inscrit: InscritNotes = { id: 'v', nom: 'Test', prenom: '', type_apprenant: 'vtc' };
const examen: ExamenNotesSession = { id: 'EB1', numero: 1, filiere: 'VTC', matieres: [] };
it('signale attente, non passé et résultat incomplet concernés', () => {
  for (const etat of ['attente', 'non_passe', 'incomplet'] as const)
    expect(noteDefinitiveManquante(inscrit, examen, { etat, note: null })).toBe(true);
});
it('un vrai zéro définitif ne manque pas', () => {
  expect(noteDefinitiveManquante(inscrit, examen, { etat: 'definitif', note: 0 })).toBe(false);
});
it('ne signale pas un examen TAXI pour un inscrit VTC ni un examen absent', () => {
  expect(noteDefinitiveManquante(inscrit, { ...examen, id: 'EB1-TAXI', filiere: 'TAXI' }, { etat: 'non_passe', note: null })).toBe(false);
  expect(noteDefinitiveManquante(inscrit, undefined, { etat: 'attente', note: null })).toBe(false);
});
it('ne confond pas lecture indisponible et absence prouvée de note', () => {
  expect(noteDefinitiveManquante(inscrit, examen, { etat: 'indisponible', note: null })).toBe(false);
  expect(noteDefinitiveManquante(inscrit, examen, undefined)).toBe(false);
});
it('dérive le repère du résultat actuel sans mémoriser l’attente', () => {
  let note: NoteSession = { etat: 'attente', note: null };
  expect(noteDefinitiveManquante(inscrit, examen, note)).toBe(true);
  note = { etat: 'definitif', note: 0 };
  expect(noteDefinitiveManquante(inscrit, examen, note)).toBe(false);
});