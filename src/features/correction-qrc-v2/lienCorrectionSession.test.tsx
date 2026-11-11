import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { NotesParSession } from './NotesParSession';
import { lienCorrectionSession } from './lienCorrectionSession';
import type { GroupeSessionCrm } from './noyauReel';
import type { ReleveSession } from './notesSession';
afterEach(cleanup);
it('conserve les variantes exactes, l’identité stable et toutes les tentatives sans date ni QRC inventée', () => {
  for (const id of ['EB1', 'EB1-TAXI']) {
    const url = new URL(lienCorrectionSession('crm:session', id, 'uuid-stable'), 'http://localhost');
    expect(url.pathname).toBe('/admin/correction-qrc-v2');
    expect(Object.fromEntries(url.searchParams)).toEqual({ qrc_groupe: 'crm:session', qrc_eb: `crm:session::${id}`, qrc_apprenant: 'uuid-stable', qrc_vue: 'corriger' });
  }
});
it('liens seulement sur attente concernée dans Tous et dans les matières de l’examen choisi', async () => {
  const sessions = [{ cle: 'crm:s', libelle: 'Session', debut: '2026-01-01', fin: '2027-12-31', typeSession: 'theorique' }] as GroupeSessionCrm[];
  const releve: ReleveSession = { inscrits: [{ id: 'v', nom: 'Même nom', prenom: 'Test', type_apprenant: 'vtc' }, { id: 't', nom: 'Même nom', prenom: 'Test', type_apprenant: 'taxi' }], examens: [{ id: 'EB1', numero: 1, filiere: 'VTC', matieres: [{ id: 'gestion', nom: 'Gestion' }] }, { id: 'EB1-TAXI', numero: 1, filiere: 'TAXI', matieres: [] }], notes: { v: { 1: { etat: 'attente', note: null } }, t: { 1: { etat: 'attente', note: null } } }, matieres: { v: { EB1: { gestion: { etat: 'attente', note: null } } } }, erreur: null };
  render(<NotesParSession sessions={sessions} charger={async () => releve} souscrire={() => () => {}} />);
  fireEvent.change(screen.getByRole('combobox', { name: 'Session du relevé' }), { target: { value: 'crm:s' } });
  await screen.findByRole('combobox', { name: 'Examen blanc' });
  expect(screen.getAllByRole('link')).toHaveLength(2);
  expect(screen.getAllByRole('link').map(a => a.getAttribute('href'))).toEqual([lienCorrectionSession('crm:s', 'EB1', 'v'), lienCorrectionSession('crm:s', 'EB1-TAXI', 't')]);
  fireEvent.change(screen.getByRole('combobox', { name: 'Examen blanc' }), { target: { value: 'EB1' } });
  expect(screen.getAllByRole('link')).toHaveLength(2);
  expect(screen.getByRole('link', { name: /Gestion.*nouvel onglet/ })).toHaveAttribute('href', lienCorrectionSession('crm:s', 'EB1', 'v'));
  expect(screen.getByRole('link', { name: /Gestion.*nouvel onglet/ })).toHaveAttribute('target', '_blank');
});