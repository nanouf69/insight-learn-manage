// @vitest-environment node
import { describe, expect, it } from "vitest";
import { courseDisplaySupport } from "@/lib/courseDisplaySupport";
import { T3P_PARTIE1_PDF_URL, T3P_PARTIE1_PPTX_URL } from "@/lib/t3pPartie1Support";
import { VTC_COURS_DATA } from "@/components/cours-en-ligne/vtc-cours-data";
import { TAXI_COURS_DATA } from "@/components/cours-en-ligne/taxi-cours-data";

describe("Support T3P partie 1 VTC et TAXI", () => {
  it("remplace les anciens PowerPoint par le fichier reçu et son aperçu", () => {
    for (const url of ["/cours/vtc/A_T3P_partie_1.pptx?v=old", "/__l5e/assets-v1/9a31a638-dcf4-4ec7-abef-1dd8407fe6bf/T3P_1SUR2_v9.pptx?v=20261106"]) {
      expect(courseDisplaySupport(url)).toEqual({ url: T3P_PARTIE1_PPTX_URL, pdfUrl: T3P_PARTIE1_PDF_URL });
    }
  });
  it("relie les deux cours sans changer leurs identités", () => {
    for (const [module, id] of [[VTC_COURS_DATA, 1001], [TAXI_COURS_DATA, 10001]] as const) {
      expect(module.cours.find(c => c.id === id)?.fichiers).toEqual([
        { nom: "PDF HD Partie 1", url: T3P_PARTIE1_PDF_URL },
        { nom: "PowerPoint Partie 1", url: T3P_PARTIE1_PPTX_URL },
      ]);
    }
  });
  it("remplace aussi le PDF enregistré sans toucher aux autres supports", () => {
    expect(courseDisplaySupport("/__l5e/assets-v1/7bc48b7b-b396-4f70-adf5-6e5926f9e8f9/T3P_1SUR2_v9.pdf?v=20261106")).toEqual({ url: T3P_PARTIE1_PDF_URL });
    for (const url of ["/custom/T3P_1SUR2_v9.pptx", "/cours/vtc/A_T3P_2.pdf?custom=1", "/cours/vtc/D_Francais_VTC.pptx"]) {
      if (url.includes("A_T3P_2")) continue;
      expect(courseDisplaySupport(url)).toEqual({ url });
    }
  });
});