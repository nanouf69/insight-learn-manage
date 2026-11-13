import { describe, it, expect, vi } from 'vitest';
import { autorisationsPourCreneau, EMARGEMENT_TARDIF_ACTIF, signatureTardive, signatureSingleFlight } from '@/lib/emargementTardif';
const grant = { id: 'grant', auth_user_id: 'owner', apprenant_id: 'dossier', expire_le: '2026-11-30T23:00:00Z', creneaux: [{ date: '2026-10-30', creneau: 'matin' }] };
describe('Signature tardive sans mutation historique', () => {
  it('reste désactivée avant validation et sauvegarde', () => expect(EMARGEMENT_TARDIF_ACTIF).toBe(false));
  it('sélectionne uniquement le 30 octobre matin du compte et dossier exacts', () => expect(autorisationsPourCreneau([grant], 'owner', 'dossier', '2026-10-30', 'matin')).toEqual([grant]));
  it('ne réutilise pas le matin pour l’après-midi', () => expect(autorisationsPourCreneau([grant], 'owner', 'dossier', '2026-10-30', 'apres_midi')).toEqual([]));
  it('refuse un autre compte', () => expect(autorisationsPourCreneau([grant], 'other', 'dossier', '2026-10-30', 'matin')).toEqual([]));
  it('refuse un autre dossier', () => expect(autorisationsPourCreneau([grant], 'owner', 'other', '2026-10-30', 'matin')).toEqual([]));
  it('ne confond pas une autre date passée ou future', () => { for (const date of ['2026-10-29','2027-10-30']) expect(autorisationsPourCreneau([grant], 'owner', 'dossier', date, 'matin')).toEqual([]); });
  it('horodatage réel distinct : 13 novembre pour cours 30 octobre', () => expect(signatureTardive('2026-10-30','2026-11-13T13:10:00Z')).toBe(true));
  it('pas de label tardif pour une signature le jour même', () => expect(signatureTardive('2026-10-30','2026-10-30T08:00:00Z')).toBe(false));
  it('utilise le jour Paris à minuit et non UTC', () => expect(signatureTardive('2026-10-30','2026-10-30T23:30:00Z')).toBe(true));
  it('horodatage absent ou invalide reste non prouvé', () => { expect(signatureTardive('2026-10-30',null)).toBe(false); expect(signatureTardive('2026-10-30','invalid')).toBe(false); });
  it('deux clics en vol produisent un seul envoi', async () => {
    let resolve: ((value: string) => void) | undefined;
    const execute = vi.fn(() => new Promise<string>(r => { resolve = r; }));
    const save = signatureSingleFlight(execute); const first = save(); const second = save();
    await Promise.resolve(); expect(execute).toHaveBeenCalledTimes(1); resolve?.('confirmed');
    expect(await first).toBe('confirmed'); expect(await second).toBe('confirmed');
  });
  it('échec inconnu jamais rejoué automatiquement', async () => {
    const execute = vi.fn().mockRejectedValue(new Error('delivery unknown'));
    await expect(signatureSingleFlight(execute)()).rejects.toThrow('delivery unknown'); expect(execute).toHaveBeenCalledTimes(1);
  });
});