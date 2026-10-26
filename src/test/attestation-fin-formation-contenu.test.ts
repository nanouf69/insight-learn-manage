// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { attestationEstElearning, datesAttestationPresentiel, formatDateLongueFrancaise, formatPctAttestation, lignesJalonsAttestation } from '@/lib/pdf/attestation-fin-formation-contenu';

describe('attestation fin de formation — contenu selon le mode', () => {
  it('retient le premier cours et le dernier jour pratique, pas la fin d’accès du 31 octobre', () => {
    expect(datesAttestationPresentiel([{ date_debut: '2026-09-14', date_fin: '2026-09-25' }], [{ date: '2026-10-22' }])).toEqual({ debut: '2026-09-14', fin: '2026-10-22' });
  });
  it('ne fabrique aucune date sans cours ou pratique enregistrés', () => {
    expect(datesAttestationPresentiel([], [])).toEqual({ debut: null, fin: null });
  });
  it('écrit les dates en toutes lettres françaises, jamais au format ISO', () => {
    expect(formatDateLongueFrancaise('2026-09-14')).toBe('14 septembre 2026');
    expect(formatDateLongueFrancaise('2026-10-31')).toBe('31 octobre 2026');
    expect(formatDateLongueFrancaise('2026-11-03')).toBe('3 novembre 2026');
  });
  it('conserve la valeur d’origine si elle est illisible, et « - » si absente', () => {
    expect(formatDateLongueFrancaise(null)).toBe('-');
    expect(formatDateLongueFrancaise(undefined)).toBe('-');
    expect(formatDateLongueFrancaise('date inconnue')).toBe('date inconnue');
  });
  it('distingue e-learning (taux de jalons seul) et présentiel (dates + heures)', () => {
    expect(attestationEstElearning({ type_apprenant: 'vtc-elearning' })).toBe(true);
    expect(attestationEstElearning({ type_apprenant: 'taxi-elearning' })).toBe(true);
    expect(attestationEstElearning({ type_apprenant: 'vtc' })).toBe(false);
    expect(attestationEstElearning({ type_apprenant: 'taxi' })).toBe(false);
    expect(attestationEstElearning({ type_apprenant: 'fc-vtc' })).toBe(false);
  });
  it('détaille chaque jalon avec libellé, progression et poids', () => {
    const tableau = {
      lignes: [
        { moduleId: 9, progression: 100, poidsAffiche: 25 },
        { moduleId: 10, progression: 50, poidsAffiche: 30 },
        { moduleId: -1, progression: 100, poidsAffiche: 5 },
      ],
    } as any;
    const lignes = lignesJalonsAttestation(tableau);
    expect(lignes).toHaveLength(3);
    expect(lignes[0].libelle).toContain('9');
    expect(lignes[0].progression).toBe(100);
    expect(lignes[0].poidsAffiche).toBe(25);
    expect(lignes[2].libelle.length).toBeGreaterThan(0);
  });
  it('formate les pourcentages en français', () => {
    expect(formatPctAttestation(100)).toBe('100 %');
    expect(formatPctAttestation(81.3)).toBe('81,3 %');
  });
});
