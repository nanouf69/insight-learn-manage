import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { NotesParSession } from './NotesParSession';
import type { ReleveSession } from './notesSession';
import type { GroupeSessionCrm } from './noyauReel';

afterEach(cleanup);
const sessions = ['s1', 's2'].map(id => ({ cle: `crm:${id}`, libelle: id, type: 'crm', typeSession: 'theorique', debut: '2026-01-01', fin: '2027-12-31', examens: [] })) as unknown as GroupeSessionCrm[];
function relevé(definitive = false): ReleveSession {
  return { inscrits: ['A', 'B'].map(id => ({ id, nom: id, prenom: 'Test', type_apprenant: 'vtc' })), examens: [{ id: 'EB1', numero: 1, filiere: 'VTC', matieres: [] }], notes: { A: { 1: definitive ? { etat: 'definitif', note: 0 } : { etat: 'attente', note: null } }, B: { 1: { etat: 'non_passe', note: null } } }, erreur: null };
}
async function choisir() {
  fireEvent.change(screen.getByRole('combobox', { name: 'Session du relevé' }), { target: { value: 'crm:s1' } });
  await screen.findByRole('combobox', { name: 'Examen blanc' });
  fireEvent.change(screen.getByRole('combobox', { name: 'Examen blanc' }), { target: { value: 'EB1' } });
}
it('signal de validation : retire le premier cadre, conserve l’autre et le filtre sans rechargement manuel', async () => {
  let signal = () => {};
  const charger = vi.fn().mockResolvedValueOnce(relevé()).mockResolvedValue(relevé(true));
  const souscrire = vi.fn((ids: string[], cb: () => void) => { expect(ids).toEqual(['A', 'B']); signal = cb; return vi.fn(); });
  render(<NotesParSession sessions={sessions} charger={charger} souscrire={souscrire} />);
  await choisir();
  expect(screen.getAllByText('Note définitive manquante')).toHaveLength(2);
  act(() => signal());
  await waitFor(() => expect(screen.getAllByText('Note définitive manquante')).toHaveLength(1));
  expect(screen.getByRole('combobox', { name: 'Examen blanc' })).toHaveValue('EB1');
  const a = screen.getByRole('link', { name: 'Ouvrir la fiche CRM de A Test (nouvel onglet)' }).closest('th');
  if(!a)throw new Error('Cellule apprenant absente');
  expect(within(a).queryByText('Note définitive manquante')).toBeNull();
  const b=screen.getByRole('link',{name:'Ouvrir la fiche CRM de B Test (nouvel onglet)'}).closest('th');
  if(!b)throw new Error('Cellule apprenant absente');
  expect(within(b).getByText('Note définitive manquante')).toBeInTheDocument();
  expect(screen.getByRole('table')).toHaveTextContent('0 /20');
  expect(charger.mock.calls).toEqual([['s1'], ['s1']]);
});
it('rafraîchissement en erreur : conserve les derniers résultats et le filtre, puis reprend au retour visible', async () => {
  let signal = () => {};
  const charger = vi.fn().mockResolvedValueOnce(relevé()).mockResolvedValueOnce({ ...relevé(true), erreur: 'Erreur transitoire' }).mockResolvedValue(relevé(true));
  render(<NotesParSession sessions={sessions} charger={charger} souscrire={(_, cb) => { signal = cb; return () => {}; }} />);
  await choisir();
  act(() => signal());
  await screen.findByRole('alert');
  expect(screen.getAllByText('Note définitive manquante')).toHaveLength(2);
  expect(screen.getByRole('combobox', { name: 'Examen blanc' })).toHaveValue('EB1');
  fireEvent(document, new Event('visibilitychange'));
  await waitFor(() => expect(screen.getAllByText('Note définitive manquante')).toHaveLength(1));
  expect(screen.queryByRole('alert')).toBeNull();
});
it('sérialise les relectures et ignore une réponse de l’ancienne session', async () => {
  let signal = () => {};
  let terminer: (r: ReleveSession) => void = () => {};
  const attente = new Promise<ReleveSession>(resolve => { terminer = resolve; });
  const charger = vi.fn().mockResolvedValueOnce(relevé()).mockReturnValueOnce(attente).mockResolvedValue({ ...relevé(), inscrits: [], notes: {} });
  render(<NotesParSession sessions={sessions} charger={charger} souscrire={(_, cb) => { signal = cb; return () => {}; }} />);
  await choisir();
  act(() => signal());
  await waitFor(() => expect(charger).toHaveBeenCalledTimes(2));
  act(() => { signal(); signal(); });
  fireEvent.change(screen.getByRole('combobox', { name: 'Session du relevé' }), { target: { value: 'crm:s2' } });
  expect(charger).toHaveBeenCalledTimes(2);
  await act(async () => terminer(relevé(true)));
  await screen.findByText('Aucun inscrit — Aucune note définitive (0/0).');
  expect(screen.queryByRole('link', { name: 'Ouvrir la fiche CRM de A Test (nouvel onglet)' })).toBeNull();
  expect(charger.mock.calls).toEqual([['s1'], ['s1'], ['s2']]);
});it('bouton Actualiser : relit notes et émargement, garde examen et date, une seule lecture à la fois, dernier relevé conservé en erreur', async () => {
  let finir: (r: ReleveSession) => void = () => {};
  const charger = vi.fn().mockResolvedValueOnce(relevé())
    .mockReturnValueOnce(new Promise<ReleveSession>(r => { finir = r; }))
    .mockResolvedValue({ ...relevé(true), erreur: 'Erreur transitoire' });
  const chargerAbsences = vi.fn().mockResolvedValue(new Map());
  render(<NotesParSession sessions={sessions} charger={charger} souscrire={() => () => {}} chargerAbsences={chargerAbsences} />);
  await choisir();
  fireEvent.change(screen.getByLabelText("Date de l'examen"), { target: { value: '2026-11-11' } });
  await waitFor(() => expect(chargerAbsences).toHaveBeenCalledTimes(1));
  const bouton = screen.getByRole('button', { name: 'Actualiser' });
  fireEvent.click(bouton);
  const enCours = await screen.findByRole('button', { name: 'Actualisation…' });
  expect(enCours).toBeDisabled();
  fireEvent.click(enCours);
  expect(charger).toHaveBeenCalledTimes(2);
  await waitFor(() => expect(chargerAbsences).toHaveBeenCalledTimes(2));
  expect(chargerAbsences).toHaveBeenLastCalledWith('s1', '2026-11-11');
  await act(async () => finir(relevé(true)));
  await screen.findByRole('button', { name: 'Actualiser' });
  expect(screen.getAllByText('Note définitive manquante')).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'Actualiser' }));
  await screen.findByRole('alert');
  expect(screen.getAllByText('Note définitive manquante')).toHaveLength(1);
  expect(screen.getByRole('combobox', { name: 'Examen blanc' })).toHaveValue('EB1');
  expect(screen.getByLabelText("Date de l'examen")).toHaveValue('2026-11-11');
});
