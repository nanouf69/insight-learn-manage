import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8");
const src = read("src/components/sessions/GrilleNotationConduite.tsx");

describe("Grille pratique — brouillon enregistré puis repris", () => {
  it("Enregistrer = brouillon, Valider et envoyer = validée", () => {
    expect(src).toContain('await saveGrille("brouillon")');
    expect(src).toContain('await saveGrille("validee")');
  });
  it("le brouillon est repris pour le même élève, le même type et la même session", () => {
    expect(src).toMatch(/\.eq\("apprenant_id", apprenantId\)\s*\.eq\("type_formation", formation\)\s*\.eq\("statut", "brouillon"\)/);
    expect(src).toContain('sessionId ? dq.eq("session_id", sessionId) : dq.is("session_id", null)');
  });
  it("succès seulement après relecture serveur ; saisie conservée en cas d'échec", () => {
    expect(src).toContain("relecture serveur différente de la saisie");
    expect(src).toContain("if (!readOnly && nonSauvegarde) return;");
  });
  it("l'élève ne voit jamais un brouillon", () => {
    expect(read("src/components/cours-en-ligne/GrillesPratiqueApprenant.tsx")).toContain('.eq("statut", "validee")');
  });
});
