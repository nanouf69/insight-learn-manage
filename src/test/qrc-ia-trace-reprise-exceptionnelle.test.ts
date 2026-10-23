// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { BUDGET_APPEL_IA_MS, etapeAtteinte, marquerAbort, marquerEntetes, marquerPremierJeton, nouvelleTrace } from '../../supabase/functions/_shared/qrcIaTrace';
import { REPRISE_EXCEPTIONNELLE_6, repriseExceptionnelleAutorisee } from '../../supabase/functions/_shared/qrcRepriseExceptionnelle';
import { TIMEOUT_IA_MS, classerEchecIa, prochaineActionIa } from '../../supabase/functions/_shared/qrcIaSuite';
import { qrcAutoriseeAbaBakre } from '../../supabase/functions/_shared/qrcRattrapageAbaBakre';

describe('Trace appel IA', () => {
  it('abandon sans en-têtes ≠ en-têtes sans jeton ≠ flux partiel', () => {
    const a = nouvelleTrace(1000); marquerAbort(a); expect(a.code_local).toBe('abort_local_avant_entetes');
    const b = nouvelleTrace(1000); marquerEntetes(b, 200, 'run-1'); marquerAbort(b);
    expect(b.code_local).toBe('abort_local_entetes_sans_jeton'); expect(b.http_passerelle).toBe(200); expect(b.run_id).toBe('run-1');
    const c = nouvelleTrace(1000); marquerEntetes(c, 200, null); marquerPremierJeton(c); marquerAbort(c);
    expect(c.code_local).toBe('abort_local_flux_partiel');
  });
  it('aucun contenu ni secret dans la trace', () => {
    expect(Object.keys(nouvelleTrace(1)).sort()).toEqual(['abort_at','budget_ms','code_local','entetes_at','fin_at','fin_raison','http_passerelle','premier_jeton_at','requete_at','run_id']);
  });
  it('budget 140 s, sous la limite de 150 s, et identique au délai moteur', () => {
    expect(BUDGET_APPEL_IA_MS).toBe(140000); expect(TIMEOUT_IA_MS).toBe(140000);
    expect(etapeAtteinte({ ...nouvelleTrace(1), fin_at: 'x' })).toBe('termine');
  });
  it('abandon local → revue, jamais rejoué ; 429/5xx bornés à 2', () => {
    expect(classerEchecIa({ providerFinished: false, timeoutLocal: true })).toMatchObject({ statut: 'a_verifier', reprisable: false });
    expect(prochaineActionIa({ statut: 'a_verifier', http_status: 504, termine_at: '2026-10-22T15:26:03Z', created_at: '2026-10-22T15:25:03Z' }).action).toBe('revue');
    expect(prochaineActionIa({ statut: 'erreur', http_status: 503, termine_at: '2026-10-22T15:26:03Z', created_at: 'x', numero: 2 }).action).toBe('revue');
    expect(prochaineActionIa({ statut: 'appliquee', http_status: 200, termine_at: 'x', created_at: 'x' }).action).toBe('fin');
  });
});

describe('Reprise exceptionnelle 6 QRC', () => {
  it('exactement 6 paires, toutes dans la liste figée du 21/10', () => {
    expect(REPRISE_EXCEPTIONNELLE_6.size).toBe(6);
    for (const [q, a] of REPRISE_EXCEPTIONNELLE_6) expect(qrcAutoriseeAbaBakre(q, a)).toBe(true);
  });
  it('bonne QRC mais mauvais passage refusée ; autre QRC Aba refusée', () => {
    expect(repriseExceptionnelleAutorisee('4814bf89-d0e3-484f-9a94-143eaa113ec9', 'f129b372-951f-42a8-95b0-d6421ace164b')).toBe(true);
    expect(repriseExceptionnelleAutorisee('4814bf89-d0e3-484f-9a94-143eaa113ec9', '5c329b15-7981-420d-9b2b-e9cfaf8c3d05')).toBe(false);
    expect(repriseExceptionnelleAutorisee('9dee23be-10f2-49f4-a2e1-51c56100a1d1', 'f129b372-951f-42a8-95b0-d6421ace164b')).toBe(false);
    expect(repriseExceptionnelleAutorisee(undefined, 'f129b372-951f-42a8-95b0-d6421ace164b')).toBe(false);
  });
});
