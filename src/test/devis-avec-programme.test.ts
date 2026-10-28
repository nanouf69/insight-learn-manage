import { describe, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: async () => ({ data: [], error: null }) } }));
import jsPDF from "jspdf";
import { devisAvecProgramme } from "@/lib/pdf/devisAvecProgramme";

describe("devis + programme dans un seul PDF", () => {
  it("ajoute les pages du programme après le devis", async () => {
    const devis = new jsPDF(); devis.text("Devis", 10, 10);
    const devisPages = devis.getNumberOfPages();
    const { programmeInclus, pages } = await devisAvecProgramme(devis, { id: "vtc_complet", label: "TAXI", designation: "Formation TAXI", agrement: "x" }, null);
    expect(programmeInclus).toBe(true);
    expect(pages).toBeGreaterThan(devisPages);
  });
});
