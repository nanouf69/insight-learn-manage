import type { ExerciceQuestion } from "./types";

export const REGLEMENTATION_NATIONALE_EXERCICES: {
  id: number; titre: string; sousTitre?: string; actif: boolean; questions: ExerciceQuestion[];
}[] = [
  {
    id: 70, actif: true,
    titre: "Réglementation Nationale — Partie 1 : Taxi, ADS & Carte pro",
    sousTitre: "Définitions, statuts, ADS, liste d'attente, cession, carte professionnelle, maraude",
    questions: [
      { id: 1, enonce: "Le nombre maximal de personnes dans un taxi, conducteur compris :", choix: [
        { lettre: "A", texte: "4" },{ lettre: "B", texte: "5" },{ lettre: "C", texte: "8" },{ lettre: "D", texte: "9", correct: true },
      ]},
      { id: 2, enonce: "Le préfet délivre les ADS dans toutes les communes de son département :", choix: [
        { lettre: "A", texte: "Vrai" },{ lettre: "B", texte: "Faux", correct: true },
      ]},
      { id: 3, enonce: "L'artisan taxi est :", choix: [
        { lettre: "A", texte: "Employé par une société de taxi" },
        { lettre: "B", texte: "Propriétaire du véhicule ET de la licence (ADS), exploitant indépendant", correct: true },
        { lettre: "C", texte: "Locataire d'un véhicule muni d'une licence" },
      ]},
      { id: 4, enonce: "Le salarié taxi :", choix: [
        { lettre: "A", texte: "Est propriétaire du véhicule" },
        { lettre: "B", texte: "Est employé par une société de taxi, véhicule au nom de la société", correct: true },
        { lettre: "C", texte: "Possède des parts sociales d'une coopérative" },
      ]},
      { id: 5, enonce: "Le coopérateur :", choix: [
        { lettre: "A", texte: "Possède des parts sociales d'une coopérative qui détient l'ADS et le véhicule", correct: true },
        { lettre: "B", texte: "Est propriétaire de l'ADS" },
        { lettre: "C", texte: "Est employé par le maire" },
      ]},
      { id: 6, enonce: "Le locataire gérant :", choix: [
        { lettre: "A", texte: "Loue un véhicule muni d'une licence et crée son entreprise à la CMA", correct: true },
        { lettre: "B", texte: "Est salarié de la coopérative" },
        { lettre: "C", texte: "Possède sa propre ADS" },
      ]},
      { id: 7, enonce: "La location d'une licence (ADS) SEULE, sans le véhicule, est :", choix: [
        { lettre: "A", texte: "Autorisée" },{ lettre: "B", texte: "Interdite", correct: true },
      ]},
      { id: 8, enonce: "Différences entre artisan taxi et locataire-gérant :", choix: [
        { lettre: "A", texte: "Le locataire est titulaire de l'ADS et propriétaire du véhicule" },
        { lettre: "B", texte: "Le locataire loue un véhicule-taxi muni d'une ADS", correct: true },
      ]},
      { id: 9, enonce: "Quelle autorité délivre l'ADS ?", choix: [
        { lettre: "A", texte: "La chambre des métiers" },{ lettre: "B", texte: "Le ministère des transports" },
        { lettre: "C", texte: "La mairie", correct: true },{ lettre: "D", texte: "La préfecture" },
      ]},
      { id: 10, enonce: "La délivrance d'une ADS sur un aéroport est de la compétence :", choix: [
        { lettre: "A", texte: "Du préfet du département", correct: true },
        { lettre: "B", texte: "Du président de la chambre de commerce" },
        { lettre: "C", texte: "Du directeur de l'aéroport" },
      ]},
      { id: 11, enonce: "Les nouvelles ADS sont attribuées par le maire :", choix: [
        { lettre: "A", texte: "Selon l'ancienneté de la carte professionnelle" },
        { lettre: "B", texte: "À la discrétion du maire" },
        { lettre: "C", texte: "Dans l'ordre chronologique d'inscription sur la liste d'attente", correct: true },
      ]},
      { id: 12, enonce: "L'ADS délivrée après le 1er octobre 2014 est :", choix: [
        { lettre: "A", texte: "Cessible (vendable)" },{ lettre: "B", texte: "Incessible (non vendable)", correct: true },
      ]},
      { id: 18, enonce: "Un candidat peut être inscrit sur combien de listes d'attente ?", choix: [
        { lettre: "A", texte: "1 seule", correct: true },{ lettre: "B", texte: "2" },{ lettre: "C", texte: "3" },
      ]},
      { id: 19, enonce: "La liste d'attente est-elle communicable (accessible au public) ?", choix: [
        { lettre: "A", texte: "Non" },{ lettre: "B", texte: "Aux professionnels uniquement" },{ lettre: "C", texte: "Oui", correct: true },
      ]},
      { id: 22, enonce: "Peut-on vendre une ADS délivrée AVANT octobre 2014 ?", choix: [
        { lettre: "A", texte: "Oui, sous conditions de durée d'exploitation", correct: true },{ lettre: "B", texte: "Non, jamais" },
      ]},
      { id: 24, enonce: "Délai minimum pour revendre une ADS jamais revendue :", choix: [
        { lettre: "A", texte: "5 ans" },{ lettre: "B", texte: "10 ans" },{ lettre: "C", texte: "15 ans", correct: true },
      ]},
      { id: 25, enonce: "Délai minimum pour revendre une ADS déjà revendue au moins une fois :", choix: [
        { lettre: "A", texte: "5 ans", correct: true },{ lettre: "B", texte: "10 ans" },{ lettre: "C", texte: "15 ans" },
      ]},
      { id: 27, enonce: "En cas de décès du titulaire d'une ADS, ses ayants-droit peuvent présenter un successeur pendant :", choix: [
        { lettre: "A", texte: "6 mois" },{ lettre: "B", texte: "1 an à compter du décès", correct: true },{ lettre: "C", texte: "2 ans" },
      ]},
      { id: 36, enonce: "Quelle autorité délivre la carte professionnelle de conducteur de taxi ?", choix: [
        { lettre: "A", texte: "La CMA" },{ lettre: "B", texte: "La mairie" },{ lettre: "C", texte: "Le préfet du département", correct: true },
      ]},
      { id: 38, enonce: "Quel organisme fabrique les cartes professionnelles TAXI ?", choix: [
        { lettre: "A", texte: "La CMA" },{ lettre: "B", texte: "La mairie" },{ lettre: "C", texte: "La préfecture" },{ lettre: "D", texte: "L'Imprimerie nationale", correct: true },
      ]},
      { id: 39, enonce: "La carte professionnelle doit être renouvelée tous les :", choix: [
        { lettre: "A", texte: "1 an" },{ lettre: "B", texte: "2 ans" },{ lettre: "C", texte: "5 ans", correct: true },
      ]},
      { id: 40, enonce: "La carte professionnelle doit être apposée :", choix: [
        { lettre: "A", texte: "Sur la vitre arrière" },
        { lettre: "B", texte: "Sur la vitre avant du véhicule, visible de l'extérieur", correct: true },
        { lettre: "C", texte: "Dans la boîte à gants" },
      ]},
      { id: 46, enonce: "Que doit faire un chauffeur de taxi qui cesse son activité ?", choix: [
        { lettre: "A", texte: "Détruire sa carte" },{ lettre: "B", texte: "La restituer à la préfecture", correct: true },{ lettre: "C", texte: "La restituer à la police" },
      ]},
      { id: 58, enonce: "Visites médicales : fréquence pour un conducteur de moins de 60 ans :", choix: [
        { lettre: "A", texte: "Tous les 2 ans" },{ lettre: "B", texte: "Tous les 5 ans", correct: true },{ lettre: "C", texte: "Annuelle" },
      ]},
      { id: 59, enonce: "Visites médicales : fréquence entre 60 et 76 ans :", choix: [
        { lettre: "A", texte: "Tous les 5 ans" },{ lettre: "B", texte: "Tous les 2 ans", correct: true },{ lettre: "C", texte: "Annuelle" },
      ]},
      { id: 60, enonce: "Visites médicales : fréquence au-delà de 76 ans :", choix: [
        { lettre: "A", texte: "Tous les 2 ans" },{ lettre: "B", texte: "Annuelle", correct: true },
      ]},
      { id: 61, enonce: "La durée de validité de l'attestation de formation continue est de :", choix: [
        { lettre: "A", texte: "1 an" },{ lettre: "B", texte: "2 ans" },{ lettre: "C", texte: "5 ans", correct: true },
      ]},
    ],
  },
  {
    id: 71, actif: true,
    titre: "Réglementation Nationale — Partie 2 : Paiement, TICPE, CPAM, LOTI & Sanctions",
    sousTitre: "Moyens de paiement, TICPE, convention CPAM, régime LOTI, tarification, sanctions",
    questions: [
      { id: 1, enonce: "Non-respect de l'obligation TPE pour un taxi — sanction :", choix: [
        { lettre: "A", texte: "Contravention de 1ère classe" },{ lettre: "B", texte: "Contravention de 3ème classe" },
        { lettre: "C", texte: "Contravention de 5ème classe", correct: true },
      ]},
      { id: 2, enonce: "Les espèces sont un moyen de paiement :", choix: [
        { lettre: "A", texte: "Facultatif" },{ lettre: "B", texte: "Obligatoire", correct: true },
      ]},
      { id: 3, enonce: "La carte bancaire est un moyen de paiement :", choix: [
        { lettre: "A", texte: "Obligatoire quel que soit le montant", correct: true },
        { lettre: "B", texte: "Uniquement au-delà de 10€" },
      ]},
      { id: 4, enonce: "Le refus de paiement par chèque est :", choix: [
        { lettre: "A", texte: "Interdit" },
        { lettre: "B", texte: "Autorisé si mentionné sur la vitre extérieure du véhicule", correct: true },
      ]},
      { id: 5, enonce: "Le PSC1 est :", choix: [
        { lettre: "A", texte: "Facultatif" },
        { lettre: "B", texte: "Obligatoire à l'entrée dans la profession, de moins de 2 ans", correct: true },
      ]},
      { id: 7, enonce: "Calculez la détaxe TICPE pour 3 000 litres de gazole (TICPE = 30,28 €/hectolitre) :", choix: [
        { lettre: "A", texte: "3000 / 30,28 = 99,08 €" },
        { lettre: "B", texte: "3000 × 30,28 = 90 840 €" },
        { lettre: "C", texte: "3000 × 30,28 / 100 = 908,40 €", correct: true },
      ]},
      { id: 8, enonce: "La demande de remboursement TICPE est :", choix: [
        { lettre: "A", texte: "Mensuelle" },
        { lettre: "B", texte: "Annuelle, basée sur la consommation réelle de l'année précédente", correct: true },
        { lettre: "C", texte: "Hebdomadaire" },
      ]},
      { id: 9, enonce: "Jusqu'à quelle date déposer la demande TICPE pour le carburant 2024 ?", choix: [
        { lettre: "A", texte: "31/12/2025" },{ lettre: "B", texte: "31/12/2026", correct: true },{ lettre: "C", texte: "31/12/2027" },
      ]},
      { id: 10, enonce: "La demande TICPE est adressée :", choix: [
        { lettre: "A", texte: "À la préfecture" },
        { lettre: "B", texte: "Au bureau des douanes du siège social ou du domicile", correct: true },
        { lettre: "C", texte: "À la mairie" },
      ]},
      { id: 14, enonce: "Le transport de malade assis peut être effectué par :", choix: [
        { lettre: "A", texte: "Un taxi", correct: true },{ lettre: "B", texte: "Une voiture de petite remise" },{ lettre: "C", texte: "Un VTC" },
      ]},
      { id: 15, enonce: "Délai d'exploitation de l'ADS avant conventionnement CPAM (avant 31/01/2019) :", choix: [
        { lettre: "A", texte: "6 mois" },{ lettre: "B", texte: "1 an" },{ lettre: "C", texte: "2 ans", correct: true },{ lettre: "D", texte: "3 ans" },
      ]},
      { id: 16, enonce: "Délai d'exploitation de l'ADS avant conventionnement CPAM (après 01/02/2019) :", choix: [
        { lettre: "A", texte: "1 an", correct: true },{ lettre: "B", texte: "2 ans" },{ lettre: "C", texte: "3 ans" },
      ]},
      { id: 17, enonce: "Délai pour informer la CPAM de tout changement :", choix: [
        { lettre: "A", texte: "7 jours" },{ lettre: "B", texte: "15 jours calendaires", correct: true },{ lettre: "C", texte: "1 mois" },
      ]},
      { id: 21, enonce: "Que signifie L.O.T.I. ?", choix: [
        { lettre: "A", texte: "Location onéreuse de taxi immatriculé" },
        { lettre: "B", texte: "Loi d'orientation des transports intérieurs", correct: true },
        { lettre: "C", texte: "Loi d'obligation du transport et d'identité" },
      ]},
      { id: 22, enonce: "Le régime LOTI concerne le transport de groupes d'au moins :", choix: [
        { lettre: "A", texte: "1 personne" },{ lettre: "B", texte: "2 personnes", correct: true },{ lettre: "C", texte: "4 personnes" },
      ]},
      { id: 30, enonce: "Tarif maximum de la prise en charge au niveau national :", choix: [
        { lettre: "A", texte: "4,38 €" },{ lettre: "B", texte: "4,47 €" },{ lettre: "C", texte: "4,48 €", correct: true },{ lettre: "D", texte: "4,49 €" },
      ]},
      { id: 31, enonce: "Tarif maximum du kilomètre parcouru au niveau national :", choix: [
        { lettre: "A", texte: "1,26 €" },{ lettre: "B", texte: "1,27 €" },{ lettre: "C", texte: "1,28 €" },{ lettre: "D", texte: "1,29 €", correct: true },
      ]},
      { id: 37, enonce: "Le fait d'exercer sans ADS est puni de :", choix: [
        { lettre: "A", texte: "6 mois d'emprisonnement et 15 000 €" },
        { lettre: "B", texte: "1 an d'emprisonnement et 15 000 €", correct: true },
      ]},
      { id: 40, enonce: "Exercer sans carte pro en cours de validité = contravention de :", choix: [
        { lettre: "A", texte: "3ème classe" },{ lettre: "B", texte: "4ème classe" },{ lettre: "C", texte: "5ème classe (jusqu'à 1 500 €)", correct: true },
      ]},
      { id: 42, enonce: "Montant d'une contravention de 1ère classe :", choix: [
        { lettre: "A", texte: "11 €", correct: true },
      ]},
      { id: 43, enonce: "Montant d'une contravention de 4ème classe :", choix: [
        { lettre: "A", texte: "68 €" },{ lettre: "B", texte: "135 €", correct: true },{ lettre: "C", texte: "375 €" },
      ]},
    ],
  },
];

export const REGLEMENTATION_SPECIFIQUE_VTC_EXERCICES: {
  id: number; titre: string; sousTitre?: string; actif: boolean; questions: ExerciceQuestion[];
}[] = [
  {
    id: 72, actif: true,
    titre: "Réglementation Spécifique VTC",
    sousTitre: "Registre VTC, garantie financière, vignettes, véhicule, carte pro, sanctions",
    questions: [
      { id: 1, enonce: "Frais d'inscription au registre des VTC :", choix: [
        { lettre: "A", texte: "190 €" },{ lettre: "B", texte: "180 €" },{ lettre: "C", texte: "170 €", correct: true },
      ]},
      { id: 2, enonce: "Par quel organisme est géré le registre des exploitants de VTC ?", choix: [
        { lettre: "A", texte: "La préfecture" },
        { lettre: "B", texte: "Le ministère de la transition écologique et de la cohésion des territoires", correct: true },
        { lettre: "C", texte: "Les centres de formations" },
      ]},
      { id: 3, enonce: "Délai max pour prévenir le registre en cas de modification ?", choix: [
        { lettre: "A", texte: "6 jours" },{ lettre: "B", texte: "12 jours" },{ lettre: "C", texte: "15 jours" },{ lettre: "D", texte: "30 jours", correct: true },
      ]},
      { id: 4, enonce: "L'inscription au registre des VTC doit être renouvelée tous les :", choix: [
        { lettre: "A", texte: "5 ans", correct: true },
      ]},
      { id: 9, enonce: "Capacité financière fixée à 1 500 € par véhicule :", choix: [
        { lettre: "A", texte: "Vrai", correct: true },{ lettre: "B", texte: "Faux" },
      ]},
      { id: 10, enonce: "14 véhicules — capacité financière = ?", choix: [
        { lettre: "A", texte: "21 000 € (14 × 1 500 €)", correct: true },{ lettre: "B", texte: "13 500 €" },{ lettre: "C", texte: "1 500 €" },
      ]},
      { id: 14, enonce: "Garanties financières accordées par des organismes agréés par :", choix: [
        { lettre: "A", texte: "La préfecture" },
        { lettre: "B", texte: "L'Autorité de contrôle prudentiel et de résolution (ACPR)", correct: true },
        { lettre: "C", texte: "La mairie" },
      ]},
      { id: 15, enonce: "Durée maximale de recours exceptionnel (panne, événement) :", choix: [
        { lettre: "A", texte: "15 jours" },{ lettre: "B", texte: "1 mois", correct: true },{ lettre: "C", texte: "3 mois" },
      ]},
      { id: 16, enonce: "Un chauffeur VTC peut-il accepter les pourboires ?", choix: [
        { lettre: "A", texte: "Oui", correct: true },{ lettre: "B", texte: "Non" },
      ]},
      { id: 17, enonce: "Que signifie VTC ?", choix: [
        { lettre: "A", texte: "Voiture de transport avec chauffeur", correct: true },
        { lettre: "B", texte: "Voiture de tourisme avec chauffeur" },
      ]},
      { id: 19, enonce: "Où sont répertoriés les textes concernant les VTC ?", choix: [
        { lettre: "A", texte: "Code de la route" },{ lettre: "B", texte: "Code des transports", correct: true },
        { lettre: "C", texte: "Code civil" },{ lettre: "D", texte: "Code pénal" },
      ]},
      { id: 20, enonce: "Les VTC peuvent-ils fixer librement leurs tarifs ?", choix: [
        { lettre: "A", texte: "Vrai", correct: true },{ lettre: "B", texte: "Faux" },
      ]},
      { id: 21, enonce: "Les VTC peuvent-ils utiliser un tarif horokilométrique ?", choix: [
        { lettre: "A", texte: "Oui", correct: true },{ lettre: "B", texte: "Non" },
      ]},
      { id: 22, enonce: "Autorité compétente pour la réglementation VTC :", choix: [
        { lettre: "A", texte: "La mairie" },
        { lettre: "B", texte: "Le ministère de la transition écologique et solidaire", correct: true },
        { lettre: "C", texte: "La chambre des métiers" },
      ]},
      { id: 28, enonce: "L'absence de réservation préalable est sanctionnée par :", choix: [
        { lettre: "A", texte: "Une contravention de 3ème classe" },
        { lettre: "B", texte: "1 an de prison + 15 000 € + immobilisation du véhicule", correct: true },
      ]},
      { id: 29, enonce: "Le justificatif de réservation peut être sur support :", choix: [
        { lettre: "A", texte: "Papier uniquement" },{ lettre: "B", texte: "Numérique uniquement" },
        { lettre: "C", texte: "Papier ou numérique", correct: true },
      ]},
      { id: 32, enonce: "Dimensions minimales d'un véhicule VTC thermique :", choix: [
        { lettre: "A", texte: "4,00 m × 1,60 m" },{ lettre: "B", texte: "4,50 m × 1,70 m", correct: true },{ lettre: "C", texte: "5,00 m × 1,80 m" },
      ]},
      { id: 33, enonce: "Puissance minimale du moteur d'un VTC thermique :", choix: [
        { lettre: "A", texte: "60 kW (82 CV)" },{ lettre: "B", texte: "84 kW (environ 115 CV)", correct: true },{ lettre: "C", texte: "100 kW (136 CV)" },
      ]},
      { id: 34, enonce: "Les véhicules hybrides et électriques sont dispensés des conditions techniques :", choix: [
        { lettre: "A", texte: "Vrai", correct: true },{ lettre: "B", texte: "Faux" },
      ]},
      { id: 35, enonce: "Un véhicule « de collection » a au moins :", choix: [
        { lettre: "A", texte: "20 ans et sa production a cessé" },
        { lettre: "B", texte: "30 ans et sa production a cessé", correct: true },
        { lettre: "C", texte: "50 ans" },
      ]},
      { id: 36, enonce: "Signalétique obligatoire pour les VTC :", choix: [
        { lettre: "A", texte: "Vignettes rouges" },{ lettre: "B", texte: "Vignettes vertes", correct: true },{ lettre: "C", texte: "Vignettes jaunes" },
      ]},
      { id: 38, enonce: "Combien de vignettes définitives ?", choix: [
        { lettre: "A", texte: "1" },{ lettre: "B", texte: "2", correct: true },{ lettre: "C", texte: "3" },
      ]},
      { id: 39, enonce: "Où commander ses vignettes VTC ?", choix: [
        { lettre: "A", texte: "Préfecture" },{ lettre: "B", texte: "Chambre des métiers" },
        { lettre: "C", texte: "Sur le site du registre des VTC", correct: true },
      ]},
      { id: 41, enonce: "Validité de la signalétique temporaire VTC :", choix: [
        { lettre: "A", texte: "25 jours ouvrés" },{ lettre: "B", texte: "30 jours ouvrés", correct: true },{ lettre: "C", texte: "2 mois" },
      ]},
      { id: 46, enonce: "En changeant de véhicule, doit-on commander de nouvelles vignettes ?", choix: [
        { lettre: "A", texte: "Oui", correct: true },{ lettre: "B", texte: "Non" },
      ]},
      { id: 47, enonce: "Prix des 2 vignettes définitives :", choix: [
        { lettre: "A", texte: "18 €" },{ lettre: "B", texte: "36 €", correct: true },{ lettre: "C", texte: "60 €" },
      ]},
      { id: 48, enonce: "Les vignettes définitives sont délivrées par :", choix: [
        { lettre: "A", texte: "La préfecture" },{ lettre: "B", texte: "L'Imprimerie nationale", correct: true },{ lettre: "C", texte: "La mairie" },
      ]},
      { id: 49, enonce: "La carte professionnelle VTC est demandée auprès de :", choix: [
        { lettre: "A", texte: "La mairie" },{ lettre: "B", texte: "La préfecture", correct: true },{ lettre: "C", texte: "L'Imprimerie nationale" },
      ]},
      { id: 52, enonce: "Coût de la carte professionnelle VTC :", choix: [
        { lettre: "A", texte: "36 €" },{ lettre: "B", texte: "60 € TTC", correct: true },{ lettre: "C", texte: "170 €" },
      ]},
      { id: 53, enonce: "Durée de validité de la carte professionnelle VTC :", choix: [
        { lettre: "A", texte: "3 ans" },{ lettre: "B", texte: "5 ans", correct: true },{ lettre: "C", texte: "10 ans" },
      ]},
      { id: 55, enonce: "La carte professionnelle VTC doit être apposée :", choix: [
        { lettre: "A", texte: "Dans la boîte à gants" },
        { lettre: "B", texte: "Sur le pare-brise ou à l'intérieur du véhicule, de façon visible", correct: true },
      ]},
      { id: 57, enonce: "La prise en charge d'un client SANS réservation préalable est punie de :", choix: [
        { lettre: "A", texte: "Contravention de 5ème classe" },
        { lettre: "B", texte: "1 an de prison + 15 000 €", correct: true },
      ]},
      { id: 58, enonce: "Suspension du permis comme peine complémentaire — durée max :", choix: [
        { lettre: "A", texte: "1 an" },{ lettre: "B", texte: "3 ans" },{ lettre: "C", texte: "5 ans", correct: true },
      ]},
      { id: 60, enonce: "Un VTC a-t-il le droit de maraude (chercher des clients dans la rue) ?", choix: [
        { lettre: "A", texte: "Oui, comme un taxi" },
        { lettre: "B", texte: "Non, la réservation préalable est obligatoire", correct: true },
      ]},
      { id: 61, enonce: "Immobilisation du véhicule comme peine complémentaire — durée max :", choix: [
        { lettre: "A", texte: "6 mois" },{ lettre: "B", texte: "1 an", correct: true },{ lettre: "C", texte: "2 ans" },
      ]},
    ],
  },
];

export const REGLEMENTATION_LOCALE_EXERCICES: {
  id: number; titre: string; sousTitre?: string; actif: boolean; questions: ExerciceQuestion[];
}[] = [
  {
    id: 73, actif: true,
    titre: "Réglementation Locale — Partie 1 : Conducteur, stations, tarification",
    sousTitre: "Carte pro, objets trouvés, refus de course, ZUPC, tarifs A/B/C/D, suppléments, sanctions",
    questions: [
      { id: 1, enonce: "Quelles sont les obligations du conducteur en service concernant sa carte professionnelle (art. 6) ?", choix: [
        { lettre: "A", texte: "La carte doit être rangée dans la boîte à gants" },
        { lettre: "B", texte: "La carte doit être apposée sur le pare-brise ou la custode, photographie visible de l'extérieur", correct: true },
        { lettre: "C", texte: "La carte doit être présentée uniquement sur demande des forces de l'ordre" },
        { lettre: "D", texte: "La carte doit être portée autour du cou" },
      ]},
      { id: 2, enonce: "Quel est le délai pour déposer un objet trouvé dans le véhicule au guichet de l'unité taxis de la Métropole ?", choix: [
        { lettre: "A", texte: "24 heures" },{ lettre: "B", texte: "48 heures" },
        { lettre: "C", texte: "72 heures", correct: true },{ lettre: "D", texte: "1 semaine" },
      ]},
      { id: 3, enonce: "Quelles sont les interdictions formelles pour le conducteur pendant le trajet (art. 6) ?", choix: [
        { lettre: "A", texte: "Fumer dans le véhicule (y compris cigarette électronique)" },
        { lettre: "B", texte: "Être accompagné par une personne autre que le client" },
        { lettre: "C", texte: "Accueillir un animal lui appartenant" },
        { lettre: "D", texte: "Toutes les réponses ci-dessus", correct: true },
      ]},
      { id: 4, enonce: "Dans quels cas le conducteur peut-il refuser une course ?", choix: [
        { lettre: "A", texte: "Si le comportement du client présente un danger", correct: true },
        { lettre: "B", texte: "Si la tenue ou les bagages risquent de détériorer le véhicule", correct: true },
        { lettre: "C", texte: "Si le client est accompagné d'un chien guide d'aveugle" },
        { lettre: "D", texte: "Si le client souhaite un trajet trop court" },
      ]},
      { id: 5, enonce: "Quel document remplace le permis de circuler selon l'arrêté métropolitain de novembre 2024 ?", choix: [
        { lettre: "A", texte: "Une carte de circulation provisoire" },
        { lettre: "B", texte: "Une attestation de conformité délivrée par le guichet de l'unité taxis (valable 1 an)", correct: true },
        { lettre: "C", texte: "Un certificat de conformité européen" },
        { lettre: "D", texte: "Un permis de circuler numérique" },
      ]},
      { id: 6, enonce: "Combien de documents doivent être présentés lors du contrôle annuel (art. 8) ?", choix: [
        { lettre: "A", texte: "8 documents" },{ lettre: "B", texte: "9 documents" },
        { lettre: "C", texte: "10 documents" },{ lettre: "D", texte: "11 documents", correct: true },
      ]},
      { id: 7, enonce: "Sur les stations de taxi ≥ 6 places, quelles sont les règles pour les pauses ?", choix: [
        { lettre: "A", texte: "Pauses interdites" },
        { lettre: "B", texte: "Pauses tolérées en queue de station, lumineux éclairé + disque de stationnement, 2h max", correct: true },
        { lettre: "C", texte: "Pauses tolérées uniquement la nuit" },
        { lettre: "D", texte: "Pauses sans limitation de durée" },
      ]},
      { id: 8, enonce: "Quelles sont les caractéristiques obligatoires du véhicule taxi (art. 7) ?", choix: [
        { lettre: "A", texte: "Véhicule < 10 ans, 8 places assises max + conducteur", correct: true },
        { lettre: "B", texte: "Coffre 400L min (300L faibles émissions), vignette CRIT'AIR", correct: true },
        { lettre: "C", texte: "Taximètre homologué, imprimante connectée, TPE", correct: true },
        { lettre: "D", texte: "GPS obligatoire et caméra embarquée" },
      ]},
      { id: 9, enonce: "Combien de communes composent la ZUPC ?", choix: [
        { lettre: "A", texte: "20 communes" },{ lettre: "B", texte: "23 communes + Aéroport" },
        { lettre: "C", texte: "25 communes + Aéroport Saint-Exupéry", correct: true },{ lettre: "D", texte: "30 communes" },
      ]},
      { id: 10, enonce: "Concernant Genas, quelle affirmation est correcte ?", choix: [
        { lettre: "A", texte: "Genas fait partie du Grand Lyon et de la ZUPC" },
        { lettre: "B", texte: "Genas ne fait partie ni du Grand Lyon ni de la ZUPC" },
        { lettre: "C", texte: "Genas ne fait pas partie du Grand Lyon mais fait partie de la ZUPC", correct: true },
        { lettre: "D", texte: "Genas fait partie du Grand Lyon mais pas de la ZUPC" },
      ]},
      { id: 11, enonce: "Qui gère les licences de l'Aéroport Saint-Exupéry ?", choix: [
        { lettre: "A", texte: "La Métropole de Lyon" },{ lettre: "B", texte: "La commune de Colombier-Saugnieu" },
        { lettre: "C", texte: "La préfecture du Rhône", correct: true },{ lettre: "D", texte: "Aéroports de Lyon" },
      ]},
      { id: 12, enonce: "Le tarif A s'applique de 7h à 19h (course de jour avec retour en charge). Vrai ou Faux ?", choix: [
        { lettre: "A", texte: "Vrai", correct: true },{ lettre: "B", texte: "Faux" },
      ]},
      { id: 13, enonce: "Quel tarif pour une course de nuit avec retour à vide à la station ?", choix: [
        { lettre: "A", texte: "Tarif A" },{ lettre: "B", texte: "Tarif B" },
        { lettre: "C", texte: "Tarif C" },{ lettre: "D", texte: "Tarif D", correct: true },
      ]},
      { id: 14, enonce: "Quel tarif pour une course de jour en semaine avec retour à vide à la station ?", choix: [
        { lettre: "A", texte: "Tarif A" },{ lettre: "B", texte: "Tarif B" },
        { lettre: "C", texte: "Tarif C", correct: true },{ lettre: "D", texte: "Tarif D" },
      ]},
      { id: 15, enonce: "Course le jeudi 1er novembre (jour férié) à 9h, retour à vide. Quel tarif ?", choix: [
        { lettre: "A", texte: "Tarif A" },{ lettre: "B", texte: "Tarif B" },
        { lettre: "C", texte: "Tarif C" },{ lettre: "D", texte: "Tarif D", correct: true },
      ]},
      { id: 16, enonce: "Quel est le montant maximum de la prise en charge ?", choix: [
        { lettre: "A", texte: "2,00 €" },{ lettre: "B", texte: "2,50 €" },
        { lettre: "C", texte: "3,00 €", correct: true },{ lettre: "D", texte: "3,50 €" },
      ]},
      { id: 17, enonce: "Quel est le prix maximum de l'heure d'attente ?", choix: [
        { lettre: "A", texte: "32,74 €" },{ lettre: "B", texte: "36,60 €" },
        { lettre: "C", texte: "38,50 €" },{ lettre: "D", texte: "40,40 €", correct: true },
      ]},
      { id: 18, enonce: "Quel est le tarif minimum d'une course ?", choix: [
        { lettre: "A", texte: "6,50 €" },{ lettre: "B", texte: "7,00 €" },
        { lettre: "C", texte: "7,30 €" },{ lettre: "D", texte: "8,00 €", correct: true },
      ]},
      { id: 19, enonce: "Quels sont les montants des suppléments ?", choix: [
        { lettre: "A", texte: "Passager supplémentaire (à partir du 5ème) : 4 €" },
        { lettre: "B", texte: "Bagages encombrants : 2 € par encombrant" },
        { lettre: "C", texte: "Réservation immédiate : 2 € / Réservation à l'avance : 4 €" },
        { lettre: "D", texte: "Toutes les réponses ci-dessus", correct: true },
      ]},
      { id: 20, enonce: "Quel supplément pour le chien d'un non-voyant ?", choix: [
        { lettre: "A", texte: "1,05 €" },{ lettre: "B", texte: "2,00 €" },
        { lettre: "C", texte: "Pas de supplément", correct: true },{ lettre: "D", texte: "0,50 €" },
      ]},
      { id: 21, enonce: "Quelles conditions pour appliquer le tarif « neige-verglas » ?", choix: [
        { lettre: "A", texte: "Tarifs B/D + présence effective de neige ou verglas + pneus neige obligatoires", correct: true },
        { lettre: "B", texte: "Tarifs B/D + prévisions météo annonçant neige" },
        { lettre: "C", texte: "Tarifs A/D + présence effective de neige" },
        { lettre: "D", texte: "Le tarif neige-verglas n'existe pas" },
      ]},
      { id: 22, enonce: "Quelles communes n'appartiennent PAS à la ZUPC ?", choix: [
        { lettre: "A", texte: "Vernaison", correct: true },{ lettre: "B", texte: "Vénissieux" },
        { lettre: "C", texte: "Pusignan", correct: true },{ lettre: "D", texte: "Oullins-Pierre-Bénite" },
      ]},
      { id: 23, enonce: "Quelle autorité délivre l'ADS pour les gares Part-Dieu et Perrache ?", choix: [
        { lettre: "A", texte: "La région Auvergne-Rhône-Alpes" },
        { lettre: "B", texte: "La Métropole de Lyon", correct: true },
        { lettre: "C", texte: "Le département du Rhône" },
        { lettre: "D", texte: "La préfecture du Rhône" },
      ]},
      { id: 24, enonce: "Conséquence d'une non-exploitation d'ADS pendant plus de 12 mois ?", choix: [
        { lettre: "A", texte: "Avertissement simple" },{ lettre: "B", texte: "Suspension temporaire" },
        { lettre: "C", texte: "Retrait définitif de l'ADS", correct: true },{ lettre: "D", texte: "Amende financière" },
      ]},
      { id: 25, enonce: "Quels sont les deux niveaux de sanctions disciplinaires ?", choix: [
        { lettre: "A", texte: "Métropole (ADS) : avertissement → retrait temporaire/définitif ADS" },
        { lettre: "B", texte: "Préfecture (carte pro) : avertissement → retrait temporaire → définitif" },
        { lettre: "C", texte: "Les deux réponses ci-dessus", correct: true },
        { lettre: "D", texte: "Seule la préfecture peut sanctionner" },
      ]},
      { id: 26, enonce: "Le conducteur doit emprunter quel itinéraire pendant la course ?", choix: [
        { lettre: "A", texte: "Le plus court en distance" },
        { lettre: "B", texte: "Le plus adapté aux besoins exprimés par le client", correct: true },
        { lettre: "C", texte: "Le plus rapide selon le GPS" },
        { lettre: "D", texte: "Celui passant par les grands axes" },
      ]},
      { id: 27, enonce: "Le conducteur est tenu de référencer son véhicule sur quel registre ?", choix: [
        { lettre: "A", texte: "Google Maps" },{ lettre: "B", texte: "Waze" },
        { lettre: "C", texte: "le.taxi", correct: true },{ lettre: "D", texte: "Uber" },
      ]},
      { id: 28, enonce: "Qu'est-ce qu'un taxi-relais (art. 10, nouveau 2024) ?", choix: [
        { lettre: "A", texte: "Un taxi travaillant en relais avec un autre conducteur" },
        { lettre: "B", texte: "Un véhicule de remplacement temporaire en cas d'immobilisation, gestion préfectorale", correct: true },
        { lettre: "C", texte: "Un taxi assurant des courses entre stations" },
        { lettre: "D", texte: "Un taxi réservé aux PMR" },
      ]},
      { id: 29, enonce: "La carte grise du véhicule taxi doit-elle être au nom du titulaire de l'ADS ?", choix: [
        { lettre: "A", texte: "Oui", correct: true },{ lettre: "B", texte: "Non" },
      ]},
      { id: 30, enonce: "Quel est le montant minimum qu'un chauffeur taxi peut accepter pour un paiement ?", choix: [
        { lettre: "A", texte: "Aucun montant minimum", correct: true },{ lettre: "B", texte: "5 euros" },
        { lettre: "C", texte: "10 euros" },{ lettre: "D", texte: "15 euros" },
      ]},
    ],
  },
  {
    id: 76, actif: true,
    titre: "Réglementation Locale — Partie 1 Série 2 : Tarifs 2026, suppléments, note, affichage",
    sousTitre: "Tarification 2026, taximètre, suppléments, réservations, note de course, affichage, frais de route — Arrêté préf. n°69-2026-02-19-00002",
    questions: [
      { id: 1, enonce: "Selon l'arrêté préfectoral n°69-2026-02-19-00002 du 19 février 2026, quel est le montant maximal de la prise en charge dans le département du Rhône ?", choix: [
        { lettre: "A", texte: "2,80 €" },{ lettre: "B", texte: "3,00 €" },
        { lettre: "C", texte: "3,10 €", correct: true },{ lettre: "D", texte: "3,50 €" },
      ]},
      { id: 2, enonce: "Quel est le montant maximal de l'heure d'attente selon l'arrêté tarifaire 2026 du Rhône ?", choix: [
        { lettre: "A", texte: "40,40 €/h" },{ lettre: "B", texte: "41,00 €/h" },
        { lettre: "C", texte: "41,30 €/h", correct: true },{ lettre: "D", texte: "42,00 €/h" },
      ]},
      { id: 3, enonce: "Quel est le prix maximum du kilomètre parcouru pour le tarif A en 2026 ?", choix: [
        { lettre: "A", texte: "0,80 €/km" },{ lettre: "B", texte: "1,00 €/km", correct: true },
        { lettre: "C", texte: "1,50 €/km" },{ lettre: "D", texte: "2,00 €/km" },
      ]},
      { id: 4, enonce: "Pour le tarif D (nuit/dimanche/fériés + retour à vide), quel est le prix maximum du kilomètre en 2026 ?", choix: [
        { lettre: "A", texte: "1,50 €/km" },{ lettre: "B", texte: "2,00 €/km" },
        { lettre: "C", texte: "2,50 €/km" },{ lettre: "D", texte: "3,00 €/km", correct: true },
      ]},
      { id: 5, enonce: "À quelle distance la chute de 0,10 € s'applique-t-elle pour le tarif B (1,50 €/km) ?", choix: [
        { lettre: "A", texte: "Tous les 100 mètres" },{ lettre: "B", texte: "Tous les 50 mètres" },
        { lettre: "C", texte: "Tous les 66,67 mètres", correct: true },{ lettre: "D", texte: "Tous les 80 mètres" },
      ]},
      { id: 6, enonce: "Quelle est la valeur de l'attente marche (chute de 0,10 €) en secondes pour TOUS les tarifs A, B, C et D ?", choix: [
        { lettre: "A", texte: "5 secondes" },{ lettre: "B", texte: "8 secondes" },
        { lettre: "C", texte: "8,72 secondes", correct: true },{ lettre: "D", texte: "10 secondes" },
      ]},
      { id: 7, enonce: "La majoration pour course de nuit est plafonnée à quel pourcentage du prix du kilomètre ?", choix: [
        { lettre: "A", texte: "25 %" },{ lettre: "B", texte: "50 %", correct: true },
        { lettre: "C", texte: "75 %" },{ lettre: "D", texte: "100 %" },
      ]},
      { id: 8, enonce: "La majoration pour retour à vide est plafonnée à quel pourcentage du prix du kilomètre ?", choix: [
        { lettre: "A", texte: "50 %" },{ lettre: "B", texte: "75 %" },
        { lettre: "C", texte: "100 %", correct: true },{ lettre: "D", texte: "150 %" },
      ]},
      { id: 9, enonce: "La majoration pour route enneigée ou verglacée peut-elle être cumulée avec la majoration de nuit ?", choix: [
        { lettre: "A", texte: "Oui, les deux majorations se cumulent" },
        { lettre: "B", texte: "Non, elles ne peuvent pas être cumulées", correct: true },
        { lettre: "C", texte: "Oui, mais seulement si le client l'accepte" },
        { lettre: "D", texte: "Oui, uniquement entre 22h et 5h" },
      ]},
      { id: 10, enonce: "Quelles sont les deux conditions CUMULATIVES pour appliquer la majoration « route enneigée ou verglacée » ?", choix: [
        { lettre: "A", texte: "Routes effectivement enneigées/verglacées ET équipements spéciaux (pneus hiver)", correct: true },
        { lettre: "B", texte: "Prévision météo de neige ET accord du client" },
        { lettre: "C", texte: "Température négative ET chaussée humide" },
        { lettre: "D", texte: "Arrêté préfectoral spécial ET déclaration en mairie" },
      ]},
      { id: 11, enonce: "Selon l'arrêté 2026, quel est le montant du supplément pour un passager supplémentaire à partir du 5ème passager ?", choix: [
        { lettre: "A", texte: "2 € par passager" },{ lettre: "B", texte: "3 € par passager" },
        { lettre: "C", texte: "4 € par passager", correct: true },{ lettre: "D", texte: "5 € par passager" },
      ]},
      { id: 12, enonce: "Le supplément bagages de 2 € s'applique dans quels cas ?", choix: [
        { lettre: "A", texte: "Bagages nécessitant un équipement extérieur (coffre insuffisant)", correct: true },
        { lettre: "B", texte: "Valises au-delà de 3 par passager", correct: true },
        { lettre: "C", texte: "Tout bagage quelle que soit sa taille" },
        { lettre: "D", texte: "Uniquement pour les valises cabine" },
      ]},
      { id: 13, enonce: "Le supplément de réservation immédiate (2 €) s'applique dans quel périmètre géographique ?", choix: [
        { lettre: "A", texte: "Sur tout le département du Rhône" },
        { lettre: "B", texte: "Uniquement dans la ZUPC", correct: true },
        { lettre: "C", texte: "Uniquement dans Lyon intra-muros" },
        { lettre: "D", texte: "Dans la ZUPC et les communes limitrophes" },
      ]},
      { id: 14, enonce: "Pour une réservation à l'avance dans la ZUPC, à quel moment le taximètre est-il enclenché ?", choix: [
        { lettre: "A", texte: "Au départ du garage du chauffeur" },
        { lettre: "B", texte: "Quand le client monte dans le taxi" },
        { lettre: "C", texte: "À l'heure de la réservation et à l'adresse du client", correct: true },
        { lettre: "D", texte: "Dès que le chauffeur accepte la course" },
      ]},
      { id: 15, enonce: "Le chauffeur peut-il facturer les frais de péage au client pour le trajet en charge ?", choix: [
        { lettre: "A", texte: "Oui, automatiquement et sans condition" },
        { lettre: "B", texte: "Non, jamais" },
        { lettre: "C", texte: "Oui, uniquement sur demande expresse du client et avec le ticket joint à la note", correct: true },
        { lettre: "D", texte: "Oui, mais seulement sur autoroute" },
      ]},
      { id: 16, enonce: "Les frais de retour à vide (péage ou carburant du trajet retour) peuvent-ils être réclamés au client ?", choix: [
        { lettre: "A", texte: "Oui, si le trajet retour est long" },
        { lettre: "B", texte: "Oui, si le client a refusé le retour en charge" },
        { lettre: "C", texte: "Non, en aucun cas", correct: true },
        { lettre: "D", texte: "Oui, avec l'accord préalable du client" },
      ]},
      { id: 17, enonce: "Lorsque le client prend un taxi en station ou le hèle dans la rue, quand le taximètre est-il mis en route ?", choix: [
        { lettre: "A", texte: "Dès que le client monte dans le taxi" },
        { lettre: "B", texte: "Dès le début de la course, en appliquant les tarifs réglementaires", correct: true },
        { lettre: "C", texte: "Après 500 mètres de trajet" },
        { lettre: "D", texte: "Quand le taxi quitte la station" },
      ]},
      { id: 18, enonce: "Pour une prise en charge HORS de la ZUPC (suite à réservation), où peut être mis en route le taximètre ?", choix: [
        { lettre: "A", texte: "Au domicile du chauffeur" },
        { lettre: "B", texte: "À la dernière station ZUPC ou commune de rattachement du taxi (ou à équidistance)", correct: true },
        { lettre: "C", texte: "À la limite du département du Rhône" },
        { lettre: "D", texte: "À l'adresse du client uniquement" },
      ]},
      { id: 19, enonce: "Quel tarif doit être utilisé pendant la course d'approche pour une prise en charge hors ZUPC ?", choix: [
        { lettre: "A", texte: "Tarif C ou D" },
        { lettre: "B", texte: "Tarif A ou B (selon jour/nuit)", correct: true },
        { lettre: "C", texte: "Tarif B uniquement" },
        { lettre: "D", texte: "Aucun tarif — approche gratuite" },
      ]},
      { id: 20, enonce: "À partir de quel montant la remise d'une note est-elle OBLIGATOIRE ?", choix: [
        { lettre: "A", texte: "10 € TTC" },{ lettre: "B", texte: "15 € TTC" },
        { lettre: "C", texte: "20 € TTC" },{ lettre: "D", texte: "25 € TTC", correct: true },
      ]},
      { id: 21, enonce: "Combien d'exemplaires comprend la note remise au client ?", choix: [
        { lettre: "A", texte: "Un seul exemplaire" },
        { lettre: "B", texte: "Deux exemplaires (double)", correct: true },
        { lettre: "C", texte: "Trois exemplaires" },
        { lettre: "D", texte: "Autant que le client le souhaite" },
      ]},
      { id: 22, enonce: "Combien de temps le double de note doit-il être conservé par le prestataire ?", choix: [
        { lettre: "A", texte: "6 mois" },{ lettre: "B", texte: "1 an" },
        { lettre: "C", texte: "2 ans", correct: true },{ lettre: "D", texte: "5 ans" },
      ]},
      { id: 23, enonce: "Parmi les éléments suivants, lesquels sont OBLIGATOIREMENT imprimés sur la note via l'imprimante connectée au taximètre ?", choix: [
        { lettre: "A", texte: "La date de rédaction de la note", correct: true },
        { lettre: "B", texte: "Le numéro d'immatriculation du véhicule", correct: true },
        { lettre: "C", texte: "Le prénom du client" },
        { lettre: "D", texte: "Le montant de la course minimum", correct: true },
      ]},
      { id: 24, enonce: "Quels éléments sont inscrits MANUELLEMENT (ou imprimés) sur la note, dont la somme totale TTC ?", choix: [
        { lettre: "A", texte: "La somme totale TTC incluant les suppléments", correct: true },
        { lettre: "B", texte: "Le détail de chacun des suppléments", correct: true },
        { lettre: "C", texte: "Le nom du client (si demandé)", correct: true },
        { lettre: "D", texte: "Le trajet GPS détaillé" },
      ]},
      { id: 25, enonce: "Quelles informations doivent être affichées de manière visible et lisible dans le véhicule taxi (art. 9) ?", choix: [
        { lettre: "A", texte: "Les taux horaires et kilométriques en vigueur", correct: true },
        { lettre: "B", texte: "Les montants et conditions des suppléments", correct: true },
        { lettre: "C", texte: "L'adresse à laquelle une réclamation peut être adressée", correct: true },
        { lettre: "D", texte: "Le numéro de téléphone personnel du chauffeur" },
      ]},
      { id: 26, enonce: "Quelle lettre de couleur verte doit être apposée sur le taximètre après adaptation aux tarifs 2026 ?", choix: [
        { lettre: "A", texte: "La lettre T" },{ lettre: "B", texte: "La lettre R" },
        { lettre: "C", texte: "La lettre L", correct: true },{ lettre: "D", texte: "La lettre V" },
      ]},
      { id: 27, enonce: "Dans quel délai le taxi doit-il faire modifier la table tarifaire de son taximètre après l'entrée en vigueur de l'arrêté 2026 ?", choix: [
        { lettre: "A", texte: "1 mois" },{ lettre: "B", texte: "2 mois", correct: true },
        { lettre: "C", texte: "3 mois" },{ lettre: "D", texte: "6 mois" },
      ]},
      { id: 28, enonce: "Quel arrêté préfectoral l'arrêté du 19 février 2026 abroge-t-il ?", choix: [
        { lettre: "A", texte: "L'arrêté préfectoral n°69-2024-01-01-00001" },
        { lettre: "B", texte: "L'arrêté préfectoral n°69-2025-03-04-0002 du 4 mars 2025", correct: true },
        { lettre: "C", texte: "L'arrêté métropolitain du 27 novembre 2024" },
        { lettre: "D", texte: "L'arrêté préfectoral de 2018" },
      ]},
      { id: 29, enonce: "Quel équipement doit porter la mention « TAXI » et s'illumine en vert quand le taxi est libre ?", choix: [
        { lettre: "A", texte: "La sous-plaque ADS" },{ lettre: "B", texte: "Le taximètre" },
        { lettre: "C", texte: "Le dispositif lumineux extérieur (lumineux)", correct: true },
        { lettre: "D", texte: "La plaque d'immatriculation spéciale" },
      ]},
      { id: 30, enonce: "Quelle affirmation est vraie concernant le supplément « réservation » hors ZUPC ?", choix: [
        { lettre: "A", texte: "Il s'applique normalement comme dans la ZUPC" },
        { lettre: "B", texte: "Il est réduit de moitié" },
        { lettre: "C", texte: "Il ne s'applique pas", correct: true },
        { lettre: "D", texte: "Il est remplacé par un forfait distance" },
      ]},
    ],
  },
  {
    id: 74, actif: true,
    titre: "Réglementation Locale — Partie 2 : Taximètre, affichette, ADS, véhicule",
    sousTitre: "Taximètre hors ZUPC, affichette, notes de course, IMC, ADS, permis de circuler, véhicule, remplacement, listes d'attente",
    questions: [
      { id: 1, enonce: "À quel moment le taximètre peut-il être mis en marche hors ZUPC ?", choix: [
        { lettre: "A", texte: "Au départ de la station du conducteur" },
        { lettre: "B", texte: "Au passage de la dernière station de la ZUPC, ou à la dernière station de la commune de rattachement", correct: true },
        { lettre: "C", texte: "Au moment de la prise en charge du client" },
        { lettre: "D", texte: "À la sortie de la commune du conducteur" },
      ]},
      { id: 2, enonce: "Quelles sont les 6 mentions obligatoires de l'affichette taxi ?", choix: [
        { lettre: "A", texte: "Taux horaires/kilométriques + conditions, Montants prise en charge/suppléments, Conditions de délivrance de la note" },
        { lettre: "B", texte: "Le client peut demander nom + lieux départ/arrivée, Information paiement CB, Adresse de réclamation" },
        { lettre: "C", texte: "Les deux réponses ci-dessus regroupent les 6 mentions", correct: true },
        { lettre: "D", texte: "Seules les 3 premières mentions sont obligatoires" },
      ]},
      { id: 3, enonce: "Quelles sont les mentions imprimées obligatoires sur la note de course ?", choix: [
        { lettre: "A", texte: "Date de rédaction, Nom/dénomination sociale, Adresse de réclamation" },
        { lettre: "B", texte: "N° immatriculation véhicule, Montant course minimum, Prix TTC hors suppléments" },
        { lettre: "C", texte: "Somme totale TTC (inclut suppléments), Détail de chaque supplément" },
        { lettre: "D", texte: "Toutes les réponses ci-dessus", correct: true },
      ]},
      { id: 4, enonce: "À partir de quel montant la remise de la note est-elle obligatoire ?", choix: [
        { lettre: "A", texte: "15 € TTC" },{ lettre: "B", texte: "20 € TTC" },
        { lettre: "C", texte: "25 € TTC", correct: true },{ lettre: "D", texte: "30 € TTC" },
      ]},
      { id: 5, enonce: "Quelle est la durée de conservation des doubles des notes ?", choix: [
        { lettre: "A", texte: "1 an" },{ lettre: "B", texte: "2 ans", correct: true },
        { lettre: "C", texte: "3 ans" },{ lettre: "D", texte: "5 ans" },
      ]},
      { id: 6, enonce: "Si le client le demande, quelles mentions supplémentaires doivent figurer sur la note ?", choix: [
        { lettre: "A", texte: "Le nom du client" },
        { lettre: "B", texte: "Le lieu de départ et le lieu d'arrivée de la course" },
        { lettre: "C", texte: "Les heures de début et de fin de course" },
        { lettre: "D", texte: "Les réponses A et B", correct: true },
      ]},
      { id: 7, enonce: "Quelles sont les caractéristiques de la lettre apposée sur le cadran du taximètre après adaptation tarifaire ?", choix: [
        { lettre: "A", texte: "Lettre majuscule E de couleur bleue" },
        { lettre: "B", texte: "Lettre majuscule U de couleur verte", correct: true },
        { lettre: "C", texte: "Lettre majuscule T de couleur rouge" },
        { lettre: "D", texte: "Lettre majuscule A de couleur noire" },
      ]},
      { id: 8, enonce: "Quel est le délai pour modifier la table tarifaire du taximètre ?", choix: [
        { lettre: "A", texte: "15 jours" },{ lettre: "B", texte: "1 mois" },
        { lettre: "C", texte: "2 mois", correct: true },{ lettre: "D", texte: "3 mois" },
      ]},
      { id: 9, enonce: "Quel est l'objet de l'IMC (Instance Métropolitaine de Concertation) ?", choix: [
        { lettre: "A", texte: "Traiter de l'ensemble des questions relatives à l'organisation et au fonctionnement de la profession taxi sur le territoire de la Métropole", correct: true },
        { lettre: "B", texte: "Délivrer les cartes professionnelles" },
        { lettre: "C", texte: "Gérer les examens de taxi" },
        { lettre: "D", texte: "Fixer les tarifs nationaux" },
      ]},
      { id: 10, enonce: "Qui préside l'IMC et à quelle fréquence se réunit-elle ?", choix: [
        { lettre: "A", texte: "Le Président de la Métropole de Lyon, 1 fois par trimestre", correct: true },
        { lettre: "B", texte: "Le Préfet du Rhône, 1 fois par semestre" },
        { lettre: "C", texte: "Le Maire de Lyon, 1 fois par mois" },
        { lettre: "D", texte: "Le Ministre des Transports, 1 fois par an" },
      ]},
      { id: 11, enonce: "Qui est le seul habilité à gérer, attribuer, suspendre ou retirer les ADS sur la Métropole ?", choix: [
        { lettre: "A", texte: "Le Président de la région" },
        { lettre: "B", texte: "Le Président de la Métropole de Lyon", correct: true },
        { lettre: "C", texte: "Le Maire de Lyon" },
        { lettre: "D", texte: "Le Préfet du Rhône" },
      ]},
      { id: 12, enonce: "Qu'est-ce que le « bissage » et est-il autorisé ?", choix: [
        { lettre: "A", texte: "Le bissage (2 entreprises sur une même licence) est interdit pour les ADS d'avant le 1er octobre 2014", correct: true },
        { lettre: "B", texte: "Le bissage est autorisé pour toutes les ADS" },
        { lettre: "C", texte: "Le bissage est autorisé uniquement pour les ADS d'après 2014" },
        { lettre: "D", texte: "Le bissage désigne le partage d'un véhicule entre 2 conducteurs" },
      ]},
      { id: 13, enonce: "Quel document un salarié doit-il présenter lors de tout contrôle ?", choix: [
        { lettre: "A", texte: "Sa fiche de paie" },{ lettre: "B", texte: "Son contrat de travail", correct: true },
        { lettre: "C", texte: "Les papiers de l'entreprise" },{ lettre: "D", texte: "Son attestation de formation" },
      ]},
      { id: 14, enonce: "Quelle est la validité du Permis de Circuler et par qui est-il établi ?", choix: [
        { lettre: "A", texte: "Établi par la Préfecture, valable 2 ans" },
        { lettre: "B", texte: "Établi par le Service Taxis Métropole, valable 1 an, sécurisé par hologramme", correct: true },
        { lettre: "C", texte: "Établi par la commune, valable 6 mois" },
        { lettre: "D", texte: "Établi par le conducteur, valable indéfiniment" },
      ]},
      { id: 15, enonce: "Quel est le délai pour signaler un changement de contenu du Permis de Circuler ?", choix: [
        { lettre: "A", texte: "24 heures" },{ lettre: "B", texte: "3 jours ouvrés", correct: true },
        { lettre: "C", texte: "1 semaine" },{ lettre: "D", texte: "1 mois" },
      ]},
      { id: 16, enonce: "Quelles sont les couleurs autorisées pour les véhicules taxi ?", choix: [
        { lettre: "A", texte: "Blanche, grise ou noire", correct: true },{ lettre: "B", texte: "Toutes les couleurs" },
        { lettre: "C", texte: "Blanche ou noire uniquement" },{ lettre: "D", texte: "Blanche, grise, noire ou bleue" },
      ]},
      { id: 17, enonce: "Quelles sont les règles concernant le covering publicitaire sur un véhicule taxi ?", choix: [
        { lettre: "A", texte: "Interdit sans autorisation écrite du Service Taxis Métropole, ne doit pas gêner la lecture de la grille tarifaire ni la visibilité des vitres", correct: true },
        { lettre: "B", texte: "Totalement interdit" },
        { lettre: "C", texte: "Autorisé sans restriction" },
        { lettre: "D", texte: "Autorisé uniquement sur le capot" },
      ]},
      { id: 18, enonce: "Qui peut disposer de véhicules de remplacement ?", choix: [
        { lettre: "A", texte: "Titulaires de 10 ADS ou plus", correct: true },
        { lettre: "B", texte: "Centres radio comportant plus de 50 affiliés/abonnés", correct: true },
        { lettre: "C", texte: "Organisations professionnelles de plus de 150 adhérents", correct: true },
        { lettre: "D", texte: "Tout conducteur de taxi" },
      ]},
      { id: 19, enonce: "Combien de véhicules de remplacement sont autorisés au maximum ?", choix: [
        { lettre: "A", texte: "10 véhicules au total, 2 par bénéficiaire" },
        { lettre: "B", texte: "20 véhicules au total, 3 par bénéficiaire" },
        { lettre: "C", texte: "26 véhicules au total, 4 par bénéficiaire", correct: true },
        { lettre: "D", texte: "30 véhicules au total, 5 par bénéficiaire" },
      ]},
      { id: 20, enonce: "Quelle est la date limite pour les demandes de renouvellement de véhicules de remplacement ?", choix: [
        { lettre: "A", texte: "15 septembre pour l'IMC d'octobre" },
        { lettre: "B", texte: "15 octobre pour l'IMC de novembre" },
        { lettre: "C", texte: "15 novembre pour l'IMC de décembre", correct: true },
        { lettre: "D", texte: "15 décembre pour l'IMC de janvier" },
      ]},
      { id: 21, enonce: "Comment s'inscrire sur la liste d'attente pour une ADS gratuite ?", choix: [
        { lettre: "A", texte: "Lettre recommandée AR au Service Taxis Métropole" },
        { lettre: "B", texte: "Courriel à taximetropole@grandlyon.com (avec récépissé)" },
        { lettre: "C", texte: "Accueil direct sur RDV (avec récépissé)" },
        { lettre: "D", texte: "Toutes les réponses ci-dessus", correct: true },
      ]},
      { id: 22, enonce: "Quelle condition d'exercice est requise pour l'inscription sur liste d'attente ?", choix: [
        { lettre: "A", texte: "Exercice de conducteur de taxi ≥ 1 an sur les 3 dernières années" },
        { lettre: "B", texte: "Exercice de conducteur de taxi ≥ 2 ans sur les 5 dernières années", correct: true },
        { lettre: "C", texte: "Exercice de conducteur de taxi ≥ 3 ans sur les 7 dernières années" },
        { lettre: "D", texte: "Aucune condition d'exercice" },
      ]},
      { id: 23, enonce: "Quand doit être effectuée la demande de renouvellement d'inscription sur liste d'attente ?", choix: [
        { lettre: "A", texte: "1 mois avant l'échéance" },{ lettre: "B", texte: "2 mois avant l'échéance" },
        { lettre: "C", texte: "3 mois avant l'échéance", correct: true },{ lettre: "D", texte: "6 mois avant l'échéance" },
      ]},
      { id: 24, enonce: "Quels documents sont nécessaires pour une 1ère inscription sur liste d'attente (ADS gratuite) ?", choix: [
        { lettre: "A", texte: "Attestation sur l'honneur de non-détention d'ADS + carte professionnelle en cours de validité" },
        { lettre: "B", texte: "Certificat de capacité ou formation continue + attestation préfectorale d'aptitude physique" },
        { lettre: "C", texte: "Les deux réponses ci-dessus", correct: true },
        { lettre: "D", texte: "Seule la carte professionnelle suffit" },
      ]},
      { id: 25, enonce: "Les droits de stationnement sont fixés et perçus par qui ?", choix: [
        { lettre: "A", texte: "La Métropole de Lyon" },
        { lettre: "B", texte: "La commune de rattachement de l'ADS", correct: true },
        { lettre: "C", texte: "La préfecture du Rhône" },
        { lettre: "D", texte: "Le Service Taxis" },
      ]},
      { id: 26, enonce: "Quelle est la conséquence d'un défaut de paiement des droits de stationnement ?", choix: [
        { lettre: "A", texte: "Retrait de points sur le permis de conduire" },
        { lettre: "B", texte: "Sanction administrative (incident d'exploitation)", correct: true },
        { lettre: "C", texte: "Suspension du permis de conduire" },
        { lettre: "D", texte: "Aucune conséquence" },
      ]},
      { id: 27, enonce: "La location-gérance exonère-t-elle le titulaire de sa responsabilité sur l'exploitation de l'ADS ?", choix: [
        { lettre: "A", texte: "Oui, le locataire-gérant assume toute la responsabilité" },
        { lettre: "B", texte: "Non, le titulaire reste responsable de l'exploitation", correct: true },
        { lettre: "C", texte: "Oui, si le contrat le prévoit expressément" },
        { lettre: "D", texte: "La responsabilité est partagée à 50/50" },
      ]},
      { id: 28, enonce: "Dans quels cas est-il possible de suspendre une ADS délivrée avant le 1er octobre 2014 ?", choix: [
        { lettre: "A", texte: "Non-conformité réglementaire du véhicule constatée par un agent assermenté", correct: true },
        { lettre: "B", texte: "Droits de stationnement non honorés", correct: true },
        { lettre: "C", texte: "Perte de 4 points sur le permis de conduire" },
        { lettre: "D", texte: "Non-respect du code de la route" },
      ]},
      { id: 29, enonce: "À qui doit être adressé le contrat de location-gérance avant enregistrement au Service Taxis ?", choix: [
        { lettre: "A", texte: "La mairie" },
        { lettre: "B", texte: "La chambre des métiers et de l'artisanat", correct: true },
        { lettre: "C", texte: "La chambre de commerce et d'industrie" },
        { lettre: "D", texte: "La préfecture" },
      ]},
    ],
  },
  {
    id: 75, actif: true,
    titre: "Réglementation Locale — Partie 3 : Convention CPAM, transport sanitaire",
    sousTitre: "Conventionnement CPAM, tarification sanitaire, abattements, majorations, PMR, sanctions, trousse de secours",
    questions: [
      { id: 1, enonce: "Quelles sont les pièces à fournir pour le conventionnement CPAM ?", choix: [
        { lettre: "A", texte: "Convention complétée signée, carte grise véhicule, carte pro, K-bis ou D1, permis de circuler" },
        { lettre: "B", texte: "Attestation d'assurance taxi, contrat location-gérance, convention CPAM signée" },
        { lettre: "C", texte: "Contrat de travail pour chaque salarié, déclaration préalable à l'embauche (URSSAF)" },
        { lettre: "D", texte: "Toutes les réponses ci-dessus (10 documents obligatoires)", correct: true },
      ]},
      { id: 2, enonce: "Quel est le forfait de prise en charge pour un transport sanitaire ?", choix: [
        { lettre: "A", texte: "18,05 €" },{ lettre: "B", texte: "25 €" },
        { lettre: "C", texte: "28 € (13 € prise en charge + 15 € grande ville)", correct: true },{ lettre: "D", texte: "32 €" },
      ]},
      { id: 3, enonce: "Combien de kilomètres sont inclus dans le forfait de prise en charge ?", choix: [
        { lettre: "A", texte: "2 km" },{ lettre: "B", texte: "3 km" },
        { lettre: "C", texte: "4 km", correct: true },{ lettre: "D", texte: "5 km" },
      ]},
      { id: 4, enonce: "Quel est le prix du kilomètre au-delà des 4 premiers km (transport sanitaire de jour) ?", choix: [
        { lettre: "A", texte: "0,87 €" },{ lettre: "B", texte: "0,97 €" },
        { lettre: "C", texte: "1,07 €", correct: true },{ lettre: "D", texte: "1,17 €" },
      ]},
      { id: 5, enonce: "Comment est calculé le tarif de JOUR pour un transport sanitaire en charge ?", choix: [
        { lettre: "A", texte: "Nombre de km × 1,07 € + 28 €" },
        { lettre: "B", texte: "(Nombre de km − 4) × 1,07 € + 28 €", correct: true },
        { lettre: "C", texte: "Nombre de km × 1,50 € + 28 €" },
        { lettre: "D", texte: "(28 € + km) × 1,5" },
      ]},
      { id: 6, enonce: "Comment est calculé le tarif de NUIT/dimanche/fériés pour un transport sanitaire ?", choix: [
        { lettre: "A", texte: "(Nombre de km − 4) × 1,07 € + 28 €" },
        { lettre: "B", texte: "(28 € + nombre de km) × 1,5", correct: true },
        { lettre: "C", texte: "Nombre de km × 2,30 € + 28 €" },
        { lettre: "D", texte: "Nombre de km × 1,07 € × 2" },
      ]},
      { id: 7, enonce: "Le tarif D (route enneigée/verglacée) s'applique-t-il aux transports sanitaires ?", choix: [
        { lettre: "A", texte: "Oui" },{ lettre: "B", texte: "Non", correct: true },
      ]},
      { id: 8, enonce: "À partir de quel moment le kilométrage est-il pris en compte pour un transport sanitaire ?", choix: [
        { lettre: "A", texte: "À partir de la station du taxi" },
        { lettre: "B", texte: "À partir du siège de l'entreprise" },
        { lettre: "C", texte: "À partir du lieu de prise en charge du patient", correct: true },
        { lettre: "D", texte: "À partir de la sortie de la commune" },
      ]},
      { id: 9, enonce: "Quel est l'abattement pour le transport simultané de 2 patients ?", choix: [
        { lettre: "A", texte: "20 %" },{ lettre: "B", texte: "23 %", correct: true },
        { lettre: "C", texte: "30 %" },{ lettre: "D", texte: "35 %" },
      ]},
      { id: 10, enonce: "Quel est l'abattement pour le transport simultané de 3 patients ?", choix: [
        { lettre: "A", texte: "25 %" },{ lettre: "B", texte: "30 %" },
        { lettre: "C", texte: "33 %" },{ lettre: "D", texte: "35 %", correct: true },
      ]},
      { id: 11, enonce: "Quel est l'abattement pour 4 patients ou plus ?", choix: [
        { lettre: "A", texte: "35 %" },{ lettre: "B", texte: "37 %", correct: true },
        { lettre: "C", texte: "40 %" },{ lettre: "D", texte: "45 %" },
      ]},
      { id: 12, enonce: "Quel abattement s'applique en cas de longue distance (≥ 30 km seul) dans un transport partagé ?", choix: [
        { lettre: "A", texte: "0 % (pas d'abattement)" },
        { lettre: "B", texte: "5 % pour le patient seul sur la longue distance", correct: true },
        { lettre: "C", texte: "10 %" },{ lettre: "D", texte: "23 %" },
      ]},
      { id: 13, enonce: "Quelle majoration s'applique pour une hospitalisation avec retour à vide, distance en charge < 50 km ?", choix: [
        { lettre: "A", texte: "+10 %" },{ lettre: "B", texte: "+20 %" },
        { lettre: "C", texte: "+25 %", correct: true },{ lettre: "D", texte: "+50 %" },
      ]},
      { id: 14, enonce: "Quelle majoration s'applique pour une hospitalisation avec retour à vide, distance en charge ≥ 50 km ?", choix: [
        { lettre: "A", texte: "+25 %" },{ lettre: "B", texte: "+35 %" },
        { lettre: "C", texte: "+50 %", correct: true },{ lettre: "D", texte: "+75 %" },
      ]},
      { id: 15, enonce: "Quel est le montant du supplément PMR pour le transport sanitaire ?", choix: [
        { lettre: "A", texte: "20 €" },{ lettre: "B", texte: "25 €" },
        { lettre: "C", texte: "30 €", correct: true },{ lettre: "D", texte: "35 €" },
      ]},
      { id: 16, enonce: "Les frais de péage sont-ils remboursables pour les transports sanitaires ?", choix: [
        { lettre: "A", texte: "Oui, sur présentation des justificatifs de passage", correct: true },
        { lettre: "B", texte: "Non, ils sont à la charge du transporteur" },
        { lettre: "C", texte: "Oui, mais uniquement pour les trajets > 100 km" },
        { lettre: "D", texte: "Oui, forfaitairement" },
      ]},
      { id: 17, enonce: "Combien de temps le transporteur doit-il conserver les relevés de péage ?", choix: [
        { lettre: "A", texte: "12 mois" },{ lettre: "B", texte: "24 mois" },
        { lettre: "C", texte: "33 mois", correct: true },{ lettre: "D", texte: "60 mois" },
      ]},
      { id: 18, enonce: "Quels cas nécessitent la majoration hospitalisation retour à vide ?", choix: [
        { lettre: "A", texte: "Hospitalisations complètes, partielles ou ambulatoires" },
        { lettre: "B", texte: "Séances de chimiothérapie, radiothérapie et hémodialyse" },
        { lettre: "C", texte: "Les deux réponses ci-dessus", correct: true },
        { lettre: "D", texte: "Uniquement les hospitalisations complètes" },
      ]},
      { id: 19, enonce: "Quels transports sont soumis à accord préalable de la CPAM ?", choix: [
        { lettre: "A", texte: "Séries ≥ 4 transports d'une distance > 50 km aller, sur 2 mois, pour le même traitement" },
        { lettre: "B", texte: "Transports en un lieu distant de plus de 150 km aller" },
        { lettre: "C", texte: "Les deux réponses ci-dessus", correct: true },
        { lettre: "D", texte: "Tous les transports sanitaires" },
      ]},
      { id: 20, enonce: "Qui doit signer la facture de transport sanitaire ?", choix: [
        { lettre: "A", texte: "Le conducteur uniquement" },
        { lettre: "B", texte: "La personne transportée (ou son représentant légal)", correct: true },
        { lettre: "C", texte: "Le médecin prescripteur" },
        { lettre: "D", texte: "La CPAM" },
      ]},
      { id: 21, enonce: "Si le patient n'est pas en état de signer la facture, que doit faire le transporteur ?", choix: [
        { lettre: "A", texte: "Faire signer un témoin" },
        { lettre: "B", texte: "Porter la mention « impossibilité physique ou mentale de signer »", correct: true },
        { lettre: "C", texte: "Laisser la facture sans signature" },
        { lettre: "D", texte: "Appeler la CPAM pour autorisation" },
      ]},
      { id: 22, enonce: "Dans quels cas l'entreprise peut-elle voir son conventionnement CPAM suspendu ?", choix: [
        { lettre: "A", texte: "Absence de permis de conduire" },
        { lettre: "B", texte: "Absence de carte professionnelle" },
        { lettre: "C", texte: "Perte d'exploitation ADS" },
        { lettre: "D", texte: "Toutes les réponses ci-dessus", correct: true },
      ]},
      { id: 23, enonce: "De quel délai dispose l'entreprise pour présenter ses observations suite à une constatation de non-respect ?", choix: [
        { lettre: "A", texte: "7 jours" },{ lettre: "B", texte: "15 jours" },
        { lettre: "C", texte: "21 jours", correct: true },{ lettre: "D", texte: "30 jours" },
      ]},
      { id: 24, enonce: "Quelle est la durée maximale d'un déconventionnement ?", choix: [
        { lettre: "A", texte: "1 an" },{ lettre: "B", texte: "3 ans" },
        { lettre: "C", texte: "5 ans", correct: true },{ lettre: "D", texte: "10 ans" },
      ]},
      { id: 25, enonce: "Que doit comporter la trousse de secours obligatoire ? (10 éléments)", choix: [
        { lettre: "A", texte: "Compresses stériles, pansement américain, bande extensible, solution antiseptique non iodée" },
        { lettre: "B", texte: "Ciseaux, 2 clips de fixation, gants stériles" },
        { lettre: "C", texte: "Sucre en morceaux, sacs vomitifs, couverture de survie" },
        { lettre: "D", texte: "Toutes les réponses ci-dessus (10 éléments obligatoires)", correct: true },
      ]},
    ],
  },
];
