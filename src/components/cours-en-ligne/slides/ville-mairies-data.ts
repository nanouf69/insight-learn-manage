import type { Slide } from "./t3p-partie1-data";
import mairiesImg from "@/assets/ville/mairies.jpg";

export const VILLE_MAIRIES_SLIDES: Slide[] = [
  {
    type: "title",
    title: "Les Mairies",
    subtitle: "Mairies d'arrondissement et mairies de communes",
    footer: "Connaissances de la ville — Module 7",
    brand: "FTRANSPORT",
    image: mairiesImg,
  },
  {
    type: "content",
    title: "🏛️ Mairies — Lyon 1er au 3ème",
    blocks: [
      { heading: "1. Mairie du 1er arrondissement", color: "#ef4444", points: ["📍 2 Place Sathonay, 69001 Lyon"] },
      { heading: "2. Mairie du 2ème arrondissement", color: "#f59e0b", points: ["📍 2 Rue d'Enghien, 69002 Lyon"] },
      { heading: "3. Mairie du 3ème arrondissement", color: "#10b981", points: ["📍 18 Rue François Garcin, 69003 Lyon"] },
    ],
  },
  {
    type: "content",
    title: "🏛️ Mairies — Lyon 4ème au 6ème",
    blocks: [
      { heading: "4. Mairie du 4ème arrondissement", color: "#8b5cf6", points: ["📍 133 Boulevard de la Croix Rousse, 69004 Lyon"] },
      { heading: "5. Mairie du 5ème arrondissement", color: "#ec4899", points: ["📍 14 Rue Dr Edmond Locard, 69005 Lyon"] },
      { heading: "6. Mairie du 5ème (Annexe)", color: "#06b6d4", points: ["📍 5 Place du Petit Collège, 69005 Lyon"] },
      { heading: "7. Mairie du 6ème arrondissement", color: "#f59e0b", points: ["📍 58 Rue de Sèze, 69006 Lyon"] },
    ],
  },
  {
    type: "content",
    title: "🏛️ Mairies — Lyon 7ème au 9ème",
    blocks: [
      { heading: "8. Mairie du 7ème arrondissement", color: "#ef4444", points: ["📍 16 Place Jean Macé, 69007 Lyon"] },
      { heading: "9. Mairie du 8ème arrondissement", color: "#10b981", points: ["📍 12 Avenue Jean Mermoz, 69008 Lyon"] },
      { heading: "10. Mairie du 9ème arrondissement", color: "#8b5cf6", points: ["📍 6 Place du Marché, 69009 Lyon"] },
    ],
  },
  {
    type: "content",
    title: "🏛️ Mairies — Communes environnantes",
    blocks: [
      { heading: "11. Mairie de Caluire-et-Cuire", color: "#ec4899", points: ["📍 Place du Dr Frédéric Dugoujon, 69300 Caluire-et-Cuire"] },
      { heading: "12. Mairie de Villeurbanne", color: "#06b6d4", points: ["📍 Place du Dr Lazare Goujon, 69100 Villeurbanne"] },
    ],
  },
  {
    type: "table",
    title: "📋 Récapitulatif — Les Mairies",
    headers: ["Mairie", "Adresse"],
    rows: [
      ["1er arr.", "2 Place Sathonay, 69001"],
      ["2ème arr.", "2 Rue d'Enghien, 69002"],
      ["3ème arr.", "18 Rue François Garcin, 69003"],
      ["4ème arr.", "133 Bd de la Croix Rousse, 69004"],
      ["5ème arr.", "14 Rue Dr Edmond Locard, 69005"],
      ["5ème (Annexe)", "5 Place du Petit Collège, 69005"],
      ["6ème arr.", "58 Rue de Sèze, 69006"],
      ["7ème arr.", "16 Place Jean Macé, 69007"],
      ["8ème arr.", "12 Avenue Jean Mermoz, 69008"],
      ["9ème arr.", "6 Place du Marché, 69009"],
      ["Caluire-et-Cuire", "Pl. Dr Dugoujon, 69300"],
      ["Villeurbanne", "Pl. Dr Lazare Goujon, 69100"],
    ],
  },
];
