import type { Slide } from "./t3p-partie1-data";
import hotelsImg from "@/assets/ville/hotels.jpg";

export const VILLE_HOTELS_SLIDES: Slide[] = [
  {
    type: "title",
    title: "Les Hôtels",
    subtitle: "Principaux hôtels de Lyon à connaître",
    footer: "Connaissances de la ville — Module 7",
    brand: "FTRANSPORT",
    image: hotelsImg,
  },
  {
    type: "content",
    title: "🏨 Hôtels — Cité Internationale / Bellecour",
    blocks: [
      { heading: "1. Marriott Lyon", color: "#ef4444", points: ["📍 70 Quai Charles de Gaulle, 69006 Lyon"] },
      { heading: "2. Crowne Plaza Lyon", color: "#f59e0b", points: ["📍 22 Quai Charles de Gaulle, 69006 Lyon"] },
      { heading: "3. Hôtel du Palais des Congrès", color: "#10b981", points: ["📍 50 Quai Charles de Gaulle, 69006 Lyon"] },
      { heading: "4. Sofitel Lyon Bellecour", color: "#8b5cf6", points: ["📍 20 Quai Docteur Gailleton, 69002 Lyon"] },
    ],
  },
  {
    type: "content",
    title: "🏨 Hôtels — Centre et Fourvière",
    blocks: [
      { heading: "5. Campanile Lyon Centre 2ème", color: "#ec4899", points: ["📍 17 Place Carnot, 69002 Lyon"] },
      { heading: "6. Hôtel de Fourvière", color: "#06b6d4", points: ["📍 23 Rue Roger Radisson, 69005 Lyon"] },
      { heading: "7. Hôtel des Congrès Villeurbanne", color: "#ef4444", points: ["📍 Place du Commandant Rivière, 69100 Villeurbanne"] },
      { heading: "8. Novotel Lyon Confluence", color: "#f59e0b", points: ["📍 3 Rue Paul Montrochet, 69002 Lyon"] },
    ],
  },
  {
    type: "content",
    title: "🏨 Hôtels — Part-Dieu et Croix-Rousse",
    blocks: [
      { heading: "9. Hôtel Lacassagne", color: "#10b981", points: ["📍 245 Avenue Lacassagne, 69003 Lyon"] },
      { heading: "10. Mercure Lyon Centre Lumière", color: "#8b5cf6", points: ["📍 71 Cours Albert Thomas, 69003 Lyon"] },
      { heading: "11. Hôtel de la Croix Rousse", color: "#ec4899", points: ["📍 157 Boulevard de la Croix Rousse, 69004 Lyon"] },
      { heading: "12. Kyriad Lyon Croix Rousse", color: "#06b6d4", points: ["📍 48 Rue Hénon, 69004 Lyon"] },
    ],
  },
  {
    type: "content",
    title: "🏨 Hôtels — Vieux-Lyon et prestige",
    blocks: [
      { heading: "13. Lyon Métropole Hôtel", color: "#ef4444", points: ["📍 85 Quai Joseph Gillet, 69004 Lyon"] },
      { heading: "14. La Cour des Loges", color: "#f59e0b", points: ["📍 6 Rue du Bœuf, 69005 Lyon", "Hôtel 5 étoiles — Vieux-Lyon"] },
      { heading: "15. Collège Hôtel", color: "#10b981", points: ["📍 5 Place Saint-Paul, 69005 Lyon"] },
      { heading: "16. Villa Florentine", color: "#8b5cf6", points: ["📍 25 Montée Saint-Barthélémy, 69005 Lyon", "Hôtel 5 étoiles — Fourvière"] },
    ],
  },
  {
    type: "content",
    title: "🏨 Hôtels — Suite et fin",
    blocks: [
      { heading: "17. Le Phénix Hôtel", color: "#ec4899", points: ["📍 7 Quai de Bondy, 69005 Lyon"] },
      { heading: "18. Ibis Lyon Gerland", color: "#06b6d4", points: ["📍 68 Avenue Général Leclerc, 69007 Lyon"] },
      { heading: "19. Novotel Lyon Gerland", color: "#ef4444", points: ["📍 70 Avenue Général Leclerc, 69007 Lyon"] },
      { heading: "20. Best Western Saphir Lyon", color: "#f59e0b", points: ["📍 18 Rue Louis Loucheur, 69009 Lyon"] },
      { heading: "21. Hôtel Ariana", color: "#10b981", points: ["📍 163 Cours Émile Zola, 69100 Villeurbanne"] },
    ],
  },
  {
    type: "table",
    title: "📋 Récapitulatif — Les Hôtels",
    headers: ["N°", "Hôtel", "Adresse"],
    rows: [
      ["1", "Marriott", "70 Quai C. de Gaulle, 69006"],
      ["2", "Crowne Plaza", "22 Quai C. de Gaulle, 69006"],
      ["3", "Palais des Congrès", "50 Quai C. de Gaulle, 69006"],
      ["4", "Sofitel Bellecour", "20 Quai Dr Gailleton, 69002"],
      ["5", "Campanile", "17 Pl. Carnot, 69002"],
      ["6", "Hôtel de Fourvière", "23 Rue R. Radisson, 69005"],
      ["7", "Hôtel des Congrès", "Pl. Cdt Rivière, 69100"],
      ["8", "Novotel Confluence", "3 Rue P. Montrochet, 69002"],
      ["9", "Lacassagne", "245 Av. Lacassagne, 69003"],
      ["10", "Mercure Lumière", "71 Cours A. Thomas, 69003"],
      ["11", "Croix Rousse", "157 Bd Croix Rousse, 69004"],
      ["12", "Kyriad Croix Rousse", "48 Rue Hénon, 69004"],
      ["13", "Lyon Métropole", "85 Quai J. Gillet, 69004"],
      ["14", "Cour des Loges ★★★★★", "6 Rue du Bœuf, 69005"],
      ["15", "Collège Hôtel", "5 Pl. Saint-Paul, 69005"],
      ["16", "Villa Florentine ★★★★★", "25 Montée St-Barth., 69005"],
      ["17", "Le Phénix", "7 Quai de Bondy, 69005"],
      ["18", "Ibis Gerland", "68 Av. Gal Leclerc, 69007"],
      ["19", "Novotel Gerland", "70 Av. Gal Leclerc, 69007"],
      ["20", "Best Western Saphir", "18 Rue L. Loucheur, 69009"],
      ["21", "Ariana", "163 Cours É. Zola, 69100"],
    ],
  },
];
