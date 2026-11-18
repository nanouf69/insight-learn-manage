import { describe, expect, it } from 'vitest';
import modele from '../components/qualiopi/matriceModele.json';
import { filtrerMatrice, matriceCsv } from '../components/qualiopi/matrice';
describe('Qualiopi 7 correspondence evidence', () => {
  it('retains all 50 provided model lines without converting ok to verified', () => {
    expect(modele.filter(r => r.ref_key.startsWith('i7-modele-'))).toHaveLength(50);
    expect(modele.filter(r => r.observations.includes('Modèle : ok.')).every(r => r.couverture === 'a_verifier')).toBe(true);
    expect(modele.filter(r => r.couverture === 'verifiee')).toHaveLength(0);
  });
  it('keeps the explicitly missing exploitation modes missing', () => {
    expect(modele.find(r => r.competence_officielle === 'Modes exploitation directe/location-gérance')?.couverture).toBe('manquante');
  });
  it('keeps English and commercial development as VTC subjects', () => {
    expect(filtrerMatrice(modele, 'Anglais', 'all', '')).toHaveLength(5);
    expect(filtrerMatrice(modele, 'Développement commercial VTC', 'all', '')).toHaveLength(5);
  });
  it('does not invent course contents, quiz IDs or missing slide numbers', () => {
    expect(modele.every(r => r.contenu_cours === '' && r.evaluation_quiz === '')).toBe(true);
    expect(modele.find(r => r.competence_officielle === 'Intermédiaires')?.reference_diapos).toBe('');
  });
  it('supports crossed subject, coverage and text filters', () => {
    expect(filtrerMatrice(modele, 'T3P', 'a_verifier', '38-39').map(r => r.competence_officielle)).toEqual(['Documents contrôle']);
  });
  it('neutralizes spreadsheet formula injection', () => {
    expect(matriceCsv([{ ...modele[0], matiere: '=1+1' }])).toContain('"\'=1+1"');
  });
});