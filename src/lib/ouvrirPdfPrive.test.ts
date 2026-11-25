import { describe, expect, it, vi } from "vitest";
import { pdfBase64VersBlob, pdfPriveDepuisUrlSignee } from "./ouvrirPdfPrive";

describe("lecture PDF privée sans URL de stockage", () => {
  it("reconstitue exactement le PDF transmis en base64", async () => {
    const source = new TextEncoder().encode("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF");
    let binaire = "";
    for (const octet of source) binaire += String.fromCharCode(octet);
    const blob = pdfBase64VersBlob(btoa(binaire));
    expect(blob.type).toBe("application/pdf");
    const octets = await new Promise<ArrayBuffer>((resolve, reject) => {
      const lecteur = new FileReader();
      lecteur.onload = () => resolve(lecteur.result as ArrayBuffer);
      lecteur.onerror = () => reject(lecteur.error);
      lecteur.readAsArrayBuffer(blob);
    });
    expect(Array.from(new Uint8Array(octets))).toEqual(Array.from(source));
  });

  it("appelle le relais et jamais l’URL de stockage signée", async () => {
    const base64 = btoa("%PDF-test");
    const appel = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ pdf_base64: base64 }),
    } as Response);
    const urlSignee = "https://stockage.prive/storage/v1/object/sign/documents/contrat.pdf?token=fictif";
    const blob = await pdfPriveDepuisUrlSignee(urlSignee);
    expect(blob.type).toBe("application/pdf");
    expect(appel).toHaveBeenCalledTimes(1);
    expect(appel.mock.calls[0][0]).toContain("/functions/v1/pdf-prive");
    expect(String(appel.mock.calls[0][0])).not.toContain(urlSignee);
    expect(JSON.parse(String(appel.mock.calls[0][1]?.body))).toEqual({ signed_url: urlSignee });
    appel.mockRestore();
  });
});
