import type { Slide } from "./t3p-partie1-data";

export const VILLE_PERSONNALITES_SLIDES: Slide[] = [
  {
    type: "title",
    title: "Les Personnalités Publiques Lyonnaises",
    subtitle: "Les grandes figures historiques et contemporaines de Lyon",
    footer: "Connaissances de la ville — Module 7",
    brand: "FTRANSPORT",
  },
  {
    type: "content",
    title: "⭐ Paul Bocuse",
    intro: "Grand Chef Cuisinier (1926-2018) — 3 étoiles Michelin pendant 53 ans (1965-2018). Considéré comme le grand chef du XXe siècle.",
    blocks: [
      { heading: "📌 À retenir", color: "#f59e0b", points: ["Né et mort à Collonges-au-Mont-d'Or (Rhône)", "Restaurant : l'Auberge du Pont de Collonges", "Créateur des Halles de Lyon qui portent son nom", "Ambassadeur mondial de la gastronomie lyonnaise"] },
    ],
  },
  {
    type: "content",
    title: "⭐ Les Frères Lumière",
    intro: "Auguste et Louis Lumière — Ingénieurs et inventeurs. Pionniers de l'invention du cinéma et de la photographie.",
    blocks: [
      { heading: "📌 À retenir", color: "#3b82f6", points: ["Première projection cinématographique en 1895", "Usine Lumière à Monplaisir (Lyon 8ème)", "Institut Lumière : 25 Rue du Premier Film, 69008 Lyon", "Inventeurs de l'Autochrome (photographie couleur)"] },
    ],
  },
  {
    type: "content",
    title: "⭐ Tony Garnier",
    intro: "Architecte et Urbaniste Français (1869-1948) — Avancées majeures en architecture moderne et urbanisme avec le concept de la Cité Industrielle.",
    blocks: [
      { heading: "📌 À retenir", color: "#8b5cf6", points: ["Né à Lyon", "Concepteur de la Cité Industrielle", "Halle Tony Garnier : 20 Place Charles et Christophe Mérieux, 69007", "Quartier des États-Unis (Lyon 8ème) porte son empreinte", "Musée Urbain Tony Garnier (fresques monumentales)"] },
    ],
  },
  {
    type: "table",
    title: "📋 Récapitulatif — Les Personnalités",
    headers: ["Personnalité", "Domaine", "Lieu emblématique"],
    rows: [
      ["Paul Bocuse", "Gastronomie", "Halles de Lyon, Collonges"],
      ["Frères Lumière", "Cinéma / Photo", "Institut Lumière, Lyon 8ème"],
      ["Tony Garnier", "Architecture", "Halle Tony Garnier, Lyon 7ème"],
    ],
  },
];
