// Données des slides T3P Partie 2 — Réglementation du Transport Public Particulier de Personnes
// Source : vrai_cours_t3P_parties_2-4.pptx

import { Slide } from "./t3p-partie1-data";

export const T3P_PARTIE2_SLIDES: Slide[] = [
  // ── Page 1 ──
  {
    type: "title",
    title: "PARTIE 2 — RÉGLEMENTATION T3P",
    subtitle: "Juridictions · Sanctions · TPMR · Covoiturage · Intermédiaires · VSS & Discriminations",
    footer: "Formation T3P — Partie 2",
    brand: "FTRANSPORT - SERVICES PRO"
  },
  // ── Page 2 ──
  {
    type: "sommaire",
    title: "SOMMAIRE — PARTIE 2",
    items: [
      { n: "8b", label: "Agents de contrôle et documents T3P", page: 3 },
      { n: "10", label: "Les juridictions compétentes", page: 5 },
      { n: "11", label: "Sanctions et voies de recours", page: 8 },
      { n: "12", label: "Transport de Personnes à Mobilité Réduite", page: 12 },
      { n: "13", label: "Covoiturage et transport privé", page: 14 },
      { n: "14", label: "Les intermédiaires de la mise en relation", page: 16 },
      { n: "15", label: "Violences sexuelles, sexistes et discriminations", page: 18 },
    ]
  },
  // ── Page 3 ──
  {
    type: "section",
    title: "8b. Agents de contrôle et documents T3P",
    subtitle: "Qui peut contrôler ? Quels documents présenter ?"
  },
  // ── Page 4 ──
  {
    type: "content",
    title: "Les agents habilités à contrôler",
    intro: "Un conducteur T3P peut être contrôlé par plusieurs types d'agents, chacun ayant des compétences différentes.",
    blocks: [
      {
        heading: "FORCES DE L'ORDRE",
        color: "#2c3e50",
        points: [
          "Police nationale et Gendarmerie : infractions pénales, verbalisation, garde à vue.",
          "Douanes : contrôle des personnes et marchandises (frontières et sur route)."
        ]
      },
      {
        heading: "ADMINISTRATIONS",
        color: "#2980b9",
        points: [
          "Agents DRIEAT/DREAL : registre VTC, documents professionnels, conditions d'exercice.",
          "URSSAF : cotisations sociales — SANS PRÉAVIS en cas de travail dissimulé.",
          "DGFIP : contrôle fiscal — avis préalable d'environ 15 jours.",
          "DGCCRF : pratiques commerciales, tarifs, concurrence."
        ]
      }
    ]
  },
  // ── Page 5 ──
  {
    type: "content",
    title: "Documents à présenter lors d'un contrôle",
    intro: "En cas de contrôle, vous devez présenter immédiatement les documents relatifs au véhicule et à votre profession.",
    blocks: [
      {
        heading: "DOCUMENTS VÉHICULE",
        color: "#e67e22",
        points: [
          "Carte grise du véhicule",
          "Attestation assurance RC Circulation (titre onéreux)",
          "Attestation assurance RC Professionnelle (exploitation)",
          "Contrôle technique ou attestation d'entretien",
          "Permis de conduire (B ou A)"
        ]
      },
      {
        heading: "DOCUMENTS PROFESSION",
        color: "#27ae60",
        points: [
          "Carte professionnelle T3P (apposée sur le pare-brise)",
          "Attestation médicale valide (préfecture)",
          "Billet individuel ou collectif (bon de réservation) — sauf taxi en zone",
          "Vignette VTC ou copie inscription registre (ou ADS pour taxi)",
          "Pour les salariés : contrat de travail + DPAE"
        ]
      }
    ],
    keyRule: "Défaut de présentation de la carte pro : contravention de 1ère classe. Non justification sous 5 jours : 4ème classe."
  },
  // ── Page 6 ──
  {
    type: "section",
    title: "10. Les juridictions compétentes",
    subtitle: "Organisation juridictionnelle nationale française"
  },
  // ── Page 7 ──
  {
    type: "table",
    title: "Juridictions civiles et pénales",
    intro: "Distinction fondamentale entre les litiges entre personnes (civil) et les infractions à la loi (pénal).",
    headers: ["JURIDICTIONS CIVILES", "JURIDICTIONS PÉNALES"],
    rows: [
      ["TRIBUNAL JUDICIAIRE : Litiges civils (loyer, divorce, consommation).", "TRIBUNAL DE POLICE : Contraventions (amendes)."],
      ["TRIBUNAL DE COMMERCE : Litiges commerçants, entreprises en difficulté.", "TRIBUNAL CORRECTIONNEL : Délits (prison jusqu'à 10 ans + amendes). Compétent pour délits T3P."],
      ["CONSEIL DES PRUD'HOMMES : Litiges salariés / employeurs.", "COUR D'ASSISES : Crimes (meurtre, viol...)."],
      ["COUR D'APPEL : Réexamine l'affaire (2ème degré).", "COUR D'APPEL : Réexamine l'affaire (2ème degré)."],
      ["COUR DE CASSATION : Vérifie l'application du droit (pas les faits).", "COUR DE CASSATION : Vérifie l'application du droit."]
    ],
    keyRule: "En T3P : Maraude illégale = délit → Tribunal Correctionnel. Litige salaire = Prud'hommes. Retrait carte pro = Tribunal Administratif."
  },
  // ── Page 8 ──
  {
    type: "section",
    title: "11. Sanctions et voies de recours",
    subtitle: "Amendes, délits et délais de contestation"
  },
  // ── Page 9 ──
  {
    type: "table",
    title: "Les classes de contraventions",
    intro: "Barème des amendes pour les infractions T3P.",
    headers: ["CLASSE", "AMENDE FORFAITAIRE", "MAJORÉE", "MAXIMUM"],
    rows: [
      ["Classe 1", "11 €", "33 €", "38 €"],
      ["Classe 2", "35 €", "75 €", "150 €"],
      ["Classe 3", "68 €", "180 €", "450 €"],
      ["Classe 4", "135 €", "375 €", "750 €"],
      ["Classe 5", "—", "—", "1 500 € (3 000 € récidive)"]
    ],
    keyRule: "Paiement sous 15 jours = Amende minorée (moins cher). Après 45 jours = Amende majorée."
  },
  // ── Page 10 ──
  {
    type: "content",
    title: "Infractions spécifiques T3P",
    intro: "Liste des principales infractions liées à l'exercice de la profession.",
    blocks: [
      {
        heading: "CONTRAVENTIONS",
        color: "#f1c40f",
        points: [
          "Non apposition de la carte pro : Classe 1",
          "Non présentation de la carte pro : Classe 2",
          "Conduite sans visite médicale : Classe 4",
          "Exercice sans carte pro valide : Classe 5",
          "Défaut d'assurance (non présentation) : Classe 5"
        ]
      },
      {
        heading: "DÉLITS (Graves)",
        color: "#c0392b",
        points: [
          "Maraude illégale (VTC/LOTI) : 1 an prison + 15 000 €",
          "Exercice illégal (sans ADS ou registre) : 1 an + 15 000 €",
          "Travail dissimulé : 3 ans + 45 000 €"
        ]
      }
    ],
    keyRule: "Sanctions complémentaires possibles : suspension du permis (5 ans max), immobilisation ou confiscation du véhicule."
  },
  // ── Page 11 ──
  {
    type: "content",
    title: "Voies de recours",
    intro: "Comment contester une sanction ?",
    blocks: [
      {
        heading: "CONTESTER UNE CONTRAVENTION",
        color: "#3498db",
        points: [
          "Délai : Avant le paiement (payer = reconnaître l'infraction).",
          "Procédure : Requête en exonération envoyée à l'Officier du Ministère Public.",
          "Joindre l'avis original et les motifs de la contestation."
        ]
      },
      {
        heading: "FAIRE APPEL D'UN JUGEMENT (Délit)",
        color: "#9b59b6",
        points: [
          "Délai pénal : 10 jours après le jugement.",
          "Déclaration au greffe du tribunal qui a rendu la décision.",
          "L'affaire sera rejugée par la Cour d'Appel."
        ]
      }
    ]
  },
  // ── Page 12 ──
  {
    type: "section",
    title: "12. Transport de Personnes à Mobilité Réduite (TPMR)",
    subtitle: "Réglementation et accueil des PMR"
  },
  // ── Page 13 ──
  {
    type: "content",
    title: "Le TPMR",
    intro: "Le transport de personnes à mobilité réduite nécessite une formation et des équipements spécifiques.",
    blocks: [
      {
        heading: "FORMATION OBLIGATOIRE",
        color: "#16a085",
        points: [
          "Obligatoire pour tout conducteur accompagnant des PMR.",
          "Durée : de 21h à 400h (titre professionnel).",
          "Apprend les gestes de sécurité, de confort et de secours."
        ]
      },
      {
        heading: "VÉHICULE TPMR : 5 CRITÈRES",
        color: "#27ae60",
        points: [
          "1. Homologation spécifique « handicap » sur la carte grise.",
          "2. Place réservée pour une PMR non en fauteuil.",
          "3. Dimensions intérieures minimales respectées.",
          "4. Ceintures de sécurité à 3 points renforcés.",
          "5. Signalétique spécifique (logo bleu) et notices à bord."
        ]
      }
    ],
    keyRule: "Attention : Le transport de malades assis (VSL) est une activité différente, réservée aux ambulanciers agréés CPAM."
  },
  // ── Page 14 ──
  {
    type: "section",
    title: "13. Covoiturage et transport privé",
    subtitle: "Distinction avec le T3P"
  },
  // ── Page 15 ──
  {
    type: "table",
    title: "Covoiturage vs T3P",
    intro: "Le covoiturage est une activité civile, le T3P est une activité commerciale.",
    headers: ["CRITÈRE", "COVOITURAGE", "T3P (VTC/Taxi)"],
    rows: [
      ["Nature", "Activité privée, partage de frais.", "Activité professionnelle commerciale."],
      ["Rémunération", "NON (juste partage des frais essence/péage).", "OUI (bénéfice, rémunération du travail)."],
      ["Fiscalité", "Exonéré d'impôt (si strict partage).", "Revenus imposables (BIC/IS)."],
      ["Carte pro", "Non requise.", "OBLIGATOIRE."],
      ["Assurance", "Personnelle suffit.", "RC Pro + RC Circulation obligatoires."]
    ],
    keyRule: "Si un conducteur de covoiturage fait du bénéfice, il tombe dans l'exercice illégal de la profession de transporteur (délit)."
  },
  // ── Page 16 ──
  {
    type: "section",
    title: "14. Les intermédiaires",
    subtitle: "Plateformes de mise en relation (Uber, Bolt, etc.)"
  },
  // ── Page 17 ──
  {
    type: "content",
    title: "Obligations des plateformes",
    intro: "Les centrales de réservation ont des responsabilités légales strictes.",
    blocks: [
      {
        heading: "OBLIGATIONS DE LA PLATEFORME",
        color: "#8e44ad",
        points: [
          "Vérifier que le conducteur a une carte pro valide.",
          "Vérifier l'inscription au registre VTC.",
          "Vérifier les assurances du conducteur.",
          "Transmettre les infos de la course au client (prix, voiture, chauffeur).",
          "Ne pas imposer de clauses abusives."
        ]
      },
      {
        heading: "DROITS DU CONDUCTEUR",
        color: "#f39c12",
        points: [
          "Liberté de connexion/déconnexion (indépendant).",
          "Liberté de refuser une course (sans pénalité excessive).",
          "Transparence du prix et de la commission.",
          "Droit à la déconnexion."
        ]
      }
    ],
    keyRule: "Loi Grandguillaume : Interdiction des clauses d'exclusivité pour les VTC indépendants."
  },
  // ── Page 18 ──
  {
    type: "section",
    title: "15. Violences Sexuelles et Sexistes (VSS)",
    subtitle: "Prévention et sanctions"
  },
  // ── Page 19 ──
  {
    type: "content",
    title: "Les infractions sexuelles",
    intro: "Tolérance zéro. Des comportements graves lourdement sanctionnés.",
    blocks: [
      {
        heading: "OUTRAGE SEXISTE (Contravention/Délit)",
        color: "#e74c3c",
        points: [
          "Propos ou comportements à connotation sexuelle ou sexiste imposés.",
          "Sanction : Amende 1 500 € (3 750 € si aggravé)."
        ]
      },
      {
        heading: "HARCÈLEMENT SEXUEL (Délit)",
        color: "#c0392b",
        points: [
          "Propos/comportements RÉPÉTÉS à connotation sexuelle.",
          "Sanction : 2 ans de prison + 30 000 € d'amende."
        ]
      },
      {
        heading: "AGRESSION SEXUELLE (Délit)",
        color: "#d35400",
        points: [
          "Atteinte sexuelle avec violence, contrainte, menace ou surprise (attouchements).",
          "Sanction : 5 ans de prison + 75 000 € d'amende."
        ]
      },
      {
        heading: "VIOL (Crime)",
        color: "#2c3e50",
        points: [
          "Acte de pénétration sexuelle commis par violence, contrainte, menace ou surprise.",
          "Sanction : 15 ans de réclusion criminelle (Cour d'Assises)."
        ]
      }
    ]
  },
  // ── Page 20 ──
  {
    type: "content",
    title: "Les discriminations",
    intro: "Le refus de prise en charge discriminatoire est un délit.",
    blocks: [
      {
        heading: "CRITÈRES PROTÉGÉS (25+)",
        color: "#27ae60",
        points: [
          "Origine, Sexe, Handicap, Orientation sexuelle",
          "Religion, Apparence physique, Âge, État de santé",
          "Lieu de résidence, Patronyme, Grossesse..."
        ]
      },
      {
        heading: "SANCTIONS",
        color: "#c0392b",
        points: [
          "3 ans d'emprisonnement",
          "45 000 € d'amende",
          "Retrait de la carte professionnelle"
        ]
      }
    ],
    keyRule: "Refuser un client à cause de son chien guide d'aveugle est une discrimination (sauf danger médical prouvé)."
  }
];
