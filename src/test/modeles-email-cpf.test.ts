import { describe, it, expect } from 'vitest';
import { MODELES_EMAIL_CPF } from '@/lib/modelesEmailCpf';
const M = 'https://www.moncompteformation.gouv.fr/espace-prive/html/#/formation/recherche/82346156100016_';
const attendu: Record<string, string> = {
  'cpf-vtc-journee': M + 'VTC/82346156100016_VTC',
  'cpf-vtc-soiree': M + 'TAXIS/82346156100016_TAXIS',
  'cpf-vtc-elearning': M + 'VTCEP/82346156100016_VTCEP',
  'cpf-taxi-presentiel': M + 'TAXIF/82346156100016_TAXIP',
  'cpf-taxi-elearning': M + 'TAXIE/82346156100016_TAXIE',
  'cpf-passerelle-taxi-vtc': M + 'vtcc/82346156100016_vtcc',
  'cpf-passerelle-vtc-taxi': M + 'TAXIcourt/82346156100016_TAXI3',
};
describe('Modèles e-mail CPF', () => {
  it('7 modèles distincts avec le lien exact du site', () => {
    expect(MODELES_EMAIL_CPF.map(m => m.id).sort()).toEqual(Object.keys(attendu).sort());
    for (const m of MODELES_EMAIL_CPF) {
      const body = m.getBody({ prenom: 'Sami' });
      expect(body).toContain(`href="${attendu[m.id]}"`);
      for (const [id, url] of Object.entries(attendu)) if (id !== m.id) expect(body).not.toContain(url + '"');
      expect(body).toMatch(/^Bonjour Sami,/);
      expect(body).toContain("il n'est pas automatique");
      expect(m.getSubject({})).toMatch(/CPF/);
    }
  });
  it('sans prénom : salutation neutre', () => {
    expect(MODELES_EMAIL_CPF[0].getBody({ prenom: null })).toMatch(/^Bonjour,/);
  });
  it('libellés demandés', () => {
    expect(MODELES_EMAIL_CPF.map(m => m.label)).toEqual(['🔗 CPF VTC — Journée','🔗 CPF VTC — Soirée','🔗 CPF VTC — E-learning','🔗 CPF TAXI — Présentiel','🔗 CPF TAXI — E-learning','🔗 CPF Passerelle TAXI → VTC','🔗 CPF Passerelle VTC → TAXI — E-learning']);
  });
});
