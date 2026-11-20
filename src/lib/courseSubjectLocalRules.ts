import type { CourseSubjectRule } from "./courseSubjectLocalPresentation";

/** Audited 20/11/2026 against the actual active PowerPoints; display only. */
export const COURSE_SUBJECT_LOCAL_RULES: readonly CourseSubjectRule[] = [
  {
    "subject": "Gestion",
    "exerciseIds": [
      60,
      61,
      62
    ],
    "courseIds": {
      "2": [
        2001,
        2002,
        2003
      ],
      "10": [
        10003,
        10004,
        10005
      ]
    },
    "supportPaths": [
      "/__l5e/assets-v1/7d992074-f372-4d2e-8d9d-18aa23ac0c09/GESTION_1SUR3_v16.pptx",
      "/__l5e/assets-v1/7e253d5f-6bee-4ea0-bb16-a5101354cd2f/GESTION_2SUR3_v12.pptx",
      "/__l5e/assets-v1/822a04cf-434e-4344-8429-2fe663f20580/GESTION_3SUR3_v12.pptx"
    ],
    "moves": [
      {
        "exerciseId": 62,
        "questionId": 8,
        "targetPart": 2,
        "signature": "[\"Comment se calcule le BIC imposable pour le régime en micro-entreprise ?\",[{\"lettre\":\"A\",\"texte\":\"Produits moins charges\"},{\"lettre\":\"B\",\"texte\":\"Négociation d'un forfait avec l'administration fiscale\"},{\"correct\":true,\"lettre\":\"C\",\"texte\":\"Abattement automatique de 50 % du chiffre d'affaires\"}],\"https://qywdsohyuigjmclemqgm.supabase.co/storage/v1/object/public/cours-fichiers/question-images/module-2/q8_1778659920435_50.jpg\",null]",
        "slides": [
          12,
          13
        ],
        "reason": "Abattement micro-BIC enseigné en P2, absent de P3."
      },
      {
        "exerciseId": 62,
        "questionId": 32,
        "targetPart": 1,
        "signature": "[\"A partir de quel montant, un artisan VTC ou TAXI doit-il faire une facture (ou une note)\",[{\"lettre\":\"A\",\"texte\":\"120 euros\"},{\"lettre\":\"B\",\"texte\":\"100 euros\"},{\"correct\":false,\"lettre\":\"C\",\"texte\":\"25 euros\"},{\"correct\":true,\"lettre\":\"D\",\"texte\":\"N'importe quel montant\"}],null,null]",
        "slides": [
          22
        ],
        "reason": "Facture et note : obligation et seuil enseignés en P1, absents de P3."
      },
      {
        "exerciseId": 62,
        "questionId": 46,
        "targetPart": 2,
        "signature": "[\"Quels impôts et taxes sont obligatoires en tant que professionnel ?\",[{\"correct\":false,\"lettre\":\"A\",\"texte\":\"la taxe d’habitation\"},{\"lettre\":\"B\",\"texte\":\"l’impôt sur le revenu\"},{\"correct\":true,\"lettre\":\"C\",\"texte\":\"les cotisations sociales\"},{\"correct\":true,\"lettre\":\"D\",\"texte\":\"la contribution économique territoriale (cet=cfe+cvae)\"}],null,null]",
        "slides": [
          16,
          19
        ],
        "reason": "CET et régimes sociaux explicités en P2; CET absente de P3."
      },
      {
        "exerciseId": 62,
        "questionId": 53,
        "targetPart": 1,
        "signature": "[\"Citez deux régimes sociaux\",[{\"correct\":false,\"lettre\":\"A\",\"texte\":\"Régime des VTC\"},{\"correct\":true,\"lettre\":\"B\",\"texte\":\"Régime agricole\"},{\"correct\":true,\"lettre\":\"C\",\"texte\":\"Régime général \"}],null,null]",
        "slides": [
          6
        ],
        "reason": "Régime général et régime agricole MSA explicités en P1, pas en P3."
      },
      {
        "exerciseId": 62,
        "questionId": 54,
        "targetPart": 2,
        "signature": "[\"Que signifie Urssaf ?\",[{\"correct\":false,\"lettre\":\"A\",\"texte\":\"Union de recouvrement des cotisations pour les allocations familiales\"},{\"lettre\":\"B\",\"texte\":\"Union de recouvrement des cotisations de sécurité sociale et d'aides sociales\"},{\"correct\":true,\"lettre\":\"C\",\"texte\":\"Union de recouvrement des cotisations de sécurité sociale et d’allocations familiales\"}],null,null]",
        "slides": [19],
        "reason": "Sigle URSSAF développé en P2 diapositive 19, absent de P3."
      }
    ]
  },
  {
    "subject": "Sécurité routière",
    "exerciseIds": [
      80,
      81,
      82
    ],
    "courseIds": {
      "2": [
        3001,
        3002,
        3003
      ],
      "10": [
        10006,
        10007,
        10008
      ]
    },
    "supportPaths": [
      "/cours/vtc/C_Securite_Routiere_FINAL_1.pptx",
      "/__l5e/assets-v1/d765b659-ac4a-45f9-9f4e-933c94bc81cd/C_Securite_Routiere_FINAL_2.pptx",
      "/__l5e/assets-v1/57446c78-3230-4b2f-b6d2-62808ac77f46/SECURITE_ROUTIERE_3SUR3_v2.pptx"
    ],
    "moves": [
      {
        "exerciseId": 81,
        "questionId": 43,
        "targetPart": 3,
        "signature": "[\"Citez les comportements liés à la conduite économique \",[{\"correct\":true,\"lettre\":\"A\",\"texte\":\"vitesse stable\"},{\"correct\":true,\"lettre\":\"B\",\"texte\":\"éviter les démarrages brusques\"},{\"correct\":true,\"lettre\":\"C\",\"texte\":\"couper le moteur pour les arrêts longs\"},{\"correct\":true,\"lettre\":\"D\",\"texte\":\"Anticiper sur les actions afin d’éviter d’éventuels arrêt et démarrages inutiles\"},{\"correct\":true,\"lettre\":\"E\",\"texte\":\"Eviter toutes les actions brusques frein-accélérateur\"},{\"correct\":true,\"lettre\":\"F\",\"texte\":\"Contrôle son compte-tours\"},{\"correct\":true,\"lettre\":\"7\",\"texte\":\"Diminuer sa vitesse de pointe\"},{\"lettre\":\"8\",\"texte\":\"Ouvrir les fenêtres\"}],null,null]",
        "slides": [
          7
        ],
        "reason": "Comportements éco-conduite enseignés en P3, absents de P2."
      },
      {
        "exerciseId": 81,
        "questionId": 44,
        "targetPart": 1,
        "signature": "[\"Quelles sont les vérifications à faire sur le véhicule régulièrement ?\",[{\"correct\":true,\"lettre\":\"A\",\"texte\":\"vérification des niveaux \"},{\"correct\":true,\"lettre\":\"B\",\"texte\":\"vérification des pneus\"},{\"lettre\":\"C\",\"texte\":\"vérification du moteur \"}],null,null]",
        "slides": [
          6
        ],
        "reason": "Contrôles réguliers niveaux et pneus enseignés en P1, absents de P2."
      },
      {
        "exerciseId": 81,
        "questionId": 45,
        "targetPart": 3,
        "signature": "[\"Quelle est la définition de l'écoconduite ?\",[{\"correct\":false,\"lettre\":\"A\",\"texte\":\"C'est une conduite rapide afin d'éviter de polluer trop longtemps\"},{\"correct\":true,\"lettre\":\"B\",\"texte\":\"C’est une conduite écologique et économique\"},{\"lettre\":\"C\",\"texte\":\"C'est le fait d'emprunter que les grands axes pour ne pas polluer les villes\"}],null,null]",
        "slides": [
          7
        ],
        "reason": "Définition éco-conduite enseignée en P3, absente de P2."
      },
      {
        "exerciseId": 81,
        "questionId": 46,
        "targetPart": 3,
        "signature": "[\"Quels sont les bons gestes de l'écoconduite ? \",[{\"correct\":true,\"lettre\":\"A\",\"texte\":\"Utiliser le frein moteur\"},{\"lettre\":\"B\",\"texte\":\"Accélérer d'un coup\"},{\"correct\":true,\"lettre\":\"C\",\"texte\":\"Utiliser une huile moteur de haute qualité\"},{\"lettre\":\"D\",\"texte\":\"Utiliser le frein a main plutôt que la pédale de frein \"}],null,null]",
        "slides": [
          7
        ],
        "reason": "Frein moteur et huile de qualité enseignés en P3, absents de P2."
      },
      {
        "exerciseId": 81,
        "questionId": 47,
        "targetPart": 3,
        "signature": "[\"Le dernier contrôle technique de mon véhicule VTC ou TAXI a été fait le 10 février 2017, en quelle année devrais-je passé le prochain contrôle technique ?\",[{\"correct\":true,\"lettre\":\"A\",\"texte\":\"Février 2018\"},{\"lettre\":\"B\",\"texte\":\"Février 2019\"},{\"lettre\":\"C\",\"texte\":\"Février 2020\"},{\"lettre\":\"D\",\"texte\":\"Février 2021\"}],null,null]",
        "slides": [
          9
        ],
        "reason": "Contrôle technique annuel enseigné en P3, absent de P2."
      },
      {
        "exerciseId": 81,
        "questionId": 48,
        "targetPart": 3,
        "signature": "[\"Un chauffeur TAXI ou VTC doit effectuer un contrôle technique tous les : \",[{\"correct\":true,\"lettre\":\"A\",\"texte\":\"1 an \"},{\"lettre\":\"B\",\"texte\":\"2 ans\"},{\"lettre\":\"C\",\"texte\":\"3 ans\"},{\"lettre\":\"D\",\"texte\":\"4 ans\"}],\"https://qywdsohyuigjmclemqgm.supabase.co/storage/v1/object/public/cours-fichiers/question-images/module-2/q48_1778827654889_85.jpg\",null]",
        "slides": [
          9
        ],
        "reason": "Fréquence du contrôle technique enseignée en P3, absente de P2."
      },
      {
        "exerciseId": 81,
        "questionId": 49,
        "targetPart": 3,
        "signature": "[\"Quel est le délai maximum dans le cas où une contre visite du contrôle technique est demandée par le centre de contrôle pour une défaillance majeure ? \\n\",[{\"correct\":false,\"lettre\":\"A\",\"texte\":\"1 mois\"},{\"correct\":true,\"lettre\":\"B\",\"texte\":\"2 mois\"},{\"lettre\":\"C\",\"texte\":\"3 mois\"},{\"lettre\":\"D\",\"texte\":\"6 mois\"}],\"https://qywdsohyuigjmclemqgm.supabase.co/storage/v1/object/public/cours-fichiers/question-images/module-2/q49_1778827746961_86.jpg\",null]",
        "slides": [
          11
        ],
        "reason": "Contre-visite pour défaillance majeure enseignée en P3, absente de P2."
      },
      {
        "exerciseId": 82,
        "questionId": 17,
        "targetPart": 2,
        "signature": "[\"Le stationnement avec un véhicule VTC sur un emplacement réservé aux TAXIS est puni de : \",[{\"correct\":true,\"lettre\":\"A\",\"texte\":\"Contravention 2ème classe\"},{\"correct\":false,\"lettre\":\"B\",\"texte\":\"Contravention 4ème classe\"},{\"lettre\":\"C\",\"texte\":\"Toléré si < 15 min\"},{\"correct\":true,\"lettre\":\"D\",\"texte\":\"Mise en fourrière\"}],null,null]",
        "slides": [
          20,
          22
        ],
        "reason": "Stationnement sur emplacement réservé TAXI et sanctions enseignés en P2, absents de P3."
      },
      {
        "exerciseId": 82,
        "questionId": 55,
        "targetPart": 2,
        "signature": "[\"Le Temps de réaction augmente quand :\",[{\"correct\":true,\"lettre\":\"A\",\"texte\":\"Alcool\"},{\"correct\":true,\"lettre\":\"B\",\"texte\":\"Cannabis\"},{\"lettre\":\"C\",\"texte\":\"Pluie\"},{\"correct\":true,\"lettre\":\"D\",\"texte\":\"Téléphone\"}],null,null]",
        "slides": [
          4
        ],
        "reason": "Effet alcool et téléphone sur temps de réaction enseigné en P2, non explicité en P3."
      }
    ]
  }
];
