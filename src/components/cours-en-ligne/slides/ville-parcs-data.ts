import type { Slide } from "./t3p-partie1-data";
import parcsImg from "@/assets/ville/parcs.jpg";

export const VILLE_PARCS_SLIDES: Slide[] = [
  {
    type: "title",
    title: "Les Parcs",
    subtitle: "Parcs et espaces verts de Lyon et sa métropole",
    footer: "Connaissances de la ville — Module 7",
    brand: "FTRANSPORT",
    image: parcsImg,
  },
  {
    type: "content",
    title: "🌳 Parcs — Partie 1",
    blocks: [
      { heading: "1. Parc de la Feyssine", color: "#10b981", points: ["📍 Villeurbanne", "Parc naturel en bord de Rhône"] },
      { heading: "2. Parc Blandan", color: "#22c55e", points: ["📍 Rue du Repos, 69007 Lyon", "7ème arr. — Espaces verts, skate park, carrousel, jeux pour enfants"] },
      { heading: "3. Parc de Parilly", color: "#84cc16", points: ["📍 Boulevard Émile Bollaert, 69500 Bron", "Hippodrome, stade d'athlétisme, 10 terrains de football, 12 basketball, volley, rugby, 6 handball"] },
    ],
  },
  {
    type: "content",
    title: "🌳 Parcs — Partie 2",
    blocks: [
      { heading: "4. Parc de la Tête d'Or", color: "#f59e0b", points: ["📍 69006 Lyon", "6ème arr. — Plus grand parc urbain de France", "Zoo, jardin botanique, manèges, Théâtre Guignol, vélodrome"] },
      { heading: "5. Parc de Gerland", color: "#3b82f6", points: ["📍 Allée Pierre de Coubertin, 69007 Lyon", "7ème arr. — Jeux pour enfants, skate park"] },
    ],
  },
  {
    type: "table",
    title: "📋 Récapitulatif — Les Parcs",
    headers: ["Parc", "Adresse", "Caractéristiques"],
    rows: [
      ["Feyssine", "Villeurbanne", "Parc naturel, bord du Rhône"],
      ["Blandan", "Rue du Repos, 69007", "Skate park, jeux, carrousel"],
      ["Parilly", "Bd É. Bollaert, 69500 Bron", "Sports, hippodrome"],
      ["Tête d'Or", "69006 Lyon", "Zoo, jardin botanique, vélodrome"],
      ["Gerland", "Allée P. de Coubertin, 69007", "Jeux, skate park"],
    ],
  },
];
