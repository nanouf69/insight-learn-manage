import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AMORTISSEMENT, BILAN_EXEMPLE, CARTES, JEU_GESTION_ID, afficherJeuGestion, calculCorrect, jeuTermine, lireProgression, placer, progressionVide, scoreClassement, totalBilan } from "@/components/cours-en-ligne/gestion-classement/donnees";
const store = vi.hoisted(() => ({ raw: {} as Record<string, unknown>, payloads: [] as any[], completed: false }));
vi.mock("@/components/cours-en-ligne/jeux-lyon/useSuiviJeu", () => ({ useSuiviJeu: (account: string | null, id: string) => ({ etat: account ? store.completed ? "confirme" : "a_faire" : "inconnu", reponses: store.raw, enregistrer: async (raw: any, completed: boolean) => { store.raw = JSON.parse(JSON.stringify(raw)); store.completed = completed; store.payloads.push({ account, id, raw, completed }); } }) }));
import { PlateauComptable } from "@/components/cours-en-ligne/gestion-classement/JeuClassementComptable";
afterEach(() => { cleanup(); store.raw = {}; store.payloads = []; store.completed = false; });
describe("jeu Gestion isolé", () => {
  it.each(CARTES)("classe $id dans $zone", c => {
    const p = placer(progressionVide(), c.id, c.zone);
    expect(p.placements[c.id]).toBe(c.zone);
    expect(scoreClassement(p)).toBe(1);
  });
  it("les erreurs corrigées ne gagnent pas un point de premier essai", () => {
    const p = placer(placer(progressionVide(), "essence", "passif"), "essence", "charges");
    expect(scoreClassement(p)).toBe(0); expect(p.placements.essence).toBe("charges");
  });
  it("termine seulement avec 19 cartes et calcul exact", () => {
    const p = CARTES.reduce((s, c) => placer(s, c.id, c.zone), progressionVide());
    expect(jeuTermine(p)).toBe(false); expect(jeuTermine({ ...p, calcul: true })).toBe(true);
  });
  it("20 000 / 5, cumul 3 ans, net et valeurs concrètes", () => {
    expect(AMORTISSEMENT.brut / AMORTISSEMENT.duree).toBe(4000);
    expect(AMORTISSEMENT.annuel * AMORTISSEMENT.annees).toBe(12000);
    expect(AMORTISSEMENT.brut - AMORTISSEMENT.cumule).toBe(8000);
    expect(calculCorrect(["4 000", "12 000", "8 000"])).toBe(true);
    expect(calculCorrect(["4000", "12000", "20000"])).toBe(false);
    expect(calculCorrect(["4e3", "12000", "8000"])).toBe(false);
  });
  it("bilan net indépendant équilibré 40 000 avec résultat 20 000", () => {
    expect(totalBilan(BILAN_EXEMPLE.actif)).toBe(40000);
    expect(totalBilan(BILAN_EXEMPLE.passif)).toBe(40000);
    expect(BILAN_EXEMPLE.actif[0].montant).toBe(6000);
    expect(BILAN_EXEMPLE.actif[1].montant).toBe(200);
    expect(BILAN_EXEMPLE.passif[1].montant).toBe(20000);
  });
  it("ne rend jamais ce jeu dans les examens/Bilans/autres matières", () => {
    for (const id of [5, 11, 28, 30, 35, 36, 37, 38, 15, 24, 40, 41]) expect(afficherJeuGestion(id, "Gestion")).toBe(false);
    expect(afficherJeuGestion(14)).toBe(true); expect(afficherJeuGestion(20)).toBe(true);
    expect(afficherJeuGestion(2, "B. Gestion Partie 1")).toBe(true);
    expect(afficherJeuGestion(10, "Sécurité routière")).toBe(false);
  });
  it("refuse un placement incorrect chargé", () => {
    expect(lireProgression({ placements: { essence: "passif", inconnu: "charges" } }).placements).toEqual({});
  });
  it("parcours tactile, sauvegarde, réouverture et rejeu sans écraser l’acquis", async () => {
    const view = render(<PlateauComptable compteId="fixture-only" />);
    for (const c of CARTES) {
      await waitFor(() => expect(screen.getByRole("button", { name: c.titre })).not.toBeDisabled());
      fireEvent.click(screen.getByRole("button", { name: c.titre }));
      fireEvent.click(screen.getByRole("button", { name: `Classer dans ${c.zone === "charges" ? "Charges" : c.zone === "produits" ? "Produits" : c.zone === "actif" ? "Actif" : "Passif"}` }));
    }
    ["4000", "12000", "8000"].forEach((v, i) => fireEvent.change(screen.getAllByRole("textbox")[i], { target: { value: v } }));
    fireEvent.click(screen.getByRole("button", { name: "Vérifier le calcul" }));
    expect(store.completed).toBe(true); expect(store.payloads).toHaveLength(20);
    expect(store.payloads.every(p => p.id === JEU_GESTION_ID && p.account === "fixture-only")).toBe(true);
    const before = JSON.stringify(store.raw); view.unmount();
    render(<PlateauComptable compteId="fixture-only" />);
    await waitFor(() => expect(screen.queryByRole("button", { name: "Essence consommée" })).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "Recommencer" }));
    fireEvent.click(screen.getByRole("button", { name: "Essence consommée" })); fireEvent.click(screen.getByRole("button", { name: "Classer dans Charges" }));
    expect(JSON.stringify(store.raw)).toBe(before); expect(store.payloads).toHaveLength(20);
  }, 20000);
  it("glisser une carte utilise son ID et non un texte arbitraire", () => {
    render(<PlateauComptable />);
    const dataTransfer = { getData: () => "essence", setData: vi.fn() };
    fireEvent.drop(screen.getByRole("region", { name: "Compte de résultat / Charges" }), { dataTransfer });
    expect(screen.queryByRole("button", { name: "Essence consommée" })).toBeNull();
    expect(store.payloads).toHaveLength(0);
  });
});