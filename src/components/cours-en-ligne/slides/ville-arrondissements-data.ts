import type { Slide } from "./t3p-partie1-data";

export const VILLE_ARRONDISSEMENTS_SLIDES: Slide[] = [
  {
    type: "title",
    title: "Lyon et ses Arrondissements",
    subtitle: "Les 9 arrondissements de Lyon et leurs caractéristiques",
    footer: "Connaissances de la ville — Module 7",
    brand: "FTRANSPORT",
  },
  {
    type: "content",
    title: "📍 Lyon 1er arrondissement",
    blocks: [
      { heading: "Places", color: "#ef4444", points: ["Église Saint-Nizier — Place Saint-Nizier", "Musée des Beaux-Arts — 20 Place des Terreaux", "Commissariat du 1er — 19 Place Louis Pradel", "Mairie de Lyon 1 — 2 Place Sathonay", "Opéra — Place de la Comédie", "La Cour des Voraces — 9 Place Colbert"] },
      { heading: "Quais", color: "#3b82f6", points: ["DRAC — 6 Quai Saint-Vincent", "Quai André Lassagne"] },
      { heading: "Rues", color: "#10b981", points: ["Anciens Combattants — 3 Rue Louis Vitet", "Clinique Saint-Charles — 25 Rue de Flesselles", "La Mère Brazier — 12 Rue Royale"] },
    ],
  },
  {
    type: "content",
    title: "📍 Lyon 2ème arrondissement",
    blocks: [
      { heading: "Places", color: "#ef4444", points: ["Archives Municipales — 1 Place des Archives", "Office du Tourisme — Place Bellecour", "Théâtre des Célestins — Place des Célestins", "Station taxis — 1 Place des Cordeliers"] },
      { heading: "Rues", color: "#10b981", points: ["CCI — 23 Rue de la Bourse", "Mairie du 2e — 2 Rue d'Enghien", "Commissariat — 47 Rue de la Charité", "Gendarmerie — 2 Rue Bichat"] },
      { heading: "Quais", color: "#3b82f6", points: ["Consulat USA — 1 Quai Jules Courmont", "Musée Confluences — 86 Quai Perrache", "Sofitel — 20 Quai Dr Gailleton"] },
    ],
    keyRule: "Il n'y a pas de Boulevard dans le 2ème arrondissement de Lyon.",
  },
  {
    type: "content",
    title: "📍 Lyon 3ème arrondissement",
    blocks: [
      { heading: "Boulevards", color: "#ef4444", points: ["Bibliothèque Part-Dieu — 30 Bd Marius Vivier Merle", "Hôpital Desgenettes — 108 Bd Pinel"] },
      { heading: "Rues", color: "#10b981", points: ["Archives dép. — 34 Rue Gal Mouton Duvernet", "Grand Lyon — 20 Rue du Lac", "INSEE — 165 Rue Garibaldi"] },
      { heading: "Places", color: "#8b5cf6", points: ["Gare Part-Dieu — 5 Place Charles Béraudier", "Hôpital Herriot — 5 Place d'Arsonval"] },
    ],
  },
  {
    type: "content",
    title: "📍 Lyon 4ème arrondissement",
    blocks: [
      { heading: "Boulevards", color: "#ef4444", points: ["Mairie du 4e — 133 Bd de la Croix Rousse"] },
      { heading: "Rues", color: "#10b981", points: ["Commissariat — 3 Rue de la Terrasse", "Hôpital Croix Rousse — 93 Grande Rue", "Maison des Canuts — 10 Rue d'Ivry", "Kyriad — 48 Rue Hénon", "Cimetière — 63 Rue Ph. de Lassalle"] },
      { heading: "Quais", color: "#3b82f6", points: ["Lyon Métropole Hôtel — 85 Quai Joseph Gillet"] },
    ],
  },
  {
    type: "content",
    title: "📍 Lyon 5ème arrondissement",
    blocks: [
      { heading: "Places", color: "#ef4444", points: ["Cathédrale Saint-Jean — Place Saint-Jean", "Basilique Fourvière — 8 Place de Fourvière", "Gare Saint-Paul — Place Saint-Paul"] },
      { heading: "Rues", color: "#10b981", points: ["Cimetière Loyasse — 43 Rue Card. Gerlier", "Mairie du 5e — 14 Rue Dr Edmond Locard", "Commissariat — 15 Rue des Anges", "Lugdunum — 17 Rue Cléberg"] },
      { heading: "Montées", color: "#8b5cf6", points: ["Villa Florentine — 25 Montée Saint-Barthélémy", "Conservatoire — 4 Montée Card. Decourtray"] },
    ],
  },
  {
    type: "content",
    title: "📍 Lyon 6ème arrondissement",
    blocks: [
      { heading: "Avenues", color: "#ef4444", points: ["Gouverneur Militaire — 38 Av. Maréchal Foch"] },
      { heading: "Places / Quais", color: "#3b82f6", points: ["Parc Tête d'Or — Place Gal Leclerc", "INTERPOL — 200 Quai Charles de Gaulle"] },
      { heading: "Boulevards", color: "#10b981", points: ["Clinique du Parc — 155 Bd Stalingrad", "La Reine Astrid — 24 Bd des Belges"] },
      { heading: "Rues", color: "#8b5cf6", points: ["Mairie du 6e — 58 Rue de Sèze", "Consulat Pologne — 79 Rue Crillon", "Consulat Algérie — 126 Rue Vauban"] },
    ],
  },
  {
    type: "content",
    title: "📍 Lyon 7ème, 8ème et 9ème",
    blocks: [
      { heading: "Lyon 7ème", color: "#ef4444", points: ["Mairie — 16 Place Jean Macé", "Halle Tony Garnier — 20 Pl. Mérieux", "Chambre Agriculture — 23 Rue J. Baldassini", "Fourrière — 38 Rue P. Sémard"] },
      { heading: "Lyon 8ème", color: "#f59e0b", points: ["Mairie — 12 Av. Jean Mermoz", "Clinique Natecia — 22 Av. Rockefeller", "Institut Lumière — 25 Rue 1er Film", "Commissariat — 40 Rue M. Berliet"] },
      { heading: "Lyon 9ème", color: "#8b5cf6", points: ["Mairie — 6 Place du Marché", "Clinique Sauvegarde — 480 Av. Ben Gourion", "Commissariat — 29 Rue Berjon", "Gare Vaise — 3 Rue du 24 Mars 1852"] },
    ],
  },
  {
    type: "content",
    title: "📍 Villeurbanne et Environs",
    blocks: [
      { heading: "Villeurbanne", color: "#06b6d4", points: ["CPAM — 276 Cours Émile Zola", "INSA — 20 Av. Albert Einstein", "Double Mixte — 19 Av. Gaston Berger", "Mairie — Place Dr Lazare Goujon", "Transbordeur — 3 Bd Stalingrad", "TNP — 8 Place Dr L. Goujon"] },
      { heading: "Parcs", color: "#10b981", points: ["Tête d'Or — Place Gal Leclerc, 69006", "Blandan — 37 Rue du Repos, 69007", "Parc des Hauteurs — Espl. de Fourvière, 69005", "Parc de la Cerisaie — 25 Rue Chazière, 69004"] },
    ],
  },
];
