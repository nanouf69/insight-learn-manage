import { describe, it, expect } from 'vitest';
import { champsSourcesFcTaxi, appliquerChampsVides, joursIsoDepuisSelection } from '@/lib/contratFormation/prefillFcTaxi';
import { newTrainingContract } from '@/lib/contratFormation/prefill';
import { validateContract } from '@/lib/contratFormation/model';
import { preuveDemarrageAnticipeFcTaxi } from '../../supabase/functions/_shared/devisConsentementFc';

const base = () => newTrainingContract({ id: 'a1', nom: 'Test', prenom: 'Jean', email: 'j@x.fr' });

describe('Contrat FC TAXI — pré-remplissage', () => {
  it('lit les dates choisies dans la session', () => {
    expect(joursIsoDepuisSelection('20 novembre 2026 + 19 novembre 2026')).toEqual(['2026-11-19', '2026-11-20']);
  });
  it('remplit SIRET, NDA et dates depuis les sources', () => {
    const c = appliquerChampsVides(base(), champsSourcesFcTaxi({ prix: 200, selectionDates: '19 novembre 2026 + 20 novembre 2026', mode: 'centre' }));
    expect(c.fields.registration).toContain('82346156100018');
    expect(c.fields.nda).toContain('84 69 15114 69');
    expect(c.fields.start).toBe('2026-11-19');
    expect(c.fields.end).toBe('2026-11-20');
    expect(c.fields.price).toBe('200');
  });
  it('n’écrase jamais une saisie administrateur', () => {
    const b = base(); b.fields.price = '299';
    expect(appliquerChampsVides(b, champsSourcesFcTaxi({ prix: 200, selectionDates: '', mode: 'centre' })).fields.price).toBe('299');
  });
  it('n’invente pas le médiateur ni la TVA', () => {
    const c = appliquerChampsVides(base(), champsSourcesFcTaxi({ prix: 200, selectionDates: '19 novembre 2026 + 20 novembre 2026', mode: 'distance' }));
    expect(c.fields.mediator ?? '').toBe('');
    expect(c.fields.vat ?? '').toBe('');
    const issues = validateContract(c, 'a1').issues.join('\n');
    expect(issues).toMatch(/Médiateur/);
    expect(issues).not.toMatch(/^Courriel : à compléter/m); expect(issues).not.toMatch(/^Dates de début/m);
  });
});

describe('Démarrage anticipé FC TAXI', () => {
  const h = '2026-11-20T15:00:00.000Z';
  it('aucune case proposée au centre', () => {
    expect(() => preuveDemarrageAnticipeFcTaxi({ modele: 'fc_taxi_pdf_v6_centre', demande: true, reconnaissance: false, horodatageServeur: h })).toThrow();
    expect(preuveDemarrageAnticipeFcTaxi({ modele: 'fc_taxi_pdf_v6_centre', demande: false, reconnaissance: false, horodatageServeur: h })).toBeNull();
  });
  it('reconnaissance refusée sans demande expresse', () => {
    expect(() => preuveDemarrageAnticipeFcTaxi({ modele: 'fc_taxi_pdf_v6_distance', demande: false, reconnaissance: true, horodatageServeur: h })).toThrow();
  });
  it('preuve horodatée et versionnée, non cochée par défaut possible', () => {
    const p = preuveDemarrageAnticipeFcTaxi({ modele: 'fc_taxi_pdf_v6_distance', demande: false, reconnaissance: false, horodatageServeur: h })!;
    expect(p.demande_expresse.coche).toBe(false);
    expect(p.horodatage_serveur).toBe(h);
    expect(p.version).toBe('fc-taxi-demarrage-anticipe-2026-11-20-v1');
  });
});
