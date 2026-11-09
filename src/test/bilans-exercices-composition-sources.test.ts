// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { VTC_COURS_DATA } from '@/components/cours-en-ligne/vtc-cours-data';
import { TAXI_COURS_DATA } from '@/components/cours-en-ligne/taxi-cours-data';
import { BILAN_EXERCICES_FC_TAXI } from '@/components/cours-en-ligne/bilan-exercices-fc-taxi-data';
import { BILAN_EXERCICES_VTC } from '@/components/cours-en-ligne/bilan-exercices-vtc-data';
import {
  BILAN_SOMME_COURS_SOURCES,
  projectionSommeCoursActive,
  projeterBilanDepuisCours,
  projeterExerciceBilanDepuisCours,
  retablirExercicesProjetesDuServeur,
} from '@/lib/bilanCoursSommeProjection';

const ATTENDUS: Record<number, Record<number, number>> = {
  4: { 100: 128, 101: 94, 102: 211, 103: 103, 104: 66, 105: 126, 106: 35 },
  9: { 100: 128, 101: 94, 102: 211, 103: 103, 105: 126, 203: 99, 204: 114 },
  27: { 250: 99, 251: 114 },
  29: { 103: 103, 104: 66, 105: 126, 106: 35 },
  81: { 100: 128, 102: 211, 104: 66, 106: 35 },
  82: { 100: 128, 102: 211, 203: 99, 204: 114 },
};

const sourcesPour = (moduleId: number, exerciceId: number) => {
  const config = BILAN_SOMME_COURS_SOURCES[moduleId];
  const cours = config.moduleCours === 2 ? VTC_COURS_DATA : TAXI_COURS_DATA;
  return config.correspondances[exerciceId].map((id) => {
    const source = cours.exercices.find((exo) => Number(exo.id) === id);
    if (!source) throw new Error(`Source ${id} absente`);
    return source;
  });
};

describe('Tous les bilans d’exercices = somme exacte de leurs sources', () => {
  for (const [moduleTexte, attendus] of Object.entries(ATTENDUS)) {
    const moduleId = Number(moduleTexte);
    for (const [exoTexte, attendu] of Object.entries(attendus)) {
      const exerciceId = Number(exoTexte);
      it(`module ${moduleId} / exercice ${exerciceId} : ${attendu} questions, ordre et identités préservés`, () => {
        const sources = sourcesPour(moduleId, exerciceId);
        const cles = sources.flatMap((exo) => exo.questions.map((q) => `${exo.id}:${q.id}`));
        expect(cles).toHaveLength(attendu);
        expect(new Set(cles).size).toBe(attendu);

        let id = 10000;
        const historiques = sources.flatMap((exo) => exo.questions.map((q) => ({
          id: id++, enonce: `Libellé historique conservé ${id}`,
          choix: [{ lettre: 'A', texte: `Choix historique ${id}`, correct: true }],
          source_exercice_id: Number(exo.id), source_question_id: Number(q.id),
        })));
        const exerciceServeur = { id: exerciceId, questions: historiques };
        const horsPerimetre = { id: 999999, questions: [{ id: 1, enonce: 'Intact' }] };
        const avant = JSON.stringify([exerciceServeur, horsPerimetre, sources]);

        const resultat = projeterBilanDepuisCours(
          moduleId, [exerciceServeur, horsPerimetre] as any, sources as any,
          { preserverContenuExistant: true },
        );
        const questions = resultat[0].questions!;
        expect(questions).toHaveLength(attendu);
        expect(questions.map((q) => `${q.source_exercice_id}:${q.source_question_id}`)).toEqual(cles);
        expect(questions.map((q) => q.id)).toEqual(historiques.map((q) => q.id));
        expect(questions.map((q) => q.enonce)).toEqual(historiques.map((q) => q.enonce));
        expect(questions.map((q) => q.choix)).toEqual(historiques.map((q) => q.choix));
        expect(new Set(questions.map((q) => q.id)).size).toBe(attendu);
        expect(resultat[1]).toBe(horsPerimetre);
        expect(JSON.stringify([exerciceServeur, horsPerimetre, sources])).toBe(avant);

        const restaure = retablirExercicesProjetesDuServeur(moduleId, resultat as any, [exerciceServeur, horsPerimetre] as any);
        expect(restaure[0].questions).toBe(exerciceServeur.questions);
        expect(restaure[1]).toBe(horsPerimetre);
      });
    }
  }

  it('Sécurité conserve les 211 questions sources même avec 46 doublons d’énoncés', () => {
    const sources = sourcesPour(4, 102);
    const enonces = sources.flatMap((exo) => exo.questions.map((q) => q.enonce.trim().toLowerCase().replace(/\s+/g, ' ')));
    expect(enonces).toHaveLength(211);
    expect(new Set(enonces).size).toBe(165);
  });

  it('une question source sans historique garde un ID déterministe malgré le réordonnancement', () => {
    const source = sourcesPour(4, 106)[0];
    const historiques = source.questions.slice(1).map((q, index) => ({
      id: 5000 + index, enonce: q.enonce,
      source_exercice_id: 72, source_question_id: Number(q.id),
    }));
    const projection = (questions: typeof source.questions) => projeterExerciceBilanDepuisCours(
      { id: 106, questions: historiques } as any,
      [{ ...source, questions }] as any,
      { preserverContenuExistant: true },
    );
    const premiere = projection(source.questions)[0];
    const reordonne = projection([...source.questions].reverse()).find((q) => q.source_question_id === 1)!;
    expect(premiere.id).toBe(972001);
    expect(reordonne.id).toBe(972001);
    expect(premiere.enonce).toBe(source.questions[0].enonce);
  });

  it('refuse une collision entre un nouvel ID source et un historique', () => {
    const source = sourcesPour(4, 106)[0];
    const historiques = [
      { id: 972001, enonce: 'Question historique distincte', choix: [] },
      ...source.questions.slice(1).map((q, index) => ({
        id: 5000 + index, enonce: q.enonce,
        source_exercice_id: 72, source_question_id: Number(q.id),
      })),
    ];
    expect(() => projeterExerciceBilanDepuisCours(
      { id: 106, questions: historiques } as any, [source] as any,
      { preserverContenuExistant: true },
    )).toThrow('collision');
  });

  it('FC TAXI développement commercial reprend déjà exactement les 66 questions VTC', () => {
    const fc = BILAN_EXERCICES_FC_TAXI.find((exo) => exo.id === 104)!;
    const vtc = BILAN_EXERCICES_VTC.find((exo) => exo.id === 104)!;
    const source = VTC_COURS_DATA.exercices.find((exo) => Number(exo.id) === 7)!;
    expect(source.questions).toHaveLength(66);
    expect(fc.questions).toEqual(vtc.questions);
    expect(fc.questions.map((q) => q.enonce)).toEqual(source.questions.map((q) => q.enonce));
  });

  it('ne projette aucun bilan d’examen et ne change pas leurs objets', () => {
    for (const moduleId of [5, 11, 28, 30]) {
      const exercices = [{ id: 500, questions: [{ id: 1, enonce: 'Examen intact' }] }];
      expect(projectionSommeCoursActive(moduleId)).toBe(false);
      expect(projeterBilanDepuisCours(moduleId, exercices as any, [] as any)).toBe(exercices);
    }
  });
});
