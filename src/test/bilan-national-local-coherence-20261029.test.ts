// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { applyCanonicalRowsToSections } from '@/components/fournisseurs/canonical-quiz-sections';
import rows from './fixtures/bilan-examen-national-local-20261029.json';

const source = readFileSync('src/components/cours-en-ligne/ModuleDetailView.tsx', 'utf8');
const start = source.indexOf('const isAnswerCorrect = ');
const end = source.indexOf('\n    };', start);
if (start < 0 || end < 0) throw new Error('Scorer not found');
const ts = await import('typescript');
const compiled = ts.transpile(source.slice(start, end + 7), { target: ts.ScriptTarget.ES2020 });
const correct = new Function('getQuestionChoices', `${compiled};return isAnswerCorrect`)((q: { choix?: unknown[] }) => q.choix ?? []);

describe('TAXI/TA national and local canonical readback, 29 October', () => {
  for (const [sectionId, exerciseId, count] of [[605,605,84],[605,700,84],[606,606,40],[606,701,40]]) {
    it(`exercise ${exerciseId}: exact IDs, order, statements, choices and explanation`, () => {
      const active = rows.filter(r => r.section_id === sectionId && r.active).sort((a,b) => a.position-b.position || a.legacy_question_id-b.legacy_question_id);
      const before = JSON.stringify(active);
      const result = applyCanonicalRowsToSections([{id:exerciseId,titre:'Bilan',questions:[]}], active.map(r => ({...r,section_id:exerciseId})));
      const questions = result[0].questions ?? [];
      expect(questions.length).toBe(count);
      expect(questions.map(q => q.id)).toEqual(active.map(r => r.legacy_question_id));
      expect(questions.map(q => q.enonce)).toEqual(active.map(r => r.enonce));
      expect(questions.map(q => q.choix)).toEqual(active.map(r => r.choix));
      expect(new Set(questions.map(q => q.id)).size).toBe(count);
      expect(JSON.stringify(active)).toBe(before);
    });
  }
  for (const [id, key] of [[49,'B'],[68,'A'],[70,'D']] as const) {
    it(`national Q${id} accepts exactly approved ${key}`, () => {
      const q = rows.find(r => r.section_id===605 && r.legacy_question_id===id);
      if (!q) throw new Error(`Missing Q${id}`);
      expect(q.choix.filter(c=>c.correct).map(c=>c.lettre).join('')).toBe(key);
      for (let mask=0;mask<2**q.choix.length;mask++) {
        const letters=q.choix.filter((_,i)=>mask & (1<<i)).map(c=>c.lettre);
        expect(correct(letters,q)).toBe(letters.join('')===key);
      }
    });
  }
  it('inactive fictitious Q73 is absent from future lists, distinct from display numbering', () => {
    const q=rows.find(r=>r.section_id===605 && r.legacy_question_id===73);
    expect(q?.active).toBe(false);
    expect(rows.filter(r=>r.active && r.section_id===605).some(r=>r.legacy_question_id===73)).toBe(false);
  });
  for (const q of rows.filter(r=>r.active)) {
    it(`${q.section_id}/${q.legacy_question_id}: exact-set scoring for every answer combination`, () => {
      const expected=q.choix.filter(c=>c.correct).map(c=>c.lettre).sort();
      expect(expected.length).toBeGreaterThan(0);
      for (let mask=0;mask<2**q.choix.length;mask++) {
        const letters=q.choix.filter((_,i)=>mask & (1<<i)).map(c=>c.lettre).sort();
        expect(correct(letters,q)).toBe(JSON.stringify(letters)===JSON.stringify(expected));
      }
    });
  }
});