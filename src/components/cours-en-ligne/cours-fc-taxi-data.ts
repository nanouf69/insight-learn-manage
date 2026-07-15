// Cours Formation Continue TAXI — 4 modules PDF + QCM final
// Source : Formation_Continue_Taxi.zip (30 diaporamas PPTX + QCM Final 30 questions)

export const COURS_FC_TAXI = [
  {
    id: 82001,
    actif: true,
    titre: "Module 1 — Droit du T3P",
    sousTitre: "Obligations, contrôles, déontologie, cas pratiques (Parties 5 → 8)",
    fichiers: [
      { nom: "PDF Module 1 — Droit du T3P", url: "/cours/vtc/fc-taxi/module1-droit-t3p.pdf" },
    ],
  },
  {
    id: 82002,
    actif: true,
    titre: "Module 2 — Réglementation Taxi",
    sousTitre: "ADS, carte professionnelle, tarifs, contrôles (Parties 1 → 9)",
    fichiers: [
      { nom: "PDF Module 2 — Réglementation Taxi", url: "/cours/vtc/fc-taxi/module2-reglementation-taxi.pdf" },
    ],
  },
  {
    id: 82003,
    actif: true,
    titre: "Module 3 — Sécurité Routière",
    sousTitre: "Signalisation, vitesses, distances, infractions (Parties 1 → 8)",
    fichiers: [
      { nom: "PDF Module 3 — Sécurité Routière", url: "/cours/vtc/fc-taxi/module3-securite-routiere.pdf" },
    ],
  },
  {
    id: 82004,
    actif: true,
    titre: "Module 4 — Gestion & Développement Commercial",
    sousTitre: "Fiscalité, comptabilité, marketing, fidélisation (Parties 1 → 9)",
    fichiers: [
      { nom: "PDF Module 4 — Gestion & Développement Commercial", url: "/cours/vtc/fc-taxi/module4-gestion-developpement.pdf" },
    ],
  },
];

export const QCM_FINAL_FC_TAXI = [
  {
    id: 82100,
    titre: "📋 QCM Final — Formation Continue TAXI",
    sousTitre: "Questions de synthèse — Vérifiez vos connaissances des 4 modules",
    actif: true,
    questions: [
      {
        id: 1,
        enonce: "Quel document permet d'exploiter un taxi ?",
        choix: [
          { lettre: "A", texte: "Carte grise", correct: false },
          { lettre: "B", texte: "ADS (Autorisation De Stationnement)", correct: true },
          { lettre: "C", texte: "Assurance", correct: false },
        ],
      },
      {
        id: 2,
        enonce: "La carte professionnelle doit-elle pouvoir être présentée lors d'un contrôle ?",
        choix: [
          { lettre: "A", texte: "Oui", correct: true },
          { lettre: "B", texte: "Non", correct: false },
        ],
      },
      {
        id: 3,
        enonce: "Un taxi peut-il pratiquer la maraude ?",
        choix: [
          { lettre: "A", texte: "Oui", correct: true },
          { lettre: "B", texte: "Non", correct: false },
        ],
      },
      {
        id: 4,
        enonce: "Le taximètre est-il obligatoire ?",
        choix: [
          { lettre: "A", texte: "Oui, sauf cas prévus par la réglementation", correct: true },
          { lettre: "B", texte: "Non", correct: false },
        ],
      },
      {
        id: 5,
        enonce: "Quel est le premier devoir du chauffeur ?",
        choix: [
          { lettre: "A", texte: "Assurer la sécurité", correct: true },
          { lettre: "B", texte: "Rouler vite", correct: false },
        ],
      },
    ],
  },
];
