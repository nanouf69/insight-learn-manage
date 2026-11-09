// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { T3P_EXERCICES } from '@/components/cours-en-ligne/exercices/t3p-exercices-data';
import {
  projeterBilanDepuisCours,
  retablirExercicesProjetesDuServeur,
} from '@/lib/bilanCoursSommeProjection';

const clesSources = T3P_EXERCICES.flatMap((exo) =>
  exo.questions.map((question) => ({ sourceExo: Number(exo.id), sourceQ: Number(question.id), question })),
);
const cle = (sourceExo: number, sourceQ: number) => `${sourceExo}:${sourceQ}`;
const sansReferenceDirecte = new Set([
  '1:8', '1:16', '1:34', '1:35', '1:38', '1:39', '1:40',
  '1:41', '1:60', '1:61', '1:62', '1:63', '1:64', '1:65',
]);
const directes = clesSources.filter(({ sourceExo, sourceQ }) => !sansReferenceDirecte.has(cle(sourceExo, sourceQ)));
const uniques = clesSources.filter(({ sourceExo, sourceQ }) => sansReferenceDirecte.has(cle(sourceExo, sourceQ)));
const doublees = directes.slice(0, 59);

const questionsDirectes = directes.map(({ sourceExo, sourceQ, question }) => ({
  id: sourceExo * 1000 + sourceQ,
  enonce: `${question.enonce} [libellé historique conservé]`,
  choix: [{ lettre: 'A', texte: `Choix historique ${sourceExo}:${sourceQ}`, correct: true }],
  image: `image-historique-${sourceExo}-${sourceQ}.png`,
  source_exercice_id: sourceExo,
  source_question_id: sourceQ,
}));
const questionsUniques = uniques.map(({ sourceExo, sourceQ, question }) => ({
  ...question,
  id: 10000 + sourceExo * 100 + sourceQ,
  image: `image-legacy-${sourceExo}-${sourceQ}.png`,
}));
const questionsDoublees = doublees.map(({ question }, index) => ({
  ...question,
  id: 20000 + index,
}));
const questionsHorsSources = Array.from({ length: 19 }, (_, index) => ({
  id: 30000 + index,
  enonce: `Ancienne question hors sources ${index + 1}`,
  choix: [{ lettre: 'A', texte: 'Ancien choix', correct: true }],
  source_exercice_id: index === 0 ? 1 : 2,
  source_question_id: index === 0 ? 67 : 63 + index,
}));

const bilanT3P = {
  id: 100,
  questions: [...questionsDirectes, ...questionsUniques, ...questionsDoublees, ...questionsHorsSources],
};
const bilanGestion = {
  id: 101,
  questions: Array.from({ length: 171 }, (_, index) => ({ id: 40000 + index, enonce: `Gestion ${index + 1}` })),
};
const autreMatiere = { id: 102, questions: [{ id: 50000, enonce: 'Sécurité inchangée' }] };

const projeter = () => projeterBilanDepuisCours(
  9,
  [bilanT3P, bilanGestion, autreMatiere] as any,
  T3P_EXERCICES as any,
  { preserverContenuExistant: true },
);

describe('Bilan T3P — composition réelle 206 vers 128 sans réécriture', () => {
  it('les sources embarquées contiennent exactement 66 + 62 questions sans doublon', () => {
    expect(T3P_EXERCICES.map((exo) => exo.questions.length)).toEqual([66, 62]);
    expect(clesSources).toHaveLength(128);
    expect(new Set(clesSources.map(({ sourceExo, sourceQ }) => cle(sourceExo, sourceQ))).size).toBe(128);
  });

  it('le fixture reproduit 114 références + 14 uniques + 59 doublons + 19 hors sources', () => {
    expect(bilanT3P.questions).toHaveLength(206);
    expect(questionsDirectes).toHaveLength(114);
    expect(questionsUniques).toHaveLength(14);
    expect(questionsDoublees).toHaveLength(59);
    expect(questionsHorsSources).toHaveLength(19);
  });

  it('affiche les 128 sources dans l’ordre et exclut exactement les 78 écarts', () => {
    const questions = projeter().find((exo) => exo.id === 100)!.questions!;
    expect(questions).toHaveLength(128);
    expect(questions.map((q) => `${q.source_exercice_id}:${q.source_question_id}`)).toEqual(
      clesSources.map(({ sourceExo, sourceQ }) => cle(sourceExo, sourceQ)),
    );
    expect(questions.slice(0, 66).every((q) => q.source_exercice_id === 1)).toBe(true);
    expect(questions.slice(66).every((q) => q.source_exercice_id === 2)).toBe(true);
    const idsExclus = new Set([...questionsDoublees, ...questionsHorsSources].map((q) => q.id));
    expect(idsExclus.size).toBe(78);
    expect(questions.some((q) => idsExclus.has(Number(q.id)))).toBe(false);
    expect(new Set(questions.map((q) => q.id)).size).toBe(128);
  });

  it('conserve les 114 objets rattachés et les 14 identités legacy sans modifier leur contenu', () => {
    const questions = projeter().find((exo) => exo.id === 100)!.questions!;
    for (const attendue of questionsDirectes) {
      const affichee = questions.find((q) => q.id === attendue.id)!;
      expect(affichee.enonce).toBe(attendue.enonce);
      expect(affichee.choix).toEqual(attendue.choix);
      expect(affichee.image).toBe(attendue.image);
    }
    for (const attendue of questionsUniques) {
      const affichee = questions.find((q) => q.id === attendue.id)!;
      expect(affichee.enonce).toBe(attendue.enonce);
      expect(affichee.choix).toEqual(attendue.choix);
      expect(affichee.image).toBe(attendue.image);
    }
    expect(questions.some((q) => Number(q.id) >= 900000)).toBe(false);
  });

  it('ne mute pas les 206 enregistrements et ne touche ni Gestion ni les autres matières', () => {
    const avant = JSON.stringify([bilanT3P, bilanGestion, autreMatiere]);
    const projete = projeter();
    expect(JSON.stringify([bilanT3P, bilanGestion, autreMatiere])).toBe(avant);
    expect(bilanT3P.questions).toHaveLength(206);
    expect(projete.find((exo) => exo.id === 101)).toBe(bilanGestion);
    expect(projete.find((exo) => exo.id === 102)).toBe(autreMatiere);
  });

  it('une sauvegarde rétablit les 206 questions serveur de T3P seulement', () => {
    const projete = projeter();
    const restaure = retablirExercicesProjetesDuServeur(9, projete as any, [bilanT3P, bilanGestion, autreMatiere] as any);
    expect(restaure.find((exo) => exo.id === 100)!.questions).toBe(bilanT3P.questions);
    expect(restaure.find((exo) => exo.id === 100)!.questions).toHaveLength(206);
    expect(restaure.find((exo) => exo.id === 101)).toBe(bilanGestion);
  });
});
