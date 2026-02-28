// Données des slides Gestion Partie 1 — Entrepreneurs & Formes Juridiques
// Source : vrai_cours_partie_1-3.pptx

import { Slide } from "./t3p-partie1-data";

export const GESTION_PARTIE1_SLIDES: Slide[] = [
  // ── Page 1 ──
  {
    type: "title",
    title: "GESTION — PARTIE 1",
    subtitle: "Entrepreneurs • Formes juridiques • Statuts",
    footer: "Formation Gestion T3P",
    brand: "FTRANSPORT - SERVICES PRO"
  },
  // ── Page 2 ──
  {
    type: "sommaire",
    title: "SOMMAIRE — GESTION PARTIE 1",
    items: [
      { n: "1", label: "Les types d'entrepreneurs", page: 3 },
      { n: "2", label: "Pourquoi connaître sa catégorie ?", page: 5 },
      { n: "3", label: "Personne physique ou morale ?", page: 6 },
      { n: "4", label: "Les formes juridiques (Tableau comparatif)", page: 8 },
      { n: "5", label: "La SARL et la gérance", page: 10 },
      { n: "6", label: "Modes d'exploitation & SCOP", page: 12 },
      { n: "7", label: "Les différents apports", page: 14 },
      { n: "8", label: "Responsabilité limitée aux apports", page: 16 },
      { n: "9", label: "L'expert-comptable", page: 18 },
    ]
  },
  // ── Page 3 ──
  {
    type: "section",
    title: "1. Les types d'entrepreneurs",
    subtitle: "Artisan, Commerçant, Libéral, Agriculteur"
  },
  // ── Page 4 ──
  {
    type: "content",
    title: "Les 4 catégories d'entrepreneurs",
    intro: "Il est essentiel de connaître sa catégorie car elle détermine votre CFE (Centre de Formalités) et votre caisse sociale.",
    blocks: [
      {
        heading: "🔨 L'ARTISAN (CMA)",
        color: "#e67e22",
        points: [
          "Métier manuel, savoir-faire traditionnel.",
          "Moins de 11 salariés à la création.",
          "Exemples : Chauffeur Taxi/VTC, Boulanger, Coiffeur.",
          "Inscription : Chambre des Métiers et de l'Artisanat (CMA)."
        ]
      },
      {
        heading: "🏪 LE COMMERÇANT (CCI)",
        color: "#3498db",
        points: [
          "Actes de commerce (achat-revente).",
          "Exemples : Supermarché, Vente de vêtements.",
          "Inscription : Chambre de Commerce et d'Industrie (CCI)."
        ]
      },
      {
        heading: "📚 LA PROFESSION LIBÉRALE (URSSAF)",
        color: "#9b59b6",
        points: [
          "Prestation intellectuelle, technique ou de soin.",
          "Exemples : Avocat, Médecin, Consultant.",
          "Inscription : URSSAF (ou Greffe)."
        ]
      },
      {
        heading: "🌾 L'AGRICULTEUR",
        color: "#27ae60",
        points: [
          "Travail de la terre et élevage.",
          "Inscription : Chambre d'Agriculture."
        ]
      }
    ],
    keyRule: "En tant que chauffeur VTC ou Taxi, vous êtes ARTISAN (prestation de service manuel). Vous dépendez de la CMA."
  },
  // ── Page 5 ──
  {
    type: "section",
    title: "2. Personne Physique ou Morale ?",
    subtitle: "La grande distinction juridique"
  },
  // ── Page 6 ──
  {
    type: "table",
    title: "Physique vs Morale",
    intro: "La différence fondamentale réside dans la séparation des patrimoines.",
    headers: ["👤 PERSONNE PHYSIQUE (EI)", "🏢 PERSONNE MORALE (Société)"],
    rows: [
      ["Je SUIS l'entreprise.", "L'entreprise est une entité DISTINCTE."],
      ["Patrimoine personnel et professionnel CONFONDUS (sauf option EIRL).", "Patrimoines STRICTEMENT SÉPARÉS."],
      ["Biens personnels saisissables en cas de dettes.", "Responsabilité limitée aux apports (biens persos protégés)."],
      ["Pas de capital social.", "Capital social obligatoire (même 1€)."],
      ["Bénéfice = Rémunération.", "Bénéfice ≠ Rémunération (fiche de paie ou dividendes)."],
      ["Statut TNS (Travailleur Non Salarié).", "Statut variable (TNS ou Assimilé Salarié)."]
    ]
  },
  // ── Page 7 ──
  {
    type: "section",
    title: "3. Les formes juridiques",
    subtitle: "EI, EURL, SARL, SASU, SAS"
  },
  // ── Page 8 ──
  {
    type: "table",
    title: "Tableau comparatif des statuts",
    intro: "Choisir le bon statut est crucial pour votre fiscalité et votre protection sociale.",
    headers: ["Critère", "Micro-Ent.", "EURL", "SASU", "SAS", "SARL"],
    rows: [
      ["Associés", "1", "1", "1", "Min 2", "Min 2"],
      ["Dirigeant", "Entrepreneur", "Gérant", "Président", "Président", "Gérant"],
      ["Responsabilité", "Illimitée", "Limitée", "Limitée", "Limitée", "Limitée"],
      ["Régime Social", "TNS (SSI)", "TNS (SSI)", "Assimilé Salarié", "Assimilé Salarié", "TNS (maj.) / Assimilé (min.)"],
      ["Fiscalité", "IR (Micro)", "IR ou IS", "IS (IR 5 ans)", "IS (IR 5 ans)", "IS (IR 5 ans)"],
      ["Fiche de paie", "NON", "NON", "OUI", "OUI", "NON (maj.) / OUI (min.)"]
    ],
    keyRule: "SASU/SAS = Président = Assimilé Salarié = Fiche de paie + Bonne couverture (mais cher). EURL/SARL Maj = Gérant = TNS = Pas de fiche de paie + Moins cher."
  },
  // ── Page 9 ──
  {
    type: "content",
    title: "La SARL et la Gérance",
    intro: "En SARL, le statut social du gérant dépend de son pourcentage de parts sociales.",
    blocks: [
      {
        heading: "GÉRANT MAJORITAIRE (> 50%)",
        color: "#e67e22",
        points: [
          "Possède plus de 50% du capital (seul ou en famille).",
          "Statut : TNS (Travailleur Non Salarié).",
          "Charges sociales : ~45% du revenu net.",
          "Pas de fiche de paie."
        ]
      },
      {
        heading: "GÉRANT MINORITAIRE OU ÉGALITAIRE (≤ 50%)",
        color: "#3498db",
        points: [
          "Possède 50% ou moins du capital.",
          "Statut : Assimilé Salarié.",
          "Charges sociales : ~75% du salaire brut.",
          "Fiche de paie obligatoire."
        ]
      }
    ],
    keyRule: "Attention, on additionne les parts du conjoint et des enfants mineurs pour déterminer la majorité !"
  },
  // ── Page 10 ──
  {
    type: "section",
    title: "4. Les Apports",
    subtitle: "Numéraire, Nature, Industrie"
  },
  // ── Page 11 ──
  {
    type: "content",
    title: "Les 3 types d'apports",
    intro: "Pour constituer le capital social, les associés doivent faire des apports.",
    blocks: [
      {
        heading: "💰 APPORT EN NUMÉRAIRE",
        color: "#27ae60",
        points: [
          "Argent (chèque, virement).",
          "Déposé sur un compte bloqué lors de la création.",
          "Libération partielle possible (20% ou 50% à la création, le reste sous 5 ans)."
        ]
      },
      {
        heading: "🚗 APPORT EN NATURE",
        color: "#d35400",
        points: [
          "Biens matériels (véhicule, ordinateur, mobilier).",
          "Doit être évalué (parfois par un commissaire aux apports).",
          "Entre dans le capital social."
        ]
      },
      {
        heading: "🧠 APPORT EN INDUSTRIE",
        color: "#8e44ad",
        points: [
          "Savoir-faire, connaissances, travail, carnet d'adresses.",
          "N'entre PAS dans le montant du capital social.",
          "Donne droit à des parts et aux bénéfices, mais pas de valeur nominale."
        ]
      }
    ]
  },
  // ── Page 12 ──
  {
    type: "section",
    title: "5. L'Expert-Comptable",
    subtitle: "Rôle et obligations"
  },
  // ── Page 13 ──
  {
    type: "content",
    title: "Expert-comptable vs Comptabilité soi-même",
    intro: "Est-il obligatoire d'avoir un expert-comptable ?",
    blocks: [
      {
        heading: "FAIRE SA COMPTA SOI-MÊME",
        color: "#16a085",
        points: [
          "Autorisé par la loi.",
          "Risqué en cas d'erreur (redressement fiscal).",
          "Prend du temps.",
          "Économique."
        ]
      },
      {
        heading: "PRENDRE UN EXPERT-COMPTABLE",
        color: "#2c3e50",
        points: [
          "Non obligatoire, mais vivement conseillé.",
          "Doit être inscrit à l'Ordre des Experts-Comptables (OEC).",
          "Missions : tenue des comptes, bilans, déclarations fiscales et sociales, conseil.",
          "Responsabilité professionnelle engagée en cas d'erreur."
        ]
      }
    ],
    keyRule: "Un expert-comptable illégal (non inscrit à l'Ordre) commet un délit d'exercice illégal de la profession."
  }
];
