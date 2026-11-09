// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { EXAMENS_BLANCS_VTC, EXAMENS_BLANCS_TAXI, EXAMENS_BLANCS_TA, EXAMENS_BLANCS_VA } from '@/components/cours-en-ligne/examens-blancs-data';
import { computeMatiereScoreForAttempt, computeResultatMatiereScore, computeMoyenneExamen } from '@/components/cours-en-ligne/examens-blancs-scoring';
import { verdictMatiereAffiche, noteExamenAffichee } from '@/lib/noteExamenAffichee';
import { isExamAttemptPublicationPending } from '@/components/cours-en-ligne/exam-helpers';

const exams = [...EXAMENS_BLANCS_VTC, ...EXAMENS_BLANCS_TAXI, ...EXAMENS_BLANCS_TA, ...EXAMENS_BLANCS_VA];
const row = (note: number, seuil: number, pending = false) => ({
  quiz_type: 'examen_blanc', score_obtenu: 5.5, score_max: 20, reussi: false,
  details: { snapshot: { noteEliminatoire: seuil }, qrc_pending_correction: true },
  __core: { note20: pending ? null : note, pending, noteEliminatoire: seuil },
});
describe('Zine DAKHLI — definitive V2 notes, never old G=5.5', () => {
  it('A15.5 B10 C7 D14 E11 F12.5 G6: 10.7, no elimination, card/detail/account agree', () => {
    const exam = EXAMENS_BLANCS_VTC.find(e => e.id === 'EB1');
    expect(exam).toBeDefined(); if (!exam) return;
    const notes = [15.5, 10, 7, 14, 11, 12.5, 6];
    const rows = notes.map((n,i) => row(n, exam.matieres[i].noteEliminatoire));
    const before = JSON.stringify(rows);
    for (let reload = 0; reload < 3; reload++) {
      for (const scoring of [computeMatiereScoreForAttempt, computeResultatMatiereScore]) {
        const b = computeMoyenneExamen(exam, m => scoring(m, rows[exam.matieres.indexOf(m)] as any));
        expect(b.moyenne).toBe(10.7); expect(b.verdict).toBe('reussi'); expect(b.eliminatoires).toEqual([]);
      }
      expect(rows.map(verdictMatiereAffiche)).toEqual(Array(7).fill(true));
      expect(noteExamenAffichee(rows[6]).note20).toBe(6);
    }
    expect(JSON.stringify(rows)).toBe(before);
  });
  it('G5.9 remains eliminatory even with average above 10', () => {
    const exam = EXAMENS_BLANCS_VTC.find(e => e.id === 'EB1'); if (!exam) throw new Error('EB1 missing');
    const b = computeMoyenneExamen(exam, m => computeMatiereScoreForAttempt(m, row(m.id === 'reglementation_vtc2' ? 5.9 : 15, m.noteEliminatoire) as any));
    expect(b.moyenne).toBeGreaterThan(10); expect(b.verdict).toBe('echoue'); expect(b.eliminatoires).toEqual(['G(V)']);
  });
});
describe('24 configured exams: card/detail/account per-subject parity', () => {
  it('covers exactly 24 configured EB and 112 subjects', () => {
    expect(exams).toHaveLength(24); expect(exams.reduce((n,e) => n + e.matieres.length, 0)).toBe(112);
  });
  for (const exam of exams) {
    it(`${exam.id}: pass, fail, pending and every subject threshold`, () => {
      for (const m of exam.matieres) {
        for (const n of [m.noteEliminatoire, m.noteEliminatoire - 0.1]) {
          const r = row(n, m.noteEliminatoire);
          const expected = n >= m.noteEliminatoire;
          expect(computeMatiereScoreForAttempt(m, r as any)?.admis).toBe(expected);
          expect(computeResultatMatiereScore(m, r as any)?.admis).toBe(expected);
          expect(verdictMatiereAffiche(r)).toBe(expected);
        }
      }
      for (const [n, expected] of [[14, 'reussi'], [2, 'echoue']] as const) {
        const b = computeMoyenneExamen(exam, m => computeMatiereScoreForAttempt(m, row(n, m.noteEliminatoire) as any));
        expect(b.verdict).toBe(expected);
      }
      const pending = exam.matieres.map(m => row(14,m.noteEliminatoire,true));
      expect(isExamAttemptPublicationPending(pending,exam)).toBe(true);
      expect(pending.map(verdictMatiereAffiche)).toEqual(Array(exam.matieres.length).fill(null));
    });
  }
});