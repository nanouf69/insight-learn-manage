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
