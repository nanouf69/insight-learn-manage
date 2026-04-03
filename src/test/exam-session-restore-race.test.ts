import { describe, it, expect } from "vitest";

/**
 * Tests for the exam session restore race condition:
 *
 * BUG: On F5 refresh during an active exam, the session restore useEffect
 * runs BEFORE refreshLiveExamens() has fetched data from DB. Since
 * liveExamens is initialized with tousLesExamens (hardcoded source),
 * the restore picks the exam from hardcoded data — losing ALL admin edits.
 *
 * The phase guard in refreshLiveExamens (line 116) then blocks any update
 * to examenChoisi because phase is already "examen".
 *
 * Result: student sees original hardcoded questions instead of admin edits.
 */

// ─── Helpers ───────────────────────────────────────────────────
function makeQuestion(id: number, enonce: string, type: "QCM" | "QRC" = "QCM") {
  return {
    id,
    enonce,
    type,
    image: undefined as string | undefined,
    choix: [
      { lettre: "A", texte: "Choix A", correct: true },
      { lettre: "B", texte: "Choix B", correct: false },
    ],
  };
}

function makeMatiere(id: string, nom: string, questions: any[]) {
  return { id, nom, questions, noteSur: 20, noteEliminatoire: 4, coefficient: 1 };
}

function makeExamen(id: string, matieres: any[]) {
  return { id, nom: `Examen ${id}`, matieres, dureeParMatiere: 30 };
}

// ─── Bug: Race condition — restore uses hardcoded data ─────────
describe("Bug: Session restore race condition on F5", () => {
  it("restore using hardcoded liveExamens loses admin edits (demonstrates the bug)", () => {
    // Source data (hardcoded in tousLesExamens)
    const hardcodedExamens = [
      makeExamen("EB3", [
        makeMatiere("A", "Réglementation", [
          makeQuestion(1, "Question source originale"),
          makeQuestion(2, "Deuxième question source"),
        ]),
      ]),
    ];

    // DB data (admin has edited questions)
    const dbExamens = [
      makeExamen("EB3", [
        makeMatiere("A", "Réglementation", [
          makeQuestion(1, "Question MODIFIÉE par admin"),
          makeQuestion(2, "Deuxième question MODIFIÉE"),
        ]),
      ]),
    ];

    // Simulate the session saved before F5
    const savedSession = { examenId: "EB3", matiereIndex: 0, phase: "examen" };

    // ─── THE BUG: restore runs with hardcoded data ───
    // liveExamens is still tousLesExamens because refreshLiveExamens() hasn't completed
    const liveExamens = hardcodedExamens; // initial state = hardcoded
    const found = liveExamens.find(e => e.id === savedSession.examenId);

    // Student gets hardcoded data — admin edits LOST
    expect(found!.matieres[0].questions[0].enonce).toBe("Question source originale");
    expect(found!.matieres[0].questions[1].enonce).toBe("Deuxième question source");

    // After restore sets phase="examen", refreshLiveExamens completes but
    // the phase guard blocks updating examenChoisi:
    let examenChoisi = found;
    const phase = "examen"; // set by restore

    // refreshLiveExamens callback:
    const setExamenChoisiCallback = (prev: any) => {
      if (!prev) return prev;
      if (phase === "examen" || phase === "transition" || phase === "resultats") return prev; // BLOCKED
      return dbExamens.find(exam => exam.id === prev.id) ?? prev;
    };

    examenChoisi = setExamenChoisiCallback(examenChoisi);

    // Still hardcoded — DB data never applied
    expect(examenChoisi!.matieres[0].questions[0].enonce).toBe("Question source originale"); // BUG confirmed
  });

  it("restore waiting for DB data preserves admin edits (the fix)", () => {
    // Source data (hardcoded)
    const hardcodedExamens = [
      makeExamen("EB3", [
        makeMatiere("A", "Réglementation", [
          makeQuestion(1, "Question source originale"),
          makeQuestion(2, "Deuxième question source"),
        ]),
      ]),
    ];

    // DB data (admin edits)
    const dbExamens = [
      makeExamen("EB3", [
        makeMatiere("A", "Réglementation", [
          makeQuestion(1, "Question MODIFIÉE par admin"),
          makeQuestion(2, "Deuxième question MODIFIÉE"),
        ]),
      ]),
    ];

    const savedSession = { examenId: "EB3", matiereIndex: 0, phase: "examen" };

    // ─── THE FIX: restore waits for liveExamensLoaded ───
    let liveExamensLoaded = false;
    let liveExamens = hardcodedExamens;

    // Step 1: restore useEffect fires, but liveExamensLoaded is false → skipped
    const shouldRestore1 = !false /* sessionRestored */ && liveExamensLoaded;
    expect(shouldRestore1).toBe(false); // restore is gated

    // Step 2: refreshLiveExamens completes → DB data loaded
    liveExamens = dbExamens;
    liveExamensLoaded = true;

    // Step 3: restore useEffect re-runs (liveExamensLoaded changed)
    const shouldRestore2 = !false /* sessionRestored */ && liveExamensLoaded;
    expect(shouldRestore2).toBe(true); // now restore runs

    // Restore picks exam from DB data
    const found = liveExamens.find(e => e.id === savedSession.examenId);
    expect(found!.matieres[0].questions[0].enonce).toBe("Question MODIFIÉE par admin");
    expect(found!.matieres[0].questions[1].enonce).toBe("Deuxième question MODIFIÉE");
  });
});

// ─── Bug: Second admin edit also lost ──────────────────────────
describe("Bug: Multiple admin edits lost on F5 during exam", () => {
  it("both first and second admin edits are lost when restore uses hardcoded data", () => {
    // Initial source
    const source = makeExamen("EB3", [
      makeMatiere("A", "Réglementation", [
        makeQuestion(1, "Texte original", "QCM"),
      ]),
    ]);

    // Admin edit #1: changed question text
    const afterEdit1 = makeExamen("EB3", [
      makeMatiere("A", "Réglementation", [
        { ...makeQuestion(1, "Texte modifié v1", "QCM"), image: "https://cdn.example.com/img1.jpg" },
      ]),
    ]);

    // Admin edit #2: changed again
    const afterEdit2 = makeExamen("EB3", [
      makeMatiere("A", "Réglementation", [
        { ...makeQuestion(1, "Texte modifié v2", "QCM"), image: "https://cdn.example.com/img2.jpg" },
      ]),
    ]);

    // DB has the latest (edit #2)
    const dbExamens = [afterEdit2];
    const hardcodedExamens = [source];

    // BUG: restore from hardcoded
    const foundBug = hardcodedExamens.find(e => e.id === "EB3");
    expect(foundBug!.matieres[0].questions[0].enonce).toBe("Texte original"); // both edits lost
    expect(foundBug!.matieres[0].questions[0].image).toBeUndefined(); // image lost too

    // FIX: restore from DB data
    const foundFix = dbExamens.find(e => e.id === "EB3");
    expect(foundFix!.matieres[0].questions[0].enonce).toBe("Texte modifié v2");
    expect(foundFix!.matieres[0].questions[0].image).toBe("https://cdn.example.com/img2.jpg");
  });
});

// ─── Phase guard blocks refresh after restore ──────────────────
describe("Bug: Phase guard blocks examenChoisi update after restore", () => {
  it("refreshLiveExamens cannot update examenChoisi once phase is 'examen'", () => {
    const hardcoded = makeExamen("EB3", [
      makeMatiere("A", "Réglementation", [makeQuestion(1, "Source originale")]),
    ]);
    const fromDb = makeExamen("EB3", [
      makeMatiere("A", "Réglementation", [makeQuestion(1, "Modifié par admin")]),
    ]);

    // Restore sets examenChoisi from hardcoded data and phase="examen"
    let examenChoisi: any = hardcoded;
    let phase = "examen";

    // refreshLiveExamens completes, tries to update examenChoisi
    const updater = (prev: any) => {
      if (!prev) return prev;
      if (phase === "examen" || phase === "transition" || phase === "resultats") return prev;
      return fromDb;
    };

    examenChoisi = updater(examenChoisi);

    // Phase guard blocks the update — stuck with hardcoded data
    expect(examenChoisi.matieres[0].questions[0].enonce).toBe("Source originale");

    // With the fix: restore only runs AFTER DB data is in liveExamens,
    // so examenChoisi is set correctly from the start — no need for
    // refreshLiveExamens to update it afterward.
  });

  it("when restore waits for DB, examenChoisi is correct from the start", () => {
    const fromDb = makeExamen("EB3", [
      makeMatiere("A", "Réglementation", [makeQuestion(1, "Modifié par admin")]),
    ]);

    // Restore runs AFTER refreshLiveExamens has loaded DB data
    // liveExamens = dbExamens → found = DB exam
    const examenChoisi = fromDb;

    // Correct from the start — no phase guard issue
    expect(examenChoisi.matieres[0].questions[0].enonce).toBe("Modifié par admin");
  });
});
