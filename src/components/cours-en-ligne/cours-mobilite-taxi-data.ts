// Cours Formation Mobilité TAXI — 2 modules PDF + QCM final
// Source : Formation_Mobilite_Taxi.zip (12 diaporamas PPTX + QCM Final 30 questions)

export const COURS_MOBILITE_TAXI = [
  {
    id: 90001,
    actif: true,
    titre: "Module 1 — Connaissance du territoire",
    sousTitre: "Département du Rhône, Métropole de Lyon, itinéraires et points d'intérêt (Parties 1 → 2)",
    fichiers: [
      { nom: "PDF Module 1 — Connaissance du territoire", url: "/cours/vtc/mobilite-taxi/module1-territoire.pdf" },
    ],
  },
  {
    id: 90002,
    actif: true,
    titre: "Module 2 — Réglementation locale",
    sousTitre: "Arrêté Métropolitain du 27 novembre 2024, ADS, carte pro, tarifs, contrôles (Parties 1 → 10)",
    fichiers: [
      { nom: "PDF Module 2 — Réglementation locale", url: "/cours/vtc/mobilite-taxi/module2-reglementation-locale.pdf" },
    ],
  },
];

export const QCM_FINAL_MOBILITE_TAXI = [
  {
    id: 90100,
    titre: "📋 QCM Final — Formation Mobilité TAXI",
    sousTitre: "Questions de synthèse — Réglementation locale",
    actif: true,
    questions: [
      {
        id: 1,
        enonce: "Quel document autorise l'exploitation d'un taxi ?",
        choix: [
          { lettre: "A", texte: "Carte grise", correct: false },
          { lettre: "B", texte: "ADS (Autorisation De Stationnement)", correct: true },
          { lettre: "C", texte: "Permis B", correct: false },
        ],
      },
      {
        id: 2,
        enonce: "Le conducteur doit-il présenter sa carte professionnelle lors d'un contrôle ?",
        choix: [
          { lettre: "A", texte: "Oui", correct: true },
          { lettre: "B", texte: "Non", correct: false },
          { lettre: "C", texte: "Seulement sur demande du client", correct: false },
        ],
      },
      {
        id: 3,
        enonce: "Le terminal de paiement doit être opérationnel ?",
        choix: [
          { lettre: "A", texte: "Oui", correct: true },
          { lettre: "B", texte: "Non", correct: false },
          { lettre: "C", texte: "Seulement la nuit", correct: false },
        ],
      },
      {
        id: 4,
        enonce: "Les chiens guides doivent-ils être acceptés ?",
        choix: [
          { lettre: "A", texte: "Oui", correct: true },
          { lettre: "B", texte: "Non", correct: false },
          { lettre: "C", texte: "Seulement sur réservation", correct: false },
        ],
      },
      {
        id: 5,
        enonce: "Les objets oubliés doivent être traités conformément à la réglementation locale ?",
        choix: [
          { lettre: "A", texte: "Oui", correct: true },
          { lettre: "B", texte: "Non", correct: false },
          { lettre: "C", texte: "Au choix du conducteur", correct: false },
        ],
      },
    ],
  },
];
