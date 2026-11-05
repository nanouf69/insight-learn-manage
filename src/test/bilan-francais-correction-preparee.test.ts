import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { EXAMENS_BLANCS_TAXI } from "@/components/cours-en-ligne/examens-blancs-data";

const dir = "docs/bilan-francais-correction-2026-11-05";
const load = (f: string) => JSON.parse(readFileSync(`${dir}/${f}`, "utf8"));
const cas = [
  ["avant_module5_ex503.json", "apres_prepare_module5_ex503.json"],
  ["avant_module11_ex603.json", "apres_prepare_module11_ex603.json"],
] as const;
const norm = (t: string) => {
  const s = t.replace(/’/g, "'");
  return s[0].toUpperCase() + s.slice(1);
};
// Sources examens blancs : sujet français EB2 (q8) et EB3 (q9)
const SOURCES: Record<number, [number, number]> = { 5: [1, 8], 85: [2, 9] };

describe("Bilan Français — correction préparée (non appliquée)", () => {
  for (const [avantF, apresF] of cas) {
    const avant = load(avantF);
    const apres = load(apresF);

    it(`${apresF} : 97 questions, 95 strictement identiques`, () => {
      expect(apres).toHaveLength(97);
      const diff = avant.filter((q: any, i: number) => JSON.stringify(q) !== JSON.stringify(apres[i]));
      expect(diff.map((q: any) => q.id)).toEqual([5, 85]);
    });

    it(`${apresF} : identifiants, uid, type et énoncé conservés`, () => {
      avant.forEach((q: any, i: number) => {
        expect(apres[i].id).toBe(q.id);
        expect(apres[i].uid).toBe(q.uid);
        expect(apres[i].type).toBe("QCM");
        expect(apres[i].enonce).toBe(q.enonce);
      });
    });

    it(`${apresF} : Q5 et Q85 = propositions exactes de l'examen blanc`, () => {
      for (const [id, [s, qid]] of Object.entries(SOURCES)) {
        const src = (EXAMENS_BLANCS_TAXI[s].matieres[3].questions as any[]).find((q) => q.id === qid);
        const q = apres.find((x: any) => x.id === Number(id));
        expect(q.choix.map((c: any) => c.texte)).toEqual(src.choix.map((c: any) => norm(c.texte)));
        expect(q.choix.map((c: any) => !!c.correct)).toEqual(src.choix.map((c: any) => !!c.correct));
        expect(q.choix.map((c: any) => c.lettre)).toEqual(["A", "B", "C"]);
      }
    });
  }
});
