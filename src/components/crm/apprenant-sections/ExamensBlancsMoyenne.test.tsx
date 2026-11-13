// @vitest-environment jsdom
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const h = vi.hoisted(() => ({ tick: 0, oldNote: 8.5, selectedNote: 2, reads: 0 }));
const subjects = [['t3p', 3, 0], ['gestion', 2, 13], ['securite', 3, 14], ['francais', 2, 9.5], ['anglais', 1, 9], ['reglementation_taxi', 3, 14], ['reglementation_taxi2', 3, 18]] as const;
const exam = { id: 'EB3-TAXI', matieres: subjects.map(([id, coefficient]) => ({ id, nom: id, coefficient, noteEliminatoire: id === 'anglais' ? 4 : 6, noteSur: 20, questions: [] })) };
function fixture() {
  return [{ id: 'old', apprenant_id: 'fixture', quiz_id: 'EB3-TAXI', matiere_id: 't3p', matiere_nom: 't3p', quiz_type: 'examen_blanc', tentative: 1, score_obtenu: 8.5, score_max: 20, completed_at: '2026-11-01T17:15:42Z', details: { questions: [{id: 1, type: 'QRC'}], reponses: {1: 'ancienne réponse'}, qrc_pending_correction: true } }, ...subjects.map(([id, , note]) => ({id, apprenant_id: 'fixture', quiz_id: 'EB3-TAXI', matiere_id: id, matiere_nom: id, quiz_type: 'examen_blanc', tentative: 2, score_obtenu: note, score_max: 20, completed_at: '2026-11-09T20:21:19Z', details: { questions: id === 'securite' ? [] : [{ id: 1, type: 'QRC' }], reponses: {1: 'réponse actuelle'}, qrc_pending_correction: id !== 'securite' } }))];
}
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: (table: string) => {
  const result = {data: table === 'apprenant_quiz_results' ? fixture() : [], error: null};
  const q: any = { select: () => q, eq: () => q, in: () => q, order: () => q, range: () => q, like: () => q, then: (resolve: any) => Promise.resolve(result).then(resolve) }; return q;
} } }));
vi.mock('@/components/cours-en-ligne/useLiveExamens', () => ({ useLiveExamens: () => ({examens: [exam]}), fetchLiveExamens: async () => [exam] }));
vi.mock('@/hooks/useCoreChangeTick', () => ({ useCoreChangeTick: () => h.tick }));
vi.mock('@/lib/coreExamPublication', async importOriginal => {
  const original = await importOriginal<typeof import('@/lib/coreExamPublication')>();
  return {...original, fetchCoreMatiereStates: async () => {
    h.reads++;
    return fixture().filter(r => r.matiere_id !== 'securite').map(r => ({ attemptId: `copy-${r.id}`, resultId: r.id, apprenantId: r.apprenant_id, examId: r.quiz_id, matiereId: r.matiere_id, tentative: r.tentative, finishedAt: r.completed_at, historicalDetails: structuredClone(r.details), note20: r.id === 'old' ? h.oldNote : r.id === 't3p' ? h.selectedNote : r.score_obtenu, pending: false, status: 'definitif', qrcTotal: 1, qrcRestantes: 0, qrcProofs: [{questionId: `${r.matiere_id}:1`, reponse: r.details.reponses[1], etat: 'corrigee', note: 1}] }));
  }};
});
vi.mock('@/lib/passagesV2NonFiables', async importOriginal => ({...await importOriginal<typeof import('@/lib/passagesV2NonFiables')>(), fetchPassagesV2NonFiables: async () => new Set()}));
vi.mock('./ResetMatiereAdminButton', () => ({ResetMatiereAdminButton: () => null}));
vi.mock('./HistoriqueCopiesMatiere', () => ({ default: () => null }));
import ExamensBlancsResetTab from './ExamensBlancsResetTab';
afterEach(() => { cleanup(); h.tick = 0; h.oldNote = 8.5; h.selectedNote = 2; h.reads = 0; });
describe('CRM Examen blanc — moyenne projetée du même passage', () => {
  it('lit 2 V2, correction tardive première copie sans substitution, recalcul après événement de la seconde', async () => {
    const client = new QueryClient({defaultOptions: {queries: {retry: false}}});
    const ui = () => <QueryClientProvider client={client}><ExamensBlancsResetTab apprenant={{id:'fixture',nom:'FICTIF',prenom:'Test'}}/></QueryClientProvider>;
    const view = render(ui());
    await screen.findByText('Note : 11.6/20');
    h.oldNote = 13; h.tick++; view.rerender(ui());
    await waitFor(() => expect(h.reads).toBe(2));
    expect(screen.getByText('Note : 11.6/20')).toBeTruthy();
    h.selectedNote = 5; h.tick++; view.rerender(ui());
    await screen.findByText('Note : 12.2/20');
    expect(h.reads).toBe(3);
    expect(fixture().find(r => r.id === 't3p')?.score_obtenu).toBe(0);
    client.clear();
  });
});