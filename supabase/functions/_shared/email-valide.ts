// Fonction pure (testée par src/test/audit-20261008-corrections.test.ts).
export function estEmailValide(to: unknown): boolean {
  return typeof to === "string" && /^[^\s@,;<>]+@[^\s@,;<>]+\.[a-z]{2,}$/i.test(to.trim());
}
