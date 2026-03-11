import type { Slide } from "./t3p-partie1-data";

export const VILLE_HOPITAUX_SLIDES: Slide[] = [
  {
    type: "title",
    title: "Les Hôpitaux",
    subtitle: "Hôpitaux et cliniques de Lyon et sa métropole",
    footer: "Connaissances de la ville — Module 7",
    brand: "FTRANSPORT",
  },
  {
    type: "content",
    title: "🏥 Hôpitaux — Partie 1",
    blocks: [
      { heading: "1. Hôpital de la Croix Rousse", color: "#ef4444", points: ["📍 103 Grande Rue de la Croix Rousse, 69004 Lyon", "4ème arrondissement"] },
      { heading: "2. Hôpital Édouard Herriot", color: "#f59e0b", points: ["📍 5 Place d'Arsonval, 69003 Lyon", "3ème arrondissement — HCL"] },
      { heading: "3. Hôpital Privé Jean Mermoz", color: "#10b981", points: ["📍 55 Avenue Jean Mermoz, 69008 Lyon", "8ème arrondissement — Ramsay Santé"] },
    ],
  },
  {
    type: "content",
    title: "🏥 Hôpitaux — Partie 2",
    blocks: [
      { heading: "4. Centre Médico-Chirurgical des Massues", color: "#8b5cf6", points: ["📍 92 Rue Dr Edmond Locard, 69005 Lyon", "5ème arrondissement"] },
      { heading: "5. Clinique de l'Infirmerie Protestante", color: "#ec4899", points: ["📍 3 Chemin du Penthod, 69300 Caluire-et-Cuire"] },
      { heading: "6. Clinique Saint-Charles", color: "#06b6d4", points: ["📍 25 Rue de Flesselles, 69001 Lyon", "1er arrondissement"] },
    ],
  },
  {
    type: "content",
    title: "🏥 Hôpitaux — Partie 3",
    blocks: [
      { heading: "7. Clinique de la Sauvegarde", color: "#ef4444", points: ["📍 480 Avenue Ben Gourion, 69009 Lyon", "9ème arrondissement"] },
      { heading: "8. Clinique du Val d'Ouest", color: "#f59e0b", points: ["📍 39 Chemin de la Vernique, 69130 Écully"] },
      { heading: "9. Hôpital Femme-Mère-Enfant", color: "#10b981", points: ["📍 59 Boulevard Pinel, 69500 Bron", "Groupement Hospitalier Est — HCL"] },
    ],
  },
  {
    type: "content",
    title: "🏥 Hôpitaux — Partie 4",
    blocks: [
      { heading: "10. Hôpital Pierre Wertheimer", color: "#8b5cf6", points: ["📍 59 Boulevard Pinel, 69500 Bron", "Neurologie — HCL"] },
      { heading: "11. Hôpital Cardiovasculaire Louis-Pradel", color: "#ec4899", points: ["📍 59 Boulevard Pinel, 69500 Bron", "Cardiologie et pneumologie — HCL"] },
      { heading: "12. Centre Hospitalier Lyon Sud", color: "#06b6d4", points: ["📍 165 Chemin du Grand Revoye, 69310 Pierre-Bénite"] },
    ],
  },
  {
    type: "content",
    title: "🏥 Hôpitaux — Partie 5",
    blocks: [
      { heading: "13. GHM Les Portes du Sud", color: "#ef4444", points: ["📍 2 Avenue du 11 Novembre 1918, 69200 Vénissieux"] },
      { heading: "14. Clinique Natecia", color: "#f59e0b", points: ["📍 22 Avenue Rockefeller, 69008 Lyon", "8ème arrondissement"] },
      { heading: "15. Clinique Charcot", color: "#10b981", points: ["📍 51-53 Rue Commandant Charcot, 69110 Sainte-Foy-lès-Lyon"] },
    ],
  },
  {
    type: "content",
    title: "🏥 Hôpitaux — Partie 6",
    blocks: [
      { heading: "16. Hôpital des Armées Desgenettes", color: "#8b5cf6", points: ["📍 108 Boulevard Pinel, 69003 Lyon", "3ème arrondissement"] },
      { heading: "17. Centre Hospitalier Le Vinatier", color: "#ec4899", points: ["📍 95 Boulevard Pinel, 69500 Bron", "Psychiatrie"] },
      { heading: "18. Centre Hospitalier Saint-Jean-de-Dieu", color: "#06b6d4", points: ["📍 290 Route de Vienne, 69008 Lyon"] },
      { heading: "19. Médipôle", color: "#f59e0b", points: ["📍 158 Rue Léon Blum, 69100 Villeurbanne"] },
    ],
  },
  {
    type: "table",
    title: "📋 Récapitulatif — Les Hôpitaux",
    headers: ["N°", "Nom", "Adresse"],
    rows: [
      ["1", "Hôpital Croix Rousse", "103 Gde Rue Croix Rousse, 69004"],
      ["2", "Hôpital Édouard Herriot", "5 Pl. d'Arsonval, 69003"],
      ["3", "Hôpital Jean Mermoz", "55 Av. Jean Mermoz, 69008"],
      ["4", "Centre des Massues", "92 Rue Dr Locard, 69005"],
      ["5", "Infirmerie Protestante", "3 Ch. du Penthod, 69300"],
      ["6", "Clinique Saint-Charles", "25 Rue Flesselles, 69001"],
      ["7", "Clinique Sauvegarde", "480 Av. Ben Gourion, 69009"],
      ["8", "Clinique Val d'Ouest", "39 Ch. de la Vernique, 69130"],
      ["9", "Hôp. Femme-Mère-Enfant", "59 Bd Pinel, 69500"],
      ["10", "Hôp. Pierre Wertheimer", "59 Bd Pinel, 69500"],
      ["11", "Hôp. Louis-Pradel", "59 Bd Pinel, 69500"],
      ["12", "CH Lyon Sud", "165 Ch. Grand Revoye, 69310"],
      ["13", "GHM Portes du Sud", "2 Av. du 11 Nov., 69200"],
      ["14", "Clinique Natecia", "22 Av. Rockefeller, 69008"],
      ["15", "Clinique Charcot", "51 Rue Cdt Charcot, 69110"],
      ["16", "Hôp. Desgenettes", "108 Bd Pinel, 69003"],
      ["17", "CH Le Vinatier", "95 Bd Pinel, 69500"],
      ["18", "CH St-Jean-de-Dieu", "290 Rte de Vienne, 69008"],
      ["19", "Médipôle", "158 Rue Léon Blum, 69100"],
    ],
  },
];
