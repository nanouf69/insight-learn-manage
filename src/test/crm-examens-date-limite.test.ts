// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { ALL_DATES_EXAMEN_REUSSITE, ALL_DATES_EXAMEN_THEORIQUE, trouverExamenTheorique } from "@/lib/examDatesConfig";
import { limiteCourte } from "@/lib/examDateLimiteAffichage";

describe("CRM Examens / Réussite — date limite", () => {
  it("2026 avec limite", () => {
    expect(trouverExamenTheorique("29 septembre 2026")?.dateLimiteLibelle).toBe("11 septembre 2026");
    expect(limiteCourte("29 septembre 2026")).toBe("limite 11 septembre");
  });
  it("2026 sans limite → non renseignée, rien d'inventé", () => {
    expect(trouverExamenTheorique("27 janvier 2026")?.dateLimite).toBeNull();
    expect(limiteCourte("27 janvier 2026")).toBeNull();
    expect(limiteCourte("31 mars 2026")).toBeNull();
  });
  it("les 6 sessions 2027 présentes dans le sélecteur avec leur limite", () => {
    const r = ALL_DATES_EXAMEN_REUSSITE.filter((e) => e.date.endsWith("2027"));
    expect(r.map((e) => [e.date, limiteCourte(e.date)])).toEqual([
      ["26 janvier 2027", "limite 8 janvier 2027"], ["30 mars 2027", "limite 12 mars 2027"],
      ["25 mai 2027", "limite 7 mai 2027"], ["20 juillet 2027", "limite 2 juillet 2027"],
      ["28 septembre 2027", "limite 10 septembre 2027"], ["7 décembre 2027", "limite 19 novembre 2027"],
    ].map(([d, l]) => [d, l.replace(" 2027", "")]));
  });
  it("2026 conservées dans le sélecteur", () => {
    expect(ALL_DATES_EXAMEN_REUSSITE.slice(0, 3).map((e) => [e.date, e.pratiqueIndex])).toEqual([["21 juillet 2026", 0], ["29 septembre 2026", 1], ["17 novembre 2026", 2]]);
  });
  it("même donnée que le dossier apprenant (source commune)", () => {
    for (const e of ALL_DATES_EXAMEN_REUSSITE) {
      const src = ALL_DATES_EXAMEN_THEORIQUE.find((x) => x.date === e.date)!;
      expect(e.dateLimiteLibelle).toBe(src.dateLimiteLibelle);
      expect(trouverExamenTheorique(e.date)).toBe(src);
    }
  });
  it("affichage rouge et gras, sans liste de dates dans la page", () => {
    const page = readFileSync("src/components/examens/ExamenReussitePage.tsx", "utf8");
    expect(page).toMatch(/text-destructive font-bold[^"]*" : "text-muted-foreground/);
    expect(page).toContain("Date limite d'inscription : non renseignée");
    expect(page).not.toMatch(/"\d{1,2} (janvier|mars|mai|juillet|septembre|novembre|décembre) 2027"/);
    expect(readFileSync("src/components/cours-en-ligne/MonDossierFormation.tsx", "utf8")).toContain("trouverExamenTheorique");
  });
});
