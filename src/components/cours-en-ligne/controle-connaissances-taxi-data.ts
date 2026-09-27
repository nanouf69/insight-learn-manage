// ===== Module "Contrôle de connaissances TAXI" =====
// 65 questions réparties en 5 parties — QCM et QRC

interface ExerciceChoix {
  lettre: string;
  texte: string;
  correct?: boolean;
}

interface ExerciceQuestion {
  id: number;
  enonce: string;
  choix: ExerciceChoix[];
  type?: "qcm" | "qrc";
  reponsesAttendues?: string[];
}

interface ExerciceItem {
  id: number;
  titre: string;
  sousTitre?: string;
  actif: boolean;
  questions?: ExerciceQuestion[];
}

interface ContentItem {
  id: number;
  titre: string;
  sousTitre?: string;
  description?: string;
  actif: boolean;
  fichiers?: { nom: string; url: string }[];
}

interface ModuleData {
  id: number;
  nom: string;
  description: string;
  cours: ContentItem[];
  exercices: ExerciceItem[];
}

// =============================================
// PARTIE 1 — RÉGLEMENTATION GÉNÉRALE DU TAXI (Q1-Q13)
// =============================================
const PARTIE_1: ExerciceItem = {
  id: 1,
  titre: "Partie 1 — Réglementation générale du taxi",
  sousTitre: "Questions 1 à 13 — Définition, ADS, statuts, maraude",
  actif: true,
  questions: [
    {
      id: 1,
      enonce: "Quelle est la définition légale du taxi ?",
      choix: [
        { lettre: "A", texte: "Les taxis sont des véhicules automobiles comportant, outre le siège du conducteur, huit places assises au maximum, munis d'équipements spéciaux et d'un terminal de paiement électronique, et dont le propriétaire ou l'exploitant est titulaire d'une autorisation de stationnement sur la voie publique, en attente de la clientèle, afin d'effectuer, à la demande de celle-ci et à titre onéreux, le transport particulier des personnes et de leurs bagages.", correct: true },
        { lettre: "B", texte: "Les taxis sont des véhicules de transport comportant 8 places assises chauffeur inclus, avec des équipements spéciaux, un lumineux extérieur et un terminal de paiement, stationnant sur la voie publique pour le transport à titre onéreux." },
        { lettre: "C", texte: "Les taxis sont des véhicules automobiles comportant 9 places assises incluant le siège conducteur, munis d'équipements spéciaux et d'un terminal de paiement électronique." },
      ],
    },
    {
      id: 2,
      enonce: "Quels sont les différents statuts auxquels sont assujettis les chauffeurs de taxi ?",
      choix: [
        { lettre: "A", texte: "Artisan, coopérateur et locataire-gérant" },
        { lettre: "B", texte: "Artisan et locataire" },
        { lettre: "C", texte: "Artisan, salarié, coopérateur et locataire-gérant", correct: true },
      ],
    },
    {
      id: 3,
      enonce: "Le taxi a-t-il le droit à la maraude ?",
      choix: [
        { lettre: "A", texte: "Non" },
        { lettre: "B", texte: "Oui, partout en France" },
        { lettre: "C", texte: "Oui, uniquement dans sa zone de prise en charge (ZUPC)", correct: true },
      ],
    },
    {
      id: 4,
      enonce: "Les autorisations de stationnement délivrées depuis le 1er octobre 2014 sont-elles cessibles (vendables) ou louables ?",
      choix: [
        { lettre: "A", texte: "Oui" },
        { lettre: "B", texte: "Non", correct: true },
        { lettre: "C", texte: "Oui, si elles ont été délivrées par la préfecture" },
      ],
    },
    {
      id: 5,
      enonce: "Qui délivre les autorisations de stationnement (ADS) ?",
      choix: [
        { lettre: "A", texte: "La préfecture" },
        { lettre: "B", texte: "Le maire, le préfet de police pour Paris, la métropole ou l'EPCI", correct: true },
        { lettre: "C", texte: "La région" },
      ],
    },
    {
      id: 6,
      enonce: "Combien de temps est valable l'inscription sur la liste d'attente pour une ADS ?",
      choix: [
        { lettre: "A", texte: "1 an" },
        { lettre: "B", texte: "2 ans", correct: true },
        { lettre: "C", texte: "3 ans" },
      ],
    },
    {
      id: 7,
      enonce: "Quelles sont les personnes prioritaires pour l'obtention d'une ADS gratuite ?",
      choix: [
        { lettre: "A", texte: "Toute personne ayant une carte taxi" },
        { lettre: "B", texte: "Un taxi justifiant d'une expérience minimum de 2 ans au cours des 5 dernières années", correct: true },
        { lettre: "C", texte: "Un taxi justifiant d'une expérience minimum de 3 ans au cours des 5 dernières années" },
      ],
    },
    {
      id: 8,
      enonce: "À partir de quand doit-on renouveler les nouvelles licences (ADS) ?",
      choix: [
        { lettre: "A", texte: "Au moins 1 mois avant la fin de validité de l'ADS" },
        { lettre: "B", texte: "Au moins 2 mois avant la fin de validité de l'ADS" },
        { lettre: "C", texte: "Au moins 3 mois avant la fin de validité de l'ADS", correct: true },
      ],
    },
    {
      id: 9,
      enonce: "Dans quels cas les ADS sont-elles retirées définitivement ?",
      choix: [
        { lettre: "A", texte: "Lorsqu'elle n'est pas exploitée de façon effective et continue", correct: true },
        { lettre: "B", texte: "Non-respect de la réglementation", correct: true },
        { lettre: "C", texte: "En cas de travail partiel" },
      ],
    },
    {
      id: 10,
      enonce: "Y a-t-il des conditions pour acheter une ADS ?",
      choix: [
        { lettre: "A", texte: "Oui" },
        { lettre: "B", texte: "Non" },
        { lettre: "C", texte: "Oui, à condition qu'elle ait été délivrée avant le 1er octobre 2014", correct: true },
      ],
    },
    {
      id: 11,
      enonce: "Peut-on vendre une ADS acquise à titre onéreux ou gracieux ? Si oui, à quelles conditions ?",
      choix: [
        { lettre: "A", texte: "Soit depuis au moins 5 ans, si la licence a déjà été revendue" },
        { lettre: "B", texte: "Pendant au moins 15 ans à partir de sa date de délivrance (s'il n'y a pas eu de revente), soit depuis au moins 5 ans si la licence a déjà été revendue", correct: true },
        { lettre: "C", texte: "Non" },
      ],
    },
    {
      id: 12,
      enonce: "Dans quels cas peut-il être dérogé aux délais d'exploitation de 5 ou 15 ans ?",
      choix: [
        { lettre: "A", texte: "En cas de décès du titulaire : ses ayants droit ont la faculté de présentation d'un successeur pendant 1 an suivant le décès", correct: true },
        { lettre: "B", texte: "En cas d'inaptitude médicale définitive entraînant l'annulation du permis de conduire", correct: true },
        { lettre: "C", texte: "En cas de redressement ou liquidation judiciaire du titulaire de l'ADS", correct: true },
        { lettre: "D", texte: "Dans aucun de ces cas" },
      ],
    },
    {
      id: 13,
      enonce: "À partir de quel montant de course doit-on remettre la facture au client sans son consentement ?",
      choix: [
        { lettre: "A", texte: "La facture est établie en double exemplaire et doit atteindre 30 € TTC" },
        { lettre: "B", texte: "La facture est à la seule demande du client" },
        { lettre: "C", texte: "La facture est établie en double exemplaire et doit obligatoirement être remise au client dès que le prix de la course atteint 25 € TTC", correct: true },
      ],
    },
  ],
};

// =============================================
// PARTIE 2 — CARTE PROFESSIONNELLE & OBLIGATIONS (Q14-Q28)
// =============================================
const PARTIE_2: ExerciceItem = {
  id: 2,
  titre: "Partie 2 — Carte professionnelle & obligations",
  sousTitre: "Questions 14 à 28 — Documents, contrôles, équipements",
  actif: true,
  questions: [
    {
      id: 14,
      enonce: "Citez au moins un document prouvant l'exploitation effective et continue de l'ADS.",
      type: "qrc",
      reponsesAttendues: [
        "avis d'imposition",
        "contrat de location",
        "bilan comptable",
        "fiches de paie",
        "relevé de carrière URSSAF",
      ],
      choix: [],
    },
    {
      id: 15,
      enonce: "Un chauffeur de taxi peut-il refuser les chèques ?",
      choix: [
        { lettre: "A", texte: "Oui" },
        { lettre: "B", texte: "Non" },
        { lettre: "C", texte: "Oui, à condition d'une indication voyante sur le véhicule", correct: true },
      ],
    },
    {
      id: 16,
      enonce: "Le terminal de paiement est-il obligatoire pour les chauffeurs de taxi ?",
      choix: [
        { lettre: "A", texte: "Le chauffeur a le droit de refuser" },
        { lettre: "B", texte: "C'est obligatoire pour les chauffeurs de taxi", correct: true },
        { lettre: "C", texte: "Le chauffeur de taxi peut décider lui-même d'accepter les cartes bancaires" },
      ],
    },
    {
      id: 17,
      enonce: "Qu'est-ce que la TICPE ?",
      choix: [
        { lettre: "A", texte: "La Taxe Intérieure sur la Consommation des Produits Énergétiques", correct: true },
        { lettre: "B", texte: "La Taxe Intérieure sur la Communication du Pétrole et de l'Énergie" },
        { lettre: "C", texte: "La Taxe Intérieure sur le Contribuable pour les Produits d'Énergie" },
      ],
    },
    {
      id: 18,
      enonce: "Quelles sont les conditions pour pouvoir effectuer du transport assis professionnalisé (TAP) pour un taxi ?",
      choix: [
        { lettre: "A", texte: "Depuis plus de 2 ans d'exploitation de la licence si elle a été attribuée avant le 1er février 2019", correct: true },
        { lettre: "B", texte: "Depuis plus de 3 ans d'exploitation de la licence pour les licences attribuées après le 1er février 2019", correct: true },
      ],
    },
    {
      id: 19,
      enonce: "Quels sont les cas de résiliation du conventionnement CPAM ?",
      choix: [
        { lettre: "A", texte: "Si l'entreprise taxi est condamnée dans les 3 ans qui précèdent, d'une condamnation définitive pour fraude" },
        { lettre: "B", texte: "Si l'entreprise taxi est condamnée dans les 5 ans qui précèdent, d'une condamnation définitive pour fraude", correct: true },
        { lettre: "C", texte: "Si l'entreprise taxi est condamnée dans les 7 ans qui précèdent, d'une condamnation définitive pour fraude" },
      ],
    },
    {
      id: 20,
      enonce: "En disposant de la carte de taxi, peut-on effectuer du transport de personnes sous le régime LOTI ? Si oui, comment ?",
      choix: [
        { lettre: "A", texte: "Oui" },
        { lettre: "B", texte: "Non" },
        { lettre: "C", texte: "Oui, en étant inscrit au registre des transporteurs (DREAL)", correct: true },
      ],
    },
    {
      id: 21,
      enonce: "Peut-on faire du transport assis professionnalisé (CPAM) en étant sous le régime LOTI ?",
      choix: [
        { lettre: "A", texte: "Oui" },
        { lettre: "B", texte: "Non", correct: true },
      ],
    },
    {
      id: 22,
      enonce: "Citez 3 précautions à prendre en effectuant un transport de personnes sous le régime LOTI.",
      type: "qrc",
      reponsesAttendues: [
        "taximètre éteint",
        "lumineux taxi bâché",
        "pas dans les horaires de service taxi",
        "macaron LOTI à la place de la carte professionnelle",
      ],
      choix: [],
    },
    {
      id: 23,
      enonce: "Quelles informations comportent la carte de chauffeur taxi ?",
      type: "qrc",
      reponsesAttendues: [
        "code à barres bidimensionnel",
        "2D-DOC",
        "préfecture de délivrance",
        "date de fin de validité",
        "numéro de la carte",
        "photographie d'identité",
      ],
      choix: [],
    },
    {
      id: 24,
      enonce: "Par qui sont gérées et entretenues les stations de taxi ?",
      choix: [
        { lettre: "A", texte: "La mairie", correct: true },
        { lettre: "B", texte: "La préfecture" },
        { lettre: "C", texte: "Le préfet de police pour Paris", correct: true },
      ],
    },
    {
      id: 25,
      enonce: "Quels sont les documents à présenter en cas de contrôle en station ou sur la voie publique ?",
      type: "qrc",
      reponsesAttendues: [
        "carte professionnelle",
        "carte grise",
        "permis de conduire",
        "attestation d'assurance",
        "attestation de suivi de stage",
        "certificat médical",
        "carnet métrologique",
      ],
      choix: [],
    },
    {
      id: 26,
      enonce: "Quelles sont les obligations des titulaires de la carte de taxi ?",
      choix: [
        { lettre: "A", texte: "Une visite médicale", correct: true },
        { lettre: "B", texte: "Des leçons de conduite" },
        { lettre: "C", texte: "Suivre une formation continue", correct: true },
        { lettre: "D", texte: "Un contrôle technique tous les 4 ans" },
      ],
    },
    {
      id: 27,
      enonce: "Quels sont les cas où le chauffeur de taxi peut refuser une course ?",
      choix: [
        { lettre: "A", texte: "Tenue incorrecte des clients", correct: true },
        { lettre: "B", texte: "Un risque de dégradation du véhicule de la part du client", correct: true },
        { lettre: "C", texte: "Un surplus de bagages comparé au volume du coffre", correct: true },
        { lettre: "D", texte: "Les animaux des personnes malvoyantes" },
      ],
    },
    {
      id: 28,
      enonce: "Quels sont les équipements obligatoires pour les chauffeurs de taxi ?",
      type: "qrc",
      reponsesAttendues: [
        "taximètre",
        "plaque d'autorisation de stationnement",
        "macaron",
        "dispositif extérieur lumineux",
        "imprimante reliée au taximètre",
        "terminal de paiement",
      ],
      choix: [],
    },
  ],
};

// =============================================
// PARTIE 3 — TARIFICATION (Q29-Q37)
// =============================================
const PARTIE_3: ExerciceItem = {
  id: 3,
  titre: "Partie 3 — Tarification",
  sousTitre: "Questions 29 à 37 — Tarifs A/B/C/D, suppléments, minimum",
  actif: true,
  questions: [
    {
      id: 29,
      enonce: "Quel est le tarif maximum de prise en charge sur le département du Rhône ?",
      choix: [
        { lettre: "A", texte: "3 €", correct: true },
        { lettre: "B", texte: "4 €" },
        { lettre: "C", texte: "2,50 €" },
      ],
    },
    {
      id: 30,
      enonce: "Quelles sont les horaires des courses de nuit ?",
      choix: [
        { lettre: "A", texte: "19h30 à 7h30" },
        { lettre: "B", texte: "19h à 7h", correct: true },
        { lettre: "C", texte: "20h à 6h" },
        { lettre: "D", texte: "20h30 à 5h30" },
      ],
    },
    {
      id: 31,
      enonce: "Dans quels cas le tarif maximum du kilomètre parcouru peut-il être majoré ?",
      choix: [
        { lettre: "A", texte: "Sur route effectivement enneigée ou verglacée", correct: true },
        { lettre: "B", texte: "En cas de retard de la part du client" },
        { lettre: "C", texte: "Périodes estivales" },
        { lettre: "D", texte: "Nuit, dimanche et jours fériés", correct: true },
      ],
    },
    {
      id: 32,
      enonce: "Quel est le tarif A ?",
      choix: [
        { lettre: "A", texte: "Course de jour – Trajet aller avec le client et retour en charge à la station", correct: true },
        { lettre: "B", texte: "Course de jour – Trajet aller avec le client et retour à vide à la station" },
        { lettre: "C", texte: "Course de nuit/dimanche/jours fériés/neige – Trajet aller avec le client et retour en charge à la station" },
      ],
    },
    {
      id: 33,
      enonce: "Quel est le tarif B ?",
      choix: [
        { lettre: "A", texte: "Course de jour – Trajet aller avec le client et retour à vide à la station", correct: true },
        { lettre: "B", texte: "Course de jour – Trajet aller avec le client et retour en charge à la station" },
        { lettre: "C", texte: "Course de nuit/dimanche/jours fériés/neige – Trajet aller avec le client et retour à vide à la station" },
      ],
    },
    {
      id: 34,
      enonce: "Quel est le tarif C ?",
      choix: [
        { lettre: "A", texte: "Course de nuit/dimanche/jours fériés/neige – Trajet aller avec le client et retour en charge à la station", correct: true },
        { lettre: "B", texte: "Course de jour – Trajet aller avec le client et retour à vide" },
        { lettre: "C", texte: "Course de nuit/dimanche/jours fériés/neige – Trajet aller avec le client et retour à vide" },
      ],
    },
    {
      id: 35,
      enonce: "Quel est le tarif D ?",
      choix: [
        { lettre: "A", texte: "Course de nuit/dimanche/jours fériés/neige – Trajet aller avec le client et retour à vide à la station", correct: true },
        { lettre: "B", texte: "Course de jour – Trajet aller avec le client et retour en charge" },
        { lettre: "C", texte: "Course de jour – Trajet aller avec le client et retour à vide" },
      ],
    },
    {
      id: 36,
      enonce: "Quel est le tarif minimum, suppléments inclus, de jour ou de nuit ainsi que les dimanches et jours fériés ?",
      choix: [
        { lettre: "A", texte: "7,10 €" },
        { lettre: "B", texte: "7,20 €" },
        { lettre: "C", texte: "7,30 €", correct: true },
        { lettre: "D", texte: "8,00 €" },
      ],
    },
    {
      id: 37,
      enonce: "Quels sont les différents suppléments et leur tarif ?",
      type: "qrc",
      reponsesAttendues: [
        "supplément passager 4 €",
        "supplément réservation à l'avance 4 €",
        "4 €",
      ],
      choix: [],
    },
  ],
};

// =============================================
// PARTIE 4 — EXPLOITATION & GESTION DE L'ADS (Q38-Q45)
// =============================================
const PARTIE_4: ExerciceItem = {
  id: 4,
  titre: "Partie 4 — Exploitation & gestion de l'ADS",
  sousTitre: "Questions 38 à 45 — Location, vente, interdictions",
  actif: true,
  questions: [
    {
      id: 38,
      enonce: "La location de licence seule est-elle autorisée ?",
      choix: [
        { lettre: "A", texte: "Oui" },
        { lettre: "B", texte: "Non", correct: true },
      ],
    },
    {
      id: 39,
      enonce: "Citez 3 mentions qui doivent être inscrites sur le bon de commande.",
      type: "qrc",
      reponsesAttendues: [
        "nom ou dénomination sociale",
        "numéro d'inscription au registre du commerce",
        "coordonnées téléphoniques du client",
        "date et heure de la réservation",
        "date et heure de la prise en charge",
        "lieu de prise en charge",
      ],
      choix: [],
    },
    {
      id: 40,
      enonce: "Citez 3 documents à présenter pour la vente à titre onéreux d'une ADS.",
      type: "qrc",
      reponsesAttendues: [
        "compromis de vente",
        "arrêté initial d'attribution",
        "avis d'imposition",
        "relevé de carrière",
        "URSSAF",
      ],
      choix: [],
    },
    {
      id: 41,
      enonce: "Quelles mentions sont inscrites dans le registre des transactions ?",
      choix: [
        { lettre: "A", texte: "Le numéro fiscal" },
        { lettre: "B", texte: "Le numéro unique d'identification, l'inscription au répertoire des entrepreneurs (SIREN)", correct: true },
        { lettre: "C", texte: "Les noms et raisons sociales du titulaire de l'autorisation et du successeur présenté", correct: true },
        { lettre: "D", texte: "Le bilan comptable de la société" },
      ],
    },
    {
      id: 42,
      enonce: "Qui est le seul habilité à gérer, attribuer, suspendre ou retirer les ADS sur le territoire de la Métropole ?",
      choix: [
        { lettre: "A", texte: "Le maire" },
        { lettre: "B", texte: "Le préfet" },
        { lettre: "C", texte: "Le Président de la Métropole", correct: true },
      ],
    },
    {
      id: 43,
      enonce: "Quelle sanction risque-t-on pour la non-exploitation d'une ADS d'une durée supérieure à 12 mois ?",
      choix: [
        { lettre: "A", texte: "Un avertissement" },
        { lettre: "B", texte: "Un retrait définitif", correct: true },
        { lettre: "C", texte: "Une suspension" },
      ],
    },
    {
      id: 44,
      enonce: "Quelles sont les interdictions d'un conducteur de taxi ?",
      choix: [
        { lettre: "A", texte: "Fumer dans le véhicule, y compris cigarette électronique, même vitre ouverte et/ou à l'arrêt en station", correct: true },
        { lettre: "B", texte: "Être accompagné par une personne autre que le client", correct: true },
        { lettre: "C", texte: "Faire une pause pipi" },
        { lettre: "D", texte: "Accueillir un animal lui appartenant", correct: true },
      ],
    },
    {
      id: 45,
      enonce: "Quand doit être effectuée la demande de renouvellement d'inscription sur liste d'attente pour l'obtention d'une ADS ?",
      choix: [
        { lettre: "A", texte: "Maximum 3 mois avant la date d'échéance de l'attestation d'inscription", correct: true },
        { lettre: "B", texte: "Maximum 2 mois avant" },
        { lettre: "C", texte: "Maximum 1 mois avant" },
      ],
    },
  ],
};

// =============================================
// PARTIE 5 — CONNAISSANCE DU TERRITOIRE (Q46-Q65)
// =============================================
const PARTIE_5: ExerciceItem = {
  id: 5,
  titre: "Partie 5 — Connaissance du territoire (Lyon & Rhône)",
  sousTitre: "Questions 46 à 65 — Adresses, tarifs, géographie",
  actif: true,
  questions: [
    {
      id: 46,
      enonce: "Citez l'adresse de la cathédrale Saint-Jean.",
      type: "qrc",
      reponsesAttendues: ["Place Saint-Jean, 69005 Lyon", "Place Saint-Jean"],
      choix: [],
    },
    {
      id: 47,
      enonce: "Citez l'adresse de la mairie de Lyon 4.",
      type: "qrc",
      reponsesAttendues: ["133 boulevard de la Croix-Rousse, 69004 Lyon", "133 boulevard de la Croix-Rousse"],
      choix: [],
    },
    {
      id: 48,
      enonce: "Citez l'adresse de la mairie de Lyon 6.",
      type: "qrc",
      reponsesAttendues: ["58 rue de Sèze, 69006 Lyon", "58 rue de Sèze"],
      choix: [],
    },
    {
      id: 49,
      enonce: "Citez l'adresse du commissariat du 8e arrondissement.",
      type: "qrc",
      reponsesAttendues: ["Avenue Marius Berliet, 69008 Lyon", "Avenue Marius Berliet"],
      choix: [],
    },
    {
      id: 50,
      enonce: "Citez l'adresse de la clinique de la Sauvegarde.",
      type: "qrc",
      reponsesAttendues: ["480 avenue Ben Gourion, 69009 Lyon", "480 avenue Ben Gourion"],
      choix: [],
    },
    {
      id: 51,
      enonce: "Citez deux gares de la ville de Lyon.",
      type: "qrc",
      reponsesAttendues: ["Part-Dieu", "Perrache", "Vaise", "Jean Macé"],
      choix: [],
    },
    {
      id: 52,
      enonce: "Citez l'adresse du musée des Marionnettes.",
      type: "qrc",
      reponsesAttendues: ["1 place du Petit-Collège, 69005 Lyon", "1 place du Petit-Collège"],
      choix: [],
    },
    {
      id: 53,
      enonce: "Citez l'adresse du musée des Confluences.",
      type: "qrc",
      reponsesAttendues: ["86 quai Perrache, 69002 Lyon", "86 quai Perrache"],
      choix: [],
    },
    {
      id: 54,
      enonce: "Quelle station de taxi se trouve la plus proche de l'hôpital Édouard Herriot ?",
      type: "qrc",
      reponsesAttendues: ["Place d'Arsonval", "Station taxis de Lyon 3e"],
      choix: [],
    },
    {
      id: 55,
      enonce: "Nous sommes le 8 novembre 2020, il est 6h50, nous emmenons un client à la gare Part-Dieu. Quel tarif appliquer ?",
      type: "qrc",
      reponsesAttendues: ["Tarif C", "Tarif D", "tarif de nuit"],
      choix: [],
    },
    {
      id: 56,
      enonce: "Nous sommes le 10 janvier, il est 19h50, un client souhaite aller place Bellecour. Quel tarif appliquer ?",
      choix: [
        { lettre: "A", texte: "Tarif A" },
        { lettre: "B", texte: "Tarif B" },
        { lettre: "C", texte: "Tarif C (nuit → retour en charge possible)", correct: true },
        { lettre: "D", texte: "Tarif D" },
      ],
    },
    {
      id: 57,
      enonce: "Un client a oublié un objet dans le véhicule taxi après une dépose sur Givors. Où le déposer ?",
      choix: [
        { lettre: "A", texte: "Aux services des objets trouvés de la mairie de dépose ou auprès de l'autorité de délivrance de l'ADS dans un délai maximum de 24 heures", correct: true },
        { lettre: "B", texte: "Dans un délai maximum de 48 heures" },
        { lettre: "C", texte: "Dans un délai maximum de 72 heures" },
      ],
    },
    {
      id: 58,
      enonce: "Je souhaite m'inscrire sur une liste d'attente pour l'obtention d'une ADS gratuite sur la commune de Villefranche. À qui m'adresser ?",
      choix: [
        { lettre: "A", texte: "Mairie de Villefranche", correct: true },
        { lettre: "B", texte: "Métropole de Lyon" },
        { lettre: "C", texte: "Préfecture du Rhône" },
      ],
    },
    {
      id: 59,
      enonce: "Citez 4 boulevards du 6e arrondissement.",
      type: "qrc",
      reponsesAttendues: ["Stalingrad", "Brotteaux", "Jules Favre", "Belges", "Anatole France"],
      choix: [],
    },
    {
      id: 60,
      enonce: "Citez 4 avenues du 7e arrondissement.",
      type: "qrc",
      reponsesAttendues: ["Leclerc", "Tony Garnier", "Berthelot", "Château de Gerland", "Debourg", "Jean Jaurès", "Félix Faure"],
      choix: [],
    },
    {
      id: 61,
      enonce: "Citez 3 places du 3e arrondissement.",
      type: "qrc",
      reponsesAttendues: ["Guichard", "Arsonval", "Gabriel Péri", "Charles Béraudier", "Rouget de l'Isle", "Bir-Hakeim", "Voltaire"],
      choix: [],
    },
    {
      id: 62,
      enonce: "Citez 4 stations de taxi dans le 2e arrondissement.",
      type: "qrc",
      reponsesAttendues: ["Jacobins", "Cordeliers", "Gailleton", "Carnot", "Verdun", "Barre", "Bellecour"],
      choix: [],
    },
    {
      id: 63,
      enonce: "Citez 4 parcs dans Lyon.",
      type: "qrc",
      reponsesAttendues: ["Tête d'Or", "Gerland", "Blandan", "Cerisaie", "Hauteurs", "Bazin"],
      choix: [],
    },
    {
      id: 64,
      enonce: "Quelle station se trouve la plus proche de l'hôpital Mermoz ?",
      type: "qrc",
      reponsesAttendues: ["Rue Jacqueline Auriol", "Jacqueline Auriol"],
      choix: [],
    },
    {
      id: 65,
      enonce: "Citez 4 autoroutes traversant le département du Rhône.",
      type: "qrc",
      reponsesAttendues: ["A7", "A42", "A43", "A46", "A89", "A450"],
      choix: [],
    },
  ],
};

// =============================================
// ASSEMBLAGE DU MODULE COMPLET
// =============================================
export const CONTROLE_CONNAISSANCES_TAXI_DATA: ModuleData = {
  id: 13,
  nom: "CONTRÔLE DE CONNAISSANCES TAXI",
  description: "65 questions (QCM et QRC) réparties en 5 parties : Réglementation générale, Carte professionnelle, Tarification, Exploitation ADS, Connaissance du territoire (Lyon & Rhône).",
  cours: [
    {
      id: 1,
      titre: "Présentation du contrôle de connaissances",
      description: `Ce module regroupe 65 questions pour vérifier vos connaissances en vue de l'examen TAXI.

📋 5 parties :
1. Réglementation générale du taxi (Q1-Q13)
2. Carte professionnelle & obligations (Q14-Q28)
3. Tarification (Q29-Q37)
4. Exploitation & gestion de l'ADS (Q38-Q45)
5. Connaissance du territoire — Lyon & Rhône (Q46-Q65)

📝 Types de questions :
• QCM : Questions à choix multiples (une ou plusieurs bonnes réponses)
• QRC : Questions à réponse courte (rédigez votre réponse)

Les QRC sont corrigées par IA. Pour les matières techniques, l'orthographe et les abréviations sont tolérées.

📌 Commencez par les exercices ci-dessous pour vous entraîner !`,
      actif: true,
    },
  ],
  exercices: [PARTIE_1, PARTIE_2, PARTIE_3, PARTIE_4, PARTIE_5],
};
