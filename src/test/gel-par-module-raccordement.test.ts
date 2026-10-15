// Données fictives uniquement — lectures simulées, aucune écriture.
import { beforeEach, describe, expect, it, vi } from "vitest";
const fake = vi.hoisted(() => ({ rows: {} as Record<string, any> }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: (table: string) => {
  const q: any = {}; for (const m of ["select", "eq", "order", "in"]) q[m] = () => q;
  q.single = async () => fake.rows[table];
  q.range = async (f: number, t: number) => ({ ...fake.rows[table], data: fake.rows[table]?.data?.slice(f, t + 1) });
  return q;
} } }));
import { chargerCandidatModules } from "@/hooks/useCandidatModules";
import { completionAvecActivites, ACTIVITES_CODE } from "@/lib/jeuxPedagogiques";
import { recalculerPratiqueSeule } from "@/lib/releveCalculServeur";
import { clampConnexionsToAccessEnd, getAccessCutoffMs, finJourneeParisMs } from "@/lib/reports/session-duration";
import { learningSessionWindow } from "@/lib/reports/learning-hours-window";
import { MODULES_PONDERES, PRATIQUE_PHYSIQUE, avecJalonPratique, calculerDureesPrevisionnelles, calculerJalonsPonderes, calculerPoids, completionPratique } from "@/lib/jalonsPonderes";
import { FORMATION_MODULES } from "@/components/cours-en-ligne/modules-config";

const AVANT = "2026-10-01T08:00:00Z"; // avant l'ajout des jeux (13/10/2026 10:41 UTC)
beforeEach(() => { fake.rows = {
  apprenants: { data: { type_apprenant: "vtc-e", modules_autorises: [8], formation_choisie: null } },
  apprenant_module_completion: { data: [{ module_id: 8, status: "completed", completed_at: AVANT }] },
  reponses_apprenants: { data: [] },
}; });

describe("Raccordement : chargement réel => compteur", () => {
  it("module 8 validé avant l'ajout des jeux, jeux non faits => terminé", async () => {
    expect(await chargerCandidatModules("fictif-A")).toMatchObject({ total: 1, termines: 1, restants: [] });
  });
  it("validé après l'ajout, jeux non faits => reste à terminer", async () => {
    fake.rows.apprenant_module_completion.data = [{ module_id: 8, status: "completed", completed_at: "2026-10-13T12:00:00Z" }];
    expect(await chargerCandidatModules("fictif-B")).toMatchObject({ termines: 0, restants: [{ id: 8, raison: "nouvelles_activites" }] });
  });
  it("completed sans date : validation conservée, aucune date inventée", async () => {
    fake.rows.apprenant_module_completion.data = [{ module_id: 8, status: "completed", completed_at: null }];
    expect(await chargerCandidatModules("fictif-C")).toMatchObject({ termines: 1 });
  });
  it("in_progress à 100 % : jamais validé", async () => {
    fake.rows.apprenant_module_completion.data = [{ module_id: 8, status: "in_progress", progress: 100, completed_at: AVANT }];
    expect(await chargerCandidatModules("fictif-D")).toMatchObject({ termines: 0 });
  });
});

describe("Jalons : ligne de releve_sources_apprenant() (forme serveur exacte)", () => {
  const jeux8 = ACTIVITES_CODE.filter((a) => a.moduleId === 8);
  const ligneServeur = JSON.parse(JSON.stringify({ module_id: 8, status: "completed", progress: 100, completed_at: "2026-10-01T08:00:00+00:00" }));
  it("format timestamptz Postgres lu correctement => 100 %", () => {
    const r = completionAvecActivites(ligneServeur, { moduleId: 8, pages: 3, questions: 10 } as any, jeux8, new Set());
    expect(r.completion).toMatchObject({ status: "completed", progress: 100 });
    expect(r.etat.valideLe).toBe("2026-10-01T08:00:00.000Z");
  });
  it("completed sans date => 100 %, valideSansDate signalé", () => {
    const r = completionAvecActivites({ ...ligneServeur, completed_at: null }, { moduleId: 8, pages: 3, questions: 10 } as any, jeux8, new Set());
    expect(r.completion.progress).toBe(100); expect(r.etat.valideSansDate).toBe(true); expect(r.etat.valideLe).toBeNull();
  });
});

describe("Heures : jamais figées à la complétion, bornées à la fin d'accès (Paris)", () => {
  const minutes = (rows: any[], fin: string) => clampConnexionsToAccessEnd(rows, fin).reduce((s, c) => s + learningSessionWindow(c as any, "fictif").minutes, 0);
  const cnx = (start: string, end: string) => ({ started_at: start, ended_at: end, last_seen_at: end, last_action_at: end });
  it("fin de journée Paris : été UTC+2, hiver UTC+1, jour du changement d'heure", () => {
    expect(new Date(finJourneeParisMs(2026, 10, 20)).toISOString()).toBe("2026-10-20T21:59:59.999Z");
    expect(new Date(finJourneeParisMs(2026, 12, 20)).toISOString()).toBe("2026-12-20T22:59:59.999Z");
    expect(new Date(getAccessCutoffMs("2026-10-25")!).toISOString()).toBe("2026-10-25T22:59:59.999Z");
  });
  it("tous modules terminés, puis activité +15 min avant la fin d'accès => +15 min", () => {
    const base = [cnx("2026-10-10T08:00:00Z", "2026-10-10T09:00:00Z")];
    expect(minutes(base, "2026-10-20")).toBe(60);
    expect(minutes([...base, cnx("2026-10-16T08:00:00Z", "2026-10-16T08:15:00Z")], "2026-10-20")).toBe(75);
  });
  it("dernier jour 23:50 Paris compté jusqu'à 23:59:59 ; lendemain 00:05 Paris ignoré", () => {
    expect(minutes([cnx("2026-10-20T21:50:00Z", "2026-10-20T22:20:00Z")], "2026-10-20")).toBe(9);
    expect(minutes([cnx("2026-10-20T22:05:00Z", "2026-10-20T22:30:00Z")], "2026-10-20")).toBe(0);
  });
});

describe("Pratique admin après fin d'accès : nouvelle version, ancienne intacte", () => {
  it("v1 non modifiée, v2 distincte, seule la pratique change", () => {
    const volumes = Object.fromEntries(MODULES_PONDERES.vtc.map((id) => [id, { pages: 10, questions: 5, points: id === PRATIQUE_PHYSIQUE ? 360 : undefined }]));
    const parcours = avecJalonPratique(FORMATION_MODULES["vtc-e"].modules.map((m) => m.id));
    const completions = [{ module_id: 8, status: "completed", completed_at: AVANT }, completionPratique(0)];
    const poids = calculerPoids("vtc", volumes as any);
    const v1: any = { key: "vtc-e", gelId: "g1", filiere: "vtc", parcours, volumes, limites: [], durees: calculerDureesPrevisionnelles("vtc", volumes as any), poids, completions,
      resultat: calculerJalonsPonderes("vtc", parcours, completions as any, poids), pratique: { minutes: 0, detail: {}, progression: 0, dernierePreuve: null } };
    const copie = JSON.stringify(v1);
    const v2 = recalculerPratiqueSeule(v1, { id: "g2", sources: { completions: [], emargements: [], heures_validees: [{ id: "h", heures: 6, created_at: "2026-10-22T08:00:00Z", date_presence: "2026-10-22", categorie: "pratique", motif: "séance" }], reservations_pratique: [], sessions: [], planning_configs: [] } });
    expect(JSON.stringify(v1)).toBe(copie);
    expect(v2.gelId).toBe("g2"); expect(v2.pratique.minutes).toBe(360); expect(v2.poids).toEqual(v1.poids);
  });
});
