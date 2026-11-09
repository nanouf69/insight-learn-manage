// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { VTC_COURS_DATA } from '@/components/cours-en-ligne/vtc-cours-data';
import { TAXI_COURS_DATA } from '@/components/cours-en-ligne/taxi-cours-data';
import { resoudreExercicesSourcesBilan } from '@/components/cours-en-ligne/bilanCoursSources';
import {
  BILAN_SOMME_COURS_SOURCES,
  projeterBilanDepuisCours,
  projeterExerciceBilanDepuisCours,
  retablirExercicesProjetesDuServeur,
  type ExerciceBilanJson,
} from '@/lib/bilanCoursSommeProjection';

const ATTENDUS: Record<number, Record<number, number>> = {
  4: { 100: 128, 101: 94, 102: 211, 103: 103, 104: 66, 105: 126, 106: 35 },
  9: { 100: 128, 101: 94, 102: 211, 103: 103, 105: 126, 203: 99, 204: 114 },
  27: { 250: 99, 251: 114 },
  29: { 103: 103, 104: 66, 105: 126, 106: 35 },
  81: { 100: 128, 102: 211, 104: 66, 106: 35 },
  82: { 100: 128, 102: 211, 203: 99, 204: 114 },
};

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const embarquesPour = (moduleId: number) => {
  const config = BILAN_SOMME_COURS_SOURCES[moduleId];
  return (config.moduleCours === 2 ? VTC_COURS_DATA : TAXI_COURS_DATA).exercices as unknown as ExerciceBilanJson[];
};
const cle = (q: any) => `${q.source_exercice_id}:${q.source_question_id}`;

describe('Bilans d’exercices — synchronisation dynamique des 29 compositions', () => {
  for (const [moduleTexte, attendus] of Object.entries(ATTENDUS)) {
    const moduleId = Number(moduleTexte);
    const embarques = embarquesPour(moduleId);
    for (const [exoTexte, attendu] of Object.entries(attendus)) {
      const exerciceId = Number(exoTexte);
      it(`module ${moduleId} / exercice ${exerciceId} : suppression + ajout + édition + ordre + sauvegarde`, () => {
        const config = BILAN_SOMME_COURS_SOURCES[moduleId];
        const sourceIds = config.correspondances[exerciceId];
        const reference = embarques.filter((exo) => sourceIds.includes(Number(exo.id)));
        const serveurInitial = clone(reference);
        const historiques = serveurInitial.flatMap((exo) => exo.questions!.map((q) => ({
          ...q,
          id: Number(exo.id) * 100000 + Number(q.id),
          enonce: `Ancien libellé ${exo.id}:${q.id}`,
          source_exercice_id: Number(exo.id),
          source_question_id: Number(q.id),
        })));
        const brutServeur = { id: exerciceId, questions: historiques };
        const horsPerimetre = { id: 999999, questions: [{ id: 1, enonce: 'Intact' }] };
        const copieFigee = clone(brutServeur);

        // Vrai changement côté module source : suppression tombstonée, édition,
        // ajout et déplacement. La somme reste ici N (-1 +1), mais pas les clés.
        const serveurModifie = clone(serveurInitial);
        const premiereSource = serveurModifie[0];
        const [supprimee, ...reste] = premiereSource.questions!;
        const modifiee = { ...reste[0], enonce: `MODIFICATION SERVEUR ${moduleId}:${exerciceId}` };
        const nouvelId = Math.max(...serveurModifie.flatMap((exo) => exo.questions!.map((q) => Number(q.id)))) + 1000;
        const ajoutee = { id: nouvelId, enonce: `AJOUT SERVEUR ${moduleId}:${exerciceId}`, choix: [] };
        premiereSource.questions = [...reste.slice(1), ajoutee, modifiee];
        premiereSource.deletedQuestionIds = [Number(supprimee.id)];

        const sourcesActives = resoudreExercicesSourcesBilan({
          moduleBilanId: moduleId,
          exercicesEmbarques: embarques,
          moduleDataServeur: { exercices: serveurModifie },
          deletedExercicesServeur: [],
        }).filter((exo) => sourceIds.includes(Number(exo.id)));
        const clesActives = sourcesActives.flatMap((exo) => exo.questions!.map((q) => `${exo.id}:${q.id}`));

        const projeter = () => projeterBilanDepuisCours(
          moduleId,
          [brutServeur, horsPerimetre] as any,
          sourcesActives,
          { exercicesCoursDeReference: embarques },
        );
        const projete = projeter();
        const questions = projete[0].questions!;

        expect(historiques).toHaveLength(attendu);
        expect(questions.map(cle)).toEqual(clesActives);
        expect(questions).toHaveLength(attendu); // une suppression et un ajout
        expect(questions.some((q) => q.source_exercice_id === Number(premiereSource.id) && q.source_question_id === Number(supprimee.id))).toBe(false);
        expect(questions.some((q) => q.enonce === modifiee.enonce)).toBe(true);
        expect(questions.some((q) => q.enonce === ajoutee.enonce)).toBe(true);
        const idHistoriqueModifie = Number(premiereSource.id) * 100000 + Number(modifiee.id);
        expect(questions.find((q) => q.enonce === modifiee.enonce)?.id).toBe(idHistoriqueModifie);
        expect(projete[1]).toBe(horsPerimetre);

        // Une sauvegarde du Bilan restaure son brut historique ; une nouvelle
        // projection/reconnexion ne réintroduit toujours pas la question retirée.
        const restaure = retablirExercicesProjetesDuServeur(moduleId, projete as any, [brutServeur, horsPerimetre] as any);
        expect(restaure[0].questions).toBe(brutServeur.questions);
        const apresSauvegardeEtReconnexion = projeterBilanDepuisCours(
          moduleId, restaure as any, sourcesActives, { exercicesCoursDeReference: embarques },
        );
        expect(apresSauvegardeEtReconnexion[0].questions!.map(cle)).toEqual(clesActives);
        expect(apresSauvegardeEtReconnexion[0].questions!.some((q) => q.source_question_id === Number(supprimee.id) && q.source_exercice_id === Number(premiereSource.id))).toBe(false);

        // Ni la copie figée ni les objets bruts ne sont réécrits par la projection.
        expect(brutServeur).toEqual(copieFigee);
        expect(brutServeur.questions).toHaveLength(attendu);
      });
    }
  }

  it('une édition conserve aussi l’identité d’une entrée legacy sans référence directe', () => {
    const embarques = embarquesPour(4);
    const reference = embarques.find((exo) => Number(exo.id) === 72)!;
    const ancienne = reference.questions![0];
    const serveur = clone(reference);
    serveur.questions![0] = { ...serveur.questions![0], enonce: 'Texte source entièrement réécrit' };
    const brut = { id: 106, questions: [{ id: 55555, enonce: ancienne.enonce, choix: ancienne.choix }] };
    const sources = resoudreExercicesSourcesBilan({
      moduleBilanId: 4, exercicesEmbarques: embarques, moduleDataServeur: { exercices: [serveur] },
    });
    const questions = projeterExerciceBilanDepuisCours(brut, sources.filter((exo) => Number(exo.id) === 72), { exercicesCoursDeReference: embarques });
    expect(questions[0].id).toBe(55555);
    expect(questions[0].enonce).toBe('Texte source entièrement réécrit');
    expect(questions[0].source_exercice_id).toBe(72);
    expect(questions[0].source_question_id).toBe(Number(ancienne.id));
  });

  it('une source entièrement vidée par suppressions explicites produit un bilan vide, sans fallback', () => {
    const embarques = embarquesPour(9);
    const sources = resoudreExercicesSourcesBilan({
      moduleBilanId: 9, exercicesEmbarques: embarques,
      moduleDataServeur: { exercices: [
        { id: 1, questions: [], deletedQuestionIds: [1] },
        { id: 2, questions: [], deletedQuestionIds: [1] },
      ] },
    }).filter((exo) => [1, 2].includes(Number(exo.id)));
    const questions = projeterExerciceBilanDepuisCours({ id: 100, questions: [{ id: 9, enonce: 'Historique conservé' }] }, sources);
    expect(questions).toEqual([]);
  });

  it('une source vide sans preuve de suppression reste refusée comme illisible', () => {
    expect(() => projeterExerciceBilanDepuisCours(
      { id: 100, questions: [{ id: 9, enonce: 'Historique conservé' }] },
      [{ id: 1, questions: [] }],
    )).toThrow('vide sans suppression explicite');
  });
});
