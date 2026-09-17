// ===== Fiches de cours "Questions QRC" pour les modules BILAN EXERCICES =====
// Questions à Réponses Courtes issues des documents officiels FTRANSPORT.
// Contenu pédagogique uniquement : aucune donnée apprenant n'est concernée.

export interface QrcQuestion {
  question: string;
  reponse: string | string[];
}

export interface QrcSection {
  titre: string;
  questions: QrcQuestion[];
}

const T3P_COMMUN: QrcQuestion[] = [
  { question: "Qu'est-ce que l'honorabilité dans votre profession ?", reponse: "Avoir le casier judiciaire B2 vierge." },
  {
    question:
      "Que devez-vous présenter aux agents susceptibles d'effectuer des contrôles pour justifier d'une réservation préalable ?",
    reponse: "Un document écrit sur support papier ou électronique.",
  },
  {
    question: "Citez trois des conditions d'accès et/ou d'exercice aux professions de conducteurs de T3P.",
    reponse: [
      "Carte professionnelle en cours de validité.",
      "Aptitude médicale.",
      "Honorabilité (casier judiciaire B2 vierge).",
    ],
  },
  {
    question: "Quelles sont les sanctions possibles décidées par les commissions disciplinaires locales ?",
    reponse: [
      "Un avertissement.",
      "Un retrait temporaire de la carte professionnelle.",
      "Un retrait définitif de la carte professionnelle.",
    ],
  },
  {
    question:
      "Lors d'un contrôle routier, quels documents communs aux trois professions T3P dois-je présenter aux forces de l'ordre ?",
    reponse: ["Le permis de conduire.", "La carte professionnelle.", "Le certificat médical."],
  },
  {
    question:
      "Quel est le poids maximal autorisé en charge (PTAC) d'un véhicule affecté au T3P et pour combien de places maximum ?",
    reponse: "3,5 tonnes (3 500 kg) et 9 places, conducteur compris.",
  },
  {
    question: "Citez 4 compétences des commissions locales du T3P.",
    reponse: [
      "Établir un rapport annuel pour l'observatoire sur l'économie du T3P.",
      "Recevoir tous les renseignements et statistiques dont disposent les pouvoirs publics.",
      "Être informées de tous projets de nouvelles ADS du département.",
      "Rendre un avis sur toutes les questions relatives au T3P.",
    ],
  },
  {
    question:
      "Quelles sont les sanctions administratives encourues par un conducteur de T3P en cas de violation de la réglementation ?",
    reponse: ["L'avertissement.", "Le retrait temporaire ou définitif de la carte professionnelle."],
  },
  {
    question: "Quelles sont les deux assurances obligatoires qu'un conducteur de T3P doit souscrire ?",
    reponse: ["Assurance du véhicule.", "Responsabilité civile professionnelle du conducteur (RCP)."],
  },
  { question: "Développez le sigle « T3P ».", reponse: "Transport public particulier de personnes." },
];

const REGLEMENTATION_VTC: QrcQuestion[] = [
  {
    question: "Quels documents l'exploitant VTC doit-il fournir lors de son inscription au registre ?",
    reponse: [
      "K-bis.",
      "Certificat d'immatriculation du véhicule ou contrat de location de plus de 6 mois.",
      "Carte professionnelle du conducteur.",
      "Justificatif de capacité financière si location de moins de 6 mois.",
    ],
  },
  {
    question:
      "Quelles sont les mentions relatives au client qui doivent figurer obligatoirement sur le document de réservation préalable ?",
    reponse: [
      "Nom et coordonnées téléphoniques du client.",
      "Date et heure de la demande faite par le client.",
      "Lieu de prise en charge, date et heure souhaités.",
      "Nom de la société VTC effectuant le transport.",
    ],
  },
  {
    question: "Comment un exploitant est-il informé de son inscription au registre des VTC ?",
    reponse: "L'exploitant reçoit une attestation d'inscription avec son numéro d'inscription.",
  },
  {
    question: "À quel organisme s'adresser pour vérifier que le nom de son entreprise n'est pas déjà utilisé ?",
    reponse: "À l'INPI : l'Institut national de la propriété industrielle.",
  },
  {
    question: "Quels sont les 4 éléments mentionnés sur la vignette définitive des véhicules VTC ?",
    reponse: [
      "Le numéro d'inscription de l'entreprise au registre des VTC.",
      "Le numéro d'immatriculation du véhicule.",
      "Le QR code (code barre bidimensionnel).",
      "Le numéro de référence de la vignette.",
    ],
  },
  {
    question: "Citez trois documents permettant de ne pas fournir de garantie financière.",
    reponse: [
      "Facture ou certificat de cession pour un véhicule en pleine propriété.",
      "Contrat de location pour un véhicule en location longue durée (plus de 6 mois).",
      "Attestation de capacité financière rédigée sur papier à en-tête d'un établissement agréé ACPR.",
    ],
  },
  {
    question:
      "Quelle démarche faut-il entreprendre pour exploiter un véhicule électrique dérogeant aux caractéristiques techniques VTC ?",
    reponse:
      "Aucune démarche : un véhicule électrique n'est pas soumis aux caractéristiques techniques imposées aux véhicules VTC.",
  },
  {
    question: "Si vous utilisez votre véhicule VTC à des fins privées, que devez-vous faire ?",
    reponse: "Retirer la carte professionnelle du véhicule.",
  },
  {
    question: "Citez deux cas où le registre des VTC doit être mis à jour.",
    reponse: ["Changement de véhicule.", "Renouvellement de la carte professionnelle."],
  },
  {
    question: "À la fin d'une course, après le départ du client, que doit faire le conducteur VTC ?",
    reponse: "Retourner à sa base ou se garer hors de la voie publique.",
  },
  {
    question: "Proposez 4 situations entraînant une mise à jour des dossiers sur le registre des exploitants VTC.",
    reponse: [
      "Remplacement d'un véhicule (achat ou location).",
      "Changement de conducteur.",
      "Changement d'assureur.",
      "Changement de dirigeant ou d'adresse sociale.",
    ],
  },
  {
    question: "Citez 4 éléments indispensables qu'un chauffeur VTC doit avoir dans son véhicule.",
    reponse: ["Trousse de secours.", "Parapluie.", "Sacs à vomir.", "Chargeur de téléphone."],
  },
];

const REGLEMENTATION_TAXI: QrcQuestion[] = [
  {
    question: "Définir le TAXI.",
    reponse:
      "Les taxis sont des véhicules automobiles comportant, outre le siège du conducteur, huit places assises au maximum, munis d'équipements spéciaux et d'un terminal de paiement électronique, et dont le propriétaire ou l'exploitant est titulaire d'une autorisation de stationnement sur la voie publique, en attente de la clientèle, afin d'effectuer, à la demande de celle-ci et à titre onéreux, le transport particulier des personnes et de leurs bagages.",
  },
  {
    question: "À qui s'adresser pour le TAP (Transport Assis Professionnalisé) ?",
    reponse: "À la CPAM : Caisse Primaire d'Assurance Maladie.",
  },
  {
    question: "Qu'est-ce que le taxi de remplacement ?",
    reponse:
      "En cas d'immobilisation d'origine mécanique ou de vol du véhicule, le taxi peut être remplacé temporairement par un véhicule disposant des équipements spéciaux. L'ADS et la plaque portant le numéro de l'autorisation sont ceux du taxi dont le véhicule de remplacement prend le relais.",
  },
  {
    question: "Quelle convention doit appliquer un taxi qui effectue un transport médical pour un assuré CPAM ?",
    reponse: "Il doit appliquer la convention de la CPAM de son département.",
  },
  {
    question: "Citez 3 éléments affichés sur les compteurs horokilométriques.",
    reponse: ["La prise en charge.", "Le tarif horokilométrique.", "Le tarif de marche lente ou d'attente."],
  },
  {
    question: "Citez les 2 types de trajet ouvrant droit au remboursement d'une fraction de la TICPE.",
    reponse: ["L'exercice de la profession (courses professionnelles).", "L'aller-retour quotidien domicile – lieu de travail."],
  },
  {
    question: "Citez 4 équipements obligatoires du taxi (hors taximètre, lumineux, plaques scellées, imprimante).",
    reponse: [
      "Terminal de paiement électronique (TPE).",
      "Carnet de métrologie.",
      "L'affichette des tarifs.",
      "La trousse de secours (pharmacie).",
    ],
  },
  {
    question:
      "Comment appelle-t-on le document sur lequel sont consignées les opérations effectuées sur l'installation des équipements spéciaux des taxis ?",
    reponse: "Le carnet métrologique.",
  },
  {
    question: "Citez 2 fonctionnalités du compteur horokilométrique.",
    reponse: ["La fonction horaire.", "La fonction kilométrique."],
  },
  {
    question:
      "Lors du transfert d'une ADS, quel délai a le nouveau titulaire pour déclarer la transaction à la recette des impôts ?",
    reponse: "1 mois à compter de la date de conclusion.",
  },
  { question: "Qui établit la prescription médicale ?", reponse: "Le médecin qui a délivré le bon de transport." },
  {
    question: "Dans quelle condition un véhicule taxi doit-il être équipé d'un horodateur ?",
    reponse:
      "Lorsqu'une durée maximale de service est prescrite par l'autorité compétente (maire ou préfet de police dans le ressort de sa compétence).",
  },
  {
    question:
      "La centrale de réservation est responsable de plein droit à l'égard du client. Dans quels cas peut-elle être exonérée ?",
    reponse: ["Le fait ou la faute du client.", "Le fait ou la faute d'un tiers.", "La force majeure."],
  },
  {
    question: "Quelles sont les conditions de stationnement des taxis en attente de la clientèle ?",
    reponse:
      "Le conducteur de taxi ne peut stationner en attente de la clientèle que dans sa zone de prise en charge et uniquement dans des stations aménagées, sauf s'il est réservé ou retenu hors de sa zone. Le dispositif lumineux ne doit pas être recouvert de la gaine opaque.",
  },
];

const REGLEMENTATION_NATIONALE_TA: QrcQuestion[] = [
  {
    question: "Quelles sont les différentes autorités administratives compétentes pour délivrer une ADS ?",
    reponse: "Soit le maire, soit le préfet de police (dans sa zone de compétence).",
  },
  {
    question:
      "Lorsqu'un titulaire ne peut exploiter lui-même son ADS, quelles sont les deux possibilités pour que son entreprise reste active ?",
    reponse: ["La location du véhicule taxi à un conducteur de taxi.", "L'emploi d'un salarié."],
  },
  {
    question: "Je veux passer mon véhicule professionnel en véhicule personnel pour la journée. Que dois-je faire ?",
    reponse: ["Bâcher le lumineux.", "Éteindre le taximètre.", "Retirer la carte professionnelle."],
  },
  { question: "Développez le sigle TICPE.", reponse: "Taxe intérieure sur la consommation des produits énergétiques." },
  {
    question:
      "Quelle est la sanction encourue pour exercice de l'activité de conducteur de taxi sans être titulaire de la carte professionnelle en cours de validité ?",
    reponse: [
      "1 an de prison et 15 000 € d'amende.",
      "Suspension du permis de conduire pour une durée de 5 ans maximum.",
      "Immobilisation du véhicule pour un an maximum, voire confiscation.",
    ],
  },
  {
    question: "Quelles sont les conditions de stationnement des taxis en attente de la clientèle ?",
    reponse:
      "Le conducteur de taxi ne peut stationner en attente de la clientèle que dans sa zone de prise en charge et uniquement dans des stations aménagées. Le dispositif lumineux ne doit pas être recouvert de la gaine opaque.",
  },
  {
    question: "Définir le TAXI.",
    reponse:
      "Les taxis sont des véhicules automobiles comportant, outre le siège du conducteur, huit places assises au maximum, munis d'équipements spéciaux et d'un terminal de paiement électronique, et dont le propriétaire ou l'exploitant est titulaire d'une autorisation de stationnement sur la voie publique, en attente de la clientèle, afin d'effectuer, à la demande de celle-ci et à titre onéreux, le transport particulier des personnes et de leurs bagages.",
  },
  {
    question: "À qui s'adresser pour le TAP (Transport Assis Professionnalisé) ?",
    reponse: "À la CPAM : Caisse Primaire d'Assurance Maladie.",
  },
  {
    question: "Qu'est-ce que le taxi de remplacement ?",
    reponse:
      "En cas d'immobilisation d'origine mécanique ou de vol du véhicule, le taxi peut être remplacé temporairement par un véhicule disposant des équipements spéciaux. L'ADS et la plaque numérotée sont ceux du taxi d'origine.",
  },
  {
    question: "Quelle convention doit appliquer un taxi effectuant un transport médical pour un assuré CPAM ?",
    reponse: "Il doit appliquer la convention de la CPAM de son département, quelle que soit la caisse de l'assuré.",
  },
  {
    question: "Citez 3 éléments affichés sur les compteurs horokilométriques.",
    reponse: ["La prise en charge.", "Le tarif horokilométrique.", "Le tarif de marche lente ou d'attente."],
  },
  {
    question: "Citez les 2 types de trajet ouvrant droit au remboursement d'une fraction de la TICPE.",
    reponse: ["L'exercice de la profession.", "L'aller-retour quotidien domicile – lieu de travail."],
  },
  {
    question: "Citez 4 équipements obligatoires du taxi (hors taximètre, lumineux, plaques scellées, imprimante).",
    reponse: [
      "Terminal de paiement électronique (TPE).",
      "Carnet de métrologie.",
      "L'affichette des tarifs.",
      "La trousse de secours.",
    ],
  },
  {
    question: "Comment appelle-t-on le document consignant les opérations effectuées sur les équipements spéciaux des taxis ?",
    reponse: "Le carnet métrologique.",
  },
  {
    question: "Lors du transfert d'une ADS, quel délai a le nouveau titulaire pour déclarer la transaction aux impôts ?",
    reponse: "1 mois à compter de la date de conclusion.",
  },
];

const DEV_COMMERCIAL_VA: QrcQuestion[] = [
  {
    question: "Qu'appelle-t-on un marché de niche en mercatique ?",
    reponse: "Un marché de niche est un marché très étroit correspondant à un produit ou service très spécialisé.",
  },
  {
    question: "Citez 4 moyens de communication à votre disposition pour faire connaître votre entreprise.",
    reponse: ["Site web ou blog.", "E-mailing.", "Texto / SMS.", "Journaux locaux."],
  },
  {
    question: "Qui fixe le prix d'une prestation de VTC, selon quelle contrainte ?",
    reponse: "Le chauffeur VTC lui-même, en fonction de l'offre et de la demande de son lieu d'exercice.",
  },
  {
    question: "Votre client oublie son portefeuille dans votre véhicule. Que faites-vous ?",
    reponse:
      "Le contacter le plus rapidement possible, le rassurer, et lui proposer de récupérer son bien de manière sûre et rapide.",
  },
  {
    question: "À quoi correspond le chiffre d'affaires d'un exploitant VTC ?",
    reponse: "Il correspond à la somme des prestations réalisées au cours d'un exercice (transports et prestations annexes).",
  },
  {
    question: "Qu'est-ce qu'un coût de revient ?",
    reponse: "Le coût de revient est la somme des charges engagées pour la production d'un bien ou d'un service.",
  },
  {
    question: "À quoi sert la reformulation à la fin d'un échange pour une réservation ?",
    reponse: "À confirmer la demande transmise par le client (date, heure, lieu, destination) afin d'éviter tout quiproquo.",
  },
  {
    question: "Définissez la notion de marge en gestion.",
    reponse: "Une marge correspond à la différence entre un prix de vente et un prix d'achat ou coût de revient.",
  },
  {
    question: "Qu'est-ce que la mercatique ?",
    reponse:
      "La mercatique est la traduction française du marketing. Il s'agit des techniques utilisées pour étudier, comprendre et influencer les comportements des consommateurs, afin d'adapter en permanence l'offre commerciale.",
  },
  {
    question: "Définir le monôme et le binôme.",
    reponse: [
      "Le monôme permet de calculer un coût de revient kilométrique.",
      "Le binôme permet de calculer un terme journalier et un terme kilométrique.",
    ],
  },
  {
    question: "Citez 4 qualités indispensables pour l'exercice de la profession de VTC.",
    reponse: ["Amabilité et sens du service.", "Ponctualité.", "Discrétion.", "Neutralité."],
  },
  {
    question: "En cas de retard très important du client, que faites-vous ?",
    reponse:
      "Prendre contact avec le client pour connaître son heure d'arrivée. En fonction de celle-ci, proposer un autre VTC si une autre course est prévue. Dans le cas contraire, attendre le client puisqu'il a réservé la course.",
  },
];

export const QRC_SECTIONS_VTC: QrcSection[] = [
  { titre: "T3P — Réglementation commune", questions: T3P_COMMUN },
  { titre: "Réglementation spécifique VTC", questions: REGLEMENTATION_VTC },
];

export const QRC_SECTIONS_TAXI: QrcSection[] = [
  { titre: "T3P — Réglementation commune", questions: T3P_COMMUN },
  { titre: "Réglementation TAXI — Spécifique", questions: REGLEMENTATION_TAXI },
];

export const QRC_SECTIONS_TA: QrcSection[] = [
  { titre: "Réglementation nationale — Taxi", questions: REGLEMENTATION_NATIONALE_TA },
];

export const QRC_SECTIONS_VA: QrcSection[] = [
  { titre: "Développement commercial", questions: DEV_COMMERCIAL_VA },
];

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderReponse(reponse: string | string[]): string {
  if (Array.isArray(reponse)) {
    return (
      '<ul class="list-disc pl-5 space-y-1 mt-1">' +
      reponse.map((item) => `<li>${escapeHtml(item)}</li>`).join("") +
      "</ul>"
    );
  }
  return `<p class="mt-1">${escapeHtml(reponse)}</p>`;
}

/** Construit l'HTML mis en forme (cartes numérotées Question / Réponse) */
export function buildQrcHtml(sections: QrcSection[]): string {
  let counter = 0;
  const blocks = sections
    .map((section) => {
      const cards = section.questions
        .map((q) => {
          counter += 1;
          return (
            '<div class="rounded-lg border border-border bg-card shadow-sm overflow-hidden mb-3">' +
            '<div class="flex items-start gap-3 bg-muted/60 px-4 py-3">' +
            `<span class="shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">${counter}</span>` +
            `<span class="font-semibold text-foreground leading-snug">${escapeHtml(q.question)}</span>` +
            "</div>" +
            '<div class="px-4 py-3 border-t border-border">' +
            '<span class="inline-block text-[11px] font-bold uppercase tracking-wide text-primary">Réponse</span>' +
            `<div class="text-foreground/90 leading-relaxed">${renderReponse(q.reponse)}</div>` +
            "</div>" +
            "</div>"
          );
        })
        .join("");

      return (
        '<div class="mb-5">' +
        `<h5 class="text-sm font-bold uppercase tracking-wide text-primary border-b border-primary/30 pb-1 mb-3">${escapeHtml(section.titre)}</h5>` +
        cards +
        "</div>"
      );
    })
    .join("");

  return (
    '<div class="not-prose space-y-1">' +
    '<p class="text-sm text-muted-foreground mb-4">Questions à Réponses Courtes — révisez en masquant la réponse, puis vérifiez votre formulation.</p>' +
    blocks +
    "</div>"
  );
}

function buildQrcCours(id: number, sousTitre: string, sections: QrcSection[]) {
  const total = sections.reduce((acc, section) => acc + section.questions.length, 0);
  return {
    id,
    actif: true,
    titre: "📝 Questions QRC",
    sousTitre: `${total} questions à réponses courtes — ${sousTitre}`,
    description: buildQrcHtml(sections),
  };
}

export const QRC_COURS_VTC = [buildQrcCours(9001, "Bilan QRC VTC", QRC_SECTIONS_VTC)];
export const QRC_COURS_TAXI = [buildQrcCours(9002, "Bilan QRC TAXI", QRC_SECTIONS_TAXI)];
export const QRC_COURS_TA = [buildQrcCours(9003, "Bilan QRC TA — Passerelle VTC → Taxi", QRC_SECTIONS_TA)];
export const QRC_COURS_VA = [buildQrcCours(9004, "Bilan QRC VA — Passerelle Taxi → VTC", QRC_SECTIONS_VA)];
