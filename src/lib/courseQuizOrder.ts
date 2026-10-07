/** Display order only. Quiz IDs and historical server page positions never change. */
export type CoursePage<C, E> = { type: "cours"; cours: C } | { type: "exercice-single"; exercice: E };
type Identified = { id: number };

const QUIZZES_BY_COURSE: Record<number, readonly number[]> = {
  1001: [1], 1002: [2],
  2001: [60], 2002: [61], 2003: [62],
  3001: [80], 3002: [81], 3003: [82], 4001: [50],
  5001: [3], 5002: [4], 5003: [5], 5004: [6], 7001: [7], 6003: [72],
  10001: [1], 10002: [2], 10003: [60], 10004: [61], 10005: [62],
  10006: [80], 10007: [81], 10008: [82], 10009: [50],
  10010: [3], 10011: [4], 10012: [5], 10013: [6],
  10014: [70], 10015: [71], 10016: [73, 76], 10017: [74], 10018: [75],
  40001: [70], 40002: [71], 40003: [73, 76], 40004: [74], 40005: [75],
  41001: [7], 41002: [72],
};

export function coursePageKey<C extends Identified, E extends Identified>(page: CoursePage<C, E>): string {
  return page.type === "cours" ? `cours:${page.cours.id}` : `exo:${page.exercice.id}`;
}

export function legacyCoursePages<C extends Identified, E extends Identified>(courses: C[], exercises: E[]): CoursePage<C, E>[] {
  const pages: CoursePage<C, E>[] = [];
  for (let i = 0; i < Math.max(courses.length, exercises.length); i++) {
    const cours = courses[i];
    const exercice = exercises[i];
    if (cours) pages.push({ type: "cours", cours });
    if (exercice) pages.push({ type: "exercice-single", exercice });
  }
  return pages;
}

export function orderedCoursePages<C extends Identified, E extends Identified>(courses: C[], exercises: E[]): CoursePage<C, E>[] {
  const pages: CoursePage<C, E>[] = [];
  const placed = new Set<number>();
  courses.forEach((cours) => {
    pages.push({ type: "cours", cours });
    for (const id of QUIZZES_BY_COURSE[Number(cours.id)] ?? []) {
      // Preserve every item, including conflicting duplicates; never silently deduplicate.
      exercises.forEach((exercice, index) => {
        if (Number(exercice.id) === id && !placed.has(index)) {
          pages.push({ type: "exercice-single", exercice });
          placed.add(index);
        }
      });
    }
  });
  exercises.forEach((exercice, index) => {
    if (!placed.has(index)) pages.push({ type: "exercice-single", exercice });
  });
  return pages;
}

/** Read/write adapter: preserve the old server coordinate system, with no data migration. */
export function translateCoursePageIndex<C extends Identified, E extends Identified>(
  index: number, from: CoursePage<C, E>[], to: CoursePage<C, E>[],
): number {
  const page = from[index];
  if (!page) return -1;
  const key = coursePageKey(page);
  // Occurrence matters when source data contains conflicting duplicates.
  const occurrence = from.slice(0, index).filter((p) => coursePageKey(p) === key).length;
  let seen = 0;
  return to.findIndex((p) => coursePageKey(p) === key && seen++ === occurrence);
}