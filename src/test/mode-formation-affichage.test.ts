import { describe, expect, it } from 'vitest';
import { modeFormationAffichage } from '@/lib/modeFormationAffichage';

describe('Mode de formation : classification sans effet sur les calculs', () => {
  it('reconnaît les parcours présentiels', () => {
    for (const type_apprenant of ['vtc', 'taxi', 'ta', 'va', 'vtc-cours-du-soir', 'taxi-pour-vtc', 'pratique-vtc', 'pratique-taxi']) {
      expect(modeFormationAffichage({ type_apprenant }).jalonsEnRouge).toBe(false);
    }
  });
  it('reconnaît les parcours en ligne sans dépendre de la date de formation', () => {
    for (const type_apprenant of ['vtc-e', 'taxi-e', 'ta-e', 'va-e', 'VTC-elearning', 'taxi-pour-vtc-elearning']) {
      expect(modeFormationAffichage({ type_apprenant }).jalonsEnRouge).toBe(true);
    }
  });
  it('reconnaît le mixte et le repli sur la formation choisie', () => {
    expect(modeFormationAffichage({ formation_choisie: 'vtc-e-presentiel' }).jalonsEnRouge).toBe(true);
    expect(modeFormationAffichage(null).jalonsEnRouge).toBe(false);
  });
});