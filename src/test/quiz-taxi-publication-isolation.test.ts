import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { construireInventaire, eligible, SOURCES } from "@/lib/quizAvantExamenTaxi/inventaire";
import { bilan, creer, ecrire, lire, repondre } from "@/lib/quizAvantExamenTaxi/tentatives";
import { lirePages, projeterSourcesCanoniques } from "@/lib/quizAvantExamenTaxi/sourcesServeur";
import { modulesAttribuesDashboard, modulesExigesDashboard } from "@/lib/parcoursModulesDashboard";
import { progressionModulesEleve } from "@/lib/progressionModulesEleve";
import { assemblerCalculJalons } from "@/lib/jalonsCalculCore";
import { elearningHoursEvidence } from "@/lib/elearningHoursEvidence";

const modules = [{ module_id: 7, module_data: { exercices: [{ id: 7001, questions: [
  { id: 1, enonce: "Source JSON ancienne", choix: [{ lettre: "A", texte: "Ancien", correct: true }] },
] }] } }];
const questions = [{ question_id: "canonical-1", quiz_id: "connaissance-ville", section_id: 7001,
  legacy_question_id: 1, position: 1, enonce: "Source officielle actuelle",
  choix: [{ lettre: "A", texte: "Choix A" }, { lettre: "B", texte: "Choix B", correct: true }],
  active: true, updated_at: "2026-11-17T12:29:00Z" }];
const bindings = [{ module_id: 7, quiz_id: "connaissance-ville", exercise_id: 7001, section_id: 7001 }];
const q = construireInventaire(projeterSourcesCanoniques(modules, questions, bindings))[0];
const stockage = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); } };
};

describe("Quiz TAXI — prérequis de publication", () => {
  it("exclut intégralement 13/13100 et les propositions d'arrondissement", () => {
    expect(SOURCES.some(s => s.module === 13 || s.exercice === 13100)).toBe(false);
    const inv = construireInventaire([...modules, { module_id: 13, module_data: { exercices: [{ id: 13100,
      questions: [{ id: 1, enonce: "Contrôle exclu", choix: [{ lettre: "A", texte: "Oui", correct: true }] }] }] } }]);
    expect(inv.filter(eligible)).toHaveLength(1);
    expect(inv.some(i => i.module === 13 || i.cle.startsWith("proposition:"))).toBe(false);
  });
  it("relit le corrigé canonique et garde l'identité officielle", () => {
    expect(q.cle).toBe("canonical-1");
    expect(q.enonce).toBe("Source officielle actuelle");
    expect(q.bonnes).toEqual(["B"]);
  });
  it("ne ressuscite pas une section liée vide ou désactivée depuis le JSON", () => {
    expect(construireInventaire(projeterSourcesCanoniques(modules, [], bindings))).toEqual([]);
    expect(construireInventaire(projeterSourcesCanoniques(modules, [{ ...questions[0], active: false }], bindings))).toEqual([]);
  });
  it("lit toutes les pages au-delà de 1000 questions", async () => {
    const source = Array.from({ length: 1207 }, (_, i) => i);
    const calls: number[] = [];
    const read = await lirePages(async (de, a) => { calls.push(de); return { data: source.slice(de, a + 1), error: null }; });
    expect(read).toEqual(source); expect(calls).toEqual([0, 500, 1000]);
  });
  it("refuse un échec intermédiaire de pagination au lieu d'un inventaire tronqué", async () => {
    await expect(lirePages(async de => de === 0
      ? { data: Array(500).fill(1), error: null }
      : { data: null, error: { message: "Lecture refusée" } })).rejects.toThrow("Lecture refusée");
  });
  it("refuse les écrasements d'un onglet ancien et conserve les deux comptes", () => {
    const st = stockage(); const initial = creer([], [q.cle], "toutes", null);
    const v1 = ecrire(st, "taxi-A", initial)[0];
    ecrire(st, "taxi-A", repondre(v1, q, ["B"]));
    expect(() => ecrire(st, "taxi-A", repondre(v1, q, ["A"]))).toThrow("autre onglet");
    expect(lire(st, "taxi-A")[0].reponses[q.cle].lettres).toEqual(["B"]);
    expect(lire(st, "taxi-B")).toEqual([]);
  });
  it("gèle les réponses terminées et recalcule uniquement la note interne", () => {
    const st = stockage(); let t = creer([], [q.cle], "toutes", null);
    t = repondre(t, q, ["B"]); t = ecrire(st, "taxi-A", t)[0];
    t = ecrire(st, "taxi-A", { ...t, termineeLe: "2026-11-17T12:30:00Z" })[0];
    expect(() => ecrire(st, "taxi-A", { ...t, reponses: {} })).toThrow("terminée");
    expect(bilan(t, new Map([[q.cle, q]]), eligible).note20).toBe(20);
    expect(bilan(t, new Map([[q.cle, { ...q, bonnes: ["A"] }]]), eligible).note20).toBe(0);
    expect(lire(st, "taxi-A")[0].reponses[q.cle].lettres).toEqual(["B"]);
  });
  it("le passage de l'aperçu ne change aucun module, jalon, heure ou taux global", () => {
    const st = stockage();
    const state = () => {
      const attributed = modulesAttribuesDashboard("taxi", null);
      const required = modulesExigesDashboard("taxi", null, []);
      return {
        attributed: attributed.map(m => m.id), required: required.map(m => m.id),
        progression: progressionModulesEleve(required, () => false, new Set()),
        jalons: assemblerCalculJalons({ key: "test", filiere: "taxi", parcours: required.map(m => m.id),
          parcoursInitial: required.map(m => m.id), editorRows: [],
          examens: [{ id: "test-taxi-1", type: "TAXI", numero: 1, matieres: [{ questions: [{ id: 1, actif: true }] }] }], initialDe: () => null,
          pratiqueDetails: [], emargements: [], completions: [], heuresValidees: [], jeuxTermines: [] }),
        heures: elearningHoursEvidence({ apprenantId: "test", apprenant: {}, acts: [], quizzes: [], exos: [], cnxAll: [], pratiqueDates: [] }),
      };
    };
    const before = state();
    let t = creer([], [q.cle], "toutes", null); t = repondre(t, q, ["B"]);
    ecrire(st, "test", { ...t, termineeLe: "2026-11-17T12:30:00Z" });
    expect(bilan(lire(st, "test")[0], new Map([[q.cle, q]]), eligible).note20).toBe(20);
    expect(state()).toEqual(before);
    expect(before.heures.onlineMin).toBe(0);
    expect(before.attributed).toHaveLength(15);
    expect(before.required).toHaveLength(15);
  });
});