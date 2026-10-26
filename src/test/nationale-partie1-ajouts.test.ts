import { describe, it, expect } from 'vitest';
import { NATIONALE_PARTIE1_AJOUTS as ajouts, assemblerProposition, perimetreProposition, corrigerProposition, cleBrouillonNationale } from '@/components/cours-en-ligne/exercices/nationale-partie1-ajouts';
import { compterQuizModule } from '@/lib/moduleQuizCounter';

const old = Array.from({ length: 64 }, (_, i) => ({ id: i + 1, enonce: `Original ${i}`, choix: [{ lettre: 'A', texte: 'Réponse originale', correct: true }] }));
describe('Ajouts Nationale Partie 1 — proposition isolée', () => {
  it('conserve exactement les 64 objets et leur ordre, ajoute 25 identités nouvelles', () => {
    const copy = structuredClone(old); const next = assemblerProposition(old);
    expect(next).toHaveLength(89); expect(old).toEqual(copy);
    old.forEach((q, i) => expect(next[i]).toBe(q));
    expect(new Set(next.map(q => q.id)).size).toBe(89);
    expect(ajouts.map(q => q.id)).toEqual(Array.from({ length: 25 }, (_, i) => i + 99));
  });
  it('refuse un conflit plutôt que remplacer ou dédoublonner une question', () => {
    const conflict = [...old, { ...old[0], id: 99 }];
    expect(() => assemblerProposition(conflict)).toThrow('Conflit'); expect(conflict).toHaveLength(65);
  });
  it('un module terminé conserve son périmètre historique 1/1 et ajouts facultatifs', () => {
    const details = old.map(q => ({ exerciceId: 70, questionId: q.id, reponseEleve: 'A' }));
    const row = { status: 'completed', completed_at: '2026-10-25T10:00:00Z', details };
    const before = structuredClone(row);
    const p = perimetreProposition(old, true);
    expect(p.obligatoires).toEqual([]); expect(p.facultatives).toHaveLength(25);
    const c = compterQuizModule([row], [{ id: '70', label: 'Nationale', questionIds: p.questions.map(q => String(q.id)) }]);
    expect(c.completedQuizzes).toBe(1); expect(c.totalQuizzes).toBe(1); expect(row).toEqual(before);
  });
  it('un module non terminé devrait répondre aux ajouts après activation compatible', () => {
    const p = perimetreProposition(old, false);
    expect(p.obligatoires).toHaveLength(25); expect(p.facultatives).toEqual([]);
    const c = compterQuizModule([{ status: 'pending', details: old.map(q => ({ exerciceId: 70, questionId: q.id, reponseEleve: 'A' })) }], [{ id: '70', label: 'Nationale', questionIds: p.questions.map(q => String(q.id)) }]);
    expect(c.completedQuizzes).toBe(0); expect(c.totalQuizzes).toBe(1);
  });
  it('corrige tous les choix exacts, refuse choix manquant, faux ajouté ou vide', () => {
    const answers = Object.fromEntries(ajouts.map(q => [q.id, q.choix.filter(c => c.correct).map(c => c.lettre)]));
    expect(corrigerProposition(ajouts, answers).every(q => q.correct)).toBe(true);
    expect(corrigerProposition(ajouts, {}).some(q => q.correct)).toBe(false);
    const multi = ajouts.find(q => q.id === 110); expect(multi).toBeDefined();
    if (!multi) return;
    expect(corrigerProposition([multi], { 110: ['A'] })[0]?.correct).toBe(false);
    expect(corrigerProposition([multi], { 110: ['A','B','C','D'] })[0]?.correct).toBe(false);
  });
  it('les règles concrètes conservées : priorité 2/5, un an, PSC1 entrée uniquement', () => {
    expect(ajouts.find(q => q.id === 108)?.choix[0].texte).toBe('Au moins deux ans d’activité de conducteur de taxi au cours des cinq ans précédant la délivrance');
    expect(ajouts.find(q => q.id === 106)?.choix[0].texte).toBe('Un an');
    expect(ajouts.find(q => q.id === 119)?.choix[0].texte).toBe('Lors de l’entrée initiale dans la profession');
  });
  it('les clés de brouillons ne se croisent pas entre comptes ou dossiers', () => {
    expect(cleBrouillonNationale('compte1','dossier1')).not.toBe(cleBrouillonNationale('compte2','dossier1'));
    expect(cleBrouillonNationale('compte1','dossier1')).not.toBe(cleBrouillonNationale('compte1','dossier2'));
  });
});