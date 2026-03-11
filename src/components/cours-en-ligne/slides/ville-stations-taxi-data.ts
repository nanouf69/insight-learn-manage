import type { Slide } from "./t3p-partie1-data";
import stationsTaxiImg from "@/assets/ville/stations-taxi.jpg";

export const VILLE_STATIONS_TAXI_SLIDES: Slide[] = [
  {
    type: "title",
    title: "Stations de Taxi",
    subtitle: "Emplacements des stations de taxi à Lyon",
    footer: "Connaissances de la ville — Module 7",
    brand: "FTRANSPORT",
    image: stationsTaxiImg,
  },
  {
    type: "content",
    title: "🚕 Stations — Lyon 1er",
    blocks: [
      { heading: "Station Rue Pdt Édouard Herriot", color: "#f59e0b", points: ["📍 69001 Lyon 1er", "Devant La Poste des Terreaux"] },
    ],
  },
  {
    type: "content",
    title: "🚕 Stations — Lyon 2ème",
    blocks: [
      { heading: "Station Place Bellecour", color: "#ef4444", points: ["📍 69002 Lyon 2ème", "Entre la Rue Victor Hugo et la Rue Boissac"] },
      { heading: "Station Cours Charlemagne", color: "#10b981", points: ["📍 69002 Lyon 2ème", "Devant l'Établissement Français du Don du Sang"] },
      { heading: "Station Rue de la Barre", color: "#3b82f6", points: ["📍 69002 Lyon 2ème", "Entre Rue de la République et Rue Bellecordière"] },
      { heading: "Station Place Carnot", color: "#8b5cf6", points: ["📍 69002 Lyon 2ème", "Côté nord, entre Rue Victor Hugo et Rue Henri IV"] },
    ],
  },
  {
    type: "content",
    title: "🚕 Stations — Lyon 2ème (suite)",
    blocks: [
      { heading: "Station Quai Dr Gailleton", color: "#ec4899", points: ["📍 69002 Lyon 2ème", "Devant l'Hôtel Sofitel"] },
      { heading: "Station Place des Cordeliers", color: "#f59e0b", points: ["📍 69002 Lyon 2ème", "Devant Palais de la Bourse"] },
      { heading: "Station Place de la République", color: "#ef4444", points: ["📍 69002 Lyon 2ème", "Proche Rue Président Carnot"] },
      { heading: "Station Place des Jacobins", color: "#06b6d4", points: ["📍 69002 Lyon 2ème"] },
    ],
  },
  {
    type: "content",
    title: "🚕 Stations — Lyon 3ème",
    blocks: [
      { heading: "Station 105 Cours Albert Thomas", color: "#ef4444", points: ["📍 69003 Lyon 3ème", "Face Place Ambroise Courtois"] },
      { heading: "Station Place d'Arsonval", color: "#f59e0b", points: ["📍 69003 Lyon 3ème", "Station de l'Hôpital Édouard Herriot"] },
      { heading: "Station 78 Rue de Bonnel", color: "#10b981", points: ["📍 69003 Lyon 3ème", "Face aux Halles"] },
      { heading: "Station 12-15 Rue des Cuirassiers", color: "#8b5cf6", points: ["📍 69003 Lyon 3ème", "Sortie sud centre commercial Part-Dieu"] },
    ],
  },
  {
    type: "content",
    title: "🚕 Stations — Lyon 3ème (suite)",
    blocks: [
      { heading: "Station Bd Vivier Merle", color: "#ec4899", points: ["📍 69003 Lyon 3ème", "Face centre commercial"] },
      { heading: "Station Place Rouget de l'Isle", color: "#06b6d4", points: ["📍 69003 Lyon 3ème"] },
      { heading: "Station Bd Eugène Deruelle", color: "#ef4444", points: ["📍 69003 Lyon 3ème"] },
      { heading: "Station 40 Rue de la Villette", color: "#f59e0b", points: ["📍 69003 Lyon 3ème", "Sortie gare côté Villette"] },
    ],
  },
  {
    type: "content",
    title: "🚕 Stations — Lyon 3ème (fin) et 4ème",
    blocks: [
      { heading: "Station Place Charles Béraudier", color: "#10b981", points: ["📍 69003 Lyon 3ème", "Sortie gare côté Béraudier"] },
      { heading: "Station 67 Rue Servient", color: "#8b5cf6", points: ["📍 69003 Lyon 3ème"] },
      { heading: "Station Rue Aimé Collomb", color: "#ec4899", points: ["📍 69003 Lyon 3ème", "Côté sud, ouest du Cours de la Liberté"] },
      { heading: "Station Bd Croix-Rousse (Lyon 4ème)", color: "#f59e0b", points: ["📍 69004 Lyon 4ème"] },
      { heading: "Station Rue Philibert Roussy (Lyon 4ème)", color: "#06b6d4", points: ["📍 69004 Lyon 4ème"] },
    ],
  },
  {
    type: "content",
    title: "🚕 Stations — Lyon 5ème",
    blocks: [
      { heading: "Station 6 Rue de l'Antiquaille", color: "#ef4444", points: ["📍 69005 Lyon 5ème", "Entrée Théâtres Romains"] },
      { heading: "Station 1 Rue Joliot Curie", color: "#f59e0b", points: ["📍 69005 Lyon 5ème", "Angle Place Bénédicte Tessier"] },
      { heading: "Station Place Saint-Paul", color: "#10b981", points: ["📍 69005 Lyon 5ème", "Près Rue Octavio Mey"] },
      { heading: "Station Place Trion", color: "#8b5cf6", points: ["📍 69005 Lyon 5ème"] },
      { heading: "Station Place Paul Duquaire", color: "#ec4899", points: ["📍 69005 Lyon 5ème"] },
    ],
  },
  {
    type: "content",
    title: "🚕 Stations — Lyon 6ème",
    blocks: [
      { heading: "Station 51 Cours Vitton", color: "#ef4444", points: ["📍 69006 Lyon 6ème", "Angle Rue Masséna"] },
      { heading: "Station Place Gal Leclerc", color: "#f59e0b", points: ["📍 69006 Lyon 6ème", "Entrée Parc Tête d'Or"] },
      { heading: "Station 412 Bd Jules Favre", color: "#10b981", points: ["📍 69006 Lyon 6ème", "Métro Brotteaux"] },
      { heading: "Station Place Mal Lyautey", color: "#8b5cf6", points: ["📍 69006 Lyon 6ème", "Métro Foch"] },
      { heading: "Station 50 Quai C. de Gaulle", color: "#ec4899", points: ["📍 69006 Lyon 6ème", "Devant Palais des Congrès"] },
      { heading: "Station 23 Quai Gal Sarrail", color: "#06b6d4", points: ["📍 69006 Lyon 6ème", "Angle Pont Lafayette"] },
    ],
  },
  {
    type: "content",
    title: "🚕 Stations — Lyon 7ème, 8ème et 9ème",
    blocks: [
      { heading: "Lyon 7ème", color: "#ef4444", points: [
        "88 Gde Rue Guillotière — Angle Jean Jaurès",
        "16 Place Jean Macé — Métro Jean Macé",
        "2 Rue Jaboulay — Devant CH Saint-Joseph et Saint-Luc",
        "Rue Marie-Madeleine Foucarde — Angle Av. Jean Jaurès",
      ]},
      { heading: "Lyon 8ème", color: "#f59e0b", points: [
        "Place du 11 Nov. 1918 — Sur Av. Berthelot",
        "Rue Jacqueline Auriol — Devant Hôp. Jean Mermoz",
        "Rue du Pr Beauvisage — Face Place du 8 Mai 1945",
      ]},
      { heading: "Lyon 9ème", color: "#8b5cf6", points: [
        "Quai Jaÿr — Entre Rue Marietton et Pl. Pont Mouton",
        "Rue Sgt Michel Berthet — Face Métro Gorge de Loup",
        "8 Rue de la Navigation",
        "Rue du 24 Mars 1852 — Vers Métro Gare de Vaise",
      ]},
    ],
  },
];
