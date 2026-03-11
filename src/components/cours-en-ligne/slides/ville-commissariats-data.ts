import type { Slide } from "./t3p-partie1-data";
import commissariatsImg from "@/assets/ville/commissariats.jpg";

export const VILLE_COMMISSARIATS_SLIDES: Slide[] = [
  {
    type: "title",
    title: "Les Commissariats",
    subtitle: "Commissariats de police de Lyon et environs",
    footer: "Connaissances de la ville — Module 7",
    brand: "FTRANSPORT",
    image: commissariatsImg,
  },
  {
    type: "content",
    title: "👮 Commissariats — Partie 1",
    blocks: [
      { heading: "1. Commissariat Lyon 1er", color: "#ef4444", points: ["📍 19 Place Louis Pradel, 69001 Lyon", "Devant l'Opéra et l'Hôtel de Ville"] },
      { heading: "2. Commissariat Lyon 2ème", color: "#f59e0b", points: ["📍 47 Rue de la Charité, 69002 Lyon"] },
      { heading: "3. Commissariat Lyon 3ème et 6ème", color: "#10b981", points: ["📍 11 Rue Denfert-Rochereau, 69003 Lyon", "Commissariat commun aux deux arrondissements"] },
    ],
  },
  {
    type: "content",
    title: "👮 Commissariats — Partie 2",
    blocks: [
      { heading: "4. Commissariat Lyon 4ème", color: "#8b5cf6", points: ["📍 3 Rue de la Terrasse, 69004 Lyon"] },
      { heading: "5. Commissariat Lyon 5ème", color: "#ec4899", points: ["📍 15 Rue des Anges, 69005 Lyon"] },
      { heading: "6. Commissariat Lyon 7ème et 8ème", color: "#06b6d4", points: ["📍 40 Rue Marius Berliet, 69008 Lyon", "Commissariat commun aux deux arrondissements"] },
      { heading: "7. Commissariat Lyon 9ème", color: "#ef4444", points: ["📍 29-31 Rue Berjon, 69009 Lyon"] },
    ],
  },
  {
    type: "table",
    title: "📋 Récapitulatif — Les Commissariats",
    headers: ["Arr.", "Adresse"],
    rows: [
      ["1er", "19 Place Louis Pradel, 69001"],
      ["2ème", "47 Rue de la Charité, 69002"],
      ["3ème / 6ème", "11 Rue Denfert-Rochereau, 69003"],
      ["4ème", "3 Rue de la Terrasse, 69004"],
      ["5ème", "15 Rue des Anges, 69005"],
      ["7ème / 8ème", "40 Rue Marius Berliet, 69008"],
      ["9ème", "29-31 Rue Berjon, 69009"],
    ],
  },
];
