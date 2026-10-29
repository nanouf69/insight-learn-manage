import { describe, it, expect, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
vi.mock('@/lib/sessionRpc', () => ({ freshSessionRead: vi.fn() }));
import { delaiProchaineFenetre, fenetresDues, type FenetreEmargement } from '@/lib/emargementFenetres';
import { SuiviOuvertureEmargement, choisirFeuilleDue, clesTraitees } from '@/lib/emargementDu';
const slot = (extra: Partial<FenetreEmargement> = {}): FenetreEmargement => ({ date_cours: '2026-10-29', creneau: 'matin', debut: '09:00:00', fin: '12:00:00', pratique: false, ouvre_le: '2026-10-29T07:30:00Z', serveur_le: '2026-10-29T07:29:00Z', ouverte: false, ...extra });
describe('Fenêtres serveur et ouverture explicite', () => {
  it('connexion à −31 min : attend exactement 60 secondes et ne propose rien', () => {
    expect(delaiProchaineFenetre([slot()])).toBe(60000);
    expect(fenetresDues([slot()])).toEqual([]);
  });
  it('ouverture à −30 min puis après conflit identité sans perdre la demande', () => {
    const suivi = new SuiviOuvertureEmargement();
    const due = fenetresDues([slot({ ouverte: true })]);
    const next = choisirFeuilleDue(due, new Set(), '2026-10-29').next;
    expect(next).toEqual({ date: '2026-10-29', creneau: 'matin' });
    expect(suivi.doitOuvrir('fictif', 'matin', true)).toBe(false);
    expect(suivi.doitOuvrir('fictif', 'matin', false)).toBe(true);
    expect(suivi.doitOuvrir('fictif', 'matin', false)).toBe(false);
  });
  it('pratique : après-midi non ouvert jamais proposé avec le matin', () => {
    const f = [slot({ ouverte: true, pratique: true }), slot({ pratique: true, creneau: 'apres_midi', debut: '13:00:00', ouvre_le: '2026-10-29T11:30:00Z' })];
    expect(fenetresDues(f, true)).toEqual([{ date: '2026-10-29', creneau: 'matin' }]);
  });
  it('signature déjà enregistrée jamais reproposée', () => {
    const signs = clesTraitees([{ date_emargement: '2026-10-29', demi_journee: 'matin', signature_data_url: 'data:image/png;base64,fictif' }]);
    expect(choisirFeuilleDue(fenetresDues([slot({ ouverte: true })]), signs, '2026-10-29').next).toBeNull();
  });
});