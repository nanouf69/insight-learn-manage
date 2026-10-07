// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import { imageToPdf, isImage, toPdf } from "../lib/agrementPdf";

describe("Formats des documents d’agrément", () => {
  it("ne restreint ni les sélecteurs ni les ajouts par extension", () => {
    const source = readFileSync("src/components/renouvellements/DossiersAgrement.tsx", "utf8");
    const inputs = source.match(/<input[^>]*type="file"[^>]*>/g) ?? [];
    expect(inputs).toHaveLength(2);
    inputs.forEach((input) => expect(input).not.toContain("accept="));
    expect(source).not.toContain("test(file.name)");
  });

  it("reconnaît les extensions JPEG, y compris JFIF", () => {
    ["jpg", "jpeg", "JFIF", "jfi", "jif", "jff", "png"].forEach((ext) => expect(isImage(`carte.${ext}`)).toBe(true));
  });

  it("convertit une image JFIF en PDF sans modifier l’original", async () => {
    const bytes = Buffer.from("/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAABAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAB//2Q==", "base64");
    const original = new Blob([bytes], { type: "image/jpeg" });
    const pdf = await imageToPdf(original, "carte.jfif");
    expect((await PDFDocument.load(await pdf.arrayBuffer())).getPageCount()).toBe(1);
    expect(Buffer.from(await original.arrayBuffer())).toEqual(bytes);
  });

  it("ne force pas de conversion pour les autres fichiers", async () => {
    expect(await toPdf(new Blob(["original"]), "document.xlsx")).toBeNull();
  });
});