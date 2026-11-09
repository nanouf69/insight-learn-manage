// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { projectionSommeCoursActive } from '@/lib/bilanCoursSommeProjection';

describe('09/11 — passages figés et composition T3P ciblée', () => {
  it('projette uniquement T3P en 128 questions et laisse Gestion hors du correctif', () => {
    expect(projectionSommeCoursActive(9)).toBe(true);
    expect(projectionSommeCoursActive(9, 100)).toBe(true);
    expect(projectionSommeCoursActive(9, 101)).toBe(false);
  });
  it('l’écran élève affiche la copie figée sans superposer le contenu actuel', () => {
    const src = readFileSync('src/components/cours-en-ligne/ModuleDetailView.tsx', 'utf8');
    expect(src).toContain('return snap ? { ...e, questions: snap.questions as any } : e;');
    expect(src).not.toMatch(/questionsSnapshotCorrigees\(/);
  });
});
