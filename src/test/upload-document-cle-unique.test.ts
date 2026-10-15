import { describe, it, expect } from "vitest";
import { cheminDocumentUnique } from "../../supabase/functions/upload-document-inscription/chemin";

// Simulation stockage upsert:false + nettoyage limité à sa propre clé
function stockage() {
  const files = new Map<string, string>();
  return {
    files,
    upload(k: string, v: string) { if (files.has(k)) return { error: "exists" }; files.set(k, v); return { error: null }; },
    remove(k: string) { files.delete(k); },
  };
}
async function envoyer(s: ReturnType<typeof stockage>, contenu: string, now: number, dbEchoue: boolean) {
  const k = cheminDocumentUnique("app1", "photo", "jpg", now);
  const up = s.upload(k, contenu); if (up.error) return { ok: false, k };
  if (dbEchoue) { s.remove(k); return { ok: false, k }; }
  return { ok: true, k };
}
describe("clé de document immuable", () => {
  it("deux envois à la même milliseconde → deux clés distinctes", () => {
    expect(cheminDocumentUnique("a", "t", "pdf", 1)).not.toBe(cheminDocumentUnique("a", "t", "pdf", 1));
  });
  it("concurrence horloge figée : aucun écrasement, échec DB ne supprime que sa propre clé", async () => {
    const s = stockage(); s.files.set("app1/photo-ancien.jpg", "historique");
    const [a, b] = await Promise.all([envoyer(s, "A", 42, false), envoyer(s, "B", 42, true)]);
    expect(a.ok).toBe(true); expect(b.ok).toBe(false);
    expect(s.files.get(a.k)).toBe("A"); expect(s.files.has(b.k)).toBe(false);
    expect(s.files.get("app1/photo-ancien.jpg")).toBe("historique");
  });
  it("collision forcée refusée (upsert:false) sans écraser", () => {
    const s = stockage(); s.files.set("k", "v1"); expect(s.upload("k", "v2").error).toBe("exists"); expect(s.files.get("k")).toBe("v1");
  });
});
