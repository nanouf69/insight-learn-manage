import type { Slide } from "./t3p-partie1-data";

export const VILLE_MUSEES_SLIDES: Slide[] = [
  {
    type: "title",
    title: "Les Musées",
    subtitle: "Musées et lieux culturels de Lyon",
    footer: "Connaissances de la ville — Module 7",
    brand: "FTRANSPORT",
  },
  {
    type: "content",
    title: "🏛️ Musées — Vieux-Lyon et Fourvière",
    blocks: [
      { heading: "1. Lugdunum – Musée et Théâtres Romains", color: "#f59e0b", points: ["📍 17 Rue Cléberg, 69005 Lyon", "5ème arr. — Site gallo-romain de Fourvière"] },
      { heading: "2. Musée Historique / Marionnettes (Gadagne)", color: "#8b5cf6", points: ["📍 1 Place du Petit Collège, 69005 Lyon", "5ème arr. — Vieux-Lyon"] },
    ],
  },
  {
    type: "content",
    title: "🏛️ Musées — Croix-Rousse et Confluence",
    blocks: [
      { heading: "3. Maison des Canuts / Musée des Tissages", color: "#ef4444", points: ["📍 10 Rue d'Ivry, 69004 Lyon", "4ème arr. — Quartier des Canuts"] },
      { heading: "4. Musée des Confluences", color: "#10b981", points: ["📍 86 Quai Perrache, 69002 Lyon", "2ème arr. — Architecture spectaculaire au confluent"] },
    ],
  },
  {
    type: "content",
    title: "🏛️ Musées — Art et Beaux-Arts",
    blocks: [
      { heading: "5. Musée d'Art Contemporain", color: "#06b6d4", points: ["📍 81 Quai Charles de Gaulle, 69006 Lyon", "6ème arr. — Cité Internationale"] },
      { heading: "6. Musée des Beaux-Arts de Lyon", color: "#ec4899", points: ["📍 20 Place des Terreaux, 69001 Lyon", "1er arr. — Palais Saint-Pierre", "L'un des plus grands musées de France"] },
    ],
  },
  {
    type: "table",
    title: "📋 Récapitulatif — Les Musées",
    headers: ["Musée", "Adresse", "Arrondissement"],
    rows: [
      ["Lugdunum", "17 Rue Cléberg, 69005", "5ème"],
      ["Gadagne (Historique)", "1 Pl. du Petit Collège, 69005", "5ème"],
      ["Maison des Canuts", "10 Rue d'Ivry, 69004", "4ème"],
      ["Musée des Confluences", "86 Quai Perrache, 69002", "2ème"],
      ["Art Contemporain", "81 Quai C. de Gaulle, 69006", "6ème"],
      ["Beaux-Arts", "20 Pl. des Terreaux, 69001", "1er"],
    ],
  },
];
