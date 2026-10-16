// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { calculerJalonsPonderes, progressionModule } from "@/lib/jalonsPonderes";
import { isExamAttemptPublicationPending } from "@/components/cours-en-ligne/exam-helpers";

const poids = { [-1]: 1, 2: 40, 3: 2, 4: 20, 35: 25, 5: 10, [-2]: 2 } as Record<number, number>;
const parcours = [26, 2, 3, 4, 35, 5, -2];
const taux = (c: any[]) => calculerJalonsPonderes("vtc", parcours, c, poids);

describe("Jalons = réalisation, jamais le score", () => {
  it("mêmes activités réalisées avec 0 %, 50 %, 100 % de bonnes réponses → même jalon", () => {
    const r = [0, 50, 100].map((pct) => taux([{ module_id: 2, status: "in_progress", progress: 60, score_obtenu: pct, score_max: 100 }]).taux);
    expect(new Set(r).size).toBe(1);
  });
  it("completed reste 100 % quel que soit le score (Thierno 735/847)", () => {
    expect(progressionModule({ module_id: 2, status: "completed", progress: 87, score_obtenu: 735, score_max: 847 } as any)).toBe(100);
    expect(progressionModule({ module_id: 2, status: "completed", progress: 100, score_obtenu: 0, score_max: 847 } as any)).toBe(100);
  });
  it("in_progress : avancement = réponses données / total (les mauvaises comptent)", () => {
    const src = readFileSync("src/components/cours-en-ligne/ModuleDetailView.tsx", "utf8");
    expect(src).toContain("progress: totalQ > 0 ? Math.round((answeredCount / totalQ) * 100) : 0");
    expect(src).not.toMatch(/progress:\s*totalQ > 0 \? Math\.round\(\(correctC/);
  });
  it("activité jamais faite = 0, aucune contribution inventée", () => {
    const l = taux([]).lignes.find((x) => x.moduleId === 5)!;
    expect(l.progression).toBe(0);
    expect(l.contribution).toBe(0);
  });
  it("pondération physique inchangée et somme des poids conservée", () => {
    const res = taux([{ module_id: -2, status: "in_progress", progress: 50 }]);
    expect(res.lignes.find((x) => x.moduleId === -2)!.contribution).toBe(1);
    expect(res.lignes.reduce((s, l) => s + l.poids, 0)).toBe(100);
  });
  it("une vraie attente QRC reste affichée, indépendamment de la réalisation", () => {
    const examen = { matieres: [{ id: "t3p", nom: "A - T3P", questions: [{ id: 1, type: "QRC" }] }] };
    const ligne = { matiereId: "t3p", __core: { attemptId: "x", pending: true, note20: null, qrcRestantes: 1 } };
    expect(isExamAttemptPublicationPending([ligne], examen)).toBe(true);
  });
  it("aucun calcul de jalon ne lit score/note/réussite", () => {
    for (const f of ["jalonsPonderes.ts", "jalonsCalculCore.ts", "progressionModulesEleve.ts"]) {
      const s = readFileSync(`src/lib/${f}`, "utf8");
      expect(s).not.toMatch(/score_obtenu|note_sur_20|reussi|bonnes_reponses/);
    }
  });
});
