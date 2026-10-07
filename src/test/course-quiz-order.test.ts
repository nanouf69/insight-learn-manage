// @vitest-environment node
import { describe, expect, it } from "vitest";
import { coursePageKey, legacyCoursePages, orderedCoursePages, translateCoursePageIndex } from "@/lib/courseQuizOrder";
import { t3pPartie2DisplaySupport, T3P_PARTIE2_PDF_URL, T3P_PARTIE2_PPTX_URL } from "@/lib/t3pPartie2Support";

const courses = [1001, 1002, 2001, 2002, 2003].map(id => ({ id }));
const exercises = [60, 61, 62].map(id => ({ id }));
const keys = (pages: ReturnType<typeof orderedCoursePages>) => pages.map(coursePageKey);

describe("Stable course/quiz association", () => {
  it("does not place Gestion between the T3P chapters when T3P quizzes are inactive", () => {
    expect(keys(orderedCoursePages(courses, exercises))).toEqual([
      "cours:1001", "cours:1002", "cours:2001", "exo:60", "cours:2002", "exo:61", "cours:2003", "exo:62",
    ]);
  });
  it("does not depend on quiz array order", () => {
    expect(keys(orderedCoursePages(courses, [...exercises].reverse()))).toEqual(keys(orderedCoursePages(courses, exercises)));
  });
  it("places already-active T3P quizzes after their own chapter", () => {
    expect(keys(orderedCoursePages(courses, [{ id: 2 }, ...exercises, { id: 1 }])).slice(0, 4))
      .toEqual(["cours:1001", "exo:1", "cours:1002", "exo:2"]);
  });
  it("retains unknown exercises and duplicate conflicting items", () => {
    const duplicate = { id: 60, note: "different item" };
    const result = orderedCoursePages(courses, [...exercises, duplicate, { id: 999 }]);
    expect(result.filter(p => p.type === "exercice-single")).toHaveLength(5);
    expect(result.some(p => p.type === "exercice-single" && p.exercice === duplicate)).toBe(true);
  });
  it("preserves objects and source arrays", () => {
    const before = JSON.stringify({ courses, exercises });
    const result = orderedCoursePages(courses, exercises);
    expect(result[0]).toEqual({ type: "cours", cours: courses[0] });
    expect(JSON.stringify({ courses, exercises })).toBe(before);
  });
  it("round-trips every historical server and browser page position without migration", () => {
    const old = legacyCoursePages(courses, exercises);
    const next = orderedCoursePages(courses, exercises);
    old.forEach((page, index) => {
      const translated = translateCoursePageIndex(index, old, next);
      expect(coursePageKey(next[translated])).toBe(coursePageKey(page));
      expect(translateCoursePageIndex(translated, next, old)).toBe(index);
    });
  });
  it("round-trips duplicate occurrences too", () => {
    const exos = [...exercises, { id: 60 }];
    const old = legacyCoursePages(courses, exos);
    const next = orderedCoursePages(courses, exos);
    old.forEach((_, i) => expect(translateCoursePageIndex(translateCoursePageIndex(i, old, next), next, old)).toBe(i));
  });
  it("keeps Anglais 3 and 4 attached when parts 1 and 2 are inactive", () => {
    expect(keys(orderedCoursePages([5001,5002,5003,5004].map(id => ({id})), [{id:5},{id:6}])))
      .toEqual(["cours:5001", "cours:5002", "cours:5003", "exo:5", "cours:5004", "exo:6"]);
  });
  it("handles TAXI, TA extra series, and VA by the same identity rule", () => {
    expect(keys(orderedCoursePages([{id:10001},{id:10002},{id:10003}], [{id:60}]))).toEqual(["cours:10001","cours:10002","cours:10003","exo:60"]);
    expect(keys(orderedCoursePages([{id:40003},{id:40004}], [{id:74},{id:76},{id:73}]))).toEqual(["cours:40003","exo:73","exo:76","cours:40004","exo:74"]);
    expect(keys(orderedCoursePages([{id:41001},{id:41002}], [{id:72},{id:7}]))).toEqual(["cours:41001","exo:7","cours:41002","exo:72"]);
  });
});

describe("Versioned T3P support", () => {
  it("uses a matching full PDF for the historical PowerPoint", () => {
    expect(t3pPartie2DisplaySupport("/cours/vtc/A_T3P_partie_2.pptx?v=old"))
      .toEqual({url:T3P_PARTIE2_PPTX_URL,pdfUrl:T3P_PARTIE2_PDF_URL});
  });
  it("does not change a custom admin upload or another course", () => {
    for (const url of ["/custom/A_T3P_partie_2.pptx", "/cours/vtc/A_T3P_partie_1.pptx", "https://example.org/A_T3P_2.pdf"])
      expect(t3pPartie2DisplaySupport(url)).toEqual({url});
  });
});