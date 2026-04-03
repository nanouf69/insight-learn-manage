import { describe, it, expect } from "vitest";
import { mergeSourceExercices } from "@/components/cours-en-ligne/examens-blancs-utils";

/**
 * Tests for image deletion propagation bug:
 *
 * BUG: When admin deletes an image from a question:
 * 1. QuestionImageUpload calls onImageChange(undefined)
 * 2. The question is saved with image: undefined
 * 3. JSON.stringify strips undefined → the "image" key disappears from DB
 * 4. mergeSourceExercices does: image: loadedQ.image ?? sourceQ.image
 *    → undefined ?? sourceImage = sourceImage → deletion is LOST
 *
 * FIX:
 * 1. Save image: null (not undefined) when admin removes it — null survives JSON.stringify
 * 2. In merge, check if "image" key exists in loadedQ with hasOwnProperty instead of ??
 *    OR use a sentinel value approach where null means "explicitly removed"
 */

function makeExercice(id: number, questions: any[]) {
  return { id, titre: `Exercice ${id}`, sousTitre: "", actif: true, questions };
}

function makeQuestion(id: number, enonce: string, correct: string, image?: string | null) {
  const q: any = {
    id,
    enonce,
    choix: [
      { lettre: "A", texte: "Choix A", correct: correct === "A" },
      { lettre: "B", texte: "Choix B", correct: correct === "B" },
    ],
  };
  // Only set image key if provided (simulates DB behavior where undefined keys are stripped)
  if (image !== undefined) {
    q.image = image;
  }
  return q;
}

// Simulate what JSON.parse(JSON.stringify(obj)) does — strips undefined values
function simulateDbRoundtrip(obj: any): any {
  return JSON.parse(JSON.stringify(obj));
}

describe("Bug: Admin image deletion lost after merge", () => {
  it("undefined image is stripped by JSON.stringify, causing merge to restore source image", () => {
    // Admin deletes image → image becomes undefined
    const adminQuestion = { id: 1, enonce: "Q1", image: undefined, choix: [{ lettre: "A", texte: "A", correct: true }] };
    const serialized = JSON.stringify(adminQuestion);

    // undefined is stripped from JSON
    expect(serialized).not.toContain("image");

    // After DB roundtrip, the "image" key is completely gone
    const fromDb = JSON.parse(serialized);
    expect("image" in fromDb).toBe(false);
  });

  it("null image survives JSON.stringify, preserving the deletion intent", () => {
    // Admin deletes image → image becomes null (THE FIX)
    const adminQuestion = { id: 1, enonce: "Q1", image: null, choix: [{ lettre: "A", texte: "A", correct: true }] };
    const serialized = JSON.stringify(adminQuestion);

    // null IS preserved in JSON
    expect(serialized).toContain('"image":null');

    // After DB roundtrip, the "image" key exists with null value
    const fromDb = JSON.parse(serialized);
    expect("image" in fromDb).toBe(true);
    expect(fromDb.image).toBeNull();
  });

  it("mergeSourceExercices should NOT restore source image when admin explicitly deleted it (null)", () => {
    // Admin removed the image → saved with null
    const saved = [makeExercice(1, [{
      id: 1,
      enonce: "Q1",
      image: null, // explicitly deleted
      choix: [{ lettre: "A", texte: "A", correct: true }],
    }])];

    const source = [makeExercice(1, [{
      id: 1,
      enonce: "Q1",
      image: "https://cdn.example.com/original.jpg",
      choix: [{ lettre: "A", texte: "A", correct: true }],
    }])];

    const merged = mergeSourceExercices(saved, source);

    // With the fix: null means "admin deleted it" → should stay null, not fall back to source
    expect(merged[0].questions![0].image).toBeNull();
  });

  it("mergeSourceExercices should preserve admin image when it exists", () => {
    const saved = [makeExercice(1, [{
      id: 1,
      enonce: "Q1",
      image: "https://cdn.example.com/admin-image.jpg",
      choix: [{ lettre: "A", texte: "A", correct: true }],
    }])];

    const source = [makeExercice(1, [{
      id: 1,
      enonce: "Q1",
      image: "https://cdn.example.com/old-image.jpg",
      choix: [{ lettre: "A", texte: "A", correct: true }],
    }])];

    const merged = mergeSourceExercices(saved, source);
    expect(merged[0].questions![0].image).toBe("https://cdn.example.com/admin-image.jpg");
  });

  it("mergeSourceExercices should use source image when saved has no image key at all", () => {
    // Question never had an image set (key absent) → use source image
    const saved = [makeExercice(1, [makeQuestion(1, "Q1", "A")])]; // no image key
    const source = [makeExercice(1, [{
      id: 1,
      enonce: "Q1",
      image: "https://cdn.example.com/source.jpg",
      choix: [{ lettre: "A", texte: "A", correct: true }],
    }])];

    const merged = mergeSourceExercices(saved, source);
    // image key absent in saved → fallback to source is correct
    expect(merged[0].questions![0].image).toBe("https://cdn.example.com/source.jpg");
  });

  it("full roundtrip: admin deletes image → save to DB → load → merge → image stays deleted", () => {
    // Step 1: admin has a question with image
    const original = [makeExercice(1, [{
      id: 1, enonce: "Q1", image: "https://cdn.example.com/photo.jpg",
      choix: [{ lettre: "A", texte: "A", correct: true }],
    }])];

    // Step 2: admin deletes image → null (the fix)
    const afterDelete = [makeExercice(1, [{
      id: 1, enonce: "Q1", image: null,
      choix: [{ lettre: "A", texte: "A", correct: true }],
    }])];

    // Step 3: saved to DB (JSON roundtrip)
    const fromDb = simulateDbRoundtrip(afterDelete);
    expect(fromDb[0].questions[0].image).toBeNull(); // null survives

    // Step 4: merged with source
    const source = [makeExercice(1, [{
      id: 1, enonce: "Q1", image: "https://cdn.example.com/photo.jpg",
      choix: [{ lettre: "A", texte: "A", correct: true }],
    }])];

    const merged = mergeSourceExercices(fromDb, source);
    // Image should stay deleted (null), not restored from source
    expect(merged[0].questions![0].image).toBeNull();
  });
});
