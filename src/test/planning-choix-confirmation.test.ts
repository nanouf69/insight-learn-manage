import { describe, expect, it } from 'vitest';
import { confirmerChoixPlanning } from '@/lib/planningChoixConfirmation';

describe('Confirmation des choix du planning', () => {
  const choix = { max_per_day: 4, day_time_slots: { '2026-11-18': { type: 'vtc', matin: '9h-12h' } } };
  it('confirme quatre places et le choix VTC du 18 novembre relus', () => {
    expect(() => confirmerChoixPlanning({ day_time_slots: { '2026-11-18': { matin: '9h-12h', type: 'vtc' } }, max_per_day: 4 }, choix)).not.toThrow();
  });
  it('refuse une réponse sans ligne enregistrée', () => {
    expect(() => confirmerChoixPlanning(null, choix)).toThrow('non retrouvé');
  });
  it('refuse une capacité restée à trois', () => {
    expect(() => confirmerChoixPlanning({ ...choix, max_per_day: 3 }, choix)).toThrow('non confirmés');
  });
  it('refuse un choix TAXI à la place du VTC demandé', () => {
    expect(() => confirmerChoixPlanning({ ...choix, day_time_slots: { '2026-11-18': { type: 'taxi', matin: '9h-12h' } } }, choix)).toThrow('non confirmés');
  });
});