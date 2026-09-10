// Bilan Exercices TA — STRICTEMENT identique au Bilan Exercices TAXI
// mais limité aux deux matières : Réglementation Nationale + Réglementation Locale.
//
// Les questions/réponses sont clonées depuis BILAN_EXERCICES_TAXI (ids 203 et 204)
// afin d'avoir exactement le même contenu. Les identifiants d'exercice TA (250/251)
// sont conservés pour ne pas casser les validations/progressions déjà enregistrées.

import { BILAN_EXERCICES_TAXI } from "./bilan-exercices-taxi-data";

function cloneFromTaxi(sourceId: number, targetId: number) {
  const source = BILAN_EXERCICES_TAXI.find((b: any) => b.id === sourceId);
  const cloned = source ? JSON.parse(JSON.stringify(source)) : null;
  return {
    id: targetId,
    titre: cloned?.titre ?? "",
    sousTitre: cloned?.sousTitre ?? "",
    actif: true,
    questions: cloned?.questions ?? [],
  };
}

export const BILAN_EXERCICES_TA = [
  cloneFromTaxi(203, 250),
  cloneFromTaxi(204, 251),
];
