import type { Slide } from "./t3p-partie1-data";
import eglisesImg from "@/assets/ville/eglises.jpg";

export const VILLE_EGLISES_SLIDES: Slide[] = [
  {
    type: "title",
    title: "Les Églises",
    subtitle: "Cathédrales, basiliques et églises remarquables de Lyon",
    footer: "Connaissances de la ville — Module 7",
    brand: "FTRANSPORT",
    image: eglisesImg,
  },
  {
    type: "content",
    title: "⛪ Basilique et Cathédrale",
    blocks: [
      { heading: "1. Basilique Notre-Dame de Fourvière", color: "#f59e0b", points: ["📍 8 Place de Fourvière, 69005 Lyon", "5ème arrondissement — Colline de Fourvière", "Monument emblématique de Lyon, visible de toute la ville"] },
      { heading: "2. Cathédrale Saint-Jean", color: "#8b5cf6", points: ["📍 Place Saint-Jean, 69005 Lyon", "5ème arrondissement — Vieux-Lyon", "Cathédrale primatiale, horloge astronomique du XIVe siècle"] },
    ],
  },
  {
    type: "content",
    title: "⛪ Églises — Suite",
    blocks: [
      { heading: "3. Église Saint-Nizier", color: "#ef4444", points: ["📍 Place Saint-Nizier, 69001 Lyon", "1er arrondissement"] },
      { heading: "4. Église Saint-Georges", color: "#10b981", points: ["📍 Quai Fulchiron, 69005 Lyon", "5ème arrondissement — Rive droite de la Saône"] },
      { heading: "5. Église du Sacré-Cœur", color: "#06b6d4", points: ["📍 89 Rue Antoine Charial, 69003 Lyon", "3ème arrondissement"] },
    ],
  },
  {
    type: "content",
    title: "⛪ Églises — Fin",
    blocks: [
      { heading: "6. Église Notre-Dame de Saint-Vincent", color: "#ec4899", points: ["📍 58 Quai Saint-Vincent, 69001 Lyon", "1er arrondissement"] },
      { heading: "7. Église Sainte-Blandine", color: "#f59e0b", points: ["📍 119 Cours Charlemagne, 69002 Lyon", "2ème arrondissement — Quartier de la Confluence"] },
    ],
  },
  {
    type: "table",
    title: "📋 Récapitulatif — Les Églises",
    headers: ["Lieu", "Adresse", "Arrondissement"],
    rows: [
      ["Basilique de Fourvière", "8 Pl. de Fourvière, 69005", "5ème"],
      ["Cathédrale Saint-Jean", "Pl. Saint-Jean, 69005", "5ème"],
      ["Église Saint-Nizier", "Pl. Saint-Nizier, 69001", "1er"],
      ["Église Saint-Georges", "Quai Fulchiron, 69005", "5ème"],
      ["Église du Sacré-Cœur", "89 Rue A. Charial, 69003", "3ème"],
      ["Église ND de St-Vincent", "58 Quai St-Vincent, 69001", "1er"],
      ["Église Sainte-Blandine", "119 Cours Charlemagne, 69002", "2ème"],
    ],
  },
];
