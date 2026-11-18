// @vitest-environment node
import { describe, expect, it } from "vitest";
import { courseDisplaySupport } from "@/lib/courseDisplaySupport";
import v5 from "@/assets/cours-vtc/Reglementation_VTC_1SUR1_v5_1.pptx.asset.json";
import v6 from "@/assets/cours-vtc/Reglementation_VTC_1SUR1_v6.pptx.asset.json";
import v8 from "@/assets/cours-vtc/Reglementation_VTC_1SUR1_v8.pptx.asset.json";
import { VTC_COURS_DATA } from "@/components/cours-en-ligne/vtc-cours-data";

describe("Remplacement du PowerPoint de réglementation VTC", () => {
  it("affiche le fichier fourni à partir des deux anciennes versions enregistrées", () => {
    for (const asset of [v5, v6, v8]) {
      expect(courseDisplaySupport(`${asset.url}?v=ancienne`)).toEqual({ url: v8.url });
    }
  });
  it("utilise la version 8 pour le cours 6003", () => {
    const cours = VTC_COURS_DATA.cours.find(c => c.id === 6003);
    expect(cours?.fichiers?.find(f => f.nom === "PowerPoint Réglementation VTC")?.url).toBe(v8.url);
  });
  it("conserve les PDF, autres matières et fichiers personnalisés", () => {
    for (const url of ["/cours/vtc/F_Reglementation_Specifique_1.pdf?v=20260819-1732", "/custom/Reglementation_VTC_1SUR1_v6.pptx", "/cours/vtc/D_Francais_VTC.pptx"]) {
      expect(courseDisplaySupport(url)).toEqual({ url });
    }
  });
});