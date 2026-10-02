import { describe, it, expect } from "vitest";
import { trouverCompteParEmail, deciderReutilisation } from "../../supabase/functions/_shared/compte-existant";

// 286 comptes fictifs, l'élève cherché est au-delà des 50 premiers
const comptes = Array.from({ length: 286 }, (_, i) => ({ id: `u${i}`, email: `fictif${i}@exemple.test` }));
comptes[200] = { id: "cible", email: "Eleve.Fictif@Exemple.test" };
const lister = (perPageMax = 1000) => async (page: number, perPage: number) => {
  const n = Math.min(perPage, perPageMax);
  return comptes.slice((page - 1) * n, page * n);
};

describe("envoi auto des accès : compte existant", () => {
  it("nouveau compte (aucun existant) → rien trouvé, bloqué proprement", async () => {
    const c = await trouverCompteParEmail("inconnu@exemple.test", lister());
    expect(c).toBeNull();
  });
  it("compte au-delà des 50 premiers → trouvé (pagination)", async () => {
    const c = await trouverCompteParEmail("eleve.fictif@exemple.test", lister(), 50);
    expect(c?.id).toBe("cible");
  });
  it("e-mail en majuscules → trouvé", async () => {
    const c = await trouverCompteParEmail("  ELEVE.FICTIF@EXEMPLE.TEST ", lister());
    expect(c?.id).toBe("cible");
  });
  it("compte orphelin → réutilisé", () => {
    expect(deciderReutilisation({ id: "cible" }, "dossier-B", [])).toEqual({ action: "reutiliser", authUserId: "cible" });
  });
  it("compte lié à un autre dossier → bloqué, aucun rattachement", () => {
    const d = deciderReutilisation({ id: "cible" }, "dossier-B", [{ id: "dossier-A", created_at: "2026-02-25T09:00:00Z" }]);
    expect(d.action).toBe("bloquer");
    expect((d as any).raison).toContain("Réinscription");
  });
});
