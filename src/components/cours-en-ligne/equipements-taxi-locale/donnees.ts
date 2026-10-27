/**
 * Questions complémentaires du quiz « Équipements et documents TAXI » (module 64 « 4. Équipements TAXI »).
 * Source unique : PowerPoint fourni le 27/10/2026 (13 diapositives). Les 10 questions existantes (exercice 64100)
 * et leurs réponses ne sont pas modifiées ; les sujets déjà couverts par elles sont exclus (pas de doublon).
 * Identité immuable : un changement de questions = nouvel ID + nouvelle VERSION, jamais une réécriture.
 * Montants signalés « à vérifier auprès de la DDPP » (diapositives 6 et 11) volontairement non interrogés.
 */
export const ID_QUIZ_EQUIPEMENTS = "quiz_taxi_equipements_m64_complement_v1";
export const VERSION_QUIZ_EQUIPEMENTS = "2026-10-27-m64-v1";
export const COURS_EQUIPEMENTS = {
  titre: "Équipements et documents obligatoires du TAXI",
  pdf: "/cours/taxi/F_Locale_Equipements_documents_TAXI.pdf?v=20261027",
  pptx: "/cours/taxi/F_Locale_Equipements_documents_TAXI.pptx?v=20261027",
};

export interface QuestionEquipement { id: string; enonce: string; choix: string[]; correct: number; justification: string; diapositive: number }
const q = (n: number, diapositive: number, enonce: string, choix: string[], correct: number, justification: string): QuestionEquipement =>
  ({ id: `q${String(n).padStart(2, "0")}`, enonce, choix, correct, justification, diapositive });

export const QUESTIONS_EQUIPEMENTS: QuestionEquipement[] = [
  q(1, 2, "En plus du prix, quelle information le taximètre homologué affiche-t-il ?", ["La lettre du tarif en cours (A, B, C, D)", "Le nom du conducteur", "La commune de destination"], 0, "Le taximètre calcule le prix (prise en charge, km, temps d'attente) et affiche la lettre du tarif en cours (A, B, C, D)."),
  q(2, 2, "Où peut se trouver le taximètre ?", ["Dans le coffre", "Sur le tableau de bord ou intégré au rétroviseur intérieur, lisible par le client", "Sur le toit, à l'extérieur"], 1, "À l'avant, dans l'habitacle : boîtier sur le tableau de bord (modèle 1) ou intégré au rétroviseur intérieur (modèle 2), toujours lisible par le client depuis sa place."),
  q(3, 2, "À quelle fréquence le taximètre est-il vérifié ?", ["Tous les 5 ans", "Chaque année", "Uniquement à l'achat"], 1, "Le taximètre est scellé et vérifié chaque année."),
  q(4, 3, "Sur le lumineux TAXI, que signifie la couleur verte ?", ["Taxi en charge", "Taxi réservé", "Taxi libre"], 2, "Vert = taxi libre · Rouge = en charge ou réservé · Lettres A/B/C/D = tarif en cours."),
  q(5, 4, "Quelle est la sanction en cas d'absence d'imprimante (ou d'imprimante hors service) ?", ["Aucune sanction", "Contravention de 3e classe — 68 € (amende forfaitaire), jusqu'à 450 €", "Contravention de 5e classe — jusqu'à 1 500 €"], 1, "Absence d'imprimante : contravention de 3e classe — 68 € (amende forfaitaire), jusqu'à 450 €, plus sanction administrative possible sur l'ADS (art. L3124-1)."),
  q(6, 5, "Le paiement par carte bancaire dans un taxi est obligatoire…", ["À partir de 25 €", "Quel que soit le montant", "Seulement pour les courses de nuit"], 1, "Terminal de paiement électronique (TPE) : le paiement par carte bancaire est OBLIGATOIRE, quel que soit le montant."),
  q(7, 6, "Où les tarifs doivent-ils être affichés ?", ["Sur la vitre arrière, à l'extérieur", "Dans la boîte à gants", "Dans l'habitacle, de façon lisible et constamment visible pour le client transporté"], 2, "Les tarifs sont affichés dans l'habitacle, de façon lisible et constamment visible pour le client transporté."),
  q(8, 7, "Quelle sanction en cas de manquement aux engagements de la convention CPAM ?", ["Contravention de 2e classe", "Avertissement, suspension ou déconventionnement (jusqu'à 5 ans)", "Retrait du permis de conduire"], 1, "Manquement aux engagements de la convention : avertissement, suspension ou déconventionnement (jusqu'à 5 ans)."),
  q(9, 9, "Carte professionnelle non présentée immédiatement lors d'un contrôle : quelle sanction ?", ["Contravention de 2e classe (35 €)", "Contravention de 5e classe (jusqu'à 1 500 €)", "Aucune sanction"], 0, "Non présentée immédiatement : 2e classe (35 €). L'absence de carte est, elle, une contravention de 5e classe (jusqu'à 1 500 €)."),
  q(10, 10, "Où se trouve le carnet métrologique ?", ["Collé sur le lumineux", "À bord du véhicule (boîte à gants), présenté lors des contrôles", "Uniquement au guichet taxis"], 1, "Chaque taximètre est accompagné d'un carnet métrologique, à bord du véhicule (boîte à gants), présenté lors des contrôles et du contrôle annuel au guichet taxis."),
  q(11, 11, "La note (ticket) imprimée doit obligatoirement être remise au client…", ["Seulement sur demande, quel que soit le montant", "Dès 25 € TTC (sur demande en dessous) ; double conservé 2 ans", "Dès 10 € TTC ; double conservé 6 mois"], 1, "Remise au client en fin de course : obligatoire dès 25 € TTC, sur demande en dessous. Double conservé 2 ans par le taxi."),
];

export type ReponsesEquipements = Record<string, string>;
/** Toutes les questions ont une réponse valide (index de choix). Non noté : aucune note calculée. */
export function quizEquipementsComplet(v: ReponsesEquipements): boolean {
  return QUESTIONS_EQUIPEMENTS.every((x) => {
    const n = Number(v[x.id]);
    return v[x.id] !== undefined && v[x.id] !== "" && Number.isInteger(n) && n >= 0 && n < x.choix.length;
  });
}
