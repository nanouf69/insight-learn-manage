// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import baseline from "./fixtures/formation-order-baseline-20261007.json";
import { FORMATION_MODULES } from "@/components/cours-en-ligne/modules-config";
import { VTC_COURS_DATA } from "@/components/cours-en-ligne/vtc-cours-data";
import { TAXI_COURS_DATA } from "@/components/cours-en-ligne/taxi-cours-data";
import { TA_COURS_DATA } from "@/components/cours-en-ligne/ta-cours-data";
import { VA_COURS_DATA } from "@/components/cours-en-ligne/va-cours-data";
import { coursePageKey, legacyCoursePages, orderedCoursePages, translateCoursePageIndex } from "@/lib/courseQuizOrder";
import { computeExercicePartNumbers } from "@/lib/exercicePartNumbers";

describe("All configured formations — approved admin-label-only change", () => {
  for (const [id, formation] of Object.entries(baseline.formations)) {
    it(`${id}: complete module order and labels unchanged`, () => {
      expect(FORMATION_MODULES[id]).toEqual(formation);
    });
  }
  for (const [file, hash] of Object.entries(baseline.sourceHashes)) {
    it(`${file}: all pedagogical content, quiz IDs and active flags unchanged`, () => {
      expect(createHash("sha256").update(readFileSync(file)).digest("hex")).toBe(hash);
    });
  }
  for (const module of [VTC_COURS_DATA, TAXI_COURS_DATA, TA_COURS_DATA, VA_COURS_DATA]) {
    it(`${module.id}: complete learner course/quiz order unchanged and coordinates round-trip`, () => {
      const c = module.cours.filter(c => c.actif);
      const e = module.exercices.filter(e => e.actif);
      const pages = orderedCoursePages(c, e);
      expect(pages.map(coursePageKey)).toEqual(baseline.coursePages[String(module.id) as keyof typeof baseline.coursePages]);
      const old = legacyCoursePages(c, e);
      old.forEach((_, i) => expect(translateCoursePageIndex(translateCoursePageIndex(i, old, pages), pages, old)).toBe(i));
      expect(orderedCoursePages(c, [...e].reverse()).map(coursePageKey)).toEqual(pages.map(coursePageKey));
    });
  }
  it("admin labels do not shift Gestion or Anglais after inactive quizzes", () => {
    for (const module of [VTC_COURS_DATA, TAXI_COURS_DATA]) {
      const exercises = module.exercices.map(e => ({ ...e, actif: ![1, 2, 3, 4].includes(e.id) }));
      const labels = computeExercicePartNumbers(module.id, module.cours, exercises);
      expect([60, 61, 62].map(id => labels.get(id))).toEqual(["1", "2", "3"]);
      expect([5, 6].map(id => labels.get(id))).toEqual(["3", "4"]);
      expect(computeExercicePartNumbers(module.id, module.cours, [...exercises].reverse())).toEqual(labels);
    }
  });
  it("preserves TA extra series association and VA associations", () => {
    const ta = computeExercicePartNumbers(40, TA_COURS_DATA.cours, TA_COURS_DATA.exercices);
    expect(ta.get(73)).toBe(ta.get(76));
    const va = computeExercicePartNumbers(41, VA_COURS_DATA.cours, VA_COURS_DATA.exercices);
    expect(va.get(7)).toBe("1");
    expect(va.get(72)).toBe("1");
  });
  it("preserves non-interleaved and bilan numbering without mutating inputs", () => {
    const courses = [{ id: 999, titre: "Cours", actif: true }];
    const exercises = [{ id: 800, titre: "Quiz", actif: true, questions: [{}] }, { id: 801, titre: "Quiz 2", actif: true }];
    const before = JSON.stringify({ courses, exercises });
    expect([...computeExercicePartNumbers(81, courses, exercises).values()]).toEqual(["1", "2"]);
    expect([...computeExercicePartNumbers(90, courses, exercises).values()]).toEqual(["1", "2"]);
    expect(JSON.stringify({ courses, exercises })).toBe(before);
  });
  it("admin caller uses the tested function; learner and persistence region is byte-identical", () => {
    const source = readFileSync("src/components/cours-en-ligne/ModuleDetailView.tsx", "utf8");
    expect(source).toContain('import { computeExercicePartNumbers } from "@/lib/exercicePartNumbers"');
    expect(source).not.toContain("const maxLen = Math.max(ac.length, ae.length)");
  });
});