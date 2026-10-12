// @vitest-environment node
import { describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { FORMATION_MODULES } from "@/components/cours-en-ligne/modules-config";
import { calculerDureesPrevisionnelles, MODULES_PONDERES, PRATIQUE_PHYSIQUE, avecJalonPratique, calculerJalonsPonderes, calculerPoids, completionPratique, unites } from "@/lib/jalonsPonderes";
import { formationJalonsElearning } from "@/lib/jalonsPedagogiques";
import { generateReleveJalonsPedagogiquesPdf } from "@/lib/pdf/releve-jalons-pedagogiques";

const volumes = Object.fromEntries(MODULES_PONDERES.vtc.map((id) => [id, { moduleId: id, pages: id === PRATIQUE_PHYSIQUE ? 0 : 10, questions: id === PRATIQUE_PHYSIQUE ? 0 : 5, points: id === PRATIQUE_PHYSIQUE ? 360 : undefined }]));

describe("Relevé des jalons pédagogiques", () => {
  it("est réservé aux quatre parcours e-learning stricts", () => {
    for (const key of ["vtc-e", "taxi-e", "ta-e", "va-e"]) expect(formationJalonsElearning(key, null)).toBe(key);
    for (const key of ["vtc", "taxi", "ta", "va", "vtc-e-presentiel", "continue-vtc", "mobilite-taxi"]) expect(formationJalonsElearning(key, null)).toBeNull();
  });

  it("inclut les 360 points et garde 100 % de poids avec un dossier incomplet", () => {
    const poids = calculerPoids("vtc", volumes);
    expect(unites(volumes[PRATIQUE_PHYSIQUE])).toBe(360);
    expect(Object.values(poids).reduce((sum, value) => sum + value, 0)).toBeCloseTo(100, 8);
    const parcours = avecJalonPratique(FORMATION_MODULES["vtc-e"].modules.map((module) => module.id));
    const resultat = calculerJalonsPonderes("vtc", parcours, [completionPratique(180)], poids);
    expect(resultat.lignes.find((line) => line.moduleId === PRATIQUE_PHYSIQUE)?.progression).toBe(50);
    expect(resultat.taux).toBeGreaterThan(0);
    expect(resultat.taux).toBeLessThan(100);
  });

  it("génère un PDF fictif paginé en lecture seule", async () => {
    const parcours = avecJalonPratique(FORMATION_MODULES["vtc-e"].modules.map((module) => module.id));
    const completions = [...parcours.filter((id) => id !== PRATIQUE_PHYSIQUE).map((module_id) => ({ module_id, status: "completed" })), completionPratique(180)];
    const poids = calculerPoids("vtc", volumes);
    const result = generateReleveJalonsPedagogiquesPdf({
      apprenant: { id: "DOSSIER-FICTIF", civilite: "Mme", prenom: "Alice", nom: "EXEMPLE", type_apprenant: "vtc-e", date_debut_formation: "2026-01-02", date_fin_formation: "2026-03-04" },
      formationLabel: "VTC — e-learning (CPF)",
      session: { nom: "Session fictive", date_debut: "2026-01-02", date_fin: "2026-03-04" },
      calcul: { filiere: "vtc", volumes, durees: calculerDureesPrevisionnelles("vtc", volumes), limites: ["Module fictif : pages issues de l’audit."], poids, completions, resultat: calculerJalonsPonderes("vtc", parcours, completions, poids), pratique: { minutes: 180, progression: 50, dernierePreuve: "2026-02-10", source: "Planning pratique + émargements signés" } },
      preuves: Array.from({ length: 12 }, (_, index) => ({ label: `Preuve fictive ${index + 1}`, count: index, dates: ["2026-02-10"], detail: "Donnée fictive de contrôle visuel" })),
      elementsACompleter: ["Accompagnement : non renseigné dans le jeu fictif."],
      generatedAt: new Date("2026-10-12T14:00:00Z"),
    }, { returnBlob: true });
    expect(result).toBeDefined();
    if (!result) return;
    const bytes = new Uint8Array(await result.blob.arrayBuffer());
    expect(new TextDecoder("latin1").decode(bytes.slice(0, 8))).toContain("%PDF");
    expect(bytes.length).toBeGreaterThan(10_000);
    writeFileSync("/tmp/releve-jalons-pedagogiques-fictif.pdf", bytes);
  });
});