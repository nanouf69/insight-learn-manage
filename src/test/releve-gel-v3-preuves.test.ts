import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => { throw new Error("LECTURE EN DIRECT INTERDITE"); },
    rpc: () => { throw new Error("RPC EN DIRECT INTERDITE"); },
  },
}));
vi.mock("@/components/cours-en-ligne/ModuleDetailView", () => ({
  getInitialModuleContentForVolume: () => ({
    cours: [],
    exercices: [{
      id: 1,
      actif: true,
      questions: Array.from({ length: 10 }, (_, i) => ({ id: i + 1, choix: [{ lettre: "A", correct: true }] })),
    }],
  }),
}));
vi.mock("@/components/cours-en-ligne/ExamensBlancsEditor", () => ({
  loadSavedExamens: async () => ["VTC", "TAXI", "TA", "VA"].flatMap((type) =>
    Array.from({ length: 6 }, (_, i) => ({
      id: `${type}-${i + 1}`,
      type,
      numero: i + 1,
      matieres: [{ questions: [{ id: 1 }, { id: 2 }] }],
    }))),
}));

import {
  calculerGelInitial,
  completionsPreuvesFigees,
  METHODE_GEL,
  METHODE_GEL_PREUVES,
} from "@/lib/releveCalculServeur";
import { liveCompletionEvidence } from "@/lib/moduleCompletionEvidence";

const cas = [
  ["vtc-e", 2],
  ["taxi-e", 10],
  ["ta-e", 40],
  ["va-e", 41],
] as const;

function sources(moduleId: number, preuve: boolean | null, progression = 50) {
  return {
    completions: [{ module_id: moduleId, status: "completed", progress: 100, completed_at: "2026-11-01T10:00:00Z" }],
    preuves_completion: [{ module_id: moduleId, preuve_complete: preuve, progress_effectif: progression }],
    modules_attribues: [moduleId],
    emargements: [],
    heures_validees: [],
    reservations_pratique: [],
    sessions: [],
    planning_configs: [],
    activites: [],
    reponses: [],
    quiz: [],
    tentatives_v2: [],
    connexions: [],
    gele_le: "2026-11-06T12:00:00Z",
  };
}

function gel(moduleId: number, preuve: boolean | null, methodeVersion = "gel-v3") {
  return {
    id: `gel-fictif-${moduleId}`,
    methode_version: methodeVersion,
    contenu: {},
    sources: sources(moduleId, preuve),
  };
}

describe("gel-v3 — preuves serveur figées", () => {
  it("archive les verdicts sans lecture live et refuse un verdict absent", () => {
    const rows = completionsPreuvesFigees(sources(2, false, 79.9));
    expect(rows[0]).toMatchObject({ module_id: 2, preuve_serveur: false, progress_preuve: 79.9 });
    const absent: any = sources(2, true);
    absent.preuves_completion = [];
    expect(() => completionsPreuvesFigees(absent)).toThrow(/Verdict serveur non archivé/);
  });

  it("un faux serveur sans details ne retombe jamais sur completed", () => {
    expect(liveCompletionEvidence({ module_id: 2, status: "completed", progress: 100, preuve_serveur: false, progress_preuve: null }))
      .toMatchObject({ status: "in_progress", progress: 0 });
  });

  it.each(cas)("%s : preuve incomplète = progression archivée, jamais 100 %%", async (type, moduleId) => {
    const calcul = await calculerGelInitial(gel(moduleId, false, 50), { type_apprenant: type }, new Map());
    const ligne = calcul.resultat.lignes.find((l) => l.moduleId === moduleId);
    expect(ligne?.progression).toBe(50);
    expect(calcul.completions.find((c: any) => c.module_id === moduleId)).toMatchObject({ status: "in_progress", progress: 50 });
    expect(calcul.modulesAttribues).toEqual([moduleId]);
  });

  it("preuve indéterminée sur un module à questions : calcul refusé, pas de faux 100 %", async () => {
    await expect(calculerGelInitial(gel(2, null), { type_apprenant: "vtc-e" }, new Map()))
      .rejects.toThrow(/Preuves indéterminées.*jamais 100/);
  });

  it("ancien gel-v2 sans nouvelles archives : chemin historique conservé", async () => {
    const ancien = gel(2, true, "gel-v2");
    delete (ancien.sources as any).preuves_completion;
    delete (ancien.sources as any).modules_attribues;
    const calcul = await calculerGelInitial(ancien, { type_apprenant: "vtc-e" }, new Map());
    expect(calcul.completions.find((c: any) => c.module_id === 2)).toMatchObject({ status: "completed", progress: 100 });
    expect(calcul.modulesAttribues).toBeNull();
  });

  it("la méthode du nouveau gel est distincte de la méthode historique", () => {
    expect(METHODE_GEL_PREUVES).toContain("gel-v3");
    expect(METHODE_GEL_PREUVES).not.toBe(METHODE_GEL);
  });
});
