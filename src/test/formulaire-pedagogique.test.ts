import { describe, it, expect } from 'vitest';
import { contexteDocument, decisionPedagogique, verifierContexte, type ContextePedagogique } from '@/lib/formulairePedagogique';
const base: ContextePedagogique = { formation: 'FC VTC', inscription_id: null, session_id: null, session_libelle: null, rempli_le: null, valide_le: null, decision: null, decision_le: null };
describe('Formulaires pédagogiques — aucune preuve inventée', () => {
  it('ne déduit aucune admission d’une validation de questionnaire', () => expect(contexteDocument({ _status: 'completed', signatureAdmin: true }).decision).toBeNull());
  it('ne remplace pas la validation par la création ou completed_at', () => expect(contexteDocument({ created_at: '2026-11-18T10:35:00Z', completed_at: '2026-11-18T10:35:00Z' }).valide_le).toBeNull());
  it('conserve la formation du document, pas celle d’une autre fiche', () => expect(contexteDocument({ formationLabel: 'TAXI' }).formation).toBe('TAXI'));
  it('laisse toute session historique à rattacher', () => expect(contexteDocument({ formation: 'VTC' }).session_id).toBeNull());
  it('reconnaît seulement une décision positive explicite', () => expect(decisionPedagogique('Admis')).toBe('admis'));
  it.each(['refusé', 'en attente', 'non évalué', '', 'completed', 'Très cohérent'])('ne falsifie pas %s en admission', v => expect(decisionPedagogique(v)).not.toBe('admis'));
  it('exige une date réelle pour une décision', () => expect(() => verifierContexte({ ...base, decision: 'admis' }, [], '2026-11-18T10:35:00Z')).toThrow());
  it('refuse une inscription d’un autre apprenant', () => expect(() => verifierContexte({ ...base, inscription_id: 'foreign', session_id: 's' }, [], '2026-11-18T10:35:00Z')).toThrow());
  it('refuse une session sans inscription', () => expect(() => verifierContexte({ ...base, session_id: 's' }, [], '2026-11-18T10:35:00Z')).toThrow());
  it('refuse une date future', () => expect(() => verifierContexte({ ...base, valide_le: '2026-11-19' }, [], '2026-11-18T10:35:00Z')).toThrow());
  it('refuse une validation avant le remplissage', () => expect(() => verifierContexte({ ...base, rempli_le: '2026-11-17', valide_le: '2026-11-16' }, [], '2026-11-18T10:35:00Z')).toThrow());
  it('préserve toutes les réponses et signatures', () => { const data = { answers: { '0-0': 'non' }, signature: 'original' }; contexteDocument(data, base); expect(data).toEqual({ answers: { '0-0': 'non' }, signature: 'original' }); });
});