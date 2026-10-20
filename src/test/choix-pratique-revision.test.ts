// @vitest-environment node
import { describe, it, expect } from "vitest";
import { reviser, soumettre } from "../../supabase/functions/_shared/echecChoixPratiqueCore";
import { texteFige, modificationOuverte } from "../../supabase/functions/_shared/modeleEchecChoixPratique";
import { etatChoixPratique } from "../lib/choixPratiqueEtat";

const PNG = "data:image/png;base64," + Buffer.from(new Uint8Array([137,80,78,71,13,10,26,10,...new Array(400).fill(1)])).toString("base64");
const signe = "2026-10-20T10:00:00Z";
async function deps(statut: string, now: string, texte = JSON.stringify(texteFige("vtc"))) {
  const { sha256 } = await import("../../supabase/functions/_shared/echecChoixPratiqueDeps").catch(() => ({ sha256: null as any }));
  const revs: any[] = []; const updates: any[] = [];
  const doc: any = { id: "d1", token: "tok", statut, apprenant_id: "a1", modele_code: "echec_theorie_choix_pratique", texte_fige: texte,
    texte_empreinte: null, identite_figee: { nom: "N", prenom: "P", email: "e@x.fr" }, envoye_le: "2026-10-19T00:00:00Z", signed_at: statut === "signe" ? signe : null, choix: statut === "signe" ? "plus_tard" : null };
  const h = async (t: string) => "h:" + t.length;
  doc.texte_empreinte = await h(texte);
  return { revs, updates, doc, d: { now: () => new Date(now), sha256: h, getDocByToken: async () => doc, log: () => {},
    updateIf: async (_id: string, p: any) => { updates.push(p); return { rows: [{ ...doc, ...p }] }; },
    insertRevision: async (r: any) => { revs.push(r); return { ok: true }; } } as any, sha256 };
}

describe("Choix pratique modifiable 4 jours, réinscription", () => {
  it("délai : J+3 ouvert, J+5 fermé", () => {
    expect(modificationOuverte(signe, new Date("2026-10-23T10:00:00Z"))).toBe(true);
    expect(modificationOuverte(signe, new Date("2026-10-25T10:00:00Z"))).toBe(false);
  });
  it("J+5 : modification refusée par le serveur", async () => {
    const x = await deps("signe", "2026-10-25T10:00:00Z");
    const r = await reviser(x.d, "tok", "maintenant", PNG, "ua", "oui");
    expect(r.status).toBe(409); expect(x.revs).toHaveLength(0);
  });
  it("v4 : réponse réinscription obligatoire à la signature", async () => {
    const x = await deps("envoye", "2026-10-20T10:00:00Z");
    const r = await soumettre(x.d, "tok", "maintenant", PNG, "ua", undefined);
    expect(r.status).toBe(400); expect(x.updates).toHaveLength(0);
  });
  it("ancien document sans question : pas exigée", async () => {
    const t = texteFige("vtc"); delete (t as any).reinscription;
    const x = await deps("envoye", "2026-10-20T10:00:00Z", JSON.stringify(t));
    const r = await soumettre(x.d, "tok", "maintenant", "pas-une-signature", "ua", undefined);
    expect(r.body.error).toMatch(/signer/);
  });
  it("affichage = dernière révision, origine conservée", () => {
    const doc: any = { id: "d1", statut: "signe", choix: "plus_tard", reinscription_examen: "non", texte_fige: JSON.stringify(texteFige("vtc")), signed_at: signe, signe_le_paris: "orig", token: "t", envoye_le: null };
    const e: any = etatChoixPratique(doc, [{ document_id: "d1", choix: "maintenant", reinscription_examen: "oui", signe_le: "2026-10-21T00:00:00Z", signe_le_paris: "rev" }], new Date("2026-10-21T01:00:00Z"));
    expect(e.choix).toBe("maintenant"); expect(e.reinscription).toBe("oui");
    expect(e.origine.choix).toBe("plus_tard"); expect(e.origine.reinscription).toBe("non");
  });
});
