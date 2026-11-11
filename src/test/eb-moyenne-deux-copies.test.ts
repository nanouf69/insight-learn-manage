/** @vitest-environment node */
import { describe, expect, it, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import { lignesExamenAffichees } from '@/lib/ebLignesAffichees';
import { attacherSourceUnique, noteExamenAffichee } from '@/lib/noteExamenAffichee';
import { computeMatiereScoreForAttempt, computeMoyenneExamen } from '@/components/cours-en-ligne/examens-blancs-scoring';
import { isExamAttemptPublicationPending } from '@/components/cours-en-ligne/exam-helpers';
import type { CoreMatiereState } from '@/lib/coreExamPublication';

const subjects = [
  ['t3p', 3, 2], ['gestion', 2, 13], ['securite', 3, 14],
  ['francais', 2, 9.5], ['anglais', 1, 9], ['reglementation_taxi', 3, 14], ['reglementation_taxi2', 3, 18],
] as const;
const exam = { id: 'EB3-TAXI', matieres: subjects.map(([id, coefficient]) => ({
  id, nom: id, coefficient, noteSur: 20, noteEliminatoire: id === 'anglais' ? 4 : 6, questions: [],
})) } as any;
const row = (id: string, tentative: number, note: number, date: string): any => ({
  id: `${id}-${tentative}`, apprenant_id: 'fiction', quiz_id: exam.id, quiz_type: 'examen_blanc',
  matiere_id: id, matiere_nom: id, tentative, completed_at: date,
  score_obtenu: note, score_max: 20, note_sur_20: note,
  details: { qrc_pending_correction: id !== 'securite', questions: id === 'securite' ? [] : [{ id: 1, type: 'QRC', enonce: 'Question fictive' }], reponses: { 1: `réponse ${tentative}` } },
});
const rows = () => [row('t3p', 1, 8.5, '2026-11-01T17:15:42Z'),
  ...subjects.map(([id, , note]) => row(id, 2, id === 't3p' ? 0 : note, '2026-11-09T20:21:19Z'))];
function states(list: any[]): CoreMatiereState[] {
  return list.filter(r => r.matiere_id !== 'securite').map(r => ({
    attemptId: `copy-${r.id}`, resultId: r.id, apprenantId: r.apprenant_id,
    examId: r.quiz_id, matiereId: r.matiere_id, tentative: r.tentative, finishedAt: r.completed_at,
    historicalDetails: structuredClone(r.details), note20: r.matiere_id === 't3p' ? (r.tentative === 1 ? 13 : 2) : r.note_sur_20,
    status: 'definitif', pending: false, qrcTotal: 1, qrcRestantes: 0,
    qrcProofs: [{ questionId: `${r.matiere_id}:1`, reponse: r.details.reponses[1], etat: 'corrigee', note: 1 }],
  }));
}
function project(list: any[], core: CoreMatiereState[] | null) {
  return lignesExamenAffichees(list, []).map(r => attacherSourceUnique(r, core, new Set()));
}
function average(list: any[]) {
  return computeMoyenneExamen(exam, m => computeMatiereScoreForAttempt(m, list.find(r => r.matiere_id === m.id)));
}
describe('Deux copies indépendantes, moyenne EB3 TAXI', () => {
  it('retient t2 09/11, pas t1 corrigée plus tard à 13', () => {
    const list = rows(); list[0].updated_at = '2026-11-11T13:04:52Z';
    const selected = project(list, states(list));
    expect(selected.find(r => r.matiere_id === 't3p')?.id).toBe('t3p-2');
    expect(noteExamenAffichee(selected.find(r => r.matiere_id === 't3p')).note20).toBe(2);
    expect(average(selected).moyenne).toBe(11.6);
    expect(average(selected).totalCoef).toBe(17);
    expect(average(selected).eliminatoires).toEqual(['t3p']);
  });
  it('13 donne 13.6 uniquement si première copie explicitement calculée en simulation', () => {
    const list = rows(); const core = states(list);
    const selected = project(list, core).filter(r => r.matiere_id !== 't3p');
    selected.push(attacherSourceUnique(list[0], core, new Set()));
    expect(average(selected).moyenne).toBe(13.6);
    expect(average(selected).admisGlobal).toBe(true);
    expect(33 / 17).toBeCloseTo(1.9411764705882353);
  });
  it('correction rétroactive t1 et relecture ne changent ni sélection ni moyenne t2', () => {
    const list = rows(); const before = states(list); const after = structuredClone(before);
    before[0].note20 = 8.5; after[0].note20 = 13;
    expect(average(project(list, before)).moyenne).toBe(11.6);
    expect(average(project(JSON.parse(JSON.stringify(list)), after)).moyenne).toBe(11.6);
    expect(noteExamenAffichee(attacherSourceUnique(list[0], after, new Set())).note20).toBe(13);
    expect(list.find(r => r.id === 't3p-2')?.score_obtenu).toBe(0);
  });
  it('une correction de la copie sélectionnée recalcule la moyenne en mémoire', () => {
    const list = rows(); const core = states(list);
    const selected = core.find(c => c.resultId === 't3p-2');
    if (!selected) throw new Error('fixture manquante');
    selected.note20 = 5;
    expect(average(project(list, core)).moyenne).toBe(12.2);
    expect(list.find(r => r.id === 't3p-2')?.note_sur_20).toBe(0);
  });
  it('pas de note empruntée à une autre copie/examen/élève et lecture impossible reste en attente', () => {
    const list = rows(); const core = states(list);
    expect(noteExamenAffichee(attacherSourceUnique({ ...list[1], apprenant_id: 'autre' }, core, new Set())).note20).toBeNull();
    expect(noteExamenAffichee(attacherSourceUnique({ ...list[1], quiz_id: 'EB2-TAXI' }, core, new Set())).note20).toBeNull();
    expect(isExamAttemptPublicationPending(project(list, null), exam)).toBe(true);
  });
  it('sans V2, notes legacy en attente non promues en notes définitives', () => {
    const list = rows();
    expect(isExamAttemptPublicationPending(project(list, []), exam)).toBe(true);
    expect(noteExamenAffichee(project(list, [])[0]).etat).toBe('en_attente');
  });
});