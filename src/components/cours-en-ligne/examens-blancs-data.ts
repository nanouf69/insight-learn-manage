import { BILAN_T3P_QUESTIONS } from "./bilan-questions-t3p";
import { BILAN_GESTION_QUESTIONS } from "./bilan-questions-gestion";
import { BILAN_SECURITE_QUESTIONS } from "./bilan-questions-securite";
import { BILAN_FRANCAIS_QUESTIONS } from "./bilan-questions-francais";
import { BILAN_ANGLAIS_QUESTIONS } from "./bilan-questions-anglais";
import { BILAN_REGLEMENTATION_VTC_QUESTIONS } from "./bilan-questions-reglementation-vtc";
import { BILAN_DEV_COMMERCIAL_QUESTIONS } from "./bilan-questions-dev-commercial";

export type QuestionType = "QCM" | "QRC";

export interface Choix {
  lettre: string;
  texte: string;
  correct?: boolean;
}

export interface Question {
  id: number;
  type: QuestionType;
  enonce: string;
  choix?: Choix[];
  reponseQRC?: string;
  reponses_possibles?: string[];
}

export interface Matiere {
  id: string;
  nom: string;
  duree: number; // en minutes
  coefficient: number;
  noteEliminatoire: number;
  noteSur: number;
  questions: Question[];
}

export interface ExamenBlanc {
  id: string;
  numero: number;
  type: "TAXI" | "VTC" | "TA" | "VA";
  titre: string;
  matieres: Matiere[];
}

/**
 * Retourne les points attribués pour une question selon la matière et le type de question.
 * - Français (D) : QCM=2pts, QRC=2pts
 * - Réglementation spécifique (F) et Réglementation locale (G) : QCM=2pts, QRC=4pts
 * - Toutes les autres matières : QCM=1pt, QRC=2pts
 */
export function getPointsParQuestion(matiereId: string, questionType: QuestionType): number {
  // Matières Bilan : tout est à 1 point (QCM uniquement)
  if (matiereId.startsWith("bilan_") || matiereId.startsWith("bilan_pratique")) {
    return 1;
  }
  if (matiereId === "francais") {
    return questionType === "QCM" ? 2 : 2;
  }
  if (
    matiereId === "reglementation_taxi" ||
    matiereId === "reglementation_vtc" ||
    matiereId === "reglementation_taxi2" ||
    matiereId === "reglementation_vtc2"
  ) {
    return questionType === "QCM" ? 2 : 4;
  }
  // Défaut : t3p, gestion, securite, anglais
  return questionType === "QCM" ? 1 : 2;
}


// ===== MATIÈRES COMMUNES (T3P, GESTION, SÉCURITÉ ROUTIÈRE, FRANÇAIS, ANGLAIS) =====

const matiere_t3p_examen1: Matiere = {
  id: "t3p",
  nom: "A - Transport Public Particulier de Personnes (T3P)",
  duree: 45,
  coefficient: 3,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QRC", enonce: "Je me fais contrôler sur la route, quels documents communs aux trois professions dois-je présenter aux forces de l'ordre ?",
      reponseQRC: "Le permis de conduire. La carte professionnelle. L'attestation de formation continue. Le certificat médical. L'attestation d'assurance du véhicule. L'attestation de responsabilité civile professionnelle (RCP).",
      reponses_possibles: ["permis de conduire", "carte professionnelle", "attestation de formation", "certificat médical", "assurance", "responsabilité civile"]
    },
    {
      id: 2, type: "QRC", enonce: "Qu'est-ce que l'honorabilité dans votre profession ?",
      reponseQRC: "Avoir le casier judiciaire B2 vierge.",
      reponses_possibles: ["casier judiciaire b2 vierge", "casier b2 vierge", "b2 vierge"]
    },
    {
      id: 3, type: "QRC", enonce: "Que devez-vous présenter aux agents susceptibles d'effectuer des contrôles pour justifier d'une réservation préalable ?",
      reponseQRC: "Un document écrit sur papier ou support électronique.",
      reponses_possibles: ["document écrit", "papier ou support électronique", "document papier ou électronique"]
    },
    {
      id: 4, type: "QRC", enonce: "Citez trois des conditions d'accès et/ou d'exercice aux professions de conducteurs de T3P :",
      reponseQRC: "Réussite à l'examen. Carte professionnelle en cours de validité. Formation continue. Aptitude médicale. Honorabilité. Assurance responsabilité civile professionnelle.",
      reponses_possibles: ["examen", "carte professionnelle", "formation continue", "aptitude médicale", "honorabilité", "assurance"]
    },
    {
      id: 5, type: "QRC", enonce: "Quelles sont les sanctions possibles qui peuvent être décidées par les commissions disciplinaires locales ?",
      reponseQRC: "Un avertissement. Un retrait temporaire. Un retrait définitif de la carte professionnelle.",
      reponses_possibles: ["avertissement", "retrait temporaire", "retrait définitif"]
    },
    {
      id: 6, type: "QCM", enonce: "Quelles sont les conditions requises pour pouvoir passer l'examen de T3P ?",
      choix: [
        { lettre: "A", texte: "Avoir son permis de conduire depuis plus de 5 ans" },
        { lettre: "B", texte: "Avoir 10 points minimum sur son permis de conduire", correct: true },
        { lettre: "C", texte: "Casier judiciaire B2 vierge", correct: true }
      ]
    },
    {
      id: 7, type: "QCM", enonce: "Quelles sont les sanctions possibles en cas d'exercice illégal d'une des professions du T3P ?",
      choix: [
        { lettre: "A", texte: "Une amende de 30 000 € et deux ans d'emprisonnement" },
        { lettre: "B", texte: "Une amende de 15 000 € et un an d'emprisonnement", correct: true },
        { lettre: "C", texte: "Une amende de 1 500 € et six mois d'emprisonnement" }
      ]
    },
    {
      id: 8, type: "QCM", enonce: "Pour effectuer du T3P, le véhicule doit :",
      choix: [
        { lettre: "A", texte: "Être de couleur blanche" },
        { lettre: "B", texte: "Avoir des tailles de pneumatiques fixées par décret" },
        { lettre: "C", texte: "Avoir une signalétique distinctive", correct: true }
      ]
    },
    {
      id: 9, type: "QCM", enonce: "Parmi les entreprises du T3P, quelles sont celles soumises à l'obligation de s'assurer en responsabilité civile professionnelle ?",
      choix: [
        { lettre: "A", texte: "VTC et 2 ou 3 roues" },
        { lettre: "B", texte: "Le taxi, VTC et 2 ou 3 roues seulement" },
        { lettre: "C", texte: "Le taxi seulement" },
        { lettre: "D", texte: "Le taxi et le VTC seulement", correct: true }
      ]
    },
    {
      id: 10, type: "QCM", enonce: "Qui délivre les agréments aux centres de formation ?",
      choix: [
        { lettre: "A", texte: "Les conseils départementaux" },
        { lettre: "B", texte: "L'association permanente des chambres de métiers et de l'artisanat" },
        { lettre: "C", texte: "Les préfectures", correct: true },
        { lettre: "D", texte: "Le ministère des transports" }
      ]
    },
    {
      id: 11, type: "QCM", enonce: "Qui préside la commission locale du T3P ?",
      choix: [
        { lettre: "A", texte: "Le représentant de chaque collège à tour de rôle" },
        { lettre: "B", texte: "Le préfet ou son représentant", correct: true },
        { lettre: "C", texte: "Le directeur des transports du département" },
        { lettre: "D", texte: "Le Président de la chambre de métiers" }
      ]
    },
    {
      id: 12, type: "QCM", enonce: "Quelle est la durée du mandat des membres de la commission locale des T3P ?",
      choix: [
        { lettre: "A", texte: "3 ans" },
        { lettre: "B", texte: "2 ans" },
        { lettre: "C", texte: "5 ans", correct: true },
        { lettre: "D", texte: "1 an" }
      ]
    },
    {
      id: 13, type: "QCM", enonce: "Un client avec une prescription médicale sera remboursé de son transport s'il utilise :",
      choix: [
        { lettre: "A", texte: "Un taxi conventionné ou un VTC conventionné" },
        { lettre: "B", texte: "Un VTC conventionné ou un taxi moto conventionné" },
        { lettre: "C", texte: "Un taxi conventionné, un taxi moto conventionné ou un VTC conventionné" },
        { lettre: "D", texte: "Un taxi conventionné", correct: true }
      ]
    },
    {
      id: 14, type: "QCM", enonce: "Quels agents sont habilités à effectuer un contrôle routier de conducteur de T3P ?",
      choix: [
        { lettre: "A", texte: "Les agents représentant la SNCF" },
        { lettre: "B", texte: "Les gendarmes", correct: true },
        { lettre: "C", texte: "Le juge du tribunal d'instance" },
        { lettre: "D", texte: "Les policiers", correct: true }
      ]
    },
    {
      id: 15, type: "QCM", enonce: "Parmi les condamnations suivantes, lesquelles peuvent être mentionnées au bulletin n°2 du casier judiciaire ?",
      choix: [
        { lettre: "A", texte: "Transporter des objets insalubres sans autorisation" },
        { lettre: "B", texte: "Conduire avec un taux d'alcool de 0,8g/L ou plus", correct: true },
        { lettre: "C", texte: "Transporter un détecteur de radar", correct: true },
        { lettre: "D", texte: "Poursuivre sa route après avoir occasionné un accident", correct: true }
      ]
    }
  ]
};

const matiere_gestion_examen1: Matiere = {
  id: "gestion",
  nom: "B - Gestion",
  duree: 45,
  coefficient: 2,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QRC", enonce: "Citez deux régimes de base de la protection sociale en France.",
      reponseQRC: "Le régime général et le régime agricole.",
      reponses_possibles: ["régime général", "régime agricole", "régimes spéciaux"]
    },
    {
      id: 2, type: "QRC", enonce: "Développez le sigle URSSAF.",
      reponseQRC: "Union de Recouvrement des cotisations de Sécurité Sociale et d'Allocations Familiales.",
      reponses_possibles: ["union de recouvrement", "sécurité sociale", "allocations familiales"]
    },
    {
      id: 3, type: "QCM", enonce: "À l'actif du bilan figure :",
      choix: [
        { lettre: "A", texte: "Les créances des clients", correct: true },
        { lettre: "B", texte: "Le capital" },
        { lettre: "C", texte: "Le bénéfice de l'année" }
      ]
    },
    {
      id: 4, type: "QCM", enonce: "Quelle mention n'est pas obligatoire sur le bulletin de salaire ?",
      choix: [
        { lettre: "A", texte: "Le montant net à payer" },
        { lettre: "B", texte: "Le diplôme du salarié", correct: true },
        { lettre: "C", texte: "La convention collective applicable" }
      ]
    },
    {
      id: 5, type: "QCM", enonce: "La SAS est sur le plan juridique :",
      choix: [
        { lettre: "A", texte: "Une personne juridique" },
        { lettre: "B", texte: "Une personne morale", correct: true },
        { lettre: "C", texte: "Une personne professionnelle" },
        { lettre: "D", texte: "Une personne physique" }
      ]
    },
    {
      id: 6, type: "QCM", enonce: "Dans un bilan comptable, un amortissement fait baisser :",
      choix: [
        { lettre: "A", texte: "Les charges" },
        { lettre: "B", texte: "Le bénéfice", correct: true },
        { lettre: "C", texte: "L'imposition" }
      ]
    },
    {
      id: 7, type: "QCM", enonce: "La libération totale du capital social dans une SARL doit intervenir au plus tard dans un délai de :",
      choix: [
        { lettre: "A", texte: "99 ans" },
        { lettre: "B", texte: "5 ans", correct: true },
        { lettre: "C", texte: "10 ans" },
        { lettre: "D", texte: "1 an" }
      ]
    },
    {
      id: 8, type: "QCM", enonce: "Les montants figurant dans le compte de résultat sont :",
      choix: [
        { lettre: "A", texte: "HT", correct: true },
        { lettre: "B", texte: "TTC" },
        { lettre: "C", texte: "BIC" }
      ]
    },
    {
      id: 9, type: "QCM", enonce: "Au 1er janvier 2016, j'achète un véhicule 20 000€ HT amortissable sur 4 ans, et un ordinateur 600€ HT sur 3 ans. Quelle est la dotation d'amortissement déductible en 2017 ?",
      choix: [
        { lettre: "A", texte: "5 300 €" },
        { lettre: "B", texte: "5 200 €", correct: true },
        { lettre: "C", texte: "10 400 €" },
        { lettre: "D", texte: "4 198 €" }
      ]
    },
    {
      id: 10, type: "QCM", enonce: "Existe-t-il une durée minimale pour un contrat à durée déterminée ?",
      choix: [
        { lettre: "A", texte: "1 mois" },
        { lettre: "B", texte: "Pas de durée minimale", correct: true },
        { lettre: "C", texte: "7 jours" },
        { lettre: "D", texte: "15 jours" }
      ]
    },
    {
      id: 11, type: "QCM", enonce: "Pour une entreprise sous statut SARL, la TVA est :",
      choix: [
        { lettre: "A", texte: "Une charge financière" },
        { lettre: "B", texte: "Une charge" },
        { lettre: "C", texte: "Un mouvement de trésorerie", correct: true },
        { lettre: "D", texte: "Un produit" }
      ]
    },
    {
      id: 12, type: "QCM", enonce: "Quelle est la dépense qui ne constitue pas une charge pour l'entreprise ?",
      choix: [
        { lettre: "A", texte: "Intérêt d'un prêt professionnel" },
        { lettre: "B", texte: "Abonnement à une revue professionnelle" },
        { lettre: "C", texte: "Remboursement du capital d'un prêt professionnel", correct: true }
      ]
    },
    {
      id: 13, type: "QCM", enonce: "Je peux être gérant minoritaire d'une entreprise individuelle ?",
      choix: [
        { lettre: "A", texte: "Sous certaines conditions" },
        { lettre: "B", texte: "Oui" },
        { lettre: "C", texte: "Non", correct: true }
      ]
    },
    {
      id: 14, type: "QCM", enonce: "Quel statut du conjoint du chef d'entreprise ne convient pas à l'entreprise individuelle ?",
      choix: [
        { lettre: "A", texte: "Conjoint salarié" },
        { lettre: "B", texte: "Conjoint hors statut" },
        { lettre: "C", texte: "Conjoint associé", correct: true },
        { lettre: "D", texte: "Conjoint collaborateur" }
      ]
    },
    {
      id: 15, type: "QCM", enonce: "Vous empruntez 25 000€ sur 5 ans, l'annuité est de 5 600€. Quel est le coût de l'emprunt ?",
      choix: [
        { lettre: "A", texte: "4 200 €" },
        { lettre: "B", texte: "3 000 €", correct: true },
        { lettre: "C", texte: "3 600 €" }
      ]
    },
    {
      id: 16, type: "QCM", enonce: "Qu'est-ce qu'un chiffre d'affaires ?",
      choix: [
        { lettre: "A", texte: "L'argent qui reste en banque après avoir payé toutes les charges" },
        { lettre: "B", texte: "L'ensemble des commandes ou devis" },
        { lettre: "C", texte: "L'ensemble des sommes facturées aux clients", correct: true },
        { lettre: "D", texte: "La différence entre les produits et les charges" }
      ]
    }
  ]
};

const matiere_securite_examen1: Matiere = {
  id: "securite",
  nom: "C - Sécurité routière",
  duree: 30,
  coefficient: 3,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QCM", enonce: "Pour faire établir une nouvelle carte grise lors d'un changement de domicile, le propriétaire dispose de :",
      choix: [
        { lettre: "A", texte: "3 semaines" },
        { lettre: "B", texte: "1 mois", correct: true },
        { lettre: "C", texte: "15 jours" }
      ]
    },
    {
      id: 2, type: "QCM", enonce: "En agglomération éclairée la nuit :",
      choix: [
        { lettre: "A", texte: "Je dois rouler en feux de croisement" },
        { lettre: "B", texte: "Je peux rouler en feux de position", correct: true },
        { lettre: "C", texte: "Je peux rouler en feux de croisement" },
        { lettre: "D", texte: "Je peux rouler sans feux" }
      ]
    },
    {
      id: 3, type: "QCM", enonce: "Sur les routes à 2x2 voies séparées par une ligne continue, la vitesse est limitée à :",
      choix: [
        { lettre: "A", texte: "90 km/h" },
        { lettre: "B", texte: "110 km/h", correct: true },
        { lettre: "C", texte: "130 km/h" }
      ]
    },
    {
      id: 4, type: "QCM", enonce: "Les éléments qui favorisent le risque d'aquaplanage sont :",
      choix: [
        { lettre: "A", texte: "Une grande quantité d'eau sur la chaussée", correct: true },
        { lettre: "B", texte: "Une vitesse élevée", correct: true },
        { lettre: "C", texte: "Une route sèche" },
        { lettre: "D", texte: "Un fort vent latéral" }
      ]
    },
    {
      id: 5, type: "QCM", enonce: "En agglomération, à quelle distance d'un danger les panneaux de signalisation sont-ils placés ?",
      choix: [
        { lettre: "A", texte: "100 m" },
        { lettre: "B", texte: "40 m" },
        { lettre: "C", texte: "50 m", correct: true },
        { lettre: "D", texte: "30 m" }
      ]
    },
    {
      id: 6, type: "QCM", enonce: "La roue de secours est-elle obligatoire dans une voiture ?",
      choix: [
        { lettre: "A", texte: "Non, la réglementation française ne l'impose pas", correct: true },
        { lettre: "B", texte: "Oui, il s'agit d'un équipement de sécurité" },
        { lettre: "C", texte: "Oui, il s'agit d'une obligation européenne" }
      ]
    },
    {
      id: 7, type: "QCM", enonce: "Que faut-il faire en cas d'incendie dans un tunnel ?",
      choix: [
        { lettre: "A", texte: "Réduire la distance de sécurité à l'arrêt pour faciliter l'accès des secours" },
        { lettre: "B", texte: "Faire un demi-tour avec son véhicule pour fuir au plus vite" },
        { lettre: "C", texte: "Laisser les clefs de contact sur le véhicule, après avoir éteint le moteur", correct: true },
        { lettre: "D", texte: "Évacuer le tunnel par l'issue de secours la plus proche", correct: true }
      ]
    },
    {
      id: 8, type: "QCM", enonce: "En roulant à 90 km/h, un conducteur doit laisser une distance de sécurité de :",
      choix: [
        { lettre: "A", texte: "20 mètres environ" },
        { lettre: "B", texte: "80 mètres environ" },
        { lettre: "C", texte: "50 mètres environ", correct: true },
        { lettre: "D", texte: "30 mètres environ" }
      ]
    },
    {
      id: 9, type: "QCM", enonce: "Conduire durant une période de suspension :",
      choix: [
        { lettre: "A", texte: "Je commets un délit", correct: true },
        { lettre: "B", texte: "Je risque un retrait de 6 points de mon permis de conduire" },
        { lettre: "C", texte: "Il ne peut pas y avoir de retrait de point" }
      ]
    },
    {
      id: 10, type: "QCM", enonce: "Je dépasse un cycliste hors agglomération, je dois laisser un espace de sécurité :",
      choix: [
        { lettre: "A", texte: "De 2,50 m" },
        { lettre: "B", texte: "De 1 m" },
        { lettre: "C", texte: "De 1,5 m", correct: true }
      ]
    },
    {
      id: 11, type: "QCM", enonce: "En cas de non-paiement, une amende forfaitaire devient majorée à l'issue d'un délai de :",
      choix: [
        { lettre: "A", texte: "30 jours" },
        { lettre: "B", texte: "40 jours" },
        { lettre: "C", texte: "45 jours", correct: true }
      ]
    },
    {
      id: 12, type: "QCM", enonce: "Hors agglomération, à quelle distance d'un danger les panneaux de signalisation sont-ils placés ?",
      choix: [
        { lettre: "A", texte: "50 m" },
        { lettre: "B", texte: "200 m" },
        { lettre: "C", texte: "100 m" },
        { lettre: "D", texte: "150 m", correct: true }
      ]
    },
    {
      id: 13, type: "QCM", enonce: "Les témoins sur le tableau de bord qui alertent d'une urgence mécanique sont de couleur :",
      choix: [
        { lettre: "A", texte: "Bleue" },
        { lettre: "B", texte: "Rouge", correct: true },
        { lettre: "C", texte: "Orange" },
        { lettre: "D", texte: "Verte" }
      ]
    },
    {
      id: 14, type: "QCM", enonce: "Un permis B permet de transporter au maximum :",
      choix: [
        { lettre: "A", texte: "7 passagers" },
        { lettre: "B", texte: "8 passagers", correct: true },
        { lettre: "C", texte: "9 passagers" },
        { lettre: "D", texte: "6 passagers" }
      ]
    },
    {
      id: 15, type: "QCM", enonce: "Si mon temps de réaction augmente :",
      choix: [
        { lettre: "A", texte: "La distance de réaction augmente", correct: true },
        { lettre: "B", texte: "La distance d'arrêt augmente", correct: true },
        { lettre: "C", texte: "La distance de freinage augmente" },
        { lettre: "D", texte: "La distance d'arrêt est inchangée" }
      ]
    }
  ]
};

const matiere_francais_examen1: Matiere = {
  id: "francais",
  nom: "D - Capacité d'expression et de compréhension en langue française",
  duree: 30,
  coefficient: 2,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QRC", enonce: "Selon l'auteur, comment peut-on expliquer le comportement agressif de certains automobilistes ?",
      reponseQRC: "La voiture est vécue comme une sphère privée, le prolongement de l'habitat, ce qui explique des comportements agressifs face à tout écart perçu comme une agression à la propriété privée.",
      reponses_possibles: ["sphère privée", "prolongement de l'habitat", "agression", "comportements agressifs"]
    },
    {
      id: 2, type: "QRC", enonce: "Qu'est-ce qui a permis de mettre en évidence les différents comportements routiers ?",
      reponseQRC: "L'attitude est porteuse de sens, sinon d'intentions, ce qui a permis de mettre en évidence les différents comportements routiers.",
      reponses_possibles: ["attitude", "comportements", "mise en évidence"]
    },
    {
      id: 3, type: "QRC", enonce: "Disposer d'une voiture est synonyme d'avantage selon vous. Développez votre réponse.",
      reponseQRC: "Oui : raccourcir le temps de trajet, liberté de déplacement. Mais cela crée aussi des comportements agressifs, de la pollution et des accidents.",
      reponses_possibles: ["temps de trajet", "liberté", "pollution", "accidents", "comportements"]
    },
    {
      id: 4, type: "QCM", enonce: "Selon l'auteur, après quel événement l'automobile est-elle devenue symbole de liberté individuelle ?",
      choix: [
        { lettre: "A", texte: "Après la démocratisation", correct: true },
        { lettre: "B", texte: "Après la première guerre mondiale" },
        { lettre: "C", texte: "Après la révolution industrielle" }
      ]
    },
    {
      id: 5, type: "QCM", enonce: "Que signifie l'expression « conducteur exacerbé » employée par l'auteur ?",
      choix: [
        { lettre: "A", texte: "Le conducteur est désorienté" },
        { lettre: "B", texte: "Le conducteur éprouve une forte colère", correct: true },
        { lettre: "C", texte: "Le conducteur est paisible" }
      ]
    },
    {
      id: 6, type: "QCM", enonce: "Que signifie la voiture après la 1ère guerre mondiale ?",
      choix: [
        { lettre: "A", texte: "La liberté", correct: true },
        { lettre: "B", texte: "La contrainte" },
        { lettre: "C", texte: "Un danger" }
      ]
    },
    {
      id: 7, type: "QCM", enonce: "La voiture permet :",
      choix: [
        { lettre: "A", texte: "De raccourcir le temps de trajet", correct: true },
        { lettre: "B", texte: "De modifier les rapports spatiotemporels de la personne" },
        { lettre: "C", texte: "De montrer que l'on est riche" }
      ]
    },
    {
      id: 8, type: "QCM", enonce: "D'après le texte, disposer d'une voiture pour l'homme signifie :",
      choix: [
        { lettre: "A", texte: "Être intelligent" },
        { lettre: "B", texte: "Être fort", correct: true },
        { lettre: "C", texte: "Être beau" }
      ]
    },
    {
      id: 9, type: "QCM", enonce: "Quelles sont les autres fonctions de la voiture citées dans le texte ?",
      choix: [
        { lettre: "A", texte: "Elle permet d'afficher son rang", correct: true },
        { lettre: "B", texte: "Elle permet de faire des économies" },
        { lettre: "C", texte: "Elle permet de voyager gratuitement" }
      ]
    },
    {
      id: 10, type: "QCM", enonce: "La voiture est vue :",
      choix: [
        { lettre: "A", texte: "Comme une chose personnelle", correct: true },
        { lettre: "B", texte: "Comme un objet public" }
      ]
    }
  ]
};

const matiere_anglais_examen1: Matiere = {
  id: "anglais",
  nom: "E - Capacité d'expression et de compréhension en langue anglaise",
  duree: 30,
  coefficient: 1,
  noteEliminatoire: 4,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QCM", enonce: "Which currency can I use to pay for the trip?",
      choix: [
        { lettre: "A", texte: "I only accept cash and card", correct: true },
        { lettre: "B", texte: "It's possible to pay by cheques" },
        { lettre: "C", texte: "You can only pay in Euro" }
      ]
    },
    {
      id: 2, type: "QCM", enonce: "Sorry! It's quite expensive for us. May we get a ......... price?",
      choix: [
        { lettre: "A", texte: "Less" },
        { lettre: "B", texte: "Reduction" },
        { lettre: "C", texte: "Lower", correct: true },
        { lettre: "D", texte: "Gooder" }
      ]
    },
    {
      id: 3, type: "QCM", enonce: "Are you sure it is the shortest way? Traduisez :",
      choix: [
        { lettre: "A", texte: "Vous vous êtes trompé d'adresse" },
        { lettre: "B", texte: "Je ne suis pas certain que ce soit le bon endroit" },
        { lettre: "C", texte: "Êtes-vous sûr de prendre le chemin le plus court ?", correct: true }
      ]
    },
    {
      id: 4, type: "QCM", enonce: "France has ......... places to visit.",
      choix: [
        { lettre: "A", texte: "Lots of", correct: true },
        { lettre: "B", texte: "A lot of" },
        { lettre: "C", texte: "A many" }
      ]
    },
    {
      id: 5, type: "QCM", enonce: "Ma voiture ne démarre pas. Traduisez en anglais :",
      choix: [
        { lettre: "A", texte: "My car doesn't start" },
        { lettre: "B", texte: "My car won't start", correct: true },
        { lettre: "C", texte: "My car didn't start" }
      ]
    },
    {
      id: 6, type: "QCM", enonce: "Votre séjour s'est-il bien passé ? En anglais :",
      choix: [
        { lettre: "A", texte: "Where would you like to go?" },
        { lettre: "B", texte: "Did you enjoy your stay?", correct: true },
        { lettre: "C", texte: "How was your trip?" }
      ]
    },
    {
      id: 7, type: "QCM", enonce: "Your passenger plans to stay in Guadeloupe for a fortnight. Que veut dire 'fortnight' ?",
      choix: [
        { lettre: "A", texte: "Quatre nuits" },
        { lettre: "B", texte: "Deux semaines", correct: true },
        { lettre: "C", texte: "Un long séjour" }
      ]
    },
    {
      id: 8, type: "QCM", enonce: "Can I eat in your car?",
      choix: [
        { lettre: "A", texte: "No I am not" },
        { lettre: "B", texte: "No I would prefer you wait", correct: true },
        { lettre: "C", texte: "No I don't have this music" }
      ]
    },
    {
      id: 9, type: "QCM", enonce: "That's fine, keep the change. Traduisez :",
      choix: [
        { lettre: "A", texte: "C'est bon, je veux faire le change" },
        { lettre: "B", texte: "C'est bon, gardez la monnaie", correct: true },
        { lettre: "C", texte: "C'est bien, j'avais besoin de monnaie" }
      ]
    },
    {
      id: 10, type: "QCM", enonce: "Don't forget to give me a bill, please.",
      choix: [
        { lettre: "A", texte: "Of course, I will prepare it as soon as we arrive", correct: true },
        { lettre: "B", texte: "Sorry, I don't know Bill" },
        { lettre: "C", texte: "Of course, I give you them when we arrive" }
      ]
    },
    {
      id: 11, type: "QCM", enonce: "How long are you staying in town? Traduisez :",
      choix: [
        { lettre: "A", texte: "Est-ce que vous vivez en ville ?" },
        { lettre: "B", texte: "Pourquoi êtes-vous en ville ?" },
        { lettre: "C", texte: "Vous restez longtemps en ville ?", correct: true }
      ]
    },
    {
      id: 12, type: "QCM", enonce: "Do you mind if I smoke in the car, sir? Traduisez :",
      choix: [
        { lettre: "A", texte: "Ai-je le droit de fumer dans la voiture, monsieur ?" },
        { lettre: "B", texte: "Est-ce que ça vous dérange si je fume dans la voiture, monsieur ?", correct: true },
        { lettre: "C", texte: "Puis-je fumer dans la voiture, monsieur ?" },
        { lettre: "D", texte: "Est-ce possible de fumer dans la voiture, monsieur ?" }
      ]
    },
    {
      id: 13, type: "QCM", enonce: "A quel nom dois-je établir la facture ? En anglais :",
      choix: [
        { lettre: "A", texte: "What is the name of the bill?" },
        { lettre: "B", texte: "What name do I put on the bill?", correct: true },
        { lettre: "C", texte: "Which name for the bill?" }
      ]
    },
    {
      id: 14, type: "QCM", enonce: "No vacancies. Que signifie cette enseigne ?",
      choix: [
        { lettre: "A", texte: "Pas de vacances" },
        { lettre: "B", texte: "Pas de vacanciers" },
        { lettre: "C", texte: "Complet", correct: true }
      ]
    },
    {
      id: 15, type: "QCM", enonce: "Have you been a driver for a long time?",
      choix: [
        { lettre: "A", texte: "I have been a driver for half past four" },
        { lettre: "B", texte: "I've been a driver since 1990", correct: true },
        { lettre: "C", texte: "I was a driver in the 90's" },
        { lettre: "D", texte: "I've been a driver for 27 years" }
      ]
    }
  ]
};

// ===== MATIÈRE SPÉCIFIQUE TAXI =====
const matiere_reglementation_taxi_examen1: Matiere = {
  id: "reglementation_taxi",
  nom: "F(T) - Connaissance du territoire et réglementation locale TAXI",
  duree: 30,
  coefficient: 3,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QRC", enonce: "Développez le sigle TICPE.",
      reponseQRC: "Taxe Intérieure sur la Consommation des Produits Énergétiques.",
      reponses_possibles: ["taxe intérieure", "consommation", "produits énergétiques"]
    },
    {
      id: 2, type: "QRC", enonce: "Je veux passer mon véhicule professionnel en véhicule personnel pour la journée. Que dois-je faire ?",
      reponseQRC: "Bâcher le lumineux. Éteindre le taximètre. Retirer la carte professionnelle.",
      reponses_possibles: ["bâcher le lumineux", "éteindre le taximètre", "retirer la carte professionnelle"]
    },
    {
      id: 3, type: "QRC", enonce: "Lorsqu'un titulaire ne peut exploiter lui-même son autorisation de stationnement, quelles sont les deux possibilités qui s'offrent à lui ?",
      reponseQRC: "La location du véhicule taxi à un conducteur de taxi. L'emploi d'un salarié.",
      reponses_possibles: ["location", "conducteur de taxi", "emploi d'un salarié", "salarié"]
    },
    {
      id: 4, type: "QCM", enonce: "Le taximètre mesure :",
      choix: [
        { lettre: "A", texte: "La distance parcourue et le temps d'attente", correct: true },
        { lettre: "B", texte: "La vitesse du véhicule" },
        { lettre: "C", texte: "La consommation de carburant" }
      ]
    },
    {
      id: 5, type: "QCM", enonce: "L'autorisation de stationnement (ADS) d'un taxi est délivrée par :",
      choix: [
        { lettre: "A", texte: "La préfecture" },
        { lettre: "B", texte: "Le maire de la commune", correct: true },
        { lettre: "C", texte: "La chambre de métiers" },
        { lettre: "D", texte: "Le conseil régional" }
      ]
    },
    {
      id: 6, type: "QCM", enonce: "La carte professionnelle de taxi est valable :",
      choix: [
        { lettre: "A", texte: "1 an" },
        { lettre: "B", texte: "3 ans" },
        { lettre: "C", texte: "5 ans", correct: true },
        { lettre: "D", texte: "10 ans" }
      ]
    },
    {
      id: 7, type: "QCM", enonce: "Un taxi peut-il refuser une course ?",
      choix: [
        { lettre: "A", texte: "Jamais" },
        { lettre: "B", texte: "Oui, en fin de service ou pour des motifs légitimes", correct: true },
        { lettre: "C", texte: "Oui, à tout moment et sans justification" }
      ]
    }
  ]
};

const matiere_reglementation_taxi2_examen1: Matiere = {
  id: "reglementation_taxi2",
  nom: "G(T) - Réglementation nationale TAXI et gestion propre à cette activité",
  duree: 20,
  coefficient: 3,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QCM", enonce: "Le tarimètre (taximètre) doit être homologué par :",
      choix: [
        { lettre: "A", texte: "La préfecture" },
        { lettre: "B", texte: "Un organisme agréé par le ministère", correct: true },
        { lettre: "C", texte: "La chambre de métiers" }
      ]
    },
    {
      id: 2, type: "QCM", enonce: "La formation continue obligatoire pour les conducteurs de taxi est de :",
      choix: [
        { lettre: "A", texte: "14h tous les 5 ans", correct: true },
        { lettre: "B", texte: "7h par an" },
        { lettre: "C", texte: "21h tous les 3 ans" }
      ]
    },
    {
      id: 3, type: "QCM", enonce: "En cas de perte de la carte professionnelle de taxi, le conducteur doit :",
      choix: [
        { lettre: "A", texte: "Continuer à exercer en attendant le renouvellement" },
        { lettre: "B", texte: "Cesser toute activité jusqu'à obtention d'un duplicata", correct: true },
        { lettre: "C", texte: "Exercer sous la responsabilité de son employeur" }
      ]
    },
    {
      id: 4, type: "QCM", enonce: "Le tarif taxi est fixé par :",
      choix: [
        { lettre: "A", texte: "Le chauffeur librement" },
        { lettre: "B", texte: "Le préfet après avis de la commission locale", correct: true },
        { lettre: "C", texte: "Le maire de la commune" },
        { lettre: "D", texte: "Le client par négociation" }
      ]
    },
    {
      id: 5, type: "QCM", enonce: "Le lumineux d'un taxi doit être de couleur :",
      choix: [
        { lettre: "A", texte: "Verte" },
        { lettre: "B", texte: "Jaune orangée", correct: true },
        { lettre: "C", texte: "Blanche" },
        { lettre: "D", texte: "Rouge" }
      ]
    }
  ]
};

// ===== MATIÈRE SPÉCIFIQUE VTC =====
const matiere_reglementation_vtc_examen1: Matiere = {
  id: "reglementation_vtc",
  nom: "F(V) - Développement commercial et gestion propre à l'activité de VTC",
  duree: 30,
  coefficient: 3,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QRC", enonce: "Qu'est-ce qu'une plateforme de mise en relation (application VTC) ?",
      reponseQRC: "C'est une plateforme numérique qui met en relation des clients avec des conducteurs VTC. Elle n'est pas responsable du transport mais facilite la réservation.",
      reponses_possibles: ["plateforme", "mise en relation", "clients", "conducteurs", "réservation"]
    },
    {
      id: 2, type: "QRC", enonce: "Quels sont les documents obligatoires pour exercer en tant que VTC ?",
      reponseQRC: "La carte professionnelle VTC. L'attestation d'assurance. La carte grise du véhicule. Le certificat de visite technique.",
      reponses_possibles: ["carte professionnelle", "assurance", "carte grise", "contrôle technique"]
    },
    {
      id: 3, type: "QCM", enonce: "La carte professionnelle VTC est délivrée par :",
      choix: [
        { lettre: "A", texte: "La mairie" },
        { lettre: "B", texte: "La préfecture", correct: true },
        { lettre: "C", texte: "Le tribunal de commerce" },
        { lettre: "D", texte: "L'URSSAF" }
      ]
    },
    {
      id: 4, type: "QCM", enonce: "Un VTC peut-il stationner sur une borne de taxis ?",
      choix: [
        { lettre: "A", texte: "Oui, si la borne est vide" },
        { lettre: "B", texte: "Non, c'est interdit", correct: true },
        { lettre: "C", texte: "Oui, mais seulement la nuit" }
      ]
    },
    {
      id: 5, type: "QCM", enonce: "La vignette distinctive obligatoire d'un VTC est de couleur :",
      choix: [
        { lettre: "A", texte: "Jaune" },
        { lettre: "B", texte: "Bleue" },
        { lettre: "C", texte: "Rouge", correct: true },
        { lettre: "D", texte: "Verte" }
      ]
    },
    {
      id: 6, type: "QCM", enonce: "Un conducteur VTC peut-il prendre des clients en maraude (dans la rue) ?",
      choix: [
        { lettre: "A", texte: "Oui, si le client lève le bras" },
        { lettre: "B", texte: "Non, toute course doit faire l'objet d'une réservation préalable", correct: true },
        { lettre: "C", texte: "Oui, après 22h" }
      ]
    },
    {
      id: 7, type: "QCM", enonce: "Quelle est la puissance fiscale minimale requise pour un véhicule VTC ?",
      choix: [
        { lettre: "A", texte: "5 CV" },
        { lettre: "B", texte: "7 CV", correct: true },
        { lettre: "C", texte: "9 CV" },
        { lettre: "D", texte: "4 CV" }
      ]
    }
  ]
};

const matiere_reglementation_vtc2_examen1: Matiere = {
  id: "reglementation_vtc2",
  nom: "G(V) - Réglementation nationale spécifique à l'activité de VTC",
  duree: 20,
  coefficient: 3,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QCM", enonce: "Le registre des VTC (REVTC) est tenu par :",
      choix: [
        { lettre: "A", texte: "La préfecture" },
        { lettre: "B", texte: "Le ministère chargé des transports", correct: true },
        { lettre: "C", texte: "La chambre de commerce" },
        { lettre: "D", texte: "L'URSSAF" }
      ]
    },
    {
      id: 2, type: "QCM", enonce: "La formation continue obligatoire pour les conducteurs VTC est de :",
      choix: [
        { lettre: "A", texte: "14h tous les 5 ans", correct: true },
        { lettre: "B", texte: "7h par an" },
        { lettre: "C", texte: "21h tous les 3 ans" }
      ]
    },
    {
      id: 3, type: "QCM", enonce: "Un VTC doit retourner à sa base ou dans un lieu non public entre deux courses. C'est :",
      choix: [
        { lettre: "A", texte: "Obligatoire uniquement en Île-de-France" },
        { lettre: "B", texte: "Obligatoire sur tout le territoire national", correct: true },
        { lettre: "C", texte: "Optionnel" }
      ]
    },
    {
      id: 4, type: "QCM", enonce: "La capacité minimale d'un véhicule VTC est de :",
      choix: [
        { lettre: "A", texte: "3 places assises" },
        { lettre: "B", texte: "4 places assises hors conducteur", correct: true },
        { lettre: "C", texte: "5 places au total" }
      ]
    },
    {
      id: 5, type: "QCM", enonce: "L'inscription au registre VTC doit être renouvelée :",
      choix: [
        { lettre: "A", texte: "Tous les ans" },
        { lettre: "B", texte: "Tous les 5 ans", correct: true },
        { lettre: "C", texte: "Tous les 3 ans" },
        { lettre: "D", texte: "Elle est permanente" }
      ]
    }
  ]
};

// ===== EXAMEN BLANC N°1 =====
export const examenBlanc1Taxi: ExamenBlanc = {
  id: "eb1-taxi",
  numero: 1,
  type: "TAXI",
  titre: "Examen Blanc N°1 - Formation TAXI",
  matieres: [
    matiere_t3p_examen1,
    matiere_gestion_examen1,
    matiere_securite_examen1,
    matiere_francais_examen1,
    matiere_anglais_examen1,
    matiere_reglementation_taxi_examen1,
    matiere_reglementation_taxi2_examen1
  ]
};

export const examenBlanc1VTC: ExamenBlanc = {
  id: "eb1-vtc",
  numero: 1,
  type: "VTC",
  titre: "Examen Blanc N°1 - Formation VTC",
  matieres: [
    matiere_t3p_examen1,
    matiere_gestion_examen1,
    matiere_securite_examen1,
    matiere_francais_examen1,
    matiere_anglais_examen1,
    matiere_reglementation_vtc_examen1,
    matiere_reglementation_vtc2_examen1
  ]
};

// ===== EXAMEN BLANC N°2 - Questions différentes =====
const matiere_t3p_examen2: Matiere = {
  id: "t3p",
  nom: "A - Transport Public Particulier de Personnes (T3P)",
  duree: 45,
  coefficient: 3,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QRC", enonce: "Citez trois des conditions d'accès et/ou d'exercice aux professions de conducteurs de T3P :",
      reponseQRC: "Réussite à l'examen. Carte professionnelle en cours de validité. Formation continue. Aptitude médicale. Honorabilité.",
      reponses_possibles: ["examen", "carte professionnelle", "formation continue", "aptitude médicale", "honorabilité"]
    },
    {
      id: 2, type: "QRC", enonce: "Quelles sont les sanctions possibles qui peuvent être décidées par les commissions disciplinaires locales ?",
      reponseQRC: "Un avertissement. Un retrait temporaire. Un retrait définitif de la carte professionnelle.",
      reponses_possibles: ["avertissement", "retrait temporaire", "retrait définitif"]
    },
    {
      id: 3, type: "QRC", enonce: "Que devez-vous présenter aux agents pour justifier d'une réservation préalable ?",
      reponseQRC: "Un document écrit sur support papier ou électronique.",
      reponses_possibles: ["document écrit", "papier ou électronique"]
    },
    {
      id: 4, type: "QRC", enonce: "Qu'est-ce que l'honorabilité dans votre profession ?",
      reponseQRC: "Avoir le casier judiciaire B2 vierge.",
      reponses_possibles: ["casier judiciaire b2 vierge", "b2 vierge", "casier b2"]
    },
    {
      id: 5, type: "QRC", enonce: "Je me fais contrôler sur la route. Quels documents communs dois-je présenter aux forces de l'ordre ?",
      reponseQRC: "Le permis de conduire. La carte professionnelle. L'attestation de formation continue. Le certificat médical. L'attestation d'assurance. L'attestation RCP.",
      reponses_possibles: ["permis de conduire", "carte professionnelle", "formation continue", "certificat médical", "assurance"]
    },
    {
      id: 6, type: "QCM", enonce: "Quelles sont les conditions requises pour passer l'examen T3P ?",
      choix: [
        { lettre: "A", texte: "Avoir son permis depuis plus de 3 ans", correct: true },
        { lettre: "B", texte: "Être âgé de 21 ans minimum" },
        { lettre: "C", texte: "Avoir un casier judiciaire B2 vierge", correct: true }
      ]
    },
    {
      id: 7, type: "QCM", enonce: "Les sanctions en cas d'exercice illégal d'une profession T3P ?",
      choix: [
        { lettre: "A", texte: "Une amende de 30 000 € et deux ans d'emprisonnement" },
        { lettre: "B", texte: "Une amende de 15 000 € et un an d'emprisonnement", correct: true },
        { lettre: "C", texte: "Une amende de 1 500 € et six mois d'emprisonnement" }
      ]
    },
    {
      id: 8, type: "QCM", enonce: "Parmi les entreprises du T3P, lesquelles sont soumises à l'obligation d'assurance RCP ?",
      choix: [
        { lettre: "A", texte: "VTC et 2 ou 3 roues" },
        { lettre: "B", texte: "Le taxi, VTC et 2 ou 3 roues" },
        { lettre: "C", texte: "Le taxi seulement" },
        { lettre: "D", texte: "Le taxi et le VTC seulement", correct: true }
      ]
    },
    {
      id: 9, type: "QCM", enonce: "Pour effectuer du T3P, le véhicule doit :",
      choix: [
        { lettre: "A", texte: "Être de couleur blanche" },
        { lettre: "B", texte: "Avoir des pneumatiques fixés par décret" },
        { lettre: "C", texte: "Avoir une signalétique distinctive", correct: true }
      ]
    },
    {
      id: 10, type: "QCM", enonce: "Qui délivre les agréments aux centres de formation ?",
      choix: [
        { lettre: "A", texte: "Les conseils départementaux" },
        { lettre: "B", texte: "L'association permanente des chambres de métiers" },
        { lettre: "C", texte: "Les préfectures", correct: true },
        { lettre: "D", texte: "Le ministère des transports" }
      ]
    },
    {
      id: 11, type: "QCM", enonce: "Qui préside la commission locale du T3P ?",
      choix: [
        { lettre: "A", texte: "Le représentant de chaque collège à tour de rôle" },
        { lettre: "B", texte: "Le préfet ou son représentant", correct: true },
        { lettre: "C", texte: "Le directeur des transports" },
        { lettre: "D", texte: "Le Président de la chambre de métiers" }
      ]
    },
    {
      id: 12, type: "QCM", enonce: "Durée du mandat des membres de la commission locale des T3P ?",
      choix: [
        { lettre: "A", texte: "3 ans" },
        { lettre: "B", texte: "2 ans" },
        { lettre: "C", texte: "5 ans", correct: true },
        { lettre: "D", texte: "1 an" }
      ]
    }
  ]
};

const matiere_gestion_examen2: Matiere = {
  id: "gestion",
  nom: "B - Gestion",
  duree: 45,
  coefficient: 2,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QRC", enonce: "Qu'est-ce que la TVA ? Développez le sigle.",
      reponseQRC: "Taxe sur la Valeur Ajoutée. C'est un impôt indirect sur la consommation, collecté par les entreprises pour le compte de l'État.",
      reponses_possibles: ["taxe sur la valeur ajoutée", "impôt", "consommation"]
    },
    {
      id: 2, type: "QRC", enonce: "Qu'est-ce qu'un bilan comptable ?",
      reponseQRC: "Le bilan est un document comptable qui présente la situation patrimoniale de l'entreprise à une date donnée, avec l'actif (ce que l'entreprise possède) et le passif (ce qu'elle doit).",
      reponses_possibles: ["situation patrimoniale", "actif", "passif", "document comptable"]
    },
    {
      id: 3, type: "QCM", enonce: "Le résultat d'exploitation est :",
      choix: [
        { lettre: "A", texte: "La différence entre produits et charges d'exploitation", correct: true },
        { lettre: "B", texte: "Le chiffre d'affaires total" },
        { lettre: "C", texte: "La trésorerie disponible" }
      ]
    },
    {
      id: 4, type: "QCM", enonce: "L'auto-entrepreneur (micro-entrepreneur) est soumis à :",
      choix: [
        { lettre: "A", texte: "L'impôt sur les sociétés" },
        { lettre: "B", texte: "L'impôt sur le revenu dans la catégorie BIC", correct: true },
        { lettre: "C", texte: "L'impôt forfaitaire" }
      ]
    },
    {
      id: 5, type: "QCM", enonce: "Le seuil de chiffre d'affaires pour le régime micro-entrepreneur (VTC/Taxi) est :",
      choix: [
        { lettre: "A", texte: "72 600 € HT" },
        { lettre: "B", texte: "176 200 € HT" },
        { lettre: "C", texte: "188 700 € HT", correct: true }
      ]
    },
    {
      id: 6, type: "QCM", enonce: "Un véhicule utilisé à 70% pour l'activité professionnelle : quelle part des charges est déductible ?",
      choix: [
        { lettre: "A", texte: "100%" },
        { lettre: "B", texte: "70%", correct: true },
        { lettre: "C", texte: "50%" }
      ]
    },
    {
      id: 7, type: "QCM", enonce: "Les cotisations sociales d'un auto-entrepreneur sont calculées sur :",
      choix: [
        { lettre: "A", texte: "Le bénéfice net" },
        { lettre: "B", texte: "Le chiffre d'affaires brut", correct: true },
        { lettre: "C", texte: "Le salaire minimum" }
      ]
    },
    {
      id: 8, type: "QCM", enonce: "L'amortissement d'un véhicule professionnel VTC s'effectue généralement sur :",
      choix: [
        { lettre: "A", texte: "2 ans" },
        { lettre: "B", texte: "4 ans" },
        { lettre: "C", texte: "5 ans", correct: true },
        { lettre: "D", texte: "10 ans" }
      ]
    },
    {
      id: 9, type: "QCM", enonce: "Un conducteur VTC/Taxi peut déduire ses frais de repas si :",
      choix: [
        { lettre: "A", texte: "Il mange toujours au restaurant" },
        { lettre: "B", texte: "Ils sont engagés dans le cadre de son activité professionnelle", correct: true },
        { lettre: "C", texte: "Il facture plus de 50 000€ par an" }
      ]
    },
    {
      id: 10, type: "QCM", enonce: "Le compte de résultat permet de savoir si l'entreprise :",
      choix: [
        { lettre: "A", texte: "Est solvable" },
        { lettre: "B", texte: "A réalisé un bénéfice ou une perte", correct: true },
        { lettre: "C", texte: "Dispose de liquidités suffisantes" }
      ]
    }
  ]
};

const matiere_securite_examen2: Matiere = {
  id: "securite",
  nom: "C - Sécurité routière",
  duree: 30,
  coefficient: 3,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QCM", enonce: "La distance de freinage double quand la vitesse :",
      choix: [
        { lettre: "A", texte: "Double" },
        { lettre: "B", texte: "Triple" },
        { lettre: "C", texte: "Augmente de 40%" },
        { lettre: "D", texte: "Double, la distance de freinage quadruple", correct: true }
      ]
    },
    {
      id: 2, type: "QCM", enonce: "En ville, la vitesse maximale autorisée en zone 30 est de :",
      choix: [
        { lettre: "A", texte: "20 km/h" },
        { lettre: "B", texte: "30 km/h", correct: true },
        { lettre: "C", texte: "50 km/h" }
      ]
    },
    {
      id: 3, type: "QCM", enonce: "Le taux d'alcoolémie maximal autorisé pour un conducteur professionnel est de :",
      choix: [
        { lettre: "A", texte: "0,5 g/L de sang" },
        { lettre: "B", texte: "0,2 g/L de sang", correct: true },
        { lettre: "C", texte: "0,8 g/L de sang" }
      ]
    },
    {
      id: 4, type: "QCM", enonce: "En cas de crevaison, le conducteur doit :",
      choix: [
        { lettre: "A", texte: "Freiner brusquement" },
        { lettre: "B", texte: "Tenir fermement le volant et ralentir progressivement", correct: true },
        { lettre: "C", texte: "Accélérer pour s'éloigner du danger" }
      ]
    },
    {
      id: 5, type: "QCM", enonce: "Le délai légal pour déclarer un accident matériel à l'assurance est de :",
      choix: [
        { lettre: "A", texte: "24 heures" },
        { lettre: "B", texte: "5 jours ouvrés", correct: true },
        { lettre: "C", texte: "15 jours" },
        { lettre: "D", texte: "1 mois" }
      ]
    },
    {
      id: 6, type: "QCM", enonce: "L'éco-conduite permet de réduire la consommation de carburant d'environ :",
      choix: [
        { lettre: "A", texte: "5%" },
        { lettre: "B", texte: "15%", correct: true },
        { lettre: "C", texte: "30%" }
      ]
    },
    {
      id: 7, type: "QCM", enonce: "Sur autoroute, la distance de sécurité minimale doit être :",
      choix: [
        { lettre: "A", texte: "50 mètres" },
        { lettre: "B", texte: "La distance parcourue en 2 secondes", correct: true },
        { lettre: "C", texte: "100 mètres fixes" }
      ]
    },
    {
      id: 8, type: "QCM", enonce: "Quelle infraction entraîne la perte de 6 points sur le permis ?",
      choix: [
        { lettre: "A", texte: "Excès de vitesse de plus de 50 km/h", correct: true },
        { lettre: "B", texte: "Utilisation du téléphone en conduisant" },
        { lettre: "C", texte: "Stationnement interdit" }
      ]
    },
    {
      id: 9, type: "QCM", enonce: "Un véhicule doit obligatoirement passer le contrôle technique tous les :",
      choix: [
        { lettre: "A", texte: "2 ans", correct: true },
        { lettre: "B", texte: "1 an" },
        { lettre: "C", texte: "3 ans" },
        { lettre: "D", texte: "4 ans" }
      ]
    },
    {
      id: 10, type: "QCM", enonce: "Le port de la ceinture de sécurité est :",
      choix: [
        { lettre: "A", texte: "Obligatoire uniquement sur autoroute" },
        { lettre: "B", texte: "Obligatoire pour tous les occupants du véhicule", correct: true },
        { lettre: "C", texte: "Obligatoire seulement pour le conducteur" }
      ]
    }
  ]
};

const matiere_francais_examen2: Matiere = {
  id: "francais",
  nom: "D - Capacité d'expression et de compréhension en langue française",
  duree: 30,
  coefficient: 2,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QRC", enonce: "Rédigez un message professionnel pour confirmer un rendez-vous avec un client.",
      reponseQRC: "Madame, Monsieur, Je vous confirme notre rendez-vous le [date] à [heure]. Je serai présent à [lieu]. Cordialement, [Nom].",
      reponses_possibles: ["confirme", "rendez-vous", "date", "heure", "cordialement"]
    },
    {
      id: 2, type: "QRC", enonce: "Comment accueillez-vous un client dans votre véhicule ? Développez votre réponse.",
      reponseQRC: "Je salue le client poliment, je l'aide avec ses bagages si nécessaire, je confirme sa destination, je m'assure de son confort et je lui signale les options disponibles (climatisation, musique).",
      reponses_possibles: ["salue", "politesse", "destination", "confort", "bagages"]
    },
    {
      id: 3, type: "QCM", enonce: "Quel est le ton approprié dans une communication professionnelle ?",
      choix: [
        { lettre: "A", texte: "Familier et détendu" },
        { lettre: "B", texte: "Courtois, clair et professionnel", correct: true },
        { lettre: "C", texte: "Froid et distant" }
      ]
    },
    {
      id: 4, type: "QCM", enonce: "Un client se plaint du trajet. Comment réagissez-vous ?",
      choix: [
        { lettre: "A", texte: "Vous l'ignorez" },
        { lettre: "B", texte: "Vous l'écoutez, vous expliquez et vous proposez une solution", correct: true },
        { lettre: "C", texte: "Vous lui dites qu'il a tort" }
      ]
    },
    {
      id: 5, type: "QCM", enonce: "Qu'est-ce qu'un service de qualité dans le transport VTC/Taxi ?",
      choix: [
        { lettre: "A", texte: "Arriver le plus vite possible" },
        { lettre: "B", texte: "Ponctualité, courtoisie, véhicule propre, conduite apaisée", correct: true },
        { lettre: "C", texte: "Proposer le tarif le moins cher" }
      ]
    },
    {
      id: 6, type: "QCM", enonce: "Dans quelle situation un conducteur peut-il parler au téléphone ?",
      choix: [
        { lettre: "A", texte: "Avec un kit mains-libres et seulement si nécessaire", correct: true },
        { lettre: "B", texte: "En tenant le téléphone si le client l'appelle" },
        { lettre: "C", texte: "Jamais, même avec un kit mains-libres" }
      ]
    }
  ]
};

const matiere_anglais_examen2: Matiere = {
  id: "anglais",
  nom: "E - Capacité d'expression et de compréhension en langue anglaise",
  duree: 30,
  coefficient: 1,
  noteEliminatoire: 4,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QCM", enonce: "Where would you like to go? Traduisez :",
      choix: [
        { lettre: "A", texte: "Où habitez-vous ?" },
        { lettre: "B", texte: "Où voulez-vous aller ?", correct: true },
        { lettre: "C", texte: "D'où venez-vous ?" }
      ]
    },
    {
      id: 2, type: "QCM", enonce: "I'll be there in ten minutes. Traduisez :",
      choix: [
        { lettre: "A", texte: "Je suis là depuis dix minutes" },
        { lettre: "B", texte: "J'y serai dans dix minutes", correct: true },
        { lettre: "C", texte: "Il était là il y a dix minutes" }
      ]
    },
    {
      id: 3, type: "QCM", enonce: "Could you please open the trunk? Que demande le client ?",
      choix: [
        { lettre: "A", texte: "D'ouvrir la fenêtre" },
        { lettre: "B", texte: "D'ouvrir le coffre", correct: true },
        { lettre: "C", texte: "D'ouvrir la porte arrière" }
      ]
    },
    {
      id: 4, type: "QCM", enonce: "Is the airport far from here?",
      choix: [
        { lettre: "A", texte: "L'aéroport est-il loin d'ici ?", correct: true },
        { lettre: "B", texte: "Pouvez-vous aller à l'aéroport ?" },
        { lettre: "C", texte: "Combien coûte l'aéroport ?" }
      ]
    },
    {
      id: 5, type: "QCM", enonce: "Please fasten your seatbelt. Que signifie cette phrase ?",
      choix: [
        { lettre: "A", texte: "Fermez la portière, s'il vous plaît" },
        { lettre: "B", texte: "Veuillez attacher votre ceinture", correct: true },
        { lettre: "C", texte: "Asseyez-vous, s'il vous plaît" }
      ]
    },
    {
      id: 6, type: "QCM", enonce: "Can you recommend a good restaurant? Que demande le passager ?",
      choix: [
        { lettre: "A", texte: "S'arrêter dans un restaurant" },
        { lettre: "B", texte: "De recommander un bon restaurant", correct: true },
        { lettre: "C", texte: "D'appeler un restaurant" }
      ]
    },
    {
      id: 7, type: "QCM", enonce: "What time does your shift end? Que vous demande-t-on ?",
      choix: [
        { lettre: "A", texte: "À quelle heure commence votre service ?" },
        { lettre: "B", texte: "À quelle heure se termine votre service ?", correct: true },
        { lettre: "C", texte: "Combien d'heures travaillez-vous ?" }
      ]
    },
    {
      id: 8, type: "QCM", enonce: "I've left my luggage in your car. Que signifie cette phrase ?",
      choix: [
        { lettre: "A", texte: "J'ai laissé mes bagages dans votre voiture", correct: true },
        { lettre: "B", texte: "J'ai perdu mes bagages" },
        { lettre: "C", texte: "Pouvez-vous porter mes bagages ?" }
      ]
    },
    {
      id: 9, type: "QCM", enonce: "Is it possible to pay by credit card?",
      choix: [
        { lettre: "A", texte: "Est-il possible de payer par carte bancaire ?", correct: true },
        { lettre: "B", texte: "Acceptez-vous les chèques ?" },
        { lettre: "C", texte: "Quel est le prix de la course ?" }
      ]
    },
    {
      id: 10, type: "QCM", enonce: "Could you please turn down the music?",
      choix: [
        { lettre: "A", texte: "Pouvez-vous baisser la musique, s'il vous plaît ?", correct: true },
        { lettre: "B", texte: "Pouvez-vous mettre de la musique ?" },
        { lettre: "C", texte: "Pouvez-vous éteindre la radio ?" }
      ]
    }
  ]
};

// Examens 2 Taxi & VTC (matières spécifiques légèrement différentes)
const matiere_reglementation_taxi_examen2: Matiere = {
  id: "reglementation_taxi",
  nom: "F(T) - Connaissance du territoire et réglementation locale TAXI",
  duree: 30,
  coefficient: 3,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QRC", enonce: "Qu'est-ce que l'autorisation de stationnement (ADS) pour un taxi ?",
      reponseQRC: "L'ADS est une autorisation administrative délivrée par le maire permettant à son titulaire d'exercer la profession de taxi sur le territoire de la commune.",
      reponses_possibles: ["autorisation administrative", "maire", "commune", "profession de taxi"]
    },
    {
      id: 2, type: "QRC", enonce: "Dans quels cas le taxi peut-il utiliser les voies réservées aux bus ?",
      reponseQRC: "Le taxi peut utiliser les voies réservées aux bus lorsque c'est explicitement indiqué sur les panneaux de signalisation.",
      reponses_possibles: ["voies bus", "signalisation", "autorisé", "panneaux"]
    },
    {
      id: 3, type: "QCM", enonce: "Le tarif B d'un taxi s'applique :",
      choix: [
        { lettre: "A", texte: "En agglomération de jour" },
        { lettre: "B", texte: "La nuit, les week-ends et jours fériés", correct: true },
        { lettre: "C", texte: "Pour les courses longue distance" }
      ]
    },
    {
      id: 4, type: "QCM", enonce: "Le reçu remis au client par le taxi doit mentionner :",
      choix: [
        { lettre: "A", texte: "Uniquement le montant total" },
        { lettre: "B", texte: "Le montant, le numéro de taxi, la date et le trajet", correct: true },
        { lettre: "C", texte: "Le nom du chauffeur uniquement" }
      ]
    },
    {
      id: 5, type: "QCM", enonce: "Un taxi en maraude (disponible) doit avoir son compteur en position :",
      choix: [
        { lettre: "A", texte: "Marche avec tarif A" },
        { lettre: "B", texte: "Arrêt", correct: true },
        { lettre: "C", texte: "Marche en veille" }
      ]
    }
  ]
};

const matiere_reglementation_taxi2_examen2: Matiere = {
  id: "reglementation_taxi2",
  nom: "G(T) - Réglementation nationale TAXI et gestion propre à cette activité",
  duree: 20,
  coefficient: 3,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QCM", enonce: "La géolocalisation des taxis est obligatoire pour :",
      choix: [
        { lettre: "A", texte: "Tous les taxis en France" },
        { lettre: "B", texte: "Les taxis ayant plus de 3 ans d'exercice" },
        { lettre: "C", texte: "Les taxis opérant dans les agglomérations de plus de 100 000 habitants", correct: true }
      ]
    },
    {
      id: 2, type: "QCM", enonce: "En cas de litige sur le prix d'une course, que peut faire le client ?",
      choix: [
        { lettre: "A", texte: "Appeler la police immédiatement" },
        { lettre: "B", texte: "Contacter la commission locale des T3P ou la DGCCRF", correct: true },
        { lettre: "C", texte: "Refuser de payer" }
      ]
    },
    {
      id: 3, type: "QCM", enonce: "Un taxi peut transporter des animaux :",
      choix: [
        { lettre: "A", texte: "Jamais" },
        { lettre: "B", texte: "Seulement les petits animaux en cage" },
        { lettre: "C", texte: "Oui, avec l'accord du conducteur", correct: true }
      ]
    },
    {
      id: 4, type: "QCM", enonce: "La durée maximale de travail journalière d'un chauffeur de taxi salarié est de :",
      choix: [
        { lettre: "A", texte: "8 heures" },
        { lettre: "B", texte: "10 heures" },
        { lettre: "C", texte: "12 heures", correct: true },
        { lettre: "D", texte: "14 heures" }
      ]
    }
  ]
};

const matiere_reglementation_vtc_examen2: Matiere = {
  id: "reglementation_vtc",
  nom: "F(V) - Développement commercial et gestion propre à l'activité de VTC",
  duree: 30,
  coefficient: 3,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QRC", enonce: "Comment fonctionne le système de notation dans les applications VTC ?",
      reponseQRC: "Le client note le conducteur après chaque course (généralement de 1 à 5 étoiles). Une mauvaise note répétée peut entraîner la suspension ou l'exclusion de la plateforme.",
      reponses_possibles: ["notation", "étoiles", "client", "suspension", "plateforme"]
    },
    {
      id: 2, type: "QRC", enonce: "Quelles sont les obligations du VTC envers le passager à mobilité réduite (PMR) ?",
      reponseQRC: "Le VTC doit accepter le transport des PMR si son véhicule est adapté. Il doit aider à l'embarquement/débarquement et transporter le fauteuil roulant.",
      reponses_possibles: ["PMR", "accepter", "adapté", "fauteuil roulant", "aide"]
    },
    {
      id: 3, type: "QCM", enonce: "Un VTC peut-il afficher ses tarifs à l'extérieur du véhicule ?",
      choix: [
        { lettre: "A", texte: "Oui, librement" },
        { lettre: "B", texte: "Non, aucun affichage extérieur de tarif n'est autorisé", correct: true },
        { lettre: "C", texte: "Seulement la nuit" }
      ]
    },
    {
      id: 4, type: "QCM", enonce: "La commission prélevée par une plateforme VTC représente en moyenne :",
      choix: [
        { lettre: "A", texte: "5 à 10%" },
        { lettre: "B", texte: "15 à 30%", correct: true },
        { lettre: "C", texte: "40 à 50%" }
      ]
    },
    {
      id: 5, type: "QCM", enonce: "Un VTC peut-il exercer dans n'importe quelle ville de France ?",
      choix: [
        { lettre: "A", texte: "Non, uniquement dans la ville d'immatriculation" },
        { lettre: "B", texte: "Oui, sur tout le territoire national", correct: true },
        { lettre: "C", texte: "Seulement dans sa région" }
      ]
    }
  ]
};

const matiere_reglementation_vtc2_examen2: Matiere = {
  id: "reglementation_vtc2",
  nom: "G(V) - Réglementation nationale spécifique à l'activité de VTC",
  duree: 20,
  coefficient: 3,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QCM", enonce: "La durée minimale d'une course VTC est fixée par :",
      choix: [
        { lettre: "A", texte: "Le conducteur" },
        { lettre: "B", texte: "La loi Thévenoud", correct: true },
        { lettre: "C", texte: "La plateforme" }
      ]
    },
    {
      id: 2, type: "QCM", enonce: "Le conducteur VTC a l'obligation de communiquer le prix avant la course. C'est :",
      choix: [
        { lettre: "A", texte: "Optionnel" },
        { lettre: "B", texte: "Obligatoire", correct: true },
        { lettre: "C", texte: "Obligatoire seulement pour les trajets longue distance" }
      ]
    },
    {
      id: 3, type: "QCM", enonce: "En cas de contrôle, le conducteur VTC doit pouvoir justifier :",
      choix: [
        { lettre: "A", texte: "D'une réservation préalable électronique ou papier", correct: true },
        { lettre: "B", texte: "Uniquement de sa carte professionnelle" },
        { lettre: "C", texte: "Du montant de la course" }
      ]
    },
    {
      id: 4, type: "QCM", enonce: "Le conducteur VTC peut-il proposer un service de taxi conventionné santé ?",
      choix: [
        { lettre: "A", texte: "Oui, sans condition" },
        { lettre: "B", texte: "Oui, s'il est conventionné par l'Assurance Maladie", correct: true },
        { lettre: "C", texte: "Non, ce service est réservé aux taxis" }
      ]
    }
  ]
};

export const examenBlanc2Taxi: ExamenBlanc = {
  id: "eb2-taxi",
  numero: 2,
  type: "TAXI",
  titre: "Examen Blanc N°2 - Formation TAXI",
  matieres: [
    matiere_t3p_examen2,
    matiere_gestion_examen2,
    matiere_securite_examen2,
    matiere_francais_examen2,
    matiere_anglais_examen2,
    matiere_reglementation_taxi_examen2,
    matiere_reglementation_taxi2_examen2
  ]
};

export const examenBlanc2VTC: ExamenBlanc = {
  id: "eb2-vtc",
  numero: 2,
  type: "VTC",
  titre: "Examen Blanc N°2 - Formation VTC",
  matieres: [
    matiere_t3p_examen2,
    matiere_gestion_examen2,
    matiere_securite_examen2,
    matiere_francais_examen2,
    matiere_anglais_examen2,
    matiere_reglementation_vtc_examen2,
    matiere_reglementation_vtc2_examen2
  ]
};

// ===== EXAMEN BLANC N°3 =====

const matiere_t3p_examen3: Matiere = {
  id: "t3p",
  nom: "A - Transport Public Particulier de Personnes (T3P)",
  duree: 45,
  coefficient: 3,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QRC", enonce: "Quel est le poids maximal autorisé en charge (PTAC) d'un véhicule affecté au T3P et pour combien de places maximum ? Précisez avec ou sans chauffeur.",
      reponseQRC: "3,5 tonnes (3 500 kg) et 9 places, conducteur compris.",
      reponses_possibles: ["3,5 tonnes", "3500 kg", "9 places", "conducteur compris"]
    },
    {
      id: 2, type: "QRC", enonce: "Citez 4 compétences des commissions locales du T3P.",
      reponseQRC: "Établir un rapport annuel pour l'observatoire. Recevoir des renseignements et statistiques. Être informées des projets de nouvelles ADS. Rendre un avis sur toutes les questions relatives au T3P.",
      reponses_possibles: ["rapport annuel", "renseignements", "statistiques", "ADS", "avis", "discipline", "cartes professionnelles"]
    },
    {
      id: 3, type: "QRC", enonce: "Quelles sont les sanctions administratives encourues par un conducteur de T3P en cas de violation de la réglementation de la profession ?",
      reponseQRC: "L'avertissement. Le retrait temporaire ou définitif de la carte professionnelle.",
      reponses_possibles: ["avertissement", "retrait temporaire", "retrait définitif", "carte professionnelle"]
    },
    {
      id: 4, type: "QRC", enonce: "Quelles sont les deux assurances obligatoires qu'un conducteur de T3P doit souscrire ?",
      reponseQRC: "L'assurance du véhicule. La responsabilité civile professionnelle du conducteur (RCP).",
      reponses_possibles: ["assurance véhicule", "responsabilité civile professionnelle", "RCP"]
    },
    {
      id: 5, type: "QRC", enonce: "Développez le sigle \"T3P\".",
      reponseQRC: "Transport public particulier de personnes.",
      reponses_possibles: ["transport public particulier de personnes"]
    },
    {
      id: 6, type: "QCM", enonce: "Quelle est la périodicité de la formation continue pour le T3P ?",
      choix: [
        { lettre: "A", texte: "Tous les 5 ans", correct: true },
        { lettre: "B", texte: "Chaque année" },
        { lettre: "C", texte: "Jamais" },
        { lettre: "D", texte: "Tous les 2 ans" }
      ]
    },
    {
      id: 7, type: "QCM", enonce: "Quelle est la sanction encourue pour l'exercice illégal de l'activité de T3P ?",
      choix: [
        { lettre: "A", texte: "un an d'emprisonnement et 20 000 € d'amende" },
        { lettre: "B", texte: "un an d'emprisonnement et 15 000 € d'amende", correct: true },
        { lettre: "C", texte: "6 mois d'emprisonnement et 10 000 € d'amende" },
        { lettre: "D", texte: "6 mois d'emprisonnement et 5 000 € d'amende" }
      ]
    },
    {
      id: 8, type: "QCM", enonce: "Parmi les condamnations suivantes, lesquelles peuvent être mentionnées au bulletin n°2 du casier judiciaire ?",
      choix: [
        { lettre: "A", texte: "Transporter des objets insalubres sans autorisation" },
        { lettre: "B", texte: "Poursuivre sa route après avoir occasionné un accident", correct: true },
        { lettre: "C", texte: "Transporter un détecteur de radar", correct: true },
        { lettre: "D", texte: "Conduire avec un taux d'alcool de 0,8 g/L ou plus", correct: true }
      ]
    },
    {
      id: 9, type: "QCM", enonce: "Quelle est la périodicité de la visite médicale d'un conducteur, âgé de 61 ans ?",
      choix: [
        { lettre: "A", texte: "1 an" },
        { lettre: "B", texte: "2 ans", correct: true },
        { lettre: "C", texte: "5 ans" },
        { lettre: "D", texte: "7 ans" }
      ]
    },
    {
      id: 10, type: "QCM", enonce: "Si un chauffeur utilise son véhicule T3P dans le cadre d'une activité non-professionnelle que doit-il faire ?",
      choix: [
        { lettre: "A", texte: "ne rien faire de spécifique" },
        { lettre: "B", texte: "enlever ou occulter toutes références à la profession exercée", correct: true }
      ]
    },
    {
      id: 11, type: "QCM", enonce: "À partir de quel montant minimal, le conducteur de T3P a-t-il l'obligation de fournir une note de course ?",
      choix: [
        { lettre: "A", texte: "1 euro" },
        { lettre: "B", texte: "il n'y a pas de montant minimal si c'est à la demande du client", correct: true },
        { lettre: "C", texte: "15,24 €" },
        { lettre: "D", texte: "25 €" }
      ]
    },
    {
      id: 12, type: "QCM", enonce: "Les conducteurs de T3P bénéficient-ils d'un régime particulier au niveau de la limitation de vitesse ?",
      choix: [
        { lettre: "A", texte: "oui, suivant l'accord conclu avec les autorités locales" },
        { lettre: "B", texte: "oui, suivant l'accord conclu avec le ministère de l'intérieur" },
        { lettre: "C", texte: "oui ou non en fonction du véhicule utilisé" },
        { lettre: "D", texte: "pas de régime particulier", correct: true }
      ]
    },
    {
      id: 13, type: "QCM", enonce: "La carte professionnelle d'un conducteur de T3P :",
      choix: [
        { lettre: "A", texte: "doit être apposée de telle manière que la photographie soit visible de l'intérieur par le client", correct: true },
        { lettre: "B", texte: "doit être apposée de telle manière que la photographie soit visible de l'extérieur" },
        { lettre: "C", texte: "il n'y a pas d'obligation d'apposer sa carte professionnelle dans le véhicule" }
      ]
    },
    {
      id: 14, type: "QCM", enonce: "Qui délivre les agréments aux centres de formation ?",
      choix: [
        { lettre: "A", texte: "le ministère des transports" },
        { lettre: "B", texte: "les préfectures", correct: true },
        { lettre: "C", texte: "l'association permanente des chambres de métiers" },
        { lettre: "D", texte: "les conseils départementaux" }
      ]
    }
  ]
};

const matiere_gestion_examen3: Matiere = {
  id: "gestion",
  nom: "B - Gestion",
  duree: 45,
  coefficient: 2,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QRC", enonce: "M. PAUL achète un véhicule le 1er mars 2018 pour une valeur de 24 000 € HT, amortissable de façon linéaire sur 5 ans. Clôture au 31 décembre. Quelle est la valeur comptable du véhicule au 31 décembre 2021 ? (Détaillez les calculs)",
      reponseQRC: "24000/5 = 4800€/an. 4800/12 = 400€/mois. De mars 2018 à décembre 2021 = 46 mois. 46*400 = 18400€ d'amortissements. Valeur comptable = 24000 - 18400 = 5600€.",
      reponses_possibles: ["5600", "5 600"]
    },
    {
      id: 2, type: "QRC", enonce: "Expliquez ce que représentent le bilan et le compte de résultat.",
      reponseQRC: "Bilan : photographie du patrimoine de l'entreprise à un instant donné. Actif (ce que l'entreprise possède) / Passif (ce qu'elle doit). Compte de résultat : présentation de l'activité économique. Charges / Produits. Permet de déterminer le résultat : bénéfice ou perte.",
      reponses_possibles: ["bilan", "patrimoine", "actif", "passif", "compte de résultat", "charges", "produits", "bénéfice"]
    },
    {
      id: 3, type: "QCM", enonce: "Qu'est-ce qu'une créance ?",
      choix: [
        { lettre: "A", texte: "une facture en attente de création" },
        { lettre: "B", texte: "une facture impayée par un client", correct: true },
        { lettre: "C", texte: "une facture due à un fournisseur" }
      ]
    },
    {
      id: 4, type: "QCM", enonce: "Les emprunts sont intégrés dans :",
      choix: [
        { lettre: "A", texte: "les immobilisations" },
        { lettre: "B", texte: "les capitaux permanents (Capitaux propres + Dettes à long terme)", correct: true },
        { lettre: "C", texte: "les dettes à court terme" },
        { lettre: "D", texte: "les créances sur client" }
      ]
    },
    {
      id: 5, type: "QCM", enonce: "Le résultat d'une entreprise est obtenu par :",
      choix: [
        { lettre: "A", texte: "la différence entre les produits et les charges", correct: true },
        { lettre: "B", texte: "la différence entre actif et passif" },
        { lettre: "C", texte: "stock + créances clients – dettes fournisseurs" }
      ]
    },
    {
      id: 6, type: "QCM", enonce: "Parmi ces propositions, laquelle se trouve à l'actif du bilan ?",
      choix: [
        { lettre: "A", texte: "véhicule", correct: true },
        { lettre: "B", texte: "autorisation de stationnement (licence de taxi)", correct: true },
        { lettre: "C", texte: "capital" },
        { lettre: "D", texte: "prêt bancaire" }
      ]
    },
    {
      id: 7, type: "QCM", enonce: "Quel est le taux de TVA applicable au transport de personnes ?",
      choix: [
        { lettre: "A", texte: "20%" },
        { lettre: "B", texte: "10%", correct: true },
        { lettre: "C", texte: "5,5%" }
      ]
    },
    {
      id: 8, type: "QCM", enonce: "Comment appelle-t-on l'extrait d'immatriculation d'une entreprise artisanale ?",
      choix: [
        { lettre: "A", texte: "un extrait K-bis" },
        { lettre: "B", texte: "un extrait D1", correct: true },
        { lettre: "C", texte: "un extrait de casier n°2" }
      ]
    },
    {
      id: 9, type: "QCM", enonce: "La durée de conservation des factures est de :",
      choix: [
        { lettre: "A", texte: "1 an à compter de la date d'édition" },
        { lettre: "B", texte: "6 à 10 ans à compter de la date d'édition", correct: true },
        { lettre: "C", texte: "tout au long de la vie de l'entreprise" }
      ]
    },
    {
      id: 10, type: "QCM", enonce: "Quelle est la durée de validité d'un chèque ?",
      choix: [
        { lettre: "A", texte: "1 an et 8 jours", correct: true },
        { lettre: "B", texte: "3 mois et 5 jours" },
        { lettre: "C", texte: "6 mois" },
        { lettre: "D", texte: "10 ans et 8 jours" }
      ]
    },
    {
      id: 11, type: "QCM", enonce: "Quel organisme est chargé de la collecte des cotisations sociales du régime général ?",
      choix: [
        { lettre: "A", texte: "la C.A.F." },
        { lettre: "B", texte: "la C.R.A.M." },
        { lettre: "C", texte: "l'U.R.S.S.A.F.", correct: true },
        { lettre: "D", texte: "la C.P.A.M." }
      ]
    },
    {
      id: 12, type: "QCM", enonce: "Quelle est la durée de validité d'un devis ?",
      choix: [
        { lettre: "A", texte: "30 jours" },
        { lettre: "B", texte: "variable selon les mentions du devis", correct: true },
        { lettre: "C", texte: "3 mois" }
      ]
    },
    {
      id: 13, type: "QCM", enonce: "Qu'est-ce que le code NAF ?",
      choix: [
        { lettre: "A", texte: "nomenclature d'activités française", correct: true },
        { lettre: "B", texte: "numéro artisanal français" },
        { lettre: "C", texte: "nombre d'artisans français" }
      ]
    }
  ]
};

const matiere_securite_examen3: Matiere = {
  id: "securite",
  nom: "C - Sécurité routière",
  duree: 30,
  coefficient: 3,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QCM", enonce: "Le changement d'adresse sur une carte grise doit être effectué :",
      choix: [
        { lettre: "A", texte: "dans l'année qui suit le déménagement" },
        { lettre: "B", texte: "n'importe quand, il n'y a pas de délai" },
        { lettre: "C", texte: "dans le mois qui suit le déménagement", correct: true },
        { lettre: "D", texte: "dans les six mois qui suivent le déménagement" }
      ]
    },
    {
      id: 2, type: "QCM", enonce: "L'éclatement d'un pneu, dû à un mauvais gonflage, provient plutôt :",
      choix: [
        { lettre: "A", texte: "d'un excès de pression" },
        { lettre: "B", texte: "d'un manque de pression", correct: true },
        { lettre: "C", texte: "d'avoir deux pneus de taille différente" }
      ]
    },
    {
      id: 3, type: "QCM", enonce: "Lorsque je manœuvre :",
      choix: [
        { lettre: "A", texte: "je dois la priorité avant de manœuvrer" },
        { lettre: "B", texte: "je suis toujours prioritaire" },
        { lettre: "C", texte: "je dois la priorité durant la manœuvre", correct: true }
      ]
    },
    {
      id: 4, type: "QCM", enonce: "En cas de pluie, la vitesse maximale sur une autoroute est baissée à :",
      choix: [
        { lettre: "A", texte: "130 km/h" },
        { lettre: "B", texte: "120 km/h" },
        { lettre: "C", texte: "110 km/h", correct: true }
      ]
    },
    {
      id: 5, type: "QCM", enonce: "En agglomération, l'usage de l'avertisseur sonore :",
      choix: [
        { lettre: "A", texte: "est interdit de manière générale et absolue" },
        { lettre: "B", texte: "n'est autorisé qu'en cas de danger immédiat", correct: true },
        { lettre: "C", texte: "est autorisé pour donner tout type d'avertissement" }
      ]
    },
    {
      id: 6, type: "QCM", enonce: "Lorsque le permis a été invalidé en raison d'une perte totale de points, le nouveau permis obtenu est :",
      choix: [
        { lettre: "A", texte: "un permis probatoire doté d'un capital de 6 points", correct: true },
        { lettre: "B", texte: "un permis probatoire doté d'un capital de 12 points" },
        { lettre: "C", texte: "un permis non probatoire doté d'un capital de 12 points" }
      ]
    },
    {
      id: 7, type: "QCM", enonce: "Un excès de vitesse de 35 km/h au-dessus de la vitesse maximale autorisée entraîne une perte de :",
      choix: [
        { lettre: "A", texte: "1 point" },
        { lettre: "B", texte: "3 points", correct: true },
        { lettre: "C", texte: "4 points" }
      ]
    },
    {
      id: 8, type: "QCM", enonce: "Vous avez consommé de l'alcool. Votre taux est de 0,29 mg par litre d'air expiré. Que se passe-t-il ?",
      choix: [
        { lettre: "A", texte: "vous n'avez pas de poursuites" },
        { lettre: "B", texte: "vous avez une contravention", correct: true },
        { lettre: "C", texte: "c'est un délit passible de poursuites judiciaires" },
        { lettre: "D", texte: "vous avez une contravention et une perte de 6 points" }
      ]
    },
    {
      id: 9, type: "QCM", enonce: "Si mon temps de réaction augmente :",
      choix: [
        { lettre: "A", texte: "la distance d'arrêt augmente", correct: true },
        { lettre: "B", texte: "la distance d'arrêt est inchangée" },
        { lettre: "C", texte: "la distance de réaction augmente", correct: true },
        { lettre: "D", texte: "la distance de freinage augmente" }
      ]
    },
    {
      id: 10, type: "QCM", enonce: "Le niveau 3 des pictogrammes figurant sur les boîtes de médicament est de couleur :",
      choix: [
        { lettre: "A", texte: "rouge", correct: true },
        { lettre: "B", texte: "jaune" },
        { lettre: "C", texte: "orange" }
      ]
    },
    {
      id: 11, type: "QCM", enonce: "En cas d'absorption d'alcool, on observe une augmentation :",
      choix: [
        { lettre: "A", texte: "du champ visuel" },
        { lettre: "B", texte: "de la distance de freinage", correct: true },
        { lettre: "C", texte: "du temps de réaction", correct: true },
        { lettre: "D", texte: "des réflexes" }
      ]
    },
    {
      id: 12, type: "QCM", enonce: "En présence d'un accident qui vient d'avoir lieu, je dois :",
      choix: [
        { lettre: "A", texte: "protéger, alerter, secourir", correct: true },
        { lettre: "B", texte: "alerter, secourir, protéger" },
        { lettre: "C", texte: "secourir, protéger, alerter" }
      ]
    }
  ]
};

const matiere_francais_examen3: Matiere = {
  id: "francais",
  nom: "D - Capacité d'expression et de compréhension en langue française",
  duree: 30,
  coefficient: 2,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QRC", enonce: "Que veut dire \"de spectaculaires démonstrations dont les médias sont friands\" ?",
      reponseQRC: "Les médias aiment le sensationnel. Ils montrent des images fortes pour faire le buzz, souhaitent marquer les esprits. Les spectateurs sont en attente de ces images souvent relayées de manière instantanée.",
      reponses_possibles: ["sensationnel", "buzz", "images fortes", "médias", "spectateurs", "instantané"]
    },
    {
      id: 2, type: "QRC", enonce: "D'après le texte, quelles sont les promesses de la voiture autonome ?",
      reponseQRC: "Suppression de la mortalité routière, la mobilité personnelle sera accessible à tous, suppression des embouteillages et non-polluante.",
      reponses_possibles: ["mortalité routière", "mobilité", "embouteillages", "polluant", "autonome"]
    },
    {
      id: 3, type: "QCM", enonce: "Donnez un synonyme du verbe \"titiller\" :",
      choix: [
        { lettre: "A", texte: "tracasser", correct: true },
        { lettre: "B", texte: "interpeller" },
        { lettre: "C", texte: "taquiner", correct: true }
      ]
    },
    {
      id: 4, type: "QCM", enonce: "Que signifie le verbe \"éradiquer\" ?",
      choix: [
        { lettre: "A", texte: "maintenir" },
        { lettre: "B", texte: "faire disparaître", correct: true },
        { lettre: "C", texte: "conserver" }
      ]
    },
    {
      id: 5, type: "QCM", enonce: "Donnez le contraire de l'adjectif \"autonome\" :",
      choix: [
        { lettre: "A", texte: "assistée", correct: true },
        { lettre: "B", texte: "libre" },
        { lettre: "C", texte: "indépendant" }
      ]
    },
    {
      id: 6, type: "QCM", enonce: "Dans le texte, quel est le sens du mot « bardés » ?",
      choix: [
        { lettre: "A", texte: "devenus menaçants" },
        { lettre: "B", texte: "avec un prix réduit" },
        { lettre: "C", texte: "couverts", correct: true }
      ]
    },
    {
      id: 7, type: "QCM", enonce: "Un comportement erratique, c'est :",
      choix: [
        { lettre: "A", texte: "un comportement instable", correct: true },
        { lettre: "B", texte: "un comportement sans cohérence", correct: true },
        { lettre: "C", texte: "un comportement dangereux" }
      ]
    },
    {
      id: 8, type: "QCM", enonce: "La voiture autonome est un moyen de communication facile pour les constructeurs car :",
      choix: [
        { lettre: "A", texte: "le concept n'intéresse que les médias" },
        { lettre: "B", texte: "elles échangent des informations entre elles" },
        { lettre: "C", texte: "les médias diffusent leurs démonstrations, ce qui fait de la publicité aux constructeurs", correct: true }
      ]
    }
  ]
};

const matiere_anglais_examen3: Matiere = {
  id: "anglais",
  nom: "E - Capacité d'expression et de compréhension en langue anglaise",
  duree: 30,
  coefficient: 1,
  noteEliminatoire: 4,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QCM", enonce: "Can you turn left at the next light?",
      choix: [
        { lettre: "A", texte: "sorry I have no light, I don't smoke" },
        { lettre: "B", texte: "sorry the street is closed", correct: true },
        { lettre: "C", texte: "sorry I never turn left" }
      ]
    },
    {
      id: 2, type: "QCM", enonce: "How long will it take to get there?",
      choix: [
        { lettre: "A", texte: "about two and a half miles" },
        { lettre: "B", texte: "about twenty minutes", correct: true },
        { lettre: "C", texte: "around three thirty" }
      ]
    },
    {
      id: 3, type: "QCM", enonce: "Which currency can I use to pay for the trip?",
      choix: [
        { lettre: "A", texte: "I only accept cash and card", correct: true },
        { lettre: "B", texte: "you can only pay in Euro" },
        { lettre: "C", texte: "it's possible to pay by cheques" }
      ]
    },
    {
      id: 4, type: "QCM", enonce: "I'm cold, ……… I ……… the window:",
      choix: [
        { lettre: "A", texte: "could, closed" },
        { lettre: "B", texte: "can, closed" },
        { lettre: "C", texte: "can, close", correct: true }
      ]
    },
    {
      id: 5, type: "QCM", enonce: "\"A refound\" signifie :",
      choix: [
        { lettre: "A", texte: "un refus" },
        { lettre: "B", texte: "un remboursement", correct: true },
        { lettre: "C", texte: "une retrouvaille" }
      ]
    },
    {
      id: 6, type: "QCM", enonce: "Sorry! It's quite expensive for us. May we get a ……… price?",
      choix: [
        { lettre: "A", texte: "lower", correct: true },
        { lettre: "B", texte: "reduction" },
        { lettre: "C", texte: "gooder" },
        { lettre: "D", texte: "less" }
      ]
    },
    {
      id: 7, type: "QCM", enonce: "\"To demand\" signifie :",
      choix: [
        { lettre: "A", texte: "demander" },
        { lettre: "B", texte: "exiger", correct: true },
        { lettre: "C", texte: "supplier" }
      ]
    },
    {
      id: 8, type: "QCM", enonce: "Les ceintures de sécurité sont obligatoires dans le véhicule. En anglais :",
      choix: [
        { lettre: "A", texte: "you may fasten your seatbelt in the car" },
        { lettre: "B", texte: "you will fasten your seatbelt in the car" },
        { lettre: "C", texte: "you must fasten your seatbelt in the car", correct: true }
      ]
    },
    {
      id: 9, type: "QCM", enonce: "Où voulez-vous aller ? En anglais :",
      choix: [
        { lettre: "A", texte: "where will you go?" },
        { lettre: "B", texte: "where do you want to go?", correct: true },
        { lettre: "C", texte: "who do you want to go?" }
      ]
    },
    {
      id: 10, type: "QCM", enonce: "Y a-t-il une prise USB accessible aux places arrières ? En anglais :",
      choix: [
        { lettre: "A", texte: "has it a USB plug available for the backseats?" },
        { lettre: "B", texte: "is there a USB plug available at the backseats?", correct: true },
        { lettre: "C", texte: "is there a USB plug available for the rear of the car?", correct: true }
      ]
    }
  ]
};

const matiere_reglementation_taxi_examen3: Matiere = {
  id: "reglementation_taxi",
  nom: "F(T) - Connaissance du territoire et réglementation locale TAXI",
  duree: 30,
  coefficient: 3,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QRC", enonce: "Qu'est-ce que la maraude pour un taxi ?",
      reponseQRC: "La maraude est le fait pour un conducteur T3P de prendre en charge un client sur la voie publique sans réservation préalable. Ce droit est exclusif aux taxis.",
      reponses_possibles: ["maraude", "voie publique", "sans réservation", "taxi"]
    },
    {
      id: 2, type: "QCM", enonce: "Un client est avec son chien d'aveugle et vous appelle pour une course :",
      choix: [
        { lettre: "A", texte: "J'ai le droit de refuser la course" },
        { lettre: "B", texte: "Je suis dans l'obligation de l'accepter lui et son chien", correct: true },
        { lettre: "C", texte: "Je n'accepte que le client" },
        { lettre: "D", texte: "Je risque une amende de 135€ si je refuse" }
      ]
    },
    {
      id: 3, type: "QCM", enonce: "Qui parmi les T3P peut être conventionné par la caisse d'assurance maladie ?",
      choix: [
        { lettre: "A", texte: "les taxis", correct: true },
        { lettre: "B", texte: "les VTC" },
        { lettre: "C", texte: "les véhicules motorisés à 2 ou 3 roues" }
      ]
    },
    {
      id: 4, type: "QCM", enonce: "La réglementation du T3P se trouve dans le :",
      choix: [
        { lettre: "A", texte: "code préfectoral" },
        { lettre: "B", texte: "code du travail" },
        { lettre: "C", texte: "code pénal" },
        { lettre: "D", texte: "code des transports", correct: true }
      ]
    },
    {
      id: 5, type: "QCM", enonce: "Un artisan effectuant du T3P est victime d'un accident corporel dans l'exercice de son activité, sous quel régime est-il ?",
      choix: [
        { lettre: "A", texte: "pas de régime particulier" },
        { lettre: "B", texte: "régime des indemnités journalières au titre de la maladie", correct: true },
        { lettre: "C", texte: "de l'arrêt maladie classique" }
      ]
    },
    {
      id: 6, type: "QCM", enonce: "Un conducteur de T3P n'effectuant que des remplacements épisodiques doit-il être titulaire d'une carte professionnelle ?",
      choix: [
        { lettre: "A", texte: "non, si ces remplacements représentent moins de 10 heures par semaine" },
        { lettre: "B", texte: "non" },
        { lettre: "C", texte: "oui", correct: true }
      ]
    },
    {
      id: 7, type: "QCM", enonce: "Les centres de formation sont agréés par :",
      choix: [
        { lettre: "A", texte: "le préfet du département" },
        { lettre: "B", texte: "le ministère des transports" },
        { lettre: "C", texte: "le préfet de la région", correct: true }
      ]
    }
  ]
};

const matiere_reglementation_taxi2_examen3: Matiere = {
  id: "reglementation_taxi2",
  nom: "G(T) - Réglementation nationale TAXI et gestion propre à cette activité",
  duree: 20,
  coefficient: 3,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QRC", enonce: "Développez le sigle \"TICPE\".",
      reponseQRC: "Taxe Intérieure sur la Consommation des Produits Énergétiques.",
      reponses_possibles: ["taxe intérieure", "consommation", "produits énergétiques"]
    },
    {
      id: 2, type: "QCM", enonce: "L'assurance RCP peut être invoquée par le conducteur s'il :",
      choix: [
        { lettre: "A", texte: "abîme le vêtement de son passager", correct: true },
        { lettre: "B", texte: "accroche un autre véhicule en manœuvrant" },
        { lettre: "C", texte: "n'a pas sa carte professionnelle lors d'un contrôle" }
      ]
    },
    {
      id: 3, type: "QCM", enonce: "La formation continue des conducteurs T3P est valable :",
      choix: [
        { lettre: "A", texte: "1 an" },
        { lettre: "B", texte: "5 ans", correct: true },
        { lettre: "C", texte: "2 ans" },
        { lettre: "D", texte: "10 ans" }
      ]
    },
    {
      id: 4, type: "QCM", enonce: "Quel service délivre la carte professionnelle de conducteur de T3P ?",
      choix: [
        { lettre: "A", texte: "La préfecture", correct: true },
        { lettre: "B", texte: "La DIRECCTE" },
        { lettre: "C", texte: "La DREAL" }
      ]
    }
  ]
};

const matiere_reglementation_vtc_examen3: Matiere = {
  id: "reglementation_vtc",
  nom: "F(V) - Développement commercial et gestion propre à l'activité de VTC",
  duree: 30,
  coefficient: 3,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QRC", enonce: "Citez 2 cas dans lesquels la carte professionnelle peut être retirée à un conducteur du T3P.",
      reponseQRC: "Annulation du permis de conduire. Délit pénal prévu par le code des transports (délits routiers, agressions sexuelles, etc.).",
      reponses_possibles: ["annulation permis", "délit pénal", "code des transports"]
    },
    {
      id: 2, type: "QCM", enonce: "Un client est avec son chien d'aveugle et appelle pour une course VTC :",
      choix: [
        { lettre: "A", texte: "J'ai le droit de refuser" },
        { lettre: "B", texte: "Je suis dans l'obligation de l'accepter lui et son chien", correct: true },
        { lettre: "C", texte: "Je n'accepte que le client" }
      ]
    },
    {
      id: 3, type: "QCM", enonce: "La réglementation du T3P se trouve dans le :",
      choix: [
        { lettre: "A", texte: "code préfectoral" },
        { lettre: "B", texte: "code du travail" },
        { lettre: "C", texte: "code des transports", correct: true }
      ]
    },
    {
      id: 4, type: "QCM", enonce: "Un conducteur de T3P n'effectuant que des remplacements épisodiques doit-il être titulaire d'une carte professionnelle ?",
      choix: [
        { lettre: "A", texte: "non, si moins de 10h par semaine" },
        { lettre: "B", texte: "non" },
        { lettre: "C", texte: "oui", correct: true }
      ]
    },
    {
      id: 5, type: "QCM", enonce: "Pour s'inscrire à l'examen d'accès à la profession, le candidat ne doit pas avoir été exclu pour fraude :",
      choix: [
        { lettre: "A", texte: "dans les 10 ans qui précèdent sa demande" },
        { lettre: "B", texte: "dans les 5 ans qui précèdent sa demande", correct: true },
        { lettre: "C", texte: "dans l'année" },
        { lettre: "D", texte: "dans les 2 ans qui précèdent sa demande" }
      ]
    },
    {
      id: 6, type: "QCM", enonce: "Un examen médical supplémentaire peut être demandé :",
      choix: [
        { lettre: "A", texte: "En cas d'interruption d'activité de plus de six mois", correct: true },
        { lettre: "B", texte: "En cas de suspension de moins d'un mois" },
        { lettre: "C", texte: "En cas d'invalidation du permis", correct: true }
      ]
    }
  ]
};

const matiere_reglementation_vtc2_examen3: Matiere = {
  id: "reglementation_vtc2",
  nom: "G(V) - Réglementation nationale spécifique à l'activité de VTC",
  duree: 20,
  coefficient: 3,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QRC", enonce: "Qu'est-ce que l'honorabilité dans la profession de conducteur T3P ?",
      reponseQRC: "Avoir le casier judiciaire B2 vierge.",
      reponses_possibles: ["casier judiciaire b2 vierge", "b2 vierge", "casier b2"]
    },
    {
      id: 2, type: "QCM", enonce: "La formation continue est valable :",
      choix: [
        { lettre: "A", texte: "5 ans", correct: true },
        { lettre: "B", texte: "1 an" },
        { lettre: "C", texte: "2 ans" },
        { lettre: "D", texte: "10 ans" }
      ]
    },
    {
      id: 3, type: "QCM", enonce: "La carte professionnelle est délivrée par :",
      choix: [
        { lettre: "A", texte: "La préfecture", correct: true },
        { lettre: "B", texte: "La DIRECCTE" },
        { lettre: "C", texte: "La DREAL" }
      ]
    }
  ]
};

export const examenBlanc3Taxi: ExamenBlanc = {
  id: "eb3-taxi",
  numero: 3,
  type: "TAXI",
  titre: "Examen Blanc N°3 - Formation TAXI",
  matieres: [
    matiere_t3p_examen3,
    matiere_gestion_examen3,
    matiere_securite_examen3,
    matiere_francais_examen3,
    matiere_anglais_examen3,
    matiere_reglementation_taxi_examen3,
    matiere_reglementation_taxi2_examen3
  ]
};

export const examenBlanc3VTC: ExamenBlanc = {
  id: "eb3-vtc",
  numero: 3,
  type: "VTC",
  titre: "Examen Blanc N°3 - Formation VTC",
  matieres: [
    matiere_t3p_examen3,
    matiere_gestion_examen3,
    matiere_securite_examen3,
    matiere_francais_examen3,
    matiere_anglais_examen3,
    matiere_reglementation_vtc_examen3,
    matiere_reglementation_vtc2_examen3
  ]
};

// ===== EXAMEN BLANC N°4 =====

const matiere_t3p_examen4: Matiere = {
  id: "t3p",
  nom: "A - Transport Public Particulier de Personnes (T3P)",
  duree: 45,
  coefficient: 3,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QRC", enonce: "Une centrale de réservation doit justifier de l'existence d'un contrat d'assurance couvrant quel type de responsabilité ?",
      reponseQRC: "Elle doit prouver l'existence d'un contrat d'assurance couvrant sa responsabilité civile professionnelle.",
      reponses_possibles: ["responsabilité civile professionnelle", "RCP", "assurance"]
    },
    {
      id: 2, type: "QRC", enonce: "Quelles sont les sanctions administratives encourues par un conducteur de T3P en cas de violation de la réglementation ?",
      reponseQRC: "L'avertissement. Le retrait temporaire ou définitif de la carte professionnelle.",
      reponses_possibles: ["avertissement", "retrait temporaire", "retrait définitif", "carte professionnelle"]
    },
    {
      id: 3, type: "QRC", enonce: "Quel est le terme utilisé quand un conducteur T3P prend en charge un client sur la voie publique sans réservation préalable ?",
      reponseQRC: "La maraude.",
      reponses_possibles: ["maraude"]
    },
    {
      id: 4, type: "QRC", enonce: "Qu'est-ce qu'un service de transport régulier ?",
      reponseQRC: "Service collectif dont l'itinéraire, les points d'arrêt, les fréquences, les horaires, les tarifs sont fixés et publiés à l'avance.",
      reponses_possibles: ["itinéraire", "points d'arrêt", "fréquences", "horaires", "tarifs", "fixés", "publiés"]
    },
    {
      id: 5, type: "QRC", enonce: "Citez deux cas dans lesquels la carte professionnelle peut être retirée à un conducteur du T3P.",
      reponseQRC: "Annulation du permis de conduire. Délit pénal prévu par le code des transports.",
      reponses_possibles: ["annulation permis", "délit pénal", "code des transports"]
    },
    {
      id: 6, type: "QCM", enonce: "Pour s'inscrire à l'examen d'accès à la profession, le candidat ne doit pas avoir été exclu pour fraude :",
      choix: [
        { lettre: "A", texte: "dans les 10 ans qui précèdent sa demande" },
        { lettre: "B", texte: "dans les 5 ans qui précèdent sa demande", correct: true },
        { lettre: "C", texte: "dans l'année" },
        { lettre: "D", texte: "dans les 2 ans qui précèdent sa demande" }
      ]
    },
    {
      id: 7, type: "QCM", enonce: "Un examen médical supplémentaire peut être demandé :",
      choix: [
        { lettre: "A", texte: "En cas d'interruption d'activité de plus de six mois", correct: true },
        { lettre: "B", texte: "En cas de suspension de moins d'un mois" },
        { lettre: "C", texte: "En cas d'invalidation du permis", correct: true }
      ]
    },
    {
      id: 8, type: "QCM", enonce: "L'assurance RCP peut être invoquée par le conducteur s'il :",
      choix: [
        { lettre: "A", texte: "abîme le vêtement de son passager", correct: true },
        { lettre: "B", texte: "accroche un autre véhicule en manœuvrant" },
        { lettre: "C", texte: "est contrôlé sans carte professionnelle" }
      ]
    },
    {
      id: 9, type: "QCM", enonce: "Si un chauffeur utilise son véhicule T3P dans le cadre d'une activité non-professionnelle, que doit-il faire ?",
      choix: [
        { lettre: "A", texte: "enlever ou occulter toutes références à la profession exercée", correct: true },
        { lettre: "B", texte: "il n'a pas le droit d'utiliser son véhicule en dehors de son activité" },
        { lettre: "C", texte: "ne rien faire de spécifique" }
      ]
    },
    {
      id: 10, type: "QCM", enonce: "Un client est avec son chien d'aveugle et vous appelle pour une course :",
      choix: [
        { lettre: "A", texte: "J'ai le droit de refuser la course" },
        { lettre: "B", texte: "Je suis dans l'obligation de l'accepter lui et son chien", correct: true },
        { lettre: "C", texte: "Je n'accepte que le client" }
      ]
    },
    {
      id: 11, type: "QCM", enonce: "Qui parmi les T3P peut être conventionné par la caisse d'assurance maladie ?",
      choix: [
        { lettre: "A", texte: "les taxis", correct: true },
        { lettre: "B", texte: "les VTC" },
        { lettre: "C", texte: "les véhicules motorisés à 2 ou 3 roues" }
      ]
    },
    {
      id: 12, type: "QCM", enonce: "La réglementation du T3P se trouve dans le :",
      choix: [
        { lettre: "A", texte: "code préfectoral" },
        { lettre: "B", texte: "code du travail" },
        { lettre: "C", texte: "code pénal" },
        { lettre: "D", texte: "code des transports", correct: true }
      ]
    },
    {
      id: 13, type: "QCM", enonce: "Un conducteur de T3P n'effectuant que des remplacements épisodiques doit-il être titulaire d'une carte professionnelle ?",
      choix: [
        { lettre: "A", texte: "non, si ces remplacements représentent moins de 10 heures par semaine" },
        { lettre: "B", texte: "non" },
        { lettre: "C", texte: "oui", correct: true }
      ]
    }
  ]
};

const matiere_gestion_examen4: Matiere = {
  id: "gestion",
  nom: "B - Gestion",
  duree: 45,
  coefficient: 2,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QRC", enonce: "Vous créez seul(e) une activité de transport de personnes. Quels sont les statuts juridiques possibles ? (citez-en trois)",
      reponseQRC: "Entreprise Individuelle et/ou microentreprise. Entreprise Unipersonnelle à Responsabilité Limitée (EURL). SASU.",
      reponses_possibles: ["entreprise individuelle", "microentreprise", "EURL", "SASU"]
    },
    {
      id: 2, type: "QRC", enonce: "Citez 2 types d'immobilisations.",
      reponseQRC: "Immobilisations corporelles. Immobilisations incorporelles. Immobilisations financières.",
      reponses_possibles: ["corporelles", "incorporelles", "financières", "immobilisations"]
    },
    {
      id: 3, type: "QCM", enonce: "Lors de la création d'une société, la rédaction d'une annonce légale est :",
      choix: [
        { lettre: "A", texte: "Obligatoire", correct: true },
        { lettre: "B", texte: "nécessaire pour faire de la publicité" },
        { lettre: "C", texte: "facultative" }
      ]
    },
    {
      id: 4, type: "QCM", enonce: "Les achats de carburant figurent :",
      choix: [
        { lettre: "A", texte: "Au compte de résultat, dans les charges", correct: true },
        { lettre: "B", texte: "au bilan, à l'actif" },
        { lettre: "C", texte: "au compte de résultat, dans les produits" },
        { lettre: "D", texte: "au bilan, au passif" }
      ]
    },
    {
      id: 5, type: "QCM", enonce: "Un véhicule est acquis 22 000 € HT le 1er avril 2016. Calculez l'amortissement au 31/12/2016, durée 4 ans :",
      choix: [
        { lettre: "A", texte: "5 500 €" },
        { lettre: "B", texte: "4 125 €", correct: true },
        { lettre: "C", texte: "6 574 €" },
        { lettre: "D", texte: "5 885 €" }
      ]
    },
    {
      id: 6, type: "QCM", enonce: "Le coût de revient d'une prestation est de 22€, vous souhaitez réaliser une marge de 20% sur le prix de vente net. Votre prix de vente sera de :",
      choix: [
        { lettre: "A", texte: "26 €" },
        { lettre: "B", texte: "26,40 €", correct: true },
        { lettre: "C", texte: "27,50 €" }
      ]
    },
    {
      id: 7, type: "QCM", enonce: "L'EBE signifie :",
      choix: [
        { lettre: "A", texte: "encaissement brut excédentaire" },
        { lettre: "B", texte: "excédent brut d'exploitation", correct: true },
        { lettre: "C", texte: "excédent bénéficiaire employé" }
      ]
    },
    {
      id: 8, type: "QCM", enonce: "Le numéro SIREN identifie :",
      choix: [
        { lettre: "A", texte: "La personne (le gérant)" },
        { lettre: "B", texte: "L'entreprise", correct: true },
        { lettre: "C", texte: "L'activité" }
      ]
    },
    {
      id: 9, type: "QCM", enonce: "La CSG :",
      choix: [
        { lettre: "A", texte: "est un impôt supporté par le salarié et prélevé sur sa fiche de paie", correct: true },
        { lettre: "B", texte: "signifie Contribution Salariale Généralisée" },
        { lettre: "C", texte: "est un impôt prélevé à la source" }
      ]
    },
    {
      id: 10, type: "QCM", enonce: "Le capital social d'une SARL est divisé en :",
      choix: [
        { lettre: "A", texte: "Actions" },
        { lettre: "B", texte: "parts sociales", correct: true },
        { lettre: "C", texte: "obligations" }
      ]
    }
  ]
};

const matiere_securite_examen4: Matiere = {
  id: "securite",
  nom: "C - Sécurité routière",
  duree: 30,
  coefficient: 3,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QCM", enonce: "Dans quel cas exceptionnel pouvez-vous dépasser un véhicule par la droite ?",
      choix: [
        { lettre: "A", texte: "Lorsque le conducteur devant a signalé tourner à gauche", correct: true },
        { lettre: "B", texte: "Lorsque le conducteur devant a signalé tourner à droite" },
        { lettre: "C", texte: "Lorsque le conducteur derrière a signalé tourner à gauche" },
        { lettre: "D", texte: "Il est toujours autorisé de dépasser par la droite" }
      ]
    },
    {
      id: 2, type: "QCM", enonce: "Est titulaire d'un permis probatoire tout conducteur qui :",
      choix: [
        { lettre: "A", texte: "obtient le permis après invalidation administrative", correct: true },
        { lettre: "B", texte: "obtient le permis après annulation judiciaire", correct: true },
        { lettre: "C", texte: "réussit la catégorie A avec catégorie B depuis plus de 3 ans" }
      ]
    },
    {
      id: 3, type: "QCM", enonce: "Contrôlé avec un taux d'alcool de 0,7 g par litre de sang, je risque :",
      choix: [
        { lettre: "A", texte: "une amende" },
        { lettre: "B", texte: "un retrait de 4 points" },
        { lettre: "C", texte: "un retrait de 6 points sur mon permis de conduire", correct: true },
        { lettre: "D", texte: "une peine de prison" }
      ]
    },
    {
      id: 4, type: "QCM", enonce: "Pour dépasser un cycliste hors agglomération, je dois laisser un espace latéral :",
      choix: [
        { lettre: "A", texte: "Suffisant, en fonction de la largeur de la chaussée" },
        { lettre: "B", texte: "De 1,5 mètre au minimum", correct: true },
        { lettre: "C", texte: "De 1 mètre au minimum" }
      ]
    },
    {
      id: 5, type: "QCM", enonce: "Dans quel délai un automobiliste doit-il transmettre un constat amiable à son assureur ?",
      choix: [
        { lettre: "A", texte: "1 mois" },
        { lettre: "B", texte: "7 jours" },
        { lettre: "C", texte: "2 jours" },
        { lettre: "D", texte: "5 jours", correct: true }
      ]
    },
    {
      id: 6, type: "QCM", enonce: "Par temps de pluie, l'utilisation des feux de brouillard arrière est :",
      choix: [
        { lettre: "A", texte: "Interdite" },
        { lettre: "B", texte: "Obligatoire", correct: true },
        { lettre: "C", texte: "Conseillée" }
      ]
    },
    {
      id: 7, type: "QCM", enonce: "Que faut-il faire en cas d'incendie dans un tunnel :",
      choix: [
        { lettre: "A", texte: "faire un demi-tour pour fuir plus vite" },
        { lettre: "B", texte: "laisser les clefs sur le véhicule, après avoir éteint le moteur", correct: true },
        { lettre: "C", texte: "évacuer le tunnel par l'issue de secours la plus proche", correct: true }
      ]
    },
    {
      id: 8, type: "QCM", enonce: "Le non-port de la ceinture de sécurité entraîne un retrait de :",
      choix: [
        { lettre: "A", texte: "2 points" },
        { lettre: "B", texte: "3 points", correct: true },
        { lettre: "C", texte: "4 points" }
      ]
    },
    {
      id: 9, type: "QCM", enonce: "A 50 km/h, la distance de sécurité est de :",
      choix: [
        { lettre: "A", texte: "20 mètres" },
        { lettre: "B", texte: "40 mètres" },
        { lettre: "C", texte: "30 mètres", correct: true }
      ]
    },
    {
      id: 10, type: "QCM", enonce: "L'ABS (système d'antiblocage des roues) :",
      choix: [
        { lettre: "A", texte: "aide à maintenir la direction du véhicule", correct: true },
        { lettre: "B", texte: "réduit considérablement la distance d'arrêt" },
        { lettre: "C", texte: "permet de ne pas allonger la distance d'arrêt" }
      ]
    }
  ]
};

const matiere_francais_examen4: Matiere = {
  id: "francais",
  nom: "D - Capacité d'expression et de compréhension en langue française",
  duree: 30,
  coefficient: 2,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QRC", enonce: "Qu'est-ce qu'il faudrait faire pour faciliter l'interaction entre voitures autonomes et véhicules classiques ?",
      reponseQRC: "Interdire la circulation aux véhicules classiques dans certaines zones par exemple.",
      reponses_possibles: ["interdire", "zones", "circulation", "classiques"]
    },
    {
      id: 2, type: "QRC", enonce: "Quelles situations sont des challenges pour la voiture sans conducteur ?",
      reponseQRC: "Une place où l'on croise des vélos, des rollers, d'autres conducteurs humains, ou une route passant devant une école avec plein d'enfants.",
      reponses_possibles: ["vélos", "rollers", "conducteurs humains", "école", "enfants"]
    },
    {
      id: 3, type: "QRC", enonce: "Pourquoi les interactions avec les humains sont-elles complexes pour les robots ?",
      reponseQRC: "Parce que les robots ne savent pas traiter les intentions.",
      reponses_possibles: ["robots", "traiter les intentions", "intentions"]
    },
    {
      id: 4, type: "QCM", enonce: "Les dispositifs d'assistance à la conduite permettent au véhicule automatisé de :",
      choix: [
        { lettre: "A", texte: "se garer tout seul" },
        { lettre: "B", texte: "rouler devant les écoles" },
        { lettre: "C", texte: "rouler sur certaines portions d'autoroute", correct: true }
      ]
    },
    {
      id: 5, type: "QCM", enonce: "Google teste des taxis :",
      choix: [
        { lettre: "A", texte: "sans chauffeurs", correct: true },
        { lettre: "B", texte: "qui coûtent des milliards de dollars" },
        { lettre: "C", texte: "sans pédales" }
      ]
    },
    {
      id: 6, type: "QCM", enonce: "Si deux piétons discutent sur le bord de la route, la voiture sans conducteur :",
      choix: [
        { lettre: "A", texte: "s'arrête pour les faire traverser" },
        { lettre: "B", texte: "a du mal à percevoir s'ils vont traverser ou pas", correct: true },
        { lettre: "C", texte: "roule plus lentement" }
      ]
    },
    {
      id: 7, type: "QCM", enonce: "A partir de quand la voiture sans conducteur pourra-t-elle circuler ?",
      choix: [
        { lettre: "A", texte: "Demain" },
        { lettre: "B", texte: "Avant 50 ans" },
        { lettre: "C", texte: "Dans 50 ans ou jamais", correct: true }
      ]
    },
    {
      id: 8, type: "QCM", enonce: "Au sujet de la voiture sans chauffeur, les experts sont :",
      choix: [
        { lettre: "A", texte: "partagés", correct: true },
        { lettre: "B", texte: "complètement d'accord" },
        { lettre: "C", texte: "méfiants" }
      ]
    }
  ]
};

const matiere_anglais_examen4: Matiere = {
  id: "anglais",
  nom: "E - Capacité d'expression et de compréhension en langue anglaise",
  duree: 30,
  coefficient: 1,
  noteEliminatoire: 4,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QCM", enonce: "Est-ce que tout va bien ? En anglais :",
      choix: [
        { lettre: "A", texte: "is everything ok?", correct: true },
        { lettre: "B", texte: "is everything fine?", correct: true },
        { lettre: "C", texte: "was everything fine?" },
        { lettre: "D", texte: "are everything ok?" }
      ]
    },
    {
      id: 2, type: "QCM", enonce: "Sorry! It's quite expensive for us. May we get a ……… price?",
      choix: [
        { lettre: "A", texte: "lower", correct: true },
        { lettre: "B", texte: "gooder" },
        { lettre: "C", texte: "less" },
        { lettre: "D", texte: "reduction" }
      ]
    },
    {
      id: 3, type: "QCM", enonce: "Votre séjour s'est-il bien passé ? En anglais :",
      choix: [
        { lettre: "A", texte: "Where would you like to go?" },
        { lettre: "B", texte: "How was your trip?" },
        { lettre: "C", texte: "Did you enjoy your stay?", correct: true }
      ]
    },
    {
      id: 4, type: "QCM", enonce: "Il est interdit de fumer dans la voiture ! En anglais :",
      choix: [
        { lettre: "A", texte: "it's allowed of smoke in the car!" },
        { lettre: "B", texte: "it's forbidden to smoke in the car!", correct: true },
        { lettre: "C", texte: "it's forbidden of smoke in the car!" }
      ]
    },
    {
      id: 5, type: "QCM", enonce: "Do you have change on ten euros?",
      choix: [
        { lettre: "A", texte: "connaissez-vous un bureau de change pour des euros?" },
        { lettre: "B", texte: "avez-vous la monnaie sur dix euros?", correct: true },
        { lettre: "C", texte: "pouvez-vous me donner dix euros?" }
      ]
    },
    {
      id: 6, type: "QCM", enonce: "Souhaitez-vous un reçu ? En anglais :",
      choix: [
        { lettre: "A", texte: "do you want a ticket?" },
        { lettre: "B", texte: "did you want a bill?" },
        { lettre: "C", texte: "would you like a receipt?", correct: true }
      ]
    },
    {
      id: 7, type: "QCM", enonce: "Puis-je mettre vos bagages dans le coffre ? En anglais :",
      choix: [
        { lettre: "A", texte: "May I leave your luggage there?" },
        { lettre: "B", texte: "May I put your luggage in the trunk?", correct: true },
        { lettre: "C", texte: "May I take your luggage?" }
      ]
    }
  ]
};

const matiere_reglementation_taxi_examen4: Matiere = {
  id: "reglementation_taxi",
  nom: "F(T) - Connaissance du territoire et réglementation locale TAXI",
  duree: 30,
  coefficient: 3,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QCM", enonce: "Ce panneau signale :",
      choix: [
        { lettre: "A", texte: "Une chaussée à double sens de circulation" },
        { lettre: "B", texte: "Une obligation de céder le passage à la circulation venant en sens inverse", correct: true },
        { lettre: "C", texte: "Une priorité de passage par rapport à la circulation venant en sens inverse" }
      ]
    },
    {
      id: 2, type: "QCM", enonce: "Le dépistage de stupéfiants est :",
      choix: [
        { lettre: "A", texte: "possible lors d'un accident corporel ou matériel", correct: true },
        { lettre: "B", texte: "obligatoire pour toute infraction" },
        { lettre: "C", texte: "obligatoire lors d'un accident mortel", correct: true }
      ]
    },
    {
      id: 3, type: "QCM", enonce: "En suivant un stage de sensibilisation à la sécurité routière, un conducteur peut retrouver :",
      choix: [
        { lettre: "A", texte: "10 points" },
        { lettre: "B", texte: "8 points" },
        { lettre: "C", texte: "4 points", correct: true }
      ]
    },
    {
      id: 4, type: "QCM", enonce: "La déclaration de cessation de paiement se fait :",
      choix: [
        { lettre: "A", texte: "à la chambre de commerce et d'industrie" },
        { lettre: "B", texte: "à la chambre de métiers et de l'artisanat" },
        { lettre: "C", texte: "auprès du greffe du Tribunal de Commerce", correct: true }
      ]
    }
  ]
};

const matiere_reglementation_taxi2_examen4: Matiere = {
  id: "reglementation_taxi2",
  nom: "G(T) - Réglementation nationale TAXI et gestion propre à cette activité",
  duree: 20,
  coefficient: 3,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QCM", enonce: "Un conducteur qui commet un excès de vitesse de 40 km/h risque :",
      choix: [
        { lettre: "A", texte: "une peine d'emprisonnement" },
        { lettre: "B", texte: "la suspension de son permis de conduire", correct: true },
        { lettre: "C", texte: "la réduction de six points du permis" }
      ]
    },
    {
      id: 2, type: "QCM", enonce: "Dans un tunnel éclairé, hors agglomération, je circule :",
      choix: [
        { lettre: "A", texte: "en feux de croisement", correct: true },
        { lettre: "B", texte: "en feux de route" },
        { lettre: "C", texte: "en feux de brouillard" }
      ]
    },
    {
      id: 3, type: "QCM", enonce: "Parmi les 3 termes suivants, lequel n'est pas une composante de l'actif du bilan ?",
      choix: [
        { lettre: "A", texte: "le résultat de l'exercice", correct: true },
        { lettre: "B", texte: "les disponibilités" },
        { lettre: "C", texte: "les frais d'établissement" }
      ]
    }
  ]
};

const matiere_reglementation_vtc_examen4: Matiere = {
  id: "reglementation_vtc",
  nom: "F(V) - Développement commercial et gestion propre à l'activité de VTC",
  duree: 30,
  coefficient: 3,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QCM", enonce: "Ce panneau signale :",
      choix: [
        { lettre: "A", texte: "Une chaussée à double sens de circulation" },
        { lettre: "B", texte: "Une obligation de céder le passage à la circulation venant en sens inverse", correct: true },
        { lettre: "C", texte: "Une priorité de passage" }
      ]
    },
    {
      id: 2, type: "QCM", enonce: "Le dépistage de stupéfiants est :",
      choix: [
        { lettre: "A", texte: "possible lors d'un accident corporel ou matériel", correct: true },
        { lettre: "B", texte: "obligatoire pour toute infraction" },
        { lettre: "C", texte: "obligatoire lors d'un accident mortel", correct: true }
      ]
    },
    {
      id: 3, type: "QCM", enonce: "Un conducteur VTC peut-il exercer dans n'importe quelle ville de France ?",
      choix: [
        { lettre: "A", texte: "Non, uniquement dans la ville d'immatriculation" },
        { lettre: "B", texte: "Oui, sur tout le territoire national", correct: true },
        { lettre: "C", texte: "Seulement dans sa région" }
      ]
    },
    {
      id: 4, type: "QCM", enonce: "La déclaration de cessation de paiement se fait :",
      choix: [
        { lettre: "A", texte: "à la chambre de commerce et d'industrie" },
        { lettre: "B", texte: "à la chambre de métiers et de l'artisanat" },
        { lettre: "C", texte: "auprès du greffe du Tribunal de Commerce", correct: true }
      ]
    }
  ]
};

const matiere_reglementation_vtc2_examen4: Matiere = {
  id: "reglementation_vtc2",
  nom: "G(V) - Réglementation nationale spécifique à l'activité de VTC",
  duree: 20,
  coefficient: 3,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QCM", enonce: "Un conducteur qui commet un excès de vitesse de 40 km/h risque :",
      choix: [
        { lettre: "A", texte: "une peine d'emprisonnement" },
        { lettre: "B", texte: "la suspension de son permis de conduire", correct: true },
        { lettre: "C", texte: "la réduction de six points du permis" }
      ]
    },
    {
      id: 2, type: "QCM", enonce: "Dans un tunnel éclairé, hors agglomération, je circule :",
      choix: [
        { lettre: "A", texte: "en feux de croisement", correct: true },
        { lettre: "B", texte: "en feux de route" },
        { lettre: "C", texte: "en feux de brouillard" }
      ]
    },
    {
      id: 3, type: "QCM", enonce: "En cas de contrôle, le conducteur VTC doit pouvoir justifier :",
      choix: [
        { lettre: "A", texte: "d'une réservation préalable électronique ou papier", correct: true },
        { lettre: "B", texte: "uniquement de sa carte professionnelle" },
        { lettre: "C", texte: "du montant de la course" }
      ]
    }
  ]
};

export const examenBlanc4Taxi: ExamenBlanc = {
  id: "eb4-taxi",
  numero: 4,
  type: "TAXI",
  titre: "Examen Blanc N°4 - Formation TAXI",
  matieres: [
    matiere_t3p_examen4,
    matiere_gestion_examen4,
    matiere_securite_examen4,
    matiere_francais_examen4,
    matiere_anglais_examen4,
    matiere_reglementation_taxi_examen4,
    matiere_reglementation_taxi2_examen4
  ]
};

export const examenBlanc4VTC: ExamenBlanc = {
  id: "eb4-vtc",
  numero: 4,
  type: "VTC",
  titre: "Examen Blanc N°4 - Formation VTC",
  matieres: [
    matiere_t3p_examen4,
    matiere_gestion_examen4,
    matiere_securite_examen4,
    matiere_francais_examen4,
    matiere_anglais_examen4,
    matiere_reglementation_vtc_examen4,
    matiere_reglementation_vtc2_examen4
  ]
};

// ===== EXAMEN BLANC N°5 =====

const matiere_t3p_examen5: Matiere = {
  id: "t3p",
  nom: "A - Transport Public Particulier de Personnes (T3P)",
  duree: 45,
  coefficient: 3,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QRC", enonce: "Qui agrée les organismes de formation continue des conducteurs de T3P ?",
      reponseQRC: "Le préfet du département / La préfecture.",
      reponses_possibles: ["préfecture", "préfet du département", "préfet"]
    },
    {
      id: 2, type: "QRC", enonce: "Vous êtes chauffeur TAXI ou VTC en micro entreprise, quelles sanctions risquez-vous si vous refusez de transporter une femme enceinte ?",
      reponseQRC: "Une amende de 45 000 euros et 3 ans d'emprisonnement.",
      reponses_possibles: ["45000", "45 000", "3 ans", "emprisonnement"]
    },
    {
      id: 3, type: "QRC", enonce: "Comment se présente une réservation préalable ? Citez 2 mentions obligatoires.",
      reponseQRC: "Support papier ou électronique. Nom/dénomination sociale de l'entreprise. Coordonnées de l'entreprise. N° SIREN/SIRET. Nom et coordonnées du client. Lieu de prise en charge. Date et heure de la réservation.",
      reponses_possibles: ["papier ou électronique", "nom", "coordonnées", "SIREN", "SIRET", "client", "prise en charge", "date", "heure"]
    },
    {
      id: 4, type: "QRC", enonce: "Donnez la périodicité pour la visite médicale en fonction des tranches d'âge :",
      reponseQRC: "Tous les 5 ans jusqu'à 60 ans. Tous les 2 ans de 60 à 76 ans. Tous les ans à partir de 76 ans.",
      reponses_possibles: ["5 ans", "60 ans", "2 ans", "76 ans", "1 an"]
    },
    {
      id: 5, type: "QCM", enonce: "Quelle est l'ancienneté maximum pour un véhicule hybride ?",
      choix: [
        { lettre: "A", texte: "Aucune" },
        { lettre: "B", texte: "6 ans" },
        { lettre: "C", texte: "7 ans", correct: true },
        { lettre: "D", texte: "2 ans" }
      ]
    },
    {
      id: 6, type: "QCM", enonce: "Un conducteur sanctionné par le tribunal correctionnel pour délit de fuite peut saisir :",
      choix: [
        { lettre: "A", texte: "le tribunal correctionnel qui jugera à nouveau" },
        { lettre: "B", texte: "le tribunal judiciaire" },
        { lettre: "C", texte: "la cour de cassation" },
        { lettre: "D", texte: "la cour d'appel", correct: true }
      ]
    },
    {
      id: 7, type: "QCM", enonce: "Quelle est l'autorité qui vérifie le casier judiciaire d'un candidat à la carte professionnelle T3P ?",
      choix: [
        { lettre: "A", texte: "Le ministère chargé des transports" },
        { lettre: "B", texte: "Le préfet de région" },
        { lettre: "C", texte: "Le préfet de police ou le préfet", correct: true },
        { lettre: "D", texte: "Les forces de l'ordre" }
      ]
    },
    {
      id: 8, type: "QCM", enonce: "Le retrait de la carte professionnelle est :",
      choix: [
        { lettre: "A", texte: "consécutif à la décision d'un juge administratif sous certaines conditions" },
        { lettre: "B", texte: "une sanction administrative prise par un préfet", correct: true },
        { lettre: "C", texte: "une sanction administrative prise par un juge" }
      ]
    },
    {
      id: 9, type: "QCM", enonce: "Quel kilométrage maximum un conducteur de T3P peut-il réaliser pour sa course ?",
      choix: [
        { lettre: "A", texte: "500 km" },
        { lettre: "B", texte: "300 km" },
        { lettre: "C", texte: "1000 km" },
        { lettre: "D", texte: "pas de limitation", correct: true }
      ]
    },
    {
      id: 10, type: "QCM", enonce: "Quels agents sont habilités à effectuer un contrôle routier de conducteur de T3P ?",
      choix: [
        { lettre: "A", texte: "Les policiers", correct: true },
        { lettre: "B", texte: "Le juge du tribunal judiciaire" },
        { lettre: "C", texte: "Les agents représentant la SNCF" },
        { lettre: "D", texte: "Les gendarmes", correct: true }
      ]
    },
    {
      id: 11, type: "QCM", enonce: "Quelle(s) profession(s) du T3P est/sont autorisée(s) à proposer leurs services immédiats sur la voie publique ?",
      choix: [
        { lettre: "A", texte: "VMDTR" },
        { lettre: "B", texte: "VTC dans sa zone de prise en charge" },
        { lettre: "C", texte: "Aucune" },
        { lettre: "D", texte: "Taxi dans sa zone de prise en charge", correct: true }
      ]
    },
    {
      id: 12, type: "QCM", enonce: "Quel est le nom de la formation obligatoire pour travailler dans le secteur des personnes à mobilité réduite ?",
      choix: [
        { lettre: "A", texte: "Transport de personnes à mobilité réduite TPMR", correct: true },
        { lettre: "B", texte: "Transport de personnes handicapées" },
        { lettre: "C", texte: "Transport de personnes malades" }
      ]
    }
  ]
};

const matiere_gestion_examen5: Matiere = {
  id: "gestion",
  nom: "B - Gestion",
  duree: 45,
  coefficient: 2,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QRC", enonce: "Qu'est-ce qu'une personne morale ?",
      reponseQRC: "Une personne morale est généralement constituée par un regroupement de personnes physiques ou morales qui souhaitent accomplir quelque chose en commun.",
      reponses_possibles: ["regroupement", "personnes physiques", "personnes morales", "commun"]
    },
    {
      id: 2, type: "QRC", enonce: "Un artisan achète un véhicule 21 000 € HT, amorti sur 3 ans. De combien sera l'amortissement annuel ?",
      reponseQRC: "21 000 / 3 = 7 000 € HT d'amortissement annuel.",
      reponses_possibles: ["7000", "7 000"]
    },
    {
      id: 3, type: "QCM", enonce: "Qu'est-ce qu'un investissement ?",
      choix: [
        { lettre: "A", texte: "Les assurances professionnelles" },
        { lettre: "B", texte: "L'acquisition d'un véhicule", correct: true },
        { lettre: "C", texte: "Les honoraires d'expert-comptable" }
      ]
    },
    {
      id: 4, type: "QCM", enonce: "Selon le code de commerce, les documents comptables doivent être conservés :",
      choix: [
        { lettre: "A", texte: "1 an" },
        { lettre: "B", texte: "3 ans" },
        { lettre: "C", texte: "5 ans" },
        { lettre: "D", texte: "10 ans", correct: true }
      ]
    },
    {
      id: 5, type: "QCM", enonce: "Quelle est la durée de vie maximum prévue par la loi pour une SARL ?",
      choix: [
        { lettre: "A", texte: "99 ans", correct: true },
        { lettre: "B", texte: "25 ans" },
        { lettre: "C", texte: "10 ans" },
        { lettre: "D", texte: "50 ans" }
      ]
    },
    {
      id: 6, type: "QCM", enonce: "Qui attribue le code APE d'une entreprise ?",
      choix: [
        { lettre: "A", texte: "CMA" },
        { lettre: "B", texte: "URSSAF" },
        { lettre: "C", texte: "SSI" },
        { lettre: "D", texte: "INSEE", correct: true }
      ]
    },
    {
      id: 7, type: "QCM", enonce: "Chaque mois, la TVA à décaisser (à payer) représente :",
      choix: [
        { lettre: "A", texte: "la TVA sur les achats" },
        { lettre: "B", texte: "la TVA déductible moins la TVA collectée" },
        { lettre: "C", texte: "la TVA collectée moins la TVA déductible", correct: true }
      ]
    },
    {
      id: 8, type: "QCM", enonce: "La CRDS signifie :",
      choix: [
        { lettre: "A", texte: "contribution régionale pour les dépenses sociales" },
        { lettre: "B", texte: "contribution pour la réduction de la dette sociale" },
        { lettre: "C", texte: "contribution régionale au développement social" },
        { lettre: "D", texte: "contribution pour le remboursement de la dette sociale", correct: true }
      ]
    },
    {
      id: 9, type: "QCM", enonce: "Le président d'une SASU est :",
      choix: [
        { lettre: "A", texte: "travailleur salarié" },
        { lettre: "B", texte: "salarié" },
        { lettre: "C", texte: "assimilé salarié", correct: true }
      ]
    },
    {
      id: 10, type: "QCM", enonce: "Parmi les dépenses suivantes, lesquelles constituent des charges pour l'artisan ?",
      choix: [
        { lettre: "A", texte: "l'acquisition d'un garage" },
        { lettre: "B", texte: "la facture du contrôle technique", correct: true },
        { lettre: "C", texte: "la facture de révision et d'entretien du véhicule", correct: true }
      ]
    }
  ]
};

const matiere_securite_examen5: Matiere = {
  id: "securite",
  nom: "C - Sécurité routière",
  duree: 30,
  coefficient: 3,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QCM", enonce: "Sur un trajet de 100 km sur autoroute, si je roule à 130 km/h au lieu de 120 km/h, je \"gagne\" environ :",
      choix: [
        { lettre: "A", texte: "10 minutes" },
        { lettre: "B", texte: "4 minutes", correct: true },
        { lettre: "C", texte: "8 minutes" },
        { lettre: "D", texte: "15 minutes" }
      ]
    },
    {
      id: 2, type: "QCM", enonce: "En cas de panne, à quelle distance placez-vous le triangle de pré-signalisation ?",
      choix: [
        { lettre: "A", texte: "30 mètres au moins" },
        { lettre: "B", texte: "50 mètres au moins", correct: true },
        { lettre: "C", texte: "10 mètres au moins" }
      ]
    },
    {
      id: 3, type: "QCM", enonce: "Que risque un conducteur en cas de dépassement de la vitesse autorisée compris entre 40 km/h et moins de 50 km/h ?",
      choix: [
        { lettre: "A", texte: "La perte de deux points" },
        { lettre: "B", texte: "Une contravention de quatrième classe" },
        { lettre: "C", texte: "La perte de quatre points du permis", correct: true }
      ]
    },
    {
      id: 4, type: "QCM", enonce: "Combien de points perdez-vous en cas de chevauchement d'une ligne continue ?",
      choix: [
        { lettre: "A", texte: "3 points" },
        { lettre: "B", texte: "1 point", correct: true },
        { lettre: "C", texte: "2 points" }
      ]
    },
    {
      id: 5, type: "QCM", enonce: "Les feux de route éclairent à une distance minimale de :",
      choix: [
        { lettre: "A", texte: "50 mètres" },
        { lettre: "B", texte: "100 mètres" },
        { lettre: "C", texte: "200 mètres", correct: true },
        { lettre: "D", texte: "150 mètres" }
      ]
    },
    {
      id: 6, type: "QCM", enonce: "A 90 km/h la distance d'arrêt est approximativement de :",
      choix: [
        { lettre: "A", texte: "50 m" },
        { lettre: "B", texte: "80 m", correct: true },
        { lettre: "C", texte: "70 m" }
      ]
    },
    {
      id: 7, type: "QCM", enonce: "Le décret du 13 avril 2016 sur les vitres surteintées impose :",
      choix: [
        { lettre: "A", texte: "un taux minimal de transparence de 70% sur les vitres avant et le pare-brise", correct: true },
        { lettre: "B", texte: "un taux minimal de transparence de 80% sur toutes les vitres" },
        { lettre: "C", texte: "un taux minimal de transparence de 80% sur les vitres arrières" }
      ]
    },
    {
      id: 8, type: "QCM", enonce: "Dans quel cas l'arrêt est-il autorisé sur la bande d'arrêt d'urgence de l'autoroute ?",
      choix: [
        { lettre: "A", texte: "en cas de panne ou d'accident", correct: true },
        { lettre: "B", texte: "pour téléphoner" },
        { lettre: "C", texte: "dans tous les cas" },
        { lettre: "D", texte: "jamais" }
      ]
    },
    {
      id: 9, type: "QCM", enonce: "En agglomération, lorsque vous dépassez latéralement un piéton ou cycliste, vous devez laisser :",
      choix: [
        { lettre: "A", texte: "1,50 mètres" },
        { lettre: "B", texte: "1 mètre", correct: true },
        { lettre: "C", texte: "0,50 mètre" }
      ]
    },
    {
      id: 10, type: "QCM", enonce: "Par temps de pluie, est allongé(e) :",
      choix: [
        { lettre: "A", texte: "la distance d'arrêt", correct: true },
        { lettre: "B", texte: "l'adhérence sur la route" },
        { lettre: "C", texte: "la distance de freinage", correct: true }
      ]
    }
  ]
};

const matiere_francais_examen5: Matiere = {
  id: "francais",
  nom: "D - Capacité d'expression et de compréhension en langue française",
  duree: 30,
  coefficient: 2,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QRC", enonce: "Pourquoi la présentation du Cybertruck a-t-elle été un échec ?",
      reponseQRC: "Parce que ce véhicule est censé être très résistant aux attaques extérieures mais sa vitre a été cassée par l'envoi d'une balle d'acier.",
      reponses_possibles: ["vitre", "cassée", "balle d'acier", "résistant", "Cybertruck"]
    },
    {
      id: 2, type: "QRC", enonce: "D'après le texte, listez au moins 4 caractéristiques du Cybertruck Tesla.",
      reponseQRC: "Véhicule 100% électrique. Lignes très épurées. Allure futuriste. Six places. Capable de tracter 7 tonnes. Réalisé en acier inoxydable. Passe de 0 à 100 km/h en 3 secondes.",
      reponses_possibles: ["électrique", "épurées", "futuriste", "six places", "acier", "inoxydable", "3 secondes"]
    },
    {
      id: 3, type: "QCM", enonce: "Pourquoi le Cybertruck pourrait-il avoir du mal à séduire la clientèle traditionnelle ?",
      choix: [
        { lettre: "A", texte: "Parce qu'il ne ressemble à rien d'autre", correct: true },
        { lettre: "B", texte: "Parce qu'il est trop cher" },
        { lettre: "C", texte: "Parce que c'est un véhicule électrique" }
      ]
    },
    {
      id: 4, type: "QCM", enonce: "Quelle est l'autonomie maximale d'un modèle Cybertruck ?",
      choix: [
        { lettre: "A", texte: "100 km" },
        { lettre: "B", texte: "400 km" },
        { lettre: "C", texte: "800 km", correct: true }
      ]
    },
    {
      id: 5, type: "QCM", enonce: "Qu'est-ce qu'un prototype ?",
      choix: [
        { lettre: "A", texte: "modèle diffusé à grande échelle" },
        { lettre: "B", texte: "dernier modèle d'une série" },
        { lettre: "C", texte: "un modèle de tests d'un nouveau produit", correct: true }
      ]
    },
    {
      id: 6, type: "QCM", enonce: "Donnez un (des) synonyme(s) de \"arborer\" :",
      choix: [
        { lettre: "A", texte: "Dissimuler" },
        { lettre: "B", texte: "Révéler" },
        { lettre: "C", texte: "Cacher" },
        { lettre: "D", texte: "Afficher", correct: true }
      ]
    },
    {
      id: 7, type: "QCM", enonce: "Quelle est la signification du mot \"allure\" dans le texte ?",
      choix: [
        { lettre: "A", texte: "Vitesse" },
        { lettre: "B", texte: "Style", correct: true },
        { lettre: "C", texte: "Aspect" }
      ]
    },
    {
      id: 8, type: "QCM", enonce: "Quel est le pick le plus apprécié aux États-Unis ?",
      choix: [
        { lettre: "A", texte: "Le Blade Runner" },
        { lettre: "B", texte: "Le Ford F-150", correct: true },
        { lettre: "C", texte: "Le SpaceX" }
      ]
    }
  ]
};

const matiere_anglais_examen5: Matiere = {
  id: "anglais",
  nom: "E - Capacité d'expression et de compréhension en langue anglaise",
  duree: 30,
  coefficient: 1,
  noteEliminatoire: 4,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QCM", enonce: "Bonjour, êtes-vous disponible pour m'emmener à la gare ? En anglais :",
      choix: [
        { lettre: "A", texte: "hello, are you available to make me to the station?" },
        { lettre: "B", texte: "hello, are you disponible to get me to the station?" },
        { lettre: "C", texte: "hello, are you available to get me to the station?", correct: true }
      ]
    },
    {
      id: 2, type: "QCM", enonce: "Thank you for the ride, keep the change:",
      choix: [
        { lettre: "A", texte: "merci pour la course, gardez la monnaie", correct: true },
        { lettre: "B", texte: "merci d'avoir attendu, gardez la monnaie" },
        { lettre: "C", texte: "merci pour la course, ne changez pas" }
      ]
    },
    {
      id: 3, type: "QCM", enonce: "I was told to say anything concerning this new advert:",
      choix: [
        { lettre: "A", texte: "je n'avais rien à dire concernant ce nouvel adversaire" },
        { lettre: "B", texte: "je n'ai rien à dire à propos de ce nouvel avertissement" },
        { lettre: "C", texte: "on m'a dit de ne rien dire de cette nouvelle publicité", correct: true }
      ]
    },
    {
      id: 4, type: "QCM", enonce: "You will ..............., our island is amazing.",
      choix: [
        { lettre: "A", texte: "Watch" },
        { lettre: "B", texte: "Breathe" },
        { lettre: "C", texte: "Hear" },
        { lettre: "D", texte: "See", correct: true }
      ]
    },
    {
      id: 5, type: "QCM", enonce: "I need a taxi for tomorrow morning:",
      choix: [
        { lettre: "A", texte: "j'ai besoin d'un taxi pour ce soir" },
        { lettre: "B", texte: "j'ai besoin d'un taxi pour demain matin", correct: true },
        { lettre: "C", texte: "j'ai besoin d'un taxi pour ce matin" }
      ]
    },
    {
      id: 6, type: "QCM", enonce: "J'ai raté mon avion, ramenez-moi à l'hôtel. En anglais :",
      choix: [
        { lettre: "A", texte: "I took my plane, bring me back to the hotel" },
        { lettre: "B", texte: "I have lost my plane, drive me back to the hotel" },
        { lettre: "C", texte: "I missed my plane, take me back to the hotel", correct: true }
      ]
    }
  ]
};

const matiere_reglementation_taxi_examen5: Matiere = {
  id: "reglementation_taxi",
  nom: "F(T) - Connaissance du territoire et réglementation locale TAXI",
  duree: 30,
  coefficient: 3,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QCM", enonce: "Lorsque les charges d'exploitation d'une entreprise sont inférieures aux produits :",
      choix: [
        { lettre: "A", texte: "Il y a perte d'exploitation" },
        { lettre: "B", texte: "L'entreprise doit poser le bilan" },
        { lettre: "C", texte: "Il y a bénéfice", correct: true }
      ]
    },
    {
      id: 2, type: "QCM", enonce: "Dans un bilan :",
      choix: [
        { lettre: "A", texte: "si le total de l'actif est inférieur au passif il y a perte" },
        { lettre: "B", texte: "le total de l'actif est toujours égal au total du passif", correct: true },
        { lettre: "C", texte: "si le total de l'actif est supérieur au passif il y a bénéfice" }
      ]
    },
    {
      id: 3, type: "QCM", enonce: "Un artisan au régime réel rembourse 930€/mois dont 620€ de capital. Quel montant de charges déduire au 31 décembre ?",
      choix: [
        { lettre: "A", texte: "3 720 €", correct: true },
        { lettre: "B", texte: "5 580 €" },
        { lettre: "C", texte: "7 740 €" }
      ]
    },
    {
      id: 4, type: "QCM", enonce: "Mon voyant d'essence vient de s'allumer :",
      choix: [
        { lettre: "A", texte: "j'allume mes feux de détresse" },
        { lettre: "B", texte: "je continue ma route jusqu'à une station" },
        { lettre: "C", texte: "je réduis mon allure pour diminuer ma consommation", correct: true },
        { lettre: "D", texte: "je m'arrête sur ma droite" }
      ]
    },
    {
      id: 5, type: "QCM", enonce: "Titulaire d'un permis probatoire, dans quel cas dois-je suivre un stage de sensibilisation :",
      choix: [
        { lettre: "A", texte: "en cas de perte en une seule fois de 3 points", correct: true },
        { lettre: "B", texte: "en cas de perte en une seule fois de 4 points" },
        { lettre: "C", texte: "en cas de perte en une seule fois de 2 points" }
      ]
    }
  ]
};

const matiere_reglementation_taxi2_examen5: Matiere = {
  id: "reglementation_taxi2",
  nom: "G(T) - Réglementation nationale TAXI et gestion propre à cette activité",
  duree: 20,
  coefficient: 3,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QCM", enonce: "En cas de récidive d'une conduite sous influence de stupéfiants, vous encourez :",
      choix: [
        { lettre: "A", texte: "la confiscation/immobilisation de votre véhicule", correct: true },
        { lettre: "B", texte: "la suspension de votre permis de conduire", correct: true },
        { lettre: "C", texte: "l'annulation de votre permis de conduire", correct: true }
      ]
    },
    {
      id: 2, type: "QCM", enonce: "Vous êtes au volant et recevez un appel. Vous prenez le téléphone en main, vous encourez :",
      choix: [
        { lettre: "A", texte: "un retrait de deux points" },
        { lettre: "B", texte: "un retrait d'un point" },
        { lettre: "C", texte: "un retrait de trois points", correct: true }
      ]
    },
    {
      id: 3, type: "QCM", enonce: "La durée du temps de réaction est d'environ :",
      choix: [
        { lettre: "A", texte: "1/10 ième de seconde" },
        { lettre: "B", texte: "1 seconde" },
        { lettre: "C", texte: "1/2 seconde", correct: true }
      ]
    }
  ]
};

const matiere_reglementation_vtc_examen5: Matiere = {
  id: "reglementation_vtc",
  nom: "F(V) - Développement commercial et gestion propre à l'activité de VTC",
  duree: 30,
  coefficient: 3,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QCM", enonce: "Lorsque les charges d'exploitation sont inférieures aux produits :",
      choix: [
        { lettre: "A", texte: "Il y a perte" },
        { lettre: "B", texte: "L'entreprise doit déposer le bilan" },
        { lettre: "C", texte: "Il y a bénéfice", correct: true }
      ]
    },
    {
      id: 2, type: "QCM", enonce: "La CET (contribution économique territoriale) fait partie :",
      choix: [
        { lettre: "A", texte: "Des impôts locaux", correct: true },
        { lettre: "B", texte: "Des impôts sur les sociétés" },
        { lettre: "C", texte: "Des impôts sur le revenu" }
      ]
    },
    {
      id: 3, type: "QCM", enonce: "Un artisan au régime réel rembourse 930€/mois dont 620€ de capital. Charges déductibles au 31 décembre :",
      choix: [
        { lettre: "A", texte: "3 720 €", correct: true },
        { lettre: "B", texte: "5 580 €" },
        { lettre: "C", texte: "11 160 €" }
      ]
    },
    {
      id: 4, type: "QCM", enonce: "Titulaire d'un permis probatoire, dans quel cas dois-je suivre un stage de sensibilisation :",
      choix: [
        { lettre: "A", texte: "perte en une seule fois de 3 points", correct: true },
        { lettre: "B", texte: "perte en une seule fois de 4 points" },
        { lettre: "C", texte: "perte en une seule fois de 2 points" }
      ]
    }
  ]
};

const matiere_reglementation_vtc2_examen5: Matiere = {
  id: "reglementation_vtc2",
  nom: "G(V) - Réglementation nationale spécifique à l'activité de VTC",
  duree: 20,
  coefficient: 3,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QCM", enonce: "En cas de récidive conduite sous stupéfiants, vous encourez :",
      choix: [
        { lettre: "A", texte: "confiscation/immobilisation du véhicule", correct: true },
        { lettre: "B", texte: "suspension du permis", correct: true },
        { lettre: "C", texte: "annulation du permis", correct: true }
      ]
    },
    {
      id: 2, type: "QCM", enonce: "Vous prenez votre téléphone en main en conduisant, vous encourez :",
      choix: [
        { lettre: "A", texte: "un retrait de deux points" },
        { lettre: "B", texte: "un retrait d'un point" },
        { lettre: "C", texte: "un retrait de trois points", correct: true }
      ]
    }
  ]
};

export const examenBlanc5Taxi: ExamenBlanc = {
  id: "eb5-taxi",
  numero: 5,
  type: "TAXI",
  titre: "Examen Blanc N°5 - Formation TAXI",
  matieres: [
    matiere_t3p_examen5,
    matiere_gestion_examen5,
    matiere_securite_examen5,
    matiere_francais_examen5,
    matiere_anglais_examen5,
    matiere_reglementation_taxi_examen5,
    matiere_reglementation_taxi2_examen5
  ]
};

export const examenBlanc5VTC: ExamenBlanc = {
  id: "eb5-vtc",
  numero: 5,
  type: "VTC",
  titre: "Examen Blanc N°5 - Formation VTC",
  matieres: [
    matiere_t3p_examen5,
    matiere_gestion_examen5,
    matiere_securite_examen5,
    matiere_francais_examen5,
    matiere_anglais_examen5,
    matiere_reglementation_vtc_examen5,
    matiere_reglementation_vtc2_examen5
  ]
};

// ===== EXAMEN BLANC N°6 =====

const matiere_t3p_examen6: Matiere = {
  id: "t3p",
  nom: "A - Transport Public Particulier de Personnes (T3P)",
  duree: 45,
  coefficient: 3,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QRC", enonce: "Le renouvellement de la carte professionnelle intervient quand 2 attestations sont produites. Lesquelles ?",
      reponseQRC: "La visite médicale. La formation continue.",
      reponses_possibles: ["visite médicale", "formation continue"]
    },
    {
      id: 2, type: "QRC", enonce: "Qu'est-ce que l'honorabilité dans votre profession ?",
      reponseQRC: "Avoir le casier judiciaire B2 vierge.",
      reponses_possibles: ["casier judiciaire b2 vierge", "b2 vierge", "casier b2"]
    },
    {
      id: 3, type: "QRC", enonce: "Par qui est donnée l'attestation de formation continue ?",
      reponseQRC: "Par le représentant légal du centre de formation.",
      reponses_possibles: ["représentant légal", "centre de formation", "directeur"]
    },
    {
      id: 4, type: "QCM", enonce: "Le stage de formation continue des conducteurs T3P permet d'obtenir une attestation valable :",
      choix: [
        { lettre: "A", texte: "5 ans", correct: true },
        { lettre: "B", texte: "1 an" },
        { lettre: "C", texte: "2 ans" },
        { lettre: "D", texte: "10 ans" }
      ]
    },
    {
      id: 5, type: "QCM", enonce: "Quel service délivre la carte professionnelle de conducteur de T3P ?",
      choix: [
        { lettre: "A", texte: "La préfecture", correct: true },
        { lettre: "B", texte: "La DIRECCTE" },
        { lettre: "C", texte: "La DREAL" }
      ]
    },
    {
      id: 6, type: "QCM", enonce: "Qu'est-ce qui caractérise un déplacement en covoiturage ?",
      choix: [
        { lettre: "A", texte: "Aucune obligation de réaliser le trajet" },
        { lettre: "B", texte: "Un conducteur titulaire de la RC PRO" },
        { lettre: "C", texte: "Partage obligatoire des frais engagés", correct: true },
        { lettre: "D", texte: "Aucun contrat entre les parties" }
      ]
    },
    {
      id: 7, type: "QCM", enonce: "L'assurance RCP peut être invoquée par le conducteur s'il :",
      choix: [
        { lettre: "A", texte: "accroche un autre véhicule en manœuvrant" },
        { lettre: "B", texte: "abîme le vêtement de son passager", correct: true },
        { lettre: "C", texte: "est contrôlé sans carte professionnelle" }
      ]
    },
    {
      id: 8, type: "QCM", enonce: "La carte professionnelle est délivrée par :",
      choix: [
        { lettre: "A", texte: "La commune dans laquelle on est autorisé à exercer" },
        { lettre: "B", texte: "Le Préfet ou le Préfet de Police", correct: true },
        { lettre: "C", texte: "La Mairie" }
      ]
    },
    {
      id: 9, type: "QCM", enonce: "Le fait de ne pas présenter immédiatement sa carte professionnelle lors d'un contrôle est passible :",
      choix: [
        { lettre: "A", texte: "d'une amende de première classe" },
        { lettre: "B", texte: "d'une immobilisation du véhicule" },
        { lettre: "C", texte: "d'une amende de deuxième classe", correct: true },
        { lettre: "D", texte: "d'une amende de quatrième classe" }
      ]
    },
    {
      id: 10, type: "QCM", enonce: "Peuvent siéger aux commissions locales du T3P :",
      choix: [
        { lettre: "A", texte: "des représentants des consommateurs", correct: true },
        { lettre: "B", texte: "les chambres consulaires", correct: true },
        { lettre: "C", texte: "la CPAM" },
        { lettre: "D", texte: "des représentants des PMR", correct: true }
      ]
    },
    {
      id: 11, type: "QCM", enonce: "Quelle(s) infraction(s) peut/peuvent figurer au Bulletin n°2 du casier judiciaire ?",
      choix: [
        { lettre: "A", texte: "Non présentation du permis de conduire" },
        { lettre: "B", texte: "Escroquerie", correct: true },
        { lettre: "C", texte: "Extorsion de fonds", correct: true },
        { lettre: "D", texte: "Non respect d'un feu tricolore" }
      ]
    },
    {
      id: 12, type: "QCM", enonce: "Qu'est-ce que le Comité national des transports publics particuliers de personnes ?",
      choix: [
        { lettre: "A", texte: "Il débat des grands enjeux des T3P", correct: true },
        { lettre: "B", texte: "Il donne un avis uniquement sur les taxis et VTC" },
        { lettre: "C", texte: "Il comprend 50 membres au plus" },
        { lettre: "D", texte: "Le comité est établi pour une durée de cinq ans" }
      ]
    }
  ]
};

const matiere_gestion_examen6: Matiere = {
  id: "gestion",
  nom: "B - Gestion",
  duree: 45,
  coefficient: 2,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QRC", enonce: "Expliquez le régime de la responsabilité limitée.",
      reponseQRC: "La responsabilité limitée signifie qu'en cas de faillite, seul le patrimoine professionnel de la société pourra être saisi, pas celui du gérant personnellement.",
      reponses_possibles: ["patrimoine professionnel", "faillite", "saisi", "gérant", "responsabilité limitée"]
    },
    {
      id: 2, type: "QRC", enonce: "Lorsqu'un artisan vend son véhicule, expliquez comment est calculée la plus-value ou moins-value.",
      reponseQRC: "Il faut soustraire le prix de vente au prix d'achat du véhicule (diminué des amortissements).",
      reponses_possibles: ["prix de vente", "prix d'achat", "amortissements", "soustraire"]
    },
    {
      id: 3, type: "QCM", enonce: "Mes clients me payent 30 jours fin de mois. Pour une prestation le 5 avril, quand serai-je réglé ?",
      choix: [
        { lettre: "A", texte: "31 mai", correct: true },
        { lettre: "B", texte: "30 avril" },
        { lettre: "C", texte: "30 juin" }
      ]
    },
    {
      id: 4, type: "QCM", enonce: "Développer l'acronyme APE (de code APE) :",
      choix: [
        { lettre: "A", texte: "activités professionnelles de l'entreprise" },
        { lettre: "B", texte: "activité principale exercée", correct: true },
        { lettre: "C", texte: "accord paritaire d'entreprise" }
      ]
    },
    {
      id: 5, type: "QCM", enonce: "Parmi les dépenses suivantes, lesquelles n'ont pas un caractère professionnel ?",
      choix: [
        { lettre: "A", texte: "Honoraires comptable" },
        { lettre: "B", texte: "Taxe foncière" },
        { lettre: "C", texte: "Contravention", correct: true }
      ]
    },
    {
      id: 6, type: "QCM", enonce: "Quels sont les documents comptables obligatoires pour une micro-entreprise ?",
      choix: [
        { lettre: "A", texte: "le livre des recettes", correct: true },
        { lettre: "B", texte: "le registre des achats", correct: true },
        { lettre: "C", texte: "le bilan" },
        { lettre: "D", texte: "le compte de résultat" }
      ]
    },
    {
      id: 7, type: "QCM", enonce: "Le chiffre d'affaires d'un artisan T3P passe de 10 100 € à 15 440 €. Quel est le pourcentage d'augmentation ?",
      choix: [
        { lettre: "A", texte: "54,20%" },
        { lettre: "B", texte: "52,87%", correct: true },
        { lettre: "C", texte: "51,83%" }
      ]
    },
    {
      id: 8, type: "QCM", enonce: "En micro-entreprise en 2024, quel plafond de CA ne dois-je pas dépasser ?",
      choix: [
        { lettre: "A", texte: "77 700 €", correct: true },
        { lettre: "B", texte: "58 000 €" },
        { lettre: "C", texte: "33 200 €" }
      ]
    },
    {
      id: 9, type: "QCM", enonce: "L'EURL en T3P avec associé physique est soumise de plein droit à :",
      choix: [
        { lettre: "A", texte: "l'impôt sur les revenus catégorie BNC" },
        { lettre: "B", texte: "l'impôt sur les sociétés" },
        { lettre: "C", texte: "l'impôt sur les revenus catégorie BIC", correct: true }
      ]
    },
    {
      id: 10, type: "QCM", enonce: "Quel est le montant HT d'une course de 55 € TTC (TVA 10%) ?",
      choix: [
        { lettre: "A", texte: "52,13 €" },
        { lettre: "B", texte: "45,83 €" },
        { lettre: "C", texte: "50 €", correct: true }
      ]
    },
    {
      id: 11, type: "QCM", enonce: "De quoi se compose le chiffre d'affaires annuel d'une entreprise ?",
      choix: [
        { lettre: "A", texte: "du nombre de clients de l'année" },
        { lettre: "B", texte: "du bénéfice" },
        { lettre: "C", texte: "de la somme des recettes de l'année", correct: true }
      ]
    }
  ]
};

const matiere_securite_examen6: Matiere = {
  id: "securite",
  nom: "C - Sécurité routière",
  duree: 30,
  coefficient: 3,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QCM", enonce: "Le titulaire d'un permis de conduire de catégorie B peut conduire un véhicule :",
      choix: [
        { lettre: "A", texte: "Pouvant transporter dix passagers, conducteur non compris" },
        { lettre: "B", texte: "Pouvant transporter neuf passagers, conducteur non compris" },
        { lettre: "C", texte: "Pouvant transporter huit passagers, conducteur non compris", correct: true },
        { lettre: "D", texte: "Ayant un PTAC n'excédant pas 3,5 tonnes" }
      ]
    },
    {
      id: 2, type: "QCM", enonce: "Les enfants peuvent circuler à vélo sur les trottoirs jusqu'à l'âge de :",
      choix: [
        { lettre: "A", texte: "6 ans" },
        { lettre: "B", texte: "8 ans", correct: true },
        { lettre: "C", texte: "12 ans" }
      ]
    },
    {
      id: 3, type: "QCM", enonce: "Les feux de route éclairent à une distance minimale de :",
      choix: [
        { lettre: "A", texte: "150 mètres" },
        { lettre: "B", texte: "50 mètres" },
        { lettre: "C", texte: "100 mètres", correct: true },
        { lettre: "D", texte: "200 mètres" }
      ]
    },
    {
      id: 4, type: "QCM", enonce: "Lorsque je manœuvre :",
      choix: [
        { lettre: "A", texte: "je suis toujours prioritaire" },
        { lettre: "B", texte: "je dois la priorité avant de manœuvrer" },
        { lettre: "C", texte: "je dois la priorité durant la manœuvre", correct: true }
      ]
    },
    {
      id: 5, type: "QCM", enonce: "L'ABS (système d'antiblocage des roues) :",
      choix: [
        { lettre: "A", texte: "réduit considérablement la distance d'arrêt" },
        { lettre: "B", texte: "permet de ne pas allonger la distance d'arrêt", correct: true },
        { lettre: "C", texte: "aide à maintenir la direction du véhicule", correct: true }
      ]
    },
    {
      id: 6, type: "QCM", enonce: "Un conducteur contrôlé avec un taux d'alcoolémie de 0,9 g/litre de sang :",
      choix: [
        { lettre: "A", texte: "Risque de retrait de 4 points" },
        { lettre: "B", texte: "Fait l'objet d'une rétention automatique et immédiate de son permis", correct: true },
        { lettre: "C", texte: "Peut reprendre son véhicule après dégrisement" }
      ]
    },
    {
      id: 7, type: "QCM", enonce: "En cas de dépassement entre 30 et 40 km/h au-dessus de la vitesse autorisée, la réduction de points est de :",
      choix: [
        { lettre: "A", texte: "4 points" },
        { lettre: "B", texte: "1 point" },
        { lettre: "C", texte: "2 points" },
        { lettre: "D", texte: "3 points", correct: true }
      ]
    },
    {
      id: 8, type: "QCM", enonce: "Un stage de sensibilisation à la sécurité routière :",
      choix: [
        { lettre: "A", texte: "Permet de récupérer jusqu'à 4 points", correct: true },
        { lettre: "B", texte: "Peut être suivi une fois tous les 6 mois" },
        { lettre: "C", texte: "Permet de récupérer jusqu'à 6 points" },
        { lettre: "D", texte: "Peut être suivi une fois par an", correct: true }
      ]
    },
    {
      id: 9, type: "QCM", enonce: "Les pneumatiques doivent présenter des sculptures apparentes :",
      choix: [
        { lettre: "A", texte: "sur les roues avant et arrières gauche" },
        { lettre: "B", texte: "sur les quatre roues", correct: true },
        { lettre: "C", texte: "uniquement sur les roues arrières" }
      ]
    },
    {
      id: 10, type: "QCM", enonce: "Qui signe le constat amiable lors d'un accident ?",
      choix: [
        { lettre: "A", texte: "Les deux conducteurs et les témoins" },
        { lettre: "B", texte: "La victime de l'accident" },
        { lettre: "C", texte: "Les deux conducteurs", correct: true },
        { lettre: "D", texte: "L'auteur de l'accident" }
      ]
    }
  ]
};

const matiere_francais_examen6: Matiere = {
  id: "francais",
  nom: "D - Capacité d'expression et de compréhension en langue française",
  duree: 30,
  coefficient: 2,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QRC", enonce: "Que veut dire l'auteur par \"un Lyonnais pur jus\" ?",
      reponseQRC: "Un vrai Lyonnais, quelqu'un qui est né et qui connaît bien la ville de Lyon.",
      reponses_possibles: ["vrai Lyonnais", "né", "Lyon", "connaît bien"]
    },
    {
      id: 2, type: "QRC", enonce: "Quelle(s) condition(s) pour que le prix des taxis-bateaux se rapproche des tarifs des taxis classiques ?",
      reponseQRC: "Augmenter le nombre de bateaux et avoir une clientèle présente.",
      reponses_possibles: ["nombre de bateaux", "clientèle", "augmenter"]
    },
    {
      id: 3, type: "QRC", enonce: "Pourquoi Jeff Fèvre souhaite développer les taxis-bateaux ?",
      reponseQRC: "Éviter les embouteillages. Aller partout en utilisant la voie d'eau pour se déplacer sur Lyon.",
      reponses_possibles: ["embouteillages", "voie d'eau", "Lyon", "déplacer"]
    },
    {
      id: 4, type: "QCM", enonce: "A qui Jeff Fèvre doit-il demander les autorisations d'accoster ?",
      choix: [
        { lettre: "A", texte: "La Métropole", correct: true },
        { lettre: "B", texte: "La régie des transports" },
        { lettre: "C", texte: "La ville de Lyon" },
        { lettre: "D", texte: "Le conseil Départemental" }
      ]
    },
    {
      id: 5, type: "QCM", enonce: "Sur quels cours d'eau Jeff Fèvre souhaite-t-il créer un service régulier ?",
      choix: [
        { lettre: "A", texte: "Le Rhône", correct: true },
        { lettre: "B", texte: "La Saône", correct: true },
        { lettre: "C", texte: "La Seine" }
      ]
    },
    {
      id: 6, type: "QCM", enonce: "A quoi fait référence \"la Capitale des Gaules\" ?",
      choix: [
        { lettre: "A", texte: "La ville de Lyon", correct: true },
        { lettre: "B", texte: "La Métropole" },
        { lettre: "C", texte: "La régie des transports" }
      ]
    },
    {
      id: 7, type: "QCM", enonce: "Que signifie \"s'affranchir\" des bouchons ?",
      choix: [
        { lettre: "A", texte: "Timbrer" },
        { lettre: "B", texte: "Se libérer", correct: true },
        { lettre: "C", texte: "Rompre" },
        { lettre: "D", texte: "Quitter" }
      ]
    },
    {
      id: 8, type: "QCM", enonce: "Quel(s) est (sont) les synonymes d'anecdote ?",
      choix: [
        { lettre: "A", texte: "Historiette", correct: true },
        { lettre: "B", texte: "Rumeur" },
        { lettre: "C", texte: "Évènement" },
        { lettre: "D", texte: "Élucubration" }
      ]
    }
  ]
};

const matiere_anglais_examen6: Matiere = {
  id: "anglais",
  nom: "E - Capacité d'expression et de compréhension en langue anglaise",
  duree: 30,
  coefficient: 1,
  noteEliminatoire: 4,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QCM", enonce: "\"Enjoy your stay\" signifie :",
      choix: [
        { lettre: "A", texte: "Appréciez le moment !" },
        { lettre: "B", texte: "Profitez de votre séjour !", correct: true },
        { lettre: "C", texte: "Restez joyeux !" }
      ]
    },
    {
      id: 2, type: "QCM", enonce: "A \"tip\" means:",
      choix: [
        { lettre: "A", texte: "Un pourboire", correct: true },
        { lettre: "B", texte: "Un type" },
        { lettre: "C", texte: "Une idée" }
      ]
    },
    {
      id: 3, type: "QCM", enonce: "I don't understand what you mean:",
      choix: [
        { lettre: "A", texte: "Je ne comprends pas ce que vous suggérez" },
        { lettre: "B", texte: "Je ne comprends pas ce que vous voulez" },
        { lettre: "C", texte: "Je ne comprends pas ce que vous voulez dire", correct: true }
      ]
    },
    {
      id: 4, type: "QCM", enonce: "Do you know a typical site for eating?",
      choix: [
        { lettre: "A", texte: "Y-a-t'il une bonne salle de spectacle en ville ?" },
        { lettre: "B", texte: "Connaissez-vous un endroit typique pour dormir ?" },
        { lettre: "C", texte: "Connaissez-vous un endroit typique pour manger ?", correct: true }
      ]
    },
    {
      id: 5, type: "QCM", enonce: "Can you pick me up at the library, please?",
      choix: [
        { lettre: "A", texte: "Pouvez-vous me déposer à la librairie ?" },
        { lettre: "B", texte: "Pouvez-vous venir me prendre à la bibliothèque ?", correct: true },
        { lettre: "C", texte: "Pouvez-vous me porter jusqu'à une librairie ?" }
      ]
    },
    {
      id: 6, type: "QCM", enonce: "I should attend a meeting in Rennes in 2 hours:",
      choix: [
        { lettre: "A", texte: "Je devrais assister à une réunion à Rennes dans 2 heures", correct: true },
        { lettre: "B", texte: "Je devrais assister à une réunion à Rennes à 2 heures" },
        { lettre: "C", texte: "Je devrais attendre une réunion à Rennes dans 2 heures" }
      ]
    },
    {
      id: 7, type: "QCM", enonce: "Are you free?",
      choix: [
        { lettre: "A", texte: "Êtes-vous prêt ?" },
        { lettre: "B", texte: "Êtes-vous gratuit ?" },
        { lettre: "C", texte: "Êtes-vous disponible ?", correct: true }
      ]
    },
    {
      id: 8, type: "QCM", enonce: "Êtes-vous bien installé ? En anglais :",
      choix: [
        { lettre: "A", texte: "Are you well ?" },
        { lettre: "B", texte: "Are you ready ?" },
        { lettre: "C", texte: "Are you comfortable ?", correct: true }
      ]
    },
    {
      id: 9, type: "QCM", enonce: "Les gilets jaunes bloquent les autoroutes en ce moment. En anglais :",
      choix: [
        { lettre: "A", texte: "The yellow vests block the motorways" },
        { lettre: "B", texte: "The yellow vests are blocking the motorways", correct: true },
        { lettre: "C", texte: "The yellow vests blocked the motorways" }
      ]
    },
    {
      id: 10, type: "QCM", enonce: "I'm very sorry, but you will be late, there are traffic jams:",
      choix: [
        { lettre: "A", texte: "je suis triste car vous serez en retard, il y a des bouchons" },
        { lettre: "B", texte: "je suis extrêmement désolé, mais vous serez en retard, il y a des bouchons", correct: true },
        { lettre: "C", texte: "je suis désolé mais vous serez en avance, pas de bouchons" }
      ]
    }
  ]
};

const matiere_reglementation_taxi_examen6: Matiere = {
  id: "reglementation_taxi",
  nom: "F(T) - Connaissance du territoire et réglementation locale TAXI",
  duree: 30,
  coefficient: 3,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QCM", enonce: "Le titulaire d'un permis de conduire catégorie B peut conduire un véhicule :",
      choix: [
        { lettre: "A", texte: "Pouvant transporter 10 passagers, conducteur non compris" },
        { lettre: "B", texte: "Pouvant transporter 9 passagers, conducteur non compris" },
        { lettre: "C", texte: "Pouvant transporter 8 passagers, conducteur non compris", correct: true }
      ]
    },
    {
      id: 2, type: "QCM", enonce: "Dans quel cas le conducteur doit-il réduire sa vitesse ?",
      choix: [
        { lettre: "A", texte: "Lors du croisement ou dépassement de piétons", correct: true },
        { lettre: "B", texte: "Lorsque la route est dégagée" },
        { lettre: "C", texte: "Lors du croisement ou dépassement de cyclistes", correct: true }
      ]
    },
    {
      id: 3, type: "QCM", enonce: "Le fait de ne pas présenter immédiatement son permis de conduire aux agents est puni de :",
      choix: [
        { lettre: "A", texte: "Une amende de quatrième classe", correct: true },
        { lettre: "B", texte: "Une amende de seconde classe" },
        { lettre: "C", texte: "Une amende de troisième classe" }
      ]
    },
    {
      id: 4, type: "QCM", enonce: "Quelles sont les précautions pour vérifier le niveau d'huile ?",
      choix: [
        { lettre: "A", texte: "Moteur chaud" },
        { lettre: "B", texte: "Moteur froid", correct: true },
        { lettre: "C", texte: "Terrain plat", correct: true },
        { lettre: "D", texte: "Moteur allumé" }
      ]
    },
    {
      id: 5, type: "QCM", enonce: "Pour dépasser un cycliste en ville, je dois laisser un espace latéral minimum de :",
      choix: [
        { lettre: "A", texte: "1,00 m", correct: true },
        { lettre: "B", texte: "2,00 m" }
      ]
    },
    {
      id: 6, type: "QCM", enonce: "Le marquage au sol de couleur jaune est :",
      choix: [
        { lettre: "A", texte: "un indicateur de croisement" },
        { lettre: "B", texte: "définitif" },
        { lettre: "C", texte: "provisoire", correct: true }
      ]
    }
  ]
};

const matiere_reglementation_taxi2_examen6: Matiere = {
  id: "reglementation_taxi2",
  nom: "G(T) - Réglementation nationale TAXI et gestion propre à cette activité",
  duree: 20,
  coefficient: 3,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QCM", enonce: "Dans une entreprise individuelle :",
      choix: [
        { lettre: "A", texte: "L'entrepreneur individuel est responsable des dettes", correct: true },
        { lettre: "B", texte: "Les biens de l'entreprise et du fondateur sont confondus", correct: true },
        { lettre: "C", texte: "L'entrepreneur est responsable à hauteur du capital" }
      ]
    },
    {
      id: 2, type: "QCM", enonce: "Je m'installe en tant qu'artisan. Je souscris un crédit-bail pour l'acquisition de mon véhicule :",
      choix: [
        { lettre: "A", texte: "Je l'amortis sur 5 ans" },
        { lettre: "B", texte: "Je ne peux pas l'amortir", correct: true },
        { lettre: "C", texte: "Je l'amortis sur 10 ans" }
      ]
    },
    {
      id: 3, type: "QCM", enonce: "Le dirigeant d'une micro-entreprise :",
      choix: [
        { lettre: "A", texte: "est soumis à l'impôt sur les sociétés" },
        { lettre: "B", texte: "n'est pas soumis à l'impôt" },
        { lettre: "C", texte: "est soumis à l'impôt sur le revenu", correct: true }
      ]
    }
  ]
};

const matiere_reglementation_vtc_examen6: Matiere = {
  id: "reglementation_vtc",
  nom: "F(V) - Développement commercial et gestion propre à l'activité de VTC",
  duree: 30,
  coefficient: 3,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QCM", enonce: "Dans quel cas le conducteur doit-il réduire sa vitesse ?",
      choix: [
        { lettre: "A", texte: "Lors du croisement ou dépassement de piétons", correct: true },
        { lettre: "B", texte: "Lorsque la route est dégagée" },
        { lettre: "C", texte: "Lors du croisement ou dépassement de cyclistes", correct: true }
      ]
    },
    {
      id: 2, type: "QCM", enonce: "Le fait de ne pas présenter immédiatement son permis est puni de :",
      choix: [
        { lettre: "A", texte: "Une amende de quatrième classe", correct: true },
        { lettre: "B", texte: "Une amende de seconde classe" },
        { lettre: "C", texte: "Une amende de troisième classe" }
      ]
    },
    {
      id: 3, type: "QCM", enonce: "Pour dépasser un cycliste en ville, espace latéral minimum :",
      choix: [
        { lettre: "A", texte: "1,00 m", correct: true },
        { lettre: "B", texte: "2,00 m" }
      ]
    },
    {
      id: 4, type: "QCM", enonce: "Dans une entreprise individuelle :",
      choix: [
        { lettre: "A", texte: "L'entrepreneur individuel est responsable des dettes", correct: true },
        { lettre: "B", texte: "Les biens de l'entreprise et du fondateur sont confondus", correct: true },
        { lettre: "C", texte: "Responsabilité limitée au capital" }
      ]
    },
    {
      id: 5, type: "QCM", enonce: "Le dirigeant d'une micro-entreprise :",
      choix: [
        { lettre: "A", texte: "est soumis à l'impôt sur les sociétés" },
        { lettre: "B", texte: "n'est pas soumis à l'impôt" },
        { lettre: "C", texte: "est soumis à l'impôt sur le revenu", correct: true }
      ]
    }
  ]
};

const matiere_reglementation_vtc2_examen6: Matiere = {
  id: "reglementation_vtc2",
  nom: "G(V) - Réglementation nationale spécifique à l'activité de VTC",
  duree: 20,
  coefficient: 3,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QRC", enonce: "Qu'est-ce que le renouvellement de la carte professionnelle VTC ?",
      reponseQRC: "Le renouvellement de la carte professionnelle intervient lorsque le conducteur produit une attestation de visite médicale et une attestation de formation continue.",
      reponses_possibles: ["visite médicale", "formation continue", "attestation"]
    },
    {
      id: 2, type: "QCM", enonce: "Je m'installe en tant qu'artisan avec crédit-bail pour mon véhicule :",
      choix: [
        { lettre: "A", texte: "Je l'amortis sur 5 ans" },
        { lettre: "B", texte: "Je ne peux pas l'amortir", correct: true },
        { lettre: "C", texte: "Je l'amortis sur 10 ans" }
      ]
    },
    {
      id: 3, type: "QCM", enonce: "Le dirigeant d'une micro-entreprise VTC est soumis à :",
      choix: [
        { lettre: "A", texte: "l'impôt sur les sociétés" },
        { lettre: "B", texte: "aucun impôt" },
        { lettre: "C", texte: "l'impôt sur le revenu", correct: true }
      ]
    }
  ]
};

export const examenBlanc6Taxi: ExamenBlanc = {
  id: "eb6-taxi",
  numero: 6,
  type: "TAXI",
  titre: "Examen Blanc N°6 - Formation TAXI",
  matieres: [
    matiere_t3p_examen6,
    matiere_gestion_examen6,
    matiere_securite_examen6,
    matiere_francais_examen6,
    matiere_anglais_examen6,
    matiere_reglementation_taxi_examen6,
    matiere_reglementation_taxi2_examen6
  ]
};

export const examenBlanc6VTC: ExamenBlanc = {
  id: "eb6-vtc",
  numero: 6,
  type: "VTC",
  titre: "Examen Blanc N°6 - Formation VTC",
  matieres: [
    matiere_t3p_examen6,
    matiere_gestion_examen6,
    matiere_securite_examen6,
    matiere_francais_examen6,
    matiere_anglais_examen6,
    matiere_reglementation_vtc_examen6,
    matiere_reglementation_vtc2_examen6
  ]
};

// ===== BILAN EXAMEN TAXI =====

const bilan_t3p_taxi: Matiere = {
  id: "bilan_t3p",
  nom: "A - Transport Public Particulier de Personnes (T3P)",
  duree: 45,
  coefficient: 3,
  noteEliminatoire: 0,
  noteSur: 7,
  questions: BILAN_T3P_QUESTIONS,
};

const bilan_gestion_taxi: Matiere = {
  id: "bilan_gestion",
  nom: "B - Gestion",
  duree: 45,
  coefficient: 2,
  noteEliminatoire: 0,
  noteSur: 7,
  questions: BILAN_GESTION_QUESTIONS,
};

const bilan_securite_taxi: Matiere = {
  id: "bilan_securite",
  nom: "C - Sécurité routière",
  duree: 30,
  coefficient: 3,
  noteEliminatoire: 0,
  noteSur: BILAN_SECURITE_QUESTIONS.length,
  questions: BILAN_SECURITE_QUESTIONS,
};

const bilan_francais_taxi: Matiere = {
  id: "bilan_francais",
  nom: "D - Français",
  duree: 30,
  coefficient: 2,
  noteEliminatoire: 0,
  noteSur: BILAN_FRANCAIS_QUESTIONS.length,
  questions: BILAN_FRANCAIS_QUESTIONS,
};

const bilan_anglais_taxi: Matiere = {
  id: "bilan_anglais",
  nom: "E - Anglais",
  duree: 30,
  coefficient: 1,
  noteEliminatoire: 0,
  noteSur: BILAN_ANGLAIS_QUESTIONS.length,
  questions: BILAN_ANGLAIS_QUESTIONS,
};

const bilan_reglementation_taxi_specifique: Matiere = {
  id: "bilan_reglementation_taxi",
  nom: "F - Réglementation Nationale TAXI",
  duree: 60,
  coefficient: 3,
  noteEliminatoire: 0,
  noteSur: 67,
  questions: [
    { id: 1, type: "QCM", enonce: "Dans le cadre d'une cession d'autorisation, la condition tenant à l'exploitation effective et continue est justifiée :", choix: [{ lettre: "A", texte: "Par tout autre moyen défini par un arrêté de l'autorité compétente pour délivrer l'ADS (contrat de location, bilan comptable, copie de l'arrêté initiale)", correct: true }, { lettre: "B", texte: "Par la copie de l'autorisation de stationnement" }, { lettre: "C", texte: "Par la copie des déclarations de revenus ou d'avis d'imposition", correct: true }, { lettre: "D", texte: "Par la copie de la carte grise du véhicule utilisé pour l'activité taxi" }] },
    { id: 2, type: "QCM", enonce: "L'autorisation de stationnement délivrée postérieurement à la publication de la loi n°2014-1104 du 1er octobre 2014 :", choix: [{ lettre: "A", texte: "A une durée de validité de 5 ans", correct: true }, { lettre: "B", texte: "Est cessible dans des conditions fixées par décret" }, { lettre: "C", texte: "Est renouvelable dans des conditions fixées par décret", correct: true }, { lettre: "D", texte: "Est cessible" }] },
    { id: 3, type: "QCM", enonce: "Quelle autorité est compétente pour délivrer les autorisations de stationnement sur les aéroports ?", choix: [{ lettre: "A", texte: "Les présidents de chambres de métiers et de l'artisanat" }, { lettre: "B", texte: "Les présidents de chambres de commerce et d'industrie" }, { lettre: "C", texte: "Les préfets ou préfet de police dans leur zone de compétences", correct: true }, { lettre: "D", texte: "Les maires" }] },
    { id: 4, type: "QCM", enonce: "Depuis l'entrée en vigueur de la loi du 1er octobre 2014, la demande de renouvellement d'une ADS délivrée postérieurement à cette date doit être réalisée :", choix: [{ lettre: "A", texte: "3 mois avant le terme", correct: true }, { lettre: "B", texte: "Avant l'échéance du terme" }, { lettre: "C", texte: "1 mois avant le terme" }, { lettre: "D", texte: "6 mois avant le terme" }] },
    { id: 5, type: "QCM", enonce: "Lorsque le client paye la course par carte bleue puis-je appliquer un supplément ?", choix: [{ lettre: "A", texte: "Non", correct: true }, { lettre: "B", texte: "Oui en accord avec le client" }, { lettre: "C", texte: "Oui sous certaines conditions" }, { lettre: "D", texte: "Oui" }] },
    { id: 6, type: "QCM", enonce: "Le véhicule taxi :", choix: [{ lettre: "A", texte: "Peut être muni d'un terminal de paiement électronique selon la réglementation locale" }, { lettre: "B", texte: "Doit être muni d'un terminal de paiement électronique", correct: true }, { lettre: "C", texte: "N'a pas l'obligation d'être muni d'un terminal de paiement électronique" }] },
    { id: 7, type: "QCM", enonce: "Un transport vers l'hôpital ou un cabinet médical non pris en charge par la caisse d'assurance maladie peut être effectué :", choix: [{ lettre: "A", texte: "Uniquement par les taxis non conventionnés" }, { lettre: "B", texte: "Par tous les taxis", correct: true }, { lettre: "C", texte: "Uniquement par les taxis conventionnés" }] },
    { id: 8, type: "QCM", enonce: "Nul ne peut s'inscrire à l'examen en vue de la délivrance du certificat de capacité professionnelle de conducteur de taxi :", choix: [{ lettre: "A", texte: "S'il a fait l'objet dans les dix ans qui précèdent sa demande, d'une exclusion pour fraude", correct: true }, { lettre: "B", texte: "S'il a fait l'objet dans les cinq ans qui précèdent sa demande, d'une exclusion pour fraude" }, { lettre: "C", texte: "S'il a fait l'objet dans les cinq ans qui précèdent sa demande, d'un retrait définitif de la carte professionnelle" }, { lettre: "D", texte: "S'il a fait l'objet dans les dix ans qui précèdent sa demande, d'un retrait définitif de la carte professionnelle", correct: true }] },
    { id: 9, type: "QCM", enonce: "Je veux faire du transport scolaire avec mon véhicule taxi que dois-je faire ?", choix: [{ lettre: "A", texte: "Afficher une pancarte transport d'enfants" }, { lettre: "B", texte: "Avoir un accompagnateur" }, { lettre: "C", texte: "Bâcher le lumineux", correct: true }, { lettre: "D", texte: "Retirer la carte professionnelle" }] },
    { id: 10, type: "QCM", enonce: "Je mets en circulation un taxi de remplacement, quelle autorité dois-je aviser ?", choix: [{ lettre: "A", texte: "La préfecture, la CMA, le RSI ou la CPAM dans le cas du statut de l'artisan et le service des fraudes" }, { lettre: "B", texte: "La préfecture, la mairie de l'ADS remplacée, la CPAM dans le cas d'un taxi conventionné et le service des fraudes" }, { lettre: "C", texte: "La préfecture, la CMA, la CPAM dans le cas d'un taxi conventionné et le service des fraudes", correct: true }, { lettre: "D", texte: "La préfecture, le conseil départemental, la CPAM dans le cas d'un taxi conventionné et le service des fraudes" }] },
    { id: 11, type: "QCM", enonce: "Quelle est l'autorité compétente pour décider de l'usage de signe distinctif commun à l'ensemble des taxis, notamment une couleur unique ?", choix: [{ lettre: "A", texte: "L'autorité compétente est exclusivement le préfet" }, { lettre: "B", texte: "L'autorité compétente est exclusivement le maire" }, { lettre: "C", texte: "L'autorité compétente est celle qui délivre les autorisations de stationnement", correct: true }] },
    { id: 12, type: "QCM", enonce: "Si le client vous demande une facture vous devez lui fournir :", choix: [{ lettre: "A", texte: "Une facture et une copie du ticket de l'imprimante" }, { lettre: "B", texte: "Une copie du ticket de l'imprimante" }, { lettre: "C", texte: "L'original du ticket de l'imprimante", correct: true }] },
    { id: 13, type: "QCM", enonce: "Par quel texte réglementaire national sont modifiés les tarifs des courses de taxi ?", choix: [{ lettre: "A", texte: "Un décret" }, { lettre: "B", texte: "Une loi" }, { lettre: "C", texte: "Un arrêté", correct: true }] },
    { id: 14, type: "QCM", enonce: "Un conducteur de taxi peut-il prendre en charge un client dans une commune autre que celle dans laquelle il exploite l'autorisation de stationner ?", choix: [{ lettre: "A", texte: "Non, en aucun cas" }, { lettre: "B", texte: "Oui, s'il a fait l'objet d'une réservation préalable", correct: true }, { lettre: "C", texte: "Oui, s'il demeure dans cette commune" }] },
    { id: 15, type: "QCM", enonce: "Quel est l'emplacement du taximètre ?", choix: [{ lettre: "A", texte: "Installé à l'intérieur avant du véhicule, à la portée du conducteur et visible des clients", correct: true }, { lettre: "B", texte: "Installé sur le toit à l'extérieur du véhicule" }, { lettre: "C", texte: "Installé à l'intérieur du véhicule, sur l'aile droite et fixé par des vis" }, { lettre: "D", texte: "Installé à l'intérieur du véhicule, sur le pare-brise arrière côté droit" }] },
    { id: 16, type: "QCM", enonce: "Qui décide du montant de la taxe de stationnement ?", choix: [{ lettre: "A", texte: "Le trésor public" }, { lettre: "B", texte: "La préfecture" }, { lettre: "C", texte: "Le maire et son conseil municipal", correct: true }, { lettre: "D", texte: "Le ministère de l'économie" }] },
    { id: 17, type: "QCM", enonce: "Est-il possible pendant une course de changer le tarif au taximètre et à quelle condition ?", choix: [{ lettre: "A", texte: "Oui, sans condition" }, { lettre: "B", texte: "Non, jamais" }, { lettre: "C", texte: "Oui, au changement d'heure (jour/nuit) en prévenant le client", correct: true }, { lettre: "D", texte: "Oui, à la demande du client" }] },
    { id: 18, type: "QCM", enonce: "Où doit-on adresser une demande de détaxe de carburants ?", choix: [{ lettre: "A", texte: "À la Direction Départementale des Territoires et de la Mer" }, { lettre: "B", texte: "À la Direction des Douanes", correct: true }, { lettre: "C", texte: "Au bureau des taxis de la Préfecture" }] },
    { id: 19, type: "QCM", enonce: "Le véhicule taxi doit être muni d'une plaque :", choix: [{ lettre: "A", texte: "Indiquant l'adresse de la préfecture" }, { lettre: "B", texte: "Indiquant le numéro de l'autorisation de stationnement", correct: true }, { lettre: "C", texte: "Indiquant le nom du propriétaire de l'ADS" }, { lettre: "D", texte: "Visible de l'extérieur", correct: true }] },
    { id: 20, type: "QCM", enonce: "Quelles sont les composantes des tarifs des courses de taxi ?", choix: [{ lettre: "A", texte: "Indemnité horaire, indemnité kilométrique, heure d'attente" }, { lettre: "B", texte: "Indemnité horaire, prise en charge, marche lente" }, { lettre: "C", texte: "Prise en charge, indemnité kilométrique, heure d'attente ou marche lente", correct: true }] },
    { id: 21, type: "QCM", enonce: "À quelle périodicité un conducteur de taxi doit-il renouveler sa demande d'inscription sur la liste d'attente en vue de l'obtention d'une licence gratuite ?", choix: [{ lettre: "A", texte: "Tous les 2 ans" }, { lettre: "B", texte: "C'est automatique" }, { lettre: "C", texte: "Tous les ans", correct: true }] },
    { id: 22, type: "QCM", enonce: "En cas de changement de tarif, sous quel délai le chauffeur doit-il modifier son compteur ?", choix: [{ lettre: "A", texte: "2 mois" }, { lettre: "B", texte: "1 mois", correct: true }, { lettre: "C", texte: "3 mois" }] },
    { id: 23, type: "QCM", enonce: "Chaque intervention sur les équipements spéciaux des taxis doit être consignée sur un carnet spécifique, comment s'appelle ce document ?", choix: [{ lettre: "A", texte: "Carnet d'entretien du véhicule" }, { lettre: "B", texte: "Carnet d'intervention spécifique" }, { lettre: "C", texte: "Carnet métrologique", correct: true }] },
    { id: 24, type: "QCM", enonce: "Que signifie CPAM ?", choix: [{ lettre: "A", texte: "Caisse primaire d'assurance maternité" }, { lettre: "B", texte: "Caisse primaire d'assurance maladie", correct: true }, { lettre: "C", texte: "Caisse principe d'assurance maladie" }, { lettre: "D", texte: "Caisse primordiale d'assurance maternité" }] },
    { id: 25, type: "QCM", enonce: "Quelle sanction risque-t-on en cas d'absence de taximètre conforme ?", choix: [{ lettre: "A", texte: "3ème classe" }, { lettre: "B", texte: "2ème classe" }, { lettre: "C", texte: "1ère classe", correct: true }] },
    { id: 26, type: "QCM", enonce: "L'activité de taxi fait partie :", choix: [{ lettre: "A", texte: "Du transport public collectif de personnes" }, { lettre: "B", texte: "Du transport public particulier de personnes", correct: true }, { lettre: "C", texte: "Du transport privé de personnes" }] },
    { id: 27, type: "QCM", enonce: "Quelle sanction risque-t-on en cas d'absence d'imprimante connectée au taximètre permettant l'édition d'une note d'information du prix ?", choix: [{ lettre: "A", texte: "3ème classe" }, { lettre: "B", texte: "2ème classe" }, { lettre: "C", texte: "1ère classe", correct: true }] },
    { id: 28, type: "QCM", enonce: "Quel(s) statut(s) permet d'exploiter l'autorisation de stationnement de la société ?", choix: [{ lettre: "A", texte: "Taxi Salarié", correct: true }, { lettre: "B", texte: "Taxi coopérateur" }, { lettre: "C", texte: "Locataire gérant", correct: true }, { lettre: "D", texte: "Artisan" }] },
    { id: 29, type: "QCM", enonce: "Quelle sanction risque-t-on en cas d'exercice illégal de l'activité : absence d'autorisation de stationnement ?", choix: [{ lettre: "A", texte: "3ème classe" }, { lettre: "B", texte: "5ème classe" }, { lettre: "C", texte: "Délit", correct: true }] },
    { id: 30, type: "QCM", enonce: "Quels éléments ne figurent pas sur le recto de la carte TAXI ?", choix: [{ lettre: "A", texte: "Le code à barres bidimensionnel et la mention « 2D-DOC »" }, { lettre: "B", texte: "Le prénom du conducteur" }, { lettre: "C", texte: "Le numéro de la carte" }, { lettre: "D", texte: "La signature du conducteur", correct: true }] },
    { id: 31, type: "QCM", enonce: "Par qui sont gérées et entretenues les stations de TAXI ?", choix: [{ lettre: "A", texte: "La mairie", correct: true }, { lettre: "B", texte: "La préfecture" }, { lettre: "C", texte: "La métropole" }] },
    { id: 32, type: "QCM", enonce: "Je peux revendre (hors cas dérogatoires) ma licence si je l'ai achetée au bout de :", choix: [{ lettre: "A", texte: "5 ans", correct: true }, { lettre: "B", texte: "1 an" }, { lettre: "C", texte: "3 ans" }] },
    { id: 33, type: "QCM", enonce: "Quels types de transports collectifs puis-je effectuer en tant que taxi si je suis inscrit à la DREAL ?", choix: [{ lettre: "A", texte: "Services réguliers" }, { lettre: "B", texte: "Services occasionnels", correct: true }, { lettre: "C", texte: "Services à la demande" }] },
    { id: 34, type: "QCM", enonce: "Qui s'occupe du nettoyage du véhicule en location gérance ?", choix: [{ lettre: "A", texte: "Le propriétaire" }, { lettre: "B", texte: "Le locataire", correct: true }] },
    { id: 35, type: "QCM", enonce: "Les tarifs imposés par la préfecture de police est un tarif :", choix: [{ lettre: "A", texte: "Imposé" }, { lettre: "B", texte: "Maximum", correct: true }, { lettre: "C", texte: "Minimum" }] },
    { id: 36, type: "QCM", enonce: "Quelle(s) est/sont la/les prestation(s) dont le conducteur artisan de taxi peut bénéficier ?", choix: [{ lettre: "A", texte: "Les allocations familiales", correct: true }, { lettre: "B", texte: "La retraite de base", correct: true }, { lettre: "C", texte: "L'indemnité chômage" }, { lettre: "D", texte: "L'indemnité journalière de maladie", correct: true }] },
    { id: 37, type: "QCM", enonce: "Un conducteur de taxi peut-il transporter des colis non accompagnés ?", choix: [{ lettre: "A", texte: "Non, c'est interdit" }, { lettre: "B", texte: "Oui, à condition que le conducteur fasse une pause" }, { lettre: "C", texte: "Non, même s'il y a un contrat d'assurance" }, { lettre: "D", texte: "Oui, mais le conducteur se fait payer à l'arrivée", correct: true }] },
    { id: 38, type: "QCM", enonce: "Qu'est-ce qu'un carnet métrologique ?", choix: [{ lettre: "A", texte: "Un certificat de conformité de l'installation du taximètre", correct: true }, { lettre: "B", texte: "Un livre" }, { lettre: "C", texte: "Un carnet de liaison entre l'installateur du matériel et le taxi" }, { lettre: "D", texte: "Un cahier de notes" }] },
    { id: 39, type: "QCM", enonce: "Où doit être apposée la carte professionnelle d'un conducteur de taxi ?", choix: [{ lettre: "A", texte: "Sur le pare-brise avant côté passager" }, { lettre: "B", texte: "Dans le véhicule, tant qu'elle est lisible du siège arrière" }, { lettre: "C", texte: "Sur le pare-brise avant côté conducteur", correct: true }] },
    { id: 40, type: "QCM", enonce: "Lors de la cession d'une ADS, quel document permet au vendeur de justifier qu'elle a bien été exploitée de manière effective et continue ?", choix: [{ lettre: "A", texte: "Un certificat médical délivré par un médecin agréé" }, { lettre: "B", texte: "La carte grise du véhicule" }, { lettre: "C", texte: "Les avis d'imposition de la période concernée", correct: true }] },
    { id: 41, type: "QCM", enonce: "Les autorisations de stationnement délivrées depuis la loi du 1er octobre 2014 :", choix: [{ lettre: "A", texte: "Peuvent être exploitées par des sociétaires de coopératives" }, { lettre: "B", texte: "Doivent être exploitées personnellement", correct: true }, { lettre: "C", texte: "Peuvent être exploitées par des salariés" }, { lettre: "D", texte: "Peuvent être exploitées par des locataires-gérants" }] },
    { id: 42, type: "QCM", enonce: "Un compteur horokilométrique permet :", choix: [{ lettre: "A", texte: "De calculer le montant de la course", correct: true }, { lettre: "B", texte: "D'afficher la durée de la course" }, { lettre: "C", texte: "D'afficher le nombre de kilomètres parcourus" }] },
    { id: 43, type: "QCM", enonce: "Le véhicule taxi doit être muni d'un terminal de paiement électronique :", choix: [{ lettre: "A", texte: "Si le préfet du département le prévoit par arrêté" }, { lettre: "B", texte: "C'est une obligation légale valable sur tout le territoire national" }, { lettre: "C", texte: "Uniquement pour les taxis exerçant leur activité dans les zones touristiques", correct: true }] },
    { id: 44, type: "QCM", enonce: "Le registre de disponibilité des taxis fait l'objet d'un enregistrement d'informations relatives aux ADS lors :", choix: [{ lettre: "A", texte: "Des changements des équipements spéciaux" }, { lettre: "B", texte: "Des renouvellements et des ventes d'ADS", correct: true }, { lettre: "C", texte: "Des formations quinquennales obligatoires" }, { lettre: "D", texte: "Des délivrances et des retraits d'ADS", correct: true }] },
    { id: 45, type: "QCM", enonce: "Le conducteur de taxi a le droit :", choix: [{ lettre: "A", texte: "De ne pas attendre les voyageurs s'ils se trouvent dans une voie où le stationnement est impossible", correct: true }, { lettre: "B", texte: "D'être accompagné de personnes autres que des clients" }, { lettre: "C", texte: "De solliciter un pourboire" }] },
    { id: 46, type: "QCM", enonce: "Le financement en crédit-bail d'un véhicule de taxi permet la déduction fiscale :", choix: [{ lettre: "A", texte: "Des loyers du crédit-bail", correct: true }, { lettre: "B", texte: "De l'amortissement du véhicule" }, { lettre: "C", texte: "Des intérêts et de l'assurance décès / incapacité / invalidité" }] },
    { id: 47, type: "QCM", enonce: "Quelle(s) mention(s) ne doit(vent) pas figurer sur le registre des transactions quand le titulaire d'une ADS présente un successeur à titre onéreux ?", choix: [{ lettre: "A", texte: "Le nom ou la raison sociale du successeur ou du vendeur" }, { lettre: "B", texte: "Le numéro d'inscription à la chambre des métiers et de l'artisanat" }, { lettre: "C", texte: "Le montant de la transaction", correct: true }, { lettre: "D", texte: "La marque de la voiture", correct: true }] },
    { id: 48, type: "QCM", enonce: "La plus-value est égale à :", choix: [{ lettre: "A", texte: "La différence entre le prix de vente et le prix d'achat ou de la valeur déclarée" }, { lettre: "B", texte: "L'addition entre le prix de vente et le prix d'achat ou de la valeur déclarée", correct: true }, { lettre: "C", texte: "La différence entre les bénéfices et le prix d'achat ou de la valeur déclarée" }] },
    { id: 49, type: "QCM", enonce: "La TVA à décaisser (à payer) représente :", choix: [{ lettre: "A", texte: "La TVA" }, { lettre: "B", texte: "TVA collectée − TVA déductible" }, { lettre: "C", texte: "TVA déductible − TVA collectée", correct: true }] },
    { id: 50, type: "QCM", enonce: "Si l'on se met en face d'un dispositif lumineux TAXI et que l'on lit de droite à gauche, quel est l'ordre des lettres ?", choix: [{ lettre: "A", texte: "ABCD" }, { lettre: "B", texte: "DCBA", correct: true }, { lettre: "C", texte: "ABDC" }, { lettre: "D", texte: "CDBA" }] },
    { id: 51, type: "QCM", enonce: "Quelle est la couleur des lettres du dispositif lumineux TAXI DCBA ?", choix: [{ lettre: "A", texte: "Vert, bleu, orange, blanc", correct: true }, { lettre: "B", texte: "Vert, bleu, orange, marron" }, { lettre: "C", texte: "Orange, blanc, vert, bleu" }, { lettre: "D", texte: "Bleu, vert, blanc, orange" }] },
    { id: 52, type: "QCM", enonce: "Qu'est-ce qu'un LOGO ?", choix: [{ lettre: "A", texte: "Un jeu pour enfants" }, { lettre: "B", texte: "Un graphisme qui représente une marque ou une société", correct: true }, { lettre: "C", texte: "Une marionnette" }, { lettre: "D", texte: "Une affiche" }] },
    { id: 53, type: "QCM", enonce: "Une personne qui influence l'acte d'achat est :", choix: [{ lettre: "A", texte: "Un consommateur" }, { lettre: "B", texte: "Un grossiste" }, { lettre: "C", texte: "Un prescripteur", correct: true }] },
    { id: 54, type: "QCM", enonce: "On appelle marketing direct :", choix: [{ lettre: "A", texte: "L'envoi d'un message personnalisé à un groupe de personnes ciblées", correct: true }, { lettre: "B", texte: "L'achat d'espace publicitaire dans la presse locale" }, { lettre: "C", texte: "La mise en valeur d'offres promotionnelles dans le véhicule" }] },
    { id: 55, type: "QCM", enonce: "Qu'est-ce qu'un prospect ?", choix: [{ lettre: "A", texte: "Une brochure publicitaire référençant l'ensemble d'un catalogue de prestation" }, { lettre: "B", texte: "Une publicité sur format papier A5 ou plus petit" }, { lettre: "C", texte: "Un client potentiel", correct: true }, { lettre: "D", texte: "L'ensemble des clients non facturés uniquement" }] },
    { id: 56, type: "QCM", enonce: "Un chauffeur TAXI a-t-il le droit au chômage et aux allocations familiales ?", choix: [{ lettre: "A", texte: "Il n'a pas le droit au chômage mais a le droit aux allocations familiales", correct: true }, { lettre: "B", texte: "Il a le droit au chômage et aux allocations familiales" }, { lettre: "C", texte: "Il a le droit au chômage mais pas aux allocations familiales" }, { lettre: "D", texte: "Il n'a droit ni au chômage ni aux allocations familiales" }] },
    { id: 57, type: "QCM", enonce: "Quelle est la couleur du Tarif A ?", choix: [{ lettre: "A", texte: "Blanc", correct: true }, { lettre: "B", texte: "Orange" }, { lettre: "C", texte: "Bleu" }, { lettre: "D", texte: "Vert" }] },
    { id: 58, type: "QCM", enonce: "Existe-t-il un tarif minimum de perception pour les courses de TAXI ?", choix: [{ lettre: "A", texte: "Non en aucun cas" }, { lettre: "B", texte: "Oui", correct: true }, { lettre: "C", texte: "La nuit uniquement" }] },
    { id: 59, type: "QCM", enonce: "Quel est le service compétent pour conventionner un TAXI au TAP ?", choix: [{ lettre: "A", texte: "La CPAM dont dépend l'ADS", correct: true }, { lettre: "B", texte: "La CPAM dont dépend l'assuré" }, { lettre: "C", texte: "La CPAM dont dépend le patient" }, { lettre: "D", texte: "La CPAM du département d'examen TAXI" }] },
    { id: 60, type: "QCM", enonce: "Citez les cas dans lesquels on peut céder à titre onéreux une ADS :", choix: [{ lettre: "A", texte: "Liquidation judiciaire", correct: true }, { lettre: "B", texte: "Décès", correct: true }, { lettre: "C", texte: "Annulation du permis de conduire" }, { lettre: "D", texte: "Dans n'importe quel cas" }] },
    { id: 61, type: "QCM", enonce: "Quelle est la couleur du globe répétiteur indiquant le tarif B ?", choix: [{ lettre: "A", texte: "Verte" }, { lettre: "B", texte: "Blanche" }, { lettre: "C", texte: "Orange", correct: true }] },
    { id: 62, type: "QCM", enonce: "Qu'est-ce que le carnet de métrologie ?", choix: [{ lettre: "A", texte: "Un livre", correct: true }, { lettre: "B", texte: "Un cahier de notes" }, { lettre: "C", texte: "Un carnet de liaison entre l'installateur du matériel et le taxi", correct: true }, { lettre: "D", texte: "Une preuve de conformité des équipements spéciaux", correct: true }] },
    { id: 63, type: "QCM", enonce: "Dans le cadre d'une cession d'ADS délivrée avant le 1er octobre 2014, il est fait dérogation aux délais minimum d'exploitation continue et effective, en cas :", choix: [{ lettre: "A", texte: "De décès", correct: true }, { lettre: "B", texte: "De départ à la retraite" }, { lettre: "C", texte: "De retrait du permis de conduire" }, { lettre: "D", texte: "D'inaptitude médicale définitive à la conduite automobile", correct: true }] },
    { id: 64, type: "QCM", enonce: "Quelle autorité décide de la répartition du taux d'augmentation annuel des tarifs ?", choix: [{ lettre: "A", texte: "Le maire" }, { lettre: "B", texte: "Le président régional" }, { lettre: "C", texte: "Le préfet du département", correct: true }, { lettre: "D", texte: "Le responsable du syndicat local" }] },
    { id: 65, type: "QCM", enonce: "Parmi la liste ci-dessous, cochez les équipements obligatoires du véhicule taxi :", choix: [{ lettre: "A", texte: "Trousse de secours (CPAM)" }, { lettre: "B", texte: "Détecteur de radar" }, { lettre: "C", texte: "Terminal de paiement électronique (TPE)", correct: true }, { lettre: "D", texte: "GPS" }] },
    { id: 66, type: "QCM", enonce: "À quelle périodicité le véhicule taxi doit-il passer le contrôle technique ?", choix: [{ lettre: "A", texte: "Tous les 6 mois" }, { lettre: "B", texte: "Aucune obligation prévue par la réglementation" }, { lettre: "C", texte: "2 ans" }, { lettre: "D", texte: "1 an", correct: true }] },
    { id: 67, type: "QCM", enonce: "Dans quels cas puis-je utiliser un véhicule de remplacement ?", choix: [{ lettre: "A", texte: "En cas de panne de mon véhicule", correct: true }, { lettre: "B", texte: "En cas d'accident de mon véhicule", correct: true }, { lettre: "C", texte: "En cas de vol des équipements spéciaux de mon véhicule", correct: true }, { lettre: "D", texte: "En attendant d'avoir mon permis de circuler" }] },
  ]
};

const bilan_reglementation_taxi_locale: Matiere = {
  id: "bilan_reglementation_taxi2",
  nom: "G(T) - Réglementation Locale — Métropole de Lyon",
  duree: 40,
  coefficient: 3,
  noteEliminatoire: 0,
  noteSur: 40,
  questions: [
    { id: 1, type: "QCM", enonce: "Que signifie le tarif A ?", choix: [{ lettre: "A", texte: "Course de jour", correct: true }, { lettre: "B", texte: "Course de nuit, course effectuée le dimanche et les jours fériés ou course sur route effectivement enneigées ou verglacées" }, { lettre: "C", texte: "Trajet aller avec le client et retour à vide à la station" }] },
    { id: 2, type: "QCM", enonce: "Quel est le montant de la prise en charge ?", choix: [{ lettre: "A", texte: "4 €", correct: true }, { lettre: "B", texte: "5 €" }] },
    { id: 3, type: "QCM", enonce: "Le supplément bagage est pour :", choix: [{ lettre: "A", texte: "Les valises, ou bagages de taille équivalente, au-delà de trois valises" }, { lettre: "B", texte: "Les valises, ou bagages de taille équivalente, au-delà de quatre valises", correct: true }, { lettre: "C", texte: "Les valises, ou bagages de taille équivalente, au-delà de cinq valises" }] },
    { id: 4, type: "QCM", enonce: "Où se situe le musée LUGDUNUM ?", choix: [{ lettre: "A", texte: "46 allées d'Italie 69005" }, { lettre: "B", texte: "2 rue Bichat 69005" }, { lettre: "C", texte: "63 rue Philippe de Lassalle 69005" }, { lettre: "D", texte: "17 rue Cléberg 69005", correct: true }] },
    { id: 5, type: "QCM", enonce: "Quel est le prix au km du tarif C ?", choix: [{ lettre: "A", texte: "2,31€" }, { lettre: "B", texte: "2€", correct: true }, { lettre: "C", texte: "2,28€" }, { lettre: "D", texte: "2,50€" }] },
    { id: 6, type: "QCM", enonce: "Où se situe la mairie de Villeurbanne ?", choix: [{ lettre: "A", texte: "5 place du Petit Collège 69100" }, { lettre: "B", texte: "6 place du Marché 69100" }, { lettre: "C", texte: "16 place Jean Macé 69100" }, { lettre: "D", texte: "Place du Dr Lazarre Goujon 69100", correct: true }] },
    { id: 7, type: "QCM", enonce: "Que signifie le tarif B ?", choix: [{ lettre: "A", texte: "Course de jour" }, { lettre: "B", texte: "Trajet aller avec le client et retour en charge à la station" }, { lettre: "C", texte: "Course de nuit, course effectuée le dimanche et les jours fériés ou course sur route effectivement enneigées ou verglacées", correct: true }, { lettre: "D", texte: "Trajet aller avec le client et retour à vide à la station" }] },
    { id: 8, type: "QCM", enonce: "Quelle est le montant de la réservation immédiate ?", choix: [{ lettre: "A", texte: "2€", correct: true }, { lettre: "B", texte: "2,50€" }, { lettre: "C", texte: "4€" }, { lettre: "D", texte: "3€" }] },
    { id: 9, type: "QCM", enonce: "Quelle est le montant de la réservation à l'avance ?", choix: [{ lettre: "A", texte: "2€" }, { lettre: "B", texte: "2,50€" }, { lettre: "C", texte: "4€", correct: true }, { lettre: "D", texte: "3€" }] },
    { id: 10, type: "QCM", enonce: "La basilique de Notre Dame de Fourvière est-elle inscrite au patrimoine mondial de l'UNESCO ?", choix: [{ lettre: "A", texte: "Oui", correct: true }, { lettre: "B", texte: "Non" }] },
    { id: 11, type: "QCM", enonce: "Quel est le prix au km du tarif B ?", choix: [{ lettre: "A", texte: "2,31€" }, { lettre: "B", texte: "1,54€" }, { lettre: "C", texte: "1,50€", correct: true }, { lettre: "D", texte: "2,50€" }] },
    { id: 12, type: "QCM", enonce: "Où se situe le consulat du Japon ?", choix: [{ lettre: "A", texte: "2/4 rue Carry" }, { lettre: "B", texte: "131 Boulevard de Stalingrad, 69100", correct: true }, { lettre: "C", texte: "126 rue Vauban" }, { lettre: "D", texte: "26 Rue Louis Blanc" }] },
    { id: 13, type: "QCM", enonce: "Que signifie le tarif D ?", choix: [{ lettre: "A", texte: "Course de jour" }, { lettre: "B", texte: "Trajet aller avec le client et retour en charge à la station" }, { lettre: "C", texte: "Course de nuit, course effectuée le dimanche et les jours fériés ou course sur route effectivement enneigées ou verglacées", correct: true }, { lettre: "D", texte: "Trajet aller avec le client et retour à vide à la station", correct: true }] },
    { id: 14, type: "QCM", enonce: "Quel est le tarif maximum de prise en charge sur le département du Rhône par horaire ?", choix: [{ lettre: "A", texte: "35,20€" }, { lettre: "B", texte: "35,25€" }, { lettre: "C", texte: "35,30€" }, { lettre: "D", texte: "40,40€", correct: true }] },
    { id: 15, type: "QCM", enonce: "Quelle(s) commune(s) ne fait (font) pas partie(s) de la ZUPC ?", choix: [{ lettre: "A", texte: "Caluire-et-Cuire" }, { lettre: "B", texte: "Saint-Priest" }, { lettre: "C", texte: "Chassieu" }, { lettre: "D", texte: "Villefranche", correct: true }] },
    { id: 16, type: "QCM", enonce: "Quel est le prix au km du tarif D ?", choix: [{ lettre: "A", texte: "2,43€" }, { lettre: "B", texte: "1,54€" }, { lettre: "C", texte: "1,22€" }, { lettre: "D", texte: "3€", correct: true }] },
    { id: 17, type: "QCM", enonce: "Où se situe la chambre régionale d'agriculture ?", choix: [{ lettre: "A", texte: "2/4 rue Carry" }, { lettre: "B", texte: "23 rue Jean Baldassini", correct: true }, { lettre: "C", texte: "126 rue Vauban" }, { lettre: "D", texte: "26 Rue Louis Blanc" }] },
    { id: 18, type: "QCM", enonce: "Je souhaite m'inscrire sur une liste d'attente pour l'obtention d'une ADS gratuite sur la commune de Dardilly, à qui devrais-je m'adresser ?", choix: [{ lettre: "A", texte: "Mairie de Dardilly" }, { lettre: "B", texte: "Métropole de Lyon", correct: true }, { lettre: "C", texte: "Préfecture du Rhône" }] },
    { id: 19, type: "QCM", enonce: "Je souhaite m'inscrire sur une liste d'attente pour l'obtention d'une ADS gratuite sur la commune de Genas, à qui devrais-je m'adresser ?", choix: [{ lettre: "A", texte: "Mairie de Genas", correct: true }, { lettre: "B", texte: "Métropole de Lyon" }, { lettre: "C", texte: "Préfecture du Rhône" }] },
    { id: 20, type: "QCM", enonce: "Un client a oublié un objet dans le véhicule TAXI, où dois-je le déposer ?", choix: [{ lettre: "A", texte: "Je garde l'objet pour moi" }, { lettre: "B", texte: "Aux services des objets trouvés de la mairie de dépose ou auprès de l'autorité de délivrance de l'ADS dans un délai maximum de 72h", correct: true }, { lettre: "C", texte: "Aux services des objets trouvés dans un délai maximum de 48h" }, { lettre: "D", texte: "Aux services des objets trouvés dans un délai maximum de 24h" }] },
    { id: 21, type: "QCM", enonce: "Où se situe le château de Lacroix-Laval ?", choix: [{ lettre: "A", texte: "Saint-Genis-Laval" }, { lettre: "B", texte: "Marcy-l'Étoile", correct: true }, { lettre: "C", texte: "Tassin-la-Demi-Lune" }, { lettre: "D", texte: "Lyon 9" }] },
    { id: 22, type: "QCM", enonce: "Où se situe la station de taxi la plus proche du Musée des Tissus et des Arts Décoratifs ?", choix: [{ lettre: "A", texte: "Station place Bellecour" }, { lettre: "B", texte: "Station hôtel Sofitel", correct: true }, { lettre: "C", texte: "Station hôtel Royal" }, { lettre: "D", texte: "Station Gare Perrache" }] },
    { id: 23, type: "QCM", enonce: "Où se trouve la fresque de la Martinière ?", choix: [{ lettre: "A", texte: "Place Sathonnay" }, { lettre: "B", texte: "Rue de la Martinière", correct: true }, { lettre: "C", texte: "Avenue Tony Garnier" }, { lettre: "D", texte: "Boulevard des Canuts" }] },
    { id: 24, type: "QCM", enonce: "Le service Taxis de la Métropole de Lyon se trouve :", choix: [{ lettre: "A", texte: "18 rue Créqui Lyon" }, { lettre: "B", texte: "20 place Charles Béraudier Lyon" }, { lettre: "C", texte: "Métro Jean Jaurès Lyon 7", correct: true }, { lettre: "D", texte: "20 place Bellecour" }] },
    { id: 25, type: "QCM", enonce: "En cas de location gérance, l'assurance est à la charge :", choix: [{ lettre: "A", texte: "Du loueur", correct: true }, { lettre: "B", texte: "Du locataire" }] },
    { id: 26, type: "QCM", enonce: "Quelle ville a été considérée comme capitale française de la culture ?", choix: [{ lettre: "A", texte: "Lyon" }, { lettre: "B", texte: "Villeurbanne", correct: true }, { lettre: "C", texte: "Paris" }, { lettre: "D", texte: "Le Havre" }] },
    { id: 27, type: "QCM", enonce: "Je suis convoqué à une commission disciplinaire locale, puis-je me faire assister par quelqu'un de mon choix ?", choix: [{ lettre: "A", texte: "Oui", correct: true }, { lettre: "B", texte: "Non" }] },
    { id: 28, type: "QCM", enonce: "Puis-je transporter des personnes autres que des clients, lors d'une course avec ces derniers ?", choix: [{ lettre: "A", texte: "Oui" }, { lettre: "B", texte: "Non", correct: true }] },
    { id: 29, type: "QCM", enonce: "Je dispose d'une licence de Villefranche, je souhaite déposer un article trouvé dans mon véhicule à Lyon 8, je le dépose à :", choix: [{ lettre: "A", texte: "La Métropole de Lyon", correct: true }, { lettre: "B", texte: "La mairie de Lyon 8" }, { lettre: "C", texte: "La mairie de Villeurbanne" }, { lettre: "D", texte: "La mairie de Villefranche" }] },
    { id: 30, type: "QCM", enonce: "Je suis à Bron, j'ai une course au départ de Saint-Genis-Laval, j'active mon compteur à :", choix: [{ lettre: "A", texte: "À la dernière station ou à équidistance de la ZUPC ou à la dernière station ou à équidistance de la commune de rattachement du TAXI", correct: true }, { lettre: "B", texte: "Saint-Genis-Laval" }, { lettre: "C", texte: "Bron" }, { lettre: "D", texte: "Lyon" }] },
    { id: 31, type: "QCM", enonce: "Quel monument figure sur la place des Terreaux ?", choix: [{ lettre: "A", texte: "La statue de Louis XIV" }, { lettre: "B", texte: "La fontaine Bartholdi", correct: true }, { lettre: "C", texte: "La statue de Charlemagne" }, { lettre: "D", texte: "La statue de Bonaparte" }] },
    { id: 32, type: "QCM", enonce: "Quel autre monument a été réalisé par Bartholdi ?", choix: [{ lettre: "A", texte: "La statue de Charlemagne" }, { lettre: "B", texte: "La tour Eiffel" }, { lettre: "C", texte: "Burj Khalifa" }, { lettre: "D", texte: "La statue de la Liberté", correct: true }] },
    { id: 33, type: "QCM", enonce: "Avant d'être enregistré au service en charge des taxis à la Métropole de Lyon, où doit être présenté le contrat de location gérance ?", choix: [{ lettre: "A", texte: "La préfecture" }, { lettre: "B", texte: "La chambre des métiers et de l'artisanat", correct: true }, { lettre: "C", texte: "La DREAL" }] },
    { id: 34, type: "QCM", enonce: "Quelle commune fait partie de la Métropole de Lyon ?", choix: [{ lettre: "A", texte: "Tarare" }, { lettre: "B", texte: "Brignais" }, { lettre: "C", texte: "Sérézin-du-Rhône" }, { lettre: "D", texte: "Quincieux", correct: true }] },
    { id: 35, type: "QCM", enonce: "Que doit faire un chauffeur TAXI qui n'est pas en course et qui stationne sur une place de TAXI ?", choix: [{ lettre: "A", texte: "La station doit avoir 5 places minimum, le lumineux doit être allumé et un disque de stationnement doit être sur le tableau de bord" }, { lettre: "B", texte: "La station doit avoir 4 places minimum, le lumineux doit être allumé et un disque de stationnement doit être sur le tableau de bord" }, { lettre: "C", texte: "La station doit avoir 3 places minimum, le lumineux doit être allumé et un disque de stationnement doit être sur le tableau de bord", correct: true }, { lettre: "D", texte: "La station doit avoir 6 places minimum, 1/3 de la partie arrière peut être utilisée, le lumineux doit être allumé et un disque de stationnement doit être sur le tableau de bord" }] },
    { id: 36, type: "QCM", enonce: "Où se situe la station de taxi la plus proche des Halles Paul Bocuse ?", choix: [{ lettre: "A", texte: "Boulevard Eugène Deruelle" }, { lettre: "B", texte: "Rue de Bonnel" }, { lettre: "C", texte: "Boulevard Vivier Merle", correct: true }, { lettre: "D", texte: "Rue Servient" }] },
    { id: 37, type: "QCM", enonce: "À quelle fréquence se réunit le SIRHA sur Lyon ?", choix: [{ lettre: "A", texte: "1 an" }, { lettre: "B", texte: "2 ans", correct: true }, { lettre: "C", texte: "3 ans" }, { lettre: "D", texte: "4 ans" }] },
    { id: 38, type: "QCM", enonce: "Quelle personnalité publique est originaire de la région lyonnaise ?", choix: [{ lettre: "A", texte: "Anne Roumanoff" }, { lettre: "B", texte: "Florence Foresti", correct: true }, { lettre: "C", texte: "Claude Lelouch" }, { lettre: "D", texte: "Jean Dujardin" }] },
    { id: 39, type: "QCM", enonce: "À partir de Bellecour, quels axes autoroutiers et/ou périphériques prenez-vous pour aller à Clermont-Ferrand ?", choix: [{ lettre: "A", texte: "A7" }, { lettre: "B", texte: "M6", correct: true }, { lettre: "C", texte: "A89", correct: true }] },
    { id: 40, type: "QCM", enonce: "Quels sont les critères de véhicule pour exploiter un véhicule taxi ?", choix: [{ lettre: "A", texte: "Véhicule de moins de 7 ans" }, { lettre: "B", texte: "Véhicule de moins de 10 ans", correct: true }, { lettre: "C", texte: "Coffre d'un volume minimum de 400 litres pour les véhicules thermiques et 300 litres pour les véhicules électriques", correct: true }, { lettre: "D", texte: "Coffre d'un volume minimum de 500 litres pour les véhicules thermiques et 400 litres pour les véhicules électriques" }] },
  ]
};

export const bilanExamenTaxi: ExamenBlanc = {
  id: "bilan-taxi",
  numero: 7,
  type: "TAXI",
  titre: "Bilan Examen TAXI",
  matieres: [
    bilan_t3p_taxi,
    bilan_gestion_taxi,
    bilan_securite_taxi,
    bilan_francais_taxi,
    bilan_anglais_taxi,
    bilan_reglementation_taxi_specifique,
    bilan_reglementation_taxi_locale,
  ]
};

// ===== BILAN EXAMEN VTC =====

const bilan_reglementation_vtc_specifique: Matiere = {
  id: "bilan_reglementation_vtc",
  nom: "F - Réglementation Spécifique VTC",
  duree: 40,
  coefficient: 3,
  noteEliminatoire: 0,
  noteSur: 40,
  questions: [
    { id: 1, type: "QCM", enonce: "La durée maximale de stationnement précédant l'horaire de prise en charge mentionné par le client lors de sa réservation à un aéroport ou une gare pour un VTC est de :", choix: [{ lettre: "A", texte: "45 minutes" }, { lettre: "B", texte: "1 heure", correct: true }, { lettre: "C", texte: "30 minutes" }, { lettre: "D", texte: "1 h 30" }] },
    { id: 2, type: "QCM", enonce: "Qui délivre la carte professionnelle des conducteurs de VTC ?", choix: [{ lettre: "A", texte: "La préfecture", correct: true }, { lettre: "B", texte: "La chambre de métiers et de l'artisanat" }, { lettre: "C", texte: "La Mairie" }, { lettre: "D", texte: "Les organisations professionnelles de VTC" }] },
    { id: 3, type: "QCM", enonce: "La justification d'une réservation préalable :", choix: [{ lettre: "A", texte: "Doit obligatoirement mentionner le nom du bénéficiaire de la prestation", correct: true }, { lettre: "B", texte: "Est facultative" }, { lettre: "C", texte: "Peut être établie sur support numérique", correct: true }] },
    { id: 4, type: "QCM", enonce: "Parmi les puissances de moteur suivantes, quelles sont celles permettant à une voiture d'être exploitée en VTC ?", choix: [{ lettre: "A", texte: "82 kilowatts" }, { lettre: "B", texte: "86 kilowatts", correct: true }, { lettre: "C", texte: "80 kilowatts" }, { lettre: "D", texte: "84 kilowatts", correct: true }] },
    { id: 5, type: "QCM", enonce: "Quelle(s) entreprise(s) doit (doivent) être inscrite(s) au registre des exploitants de VTC ?", choix: [{ lettre: "A", texte: "Les entreprises assurant des services collectifs de manière occasionnelle" }, { lettre: "B", texte: "Les exploitants de VTC", correct: true }, { lettre: "C", texte: "Les intermédiaires mettant en relation les exploitants et les clients" }] },
    { id: 6, type: "QCM", enonce: "Quelles sont les caractéristiques d'une voiture adaptée pour un usage de VTC ?", choix: [{ lettre: "A", texte: "Une longueur hors tout minimale de 4,50 mètres et au moins quatre portes", correct: true }, { lettre: "B", texte: "Une longueur hors tout comprise entre 4,70 mètres et une largeur hors tout minimale de 1,60 mètre" }, { lettre: "C", texte: "Une longueur hors tout comprise entre 4,05 mètres et 5,12 mètres" }, { lettre: "D", texte: "Une longueur hors tout comprise entre 3,58 mètres et 4,50 mètres" }] },
    { id: 7, type: "QCM", enonce: "La taille minimale exigée pour un véhicule de transport avec chauffeur est de :", choix: [{ lettre: "A", texte: "L 4.8M x l 1.7m" }, { lettre: "B", texte: "L 4.5m X l 1.7m", correct: true }, { lettre: "C", texte: "L 4.5m X l 1.8m" }] },
    { id: 8, type: "QCM", enonce: "Pour chaque véhicule exploité comme VTC, une capacité financière est exigée. Quel est son montant ?", choix: [{ lettre: "A", texte: "1 500 euros", correct: true }, { lettre: "B", texte: "100 euros" }, { lettre: "C", texte: "8 000 euros" }] },
    { id: 9, type: "QCM", enonce: "Le renouvellement de l'inscription au registre des VTC doit avoir lieu :", choix: [{ lettre: "A", texte: "Elle se fait automatiquement" }, { lettre: "B", texte: "Tous les ans" }, { lettre: "C", texte: "Tous les 5 ans", correct: true }] },
    { id: 10, type: "QCM", enonce: "En cas de défaut de signalétique VTC vous risquez ?", choix: [{ lettre: "A", texte: "Une contravention de 5ème classe" }, { lettre: "B", texte: "Une contravention de 1ère classe" }, { lettre: "C", texte: "Une contravention de 4ème classe", correct: true }] },
    { id: 11, type: "QCM", enonce: "Je peux m'inscrire au registre des VTC avant d'avoir ma carte professionnelle ?", choix: [{ lettre: "A", texte: "Oui" }, { lettre: "B", texte: "Oui, mais je dois au moins avoir réussi mon examen" }, { lettre: "C", texte: "Non", correct: true }] },
    { id: 12, type: "QCM", enonce: "La longueur minimale hors tout d'un véhicule VTC hybride ou électrique :", choix: [{ lettre: "A", texte: "Est de 4,50 mètres" }, { lettre: "B", texte: "Est de 4 mètres" }, { lettre: "C", texte: "Est de 3 mètres" }, { lettre: "D", texte: "Aucune longueur minimale n'est imposée", correct: true }] },
    { id: 13, type: "QCM", enonce: "Un véhicule VTC doit être âgé de :", choix: [{ lettre: "A", texte: "Moins de 7 ans, sauf pour les véhicules de collection de 30 ans" }, { lettre: "B", texte: "Moins de 5 ans, sauf pour les véhicules de collection de 15 ans", correct: true }, { lettre: "C", texte: "Moins de 7 ans, sauf pour les véhicules de collection de 25 ans" }, { lettre: "D", texte: "Moins de 5 ans, sauf pour les véhicules de collection de 20 ans" }] },
    { id: 14, type: "QCM", enonce: "Quel est le périmètre d'exercice de l'activité de conducteur de VTC ?", choix: [{ lettre: "A", texte: "Son département de résidence" }, { lettre: "B", texte: "Sa commune de résidence" }, { lettre: "C", texte: "Le territoire national", correct: true }] },
    { id: 15, type: "QCM", enonce: "Parmi les dimensions suivantes, quelles sont celles permettant à une voiture d'être exploitée en VTC ?", choix: [{ lettre: "A", texte: "Longueur 4,47 m et largeur 1,85 m" }, { lettre: "B", texte: "Longueur 4,30 m et largeur 1,81 m" }, { lettre: "C", texte: "Longueur 4,70 m et largeur 1,80 m", correct: true }, { lettre: "D", texte: "Longueur 4,61 m et largeur 1,77 m", correct: true }] },
    { id: 16, type: "QCM", enonce: "La prise en charge d'un client sur une voie ouverte à la circulation publique sans réservation préalable est :", choix: [{ lettre: "A", texte: "Autorisée si elle est consécutive à la dépose du client précédent sur le même lieu" }, { lettre: "B", texte: "Passible d'une suspension du permis de conduire", correct: true }, { lettre: "C", texte: "Un délit puni d'une peine de prison et d'une amende pouvant aller jusqu'à 15 000€", correct: true }] },
    { id: 17, type: "QCM", enonce: "Hormis les véhicules de collection, quelle est la limite relative à l'ancienneté d'un véhicule VTC ?", choix: [{ lettre: "A", texte: "8 ans" }, { lettre: "B", texte: "7 ans", correct: true }, { lettre: "C", texte: "6 ans" }, { lettre: "D", texte: "5 ans" }] },
    { id: 18, type: "QCM", enonce: "La procédure d'inscription au registre des exploitants de VTC doit être renouvelée tous les :", choix: [{ lettre: "A", texte: "4 ans" }, { lettre: "B", texte: "1 an" }, { lettre: "C", texte: "5 ans", correct: true }, { lettre: "D", texte: "2 ans" }] },
    { id: 19, type: "QCM", enonce: "Un véhicule VTC peut-il être électrique ?", choix: [{ lettre: "A", texte: "Oui, s'il respecte les conditions de puissance" }, { lettre: "B", texte: "Oui, s'il respecte les conditions de taille et de puissance" }, { lettre: "C", texte: "Non, c'est interdit" }, { lettre: "D", texte: "Oui, quelles que soient la taille et la puissance", correct: true }] },
    { id: 20, type: "QCM", enonce: "Pour la réalisation d'une prestation de VTC :", choix: [{ lettre: "A", texte: "Il doit exister un contrat écrit obligatoirement sur support papier" }, { lettre: "B", texte: "Les CGV valent contrat si le client a signé toutes les pages" }, { lettre: "C", texte: "Les CGV valent contrat si le client a signé la dernière page" }, { lettre: "D", texte: "Il doit exister un contrat avec le client final pouvant être écrit sur support papier ou électronique", correct: true }] },
    { id: 21, type: "QCM", enonce: "En dehors de la garantie financière de 1 500 €, un exploitant de VTC peut justifier de la capacité financière par :", choix: [{ lettre: "A", texte: "Un contrat de location d'une durée supérieure à 6 mois", correct: true }, { lettre: "B", texte: "Un contrat de location d'une durée supérieure à 3 mois" }, { lettre: "C", texte: "En démontrant qu'il est propriétaire du véhicule", correct: true }, { lettre: "D", texte: "Une attestation de prêt pour une durée supérieure à 6 mois" }] },
    { id: 22, type: "QCM", enonce: "La vignette signalétique d'un véhicule VTC doit comporter :", choix: [{ lettre: "A", texte: "Le numéro d'inscription au registre de VTC", correct: true }, { lettre: "B", texte: "Le numéro d'immatriculation du véhicule", correct: true }, { lettre: "C", texte: "Le numéro de SIRET de l'entreprise" }, { lettre: "D", texte: "Le nom du conducteur" }] },
    { id: 23, type: "QCM", enonce: "Quel est le délai maximum de livraison de l'attestation du registre de VTC ?", choix: [{ lettre: "A", texte: "1 mois" }, { lettre: "B", texte: "2 mois", correct: true }, { lettre: "C", texte: "3 mois" }, { lettre: "D", texte: "4 mois" }] },
    { id: 24, type: "QCM", enonce: "Une fois arrivé à destination, vous déposez votre client, que faites-vous ?", choix: [{ lettre: "A", texte: "Un client vous hèle et vous le prenez sans bon de commande" }, { lettre: "B", texte: "Vous remplissez le bon de commande en conduisant" }, { lettre: "C", texte: "Vous roulez doucement à la recherche de clients" }, { lettre: "D", texte: "Vous retournez au siège social de l'entreprise", correct: true }] },
    { id: 25, type: "QCM", enonce: "Je suis conducteur d'un véhicule de transport avec chauffeur, je peux :", choix: [{ lettre: "A", texte: "Rouler à petite vitesse dans les zones commerciales à la recherche de clients" }, { lettre: "B", texte: "Éviter de rentrer à mon siège social sous conditions", correct: true }, { lettre: "C", texte: "Prendre un client qui lève la main dans la rue" }] },
    { id: 26, type: "QCM", enonce: "L'inscription au registre des VTC donne lieu à :", choix: [{ lettre: "A", texte: "La publication du nom de l'entreprise dans la liste des exploitants VTC", correct: true }, { lettre: "B", texte: "La publication au bulletin officiel" }, { lettre: "C", texte: "Une délivrance d'une attestation d'inscription", correct: true }, { lettre: "D", texte: "Délivrance d'une note" }] },
    { id: 27, type: "QCM", enonce: "Quelle est l'ancienneté maximale d'un véhicule utilisé en exploitation VTC ?", choix: [{ lettre: "A", texte: "10 ans" }, { lettre: "B", texte: "3 ans" }, { lettre: "C", texte: "Il n'y a pas d'ancienneté maximale" }, { lettre: "D", texte: "7 ans", correct: true }] },
    { id: 28, type: "QCM", enonce: "Le ticket de réservation doit être établi :", choix: [{ lettre: "A", texte: "Sur support papier", correct: true }, { lettre: "B", texte: "Un engagement oral suffit" }, { lettre: "C", texte: "Sur support électronique", correct: true }] },
    { id: 29, type: "QCM", enonce: "Quelle est la durée de validité de l'attestation de perte en cas de perte du permis de conduire ?", choix: [{ lettre: "A", texte: "1 mois" }, { lettre: "B", texte: "2 mois", correct: true }, { lettre: "C", texte: "3 mois" }, { lettre: "D", texte: "4 mois" }] },
    { id: 30, type: "QCM", enonce: "Quelle est l'ancienneté minimale à respecter pour un véhicule thermique ?", choix: [{ lettre: "A", texte: "4 ans" }, { lettre: "B", texte: "5 ans" }, { lettre: "C", texte: "7 ans", correct: true }, { lettre: "D", texte: "Pas de conditions d'ancienneté" }] },
    { id: 31, type: "QCM", enonce: "Quel est le ministère qui gère le registre des VTC ?", choix: [{ lettre: "A", texte: "Ministère du tourisme" }, { lettre: "B", texte: "Ministère de l'intérieur" }, { lettre: "C", texte: "Ministère des transports", correct: true }, { lettre: "D", texte: "Ministère de l'économie" }] },
    { id: 32, type: "QCM", enonce: "Le ministère chargé des transports est compétent pour :", choix: [{ lettre: "A", texte: "Retirer les cartes professionnelles" }, { lettre: "B", texte: "Gérer les registres des exploitants VTC", correct: true }, { lettre: "C", texte: "Publier la liste de l'ensemble des exploitants VTC", correct: true }, { lettre: "D", texte: "Agréer les centres de formation" }] },
    { id: 33, type: "QCM", enonce: "Dans quel cas un bon de mission VTC n'est pas obligatoire ?", choix: [{ lettre: "A", texte: "Pour un transport TPMR" }, { lettre: "B", texte: "Pour le transport d'un colis" }, { lettre: "C", texte: "Il est toujours obligatoire", correct: true }, { lettre: "D", texte: "Si je réalise une mission en sous-traitance" }] },
    { id: 34, type: "QCM", enonce: "Que doit faire un chauffeur VTC à la fin de sa course s'il n'a pas d'autres réservations ?", choix: [{ lettre: "A", texte: "Stationner sur la voie publique en attente de clientèle" }, { lettre: "B", texte: "Retourner à l'établissement de l'exploitant ou stationner hors la voie publique", correct: true }, { lettre: "C", texte: "Stationner obligatoirement dans un parking professionnel" }] },
    { id: 35, type: "QCM", enonce: "Le portail REVTC ou registre des exploitants de VTC est utilisé pour :", choix: [{ lettre: "A", texte: "Créer un dossier d'exploitant (inscription) ou le mettre à jour", correct: true }, { lettre: "B", texte: "Mettre en relation des exploitants de VTC et des clients par les plateformes" }, { lettre: "C", texte: "Obtenir la carte professionnelle" }] },
    { id: 36, type: "QCM", enonce: "Vous exploitez un véhicule avec lunette arrière surteintée. Est-il obligatoire d'apposer le macaron REVTC ?", choix: [{ lettre: "A", texte: "Non, car il ne serait pas visible" }, { lettre: "B", texte: "Oui", correct: true }] },
    { id: 37, type: "QCM", enonce: "Le port de la ceinture de sécurité est-il obligatoire dans un véhicule VTC ?", choix: [{ lettre: "A", texte: "Uniquement pour le chauffeur" }, { lettre: "B", texte: "Oui, pour les passagers uniquement" }, { lettre: "C", texte: "Uniquement pour les enfants de moins de 2 ans" }, { lettre: "D", texte: "Oui, pour tous les occupants du véhicule", correct: true }] },
    { id: 38, type: "QCM", enonce: "Quelles mentions sont obligatoires sur un bon de commande ?", choix: [{ lettre: "A", texte: "Le numéro d'immatriculation du véhicule" }, { lettre: "B", texte: "Nom ou dénomination sociale et coordonnées de la société VTC" }, { lettre: "C", texte: "Le montant de la course", correct: true }, { lettre: "D", texte: "Date et heure de la réservation préalable effectuée par le client" }] },
    { id: 39, type: "QCM", enonce: "Que se passe-t-il si une entreprise de VTC exerce sans être inscrite au registre ?", choix: [{ lettre: "A", texte: "Elle doit s'inscrire dans les 4 jours qui suivent le contrôle" }, { lettre: "B", texte: "Elle doit passer par un tribunal", correct: true }, { lettre: "C", texte: "Elle ne peut pas s'inscrire pendant 10 ans" }, { lettre: "D", texte: "Il s'agit d'un délit avec des poursuites pénales", correct: true }] },
    { id: 40, type: "QCM", enonce: "Quel est le diamètre de la vignette VTC ?", choix: [{ lettre: "A", texte: "8 cm", correct: true }, { lettre: "B", texte: "12,5 cm" }, { lettre: "C", texte: "8,5 cm" }] },
  ]
};

const bilan_reglementation_vtc_locale: Matiere = {
  id: "bilan_reglementation_vtc2",
  nom: "G(V) - Développement Commercial (Marketing)",
  duree: 20,
  coefficient: 3,
  noteEliminatoire: 0,
  noteSur: 7,
  questions: [
    { id: 1, type: "QCM", enonce: "Quelle est la périodicité de la formation continue pour le T3P ?", choix: [{ lettre: "A", texte: "Tous les 2 ans" }, { lettre: "B", texte: "Tous les 5 ans", correct: true }, { lettre: "C", texte: "Jamais" }, { lettre: "D", texte: "Chaque année" }] },
    { id: 2, type: "QCM", enonce: "Quelle est la périodicité de la visite médicale d'un conducteur VTC de 50 ans ?", choix: [{ lettre: "A", texte: "Tous les ans" }, { lettre: "B", texte: "Tous les 2 ans" }, { lettre: "C", texte: "Tous les 5 ans", correct: true }] },
    { id: 3, type: "QCM", enonce: "Les conducteurs de VTC bénéficient-ils d'un régime particulier au niveau de la limitation de vitesse ?", choix: [{ lettre: "A", texte: "Pas de régime particulier", correct: true }, { lettre: "B", texte: "Oui, suivant l'accord conclu avec les autorités locales" }, { lettre: "C", texte: "Oui, selon le type de véhicule utilisé" }] },
    { id: 4, type: "QCM", enonce: "Quelle est l'autorité compétente organisatrice de l'examen du T3P ?", choix: [{ lettre: "A", texte: "Les centres de formation" }, { lettre: "B", texte: "La chambre de métiers et de l'artisanat" }, { lettre: "C", texte: "La chambre de commerce et d'industrie" }, { lettre: "D", texte: "La préfecture", correct: true }] },
    { id: 5, type: "QCM", enonce: "Pour l'activité VTC, la réservation préalable est :", choix: [{ lettre: "A", texte: "Facultative si le client est présent" }, { lettre: "B", texte: "Obligatoire", correct: true }, { lettre: "C", texte: "Obligatoire seulement pour les trajets de plus de 50 km" }] },
    { id: 6, type: "QCM", enonce: "Depuis l'arrêté du Août 2017, la durée minimum de la formation continue obligatoire des conducteurs de T3P est de :", choix: [{ lettre: "A", texte: "35 heures" }, { lettre: "B", texte: "7 heures", correct: true }, { lettre: "C", texte: "14 heures" }] },
    { id: 7, type: "QCM", enonce: "Le retrait de la carte professionnelle peut être effectué par :", choix: [{ lettre: "A", texte: "Le maire" }, { lettre: "B", texte: "Le président de la métropole" }, { lettre: "C", texte: "Le préfet de la région" }, { lettre: "D", texte: "Le préfet de police ou le préfet", correct: true }] },
  ]
};

export const bilanExamenVTC: ExamenBlanc = {
  id: "bilan-vtc",
  numero: 7,
  type: "VTC",
  titre: "Bilan Examen VTC",
  matieres: [
    bilan_t3p_taxi,
    bilan_gestion_taxi,
    bilan_securite_taxi,
    bilan_francais_taxi,
    bilan_anglais_taxi,
    bilan_reglementation_vtc_specifique,
    bilan_reglementation_vtc_locale,
  ]
};

// ===== BILAN EXAMEN TA (passerelle taxi pour VTC) =====
export const bilanExamenTA: ExamenBlanc = {
  id: "bilan-ta",
  numero: 8,
  type: "TAXI",
  titre: "Bilan Examen TA — Réglementation",
  matieres: [
    bilan_reglementation_taxi_specifique,
    bilan_reglementation_taxi_locale,
  ]
};

// ===== BILAN EXAMEN VA (passerelle VTC pour TAXI) =====
const bilan_dev_commercial_va: Matiere = {
  id: "bilan_dev_commercial",
  nom: "G - Développement Commercial (Marketing)",
  duree: 30,
  coefficient: 3,
  noteEliminatoire: 0,
  noteSur: BILAN_DEV_COMMERCIAL_QUESTIONS.length,
  questions: BILAN_DEV_COMMERCIAL_QUESTIONS,
};

export const bilanExamenVA: ExamenBlanc = {
  id: "bilan-va",
  numero: 9,
  type: "VTC",
  titre: "Bilan Examen VA — Développement Commercial & Réglementation Spécifique",
  matieres: [
    bilan_dev_commercial_va,
    bilan_reglementation_vtc_specifique,
  ]
};

// ===== EXAMENS BLANCS TA (Passerelle Taxi) — Réglementation Nationale + Locale =====

export const examenBlanc1TA: ExamenBlanc = {
  id: "eb1-ta", numero: 1, type: "TA",
  titre: "Examen Blanc N°1 - Passerelle TA",
  matieres: [matiere_reglementation_taxi_examen1, matiere_reglementation_taxi2_examen1]
};
export const examenBlanc2TA: ExamenBlanc = {
  id: "eb2-ta", numero: 2, type: "TA",
  titre: "Examen Blanc N°2 - Passerelle TA",
  matieres: [matiere_reglementation_taxi_examen2, matiere_reglementation_taxi2_examen2]
};
export const examenBlanc3TA: ExamenBlanc = {
  id: "eb3-ta", numero: 3, type: "TA",
  titre: "Examen Blanc N°3 - Passerelle TA",
  matieres: [matiere_reglementation_taxi_examen3, matiere_reglementation_taxi2_examen3]
};
export const examenBlanc4TA: ExamenBlanc = {
  id: "eb4-ta", numero: 4, type: "TA",
  titre: "Examen Blanc N°4 - Passerelle TA",
  matieres: [matiere_reglementation_taxi_examen4, matiere_reglementation_taxi2_examen4]
};
export const examenBlanc5TA: ExamenBlanc = {
  id: "eb5-ta", numero: 5, type: "TA",
  titre: "Examen Blanc N°5 - Passerelle TA",
  matieres: [matiere_reglementation_taxi_examen5, matiere_reglementation_taxi2_examen5]
};
export const examenBlanc6TA: ExamenBlanc = {
  id: "eb6-ta", numero: 6, type: "TA",
  titre: "Examen Blanc N°6 - Passerelle TA",
  matieres: [matiere_reglementation_taxi_examen6, matiere_reglementation_taxi2_examen6]
};

// ===== EXAMENS BLANCS VA (Passerelle VTC) — Dév. Commercial + Réglementation Spécifique VTC =====

export const examenBlanc1VA: ExamenBlanc = {
  id: "eb1-va", numero: 1, type: "VA",
  titre: "Examen Blanc N°1 - Passerelle VA",
  matieres: [matiere_reglementation_vtc_examen1, matiere_reglementation_vtc2_examen1]
};
export const examenBlanc2VA: ExamenBlanc = {
  id: "eb2-va", numero: 2, type: "VA",
  titre: "Examen Blanc N°2 - Passerelle VA",
  matieres: [matiere_reglementation_vtc_examen2, matiere_reglementation_vtc2_examen2]
};
export const examenBlanc3VA: ExamenBlanc = {
  id: "eb3-va", numero: 3, type: "VA",
  titre: "Examen Blanc N°3 - Passerelle VA",
  matieres: [matiere_reglementation_vtc_examen3, matiere_reglementation_vtc2_examen3]
};
export const examenBlanc4VA: ExamenBlanc = {
  id: "eb4-va", numero: 4, type: "VA",
  titre: "Examen Blanc N°4 - Passerelle VA",
  matieres: [matiere_reglementation_vtc_examen4, matiere_reglementation_vtc2_examen4]
};
export const examenBlanc5VA: ExamenBlanc = {
  id: "eb5-va", numero: 5, type: "VA",
  titre: "Examen Blanc N°5 - Passerelle VA",
  matieres: [matiere_reglementation_vtc_examen5, matiere_reglementation_vtc2_examen5]
};
export const examenBlanc6VA: ExamenBlanc = {
  id: "eb6-va", numero: 6, type: "VA",
  titre: "Examen Blanc N°6 - Passerelle VA",
  matieres: [matiere_reglementation_vtc_examen6, matiere_reglementation_vtc2_examen6]
};

export const tousLesExamens: ExamenBlanc[] = [
  examenBlanc1Taxi, examenBlanc1VTC,
  examenBlanc2Taxi, examenBlanc2VTC,
  examenBlanc3Taxi, examenBlanc3VTC,
  examenBlanc4Taxi, examenBlanc4VTC,
  examenBlanc5Taxi, examenBlanc5VTC,
  examenBlanc6Taxi, examenBlanc6VTC,
  examenBlanc1TA, examenBlanc2TA, examenBlanc3TA, examenBlanc4TA, examenBlanc5TA, examenBlanc6TA,
  examenBlanc1VA, examenBlanc2VA, examenBlanc3VA, examenBlanc4VA, examenBlanc5VA, examenBlanc6VA,
  bilanExamenTaxi, bilanExamenVTC, bilanExamenTA, bilanExamenVA,
];
