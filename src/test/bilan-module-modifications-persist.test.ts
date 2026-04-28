import { describe, it, expect } from "vitest";
import {
  hasDuplicateGeneratedBilanQuestions,
  shouldForceBilanReset,
  GENERATED_BILAN_MODULE_IDS,
} from "@/components/cours-en-ligne/bilan-reset-utils";
import { mergeSourceExercices } from "@/components/cours-en-ligne/examens-blancs-utils";

/**
 * Bug: les modifications admin sur les modules BILAN EXERCICES (4, 9, 27, 29, 81, 82)
 * disparaissent au refresh.
 *
 * Cause: le code lance un "reset" qui écrase les modifs admin par les données source
 * dès que `source_fingerprint` ne correspond pas. Or le fingerprint inclut
 * `getOverridesFingerprint()` (localStorage shared overrides), donc il change
 * dès qu'un admin modifie n'importe quel autre module.
 *
 * Fix: reset UNIQUEMENT en cas de doublons réels (corruption), jamais sur
 * fingerprint mismatch seul. Le merge normal gère les changements de source.
 *
 * Couvre: modif texte, modif réponse, ajout image, modif image, suppression image,
 *         suppression question, ajout question.
 */

const makeQuestion = (id: number, overrides: any = {}) => ({
  id,
  enonce: `Question ${id} originale`,
  choix: [
    { lettre: "A", texte: "Choix A", correct: false },
    { lettre: "B", texte: "Choix B", correct: true },
  ],
  ...overrides,
});

const makeBilanModule = (id: number, exercices: any[] = []) => ({
  id,
  nom: `Bilan ${id}`,
  cours: [],
  exercices,
});

// ─── Détection de doublons ───────────────────────────────────────
describe("hasDuplicateGeneratedBilanQuestions", () => {
  it("retourne false pour des modules non-bilan", () => {
    const moduleNormal = makeBilanModule(10, [{ id: 100, questions: [makeQuestion(1), makeQuestion(1)] }]);
    expect(hasDuplicateGeneratedBilanQuestions(moduleNormal)).toBe(false);
  });

  it("retourne false quand pas de doublons dans un module bilan", () => {
    const data = makeBilanModule(4, [
      { id: 100, questions: [makeQuestion(1), makeQuestion(2), makeQuestion(3)] },
    ]);
    expect(hasDuplicateGeneratedBilanQuestions(data)).toBe(false);
  });

  it("retourne true quand 2 questions identiques dans un même exercice", () => {
    const data = makeBilanModule(4, [
      { id: 100, questions: [makeQuestion(1), makeQuestion(2), makeQuestion(1)] },
    ]);
    expect(hasDuplicateGeneratedBilanQuestions(data)).toBe(true);
  });

  it("ne considère pas comme doublon si l'image diffère", () => {
    const data = makeBilanModule(4, [
      {
        id: 100,
        questions: [
          { ...makeQuestion(1), image: "img1.png" },
          { ...makeQuestion(1), image: "img2.png" },
        ],
      },
    ]);
    expect(hasDuplicateGeneratedBilanQuestions(data)).toBe(false);
  });

  it("ne considère pas comme doublon si l'enonce diffère", () => {
    const data = makeBilanModule(4, [
      {
        id: 100,
        questions: [
          { ...makeQuestion(1), enonce: "Q1 modifiée" },
          { ...makeQuestion(1), enonce: "Q1 originale" },
        ],
      },
    ]);
    expect(hasDuplicateGeneratedBilanQuestions(data)).toBe(false);
  });
});

// ─── shouldForceBilanReset ──────────────────────────────────────
describe("shouldForceBilanReset (bug fix: ne reset PAS sur fingerprint mismatch)", () => {
  it("ne reset PAS un module non-bilan, même avec doublons", () => {
    const data = makeBilanModule(10, [{ id: 100, questions: [makeQuestion(1), makeQuestion(1)] }]);
    expect(shouldForceBilanReset(10, data)).toBe(false);
  });

  it("ne reset PAS un module bilan SANS doublons (modifs admin préservées)", () => {
    const adminModified = makeBilanModule(4, [
      {
        id: 100,
        questions: [
          { ...makeQuestion(1), enonce: "Question 1 MODIFIÉE par admin" },
          { ...makeQuestion(2), enonce: "Question 2 MODIFIÉE par admin" },
        ],
      },
    ]);
    expect(shouldForceBilanReset(4, adminModified)).toBe(false);
  });

  it("reset un module bilan AVEC doublons (corruption de données)", () => {
    const corrupted = makeBilanModule(4, [
      {
        id: 100,
        questions: [makeQuestion(1), makeQuestion(2), makeQuestion(1)],
      },
    ]);
    expect(shouldForceBilanReset(4, corrupted)).toBe(true);
  });

  it("couvre tous les module IDs bilan générés", () => {
    expect(GENERATED_BILAN_MODULE_IDS.has(4)).toBe(true);
    expect(GENERATED_BILAN_MODULE_IDS.has(9)).toBe(true);
    expect(GENERATED_BILAN_MODULE_IDS.has(27)).toBe(true);
    expect(GENERATED_BILAN_MODULE_IDS.has(29)).toBe(true);
    expect(GENERATED_BILAN_MODULE_IDS.has(81)).toBe(true);
    expect(GENERATED_BILAN_MODULE_IDS.has(82)).toBe(true);
  });

  it("ne reset PAS si savedData est null/undefined", () => {
    expect(shouldForceBilanReset(4, null)).toBe(false);
    expect(shouldForceBilanReset(4, undefined)).toBe(false);
  });
});

// ─── Persistance des modifications via merge ─────────────────────
describe("Persistance des modifs admin sur module bilan via mergeSourceExercices", () => {
  const sourceBilan = [
    {
      id: 100,
      titre: "Bilan T3P",
      actif: true,
      questions: [
        makeQuestion(1),
        makeQuestion(2),
        makeQuestion(3),
      ],
    },
  ];

  it("modification de texte: l'enonce admin est préservé après merge", () => {
    const adminSaved = [
      {
        id: 100,
        titre: "Bilan T3P",
        actif: true,
        questions: [
          { ...makeQuestion(1), enonce: "Q1 MODIFIÉE par admin" },
          makeQuestion(2),
          makeQuestion(3),
        ],
      },
    ];

    const merged = mergeSourceExercices(adminSaved as any, sourceBilan as any);
    expect(merged[0].questions?.[0].enonce).toBe("Q1 MODIFIÉE par admin");
    expect(merged[0].questions?.[1].enonce).toBe("Question 2 originale");
  });

  it("modification de réponse: la bonne réponse admin est préservée", () => {
    const adminSaved = [
      {
        id: 100,
        titre: "Bilan T3P",
        actif: true,
        questions: [
          {
            ...makeQuestion(1),
            choix: [
              { lettre: "A", texte: "Choix A", correct: true },
              { lettre: "B", texte: "Choix B", correct: false },
            ],
          },
          makeQuestion(2),
        ],
      },
    ];

    const merged = mergeSourceExercices(adminSaved as any, sourceBilan as any);
    expect(merged[0].questions?.[0].choix[0].correct).toBe(true);
    expect(merged[0].questions?.[0].choix[1].correct).toBe(false);
  });

  it("ajout d'image: l'image admin est préservée", () => {
    const adminSaved = [
      {
        id: 100,
        titre: "Bilan T3P",
        actif: true,
        questions: [
          { ...makeQuestion(1), image: "https://example.com/admin-image.png" },
          makeQuestion(2),
        ],
      },
    ];

    const merged = mergeSourceExercices(adminSaved as any, sourceBilan as any);
    expect((merged[0].questions?.[0] as any).image).toBe("https://example.com/admin-image.png");
  });

  it("modification d'image: la nouvelle image admin écrase la source", () => {
    const sourceWithImage = [
      {
        id: 100,
        titre: "Bilan T3P",
        actif: true,
        questions: [{ ...makeQuestion(1), image: "https://source.com/old.png" }],
      },
    ];
    const adminSaved = [
      {
        id: 100,
        titre: "Bilan T3P",
        actif: true,
        questions: [{ ...makeQuestion(1), image: "https://admin.com/new.png" }],
      },
    ];

    const merged = mergeSourceExercices(adminSaved as any, sourceWithImage as any);
    expect((merged[0].questions?.[0] as any).image).toBe("https://admin.com/new.png");
  });

  it("suppression d'image: image=null écrase la source", () => {
    const sourceWithImage = [
      {
        id: 100,
        titre: "Bilan T3P",
        actif: true,
        questions: [{ ...makeQuestion(1), image: "https://source.com/img.png" }],
      },
    ];
    const adminSaved = [
      {
        id: 100,
        titre: "Bilan T3P",
        actif: true,
        questions: [{ ...makeQuestion(1), image: null }],
      },
    ];

    const merged = mergeSourceExercices(adminSaved as any, sourceWithImage as any);
    expect((merged[0].questions?.[0] as any).image).toBeNull();
  });

  it("suppression de question: la question supprimée ne réapparaît PAS", () => {
    const adminSaved = [
      {
        id: 100,
        titre: "Bilan T3P",
        actif: true,
        questions: [makeQuestion(1), makeQuestion(3)], // Q2 supprimée
        deletedQuestionIds: [2],
      },
    ];

    const merged = mergeSourceExercices(adminSaved as any, sourceBilan as any);
    const ids = merged[0].questions?.map(q => q.id) || [];
    expect(ids).not.toContain(2);
    expect(ids).toContain(1);
    expect(ids).toContain(3);
  });

  it("nouvelles questions ajoutées en source apparaissent dans le merge", () => {
    const adminSaved = [
      {
        id: 100,
        titre: "Bilan T3P",
        actif: true,
        questions: [makeQuestion(1), makeQuestion(2), makeQuestion(3)],
      },
    ];
    const sourceWithNew = [
      {
        id: 100,
        titre: "Bilan T3P",
        actif: true,
        questions: [
          makeQuestion(1),
          makeQuestion(2),
          makeQuestion(3),
          makeQuestion(4), // nouvelle question source
        ],
      },
    ];

    const merged = mergeSourceExercices(adminSaved as any, sourceWithNew as any);
    const ids = merged[0].questions?.map(q => q.id) || [];
    expect(ids).toContain(4);
  });

  it("question AJOUTÉE par admin (ID hors source) doit être préservée au merge", () => {
    const adminSaved = [
      {
        id: 100,
        titre: "Bilan T3P",
        actif: true,
        questions: [
          makeQuestion(1),
          makeQuestion(2),
          { ...makeQuestion(999), enonce: "Question AJOUTÉE par admin" }, // ID 999 pas dans source
        ],
      },
    ];

    const merged = mergeSourceExercices(adminSaved as any, sourceBilan as any);
    const ids = merged[0].questions?.map(q => q.id) || [];
    expect(ids).toContain(999);
    const adminAdded = merged[0].questions?.find(q => q.id === 999);
    expect(adminAdded?.enonce).toBe("Question AJOUTÉE par admin");
  });

  it("plusieurs questions ajoutées par admin sont toutes préservées", () => {
    const adminSaved = [
      {
        id: 100,
        titre: "Bilan T3P",
        actif: true,
        questions: [
          makeQuestion(1),
          { ...makeQuestion(500), enonce: "Ajoutée 1" },
          { ...makeQuestion(501), enonce: "Ajoutée 2" },
          { ...makeQuestion(502), enonce: "Ajoutée 3" },
        ],
      },
    ];

    const merged = mergeSourceExercices(adminSaved as any, sourceBilan as any);
    const ids = merged[0].questions?.map(q => q.id) || [];
    expect(ids).toContain(500);
    expect(ids).toContain(501);
    expect(ids).toContain(502);
  });

  it("ordre des questions: les ajouts admin viennent après les questions source", () => {
    const adminSaved = [
      {
        id: 100,
        titre: "Bilan T3P",
        actif: true,
        questions: [
          makeQuestion(1),
          makeQuestion(2),
          makeQuestion(3),
          { ...makeQuestion(999), enonce: "Ajoutée par admin" },
        ],
      },
    ];

    const merged = mergeSourceExercices(adminSaved as any, sourceBilan as any);
    const lastQuestion = merged[0].questions?.[merged[0].questions.length - 1];
    expect(lastQuestion?.id).toBe(999);
  });

  it("EXERCICE AJOUTÉ par admin (ID hors source) doit être préservé au merge", () => {
    const adminSaved = [
      {
        id: 100, // existant dans source
        titre: "Bilan T3P",
        actif: true,
        questions: [makeQuestion(1)],
      },
      {
        id: 1735000000000, // nouvel exercice avec Date.now() — pas dans source
        titre: "Exercice AJOUTÉ par admin",
        actif: true,
        questions: [{ ...makeQuestion(1), enonce: "Question dans nouvel exercice" }],
      },
    ];

    const merged = mergeSourceExercices(adminSaved as any, sourceBilan as any);
    const exoIds = merged.map(e => e.id);
    expect(exoIds).toContain(1735000000000);
    const newExo = merged.find(e => e.id === 1735000000000);
    expect(newExo?.titre).toBe("Exercice AJOUTÉ par admin");
  });

  it("plusieurs exercices ajoutés par admin sont tous préservés", () => {
    const adminSaved = [
      ...(sourceBilan as any),
      { id: 9001, titre: "Ajouté 1", actif: true, questions: [] },
      { id: 9002, titre: "Ajouté 2", actif: true, questions: [] },
      { id: 9003, titre: "Ajouté 3", actif: true, questions: [] },
    ];

    const merged = mergeSourceExercices(adminSaved as any, sourceBilan as any);
    const exoIds = merged.map(e => e.id);
    expect(exoIds).toContain(9001);
    expect(exoIds).toContain(9002);
    expect(exoIds).toContain(9003);
  });

  it("ordre des exercices: les exercices admin viennent après les exercices source", () => {
    const adminSaved = [
      ...(sourceBilan as any),
      { id: 9999, titre: "Admin exo", actif: true, questions: [] },
    ];

    const merged = mergeSourceExercices(adminSaved as any, sourceBilan as any);
    const lastExo = merged[merged.length - 1];
    expect(lastExo.id).toBe(9999);
  });

  it("EXERCICE SUPPRIMÉ par admin: avec deletedExerciceIds, ne revient PAS du source", () => {
    const sourceMulti = [
      { id: 100, titre: "Exo 1", actif: true, questions: [makeQuestion(1)] },
      { id: 101, titre: "Exo 2", actif: true, questions: [makeQuestion(1)] },
      { id: 102, titre: "Exo 3", actif: true, questions: [makeQuestion(1)] },
    ];
    // Admin a supprimé Exo 2 (id=101) → reste 100 et 102 dans adminSaved
    const adminSaved = [
      { id: 100, titre: "Exo 1", actif: true, questions: [makeQuestion(1)] },
      { id: 102, titre: "Exo 3", actif: true, questions: [makeQuestion(1)] },
    ];

    const merged = mergeSourceExercices(adminSaved as any, sourceMulti as any, [101]);
    const ids = merged.map(e => e.id);
    expect(ids).not.toContain(101); // l'exo supprimé ne revient pas
    expect(ids).toContain(100);
    expect(ids).toContain(102);
  });

  it("rétro-compatibilité: sans deletedExerciceIds, comportement inchangé", () => {
    const adminSaved = [
      { id: 100, titre: "Exo modifié", actif: true, questions: [makeQuestion(1)] },
    ];

    const merged = mergeSourceExercices(adminSaved as any, sourceBilan as any);
    expect(merged).toHaveLength(sourceBilan.length);
  });
});

// ─── Scénario réel: admin modifie module bilan, refresh ─────────
describe("Scénario réel: admin modifie module bilan VTC, refresh", () => {
  it("le fingerprint mismatch (causé par localStorage overrides) ne doit PAS reset", () => {
    // Simulation: admin a modifié Q1 du module bilan VTC (id=4)
    const adminEdits = makeBilanModule(4, [
      {
        id: 100,
        titre: "Bilan T3P",
        actif: true,
        questions: [
          { ...makeQuestion(1), enonce: "Q1 modifiée par admin" },
          makeQuestion(2),
        ],
      },
    ]);

    // Pas de doublons → pas de reset
    expect(shouldForceBilanReset(4, adminEdits)).toBe(false);
  });

  it("élève charge le module: doit voir les modifs admin (pas reset)", () => {
    const adminEdits = makeBilanModule(4, [
      {
        id: 100,
        titre: "Bilan T3P",
        actif: true,
        questions: [{ ...makeQuestion(1), enonce: "Q1 modifiée par admin" }],
      },
    ]);

    // Côté élève, fingerprint differ d'admin (localStorage différent)
    // Avec le fix: pas de reset car pas de doublons
    expect(shouldForceBilanReset(4, adminEdits)).toBe(false);
  });
});
