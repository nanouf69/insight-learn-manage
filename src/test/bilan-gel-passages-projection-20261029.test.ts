// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { projectionSommeCoursActive } from '@/lib/bilanCoursSommeProjection';

describe('29/10 — passages figés et Bilan exercices TAXI complet', () => {
  it('le Bilan exercices TAXI (9) n’est plus réduit au cours : T3P 206 / Gestion 171 affichées', () => {
    expect(projectionSommeCoursActive(9)).toBe(false);
  });
  it('l’écran élève affiche la copie figée sans superposer le contenu actuel', () => {
    const src = readFileSync('src/components/cours-en-ligne/ModuleDetailView.tsx', 'utf8');
    expect(src).toContain('return snap ? { ...e, questions: snap.questions as any } : e;');
    expect(src).not.toMatch(/questionsSnapshotCorrigees\(/);
  });
});
