// @vitest-environment node
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { calculerEtatSnapshots } from '@/components/cours-en-ligne/bilanSnapshotsEleve';

// Execute the actual canonical hydration body, without any hosted transport.
const source = readFileSync('src/components/cours-en-ligne/ModuleDetailView.tsx', 'utf8');
const start = source.indexOf('const applyCanonicalQuestionsToModule = (');
const end = source.indexOf('const buildTrainerOverrideMap', start);
if (start < 0 || end <= start) throw new Error('Canonical hydration unavailable');
const hydrate = new Function('canonicalRowsControle', 'cloneJson', 'controleConnaissancesDisplay',
  ts.transpile(source.slice(start, end), { target: ts.ScriptTarget.ES2020 }) + ';return applyCanonicalQuestionsToModule;')(
  (_data: unknown, rows: unknown[]) => rows,
  (value: unknown) => structuredClone(value),
  (value: unknown) => value,
);
const row = (id: number, section: number, enonce: string, choix: unknown[]) => ({
  legacy_question_id: id, section_id: section, position: id,
  question_id: `technical-${section}-${id}`, active: true, enonce, choix,
});
const keys = (q: { choix: Array<{ lettre: string; correct?: boolean }> }) =>
  q.choix.filter(c => c.correct).map(c => c.lettre);

describe('Bilans 5/11 — residual unsnapshotted history boundary', () => {
  it('a legacy passage without snapshot is not automatically protected by the strict snapshot fix', () => {
    expect(calculerEtatSnapshots([], [], false)).toEqual({ statut: 'pret', parExo: {}, rouges: [] });
    const old = { exercices: [{ id: 600, questions: [{ id: 104, choix: [
      { lettre: 'A', texte: 'services sur la voie publique sans réservation au préalable ?' },
      { lettre: 'B', texte: 'Maraude' }, { lettre: 'C', texte: 'Racolage', correct: true },
    ] }] }] };
    const before = structuredClone(old);
    const corrected = hydrate(old, [row(104, 600,
      'Quel est le terme utilisé quand un conducteur de T3P propose ses services sur la voie publique sans réservation au préalable ?',
      [{ lettre: 'A', texte: 'Maraude' }, { lettre: 'B', texte: 'Racolage', correct: true }, { lettre: 'C', texte: 'Réservation immédiate' }],
    )], new Set([600]));
    expect(keys(before.exercices[0].questions[0])).toEqual(['C']);
    expect(keys(corrected.exercices[0].questions[0])).toEqual(['B']);
    expect(old).toEqual(before);
  });

  it('adding approved Gestion Q206 to canonical-only hydration expands the legacy list by one', () => {
    const choices = [{ lettre: 'A', texte: '54.20 %' }, { lettre: 'B', texte: '52.87 %', correct: true }, { lettre: 'C', texte: '51.83 %' }];
    const existing = Array.from({ length: 197 }, (_, i) => row(i + 1, 601, `Technical question ${i + 1}`, choices));
    const data = { exercices: [{ id: 601, questions: [] }] };
    const before = hydrate(data, existing, new Set([601]));
    const after = hydrate(data, [...existing, row(206, 601,
      "LE CHIFFRE D'AFFAIRES D'UN ARTISAN T3P PASSE DE 10 100 € À 15 440 €, L'ANNÉE SUIVANTE. QUEL EST LE POURCENTAGE D'AUGMENTATION ?", choices)], new Set([601]));
    expect(before.exercices[0].questions).toHaveLength(197);
    expect(after.exercices[0].questions).toHaveLength(198);
    expect(keys(after.exercices[0].questions[197])).toEqual(['B']);
    expect(after.exercices[0].questions.slice(0, 197)).toEqual(before.exercices[0].questions);
  });
});