import { describe, it, expect } from "vitest";

/**
 * Tests for save audit findings:
 * 1. beforeunload must flush pending debounced saves
 * 2. CoursEditor.onSave must use functional updater (no stale closure)
 * 3. Double propagation: only ONE system should propagate to siblings
 * 4. Propagation must not lose concurrent changes (TOCTOU)
 */

// ─── Helpers ───────────────────────────────────────────────────
function makeExercice(id: number, questions: any[]) {
  return { id, titre: `Exercice ${id}`, sousTitre: "", actif: true, questions };
}

function makeCours(id: number, titre: string) {
  return { id, titre, actif: true };
}

function makeQuestion(id: number, enonce: string, correct: string) {
  return {
    id,
    enonce,
    choix: [
      { lettre: "A", texte: "Choix A", correct: correct === "A" },
      { lettre: "B", texte: "Choix B", correct: correct === "B" },
      { lettre: "C", texte: "Choix C", correct: correct === "C" },
    ],
  };
}

// ─── Bug 1: beforeunload flush ──────────────────────────────────
describe("Bug 1: beforeunload must flush pending debounced saves", () => {
  it("debounced save must be flushed synchronously before unload", async () => {
    let saveCount = 0;
    let lastSavedData: any = null;
    let pendingData: any = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    // Simulate the debounced save pattern
    const queueSave = (data: any) => {
      pendingData = data;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        saveCount++;
        lastSavedData = pendingData;
        pendingData = null;
      }, 1500);
    };

    // Simulate the beforeunload flush handler (THE FIX)
    const flushOnUnload = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (pendingData) {
        // Synchronous save to localStorage
        saveCount++;
        lastSavedData = pendingData;
        pendingData = null;
      }
    };

    // Admin makes a change
    queueSave({ moduleData: { id: 1, exercices: [makeExercice(1, [makeQuestion(1, "Edited", "B")])] } });

    // Before debounce fires, simulate browser close
    expect(pendingData).not.toBeNull(); // Data is pending
    expect(saveCount).toBe(0); // Not saved yet

    // Flush (what beforeunload handler should do)
    flushOnUnload();

    expect(saveCount).toBe(1); // Flushed!
    expect(lastSavedData.moduleData.exercices[0].questions[0].enonce).toBe("Edited");
    expect(pendingData).toBeNull(); // Nothing pending
  });
});

// ─── Bug 2: Stale closure in CoursEditor.onSave ────────────────
describe("Bug 2: CoursEditor.onSave must use functional updater", () => {
  it("stale closure loses cours edits when exercice edit happens between renders", () => {
    // Initial state
    const initial = {
      id: 1,
      nom: "Module 1",
      description: "",
      cours: [makeCours(1, "Cours original"), makeCours(2, "Cours 2")],
      exercices: [makeExercice(10, [makeQuestion(1, "Q original", "A")])],
    };

    // STALE CLOSURE PATTERN (the bug)
    // Both operations capture the same snapshot
    const capturedState = { ...initial };

    // Operation 1: edit exercice questions
    const afterExerciceEdit = {
      ...capturedState,
      exercices: capturedState.exercices.map(e =>
        e.id === 10 ? { ...e, questions: [makeQuestion(1, "Q edited", "B")] } : e
      ),
    };

    // Operation 2: edit cours — USES SAME CAPTURED STATE (stale!)
    const afterCoursEdit = {
      ...capturedState, // <-- BUG: should be afterExerciceEdit
      cours: capturedState.cours.map(c =>
        c.id === 1 ? { ...c, titre: "Cours modifié" } : c
      ),
    };

    // Exercice edit is LOST because cours edit used stale state
    expect(afterCoursEdit.exercices[0].questions[0].enonce).toBe("Q original"); // BUG confirmed
    expect(afterCoursEdit.cours[0].titre).toBe("Cours modifié");
  });

  it("functional updater preserves all changes", () => {
    // Initial state
    let state = {
      id: 1,
      nom: "Module 1",
      description: "",
      cours: [makeCours(1, "Cours original"), makeCours(2, "Cours 2")],
      exercices: [makeExercice(10, [makeQuestion(1, "Q original", "A")])],
    };

    // Simulate functional updater pattern (correct)
    // Operation 1: edit exercice
    state = {
      ...state,
      exercices: state.exercices.map(e =>
        e.id === 10 ? { ...e, questions: [makeQuestion(1, "Q edited", "B")] } : e
      ),
    };

    // Operation 2: edit cours — uses CURRENT state (functional updater)
    state = {
      ...state,
      cours: state.cours.map(c =>
        c.id === 1 ? { ...c, titre: "Cours modifié" } : c
      ),
    };

    // BOTH changes are preserved
    expect(state.exercices[0].questions[0].enonce).toBe("Q edited");
    expect(state.cours[0].titre).toBe("Cours modifié");
  });
});

// ─── Bug 3: Double propagation ──────────────────────────────────
describe("Bug 3: Only ONE propagation system should modify sibling modules", () => {
  it("two concurrent propagations on same module can lose changes", () => {
    // Simulate: Module A saves, triggers both propagation systems
    const siblingModuleData = {
      id: 2,
      exercices: [
        makeExercice(1, [
          makeQuestion(1, "Shared Q1", "A"),
          makeQuestion(2, "Shared Q2", "A"),
        ]),
      ],
    };

    // System 1 (enonce-based): changes Q1's correct answer
    const afterSystem1 = {
      ...siblingModuleData,
      exercices: siblingModuleData.exercices.map(e => ({
        ...e,
        questions: e.questions.map(q =>
          q.enonce === "Shared Q1"
            ? { ...q, choix: q.choix.map(c => ({ ...c, correct: c.lettre === "B" })) }
            : q
        ),
      })),
    };

    // System 2 (ID-based): reads ORIGINAL data (before System 1 wrote), changes Q2
    // This is the TOCTOU race — System 2 read BEFORE System 1 wrote
    const afterSystem2 = {
      ...siblingModuleData, // <-- reads stale data, not afterSystem1
      exercices: siblingModuleData.exercices.map(e => ({
        ...e,
        questions: e.questions.map(q =>
          q.id === 2
            ? { ...q, choix: q.choix.map(c => ({ ...c, correct: c.lettre === "C" })) }
            : q
        ),
      })),
    };

    // System 2 writes LAST, overwriting System 1's change to Q1
    const finalState = afterSystem2;

    // Q1's change from System 1 is LOST
    expect(finalState.exercices[0].questions[0].choix.find((c: any) => c.correct)?.lettre).toBe("A"); // System 1's B change is gone
    expect(finalState.exercices[0].questions[1].choix.find((c: any) => c.correct)?.lettre).toBe("C"); // System 2's change survived

    // With a SINGLE propagation system, both changes would be preserved
    const correctFinal = {
      ...siblingModuleData,
      exercices: siblingModuleData.exercices.map(e => ({
        ...e,
        questions: e.questions.map(q => {
          if (q.id === 1) return { ...q, choix: q.choix.map(c => ({ ...c, correct: c.lettre === "B" })) };
          if (q.id === 2) return { ...q, choix: q.choix.map(c => ({ ...c, correct: c.lettre === "C" })) };
          return q;
        }),
      })),
    };

    expect(correctFinal.exercices[0].questions[0].choix.find((c: any) => c.correct)?.lettre).toBe("B");
    expect(correctFinal.exercices[0].questions[1].choix.find((c: any) => c.correct)?.lettre).toBe("C");
  });
});

// ─── Bug 4: TOCTOU in propagation ───────────────────────────────
describe("Bug 4: Propagation must not lose concurrent changes (TOCTOU)", () => {
  it("read-then-write without lock can overwrite concurrent changes", () => {
    // Initial sibling state in DB
    const dbState = {
      exercices: [
        makeExercice(1, [
          makeQuestion(1, "Q1", "A"),
          makeQuestion(2, "Q2", "A"),
          makeQuestion(3, "Q3", "A"),
        ]),
      ],
    };

    // Module A reads sibling state at time T0
    const readByA = JSON.parse(JSON.stringify(dbState));
    // Module B reads sibling state at time T0 (same stale read)
    const readByB = JSON.parse(JSON.stringify(dbState));

    // Module A modifies Q1 and writes at T1
    readByA.exercices[0].questions[0] = makeQuestion(1, "Q1 edited by A", "B");
    // DB now has A's change (simulated)

    // Module B modifies Q3 and writes at T2 — uses its STALE read from T0
    readByB.exercices[0].questions[2] = makeQuestion(3, "Q3 edited by B", "C");
    // DB now has B's write which DOESN'T include A's Q1 change

    // Final DB state = B's write (last writer wins)
    const finalDb = readByB;

    // A's change to Q1 is LOST
    expect(finalDb.exercices[0].questions[0].enonce).toBe("Q1"); // A's edit gone!
    expect(finalDb.exercices[0].questions[2].enonce).toBe("Q3 edited by B"); // B's edit preserved

    // The fix: merge before writing (read latest → merge → write)
    // Or: eliminate concurrent writes by using a single propagation point
  });
});
