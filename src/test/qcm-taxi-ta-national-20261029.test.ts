// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { applyCanonicalRowsToSections } from "@/components/fournisseurs/canonical-quiz-sections";
import rows from "./fixtures/qcm-taxi-national-20261029.json";

const source = readFileSync(new URL("../components/cours-en-ligne/ModuleDetailView.tsx", import.meta.url), "utf8");
const start = source.indexOf("const isAnswerCorrect = ");
const end = source.indexOf("\n    };", start);
if (start < 0 || end < 0) throw new Error("Scorer not found");
const compiled = await import("typescript");
const scorer = compiled.transpile(source.slice(start, end + 7), { target: compiled.ScriptTarget.ES2020 });
const correct = new Function("getQuestionChoices", `${scorer};return isAnswerCorrect`)((q: { choix?: unknown[] }) => q.choix ?? []) as (answer: string[], q: typeof rows[number]) => boolean;
const expected = [[1, "A"], [3, "BC"], [5, "CD"], [7, "A"], [10, "C"], [11, "BD"], [13, "A"], [14, "B"], [16, "B"]] as const;

describe("nine authorized shared TAXI/TA QCM", () => {
  it("includes exactly the authorized document numbers, without QRC or duplicates", () => {
    expect(rows.map(r => r.documentNumber)).toEqual([1, 3, 5, 7, 10, 11, 13, 14, 16]);
    expect(new Set(rows.map(r => r.question_id)).size).toBe(9);
    expect(rows.map(r => r.legacy_question_id)).toEqual([89,90,91,92,93,94,95,96,97]);
  });
  for (const [number, key] of expected) {
    it(`document Q${number}: accepts only ${key.split("").join("+")}`, () => {
      const q = rows.find(r => r.documentNumber === number);
      if (!q) throw new Error("Missing question");
      expect(q.choix.filter(c => c.correct).map(c => c.lettre).join("")).toBe(key);
      for (let mask = 0; mask < 2 ** q.choix.length; mask++) {
        const selected = q.choix.filter((_, i) => mask & (1 << i)).map(c => c.lettre);
        expect(correct(selected, q)).toBe(selected.join("") === key);
      }
      expect(correct(key.split("").reverse(), q)).toBe(true);
    });
  }
  for (const exercise of [605, 700]) {
    it(`hydrates all nine QCM for exercise ${exercise} without altering inputs`, () => {
      const before = JSON.stringify(rows);
      const section = [{ id: exercise, titre: "Réglementation nationale", questions: [] }];
      const mapped = rows.map(r => ({ ...r, section_id: exercise, updated_at: "2026-10-29T10:56:00Z" }));
      const result = applyCanonicalRowsToSections(section, mapped);
      expect(result[0].questions?.map(q => q.id)).toEqual([89,90,91,92,93,94,95,96,97]);
      expect(result[0].questions?.map(q => q.choix)).toEqual(rows.map(r => r.choix));
      expect(JSON.stringify(rows)).toBe(before);
    });
  }
});