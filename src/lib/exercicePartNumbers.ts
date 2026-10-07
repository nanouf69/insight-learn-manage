import { orderedCoursePages } from "./courseQuizOrder";

type Course = { id: number; titre: string; actif: boolean };
type Exercise = Course & { questions?: readonly unknown[] };

/** Admin labels only; never changes content, learner order or stored progress. */
export function computeExercicePartNumbers<C extends Course, E extends Exercise>(
  moduleId: number, cours: C[], exercices: E[],
): Map<number, string> {
  const interleaved = new Set([2, 10, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 39, 40, 41, 42, 43]);
  const bilan = new Set([4, 5, 9, 11, 27, 28, 29, 30, 81, 82]);
  const ac = (cours || []).filter(c => c.actif);
  const ae = (exercices || []).filter(e => e.actif);
  const pages = interleaved.has(Number(moduleId))
    ? orderedCoursePages(ac, ae)
    : [
      ...ac.map(c => ({ type: "cours" as const, cours: c })),
      ...ae.map(e => ({ type: "exercice-single" as const, exercice: e })),
    ];
  const result = new Map<number, string>();
  if (bilan.has(Number(moduleId))) {
    let n = 0;
    pages.forEach(p => { if (p.type === "exercice-single") result.set(Number(p.exercice.id), String(++n)); });
    return result;
  }
  if (pages.some(p => p.type === "cours" && /^\s*[A-G]\./i.test(p.cours.titre))) {
    const parts: Record<string, number> = {};
    let currentPart: number | undefined;
    pages.forEach(p => {
      if (p.type === "cours") {
        const letter = p.cours.titre.match(/^\s*([A-G])\./i)?.[1]?.toUpperCase() || "A";
        currentPart = (parts[letter] || 0) + 1;
        parts[letter] = currentPart;
      } else if (currentPart !== undefined) {
        result.set(Number(p.exercice.id), String(currentPart));
      }
    });
    return result;
  }
  let pair = 0;
  let lastCourse = -1;
  pages.forEach((p, i) => {
    if (p.type === "cours") { pair++; lastCourse = i; }
    else {
      const isQuiz = (p.exercice.questions?.length || 0) > 0;
      const n = isQuiz ? (lastCourse === i - 1 ? pair : ++pair) : ++pair;
      result.set(Number(p.exercice.id), String(n));
    }
  });
  return result;
}