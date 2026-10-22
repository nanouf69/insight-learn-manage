// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { classerEchecIa, planSuite, TIMEOUT_IA_MS } from '../../supabase/functions/_shared/qrcIaSuite';

const fonction = readFileSync(join(process.cwd(), 'supabase/functions/qrc-ia-correction/index.ts'), 'utf8');

describe('Plan de suite par passage', () => {
  it('une QRC en revue ne bloque pas la suivante', () => {
    expect(planSuite([{ id: 'a', action: 'revue', delai: 0 }, { id: 'b', action: 'appel', delai: 0 }])).toEqual({ type: 'appel', id: 'b' });
  });
  it('une QRC en délai ne bloque pas une QRC jamais traitée', () => {
    expect(planSuite([{ id: 'a', action: 'attendre', delai: 30000 }, { id: 'b', action: 'appel', delai: 0 }])).toEqual({ type: 'appel', id: 'b' });
  });
  it('jamais « terminée » si une QRC attend encore ou est en revue', () => {
    expect(planSuite([{ id: 'a', action: 'attendre', delai: 30000 }])).toEqual({ type: 'attente', delai: 60000 });
    expect(planSuite([{ id: 'a', action: 'revue', delai: 0 }, { id: 'b', action: 'fin', delai: 0 }])).toEqual({ type: 'a_verifier', nb: 1 });
    expect(planSuite([], true)).toEqual({ type: 'a_verifier', nb: 0 });
    expect(planSuite([{ id: 'a', action: 'fin', delai: 0 }])).toEqual({ type: 'terminee' });
  });
});

describe("Classement des échecs d'appel IA", () => {
  it('délai local dépassé : 504 reprisable (rien publié)', () => {
    expect(classerEchecIa({ providerFinished: false, timeoutLocal: true })).toMatchObject({ status: 504, statut: 'erreur', reprisable: true, code: 'timeout_local' });
    expect(TIMEOUT_IA_MS).toBe(60000);
  });
  it('429 et 5xx reprisables, 402/403/400 non', () => {
    expect(classerEchecIa({ providerFinished: false, timeoutLocal: false, statusCode: 429 }).reprisable).toBe(true);
    expect(classerEchecIa({ providerFinished: false, timeoutLocal: false, statusCode: 503 }).reprisable).toBe(true);
    for (const s of [400, 401, 402, 403, 404]) expect(classerEchecIa({ providerFinished: false, timeoutLocal: false, statusCode: s }).reprisable).toBe(false);
  });
  it('issue inconnue ou échec après réponse IA : revue, jamais refacturé', () => {
    expect(classerEchecIa({ providerFinished: false, timeoutLocal: false })).toMatchObject({ status: 499, statut: 'a_verifier', reprisable: false });
    expect(classerEchecIa({ providerFinished: true, timeoutLocal: true, statusCode: 503 })).toMatchObject({ statut: 'a_verifier', reprisable: false });
  });
});

describe('Fonction de correction', () => {
  it("l'appel de l'onglet élève met seulement en file", () => {
    expect(fonction).toMatch(/qrc_ia_enfiler", \{ p_attempt: attempt_id, p_origine: "appel_client" \}/);
  });
  it('la continuation répond tout de suite et travaille en arrière-plan', () => {
    expect(fonction).toMatch(/waitUntil\(travail\)/);
  });
  it("l'appel IA a un délai maximal et aucun retry SDK", () => {
    expect(fonction).toMatch(/abortSignal: delai\.signal/);
    expect(fonction).toMatch(/maxRetries: 0/);
  });
  it('Ismail AMAR reste exclu', () => {
    expect(fonction).toContain('c0844007-b999-4385-9665-918e5077c3b5');
  });
});
