// Cas Pratique TAXI — données quiz pour le portail formateur
export const CAS_PRATIQUE_TAXI_EXERCICES = [
  {
    id: 300, titre: "Tarifs de base", actif: true,
    questions: [
      { id: 1, enonce: "Quel est le prix du tarif A ?", choix: [{ lettre: "A", texte: "0,96 €" }, { lettre: "B", texte: "1,00 €", correct: true }, { lettre: "C", texte: "1,34 €" }, { lettre: "D", texte: "1,85 €" }] },
      { id: 2, enonce: "Quel est le prix du tarif B ?", choix: [{ lettre: "A", texte: "1,50 €", correct: true }, { lettre: "B", texte: "1,49 €" }, { lettre: "C", texte: "1,51 €" }, { lettre: "D", texte: "2,58 €" }] },
      { id: 3, enonce: "Quel est le prix du tarif C ?", choix: [{ lettre: "A", texte: "0,78 €" }, { lettre: "B", texte: "1,47 €", correct: true }, { lettre: "C", texte: "1,59 €" }, { lettre: "D", texte: "2,00 €" }] },
      { id: 4, enonce: "Quel est le prix du tarif D ?", choix: [{ lettre: "A", texte: "2,90 €" }, { lettre: "B", texte: "2,91 €" }, { lettre: "C", texte: "3,00 €" }, { lettre: "D", texte: "2,94 €", correct: true }] },
    ]
  },
  {
    id: 301, titre: "Cas n°1 — 1er mai, 16h, réservation la veille, 66 rue Smith → Mairie Lyon 2 (2.3km)", actif: true,
    questions: [
      { id: 1, enonce: "Cas n°1 : 1er mai, 16h, client dans le véhicule, appelé hier soir, 66 rue Smith → Mairie Lyon 2 (2.3 km), 4 bagages dont 2 instruments. Quel tarif appliqué ?", choix: [{ lettre: "A", texte: "Tarif A" }, { lettre: "B", texte: "Tarif B", correct: true }] },
      { id: 2, enonce: "Cas n°1 : Quel est le coût de la réservation ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €", correct: true }, { lettre: "C", texte: "Pas de surplus" }] },
      { id: 3, enonce: "Cas n°1 : Quel est le coût des bagages supplémentaires ?", choix: [{ lettre: "A", texte: "2 €", correct: true }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "Pas de surplus" }] },
      { id: 4, enonce: "Cas n°1 : Quel est le coût total des suppléments (réservation + bagages + passagers) ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "6 €", correct: true }, { lettre: "D", texte: "8 €" }] },
      { id: 5, enonce: "Cas n°1 : Quel est le tarif total de la course ?", choix: [{ lettre: "A", texte: "11,20 €" }, { lettre: "B", texte: "12,20 €" }, { lettre: "C", texte: "15,90 €", correct: true }, { lettre: "D", texte: "17,50 €" }] },
    ]
  },
  {
    id: 302, titre: "Cas n°2 — 15 août, 6h, Hôpital St Foy → 66 rue Smith (6.6km)", actif: true,
    questions: [
      { id: 1, enonce: "Cas n°2 : 15 août, 6h, client demande de le chercher de suite à l'hôpital de St Foy les Lyon → 66 rue Smith (6.6 km), pas de bagages. Quel tarif appliqué ?", choix: [{ lettre: "A", texte: "Tarif A" }, { lettre: "B", texte: "Tarif B" }, { lettre: "C", texte: "Tarif C" }, { lettre: "D", texte: "Tarif D", correct: true }] },
      { id: 2, enonce: "Cas n°2 : Quel est le coût de la réservation ?", choix: [{ lettre: "A", texte: "2 €", correct: true }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "Pas de surplus" }] },
      { id: 3, enonce: "Cas n°2 : Quel est le coût des bagages supplémentaires ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "Pas de surplus", correct: true }] },
      { id: 4, enonce: "Cas n°2 : Quel est le coût total des suppléments ?", choix: [{ lettre: "A", texte: "2 €", correct: true }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "6 €" }, { lettre: "D", texte: "8 €" }] },
      { id: 5, enonce: "Cas n°2 : Quel est le tarif total de la course ?", choix: [{ lettre: "A", texte: "24,80 €", correct: true }, { lettre: "B", texte: "23,97 €" }, { lettre: "C", texte: "24,02 €" }, { lettre: "D", texte: "26,70 €" }] },
    ]
  },
  {
    id: 303, titre: "Cas n°3 — 19h, client hélé, 66 rue Smith → Mairie Oullins A/R (6.4km)", actif: true,
    questions: [
      { id: 1, enonce: "Cas n°3 : 19h, client vous hèle, 1 malle + 1 animal, 66 rue Smith → Mairie Oullins A/R (6.4 km aller simple). Quel tarif appliqué ?", choix: [{ lettre: "A", texte: "Tarif A", correct: true }, { lettre: "B", texte: "Tarif B" }, { lettre: "C", texte: "Tarif C" }, { lettre: "D", texte: "Tarif D" }] },
      { id: 2, enonce: "Cas n°3 : Quel est le coût de la réservation ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "Pas de surplus", correct: true }] },
      { id: 3, enonce: "Cas n°3 : Quel est le coût des bagages supplémentaires ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "Pas de surplus", correct: true }] },
      { id: 4, enonce: "Cas n°3 : Quel est le coût des passagers supplémentaires ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "Pas de surplus", correct: true }] },
      { id: 5, enonce: "Cas n°3 : Quel est le coût total des suppléments ?", choix: [{ lettre: "A", texte: "0 €", correct: true }, { lettre: "B", texte: "2 €" }, { lettre: "C", texte: "4 €" }] },
      { id: 6, enonce: "Cas n°3 : Quel est le tarif total de la course ?", choix: [{ lettre: "A", texte: "6 €" }, { lettre: "B", texte: "20,89 €" }, { lettre: "C", texte: "22,20 €", correct: true }, { lettre: "D", texte: "22,77 €" }] },
    ]
  },
  {
    id: 304, titre: "Cas n°4 — 24 déc, 23h50, appel immédiat, 66 rue Smith → Stade Gerland (3.1km)", actif: true,
    questions: [
      { id: 1, enonce: "Cas n°4 : 24 décembre, 23h50, on vous appelle pour emmener 5 personnes + 5 bagages au Stade de Gerland tout de suite (3.1 km). Quel tarif appliqué ?", choix: [{ lettre: "A", texte: "Tarif A" }, { lettre: "B", texte: "Tarif B", correct: true }] },
      { id: 2, enonce: "Cas n°4 : Quel est le coût de la réservation ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "Pas de surplus", correct: true }] },
      { id: 3, enonce: "Cas n°4 : Quel est le coût des bagages supplémentaires ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €", correct: true }, { lettre: "C", texte: "Pas de surplus" }] },
      { id: 4, enonce: "Cas n°4 : Quel est le coût des passagers supplémentaires ?", choix: [{ lettre: "A", texte: "3 €" }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "Pas de surplus" }] },
      { id: 5, enonce: "Cas n°4 : Quel est le coût total des suppléments ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "3 €" }, { lettre: "C", texte: "6 €", correct: true }, { lettre: "D", texte: "8 €" }] },
      { id: 6, enonce: "Cas n°4 : Quel est le tarif total de la course ?", choix: [{ lettre: "A", texte: "13,77 €" }, { lettre: "B", texte: "14,74 €" }, { lettre: "C", texte: "15,88 €" }, { lettre: "D", texte: "18,30 €", correct: true }] },
    ]
  },
  {
    id: 305, titre: "Cas n°5 — 15 fév, 16h, station, neige, 2 pers + 10 bagages → Hôpital St Luc A/R (3.5km)", actif: true,
    questions: [
      { id: 1, enonce: "Cas n°5 : 15 février, 16h, neige, station, 2 personnes + 10 bagages → Hôpital St Luc St Joseph A/R (3.5 km aller). Quel tarif appliqué ?", choix: [{ lettre: "A", texte: "Tarif A" }, { lettre: "B", texte: "Tarif B", correct: true }, { lettre: "C", texte: "Tarif C" }, { lettre: "D", texte: "Tarif D" }] },
      { id: 2, enonce: "Cas n°5 : Quel est le coût de la réservation ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "Pas de surplus", correct: true }] },
      { id: 3, enonce: "Cas n°5 : Quel est le coût des bagages supplémentaires ?", choix: [{ lettre: "A", texte: "6 €" }, { lettre: "B", texte: "8 €", correct: true }, { lettre: "C", texte: "Pas de surplus" }] },
      { id: 4, enonce: "Cas n°5 : Quel est le coût des passagers supplémentaires ?", choix: [{ lettre: "A", texte: "3 €" }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "Pas de surplus", correct: true }] },
      { id: 5, enonce: "Cas n°5 : Quel est le coût total des suppléments ?", choix: [{ lettre: "A", texte: "8 €", correct: true }, { lettre: "B", texte: "10 €" }, { lettre: "C", texte: "12 €" }, { lettre: "D", texte: "14 €" }] },
      { id: 6, enonce: "Cas n°5 : Quel est le tarif total de la course ?", choix: [{ lettre: "A", texte: "21,50 €", correct: true }, { lettre: "B", texte: "21,51 €" }, { lettre: "C", texte: "22,14 €" }, { lettre: "D", texte: "23,98 €" }] },
    ]
  },
  {
    id: 306, titre: "Cas n°6 — 1er nov, 14h, appel, 6 pers, Mairie 5e → 66 rue Smith (4.7km)", actif: true,
    questions: [
      { id: 1, enonce: "Cas n°6 : 1er novembre, 14h, on vous appelle pour 6 personnes sans bagages, Mairie du 5e → 66 rue Smith (4.7 km). Quel tarif appliqué ?", choix: [{ lettre: "A", texte: "Tarif A" }, { lettre: "B", texte: "Tarif B" }, { lettre: "C", texte: "Tarif C" }, { lettre: "D", texte: "Tarif D", correct: true }] },
      { id: 2, enonce: "Cas n°6 : Quel est le coût de la réservation ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €", correct: true }, { lettre: "C", texte: "Pas de surplus" }] },
      { id: 3, enonce: "Cas n°6 : Quel est le coût des bagages supplémentaires ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "Pas de surplus", correct: true }] },
      { id: 4, enonce: "Cas n°6 : Quel est le coût des passagers supplémentaires ?", choix: [{ lettre: "A", texte: "4 €", correct: true }, { lettre: "B", texte: "2 €" }, { lettre: "C", texte: "Pas de surplus" }] },
      { id: 5, enonce: "Cas n°6 : Quel est le coût total des suppléments ?", choix: [{ lettre: "A", texte: "8 €" }, { lettre: "B", texte: "10 €" }, { lettre: "C", texte: "12 €", correct: true }] },
      { id: 6, enonce: "Cas n°6 : Quel est le tarif total de la course ?", choix: [{ lettre: "A", texte: "24,88 €" }, { lettre: "B", texte: "25,87 €" }, { lettre: "C", texte: "29,10 €", correct: true }, { lettre: "D", texte: "27,28 €" }] },
    ]
  },
  {
    id: 307, titre: "Cas n°7 — 12 juil, 17h, appel, 66 rue Smith → Aéroport St Exupéry (24km)", actif: true,
    questions: [
      { id: 1, enonce: "Cas n°7 : 12 juillet, 17h, on vous appelle pour 1 personne sans bagages, 66 rue Smith → Aéroport Lyon St Exupéry (24 km). Quel tarif appliqué ?", choix: [{ lettre: "A", texte: "Tarif A" }, { lettre: "B", texte: "Tarif B", correct: true }, { lettre: "C", texte: "Tarif C" }, { lettre: "D", texte: "Tarif D" }] },
      { id: 2, enonce: "Cas n°7 : Quel est le coût de la réservation ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €", correct: true }, { lettre: "C", texte: "6 €" }, { lettre: "D", texte: "8 €" }] },
      { id: 3, enonce: "Cas n°7 : Quel est le coût des bagages supplémentaires ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "Pas de surplus", correct: true }] },
      { id: 4, enonce: "Cas n°7 : Quel est le coût des passagers supplémentaires ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "Pas de surplus", correct: true }] },
      { id: 5, enonce: "Cas n°7 : Quel est le coût total des suppléments ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €", correct: true }, { lettre: "C", texte: "Pas de surplus" }] },
      { id: 6, enonce: "Cas n°7 : Quel est le tarif total de la course ?", choix: [{ lettre: "A", texte: "51 €" }, { lettre: "B", texte: "55 €", correct: true }, { lettre: "C", texte: "54,47 €" }, { lettre: "D", texte: "55,87 €" }] },
    ]
  },
  {
    id: 308, titre: "Cas n°8 — Gare Part-Dieu, 3 pers + 3 bagages → Guillotière (2.4km)", actif: true,
    questions: [
      { id: 1, enonce: "Cas n°8 : Gare Part-Dieu, 3 personnes + 3 bagages entrent dans le véhicule → quartier Guillotière (2.4 km). Quel tarif appliqué ?", choix: [{ lettre: "A", texte: "Tarif A", correct: true }, { lettre: "B", texte: "Tarif B" }, { lettre: "C", texte: "Tarif C" }, { lettre: "D", texte: "Tarif D" }] },
      { id: 2, enonce: "Cas n°8 : Quel est le coût de la réservation ?", choix: [{ lettre: "A", texte: "0 €", correct: true }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "6 €" }, { lettre: "D", texte: "8 €" }] },
      { id: 3, enonce: "Cas n°8 : Quel est le coût des passagers supplémentaires ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "Pas de surplus", correct: true }] },
      { id: 4, enonce: "Cas n°8 : Quel est le coût des bagages supplémentaires ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "Pas de surplus", correct: true }] },
      { id: 5, enonce: "Cas n°8 : Quel est le coût total des suppléments ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "Pas de surplus", correct: true }] },
      { id: 6, enonce: "Cas n°8 : Quel est le tarif total de la course ?", choix: [{ lettre: "A", texte: "8 €", correct: true }, { lettre: "B", texte: "9,56 €" }, { lettre: "C", texte: "9,54 €" }, { lettre: "D", texte: "10,72 €" }] },
    ]
  },
  {
    id: 309, titre: "Cas n°9 — 3 janv, 6h, appel, 5 pers, Gare Perrache → Halles Bocuse (5.6km)", actif: true,
    questions: [
      { id: 1, enonce: "Cas n°9 : 3 janvier, 6h, on vous appelle pour 5 personnes sans bagages, Gare Perrache → Halles Paul Bocuse (5.6 km). Quel tarif appliqué ?", choix: [{ lettre: "A", texte: "Tarif A" }, { lettre: "B", texte: "Tarif B" }, { lettre: "C", texte: "Tarif C" }, { lettre: "D", texte: "Tarif D", correct: true }] },
      { id: 2, enonce: "Cas n°9 : Quel est le coût de la réservation ?", choix: [{ lettre: "A", texte: "2 €", correct: true }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "6 €" }, { lettre: "D", texte: "8 €" }] },
      { id: 3, enonce: "Cas n°9 : Quel est le coût des bagages supplémentaires ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "Pas de surplus", correct: true }] },
      { id: 4, enonce: "Cas n°9 : Quel est le coût des passagers supplémentaires ?", choix: [{ lettre: "A", texte: "3 €" }, { lettre: "B", texte: "4 €", correct: true }, { lettre: "C", texte: "Pas de surplus" }] },
      { id: 5, enonce: "Cas n°9 : Quel est le coût total des suppléments ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "6 €", correct: true }, { lettre: "C", texte: "Pas de surplus" }] },
      { id: 6, enonce: "Cas n°9 : Quel est le tarif total de la course ?", choix: [{ lettre: "A", texte: "25,80 €", correct: true }, { lettre: "B", texte: "24,58 €" }, { lettre: "C", texte: "25,69 €" }, { lettre: "D", texte: "26,88 €" }] },
    ]
  },
  {
    id: 310, titre: "Cas n°10 — 22 juin, 9h, hélé, Gare Part-Dieu → Place Bellecour A/R (2.6km)", actif: true,
    questions: [
      { id: 1, enonce: "Cas n°10 : 22 juin, 9h, client vous hèle à la Gare Part-Dieu → Place Bellecour A/R (2.6 km aller), pas de bagages, il pleut. Quel tarif appliqué ?", choix: [{ lettre: "A", texte: "Tarif A", correct: true }, { lettre: "B", texte: "Tarif B" }, { lettre: "C", texte: "Tarif C" }, { lettre: "D", texte: "Tarif D" }] },
      { id: 2, enonce: "Cas n°10 : Quel est le coût de la réservation ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "6 €" }, { lettre: "D", texte: "Aucun", correct: true }] },
      { id: 3, enonce: "Cas n°10 : Quel est le coût des bagages supplémentaires ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "Pas de surplus", correct: true }] },
      { id: 4, enonce: "Cas n°10 : Quel est le coût des passagers supplémentaires ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "Pas de surplus", correct: true }] },
      { id: 5, enonce: "Cas n°10 : Quel est le coût total des suppléments ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "Pas de surplus", correct: true }] },
      { id: 6, enonce: "Cas n°10 : Quel est le tarif total de la course ?", choix: [{ lettre: "A", texte: "4,89 €" }, { lettre: "B", texte: "8,20 €", correct: true }, { lettre: "C", texte: "8,99 €" }, { lettre: "D", texte: "9,99 €" }] },
    ]
  },
];
