import { describe, expect, it, vi } from "vitest";
import { construireConvocationHtml } from "@/lib/convocationFormation";

describe("préparation des convocations sans effet sur les données ou transport", () => {
  it.each(["TAXI", "VTC", "TA", "VA", "VTC soir", "FC VTC", "FC TAXI"])("%s : génération seule sans envoi ni mutation", (formation) => {
    const fetcher = vi.fn(() => { throw new Error("Envoi interdit pendant la génération"); });
    vi.stubGlobal("fetch", fetcher);
    const acces = Object.freeze({ statut: "pendant" as const, debut: new Date("2026-11-23T09:00:00Z"), fin: new Date("2026-12-04T16:00:00Z"), autorise: true });
    const historique = Object.freeze({ html: "Convocation historique", sent_at: "2026-10-01" });
    const params = Object.freeze({ intituleFormation: formation, presentiel: true, formationContinue: formation.startsWith("FC"), acces, corpsModele: "<p>Consigne originale</p>", dateEmission: new Date("2026-11-20T09:52:00Z") });
    const avant = JSON.stringify({ params, historique });
    try {
      construireConvocationHtml(params);
      expect(fetcher).not.toHaveBeenCalled();
      expect(JSON.stringify({ params, historique })).toBe(avant);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});