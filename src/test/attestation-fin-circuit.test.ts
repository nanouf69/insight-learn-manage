import { describe, it, expect } from "vitest";
import { deflateSync } from "node:zlib";
import { createHash } from "node:crypto";
import { preparer, envoyer, signerApprenant, vuePubliqueAttestation, type DepsAtt, type DocAtt, type ApprenantAtt, type EtatModuleSrv } from "../../supabase/functions/_shared/attestationFinCore";

// --- PNG réel 40x20 (tracé noir ou vide)
function crc32(buf: Buffer) { let c, crc = 0xffffffff; for (const b of buf) { c = (crc ^ b) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; } return (crc ^ 0xffffffff) >>> 0; }
function chunk(type: string, data: Buffer) { const l = Buffer.alloc(4); l.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td)); return Buffer.concat([l, td, c]); }
function png(trace: boolean) {
  const w = 120, h = 60; const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  if (trace) for (let y = 5; y < 55; y++) for (let x = 5; x < 115; x++) if (Math.abs(y - 30 - Math.round(20 * Math.sin(x / 10))) < 3) { const o = y * (w * 4 + 1) + 1 + x * 4; raw[o + 3] = 255; }
  return "data:image/png;base64," + Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]).toString("base64");
}

const LEA: ApprenantAtt = { id: "lea", nom: "Catania", prenom: "Léa", email: "lea@example.test", type_apprenant: "vtc-e", formation_choisie: "VTC E-Learning", modules_autorises: [26, 2, 3, 4, 35, 5, 8], date_debut_formation: "2026-09-14", heures_totales: 60, emails_bloques: false };
const OK: ApprenantAtt = { ...LEA, id: "ok", nom: "Fictif", prenom: "Alice", modules_autorises: [5, 8] };
const done = (id: number, at = "2026-10-10T10:00:00Z"): EtatModuleSrv => ({ module_id: id, status_effectif: "completed", preuve_complete: true, completed_at: at });

function fake(over: { apprenant?: ApprenantAtt; etats?: EtatModuleSrv[]; cnx?: { id: string; started_at: string }[]; signatureCentre?: boolean; mail?: "accepte" | "refuse" | "inconnue" } = {}) {
  const docs: DocAtt[] = []; const journal: string[] = []; const mails: string[] = [];
  const a = over.apprenant ?? OK;
  const d: DepsAtt = {
    now: () => new Date("2026-11-12T15:00:00Z"),
    sha256: async (t) => createHash("sha256").update(t).digest("hex"),
    nouveauToken: () => "tok-" + (docs.length + 1),
    lienPublic: (t) => `https://x/document-a-signer/${t}`,
    getApprenant: async (id) => (id === a.id ? { ...a } : null),
    etatModules: async () => over.etats ?? [done(5), done(8)],
    connexions: async () => over.cnx ?? [{ id: "c1", started_at: "2026-10-20T08:00:00Z" }],
    signatureCentreDisponible: async () => over.signatureCentre ?? true,
    findDocs: async (id) => docs.filter((x) => x.apprenant_id === id),
    getDocById: async (id) => docs.find((x) => x.id === id) ?? null,
    getDocByToken: async (t) => docs.find((x) => x.token === t) ?? null,
    insertDoc: async (row: any) => { if (docs.some((x) => x.apprenant_id === row.apprenant_id)) return null; const doc = { id: "d" + (docs.length + 1), envoye_le: null, envoi_tente_le: null, envoi_erreur: null, signe_le_paris: null, signed_at: null, reponses: {}, ...row } as DocAtt; docs.push(doc); return doc; },
    updateIf: async (id, patch, cond) => {
      const doc = docs.find((x) => x.id === id); if (!doc) return { rows: [] };
      if (cond.envoi_etat && doc.envoi_etat !== cond.envoi_etat) return { rows: [] };
      if (cond.statutNot && doc.statut === cond.statutNot) return { rows: [] };
      Object.assign(doc, patch); return { rows: [doc] };
    },
    envoyerMail: async (p) => { mails.push(p.to); const m = over.mail ?? "accepte"; return m === "accepte" ? { issue: "accepte" } : { issue: m, erreur: "x" } as any; },
    journal: async (e) => { journal.push(e.operation); return true; },
    log: () => {},
  };
  return { d, docs, journal, mails };
}
const entree = (id = "ok", extra: any = {}) => ({ apprenantId: id, adminId: "admin-1", representant: "Responsable Fictif", autoriseSignatureCentre: true, heures: { faites: 61, minimum: 60 }, signaturesPresentiel: null, ...extra });

describe("Attestation de fin de formation — circuit serveur", () => {
  it("Léa (3/7 modules, 38h11/60h) : refus, aucun document, aucune attestation 7/7", async () => {
    const x = fake({ apprenant: LEA, etats: [done(35), done(5), done(8), { module_id: 2, status_effectif: "in_progress", preuve_complete: false, completed_at: null }] });
    const r: any = await preparer(x.d, entree("lea", { heures: { faites: 38 + 11 / 60, minimum: 60 } }));
    expect(r.etat).toBe("bloque");
    expect(r.raisons.join(" | ")).toContain("Module 2");
    expect(r.raisons.join(" | ")).toContain("38h11 / 60h00");
    expect(x.docs).toHaveLength(0);
    expect(x.journal).toHaveLength(0);
  });

  it("parcours prouvé : enregistrée « prepare », date de fin = dernière connexion, texte figé + empreinte, journal", async () => {
    const x = fake();
    const r: any = await preparer(x.d, entree());
    expect(r.etat).toBe("prepare");
    const f = JSON.parse(r.doc.texte_fige);
    expect(f.lignes[2]).toContain("du 14/09/2026 au 20/10/2026");
    expect(f.lignes[1]).toContain("11770762377");
    expect(f.sources.date_fin.connexion_id).toBe("c1");
    expect(f.signature_centre.autorise_par).toBe("admin-1");
    expect(r.doc.texte_empreinte).toBe(createHash("sha256").update(r.doc.texte_fige).digest("hex"));
    expect(x.journal).toEqual(["attestation_fin_formation.preparee"]);
    expect(x.mails).toHaveLength(0); // jamais d'envoi implicite
  });

  it("deuxième préparation : document existant renvoyé, aucun doublon", async () => {
    const x = fake();
    await preparer(x.d, entree());
    const r: any = await preparer(x.d, entree());
    expect(r.etat).toBe("existant");
    expect(x.docs).toHaveLength(1);
  });

  it("sans autorisation explicite ou sans image du centre : refus", async () => {
    expect(((await preparer(fake().d, entree("ok", { autoriseSignatureCentre: false }))) as any).etat).toBe("bloque");
    expect(((await preparer(fake({ signatureCentre: false }).d, entree())) as any).raisons[0]).toContain("aucune signature n'est fabriquée");
  });

  it("dernière connexion antérieure à la validation finale : contrôle humain", async () => {
    const r: any = await preparer(fake({ cnx: [{ id: "c0", started_at: "2026-10-01T08:00:00Z" }] }).d, entree());
    expect(r.etat).toBe("bloque");
    expect(r.raisons.join()).toContain("antérieure à la validation finale");
  });

  it("envoi : seulement sur action admin, réservation unique ; issue inconnue jamais réexpédiée", async () => {
    const x = fake({ mail: "inconnue" });
    const p: any = await preparer(x.d, entree());
    expect((await envoyer(x.d, p.doc.id, "admin-1")).etat).toBe("indetermine");
    expect((await envoyer(x.d, p.doc.id, "admin-1")).etat).toBe("non_disponible");
    expect(x.mails).toHaveLength(1);
  });

  it("envoi refusé si un module n'est plus validé", async () => {
    const x = fake();
    const p: any = await preparer(x.d, entree());
    (x.d as any).etatModules = async () => [done(5)];
    const r: any = await envoyer(x.d, p.doc.id, "admin-1");
    expect(r.etat).toBe("bloque");
    expect(x.mails).toHaveLength(0);
  });

  it("signature apprenant : refusée avant envoi, si vide, sans consentement ou empreinte différente ; acceptée sinon", async () => {
    const x = fake();
    const p: any = await preparer(x.d, entree());
    const tok = p.doc.token, emp = p.doc.texte_empreinte;
    expect((await signerApprenant(x.d, tok, { signature: png(true), consentement: true, empreinteVue: emp, userAgent: "t" })).status).toBe(404);
    await envoyer(x.d, p.doc.id, "admin-1");
    expect((await signerApprenant(x.d, tok, { signature: png(false), consentement: true, empreinteVue: emp, userAgent: "t" })).status).toBe(400);
    expect((await signerApprenant(x.d, tok, { signature: png(true), consentement: false, empreinteVue: emp, userAgent: "t" })).status).toBe(400);
    expect((await signerApprenant(x.d, tok, { signature: png(true), consentement: true, empreinteVue: "autre", userAgent: "t" })).status).toBe(409);
    const ok = await signerApprenant(x.d, tok, { signature: png(true), consentement: true, empreinteVue: emp, userAgent: "t" });
    expect(ok.status).toBe(200);
    expect(x.docs[0].statut).toBe("signe");
    expect(x.journal).toContain("attestation_fin_formation.signee_apprenant");
    const again: any = await signerApprenant(x.d, tok, { signature: png(true), consentement: true, empreinteVue: emp, userAgent: "t" });
    expect(again.body.deja_signe).toBe(true);
    const vue = vuePubliqueAttestation(x.docs[0], "data:image/png;base64,AAA");
    expect(vue.signature_centre_image).toBe("data:image/png;base64,AAA");
    expect((vue as any).email).toBeUndefined();
  });
});
