import { describe, expect, it } from 'vitest';
import fixture from './bilan-duplicate-browser/audited-bilan-fixture.json';
import { projeterExerciceBilanDepuisCours, retablirExercicesProjetesDuServeur } from '@/lib/bilanCoursSommeProjection';

describe.each([4, 9])('Bilan exercices %i : doublons tous médias et obligations indépendantes', moduleId => {
  it('exclut exactement les quatre couples avec illustration différente', () => {
    expect(fixture.pairs.filter(p => !p.allMediaIdentical).map(p => p.ids)).toEqual([[1026, 1051], [1054, 2068], [1056, 2069], [2070, 2083]]);
    expect(fixture.pairs.filter(p => p.allMediaIdentical).map(p => p.ids)).toEqual([[1066, 2077], [62031, 62050]]);
  });
  for (const [exerciseId, firstId, secondId, total] of [[100,1066,2077,122], [101,62031,62050,146]]) {
    it(`${exerciseId} : mêmes contenus sans images mais deux clés de réponses attendues`, () => {
      const exo = fixture.exercises.find(e => e.id === exerciseId);
      const a = exo?.questions.find(q => q.id === firstId);
      const b = exo?.questions.find(q => q.id === secondId);
      if (!exo || !a || !b) throw new Error('Couple audité absent');
      expect(a.enonce).toBe(b.enonce);
      expect(a.choix).toEqual(b.choix);
      expect(a.image ?? null).toBeNull(); expect(b.image ?? null).toBeNull();
      expect(exo.questions).toHaveLength(total);
      const answers = Object.fromEntries(exo.questions.filter(q => q.id !== secondId).map(q => [`${exo.id}-${q.id}`, 'B']));
      expect(answers[`${exo.id}-${firstId}`]).toBe('B');
      expect(answers[`${exo.id}-${secondId}`]).toBeUndefined();
      expect(exo.questions.filter(q => !answers[`${exo.id}-${q.id}`]).map(q => q.id)).toEqual([secondId]);
      // A hidden card does not satisfy its obligation; removing it from the exercise changes the denominator.
      expect(exo.questions.filter(q => q.id !== secondId)).toHaveLength(total - 1);
      expect(Object.keys(answers)).toHaveLength(total - 1);
    });
  }
  it('la projection et les sauvegardes conservent les deux identités et les dénominateurs', () => {
    const before = JSON.stringify(fixture.exercises);
    for (const exo of fixture.exercises) {
      const sources = [...new Set(exo.questions.map(q => q.source_exercice_id))].map(id => ({
        id, questions: exo.questions.filter(q => q.source_exercice_id === id).map(q => ({ ...q, id: q.source_question_id })),
      }));
      const projected = projeterExerciceBilanDepuisCours(exo, sources);
      expect(projected.map(q => q.id)).toEqual(exo.questions.map(q => q.id));
      expect(projected.length).toBe(exo.id === 100 ? 122 : 146);
      const restored = retablirExercicesProjetesDuServeur(moduleId, [{ ...exo, questions: projected.slice(0, -1) }], [exo]);
      expect(restored[0].questions).toBe(exo.questions);
    }
    expect(JSON.stringify(fixture.exercises)).toBe(before);
  });
});