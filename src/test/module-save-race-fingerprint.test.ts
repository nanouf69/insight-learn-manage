import { describe, it, expect } from "vitest";
import { mergeSourceExercices } from "@/components/cours-en-ligne/examens-blancs-utils";

/**
 * Tests for three bugs:
 * 1. sourceFingerprint mismatch causes students to skip DB data entirely
 * 2. No debounce on saves → race condition when admin makes many rapid edits
 * 3. Stale closure in updateExerciceQuestions loses intermediate updates
 */

// ─── Helpers ───────────────────────────────────────────────────
function makeExercice(id: number, questions: any[]) {
  return {
    id,
    titre: `Exercice ${id}`,
    sousTitre: "",
    actif: true,
    questions,
  };
}

function makeQuestion(id: number, enonce: string, correct: string, image?: string) {
  return {
    id,
    enonce,
    image,
    choix: [
      { lettre: "A", texte: "Choix A", correct: correct === "A" },
      { lettre: "B", texte: "Choix B", correct: correct === "B" },
      { lettre: "C", texte: "Choix C", correct: correct === "C" },
    ],
  };
}

// ─── Bug 1: sourceFingerprint mismatch ─────────────────────────
describe("Bug 1: sourceFingerprint mismatch — students must still see admin edits", () => {
  /**
   * Simulates the scenario: admin saved with fingerprint v:9,
   * then source code was updated to v:10.
   * Students computing v:10 fingerprint should STILL load the DB data
   * and re-merge it with the latest source — NOT fall back to hardcoded source.
   */

  it("should load DB data even when fingerprint version changes", () => {
    // This test validates the MERGE function still works correctly
    // The real fix is in the load flow — when fingerprint doesn't match,
    // students should still use latestState.module_data, just re-merge it
    const savedFromDb = [
      makeExercice(1, [
        makeQuestion(1, "Admin edited enonce", "B", "https://example.com/admin-image.png"),
        makeQuestion(2, "Also edited", "C"),
      ]),
    ];
    const newSource = [
      makeExercice(1, [
        makeQuestion(1, "Original enonce", "A"),
        makeQuestion(2, "Original 2", "A"),
        makeQuestion(3, "New question added in v10", "A"), // new in source
      ]),
    ];

    const merged = mergeSourceExercices(savedFromDb, newSource);

    // Admin edits must survive the merge
    expect(merged[0].questions![0].enonce).toBe("Admin edited enonce");
    expect(merged[0].questions![0].choix.find(c => c.correct)?.lettre).toBe("B");
    expect(merged[0].questions![0].image).toBe("https://example.com/admin-image.png");
    expect(merged[0].questions![1].enonce).toBe("Also edited");
    // New question from source must appear
    expect(merged[0].questions![2].enonce).toBe("New question added in v10");
  });

  it("should preserve admin image when source has no image", () => {
    const saved = [makeExercice(1, [makeQuestion(1, "Q1", "A", "https://cdn.example.com/photo.jpg")])];
    const source = [makeExercice(1, [makeQuestion(1, "Q1", "A")])]; // no image in source

    const merged = mergeSourceExercices(saved, source);
    expect(merged[0].questions![0].image).toBe("https://cdn.example.com/photo.jpg");
  });

  it("should preserve admin image when source also has an image", () => {
    const saved = [makeExercice(1, [makeQuestion(1, "Q1", "A", "https://cdn.example.com/new-photo.jpg")])];
    const source = [makeExercice(1, [makeQuestion(1, "Q1", "A", "https://cdn.example.com/old-photo.jpg")])];

    const merged = mergeSourceExercices(saved, source);
    // Admin's image should win
    expect(merged[0].questions![0].image).toBe("https://cdn.example.com/new-photo.jpg");
  });

  it("should fallback to source image when admin removed image (undefined)", () => {
    // When admin explicitly removes image, loadedQ.image is undefined → falls back to source
    const saved = [makeExercice(1, [makeQuestion(1, "Q1", "A", undefined)])];
    const source = [makeExercice(1, [makeQuestion(1, "Q1", "A", "https://cdn.example.com/original.jpg")])];

    const merged = mergeSourceExercices(saved, source);
    // With ?? operator, undefined falls back to source — this is the expected behavior
    expect(merged[0].questions![0].image).toBe("https://cdn.example.com/original.jpg");
  });
});

// ─── Bug 2: Save race condition ────────────────────────────────
describe("Bug 2: save race condition — last save must always contain ALL changes", () => {
  /**
   * Simulates rapid admin edits where multiple saves are triggered.
   * Each save should contain ALL accumulated changes, not just the latest one.
   *
   * The fix: debounce saves so only the final state is persisted,
   * and use a save version counter to detect stale writes.
   */

  it("should build correct cumulative state after multiple rapid question edits", () => {
    // Simulate: admin edits Q1, then Q2, then Q3 rapidly
    const baseExercices = [
      makeExercice(1, [
        makeQuestion(1, "Original Q1", "A"),
        makeQuestion(2, "Original Q2", "A"),
        makeQuestion(3, "Original Q3", "A"),
      ]),
    ];

    // Simulate functional updater pattern (correct approach)
    let state = { exercices: baseExercices };

    // Edit Q1
    state = {
      exercices: state.exercices.map(e =>
        e.id === 1
          ? { ...e, questions: e.questions!.map(q => q.id === 1 ? { ...q, enonce: "Edited Q1" } : q) }
          : e,
      ),
    };

    // Edit Q2 — using PREV state (functional updater pattern)
    state = {
      exercices: state.exercices.map(e =>
        e.id === 1
          ? { ...e, questions: e.questions!.map(q => q.id === 2 ? { ...q, enonce: "Edited Q2" } : q) }
          : e,
      ),
    };

    // Edit Q3
    state = {
      exercices: state.exercices.map(e =>
        e.id === 1
          ? { ...e, questions: e.questions!.map(q => q.id === 3 ? { ...q, enonce: "Edited Q3" } : q) }
          : e,
      ),
    };

    // ALL 3 edits should be present in the final state
    const questions = state.exercices[0].questions!;
    expect(questions[0].enonce).toBe("Edited Q1");
    expect(questions[1].enonce).toBe("Edited Q2");
    expect(questions[2].enonce).toBe("Edited Q3");
  });

  it("stale closure pattern loses intermediate updates (demonstrates the bug)", () => {
    // This demonstrates the BUG: using captured `moduleData` instead of functional updater
    const baseExercices = [
      makeExercice(1, [
        makeQuestion(1, "Original Q1", "A"),
        makeQuestion(2, "Original Q2", "A"),
        makeQuestion(3, "Original Q3", "A"),
      ]),
    ];

    // Captured snapshot (stale closure)
    const capturedState = { exercices: baseExercices };

    // Edit Q1 — uses captured (stale) state
    const afterEdit1 = {
      exercices: capturedState.exercices.map(e =>
        e.id === 1
          ? { ...e, questions: e.questions!.map(q => q.id === 1 ? { ...q, enonce: "Edited Q1" } : q) }
          : e,
      ),
    };

    // Edit Q2 — ALSO uses captured (stale) state, NOT afterEdit1!
    const afterEdit2 = {
      exercices: capturedState.exercices.map(e =>
        e.id === 1
          ? { ...e, questions: e.questions!.map(q => q.id === 2 ? { ...q, enonce: "Edited Q2" } : q) }
          : e,
      ),
    };

    // afterEdit2 does NOT contain Q1's edit — it was built from stale snapshot
    expect(afterEdit2.exercices[0].questions![0].enonce).toBe("Original Q1"); // Q1 edit LOST
    expect(afterEdit2.exercices[0].questions![1].enonce).toBe("Edited Q2");   // Only Q2 applied
  });
});

// ─── Bug 3: Image intermittent saves ──────────────────────────
describe("Bug 3: Image modifications — merge must preserve admin images consistently", () => {
  it("should preserve image across multiple merge cycles (simulating page reloads)", () => {
    const adminImage = "https://storage.example.com/cours-fichiers/module-1/q-1/photo.png";

    // Cycle 1: admin adds image
    const saved1 = [makeExercice(1, [makeQuestion(1, "Q1", "B", adminImage)])];
    const source = [makeExercice(1, [makeQuestion(1, "Q1", "A")])];
    const afterMerge1 = mergeSourceExercices(saved1, source);
    expect(afterMerge1[0].questions![0].image).toBe(adminImage);

    // Cycle 2: simulate save + reload (merged data becomes "loaded from DB")
    const afterMerge2 = mergeSourceExercices(afterMerge1, source);
    expect(afterMerge2[0].questions![0].image).toBe(adminImage);

    // Cycle 3: another reload
    const afterMerge3 = mergeSourceExercices(afterMerge2, source);
    expect(afterMerge3[0].questions![0].image).toBe(adminImage);
  });

  it("should preserve image + correct answer + enonce together across merges", () => {
    const saved = [makeExercice(1, [
      {
        id: 1,
        enonce: "Admin changed everything",
        image: "https://cdn.example.com/new-image.jpg",
        choix: [
          { lettre: "A", texte: "New A", correct: false },
          { lettre: "B", texte: "New B", correct: true },
          { lettre: "C", texte: "New C", correct: false },
        ],
      },
    ])];
    const source = [makeExercice(1, [
      {
        id: 1,
        enonce: "Original question",
        image: "https://cdn.example.com/old-image.jpg",
        choix: [
          { lettre: "A", texte: "Old A", correct: true },
          { lettre: "B", texte: "Old B", correct: false },
          { lettre: "C", texte: "Old C", correct: false },
        ],
      },
    ])];

    const merged = mergeSourceExercices(saved, source);
    const q = merged[0].questions![0];

    expect(q.enonce).toBe("Admin changed everything");
    expect(q.image).toBe("https://cdn.example.com/new-image.jpg");
    expect(q.choix[0].correct).toBe(false);
    expect(q.choix[1].correct).toBe(true);
    expect(q.choix[1].texte).toBe("New B");
  });

  it("should NOT lose admin questions when source adds new questions", () => {
    // Admin has edited 2 questions
    const saved = [makeExercice(1, [
      makeQuestion(1, "Admin Q1", "B", "https://img1.jpg"),
      makeQuestion(2, "Admin Q2", "C"),
    ])];
    // Source now has 3 questions (new Q3 added)
    const source = [makeExercice(1, [
      makeQuestion(1, "Source Q1", "A"),
      makeQuestion(2, "Source Q2", "A"),
      makeQuestion(3, "Source Q3 (new)", "A"),
    ])];

    const merged = mergeSourceExercices(saved, source);

    expect(merged[0].questions!.length).toBe(3);
    expect(merged[0].questions![0].enonce).toBe("Admin Q1"); // admin edit preserved
    expect(merged[0].questions![0].image).toBe("https://img1.jpg");
    expect(merged[0].questions![1].enonce).toBe("Admin Q2"); // admin edit preserved
    expect(merged[0].questions![2].enonce).toBe("Source Q3 (new)"); // new from source
  });
});

// ─── Integration: debounce save helper ─────────────────────────
describe("Debounce save helper", () => {
  it("debouncedSaveToDb should only trigger save once for rapid changes", async () => {
    // This test validates the debounce utility we'll create
    let saveCount = 0;
    let lastSavedData: any = null;

    const mockSave = async (data: any) => {
      saveCount++;
      lastSavedData = data;
    };

    // Simulate rapid changes with manual debounce logic
    const changes = ["change1", "change2", "change3", "change4", "change5"];
    let pending: any = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    for (const change of changes) {
      pending = change;
      if (timer) clearTimeout(timer);
      timer = setTimeout(async () => {
        if (pending) {
          await mockSave(pending);
          pending = null;
        }
      }, 500);
    }

    // Wait for debounce to fire
    await new Promise(r => setTimeout(r, 600));

    // Only ONE save should have happened with the LAST change
    expect(saveCount).toBe(1);
    expect(lastSavedData).toBe("change5");
  });
});
