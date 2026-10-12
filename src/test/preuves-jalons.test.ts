// @vitest-environment node
import { describe, expect, it } from "vitest";
import { writeFileSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { construirePreuvesJalons, moduleDepuisExercice, reponseNonVide } from "@/lib/preuvesJalons";
import { PRATIQUE_PHYSIQUE, MODULES_PONDERES, avecJalonPratique, calculerDureesPrevisionnelles, calculerJalonsPonderes, calculerPoids, completionPratique } from "@/lib/jalonsPonderes";
import { FORMATION_MODULES } from "@/components/cours-en-ligne/modules-config";
import { generateReleveJalonsPedagogiquesPdf } from "@/lib/pdf/releve-jalons-pedagogiques";

const lus = ["activites", "reponses", "quiz", "v2", "connexions", "emargements", "planning"].map((cle) => ({ cle, libelle: cle, lu: true, lignes: 1 }));
const base = { apprenantId: "fictif", filiere: "vtc" as const, lignesModuleIds: [26, 2, 4, 35, 5, 8, PRATIQUE_PHYSIQUE], completions: [{ module_id: 5, status: "completed" }], sources: lus };

describe("Preuves individuelles des jalons", () => {
  it("rattache par identifiant, sépare l’accueil et ne duplique pas", () => {
    const r = construirePreuvesJalons({ ...base,
      activites: [
        { id: 1, module_id: 2, module_nom: "A. T3P", action_type: "open_cours", occurred_at: "2026-05-01T10:00:00Z" },
        { id: 1, module_id: 2, module_nom: "A. T3P", action_type: "open_cours", occurred_at: "2026-05-01T10:00:00Z" },
        { id: 2, module_id: 0, module_nom: "Accueil — Liste des modules", action_type: "open_section", occurred_at: "2026-05-01T09:00:00Z" },
        { id: 3, module_id: 99, module_nom: "Autre", action_type: "open_module", occurred_at: "2026-05-01T09:30:00Z" },
      ],
      reponses: [
        { id: "a", exercice_id: "module_2_exo_4", reponses: { 1: "B" }, completed: true, updated_at: "2026-05-01T10:05:00Z" },
        { id: "b", exercice_id: "module_2_exo_5", reponses: {}, completed: false, updated_at: "2026-05-01T10:06:00Z" },
        { id: "c", exercice_id: "EB3__t3p", reponses: [{ r: "x" }], completed: true, status: "submitted", submitted_at: "2026-05-25T12:32:23Z", updated_at: "2026-05-25T12:32:23Z" },
      ],
      quiz: [{ id: "q", quiz_type: "examen_blanc", quiz_id: "EB1", matiere_id: "t3p", note_sur_20: 13, completed_at: "2026-05-17T16:54:35Z" }],
      tentativesV2: [{ attempt_id: "t-test", exam_id: 1, etat: "terminee", is_test: true, finished_at: "2026-06-01T00:00:00Z" }, { attempt_id: "ab", exam_id: 1, etat: "abandonnee", is_test: false, started_at: "2026-06-02T00:00:00Z", finished_at: "2026-06-02T01:00:00Z" }],
    });
    expect(r.chronologie.map((t) => t.ref)).toEqual(["activite:1", "reponse:a", "quiz:q", "reponse:c", "passageV2:ab"]);
    expect(s(35).passagesV2Termines).toBe(0);
    expect(r.nonRattachees.map((t) => t.ref)).toEqual(["activite:2", "activite:3"]);
    const s = (id: number) => r.synthese.find((l) => l.moduleId === id)!;
    expect(s(35).matieresEnvoyees).toBe(1);
    expect(s(2).exercicesAvecReponses).toBe(1);
    expect(s(35).notes).toBe(1);
    expect(s(5).traces).toBe("manquantes");
    expect(s(5).statutEnregistre).toBe("completed");
  });

  it("inscription au planning sans émargement signé = aucune présence", () => {
    const r = construirePreuvesJalons({ ...base, pratiqueDetails: [{ date: "2026-06-10", parts: [], minutes: 360 } as any],
      emargements: [{ id: "e1", date_emargement: "2026-06-10", demi_journee: "matin", absent: false, signature_data_url: "" }] });
    const p = r.synthese.find((l) => l.moduleId === PRATIQUE_PHYSIQUE)!;
    expect(p.emargements).toBe(0);
    const signe = construirePreuvesJalons({ ...base, dateDebutAcces: "2026-06-01", dateFinAcces: "2026-06-30", pratiqueDetails: [{ date: "2026-06-10", parts: [], minutes: 360 } as any, { date: "2026-07-10", parts: [], minutes: 360 } as any],
      emargements: [{ id: "e2", date_emargement: "2026-06-10", demi_journee: "matin", signature_data_url: "x" }, { id: "e3", date_emargement: "2026-07-10", demi_journee: "matin", signature_data_url: "x" }] });
    const t = signe.chronologie.find((x) => x.ref === "emargement:e2")!;
    expect(t.dateSeule).toBe(true);
    expect(t.detail).toContain("heure de signature non disponible");
    expect(signe.chronologie.find((x) => x.ref === "emargement:e3")!.horsPeriode).toBe(true);
    expect(signe.synthese.find((l) => l.moduleId === PRATIQUE_PHYSIQUE)!.emargements).toBe(1);
    expect(p.commentaire).toContain("inscription au planning");
  });

  it("une source illisible n’est jamais présentée comme 0 trace", () => {
    const r = construirePreuvesJalons({ ...base, sources: lus.map((s) => s.cle === "activites" ? { ...s, lu: false, erreur: "42501" } : s), activites: null });
    expect(r.synthese.find((l) => l.moduleId === 2)!.traces).toBe("lecture non possible");
  });

  it("connexions : accueil seul non compté, plafond 30 min après dernière activité", () => {
    const r = construirePreuvesJalons({ ...base,
      activites: [{ id: 1, module_id: 2, module_nom: "A", action_type: "open_cours", occurred_at: "2026-05-01T10:10:00Z" }],
      connexions: [
        { started_at: "2026-05-01T10:00:00Z", ended_at: "2026-05-01T17:00:00Z", last_action_at: "2026-05-01T10:10:00Z" },
        { started_at: "2026-05-02T10:00:00Z", ended_at: "2026-05-02T11:00:00Z" },
      ] });
    expect(r.connexions.map((c) => c.minutesRetenues)).toEqual([40, 0]);
    expect(r.minutesConnexionRetenues).toBe(40);
  });

  it("utilitaires", () => {
    expect(reponseNonVide({ a: "", b: [] })).toBe(false);
    expect(reponseNonVide({ a: 0 })).toBe(true);
    expect(moduleDepuisExercice("module_3_inline_2", "vtc")).toBe(3);
    expect(moduleDepuisExercice("EB1-TAXI__t3p", "taxi")).toBe(36);
    expect(moduleDepuisExercice("revision_fausses_EB1", "vtc")).toBeNull();
  });

  it("contrat des requêtes : colonnes réelles (exam_attempts_v2 = attempt_id, jamais id)", () => {
    const src = readFileSync("src/lib/preuvesJalons.ts", "utf8");
    expect(src).toContain('"attempt_id, exam_id, etat, is_test, started_at, finished_at", "attempt_id"');
    expect(src).not.toMatch(/exam_attempts_v2", "id[, "]/);
  });

  it.each(["vtc", "taxi", "ta", "va"] as const)("PDF fictif volumineux paginé sans troncature : %s", async (filiere) => {
    const volumes = Object.fromEntries(MODULES_PONDERES[filiere].map((id) => [id, { pages: 10, questions: 5, points: id === PRATIQUE_PHYSIQUE ? 360 : undefined }]));
    const parcours = avecJalonPratique(FORMATION_MODULES[`${filiere}-e`].modules.map((m) => m.id));
    const completions = [completionPratique(0)];
    const poids = calculerPoids(filiere, volumes as any);
    const calcul = { filiere, volumes, durees: calculerDureesPrevisionnelles(filiere, volumes as any), limites: [], poids, completions, resultat: calculerJalonsPonderes(filiere, parcours, completions, poids), pratique: { minutes: 0, progression: 0, dernierePreuve: null } };
    const mod = parcours.find((id) => id > 0 && id !== 26)!;
    const preuvesJalons = construirePreuvesJalons({ ...base, filiere, lignesModuleIds: parcours, completions,
      activites: Array.from({ length: 1500 }, (_, i) => ({ id: i, module_id: mod, module_nom: `Support fictif ${i}`, action_type: "open_cours", occurred_at: new Date(Date.UTC(2026, 0, 1) + i * 60000).toISOString() })) });
    const res = generateReleveJalonsPedagogiquesPdf({ apprenant: { id: "FICTIF", prenom: "Alice", nom: "EXEMPLE" }, formationLabel: filiere, calcul, preuves: [], preuvesJalons, elementsACompleter: [], generatedAt: new Date("2026-10-12T19:00:00Z") }, { returnBlob: true })!;
    const path = `/tmp/preuves-jalons-fictif-${filiere}.pdf`;
    writeFileSync(path, new Uint8Array(await res.blob.arrayBuffer()));
    const txt = execFileSync("pdftotext", ["-raw", path, "-"], { encoding: "utf8" });
    expect(txt).toContain("activite:0");
    expect(txt).toContain("activite:1499");
    expect(txt).toContain("Objectifs pédagogiques des jalons");
    expect(txt).toContain("ANNEXE A");
  });
});
