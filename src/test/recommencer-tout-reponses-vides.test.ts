import { describe, it, expect } from 'vitest';
import { reponsesVidesAEnvoyer } from '@/lib/reponsesEffacees';

describe('Recommencer tout : réponses effacées envoyées vides', () => {
  it('vide chaque ancienne réponse de l’exercice recommencé', () => {
    const avant = { '80-1': 'A', '80-2': ['B', 'C'], '81-1': 'D' };
    expect(reponsesVidesAEnvoyer(avant, { '81-1': 'D' }, [80])).toEqual({ 80: { '80-1': '', '80-2': [] } });
  });
  it('ne touche jamais un autre exercice', () => {
    expect(reponsesVidesAEnvoyer({ '81-1': 'D' }, {}, [80])).toEqual({});
  });
  it('garde les réponses encore présentes (Refaire les fausses)', () => {
    expect(reponsesVidesAEnvoyer({ '80-1': 'A', '80-2': 'B' }, { '80-1': 'A' }, [80])).toEqual({ 80: { '80-2': '' } });
  });
});
