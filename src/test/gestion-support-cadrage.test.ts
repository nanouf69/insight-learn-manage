// @vitest-environment node
import { describe, expect, it } from "vitest";
import { courseDisplaySupport } from "@/lib/courseDisplaySupport";
import original from "@/assets/cours-vtc/GESTION_2SUR3_v9-2.pptx.asset.json";
import corrected from "@/assets/cours-vtc/GESTION_2SUR3_cadrage_20261013.pptx.asset.json";
import pdf from "@/assets/cours-vtc/GESTION_2SUR3_cadrage_20261013.pdf.asset.json";
import { T3P_PARTIE2_PPTX_URL, T3P_PARTIE2_PDF_URL } from "@/lib/t3pPartie2Support";

describe("Gestion 38/40 display-only corrected support", () => {
  it("selects the matching corrected PPTX and PDF for the exact current version", () => {
    expect(courseDisplaySupport(`${original.url}?v=20260918-2109`)).toEqual({url: corrected.url, pdfUrl: pdf.url});
    expect(courseDisplaySupport(corrected.url)).toEqual({url: corrected.url, pdfUrl: pdf.url});
  });
  it("retains custom uploads, older Gestion PDFs, other subjects and versions", () => {
    for (const url of ["/cours/vtc/B_Gestion_2.pdf?v=old", "/cours/vtc/B_Gestion_partie_2.pptx", "/custom/GESTION_2SUR3_v9-2.pptx", "https://example.org/GESTION_2SUR3_v9-2.pptx", "/cours/vtc/B_Gestion_1.pdf"]) {
      expect(courseDisplaySupport(url)).toEqual({url});
    }
  });
  it("preserves the existing corrected T3P selection", () => {
    expect(courseDisplaySupport("/cours/vtc/A_T3P_partie_2.pptx?v=old")).toEqual({url:T3P_PARTIE2_PPTX_URL,pdfUrl:T3P_PARTIE2_PDF_URL});
  });
});