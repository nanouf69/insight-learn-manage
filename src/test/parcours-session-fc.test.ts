import { describe, expect, it } from 'vitest';
import { projeterParcoursSessionFC, type InscriptionFC } from '@/lib/parcoursSessionFC';
import { resolveFormationId, modulesAttribuesDashboard } from '@/lib/parcoursModulesDashboard';

const dossier = { formation_choisie: null, date_debut_formation: '2026-11-17', date_fin_formation: '2026-11-18' };
const inscription: InscriptionFC = { sessions: { nom: 'Formation Continue VTC - 17 et 18 novembre 2026', types_apprenant: ['PA VTC'], type_session: 'theorique', date_debut: '2026-11-17', date_fin: '2026-11-18' } };
describe('FC VTC depuis l’inscription réelle', () => {
  it('dossier sans type ni formation : affiche le parcours FC avec les émargements 83', () => {
    const projection = projeterParcoursSessionFC(dossier, [inscription]);
    const formation = resolveFormationId(null, projection.formation_choisie, null);
    expect(formation).toBe('continue-vtc');
    expect(formation && modulesAttribuesDashboard(formation).map(m => m.id)).toEqual([81, 5, 87, 83, 85, 88, 89]);
    expect(dossier.formation_choisie).toBeNull();
    expect(projection.date_debut_formation).toBe('2026-11-17');
    expect(projection.date_fin_formation).toBe('2026-11-18');
  });
  it.each([{ liste_attente: true }, { emargements_exclus: true }, { statut_suivi: 'annulé' }])('ne projette pas une inscription exclue %j', flags => {
    expect(projeterParcoursSessionFC(dossier, [{ ...inscription, ...flags }])).toBe(dossier);
  });
  it('ne choisit pas une session d’une autre période', () => {
    expect(projeterParcoursSessionFC(dossier, [{ sessions: { ...inscription.sessions, date_debut: '2026-10-01', date_fin: '2026-10-02' } }])).toBe(dossier);
  });
  it('ne choisit pas arbitrairement entre VTC et TAXI', () => {
    expect(projeterParcoursSessionFC(dossier, [inscription, { sessions: { ...inscription.sessions, types_apprenant: ['PA TAXI'] } }])).toBe(dossier);
  });
});