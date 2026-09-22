import { describe, it, expect } from 'vitest';
import {
  MANIFEST_MIGRATION,
  entreesCopiables,
  resumeManifest,
  empreintesPartageesEntreNumeros,
  EXAM_MODULE_IDS,
} from '@/migration/manifest-migration-noyau';

/**
 * Pré-audit de migration — contrat figé, 100 % lecture seule.
 * Ces tests protègent le manifest : ils bloquent toute copie d'un contenu
 * 🟠 À CONTRÔLER ou 🔴 ANOMALIE vers le nouveau noyau.
 */
describe('Manifest de migration (pré-audit 22/09/2026)', () => {
  it('couvre les 24 examens VTC / TAXI / VA / TA', () => {
    const examens = new Set(MANIFEST_MIGRATION.map((e) => e.exam_id));
    expect(examens.size).toBe(24);
    for (const filiere of ['VTC', 'TAXI', 'VA', 'TA'] as const) {
      const numeros = new Set(
        MANIFEST_MIGRATION.filter((e) => e.filiere === filiere).map((e) => e.numero),
      );
      expect([...numeros].sort()).toEqual([1, 2, 3, 4, 5, 6]);
    }
  });

  it("n'inclut aucun bilan d'examen (modules 90014 à 90017)", () => {
    for (const e of MANIFEST_MIGRATION) {
      expect(e.module_id).toBeGreaterThanOrEqual(90000);
      expect([90014, 90015, 90016, 90017]).not.toContain(e.module_id);
    }
  });

  it('rattache chaque entrée à un module connu et à une empreinte', () => {
    for (const e of MANIFEST_MIGRATION) {
      expect(EXAM_MODULE_IDS[e.exam_id]).toBe(e.module_id);
      expect(e.empreinte_source).toMatch(/^[0-9a-f]{32}$/);
      expect(e.nombre_questions).toBeGreaterThan(0);
    }
  });

  it('donne le décompte exact du pré-audit', () => {
    expect(resumeManifest()).toEqual({
      examens: 24,
      matieres: 108,
      VALIDE: 4,
      A_CONTROLER: 92,
      ANOMALIE: 12,
    });
  });

  it('ne rend copiables que les contenus 🟢 VALIDÉ (EB2 F(V)/G(V) et VA N°2)', () => {
    const copiables = entreesCopiables();
    expect(copiables).toHaveLength(4);
    expect(copiables.every((e) => e.numero === 2)).toBe(true);
    expect(copiables.map((e) => `${e.exam_id}/${e.subject_id}`).sort()).toEqual([
      'EB2/reglementation_vtc',
      'EB2/reglementation_vtc2',
      'eb2-va/reglementation_vtc',
      'eb2-va/reglementation_vtc2',
    ]);
  });

  it('fige les empreintes des références validées EB2 F(V) et G(V)', () => {
    const fv = MANIFEST_MIGRATION.find((e) => e.exam_id === 'EB2' && e.subject_id === 'reglementation_vtc');
    const gv = MANIFEST_MIGRATION.find((e) => e.exam_id === 'EB2' && e.subject_id === 'reglementation_vtc2');
    expect(fv?.empreinte_source).toBe('dab880e474772ee996451b922caeca93');
    expect(gv?.empreinte_source).toBe('bda7fe99431976f0fe7c210fbbad6dee');
    expect(fv?.nombre_questions).toBe(16);
    expect(gv?.nombre_questions).toBe(8);
  });

  it("n'autorise aucun contenu identique entre deux numéros d'examen différents", () => {
    expect(empreintesPartageesEntreNumeros()).toEqual([]);
  });

  it('marque en anomalie tout nombre de questions incohérent', () => {
    const anomalies = MANIFEST_MIGRATION.filter((e) => e.statut === 'ANOMALIE');
    expect(anomalies).toHaveLength(12);
    expect(anomalies.every((e) => /Nombre de questions incohérent/.test(e.motif ?? ''))).toBe(true);
    expect(anomalies.map((e) => `${e.exam_id}/${e.subject_id}`).sort()).toEqual([
      'EB4-TAXI/reglementation_taxi2',
      'EB5-TAXI/francais',
      'EB5-TAXI/gestion',
      'EB5-TAXI/reglementation_taxi',
      'EB5/francais',
      'EB5/gestion',
      'EB6-TAXI/gestion',
      'EB6-TAXI/t3p',
      'EB6/gestion',
      'EB6/t3p',
      'eb4-ta/reglementation_taxi2',
      'eb5-ta/reglementation_taxi',
    ]);
  });

  it('interdit toute copie automatique de 🟠 ou 🔴', () => {
    const nonCopiables = MANIFEST_MIGRATION.filter((e) => e.statut !== 'VALIDE');
    for (const e of nonCopiables) {
      expect(entreesCopiables()).not.toContain(e);
    }
  });
});
