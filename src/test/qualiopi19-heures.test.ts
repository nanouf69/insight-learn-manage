import { describe, expect, it } from 'vitest';
import { elearningHoursEvidence } from '@/lib/elearningHoursEvidence';

describe('Qualiopi 19 — heures issues de preuves fictives, sans écritures', () => {
  const input = () => ({ apprenantId: 'fictional-learner', apprenant: { date_fin_cours_en_ligne: '2026-11-19' }, acts: [] as any[], quizzes: [], exos: [], pratiqueDates: [], cnxAll: [{ started_at: '2026-11-19T09:00:00Z', ended_at: '2026-11-19T09:20:00Z', current_module: 'Cours et exercices' }] });
  it('une connexion seule ne crée aucune minute pédagogique', () => {
    expect(elearningHoursEvidence(input()).onlineMin).toBe(0);
  });
  it('une activité dans un intervalle de vingt minutes justifie vingt minutes, pas la cible', () => {
    const fixture = input();
    fixture.acts = [{ action_type: 'open_cours', module_nom: 'Cours et exercices', occurred_at: '2026-11-19T09:05:00Z' }];
    const before = JSON.stringify(fixture);
    expect(elearningHoursEvidence(fixture)).toMatchObject({ onlineMin: 20, premiereActiviteAt: '2026-11-19T09:05:00.000Z', derniereActiviteAt: '2026-11-19T09:05:00.000Z' });
    expect(JSON.stringify(fixture)).toBe(before);
  });
  it('ouvrir la liste des modules ne compte pas comme activité pédagogique', () => {
    const fixture = input();
    fixture.acts = [{ action_type: 'open_module', module_nom: 'Liste des modules', occurred_at: '2026-11-19T09:05:00Z' }];
    expect(elearningHoursEvidence(fixture)).toMatchObject({ onlineMin: 0, premiereActiviteAt: null });
  });
});