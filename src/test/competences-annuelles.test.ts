import { describe, expect, it } from 'vitest';
import { echeanceCompetences, planifierCompetences, invitationAnnuelle, traiterDemandeAnnuelle } from '../../supabase/functions/_shared/competencesAnnuel';
import type { DemandeAnnuel, DepotAnnuel, FormateurAnnuel } from '../../supabase/functions/_shared/competencesAnnuel';

const now = '2026-11-24T16:30:00Z';
const f: FormateurAnnuel = { id: 'albert', nom: 'Albert AKONO', email: 'fictif@example.invalid', activite: 'actif' };
const validation = { id: 'preuve-1', formateurId: f.id, valideLe: '2025-11-24T16:30:00Z', preuveVerifiee: true };
const plan = () => planifierCompetences(f, [], [], now);
const demande: DemandeAnnuel = { id: 'd1', formateurId: f.id, cycle: plan().cycle, expiresAt: '2026-12-24T16:30:00Z', etat: 'envoye', remiseLe: null, revoquee: false };

describe('Demandes annuelles — règles du dirigeant', () => {
  it('échéance exactement douze mois après dernière validation', () => {
    expect(planifierCompetences(f, [validation], [], '2026-11-24T16:29:59Z').statut).toBe('a_jour');
    expect(planifierCompetences(f, [validation], [], now).statut).toBe('a_demander');
    expect(echeanceCompetences(validation.valideLe)).toBe('2026-11-24T16:30:00.000Z');
  });
  it('29 février → 28 février et heure Paris conservée', () => {
    expect(echeanceCompetences('2024-02-29T09:00:00Z')).toBe('2025-02-28T09:00:00.000Z');
    expect(echeanceCompetences('2025-03-30T08:00:00Z')).toBe('2026-03-30T08:00:00.000Z');
  });
  it('première demande si jamais validé, pas de validation par simple remise', () => {
    expect(plan().cycle).toBe('albert:premiere-demande');
    expect(planifierCompetences(f, [{ ...validation, preuveVerifiee: false }], [], now).derniereValidation).toBeNull();
  });
  it('salariés, externes et occasionnels suivent la même règle sans filtre de contrat', () => {
    for (const id of ['salarie', 'externe', 'occasionnel']) expect(planifierCompetences({ ...f, id }, [], [], now).statut).toBe('a_demander');
  });
  it('anciens inactifs exclus, statut inconnu jamais présumé actif', () => {
    expect(planifierCompetences({ ...f, activite: 'inactif' }, [], [], now).statut).toBe('inactif');
    expect(planifierCompetences({ ...f, activite: 'inconnu' }, [], [], now).statut).toBe('activite_a_confirmer');
  });
  it('preuve autre formateur ou future ignorée', () => {
    expect(planifierCompetences(f, [{ ...validation, formateurId: 'rim' }, { ...validation, valideLe: '2027-01-01' }], [], now).derniereValidation).toBeNull();
  });
  it('dernière validation prouvée détermine le nouveau cycle', () => {
    expect(planifierCompetences(f, [validation, { ...validation, id: 'v2', valideLe: '2026-01-01T00:00:00Z' }], [], now).cycle).toBe('albert:v2');
  });
  it('demande en cours non doublée, réponse attend examen responsable', () => {
    expect(planifierCompetences(f, [], [demande], now).statut).toBe('en_attente');
    expect(planifierCompetences(f, [], [{ ...demande, remiseLe: now }], now).statut).toBe('a_examiner');
  });
  it('expiration, révocation et résultat transport inconnu interdisent renvoi automatique', () => {
    for (const d of [{ ...demande, expiresAt: now }, { ...demande, revoquee: true }, { ...demande, etat: 'indetermine' as const }]) expect(planifierCompetences(f, [], [d], now).statut).toBe('a_verifier');
  });
  it('nouveau lien individuel, ancienne preuve intacte', () => {
    const original = JSON.stringify(demande);
    const invitation = invitationAnnuelle(f, plan().cycle, 'a'.repeat(64), now);
    expect(invitation.expiresAt).toBe('2026-12-24T16:30:00.000Z');
    expect(invitation.token).toBe('a'.repeat(64));
    expect(JSON.stringify(demande)).toBe(original);
  });
  it('activation désactivée = zéro réservation et zéro email', async () => {
    let calls = 0;
    const depot: DepotAnnuel = { lireActivation: async () => false, reserver: async () => { calls++; return null; }, journaliser: async () => { calls++; } };
    expect(await traiterDemandeAnnuelle(plan(), depot, async () => { calls++; return 'mail'; })).toBe('desactive_ou_exclu');
    expect(calls).toBe(0);
  });
  it('concurrence : une réservation atomique, un seul email fictif', async () => {
    let claimed = false, sends = 0;
    const states: string[] = [];
    const depot: DepotAnnuel = { lireActivation: async () => true, reserver: async () => {
      if (claimed) return null; claimed = true;
      return { id: 'd1', nom: f.nom, email: f.email ?? '', lien: 'https://gestion.ftransport.fr/competences-intervenant/' + 'a'.repeat(64) };
    }, journaliser: async (_, state) => { states.push(state); } };
    await Promise.all([1, 2].map(() => traiterDemandeAnnuelle(plan(), depot, async msg => { expect(msg.idempotencyKey).toBe('competences-annuelles:d1'); sends++; return 'provider-proof'; })));
    expect(sends).toBe(1); expect(states).toEqual(['envoye']);
  });
  it('transport inconnu mis à vérifier, jamais rejoué', async () => {
    const states: string[] = [];
    const depot: DepotAnnuel = { lireActivation: async () => true, reserver: async () => ({ id: 'd1', nom: f.nom, email: f.email ?? '', lien: 'https://gestion.ftransport.fr/competences-intervenant/' + 'b'.repeat(64) }), journaliser: async (_, state) => { states.push(state); } };
    expect(await traiterDemandeAnnuelle(plan(), depot, async () => { throw new Error('timeout'); })).toBe('a_verifier');
    expect(states).toEqual(['indetermine']);
  });
});