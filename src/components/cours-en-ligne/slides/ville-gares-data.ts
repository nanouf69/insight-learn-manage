import type { Slide } from "./t3p-partie1-data";

export const VILLE_GARES_SLIDES: Slide[] = [
  {
    type: "title",
    title: "Les Gares",
    subtitle: "Les principales gares SNCF de Lyon et leur localisation",
    footer: "Connaissances de la ville — Module 7",
    brand: "FTRANSPORT",
  },
  {
    type: "content",
    title: "🚂 Gare SNCF de Perrache",
    blocks: [
      { heading: "📍 Adresse", color: "#ef4444", points: ["14 Cours de Verdun, 69002 Lyon"] },
      { heading: "📌 Infos", color: "#3b82f6", points: ["2ème arrondissement", "Gare terminus au sud de la Presqu'île", "Dessert le TGV et les TER"] },
    ],
  },
  {
    type: "content",
    title: "🚂 Gare SNCF de Saint-Paul",
    blocks: [
      { heading: "📍 Adresse", color: "#ef4444", points: ["Place Saint-Paul, 69005 Lyon"] },
      { heading: "📌 Infos", color: "#3b82f6", points: ["5ème arrondissement", "Vieux-Lyon", "Desserte locale (Ouest Lyonnais)"] },
    ],
  },
  {
    type: "content",
    title: "🚂 Gare de Vaise",
    blocks: [
      { heading: "📍 Adresse", color: "#ef4444", points: ["3 Rue du 24 Mars 1852, 69009 Lyon"] },
      { heading: "📌 Infos", color: "#3b82f6", points: ["9ème arrondissement", "Quartier de Vaise", "Desserte TER vers l'Ouest"] },
    ],
  },
  {
    type: "content",
    title: "🚂 Gare Part-Dieu",
    blocks: [
      { heading: "📍 Adresse", color: "#ef4444", points: ["5 Place Charles Béraudier, 69003 Lyon"] },
      { heading: "📌 Infos", color: "#f59e0b", points: ["3ème arrondissement", "Gare principale de Lyon", "Plus grande gare de correspondance européenne", "TGV, TER, Intercités"] },
    ],
  },
  {
    type: "content",
    title: "🚂 Gare de Jean Macé",
    blocks: [
      { heading: "📍 Adresse", color: "#ef4444", points: ["Place Jean Macé, 69007 Lyon"] },
      { heading: "📌 Infos", color: "#3b82f6", points: ["7ème arrondissement", "Gare TER et TGV récente", "Connexion métro ligne B"] },
    ],
  },
  {
    type: "table",
    title: "📋 Récapitulatif — Les Gares",
    headers: ["Gare", "Adresse", "Arrondissement"],
    rows: [
      ["Perrache", "14 Cours de Verdun, 69002", "Lyon 2ème"],
      ["Saint-Paul", "Place Saint-Paul, 69005", "Lyon 5ème"],
      ["Vaise", "3 Rue du 24 Mars 1852, 69009", "Lyon 9ème"],
      ["Part-Dieu", "5 Place Charles Béraudier, 69003", "Lyon 3ème"],
      ["Jean Macé", "Place Jean Macé, 69007", "Lyon 7ème"],
    ],
  },
];
