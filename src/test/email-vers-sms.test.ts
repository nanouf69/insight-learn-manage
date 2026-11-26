// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { mobileSmsFrancais, reduireEmailSms, texteEmailPourSms } from '@/lib/emailVersSms';

describe('Mail vers SMS', () => {
  it('reprend le texte et le lien complet sans le HTML actif', () => {
    expect(texteEmailPourSms('<p>Bonjour</p><a href="https://gestion.ftransport.fr/bienvenue">Dossier</a><script>bad()</script>', 'Rappel')).toBe('Rappel : Bonjour Dossier https://gestion.ftransport.fr/bienvenue');
  });
  it('limite à 480 sans tronquer le lien', () => {
    const link = 'https://gestion.ftransport.fr/bienvenue?dossier=123';
    const result = reduireEmailSms('Consigne importante. '.repeat(50) + link);
    expect(result.length).toBeLessThanOrEqual(480);
    expect(result.endsWith(link)).toBe(true);
    expect(result).toContain('...');
  });
  it('ne change pas un message court', () => {
    expect(reduireEmailSms('Rendez-vous le 2 décembre à 9h.')).toBe('Rendez-vous le 2 décembre à 9h.');
  });
  it('refuse de casser un lien dépassant seul la limite', () => {
    const text = 'https://example.fr/' + 'a'.repeat(490);
    expect(reduireEmailSms(text)).toBe(text);
  });
  it('normalise uniquement les mobiles acceptés par le transport existant', () => {
    expect(mobileSmsFrancais('06 12 34 56 78')).toBe('+33612345678');
    expect(mobileSmsFrancais('0033 7 12 34 56 78')).toBe('+33712345678');
    expect(mobileSmsFrancais('04 12 34 56 78')).toBeNull();
  });
});