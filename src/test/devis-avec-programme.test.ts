import { describe, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: async () => ({ data: [], error: null }) } }));
import jsPDF from "jspdf";
import { PDFDocument } from "pdf-lib";
import { devisAvecProgramme } from "@/lib/pdf/devisAvecProgramme";

describe("devis + programme dans un seul PDF", () => {
  it("ajoute les pages du programme après le devis", async () => {
    const devis = new jsPDF(); devis.text("Devis", 10, 10);
    const { blob, programmeInclus } = await devisAvecProgramme(devis, { id: "taxi", label: "TAXI", designation: "Formation TAXI", agrement: "x" }, null);
    expect(programmeInclus).toBe(true);
    const pdf = await PDFDocument.load(await blob.arrayBuffer());
    expect(pdf.getPageCount()).toBeGreaterThan(1);
  });
});
