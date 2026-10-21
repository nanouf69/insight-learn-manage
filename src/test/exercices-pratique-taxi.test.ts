import { describe, it, expect } from "vitest";
import { JOURS_FERIES_2026, QUESTIONS_FERIES, QUESTIONS_TARIFS, SCENARIOS_RTST } from "@/components/cours-en-ligne/pratique-taxi/exercicesTaxiData";
import { evaluerScenario, lireMontant, qcmTermine } from "@/components/cours-en-ligne/pratique-taxi/exercicesTaxiLogic";
import { activitesDuModule, activitesRequisesModule, completionAvecActivites } from "@/lib/jeuxPedagogiques";

describe("Exercices PRATIQUE TAXI", () => {
  it("11 jours fériés 2026 exacts", () => {
    expect(JOURS_FERIES_2026.map((j) => j.iso)).toEqual(["2026-01-01","2026-04-06","2026-05-01","2026-05-08","2026-05-14","2026-05-25","2026-07-14","2026-08-15","2026-11-01","2026-11-11","2026-12-25"]);
    for (const q of QUESTIONS_FERIES) expect(q.options[q.bonne]).toBe(JOURS_FERIES_2026.find((j) => j.id === q.id)!.libelle);
  });
  it("au moins 25 questions tarifs, montants de l'arrêté 2026", () => {
    expect(QUESTIONS_TARIFS.length).toBeGreaterThanOrEqual(25);
    const r = (id: string) => { const q = QUESTIONS_TARIFS.find((x) => x.id === id)!; return q.options[q.bonne]; };
    expect(r("t13")).toBe("2 €"); expect(r("t14")).toBe("4 €"); expect(r("t16")).toBe("41,30 €"); expect(r("t20")).toBe("8,00 €"); expect(r("t08")).toBe("7h – 19h");
  });
  it("13 scénarios ; calculs d'attente 41,3/60", () => {
    expect(SCENARIOS_RTST).toHaveLength(13);
    expect(SCENARIOS_RTST[0].acceptes.attente[0]).toBe(10.33);
    expect(SCENARIOS_RTST[2].acceptes.attente[0]).toBe(30.98);
    expect(SCENARIOS_RTST[4].acceptes.attente[0]).toBe(6.88);
  });
  it("corrigé conditionnel : neige → B ou A acceptés ; C refusé", () => {
    const s = SCENARIOS_RTST[0];
    expect(evaluerScenario(s, { reservation: "4", tarif: "B", supplements: "0", attente: "10,33 €" })).toEqual({ reservation: true, tarif: true, supplements: true, attente: true });
    expect(evaluerScenario(s, { reservation: "4", tarif: "A", supplements: "0", attente: "10.32" }).tarif).toBe(true);
    expect(evaluerScenario(s, { reservation: "2", tarif: "C", supplements: "0", attente: "10" })).toMatchObject({ reservation: false, tarif: false, attente: false });
  });
  it("montants lus ; QCM terminé seulement si tout répondu", () => {
    expect(lireMontant("10,33 €")).toBe(10.33); expect(lireMontant("")).toBeNull();
    expect(qcmTermine(QUESTIONS_FERIES, {})).toBe(false);
    expect(qcmTermine(QUESTIONS_FERIES, Object.fromEntries(QUESTIONS_FERIES.map((q) => [q.id, 0])))).toBe(true);
  });
  it("PROTECTION : module 6 validé avant le 21/10 reste à 100 %, exercices facultatifs", () => {
    const acts = activitesDuModule(6);
    expect(acts.map((a) => a.id)).toEqual(["exo_taxi_jours_feries_2026", "exo_taxi_tarifs_2026", "exo_taxi_scenarios_rtst"]);
    const row = { module_id: 6, status: "completed", progress: 100, completed_at: "2026-09-10T10:00:00Z" } as any;
    expect(activitesRequisesModule(6, row)).toEqual([]);
    const { completion } = completionAvecActivites(row, { pages: 10, questions: 20 } as any, acts, new Set());
    expect(completion).toMatchObject({ status: "completed", progress: 100 });
    // validé sans date lisible : acquis conservé
    expect(activitesRequisesModule(6, { status: "completed", completed_at: null })).toEqual([]);
  });
  it("élève en cours : les 3 exercices sont requis", () => {
    const row = { module_id: 6, status: "in_progress", progress: 100 } as any;
    expect(activitesRequisesModule(6, row)).toHaveLength(3);
    const { completion } = completionAvecActivites(row, { pages: 10, questions: 20 } as any, activitesDuModule(6), new Set());
    expect(completion.status).toBe("in_progress");
  });
  it("module 8 VTC inchangé", () => {
    expect(activitesDuModule(8).map((a) => a.id)).toEqual(["jeu_lyon_arrondissements_quartiers", "jeu_lyon_lieux"]);
  });
});
