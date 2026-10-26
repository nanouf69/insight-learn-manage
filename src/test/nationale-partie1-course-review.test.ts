import { describe, expect, it } from 'vitest';
import { nationalePartie1CourseReview } from '@/lib/nationalePartie1CourseReview';
import audit from '../../docs/nationale-partie1-cours-audit-64.json';
import complements from '../../docs/nationale-partie1-cours-complements-2026-10-26.json';

describe('Rectification : cours Partie 1 uniquement', () => {
  it('propose 16 originales et 14 compléments uniquement pour le cours 10014 du module10 admin', () => {
    const result = nationalePartie1CourseReview(10, 10014, false);
    expect(result?.originalSlides).toBe(16);
    expect(result?.additionalSlides).toBe(14);
    expect(result?.pdfUrl).toBeTruthy();
    expect(result?.pptxUrl).toBeTruthy();
  });
  it('ne change aucun support élève, partagé, Partie2 ou personnalisé', () => {
    expect(nationalePartie1CourseReview(10, 10014, true)).toBeNull();
    for (const id of [24, 40, 42]) expect(nationalePartie1CourseReview(id, 10014, false)).toBeNull();
    expect(nationalePartie1CourseReview(10, 10015, false)).toBeNull();
    expect(nationalePartie1CourseReview(10, 999, false)).toBeNull();
  });
  it('conserve les 64 identités non consécutives, sans questions99–123', () => {
    expect(audit).toHaveLength(64);
    expect(new Set(audit.map(row => row.uuid)).size).toBe(64);
    expect(audit.map(row => row.id)).toEqual([1,2,3,4,5,6,7,8,9,10,11,12,18,19,24,25,27,36,38,39,22,40,46,58,59,60,61,62,63,64,65,66,67,68,69,70,90,91,92,93,94,95,96,97,98,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89]);
  });
  it('chaque complément référence les positions et vrais IDs du même inventaire', () => {
    for (const item of complements) {
      expect(item.ids).toEqual(item.questions.map(pos => audit.find(row => row.position === pos)?.id));
    }
  });
});