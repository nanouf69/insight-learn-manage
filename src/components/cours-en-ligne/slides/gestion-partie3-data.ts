// Données des slides Gestion Partie 3 — Gestion financière & Administrative
// Source : vrai_cours_parti_3-3.pptx

import { Slide } from "./t3p-partie1-data";

export const GESTION_PARTIE3_SLIDES: Slide[] = [
  // ── Page 1 ──
  {
    type: "title",
    title: "GESTION — PARTIE 3",
    subtitle: "Marge • Dividendes • Paiements • SIG • Bilan",
    footer: "Formation Gestion T3P",
    brand: "FTRANSPORT - SERVICES PRO"
  },
  // ── Page 2 ──
  {
    type: "sommaire",
    title: "SOMMAIRE — GESTION PARTIE 3",
    items: [
      { n: "1", label: "Marge commerciale et Prix de vente", page: 3 },
      { n: "2", label: "Les dividendes", page: 5 },
      { n: "3", label: "Statuts du conjoint", page: 7 },
      { n: "4", label: "Organismes (CMA, CGA, Expert)", page: 9 },
      { n: "5", label: "Moyens de paiement", page: 11 },
      { n: "6", label: "Soldes Intermédiaires de Gestion (SIG)", page: 13 },
      { n: "7", label: "Bilan, FR et BFR", page: 15 },
    ]
  },
  // ── Page 3 ──
  {
    type: "section",
    title: "1. Marge & Prix de vente",
    subtitle: "Comment gagner de l'argent ?"
  },
  // ── Page 4 ──
  {
    type: "content",
    title: "Calculs commerciaux de base",
    intro: "Savoir passer du HT au TTC et calculer sa marge est indispensable.",
    blocks: [
      {
        heading: "TVA ET PRIX",
        color: "#f1c40f",
        points: [
          "TTC = HT × (1 + Taux TVA)",
          "HT = TTC / (1 + Taux TVA)",
          "Exemple TVA 10% : TTC = HT × 1,10  |  HT = TTC / 1,10"
        ]
      },
      {
        heading: "MARGE COMMERCIALE",
        color: "#2ecc71",
        points: [
          "Marge = Prix Vente HT - Coût de Revient HT",
          "Taux de marque = (Marge / Prix Vente HT) × 100",
          "Coefficient multiplicateur = Prix Vente TTC / Coût Achat HT"
        ]
      }
    ],
    keyRule: "Attention : La marge se calcule toujours sur le Hors Taxe (HT) !"
  },
  // ── Page 5 ──
  {
    type: "section",
    title: "2. Les Dividendes",
    subtitle: "Rémunération du capital"
  },
  // ── Page 6 ──
  {
    type: "content",
    title: "Fonctionnement des dividendes",
    intro: "Partie du bénéfice net distribuée aux associés/actionnaires.",
    blocks: [
      {
        heading: "CONDITIONS",
        color: "#3498db",
        points: [
          "L'entreprise doit avoir fait du bénéfice (ou avoir des réserves).",
          "Décision prise en Assemblée Générale (AG) ordinaire annuelle.",
          "Versés après paiement de l'Impôt sur les Sociétés (IS)."
        ]
      },
      {
        heading: "FISCALITÉ (Flat Tax / PFU)",
        color: "#e74c3c",
        points: [
          "Prélèvement Forfaitaire Unique (PFU) de 30% :",
          "• 12,8% Impôt sur le Revenu",
          "• 17,2% Prélèvements Sociaux",
          "Pas de cotisations sociales (sauf pour TNS > 10% capital)."
        ]
      }
    ]
  },
  // ── Page 7 ──
  {
    type: "section",
    title: "3. Statuts du conjoint",
    subtitle: "Collaborateur, Salarié, Associé"
  },
  // ── Page 8 ──
  {
    type: "table",
    title: "Les 3 statuts du conjoint",
    intro: "Obligatoire de choisir un statut si le conjoint travaille régulièrement.",
    headers: ["Statut", "Rémunération", "Protection sociale", "Coût pour l'entreprise"],
    rows: [
      ["CONJOINT COLLABORATEUR", "NON (interdit)", "Oui (retraite + maladie)", "Faible (cotis. forfaitaire)"],
      ["CONJOINT SALARIÉ", "OUI (min. SMIC)", "Oui (complète + chômage)", "Élevé (salaire + charges)"],
      ["CONJOINT ASSOCIÉ", "Non (Dividendes)", "Dépend de son statut (TNS/Salarié)", "Nul (hors dividendes)"]
    ],
    keyRule: "Le statut de conjoint collaborateur est limité à 5 ans. Au-delà, il faut passer salarié ou associé."
  },
  // ── Page 9 ──
  {
    type: "section",
    title: "4. Organismes et Partenaires",
    subtitle: "CMA, CGA, OEC"
  },
  // ── Page 10 ──
  {
    type: "content",
    title: "Rôles des organismes",
    intro: "Qui fait quoi ?",
    blocks: [
      {
        heading: "CMA (Chambre de Métiers)",
        color: "#e67e22",
        points: [
          "Tient le Répertoire des Métiers (RM).",
          "Gère l'apprentissage.",
          "Organise les examens Taxi/VTC."
        ]
      },
      {
        heading: "CGA (Centre de Gestion Agréé)",
        color: "#9b59b6",
        points: [
          "Vérifie la cohérence de la compta.",
          "Évite la majoration de 25% du bénéfice (avant 2023).",
          "Utile pour les entreprises à l'IR."
        ]
      },
      {
        heading: "EXPERT-COMPTABLE",
        color: "#2c3e50",
        points: [
          "Tient la comptabilité, fait les bulletins de paie.",
          "Conseille le dirigeant.",
          "Atteste les comptes."
        ]
      }
    ]
  },
  // ── Page 11 ──
  {
    type: "section",
    title: "5. Moyens de paiement",
    subtitle: "Espèces, Chèque, Carte, Facturation"
  },
  // ── Page 12 ──
  {
    type: "content",
    title: "Règles sur les paiements",
    intro: "Ce que vous avez le droit d'accepter ou de refuser.",
    blocks: [
      {
        heading: "ESPÈCES",
        color: "#27ae60",
        points: [
          "OBLIGATION d'accepter (sauf devises, fausse monnaie, ou si + de 50 pièces).",
          "Plafond : 1 000 € (entre pro ou particulier résident).",
          "Le client doit faire l'appoint."
        ]
      },
      {
        heading: "CHÈQUE",
        color: "#3498db",
        points: [
          "Droit de REFUSER (si affiché clairement).",
          "Validité : 1 an et 8 jours."
        ]
      },
      {
        heading: "CARTE BANCAIRE",
        color: "#8e44ad",
        points: [
          "TAXI : Terminal CB OBLIGATOIRE et en état de marche.",
          "VTC : Pas d'obligation légale, mais indispensable commercialement."
        ]
      }
    ],
    keyRule: "Facture obligatoire pour toute prestation > 25 € TTC."
  },
  // ── Page 13 ──
  {
    type: "section",
    title: "6. Soldes Intermédiaires de Gestion (SIG)",
    subtitle: "Analyser la performance"
  },
  // ── Page 14 ──
  {
    type: "table",
    title: "Les principaux SIG",
    intro: "Du Chiffre d'Affaires au Résultat Net.",
    headers: ["Solde", "Calcul simplifiée", "Signification"],
    rows: [
      ["Marge Commerciale", "Ventes - Achats marchandises", "Rentabilité de base"],
      ["Valeur Ajoutée (VA)", "Marge - Consommations externes", "Richesse créée par l'entreprise"],
      ["EBE (Excédent Brut d'Exploitation)", "VA - Impôts - Salaires", "Rentabilité éco pure (Cash-flow)"],
      ["Résultat d'Exploitation", "EBE - Amortissements", "Rentabilité comptable de l'activité"],
      ["Résultat Courant", "Rés. Exploit. + Rés. Financier", "Rentabilité avant exceptionnel"],
      ["RÉSULTAT NET", "Rés. Courant - Impôt sur bénéfices", "Ce qui reste réellement (Bénéfice/Perte)"]
    ],
    keyRule: "L'EBE est l'indicateur le plus important pour la banque : il mesure la capacité de l'entreprise à générer de la trésorerie par son activité."
  },
  // ── Page 15 ──
  {
    type: "section",
    title: "7. Bilan, FR et BFR",
    subtitle: "Santé financière et Trésorerie"
  },
  // ── Page 16 ──
  {
    type: "content",
    title: "Fonds de Roulement & BFR",
    intro: "Comment financer son cycle d'exploitation ?",
    blocks: [
      {
        heading: "FONDS DE ROULEMENT (FR)",
        color: "#2ecc71",
        points: [
          "Ressources Stables - Emplois Stables.",
          "L'argent durable dont dispose l'entreprise pour financer son activité.",
          "Doit être POSITIF."
        ]
      },
      {
        heading: "BESOIN EN FONDS DE ROULEMENT (BFR)",
        color: "#e74c3c",
        points: [
          "Argent bloqué dans le cycle (Stocks + Créances Clients - Dettes Fournisseurs).",
          "Le décalage de trésorerie entre dépenses et recettes.",
          "Si BFR augmente, la trésorerie baisse."
        ]
      },
      {
        heading: "TRÉSORERIE NETTE",
        color: "#f1c40f",
        points: [
          "Trésorerie = FR - BFR.",
          "C'est l'argent disponible en banque."
        ]
      }
    ]
  }
];
