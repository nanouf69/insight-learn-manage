import { describe, it, expect } from "vitest";
import { resultatDepuisServeur } from "@/lib/controleQrcServeur";
import { creditsMax, creditsReels, debutMoisSuivant } from "../../supabase/functions/_shared/qrcIaBudget";
import { etatCorrectionQrc, pointsAvecQrc } from "@/lib/qrcCorrectionFinale";

const base = { question_id: "208", est_correct: null, points: null, commentaire: null, motif: null };

describe("Contrôle de connaissances : correction QRC serveur", () => {
  it("QRC juste = 1 point", () => {
    expect(resultatDepuisServeur({ ...base, statut: "corrigee", est_correct: true, points: 1, commentaire: "ok" })).toEqual({ estCorrect: true, pointsObtenus: 1, explication: "ok" });
  });
  it("QRC fausse ou partielle = 0 point au barème juste/faux", () => {
    expect(resultatDepuisServeur({ ...base, statut: "corrigee", est_correct: false, points: 0, commentaire: "partielle" })).toMatchObject({ estCorrect: false, pointsObtenus: 0 });
  });
  it("en attente ou en cours = jamais corrigée", () => {
    expect(resultatDepuisServeur({ ...base, statut: "en_attente" })).toBe("loading");
    expect(resultatDepuisServeur({ ...base, statut: "en_cours" })).toBe("loading");
  });
  it("erreur IA = à vérifier, pas de note", () => {
    const r: any = resultatDepuisServeur({ ...base, statut: "a_verifier", motif: "erreur_ia_500" });
    expect(r.indisponible).toBe(true);
    expect(r.estCorrect).toBeUndefined();
  });
  it("la note n'est pas « corrigée » tant qu'une QRC est en attente", () => {
    const qs = [{ id: 1, type: "qrc", choix: [] }, { id: 2, type: "qrc", choix: [] }];
    const rep = { "13100-1": "a", "13100-2": "b" };
    const res: any = { "13100-1": resultatDepuisServeur({ ...base, statut: "corrigee", est_correct: true, points: 1 }), "13100-2": "loading" };
    expect(etatCorrectionQrc(13100, qs, {}, rep, res)).toBe("en_cours");
    res["13100-2"] = resultatDepuisServeur({ ...base, statut: "corrigee", est_correct: false, points: 0 });
    expect(etatCorrectionQrc(13100, qs, {}, rep, res)).toBe("terminee");
    expect(pointsAvecQrc(13100, qs, res, () => false)).toBe(1);
  });
});

describe("Plafond IA mensuel", () => {
  it("la réservation couvre toujours le coût réel maximal", () => {
    const max = creditsMax("google/gemini-3.8-flash", 2000);
    expect(creditsReels("google/gemini-3.8-flash", { inputTokens: 1000, outputTokens: 4096 })!).toBeLessThanOrEqual(max);
  });
  it("coût réel mesuré : 346 jetons entrée / 1243 sortie = 0,019683 crédit", () => {
    expect(creditsReels("google/gemini-3.8-flash", { inputTokens: 346, outputTokens: 1243 })).toBeCloseTo(0.019683, 6);
  });
  it("usage inconnu = pas de coût réel (la réservation reste comptée)", () => {
    expect(creditsReels("google/gemini-3.8-flash", null)).toBeNull();
  });
  it("reprise au 1er du mois suivant", () => {
    expect(debutMoisSuivant(new Date("2026-10-30T13:00:00Z")).toISOString().slice(0, 10)).toBe("2026-11-01");
  });
});
