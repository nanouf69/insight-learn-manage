import { describe, expect, it, vi } from "vitest";
import JSZip from "jszip";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import {
  configOriginalRecu,
  fichiersAvecOriginal,
  REF_ORIGINAL_I22,
  REF_ORIGINAL_I32,
  verifierPdfOriginal,
} from "@/components/qualiopi/originauxRecus";
import { verifierDocx } from "@/components/qualiopi/indicateur6";

describe("Originaux Qualiopi reçus le 25/11/2026", () => {
  it("réserve le DOCX à la procédure I32", () => {
    expect(configOriginalRecu(REF_ORIGINAL_I32)).toMatchObject({ nom: "32.docx", accept: ".docx" });
    expect(configOriginalRecu(REF_ORIGINAL_I32)?.verifier).toBe(verifierDocx);
  });

  it("réserve le PDF au plan I22 de Meryem BAISSA", () => {
    expect(configOriginalRecu(REF_ORIGINAL_I22)).toMatchObject({ nom: "CCF_000546(1).pdf" });
    expect(configOriginalRecu(REF_ORIGINAL_I22)?.verifier).toBe(verifierPdfOriginal);
  });

  it("ajoute un original sans remplacer les fichiers précédents", () => {
    const ancien = { nom: "ancien.pdf", path: "2026/ancien.pdf" };
    const nouveau = { nom: "CCF_000546(1).pdf", path: "2026/nouveau.pdf" };
    const existants = [ancien];
    expect(fichiersAvecOriginal(existants, nouveau)).toEqual([ancien, nouveau]);
    expect(existants).toEqual([ancien]);
  });

  it("n'ouvre le dépôt sur aucune autre preuve", () => {
    expect(configOriginalRecu("i21-declaration-20261124")).toBeNull();
    expect(configOriginalRecu(null)).toBeNull();
  });

  it("refuse un faux PDF", async () => {
    const bytes = new TextEncoder().encode("pas un pdf");
    const file = { name: "CCF_000546(1).pdf", size: bytes.length, arrayBuffer: async () => bytes.buffer } as File;
    await expect(verifierPdfOriginal(file)).rejects.toThrow("PDF valide");
  });

  it("accepte la signature binaire d'un PDF", async () => {
    const bytes = new TextEncoder().encode("%PDF-1.7\n");
    const file = { name: "CCF_000546(1).pdf", size: bytes.length, arrayBuffer: async () => bytes.buffer } as File;
    await expect(verifierPdfOriginal(file)).resolves.toBeUndefined();
  });

  it("continue d'exiger la structure DOCX pour 32.docx", async () => {
    const zip = new JSZip();
    zip.file("word/document.xml", "<document/>");
    zip.file("[Content_Types].xml", "<Types/>");
    const bytes = await zip.generateAsync({ type: "arraybuffer" });
    const file = { name: "32.docx", size: bytes.byteLength, arrayBuffer: async () => bytes } as File;
    await expect(configOriginalRecu(REF_ORIGINAL_I32)?.verifier(file)).resolves.toBeUndefined();
  });
});
