import { describe, it, expect, vi } from "vitest";
const signer = vi.fn(async () => ({ data: { signedUrl: "https://x.test/storage/v1/object/sign/cours-fichiers/vtc/a.pptx?token=t&download=A.pptx" }, error: null }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { storage: { from: () => ({ createSignedUrl: signer }) } } }));
import { telechargerFichierCours } from "@/components/cours-en-ligne/FilePreviewDialog";

describe("Téléchargement admin d'un support (bucket privé)", () => {
  it("demande un lien signé avec le nom d'origine et le clique", async () => {
    const clic = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    await telechargerFichierCours("https://p.supabase.co/storage/v1/object/public/cours-fichiers/vtc/a.pptx", "A.pptx");
    expect(signer).toHaveBeenCalledWith("vtc/a.pptx", 120, { download: "A.pptx" });
    expect(clic).toHaveBeenCalledTimes(1);
  });
  it("lien signé refusé : erreur remontée, aucun clic", async () => {
    signer.mockResolvedValueOnce({ data: null, error: { message: "refus" } } as any);
    const clic = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    clic.mockClear();
    await expect(telechargerFichierCours("vtc/a.pptx", "A.pptx")).rejects.toThrow();
    expect(clic).not.toHaveBeenCalled();
  });
});
