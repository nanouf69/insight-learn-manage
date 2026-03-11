import type { Slide } from "./t3p-partie1-data";

export const VILLE_VINS_SLIDES: Slide[] = [
  {
    type: "title",
    title: "Les Vins",
    subtitle: "Vignobles et appellations de la région lyonnaise",
    footer: "Connaissances de la ville — Module 7",
    brand: "FTRANSPORT",
  },
  {
    type: "content",
    title: "🍷 Le Vignoble du Beaujolais",
    intro: "Au nord de Lyon, le vignoble du Beaujolais est situé dans la zone la plus au sud de la Bourgogne, dans le nord du département du Rhône. Le Beaujolais comporte 12 appellations dont 10 crus.",
    blocks: [
      {
        heading: "🏆 Les 10 Crus du Beaujolais",
        color: "#dc2626",
        points: [
          "Brouilly", "Chénas", "Chiroubles", "Côte de Brouilly", "Fleurie",
          "Juliénas", "Morgon", "Moulin-à-Vent", "Régnié", "Saint-Amour",
        ],
      },
    ],
  },
  {
    type: "content",
    title: "🍷 Les Vignobles de la Vallée du Rhône",
    intro: "Au sud, le vignoble de la vallée du Rhône (dans sa partie nord) regroupe les appellations les plus anciennes entre Vienne et Valence, surtout en rive droite.",
    blocks: [
      {
        heading: "🏆 Appellations principales",
        color: "#7c3aed",
        points: [
          "Côte Rôtie", "Condrieu", "Côtes du Rhône", "Saint-Joseph", "Hermitage",
        ],
      },
    ],
  },
  {
    type: "table",
    title: "📋 Récapitulatif — Les Vins",
    headers: ["Vignoble", "Appellations clés"],
    rows: [
      ["Beaujolais", "Brouilly, Fleurie, Morgon, Moulin-à-Vent, Saint-Amour..."],
      ["Vallée du Rhône Nord", "Côte Rôtie, Condrieu, Saint-Joseph, Hermitage"],
    ],
  },
];
