import type { Slide } from "./t3p-partie1-data";
import diversImg from "@/assets/ville/divers.jpg";

export const VILLE_DIVERS_SLIDES: Slide[] = [
  {
    type: "title",
    title: "Les Divers",
    subtitle: "Autres lieux importants à connaître pour un chauffeur",
    footer: "Connaissances de la ville — Module 7",
    brand: "FTRANSPORT",
    image: diversImg,
  },
  {
    type: "content",
    title: "📍 Lieux divers — Partie 1",
    blocks: [
      { heading: "1. Direction Dép. Anciens Combattants", color: "#ef4444", points: ["📍 3 Rue Louis Vitet, 69001 Lyon"] },
      { heading: "2. Banque de France", color: "#f59e0b", points: ["📍 4bis Cours Bayard, 69002 Lyon"] },
      { heading: "3. Chambre Régionale d'Agriculture", color: "#10b981", points: ["📍 23 Rue Jean Baldassini, 69007 Lyon"] },
      { heading: "4. Conseil Régional Auvergne-Rhône-Alpes", color: "#8b5cf6", points: ["📍 1 Esplanade François Mitterrand, 69002 Lyon"] },
    ],
  },
  {
    type: "content",
    title: "📍 Lieux divers — Partie 2",
    blocks: [
      { heading: "5. Direction Rég. Affaires Culturelles", color: "#ec4899", points: ["📍 6 Quai Saint-Vincent, 69001 Lyon"] },
      { heading: "6. Direction Rég. Pôle Emploi", color: "#06b6d4", points: ["📍 13 Rue Crépet, 69007 Lyon"] },
      { heading: "7. ENS – Site Monod", color: "#ef4444", points: ["📍 46 Allée d'Italie, 69007 Lyon"] },
      { heading: "8. ENS – Site Descartes", color: "#f59e0b", points: ["📍 15 Parvis Renée Descartes, 69007 Lyon"] },
    ],
  },
  {
    type: "content",
    title: "📍 Lieux divers — Partie 3",
    blocks: [
      { heading: "9. Fourrière Municipale", color: "#10b981", points: ["📍 38 Rue Pierre Sémard, 69007 Lyon"] },
      { heading: "10. Gendarmerie Dép. du Rhône", color: "#8b5cf6", points: ["📍 2 Rue Bichat, 69002 Lyon"] },
      { heading: "11. Villa Maia Hospitality", color: "#ec4899", points: ["📍 8 Rue du Pr Pierre Marion, 69005 Lyon"] },
      { heading: "12. Théâtre des Célestins", color: "#06b6d4", points: ["📍 Place des Célestins, 69002 Lyon"] },
    ],
  },
  {
    type: "content",
    title: "📍 Lieux divers — Partie 4",
    blocks: [
      { heading: "13. Tribunal d'Instance Villeurbanne", color: "#ef4444", points: ["📍 3 Rue Dr P. Fleury Papillon, 69100 Villeurbanne"] },
      { heading: "14. Cimetière de Loyasse", color: "#f59e0b", points: ["📍 43 Rue du Cardinal Gerlier, 69005 Lyon"] },
      { heading: "15. Cimetière de la Croix Rousse", color: "#10b981", points: ["📍 63 Rue Philippe de Lassalle, 69004 Lyon"] },
      { heading: "16. Institut Lumière", color: "#8b5cf6", points: ["📍 25 Rue du Premier Film, 69008 Lyon"] },
      { heading: "17. La Cour des Voraces", color: "#ec4899", points: ["📍 9 Place Colbert, 69001 Lyon"] },
    ],
  },
  {
    type: "table",
    title: "📋 Récapitulatif — Les Divers",
    headers: ["N°", "Lieu", "Adresse"],
    rows: [
      ["1", "Anciens Combattants", "3 Rue L. Vitet, 69001"],
      ["2", "Banque de France", "4bis Cours Bayard, 69002"],
      ["3", "Chambre Rég. Agriculture", "23 Rue J. Baldassini, 69007"],
      ["4", "Conseil Régional AURA", "1 Espl. F. Mitterrand, 69002"],
      ["5", "DRAC", "6 Quai St-Vincent, 69001"],
      ["6", "Dir. Rég. Pôle Emploi", "13 Rue Crépet, 69007"],
      ["7", "ENS Monod", "46 Allée d'Italie, 69007"],
      ["8", "ENS Descartes", "15 Parvis R. Descartes, 69007"],
      ["9", "Fourrière", "38 Rue P. Sémard, 69007"],
      ["10", "Gendarmerie", "2 Rue Bichat, 69002"],
      ["11", "Villa Maia", "8 Rue Pr P. Marion, 69005"],
      ["12", "Théâtre Célestins", "Pl. des Célestins, 69002"],
      ["13", "Tribunal Villeurbanne", "3 Rue Dr Papillon, 69100"],
      ["14", "Cimetière Loyasse", "43 Rue Card. Gerlier, 69005"],
      ["15", "Cimetière Croix Rousse", "63 Rue Ph. de Lassalle, 69004"],
      ["16", "Institut Lumière", "25 Rue 1er Film, 69008"],
      ["17", "Cour des Voraces", "9 Pl. Colbert, 69001"],
    ],
  },
];
