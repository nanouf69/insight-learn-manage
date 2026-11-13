import { describe, it, expect } from "vitest";
import { dateSignatureAutorisee, parisToday } from '../../../supabase/functions/save-emargement-apprenant/dateSignature';
import { signerTardivement } from '../../../supabase/functions/save-emargement-apprenant/tardif-candidat';

describe('Interdiction signatures passées, tous parcours', () => {
  const now = new Date('2026-11-13T19:57:00Z');
  it.each(['vtc','taxi','ta','va','fc-vtc','fc-taxi','pratique'])('%s ne signe pas le 10 novembre le 13 novembre', () => {
    expect(dateSignatureAutorisee('2026-11-10', now)).toBe(false);
  });
  it('la date du jour reste éligible au contrôle du vrai créneau', () => expect(dateSignatureAutorisee('2026-11-13', now)).toBe(true));
  it.each([
    ['2026-11-13T22:59:59Z','2026-11-13',true],
    ['2026-11-13T23:00:00Z','2026-11-13',false],
    ['2026-11-13T23:00:00Z','2026-11-14',true],
    ['2026-07-13T21:59:59Z','2026-07-13',true],
    ['2026-07-13T22:00:00Z','2026-07-13',false],
  ])('frontière Paris %s pour %s', (instant, date, allowed) => expect(dateSignatureAutorisee(date, new Date(instant))).toBe(allowed));
  it('Paris et non UTC décide après minuit local', () => expect(parisToday(new Date('2026-11-13T23:10:00Z'))).toBe('2026-11-14'));
  it.each(['2026-02-30','2026-13-13','13/11/2026','invalid',''])('refuse date invalide %s', date => expect(dateSignatureAutorisee(date, now)).toBe(false));
  it('ancienne autorisation ne déclenche aucun RPC', async () => {
    let calls = 0;
    const client = { rpc: async () => { calls++; throw new Error('must not write'); } };
    const result = await signerTardivement(client, 'owner', { regularisation_id: 'grant', date_emargement: '2026-11-10', confirme_presence_creneau: true });
    expect(result.status).toBe(403); expect(calls).toBe(0);
  });
});
