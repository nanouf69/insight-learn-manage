import { describe, it, expect } from 'vitest';
import { mailTestPratique, confirmerMailTest } from '@/lib/mailTestPratique';
describe('Mail test pratique isolé des candidats', () => {
  it.each(['vtc', 'taxi'] as const)('envoie %s uniquement à l’adresse du test, sans dossier ni réservation', type => {
    const payload = mailTestPratique(type, ' admin@example.com ');
    expect(payload.to).toBe('admin@example.com');
    expect(payload).not.toHaveProperty('apprenantId');
    expect(payload.body).not.toContain('reservation-pratique');
    expect(payload).not.toHaveProperty('forceSend');
    expect(payload.userEmail).toBe('contact@ftransport.fr');
  });
  it.each(['', 'one@example.com,two@example.com', 'one@example.com;two@example.com'])('refuse un destinataire invalide ou multiple', to => {
    expect(() => mailTestPratique('vtc', to)).toThrow();
  });
  it('refuse un faux succès HTTP et un envoi ignoré comme doublon', () => {
    expect(() => confirmerMailTest({ success: false, error: 'refus' })).toThrow('refus');
    expect(() => confirmerMailTest({ success: true, skipped: true })).toThrow('déjà');
    expect(() => confirmerMailTest(null)).toThrow('non confirmé');
    expect(() => confirmerMailTest({ success: true })).not.toThrow();
  });
});