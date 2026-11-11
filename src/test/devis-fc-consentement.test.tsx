import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { CONSENTEMENT_FC_ANNULATION, CONSENTEMENT_FC_VERSION, construirePreuveConsentementFormationContinue, estDevisFormationContinue, refusConsentementFormationContinue } from '../../supabase/functions/_shared/devisConsentementFc';
import { PreuveConsentementFc } from '@/components/devis/PreuveConsentementFc';

const devisTest = { id: 'devis-test-fc-vtc', modele: 'fc_vtc', formation: 'Formation continue VTC', dates_formation: 'Session fictive 2027' };

describe('Devis FC — périmètre et règle serveur', () => {
  it.each([
    [{ modele: 'fc_vtc' }], [{ modele: 'fc_taxi' }],
    [{ modele: 'devis_personnel', formation: 'Formation continue TAXI' }],
    [{ modele: 'taxi_mobilite', formation: 'Formation à la mobilité TAXI (14h)' }],
    [{ formation: 'continue-vtc' }],
  ])('formation continue reconnue sans inclure les parcours initiaux', (devis) => {
    expect(estDevisFormationContinue(devis)).toBe(true);
    expect(refusConsentementFormationContinue(devis, false)).toMatch(/procédure écrite/);
    expect(refusConsentementFormationContinue(devis, true)).toBeNull();
  });

  it.each([[{ modele: 'vtc_complet', formation: 'Formation VTC' }], [{ modele: 'taxi_elearning', formation: 'Formation TAXI E-learning' }], [{ modele: 'taxi_pratique', formation: 'Formation pratique TAXI' }]])('parcours initial non concerné', (devis) => {
    expect(estDevisFormationContinue(devis)).toBe(false);
    expect(refusConsentementFormationContinue(devis, false)).toBeNull();
  });

  it('le texte ne crée aucun délai et réserve expressément les droits impératifs', () => {
    expect(CONSENTEMENT_FC_ANNULATION).toContain('contact@ftransport.fr');
    expect(CONSENTEMENT_FC_ANNULATION).toContain('mon identité, la session concernée et le motif');
    expect(CONSENTEMENT_FC_ANNULATION).toContain('lettre recommandée avec accusé de réception');
    expect(CONSENTEMENT_FC_ANNULATION).toContain('86 route de Genas, 69003 Lyon');
    expect(CONSENTEMENT_FC_ANNULATION).toContain('ne vaut pas renonciation');
    expect(CONSENTEMENT_FC_ANNULATION).toContain('droit impératif');
    expect(CONSENTEMENT_FC_ANNULATION).not.toMatch(/\b(?:7|10|14) jours\b/);
  });

  it('la preuve exécutée sur un devis fictif contient texte/version, date, identité et devis', () => {
    const preuve = construirePreuveConsentementFormationContinue({
      devis: devisTest,
      identite: { nom: 'Stagiaire Fictif', apprenant_id: 'apprenant-test', email: 'fictif@example.test' },
      horodatageServeur: '2026-11-11T11:30:00.000Z', userAgent: 'test',
    });
    expect(preuve.version).toBe(CONSENTEMENT_FC_VERSION);
    expect(preuve.annulation_remboursement_fc).toMatchObject({
      coche: true, texte: CONSENTEMENT_FC_ANNULATION, version: CONSENTEMENT_FC_VERSION,
      horodatage_serveur: '2026-11-11T11:30:00.000Z',
      identite: { nom: 'Stagiaire Fictif', apprenant_id: 'apprenant-test' },
      devis: { id: 'devis-test-fc-vtc', session: 'Session fictive 2027' },
    });
  });

  it('le serveur refuse avant tout dépôt et conserve la protection contre le double envoi', () => {
    const edge = readFileSync('supabase/functions/upload-devis-signe/index.ts', 'utf8');
    expect(edge.indexOf('const refusFc = refusConsentementFormationContinue')).toBeLessThan(edge.indexOf('// Upload signed file'));
    expect(edge).toContain('construirePreuveConsentementFormationContinue');
    expect(edge).toContain('annulation_remboursement_fc');
    expect(edge).toMatch(/\.is\("signed_at", null\)/);
  });
});

describe('Devis FC — affichage de la preuve admin', () => {
  it('affiche la version, la date, l’identité, le devis et le texte exact', () => {
    const preuve = construirePreuveConsentementFormationContinue({
      devis: devisTest, identite: { nom: 'Stagiaire Fictif' }, horodatageServeur: '2026-11-11T11:30:00.000Z',
    });
    render(<PreuveConsentementFc consentements={preuve} />);
    expect(screen.getByTestId('preuve-consentement-fc')).toBeTruthy();
    expect(screen.getByText(CONSENTEMENT_FC_VERSION, { exact: false })).toBeTruthy();
    expect(screen.getByText('Stagiaire Fictif', { exact: false })).toBeTruthy();
    expect(screen.getByText('devis-test-fc-vtc', { exact: false })).toBeTruthy();
    expect(screen.getByText(CONSENTEMENT_FC_ANNULATION, { exact: false })).toBeTruthy();
  });

  it('un devis historique sans preuve reste sans nouveau bandeau', () => {
    const { container } = render(<PreuveConsentementFc consentements={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
