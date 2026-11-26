import { describe, expect, it } from 'vitest';
import { destinataireAvisSuppression, identifiantAvisSuppression, statutAvisSuppression, suppressionNotifiable, type AvisTrace } from '../../supabase/functions/_shared/factureSuppressionAvis';

const deletion: AvisTrace = { id: 's1', facture_id: 'f1', numero: '20260724002', snapshot: { client_email: 'financeur@example.test', _corbeille: { version: 1, action: 'supprimer' } } };
const event = (action: string, id = 'r1'): AvisTrace => ({ id, facture_id: 'f1', numero: deletion.numero, snapshot: { _corbeille: { version: 1, action, suppression_id: 's1' } } });

describe('Avis après suppression confirmée', () => {
  it('ne permet l’avis que pour une suppression confirmée, pas pour un simple clic ou une ancienne trace', () => {
    expect(suppressionNotifiable(deletion, [deletion])).toBe(true);
    expect(suppressionNotifiable({ ...deletion, snapshot: {} }, [])).toBe(false);
    expect(suppressionNotifiable({ ...deletion, snapshot: { _corbeille: { version: 1, action: 'remettre' } } }, [])).toBe(false);
  });
  it('une facture remise ne déclenche pas un avis de suppression', () => {
    expect(suppressionNotifiable(deletion, [deletion, event('remettre')])).toBe(false);
  });
  it('utilise uniquement le destinataire de la facture, jamais un autre stagiaire', () => {
    expect(destinataireAvisSuppression(deletion.snapshot)).toBe('financeur@example.test');
    expect(destinataireAvisSuppression({ email: 'stagiaire@example.test' })).toBeNull();
    expect(destinataireAvisSuppression({ client_email: 'invalide' })).toBeNull();
  });
  it('l’envoi engagé reste non confirmé et ne devient envoyé qu’avec reçu du même événement', () => {
    expect(statutAvisSuppression(deletion, [deletion])).toBe('non_envoye');
    expect(statutAvisSuppression(deletion, [deletion, event('avis_suppression_engage')])).toBe('indetermine');
    expect(statutAvisSuppression(deletion, [deletion, event('avis_suppression_engage'), event('avis_suppression_envoye', 'ack')])).toBe('envoye');
    expect(statutAvisSuppression(deletion, [{ ...event('avis_suppression_envoye'), facture_id: 'f2' }])).toBe('non_envoye');
  });
  it('deux appels sur la même suppression ont la même prise unique, une autre suppression non', async () => {
    const a = await identifiantAvisSuppression('s1', 'engage');
    expect(await identifiantAvisSuppression('s1', 'engage')).toBe(a);
    expect(await identifiantAvisSuppression('s2', 'engage')).not.toBe(a);
    expect(await identifiantAvisSuppression('s1', 'envoye')).not.toBe(a);
    expect(a).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-5[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
  });
});