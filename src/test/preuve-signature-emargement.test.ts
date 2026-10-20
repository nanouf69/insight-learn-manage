import { describe, expect, it } from 'vitest';
import { aPreuveSignatureEmargement } from '@/lib/preuveSignatureEmargement';
import { calculerSignaturesManquantes, classifierSignatures } from '@/lib/signaturesManquantes';

describe('Preuve de signature, jamais la date automatique', () => {
  it('une date seule ne compte jamais, même non vide', () => {
    expect(aPreuveSignatureEmargement({ signature_data_url: null })).toBe(false);
    expect(aPreuveSignatureEmargement({ signature_data_url: 'data:image/png;base64,' })).toBe(false);
    expect(aPreuveSignatureEmargement({ signature_data_url: 'data:image/png;base64,AAA' })).toBe(true);
  });
  it('une absence ou une image masquée ne constitue pas une présence signée', () => {
    expect(aPreuveSignatureEmargement({ signature_data_url: 'data:image/png;base64,AAA', absent: true })).toBe(false);
    expect(aPreuveSignatureEmargement({ signature_data_url: 'data:image/png;base64,AAA', masque: true })).toBe(false);
  });
  it('les deux créneaux pratiques du 20/10 sans dessin restent manquants et signalés, données intactes', () => {
    const rows = ['matin', 'apres_midi'].map(demi_journee => ({ date_emargement: '2026-10-20', demi_journee, signed_at: '2026-10-09T11:23:18Z', signature_data_url: null }));
    const avant = JSON.stringify(rows);
    const sessions = [{ sessions: { type_session: 'pratique_vtc', date_debut: '2026-10-20', date_fin: '2026-10-20', heure_debut: '09:00', heure_fin: '16:00' } }];
    expect(calculerSignaturesManquantes(rows, sessions, [], '2026-10-20')).toHaveLength(2);
    const c = classifierSignatures(rows, sessions, [], '2026-10-20');
    expect(c.valides).toHaveLength(0);
    expect(c.anomalies).toHaveLength(2);
    expect(JSON.stringify(rows)).toBe(avant);
  });
});