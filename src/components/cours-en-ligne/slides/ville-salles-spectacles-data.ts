import type { Slide } from "./t3p-partie1-data";
import sallesImg from "@/assets/ville/salles-spectacles.jpg";

export const VILLE_SALLES_SPECTACLES_SLIDES: Slide[] = [
  {
    type: "title",
    title: "Les Salles de Spectacles",
    subtitle: "Théâtres, salles de concert et lieux de spectacle",
    footer: "Connaissances de la ville — Module 7",
    brand: "FTRANSPORT",
    image: sallesImg,
  },
  {
    type: "content",
    title: "🎭 Salles — Partie 1",
    blocks: [
      { heading: "1. Halle Tony Garnier", color: "#ef4444", points: ["📍 20 Place Charles et Christophe Mérieux, 69007 Lyon", "7ème arr. — Grande salle de concerts et spectacles"] },
      { heading: "2. Le Transbordeur", color: "#f59e0b", points: ["📍 3 Boulevard Stalingrad, 69100 Villeurbanne", "Concerts dans ancienne usine"] },
      { heading: "3. Maison de la Danse", color: "#10b981", points: ["📍 8 Avenue Jean Mermoz, 69008 Lyon", "8ème arr. — Spectacles classiques et contemporains"] },
    ],
  },
  {
    type: "content",
    title: "🎭 Salles — Partie 2",
    blocks: [
      { heading: "4. Palais des Sports de Gerland", color: "#8b5cf6", points: ["📍 350 Avenue Jean Jaurès, 69007 Lyon", "7ème arr. — Sports et événements"] },
      { heading: "5. Auditorium – Orchestre National de Lyon", color: "#ec4899", points: ["📍 149 Rue Garibaldi, 69003 Lyon", "3ème arr. — Musique classique et concerts"] },
      { heading: "6. Salle Debussy – Conservatoire de Fourvière", color: "#06b6d4", points: ["📍 4 Montée Cardinal Decourtray, 69005 Lyon", "5ème arr."] },
    ],
  },
  {
    type: "content",
    title: "🎭 Salles — Partie 3",
    blocks: [
      { heading: "7. Salle Rameau", color: "#ef4444", points: ["📍 29 Rue de la Martinière, 69001 Lyon", "1er arr."] },
      { heading: "8. Double Mixte Villeurbanne", color: "#f59e0b", points: ["📍 19 Avenue Gaston Berger, 69100 Villeurbanne", "Salle de spectacles et événements"] },
    ],
  },
  {
    type: "table",
    title: "📋 Récapitulatif — Les Salles de Spectacles",
    headers: ["Salle", "Adresse"],
    rows: [
      ["Halle Tony Garnier", "20 Pl. Ch. et C. Mérieux, 69007"],
      ["Le Transbordeur", "3 Bd Stalingrad, 69100"],
      ["Maison de la Danse", "8 Av. Jean Mermoz, 69008"],
      ["Palais des Sports Gerland", "350 Av. Jean Jaurès, 69007"],
      ["Auditorium ONL", "149 Rue Garibaldi, 69003"],
      ["Salle Debussy", "4 Montée Card. Decourtray, 69005"],
      ["Salle Rameau", "29 Rue de la Martinière, 69001"],
      ["Double Mixte", "19 Av. Gaston Berger, 69100"],
    ],
  },
];
