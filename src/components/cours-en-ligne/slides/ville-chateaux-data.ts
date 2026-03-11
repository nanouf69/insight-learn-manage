import type { Slide } from "./t3p-partie1-data";
import chateauxImg from "@/assets/ville/chateaux.jpg";

export const VILLE_CHATEAUX_SLIDES: Slide[] = [
  {
    type: "title",
    title: "Les Châteaux",
    subtitle: "Châteaux et forts historiques de Lyon et sa région",
    footer: "Connaissances de la ville — Module 7",
    brand: "FTRANSPORT",
    image: chateauxImg,
  },
  {
    type: "content",
    title: "🏰 Château de la Motte",
    intro: "Le château de La Motte est situé dans le 7e arrondissement de Lyon, rive gauche. Il occupe une petite élévation, une motte castrale (d'où il tire son nom) qui le mettait à l'abri des inondations et lui assurait une bonne visibilité avant l'urbanisation du quartier de la Guillotière.",
    blocks: [
      {
        heading: "📍 Adresse",
        color: "#f59e0b",
        points: ["11 Rue de l'Épargne, 69007 Lyon"],
      },
      {
        heading: "📌 À retenir",
        color: "#3b82f6",
        points: ["7ème arrondissement", "Rive gauche du Rhône", "Quartier de la Guillotière"],
      },
    ],
  },
  {
    type: "content",
    title: "🏰 Fort Saint-Jean",
    intro: "Le fort Saint-Jean est un fort situé dans le 1er arrondissement de Lyon en rive gauche (côté Est) de la Saône. Il fait partie de la première ceinture de Lyon.",
    blocks: [
      {
        heading: "📍 Adresse",
        color: "#f59e0b",
        points: ["21 Montée de la Butte, 69001 Lyon"],
      },
      {
        heading: "📌 À retenir",
        color: "#3b82f6",
        points: ["1er arrondissement", "Rive gauche de la Saône", "Première ceinture de Lyon"],
      },
    ],
  },
  {
    type: "content",
    title: "🏰 Domaine de la Bachasse",
    intro: "Le château de la Bachasse est situé à flanc de colline, face à l'Yzeron, sur la commune de Sainte-Foy-lès-Lyon. Son nom rappelle l'existence d'une mare (ou bachasse) creusée dans la cour de la ferme.",
    blocks: [
      {
        heading: "📍 Adresse",
        color: "#f59e0b",
        points: ["8 Chemin des Bottières, 69600 Sainte-Foy-lès-Lyon"],
      },
      {
        heading: "📌 À retenir",
        color: "#10b981",
        points: ["Commune de Sainte-Foy-lès-Lyon", "Face à l'Yzeron", "Flanc de colline"],
      },
    ],
  },
  {
    type: "content",
    title: "🏰 Château Lacroix-Laval",
    intro: "Le château de Lacroix-Laval est un château du XVIe siècle qui se dresse sur la commune de Marcy-l'Étoile dans la métropole de Lyon en région Auvergne-Rhône-Alpes. Il a remplacé un ancien château fort du XIIe siècle.",
    blocks: [
      {
        heading: "📍 Adresse",
        color: "#f59e0b",
        points: ["1171 Avenue de Lacroix-Laval, 69280 Marcy-l'Étoile"],
      },
      {
        heading: "📌 À retenir",
        color: "#8b5cf6",
        points: ["Commune de Marcy-l'Étoile", "Château du XVIe siècle", "Remplace un château fort du XIIe siècle"],
      },
    ],
  },
  {
    type: "table",
    title: "📋 Récapitulatif — Les Châteaux",
    headers: ["Nom", "Adresse", "Localisation"],
    rows: [
      ["Château de la Motte", "11 Rue de l'Épargne, 69007", "Lyon 7ème"],
      ["Fort Saint-Jean", "21 Montée de la Butte, 69001", "Lyon 1er"],
      ["Domaine de la Bachasse", "8 Ch. des Bottières, 69600", "Sainte-Foy-lès-Lyon"],
      ["Château Lacroix-Laval", "1171 Av. de Lacroix-Laval, 69280", "Marcy-l'Étoile"],
    ],
  },
];
