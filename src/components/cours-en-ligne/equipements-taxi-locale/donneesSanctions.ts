/**
 * 2e série complémentaire du module 64 « 4. Équipements TAXI » (demande du 27/10/2026 17:11 UTC) :
 * 20 questions « à quoi ça sert / où ça se place / quelle sanction ». Source : support PowerPoint du 27/10/2026
 * (références officielles citées sur chaque diapositive : C. transports L3121-1, R3121-1, R3120-6, L3124-1,
 * arrêté du 6/11/2015, arrêté métropolitain du 27/11/2024, convention-type CPAM). Montants « à vérifier DDPP » non interrogés.
 * Aucune question existante (10 + 11) modifiée ni reprise. Identité immuable : changement = nouvel ID + nouvelle version.
 */
import type { QuestionEquipement } from "./donnees";

export const ID_QUIZ_SANCTIONS = "quiz_taxi_equipements_m64_sanctions_v1";
export const VERSION_QUIZ_SANCTIONS = "2026-10-27-m64-sanctions-v1";
/** Horodatage de la demande : modules 64 validés avant = acquis inchangé, hors volume. */
export const BORNE_SANCTIONS_M64 = "2026-10-27T17:11:00Z";

const q = (n: number, diapositive: number, enonce: string, choix: string[], correct: number, justification: string): QuestionEquipement =>
  ({ id: `q${String(n).padStart(2, "0")}`, enonce, choix, correct, justification, diapositive });

const ADS = "Sanction administrative : avertissement, retrait temporaire ou définitif de l'ADS (art. L3124-1 du code des transports).";

export const QUESTIONS_SANCTIONS: QuestionEquipement[] = [
  // À quoi ça sert
  q(1, 2, "Quels éléments le taximètre prend-il en compte pour calculer le prix ?", ["La prise en charge, les kilomètres et le temps d'attente", "Uniquement les kilomètres", "Le nombre de passagers et de bagages"], 0, "Le taximètre calcule le prix à partir de la prise en charge, des kilomètres parcourus et du temps d'attente."),
  q(2, 3, "À quoi le lumineux TAXI est-il relié ?", ["Au terminal de paiement", "Au taximètre", "À l'imprimante uniquement"], 1, "Le dispositif lumineux « TAXI » homologué est relié au taximètre (il affiche aussi la lettre du tarif)."),
  q(3, 4, "À quoi sert l'imprimante reliée au taximètre ?", ["À imprimer les tarifs affichés", "À éditer la note remise au client", "À imprimer la carte professionnelle"], 1, "L'imprimante, reliée au taximètre et en état de fonctionnement, édite la note remise au client."),
  q(4, 7, "Quels taxis doivent obligatoirement avoir une trousse de soins ?", ["Tous les taxis, même non conventionnés", "Les taxis conventionnés CPAM", "Uniquement les taxis de nuit"], 1, "La trousse de soins est obligatoire pour les taxis conventionnés CPAM (convention-type, arrêté du 29/07/2025)."),
  q(5, 12, "Quelles mentions figurent sur la sous-plaque taxi ?", ["TAXI + numéro de l'ADS + commune de rattachement", "Nom du conducteur + numéro de téléphone", "Tarif A/B/C/D + numéro d'immatriculation"], 0, "Sous-plaque : mention TAXI + numéro de l'ADS + commune de rattachement (ex. : TAXI 000 LYON) — art. R3121-1."),
  q(6, 6, "Outre les tarifs, quelles informations l'affichage dans l'habitacle mentionne-t-il ?", ["Le numéro et la commune de rattachement de l'ADS", "Le chiffre d'affaires du taxi", "L'adresse personnelle du conducteur"], 0, "Affichage des tarifs fixés par arrêté préfectoral, avec le numéro et la commune de rattachement de l'ADS."),
  // Où ça se place
  q(7, 3, "Où se place le lumineux TAXI ?", ["Sur la plage arrière", "Sur le toit, à l'extérieur", "Derrière le pare-brise"], 1, "Le lumineux TAXI se place sur le toit, à l'extérieur du véhicule."),
  q(8, 3, "Que faire du lumineux quand le taxi n'est pas en service (ex. : transport LOTI) ?", ["Le laisser allumé en vert", "Le couvrir (bâcher)", "L'allumer en rouge"], 1, "Le lumineux est couvert (bâché) quand le taxi n'est pas en service, par exemple lors d'un transport LOTI."),
  q(9, 4, "Où se place l'imprimante ?", ["Dans le coffre", "Dans l'habitacle, à l'avant, connectée au taximètre", "Sur le toit, avec le lumineux"], 1, "Dans l'habitacle, à l'avant, connectée au taximètre (souvent intégrée ou sous le tableau de bord)."),
  q(10, 5, "Comment le TPE doit-il être placé ?", ["Dans l'habitacle, visible et à la disposition du client, logo CB visible", "Rangé dans la boîte à gants", "Dans le coffre, sorti sur demande"], 0, "Le TPE est dans l'habitacle, visible et à la disposition du client, en état de fonctionnement, logo CB visible."),
  q(11, 7, "Où se trouve la trousse de soins ?", ["Au domicile du conducteur", "À bord du véhicule, facilement accessible (coffre ou habitacle)", "Au guichet taxis"], 1, "La trousse de soins est à bord du véhicule, facilement accessible (coffre ou habitacle)."),
  q(12, 12, "Où est fixée la sous-plaque taxi (plaque ADS) ?", ["Sur le toit", "À l'arrière, sous la plaque d'immatriculation, visible de l'extérieur", "Sur la portière avant gauche"], 1, "À l'arrière du véhicule, sous la plaque d'immatriculation, visible de l'extérieur."),
  q(13, 9, "Lors d'un contrôle, que doit pouvoir faire le conducteur avec sa carte professionnelle ?", ["Montrer le verso", "La remettre définitivement au contrôleur", "Rien, l'affichage du recto suffit toujours"], 0, "La carte est apposée côté recto visible ; le verso doit pouvoir être montré lors d'un contrôle."),
  q(14, 12, "Que faire de la sous-plaque taxi en cas de vente de l'ADS ?", ["La conserver sur le véhicule", "La rendre au guichet", "La détruire soi-même"], 1, "La sous-plaque est à rendre au guichet en cas de vente de l'ADS."),
  // Sanctions
  q(15, 2, "Quelle est la sanction si le taximètre est absent ou non conforme ?", [ADS.replace("Sanction administrative : ", "Avertissement, retrait temporaire ou définitif de l'ADS"), "Contravention de 1re classe uniquement", "Aucune sanction si le conducteur annonce le prix à l'avance"], 0, ADS),
  q(16, 2, "Le non-respect des tarifs est puni d'une contravention de…", ["2e classe (35 €)", "3e classe (jusqu'à 450 €)", "5e classe (jusqu'à 1 500 €)"], 2, "Tarifs non respectés : contravention de 5e classe, jusqu'à 1 500 €."),
  q(17, 5, "Quelle est la sanction en cas d'absence de TPE (ou TPE hors service / non visible) ?", ["Contravention de 3e classe — 68 € (amende forfaitaire), jusqu'à 450 €", "Aucune, si le client peut payer en espèces", "Contravention de 5e classe — jusqu'à 1 500 €"], 0, "Absence de TPE : contravention de 3e classe — 68 € forfaitaire, jusqu'à 450 €, + sanction administrative possible sur l'ADS (L3124-1)."),
  q(18, 8, "Quelle est la sanction en cas d'absence de carte professionnelle ?", ["Contravention de 2e classe (35 €)", "Contravention de 5e classe — jusqu'à 1 500 €, et retrait possible par le préfet", "Simple rappel à l'ordre"], 1, "Absence de carte professionnelle : contravention de 5e classe (jusqu'à 1 500 €) ; le préfet peut aussi retirer la carte (art. R3120-6)."),
  q(19, 10, "Que se passe-t-il si le carnet métrologique n'est pas à jour au contrôle annuel ?", ["Rien, il est facultatif", "Pas d'attestation de conformité : incident d'exploitation, sanction administrative possible", "Contravention de 1re classe uniquement"], 1, "Sans carnet à jour : pas d'attestation de conformité au contrôle annuel → incident d'exploitation, sanction administrative possible (L3124-1)."),
  q(20, 12, "Sans sous-plaque taxi, le véhicule risque d'être considéré comme…", ["Un véhicule de collection", "Un taxi non autorisé", "Un VTC autorisé"], 1, "Sans plaque, le véhicule peut être considéré comme un taxi non autorisé ; " + ADS),
];
