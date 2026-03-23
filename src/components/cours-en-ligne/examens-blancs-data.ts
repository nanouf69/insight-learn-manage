import { BILAN_T3P_QUESTIONS } from "./bilan-questions-t3p";
import { BILAN_GESTION_QUESTIONS } from "./bilan-questions-gestion";
import { BILAN_SECURITE_QUESTIONS } from "./bilan-questions-securite";
import { BILAN_FRANCAIS_QUESTIONS } from "./bilan-questions-francais";
import { BILAN_ANGLAIS_QUESTIONS } from "./bilan-questions-anglais";
import { BILAN_REGLEMENTATION_VTC_QUESTIONS } from "./bilan-questions-reglementation-vtc";
import { BILAN_DEV_COMMERCIAL_QUESTIONS } from "./bilan-questions-dev-commercial";
import {
  taxi_nationale_eb1, taxi_locale_eb1,
  taxi_nationale_eb2, taxi_locale_eb2,
  taxi_nationale_eb3, taxi_locale_eb3,
  taxi_nationale_eb4, taxi_locale_eb4,
  taxi_nationale_eb5, taxi_locale_eb5,
  taxi_nationale_eb6, taxi_locale_eb6,
} from "./examens-blancs-taxi-matieres";

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
  image?: string;
  choix?: Choix[];
  reponseQRC?: string;
  reponses_possibles?: string[];
  requiresCalcul?: boolean;
}

/**
 * Détecte automatiquement si une question QRC est de type "calcul"
 * en analysant l'énoncé et la réponse attendue.
 */
export function isCalculQuestion(q: Question): boolean {
  if (q?.type !== "QRC") return false;
  if (q.requiresCalcul === true) return true;
  if (q.requiresCalcul === false) return false;
  // Auto-detect: l'énoncé contient "calculez" ou la réponse contient des opérations arithmétiques
  const enonceLC = (q.enonce ?? "").toLowerCase();
  const reponseLC = (q.reponseQRC ?? "").toLowerCase();
  const hasCalculKeyword = /\bcalcul(ez|er|ons|)\b/.test(enonceLC) || /\bamortiss/i.test(enonceLC) || /\bvaleur comptable\b/.test(enonceLC);
  const hasArithmetic = /\d+\s*[\/×x\*\-\+]\s*\d+/.test(reponseLC) || /=\s*\d/.test(reponseLC);
  return hasCalculKeyword || hasArithmetic;
}

export interface Matiere {
  id: string;
  nom: string;
  duree: number; // en minutes
  coefficient: number;
  noteEliminatoire: number;
  noteSur: number;
  texteSupport?: string;
  texteSource?: string;
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
        { lettre: "A", texte: "3 ans", correct: true },
        { lettre: "B", texte: "2 ans", correct: true },
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
        { lettre: "A", texte: "99 ans", correct: true },
        { lettre: "B", texte: "5 ans", correct: true },
        { lettre: "C", texte: "10 ans", correct: true },
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
        { lettre: "D", texte: "15 jours", correct: true }
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
    },
    {
      id: 17, type: "QCM", enonce: "Lors de sa création, l'entreprise de Taxi ou de VTC doit s'inscrire :",
      choix: [
        { lettre: "A", texte: "À la chambre de métiers et de l'artisanat", correct: true },
        { lettre: "B", texte: "À la chambre de commerce et d'industrie" },
        { lettre: "C", texte: "À la chambre d'agriculture" }
      ]
    },
    {
      id: 18, type: "QCM", enonce: "Les revenus d'un chef d'entreprise individuelle sont imposés dans les catégories des :",
      choix: [
        { lettre: "A", texte: "RCM (revenus de capitaux mobiliers)" },
        { lettre: "B", texte: "BNC (bénéfices non commerciaux)" },
        { lettre: "C", texte: "IS (Impôts sur les sociétés)" },
        { lettre: "D", texte: "BIC (bénéfices industriels et commerciaux)", correct: true }
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
        { lettre: "C", texte: "15 jours", correct: true }
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
    },
    {
      id: 16, type: "QCM", enonce: "Mon permis porte la mention \"verres correcteurs\". Pour conduire, je peux porter des lentilles de contact :",
      choix: [
        { lettre: "A", texte: "Il est conseillé d'avoir des lunettes de rechange" },
        { lettre: "B", texte: "Oui", correct: true },
        { lettre: "C", texte: "Non", correct: true },
        { lettre: "D", texte: "Je dois avoir des lunettes de rechange à bord" }
      ]
    },
    {
      id: 17, type: "QCM", enonce: "Rouler à 120 km/h au lieu de 130 km/h permet de réduire les émissions de CO2 :",
      choix: [
        { lettre: "A", texte: "Non", correct: true },
        { lettre: "B", texte: "Oui", correct: true },
        { lettre: "C", texte: "Cela n'a aucun effet sur les émissions" }
      ]
    },
    {
      id: 18, type: "QCM", enonce: "Quelles infractions entraînent un retrait de 4 points du permis de conduire ?",
      choix: [
        { lettre: "A", texte: "Utilisation du téléphone en conduisant" },
        { lettre: "B", texte: "Circulation en sens interdit", correct: true },
        { lettre: "C", texte: "Stop glissé" },
        { lettre: "D", texte: "Non port de la ceinture de sécurité" }
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
  texteSupport: `Avec la démocratisation de l'automobile survenue en France après la première guerre mondiale, la voiture devint un symbole de liberté individuelle offrant à l'homme la possibilité de se déplacer rapidement et de façon autonome. Elle apparait comme un véritable raccourci du temps, modifiant les rapports spatiotemporels de l'individu.

Grâce à la vitesse, l'homme est en mesure de dépasser ses limites physiologiques ; en même temps, va se développer chez lui un sentiment de domination et de toute puissance. Par ailleurs, au travers de la typologie du véhicule, le conducteur a la possibilité d'exprimer son rang et sa réussite sociale. La voiture est donc vécue comme le prolongement de l'habitat, véritable sphère privée, dans laquelle le conducteur se sent protégé et à l'abri des pressions extérieures.

Ainsi tout « écart » intempestif est considéré comme une agression à la propriété privée, et le conducteur exacerbé choisit d'extérioriser ce débordement très souvent par un comportement agressif et incivique. Cette manière d'être manifeste l'attitude habituelle ou circonstanciée du conducteur. L'attitude est déterminée par la situation de conduite qui se présente. L'attitude est porteuse de sens, sinon d'intentions, ce qui a permis de mettre en évidence les différents comportements routiers : à risque et sécuritaire.`,
  texteSource: "Questions Vives Recherches en éducation Vol. 9 n° 19 | 2013 — Éducation routière, changement de comportement et formation à la conduite",
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
        { lettre: "C", texte: "You can only pay in Euro", correct: true }
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
        { lettre: "D", texte: "I've been a driver for 27 years" , correct: true }

      ]
    },
    {
      id: 16, type: "QCM", enonce: "J'ai un avion demain matin à 10h20. En anglais :",
      choix: [
        { lettre: "A", texte: "I have a plane tomorrow morning at twenty to ten" },
        { lettre: "B", texte: "I had a plane tomorrow evening at twenty to ten" },
        { lettre: "C", texte: "I have a plane tomorrow morning at twenty past ten", correct: true }
      ]
    },
    {
      id: 17, type: "QCM", enonce: "Which French monuments do you advise us to visit?",
      choix: [
        { lettre: "A", texte: "You can go by car or by train to visit them" },
        { lettre: "B", texte: "I don't see" },
        { lettre: "C", texte: "I think that the Louvres and the Reims Cathedral would be great", correct: true }
      ]
    },
    {
      id: 18, type: "QCM", enonce: "Sélectionnez la phrase correctement formulée :",
      choix: [
        { lettre: "A", texte: "There are a few pubs in Reims", correct: true },
        { lettre: "B", texte: "There is many pubs in Reims" },
        { lettre: "C", texte: "There is a few pubs in Reims" }
      ]
    },
    {
      id: 19, type: "QCM", enonce: "We will probably not make it on time. There's too much traffic. Traduisez :",
      choix: [
        { lettre: "A", texte: "Nous arriverons probablement en retard. Il y a trop de circulation", correct: true },
        { lettre: "B", texte: "Nous arriverons probablement en retard. Il y a beaucoup de ralentissement" },
        { lettre: "C", texte: "Nous arriverons probablement en retard. Il y a peu de circulation" }
      ]
    },
    {
      id: 20, type: "QCM", enonce: "Avec une circulation normale, il faut 45 minutes pour atteindre l'aéroport. En anglais :",
      choix: [
        { lettre: "A", texte: "With a normal circulation, It must forty five minutes for attend the airport" },
        { lettre: "B", texte: "In normal traffic, 45 minutes are needed for attent the airport" },
        { lettre: "C", texte: "With a normal traffic, it takes forty five minutes to get the airport", correct: true }
      ]
    }
  ]
};

// ===== MATIÈRE SPÉCIFIQUE TAXI =====
const matiere_reglementation_taxi_examen1: Matiere = {
  id: "reglementation_taxi",
  nom: "F(T) - Réglementation nationale TAXI",
  duree: 30,
  coefficient: 3,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    { id: 1, type: "QRC", enonce: "Développez le sigle TICPE.", reponseQRC: "Taxe Intérieure sur la Consommation des Produits Énergétiques.", reponses_possibles: ["taxe intérieure", "consommation", "produits énergétiques"] },
    { id: 2, type: "QRC", enonce: "Je veux passer mon véhicule professionnel en véhicule personnel pour la journée que dois-je faire ?", reponseQRC: "Bâcher le lumineux. Éteindre le taximètre. Retirer la carte professionnelle.", reponses_possibles: ["bâcher", "lumineux", "éteindre", "taximètre", "retirer", "carte professionnelle"] },
    { id: 3, type: "QRC", enonce: "Lorsqu'un titulaire ne peut exploiter lui-même son autorisation de stationnement, quelles sont les deux possibilités qui s'offrent à lui pour que son entreprise reste active ?", reponseQRC: "La location du véhicule taxi à un conducteur de taxi. L'emploi d'un salarié.", reponses_possibles: ["location", "conducteur de taxi", "emploi", "salarié"] },
    { id: 4, type: "QRC", enonce: "Quelles sont les différentes autorités administratives compétentes pour délivrer une ADS ?", reponseQRC: "Les mairies.", reponses_possibles: ["mairies", "maire"] },
    { id: 5, type: "QCM", enonce: "Dans le cadre d'une cession d'autorisation, la condition tenant à l'exploitation effective et continue est justifiée :", choix: [{ lettre: "A", texte: "par tout autre moyen défini par un arrêté de l'autorité compétente", correct: true }, { lettre: "B", texte: "par la copie de l'autorisation de stationnement" }, { lettre: "C", texte: "par la copie des déclarations de revenus ou d'avis d'imposition", correct: true }, { lettre: "D", texte: "par la copie de la carte grise du véhicule" }] },
    { id: 6, type: "QCM", enonce: "L'autorisation de stationnement délivrée postérieurement à la loi n°2014-1104 du 1er octobre 2014 :", choix: [{ lettre: "A", texte: "a une durée de validité de 5 ans" }, { lettre: "B", texte: "est cessible dans des conditions fixées par décret" }, { lettre: "C", texte: "est renouvelable dans des conditions fixées par décret", correct: true }, { lettre: "D", texte: "est cessible" }] },
    { id: 7, type: "QCM", enonce: "Quelle autorité est compétente pour délivrer les autorisations de stationnement sur les aéroports ?", choix: [{ lettre: "A", texte: "les présidents de chambres de métiers et de l'artisanat" }, { lettre: "B", texte: "les présidents de chambres de commerce et d'industrie" }, { lettre: "C", texte: "les préfets ou préfet de police dans leur zone de compétences", correct: true }, { lettre: "D", texte: "les maires" }] },
    { id: 8, type: "QCM", enonce: "Lorsque le client paye la course par carte bleue puis-je appliquer un supplément ?", choix: [{ lettre: "A", texte: "non", correct: true }, { lettre: "B", texte: "oui en accord avec le client" }, { lettre: "C", texte: "oui sous certaines conditions" }, { lettre: "D", texte: "oui" }] },
    { id: 9, type: "QCM", enonce: "Le véhicule taxi :", choix: [{ lettre: "A", texte: "peut être muni d'un terminal de paiement électronique selon la réglementation locale" }, { lettre: "B", texte: "doit être muni d'un terminal de paiement électronique", correct: true }, { lettre: "C", texte: "n'a pas l'obligation d'être muni d'un terminal de paiement électronique" }] },
    { id: 10, type: "QCM", enonce: "Un transport vers l'hôpital non pris en charge par la caisse d'assurance maladie peut être effectué :", choix: [{ lettre: "A", texte: "uniquement par les taxis non conventionnés" }, { lettre: "B", texte: "par tous les taxis", correct: true }, { lettre: "C", texte: "uniquement par les taxis conventionnés" }] },
    { id: 11, type: "QCM", enonce: "Je veux faire du transport scolaire avec mon véhicule taxi que dois-je faire ?", choix: [{ lettre: "A", texte: "afficher une pancarte transport d'enfants", correct: true }, { lettre: "B", texte: "avoir un accompagnateur", correct: true }, { lettre: "C", texte: "bâcher le lumineux", correct: true }, { lettre: "D", texte: "retirer la carte professionnelle" }] },
    { id: 12, type: "QCM", enonce: "Je mets en circulation un taxi de remplacement, quelle autorité dois-je aviser ?", choix: [{ lettre: "A", texte: "la préfecture, la chambre de métiers, le RSI ou la CPAM et le service des fraudes" }, { lettre: "B", texte: "la préfecture, la mairie de l'ADS remplacée, la CPAM et le service des fraudes" }, { lettre: "C", texte: "la préfecture, la chambre de métiers, la CPAM dans le cas d'un taxi conventionné et le service des fraudes", correct: true }] },
    { id: 13, type: "QCM", enonce: "Quelle est l'autorité compétente pour décider de l'usage de signe distinctif commun à l'ensemble des taxis ?", choix: [{ lettre: "A", texte: "l'autorité compétente est exclusivement le préfet" }, { lettre: "B", texte: "l'autorité compétente est exclusivement le maire" }, { lettre: "C", texte: "l'autorité compétente est celle qui délivre les autorisations de stationnement", correct: true }] },
    { id: 14, type: "QCM", enonce: "Si le client vous demande une facture vous devez lui fournir :", choix: [{ lettre: "A", texte: "l'original du ticket de l'imprimante et une facture", correct: true }, { lettre: "B", texte: "une facture et une copie du ticket de l'imprimante" }, { lettre: "C", texte: "une copie du ticket de l'imprimante" }, { lettre: "D", texte: "l'original du ticket de l'imprimante" }] }
  ]
};

const matiere_reglementation_taxi2_examen1: Matiere = {
  id: "reglementation_taxi2",
  nom: "G(T) - Connaissance du territoire et réglementation locale TAXI",
  duree: 20,
  coefficient: 3,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    { id: 1, type: "QRC", enonce: "Citez 4 stations de TAXI du 6ème arrondissement de Lyon.", reponseQRC: "Station Cours Vitton. Angle rue Masséna. Place du Général Leclerc. Entrée du parc de la Tête d'Or. Avenue du Général Brosset (Métro Brotteaux). Place du Maréchal Lyautey (Métro Foch).", reponses_possibles: ["Cours Vitton", "Général Leclerc", "Tête d'Or", "Brotteaux", "Maréchal Lyautey", "Masséna"] },
    { id: 2, type: "QRC", enonce: "Citez 4 mentions qui doivent être inscrites sur l'affichette TAXIS ?", reponseQRC: "Les taux horaires et kilométriques en vigueur. Les montants et conditions de la prise en charge et des suppléments. Les conditions de délivrance d'une note. L'information que le consommateur peut régler par carte bancaire. L'adresse de réclamation.", reponses_possibles: ["taux horaires", "kilométriques", "prise en charge", "suppléments", "carte bancaire", "réclamation"] },
    { id: 3, type: "QCM", enonce: "Que signifie le tarif A ?", choix: [{ lettre: "A", texte: "Course de jour" }, { lettre: "B", texte: "Trajet aller avec le client et retour en charge à la station" }, { lettre: "C", texte: "Course de nuit, dimanche et jours fériés ou route enneigée/verglacée" }, { lettre: "D", texte: "Trajet aller avec le client et retour à vide à la station", correct: true }] },
    { id: 4, type: "QCM", enonce: "Quel est le montant du supplément par passager ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "2.50 €" }, { lettre: "C", texte: "4 €", correct: true }, { lettre: "D", texte: "3 €" }] },
    { id: 5, type: "QCM", enonce: "Le supplément bagage est pour :", choix: [{ lettre: "A", texte: "Les valises au-delà de trois" }, { lettre: "B", texte: "Les valises au-delà de quatre" }, { lettre: "C", texte: "Les valises au-delà de cinq", correct: true }] },
    { id: 6, type: "QCM", enonce: "Où se situe le musée LUGDUNUM ?", choix: [{ lettre: "A", texte: "46 allées d'Italie 69005" }, { lettre: "B", texte: "2 rue Bichat 69005" }, { lettre: "C", texte: "63 rue Philippe de Lassalle 69005" }, { lettre: "D", texte: "17 rue Cléberg 69005", correct: true }] },
    { id: 7, type: "QCM", enonce: "Quel est le prix au km du tarif C ?", choix: [{ lettre: "A", texte: "2,31€" }, { lettre: "B", texte: "2€", correct: true }, { lettre: "C", texte: "2,28€" }, { lettre: "D", texte: "2,50€" }] },
    { id: 8, type: "QCM", enonce: "Où se situe la mairie de Villeurbanne ?", choix: [{ lettre: "A", texte: "5 place du Petit Collège 69100" }, { lettre: "B", texte: "6 place du Marché 69100" }, { lettre: "C", texte: "16 place Jean Macé 69100" }, { lettre: "D", texte: "place du Dr Lazarre Goujon 69100", correct: true }] }
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
        { lettre: "A", texte: "Tous les ans", correct: true },
        { lettre: "B", texte: "Tous les 5 ans", correct: true },
        { lettre: "C", texte: "Tous les 3 ans" },
        { lettre: "D", texte: "Elle est permanente" }
      ]
    }
  ]
};

const eb1Matieres: Matiere[] = [
  {
    id: "t3p",
    nom: "A - Transport Public Particulier de Personnes (T3P)",
    duree: 45,
    coefficient: 3,
    noteEliminatoire: 6,
    noteSur: 36,
    questions: [
      {
        id: 1,
        type: "QRC",
        enonce: "Je me fais contrôler sur la route quels documents communs aux trois professions dois-je présenter aux forces de l'ordre ? (QRC)",
        reponseQRC: "Le permis de conduire. La carte professionnelle. L'attestation de formation continue. Certificat médical. L'attestation d'assurance du véhicule. Attestation de responsabilité civile professionnelle (RCP - Transport de personnes à titre onéreux).",
        reponses_possibles: ["permis de conduire", "carte professionnelle", "attestation de formation", "certificat médical", "assurance", "responsabilité civile"],
      },
      {
        id: 2,
        type: "QRC",
        enonce: "Qu'est-ce que l'honorabilité dans votre profession ?... (QRC)",
        reponseQRC: "Avoir le casier judiciaire B2 vierge",
        reponses_possibles: [
          "Avoir le casier judiciaire B2 vierge",
          "Casier judiciaire b2 vierge",
          "Casier vierge b2",
          "C’est avoir le casier b2 vierge.",
        ],
      },
      {
        id: 3,
        type: "QRC",
        enonce: "Que devez-vous présenter aux agents susceptibles d'effectuer des contrôles pour justifier d'une réservation préalable ? (QRC)",
        reponseQRC: "Un document écrit sur papier ou support électronique.",
      },
      {
        id: 4,
        type: "QRC",
        enonce: "Citez trois des conditions d'accès et ou d'exercice aux professions de conducteurs de T3P : (QRC)",
        reponseQRC: "Réussite à l'examen (vérification de l'aptitude professionnelle). Carte professionnelle en cours de validité Formation continue. Aptitude médicale. Honorabilité. Assurance responsabilité civile professionnelle. Respect de caractéristiques techniques des véhicules (contrôle technique - et le cas échéant puissance, dimension, équipement spéciaux).",
      },
      {
        id: 5,
        type: "QRC",
        enonce: "Quelles sont les sanctions possibles qui peuvent être décidées par les commissions disciplinaires locales ? (QRC)",
        reponseQRC: "Un avertissement. Un retrait temporaire Un retrait définitif de la carte professionnelle.",
      },
      {
        id: 6,
        type: "QCM",
        enonce: "Quelles sont les conditions requises pour pouvoir passer l'examen de T3P ?",
        choix: [
          { lettre: "A", texte: "avoir son permis de conduire depuis plus de 5 ans" },
          { lettre: "B", texte: "avoir 10 points minimum sur son permis de conduire" },
          { lettre: "C", texte: "casier judiciaire B2 vierge" , correct: true },
        ],
      },
      {
        id: 7,
        type: "QCM",
        enonce: "Quelles sont les sanctions possibles en cas d'exercice illégale d'une des professions du T3P ?",
        choix: [
          { lettre: "A", texte: "une amende de 30 000 € et un deux ans d’emprisonnement" },
          { lettre: "B", texte: "une amende de 15 000 € et un an d’emprisonnement" , correct: true },
          { lettre: "C", texte: "une amende de 1 500 € et six mois d’emprisonnement" },
        ],
      },
      {
        id: 8,
        type: "QCM",
        enonce: "Pour effectuer du T3P le véhicule doit :",
        choix: [
          { lettre: "A", texte: "être de couleur blanche" },
          { lettre: "B", texte: "avoir des tailles de pneumatiques fixées par décret" },
          { lettre: "C", texte: "avoir une signalétique distinctive" , correct: true },
        ],
      },
      {
        id: 9,
        type: "QCM",
        enonce: "Parmi les entreprises du T3P, quelles sont celles qui sont soumises à l'obligation de s'assurer en responsabilité civile professionnelle ?",
        choix: [
          { lettre: "A", texte: "VTC et 2 ou 3 roues" },
          { lettre: "B", texte: "le taxi, VTC et 2 ou 3 roues seulement" , correct: true },
          { lettre: "C", texte: "le taxi seulement" },
          { lettre: "D", texte: "le taxi et le VTC seulement" },
        ],
      },
      {
        id: 10,
        type: "QCM",
        enonce: "Qui délivrent les agréments aux centres de formation ?",
        choix: [
          { lettre: "A", texte: "les conseils départementaux" },
          { lettre: "B", texte: "l’association permanente des chambres de métiers et de l’artisanat" },
          { lettre: "C", texte: "les préfectures" , correct: true },
          { lettre: "D", texte: "le ministère des transports pour les VTC, le ministère de l’environnement pour les 2 ou 3 roues, le ministère de l’intérieur pour les taxis" },
        ],
      },
      {
        id: 11,
        type: "QCM",
        enonce: "Qui préside la commission locale du T3P ?",
        choix: [
          { lettre: "A", texte: "le représentant de chaque collège à tour de rôle" },
          { lettre: "B", texte: "le préfet ou son représentant" , correct: true },
          { lettre: "C", texte: "le directeur des transports du département" },
          { lettre: "D", texte: "le Président de la chambre de métiers" , correct: true },
        ],
      },
      {
        id: 12,
        type: "QCM",
        enonce: "Quelle est la durée du mandat des membres de la commission locale des T3P ?",
        choix: [
          { lettre: "A", texte: "3 ans", correct: true },
          { lettre: "B", texte: "2 ans", correct: true },
          { lettre: "C", texte: "5 ans", correct: true },
          { lettre: "D", texte: "1 an" },
        ],
      },
      {
        id: 13,
        type: "QCM",
        enonce: "Un client avec une prescription médicale sera remboursé de son transport s'il utilise :",
        choix: [
          { lettre: "A", texte: "un taxi conventionné ou un VTC conventionné" },
          { lettre: "B", texte: "un VTC conventionné ou un taxi moto conventionné" },
          { lettre: "C", texte: "un taxi conventionné ou un Taxi moto conventionné ou un VTC conventionné" },
          { lettre: "D", texte: "un taxi conventionné" , correct: true },
        ],
      },
      {
        id: 14,
        type: "QCM",
        enonce: "Quels agents sont habilités à effectuer un contrôle routier de conducteur de T3P ?",
        choix: [
          { lettre: "A", texte: "les agents représentant la SNCF" },
          { lettre: "B", texte: "les gendarmes" , correct: true },
          { lettre: "C", texte: "le juge du tribunal d’instance" },
          { lettre: "D", texte: "les policiers" , correct: true },
        ],
      },
      {
        id: 15,
        type: "QCM",
        enonce: "Parmi les condamnations suivantes, lesquelles peuvent être mentionnées au bulletin n° 2 du casier judiciaire ?",
        choix: [
          { lettre: "A", texte: "transporter et déposer des objets, déchets, liquides insalubres en un lieu sans l’autorisation de la personne ayant la jouissance du lieu" },
          { lettre: "B", texte: "conduire avec un taux d’alcool dans le sang de 0,8 gramme par litre ou plus", correct: true },
          { lettre: "C", texte: "transporter un appareil permettant de déceler la présence de systèmes servant à la constatation des infractions à la législation, ou à la réglementation de la circulation routière" },
          { lettre: "D", texte: "poursuivre sa route, en connaissance de cause, après avoir occasionné un accident", correct: true },
        ],
      },
    ],
  },
  {
    id: "gestion",
    nom: "B - Gestion",
    duree: 45,
    coefficient: 3,
    noteEliminatoire: 6,
    noteSur: 36,
    questions: [
      {
        id: 1,
        type: "QRC",
        enonce: "Citez deux régimes de base de la protection sociale en France.(QRC)",
        reponseQRC: "Régimes spéciaux",
        reponses_possibles: [
          "Régimes spéciaux",
          "Régime général régime agricole",
        ],
      },
      {
        id: 2,
        type: "QRC",
        enonce: "Développez les sigles URSSAF.",
        reponseQRC: "URSSAF : union de recouvrement des cotisations de sécurité sociale et d'allocations familiales",
      },
      {
        id: 3,
        type: "QCM",
        enonce: "A l'actif du bilan figure :",
        choix: [
          { lettre: "A", texte: "les créances des clients" , correct: true },
          { lettre: "B", texte: "le capital" },
          { lettre: "C", texte: "le bénéfice de l'année" },
        ],
      },
      {
        id: 4,
        type: "QCM",
        enonce: "Quelle mention n'est pas obligatoire sur le bulletin de salaire ?",
        choix: [
          { lettre: "A", texte: "le montant net à payer" },
          { lettre: "B", texte: "le diplôme du salarié" , correct: true },
          { lettre: "C", texte: "la convention collective applicable" },
        ],
      },
      {
        id: 5,
        type: "QCM",
        enonce: "La SAS est sur le plan juridique :",
        choix: [
          { lettre: "A", texte: "une personne juridique" },
          { lettre: "B", texte: "une personne morale" , correct: true },
          { lettre: "C", texte: "une personne professionnelle" },
          { lettre: "D", texte: "une personne physique" },
        ],
      },
      {
        id: 6,
        type: "QCM",
        enonce: "Dans un bilan comptable, un amortissement fait baisser :",
        choix: [
          { lettre: "A", texte: "les charges" },
          { lettre: "B", texte: "le bénéfice" , correct: true },
          { lettre: "C", texte: "l’imposition" , correct: true },
        ],
      },
      {
        id: 7,
        type: "QCM",
        enonce: "La libération totale du capital social dans une société à responsabilité limitée (SARL) doit intervenir au plus tard dans un délai de :",
        choix: [
          { lettre: "A", texte: "99 ans", correct: true },
          { lettre: "B", texte: "5 ans" , correct: true },
          { lettre: "C", texte: "10 ans", correct: true },
          { lettre: "D", texte: "1 an" },
        ],
      },
      {
        id: 8,
        type: "QCM",
        enonce: "Les montants figurant dans le compte de résultat sont :",
        choix: [
          { lettre: "A", texte: "HT" },
          { lettre: "B", texte: "TTC" },
          { lettre: "C", texte: "BIC" , correct: true },
        ],
      },
      {
        id: 9,
        type: "QCM",
        enonce: "Au 1er janvier 2016, j'achète un véhicule 20 000 € HT amortissable sur 4 ans, un ordinateur portable 600 € HT amortissable sur 3 ans. Quel sera le montant de la dotation d'amortissement déductible sur les charges d'entreprise en 2017 ?",
        choix: [
          { lettre: "A", texte: "5 300 €" },
          { lettre: "B", texte: "5 200 €" , correct: true },
          { lettre: "C", texte: "10 400 €" },
          { lettre: "D", texte: "4 198 €" },
        ],
      },
      {
        id: 10,
        type: "QCM",
        enonce: "Existe-t-il une durée minimale pour un contrat à durée déterminée ?",
        choix: [
          { lettre: "A", texte: "1 mois" },
          { lettre: "B", texte: "pas de durée minimale" , correct: true },
          { lettre: "C", texte: "7 jours" },
          { lettre: "D", texte: "15 jours", correct: true },
        ],
      },
      {
        id: 11,
        type: "QCM",
        enonce: "Pour une entreprise sous statut SARL, la TVA est :",
        choix: [
          { lettre: "A", texte: "une charge financière" },
          { lettre: "B", texte: "une charge" },
          { lettre: "C", texte: "un mouvement de trésorerie" , correct: true },
          { lettre: "D", texte: "un produit" },
        ],
      },
      {
        id: 12,
        type: "QCM",
        enonce: "Quelle est la dépense qui ne constitue pas une charge pour l'entreprise ?",
        choix: [
          { lettre: "A", texte: "intérêt d'un prêt professionnel" },
          { lettre: "B", texte: "abonnement à une revue professionnelle" },
          { lettre: "C", texte: "remboursement du capital d'un prêt professionnel" , correct: true },
        ],
      },
      {
        id: 13,
        type: "QCM",
        enonce: "Je peux être gérant minoritaire d'une entreprise individuelle ?",
        choix: [
          { lettre: "A", texte: "sous certaines conditions" },
          { lettre: "B", texte: "oui" },
          { lettre: "C", texte: "non" , correct: true },
        ],
      },
      {
        id: 14,
        type: "QCM",
        enonce: "Quel statut du conjoint du chef d'entreprise ne convient pas à l'entreprise individuelle ?",
        choix: [
          { lettre: "A", texte: "conjoint salarié" },
          { lettre: "B", texte: "conjoint hors statut" },
          { lettre: "C", texte: "conjoint associé" , correct: true },
          { lettre: "D", texte: "conjoint collaborateur" },
        ],
      },
      {
        id: 15,
        type: "QCM",
        enonce: "Vous empruntez 25 000 € sur une durée de 5 ans ; l'annuité est de 5 600 €. Quel le coût de l'emprunt ?",
        choix: [
          { lettre: "A", texte: "4200 €" },
          { lettre: "B", texte: "3000 €" , correct: true },
          { lettre: "C", texte: "3600 €" },
        ],
      },
      {
        id: 16,
        type: "QCM",
        enonce: "Qu'est-ce qu'un chiffre d'affaires ?",
        choix: [
          { lettre: "A", texte: "l’argent qui reste en banque après avoir payé toutes les charges" },
          { lettre: "B", texte: "l’ensemble des commandes ou devis" },
          { lettre: "C", texte: "l’ensemble des sommes facturées aux clients" , correct: true },
          { lettre: "D", texte: "la différence entre les produits et les charges" },
        ],
      },
      {
        id: 17,
        type: "QCM",
        enonce: "Lors de sa création, l'entreprise de Taxi ou de VTC doit s'inscrire",
        choix: [
          { lettre: "A", texte: "à la chambre de métiers et de l’artisanat" , correct: true },
          { lettre: "B", texte: "à la chambre de commerce et d’industrie" },
          { lettre: "C", texte: "à la chambre d’agriculture" },
        ],
      },
      {
        id: 18,
        type: "QCM",
        enonce: "Les revenus d'un chef d'entreprise individuelle sont imposés dans les catégories des",
        choix: [
          { lettre: "A", texte: "RCM (revenus de capitaux mobiliers)" },
          { lettre: "B", texte: "BNC (bénéfices non commerciaux)" },
          { lettre: "C", texte: "IS (Impôts sur les sociétés)" },
          { lettre: "D", texte: "BIC (bénéfices industriels et commerciaux)" , correct: true },
        ],
      },
    ],
  },
  {
    id: "securite",
    nom: "C - Sécurité routière",
    duree: 30,
    coefficient: 2,
    noteEliminatoire: 4,
    noteSur: 24,
    questions: [
      {
        id: 1,
        type: "QCM",
        enonce: "Ce panneau m'indique :",
        image: "/cours/examens/panneau-stationnement-interdit.png",
        choix: [
          { lettre: "A", texte: "Un stationnement à durée limitée" },
          { lettre: "B", texte: "Que du 1er au 15 de chaque mois, le stationnement est autorisé du coté des numéros impairs des immeubles bordant la rue", correct: true },
          { lettre: "C", texte: "Que du 1 er au 15 de chaque mois, le stationnement est autorisé du coté des numéros pairs des immeubles bordant la rue" },
        ],
      },
      {
        id: 2,
        type: "QCM",
        enonce: "Pour faire établir une nouvelle carte grise lors d'un changement de domicile, le propriétaire dispose de :",
        choix: [
          { lettre: "A", texte: "3 semaines" },
          { lettre: "B", texte: "1 mois" , correct: true },
          { lettre: "C", texte: "15 jours", correct: true },
        ],
      },
      {
        id: 3,
        type: "QCM",
        enonce: "En agglomération éclairée la nuit :",
        choix: [
          { lettre: "A", texte: "Je dois rouler en feux de croisement" },
          { lettre: "B", texte: "Je peux rouler en feux de position" , correct: true },
          { lettre: "C", texte: "Je peux rouler en feux de croisement" , correct: true },
          { lettre: "D", texte: "Je peux rouler sans feux" },
        ],
      },
      {
        id: 4,
        type: "QCM",
        enonce: "Sur les routes à 2x2 voies séparées par une ligne continue, la vitesse est limitée à :",
        choix: [
          { lettre: "A", texte: "90 km/h" , correct: true },
          { lettre: "B", texte: "110 km/h", correct: true },
          { lettre: "C", texte: "130 km/h" },
        ],
      },
      {
        id: 5,
        type: "QCM",
        enonce: "Les éléments qui favorisent le risque d'aquaplanage sont :",
        choix: [
          { lettre: "A", texte: "Une grande quantité d'eau sur la chaussée" , correct: true },
          { lettre: "B", texte: "Une vitesse élevée" , correct: true },
          { lettre: "C", texte: "Une route sèche" },
          { lettre: "D", texte: "Un fort vent latéral" },
        ],
      },
      {
        id: 6,
        type: "QCM",
        enonce: "En agglomération, à quelle distance d'un danger les panneaux de signalisation sont-ils placés ?",
        choix: [
          { lettre: "A", texte: "100 m" },
          { lettre: "B", texte: "40 m" },
          { lettre: "C", texte: "50 m" , correct: true },
          { lettre: "D", texte: "30 m" },
        ],
      },
      {
        id: 7,
        type: "QCM",
        enonce: "La roue de secours est-elle obligatoire dans une voiture ?",
        choix: [
          { lettre: "A", texte: "Non, la règlementation francaise ne l'impose pas" , correct: true },
          { lettre: "B", texte: "Oui, il s'agit d'un équipement de sécurité" },
          { lettre: "C", texte: "Oui, il s'agit d'une obligation européenne" },
        ],
      },
      {
        id: 8,
        type: "QCM",
        enonce: "Que faut-il faire en cas d'incendie dans un tunnel ?",
        choix: [
          { lettre: "A", texte: "Réduire la distance de sécurité à l'arrêt pour faciliter l'accès des secours" },
          { lettre: "B", texte: "Faire un demi-tour avec son véhicule pour fuir au plus vite" },
          { lettre: "C", texte: "Laisser les clefs de contact sur le véhicule, après avoir eteint le moteur" , correct: true },
          { lettre: "D", texte: "Evacuer le tunnel par l'issue de secours la plus proche" , correct: true },
        ],
      },
      {
        id: 9,
        type: "QCM",
        enonce: "Mon permis de conduire porte la mention \"verres correcteurs\" : pour conduire je peux porter des lentilles de contact :",
        choix: [
          { lettre: "A", texte: "Il est conseillé d'avoir à bord de mon véhicule des lunettes de rechange" , correct: true },
          { lettre: "B", texte: "Oui" , correct: true },
          { lettre: "C", texte: "Non", correct: true },
          { lettre: "D", texte: "Je dois avoir des lunettes de rechange à bord de mon véhicule" },
        ],
      },
      {
        id: 10,
        type: "QCM",
        enonce: "En roulant à une vitesse de 90 km/h, un conducteur doit laisser une distance de sécurité de :",
        choix: [
          { lettre: "A", texte: "20 mètres environ" },
          { lettre: "B", texte: "80 mètres environ" },
          { lettre: "C", texte: "50 mètres environ" , correct: true },
          { lettre: "D", texte: "30 mètres environ" },
        ],
      },
      {
        id: 11,
        type: "QCM",
        enonce: "Conduisant durant une période de suspension du permis de conduire :",
        choix: [
          { lettre: "A", texte: "Je commets un délit" , correct: true },
          { lettre: "B", texte: "Je risque un retrait de 6 points de mon permis de conduire" , correct: true },
          { lettre: "C", texte: "Il ne peut pas y avoir de retrait de point" },
        ],
      },
      {
        id: 12,
        type: "QCM",
        enonce: "Je dépasse un cycliste hors agglomération, je dois laisser un espace de sécurité :",
        choix: [
          { lettre: "A", texte: "de 2.50 m" },
          { lettre: "B", texte: "de 1 m" },
          { lettre: "C", texte: "de 1.5 m" , correct: true },
        ],
      },
      {
        id: 13,
        type: "QCM",
        enonce: "Rouler à 120 km/h au lieu de 130 km/h permet de réduire les émissions de gaz carbonique (CO2) :",
        choix: [
          { lettre: "A", texte: "Non", correct: true },
          { lettre: "B", texte: "Oui" , correct: true },
          { lettre: "C", texte: "Cela n'a aucun effet sur les émissions de gaz carbonique" },
        ],
      },
      {
        id: 14,
        type: "QCM",
        enonce: "En cas de non-paiement, une amende forfaitaire devient majorée à l'issue d'un délai de",
        choix: [
          { lettre: "A", texte: "30 jours" },
          { lettre: "B", texte: "40 jours" },
          { lettre: "C", texte: "45 jours" , correct: true },
        ],
      },
      {
        id: 15,
        type: "QCM",
        enonce: "Ce pictogramme, qui figure sur des boites de médicaments, signifie :",
        image: "/cours/examens/pictogramme-niveau3.png",
        choix: [
          { lettre: "A", texte: "Soyez très prudent. Ne pas conduire sans l’avis d’un professionnel de santé" },
          { lettre: "B", texte: "Attention, danger : ne pas conduire. Pour la reprise de la conduite, demandez l’avis d’un médecin" , correct: true },
          { lettre: "C", texte: "Soyez prudent. Ne pas conduire sans avoir lu la notice" },
        ],
      },
      {
        id: 16,
        type: "QCM",
        enonce: "Dans cette liste d'infractions, quelles sont celles qui entrainent un retrait de 4 points du permis de conduire ?",
        choix: [
          { lettre: "A", texte: "Utilisation du téléphone en conduisant" },
          { lettre: "B", texte: "Circulation en sens interdit" , correct: true },
          { lettre: "C", texte: "Stop glissé" , correct: true },
          { lettre: "D", texte: "Non port de la ceinture de sécurité" },
        ],
      },
      {
        id: 17,
        type: "QCM",
        enonce: "Hors agglomération, à quelle distance d'un danger les panneaux de signalisation sont-ils placés ?",
        choix: [
          { lettre: "A", texte: "50 m" },
          { lettre: "B", texte: "200 m" },
          { lettre: "C", texte: "100 m" },
          { lettre: "D", texte: "150 m" , correct: true },
        ],
      },
      {
        id: 18,
        type: "QCM",
        enonce: "Les témoins sur le tableaux de bord du véhicule qui alertent le conducteur d’une urgence mécanique sont de couleur :",
        choix: [
          { lettre: "A", texte: "Bleue" },
          { lettre: "B", texte: "Rouge", correct: true },
          { lettre: "C", texte: "Orange" },
          { lettre: "D", texte: "Verte" },
        ],
      },
      {
        id: 19,
        type: "QCM",
        enonce: "Un permis B, permet de transporter au maximum :",
        choix: [
          { lettre: "A", texte: "7 passagers" },
          { lettre: "B", texte: "6 passagers" },
          { lettre: "C", texte: "9 passagers" },
          { lettre: "D", texte: "8 passagers" , correct: true },
        ],
      },
      {
        id: 20,
        type: "QCM",
        enonce: "Si mon temps de réaction augmente :",
        choix: [
          { lettre: "A", texte: "La distance de réaction augmente", correct: true },
          { lettre: "B", texte: "La distance d'arrêt augmente", correct: true },
          { lettre: "C", texte: "La distance de freinage augmente" },
          { lettre: "D", texte: "La distance d'arrêt est inchangée" },
        ],
      },
    ],
  },
  {
    id: "francais",
    nom: "D - Capacité d'expression et de compréhension en langue française",
    duree: 30,
    coefficient: 2,
    noteEliminatoire: 5,
    noteSur: 24,
    texteSupport: `Avec la démocratisation de l'automobile survenue en France après la première guerre mondiale, la voiture devint un symbole de liberté individuelle offrant à l'homme la possibilité de se déplacer rapidement et de façon autonome. Elle apparait comme un véritable raccourci du temps, modifiant les rapports spatiotemporels de l'individu.

Grâce à la vitesse, l'homme est en mesure de dépasser ses limites physiologiques ; en même temps, va se développer chez lui un sentiment de domination et de toute puissance. Par ailleurs, au travers de la typologie du véhicule, le conducteur a la possibilité d'exprimer son rang et sa réussite sociale. La voiture est donc vécue comme le prolongement de l'habitat, véritable sphère privée, dans laquelle le conducteur se sent protégé et à l'abri des pressions extérieures.

Ainsi tout « écart » intempestif est considéré comme une agression à la propriété privée, et le conducteur exacerbé choisit d'extérioriser ce débordement très souvent par un comportement agressif et incivique. Cette manière d'être manifeste l'attitude habituelle ou circonstanciée du conducteur. L'attitude est déterminée par la situation de conduite qui se présente. L'attitude est porteuse de sens, sinon d'intentions, ce qui a permis de mettre en évidence les différents comportements routiers : à risque et sécuritaire.`,
    texteSource: "Questions Vives Recherches en éducation Vol. 9 n° 19 | 2013 — Éducation routière, changement de comportement et formation à la conduite",
    questions: [
      {
        id: 1,
        type: "QRC",
        enonce: "Selon l’auteur, comment peut‐on expliquer le comportement agressif de certains automobilistes ?",
        reponseQRC: "La voiture est vécue comme une sphere privée comme le prolongement de l'habitat ce qui explique des comportements agressifs",
        reponses_possibles: [
          "La voiture est vécue comme une sphere privée comme le prolongement de l'habitat ce qui explique des comportements agressifs",
          "La voiture est vécue comme le prolongement de l’habitat, véritable sphère privée, dans laquelle le conducteur se sent protégé et à l’abri des pressions extérieures.Ainsi tout « écart » intempestif est considéré comme une agression à la propriété privée, et le conducteur exacerbé choisit d’extérioriser ce débordement très souvent par un comportement agressif et incivique.",
        ],
      },
      {
        id: 2,
        type: "QRC",
        enonce: "Qu’est-ce qui a permis de mettre en évidence les différents comportements routiers ?",
        reponseQRC: "L’attitude est porteuse de sens, sinon d’intentions, ce qui a permis de mettre en évidence les différents comportements routiers",
      },
      {
        id: 3,
        type: "QRC",
        enonce: "Disposer d’une voiture est synonyme d’avantage selon vous développer votre réponse ?",
        reponseQRC: "oui : raccourcir le temps de trajet, mais cela crée des comportements aggréssifis, pollution,accidents....",
      },
      {
        id: 4,
        type: "QCM",
        enonce: "Selon l’auteur, après quel événement l’automobile est devenue symbole de liberté individuelle ?",
        choix: [
          { lettre: "A", texte: "Après la démocratisation" },
          { lettre: "B", texte: "Après la première guerre mondiale" , correct: true },
          { lettre: "C", texte: "Après la révolution industrielle" },
        ],
      },
      {
        id: 5,
        type: "QCM",
        enonce: "Que signifie l’expression « conducteur exacerbé » employée par l’auteur ?",
        choix: [
          { lettre: "A", texte: "Le conducteur est désorienté" },
          { lettre: "B", texte: "Le conducteur éprouve une forte colère" , correct: true },
          { lettre: "C", texte: "Le conducteur est paisible" },
        ],
      },
      {
        id: 6,
        type: "QCM",
        enonce: "Que signifie la voiture après la 1ère guerre mondiale ?",
        choix: [
          { lettre: "A", texte: "La liberté" , correct: true },
          { lettre: "B", texte: "La contrainte" },
          { lettre: "C", texte: "Un danger" },
        ],
      },
      {
        id: 7,
        type: "QCM",
        enonce: "La voiture permet :",
        choix: [
          { lettre: "A", texte: "De raccourcir le temps de trajet" , correct: true },
          { lettre: "B", texte: "De modifier les rapports spatiotemporels de la personne" , correct: true },
          { lettre: "C", texte: "De montrer que l’on est riche" },
        ],
      },
      {
        id: 8,
        type: "QCM",
        enonce: "D’après le texte disposer une voiture pour l’homme signifie :",
        choix: [
          { lettre: "A", texte: "Etre intelligent" },
          { lettre: "B", texte: "Etre fort" , correct: true },
          { lettre: "C", texte: "Etre beau" },
        ],
      },
      {
        id: 9,
        type: "QCM",
        enonce: "Quelles sont les autres fonctions de la voiture citées dans le texte :",
        choix: [
          { lettre: "A", texte: "Elle permet d’afficher son rang" , correct: true },
          { lettre: "B", texte: "Elle permet d’afficher sa réussite sociale" , correct: true },
          { lettre: "C", texte: "Elle permet de gagner beaucoup d’argent" },
        ],
      },
      {
        id: 10,
        type: "QCM",
        enonce: "La voiture est vue :",
        choix: [
          { lettre: "A", texte: "Comme une chose personnelle" , correct: true },
          { lettre: "B", texte: "Comme un objet public" },
        ],
      },
    ],
  },
  {
    id: "anglais",
    nom: "E - Capacité d'expression et de compréhension en langue anglaise",
    duree: 20,
    coefficient: 1,
    noteEliminatoire: 4,
    noteSur: 20,
    questions: [
      {
        id: 1,
        type: "QCM",
        enonce: "Which currency can I use to pay for the trip ?",
        choix: [
          { lettre: "A", texte: "I only accept cash and card" },
          { lettre: "B", texte: "It's possible to pay by cheques" },
          { lettre: "C", texte: "You can only pay in Euro" , correct: true },
        ],
      },
      {
        id: 2,
        type: "QCM",
        enonce: "Sorry ! It's quite expensive for us. May we get a ....................... price ?",
        choix: [
          { lettre: "A", texte: "Less" },
          { lettre: "B", texte: "Reduction" },
          { lettre: "C", texte: "Lower" , correct: true },
          { lettre: "D", texte: "Gooder" },
        ],
      },
      {
        id: 3,
        type: "QCM",
        enonce: "Are you sure it is the shortest way ?",
        choix: [
          { lettre: "A", texte: "Vous vous êtes trompé d'adresse" },
          { lettre: "B", texte: "Je ne suis pas certain que ce soit le bon endroit" },
          { lettre: "C", texte: "Etes-vous sur de prendre le chemin le plus court ?" , correct: true },
        ],
      },
      {
        id: 4,
        type: "QCM",
        enonce: "France has ......... places to visit",
        choix: [
          { lettre: "A", texte: "Lots of" },
          { lettre: "B", texte: "A lot of" , correct: true },
          { lettre: "C", texte: "A many" },
        ],
      },
      {
        id: 5,
        type: "QCM",
        enonce: "Ma voiture ne demarre pas",
        choix: [
          { lettre: "A", texte: "My car doesn't start" , correct: true },
          { lettre: "B", texte: "My car won't start" },
          { lettre: "C", texte: "My car didn't start" },
        ],
      },
      {
        id: 6,
        type: "QCM",
        enonce: "J'ai un avion demain matin à 10h20",
        choix: [
          { lettre: "A", texte: "I have a plane tomorrow morning at twenty to ten" },
          { lettre: "B", texte: "I had a plane tomorrow evening at twenty to ten" },
          { lettre: "C", texte: "I have a plane tomorrow morning at twenty past ten" , correct: true },
        ],
      },
      {
        id: 7,
        type: "QCM",
        enonce: "Votre séjour s'est-il bien passé ?",
        choix: [
          { lettre: "A", texte: "Where would you like to go ?" },
          { lettre: "B", texte: "Did you enjoy your stay ?" , correct: true },
          { lettre: "C", texte: "How was your trip ?" },
        ],
      },
      {
        id: 8,
        type: "QCM",
        enonce: "Your passenger plans to stay in Guadeloupe for a fortnignt",
        choix: [
          { lettre: "A", texte: "He leaves after four nights" },
          { lettre: "B", texte: "He'll stay during two weeks" , correct: true },
          { lettre: "C", texte: "He's got a solution to stay a long time in the archipelago" },
        ],
      },
      {
        id: 9,
        type: "QCM",
        enonce: "Can I eat in your car ?",
        choix: [
          { lettre: "A", texte: "No I am not" },
          { lettre: "B", texte: "No I would prefer you wait" , correct: true },
          { lettre: "C", texte: "No I don't have this music" },
        ],
      },
      {
        id: 10,
        type: "QCM",
        enonce: "That's fine, keep the change",
        choix: [
          { lettre: "A", texte: "C'est bon, je veux faire le change" },
          { lettre: "B", texte: "C'est bon, gardez la monnaie" , correct: true },
          { lettre: "C", texte: "C'est bien, j'avais besoin de monnaie" },
        ],
      },
      {
        id: 11,
        type: "QCM",
        enonce: "Don't forget to give me a bill, please",
        choix: [
          { lettre: "A", texte: "Of course, I will prepare it as soon as we arrive" , correct: true },
          { lettre: "B", texte: "Sorry, I don't know Bill" },
          { lettre: "C", texte: "Of course, I give you them when we arrive" },
        ],
      },
      {
        id: 12,
        type: "QCM",
        enonce: "How long are you staying in town ?",
        choix: [
          { lettre: "A", texte: "Est-ce que vous vivez en ville ?" },
          { lettre: "B", texte: "Pourquoi êtes-vous en ville ?" },
          { lettre: "C", texte: "Vous restez longtemps en ville ?" , correct: true },
        ],
      },
      {
        id: 13,
        type: "QCM",
        enonce: "Which French monuments do you advise us to visit ?",
        choix: [
          { lettre: "A", texte: "You can go by car or by train to visit them" },
          { lettre: "B", texte: "I don't see" },
          { lettre: "C", texte: "I think that the Louvres and the Reims Cathedral would be great" , correct: true },
        ],
      },
      {
        id: 14,
        type: "QCM",
        enonce: "Séléctionnez la phrase correctement formulée",
        choix: [
          { lettre: "A", texte: "There are a few pubs in Reims" , correct: true },
          { lettre: "B", texte: "There is many pubs in Reims" },
          { lettre: "C", texte: "There is a few pubs in Reims" },
        ],
      },
      {
        id: 15,
        type: "QCM",
        enonce: "Do you mind if I smoke in the car, sir ?",
        choix: [
          { lettre: "A", texte: "Ai-je le droit de fumer dans la voiture, monsieur ?" },
          { lettre: "B", texte: "Est-ce que ca vous dérange si je fume dans la voiture, monsieur ?" , correct: true },
          { lettre: "C", texte: "Puis-je fumer dans la voiture, monsieur ?" },
          { lettre: "D", texte: "Est-ce possible de fumer dans la voiture, monsieur ?" },
        ],
      },
      {
        id: 16,
        type: "QCM",
        enonce: "A quel nom dois-je établir la facture ?",
        choix: [
          { lettre: "A", texte: "What is the name of the bill ?" },
          { lettre: "B", texte: "What name do I put on the bill ?" , correct: true },
          { lettre: "C", texte: "Which name for the bill ?" },
        ],
      },
      {
        id: 17,
        type: "QCM",
        enonce: "We will probably not make it on time. There's too much traffic",
        choix: [
          { lettre: "A", texte: "Nous arriverons probablement en retard. Il y'a trop de circulation" , correct: true },
          { lettre: "B", texte: "Nous arriverons probablement en retard. Il y'a beaucoup de ralentissement" },
          { lettre: "C", texte: "Nous arriverons probablement en retard. Il y'a peu de circulation" },
        ],
      },
      {
        id: 18,
        type: "QCM",
        enonce: "No vacancies",
        choix: [
          { lettre: "A", texte: "Pas de vacances" },
          { lettre: "B", texte: "Pas de vacanciers" },
          { lettre: "C", texte: "Complet", correct: true },
        ],
      },
      {
        id: 19,
        type: "QCM",
        enonce: "Avec une circulation normale il faut 45 minutes pour atteindre l'aéroport",
        choix: [
          { lettre: "A", texte: "With a normal circulation, It must forty five minutes for attend the airport" , correct: true },
          { lettre: "B", texte: "In normal traffic, 45 minutes are needed for attent the airport" },
          { lettre: "C", texte: "With a normal traffic, it takes forty five minutes to get the airport" },
        ],
      },
      {
        id: 20,
        type: "QCM",
        enonce: "Have you been a driver for a long time ?",
        choix: [
          { lettre: "A", texte: "I have been a driver for half past four" },
          { lettre: "B", texte: "I've been a driver since 1990", correct: true },
          { lettre: "C", texte: "I was a driver in the 90's" },
          { lettre: "D", texte: "I've been a driver for 27 years", correct: true },
        ],
      },
    ],
  },
  {
    id: "reglementation_vtc",
    nom: "F(V) - Développement commercial et gestion propre à l'activité de VTC",
    duree: 30,
    coefficient: 3,
    noteEliminatoire: 6,
    noteSur: 40,
    questions: [
      {
        id: 1,
        type: "QRC",
        enonce: "Qu'appelle-t-on un marché de niche en mercatique ? (QRC)",
        reponseQRC: "Un marché de niche est un marché très étroit correspondant à un produit/service très spécialisé",
      },
      {
        id: 2,
        type: "QRC",
        enonce: "DÉFINISSEZ LA NOTION DE MARGE EN GESTION ? (QRC)",
        reponseQRC: "Une marge correspond à la différence entre un prix de vente et un prix d'achat.",
      },
      {
        id: 3,
        type: "QRC",
        enonce: "Qu'est ce qu'un apporteur d'affaires (QRC)",
        reponseQRC: "Un apporteur d'affaires est une personne qui met en relation des personnes qui souhaitent réaliser entre elles des opérations commerciales.",
      },
      {
        id: 4,
        type: "QRC",
        enonce: "Qu'est-ce qu'un coût de revient ? (QRC)",
        reponseQRC: "Le coût de revient d'un produit ou d'une prestation est la somme des charges engagées pour la production d'un bien ou d'un service",
      },
      {
        id: 5,
        type: "QCM",
        enonce: "Vous accordez à un client régulier une remise de 5 % sur le 10ème trajet. La prestation",
        choix: [
          { lettre: "A", texte: "3,20 €" },
          { lettre: "B", texte: "5,00 €" },
          { lettre: "C", texte: "4,00 €" , correct: true },
        ],
      },
      {
        id: 6,
        type: "QCM",
        enonce: "Quelle affirmation est vraie ?",
        choix: [
          { lettre: "A", texte: "lorsque la demande est supérieure à l’offre, les prix diminuent" },
          { lettre: "B", texte: "lorsque la demande est inférieure à l’offre, les prix augmentent", correct: true },
          { lettre: "C", texte: "lorsque la demande est supérieure à l’offre, les prix augmentent" , correct: true },
        ],
      },
      {
        id: 7,
        type: "QCM",
        enonce: "En accueillant un client qui voyage seul, un chauffeur VTC l'invite à prendre place :",
        choix: [
          { lettre: "A", texte: "sur le siège arrière droit" , correct: true },
          { lettre: "B", texte: "sur le siège arrière gauche" },
          { lettre: "C", texte: "sur le siège avant" },
        ],
      },
      {
        id: 8,
        type: "QCM",
        enonce: "Diriez-vous que fidéliser vos clients VTC coûte :",
        choix: [
          { lettre: "A", texte: "le même prix que d’en trouver de nouveaux" },
          { lettre: "B", texte: "moins cher que d’en trouver de nouveaux" , correct: true },
          { lettre: "C", texte: "plus cher que d’en trouver de nouveaux" },
        ],
      },
      {
        id: 9,
        type: "QCM",
        enonce: "Qu'est-ce qu'une zone de chalandise ?",
        choix: [
          { lettre: "A", texte: "c’est un bateau" },
          { lettre: "B", texte: "c’est le nombre de conducteurs de VTC qu’il y a dans une zone géographique" },
          { lettre: "C", texte: "c’est la zone géographique d’où provient la majorité de la clientèle" , correct: true },
        ],
      },
      {
        id: 10,
        type: "QCM",
        enonce: "Une personne qui influence l'acte d'achat est :",
        choix: [
          { lettre: "A", texte: "un consommateur" },
          { lettre: "B", texte: "un grossiste" },
          { lettre: "C", texte: "un prescripteur" , correct: true },
        ],
      },
      {
        id: 11,
        type: "QCM",
        enonce: "Qu'est-ce que le marché en mercatique ?",
        choix: [
          { lettre: "A", texte: "le lien où des producteurs se rassemblent pour proposer directement leurs produits/prestations aux consommateurs" },
          { lettre: "B", texte: "le lien de rencontre physique ou virtuel de l'offre et de la demande" },
          { lettre: "C", texte: "l'ensemble des vendeurs et des acheteurs concernés par l'échange d'un bien ou d'un service" , correct: true },
        ],
      },
      {
        id: 12,
        type: "QCM",
        enonce: "Qu'appelle-t-on un service premium ?",
        choix: [
          { lettre: "A", texte: "un service de premier prix" },
          { lettre: "B", texte: "un service gratuit" },
          { lettre: "C", texte: "un service haut de gamme" , correct: true },
        ],
      },
      {
        id: 13,
        type: "QCM",
        enonce: "Font partie des frais financiers à prendre en compte dans le calcul du coût de revient :",
        choix: [
          { lettre: "A", texte: "la rémunération des capitaux propres investis par l'entreprise" , correct: true },
          { lettre: "B", texte: "la TVA reversée aux services fiscaux" },
          { lettre: "C", texte: "la rémunération du cabinet comptable de l'entreprise" },
          { lettre: "D", texte: "les intérêts bancaires des emprunts contractés" , correct: true },
        ],
      },
      {
        id: 14,
        type: "QCM",
        enonce: "Que doit-on dire lorsqu'on décroche un appel téléphonique ?",
        choix: [
          { lettre: "A", texte: "le nom de la société et bonjour" , correct: true },
          { lettre: "B", texte: "le nom de la société" },
          { lettre: "C", texte: "allo" },
        ],
      },
      {
        id: 15,
        type: "QCM",
        enonce: "La mercatique a pour objet de :",
        choix: [
          { lettre: "A", texte: "Prévoir, constater ou stimuler les besoins du marché" , correct: true },
          { lettre: "B", texte: "Réaliser un résultat de commercialisation" },
          { lettre: "C", texte: "Prévoir et acheter son produit commercialisé sur un marché" },
        ],
      },
      {
        id: 16,
        type: "QCM",
        enonce: "On appelle marketing direct",
        choix: [
          { lettre: "A", texte: "l’envoi d’un message personnalisé à un groupe de personnes qualifiées", correct: true },
          { lettre: "B", texte: "l’achat d’espace publicitaire dans la presse locale" },
          { lettre: "C", texte: "la mise en valeur d’offres promotionnelles dans le véhicule" },
        ],
      },
    ],
  },
  {
    id: "reglementation_vtc2",
    nom: "G(V) - Réglementation nationale spécifique à l'activité de VTC",
    duree: 20,
    coefficient: 3,
    noteEliminatoire: 6,
    noteSur: 24,
    questions: [
      {
        id: 1,
        type: "QRC",
        enonce: "réglementation spécifique VTC",
      },
      {
        id: 2,
        type: "QRC",
        enonce: "Donnez la définition de l'activité de VTC. (QRC)",
        reponseQRC: "Les activités de VTC sont « des exploitants qui mettent à la disposition de leur clientèle une ou plusieurs voitures de transport avec chauffeur dans des conditions fixées à l'avance entre les parties ».",
      },
      {
        id: 3,
        type: "QRC",
        enonce: "Un conducteur de VTC doit-il obligatoirement être propriétaire de son véhicule ? (QRC)Développez votre réponse.",
        reponseQRC: "Non, il peut aussi louer le véhicule sous réserve de justifier au moins de l'inscription au registre des exploitants de VTC",
      },
      {
        id: 4,
        type: "QCM",
        enonce: "La durée maximale de stationnement précédant l’horaire de prise en charge mentionné par le client lors de sa réservation à un aéroport ou une gare pour un VTC est de :",
        choix: [
          { lettre: "A", texte: "45 minutes" },
          { lettre: "B", texte: "1 heure" , correct: true },
          { lettre: "C", texte: "30 minutes" },
          { lettre: "D", texte: "1 h 30" },
        ],
      },
      {
        id: 5,
        type: "QCM",
        enonce: "Qui délivre la carte professionnelle des conducteurs de VTC ?",
        choix: [
          { lettre: "A", texte: "la prefecture", correct: true },
          { lettre: "B", texte: "la chambre de métiers et de l’artisanat", correct: true },
          { lettre: "C", texte: "la Mairie" },
          { lettre: "D", texte: "les organisations professionnelles de VTC" },
        ],
      },
      {
        id: 6,
        type: "QCM",
        enonce: "La justification d’une réservation préalable :",
        choix: [
          { lettre: "A", texte: "doit obligatoirement mentionner le nom du bénéficiaire de la prestation" },
          { lettre: "B", texte: "est facultative" },
          { lettre: "C", texte: "peut être établie sur support numérique", correct: true },
        ],
      },
      {
        id: 7,
        type: "QCM",
        enonce: "Parmi les puissances de moteur suivantes, quelles sont celles permettant à une voiture d’être exploitée en VTC ?",
        choix: [
          { lettre: "A", texte: "82 kilowatts" },
          { lettre: "B", texte: "86 kilowatts", correct: true },
          { lettre: "C", texte: "80 kilowatts" },
          { lettre: "D", texte: "84 kilowatts", correct: true },
        ],
      },
      {
        id: 8,
        type: "QCM",
        enonce: "Quelle(s) entreprise(s) doit (doivent) être inscrite(s) au registre des exploitants de VTC ?",
        choix: [
          { lettre: "A", texte: "les entreprises assurant des services collectifs de manière occasionnelle" },
          { lettre: "B", texte: "les exploitants de VTC", correct: true },
          { lettre: "C", texte: "les intermédiaires mettant en relation les exploitants et les clients", correct: true },
        ],
      },
    ],
  },
];

const eb2Matieres: Matiere[] = [
  {
    id: "t3p",
    nom: "A - Transport Public Particulier de Personnes (T3P)",
    duree: 45,
    coefficient: 3,
    noteEliminatoire: 6,
    noteSur: 36,
    questions: [
      {
        id: 1,
        type: "QRC",
        enonce: "Citez trois des conditions d'accès et ou d'exercice aux professions de conducteurs de T3P : (QRC)",
        reponseQRC: "Réussite à l'examen (vérification de l'aptitude professionnelle). Carte professionnelle en cours de validité, Formation continue. Aptitude médicale. Honorabilité. Assurance responsabilité civile professionnelle. Respect de caractéristiques techniques des véhicules (contrôle technique - et le cas échéant puissance, dimension, équipement spéciaux).",
        reponses_possibles: [
          "Réussite à l'examen (vérification de l'aptitude professionnelle). Carte professionnelle en cours de validité, Formation continue. Aptitude médicale. Honorabilité. Assurance responsabilité civile professionnelle. Respect de caractéristiques techniques des véhicules (contrôle technique - et le cas échéant puissance, dimension, équipement spéciaux).",
          "Permis de conduire, carte de vtc, véhicule",
          "Permis de plus de 3 ans donc hors période probatoire, casier judiciaire num 2 vierge et obtention de la carte professionnelle auprès de la préfecture",
        ],
      },
      {
        id: 2,
        type: "QRC",
        enonce: "Quelles sont les sanctions possibles qui peuvent être décidées par les commissions disciplinaires locales ? (QRC)",
        reponseQRC: "Un avertissement. Un retrait temporaire Un retrait définitif de la carte professionnelle.",
        reponses_possibles: [
          "Un avertissement. Un retrait temporaire Un retrait définitif de la carte professionnelle.",
          "Avertissement Retrait temporaire de la carte professionnelle Retrait définitive de la carte professionnelle",
        ],
      },
      {
        id: 3,
        type: "QRC",
        enonce: "Que devez-vous présenter aux agents susceptibles d'effectuer des contrôles pour justifier d'une réservation préalable ? (QRC)",
        reponseQRC: "Un document écrit sur support papier ou électronique.",
      },
      {
        id: 4,
        type: "QRC",
        enonce: "Qu'est-ce que l'honorabilité dans votre profession ? (QRC)",
        reponseQRC: "Casier judiciaire vierge ( B2)",
        reponses_possibles: [
          "Casier judiciaire vierge ( B2)",
          "Casier judiciaire vierge b2",
          "Avoir son B2 vierge",
          "Avoir casier judiciaire b2 vierge",
          "casier judiciaire B2 Vierge",
        ],
      },
      {
        id: 5,
        type: "QRC",
        enonce: "Je me fais contrôler sur la route quels documents communs aux trois professions dois-je présenter aux forces de l'ordre ? (QRC)",
        reponseQRC: "Le permis de conduire. La carte professionnelle en cours de validité. L'attestation de formation continue. Certificat médical. L'attestation d'assurance du véhicule. Attestation de responsabilité civile professionnelle (RCP - Transport de personnes à titre onéreux).",
        reponses_possibles: ["permis de conduire", "carte professionnelle", "attestation de formation", "certificat médical", "assurance", "responsabilité civile"],
      },
      {
        id: 6,
        type: "QCM",
        enonce: "Quelles sont les conditions requises pour pouvoir passer l'examen de T3P ?",
        choix: [
          { lettre: "A", texte: "avoir son permis de conduire depuis plus de 5 ans" },
          { lettre: "B", texte: "avoir 10 points minimum sur son permis de conduire" },
          { lettre: "C", texte: "casier judiciaire B2 vierge" , correct: true },
        ],
      },
      {
        id: 7,
        type: "QCM",
        enonce: "Quelles sont les sanctions possibles en cas d'exercice illégale d'une des professions du T3P ?",
        choix: [
          { lettre: "A", texte: "une amende de 30 000 € et un deux ans d’emprisonnement" },
          { lettre: "B", texte: "une amende de 15 000 € et un an d’emprisonnement" , correct: true },
          { lettre: "C", texte: "une amende de 1 500 € et six mois d’emprisonnement" },
        ],
      },
      {
        id: 8,
        type: "QCM",
        enonce: "Parmi les entreprises du T3P, quelles sont celles qui sont soumises à l'obligation de s'assurer en responsabilité civile professionnelle ?",
        choix: [
          { lettre: "A", texte: "VTC et 2 ou 3 roues" },
          { lettre: "B", texte: "le taxi, VTC et 2 ou 3 roues seulement" , correct: true },
          { lettre: "C", texte: "le taxi seulement" },
          { lettre: "D", texte: "le taxi et le VTC seulement" },
        ],
      },
      {
        id: 9,
        type: "QCM",
        enonce: "Pour effectuer du T3P, le véhicule doit :",
        choix: [
          { lettre: "A", texte: "être de couleur blanche" },
          { lettre: "B", texte: "avoir des tailles de pneumatiques fixées par décret" },
          { lettre: "C", texte: "avoir une signalétique distinctive" , correct: true },
        ],
      },
      {
        id: 10,
        type: "QCM",
        enonce: "Qui délivrent les agréments aux centres de formation ?",
        choix: [
          { lettre: "A", texte: "les conseils départementaux" },
          { lettre: "B", texte: "l’association permanente des chambres de métiers et de l’artisanat" },
          { lettre: "C", texte: "les préfectures" , correct: true },
          { lettre: "D", texte: "le ministère des transports pour les VTC, le ministère de l’environnement pour les 2 ou 3 roues, le ministère de l’intérieur pour les taxis" },
        ],
      },
      {
        id: 11,
        type: "QCM",
        enonce: "Qui préside la commission locale du T3P ?",
        choix: [
          { lettre: "A", texte: "le représentant de chaque collège à tour de rôle" },
          { lettre: "B", texte: "le préfet ou son représentant" , correct: true },
          { lettre: "C", texte: "le directeur des transports du département" },
          { lettre: "D", texte: "le Président de la chambre de métiers" },
        ],
      },
      {
        id: 12,
        type: "QCM",
        enonce: "Quelle est la durée du mandat des membres de la commission locale des T3P ?",
        choix: [
          { lettre: "A", texte: "3 ans", correct: true },
          { lettre: "B", texte: "2 ans", correct: true },
          { lettre: "C", texte: "5 ans", correct: true },
          { lettre: "D", texte: "1 an" },
        ],
      },
      {
        id: 13,
        type: "QCM",
        enonce: "Un client avec une prescription médicale sera remboursé de son transport s'il utilise :",
        choix: [
          { lettre: "A", texte: "un taxi conventionné ou un VTC conventionné" },
          { lettre: "B", texte: "un VTC conventionné ou un taxi moto conventionné" },
          { lettre: "C", texte: "un taxi conventionné ou un Taxi moto conventionné ou un VTC conventionné" },
          { lettre: "D", texte: "un taxi conventionné" , correct: true },
        ],
      },
      {
        id: 14,
        type: "QCM",
        enonce: "Quels agents sont habilités à effectuer un contrôle routier de conducteur de T3P ?",
        choix: [
          { lettre: "A", texte: "les agents représentant la SNCF" },
          { lettre: "B", texte: "les gendarmes" , correct: true },
          { lettre: "C", texte: "le juge du tribunal d’instance" },
          { lettre: "D", texte: "les policiers" , correct: true },
        ],
      },
      {
        id: 15,
        type: "QCM",
        enonce: "Parmi les condamnations suivantes, lesquelles peuvent être mentionnées au bulletin n° 2 du casier judiciaire ?",
        choix: [
          { lettre: "A", texte: "transporter et déposer des objets, déchets, liquides insalubres en un lieu sans l’autorisation de la personne ayant la jouissance du lieu" },
          { lettre: "B", texte: "conduire avec un taux d’alcool dans le sang de 0,8 gramme par litre ou plus" , correct: true },
          { lettre: "C", texte: "transporter un appareil permettant de déceler la présence de systèmes servant à la constatation des infractions à la législation, ou à la réglementation de la circulation routière" },
          { lettre: "D", texte: "poursuivre sa route, en connaissance de cause, après avoir occasionné un accident" , correct: true },
        ],
      },
    ],
  },
  {
    id: "gestion",
    nom: "B - Gestion",
    duree: 45,
    coefficient: 3,
    noteEliminatoire: 6,
    noteSur: 36,
    questions: [
      {
        id: 2,
        type: "QRC",
        enonce: "Développez les sigles URSSAF (QRC)",
        reponseQRC: "URSSAF : union de recouvrement des cotisations de sécurité sociale et d'allocations familiales",
      },
      {
        id: 3,
        type: "QRC",
        enonce: "Citez deux régimes de base de la protection sociale en France (QRC)",
        reponseQRC: "Régime général(CPAM). Régime agricole. Régimes spéciaux (SNCF, fonctionnaires,…).",
        reponses_possibles: [
          "Régime général(CPAM). Régime agricole. Régimes spéciaux (SNCF, fonctionnaires,…).",
          "Regime général,Regime agricole",
          "Régime agricole, Régime général",
        ],
      },
      {
        id: 4,
        type: "QCM",
        enonce: "Quel statut du conjoint du chef d'entreprise ne convient pas à l'entreprise individuelle ?",
        choix: [
          { lettre: "A", texte: "conjoint collaborateur" },
          { lettre: "B", texte: "conjoint salarié" },
          { lettre: "C", texte: "conjoint associé" , correct: true },
          { lettre: "D", texte: "conjoint hors statut" },
        ],
      },
      {
        id: 5,
        type: "QCM",
        enonce: "Vous empruntez 25 000 € sur 5 ans, l'annuité (ce que l'on paie par an) est de 5 600 €. Quel est le coût de l'emprunt ?",
        choix: [
          { lettre: "A", texte: "4 200 €" },
          { lettre: "B", texte: "3 000 €" , correct: true },
          { lettre: "C", texte: "3 600 €" },
        ],
      },
      {
        id: 6,
        type: "QCM",
        enonce: "Qu'est ce qu'un chiffre d'affaires ?",
        choix: [
          { lettre: "A", texte: "L'argent qui reste en banque après avoir payé toutes les charges" },
          { lettre: "B", texte: "L'ensemble des commandes ou devis" },
          { lettre: "C", texte: "L'ensemble des sommes facturées aux clients" , correct: true },
          { lettre: "D", texte: "La différence entre les produits et les charges" },
        ],
      },
      {
        id: 7,
        type: "QCM",
        enonce: "Les revenus d'un chef d'entreprise individuelle sont imposés dans les catégories des :",
        choix: [
          { lettre: "A", texte: "BIC (bénéfices industriels et commerciaux)" , correct: true },
          { lettre: "B", texte: "BNC (bénéfices non commerciaux)" },
          { lettre: "C", texte: "IS (impôts sur les sociétés)" },
          { lettre: "D", texte: "RCM (revenus de capitaux mobiliers)" },
        ],
      },
      {
        id: 8,
        type: "QCM",
        enonce: "Je peux être gérant minoritaire d'une entreprise individuelle ?",
        choix: [
          { lettre: "A", texte: "Oui" },
          { lettre: "B", texte: "Sous certaines conditions" },
          { lettre: "C", texte: "Non" , correct: true },
        ],
      },
      {
        id: 9,
        type: "QCM",
        enonce: "Pour une entreprise sous statut SARL, la TVA est :",
        choix: [
          { lettre: "A", texte: "Une charge" },
          { lettre: "B", texte: "Un mouvement de trésorerie" , correct: true },
          { lettre: "C", texte: "Un produit" },
          { lettre: "D", texte: "Une charge financière" },
        ],
      },
      {
        id: 10,
        type: "QCM",
        enonce: "Existe-t-il une durée minimale pour un contrat à durée déterminée ?",
        choix: [
          { lettre: "A", texte: "7 jours" },
          { lettre: "B", texte: "15 jours", correct: true },
          { lettre: "C", texte: "Pas de durée minimale" , correct: true },
          { lettre: "D", texte: "1 mois" },
        ],
      },
      {
        id: 11,
        type: "QCM",
        enonce: "La SAS est sur le plan juridique :",
        choix: [
          { lettre: "A", texte: "Une personne physique" },
          { lettre: "B", texte: "Une personne professionnelle" },
          { lettre: "C", texte: "Une personne morale" , correct: true },
        ],
      },
      {
        id: 12,
        type: "QCM",
        enonce: "La libération totale du capital social dans une société à responsabilité limitée (SARL) doit intervenir au plus tard dans un délai de :",
        choix: [
          { lettre: "A", texte: "5 ans" , correct: true },
          { lettre: "B", texte: "1 an" },
          { lettre: "C", texte: "99 ans", correct: true },
          { lettre: "D", texte: "10 ans", correct: true },
        ],
      },
      {
        id: 13,
        type: "QCM",
        enonce: "Quelle est la dépense qui ne constitue pas une charge pour l'entreprise ?",
        choix: [
          { lettre: "A", texte: "Abonnement à une revue professionnelle" },
          { lettre: "B", texte: "Intérêt d'un prêt professionnelle" },
          { lettre: "C", texte: "Remboursement du capital d'un prêt professionnel" , correct: true },
        ],
      },
      {
        id: 14,
        type: "QCM",
        enonce: "Quelle mention n'est pas obligatoire sur le bulletin de salaire ?",
        choix: [
          { lettre: "A", texte: "Le montant net à payer" },
          { lettre: "B", texte: "Le diplôme du salarié" , correct: true },
          { lettre: "C", texte: "La convention collective applicable" },
        ],
      },
      {
        id: 15,
        type: "QCM",
        enonce: "Les montants figurants dans le compte de résultat sont :",
        choix: [
          { lettre: "A", texte: "BIC" },
          { lettre: "B", texte: "TTC" },
          { lettre: "C", texte: "HT" , correct: true },
        ],
      },
      {
        id: 16,
        type: "QCM",
        enonce: "Lors de sa création, l'entreprise de Taxi ou de VTC doit s'inscrire :",
        choix: [
          { lettre: "A", texte: "A la chambre des métiers et de l'artisanat" , correct: true },
          { lettre: "B", texte: "A la chambre de commerce et de l'industrie" },
          { lettre: "C", texte: "A la chambre d'agriculture" },
        ],
      },
      {
        id: 17,
        type: "QCM",
        enonce: "Au 1er janvier 2016, j'achète un véhicule 20 000 € HT amortissable sur 4 ans, un ordinateur portable 600 € HT amortissable sur 3 ans. Quel sera le montant de la dotation d'amortissement déductible sur les charges d'entreprise en 2017 ?",
        choix: [
          { lettre: "A", texte: "10400€" },
          { lettre: "B", texte: "5300€" },
          { lettre: "C", texte: "4198€" },
          { lettre: "D", texte: "5200€" , correct: true },
        ],
      },
      {
        id: 18,
        type: "QCM",
        enonce: "Dans un bilan comptable, un amortissement fait baisser :",
        choix: [
          { lettre: "A", texte: "Le bénéfice" },
          { lettre: "B", texte: "L'imposition" , correct: true },
          { lettre: "C", texte: "Les charges" , correct: true },
        ],
      },
    ],
  },
  {
    id: "securite",
    nom: "C - Sécurité routière",
    duree: 30,
    coefficient: 2,
    noteEliminatoire: 4,
    noteSur: 24,
    questions: [
      {
        id: 1,
        type: "QCM",
        enonce: "À 127 km/h sur sol sec, quelle est la distance d'arrêt approximative de votre véhicule ?",
        choix: [
          { lettre: "A", texte: "60 mètres" },
          { lettre: "B", texte: "80 mètres" , correct: true },
          { lettre: "C", texte: "161 mètres" },
        ],
      },
      {
        id: 2,
        type: "QCM",
        enonce: "Sur une autoroute à 3 voies, je peux dépasser par la droite ?",
        choix: [
          { lettre: "A", texte: "Vrai" },
          { lettre: "B", texte: "Faux" , correct: true },
        ],
      },
      {
        id: 3,
        type: "QCM",
        enonce: "Que risquez-vous en vous garant sur une place pour personne à mobilité réduite sans apposer la carte européenne de stationnement à l’intérieur du véhicule ?",
        choix: [
          { lettre: "A", texte: "Une amende de 3ème classe" },
          { lettre: "B", texte: "Une amende de 4ème classe" , correct: true },
          { lettre: "C", texte: "Une amende de 1ère classe" },
          { lettre: "D", texte: "La mise en fourrière du véhicule" },
        ],
      },
      {
        id: 4,
        type: "QCM",
        enonce: "À un feu jaune clignotant :",
        choix: [
          { lettre: "A", texte: "Je dois m’arrêter" },
          { lettre: "B", texte: "Je peux passer en cédant le passage à droite" , correct: true },
          { lettre: "C", texte: "Je peux passer en cédant le passage à gauche" },
        ],
      },
      {
        id: 5,
        type: "QCM",
        enonce: "En montagne, sur une pente celui qui doit s’arrêter est :",
        choix: [
          { lettre: "A", texte: "Le véhicule le plus chargé" },
          { lettre: "B", texte: "Le véhicule qui monte" },
          { lettre: "C", texte: "Le véhicule qui descend si de même gabarit" , correct: true },
          { lettre: "D", texte: "Le véhicule le moins chargé" },
        ],
      },
      {
        id: 6,
        type: "QCM",
        enonce: "Hors agglomération, pour dépasser un cycliste, je dois laisser au minimum entre le cycliste et mon véhicule",
        choix: [
          { lettre: "A", texte: "1 mètre", correct: true },
          { lettre: "B", texte: "1,50 mètre" , correct: true },
          { lettre: "C", texte: "2 mètres" },
        ],
      },
      {
        id: 7,
        type: "QCM",
        enonce: "Un panneau rond sur fond bleu marqué 30 signifie :",
        choix: [
          { lettre: "A", texte: "Une vitesse conseillée" },
          { lettre: "B", texte: "Une vitesse maximum autorisée" },
          { lettre: "C", texte: "Une vitesse minimum obligatoire" , correct: true },
        ],
      },
      {
        id: 8,
        type: "QCM",
        enonce: "Sur une route étroite, un camion arrive en face de moi, je dois lui céder le passage ?",
        choix: [
          { lettre: "A", texte: "Oui" },
          { lettre: "B", texte: "Non" , correct: true },
        ],
      },
      {
        id: 9,
        type: "QCM",
        enonce: "En présence d'un accident qui vient d'avoir lieu, je dois :",
        choix: [
          { lettre: "A", texte: "Protéger, alerter, secourir" , correct: true },
          { lettre: "B", texte: "Alerter, secourir, protéger ­" },
          { lettre: "C", texte: "Secourir, protéger, alerter" },
        ],
      },
      {
        id: 10,
        type: "QCM",
        enonce: "Je perds 2 points concernant une contravention de 2ème classe, je les récupère si je n’ai commis aucune autre infraction dans combien de temps ?",
        choix: [
          { lettre: "A", texte: "6 mois" },
          { lettre: "B", texte: "2 ans" , correct: true },
          { lettre: "C", texte: "3 ans", correct: true },
        ],
      },
      {
        id: 11,
        type: "QCM",
        enonce: "Je me fais arrêter pour un test d'alcoolé­mie, je souffle et le résultat indique 0,30 mg/l d'air expiré, cette infraction est un délit.",
        choix: [
          { lettre: "A", texte: "Vrai" },
          { lettre: "B", texte: "Faux" , correct: true },
        ],
      },
      {
        id: 12,
        type: "QCM",
        enonce: "Quelles infractions entraînent un retrait de 3 points sur le permis de conduire ?",
        choix: [
          { lettre: "A", texte: "Chevauchement d’une ligne continue" },
          { lettre: "B", texte: "Usage d’un appareil destiné à déceler ou perturber les contrôles" },
          { lettre: "C", texte: "Dépassement dangereux" , correct: true },
          { lettre: "D", texte: "Non‐respect des distances de sécurité entre 2 véhicules" , correct: true },
        ],
      },
      {
        id: 13,
        type: "QCM",
        enonce: "Par temps de forte pluie, je peux allumer mes feux antibrouillard arrière ?",
        choix: [
          { lettre: "A", texte: "Oui" },
          { lettre: "B", texte: "Non" , correct: true },
        ],
      },
      {
        id: 14,
        type: "QCM",
        enonce: "Je roule à 90 km/h, quelle est ma distance de sécurité approximative ?",
        choix: [
          { lettre: "A", texte: "15 mètres." },
          { lettre: "B", texte: "64 mètres." },
          { lettre: "C", texte: "59 mètres." , correct: true },
        ],
      },
      {
        id: 15,
        type: "QCM",
        enonce: "En suivant un stage de sensibilisation à la sécurité routière, un conducteur qui a commis une infraction ayant donné lieu à un retrait de points peut retrouver :",
        choix: [
          { lettre: "A", texte: "8 points" },
          { lettre: "B", texte: "10 points" },
          { lettre: "C", texte: "4 points" , correct: true },
        ],
      },
      {
        id: 16,
        type: "QCM",
        enonce: "Ce panneau indique qu'à la prochaine intersection :",
        image: "/cours/examens/panneau-intersection-priorite-droite.png",
        choix: [
          { lettre: "A", texte: "Je devrais cédez la priorité à droite" , correct: true },
          { lettre: "B", texte: "Je devrais cédez la priorité à gauche" },
          { lettre: "C", texte: "Je devrais cédez la priorité à gauche et à droite" },
        ],
      },
      {
        id: 17,
        type: "QCM",
        enonce: "Ne pas s’arrêter lorsqu’un agent me fait signe de m’arrêter constitue :",
        choix: [
          { lettre: "A", texte: "un délit de fuite" },
          { lettre: "B", texte: "un délit" , correct: true },
          { lettre: "C", texte: "un refus d’obtempérer" , correct: true },
        ],
      },
      {
        id: 18,
        type: "QCM",
        enonce: "Les feux de position sont visibles jusqu’à :",
        choix: [
          { lettre: "A", texte: "150m." , correct: true },
          { lettre: "B", texte: "100m." },
          { lettre: "C", texte: "50m." },
        ],
      },
      {
        id: 19,
        type: "QCM",
        enonce: "Pourquoi faut-il rédiger un constat amiable ?",
        choix: [
          { lettre: "A", texte: "pour que le garagiste puisse établir un devis des réparations" },
          { lettre: "B", texte: "pour calculer les indemnisations de chacune des personnes impliquées" , correct: true },
          { lettre: "C", texte: "pour déterminer la sanction encourue par l'auteur" },
          { lettre: "D", texte: "pour déterminer les responsabilités de chacune des personnes impliquées" , correct: true },
        ],
      },
      {
        id: 20,
        type: "QCM",
        enonce: "Les feux de croisement éclairent à :",
        choix: [
          { lettre: "A", texte: "150m" , correct: true },
          { lettre: "B", texte: "100m" },
          { lettre: "C", texte: "30m" , correct: true },
        ],
      },
    ],
  },
  {
    id: "francais",
    nom: "D - Capacité d'expression et de compréhension en langue française",
    duree: 30,
    coefficient: 2,
    noteEliminatoire: 5,
    noteSur: 24,
    texteSupport: `Alors que les statistiques de l'accidentalité routière démontrent une conduite plus respectueuse des règles de la part des femmes, les clichés sur les femmes au volant, héritage des débuts de l'automobile cantonnant la femme au rôle de passagère, ont la vie dure. Comment expliquer ce paradoxe?

Par ailleurs, il existe actuellement un écart de 10 points entre les hommes et les femmes dans la réussite à l'épreuve pratique du permis de conduire. Comprendre les raisons de cet écart persistant dans le temps et trouver des solutions pour y remédier constitue un réel enjeu d'égalité, alors que le permis de conduire est un élément indispensable pour l'autonomie, l'intégration professionnelle et l'insertion sociale des personnes.

En outre, en raison de l'influence des stéréotypes masculins et féminins tout au long du parcours scolaire, l'industrie automobile, caractérisée par une grande variété de métiers, demeure marquée par une féminisation encore très limitée. Pourtant, ce secteur est susceptible d'offrir des perspectives de carrière intéressantes aux jeunes femmes. Comment inverser la tendance?

Enfin, il existe un lien marqué entre la précarité, qui touche plus particulièrement les femmes, et les contraintes de mobilité qui contribuent à aggraver leur fragilité économique et sociale. Comment favoriser la mobilité des femmes précaires?`,
    texteSource: "Rapport d'information de Mmes Chantal JOUANNO et Christiane HUMMEL, fait au nom de la délégation aux droits des femmes n° 835 (2015-2016) — 20 septembre 2016",
    questions: [
      {
        id: 1,
        type: "QRC",
        enonce: "Expliquez en quoi la précarité touche plus particulièrement les femmes et en quoi les difficultés de mobilité aggravent la situation. Illustrez vos explications d'exemples personnels.(QRC)",
        reponseQRC: "En quoi la précarité touche plus particulièrement les femmes : travail à temps partiel, famille mono parentale, salaire plus bas. Mobilité et précarité : manque d'indépendance, ne peut répondre aux propositions intéressantes et plus éloignées (CDI), éloignement des lieux d'habitation par rapport au bassin d'emploi.",
      },
      {
        id: 2,
        type: "QRC",
        enonce: "Expliquez le paradoxe relevé par les auteures sans paraphraser le texte. (QRC)",
        reponseQRC: "Bien que statistiquement les femmes ont moins d'accidents et sont plus prudentes, les clichés sont toujours là : les femmes sont peu habiles ou douées au volant, voire dangereuses.",
      },
      {
        id: 3,
        type: "QRC",
        enonce: "En quoi le permis de conduire est-il indispensable à l'insertion sociale des personnes d'après vous ? (QRC)",
        reponseQRC: "Ce qui est attendu : pour l'insertion sociale c'est la création et/ou l'entretien d'un réseau d'amis, de famille. Le permis de conduire permet d'accéder aux lieux de culture (cinéma, bibliothèque, …), administratifs pour réaliser ses démarches (allocations familiales, impôts, mairie,…).",
      },
      {
        id: 4,
        type: "QCM",
        enonce: "Quel(s) est (sont) le(s) synonyme(s) de paradoxe :",
        choix: [
          { lettre: "A", texte: "invraisemblance" , correct: true },
          { lettre: "B", texte: "accord" },
          { lettre: "C", texte: "concordance de genre" },
        ],
      },
      {
        id: 5,
        type: "QCM",
        enonce: "L’industrie automobile :",
        choix: [
          { lettre: "A", texte: "respecte la parité homme / femme" },
          { lettre: "B", texte: "compte peu de femmes dans ses effectifs" , correct: true },
          { lettre: "C", texte: "est un secteur très masculin" , correct: true },
        ],
      },
      {
        id: 6,
        type: "QCM",
        enonce: "Les auteures parlent d’un écart de 10 points entre les hommes et les femmes à l’examen du permis de conduire, cela signifie que :",
        choix: [
          { lettre: "A", texte: "les femmes réussissent d’avantage à l’examen du permis de conduire" },
          { lettre: "B", texte: "les hommes réussissent plus souvent l’examen du permis de conduire que les femmes" , correct: true },
          { lettre: "C", texte: "le permis de conduire des femmes a moins de points que celui des hommes" },
        ],
      },
      {
        id: 7,
        type: "QCM",
        enonce: "L'accidentalité est :",
        choix: [
          { lettre: "A", texte: "le taux d’accident rapporté à une population" , correct: true },
          { lettre: "B", texte: "le nombre d’accident par an" },
          { lettre: "C", texte: "la science qui étudie la nature des accidents" },
        ],
      },
      {
        id: 8,
        type: "QCM",
        enonce: "« l’influence des stéréotypes masculins et féminins tout au long du parcours scolaire » a quelle(s) conséquence(s) selon les auteures ?",
        choix: [
          { lettre: "A", texte: "les filles ne s’orientent pas vers les filières techniques automobiles" , correct: true },
          { lettre: "B", texte: "l’industrie automobile ne veut pas recruter des femmes" },
          { lettre: "C", texte: "les métiers de l’automobile sont trop durs physiquement pour les filles" },
        ],
      },
      {
        id: 9,
        type: "QCM",
        enonce: "Qu'est-ce qu'un stéréotype ?",
        choix: [
          { lettre: "A", texte: "un cliché" , correct: true },
          { lettre: "B", texte: "une typologie" },
          { lettre: "C", texte: "un genre" },
        ],
      },
      {
        id: 10,
        type: "QCM",
        enonce: "Trouvez le(s) synonyme(s) de précarité :",
        choix: [
          { lettre: "A", texte: "instabilité" , correct: true },
          { lettre: "B", texte: "fragilité" , correct: true },
          { lettre: "C", texte: "pauvreté" },
        ],
      },
    ],
  },
  {
    id: "anglais",
    nom: "E - Capacité d'expression et de compréhension en langue anglaise",
    duree: 20,
    coefficient: 1,
    noteEliminatoire: 4,
    noteSur: 20,
    questions: [
      {
        id: 1,
        type: "QCM",
        enonce: "Il y a un supplément pour la quatrième personne",
        choix: [
          { lettre: "A", texte: "there is no extra charge for the fourth person" },
          { lettre: "B", texte: "there is a supplement for the third person" },
          { lettre: "C", texte: "there is an extra charge for the fourth person" , correct: true },
        ],
      },
      {
        id: 2,
        type: "QCM",
        enonce: "« Break down » signifie :",
        choix: [
          { lettre: "A", texte: "freiner au maximum" },
          { lettre: "B", texte: "faire une dépression" , correct: true },
          { lettre: "C", texte: "tomber en panne" , correct: true },
        ],
      },
      {
        id: 3,
        type: "QCM",
        enonce: "Merci pour la course. Gardez la monnaie!",
        choix: [
          { lettre: "A", texte: "thank you for the race. Save the change!" },
          { lettre: "B", texte: "thank you for the ride. Keep the change!" , correct: true },
          { lettre: "C", texte: "thank you for the errand. Give the change!" },
        ],
      },
      {
        id: 4,
        type: "QCM",
        enonce: "Write the opposite of « boring »:",
        choix: [
          { lettre: "A", texte: "dangerous" },
          { lettre: "B", texte: "noisy" },
          { lettre: "C", texte: "exciting" , correct: true },
        ],
      },
      {
        id: 5,
        type: "QCM",
        enonce: "La voiture de mon cousin est très vieille",
        choix: [
          { lettre: "A", texte: "my cousin car is very old" },
          { lettre: "B", texte: "my cousin’s car is very old" , correct: true },
          { lettre: "C", texte: "the car of my cousin is very old" },
          { lettre: "D", texte: "my cousins car is very old" },
        ],
      },
      {
        id: 6,
        type: "QCM",
        enonce: "The secretary was given a bonus:",
        choix: [
          { lettre: "A", texte: "la secrétaire a reçu une prime" , correct: true },
          { lettre: "B", texte: "on a donné une prime à la secrétaire" , correct: true },
          { lettre: "C", texte: "le secrétaire était donné en prime" },
        ],
      },
      {
        id: 7,
        type: "QCM",
        enonce: "Y a t-il un problème? La route est bloquée",
        choix: [
          { lettre: "A", texte: "is there a problem? The road is blocked" , correct: true },
          { lettre: "B", texte: "are there a problem? The road is blocked" },
          { lettre: "C", texte: "is there a problem? The road is open" },
        ],
      },
      {
        id: 8,
        type: "QCM",
        enonce: "Il y a un festival à Edimbourg tous les quatre ans :",
        choix: [
          { lettre: "A", texte: "it is a festival at Edinburgh every four year" },
          { lettre: "B", texte: "there is a festival in Edinburgh every four years" , correct: true },
          { lettre: "C", texte: "there is a festival on Edinburgh every four years" },
        ],
      },
      {
        id: 9,
        type: "QCM",
        enonce: "Un client vous demande de l’amener à “the suburb”, où irez-vous ?",
        choix: [
          { lettre: "A", texte: "au métro" },
          { lettre: "B", texte: "en banlieue" , correct: true },
          { lettre: "C", texte: "au bord de la mer" },
        ],
      },
      {
        id: 10,
        type: "QCM",
        enonce: "I have Italian lessons …… Monday:",
        choix: [
          { lettre: "A", texte: "on" , correct: true },
          { lettre: "B", texte: "in" },
          { lettre: "C", texte: "at" },
        ],
      },
      {
        id: 11,
        type: "QCM",
        enonce: "Nous vérifions ma voiture deux à trois fois par semaine :",
        choix: [
          { lettre: "A", texte: "we tcheck my car too or three time by week" },
          { lettre: "B", texte: "we check my car two or three times a week" , correct: true },
          { lettre: "C", texte: "we check my car two or three times by week" },
        ],
      },
      {
        id: 12,
        type: "QCM",
        enonce: "Fill it up, please:",
        choix: [
          { lettre: "A", texte: "remplissez-le s’il vous plait" , correct: true },
          { lettre: "B", texte: "le plein s’il vous plait" , correct: true },
          { lettre: "C", texte: "garder le moral" },
        ],
      },
      {
        id: 13,
        type: "QCM",
        enonce: "We will probably not make it on time. There's too much traffic",
        choix: [
          { lettre: "A", texte: "nous arriverons probablement en retard. Il y a trop de circulation" , correct: true },
          { lettre: "B", texte: "nous arriverons probablement en retard. Il y a beaucoup de ralentissement" },
          { lettre: "C", texte: "nous arriverons certainement en retard. Il y a peu de circulation" },
        ],
      },
      {
        id: 14,
        type: "QCM",
        enonce: "“To demand”, signifie",
        choix: [
          { lettre: "A", texte: "exiger" , correct: true },
          { lettre: "B", texte: "demander" },
          { lettre: "C", texte: "supplier" },
        ],
      },
      {
        id: 15,
        type: "QCM",
        enonce: "How long are you planning to stay in France?",
        choix: [
          { lettre: "A", texte: "comment comptez-vous rester en France ?" },
          { lettre: "B", texte: "combien de fois êtes-vous venu en France ?" },
          { lettre: "C", texte: "combien de temps comptez-vous rester en France ?" , correct: true },
        ],
      },
      {
        id: 16,
        type: "QCM",
        enonce: "Est-ce qu’il y a un Musée dans votre ville ?",
        choix: [
          { lettre: "A", texte: "is there a museum in your town?" , correct: true },
          { lettre: "B", texte: "whats a museum in your town?" },
          { lettre: "C", texte: "is there museum on your town?" },
        ],
      },
      {
        id: 17,
        type: "QCM",
        enonce: "« The landscape », signifie :",
        choix: [
          { lettre: "A", texte: "la campagne" },
          { lettre: "B", texte: "la prairie" },
          { lettre: "C", texte: "le paysage" , correct: true },
        ],
      },
      {
        id: 18,
        type: "QCM",
        enonce: "Avez-vous des enfants ?",
        choix: [
          { lettre: "A", texte: "have you get children?" },
          { lettre: "B", texte: "have you children?" },
          { lettre: "C", texte: "have you got children?" , correct: true },
        ],
      },
      {
        id: 19,
        type: "QCM",
        enonce: "I went to Paris …… air:",
        choix: [
          { lettre: "A", texte: "by" , correct: true },
          { lettre: "B", texte: "in the" },
          { lettre: "C", texte: "with" },
          { lettre: "D", texte: "on" },
        ],
      },
      {
        id: 20,
        type: "QCM",
        enonce: "“A refound”, signifie :",
        choix: [
          { lettre: "A", texte: "un remboursement" , correct: true },
          { lettre: "B", texte: "un refus" },
          { lettre: "C", texte: "une retrouvaille" },
        ],
      },
    ],
  },
  {
    id: "reglementation_vtc",
    nom: "F(V) - Développement commercial et gestion propre à l'activité de VTC",
    duree: 30,
    coefficient: 3,
    noteEliminatoire: 6,
    noteSur: 40,
    questions: [
      {
        id: 1,
        type: "QRC",
        enonce: "DÉFINISSEZ LA NOTION DE MARGE DE GESTION ?",
      },
      {
        id: 2,
        type: "QRC",
        enonce: "A quoi sert la reformulation à la fin d'un échange pour une réservation (téléphonique ou face à face) ? (QRC)",
        reponseQRC: "A confirmer la demande transmise par le client afin d'éviter toute erreur ou tout quiproquo",
      },
      {
        id: 3,
        type: "QRC",
        enonce: "Citez 4 moyens de communication à votre disposition pour faire connaitre votre entreprise ? (QRC)",
        reponseQRC: "Tract, sms, site internet, radio, télé, bouche à oreille",
      },
      {
        id: 4,
        type: "QRC",
        enonce: "En cas de retard très important d'un client, que faites-vous ? (QRC)",
        reponseQRC: "Dans un premier temps je prends contact avec le client afin de lui demander son heure d’arrivée. En fonction de celle-ci je lui propose de lui réserver un autre VTC si j’ai une autre course prévue. Dans le cas contraire le client ayant réservé la course, je l’attends",
      },
      {
        id: 5,
        type: "QCM",
        enonce: "Qu'est-ce qu'une zone de chalandise ?",
        choix: [
          { lettre: "A", texte: "C'est le nombre de conducteurs de VTC qu'il y a dans une zone géographique" },
          { lettre: "B", texte: "C'est la zone géographique d'où provient la majorité de la clientèle" , correct: true },
          { lettre: "C", texte: "C'est un bateau" },
        ],
      },
      {
        id: 6,
        type: "QCM",
        enonce: "Vendre une prestation à perte :",
        choix: [
          { lettre: "A", texte: "est interdit par le code du commerce", correct: true },
          { lettre: "B", texte: "n'est possible que lorsqu'un contrat annuel de type abonnement a été souscrit par le client", correct: true },
          { lettre: "C", texte: "constitue une forme de concurrence déloyale", correct: true },
        ],
      },
      {
        id: 7,
        type: "QCM",
        enonce: "Un véhicule présente un coût de revient monôme de 0.88€/km. Son prix de vente est de 0.97 €/km :",
        choix: [
          { lettre: "A", texte: "le bénéfice unitaire est de 0.97 €" , correct: true },
          { lettre: "B", texte: "une course de 15 kilomètres sera rentable" },
          { lettre: "C", texte: "une course de 5 kilomètres ne sera pas rentable" },
          { lettre: "D", texte: "le bénéfice est de 0.09 €" , correct: true },
        ],
      },
      {
        id: 8,
        type: "QCM",
        enonce: "Le sourire a t-il une incidence au téléphone ?",
        choix: [
          { lettre: "A", texte: "ca dépend" },
          { lettre: "B", texte: "oui, tout à fait" , correct: true },
          { lettre: "C", texte: "non, car l'interlocureur ne me voit pas" },
        ],
      },
      {
        id: 9,
        type: "QCM",
        enonce: "Que doit-on dire lorsqu'on décroche un appel téléphonique ?",
        choix: [
          { lettre: "A", texte: "allô ?" },
          { lettre: "B", texte: "le nom de la sociétév" },
          { lettre: "C", texte: "le nom de la société et bonjour" , correct: true },
        ],
      },
      {
        id: 10,
        type: "QCM",
        enonce: "Sont des charges fixes du véhicule :",
        choix: [
          { lettre: "A", texte: "les pneumatiques" },
          { lettre: "B", texte: "l'amortissement du véhicule" , correct: true },
          { lettre: "C", texte: "l'entretien et la réparation du véhicule" },
          { lettre: "D", texte: "le salaire du conducteur" , correct: true },
        ],
      },
      {
        id: 11,
        type: "QCM",
        enonce: "Le prix psychologique correspond :",
        choix: [
          { lettre: "A", texte: "au prix dont se souvient le consommateur" },
          { lettre: "B", texte: "au prix percu par le consommateur" },
          { lettre: "C", texte: "au prix de référence pour une catégorie de produits / prestations" },
          { lettre: "D", texte: "Au prix que le consommateur est prêt à payer pour acheter le produit/la prestation" , correct: true },
        ],
      },
      {
        id: 12,
        type: "QCM",
        enonce: "Selon vous, la démarche commerciale consiste à :",
        choix: [
          { lettre: "A", texte: "multiplier les actions de prospections (e-mailling, carte de visite dans les hôtels, ... )" , correct: true },
          { lettre: "B", texte: "travailler essentiellement sur recommandations" },
          { lettre: "C", texte: "attendre que les clients se présentent d'eux-mêmes" },
        ],
      },
      {
        id: 13,
        type: "QCM",
        enonce: "Le seuil de rentabilité d'une entreprise est atteint lorsque :",
        choix: [
          { lettre: "A", texte: "le chiffre d'affaires permet de couvrir toutes les charges" , correct: true },
          { lettre: "B", texte: "l'entreprise dégage sa marge bénéficiaire prévisionnelle" },
          { lettre: "C", texte: "le chiffre d'affaires permet de couvrir les charges fixes" },
        ],
      },
      {
        id: 14,
        type: "QCM",
        enonce: "Lors du transport d'une personne atteinte de déficience visuelle, je dois :",
        choix: [
          { lettre: "A", texte: "donner des repères pendant le trajet" , correct: true },
          { lettre: "B", texte: "parler fort" },
          { lettre: "C", texte: "me présenter" , correct: true },
        ],
      },
      {
        id: 15,
        type: "QCM",
        enonce: "Le prix de vente d'une prestation doit être égal au :",
        choix: [
          { lettre: "A", texte: "coût de revient + TVA" },
          { lettre: "B", texte: "coût de revient + marge + TVA" , correct: true },
          { lettre: "C", texte: "total des charges variables + TVA" },
        ],
      },
      {
        id: 16,
        type: "QCM",
        enonce: "Quelle affirmation est vraie ?",
        choix: [
          { lettre: "A", texte: "lorsque la demande est supérieur à l'offre, les prix augmentent" },
          { lettre: "B", texte: "lorsque la demande est inférieure à l'offre, les prix augmentent", correct: true },
          { lettre: "C", texte: "lorsque la demande est supérieur à l'offre, les prix diminuent" , correct: true },
        ],
      },
    ],
  },
  {
    id: "reglementation_vtc2",
    nom: "G(V) - Réglementation nationale spécifique à l'activité de VTC",
    duree: 20,
    coefficient: 3,
    noteEliminatoire: 6,
    noteSur: 24,
    questions: [
      {
        id: 1,
        type: "QRC",
        enonce: "Décrivez précisément les emplacements de la signalétique VTC sur un véhicule exploité comme voiture de transport avec chauffeur. (QRC)",
        reponseQRC: "En bas à gauche de la place chauffeur du pare-brise avant, angle du pare-brise arrière en bas à droite, à l'opposé de la place du chauffeur.",
      },
      {
        id: 2,
        type: "QRC",
        enonce: "De quelle couleur est la vignette qui doit figurer obligatoirement sur un véhicule de transport avec chauffeur ? Citez 2 éléments figurant sur cette vignette. (QRC)",
        reponseQRC: "La vignette est rouge, il est inscrit dessus le n° d’immatriculation du véhicule et le n° d’inscription au registre des VTC",
      },
      {
        id: 3,
        type: "QCM",
        enonce: "La taille minimale exigée pour un véhicule de transport avec un chauffeur est de :",
        choix: [
          { lettre: "A", texte: "L 4.8 x l 1.7 m" },
          { lettre: "B", texte: "L 4.5 x l 1.7 m" , correct: true },
          { lettre: "C", texte: "L 4.5 x l 1.8 m" },
        ],
      },
      {
        id: 4,
        type: "QCM",
        enonce: "Pour chaque véhicule exploité comme VTC, une capacité financière est exigée. Quel est son montant ?",
        choix: [
          { lettre: "A", texte: "1 500 €" , correct: true },
          { lettre: "B", texte: "100 €" },
          { lettre: "C", texte: "8 000 €" },
        ],
      },
      {
        id: 5,
        type: "QCM",
        enonce: "Le renouvellement de l'inscription au registre des VTC doit avoir lieu :",
        choix: [
          { lettre: "A", texte: "elle se fait automatiquement" },
          { lettre: "B", texte: "tous les ans", correct: true },
          { lettre: "C", texte: "tous les 5 ans" , correct: true },
        ],
      },
      {
        id: 6,
        type: "QCM",
        enonce: "En cas de défaut de signalétique VTC vous risquez :",
        choix: [
          { lettre: "A", texte: "Une contravention de 5 ème classe" },
          { lettre: "B", texte: "Une contravention de 1 ère classe" },
          { lettre: "C", texte: "Une contravention de 4 ème classe" , correct: true },
        ],
      },
      {
        id: 7,
        type: "QCM",
        enonce: "Je peux utiliser un véhicule acheté en janvier 2012 pour exercer la profession de VTC ?",
        choix: [
          { lettre: "A", texte: "oui, à la condition qu'il respecte les critères de puissance et de dimensions" },
          { lettre: "B", texte: "oui, si c'est un véhicule hybride ou électrique" , correct: true },
        ],
      },
      {
        id: 8,
        type: "QCM",
        enonce: "Je peux m'inscrire au registre des VTC avant d'avoir ma carte professionnelle ?",
        choix: [
          { lettre: "A", texte: "oui" },
          { lettre: "B", texte: "oui, mais je dois au moins avoir réussi mon examen de conducteur de VTC" },
          { lettre: "C", texte: "non" , correct: true },
        ],
      },
    ],
  },
];

const eb3Matieres: Matiere[] = [
  {
    id: "t3p",
    nom: "A - Transport Public Particulier de Personnes (T3P)",
    duree: 45,
    coefficient: 3,
    noteEliminatoire: 6,
    noteSur: 36,
    questions: [
      {
        id: 1,
        type: "QRC",
        enonce: "Quel est le poids maximal autorisé en charge (PTAC) d'un véhicule affecté au T3P et pour combien de places maximum ? Précisez avec ou sans chauffeur (QRC)",
        reponseQRC: "3,5 tonnes (3 500 kg) et 9 places, conducteur compris",
        reponses_possibles: [
          "3,5 tonnes (3 500 kg) et 9 places, conducteur compris",
          "Poids : mois de 3,5 tonnes et 9 place chauffeur compris",
          "3,5 tonnes et 9 places, conducteur compris",
        ],
      },
      {
        id: 2,
        type: "QRC",
        enonce: "Citez 4 compétences des commissions locales du T3P ? (QRC)",
        reponseQRC: "Etablir un rapport annuel pour l'observatoire sur l'économie du T3P concernant le département. Recevoir à sa demande tous les renseignements et statistiques dont disposent les pouvoirs publics. Etre informés de tous projets de nouvelles ADS du département. Peut rendre un avis sur toutes les questions précédentes. Peut être saisie par une autorité organisatrice de transports. Elles s'occupent de la discipline sur les cartes professionnelles dans leur domaine de compétences.",
      },
      {
        id: 3,
        type: "QRC",
        enonce: "Quelles sont les sanctions administratives encourues par un conducteur de T3P en cas de violation de la réglementation de la profession ? (QRC)",
        reponseQRC: "L'avertissement, Le retrait (temporaire ou définitif) de la carte professionnelle.",
        reponses_possibles: [
          "L'avertissement, Le retrait (temporaire ou définitif) de la carte professionnelle.",
          "Avertissement Retrait temporaire ou définitif de la carte professionnelle.",
          "Un avertissement. Un retrait temporaire ou définitif de la carte professionnelle",
        ],
      },
      {
        id: 4,
        type: "QRC",
        enonce: "Quelles sont les deux assurances obligatoires qu'un conducteur de T3P doit souscrire ?",
        reponseQRC: "Assurance du véhicule. Responsabilité civile professionnelle du conducteur (RCP).",
        reponses_possibles: [
          "Assurance du véhicule. Responsabilité civile professionnelle du conducteur (RCP).",
          "Assurance responsabilité civile professionnelle et assurance de véhicule",
          "Assurance véhicule et assurance responsabilité civile professionnelle",
          "Assurance responsabilité civile professionnelle Assurance de voiture",
          "La responsabilité civile professionnelle. La responsabilité civile circulation à titre onéreux",
        ],
      },
      {
        id: 5,
        type: "QRC",
        enonce: "Développez le sigle \"T3P\" (QRC)",
      },
      {
        id: 6,
        type: "QCM",
        enonce: "Quelle est l'autorité compétente organisatrice de l'examen du T3P ?",
        choix: [
          { lettre: "A", texte: "La préfecture" },
          { lettre: "B", texte: "La chambre de métiers et de l’artisanat" , correct: true },
          { lettre: "C", texte: "Les centres de formation" },
          { lettre: "D", texte: "La chambre de commerce et d’industrie" },
        ],
      },
      {
        id: 7,
        type: "QCM",
        enonce: "Quelle est la périodicité de la formation continue pour le T3P ?",
        choix: [
          { lettre: "A", texte: "Tous les 5 ans" , correct: true },
          { lettre: "B", texte: "Chaque année" },
          { lettre: "C", texte: "Jamais" },
          { lettre: "D", texte: "Tous les 2 ans" },
        ],
      },
      {
        id: 8,
        type: "QCM",
        enonce: "Quelle est la sanction encourue pour l'exercice illégal de l'activité de T3P ?",
        choix: [
          { lettre: "A", texte: "un an d’emprisonnement et 20 000 € d’amende" },
          { lettre: "B", texte: "un an d’emprisonnement et 15 000 € d’amende" , correct: true },
          { lettre: "C", texte: "6 mois d’emprisonnement et 10 000 € d’amende" },
          { lettre: "D", texte: "6 mois d’emprisonnement et 5 000 € d’amende" },
        ],
      },
      {
        id: 9,
        type: "QCM",
        enonce: "Parmi les condamnations suivantes, lesquelles peuvent être mentionnées au bulletin n° 2 du casier judiciaire ?",
        choix: [
          { lettre: "A", texte: "transporter et déposer des objets, déchets, liquides insalubres en un lieu sans l’autorisation de la personne ayant la jouissance du lieu" },
          { lettre: "B", texte: "poursuivre sa route, en connaissance de cause, après avoir occasionné un accident" , correct: true },
          { lettre: "C", texte: "transporter un appareil permettant de déceler la présence de systèmes servant à la constatation des infractions à la législation, ou à la réglementation de la circulation routière" },
          { lettre: "D", texte: "conduire avec un taux d’alcool dans le sang de 0,8 gramme par litre ou plus" , correct: true },
        ],
      },
      {
        id: 10,
        type: "QCM",
        enonce: "Quelle est la périodicité de la visite médicale d'un conducteur, âgé de 61 ans à ce jour ?",
        choix: [
          { lettre: "A", texte: "1 an" },
          { lettre: "B", texte: "2 ans" , correct: true },
          { lettre: "C", texte: "5 ans", correct: true },
          { lettre: "D", texte: "7 ans" },
        ],
      },
      {
        id: 11,
        type: "QCM",
        enonce: "Si un chauffeur utilise son véhicule T3P dans le cadre d'une activité non-professionnelle que doit-il faire ?",
        choix: [
          { lettre: "A", texte: "ne rien faire de spécifique" },
          { lettre: "B", texte: "enlever ou occulter toutes références à la profession exercée" , correct: true },
          { lettre: "C", texte: "apposer un panneau indiquant qu’il ne prend pas de client" },
          { lettre: "D", texte: "il n’a pas le droit d’utiliser son véhicule en dehors de son activité professionnelle" },
        ],
      },
      {
        id: 12,
        type: "QCM",
        enonce: "A partir de quel montant minimal, le conducteur de T3P a-t-il l'obligation de fournir une note de course ?",
        choix: [
          { lettre: "A", texte: "1 euro" },
          { lettre: "B", texte: "il n’ y a pas de montant minimal si c’est à la demande du client" , correct: true },
          { lettre: "C", texte: "15,24 €" },
          { lettre: "D", texte: "25 €" , correct: true },
        ],
      },
      {
        id: 13,
        type: "QCM",
        enonce: "Les conducteurs de T3P bénéficient-ils d'un régime particulier au niveau de la limitation de vitesse ?",
        choix: [
          { lettre: "A", texte: "oui, suivant l’accord conclu avec les autorités locales" },
          { lettre: "B", texte: "oui, suivant l’accord conclu avec le ministère de l’intérieur" },
          { lettre: "C", texte: "oui ou non en fonction du véhicule utilisé" },
          { lettre: "D", texte: "pas de régime particulier" , correct: true },
        ],
      },
      {
        id: 14,
        type: "QCM",
        enonce: "La carte professionnelle d'un conducteur de T3P :",
        choix: [
          { lettre: "A", texte: "doit-être apposée de telle manière que la photographie soit visible de l'intérieur par le client" },
          { lettre: "B", texte: "doit-être apposée de telle manière que la photographie soit visible de l'extérieur" , correct: true },
          { lettre: "C", texte: "il n'y a pas d'obligation d'apposer sa carte professionnelle dans le véhicule" },
        ],
      },
      {
        id: 15,
        type: "QCM",
        enonce: "Qui délivrent les agréments aux centres de formation ?",
        choix: [
          { lettre: "A", texte: "le ministère des transports pour les VTC, le ministère de l’environnement pour les 2 ou 3 roues, le ministère de l’intérieur pour les taxis" },
          { lettre: "B", texte: "les préfectures" , correct: true },
          { lettre: "C", texte: "l’association permanente des chambres de métiers et de l’artisanat" },
          { lettre: "D", texte: "les conseils départementaux" },
        ],
      },
    ],
  },
  {
    id: "gestion",
    nom: "B - Gestion",
    duree: 45,
    coefficient: 3,
    noteEliminatoire: 6,
    noteSur: 36,
    questions: [
      {
        id: 1,
        type: "QRC",
        enonce: "M. PAUL achète un véhicule le 1er mars 2018 pour une valeur de 24 000 € HT, amortissable de façon linéaire sur 5 ans. Ses comptes sont clôturés traditionnellement le 31 décembre de chaque année. (QRC)",
        reponseQRC: "Quelle est la valeur comptable du véhicule au 31 décembre 2021 ? (Détaillez les calculs)",
        reponses_possibles: [
          "Quelle est la valeur comptable du véhicule au 31 décembre 2021 ? (Détaillez les calculs)",
          "La valeur du véhicule est de 5 600 €.",
          "24000€/5 =4800€ ;4800€/12=400€ ;46*400€=18400€ ;24000€-18400€=5600€. (5600€)",
        ],
      },
      {
        id: 2,
        type: "QRC",
        enonce: "Chaque année, l'expert-comptable ou le comptable remet au dirigeant son bilan et son compte de résultat. Expliquer ce que représentent ces deux documents. (QRC)",
        reponseQRC: "Bilan : photographie à un instant donné du patrimoine de l'entreprise. ACTIF (ce que l'entreprise possède) / PASSIF (ce que l'entreprise doit) Toujours équilibré Réalisé et actualisé tous les ans. Compte de résultat : présentation de l'activité économique d'une entreprise CHARGES / PRODUITS Permet de déterminer le résultat de l'entreprise : bénéfice ou perte Réalisé et remis à zéro au début de chaque exercice",
      },
      {
        id: 3,
        type: "QCM",
        enonce: "Qu’est ce qu’une créance ?",
        choix: [
          { lettre: "A", texte: "une facture en attente de création" },
          { lettre: "B", texte: "une facture impayée par un client" , correct: true },
          { lettre: "C", texte: "une facture dû à un fournisseur" },
        ],
      },
      {
        id: 4,
        type: "QCM",
        enonce: "Les emprunts sont intégrés dans :",
        choix: [
          { lettre: "A", texte: "les immobilisations" },
          { lettre: "B", texte: "les capitaux permanents (Capitaux propres + Dettes à long terme)" , correct: true },
          { lettre: "C", texte: "les dettes à court terme" },
          { lettre: "D", texte: "les créances sur client" },
        ],
      },
      {
        id: 5,
        type: "QCM",
        enonce: "Le résultat d’une entreprise est obtenu par :",
        choix: [
          { lettre: "A", texte: "la différence entre les charges et les produits" , correct: true },
          { lettre: "B", texte: "la différence entre actif et passif" },
          { lettre: "C", texte: "stock + créances clients – dettes fournisseurs" },
        ],
      },
      {
        id: 6,
        type: "QCM",
        enonce: "Parmi ces propositions, laquelle (lesquelles) se trouve(nt) à l’actif du bilan :",
        choix: [
          { lettre: "A", texte: "véhicule" , correct: true },
          { lettre: "B", texte: "autorisation de stationnement (licence de taxi)" , correct: true },
          { lettre: "C", texte: "capital" },
          { lettre: "D", texte: "prêt bancaire" },
        ],
      },
      {
        id: 7,
        type: "QCM",
        enonce: "Quel est le taux de TVA applicable au transport de personnes ?",
        choix: [
          { lettre: "A", texte: "20 %" },
          { lettre: "B", texte: "10 %" , correct: true },
          { lettre: "C", texte: "19.6 %" },
          { lettre: "D", texte: "7 %" },
        ],
      },
      {
        id: 8,
        type: "QCM",
        enonce: "Comment appelle-t-on l’extrait d’immatriculation d’une entreprise artisanale ?",
        choix: [
          { lettre: "A", texte: "un extrait K-bis" },
          { lettre: "B", texte: "un extrait D1" , correct: true },
          { lettre: "C", texte: "un extrait de casier n°2" },
        ],
      },
      {
        id: 9,
        type: "QCM",
        enonce: "Qui préside une chambre de métiers et de l’artisanat ?",
        choix: [
          { lettre: "A", texte: "Un artisan" , correct: true },
          { lettre: "B", texte: "Le Préfet" },
          { lettre: "C", texte: "Un haut fonctionnaire" },
        ],
      },
      {
        id: 10,
        type: "QCM",
        enonce: "La durée de conservation des factures est de :",
        choix: [
          { lettre: "A", texte: "1 an à compter de la date d’édition" },
          { lettre: "B", texte: "6 à 10 ans à compter de la date d’édition" , correct: true },
          { lettre: "C", texte: "tout au long de la vie de l’entreprise" },
        ],
      },
      {
        id: 11,
        type: "QCM",
        enonce: "Quelle est la différence entre le SIRET et le SIREN ?",
        choix: [
          { lettre: "A", texte: "Aucune différence" },
          { lettre: "B", texte: "Le SIRET contient plus de chiffres" , correct: true },
          { lettre: "C", texte: "Le SIREN contient plus de chiffres" },
        ],
      },
      {
        id: 12,
        type: "QCM",
        enonce: "Qu'est-ce qu'un CFE au sein d'un établissement consulaire ?",
        choix: [
          { lettre: "A", texte: "Centre de formalités des entreprises" , correct: true },
          { lettre: "B", texte: "Cotisations foncières des entreprises" },
          { lettre: "C", texte: "Centre français des entreprises" },
        ],
      },
      {
        id: 13,
        type: "QCM",
        enonce: "Quelle est la durée de validité d’un devis ?",
        choix: [
          { lettre: "A", texte: "30 jours" },
          { lettre: "B", texte: "variable selon les mentions du devis" , correct: true },
          { lettre: "C", texte: "3 mois" },
        ],
      },
      {
        id: 14,
        type: "QCM",
        enonce: "Quels sont les différents types d’amortissements possibles ?",
        choix: [
          { lettre: "A", texte: "Dégressif" , correct: true },
          { lettre: "B", texte: "Linéaire" , correct: true },
          { lettre: "C", texte: "Exponentiel" },
        ],
      },
      {
        id: 15,
        type: "QCM",
        enonce: "Qu’est-ce que le code NAF (code de votre activité professionnelle) ?",
        choix: [
          { lettre: "A", texte: "nomenclature d’activités française" , correct: true },
          { lettre: "B", texte: "numéro artisanal français" },
          { lettre: "C", texte: "nombre d’artisans français" },
        ],
      },
      {
        id: 16,
        type: "QCM",
        enonce: "Qu’est-ce que le PCG en comptabilité (document utilisé par les experts comptables pour votre comptabilité)) ?",
        choix: [
          { lettre: "A", texte: "plan comptable général" , correct: true },
          { lettre: "B", texte: "PROGRAMME COMPLET DE GESTION" },
          { lettre: "C", texte: "plan commercial global" },
        ],
      },
      {
        id: 17,
        type: "QCM",
        enonce: "Quelle est la durée de validité d’un chèque ?",
        choix: [
          { lettre: "A", texte: "1 an et 8 jours" , correct: true },
          { lettre: "B", texte: "3 mois et 5 jours" },
          { lettre: "C", texte: "6 mois" },
          { lettre: "D", texte: "10 ans et 8 jours" },
        ],
      },
      {
        id: 18,
        type: "QCM",
        enonce: "Quel organisme est chargé de la collecte des cotisations sociales du régime général ?",
        choix: [
          { lettre: "A", texte: "la C.A.F." },
          { lettre: "B", texte: "la C.R.A.M." },
          { lettre: "C", texte: "l'U.R.S.S.A.F." , correct: true },
          { lettre: "D", texte: "la C.P.A.M." },
        ],
      },
    ],
  },
  {
    id: "securite",
    nom: "C - Sécurité routière",
    duree: 30,
    coefficient: 2,
    noteEliminatoire: 4,
    noteSur: 24,
    questions: [
      {
        id: 1,
        type: "QCM",
        enonce: "Le changement d’adresse sur une carte grise doit être effectué :",
        choix: [
          { lettre: "A", texte: "dans l’année qui suit le déménagement" },
          { lettre: "B", texte: "n’importe quand, il n’y a pas de délai" },
          { lettre: "C", texte: "dans le mois qui suit le déménagement" , correct: true },
          { lettre: "D", texte: "dans les six mois qui suivent le déménagement" },
        ],
      },
      {
        id: 2,
        type: "QCM",
        enonce: "Cet emplacement :",
        choix: [
          { lettre: "A", texte: "est réservé aux véhicules transportant une ou plusieurs personnes handicapées" },
          { lettre: "B", texte: "est réservé aux véhicules portant une carte de stationnement pour personnes handicapées" , correct: true },
          { lettre: "C", texte: "son occupation illicite est punie d’une contravention de troisième classe" },
          { lettre: "D", texte: "son occupation illicite fait encourir une mise en fourrière du véhicule" , correct: true },
        ],
      },
      {
        id: 3,
        type: "QCM",
        enonce: "L’éclatement d’un pneu, dû à un mauvais gonflage, provient plutôt :",
        choix: [
          { lettre: "A", texte: "d’un excès de pression" },
          { lettre: "B", texte: "d’un manque de pression" , correct: true },
          { lettre: "C", texte: "d’avoir deux pneus de taille différente" },
        ],
      },
      {
        id: 4,
        type: "QCM",
        enonce: "Lorsque je manœuvre :",
        choix: [
          { lettre: "A", texte: "je dois la priorité avant de manœuvrer" , correct: true },
          { lettre: "B", texte: "je suis toujours prioritaire" },
          { lettre: "C", texte: "je dois la priorité durant la manœuvre" , correct: true },
        ],
      },
      {
        id: 5,
        type: "QCM",
        enonce: "En cas de pluies, la vitesse maximale sur une autoroute est baissée à :",
        choix: [
          { lettre: "A", texte: "130 km/h" },
          { lettre: "B", texte: "120 km/h" },
          { lettre: "C", texte: "110 km/h" , correct: true },
        ],
      },
      {
        id: 6,
        type: "QCM",
        enonce: "En agglomération, l’usage de l’avertisseur sonore",
        choix: [
          { lettre: "A", texte: "est interdit de manière générale et absolue" },
          { lettre: "B", texte: "n’est autorisé qu’en cas de danger immédiat" , correct: true },
          { lettre: "C", texte: "est autorisé pour donner tout type d’avertissement aux autres usagers de la route" },
        ],
      },
      {
        id: 7,
        type: "QCM",
        enonce: "Que peut faire un automobiliste lorsqu'il y a une ligne de dissuasion ?",
        choix: [
          { lettre: "A", texte: "doubler un véhicule lent" , correct: true },
          { lettre: "B", texte: "doubler un autre véhicule" },
          { lettre: "C", texte: "ne doubler ni un autre véhicule ni un véhicule lent" },
        ],
      },
      {
        id: 8,
        type: "QCM",
        enonce: "Ce panneau :",
        choix: [
          { lettre: "A", texte: "m’indique une descente dangereuse dans un sens de circulation unique sur deux voies" },
          { lettre: "B", texte: "m’indique une descente dangereuse dans 1 500 mètres de distance" },
          { lettre: "C", texte: "m’indique une descente dangereuse sur une distance de 1 500 mètres" , correct: true },
          { lettre: "D", texte: "m’oblige à réduire ma vitesse" , correct: true },
        ],
      },
      {
        id: 9,
        type: "QCM",
        enonce: "Lorsque le permis a été invalidé en raison d'une perte totale de points, le nouveau permis obtenu est :",
        choix: [
          { lettre: "A", texte: "un permis probatoire doté d’un capital de 6 points" , correct: true },
          { lettre: "B", texte: "un permis probatoire doté d’un capital de 12 points" },
          { lettre: "C", texte: "un permis non probatoire doté d’un capital de 12 points" },
        ],
      },
      {
        id: 10,
        type: "QCM",
        enonce: "Un excès de vitessse de 35km /h au dessus de la vitesse maximale autorisée entraine une perte de :",
        choix: [
          { lettre: "A", texte: "1 point", correct: true },
          { lettre: "B", texte: "3 points" , correct: true },
          { lettre: "C", texte: "4 points" },
        ],
      },
      {
        id: 11,
        type: "QCM",
        enonce: "Vous avez consommé de l’alcool. A l’issue d’un contrôle routier, votre taux est de 0,29 mg par litre d’air expiré. Que se passe-t-il ?",
        choix: [
          { lettre: "A", texte: "vous n’avez pas de poursuites" },
          { lettre: "B", texte: "vous avez une contravention" },
          { lettre: "C", texte: "c’est un délit passible de poursuites judiciaires" },
          { lettre: "D", texte: "vous avez une contravention et une perte de 6 points" , correct: true },
        ],
      },
      {
        id: 12,
        type: "QCM",
        enonce: "Si mon temps de réaction augmente",
        choix: [
          { lettre: "A", texte: "la distance d’arrêt augmente" , correct: true },
          { lettre: "B", texte: "la distance d’arrêt est inchangée" },
          { lettre: "C", texte: "la distance de réaction augmente" , correct: true },
          { lettre: "D", texte: "la distance de freinage augmente" },
        ],
      },
      {
        id: 13,
        type: "QCM",
        enonce: "Le niveau 3 des pictogrammes figurant sur les boîtes de médicament et alertant des risques en cas de conduite est de couleur :",
        choix: [
          { lettre: "A", texte: "rouge" , correct: true },
          { lettre: "B", texte: "jaune" },
          { lettre: "C", texte: "orange" },
        ],
      },
      {
        id: 14,
        type: "QCM",
        enonce: "En cas d’absorption d’alcool, on observe une augmentation :",
        choix: [
          { lettre: "A", texte: "du champ visuel" },
          { lettre: "B", texte: "de la distance de freinage" },
          { lettre: "C", texte: "du temps de réaction" , correct: true },
          { lettre: "D", texte: "des réflexes" },
        ],
      },
      {
        id: 15,
        type: "QCM",
        enonce: "Le dépistage de stupéfiants est :",
        choix: [
          { lettre: "A", texte: "obligatoire lors d’un accident mortel" , correct: true },
          { lettre: "B", texte: "possible lors d’un accident corporel ou matériel" , correct: true },
          { lettre: "C", texte: "obligatoire pour toute infraction" },
        ],
      },
      {
        id: 16,
        type: "QCM",
        enonce: "Quelles sont les actions à mettre en œuvre en présence d’un blessé :",
        choix: [
          { lettre: "A", texte: "retirer son casque" },
          { lettre: "B", texte: "parler à la victime" , correct: true },
          { lettre: "C", texte: "donner à boire de l’eau" },
        ],
      },
      {
        id: 17,
        type: "QCM",
        enonce: "En présence d’un accident qui vient d’avoir lieu, je dois :",
        choix: [
          { lettre: "A", texte: "protéger, alerter, secourir" , correct: true },
          { lettre: "B", texte: "alerter, secourir, protéger" },
          { lettre: "C", texte: "secourir, protéger, alerter" },
        ],
      },
      {
        id: 18,
        type: "QCM",
        enonce: "Lorsque les pneus sont sous-gonflés cela entraîne :",
        choix: [
          { lettre: "A", texte: "une augmentation de la consommation de carburant" , correct: true },
          { lettre: "B", texte: "une meilleure adhérence à la route" },
          { lettre: "C", texte: "un risque accru d’éclatement" , correct: true },
        ],
      },
      {
        id: 19,
        type: "QCM",
        enonce: "En pratiquant l’éco-conduite, j’adopte une conduite responsable, conduire moins vite c’est :",
        choix: [
          { lettre: "A", texte: "moins de rejet de dioxyde de carbone" , correct: true },
          { lettre: "B", texte: "baisse de la consommation de carburant" , correct: true },
          { lettre: "C", texte: "moins de rejet d’O2" },
        ],
      },
      {
        id: 20,
        type: "QCM",
        enonce: "Dans quel délai un automobiliste doit-il transmettre un constat amiable à son assureur ?",
        choix: [
          { lettre: "A", texte: "2 jours" },
          { lettre: "B", texte: "5 jours" , correct: true },
          { lettre: "C", texte: "7 jours" },
          { lettre: "D", texte: "1 mois" },
        ],
      },
    ],
  },
  {
    id: "francais",
    nom: "D - Capacité d'expression et de compréhension en langue française",
    duree: 30,
    coefficient: 2,
    noteEliminatoire: 5,
    noteSur: 24,
    texteSupport: `Le véhicule automatisé intrigue et fascine. Reste à savoir quand et comment nous allons pouvoir lâcher le volant.

La voiture autonome titille les esprits, même si on a parfois le sentiment qu'elle est un moyen de communication facile pour les constructeurs et les équipementiers. Les prototypes actuels, bardés d'une armée de capteurs, réussissent en effet de spectaculaires démonstrations dont les médias sont friands.

La voiture autonome porte en elle de nombreuses promesses. Elle devrait éradiquer la mortalité routière en supprimant toute intervention humaine sur la conduite. Elle devrait permettre à chacun d'accéder en permanence à une mobilité personnelle. Elle devrait supprimer les embouteillages en participant à la rationalisation du trafic. Elle devrait, aussi, rendre la planète plus propre, car elle sera forcément mue par l'électricité.

Il y a quelque chose de mystique dans la voiture autonome. Des dizaines de milliers de personnes se penchent sur elle chaque jour dans le monde entier, sans savoir quand elle arrivera sur les routes. Du moins dans sa forme aboutie, c'est-à-dire celle qui lui permettra de se dispenser de conducteur (niveau 5). Pour que des voitures autonomes soient vraiment mises en circulation, elles devront vraiment être capables de faire face à toutes les situations, même en cas de comportement erratique du piéton. La voiture sans chauffeur, sans volant ni pédales de frein ou d'accélérateur pourrait se faire attendre.`,
    texteSource: "Philippe Doucet, Libération.fr le 03/10/2018",
    questions: [
      {
        id: 1,
        type: "QRC",
        enonce: "Que veut dire \"de spectaculaires démonstrations dont les médias sont friands\" ? (QRC)",
        reponseQRC: "Les médias aiment le sensationnel .Ils montrent toujours plus d'images fortes, divulguent des \"informations - choc\" pour faire le buzz, souhaitent marquer les esprits voire même dépasser leurs concurrents dans l'immédiateté de l'information. De nos jours, les spectateurs sont aussi en attente de ces images souvent relayées de manière instantanée, sans recul .Cela fait partie d'un \"voyeurisme \"ambiant.",
      },
      {
        id: 2,
        type: "QRC",
        enonce: "Que veut dire \"des piétons moins soucieux des règles\" d'après vous (phrase non présente dans le texte) ? (QRC)",
        reponseQRC: "Certains piétons renoncent ou ne veulent pas à respecter les règles du code de la route et font ce qu'ils veulent sur les chaussées (traversent en dehors des passages piétons) au risque de mettre leur vie en danger.",
      },
      {
        id: 3,
        type: "QRC",
        enonce: "D'après le texte et sans paraphraser, quelles sont les promesses de la voiture autonome ? (QRC)",
        reponseQRC: "Suppression de la mortalité routière, la mobilité personnelle sera accessible à tous, suppression des embouteillages et non-polluante.",
        reponses_possibles: [
          "Suppression de la mortalité routière, la mobilité personnelle sera accessible à tous, suppression des embouteillages et non-polluante.",
          "Eradiquer la mortalité routière, accéder à la mobilité personnelle, suppression des embouteillages, rendre la planète plus propre.",
        ],
      },
      {
        id: 4,
        type: "QCM",
        enonce: "Donnez un synonyme du verbe \" titiller\":",
        choix: [
          { lettre: "A", texte: "tracasser" , correct: true },
          { lettre: "B", texte: "interpeller" },
          { lettre: "C", texte: "taquiner" , correct: true },
        ],
      },
      {
        id: 5,
        type: "QCM",
        enonce: "Que signifie le verbe “éradiquer”?",
        choix: [
          { lettre: "A", texte: "maintenir" },
          { lettre: "B", texte: "faire disparaître", correct: true },
          { lettre: "C", texte: "conserver" },
        ],
      },
      {
        id: 6,
        type: "QCM",
        enonce: "Donnez le contraire de l’adjectif “autonome”.",
        choix: [
          { lettre: "A", texte: "assistée" , correct: true },
          { lettre: "B", texte: "libre" },
          { lettre: "C", texte: "indépendant" },
        ],
      },
      {
        id: 7,
        type: "QCM",
        enonce: "Dans le texte, quel est le sens du mot « bardés » ?",
        choix: [
          { lettre: "A", texte: "devenus menaçants" },
          { lettre: "B", texte: "avec un prix réduit" },
          { lettre: "C", texte: "couverts" , correct: true },
        ],
      },
      {
        id: 8,
        type: "QCM",
        enonce: "Un comportement erratique, c’est :",
        choix: [
          { lettre: "A", texte: "un comportement instable" , correct: true },
          { lettre: "B", texte: "un comportement sans cohérence" , correct: true },
          { lettre: "C", texte: "un comportement dangereux" },
        ],
      },
      {
        id: 9,
        type: "QCM",
        enonce: "La voiture autonome est un moyen de communication facile pour les constructeurs car :",
        choix: [
          { lettre: "A", texte: "le concept n’intéresse que les médias et pas le grand public" },
          { lettre: "B", texte: "elles sont équipées d’un système qui leur permet d’échanger des informations entre elles" },
          { lettre: "C", texte: "les médias diffusent les démonstrations des voitures autonomes ce qui permet de faire de la publicité aux constructeurs" , correct: true },
        ],
      },
      {
        id: 10,
        type: "QCM",
        enonce: "« Elles sera forcément mue par l’électricité » signifie :",
        choix: [
          { lettre: "A", texte: "elle se déplacera avec l’électricité comme source d’énergie" , correct: true },
          { lettre: "B", texte: "elle se sera débarrassée de l’électricité pour se déplacer" , correct: true },
          { lettre: "C", texte: "pour se mouvoir, elle utilisera l’électricité" , correct: true },
        ],
      },
    ],
  },
  {
    id: "anglais",
    nom: "E - Capacité d'expression et de compréhension en langue anglaise",
    duree: 20,
    coefficient: 1,
    noteEliminatoire: 4,
    noteSur: 20,
    questions: [
      {
        id: 1,
        type: "QCM",
        enonce: "Can you turn left at the next light?",
        choix: [
          { lettre: "A", texte: "sorry I have no light, I don’t smoke" },
          { lettre: "B", texte: "sorry the street is closed" , correct: true },
          { lettre: "C", texte: "sorry I never turn left" },
        ],
      },
      {
        id: 2,
        type: "QCM",
        enonce: "How long will it take to get there?",
        choix: [
          { lettre: "A", texte: "about two and a half miles" },
          { lettre: "B", texte: "about twenty minutes" , correct: true },
          { lettre: "C", texte: "around three thirty" },
        ],
      },
      {
        id: 3,
        type: "QCM",
        enonce: "Which French monuments do you advise us to visit?",
        choix: [
          { lettre: "A", texte: "I don’t see" },
          { lettre: "B", texte: "you can go by car or by train to visit them" },
          { lettre: "C", texte: "I think that the Louvres and the Reims Cathedral would be great" , correct: true },
        ],
      },
      {
        id: 4,
        type: "QCM",
        enonce: "Which currency can I use to pay for the trip?",
        choix: [
          { lettre: "A", texte: "I only accept cash and card" },
          { lettre: "B", texte: "you can only pay in Euro" , correct: true },
          { lettre: "C", texte: "it’s possible to pay by cheques" },
        ],
      },
      {
        id: 5,
        type: "QCM",
        enonce: "I'm sorry, Mrs but there is a lot of traffic today",
        choix: [
          { lettre: "A", texte: "don’t worry I’ve got plenty of time" , correct: true },
          { lettre: "B", texte: "do you like baked beans?" },
          { lettre: "C", texte: "no need to worry, I’ve got plenty of time" , correct: true },
          { lettre: "D", texte: "it’s very sunny today" },
        ],
      },
      {
        id: 6,
        type: "QCM",
        enonce: "I’m cold, ……… I ……… the window:",
        choix: [
          { lettre: "A", texte: "could, closed" },
          { lettre: "B", texte: "can, closed" },
          { lettre: "C", texte: "can, close" , correct: true },
        ],
      },
      {
        id: 7,
        type: "QCM",
        enonce: "“A refound”, signifie :",
        choix: [
          { lettre: "A", texte: "un refus" },
          { lettre: "B", texte: "un remboursement" , correct: true },
          { lettre: "C", texte: "une retrouvaille" },
        ],
      },
      {
        id: 8,
        type: "QCM",
        enonce: "My GPS isn’t working, I need to go……….a map:",
        choix: [
          { lettre: "A", texte: "buy" },
          { lettre: "B", texte: "by" , correct: true },
          { lettre: "C", texte: "bye" },
        ],
      },
      {
        id: 9,
        type: "QCM",
        enonce: "Sorry! It’s quite expensive for us. May we get a ……………… price?",
        choix: [
          { lettre: "A", texte: "lower" , correct: true },
          { lettre: "B", texte: "reduction" },
          { lettre: "C", texte: "gooder" },
          { lettre: "D", texte: "less" },
        ],
      },
      {
        id: 10,
        type: "QCM",
        enonce: "“To demand”, signifie",
        choix: [
          { lettre: "A", texte: "demander" },
          { lettre: "B", texte: "exiger" , correct: true },
          { lettre: "C", texte: "supplier" },
        ],
      },
      {
        id: 11,
        type: "QCM",
        enonce: "Les ceintures de sécurité sont obligatoires dans le véhicule.",
        choix: [
          { lettre: "A", texte: "you may fasten your seatbelt in the car" },
          { lettre: "B", texte: "you will fasten your seatbelt in the car" },
          { lettre: "C", texte: "you must fasten your seatbelt in the car" , correct: true },
        ],
      },
      {
        id: 12,
        type: "QCM",
        enonce: "Où voulez-vous aller?",
        choix: [
          { lettre: "A", texte: "where will you go?" },
          { lettre: "B", texte: "where do you want to go?" , correct: true },
          { lettre: "C", texte: "who do you want to go?" },
        ],
      },
      {
        id: 13,
        type: "QCM",
        enonce: "Y a-t-il une prise USB accessible aux places arrières ?",
        choix: [
          { lettre: "A", texte: "has it a USB plug available for the backseats?" },
          { lettre: "B", texte: "has it a USB plug available for the rear of the car?" },
          { lettre: "C", texte: "is there a USB plug available at the backseats?" , correct: true },
          { lettre: "D", texte: "is there a USB plug available for the rear of the car?" },
        ],
      },
      {
        id: 14,
        type: "QCM",
        enonce: "Acceptez-vous les cartes de crédit étrangères ?",
        choix: [
          { lettre: "A", texte: "do you take stranger credit cards?" },
          { lettre: "B", texte: "do you accept foreign credit cards?" , correct: true },
          { lettre: "C", texte: "do you have any money?" },
        ],
      },
      {
        id: 15,
        type: "QCM",
        enonce: "Mon bagage est lourd, pouvez-vous m’attendre sur le quai ?",
        choix: [
          { lettre: "A", texte: "my bags will be heavy, can you wait me on the key?" },
          { lettre: "B", texte: "my luggage is heavy, can you wait for me on the platform?" , correct: true },
          { lettre: "C", texte: "my luggage is heavy, can wait for me on the key?" },
          { lettre: "D", texte: "my bags are heavy, can you wait for me on the platform?" },
        ],
      },
      {
        id: 16,
        type: "QCM",
        enonce: "Can you take us to the airport before 4 pm?",
        choix: [
          { lettre: "A", texte: "peux-tu nous prendre à l’aéroport à 4h ?" },
          { lettre: "B", texte: "pouvez-vous aller à l’aéroport à 4h de l’après midi ?" },
          { lettre: "C", texte: "pouvez-vous nous conduire à l’aéroport avant 4h de l’après midi ?" , correct: true },
        ],
      },
      {
        id: 17,
        type: "QCM",
        enonce: "I don’t understand what you mean.",
        choix: [
          { lettre: "A", texte: "je ne comprends pas ce que vous voulez" },
          { lettre: "B", texte: "je ne comprends pas ce que vous dites" },
          { lettre: "C", texte: "je ne comprends pas ce que vous voulez dire" , correct: true },
          { lettre: "D", texte: "je comprends tout ce que vous dites" },
        ],
      },
      {
        id: 18,
        type: "QCM",
        enonce: "We are four! May I sit in the front seat?",
        choix: [
          { lettre: "A", texte: "ils sont quatre ! Mais vais-je m’asseoir devant ?" },
          { lettre: "B", texte: "nous en avons quatre ! Puis je en mettre sur le devant ?" },
          { lettre: "C", texte: "nous sommes quatre ! Puis je m’asseoir devant ?" , correct: true },
        ],
      },
      {
        id: 19,
        type: "QCM",
        enonce: "For international flights, travelers have to arrive two hours prior to departure",
        choix: [
          { lettre: "A", texte: "pour les vols internationaux, les voyageurs prioritaires arrivent deux heures avant le départ" },
          { lettre: "B", texte: "pour les vols internationaux, les voyageurs doivent arriver deux heures avant le départ" , correct: true },
          { lettre: "C", texte: "les voyageurs étrangers doivent arriver deux heures avant le départ" },
        ],
      },
      {
        id: 20,
        type: "QCM",
        enonce: "I took a taxi because the buses were on strike",
        choix: [
          { lettre: "A", texte: "j’ai pris un taxi car les bus étaient en grève" , correct: true },
          { lettre: "B", texte: "je prends un taxi car les bus sont lents" },
          { lettre: "C", texte: "j’ai pris un taxi car les bus ne fonctionnaient pas" },
        ],
      },
    ],
  },
  {
    id: "reglementation_vtc",
    nom: "F(V) - Développement commercial et gestion propre à l'activité de VTC",
    duree: 30,
    coefficient: 3,
    noteEliminatoire: 6,
    noteSur: 40,
    questions: [
      {
        id: 1,
        type: "QRC",
        enonce: "Qui fixe le prix d'une prestation de VTC, selon quelle contrainte ? (QRC)",
        reponseQRC: "Le chauffeur VTC en fonction de l'offre et de la demande de son lieu d'exercice",
      },
      {
        id: 2,
        type: "QRC",
        enonce: "Citez 4 moyens de communication à votre disposition pour faire connaître votre entreprise ? (QRC)",
        reponseQRC: "site-web ou blog E-mailing Texto Journaux locaux Flyers Presse professionnelle Radio locale Réseaux sociaux",
        reponses_possibles: [
          "site-web ou blog E-mailing Texto Journaux locaux Flyers Presse professionnelle Radio locale Réseaux sociaux",
          "Mail,BOUCHE A OREILLE,Réseau sociaux,prospectus",
          "Carte visiteSite webRéseau sociauxDe bouche a oreille",
          "E-mailing , texto , journaux , réseaux sociaux",
        ],
      },
      {
        id: 3,
        type: "QRC",
        enonce: "Votre client oublie son portefeuille dans votre véhicule. Que faites-vous ? (QRC)",
        reponseQRC: "Le contacter le plus rapidement possible, le rassurer, lui proposer de ramener son bien le plus surement et rapidement possible",
      },
      {
        id: 4,
        type: "QRC",
        enonce: "A quoi correspond le chiffre d'affaires d'un exploitant VTC ? (QRC)",
        reponseQRC: "Il correspond à la somme des prestations réalisées au cours d'un exercice (transports et prestations annexes).",
        reponses_possibles: [
          "Il correspond à la somme des prestations réalisées au cours d'un exercice (transports et prestations annexes).",
          "C'est la somme des ventes facturées aux clients",
          "C'est l'ensemble de prestations facturé aux clients.",
        ],
      },
      {
        id: 5,
        type: "QCM",
        enonce: "Le conducteur de VTC propose, dans le cadre de sa mission, des prestations de standing auprès d’une clientèle haut de gamme. Pour ces raisons il doit tout mettre en œuvre afin de ne pas avoir une réputation usurpée et se distinguer des autres transporteurs de personnes en :",
        choix: [
          { lettre: "A", texte: "prenant en charge tous les clients avec qui il peut être rentable sans tenir compte de la qualité de la prestation" },
          { lettre: "B", texte: "optimisant sa structure, adoptant une attitude et un comportement professionnel et disposant d’un véhicule remarquable et remarqué" , correct: true },
          { lettre: "C", texte: "prenant en charge des clients sans tenir compte des valeurs du conducteur de VTC, ni de la norme de la profession" },
          { lettre: "D", texte: "utilisant un véhicule puissant, en bon état de propreté afin de déposer le client le plus rapidement possible au mépris des règles élémentaires" },
        ],
      },
      {
        id: 6,
        type: "QCM",
        enonce: "Le prix psychologique correspond :",
        choix: [
          { lettre: "A", texte: "au prix perçu par le consommateur" },
          { lettre: "B", texte: "au prix que le consommateur est prêt à payer pour acheter le produit/la prestation" , correct: true },
          { lettre: "C", texte: "au prix dont se souvient le consommateur" },
          { lettre: "D", texte: "au prix de référence pour une catégorie de produits/prestations", correct: true },
        ],
      },
      {
        id: 7,
        type: "QCM",
        enonce: "Qu'est-ce qu'une zone de chalandise ?",
        choix: [
          { lettre: "A", texte: "c’est un bateau" },
          { lettre: "B", texte: "c’est le nombre de conducteurs de VTC qu’il y a dans une zone géographique" },
          { lettre: "C", texte: "c’est la zone géographique d’où provient la majorité de la clientèle" , correct: true },
        ],
      },
      {
        id: 8,
        type: "QCM",
        enonce: "Vendre une prestation à perte :",
        choix: [
          { lettre: "A", texte: "constitue une forme de concurrence déloyale" , correct: true },
          { lettre: "B", texte: "est interdit par le code du commerce" , correct: true },
          { lettre: "C", texte: "n'est possible que lorsqu'un contrat annuel de type abonnement a été souscrit par le client" },
        ],
      },
      {
        id: 9,
        type: "QCM",
        enonce: "Quelle affirmation est vraie :",
        choix: [
          { lettre: "A", texte: "lorsque l’offre est supérieure à la demande, les prix diminuent" , correct: true },
          { lettre: "B", texte: "lorsque l’offre est inférieure à la demande, les prix diminuent" },
          { lettre: "C", texte: "lorsque l’offre est supérieure à la demande, les prix augmentent" },
        ],
      },
      {
        id: 10,
        type: "QCM",
        enonce: "Le concierge dans un hôtel a pour fonction :",
        choix: [
          { lettre: "A", texte: "le ménage, la sortie des poubelles" },
          { lettre: "B", texte: "de satisfaire les besoins et demandes des clients" , correct: true },
          { lettre: "C", texte: "la surveillance de l’hôtel afin d’assurer la tranquillité des clients" },
        ],
      },
      {
        id: 11,
        type: "QCM",
        enonce: "Diriez-vous que fidéliser vos clients VTC coûte :",
        choix: [
          { lettre: "A", texte: "plus cher que d’en trouver de nouveaux" },
          { lettre: "B", texte: "moins cher que d’en trouver de nouveaux" , correct: true },
          { lettre: "C", texte: "le même prix que d’en trouver de nouveaux" },
        ],
      },
      {
        id: 12,
        type: "QCM",
        enonce: "En accueillant un client qui voyage seul, un chauffeur de VTC l'invite à prendre place :",
        choix: [
          { lettre: "A", texte: "sur le siège arrière gauche" },
          { lettre: "B", texte: "sur le siège arrière droit" , correct: true },
          { lettre: "C", texte: "sur le siège avant" },
        ],
      },
      {
        id: 13,
        type: "QCM",
        enonce: "Que doit-on dire lorsqu'on décroche un appel téléphonique ?",
        choix: [
          { lettre: "A", texte: "allo" },
          { lettre: "B", texte: "le nom de la société" },
          { lettre: "C", texte: "le nom de la société et bonjour" , correct: true },
        ],
      },
      {
        id: 14,
        type: "QCM",
        enonce: "La formule binôme permet de calculer le prix de revient sur les termes suivants :",
        choix: [
          { lettre: "A", texte: "le coût conducteur" },
          { lettre: "B", texte: "le coût variable par kilomètre" , correct: true },
          { lettre: "C", texte: "le coût fixe véhicule par jour" , correct: true },
        ],
      },
      {
        id: 15,
        type: "QCM",
        enonce: "Qu'est-ce qu'un prospect ?",
        choix: [
          { lettre: "A", texte: "une brochure publicitaire référençant l’ensemble d'un catalogue de prestation" },
          { lettre: "B", texte: "une publicité sur format papier A5 ou plus petit permettant au conducteur de VTC de se faire connaître" },
          { lettre: "C", texte: "un client potentiel" , correct: true },
          { lettre: "D", texte: "l’ensemble des clients non facturés uniquement" },
        ],
      },
      {
        id: 16,
        type: "QRC",
        enonce: "Que signifie les 4P :",
        reponseQRC: "produits/prix/communication ou promotion/distribution ou place",
        reponses_possibles: [
          "produits/prix/communication ou promotion/distribution ou place",
          "projet/prix/communication ou promotion/distribution ou place",
          "produit/présence/communication ou promotion/distribution ou place",
          "produits/prix/commercialisation ou promotion/distribution ou place",
          "6 Règlementation nationale Taxi",
        ],
      },
    ],
  },
  {
    id: "reglementation_vtc2",
    nom: "G(V) - Réglementation nationale spécifique à l'activité de VTC",
    duree: 20,
    coefficient: 3,
    noteEliminatoire: 6,
    noteSur: 24,
    questions: [
      {
        id: 1,
        type: "QRC",
        enonce: "Indiquez où doivent être apposés les macarons de la signalétique VTC. (QRC)",
        reponseQRC: "En bas à gauche de la place chauffeur du pare-brise avant, angle du pare-brise arrière en bas à droite, à l'opposé de la place du chauffeur.En bas à gauche côté conducteur sur le par brise de devant En bas à droite à l'opposé du chauffeur sur le pare brise arrière",
      },
      {
        id: 2,
        type: "QRC",
        enonce: "Donnez la définition de l'activité de VTC (QRC)",
        reponseQRC: "Les activités de VTC sont « des exploitants qui mettent à la disposition de leur clientèle une ou p",
      },
      {
        id: 3,
        type: "QCM",
        enonce: "La durée maximale de stationnement précédant l'horaire de prise en charge mentionné par le client lors de sa réservation à un aéroport ou une gare pour un VTC est de :",
        choix: [
          { lettre: "A", texte: "30 minutes" },
          { lettre: "B", texte: "1 h 30" },
          { lettre: "C", texte: "1 heure", correct: true },
          { lettre: "D", texte: "45 minutes" },
        ],
      },
      {
        id: 4,
        type: "QCM",
        enonce: "Quel est le périmètre d'exercice de l'activité de conducteur de VTC ?",
        choix: [
          { lettre: "A", texte: "son département de résidence" , correct: true },
          { lettre: "B", texte: "sa commune de résidence" },
          { lettre: "C", texte: "Le territoire national" },
        ],
      },
      {
        id: 5,
        type: "QCM",
        enonce: "Un véhicule VTC doit être âgé de :",
        choix: [
          { lettre: "A", texte: "moins de 7 ans, sauf pour les véhicules de collection de 30 ans" , correct: true },
          { lettre: "B", texte: "moins de 5 ans, sauf pour les véhicules de collection de 15 ans" },
          { lettre: "C", texte: "moins de 6 ans, sauf pour les véhicules de collection de 25 ans" },
          { lettre: "D", texte: "moins de 5 ans, sauf pour les véhicules de collection de 20 ans" },
        ],
      },
      {
        id: 6,
        type: "QCM",
        enonce: "La longueur minimale hors tout d'un véhicule VTC hybride ou électrique :",
        choix: [
          { lettre: "A", texte: "Est de 4,50 mètres" , correct: true },
          { lettre: "B", texte: "Est de 4 mètres" },
          { lettre: "C", texte: "Est de 3 mètres" },
          { lettre: "D", texte: "Aucune longueur minimale n'est imposée" },
        ],
      },
      {
        id: 7,
        type: "QCM",
        enonce: "La prise en charge d'un client sur une voie ouverte à la circulation publique sans réservation préalable est :",
        choix: [
          { lettre: "A", texte: "autorisée si elle est consécutive à la dépose du client précédent sur le même lieu" },
          { lettre: "B", texte: "passible d'une suspension du permis de conduire" , correct: true },
          { lettre: "C", texte: "un délit puni d'une peine de prison et d'une amende pouvant aller jusqu'à 15 000€" , correct: true },
        ],
      },
      {
        id: 8,
        type: "QCM",
        enonce: "Parmi les dimensions suivantes, quelles sont celles qui permettent à une voiture d'être exploitée en VTC ?",
        choix: [
          { lettre: "A", texte: "Longueur 4,47 m et largeur 1,85 m" },
          { lettre: "B", texte: "Longueur 4,30 m et largeur 1,81 m" },
          { lettre: "C", texte: "Longueur 4,70 m et largeur 1,80 m" , correct: true },
          { lettre: "D", texte: "Longueur 4,61 m et largeur 1,77 m" , correct: true },
        ],
      },
    ],
  },
];

const eb4Matieres: Matiere[] = [
  {
    id: "t3p",
    nom: "A - Transport Public Particulier de Personnes (T3P)",
    duree: 45,
    coefficient: 3,
    noteEliminatoire: 6,
    noteSur: 36,
    questions: [
      {
        id: 1,
        type: "QRC",
        enonce: "Une centrale de réservation doit justifier de l'existence d'un contrat d'assurance couvrant quel type de responsabilité ? (QRC)",
        reponseQRC: "Elle doit prouver l'existence d'un contrat d'assurance couvrant sa responsabilité civile professionnelle",
      },
      {
        id: 2,
        type: "QRC",
        enonce: "Quelles sont les sanctions administratives encourues par un conducteur de T3P en cas de violation de la réglementation de la profession ? (QRC)",
        reponseQRC: "L'avertissement. Le retrait (temporaire ou définitif) de la carte professionnelle.",
      },
      {
        id: 3,
        type: "QRC",
        enonce: "Quel est le terme utilisé quand un conducteur de T3P prend en charge un client sur la voie publique sans réservation au préalable ? (QRC)",
      },
      {
        id: 4,
        type: "QRC",
        enonce: "Qu'est-ce qu'un service de transport régulier ? (QRC)",
        reponseQRC: "Service collectif dont l'itinéraire, les points d'arrêt, les fréquences les horaires, les tarifs sont fixés et publiés à l'avance.",
      },
      {
        id: 5,
        type: "QRC",
        enonce: "Citez deux cas dans lesquels la carte professionnelle peut être retirée à un conducteur du T3P ? (QRC)",
        reponseQRC: "Annulation permis de conduire. Délit pénal prévu par le code des transports (délits routiers, agressions sexuelles, cf code des transports, …)",
      },
      {
        id: 6,
        type: "QRC",
        enonce: "Pour s'inscrire à l'examen d'accès à la profession, le candidat ne doit pas avoir fait l'objet d'une exclusion pour fraude lors d'une session à un examen du T3P :",
        reponseQRC: "dans les 10 ans qui précèdent sa demande",
        reponses_possibles: [
          "dans les 10 ans qui précèdent sa demande",
          "dans les 5 ans qui précèdent sa demande",
          "dans les 2 ans qui précèdent sa demande",
        ],
      },
      {
        id: 7,
        type: "QRC",
        enonce: "Un examen médical supplémentaire à celui exigé pour exercer la profession de conducteur peut être demandé :",
        reponseQRC: "En cas d'interruption d'activité pendant plus de six mois",
        reponses_possibles: [
          "En cas d'interruption d'activité pendant plus de six mois",
          "En cas de suspension du permis de conduire de moins d'un mois",
          "En cas d'invalidation et d'annulation du permis de conduire",
        ],
      },
      {
        id: 8,
        type: "QRC",
        enonce: "L'assurance dite responsabilité civile professionnelle (RCP) peut être invoquée par le conducteur s'il :",
        reponseQRC: "abîme le vêtement de son passager en l'accompagnant jusqu'à son hôtel",
        reponses_possibles: [
          "abîme le vêtement de son passager en l'accompagnant jusqu'à son hôtel",
          "accroche un autre véhicule en manœuvrant pour se garer",
          "est contrôlé et n'a pas sa carte professionnelle",
        ],
      },
      {
        id: 9,
        type: "QRC",
        enonce: "Si un chauffeur utilise son véhicule T3P dans le cadre d'une activité non-professionnelle, que doit-il faire ?",
        reponseQRC: "enlever ou occulter toutes références à la profession exercée",
        reponses_possibles: [
          "enlever ou occulter toutes références à la profession exercée",
          "il n'a pas le droit d'utiliser son véhicule en dehors de son activité professionnelle",
          "apposer un panneau indiquant qu'il ne prend pas de client",
          "ne rien faire de spécifique",
        ],
      },
      {
        id: 10,
        type: "QRC",
        enonce: "Un client est avec son chien d'aveugle et vous appelle pour une course ?",
        reponseQRC: "J'ai le droit de refuser la course",
        reponses_possibles: [
          "J'ai le droit de refuser la course",
          "Je suis dans l'obligation de l'accepter lui et son chien",
          "Je n'accepte que le client",
          "Je risque une amende de 135€, si je refuse de les transporter",
        ],
      },
      {
        id: 11,
        type: "QRC",
        enonce: "Qui parmi les T3P peuvent être conventionnés par la caisse d'assurance maladie ?",
        reponseQRC: "les véhicules motorisés à 2 ou 3 roues",
      },
      {
        id: 12,
        type: "QRC",
        enonce: "La réglementation du T3P se trouve dans le :",
        reponseQRC: "code préfectoral",
        reponses_possibles: [
          "code préfectoral",
          "code des transports",
        ],
      },
      {
        id: 13,
        type: "QCM",
        enonce: "Un artisan effectuant du T3P est victime d'un accident corporel de la circulation dans l'exercice de son activité, sous quel régime est-il ?",
        choix: [
          { lettre: "A", texte: "pas de régime particulier", correct: true },
          { lettre: "B", texte: "journalières et sont couverts au titre de la maladie." },
          { lettre: "C", texte: "de l'arrêt maladie" , correct: true },
        ],
      },
      {
        id: 14,
        type: "QRC",
        enonce: "Un conducteur de transport public particulier de personnes n'effectuant que des remplacements épisodiques doit-il être titulaire d'une carte professionnelle ?",
        reponseQRC: "non, si ces remplacements représentent moins de 10 heures par semaine",
      },
      {
        id: 15,
        type: "QRC",
        enonce: "Les centres de formation sont agréés par :",
        reponseQRC: "le préfet du département",
        reponses_possibles: [
          "le préfet du département",
          "le ministère des transports",
          "le préfet de la région",
        ],
      },
    ],
  },
  {
    id: "gestion",
    nom: "B - Gestion",
    duree: 45,
    coefficient: 3,
    noteEliminatoire: 6,
    noteSur: 36,
    questions: [
      {
        id: 1,
        type: "QRC",
        enonce: "Vous créez seul(e) une activité de transport de personnes. Quels sont les statuts juridiques possibles ? (citez-en trois) (QRC)",
        reponseQRC: "Entreprise Individuelle et/ou microentreprise Entreprise Unipersonnelle à Responsabilité Limitée EURL SASU",
      },
      {
        id: 2,
        type: "QRC",
        enonce: "Citez 2 types d'immobilisations. (QRC)",
        reponseQRC: "Immobilisations corporelles, immobilisations incorporelles, immobilisations financières.",
      },
      {
        id: 3,
        type: "QCM",
        enonce: "Lors de la création d'une société la rédaction d'une annonce légale est :",
        choix: [
          { lettre: "A", texte: "Obligatoire" , correct: true },
          { lettre: "B", texte: "nécessaire pour faire de la publicité" },
          { lettre: "C", texte: "facultative" },
        ],
      },
      {
        id: 4,
        type: "QCM",
        enonce: "Quelle mission ne peut pas être exercée par une Chambre de Métiers et de l'Artisanat ?",
        choix: [
          { lettre: "A", texte: "Former les artisans" },
          { lettre: "B", texte: "Gérer le répertoire des Métiers" },
          { lettre: "C", texte: "Gérer les autorisations de stationnement en ville" , correct: true },
          { lettre: "D", texte: "Immatriculer les futures entreprises du T3P" },
        ],
      },
      {
        id: 5,
        type: "QCM",
        enonce: "Les achats de carburant figurent :",
        choix: [
          { lettre: "A", texte: "Au compte de résultat, dans les charges" , correct: true },
          { lettre: "B", texte: "au bilan, à l'actif" },
          { lettre: "C", texte: "au compte de résultat, dans les produits" },
          { lettre: "D", texte: "au bilan, au passif" },
        ],
      },
      {
        id: 6,
        type: "QCM",
        enonce: "Que signifie le sigle CRDS ?",
        choix: [
          { lettre: "A", texte: "contribution pour la réduction de la dette sociale" },
          { lettre: "B", texte: "contribution régionale pour les dépenses sociales" },
          { lettre: "C", texte: "contribution pour le regroupement des dettes sociales" },
          { lettre: "D", texte: "contribution pour le remboursement de la dette sociale" , correct: true },
        ],
      },
      {
        id: 7,
        type: "QCM",
        enonce: "Pour être immatriculé au Répertoire des métiers, le futur chef d'entreprise du T3P doit :",
        choix: [
          { lettre: "A", texte: "être titulaire du permis D transports en commun" },
          { lettre: "B", texte: "avoir une qualification professionnelle spécifique" , correct: true },
          { lettre: "C", texte: "être propriétaire de son véhicule" },
        ],
      },
      {
        id: 8,
        type: "QCM",
        enonce: "Un véhicule est acquis 22 000 € HT le 1er avril 2016. Calculez l'amortissement au 31/12/2016, en tenant compte d'une durée d'amortissement de 4 ans.",
        choix: [
          { lettre: "A", texte: "5 500 €" },
          { lettre: "B", texte: "4 125 €" , correct: true },
          { lettre: "C", texte: "6 574 €" },
          { lettre: "D", texte: "5 885 €" },
        ],
      },
      {
        id: 9,
        type: "QCM",
        enonce: "Le cout de revient d'une prestation est de 22€, vous souhaitez réaliser une marge de 20% sur le prix de vente net de taxe, votre prix de vente net de taxe sera de :",
        choix: [
          { lettre: "A", texte: "26 €" },
          { lettre: "B", texte: "26.40 €" , correct: true },
          { lettre: "C", texte: "27.50 €" },
        ],
      },
      {
        id: 10,
        type: "QCM",
        enonce: "Quel acte donne naissance à l'entreprise ?",
        choix: [
          { lettre: "A", texte: "le paiement des cotisations sociales" },
          { lettre: "B", texte: "l'immatriculation au CFE" , correct: true },
          { lettre: "C", texte: "la rédaction de la 1ere facture" },
        ],
      },
      {
        id: 11,
        type: "QCM",
        enonce: "Quel acte donne naissance à l'entreprise ?",
        choix: [
          { lettre: "A", texte: "3 000 €" },
          { lettre: "B", texte: "7 500 €" },
          { lettre: "C", texte: "Aucun capital social minimum n'est requis" , correct: true },
        ],
      },
      {
        id: 12,
        type: "QCM",
        enonce: "L'EBE signifie",
        choix: [
          { lettre: "A", texte: "encaissement brut excédentaire" },
          { lettre: "B", texte: "excédent brut d'exploitation" , correct: true },
          { lettre: "C", texte: "excédent bénéficiaire employé" },
        ],
      },
      {
        id: 13,
        type: "QCM",
        enonce: "Le numéro SIREN identifie :",
        choix: [
          { lettre: "A", texte: "La personne (le gérant)." },
          { lettre: "B", texte: "L’entreprise" , correct: true },
          { lettre: "C", texte: "L’activité" },
        ],
      },
      {
        id: 14,
        type: "QCM",
        enonce: "Les chambres de métiers et de l'artisanat et les chambres de commerce et d'industrie sont des :",
        choix: [
          { lettre: "A", texte: "Établissements publics" , correct: true },
          { lettre: "B", texte: "Entreprises" },
          { lettre: "C", texte: "Collectivités territoriales" },
          { lettre: "D", texte: "Associations" },
        ],
      },
      {
        id: 15,
        type: "QCM",
        enonce: "La déclaration de cessation de paiement se fait :",
        choix: [
          { lettre: "A", texte: "a la chambre de commerce et d'industrie" },
          { lettre: "B", texte: "a la chambre de métiers et de l'artisanat" },
          { lettre: "C", texte: "auprès du greffe du Tribunal de Commerce" , correct: true },
        ],
      },
      {
        id: 16,
        type: "QCM",
        enonce: "La CSG",
        choix: [
          { lettre: "A", texte: "est un impôt supporté par le salarié et prélevé sur sa fiche de paie" , correct: true },
          { lettre: "B", texte: "signifie « Contribution Salariale Généralisée »" },
          { lettre: "C", texte: "est un impôt prélevé à la source." , correct: true },
        ],
      },
      {
        id: 17,
        type: "QCM",
        enonce: "Parmi les 3 termes de comptabilité suivants, lequel n'est pas une composante de l'actif du bilan ?",
        choix: [
          { lettre: "A", texte: "le résultat de l'exercice" },
          { lettre: "B", texte: "les disponibilités" , correct: true },
          { lettre: "C", texte: "les frais d'établissement" , correct: true },
        ],
      },
      {
        id: 18,
        type: "QCM",
        enonce: "Le capital social d'une SARL est divisé en :",
        choix: [
          { lettre: "A", texte: "Actions" },
          { lettre: "B", texte: "parts sociales" , correct: true },
          { lettre: "C", texte: "obligations" },
        ],
      },
    ],
  },
  {
    id: "securite",
    nom: "C - Sécurité routière",
    duree: 30,
    coefficient: 2,
    noteEliminatoire: 4,
    noteSur: 24,
    questions: [
      {
        id: 1,
        type: "QCM",
        enonce: "Ce panneau signale :",
        image: "/cours/examens/panneau-cedez-passage-sens-inverse.png",
        choix: [
          { lettre: "A", texte: "Une chaussée à double sens de circulation" },
          { lettre: "B", texte: "Une obligation de céder le passage à la circulation venant en sens inverse" , correct: true },
          { lettre: "C", texte: "Une priorité de passage par rapport à la circulation venant en sens inverse" },
          { lettre: "D", texte: "Une interdiction de poursuivre tout droit" },
        ],
      },
      {
        id: 2,
        type: "QCM",
        enonce: "Dans quel cas exceptionnel, pouvez-vous dépasser un véhicule par la droite ?",
        choix: [
          { lettre: "A", texte: "Lorsque le conducteur du véhicule qui me précède a signalé qu'il allait changer la direction vers la gauche" , correct: true },
          { lettre: "B", texte: "Lorsque le conducteur du véhicule qui me précède a signalé qu'il allait changer la direction vers la droite" },
          { lettre: "C", texte: "Lorsque le conducteur du véhicule qui me suit a signalé qu'il allait changer la direction vers la gauche" },
          { lettre: "D", texte: "Il est toujours autorisé de dépasser un véhicule par la droite" },
        ],
      },
      {
        id: 3,
        type: "QCM",
        enonce: "A ce carrefour, je dois :",
        image: "/cours/examens/carrefour-priorite-droite.png",
        choix: [
          { lettre: "A", texte: "Céder le passage à droite et à gauche" },
          { lettre: "B", texte: "Marquer l’arrêt" },
          { lettre: "C", texte: "Céder le passage à droite" , correct: true },
        ],
      },
      {
        id: 4,
        type: "QCM",
        enonce: "Est titulaire d'un permis probatoire tout conducteur qui obtient le permis de conduire :",
        choix: [
          { lettre: "A", texte: "après invalidation administrative" , correct: true },
          { lettre: "B", texte: "après annulation judiciaire du précédent titre" , correct: true },
          { lettre: "C", texte: "après réussite à la catégorie A lorsqu'il est titulaire de la catégorie B depuis plus de trois ans" },
        ],
      },
      {
        id: 5,
        type: "QCM",
        enonce: "Quelles sont les conditions d'utilisation du triangle de pré-signalisation en agglomération ?",
        choix: [
          { lettre: "A", texte: "Il n'y a pas de conditions d'utilisation" },
          { lettre: "B", texte: "Il doit être placé sur la chaussée à une distance de 30 mètres environ du véhicule ou de l'obstacle à signaler" , correct: true },
          { lettre: "C", texte: "Il faut placer le triangle de signalisation même si cette action constitue une mise en danger manifeste de la vie du conducteur" },
          { lettre: "D", texte: "Il doit être placé sur le toit du véhicule" },
        ],
      },
      {
        id: 6,
        type: "QCM",
        enonce: "En suivant un stage de sensibilisation à la sécurité routière, un conducteur qui a commis une infraction ayant donné lieu à un retrait de points peut retrouver :",
        choix: [
          { lettre: "A", texte: "10 points" },
          { lettre: "B", texte: "8 points" },
          { lettre: "C", texte: "4 points" , correct: true },
        ],
      },
      {
        id: 7,
        type: "QCM",
        enonce: "Comment se nomme une ligne possédant une bande de 3 mètres dont les intervalles sont de 1,33 mètre ?",
        choix: [
          { lettre: "A", texte: "une bande d'arrêt d'urgence" },
          { lettre: "B", texte: "une ligne d'insertion" },
          { lettre: "C", texte: "une ligne discontinue" },
          { lettre: "D", texte: "une ligne de dissuasion" , correct: true },
        ],
      },
      {
        id: 8,
        type: "QCM",
        enonce: "Le dépistage de stupéfiants est :",
        choix: [
          { lettre: "A", texte: "possible lors d'un accident corporel ou matériel" , correct: true },
          { lettre: "B", texte: "obligatoire pour toute infraction" },
          { lettre: "C", texte: "obligatoire lors d'un accident mortel" , correct: true },
        ],
      },
      {
        id: 9,
        type: "QCM",
        enonce: "A 50 km/h, la distance de sécurité est de :",
        choix: [
          { lettre: "A", texte: "20 mètres" },
          { lettre: "B", texte: "40 mètres" },
          { lettre: "C", texte: "30 mètres" , correct: true },
        ],
      },
      {
        id: 10,
        type: "QCM",
        enonce: "Un conducteur qui commet un excès de vitesse de 40 km/h au-dessus de la vitesse autorisée risque :",
        choix: [
          { lettre: "A", texte: "une peine d'emprisonnement" },
          { lettre: "B", texte: "la suspension de son permis de conduire" , correct: true },
          { lettre: "C", texte: "la réduction de six points du permis de conduire" },
        ],
      },
      {
        id: 11,
        type: "QCM",
        enonce: "Dans un tunnel éclairé, hors agglomération, je circule :",
        choix: [
          { lettre: "A", texte: "en feux de croisement" , correct: true },
          { lettre: "B", texte: "en feux de route" },
          { lettre: "C", texte: "en feux de brouillard" },
        ],
      },
      {
        id: 12,
        type: "QCM",
        enonce: "Contrôlé avec un taux d'alcool de 0,7 gramme par litre de sang, je risque :",
        choix: [
          { lettre: "A", texte: "une amende" , correct: true },
          { lettre: "B", texte: "un retrait de 4 points sur mon permis de conduire" },
          { lettre: "C", texte: "un retrait de 6 points sur mon permis de conduire" , correct: true },
          { lettre: "D", texte: "une peine de prison" },
        ],
      },
      {
        id: 13,
        type: "QCM",
        enonce: "Pour dépasser un cycliste hors agglomération, le code de la route impose au conducteur de laisser un espace latéral :",
        choix: [
          { lettre: "A", texte: "Suffisant, en fonction de la largeur de la chaussée" },
          { lettre: "B", texte: "De 1,5 mètre au minimum" , correct: true },
          { lettre: "C", texte: "De 1 mètre au minimum" },
        ],
      },
      {
        id: 14,
        type: "QCM",
        enonce: "Dans quel délai un automobiliste doit-il transmettre un constat amiable à son assureur ?",
        choix: [
          { lettre: "A", texte: "1 mois" },
          { lettre: "B", texte: "7 jours" },
          { lettre: "C", texte: "2 jours" },
          { lettre: "D", texte: "5 jours" , correct: true },
        ],
      },
      {
        id: 15,
        type: "QCM",
        enonce: "Lorsque je manœuvre",
        choix: [
          { lettre: "A", texte: "je suis toujours prioritaire" },
          { lettre: "B", texte: "je dois la priorité durant la manœuvre" , correct: true },
          { lettre: "C", texte: "je dois la priorité avant de manœuvrer" , correct: true },
        ],
      },
      {
        id: 16,
        type: "QCM",
        enonce: "Par temps de pluie, l'utilisation des feux de brouillard arrière est :",
        choix: [
          { lettre: "A", texte: "Interdite" , correct: true },
          { lettre: "B", texte: "Obligatoire" },
          { lettre: "C", texte: "Conseillée" },
        ],
      },
      {
        id: 17,
        type: "QCM",
        enonce: "Que faut-il faire en cas d'incendie dans un tunnel :",
        choix: [
          { lettre: "A", texte: "faire un demi-tour avec son véhicule pour fuir plus vite" },
          { lettre: "B", texte: "laisser les clefs de contact sur le véhicule, après avoir éteint le moteur" , correct: true },
          { lettre: "C", texte: "évacuer le tunnel par l'issue de secours la plus proche" , correct: true },
        ],
      },
      {
        id: 18,
        type: "QCM",
        enonce: "Le non-port de la ceinture de sécurité en voiture peut entraîner un retrait sur le permis de conduire de :",
        choix: [
          { lettre: "A", texte: "2 points" },
          { lettre: "B", texte: "3 points" , correct: true },
          { lettre: "C", texte: "4 points" , correct: true },
        ],
      },
      {
        id: 19,
        type: "QCM",
        enonce: "Cet emplacement :",
        image: "/cours/examens/place-handicape.png",
        choix: [
          { lettre: "A", texte: "son occupation illicite est punie d'une contravention de troisième classe", correct: true },
          { lettre: "B", texte: "son occupation illicite fait encourir une mise en fourrière du véhicule", correct: true },
          { lettre: "C", texte: "est réservé aux véhicules portant une carte de stationnement pour personnes handicapées", correct: true },
          { lettre: "D", texte: "est réservé aux véhicules transportant une ou plusieurs personnes handicapées" },
        ],
      },
      {
        id: 20,
        type: "QCM",
        enonce: "L'ABS (système d'antiblocage des roues) :",
        choix: [
          { lettre: "A", texte: "aide à maintenir la direction du véhicule" , correct: true },
          { lettre: "B", texte: "réduit considérablement la distance d'arrêt" },
          { lettre: "C", texte: "permet de ne pas allonger la distance d'arrêt" , correct: true },
        ],
      },
    ],
  },
  {
    id: "francais",
    nom: "D - Capacité d'expression et de compréhension en langue française",
    duree: 30,
    coefficient: 2,
    noteEliminatoire: 5,
    noteSur: 24,
    texteSupport: `La voiture 100% autonome, c'est pour demain?

SANS LES MAINS Pour les experts, la voiture sans conducteur à bord n'est pas encore près de voir le jour.

Quitter le volant des yeux pour regarder une série, ou faire la sieste et se réveiller quelques heures plus tard... à destination. Ce rêve deviendra-t-il réalité ? De Google à Uber en passant par Tesla, plusieurs poids lourds dépensent des milliards de dollars pour développer cette voiture sans conducteur. General Motors veut faire rouler une auto sans volant ni pédale, Google teste des taxis sans chauffeurs en Arizona et Elon Musk parle d'un modèle autonome pour la fin de l'année. Mais les experts sont partagés. Certains assurent que la voiture sans conducteur ne verra pas le jour avant 50 ans, voire jamais !

Gérer l'imprévu

Aujourd'hui, les constructeurs intègrent des dispositifs d'assistance à la conduite de plus en plus sophistiqués. Alors le véhicule automatisé « sur certaines portions d'autoroute, dans les embouteillages ou capable de se garer tout seul... Tout cela arrive ! », s'enthousiasme Arnaud de La Fortelle. [...] « Mais les interactions avec les humains restent compliquées à gérer. Une place où l'on croise des vélos, des rollers, d'autres conducteurs humains. Ou une route passant devant une école avec plein d'enfants... Ces situations sont un challenge pour la voiture ». Les robots ne savent pas traiter les intentions, confirme Michel Parent, conseiller scientifique [...] spécialisé dans la conduite automatique. « En tant qu'humain, on anticipe des choses très complexes. Quand on observe deux piétons qui discutent sur le bord de la route par exemple, on sait s'ils vont traverser ou non. À l'heure actuelle, les capteurs ont du mal à percevoir et anticiper ces cas de figure.

Une question de cohabitation

L'interaction entre voitures autonomes et véhicule classique est l'autre grand sujet d'inquiétude. Cela dit, on ne sait pas comment vont évoluer les choses, nuance Michel Parent. Si on interdit la circulation des voitures classiques dans certaines zones par exemple, cela devient plus envisageable. [...] D'ici là, mieux vaut garder les yeux sur la route !`,
    texteSource: "20minutes.fr — Nouvelles mobilités, 08/03/2019",
    questions: [
      {
        id: 1,
        type: "QRC",
        enonce: "Qu'est-ce qu'il faudrait faire pour faciliter l'interaction entre voitures autonomes et véhicules classiques ? (QRC)",
        reponseQRC: "Interdire la circulation aux véhicules classiques dans certaines zones par exemple.",
      },
      {
        id: 2,
        type: "QRC",
        enonce: "Quelles situations sont des challenges pour la voiture sans conducteur ? (QRC)",
        reponseQRC: "Une place où l'on croise des vélos, des rollers, d'autres conducteurs humains, ou une route passant devant une école avec plein d'enfants.",
      },
      {
        id: 3,
        type: "QRC",
        enonce: "Pourquoi les interactions avec les humains sont-elles complexes pour les robots ? (QRC)",
        reponseQRC: "Parce que les robots ne savent pas traiter les intentions",
      },
      {
        id: 4,
        type: "QCM",
        enonce: "Qui sont les poids lourds qui dépensent des milliards de dollars pour développer cette technologie ?",
        choix: [
          { lettre: "A", texte: "Google, General Motors, Tesla" , correct: true },
          { lettre: "B", texte: "Google, Uber, Tesla" , correct: true },
          { lettre: "C", texte: "Google, Amazon, Elon Musk" },
        ],
      },
      {
        id: 5,
        type: "QCM",
        enonce: "Les dispositifs d'assistance à la conduite permettent au véhicule automatisé de :",
        choix: [
          { lettre: "A", texte: "se garer tout seul" , correct: true },
          { lettre: "B", texte: "rouler devant les écoles" },
          { lettre: "C", texte: "rouler sur certaines portions d'autoroute" , correct: true },
        ],
      },
      {
        id: 6,
        type: "QCM",
        enonce: "Google teste des taxis :",
        choix: [
          { lettre: "A", texte: "sans chauffeurs" , correct: true },
          { lettre: "B", texte: "qui coutent des milliards de dollars" },
          { lettre: "C", texte: "sans pédales" },
        ],
      },
      {
        id: 7,
        type: "QCM",
        enonce: "Si deux piétons discutent sur le bord de la route, la voiture sans conducteur :",
        choix: [
          { lettre: "A", texte: "s'arrête pour les faire traverser" },
          { lettre: "B", texte: "a du mal à percevoir s'ils vont traverser ou pas" , correct: true },
          { lettre: "C", texte: "roule plus lentement" },
        ],
      },
      {
        id: 8,
        type: "QCM",
        enonce: "Les robots",
        choix: [
          { lettre: "A", texte: "reconnaissent les interactions humaines" },
          { lettre: "B", texte: "ont du mal à percevoir et anticiper des cas de figures complexes" , correct: true },
          { lettre: "C", texte: "sont capables de traiter les intentions" },
        ],
      },
      {
        id: 9,
        type: "QCM",
        enonce: "A partir de quand la voiture sans conducteur pourra-t elle circuler ?",
        choix: [
          { lettre: "A", texte: "Demain." },
          { lettre: "B", texte: "Avant 50 ans." },
          { lettre: "C", texte: "Dans 50 ans ou jamais." , correct: true },
        ],
      },
      {
        id: 10,
        type: "QCM",
        enonce: "Au sujet de la voiture sans chauffeur les experts sont :",
        choix: [
          { lettre: "A", texte: "partagés" , correct: true },
          { lettre: "B", texte: "complètement d'accord" },
          { lettre: "C", texte: "méfiants" },
        ],
      },
    ],
  },
  {
    id: "anglais",
    nom: "E - Capacité d'expression et de compréhension en langue anglaise",
    duree: 20,
    coefficient: 1,
    noteEliminatoire: 4,
    noteSur: 20,
    questions: [
      {
        id: 1,
        type: "QCM",
        enonce: "Est-ce que tout va bien ?",
        choix: [
          { lettre: "A", texte: "is everything ok ?" , correct: true },
          { lettre: "B", texte: "is everything fine ?" , correct: true },
          { lettre: "C", texte: "was everything fine ?" },
          { lettre: "D", texte: "are everything ok?" },
        ],
      },
      {
        id: 2,
        type: "QCM",
        enonce: "Sorry ! It's quite expensive for us. May we get a ……………… price ?",
        choix: [
          { lettre: "A", texte: "lower" , correct: true },
          { lettre: "B", texte: "gooder" },
          { lettre: "C", texte: "less" },
          { lettre: "D", texte: "reduction" },
        ],
      },
      {
        id: 3,
        type: "QCM",
        enonce: "Votre séjour s'est-il bien passé ?",
        choix: [
          { lettre: "A", texte: "Where would you like to go?" },
          { lettre: "B", texte: "How was your trip?" },
          { lettre: "C", texte: "Did you enjoy your stay?" , correct: true },
        ],
      },
      {
        id: 4,
        type: "QCM",
        enonce: "Il est interdit de fumer dans la voiture !",
        choix: [
          { lettre: "A", texte: "it's allowed of smoke in the car!" },
          { lettre: "B", texte: "it's forbidden to smoke in the car!" , correct: true },
          { lettre: "C", texte: "it's forbidden of smoke in the car!" },
        ],
      },
      {
        id: 5,
        type: "QCM",
        enonce: "Do you have change on ten euros ?",
        choix: [
          { lettre: "A", texte: "connaissez-vous un bureau de change pour des euros ?" },
          { lettre: "B", texte: "avez-vous la monnaie sur dix euros ?" , correct: true },
          { lettre: "C", texte: "pouvez-vous me donner dix euros ?" },
        ],
      },
      {
        id: 6,
        type: "QCM",
        enonce: "Souhaitez-vous un reçu ?",
        choix: [
          { lettre: "A", texte: "do you want a ticket?" },
          { lettre: "B", texte: "did you want a bill?" },
          { lettre: "C", texte: "would you like a receipt?" , correct: true },
        ],
      },
      {
        id: 7,
        type: "QCM",
        enonce: "Puis-je mettre vos bagages dans le coffre ?",
        choix: [
          { lettre: "A", texte: "May I leave your luggage there?" },
          { lettre: "B", texte: "May I put your luggage in the trunk?" , correct: true },
          { lettre: "C", texte: "May I take your luggage?" },
        ],
      },
      {
        id: 8,
        type: "QCM",
        enonce: "A windscreen est :",
        choix: [
          { lettre: "A", texte: "Un déflecteur" },
          { lettre: "B", texte: "Un GPS" },
          { lettre: "C", texte: "Un pare-brise" , correct: true },
        ],
      },
      {
        id: 9,
        type: "QCM",
        enonce: "Où se trouve le musée s'il vous plait ?",
        choix: [
          { lettre: "A", texte: "where is the museum please ?" , correct: true },
          { lettre: "B", texte: "where is the musee please ?" },
          { lettre: "C", texte: "where was the museum please ?" },
        ],
      },
      {
        id: 10,
        type: "QCM",
        enonce: "Quelle est la marque de votre voiture ?",
        choix: [
          { lettre: "A", texte: "is that your car?" },
          { lettre: "B", texte: "how is your car?" },
          { lettre: "C", texte: "what is the brand of your car?" , correct: true },
        ],
      },
      {
        id: 11,
        type: "QCM",
        enonce: "My daughter is ……….; she wants to eat now.",
        choix: [
          { lettre: "A", texte: "angry" },
          { lettre: "B", texte: "hungry" , correct: true },
          { lettre: "C", texte: "thirsty" },
        ],
      },
      {
        id: 12,
        type: "QCM",
        enonce: "Recevoir une amende :",
        choix: [
          { lettre: "A", texte: "to receive an almond" },
          { lettre: "B", texte: "to be fined" , correct: true },
          { lettre: "C", texte: "to get a warning" },
        ],
      },
      {
        id: 13,
        type: "QCM",
        enonce: "What does « actually » mean ?",
        choix: [
          { lettre: "A", texte: "réellement" , correct: true },
          { lettre: "B", texte: "actuellement" },
          { lettre: "C", texte: "recent" },
        ],
      },
      {
        id: 14,
        type: "QCM",
        enonce: "Can you pick me up at the library, please ?",
        choix: [
          { lettre: "A", texte: "pouvez-vous me déposer jusqu'à la librairie, s'il vous plaît ?" },
          { lettre: "B", texte: "pouvez-vous venir me chercher à la bibliothèque, s'il vous plaît ?" , correct: true },
          { lettre: "C", texte: "pouvez-vous me chercher à une bibliothèque, s'il vous plaît ?" },
          { lettre: "D", texte: "pouvez-vous me porter jusqu'à une librairie, s'il vous plaît ?" },
        ],
      },
      {
        id: 15,
        type: "QCM",
        enonce: "Comment se rend-on au cinéma ?",
        choix: [
          { lettre: "A", texte: "how can I go to the cinema?" , correct: true },
          { lettre: "B", texte: "can you tell me the way to the cinema?" , correct: true },
          { lettre: "C", texte: "how do you go to the cinema?" },
        ],
      },
      {
        id: 16,
        type: "QCM",
        enonce: "Acceptez-vous les cartes de crédit étrangères ?",
        choix: [
          { lettre: "A", texte: "do you have any money?" },
          { lettre: "B", texte: "do you take stranger credit cards?" },
          { lettre: "C", texte: "do you accept foreign credit cards?" , correct: true },
        ],
      },
      {
        id: 17,
        type: "QCM",
        enonce: "Keep the change sginfie :",
        choix: [
          { lettre: "A", texte: "Avez-vous de la monnaie ?" },
          { lettre: "B", texte: "Gardez cette direction" },
          { lettre: "C", texte: "Gardez la monnaie" , correct: true },
        ],
      },
      {
        id: 18,
        type: "QCM",
        enonce: "Taking the bus is cheaper than taking the train :",
        choix: [
          { lettre: "A", texte: "prendre le bus est plus long que prendre le train" },
          { lettre: "B", texte: "prendre le bus coûte plus cher que prendre le train" },
          { lettre: "C", texte: "prendre le bus coûte moins cher que prendre le train" , correct: true },
        ],
      },
      {
        id: 19,
        type: "QCM",
        enonce: "Séléctionnez la phrase correctement formulée :",
        choix: [
          { lettre: "A", texte: "there is a few pubs in Reims" },
          { lettre: "B", texte: "there is many pubs in Reims" },
          { lettre: "C", texte: "there are a few pubs in Reims" , correct: true },
        ],
      },
      {
        id: 20,
        type: "QCM",
        enonce: "For international flights, travelers have to arrive two hours prior to departure",
        choix: [
          { lettre: "A", texte: "pour les vols internationaux, les voyageurs doivent arriver deux heures avant le départ" , correct: true },
          { lettre: "B", texte: "les voyageurs étrangers doivent arriver deux heures avant le départ" },
          { lettre: "C", texte: "pour les vols internationaux, les voyageurs prioritaires arrivent deux heures avant le départ" },
        ],
      },
    ],
  },
  {
    id: "reglementation_vtc",
    nom: "F(V) - Développement commercial et gestion propre à l'activité de VTC",
    duree: 30,
    coefficient: 3,
    noteEliminatoire: 6,
    noteSur: 40,
    questions: [
      {
        id: 1,
        type: "QRC",
        enonce: "A quoi correspond le chiffre d'affaires d'un exploitant VTC ? (QRC)",
        reponseQRC: "Il correspond à la somme des prestations réalisées au cours d'un exercice (transports et prestations annexes).",
      },
      {
        id: 2,
        type: "QRC",
        enonce: "Citez 4 qualités indispensables pour l'exercice de la profession de VTC : (QRC)",
        reponseQRC: "Amabilité, ponctualité, sens du service, discrétion, neutralité, …",
        reponses_possibles: [
          "Amabilité, ponctualité, sens du service, discrétion, neutralité, …",
          "Ponctualité, discrétion, savoir-faire, attitude et comportement professionnelle, propreté",
        ],
      },
      {
        id: 3,
        type: "QRC",
        enonce: "Qui fixe le prix d'une prestation de VTC, selon quelle contrainte ? (QRC)",
        reponseQRC: "Le chauffeur VTC en fonction de l'offre et de la demande de son lieu d'exercice",
      },
      {
        id: 4,
        type: "QCM",
        enonce: "Lorsque vous préparez votre plan de marketing vous devez vous occuper des :",
        choix: [
          { lettre: "A", texte: "3P" },
          { lettre: "B", texte: "4P", correct: true },
          { lettre: "C", texte: "5P" },
        ],
      },
      {
        id: 5,
        type: "QCM",
        enonce: "Vous travaillez avec une entreprise qui règle les prestations à 30 jours fin de mois. Si vous émettez votre facture le 2 mars, vous serez réglé le :",
        choix: [
          { lettre: "A", texte: "31 mars" },
          { lettre: "B", texte: "avril" },
          { lettre: "C", texte: "30 avril" , correct: true },
        ],
      },
      {
        id: 6,
        type: "QCM",
        enonce: "En tant qu'exploitant, je peux :",
        choix: [
          { lettre: "A", texte: "fixer librement les prix en m'assurant de ne pas travailler à perte" , correct: true },
          { lettre: "B", texte: "fixer librement les prix, sous réserve d'être en dessous du prix de revient" },
          { lettre: "C", texte: "fixer les prix en respectant scrupuleusement la tarification imposée par l'Etat" },
          { lettre: "D", texte: "fixer librement les prix sans me soucier d'autres éléments de coûts" },
        ],
      },
      {
        id: 7,
        type: "QCM",
        enonce: "Un chauffeur VTC, en EURL, fait un chiffre d'affaires de 50 000 €. Il a 10 000 € de charges sociales, a vendu son ancienne voiture 8 000 € HT et a payé 5 000 € de TVA. Quel est son résultat ?",
        choix: [
          { lettre: "A", texte: "37 000 €" },
          { lettre: "B", texte: "43 000 €" , correct: true },
          { lettre: "D", texte: "27 000 €" },
        ],
      },
      {
        id: 8,
        type: "QCM",
        enonce: "Qu'est-ce qu'une zone de chalandise ?",
        choix: [
          { lettre: "A", texte: "c'est le nombre de conducteurs de VTC qu'il y a dans une zone géographique" },
          { lettre: "B", texte: "c'est un bateau" },
          { lettre: "C", texte: "c'est la zone géographique d'où provient la majorité de la clientèle" , correct: true },
        ],
      },
      {
        id: 9,
        type: "QCM",
        enonce: "Dans un calcul de coût de revient, font partie des charges fixes :",
        choix: [
          { lettre: "A", texte: "Les impôts et taxes" },
          { lettre: "B", texte: "Les frais administratifs et les assurances" , correct: true },
          { lettre: "C", texte: "Le contrat annuel d'entretien du véhicule" , correct: true },
        ],
      },
      {
        id: 10,
        type: "QCM",
        enonce: "Que signifie B to C :",
        choix: [
          { lettre: "A", texte: "Business to Consumer" , correct: true },
          { lettre: "B", texte: "Business to Costumer" },
          { lettre: "C", texte: "Business entre entreprises" },
        ],
      },
      {
        id: 11,
        type: "QCM",
        enonce: "Qu'est-ce qu'un prospect ?",
        choix: [
          { lettre: "A", texte: "un client potentiel" , correct: true },
          { lettre: "B", texte: "l'ensemble des clients non facturés uniquement" },
          { lettre: "C", texte: "une publicité sur format papier A5 ou plus petit permettant au conducteur de VTC de se faire connaître" },
          { lettre: "D", texte: "une brochure publicitaire référençant l'ensemble d'un catalogue de prestation" },
        ],
      },
      {
        id: 12,
        type: "QCM",
        enonce: "Qu'est-ce que le marché en mercatique ?",
        choix: [
          { lettre: "A", texte: "le lien où des producteurs se rassemblent pour proposer directement leurs produits/prestations aux consommateurs" },
          { lettre: "B", texte: "l'ensemble des vendeurs et des acheteurs concernés par l'échange d'un bien ou d'un service" , correct: true },
          { lettre: "C", texte: "le lien de rencontre physique ou virtuel de l'offre et de la demande" },
        ],
      },
      {
        id: 13,
        type: "QCM",
        enonce: "Le prix de vente d'une prestation doit être égal au",
        choix: [
          { lettre: "A", texte: "coût de revient +TVA" },
          { lettre: "B", texte: "coût de revient + marge + TVA coût de revient + marge + TVA" , correct: true },
          { lettre: "C", texte: "total des charges variables + TVA" },
        ],
      },
      {
        id: 14,
        type: "QCM",
        enonce: "Quelle affirmation est vraie ?",
        choix: [
          { lettre: "A", texte: "lorsque l'offre est inférieure à la demande, les prix diminuent" },
          { lettre: "B", texte: "lorsque l'offre est supérieure à la demande, les prix augmentent" },
          { lettre: "C", texte: "lorsque l'offre est supérieure à la demande, les prix diminuent" , correct: true },
        ],
      },
      {
        id: 15,
        type: "QCM",
        enonce: "Le site internet de mon entreprise doit me permettre de :",
        choix: [
          { lettre: "A", texte: "présenter mes services et savoir-faire" , correct: true },
          { lettre: "B", texte: "proposer mes produits uniquement à l'extérieur de ma zone de chalandise" },
          { lettre: "C", texte: "générer de nouveaux contacts auprès de prospects potentiels" , correct: true },
        ],
      },
      {
        id: 16,
        type: "QCM",
        enonce: "Le panier moyen est :",
        choix: [
          { lettre: "A", texte: "la moyenne des achats par client" , correct: true },
          { lettre: "B", texte: "la taille des achats à charger dans le coffre" },
          { lettre: "C", texte: "la taille moyenne des paniers de courses en France" },
        ],
      },
    ],
  },
  {
    id: "reglementation_vtc2",
    nom: "G(V) - Réglementation nationale spécifique à l'activité de VTC",
    duree: 20,
    coefficient: 3,
    noteEliminatoire: 6,
    noteSur: 24,
    questions: [
      {
        id: 1,
        type: "QRC",
        enonce: "Le numéro d'inscription de l'entreprise au registre des VTC, le n° d'immatriculation du véhicule, le QR code (ou code barre bidimensionnel), le numéro de référence de la vignette (QRC)",
        reponseQRC: "La longueur minimale hors tout d'un véhicule VTC hybride ou électrique :",
      },
      {
        id: 2,
        type: "QCM",
        enonce: "La longueur minimale hors tout d'un véhicule VTC hybride ou électrique :",
        choix: [
          { lettre: "A", texte: "Est de 4,50 mètres" },
          { lettre: "B", texte: "Est de 3 mètres" },
          { lettre: "C", texte: "Est de 4 mètres" },
          { lettre: "D", texte: "Aucune longueur minimale n'est imposée" , correct: true },
        ],
      },
      {
        id: 3,
        type: "QCM",
        enonce: "Quelle est l'ancienneté maximale d'un véhicule utilisé en exploitation VTC ?",
        choix: [
          { lettre: "A", texte: "ans" },
          { lettre: "B", texte: ". ans" },
          { lettre: "C", texte: "Il n'y a pas d'ancienneté maximale" },
          { lettre: "D", texte: "7 ans" , correct: true },
        ],
      },
      {
        id: 4,
        type: "QCM",
        enonce: "Un véhicule VTC peut-il être électrique ?",
        choix: [
          { lettre: "A", texte: "oui, s'il respecte les conditions de puissance" },
          { lettre: "B", texte: "oui, s'il respecte les conditions de taille et de puissance" },
          { lettre: "C", texte: "non, c'est interdit" },
          { lettre: "D", texte: "oui, quelles que soient la taille et la puissance" , correct: true },
        ],
      },
      {
        id: 5,
        type: "QCM",
        enonce: "Le ticket de réservation doit être établi :",
        choix: [
          { lettre: "A", texte: "Sur support papier" , correct: true },
          { lettre: "B", texte: "un engagement oral suffit" },
          { lettre: "C", texte: "Sur support électronique" , correct: true },
        ],
      },
      {
        id: 6,
        type: "QCM",
        enonce: "Qui délivre la carte professionnelle des conducteurs de VTC ?",
        choix: [
          { lettre: "A", texte: "les organisations professionnelles de VTC" },
          { lettre: "B", texte: "la préfecture" , correct: true },
          { lettre: "C", texte: "la chambre de métiers et de l'artisanat", correct: true },
          { lettre: "D", texte: "la Mairie" },
        ],
      },
      {
        id: 7,
        type: "QCM",
        enonce: "La taille minimale exigée pour un véhicule de transport avec chauffeur est de :",
        choix: [
          { lettre: "A", texte: "L 4.5m x l 1.8m" },
          { lettre: "B", texte: "L 4.8m x l 1.7m" },
          { lettre: "C", texte: "L 4.5m x l 1.7m" , correct: true },
        ],
      },
      {
        id: 8,
        type: "QCM",
        enonce: "Quelle est l'ancienneté maximale d'un véhicule utilisé en exploitation VTC ?",
        choix: [
          { lettre: "A", texte: "3 ans", correct: true },
          { lettre: "B", texte: "4 ans" },
          { lettre: "C", texte: "Il n'y a pas d'ancienneté maximale" },
          { lettre: "D", texte: "7 ans" , correct: true },
        ],
      },
    ],
  },
];

const eb5Matieres: Matiere[] = [
  {
    id: "t3p",
    nom: "A - Transport Public Particulier de Personnes (T3P)",
    duree: 45,
    coefficient: 3,
    noteEliminatoire: 6,
    noteSur: 36,
    questions: [
      {
        id: 1,
        type: "QRC",
        enonce: "Qui agrée les organismes de formation continue des conducteurs de T3P ? (QRC)",
        reponseQRC: "Préfet du département",
      },
      {
        id: 2,
        type: "QRC",
        enonce: "Vous êtes chauffeur TAXI ou VTC en micro entreprise, quelles sanctions risquez vous si vous refusez de transporter une femme enceinte ? (QRC)",
        reponseQRC: "une amende de 45000 euros et 3 ans d'emprisonnement",
      },
      {
        id: 3,
        type: "QRC",
        enonce: "Citez deux cas dans lesquels la carte professionnelle peut être retirée à un conducteur du T3P ? (QRC)",
        reponseQRC: "Annulation permis de conduire. Délit pénal prévu par le code des transports (délits routiers, agressions sexuelles, cf code des transports, …)",
        reponses_possibles: [
          "Annulation permis de conduire. Délit pénal prévu par le code des transports (délits routiers, agressions sexuelles, cf code des transports, …)",
          "Quand on commis un délit Annulation par un juge",
        ],
      },
      {
        id: 4,
        type: "QRC",
        enonce: "Comment se présente une réservation préalable ? Citez 2 mentions qui doivent figurer obligatoirement sur celle-ci ? (QRC)",
        reponseQRC: "Support papier ou électronique, Nom dénomination sociale de l'entreprise, Coordonnées de l'entreprise, N°= SIREN/ SIRET, Nom et coordonnées téléphoniques du client, lieu de prise en charge souhaité par le client, Date et heure de la réservation par le client, date et heure de la prise en charge souhaitée par le client",
      },
      {
        id: 5,
        type: "QRC",
        enonce: "Donnez la périodicité pour la visite médicale en fonction des tranches d’âge :",
        reponseQRC: "Tous les 5 ans jusque 60 ans, tous les 2 ans de 60 à 76 ans, tous les ans à partir de 76 ans",
      },
      {
        id: 6,
        type: "QCM",
        enonce: "Quelle est l'ancienneté maximum pour un véhicule hybride ?",
        choix: [
          { lettre: "A", texte: "Aucune" , correct: true },
          { lettre: "B", texte: "6ans" },
          { lettre: "C", texte: "7ans" },
          { lettre: "D", texte: "2ans" },
        ],
      },
      {
        id: 7,
        type: "QCM",
        enonce: "Pour être exploitable en activité de transport public particulier de personnes, un véhicule électrique doit être :",
        choix: [
          { lettre: "A", texte: "sans contraintes particulières" , correct: true },
          { lettre: "B", texte: "de couleur noire" },
          { lettre: "C", texte: "équipé d’un pack confort (boite automatique,climatisation, connectique....)" },
          { lettre: "D", texte: "soumis à des contraintes particulières" },
        ],
      },
      {
        id: 8,
        type: "QCM",
        enonce: "Un conducteur sanctionné par le tribunal correctionnel pour délit de fuite peut saisir :",
        choix: [
          { lettre: "A", texte: "le tribaul correctinnel qui jugera à nouveau l'affaire" },
          { lettre: "B", texte: "le tribual judiciaire pour une condamnation inférieure à 4000€" },
          { lettre: "C", texte: "la cour de cassation" },
          { lettre: "D", texte: "la cour d'appel" , correct: true },
        ],
      },
      {
        id: 9,
        type: "QCM",
        enonce: "Quelle est l'autorité qui effectue la vérification du casier judiciaire d'un candidat à la carte professionnelle de conducteur de véhicules T3P ?",
        choix: [
          { lettre: "A", texte: "Le ministère chargé des transports" },
          { lettre: "B", texte: "Le préfet de région" },
          { lettre: "C", texte: "Le préfet de police ou le préfet" , correct: true },
          { lettre: "D", texte: "Les forces de l'ordre" },
        ],
      },
      {
        id: 10,
        type: "QCM",
        enonce: "Le retrait de la carte professionnelle est :",
        choix: [
          { lettre: "A", texte: "consécutif à la décision d'un juge de l'ordre administratif sous certaines conditions" },
          { lettre: "B", texte: "une sanction administrative prise par un préfet" , correct: true },
          { lettre: "C", texte: "une sanction administrative prise par un juge" },
          { lettre: "D", texte: "consécutif à la décision d'un juge de l'ordre pénal sous certaines conditions" , correct: true },
        ],
      },
      {
        id: 11,
        type: "QCM",
        enonce: "Quel kilométrage maximum un conducteur de T3P peut-il réaliser pour sa course ?",
        choix: [
          { lettre: "A", texte: "500 km" },
          { lettre: "B", texte: "300 km" },
          { lettre: "C", texte: "1000km" },
          { lettre: "D", texte: "pas de limitation" , correct: true },
        ],
      },
      {
        id: 12,
        type: "QCM",
        enonce: "Quels agents sont habilités à effectuer un contrôle routier de conducteur de T3P ?",
        choix: [
          { lettre: "A", texte: "Les policiers" , correct: true },
          { lettre: "B", texte: "Le juge du tribunal judiciaire" },
          { lettre: "C", texte: "Les agents représentant la SNCF" },
          { lettre: "D", texte: "Les gendarmes" , correct: true },
        ],
      },
      {
        id: 13,
        type: "QCM",
        enonce: "Quelle(s) profession(s) du T3P est/sont autorisée(s) à proposer leurs services immédiats sur la voie publique ?",
        choix: [
          { lettre: "A", texte: "VMDTR" },
          { lettre: "B", texte: "VTC dans sa zone de prise en charge" },
          { lettre: "C", texte: "Aucune" , correct: true },
          { lettre: "D", texte: "Taxi dans sa zone de prise en charge" },
        ],
      },
      {
        id: 14,
        type: "QCM",
        enonce: "Quelles sont les collèges présents lors des commissions locales du T3P réunies en formation disciplinaire ?",
        choix: [
          { lettre: "A", texte: "Collège des représentants des Chambres de métier et de l'Artisanat" },
          { lettre: "B", texte: "Associations de consommateurs" },
          { lettre: "C", texte: "Collège des organisations professionnelles" , correct: true },
          { lettre: "D", texte: "Collège de l'Etat" , correct: true },
        ],
      },
      {
        id: 15,
        type: "QCM",
        enonce: "Quel est le nom de la formation obligatoire pour travailleur dans le secteur des personnes à mobilité réduite ?",
        choix: [
          { lettre: "A", texte: "Transport de personnes à mobilité réduite TPMR" , correct: true },
          { lettre: "B", texte: "Transport de personnes handicapés" },
          { lettre: "C", texte: "Transport de personnes malades" },
        ],
      },
    ],
  },
  {
    id: "gestion",
    nom: "B - Gestion",
    duree: 45,
    coefficient: 3,
    noteEliminatoire: 6,
    noteSur: 36,
    questions: [
      {
        id: 2,
        type: "QRC",
        enonce: "Qu'est-ce qu'une personne morale ? (QRC)",
        reponseQRC: "Une personne morale est généralement constituée par un regroupement de personnes physiques ou morales qui souhaitent accomplir quelque chose en commun",
      },
      {
        id: 3,
        type: "QRC",
        enonce: "Un artisan achète un véhicule 21 000 € HT. Ce véhicule est amorti sur 3 ans. De combien sera l'amortissement annuel ? Détaillez votre calcul (QRC)",
        reponseQRC: "21 000 / 3 = 7 000 € HT d'amortissement annuel",
        reponses_possibles: [
          "21 000 / 3 = 7 000 € HT d'amortissement annuel",
          "21000€/3ans= 7000€/an",
          "L’amortissement annuel =21000€÷3=7000€ donc [7000€]",
          "L'amortissement du véhicule c'est le prix d'achat devises par le nombre d'années : 21000€÷3=7000€",
          "21000/3 = 7000euros",
          "21000÷3=7000 l’amortissement annuel sera de 7000€",
          "21000/3=7000 euros",
        ],
      },
      {
        id: 4,
        type: "QCM",
        enonce: "Qu'est-ce qu'un investissement ?",
        choix: [
          { lettre: "A", texte: "Les assurances professionnelles" },
          { lettre: "B", texte: "L’acquisition d’un véhicule" , correct: true },
          { lettre: "C", texte: "Les honoraire d’expert comptables" },
        ],
      },
      {
        id: 5,
        type: "QCM",
        enonce: "Selon le code commerce, les documents comptables doivent être conservés :",
        choix: [
          { lettre: "A", texte: "un an" },
          { lettre: "B", texte: "3 ans", correct: true },
          { lettre: "C", texte: "5 ans", correct: true },
          { lettre: "D", texte: "10 ans" , correct: true },
        ],
      },
      {
        id: 6,
        type: "QCM",
        enonce: "Quels sont les critères qui caractérisent une activité relevant du Répertoire des Métiers ?",
        choix: [
          { lettre: "A", texte: "L’effectif" , correct: true },
          { lettre: "B", texte: "La forme juridique," },
          { lettre: "C", texte: "La nature d’activité" , correct: true },
          { lettre: "D", texte: "Le chiffre d’affaires" },
        ],
      },
      {
        id: 7,
        type: "QCM",
        enonce: "Qui attribue le code APE d'une entreprise ?",
        choix: [
          { lettre: "A", texte: "CMA" },
          { lettre: "B", texte: "URSSAF" },
          { lettre: "C", texte: "SSI" },
          { lettre: "D", texte: "INSEE" , correct: true },
        ],
      },
      {
        id: 8,
        type: "QCM",
        enonce: "Quelle est la durée de vie maximum prévue par la loi pour une SARL ?",
        choix: [
          { lettre: "A", texte: "99 ans" , correct: true },
          { lettre: "B", texte: "25 ans" },
          { lettre: "C", texte: "10 ans", correct: true },
          { lettre: "D", texte: "50 ans" },
        ],
      },
      {
        id: 9,
        type: "QCM",
        enonce: "Que signifie le sigle SARL ?",
        choix: [
          { lettre: "A", texte: "société anonyme à à revenu limité" },
          { lettre: "B", texte: "société à responsabilité limitée" , correct: true },
          { lettre: "C", texte: "société à risque à risque limitée" },
        ],
      },
      {
        id: 10,
        type: "QCM",
        enonce: "Comment appelle-t-on l'extrait d'immatriculation d'une entreprise artisanale ?",
        choix: [
          { lettre: "A", texte: "Un extrait K-bis" },
          { lettre: "B", texte: "Un extrait de casier n°2" },
          { lettre: "C", texte: "Un extrait D1" , correct: true },
        ],
      },
      {
        id: 11,
        type: "QCM",
        enonce: "Chaque mois, la TVA à décaisser (à payer) représente :",
        choix: [
          { lettre: "A", texte: "la TVA sur les achats" },
          { lettre: "B", texte: "la TVA déductible moins la TVA collectée" },
          { lettre: "C", texte: "la TVA collectée moins la TVA déductible" , correct: true },
        ],
      },
      {
        id: 12,
        type: "QCM",
        enonce: "Lorsque les charges d'exploitation d'une entreprise sont inférieures aux produits :",
        choix: [
          { lettre: "A", texte: "Il y a perte d’exploitation" },
          { lettre: "B", texte: "L’entreprise doit poser le bilan" },
          { lettre: "C", texte: "Il y a bénéfice" , correct: true },
        ],
      },
      {
        id: 13,
        type: "QCM",
        enonce: "Dans un bilan :",
        choix: [
          { lettre: "A", texte: "si le total de l’actif est inférieur au passif il y a perte" },
          { lettre: "B", texte: "le total de l’actif est toujours égal au total du passif" , correct: true },
          { lettre: "C", texte: "si le total de l’actif est supérieur au passif il y a bénéfice" },
        ],
      },
      {
        id: 14,
        type: "QCM",
        enonce: "La CRDS signifie :",
        choix: [
          { lettre: "A", texte: "contribution régionale pour les dépenses sociales" },
          { lettre: "B", texte: "contribution pour la réduction de la dette sociale" },
          { lettre: "C", texte: "contribution régionale au développement social" },
          { lettre: "D", texte: "contribution pour le remboursement de la dette sociale" , correct: true },
        ],
      },
      {
        id: 15,
        type: "QCM",
        enonce: "Le président d'une SASU est :",
        choix: [
          { lettre: "A", texte: "travailleur salarié" },
          { lettre: "B", texte: "salarié" },
          { lettre: "C", texte: "assimilé salarié" , correct: true },
        ],
      },
      {
        id: 16,
        type: "QCM",
        enonce: "Parmi les dépenses suivantes, quelles sont celles qui constituent des charges pour l'artisan ?",
        choix: [
          { lettre: "A", texte: "l'acquisition d'un garage à des fins professionnelles" },
          { lettre: "B", texte: "la facture du contrôle technique automobile" , correct: true },
          { lettre: "C", texte: "la facture de révision et d'entretien du véhicule" , correct: true },
          { lettre: "D", texte: "l'acquisition d'un micro-ordinateur pour l'entreprise" },
        ],
      },
      {
        id: 17,
        type: "QCM",
        enonce: "Un artisan au régime réel rembourse tous les mois depuis janvier, 930€ dont 620€ de capital, au titre de l'emprunt qu'il a souscrit. Quel est le montant des charges qu'il pourra déduire au 31 décembre ?",
        choix: [
          { lettre: "A", texte: "3 720" , correct: true },
          { lettre: "B", texte: "5 580" },
          { lettre: "C", texte: "7 740" },
        ],
      },
      {
        id: 18,
        type: "QCM",
        enonce: "La CET (contribution économique territoriale) fait partie ?",
        choix: [
          { lettre: "A", texte: "Des impôts locaux" , correct: true },
          { lettre: "B", texte: "Des impôts sur les sociétés" },
          { lettre: "C", texte: "Des impôts sur le revenu" },
        ],
      },
    ],
  },
  {
    id: "securite",
    nom: "C - Sécurité routière",
    duree: 30,
    coefficient: 2,
    noteEliminatoire: 4,
    noteSur: 24,
    questions: [
      {
        id: 1,
        type: "QCM",
        enonce: "Mon voyant d'essence vient de s'allumer :",
        choix: [
          { lettre: "A", texte: "j’allume mes feux de déteresse" },
          { lettre: "B", texte: "je continue ma route jusqu’à une prochaine station" , correct: true },
          { lettre: "C", texte: "je réduis mon allure afin de diminuer ma consommation de carburant" , correct: true },
          { lettre: "D", texte: "je m’arrête sur ma droite" },
        ],
      },
      {
        id: 2,
        type: "QCM",
        enonce: "Lorsque les pneus sont sous-gonflés cela entraîne :",
        choix: [
          { lettre: "A", texte: "une augmentation de la consommation de carburant" , correct: true },
          { lettre: "B", texte: "une meilleure adhérence à la route" },
          { lettre: "C", texte: "un risque accru d’éclatement" , correct: true },
        ],
      },
      {
        id: 3,
        type: "QCM",
        enonce: "Sur un trajet de 100 km sur autoroute, si je roule à 130 km/h au lieu de 120 km/h, je \"gagne\" environ :",
        choix: [
          { lettre: "A", texte: "10 minutes" },
          { lettre: "B", texte: "15minutes" },
          { lettre: "C", texte: "8 minutes", correct: true },
        ],
      },
      {
        id: 4,
        type: "QCM",
        enonce: "Quelles sont les obligations expressément prévues par le code de la route, pour tout conducteur impliqué dans un accident de la circulation qui n'a provoqué que des dégâts matériels ?",
        choix: [
          { lettre: "A", texte: "Communiquer son identité et son adresse à toute personne impliquée dans l'accident" , correct: true },
          { lettre: "B", texte: "Avertir ou faire avertir la police" },
          { lettre: "C", texte: "Avertir ou faire avertir la gendarmerie" },
          { lettre: "D", texte: "S’arrêter aussitôt que cela lui est possible, sans créer de danger pour la circulation" , correct: true },
        ],
      },
      {
        id: 5,
        type: "QCM",
        enonce: "En cas de panne de votre véhicule, à quelle distance placez-vous le triangle de pré signalisation ?",
        choix: [
          { lettre: "A", texte: "30 mètres au moins de votre véhicule" , correct: true },
          { lettre: "B", texte: "50 mètres au moins de votre véhicule" },
          { lettre: "C", texte: "10 mètres au moins de votre véhicule" },
        ],
      },
      {
        id: 6,
        type: "QCM",
        enonce: "Que risque un conducteur en cas de dépassement de la vitesse maximale autorisée compris entre 40 KM/h et moins de 50 km/h ?",
        choix: [
          { lettre: "A", texte: "La perte de deux points du permis de conduire" },
          { lettre: "B", texte: "Une contravention de quatrième classe" , correct: true },
          { lettre: "C", texte: "La perte de quatre points du permis de conduire" , correct: true },
          { lettre: "D", texte: "Une contravention de première classe", correct: true },
        ],
      },
      {
        id: 7,
        type: "QCM",
        enonce: "En agglomération, l'usage de l'avertisseur sonore est autorisé :",
        choix: [
          { lettre: "A", texte: "pour donner les avertissements nécessaires aux autres usagers de la route" },
          { lettre: "B", texte: "pour saluer un collègue conducteur" },
          { lettre: "C", texte: "en cas de danger immédiat" , correct: true },
        ],
      },
      {
        id: 8,
        type: "QCM",
        enonce: "Combien de points perdez-vous en cas de chevauchement d'une ligne continue ?",
        choix: [
          { lettre: "A", texte: "3 points", correct: true },
          { lettre: "B", texte: "1 point" , correct: true },
          { lettre: "C", texte: "2 points" },
        ],
      },
      {
        id: 9,
        type: "QCM",
        enonce: "Les feux de route éclairent à une distance minimale de :",
        choix: [
          { lettre: "A", texte: "50 mètres" },
          { lettre: "B", texte: "100 mètres" , correct: true },
          { lettre: "C", texte: "200 mètres" },
          { lettre: "D", texte: "150 mètres" },
        ],
      },
      {
        id: 10,
        type: "QCM",
        enonce: "A 90 km/h la distance d'arrêt est approximativement de :",
        choix: [
          { lettre: "A", texte: "50 m" },
          { lettre: "B", texte: "80 m" , correct: true },
          { lettre: "D", texte: "70 m" },
        ],
      },
      {
        id: 11,
        type: "QCM",
        enonce: "Les piétons qui s'engagent dans la traversée d'une chaussée :",
        choix: [
          { lettre: "A", texte: "Ont le droit de s'engager quelle que soit la vitesse et la distance des véhicules" },
          { lettre: "B", texte: "Doivent traverser la chaussée en tenant compte de la visibilité ainsi que de la distance et de la vitesse des véhicules" , correct: true },
          { lettre: "C", texte: "N'ont pas le droit de s'engager dans la traversée d'une chaussée hors d'un passage piéton, même s'il n'en n'existe pas à moins de 50 mètres" },
          { lettre: "D", texte: "Sont tenus d'utiliser, lorsqu'il en existe à moins de 50 mètres, les passages prévus à leur intention" , correct: true },
        ],
      },
      {
        id: 12,
        type: "QCM",
        enonce: "Le décret n° 2016-448 du 13 avril 2016 modifiant certaines dispositions du code de la route relatives aux véhicules interdit les « vitres surteintées ». A cette fin, il impose :",
        choix: [
          { lettre: "A", texte: "un taux minimal de transparence de 70% sur les vitres avant et le pare-brise" , correct: true },
          { lettre: "B", texte: "un taux minimal de transparence de 80% sur les vitres avant, le pare-prise et les vitres arrières" },
          { lettre: "C", texte: "un taux minimal de transparence de 80% sur les vitres arrières et lunettes-arrières" },
          { lettre: "D", texte: "un taux minimal de transparence de 70% sur les vitres avant, le pare-prise et les vitres arrières" },
        ],
      },
      {
        id: 13,
        type: "QCM",
        enonce: "Dans quel cas l'arrêt est-il autorisé sur la bande d'arrêt d'urgence de l'autoroute ?",
        choix: [
          { lettre: "A", texte: "en cas de panne ou d'accident" , correct: true },
          { lettre: "B", texte: "pour téléphoner" },
          { lettre: "C", texte: "dans tous les cas" },
          { lettre: "D", texte: "jamais" },
        ],
      },
      {
        id: 14,
        type: "QCM",
        enonce: "La durée du temps de réaction est d'environ:",
        choix: [
          { lettre: "A", texte: "1/10 ième de seconde" },
          { lettre: "B", texte: "1 seconde" , correct: true },
          { lettre: "C", texte: "1/2 seconde" },
        ],
      },
      {
        id: 15,
        type: "QCM",
        enonce: "En agglomération, lorsque vous dépassez latéralement, un piéton ou un cycliste, vous devez laisser un espace d'au moins :",
        choix: [
          { lettre: "A", texte: "1,50 mètres" },
          { lettre: "B", texte: "1 mètre" , correct: true },
          { lettre: "C", texte: "0,50 mètre" },
          { lettre: "D", texte: "3 mètres" },
        ],
      },
      {
        id: 16,
        type: "QCM",
        enonce: "Titulaire d'un permis probatoire, dans quel cas, devrais-je suivre obligatoirement un stage de sensibilisation à la sécurité routière :",
        choix: [
          { lettre: "A", texte: "en cas de perte en une seule fois de 3 points" , correct: true },
          { lettre: "B", texte: "en cas de perte en une seule fois de 4 points" , correct: true },
          { lettre: "C", texte: "en cas de perte en une seule fois de 2 points" },
        ],
      },
      {
        id: 17,
        type: "QCM",
        enonce: "Ce panneau signale :",
        image: "/cours/examens/panneau-cassis.png",
        choix: [
          { lettre: "A", texte: "un cassis ou dos d'âne" , correct: true },
          { lettre: "B", texte: "un ralentisseur de type dos d'âne" },
          { lettre: "C", texte: "un ralentisseur" },
        ],
      },
      {
        id: 18,
        type: "QCM",
        enonce: "Par temps de pluie, est allongé(e) :",
        choix: [
          { lettre: "A", texte: "la distance d'arrêt" , correct: true },
          { lettre: "B", texte: "l'adhérence sur la route" },
          { lettre: "C", texte: "la distance de freinage" , correct: true },
          { lettre: "D", texte: "le temps de réaction" },
        ],
      },
      {
        id: 19,
        type: "QCM",
        enonce: "Vous êtes au volant de votre véhicule et recevez un appel sur votre téléphone portable. Vous prenez le téléphone en main, vous encourez :",
        choix: [
          { lettre: "A", texte: "un retrait de deux points" },
          { lettre: "B", texte: "un retrait d'un point" },
          { lettre: "C", texte: "un retrait de trois points" , correct: true },
        ],
      },
      {
        id: 20,
        type: "QCM",
        enonce: "En cas de récidive d'une conduite sous l'influence de substances ou de plantes classées comme stupéfiants, vous encourez :",
        choix: [
          { lettre: "A", texte: "la confiscation/immobilisation de votre véhicule" , correct: true },
          { lettre: "B", texte: "la suspension de votre permis de conduire" },
          { lettre: "C", texte: "l'annulation de votre permis de conduire" , correct: true },
        ],
      },
    ],
  },
  {
    id: "francais",
    nom: "D - Capacité d'expression et de compréhension en langue française",
    duree: 30,
    coefficient: 2,
    noteEliminatoire: 5,
    noteSur: 24,
    texteSupport: `Gros fail et design douteux... Elon Musk présente le «cybertruck» 100% électrique de Tesla

BLADE RUNNER Cet engin électrique est censé résister à toute attaque extérieure (mais n'a pas résisté pendant le show)

Lignes (très) épurées et inox mat pour le nouveau véhicule Tesla. Elon Musk fait un bond dans le futur en présentant jeudi soir près de Los Angeles son étrange «cybertruck», moitié véhicule blindé, moitié avion furtif et 100 % électrique. Un show à l'américaine.. qui ne s'est pas déroulé comme prévu.

Elon Musk avait prévenu: son véhicule aurait une allure «futuriste» et «cyberpunk» inspirée par Blade Runner, le film de science-fiction de Ridley Scott.

«Il ne ressemble à rien d'autre», a résumé fièrement le PDG de Tesla sur scène, désignant son pick-up massif aux lignes angulaires lors d'un show dans le centre de design du constructeur à Hawthorne (Californie). Un design rapidement moqué sur les réseaux sociaux.

Résistant.. mais pas trop

A défaut d'arborer un design élégant, le «cybertruck» affiche sur le papier des performances impressionnantes, abondamment vantées par Elon Musk avec des démonstrations impliquant des coups de masse, des jets de boules en acier, voire des tirs d'arme à feu, ceux-là enregistrés en vidéo pour raisons de sécurité.

«C'est littéralement résistant aux balles de pistolet calibre 9 mm», a-t-il assuré. «C'est un alliage en acier inoxydable ultrarésistant que nous avons développé. Nous allons utiliser le même alliage pour la fusée spatiale que pour le "cybertruck"», a lancé Elon Musk en référence à l'activité de SpaceX, dont il est aussi le fondateur et le PDG.

Problème: lors de l'essai de l'envoi d'une balle d'acier sur scène, la démonstration rate, et la vitre du prototype casse (sans toutefois exploser). Rires dans la salle, sourire gêné pour Elon Musk. «Oh my f**king God. Bon... Peut-être que c'était un peu trop violent. On va arranger ça en post-production», blague le milliardaire.

Moins de 50.000 dollars

Le futur pickup de Tesla aura six places, pourra emporter plus de 1,5 tonne et sera capable de tracter sept tonnes, a-t-il détaillé. Le «cybertruck» sera décliné en trois modèles, 39.900 dollars et 400 km d'autonomie pour l'entrée de gamme, jusqu'à 69.900 dollars et 800 km d'autonomie annoncée pour le modèle supérieur. Et il pourra passer de 0 à 100 km/h en environ trois secondes, s'est réjoui le fantasque patron de Tesla.

Elon Musk avait promis que son fameux pick-up coûterait moins de 50.000 dollars, un prix dans la moyenne pour cette catégorie de véhicules, et qu'il surpasserait les performances du Ford F-150, numéro un aux Etats-Unis sur ce segment depuis longtemps.

Certains experts estiment que le pick-up électrique Tesla aura du mal à séduire la clientèle traditionnelle pour ce type d'engins. «Même si le pick-up de Tesla ne séduit pas les amateurs habituels du F-150, il n'en a pas forcément besoin», relevait Jessica Caldwell, directrice de la prospective pour le guide automobile Ens, dans une déclaration transmise avant la présentation. «Si le pickup Tesla n'était pas un peu polémique, ce ne serait pas une Tesla», a-t-elle ajouté.`,
    texteSource: "Article de presse — Présentation du Cybertruck Tesla",
    questions: [
      {
        id: 2,
        type: "QRC",
        enonce: "Pourquoi la présentation du Cybertruck a été un échec ? (QRC)",
        reponseQRC: "Parce que ce véhicule est censé être très résistent aux attaques extérieurs mais sa vitre a été cassé par l'envoi d'une balle d'acier.",
      },
      {
        id: 3,
        type: "QRC",
        enonce: "Si le pick-up Tesla n'était pas un peu polémique, ça ne serait pas une Tesla». Expliquez cette affirmation (QRC)",
        reponseQRC: "Tesla est une société qui cherche toujours d'apporter de la nouveauté et de l'innovation. Les polémiques et les scandales ne font qu'augmenter son succès.",
      },
      {
        id: 4,
        type: "QRC",
        enonce: "D'après le texte, listez au moins 4 caractéristiques du Cybertruck Tesla. (QRC)",
        reponseQRC: "véhicule 100% électrique, lignes très épurées, allure futuriste et cyberpunk, six places, capable de tracter sept tonnes et emporter 1.5 tonne, réalisé en acier inoxydable ultrarésistant, pourra passer de 0 à 100km/h en environ trois secondes",
      },
      {
        id: 5,
        type: "QCM",
        enonce: "Pourquoi Cybertruck pourrait-il avoir du mal à séduire la clientèle traditionnelle ?",
        choix: [
          { lettre: "A", texte: "Parce qu'il ne ressemble à rien d'autre" },
          { lettre: "B", texte: "Parce qu'il est trop cher" },
          { lettre: "C", texte: "Parce que c'est un véhicule électrique" , correct: true },
        ],
      },
      {
        id: 6,
        type: "QCM",
        enonce: "Quelle est l'autonomie maximale d'un modèle Cybertruck ?",
        choix: [
          { lettre: "A", texte: "100km" },
          { lettre: "B", texte: "400km" },
          { lettre: "C", texte: "800km" , correct: true },
        ],
      },
      {
        id: 7,
        type: "QCM",
        enonce: "Qu'est-ce qu'un prototype ?",
        choix: [
          { lettre: "A", texte: "modèle diffusé à grande échelle" },
          { lettre: "B", texte: "dernier modèle d'une série" },
          { lettre: "C", texte: "un modèle de tests/d'études d'un nouveau produit" , correct: true },
        ],
      },
      {
        id: 8,
        type: "QCM",
        enonce: "Par quel autre moyen de transport l'alliage en acier développé par Tesla sera-t-il utilisé ?",
        choix: [
          { lettre: "A", texte: "La fusée spatiale" , correct: true },
          { lettre: "B", texte: "Le blade Runner" },
          { lettre: "C", texte: "Le F-150" },
        ],
      },
      {
        id: 9,
        type: "QCM",
        enonce: "Donnez un (des) synonyme(s) de \"arborer\" :",
        choix: [
          { lettre: "A", texte: "Dissimuler" },
          { lettre: "B", texte: "Révéler" , correct: true },
          { lettre: "C", texte: "Cacher" },
          { lettre: "D", texte: "Afficher" , correct: true },
        ],
      },
      {
        id: 10,
        type: "QCM",
        enonce: "Quelle est la signification du mot \"allure\" dans le texte ?",
        choix: [
          { lettre: "A", texte: "Vitesse" },
          { lettre: "B", texte: "Style" , correct: true },
          { lettre: "C", texte: "Aspect" , correct: true },
        ],
      },
    ],
  },
  {
    id: "anglais",
    nom: "E - Capacité d'expression et de compréhension en langue anglaise",
    duree: 20,
    coefficient: 1,
    noteEliminatoire: 4,
    noteSur: 20,
    questions: [
      {
        id: 1,
        type: "QCM",
        enonce: "I was told to say anything concerning this new advert :",
        choix: [
          { lettre: "A", texte: "je n'avais rien à dire concernant ce nouvel adversaire" },
          { lettre: "B", texte: "je n'ai rien à dire à propos de ce nouvel avertissement" },
          { lettre: "C", texte: "on m'a dis de ne rien dire de cette nouvelle publicité" , correct: true },
        ],
      },
      {
        id: 2,
        type: "QCM",
        enonce: "Bonjour, êtes-vous disponible pour m'emmener à la gare ?",
        choix: [
          { lettre: "A", texte: "hello, are you available to make me to the station ?" },
          { lettre: "B", texte: "hello, are you disponible to get me to the station ?" },
          { lettre: "C", texte: "hello, are you available to get me to the station ?" , correct: true },
          { lettre: "D", texte: "hello, are you disponible to make me to the station ?" },
        ],
      },
      {
        id: 3,
        type: "QCM",
        enonce: "You will ..............., our island si amazing.",
        choix: [
          { lettre: "A", texte: "Watch" },
          { lettre: "B", texte: "Breathe" },
          { lettre: "C", texte: "Hear" },
          { lettre: "D", texte: "See" , correct: true },
        ],
      },
      {
        id: 4,
        type: "QCM",
        enonce: "Thank you for the ride, keep the change:",
        choix: [
          { lettre: "A", texte: "merci pour la course, gardez la monnaie" , correct: true },
          { lettre: "B", texte: "merci d'avoir attendu, gardez la monnaie" },
          { lettre: "C", texte: "merci pour la course, ne changez pas" },
        ],
      },
      {
        id: 5,
        type: "QCM",
        enonce: "Nous vérifions le moteur trois fois par an",
        choix: [
          { lettre: "A", texte: "we're checking the motor three times per week" },
          { lettre: "B", texte: "we check, the motor three times per year" , correct: true },
          { lettre: "C", texte: "we were tchecking the motor three times per year" },
        ],
      },
      {
        id: 6,
        type: "QCM",
        enonce: "Pourriez-vous passer me prendre ici demain à 6 heures, s'il-vous plait",
        choix: [
          { lettre: "A", texte: "could you pick me on here tomorrow at 6, please ?" },
          { lettre: "B", texte: "could you pick me up here tomorrow at 6, please ?" , correct: true },
          { lettre: "C", texte: "can you take me here tomorrow at 6, please ?" },
        ],
      },
      {
        id: 7,
        type: "QCM",
        enonce: "Have you come for the music festival ?",
        choix: [
          { lettre: "A", texte: "avez-vous votre place pour le festival de musique ?" },
          { lettre: "B", texte: "êtes-vous allés au festival de musique ?" },
          { lettre: "C", texte: "êtes-vous venus pour le festival de musique ?" , correct: true },
        ],
      },
      {
        id: 8,
        type: "QCM",
        enonce: "I took a taxi beause the buses were on strike",
        choix: [
          { lettre: "A", texte: "je prends un taxi car les bus sont lents" },
          { lettre: "B", texte: "j'ai pris un taxi car les bus ne fonctionnaient pas" },
          { lettre: "C", texte: "j'ai pris un taxi car les bus étaient en grève" , correct: true },
        ],
      },
      {
        id: 9,
        type: "QCM",
        enonce: "Disabled welcome :",
        choix: [
          { lettre: "A", texte: "j'accueille les handicapés" , correct: true },
          { lettre: "B", texte: "pas de place pour le fauteuil" },
          { lettre: "C", texte: "pas de fauteuil roulant" },
        ],
      },
      {
        id: 10,
        type: "QCM",
        enonce: "Do you take the......card ?",
        choix: [
          { lettre: "A", texte: "Credit" , correct: true },
          { lettre: "B", texte: "Right" },
          { lettre: "C", texte: "Blue" },
        ],
      },
      {
        id: 11,
        type: "QCM",
        enonce: "Souhaitez-vous un reçu ?",
        choix: [
          { lettre: "A", texte: "did you want a bill ?" },
          { lettre: "B", texte: "do you want a ticket ?" },
          { lettre: "C", texte: "would you like a receipt ?" , correct: true },
        ],
      },
      {
        id: 12,
        type: "QCM",
        enonce: "Savez-vous de quand date ce bâtiment historique ?",
        choix: [
          { lettre: "A", texte: "do you know some listed historical monuments ?" },
          { lettre: "B", texte: "do you know when this historical monument was buit ?" , correct: true },
          { lettre: "C", texte: "is it possible to visit this historical monument ?" },
        ],
      },
      {
        id: 13,
        type: "QCM",
        enonce: "Il est interdit de fumer dans la voiture !",
        choix: [
          { lettre: "A", texte: "it's allowed of smoke in the car !" },
          { lettre: "B", texte: "it's forbidden of smoke in the car !" },
          { lettre: "C", texte: "it's forbidden to smoke in the car !" , correct: true },
        ],
      },
      {
        id: 14,
        type: "QCM",
        enonce: "Passez-vous un agréable séjour en France ?",
        choix: [
          { lettre: "A", texte: "do you enjoy your stay in France ?" , correct: true },
          { lettre: "B", texte: "do you like France ?" },
        ],
      },
      {
        id: 15,
        type: "QCM",
        enonce: "the yellow vests block the motorways",
        choix: [
          { lettre: "A", texte: "the yellow vests are blocking the motorways", correct: true },
          { lettre: "B", texte: "the yellew vests blocked the motorways" , correct: true },
          { lettre: "C", texte: "the yellow vests will block the ùotorways" },
        ],
      },
      {
        id: 16,
        type: "QCM",
        enonce: "Elle vit à Paris depuis dix ans",
        choix: [
          { lettre: "A", texte: "she lived in Paris for ten years" },
          { lettre: "B", texte: "she has lived in Paris until ten years" },
          { lettre: "C", texte: "she had been living in Paris since ten years" },
          { lettre: "D", texte: "she has been living in Paris for ten years" , correct: true },
        ],
      },
      {
        id: 17,
        type: "QCM",
        enonce: "What is the opposite of slow ?",
        choix: [
          { lettre: "A", texte: "Fast" , correct: true },
          { lettre: "B", texte: "Noisy" },
          { lettre: "C", texte: "Dry" },
        ],
      },
      {
        id: 18,
        type: "QCM",
        enonce: "Dry",
        choix: [
          { lettre: "A", texte: "Speaks" , correct: true },
          { lettre: "B", texte: "Spoken" },
          { lettre: "C", texte: "Speak" },
        ],
      },
      {
        id: 19,
        type: "QCM",
        enonce: "Vous nous devez 53 euros :",
        choix: [
          { lettre: "A", texte: "you must buy 53 euros" , correct: true },
          { lettre: "B", texte: "you owe us 53 euros" },
          { lettre: "C", texte: "you must us 53 euros" },
        ],
      },
      {
        id: 20,
        type: "QCM",
        enonce: "Sorry ! it's quite expensive for us. may we get a ....................... price ?",
        choix: [
          { lettre: "A", texte: "Lower" , correct: true },
          { lettre: "B", texte: "Less" },
          { lettre: "C", texte: "Reduction" },
        ],
      },
    ],
  },
  {
    id: "reglementation_vtc",
    nom: "F(V) - Développement commercial et gestion propre à l'activité de VTC",
    duree: 30,
    coefficient: 3,
    noteEliminatoire: 6,
    noteSur: 40,
    questions: [
      {
        id: 1,
        type: "QRC",
        enonce: "En cas de retard très important du client, que faites-vous ? (QRC)",
        reponseQRC: "Dans un premier temps je prends contact avec le client afin de lui demander son heure d'arrivée. En fonction de celle-ci je lui propose de lui réserver un autre VTC si j'ai une autre course de prévue. Dans le cas contraire le client ayant réservé la course, je l'attends.",
      },
      {
        id: 2,
        type: "QRC",
        enonce: "Le montant d'une prestation s'élève à 75 € TTC. Calculez le montant de la TVA et le prix HT, en détaillant vos calculs. (QRC)",
        reponseQRC: "Prix HT : 75/1,10 = 68,18€ Montant TVA : 75 - 68,18 = 6,82€",
      },
      {
        id: 3,
        type: "QRC",
        enonce: "Quelles sont les méthodes de prospection existantes ? Citez un exemple de chaque (QRC)",
        reponseQRC: "Prospection traditionnelle (porte à porte, téléphone) ou prospection numérique (site web, mailing, réseaux sociaux, centrales de réservations)",
      },
      {
        id: 4,
        type: "QRC",
        enonce: "Vous connaissez un VTC qui va démarrer son activité avec des prix très bas afin d'attirer un maximum de clients. Que pensez-vous de cette politique tarifaire ? (QRC)",
        reponseQRC: "Politique tarifaire risquée : rentabilité diminuée, perception du client ( prix bas = qualité mauvaise? ), dégradation de l'image de la profession,....",
      },
      {
        id: 5,
        type: "QCM",
        enonce: "A l'aéroport, le parking professionnel est saturé alors que vos clients ne vont pas tarder à sortir du check out :",
        choix: [
          { lettre: "A", texte: "vous vous garez sur des zébras" },
          { lettre: "B", texte: "vous vous garez au niveau de la dépose taxi car c'est au niveau des arrivées" },
          { lettre: "C", texte: "vous vous garez au parking public" , correct: true },
          { lettre: "D", texte: "vous attendez qu'une place se libère" },
        ],
      },
      {
        id: 6,
        type: "QCM",
        enonce: "Le panier moyen est :",
        choix: [
          { lettre: "A", texte: "La moyenne des achats par client" , correct: true },
          { lettre: "B", texte: "la taille des achats à charger dans le coffre" },
          { lettre: "C", texte: "la taille moyenne des paniers de courses en France" },
        ],
      },
      {
        id: 7,
        type: "QCM",
        enonce: "En déposant une cliente de nuit, à son domicile :",
        choix: [
          { lettre: "A", texte: "vous proposez de la raccompagner jusqu'à la porte de son appartement compte tenu de l'heure tardive" },
          { lettre: "B", texte: "vous la déposez devant la porte de son immeuble et attendez qu'elle soit rentrée dans son immeuble avant de repartir" , correct: true },
          { lettre: "C", texte: "vous la déposez devant chez elle et votre mission étant terminée, vous repartez" },
        ],
      },
      {
        id: 8,
        type: "QCM",
        enonce: "Que doit-on dire lorsqu'on décroche un appel téléphonique ?",
        choix: [
          { lettre: "A", texte: "Allo" },
          { lettre: "B", texte: "Le nom de la société" },
          { lettre: "C", texte: "Le nom de la société et bonjour" , correct: true },
        ],
      },
      {
        id: 9,
        type: "QCM",
        enonce: "La marge peut être exprimée en pourcentage du :",
        choix: [
          { lettre: "A", texte: "chiffre d'affaires" , correct: true },
          { lettre: "B", texte: "coût fixe" },
          { lettre: "C", texte: "coût des cotisations sociales" },
          { lettre: "D", texte: "coût de revient" , correct: true },
        ],
      },
      {
        id: 10,
        type: "QCM",
        enonce: "Dans le mix marketing, à quoi correspondent les 4P ?",
        choix: [
          { lettre: "A", texte: "Prix produit parrainage personnalisation" },
          { lettre: "B", texte: "Plateforme présentation place promotion" },
          { lettre: "C", texte: "Prix produit promotion place" , correct: true },
        ],
      },
      {
        id: 11,
        type: "QCM",
        enonce: "Le matériel informatique peut être amorti sur :",
        choix: [
          { lettre: "A", texte: "3 ans" , correct: true },
          { lettre: "B", texte: "5 ans", correct: true },
          { lettre: "C", texte: "1 an" },
        ],
      },
      {
        id: 12,
        type: "QCM",
        enonce: "Quelle est la première étape d'une stratégie commerciale ?",
        choix: [
          { lettre: "A", texte: "Le plan d'action" },
          { lettre: "B", texte: "Le marketing mix" },
          { lettre: "C", texte: "L'analyse du marché" , correct: true },
        ],
      },
      {
        id: 13,
        type: "QCM",
        enonce: "Trouver régulièrement de nouveaux clients c'est :",
        choix: [
          { lettre: "A", texte: "Une nécessité pour la survie de l'entreprise" , correct: true },
          { lettre: "B", texte: "Une obligation de votre comptable" },
          { lettre: "C", texte: "Un moyen de garder votre confort de vie" },
        ],
      },
      {
        id: 14,
        type: "QCM",
        enonce: "Un client vous demande si vous faites des prestations en B to B. De quoi parle-t-il ?",
        choix: [
          { lettre: "A", texte: "de prestations d'un professionnel vers des professionnels" , correct: true },
          { lettre: "B", texte: "de prestations d'un particulier vers des particuliers" },
          { lettre: "C", texte: "de prestations business to business" , correct: true },
        ],
      },
      {
        id: 15,
        type: "QCM",
        enonce: "En tant qu'exploitant, je peux :",
        choix: [
          { lettre: "A", texte: "fixer librement les prix en m'assurant de ne pas travailler à perte" , correct: true },
          { lettre: "B", texte: "fixer librement les prix, sous réserve d'être en dessous du prix de revient" },
          { lettre: "C", texte: "fixer les prix en respectant scrupuleusement la tarification imposée par l'Etat" },
        ],
      },
      {
        id: 16,
        type: "QCM",
        enonce: "Vous attendez un client à l’aéroport",
        choix: [
          { lettre: "A", texte: "Vous l’attendez dans le hall d’arrivée avec une pancarte" , correct: true },
          { lettre: "B", texte: "Vous téléphonez au client pour lui dire où il est" },
          { lettre: "C", texte: "Vous attendez qu’il vous appelle" },
        ],
      },
    ],
  },
  {
    id: "reglementation_vtc2",
    nom: "G(V) - Réglementation nationale spécifique à l'activité de VTC",
    duree: 20,
    coefficient: 3,
    noteEliminatoire: 6,
    noteSur: 24,
    questions: [
      {
        id: 1,
        type: "QRC",
        enonce: "Si vous utilisez votre véhicule VTC à des fins privées, que devez-vous faire ? (QRC)",
        reponseQRC: "Retirer la carte professionnelle, attention la vignette doit toujours être collée",
      },
      {
        id: 2,
        type: "QRC",
        enonce: "Quelle démarche faut-il entreprendre pour pouvoir exploiter un véhicule électrique dérogeant aux caractéristiques techniques imposées aux véhicules VTC ? (QRC)",
        reponseQRC: "Il n'y a pas de démarche car un véhicule électrique n'a pas besoin de respecter des caractéristiques techniques pour être utilisé par un chauffeur VTC",
      },
      {
        id: 3,
        type: "QCM",
        enonce: "La prise en charge d'un client sur une voie ouverte à la circulation publique sans réservation préalable est :",
        choix: [
          { lettre: "A", texte: "autorisée si elle est consécutive à la dépose du client précédent sur le même lieu" },
          { lettre: "B", texte: "un délit puni d'une peine de prison et d'une amende pouvant aller jusqu'à 15 000€" , correct: true },
          { lettre: "C", texte: "passible d'une suspension du permis de conduire" , correct: true },
        ],
      },
      {
        id: 4,
        type: "QCM",
        enonce: "Quelles sont les dimensions minimum d'une voiture pour être utilisée comme VTC ?",
        choix: [
          { lettre: "A", texte: "4,5 m x 1,7 m" , correct: true },
          { lettre: "B", texte: "4,6 m x 1,8 m" },
          { lettre: "C", texte: "4,3 m x 1,5 m" },
          { lettre: "D", texte: "4,5 m x 1,6 m" },
        ],
      },
      {
        id: 5,
        type: "QCM",
        enonce: "L'inscription au registre des exploitants VTC donne lieu à :",
        choix: [
          { lettre: "A", texte: "la publication au bulletin officiel" },
          { lettre: "B", texte: "la publication du nom de l'entreprise dans la liste des exploitants sur le site du Ministère" , correct: true },
          { lettre: "C", texte: "la délivrance d'une attestation d'inscription" , correct: true },
          { lettre: "D", texte: "la délivrance d'un diplôme" },
        ],
      },
      {
        id: 6,
        type: "QCM",
        enonce: "Comment reconnait-on un VTC ?",
        choix: [
          { lettre: "A", texte: "Par la couleur noire du véhicule de haut-de-gamme" },
          { lettre: "B", texte: "Par un macaron à l'avant et à l'arrière du véhicule" , correct: true },
          { lettre: "C", texte: "par un macaron à l'avant" },
          { lettre: "D", texte: "Par un macaron à l'arrière" },
        ],
      },
      {
        id: 7,
        type: "QCM",
        enonce: "La durée maximale de stationnement précédant l'horaire de prise en charge mentionné par le client lors de sa réservation à un aéroport ou une gare pour un VTC est de :",
        choix: [
          { lettre: "A", texte: "30 minutes" },
          { lettre: "B", texte: "45 minutes" },
          { lettre: "C", texte: "1 h 30" },
          { lettre: "D", texte: "1 heure" , correct: true },
        ],
      },
      {
        id: 8,
        type: "QCM",
        enonce: "Pour la réalisation d'une prestation de VTC :",
        choix: [
          { lettre: "A", texte: "les conditions générales de vente peuvent constituer un document valant contrat, sous réserve que le client ait dûment signé toutes les pages" },
          { lettre: "B", texte: "il doit exister un contrat avec le client final qui doit être obligatoirement écrit sur support papier" },
          { lettre: "C", texte: "il doit exister un contrat avec le client final pouvant être écrit sur support papier ou électronique" , correct: true },
          { lettre: "D", texte: "les conditions générales de vente peuvent constituer un document valant contrat, sous réserve que le client ait dûment signé la dernière page" },
        ],
      },
    ],
  },
];

const eb6Matieres: Matiere[] = [
  {
    id: "t3p",
    nom: "A - Transport Public Particulier de Personnes (T3P)",
    duree: 45,
    coefficient: 3,
    noteEliminatoire: 6,
    noteSur: 36,
    questions: [
      {
        id: 1,
        type: "QRC",
        enonce: "T3P",
      },
      {
        id: 2,
        type: "QRC",
        enonce: "QUELLES SPÉCIFICITÉS DOIVENT FIGURER SUR LE CONTRAT D'ASSURANCE POUR EXERCER L'ACTIVITÉ DE TRANSPORT PARTICULIER DE PERSONNES (T3P) ? (QRC)",
      },
      {
        id: 3,
        type: "QRC",
        enonce: "Le renouvellement de la carte professionnelle intervient quand 2 attestations sont produites ?",
        reponseQRC: "visite médicale ,formation continue",
      },
      {
        id: 4,
        type: "QRC",
        enonce: "Qu'est-ce que l'honorabilité dans votre profession ? (QRC)",
        reponseQRC: "avoir le casier judicaire B2 vierge",
      },
      {
        id: 5,
        type: "QRC",
        enonce: "DÉVELOPPER LE SIGLE \"T3P\"",
      },
      {
        id: 6,
        type: "QRC",
        enonce: "Par qui est donné l’attestation de formation continue ? (QRC)",
        reponseQRC: "Par le représentant légal du centre de formation",
      },
      {
        id: 7,
        type: "QCM",
        enonce: "Le stage de formation continue dispensé aux conducteurs de transport public routier particulier de personnes permet d'obtenir une attestation valable :",
        choix: [
          { lettre: "A", texte: "5 ans" , correct: true },
          { lettre: "B", texte: "1 an" },
          { lettre: "C", texte: "2 ans", correct: true },
          { lettre: "D", texte: "10 ans", correct: true },
        ],
      },
      {
        id: 8,
        type: "QCM",
        enonce: "QUEL SERVICE DÉLIVRE LA CARTE PROFESSIONNELLE DE CONDUCTEUR DE T3P ?",
        choix: [
          { lettre: "A", texte: "La prefecture" , correct: true },
          { lettre: "B", texte: "La DIRECCTE" },
          { lettre: "C", texte: "La DREAL" },
        ],
      },
      {
        id: 9,
        type: "QCM",
        enonce: "LA RÉGLEMENTATION DU T3P SE TROUVE DANS LE :",
        choix: [
          { lettre: "D", texte: "Code du travail" , correct: true },
          { lettre: "C", texte: "La DREAL" },
          { lettre: "B", texte: "Code préfectoral" },
          { lettre: "C", texte: "Code penal" },
          { lettre: "D", texte: "Code du travail" , correct: true },
        ],
      },
      {
        id: 10,
        type: "QCM",
        enonce: "Qu'est-ce qui caractérise un déplacement en covoiturage ?",
        choix: [
          { lettre: "A", texte: "Aucune obligation de réaliser le trajet" , correct: true },
          { lettre: "B", texte: "Un conducteur titulaire de la RC PRO" },
          { lettre: "C", texte: "Partage obligatoire des frais engagés" , correct: true },
          { lettre: "D", texte: "Aucun contrat entre les parties" },
        ],
      },
      {
        id: 11,
        type: "QCM",
        enonce: "L'assurance dite responsabilité civile professionnelle (RCP) peut être invoquée par le conducteur s'il :",
        choix: [
          { lettre: "A", texte: "accroche un autre véhicule en manœuvrant pour se garer" },
          { lettre: "B", texte: "abîme le vêtement de son passager en l'accompagnant jusqu'à son hôtel" , correct: true },
          { lettre: "C", texte: "est contrôlé et n'a pas sa carte professionnelle" },
        ],
      },
      {
        id: 12,
        type: "QCM",
        enonce: "Parmi ces affirmations, laquelle est vraie ?",
        choix: [
          { lettre: "A", texte: "La carte professionnelle mentionne la commune dans laquelle on est autorisé à exercer" },
          { lettre: "B", texte: "La carte professionnelle est délivrée par le Préfet ou le Préfet de Police" , correct: true },
          { lettre: "C", texte: "La carte professionnelle est délivrée par la Mairie" },
          { lettre: "D", texte: "La carte professionnelle mentionne le résultat à l'examen" },
        ],
      },
      {
        id: 13,
        type: "QCM",
        enonce: "Le fait de ne pas présenter immédiatement sa carte professionnelle de conducteur lors d'un contrôle est passible :",
        choix: [
          { lettre: "A", texte: "d'une amende de première classe" },
          { lettre: "B", texte: "d'une immobilisation du véhicule" },
          { lettre: "C", texte: "d'une amende de deuxième classe" , correct: true },
          { lettre: "D", texte: "d'une amende de quatrième classe" },
        ],
      },
      {
        id: 14,
        type: "QCM",
        enonce: "PEUVENT SIÉGER AUX COMMISSIONS LOCALES DU T3P :",
        choix: [
          { lettre: "A", texte: "des représentants des consommateurs" , correct: true },
          { lettre: "B", texte: "les chambres consulaires" },
          { lettre: "C", texte: "la CPAM" },
          { lettre: "D", texte: "des représentants des personnes à mobilité réduite" , correct: true },
        ],
      },
      {
        id: 15,
        type: "QCM",
        enonce: "Quelle(s) est (sont) le(s) exemple(s) d'infractions pouvant figurer au Bulletin n°2 du casier judiciaire ?",
        choix: [
          { lettre: "A", texte: "Non présentation du permis de conduire" },
          { lettre: "B", texte: "Escroquerie", correct: true },
          { lettre: "C", texte: "Extorsion de fonds", correct: true },
          { lettre: "D", texte: "Non respect d'un feu tricolore" },
        ],
      },
    ],
  },
  {
    id: "gestion",
    nom: "B - Gestion",
    duree: 45,
    coefficient: 3,
    noteEliminatoire: 6,
    noteSur: 36,
    questions: [
      {
        id: 2,
        type: "QRC",
        enonce: "Expliquez le régime de la responsabilité limitée (QRC)",
        reponseQRC: "La responsabilité limitée concerne les conséquences financières d'une entreprise en cas de faillite , les sociétés ont une responsabilités limitées , cela signifie qu'en cas de faillite, c'est uniquement le patrimoine professionnel de la société qui pourra être saisi et non celui du gérant",
      },
      {
        id: 3,
        type: "QRC",
        enonce: "Lorsqu'un artisan vend son véhicule, expliquez comment est calculée la plus-value ou la moins-value réalisée (QRC)",
        reponseQRC: "Il faut soustraire le prix de vente au prix d'achat du véhicule de l'artisan",
      },
      {
        id: 4,
        type: "QCM",
        enonce: "Mes clients me payent 30 jours fin de mois. Pour une prestation réalisée le 5 avril, quand serai-je réglé ?",
        choix: [
          { lettre: "A", texte: "31 mai" , correct: true },
          { lettre: "B", texte: "30 avril" },
          { lettre: "C", texte: "30 juin" },
        ],
      },
      {
        id: 5,
        type: "QCM",
        enonce: "Développer l'acronyme APE (de code APE)",
        choix: [
          { lettre: "A", texte: "activités professionnelles de l'entreprise" },
          { lettre: "B", texte: "activité principale exercée" , correct: true },
          { lettre: "C", texte: "accord paritaire d’entreprise" },
        ],
      },
      {
        id: 6,
        type: "QCM",
        enonce: "Parmi les dépenses suivantes, quelles sont celles qui n'ont pas un caractère professionnel ?",
        choix: [
          { lettre: "A", texte: "Honoraire comptable" },
          { lettre: "B", texte: "Taxe foncière" , correct: true },
          { lettre: "C", texte: "Contravention" , correct: true },
        ],
      },
      {
        id: 7,
        type: "QCM",
        enonce: "Quels sont les documents comptables obligatoires pour une micro-entreprise ?",
        choix: [
          { lettre: "A", texte: "le livre des recettes" , correct: true },
          { lettre: "B", texte: "le registre des achats" , correct: true },
          { lettre: "C", texte: "le bilan" },
          { lettre: "D", texte: "le compte de résultat" },
        ],
      },
      {
        id: 8,
        type: "QCM",
        enonce: "LE CHIFFRE D'AFFAIRES D'UN ARTISAN T3P PASSE DE 10 100 € À 15 440 €, L'ANNÉE SUIVANTE. QUEL EST LE POURCENTAGE D'AUGMENTATION ?",
        choix: [
          { lettre: "A", texte: "54.20 %" },
          { lettre: "B", texte: "52.87 %" , correct: true },
          { lettre: "C", texte: "51.83 %" },
        ],
      },
      {
        id: 9,
        type: "QCM",
        enonce: "Dans une entreprise individuelle :",
        choix: [
          { lettre: "A", texte: "L'entrepreneur individuel est responsable du paiement des dettes de l'entreprise" },
          { lettre: "B", texte: "Les biens de l'entreprise et de son fondateur sont confondus" , correct: true },
          { lettre: "C", texte: "L'entrepreneur individuel est responsable du paiement des dettes à hauteur du capital" },
        ],
      },
      {
        id: 10,
        type: "QCM",
        enonce: "En micro entreprise en 2024, quel plafond de chiffre d'affaires je ne dois pas dépasser pour conserver ce statut",
        choix: [
          { lettre: "A", texte: "77 700 €" , correct: true },
          { lettre: "B", texte: "58 000 €" },
          { lettre: "C", texte: "33 200 €" },
        ],
      },
      {
        id: 11,
        type: "QCM",
        enonce: "Je m'installe en tant qu'artisan. Je souscris un crédit-bail pour l'acquisition de mon véhicule :",
        choix: [
          { lettre: "A", texte: "Je l'amortis sur 5 ans" },
          { lettre: "B", texte: "Je ne peux pas l'amortir" , correct: true },
          { lettre: "C", texte: "Je l'amortis sur 10 ans" },
        ],
      },
      {
        id: 12,
        type: "QCM",
        enonce: "Chaque mois, la TVA à décaisser représente",
        choix: [
          { lettre: "A", texte: "la TVA déductible moins la TVA collectée" },
          { lettre: "B", texte: "la TVA sur les achats" },
          { lettre: "C", texte: "la TVA collectée moins la TVA déductible" , correct: true },
          { lettre: "D", texte: "la TVA sur les ventes" },
        ],
      },
      {
        id: 13,
        type: "QCM",
        enonce: "Le dirigeant d’une micro-entreprise :",
        choix: [
          { lettre: "A", texte: "est soumis à l’impôt sur les société" },
          { lettre: "B", texte: "n'est pas soumis à l’impôt" },
          { lettre: "C", texte: "est soumis à l’impôt sur le revenu" , correct: true },
        ],
      },
      {
        id: 14,
        type: "QCM",
        enonce: "Qu'est-ce qu'un chiffre d'affaires ?",
        choix: [
          { lettre: "A", texte: "l'ensemble des commandes ou devis" },
          { lettre: "B", texte: "la différence entre les produits et les charges" },
          { lettre: "C", texte: "l'argent qui reste en banque après avoir payé toutes les charges" },
          { lettre: "D", texte: "l'ensemble de sommes facturées aux clients" , correct: true },
        ],
      },
      {
        id: 15,
        type: "QCM",
        enonce: "L'EURL EN T3P AVEC ASSOCIÉ PHYSIQUE EST SOUMISE DE PLEIN DROIT À :",
        choix: [
          { lettre: "A", texte: "l’impôt sur les revenus catégorie Bénéfices Non Commerciaux" },
          { lettre: "B", texte: "impôt sur les sociétés" },
          { lettre: "C", texte: "l’impôt sur les revenus catégories Bénéfices Industriels et Commerciaux" , correct: true },
          { lettre: "D", texte: "aucun impôt" },
        ],
      },
      {
        id: 16,
        type: "QCM",
        enonce: "Quel(s) document(s) mesure(nt) l'enrichissement et l'appauvrissement d'une entreprise ?",
        choix: [
          { lettre: "A", texte: "La balance" },
          { lettre: "B", texte: "Le grand livre" },
          { lettre: "C", texte: "Compte de résultat" , correct: true },
          { lettre: "D", texte: "Le livre journal" },
        ],
      },
      {
        id: 17,
        type: "QCM",
        enonce: "Quel est le montant HT d'une course de transport de personnes d'un montant de 55 € TTC ?",
        choix: [
          { lettre: "A", texte: "52.13 €" },
          { lettre: "B", texte: "45.83 €" },
          { lettre: "C", texte: "50 €" , correct: true },
        ],
      },
      {
        id: 18,
        type: "QCM",
        enonce: "De quoi se compose le chiffre d'affaire annuel d'une entreprise ?",
        choix: [
          { lettre: "A", texte: "du nombre de clients de l'année" },
          { lettre: "B", texte: "du bénéfice" },
          { lettre: "C", texte: "de la somme des recettes de l'année" , correct: true },
        ],
      },
    ],
  },
  {
    id: "securite",
    nom: "C - Sécurité routière",
    duree: 30,
    coefficient: 2,
    noteEliminatoire: 4,
    noteSur: 24,
    questions: [
      {
        id: 1,
        type: "QCM",
        enonce: "Le titulaire d'un permis de conduire de la catégorie B peut conduire un véhicule :",
        choix: [
          { lettre: "A", texte: "Pouvant transporter dix passagers, conducteur non compris" },
          { lettre: "B", texte: "Pouvant transporter neuf passagers, conducteur non compris" },
          { lettre: "C", texte: "Pouvant transporter huit passagers, conducteur non compris" , correct: true },
          { lettre: "D", texte: "Ayant un poids total autorisé en charge (PTAC) qui n'excède pas 3.5 tonnes" , correct: true },
        ],
      },
      {
        id: 2,
        type: "QCM",
        enonce: "Dans quel cas le conducteur doit-il réduire sa vitesse, même s'il est déjà en dessous de la vitesse maximale autorisée ?",
        choix: [
          { lettre: "A", texte: "Lors du croisement ou du dépassement de piétons" , correct: true },
          { lettre: "B", texte: "Lorsque la route est dégagée et qu'il n'y pas d'obstacles" },
          { lettre: "C", texte: "Lors du croisement ou du dépassement de cyclistes isolés ou en groupe" , correct: true },
          { lettre: "D", texte: "Le code de la route n'a pas prévu le cas" },
        ],
      },
      {
        id: 3,
        type: "QCM",
        enonce: "Les enfants peuvent circuler à vélo sur les trottoirs jusqu'à l’âge de :",
        choix: [
          { lettre: "A", texte: "6 ans" },
          { lettre: "B", texte: "8 ans" , correct: true },
          { lettre: "C", texte: "12 ans" },
        ],
      },
      {
        id: 4,
        type: "QCM",
        enonce: "Les feux de route éclairent à une distance minimale de :",
        choix: [
          { lettre: "A", texte: "150 mètres" },
          { lettre: "B", texte: "50 mètres" },
          { lettre: "C", texte: "100 mètres" , correct: true },
          { lettre: "D", texte: "200 mètres" },
        ],
      },
      {
        id: 5,
        type: "QCM",
        enonce: "Est-il obligatoire de rédiger un constat amiable ?",
        choix: [
          { lettre: "A", texte: "Oui" },
          { lettre: "B", texte: "Oui, sinon je risque une sanction" },
          { lettre: "C", texte: "Non" , correct: true },
        ],
      },
      {
        id: 6,
        type: "QCM",
        enonce: "Lorsque je manœuvre :",
        choix: [
          { lettre: "A", texte: "je suis toujours prioritaire" },
          { lettre: "B", texte: "je dois la priorité avant de manœuvrer" , correct: true },
          { lettre: "C", texte: "je dois la priorité durant le manœuvre" , correct: true },
        ],
      },
      {
        id: 7,
        type: "QCM",
        enonce: "Le fait de ne pas présenter immédiatement son permis de conduire aux agents de l'autorité compétente est puni de :",
        choix: [
          { lettre: "A", texte: "Une amende prévue pour les contraventions de quatrième classe" },
          { lettre: "B", texte: "Une amende prévue pour les contraventions de seconde classe" , correct: true },
          { lettre: "C", texte: "Une amende prévue pour les contraventions de troisième classe" },
          { lettre: "D", texte: "Une amende prévue pour les contraventions de première classe" },
        ],
      },
      {
        id: 8,
        type: "QCM",
        enonce: "Quelles sont les précautions nécessaires pour vérifier le niveau d'huile",
        choix: [
          { lettre: "A", texte: "Moteur chaud" },
          { lettre: "B", texte: "Moteur froid" , correct: true },
          { lettre: "C", texte: "Terrain plat" , correct: true },
          { lettre: "D", texte: "Moteur allumé" },
        ],
      },
      {
        id: 9,
        type: "QCM",
        enonce: "L'ABS (système d'antiblocage des roues) :",
        choix: [
          { lettre: "A", texte: "réduit considérablement la distance d’arrêt" },
          { lettre: "B", texte: "permet de ne pas allonger la distance d’arrêt" , correct: true },
          { lettre: "C", texte: "aide à maintenir la direction du véhicule" , correct: true },
          { lettre: "D", texte: "Une contravention de quatrième classe", correct: true },
        ],
      },
      {
        id: 10,
        type: "QCM",
        enonce: "Que risque un conducteur en cas de dépassement de la vitesse maximale autorisée compris entre 40 km/h et moins de 50 km//h ?",
        choix: [
          { lettre: "A", texte: "La perte de quatre points de permis de conduire" , correct: true },
          { lettre: "B", texte: "La perte de deux points de permis de conduire" },
          { lettre: "C", texte: "Une contravention de première classe" , correct: true },
          { lettre: "D", texte: "Une contravention de quatrième classe", correct: true },
        ],
      },
      {
        id: 11,
        type: "QCM",
        enonce: "Pour dépasser un cycliste en ville, je dois laisser un espace latéral minimum de :",
        choix: [
          { lettre: "A", texte: "1.00 m" , correct: true },
          { lettre: "B", texte: "2.00 m" },
          { lettre: "C", texte: "0.50 m" },
          { lettre: "D", texte: "1.50 m" },
        ],
      },
      {
        id: 12,
        type: "QCM",
        enonce: "Qui signe le constat amiable lors d'un accident ?",
        choix: [
          { lettre: "A", texte: "Les deux conducteurs et les témoins" },
          { lettre: "B", texte: "La victime de l'accident" },
          { lettre: "C", texte: "Les deux conducteurs" , correct: true },
          { lettre: "D", texte: "L'auteur de l'accident" },
        ],
      },
      {
        id: 13,
        type: "QCM",
        enonce: "Je vais rencontrer :",
        image: "/cours/examens/panneau-stationnement-payant.png",
        choix: [
          { lettre: "A", texte: "une zone où l’arrêt est formellement interdit" },
          { lettre: "B", texte: "une zone de stationnement payant et limité" },
          { lettre: "C", texte: "une zone de stationnement à durée limité avec contrôle par disque" , correct: true },
        ],
      },
      {
        id: 14,
        type: "QCM",
        enonce: "Par temps de pluie, l'utilisation des feux de brouillard arrière est :",
        choix: [
          { lettre: "A", texte: "conseillée" },
          { lettre: "B", texte: "obligatoire" },
          { lettre: "C", texte: "interdite" , correct: true },
        ],
      },
      {
        id: 15,
        type: "QCM",
        enonce: "Le marquage au sol de couleur jaune est :",
        choix: [
          { lettre: "A", texte: "un indicateur de croisement" },
          { lettre: "B", texte: "définitif" },
          { lettre: "C", texte: "provisoire" , correct: true },
        ],
      },
      {
        id: 16,
        type: "QCM",
        enonce: "Un stage de sensibilisation à la sécurité routière :",
        choix: [
          { lettre: "A", texte: "Permet de récupérer jusqu'à 4 points" , correct: true },
          { lettre: "B", texte: "Peut être suivi une fois tous les 6 mois" },
          { lettre: "C", texte: "Permet de récupérer jusqu'à 6 points" },
          { lettre: "D", texte: "Peut être suivi une fois par an" , correct: true },
        ],
      },
      {
        id: 17,
        type: "QCM",
        enonce: "Les pneumatiques sur les roues des véhicules à moteur doivent présenter des sculptures apparentes :",
        choix: [
          { lettre: "A", texte: "sur les roues avant et arrières gauche" },
          { lettre: "B", texte: "sur les quatre roues" , correct: true },
          { lettre: "C", texte: "uniquement sur les roues arrières" },
          { lettre: "D", texte: "uniquement sur les roues avant" },
        ],
      },
      {
        id: 18,
        type: "QCM",
        enonce: "Un conducteur qui est contrôlé avec un taux d'alcoolémie de 0.9 g/litre de sang :",
        choix: [
          { lettre: "A", texte: "Risque de retrait de 4 points" },
          { lettre: "B", texte: "Fait l'objet d'une rétention automatique et immédiate de son permis" , correct: true },
          { lettre: "C", texte: "Peut reprendre son véhicule après une période de dégrisement" },
          { lettre: "D", texte: "risque une suspension de permis de conduire pendant 3 ans" , correct: true },
        ],
      },
      {
        id: 19,
        type: "QCM",
        enonce: "En cas de dépassement de la vitesse maximale autorisée entre 30 km/h et moins de40 km/h, cette infraction donne lieu de plein droit à une réduction de nombre de points du permis de conduire de :",
        choix: [
          { lettre: "A", texte: "4 points" },
          { lettre: "B", texte: "1 points" },
          { lettre: "C", texte: "2 points" },
          { lettre: "D", texte: "3 points" , correct: true },
        ],
      },
      {
        id: 20,
        type: "QCM",
        enonce: "Cet emplacement (place de stationnement réservée aux personnes handicapées) :",
        choix: [
          { lettre: "A", texte: "son occupation illicite est punie d'une contravention de troisième classe", correct: true },
          { lettre: "B", texte: "son occupation illicite fait encourir une mise en fourrière du véhicule", correct: true },
          { lettre: "C", texte: "est réservé aux véhicules portant une carte de stationnement pour personnes handicapées", correct: true },
          { lettre: "D", texte: "est réservé aux véhicules transportant une ou plusieurs personnes handicapées" },
        ],
      },
    ],
  },
  {
    id: "francais",
    nom: "D - Capacité d'expression et de compréhension en langue française",
    duree: 30,
    coefficient: 2,
    noteEliminatoire: 5,
    noteSur: 24,
    texteSupport: `A Lyon, des taxis-bateaux sur la Saône et le Rhône pour s'affranchir des bouchons

Il est en discussion avec la Métropole pour développer son projet : à Lyon, un entrepreneur souhaite créer un service régulier de taxis-bateaux avec plusieurs stations sur les rives de la Saône et du Rhône.

Depuis 2017, Jeff Fèvre propose des visites de Lyon au fil de l'eau et des excursions privatives sur la Saône ou le Rhône. Et depuis quelque temps, on peut également faire appel à lui pour des courses simples d'un point à un autre, comme un taxi classique, mais sans les embouteillages.

Un service de taxi-bateau qu'il aimerait désormais développer, auprès des visiteurs évidemment, en desservant les principaux points d'intérêt de la ville, mais aussi auprès des Lyonnais pressés qui veulent s'affranchir des bouchons qui engorgent la capitale des Gaules ou des transports en commun très souvent saturés aux heures de pointe. "Ma vision de départ, c'était que l'historique même de la ville est basée sur la rivière de la Saône et le fleuve du Rhône, et qu'on pouvait aller partout en utilisant les voies d'eau", résume l'entrepreneur.

Pour ce faire, il faut proposer un service régulier, bien identifié et multiplier les points d'embarquement et de débarquement sur le Rhône et la Saône. Jeff Fèvre est actuellement en discussion avec la Métropole et la régie des transports qui doivent se prononcer sur la possibilité de développer ce nouveau service et lui accorder les autorisations pour accoster à différents endroits stratégiques de la ville.

Si pour le moment, la prestation reste chère, on peut imaginer qu'avec plusieurs bateaux, et si la clientèle est au rendez-vous, le prix d'une course pourrait baisser et se rapprocher des tarifs pratiqués par les taxis classiques, les bouchons en moins donc. Et comme le capitaine est un Lyonnais pur jus, amoureux de sa ville, il ne manquera pas de vous livrer quelques anecdotes sur la riche histoire de Lyon.`,
    texteSource: "Article de presse — Taxis-bateaux à Lyon",
    questions: [
      {
        id: 1,
        type: "QRC",
        enonce: "Que veut dire l'auteur par \"un Lyonnais pur jus\" ? (QRC)",
        reponseQRC: "Un vrai Lyonnais quelqu'un qui est né et qui connait bien la ville de Lyon",
      },
      {
        id: 2,
        type: "QRC",
        enonce: "Quelle(s) est (sont) la (les) condition(s) nécessaire(s) pour que le prix de la course de taxis-bateaux se rapproche des tarifs des taxis classiques ? (QRC)",
        reponseQRC: "Augmenter le nombre de bateaux et avoir une clientèle présente",
      },
      {
        id: 3,
        type: "QRC",
        enonce: "Pourquoi Jeff Fèvre souhaite développer les taxis-bateaux ? (QRC)",
        reponseQRC: "Eviter les embouteillages, Aller partout en utilisant la voie d'eau pour se déplacer sur la ville de Lyon",
      },
      {
        id: 4,
        type: "QCM",
        enonce: "A qui Jeff Fèvre doit demander les autorisations d'accoster ?",
        choix: [
          { lettre: "A", texte: "La Métropole" , correct: true },
          { lettre: "B", texte: "La régie des transports" , correct: true },
          { lettre: "C", texte: "La ville de Lyon", correct: true },
          { lettre: "D", texte: "Le conseil Départemental" },
        ],
      },
      {
        id: 5,
        type: "QCM",
        enonce: "Sur quels cours d'eau Jeff Fèvre souhaite-t-il créer un service régulier des taxis bateaux ?",
        choix: [
          { lettre: "A", texte: "Le Rhône" , correct: true },
          { lettre: "B", texte: "La Saône" , correct: true },
          { lettre: "C", texte: "La Seine" },
        ],
      },
      {
        id: 6,
        type: "QCM",
        enonce: "Les taxis bateaux pourraient :",
        choix: [
          { lettre: "A", texte: "remplacer les taxis lyonnais" },
          { lettre: "B", texte: "éviter les bouchons" , correct: true },
          { lettre: "C", texte: "favoriser le tourisme" , correct: true },
        ],
      },
      {
        id: 7,
        type: "QCM",
        enonce: "A quoi fait référence \"la Capitale des Gaules\" ?",
        choix: [
          { lettre: "A", texte: "La ville de Lyon" , correct: true },
          { lettre: "B", texte: "La Métropole", correct: true },
          { lettre: "C", texte: "La régie des transports", correct: true },
        ],
      },
      {
        id: 8,
        type: "QCM",
        enonce: "Que signifie \"s'affranchir\" des bouchons ?",
        choix: [
          { lettre: "A", texte: "Timbrer" },
          { lettre: "B", texte: "Se libérer" , correct: true },
          { lettre: "C", texte: "Rompre" },
          { lettre: "D", texte: "Quitter" , correct: true },
        ],
      },
      {
        id: 9,
        type: "QCM",
        enonce: "D'après l'auteur quelle(s) phrase(s) est (sont) juste(s) ?",
        choix: [
          { lettre: "A", texte: "Jeff Fèvre propose des visites au fil de l'eau depuis 2017" , correct: true },
          { lettre: "B", texte: "Jeff Fèvre propose des courses simples depuis 2017" },
          { lettre: "C", texte: "L'histoire de Lyon est basée sur la Saône et le Rhône" , correct: true },
          { lettre: "D", texte: "L'économie de Lyon est basée sur la Saône et le Rhône" },
        ],
      },
      {
        id: 10,
        type: "QCM",
        enonce: "Quel(s) est (sont) les synonyme(s) d'anecdote ?",
        choix: [
          { lettre: "A", texte: "Historiette" , correct: true },
          { lettre: "B", texte: "Rumeur" },
          { lettre: "C", texte: "Évènement" , correct: true },
          { lettre: "D", texte: "Élucubration" },
        ],
      },
    ],
  },
  {
    id: "anglais",
    nom: "E - Capacité d'expression et de compréhension en langue anglaise",
    duree: 20,
    coefficient: 1,
    noteEliminatoire: 4,
    noteSur: 20,
    questions: [
      {
        id: 1,
        type: "QCM",
        enonce: "\"Enjoy your stay\" signifie :",
        choix: [
          { lettre: "A", texte: "Appréciez le moment !" },
          { lettre: "B", texte: "Profitez de votre séjour !" , correct: true },
          { lettre: "C", texte: "Restez joyeux !" },
        ],
      },
      {
        id: 2,
        type: "QCM",
        enonce: "A\"tip\" mean :",
        choix: [
          { lettre: "A", texte: "Un pourboire" , correct: true },
          { lettre: "B", texte: "Un type" },
          { lettre: "C", texte: "Une idée" },
        ],
      },
      {
        id: 3,
        type: "QCM",
        enonce: "I don't understand what you mean",
        choix: [
          { lettre: "A", texte: "Je ne comprends pas ce que vous suggérer" },
          { lettre: "B", texte: "Je ne comprends pas ce que vous voulez" },
          { lettre: "C", texte: "Je ne comprends pas ce que voulez dire" , correct: true },
        ],
      },
      {
        id: 4,
        type: "QCM",
        enonce: "Do you know a typical site for eating ?",
        choix: [
          { lettre: "A", texte: "Y-a-t'il une bonne salle de spectacle en ville ?" },
          { lettre: "B", texte: "Connaissez-vous un endroit typique pour dormir ?" },
          { lettre: "C", texte: "Connaissez-vous un endroit typique pour manger ?" , correct: true },
        ],
      },
      {
        id: 5,
        type: "QCM",
        enonce: "Can you pick me up at the library, please ?",
        choix: [
          { lettre: "A", texte: "Pouvez-vous me déposer jusqu'à la librairie, s'il vous plaît ?" },
          { lettre: "B", texte: "Pouvez-vous venir me prendre à la bibliothèque, s'il vous plaît ?" , correct: true },
          { lettre: "C", texte: "Pouvez-vous me porter jusqu'à une librairie, s'il vous plaît ?" },
        ],
      },
      {
        id: 6,
        type: "QCM",
        enonce: "Est-ce qu'il y a un musée dans votre ville ?",
        choix: [
          { lettre: "A", texte: "is there a museum on your town ?" },
          { lettre: "B", texte: "whats a museum in your town ?" },
          { lettre: "C", texte: "is there a museum in your town ?" , correct: true },
        ],
      },
      {
        id: 7,
        type: "QCM",
        enonce: "I should attend a meeting in Rennes in 2 hours",
        choix: [
          { lettre: "A", texte: "Je devrais assister à une réunion à Rennes dans 2 heures" , correct: true },
          { lettre: "B", texte: "Je devrais assister à une réunion à Rennes à 2 heures" },
          { lettre: "C", texte: "Je devrais attendre une réunion à Rennes dans 2 heures" },
        ],
      },
      {
        id: 8,
        type: "QCM",
        enonce: "Do you have a business card ?",
        choix: [
          { lettre: "A", texte: "Avez-vous une carte professionnelle ?" },
          { lettre: "B", texte: "Avez-vous une carte de visite ?" , correct: true },
          { lettre: "C", texte: "Avez-vous une carte des entreprises ?" },
        ],
      },
      {
        id: 9,
        type: "QCM",
        enonce: "I'm very sorry, but you will be late, there are a traffic jams at the moment :",
        choix: [
          { lettre: "A", texte: "je suis triste car vous serez en retard, il y a des bouchons en ce moment" },
          { lettre: "B", texte: "je suis plus que désolé, mais vous serez en avance, il n'y a pas de bouchons en ce moment" },
          { lettre: "C", texte: "je suis extrêmement désolé, mais vous serez en retard, il y a des bouchons en ce moment" , correct: true },
        ],
      },
      {
        id: 10,
        type: "QCM",
        enonce: "Are you free ?",
        choix: [
          { lettre: "A", texte: "Êtes-vous prêt ?" },
          { lettre: "B", texte: "Êtes-vous gratuit ?" },
          { lettre: "C", texte: "Êtes-vous disponible ?" , correct: true },
        ],
      },
      {
        id: 11,
        type: "QCM",
        enonce: "Êtes-vous bien installé ?",
        choix: [
          { lettre: "A", texte: "Are you well ?" },
          { lettre: "B", texte: "Are you ready ?" },
          { lettre: "C", texte: "Are you comfortable ?" , correct: true },
        ],
      },
      {
        id: 12,
        type: "QCM",
        enonce: "Les gilets jaunes bloquent les autoroutes en ce moment",
        choix: [
          { lettre: "A", texte: "The yellow vests block the motorways" },
          { lettre: "B", texte: "The yellow vests are blocking the motorways" , correct: true },
          { lettre: "C", texte: "The yellow vests blocked the motorways" },
        ],
      },
      {
        id: 13,
        type: "QCM",
        enonce: "J'ai raté mon avion, ramenez moi à l’hôtel :",
        choix: [
          { lettre: "A", texte: "I took my plane, bring me back to the hotel" },
          { lettre: "B", texte: "I have lost my plane, drive me back to the hotel" },
          { lettre: "C", texte: "I missed my plane, take me back to the hotel" , correct: true },
        ],
      },
      {
        id: 14,
        type: "QCM",
        enonce: "I need a taxi for tomorrow morning :",
        choix: [
          { lettre: "A", texte: "j'ai besoin d'un taxi pour ce soir" },
          { lettre: "B", texte: "j'ai besoin d'un taxi pour demain matin" , correct: true },
          { lettre: "C", texte: "j'ai besoin d'un taxi pour ce matin" },
        ],
      },
      {
        id: 15,
        type: "QCM",
        enonce: "Can you drive past famous places on the way ?",
        choix: [
          { lettre: "A", texte: "Pouvez- vous m’arrêter sur cette place ?" },
          { lettre: "B", texte: "Pouvez-vous passer devant des lieux célèbres en chemin ?" , correct: true },
          { lettre: "C", texte: "Pouvez-vous passer devant la fameuse place en chemin ?" },
        ],
      },
      {
        id: 16,
        type: "QCM",
        enonce: "Taking the bus is cheaper than taking the train :",
        choix: [
          { lettre: "A", texte: "prendre le bus coûte plus cher que prendre le train" },
          { lettre: "B", texte: "prendre le bus est plus long que prendre le train" },
          { lettre: "C", texte: "prendre le bus coûte moins cher que prendre le train" , correct: true },
        ],
      },
      {
        id: 17,
        type: "QCM",
        enonce: "Les heures de pointe :",
        choix: [
          { lettre: "A", texte: "The rush hour" , correct: true },
          { lettre: "B", texte: "The peak of a clock" },
          { lettre: "C", texte: "The point's hours" },
        ],
      },
      {
        id: 18,
        type: "QCM",
        enonce: "Dont't drive so fast :",
        choix: [
          { lettre: "A", texte: "Conduisez plus vite" },
          { lettre: "B", texte: "Vous ne conduisez pas assez vite" },
          { lettre: "C", texte: "Ne conduisez pas vite" , correct: true },
        ],
      },
      {
        id: 19,
        type: "QCM",
        enonce: "What is the translation of \"driving\"",
        choix: [
          { lettre: "A", texte: "Construire" },
          { lettre: "B", texte: "Conduire" , correct: true },
          { lettre: "C", texte: "Partir" },
        ],
      },
      {
        id: 20,
        type: "QCM",
        enonce: "How long will you stay in France ?",
        choix: [
          { lettre: "A", texte: "Combien de fois êtes-vous venus en France ?" },
          { lettre: "B", texte: "Combien de temps allez-vous rester en France ?" , correct: true },
          { lettre: "C", texte: "Comment resterez-vous en France ?" },
        ],
      },
    ],
  },
  {
    id: "reglementation_vtc",
    nom: "F(V) - Développement commercial et gestion propre à l'activité de VTC",
    duree: 30,
    coefficient: 3,
    noteEliminatoire: 6,
    noteSur: 40,
    questions: [
      {
        id: 1,
        type: "QRC",
        enonce: "Qu'appelle-t-on un marché de niche en mercatique ? (QRC)",
        reponseQRC: "Un marché de niche est un marché très étroit correspondant à un produit/service très spécialisé",
      },
      {
        id: 2,
        type: "QRC",
        enonce: "DÉFINISSEZ LA NOTION DE MARGE EN GESTION ? (QRC)",
        reponseQRC: "Une marge correspond à la différence entre un prix de vente et un prix d'achat.",
      },
      {
        id: 3,
        type: "QRC",
        enonce: "Qu'est ce qu'un apporteur d'affaires ? (QRC)",
        reponseQRC: "Un apporteur d'affaires est une personne qui met en relation des personnes qui souhaitent réaliser entre elles des opérations commerciales.",
      },
      {
        id: 4,
        type: "QRC",
        enonce: "Qu'est-ce qu'un coût de revient ? (QRC)",
        reponseQRC: "Le coût de revient d'un produit ou d'une prestation est la somme des charges engagées pour la production d'un bien ou d'un service",
      },
      {
        id: 5,
        type: "QRC",
        enonce: "Vous accordez à un client régulier une remise de 5 % sur le 10ème trajet. La prestation",
      },
      {
        id: 6,
        type: "QCM",
        enonce: "Quelle affirmation est vraie ?",
        choix: [
          { lettre: "A", texte: "lorsque la demande est supérieure à l’offre, les prix diminuent" },
          { lettre: "B", texte: "lorsque la demande est inférieure à l’offre, les prix augmentent" , correct: true },
          { lettre: "C", texte: "lorsque la demande est supérieure à l’offre, les prix augmentent" },
        ],
      },
      {
        id: 7,
        type: "QCM",
        enonce: "En accueillant un client qui voyage seul, un chauffeur VTC l'invite à prendre place :",
        choix: [
          { lettre: "A", texte: "sur le siège arrière droit" , correct: true },
          { lettre: "B", texte: "sur le siège arrière gauche" },
          { lettre: "C", texte: "sur le siège avant" },
        ],
      },
      {
        id: 8,
        type: "QCM",
        enonce: "Diriez-vous que fidéliser vos clients VTC coûte :",
        choix: [
          { lettre: "A", texte: "le même prix que d’en trouver de nouveaux" },
          { lettre: "B", texte: "moins cher que d’en trouver de nouveaux" , correct: true },
          { lettre: "C", texte: "plus cher que d’en trouver de nouveaux" },
        ],
      },
      {
        id: 9,
        type: "QCM",
        enonce: "Qu'est-ce qu'une zone de chalandise ?",
        choix: [
          { lettre: "A", texte: "c’est un bateau" },
          { lettre: "B", texte: "c’est le nombre de conducteurs de VTC qu’il y a dans une zone géographique" },
          { lettre: "C", texte: "c’est la zone géographique d’où provient la majorité de la clientèle" , correct: true },
        ],
      },
      {
        id: 10,
        type: "QCM",
        enonce: "Une personne qui influence l'acte d'achat est :",
        choix: [
          { lettre: "A", texte: "un consommateur" },
          { lettre: "B", texte: "un grossiste" },
          { lettre: "C", texte: "un prescripteur" , correct: true },
        ],
      },
      {
        id: 11,
        type: "QCM",
        enonce: "Qu'est-ce que le marché en mercatique ?",
        choix: [
          { lettre: "A", texte: "le lien où des producteurs se rassemblent pour proposer directement leurs produits/prestations aux consommateurs" },
          { lettre: "B", texte: "le lien de rencontre physique ou virtuel de l'offre et de la demande" },
          { lettre: "C", texte: "l'ensemble des vendeurs et des acheteurs concernés par l'échange d'un bien ou d'un service" , correct: true },
        ],
      },
      {
        id: 12,
        type: "QCM",
        enonce: "Qu'appelle-t-on un service premium ?",
        choix: [
          { lettre: "A", texte: "un service de premier prix" },
          { lettre: "B", texte: "un service gratuit" },
          { lettre: "C", texte: "un service haut de gamme" , correct: true },
        ],
      },
      {
        id: 13,
        type: "QCM",
        enonce: "Font partie des frais financiers à prendre en compte dans le calcul du coût de revient :",
        choix: [
          { lettre: "A", texte: "la rémunération des capitaux propres investis par l'entreprise" , correct: true },
          { lettre: "B", texte: "la TVA reversée aux services fiscaux" },
          { lettre: "C", texte: "la rémunération du cabinet comptable de l'entreprise" },
          { lettre: "D", texte: "les intérêts bancaires des emprunts contractés" , correct: true },
        ],
      },
      {
        id: 14,
        type: "QCM",
        enonce: "Que doit-on dire lorsqu'on décroche un appel téléphonique ?",
        choix: [
          { lettre: "A", texte: "le nom de la société et bonjour" , correct: true },
          { lettre: "B", texte: "le nom de la société" },
          { lettre: "C", texte: "allo" },
        ],
      },
      {
        id: 15,
        type: "QCM",
        enonce: "Le prix psychologique correspond :",
        choix: [
          { lettre: "A", texte: "au prix de référence pour une catégorie de produits/prestations" , correct: true },
          { lettre: "B", texte: "au prix que le consommateur est prêt à payer pour acheter le produit/la prestation" , correct: true },
          { lettre: "C", texte: "au prix perçu par le consommateur" },
          { lettre: "D", texte: "au prix dont se souvient le consommateur" },
        ],
      },
      {
        id: 16,
        type: "QCM",
        enonce: "On appelle marketing direct",
        choix: [
          { lettre: "A", texte: "l’envoi d’un message personnalisé à un groupe de personnes qualifiées" , correct: true },
          { lettre: "B", texte: "l’achat d’espace publicitaire dans la presse locale" },
          { lettre: "C", texte: "la mise en valeur d’offres promotionnelles dans le véhicule" },
        ],
      },
    ],
  },
  {
    id: "reglementation_vtc2",
    nom: "G(V) - Réglementation nationale spécifique à l'activité de VTC",
    duree: 20,
    coefficient: 3,
    noteEliminatoire: 6,
    noteSur: 24,
    questions: [
      {
        id: 1,
        type: "QRC",
        enonce: "Je souhaite connaitre les entreprises de chauffeurs VTC présents sur la ville de Lyon, comment connaître ces informations ? (QRC)",
        reponseQRC: "Consulter le registre des VTC",
      },
      {
        id: 2,
        type: "QRC",
        enonce: "Citez 4 caractéristiques d'un véhicule thermique que doit respecter un chauffeur VTC pour être en activité (QRC)",
        reponseQRC: "Entre 4 et 9 places, 1m70x4m50, moins de 7 ans, 4 portes,84kw",
      },
      {
        id: 3,
        type: "QCM",
        enonce: "Combien de temps est valide la carte VTC ?",
        choix: [
          { lettre: "A", texte: "2 ans", correct: true },
          { lettre: "B", texte: "3 ans", correct: true },
          { lettre: "C", texte: "4 ans" },
          { lettre: "D", texte: "5 ans" , correct: true },
        ],
      },
      {
        id: 4,
        type: "QCM",
        enonce: "Où demander la carte professionnelle VTC ?",
        choix: [
          { lettre: "A", texte: "La préfecture de son département de résidence" , correct: true },
          { lettre: "B", texte: "L'imprimerie nationale" },
          { lettre: "C", texte: "La chambre des métiers et de l'artisanat" },
        ],
      },
      {
        id: 5,
        type: "QCM",
        enonce: "Définition l’activité de VTC",
        choix: [
          { lettre: "A", texte: "Exploitants qui mettent à la disposition de leur clientèle une ou plusieurs voitures de transport avec chauffeur dans des conditions fixées à l'avance entre les parties" , correct: true },
          { lettre: "B", texte: "Exploitants qui mettent à la disposition de leur clientèle une voitures de transport avec chauffeur sans conditions fixées à l'avance entre les parties" },
          { lettre: "C", texte: "Exploitants qui mettent à la disposition de leur clientèle une ou plusieurs voitures de transport avec chauffeur dans des conditions fixées à l'avance entre les deux parties" },
          { lettre: "D", texte: "Exploitants qui mettent à la disposition de leur clientèle une ou plusieurs véhicules de transport avec chauffeur dans des conditions fixées à l'avance entre les deux parties" },
        ],
      },
      {
        id: 6,
        type: "QCM",
        enonce: "Quels sont les justificatifs qui vous dispensent de la garantie financière ?",
        choix: [
          { lettre: "A", texte: "La copie de la carte grise lorsque l’exploitant est propriétaire du véhicule," , correct: true },
          { lettre: "B", texte: "La copie de la page signée du contrat de location ou de crédit bail (leasing)" },
          { lettre: "C", texte: "La copie de la page signée du contrat de location ou de crédit bail (leasing) d'au moins 6 mois" , correct: true },
          { lettre: "D", texte: "Si le véhicule a déjà donné lieu à une justification de capacité financière, l’exploitant doit le signaler au registre en indiquant le numéro SIRET ou SIREN correspondant à l’exploitant ayant déjà déclaré ce véhicule ainsi que le numéro d’immatriculation (carte grise) du véhicule concerné." , correct: true },
        ],
      },
      {
        id: 7,
        type: "QCM",
        enonce: "Quel est le délai maximum pour prévenir le registre des VTC en cas de modification des informations enregistrées sur le registre des VTC ?",
        choix: [
          { lettre: "A", texte: "6 jours" },
          { lettre: "B", texte: "12 jours" },
          { lettre: "C", texte: "15 jours" , correct: true },
          { lettre: "D", texte: "30 jours" },
        ],
      },
      {
        id: 8,
        type: "QCM",
        enonce: "La procédure d'inscription au registre des VTC doit être renouvelée tous les :",
        choix: [
          { lettre: "A", texte: "an" },
          { lettre: "B", texte: "deux ans" },
          { lettre: "C", texte: "trois ans" },
          { lettre: "D", texte: "cinq ans" , correct: true },
        ],
      },
    ],
  },
];

export const EXAMENS_BLANCS_VTC: ExamenBlanc[] = [
  {
    id: "EB1",
    numero: 1,
    type: "VTC",
    titre: "Examen Blanc VTC N°1",
    matieres: eb1Matieres,
  },
  {
    id: "EB2",
    numero: 2,
    type: "VTC",
    titre: "Examen Blanc VTC N°2",
    matieres: eb2Matieres,
  },
  {
    id: "EB3",
    numero: 3,
    type: "VTC",
    titre: "Examen Blanc VTC N°3",
    matieres: eb3Matieres,
  },
  {
    id: "EB4",
    numero: 4,
    type: "VTC",
    titre: "Examen Blanc VTC N°4",
    matieres: eb4Matieres,
  },
  {
    id: "EB5",
    numero: 5,
    type: "VTC",
    titre: "Examen Blanc VTC N°5",
    matieres: eb5Matieres,
  },
  {
    id: "EB6",
    numero: 6,
    type: "VTC",
    titre: "Examen Blanc VTC N°6",
    matieres: eb6Matieres,
  },
];

// ===== EXAMENS BLANCS TAXI (mêmes 5 premières matières que VTC + matières spécifiques TAXI) =====

export const EXAMENS_BLANCS_TAXI: ExamenBlanc[] = [
  {
    id: "EB1-TAXI",
    numero: 1,
    type: "TAXI",
    titre: "Examen Blanc TAXI N°1",
    matieres: [...eb1Matieres.slice(0, 5), taxi_nationale_eb1, taxi_locale_eb1],
  },
  {
    id: "EB2-TAXI",
    numero: 2,
    type: "TAXI",
    titre: "Examen Blanc TAXI N°2",
    matieres: [...eb2Matieres.slice(0, 5), taxi_nationale_eb2, taxi_locale_eb2],
  },
  {
    id: "EB3-TAXI",
    numero: 3,
    type: "TAXI",
    titre: "Examen Blanc TAXI N°3",
    matieres: [...eb3Matieres.slice(0, 5), taxi_nationale_eb3, taxi_locale_eb3],
  },
  {
    id: "EB4-TAXI",
    numero: 4,
    type: "TAXI",
    titre: "Examen Blanc TAXI N°4",
    matieres: [...eb4Matieres.slice(0, 5), taxi_nationale_eb4, taxi_locale_eb4],
  },
  {
    id: "EB5-TAXI",
    numero: 5,
    type: "TAXI",
    titre: "Examen Blanc TAXI N°5",
    matieres: [...eb5Matieres.slice(0, 5), taxi_nationale_eb5, taxi_locale_eb5],
  },
  {
    id: "EB6-TAXI",
    numero: 6,
    type: "TAXI",
    titre: "Examen Blanc TAXI N°6",
    matieres: [...eb6Matieres.slice(0, 5), taxi_nationale_eb6, taxi_locale_eb6],
  },
];


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

const bilan_dev_commercial_vtc: Matiere = {
  id: "bilan_dev_commercial_vtc",
  nom: "F(V) — Développement commercial et gestion propre à l'activité de VTC",
  duree: 30,
  coefficient: 3,
  noteEliminatoire: 0,
  noteSur: BILAN_DEV_COMMERCIAL_QUESTIONS.length,
  questions: BILAN_DEV_COMMERCIAL_QUESTIONS,
};

const bilan_reglementation_vtc_specifique: Matiere = {
  id: "bilan_reglementation_vtc",
  nom: "G(V) — Réglementation nationale spécifique à l'activité de VTC",
  duree: 40,
  coefficient: 3,
  noteEliminatoire: 0,
  noteSur: BILAN_REGLEMENTATION_VTC_QUESTIONS.length,
  questions: BILAN_REGLEMENTATION_VTC_QUESTIONS,
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
    bilan_dev_commercial_vtc,
    bilan_reglementation_vtc_specifique,
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
  nom: "F(V) — Développement commercial et gestion propre à l'activité de VTC",
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
  matieres: [taxi_nationale_eb1, taxi_locale_eb1]
};

// ===== EXAMENS BLANCS VA (Passerelle VTC) — Dév. Commercial + Réglementation Spécifique VTC =====

export const examenBlanc1VA: ExamenBlanc = {
  id: "eb1-va", numero: 1, type: "VA",
  titre: "Examen Blanc N°1 - Passerelle VA",
  matieres: [matiere_reglementation_vtc_examen1, matiere_reglementation_vtc2_examen1]
};

export const tousLesExamens: ExamenBlanc[] = [
  ...EXAMENS_BLANCS_VTC,
  ...EXAMENS_BLANCS_TAXI,
  examenBlanc1TA,
  examenBlanc1VA,
  bilanExamenTaxi, bilanExamenVTC, bilanExamenTA, bilanExamenVA,
];
