import type { Slide } from "./t3p-partie1-data";
import fresquesImg from "@/assets/ville/fresques.jpg";

export const VILLE_FRESQUES_SLIDES: Slide[] = [
  {
    type: "title",
    title: "Les Fresques",
    subtitle: "Fresques murales et art urbain lyonnais",
    footer: "Connaissances de la ville — Module 7",
    brand: "FTRANSPORT",
    image: fresquesImg,
  },
  {
    type: "content",
    title: "🎨 Fresques monumentales — Partie 1",
    blocks: [
      { heading: "1. Fresque des Lyonnais", color: "#ef4444", points: ["📍 2 Rue de la Martinière, 69001 Lyon", "800 m² — Réalisée par CitéCréation (1994-1995)", "1er arrondissement"] },
      { heading: "2. Mur des Canuts", color: "#f59e0b", points: ["📍 36 Boulevard des Canuts, 69004 Lyon", "1 200 m² — Plus grande fresque trompe-l'œil d'Europe (1987)", "4ème arrondissement"] },
    ],
  },
  {
    type: "content",
    title: "🎨 Fresques monumentales — Partie 2",
    blocks: [
      { heading: "3. Mur du Cinéma", color: "#8b5cf6", points: ["📍 Place Gabriel Péri, 69007 Lyon", "500 m² — Réalisée en 1996", "7ème arrondissement"] },
      { heading: "4. Mur Peint des Écrivains", color: "#10b981", points: ["📍 Quai de la Pêcherie, 69001 Lyon", "Environ 300 écrivains lyonnais représentés", "1er arrondissement"] },
    ],
  },
  {
    type: "table",
    title: "📋 Récapitulatif — Les Fresques",
    headers: ["Fresque", "Adresse", "Surface"],
    rows: [
      ["Fresque des Lyonnais", "2 Rue de la Martinière, 69001", "800 m²"],
      ["Mur des Canuts", "36 Bd des Canuts, 69004", "1 200 m²"],
      ["Mur du Cinéma", "Pl. Gabriel Péri, 69007", "500 m²"],
      ["Mur des Écrivains", "Quai de la Pêcherie, 69001", "~300 écrivains"],
    ],
  },
];
