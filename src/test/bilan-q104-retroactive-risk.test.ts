// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { questionsSnapshotCorrigees } from '@/components/cours-en-ligne/bilanSnapshotsEleve';

describe('Diagnostic Q104 — correction actuelle et passage fictif déjà ouvert', () => {
  it('prouve que les choix actuels changent la clé affichée sans modifier le snapshot source', () => {
    const snapshot = [{
      id: 104,
      enonce: 'Quel est le terme utilisé quand un conducteur de T3P propose ses',
      choix: [
        { lettre: 'A', texte: 'services sur la voie publique sans réservation au préalable ?' },
        { lettre: 'B', texte: 'Maraude' },
        { lettre: 'C', texte: 'Racolage', correct: true },
        { lettre: 'D', texte: 'Réservation immédiate' },
      ],
    }];
    const before = JSON.stringify(snapshot);
    const current = [{
      id: 104,
      enonce: 'Quel est le terme utilisé quand un conducteur de T3P propose ses services sur la voie publique sans réservation au préalable ?',
      choix: [
        { lettre: 'A', texte: 'Maraude' },
        { lettre: 'B', texte: 'Racolage', correct: true },
        { lettre: 'C', texte: 'Réservation immédiate' },
      ],
    }];
    const displayed = questionsSnapshotCorrigees(snapshot, current);
    expect(snapshot[0].choix.filter(c => c.correct).map(c => c.lettre)).toEqual(['C']);
    expect(displayed[0].choix.filter((c: { correct?: boolean }) => c.correct).map((c: { lettre: string }) => c.lettre)).toEqual(['B']);
    expect(displayed[0].choix.find((c: { lettre: string }) => c.lettre === 'C')?.correct === true).toBe(false);
    expect(JSON.stringify(snapshot)).toBe(before);
  });
});