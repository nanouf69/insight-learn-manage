import { describe, it, expect, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import { projeterJustificatifs, nomFichierZip } from '@/lib/justificatifsPresence';

const A = '8fc60874-fa5d-4fed-aced-da946fbf1cca';
const lien = (id: string, v: string, d: string, debut: string, fin: string, min: number, app = A) =>
  ({ id, validation_id: v, apprenant_id: app, date_presence: d, debut, fin, minutes: min, justificatif: 'feuille', pdf_chemin: `${app}/${id}.pdf`, auteur: 'u1', created_at: '2026-11-13T10:00:00Z' });
const profils = [{ user_id: 'u1', full_name: 'Naoufel' }];

describe('justificatifs de présence — Contrôle qualité', () => {
  it('0 PDF → liste vide', () => {
    expect(projeterJustificatifs(A, [], [], profils, new Set())).toEqual([]);
  });
  it('1 PDF actif présent', () => {
    const l = lien('a', 'v1', '2026-09-17', '18:30:00', '21:00:00', 150);
    const r = projeterJustificatifs(A, [l], [{ id: 'v1' }], profils, new Set([l.pdf_chemin]));
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ statut: 'active', fichier: 'present', auteurNom: 'Naoufel', debut: '18:30' });
  });
  it('3 PDF CHERNI : 3 actifs, triés, 1h30 + 2h30 + 2h30', () => {
    const ls = [lien('c', 'v3', '2026-09-18', '18:30:00', '21:00:00', 150), lien('a', 'v1', '2026-09-17', '18:30:00', '21:00:00', 150), lien('b', 'v2', '2026-09-18', '17:00:00', '18:30:00', 90)];
    const r = projeterJustificatifs(A, ls, [{ id: 'v1' }, { id: 'v2' }, { id: 'v3' }], profils, new Set(ls.map((l) => l.pdf_chemin)));
    expect(r.map((j) => j.minutes)).toEqual([150, 90, 150]);
    expect(r.filter((j) => j.statut === 'active')).toHaveLength(3);
  });
  it('PDF manquant signalé, jamais présenté comme existant', () => {
    const l = lien('a', 'v1', '2026-09-17', '18:30:00', '21:00:00', 150);
    expect(projeterJustificatifs(A, [l], [{ id: 'v1' }], profils, new Set())[0].fichier).toBe('absent');
  });
  it('validation annulée = historique, pas preuve active', () => {
    const l = lien('a', 'v1', '2026-09-17', '18:30:00', '21:00:00', 150);
    expect(projeterJustificatifs(A, [l], [{ id: 'v1', annulee: true }], profils, new Set([l.pdf_chemin]))[0].statut).toBe('annulee');
  });
  it('multi-candidats : un justificatif d’un autre élève est exclu', () => {
    const autre = lien('x', 'v9', '2026-09-17', '18:30:00', '21:00:00', 150, 'autre-id');
    expect(projeterJustificatifs(A, [autre], [{ id: 'v9' }], profils, new Set([autre.pdf_chemin]))).toEqual([]);
  });
  it('pas de double comptage d’un même lien', () => {
    const l = lien('a', 'v1', '2026-09-17', '18:30:00', '21:00:00', 150);
    expect(projeterJustificatifs(A, [l, l], [{ id: 'v1' }], profils, new Set([l.pdf_chemin]))).toHaveLength(1);
  });
  it('noms de fichiers ZIP distincts par créneau', () => {
    const ls = [lien('aaaaaaaa1', 'v1', '2026-09-18', '17:00:00', '18:30:00', 90), lien('bbbbbbbb2', 'v2', '2026-09-18', '18:30:00', '21:00:00', 150)];
    const r = projeterJustificatifs(A, ls, [{ id: 'v1' }, { id: 'v2' }], profils, new Set(ls.map((l) => l.pdf_chemin)));
    expect(new Set(r.map(nomFichierZip)).size).toBe(2);
  });
});
