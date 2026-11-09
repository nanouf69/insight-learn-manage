import { describe, it, expect } from 'vitest';
import { proposerPrenote, tracePrenote } from '@/features/correction-qrc-v2/prenote';

describe('Pré-note distincte de la note définitive', () => {
  it('propose 2/2 pour l’équivalence B2 vierge donnée par le formateur', () => {
    expect(proposerPrenote("C'est avoir un casier judiciaire b2 vierge", 'Casier judiciaire vierge (B2)', 2).note).toBe(2);
  });
  it('respecte le barème propre à la copie et non un maximum fixé à 2', () => {
    expect(proposerPrenote('Casier judiciaire B2 vierge', 'Casier judiciaire vierge (B2)', 1.5).note).toBe(1.5);
  });
  it.each(['Casier judiciaire B2', 'Casier judiciaire B3 vierge', 'Pas de casier judiciaire B2 vierge', 'Casier judiciaire B2 non vierge', 'Casier judiciaire B2 vierge et permis suspendu', ''])('ne propose pas de faux zéro ou plein crédit pour %s', r => {
    expect(proposerPrenote(r, 'Casier judiciaire vierge (B2)', 2).note).toBeNull();
  });
  it('refuse une absence de corrigé/barème', () => {
    expect(proposerPrenote('B2', '', 2).note).toBeNull();
    expect(proposerPrenote('B2', 'B2', null).note).toBeNull();
  });
  it('trace proposition et valeur validée distinctement', () => {
    const p = proposerPrenote('oui', 'oui', 2);
    expect(tracePrenote(p, 1.5, 2)).toContain('Proposition 2/2 ; validation humaine 1.5/2');
  });
});