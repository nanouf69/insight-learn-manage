import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { BILAN_SR_TRAINING_ACTIF } from "@/lib/bilanSrTraining";
describe("urgence 12/11 : entraînement SR/FG non installé", () => {
  it("reste désactivé tant que les lectures serveur sont absentes", () => expect(BILAN_SR_TRAINING_ACTIF).toBe(false));
  it("chaque branchement 502/505/506 passe par l'interrupteur", () => {
    const m = readFileSync("src/components/cours-en-ligne/ModuleDetailView.tsx", "utf8");
    const f = readFileSync("src/components/cours-en-ligne/BilanFutureExam.tsx", "utf8");
    expect((m.match(/<BilanSrTraining /g) ?? []).length).toBe(2);
    expect((m.match(/BILAN_SR_TRAINING_ACTIF && module\.id === 5/g) ?? []).length).toBe(2);
    expect(f).toContain("BILAN_SR_TRAINING_ACTIF && correction && moduleId === 5 && exoId === 502");
  });
});
