// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import { creneauxFeuillePratique } from '@/lib/emargementPratiqueCreneaux';
import { generateEmargementPratiquePDF } from '@/lib/pdf/emargement-pratique';

describe('Feuille pratique sans après-midi saisi', () => {
  it('ne remplace pas le champ vide par 13h-16h', () => {
    expect(creneauxFeuillePratique({ matin: '9h-12h', apresmidi: '', horaireMode: 'custom' })).toEqual({ matin: '9h-12h', apresmidi: '' });
  });
  it('garde les horaires standards uniquement sans horaires renseignés', () => {
    expect(creneauxFeuillePratique(undefined)).toEqual({ matin: '9h-12h', apresmidi: '13h-16h' });
  });
  it('conserve une absence historique après-midi sans lui inventer un horaire', async () => {
    const candidats = [{ nom: 'FICTIF', prenom: 'Test', telephone: '', email: '', absentApresMidi: true }];
    const avant = JSON.stringify(candidats);
    const { blob } = generateEmargementPratiquePDF(new Date('2026-12-02T12:00:00Z'), 'taxi', candidats, { matin: '9h-12h', apresmidi: '' }, 'Formateur fictif', { returnBlob: true });
    const pdf = Buffer.from(await blob.arrayBuffer()).toString('latin1');
    expect(pdf).toContain('ABSENT');
    expect(pdf).not.toContain('13h00 - 16h00');
    expect(JSON.stringify(candidats)).toBe(avant);
  });
  it.each(['vtc', 'taxi'] as const)('PDF %s du 2 décembre : matin seul sans heure après-midi inventée', async type => {
    const slots = { matin: '9h-12h', apresmidi: '' };
    const avant = JSON.stringify(slots);
    const { blob } = generateEmargementPratiquePDF(new Date('2026-12-02T12:00:00Z'), type, [{ nom: 'FICTIF', prenom: 'Test', telephone: '', email: '' }], slots, 'Formateur fictif', { returnBlob: true });
    const pdf = Buffer.from(await blob.arrayBuffer()).toString('latin1');
    expect(pdf).toContain('09h00 - 12h00');
    expect(pdf).not.toContain('13h00 - 16h00');
    expect(JSON.stringify(slots)).toBe(avant);
  });
});