// Données des slides T3P Partie 1 — Réglementation du Transport Public Particulier de Personnes
// Source : vrai_cours_t3P_partie_1-5.pptx (50 slides)

export interface SlideBlock {
  heading: string;
  color: string;
  points: string[];
}

export interface SlideBase {
  type: string;
  title: string;
}

export interface SlideTitleType extends SlideBase {
  type: "title";
  subtitle?: string;
  footer?: string;
  brand?: string;
}

export interface SlideSommaireType extends SlideBase {
  type: "sommaire";
  items: { n: string; label: string; page: number }[];
}

export interface SlideSectionType extends SlideBase {
  type: "section";
  subtitle?: string;
}

export interface SlideContentType extends SlideBase {
  type: "content";
  ref?: string;
  intro?: string;
  blocks?: SlideBlock[];
  keyRule?: string;
  examples?: string[];
}

export interface SlideTableType extends SlideBase {
  type: "table";
  ref?: string;
  intro?: string;
  headers: string[];
  rows: string[][];
  keyRule?: string;
  extraSections?: { heading: string; items: string[] }[];
}

export interface SlideChiffresType extends SlideBase {
  type: "chiffres";
  items: { val: string; desc: string }[];
}

export interface SlideSchemaType extends SlideBase {
  type: "schema";
  intro?: string;
  tables?: { headers: string[]; rows: string[][] }[];
  keyRule?: string;
  lists?: { heading: string; items: string[] }[];
}

export interface SlideSynthesisType extends SlideBase {
  type: "synthesis";
  intro?: string;
  sections: { heading: string; color: string; points: string[] }[];
  keyRule?: string;
}

export type Slide =
  | SlideTitleType
  | SlideSommaireType
  | SlideSectionType
  | SlideContentType
  | SlideTableType
  | SlideChiffresType
  | SlideSchemaType
  | SlideSynthesisType;

export const T3P_PARTIE1_SLIDES: Slide[] = [
  // ── Page 1 ──
  {
    type: "title",
    title: "RÉGLEMENTATION T3P",
    subtitle: "Transport Public Particulier de Personnes",
    footer: "Arrêté du 20 mars 2024",
    brand: "FTRANSPORT - SERVICES PRO"
  },
  // ── Page 2 ──
  {
    type: "sommaire",
    title: "SOMMAIRE — PARTIE 1",
    items: [
      { n: "1", label: "Transport public ou transport privé ?", page: 3 },
      { n: "2", label: "Le transport public collectif", page: 5 },
      { n: "3", label: "La loi LOTI — Définition du T3P", page: 12 },
      { n: "4", label: "Non-inscription aux examens T3P", page: 14 },
      { n: "5", label: "Réglementation des Taxis", page: 16 },
      { n: "6", label: "Réglementation des VTC", page: 25 },
      { n: "6b", label: "Réglementation des VMDTR", page: 30 },
      { n: "7", label: "Organismes autour du T3P", page: 35 },
    ]
  },
  // ── Page 3 ──
  {
    type: "section",
    title: "1. Transport public ou transport privé ?",
    subtitle: "Comprendre la classification fondamentale"
  },
  // ── Page 4 ──
  {
    type: "content",
    title: "Privé vs Public",
    intro: "La distinction détermine l'obligation de détention d'une carte professionnelle.",
    blocks: [
      {
        heading: "TRANSPORT PRIVÉ (Compte propre)",
        color: "#e74c3c",
        points: [
          "Transport pour soi-même ou ses salariés.",
          "Pas ouvert au public.",
          "Pas de rémunération directe.",
          "Pas de carte pro requise."
        ]
      },
      {
        heading: "TRANSPORT PUBLIC (Compte d'autrui)",
        color: "#3498db",
        points: [
          "Transport pour un CLIENT.",
          "Contre rémunération (onéreux).",
          "Ouvert au public.",
          "Autorisations et carte pro nécessaires."
        ]
      }
    ],
    keyRule: "Règle clé : Si le client paie pour être transporté = Transport Public = Réglementé."
  },
  // ── Page 5 ──
  {
    type: "section",
    title: "2. Le transport public collectif",
    subtitle: "Services réguliers, à la demande et occasionnels"
  },
  // ── Page 6 ──
  {
    type: "content",
    title: "Les 3 familles du transport collectif",
    intro: "Ce ne sont PAS des T3P. Les conducteurs n'ont pas la carte T3P.",
    blocks: [
      {
        heading: "1. SERVICES RÉGULIERS",
        color: "#2ecc71",
        points: [
          "Itinéraire fixe, horaires fixes, arrêts fixes.",
          "Ex: Bus, Tram, Métro, Lignes régulières car."
        ]
      },
      {
        heading: "2. SERVICES À LA DEMANDE (TAD)",
        color: "#f1c40f",
        points: [
          "Itinéraire variable selon réservation.",
          "Organisé par une collectivité (ex: navette communale).",
          "Tarif fixé par l'autorité."
        ]
      },
      {
        heading: "3. SERVICES OCCASIONNELS",
        color: "#e67e22",
        points: [
          "Transport de groupes constitués (tourisme, scolaires).",
          "À la demande d'un donneur d'ordre (agence, asso).",
          "Billet collectif obligatoire."
        ]
      }
    ]
  },
  // ── Page 7 ──
  {
    type: "section",
    title: "3. La loi LOTI — Définition du T3P",
    subtitle: "Le cadre légal fondateur"
  },
  // ── Page 8 ──
  {
    type: "content",
    title: "Qu'est-ce que le T3P ?",
    ref: "Loi LOTI (1982) et Code des transports",
    intro: "Le Transport Public Particulier de Personnes (T3P) est une catégorie spécifique.",
    blocks: [
      {
        heading: "DÉFINITION T3P",
        color: "#9b59b6",
        points: [
          "Ni collectif (pas de bus), ni privé (pas de voiture perso).",
          "Véhicules de moins de 10 places (9 passagers max + chauffeur).",
          "Transport À TITRE ONÉREUX (payant).",
          "Exécuté par 3 professions exclusives : Taxi, VTC, VMDTR."
        ]
      }
    ],
    keyRule: "Seuls les Taxis, VTC et Motos-Taxis (VMDTR) font partie du T3P."
  },
  // ── Page 9 ──
  {
    type: "section",
    title: "4. Non-inscription aux examens",
    subtitle: "Les cas d'exclusion"
  },
  // ── Page 10 ──
  {
    type: "table",
    title: "Les 3 cas d'interdiction d'examen",
    intro: "Vous ne pouvez pas vous inscrire si...",
    headers: ["CAUSE", "DURÉE INTERDICTION", "DÉTAILS"],
    rows: [
      ["Retrait définitif carte pro", "10 ANS", "Si vous avez perdu votre carte suite à une sanction grave."],
      ["Fraude à l'examen", "5 ANS", "Triche, antisèche, usurpation d'identité."],
      ["Permis probatoire", "TANT QUE PROBATOIRE", "Il faut avoir fini sa période probatoire (3 ans ou 2 ans AAC)."]
    ],
    keyRule: "Permis probatoire = Pas d'examen T3P possible."
  },
  // ── Page 11 ──
  {
    type: "section",
    title: "5. Réglementation des Taxis",
    subtitle: "ADS, Maraude, Tarifs"
  },
  // ── Page 12 ──
  {
    type: "content",
    title: "Le Taxi : Caractéristiques",
    blocks: [
      {
        heading: "DROITS EXCLUSIFS",
        color: "#f1c40f",
        points: [
          "Droit de MARAUDE (prendre des clients dans la rue sans résa).",
          "Stationnement en station taxi.",
          "Utilisation des couloirs de bus (souvent)."
        ]
      },
      {
        heading: "OBLIGATIONS",
        color: "#e67e22",
        points: [
          "Licence ADS (Autorisation de Stationnement) OBLIGATOIRE.",
          "Tarifs réglementés par l'État (Taximètre).",
          "Véhicule équipé (Lumineux, Taximètre, Imprimante).",
          "PSC1 (Secourisme) obligatoire."
        ]
      }
    ],
    keyRule: "Le taxi a le monopole de la maraude et de la station taxi."
  },
  // ── Page 13 ──
  {
    type: "section",
    title: "6. Réglementation des VTC",
    subtitle: "Voiture de Transport avec Chauffeur"
  },
  // ── Page 14 ──
  {
    type: "content",
    title: "Le VTC : Règles d'or",
    blocks: [
      {
        heading: "RÈGLES FONDAMENTALES",
        color: "#3498db",
        points: [
          "Réservation PRÉALABLE OBLIGATOIRE (tout le temps).",
          "INTERDICTION totale de la maraude.",
          "Tarif LIBRE mais fixé à l'avance (ou horokilométrique via app).",
          "Inscription au Registre VTC (REV).",
          "Vignette rouge VTC sur le pare-brise."
        ]
      },
      {
        heading: "VÉHICULE VTC (Critères)",
        color: "#2c3e50",
        points: [
          "Entre 4 et 9 places.",
          "Moins de 7 ans (sauf hybride/élec).",
          "Dimensions min : 4,50m x 1,70m.",
          "Puissance min : 84 kW (>114 ch) (sauf hybride/élec).",
          "4 portes minimum."
        ]
      }
    ],
    keyRule: "Un VTC qui prend un client dans la rue sans réservation commet un délit de maraude illégale (1 an prison + 15 000€)."
  },
  // ── Page 15 ──
  {
    type: "section",
    title: "6b. Réglementation VMDTR",
    subtitle: "Motos-Taxis"
  },
  // ── Page 16 ──
  {
    type: "content",
    title: "VMDTR (2 ou 3 roues)",
    blocks: [
      {
        heading: "SPÉCIFICITÉS",
        color: "#8e44ad",
        points: [
          "Réservation préalable OBLIGATOIRE.",
          "1 seul passager.",
          "Permis A (Moto) depuis 3 ans minimum.",
          "Véhicule de moins de 5 ans.",
          "Carte pro VMDTR spécifique."
        ]
      }
    ]
  },
  // ── Page 17 ──
  {
    type: "section",
    title: "7. Organismes T3P",
    subtitle: "Qui fait quoi ?"
  },
  // ── Page 18 ──
  {
    type: "table",
    title: "Les acteurs du T3P",
    headers: ["ORGANISME", "RÔLE"],
    rows: [
      ["PRÉFECTURE", "Délivre les cartes professionnelles T3P."],
      ["DREAL / DRIEAT", "Gère le registre VTC."],
      ["CMA (Chambre Métiers)", "Organise les examens."],
      ["MAIRIE / MÉTROPOLE", "Délivre les licences ADS (Taxis)."],
      ["URSSAF", "Collecte les cotisations sociales."],
      ["POLICE / DOUANE", "Contrôles routiers (Boers)."]
    ]
  }
];
