import { describe, it, expect } from 'vitest';
import {
  MANIFEST_V2,
  copiablesV2,
  resumeV2,
  doublonsEntreNumeros,
  partagesMemeNumero,
  VALIDES_V2,
} from '@/migration/manifest-migration-noyau-v2';

/**
 * Contrat de l'étape 2 (migration à blanc).
 * Ces tests interdisent toute copie d'un contenu non 🟢 VALIDÉ et gèlent
 * les empreintes des deux matières effectivement copiées dans le nouveau noyau.
 */
describe('Manifest v2 — contrat de l\'étape 2', () => {
  it('couvre les 24 examens et 108 matières, sans bilan d\'examen', () => {
    expect(new Set(MANIFEST_V2.map((e) => e.exam_id)).size).toBe(24);
    expect(MANIFEST_V2).toHaveLength(108);
    for (const e of MANIFEST_V2) {
      expect([90014, 90015, 90016, 90017]).not.toContain(e.module_id);
      expect(e.empreinte).toMatch(/^[0-9a-f]{32}$/);
    }
  });

  it('ne rend copiables que les 4 contenus validés du N°2', () => {
    const c = copiablesV2();
    expect(c).toHaveLength(4);
    expect(c.map((e) => `${e.exam_id}/${e.subject_id}`).sort()).toEqual(Object.keys(VALIDES_V2).sort());
    expect(c.every((e) => e.numero === 2)).toBe(true);
  });

  it('gèle les empreintes F(V) et G(V) réellement copiées dans le nouveau noyau', () => {
    const fv = MANIFEST_V2.find((e) => e.exam_id === 'EB2' && e.subject_id === 'reglementation_vtc')!;
    const gv = MANIFEST_V2.find((e) => e.exam_id === 'EB2' && e.subject_id === 'reglementation_vtc2')!;
    expect([fv.nombre_questions, fv.empreinte]).toEqual([16, '1dad7692330e13684c27504e87acae5e']);
    expect([gv.nombre_questions, gv.empreinte]).toEqual([8, '7eb71582ab0e5b61bca6016efc77b8bd']);
  });

  it('ne trouve aucun contenu identique entre deux numéros d\'examen différents', () => {
    expect(doublonsEntreNumeros()).toEqual([]);
  });

  it('ne compte que des partages de même numéro entre filières', () => {
    for (const p of partagesMemeNumero()) {
      expect(new Set(p.entrees.map((e) => e.numero)).size).toBe(1);
      expect(new Set(p.entrees.map((e) => e.filiere)).size).toBeGreaterThan(1);
    }
  });

  it('donne le décompte exact du manifest v2', () => {
    const r = resumeV2();
    expect(r.examens).toBe(24);
    expect(r.matieres).toBe(108);
    expect(r.VALIDE).toBe(4);
    expect(r.ANOMALIE).toBe(0);
    expect(r.A_CONTROLER).toBe(104);
  });
});
