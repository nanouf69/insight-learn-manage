// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { deflateSync } from "node:zlib";
import { createHash } from "node:crypto";
import { preparer, envoyer, soumettre, vuePublique, type Deps, type DocDb, type ApprenantDb, type ResultatEnvoiFournisseur } from "../../supabase/functions/_shared/echecChoixPratiqueCore";
import { validerSignaturePng } from "../../supabase/functions/_shared/signaturePng";
import { filiereDepuisDossier, eligibiliteServeur, MODELE_VERSION } from "@/lib/modeles/entrainementPratiqueVtc";

// ---------- PNG fictifs ----------
const crc = (b: Buffer) => { let c = ~0; for (const x of b) { c ^= x; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return ~c >>> 0; };
const chunk = (t: string, d: Buffer) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
function png(w: number, h: number, encre: boolean) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  if (encre) for (let y = 10; y < 20; y++) for (let x = 10; x < 60; x++) { const o = y * (w * 4 + 1) + 1 + x * 4; raw[o + 3] = 255; }
  const b = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
  return "data:image/png;base64," + b.toString("base64");
}
const SIG = png(300, 120, true);

// ---------- Fausse base atomique ----------
function fake(apprenants: ApprenantDb[], envoi: () => Promise<ResultatEnvoiFournisseur>, opts: { failFinal?: boolean } = {}) {
  const docs: DocDb[] = [];
  let n = 0;
  const sent = vi.fn(envoi);
  const deps: Deps = {
    now: () => new Date("2026-10-16T08:00:00Z"),
    sha256: async (t) => createHash("sha256").update(t).digest("hex"),
    nouveauToken: () => `tok${++n}`.padEnd(48, "x"),
    lienPublic: (t) => `https://gestion.ftransport.fr/document-a-signer/${t}`,
    getApprenant: async (id) => structuredClone(apprenants.find((a) => a.id === id) ?? null),
    findDoc: async (aid, cle) => structuredClone(docs.find((d) => d.apprenant_id === aid && d.cle_envoi === cle && d.modele_version === MODELE_VERSION) ?? null),
    getDocById: async (id) => structuredClone(docs.find((d) => d.id === id) ?? null),
    getDocByToken: async (t) => structuredClone(docs.find((d) => d.token === t) ?? null),
    insertDoc: async (row: any) => {
      await Promise.resolve();
      if (docs.some((d) => d.apprenant_id === row.apprenant_id && d.cle_envoi === row.cle_envoi && d.modele_version === row.modele_version)) return null;
      const d = { id: `d${docs.length + 1}`, envoye_le: null, envoi_tente_le: null, envoi_erreur: null, choix: null, signe_le_paris: null, signed_at: null, reponses: null, ...row } as DocDb;
      docs.push(d); return structuredClone(d);
    },
    updateIf: async (id, patch: any, cond) => {
      const d = docs.find((x) => x.id === id)!;
      if (cond.envoi_etat && d.envoi_etat !== cond.envoi_etat) return { rows: [] };
      if (cond.statutNot && d.statut === cond.statutNot) return { rows: [] };
      if (d.statut === "signe") return { rows: [], error: { code: "42501", message: "Preuve signée immuable" } };
      if (opts.failFinal && patch.envoi_etat === "envoye") return { rows: [], error: { message: "db down" } };
      Object.assign(d, patch); return { rows: [structuredClone(d)] };
    },
    envoyerMail: sent,
    log: () => {},
  };
  return { deps, docs, sent };
}
const base = (o: Partial<ApprenantDb> = {}): ApprenantDb => ({ id: "a1", nom: "TEST", prenom: "Fictif", email: "fictif@example.test", type_apprenant: "vtc", resultat_examen: "non", date_examen_theorique: "2026-10-01", ...o });
const ok = async (): Promise<ResultatEnvoiFournisseur> => ({ issue: "accepte" });

describe("Éligibilité revalidée en base", () => {
  it("réussite, formation continue/PA/RP, sans date d'examen = bloqué avec raison", () => {
    expect(eligibiliteServeur(base({ resultat_examen: "oui" })).ok).toBe(false);
    for (const t of ["continue-taxi", "pa-taxi", "pa vtc", "rp-vtc", "va", "taxi + vtc", ""]) expect(filiereDepuisDossier(t)).toBeNull();
    expect(eligibiliteServeur(base({ date_examen_theorique: null })).ok).toBe(false);
    expect(filiereDepuisDossier("taxi")).toBe("taxi"); expect(filiereDepuisDossier("ta")).toBe("ta"); expect(filiereDepuisDossier("vtc-e")).toBe("vtc");
  });
  it("le serveur ignore les props client : fiche en réussite → aucune préparation", async () => {
    const { deps, docs } = fake([base({ resultat_examen: "oui" })], ok);
    const r = await preparer(deps, "a1", null);
    expect(r.etat).toBe("bloque"); expect(docs).toHaveLength(0);
  });
});

describe("Préparation : instantané figé, idempotent par élève + examen + version", () => {
  it("TAXI : objet/texte/formulaire TAXI, aucune mention VTC", async () => {
    const { deps } = fake([base({ type_apprenant: "taxi" })], ok);
    const r: any = await preparer(deps, "a1", null);
    expect(r.doc.mail_objet_fige).toContain("examen théorique TAXI");
    expect(r.doc.mail_html_fige).not.toMatch(/VTC/);
    expect(r.doc.texte_fige).not.toMatch(/VTC/);
    expect(r.doc.mail_html_fige).toContain(r.doc.token);
  });
  it("2 onglets simultanés → un seul document", async () => {
    const { deps, docs } = fake([base()], ok);
    const [x, y]: any = await Promise.all([preparer(deps, "a1", null), preparer(deps, "a1", null)]);
    expect(docs).toHaveLength(1); expect(x.doc.id).toBe(y.doc.id);
  });
  it("un autre examen autorise un nouveau document", async () => {
    const a = [base()];
    const { deps, docs } = fake(a, ok);
    await preparer(deps, "a1", null);
    a[0].date_examen_theorique = "2026-12-01";
    await preparer(deps, "a1", null);
    expect(docs).toHaveLength(2);
  });
});

describe("Envoi orchestré serveur", () => {
  it("double clic / 2 onglets : un seul appel au circuit mail, date serveur", async () => {
    const { deps, docs, sent } = fake([base()], ok);
    const p: any = await preparer(deps, "a1", null);
    const r = await Promise.all([envoyer(deps, p.doc.id), envoyer(deps, p.doc.id)]);
    expect(sent).toHaveBeenCalledTimes(1);
    expect(r.map((x) => x.etat).sort()).toEqual(["envoye", "non_disponible"]);
    expect(docs[0].envoye_le).toBe("2026-10-16T08:00:00.000Z");
    expect((sent.mock.calls as any)[0][0].html).toBe(p.doc.mail_html_fige);
  });
  it("mail accepté mais base en échec → indéterminé, jamais réexpédié", async () => {
    const { deps, docs, sent } = fake([base()], ok, { failFinal: true });
    const p: any = await preparer(deps, "a1", null);
    expect((await envoyer(deps, p.doc.id)).etat).toBe("indetermine");
    expect(docs[0].envoye_le).toBeNull();
    expect((await envoyer(deps, p.doc.id)).etat).toBe("non_disponible");
    expect(sent).toHaveBeenCalledTimes(1);
    // le lien reste exploitable car le mail a pu partir
    expect((await soumettre(deps, docs[0].token, "plus_tard", SIG, "ua")).status).toBe(200);
  });
  it("timeout → indéterminé ; refus explicite → retour à prêt", async () => {
    const t = fake([base()], async () => { throw new Error("timeout"); });
    const p: any = await preparer(t.deps, "a1", null);
    expect((await envoyer(t.deps, p.doc.id)).etat).toBe("indetermine");
    const f = fake([base()], async () => ({ issue: "refuse", erreur: "refusé" }));
    const q: any = await preparer(f.deps, "a1", null);
    expect((await envoyer(f.deps, q.doc.id)).etat).toBe("refuse");
    expect(f.docs[0].envoi_etat).toBe("prepare");
  });
  it("adresse modifiée depuis la préparation → bloqué", async () => {
    const a = [base()];
    const { deps, sent } = fake(a, ok);
    const p: any = await preparer(deps, "a1", null);
    a[0].email = "autre@example.test";
    expect((await envoyer(deps, p.doc.id)).etat).toBe("bloque");
    expect(sent).not.toHaveBeenCalled();
  });
});

describe("Signature et preuve figée", () => {
  const pret = async () => { const a = [base()]; const f = fake(a, ok); const p: any = await preparer(f.deps, "a1", null); await envoyer(f.deps, p.doc.id); return { ...f, a, tok: f.docs[0].token }; };
  it("lien préparé non envoyé = introuvable", async () => {
    const { deps, docs } = fake([base()], ok);
    await preparer(deps, "a1", null);
    expect((await soumettre(deps, docs[0].token, "plus_tard", SIG, "")).status).toBe(404);
  });
  it("sans choix, choix inconnu, signature vide ou falsifiée → refus", async () => {
    const { deps, tok } = await pret();
    expect((await soumettre(deps, tok, null, SIG, "")).status).toBe(400);
    expect((await soumettre(deps, tok, "autre", SIG, "")).status).toBe(400);
    expect((await soumettre(deps, tok, "renonce", png(300, 120, false), "")).status).toBe(400);
    expect((await soumettre(deps, tok, "renonce", "data:image/png;base64,AAAA", "")).status).toBe(400);
    expect((await soumettre(deps, tok, "renonce", "data:image/jpeg;base64," + SIG.split(",")[1], "")).status).toBe(400);
  });
  it("2 soumissions concurrentes : une preuve, la 2e = déjà signé, choix inchangé", async () => {
    const { deps, docs, tok } = await pret();
    const [r1, r2] = await Promise.all([soumettre(deps, tok, "maintenant", SIG, ""), soumettre(deps, tok, "renonce", SIG, "")]);
    expect([r1.body, r2.body].filter((b: any) => b.deja_signe)).toHaveLength(1);
    const gagnant = (r1.body as any).deja_signe ? "renonce" : "maintenant";
    expect(docs[0].choix).toBe(gagnant);
    // 3e appel après coup : rien n'est réécrit
    await soumettre(deps, tok, gagnant === "renonce" ? "maintenant" : "renonce", SIG, "");
    expect(docs[0].choix).toBe(gagnant);
  });
  it("identité figée : la fiche modifiée ne change ni la page ni la preuve", async () => {
    const { deps, a, tok } = await pret();
    a[0].nom = "CHANGE"; a[0].prenom = "Autre";
    await soumettre(deps, tok, "plus_tard", SIG, "");
    const d = (await deps.getDocByToken(tok))!;
    expect(vuePublique(d).nom_eleve).toBe("TEST");
    expect(d.reponses.nom).toBe("TEST"); expect(d.reponses.email).toBe("fictif@example.test");
  });
  it("erreur base sans signature réelle → pas de faux « déjà signé »", async () => {
    const { deps, tok } = await pret();
    deps.updateIf = async () => ({ rows: [], error: { code: "42501", message: "x" } });
    expect((await soumettre(deps, tok, "plus_tard", SIG, "")).status).toBe(500);
  });
});

describe("Validation PNG serveur", () => {
  it("accepte un tracé, refuse vide/dimensions absurdes", async () => {
    expect((await validerSignaturePng(SIG)).ok).toBe(true);
    expect((await validerSignaturePng(png(300, 120, false))).ok).toBe(false);
    expect((await validerSignaturePng(png(10, 10, true))).ok).toBe(false);
  });
});
