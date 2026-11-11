import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
const fixture = vi.hoisted(() => ({ row: null as any, queue: [] as any[], filters: {} as Record<string, unknown> }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => {
  const query = { select: () => query, eq: (k: string, v: unknown) => { fixture.filters[k] = v; return query; }, maybeSingle: async () => ({ data: fixture.row, error: null }) }; return query;
} } }));
vi.mock("@/lib/sessionRpc", () => ({ freshSessionCall: (fn: () => unknown) => fn() }));
vi.mock("@/lib/answerPersistence", () => ({ enqueueAnswerSave: (p: any) => fixture.queue.push(p), flushAnswerSavesAndWait: async () => { const p = fixture.queue.at(-1); fixture.row = { reponses: p.reponses, completed: p.completed }; return true; } }));
import { useSuiviJeu } from "@/components/cours-en-ligne/jeux-lyon/useSuiviJeu";
import { CARTES, JEU_GESTION_ID, jeuTermine, placer, progressionVide } from "@/components/cours-en-ligne/gestion-classement/donnees";
afterEach(() => { cleanup(); fixture.row = null; fixture.queue = []; fixture.filters = {}; });
it("le vrai suivi persiste uniquement le jeu, score/module null, puis confirme et restaure", async () => {
  const hook = renderHook(() => useSuiviJeu("fixture-account", JEU_GESTION_ID));
  await waitFor(() => expect(hook.result.current.etat).toBe("a_faire"));
  const p = { ...CARTES.reduce((s, c) => placer(s, c.id, c.zone), progressionVide()), calcul: true };
  await act(async () => { await hook.result.current.enregistrer({ ...p, version: 1 }, jeuTermine(p)); });
  expect(fixture.queue).toHaveLength(1);
  expect(fixture.queue[0]).toMatchObject({ apprenant_id: "fixture-account", exercice_id: JEU_GESTION_ID, module_id: null, score: null, completed: true, exercice_type: "jeu_carte" });
  expect(hook.result.current.etat).toBe("confirme"); hook.unmount();
  const reopened = renderHook(() => useSuiviJeu("fixture-account", JEU_GESTION_ID));
  await waitFor(() => expect(reopened.result.current.etat).toBe("confirme"));
  expect(reopened.result.current.reponses).toEqual({ ...p, version: 1 });
  expect(fixture.filters).toEqual({ apprenant_id: "fixture-account", exercice_id: JEU_GESTION_ID });
});
it("un aperçu sans compte ne crée aucun envoi", async () => {
  const hook = renderHook(() => useSuiviJeu(null, JEU_GESTION_ID));
  await act(async () => { await hook.result.current.enregistrer({ placements: {} }, false); });
  expect(fixture.queue).toHaveLength(0);
});