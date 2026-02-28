// Données des slides Gestion Partie 2 — Compta & Fiscalité
// Source : vrai_cours_parti_2-3.pptx

import { Slide } from "./t3p-partie1-data";

export const GESTION_PARTIE2_SLIDES: Slide[] = [
  // ── Page 1 ──
  {
    type: "title",
    title: "GESTION — PARTIE 2",
    subtitle: "Amortissements • Coût de revient • TVA • Fiscalité • Régimes sociaux",
    footer: "Formation Gestion T3P",
    brand: "FTRANSPORT - SERVICES PRO"
  },
  // ── Page 2 ──
  {
    type: "sommaire",
    title: "SOMMAIRE — GESTION PARTIE 2",
    items: [
      { n: "1", label: "Amortissements (Linéaire, Dégressif)", page: 3 },
      { n: "2", label: "Coût de revient & Rentabilité", page: 6 },
      { n: "3", label: "La TVA (Collectée vs Déductible)", page: 9 },
      { n: "4", label: "Régimes d'imposition (Micro vs Réel)", page: 12 },
      { n: "5", label: "Impôts et Taxes (CFE, CVAE)", page: 14 },
      { n: "6", label: "Régimes sociaux (TNS vs Assimilé)", page: 16 },
      { n: "7", label: "CSG & CRDS", page: 18 },
    ]
  },
  // ── Page 3 ──
  {
    type: "section",
    title: "1. Les Amortissements",
    subtitle: "Perte de valeur et charge comptable"
  },
  // ── Page 4 ──
  {
    type: "content",
    title: "Définition de l'amortissement",
    intro: "L'amortissement constate la perte de valeur d'un bien due à l'usure ou au temps. C'est une charge calculée (pas de sortie d'argent) qui diminue le bénéfice imposable.",
    blocks: [
      {
        heading: "PRINCIPE",
        color: "#f1c40f",
        points: [
          "On étale le coût d'achat sur la durée de vie du bien.",
          "Durées usuelles : Véhicule (4-5 ans), Mobilier (10 ans), Informatique (3 ans).",
          "Valeur Résiduelle = Valeur d'achat - Amortissements cumulés."
        ]
      },
      {
        heading: "TYPES D'AMORTISSEMENT",
        color: "#00d2d3",
        points: [
          "LINÉAIRE : Montant identique chaque année. (Obligatoire pour biens d'occasion).",
          "DÉGRESSIF : Montant plus fort au début. (Interdit pour voitures de tourisme !).",
          "EXCEPTIONNEL : Sur 12 ou 24 mois (logiciels, sites web)."
        ]
      }
    ],
    keyRule: "Attention : Les véhicules de tourisme (VTC) ne peuvent PAS être amortis en dégressif. Uniquement linéaire."
  },
  // ── Page 5 ──
  {
    type: "table",
    title: "Exemple : Véhicule 20 000 € sur 4 ans",
    intro: "Amortissement linéaire classique.",
    headers: ["Année", "Base amortissable", "Annuité (20 000 / 4)", "VNC (Valeur Nette Comptable)"],
    rows: [
      ["Année 1", "20 000 €", "5 000 €", "15 000 €"],
      ["Année 2", "20 000 €", "5 000 €", "10 000 €"],
      ["Année 3", "20 000 €", "5 000 €", "5 000 €"],
      ["Année 4", "20 000 €", "5 000 €", "0 €"]
    ]
  },
  // ── Page 6 ──
  {
    type: "section",
    title: "2. Coût de Revient & Rentabilité",
    subtitle: "Savoir calculer son prix au km"
  },
  // ── Page 7 ──
  {
    type: "content",
    title: "Charges Fixes vs Variables",
    intro: "Pour calculer son coût de revient, il faut distinguer deux types de charges.",
    blocks: [
      {
        heading: "🔒 CHARGES FIXES (CF)",
        color: "#e67e22",
        points: [
          "Ne dépendent PAS des km parcourus.",
          "À payer même si la voiture ne roule pas.",
          "Exemples : Assurance, Loyer, Forfait téléphone, Expert-comptable, CFE, Amortissement du véhicule."
        ]
      },
      {
        heading: "⚡ CHARGES VARIABLES (CV)",
        color: "#2ecc71",
        points: [
          "Proportionnelles aux km parcourus.",
          "Exemples : Carburant, Entretien, Pneus, Péages."
        ]
      }
    ]
  },
  // ── Page 8 ──
  {
    type: "content",
    title: "Calcul du Coût de Revient Kilométrique (CRK)",
    intro: "Combien me coûte réellement 1 km parcouru ?",
    blocks: [
      {
        heading: "FORMULE GLOBALE (Monôme)",
        color: "#9b59b6",
        points: [
          "CRK = (Total Charges Fixes + Total Charges Variables) / Km totaux",
          "Exemple : (10 000 € CF + 15 000 € CV) / 50 000 km = 0,50 €/km."
        ]
      },
      {
        heading: "SEUIL DE RENTABILITÉ (SR)",
        color: "#e74c3c",
        points: [
          "Chiffre d'affaires minimum pour ne pas perdre d'argent (résultat = 0).",
          "SR = Charges Fixes / Taux de Marge sur Coût Variable."
        ]
      }
    ],
    keyRule: "Ne jamais vendre en dessous de son coût de revient ! Sinon vous travaillez à perte."
  },
  // ── Page 9 ──
  {
    type: "section",
    title: "3. La TVA",
    subtitle: "Mécanisme, Taux et Déclaration"
  },
  // ── Page 10 ──
  {
    type: "content",
    title: "Mécanisme de la TVA",
    intro: "La TVA est un impôt neutre pour l'entreprise : vous la collectez, vous la déduisez, vous reversez la différence.",
    blocks: [
      {
        heading: "📥 TVA COLLECTÉE (Ventes)",
        color: "#2ecc71",
        points: [
          "Facturée au client sur vos courses.",
          "Taux Transport de personnes : 10 %.",
          "C'est une dette envers l'État."
        ]
      },
      {
        heading: "📤 TVA DÉDUCTIBLE (Achats)",
        color: "#e74c3c",
        points: [
          "Payée à vos fournisseurs.",
          "Taux variable (20% sur gazole/réparations, 10% restauration...).",
          "C'est une créance sur l'État."
        ]
      },
      {
        heading: "💰 TVA À PAYER",
        color: "#3498db",
        points: [
          "TVA à payer = TVA Collectée - TVA Déductible.",
          "Si négatif = Crédit de TVA (l'État vous rembourse)."
        ]
      }
    ]
  },
  // ── Page 11 ──
  {
    type: "table",
    title: "Taux de TVA applicables",
    headers: ["Taux", "Concerne", "Exemples VTC"],
    rows: [
      ["10 %", "Transport de voyageurs", "Prix de la course VTC/Taxi"],
      ["20 %", "Taux normal", "Achat véhicule, Entretien, Honoraires, Téléphone"],
      ["20 %", "Carburant", "Gazole (récupérable à 100% pour VTC), Essence (variable)"],
      ["5,5 %", "Taux réduit", "Alimentaire, Livres (peu concerné en VTC)"]
    ],
    keyRule: "VTC : TVA sur les courses = 10%. TVA sur les achats = souvent 20%."
  },
  // ── Page 12 ──
  {
    type: "section",
    title: "4. Régimes d'imposition",
    subtitle: "Réel vs Micro"
  },
  // ── Page 13 ──
  {
    type: "content",
    title: "Les 3 régimes fiscaux",
    intro: "Votre régime dépend de votre CA et de votre forme juridique.",
    blocks: [
      {
        heading: "MICRO-ENTREPRISE",
        color: "#f39c12",
        points: [
          "Plafond CA : 77 700 € (Presta service).",
          "Pas de déduction des charges réelles.",
          "Abattement forfaitaire de 50%.",
          "Franchise TVA possible si CA < seuil."
        ]
      },
      {
        heading: "RÉEL SIMPLIFIÉ",
        color: "#3498db",
        points: [
          "CA entre 77 700 € et 254 000 €.",
          "Déduction des charges réelles.",
          "1 bilan simplifié par an.",
          "TVA : acomptes semestriels + régularisation annuelle."
        ]
      },
      {
        heading: "RÉEL NORMAL",
        color: "#9b59b6",
        points: [
          "CA > 254 000 €.",
          "Déduction charges réelles.",
          "Bilan complet.",
          "TVA : déclaration mensuelle."
        ]
      }
    ]
  },
  // ── Page 14 ──
  {
    type: "section",
    title: "5. Impôts et Taxes",
    subtitle: "CFE, CVAE, IS, IR"
  },
  // ── Page 15 ──
  {
    type: "content",
    title: "La CFE (Cotisation Foncière des Entreprises)",
    intro: "Impôt local dû par TOUTES les entreprises (même micro, même chez soi).",
    blocks: [
      {
        heading: "PRINCIPE",
        color: "#e67e22",
        points: [
          "Basée sur la valeur locative des biens passibles de taxe foncière.",
          "Si domiciliation chez soi (peu de valeur locative) : cotisation minimum basée sur le CA."
        ]
      },
      {
        heading: "EXONÉRATIONS",
        color: "#2ecc71",
        points: [
          "Année de création (si déclaration avant 31/12).",
          "CA < 5 000 €.",
          "Artisans (sous conditions, souvent exonérés si travail manuel seul).",
          "Chauffeurs de TAXI (sauf si > 2 véhicules ou salariés)."
        ]
      }
    ],
    keyRule: "VTC : Payent la CFE. Taxis : Souvent exonérés (artisan)."
  },
  // ── Page 16 ──
  {
    type: "section",
    title: "6. Régimes Sociaux",
    subtitle: "SSI (ex-RSI) vs Régime Général"
  },
  // ── Page 17 ──
  {
    type: "table",
    title: "TNS vs Assimilé Salarié",
    intro: "Comparatif des deux statuts sociaux du dirigeant.",
    headers: ["Critère", "TNS (Travailleur Non Salarié)", "ASSIMILÉ SALARIÉ"],
    rows: [
      ["Qui ?", "Micro, EI, EURL, Gérant Maj. SARL", "Président SASU/SAS, Gérant Min. SARL"],
      ["Caisse", "SSI (Sécurité Sociale Indépendants)", "URSSAF (Régime Général)"],
      ["Coût", "Moins cher (~45% du net)", "Plus cher (~75% du net / 45% du brut)"],
      ["Retraite", "Moins bonne validation", "Meilleure validation (cadre)"],
      ["Fiche de paie", "NON", "OUI"],
      ["Chômage", "NON (sauf ATI très restreint)", "NON (mandataire social)"]
    ],
    keyRule: "Aucun dirigeant ne cotise au chômage (Pôle Emploi) via son mandat social."
  },
  // ── Page 18 ──
  {
    type: "content",
    title: "CSG & CRDS",
    intro: "Contributions sociales sur tous les revenus (activité et patrimoine).",
    blocks: [
      {
        heading: "CSG (Contribution Sociale Généralisée)",
        color: "#e74c3c",
        points: [
          "Finance la Sécurité Sociale, Famille, Dépendance.",
          "Taux : 9,2% sur revenus d'activité.",
          "Non déductible à 100% (une part est imposable)."
        ]
      },
      {
        heading: "CRDS (Contribution au Remboursement de la Dette Sociale)",
        color: "#95a5a6",
        points: [
          "Finance la dette de la Sécu (CADES).",
          "Taux : 0,5% sur tous les revenus.",
          "Non déductible."
        ]
      }
    ]
  }
];
