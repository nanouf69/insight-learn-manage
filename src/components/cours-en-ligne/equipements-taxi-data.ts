// ===== Module Équipements et Documents TAXI =====

interface ContentItem {
  id: number;
  titre: string;
  sousTitre?: string;
  description?: string;
  actif: boolean;
  fichiers?: { nom: string; url: string }[];
}

interface ExerciceQuestion {
  id: number;
  enonce: string;
  choix: { lettre: string; texte: string; correct?: boolean }[];
}

interface ExerciceItem {
  id: number;
  titre: string;
  sousTitre?: string;
  actif: boolean;
  questions?: ExerciceQuestion[];
}

interface ModuleData {
  id: number;
  nom: string;
  description: string;
  cours: ContentItem[];
  exercices: ExerciceItem[];
}

const EQUIPEMENTS_COURS: ContentItem[] = [
  {
    id: 64001,
    actif: true,
    titre: "Équipements et documents obligatoires du TAXI",
    sousTitre: "Taximètre, lumineux, imprimante, TPE, carte professionnelle, carnet métrologique…",
    fichiers: [
      { nom: "PDF Équipements et Documents TAXI", url: "/cours/vtc/Equipements_et_documents_TAXI.pdf" },
    ],
  },
];

const EQUIPEMENTS_EXERCICES: ExerciceItem[] = [
  {
    id: 64100,
    titre: "📝 Équipements et Documents TAXI",
    sousTitre: "10 questions — Vérifiez vos connaissances",
    actif: true,
    questions: [
      {
        id: 1,
        enonce: "Quel appareil permet de calculer le prix de la course dans un taxi ?",
        choix: [
          { lettre: "A", texte: "Le compteur kilométrique", correct: false },
          { lettre: "B", texte: "Le taximètre homologué", correct: true },
          { lettre: "C", texte: "Le GPS", correct: false },
          { lettre: "D", texte: "Le terminal de paiement", correct: false },
        ],
      },
      {
        id: 2,
        enonce: "Que doit indiquer le lumineux situé sur le toit du taxi ?",
        choix: [
          { lettre: "A", texte: "Le numéro de téléphone du chauffeur", correct: false },
          { lettre: "B", texte: "La commune de rattachement du taxi", correct: true },
          { lettre: "C", texte: "Le prix de la course", correct: false },
          { lettre: "D", texte: "La marque du véhicule", correct: false },
        ],
      },
      {
        id: 3,
        enonce: "L'imprimante à bord du taxi doit être :",
        choix: [
          { lettre: "A", texte: "Facultative selon le département", correct: false },
          { lettre: "B", texte: "En état de fonctionnement et permettre la remise d'une note", correct: true },
          { lettre: "C", texte: "Utilisée uniquement pour les courses de plus de 50 €", correct: false },
          { lettre: "D", texte: "Connectée à Internet", correct: false },
        ],
      },
      {
        id: 4,
        enonce: "Le Terminal de Paiement Électronique (TPE) dans un taxi doit être :",
        choix: [
          { lettre: "A", texte: "Caché dans la boîte à gants", correct: false },
          { lettre: "B", texte: "Visible et en état de fonctionnement", correct: true },
          { lettre: "C", texte: "Utilisé uniquement pour les clients professionnels", correct: false },
          { lettre: "D", texte: "Facultatif si le chauffeur accepte les espèces", correct: false },
        ],
      },
      {
        id: 5,
        enonce: "Où doit être placée la carte professionnelle TAXI dans le véhicule ?",
        choix: [
          { lettre: "A", texte: "Dans le coffre du véhicule", correct: false },
          { lettre: "B", texte: "Sur le côté gauche du pare-brise, visible de l'extérieur", correct: true },
          { lettre: "C", texte: "Dans la boîte à gants", correct: false },
          { lettre: "D", texte: "Sur le tableau de bord côté passager", correct: false },
        ],
      },
      {
        id: 6,
        enonce: "Que comporte le recto de la carte professionnelle TAXI ?",
        choix: [
          { lettre: "A", texte: "Le numéro de la carte, la photo d'identité, la préfecture de délivrance et la date de fin de validité", correct: true },
          { lettre: "B", texte: "Uniquement le nom et le prénom du conducteur", correct: false },
          { lettre: "C", texte: "Le tarif kilométrique en vigueur", correct: false },
          { lettre: "D", texte: "Le numéro d'immatriculation du véhicule", correct: false },
        ],
      },
      {
        id: 7,
        enonce: "Que comporte le verso de la carte professionnelle TAXI ?",
        choix: [
          { lettre: "A", texte: "Le tarif de la course", correct: false },
          { lettre: "B", texte: "Le nom, prénom, date et lieu de naissance, et signature du conducteur", correct: true },
          { lettre: "C", texte: "Le numéro de plaque d'immatriculation", correct: false },
          { lettre: "D", texte: "Le nom de la société de taxi", correct: false },
        ],
      },
      {
        id: 8,
        enonce: "Par qui sont fixés les tarifs affichés dans un taxi ?",
        choix: [
          { lettre: "A", texte: "Par le chauffeur de taxi", correct: false },
          { lettre: "B", texte: "Par la société de taxi", correct: false },
          { lettre: "C", texte: "Par l'arrêté préfectoral du département", correct: true },
          { lettre: "D", texte: "Par le ministère des transports", correct: false },
        ],
      },
      {
        id: 9,
        enonce: "À quoi sert le carnet métrologique dans un taxi ?",
        choix: [
          { lettre: "A", texte: "À noter les courses effectuées dans la journée", correct: false },
          { lettre: "B", texte: "À tracer les références du taximètre et les opérations d'installation, vérification et changement de tarifs", correct: true },
          { lettre: "C", texte: "À enregistrer les réclamations des clients", correct: false },
          { lettre: "D", texte: "À calculer le chiffre d'affaires mensuel", correct: false },
        ],
      },
      {
        id: 10,
        enonce: "La trousse de soins est obligatoire pour :",
        choix: [
          { lettre: "A", texte: "Tous les taxis sans exception", correct: false },
          { lettre: "B", texte: "Les taxis conventionnés CPAM uniquement", correct: true },
          { lettre: "C", texte: "Les taxis de nuit", correct: false },
          { lettre: "D", texte: "Les taxis effectuant des trajets longue distance", correct: false },
        ],
      },
    ],
  },
];

export const EQUIPEMENTS_TAXI_DATA: ModuleData = {
  id: 64,
  nom: "ÉQUIPEMENTS TAXI",
  description: "Équipements et documents obligatoires du taxi : taximètre, lumineux, imprimante, TPE, affichage des tarifs, trousse de soins, carte professionnelle, carnet métrologique.",
  cours: EQUIPEMENTS_COURS,
  exercices: EQUIPEMENTS_EXERCICES,
};
