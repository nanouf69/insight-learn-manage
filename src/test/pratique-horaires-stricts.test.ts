import { describe, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("jspdf", () => ({ default: class {} }));
vi.mock("jspdf-autotable", () => ({ default: () => {} }));
import { creneauHoraire, creneauHorairePratique, PRATIQUE_HORAIRES } from "@/lib/agendaSlots";
import { pratiqueCreneauLabel } from "@/lib/pdf/emargement-pratique";
import { buildEmargementHTML } from "@/components/cours-en-ligne/EmargementsSignesViewer";

describe("Pratique VTC/TAXI : horaires stricts 9h-12h / 13h-16h", () => {
  it("libellés pratiques sans 17h", () => {
    expect(PRATIQUE_HORAIRES.apres_midi).toBe("13h00 — 16h00");
    expect(creneauHorairePratique("matin")).toBe("09h00 — 12h00");
    expect(creneauHorairePratique("apres_midi")).not.toMatch(/17/);
  });
  it("horaires de théorie inchangés", () => {
    expect(creneauHoraire("apres_midi")).toBe("13h00 — 17h00");
    expect(creneauHoraire("soir_1")).toBe("17h00 — 18h30");
  });
  it("PDF pratique : 13h00 - 16h00 même si le planning contient 13h-17h", () => {
    expect(pratiqueCreneauLabel("apresmidi", "13h-17h")).toBe("13h00 - 16h00");
    expect(pratiqueCreneauLabel("apresmidi", "13h-17h30")).toBe("13h00 - 16h00");
    expect(pratiqueCreneauLabel("matin", "8h-12h")).toBe("09h00 - 12h00");
  });
  it("feuille téléchargée d'un jour pratique (même en formation continue) : 13:00 - 16:00, signature conservée", () => {
    const sig = "data:image/png;base64,FICTIF";
    const html = buildEmargementHTML(
      [["2099-01-05", { matin: { signature_data_url: sig } as any, apresMidi: { signature_data_url: sig } as any }]],
      { nom: "FICTIF", prenom: "Test" } as any,
      { isFormationContinue: true, pratiqueDates: new Set(["2099-01-05"]) },
    );
    expect(html).toContain("13:00 - 16:00");
    expect(html).not.toContain("13:00 - 17:00");
    expect(html.split(sig).length - 1).toBe(2);
  });
});
