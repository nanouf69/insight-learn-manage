import { COMPETENCES_MODELE, COMPETENCES_VERSION } from "../_shared/competencesIntervenant.ts";
import { CONTRAT_MODELE, texteContratFige } from "../_shared/parcoursIntervenant.ts";

let handler: (req: Request) => Promise<Response>;
const originalServe = Deno.serve;
const originalFetch = globalThis.fetch;
Object.defineProperty(Deno, "serve", { value: (callback: typeof handler) => { handler = callback; }, configurable: true });
Deno.env.set("SUPABASE_URL", "https://backend.test");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fictional-service-test");
await import("./index.ts");
Object.defineProperty(Deno, "serve", { value: originalServe, configurable: true });

const token = "a".repeat(64);
const originalId = "11111111-1111-4111-8111-111111111111";
const contratId = "22222222-2222-4222-8222-222222222222";
const operation1 = "33333333-3333-4333-8333-333333333333";
const operation2 = "44444444-4444-4444-8444-444444444444";
const hash = async (value: unknown) => {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : new Uint8Array(value as ArrayBuffer);
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))).map(x => x.toString(16).padStart(2, "0")).join("");
};
function crc32(bytes: Uint8Array) { let crc = 0xffffffff; for (const b of bytes) { crc ^= b; for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1)); } return (crc ^ 0xffffffff) >>> 0; }
function chunk(type: string, data: Uint8Array) { const out = new Uint8Array(data.length + 12); new DataView(out.buffer).setUint32(0, data.length); out.set(new TextEncoder().encode(type), 4); out.set(data, 8); new DataView(out.buffer).setUint32(data.length + 8, crc32(out.slice(4, data.length + 8))); return out; }
async function png() {
  const w = 120, h = 60, ihdr = new Uint8Array(13); new DataView(ihdr.buffer).setUint32(0, w); new DataView(ihdr.buffer).setUint32(4, h); ihdr[8] = 8; ihdr[9] = 6;
  const raw = new Uint8Array((w * 4 + 1) * h);
  for (let y = 5; y < 55; y++) for (let x = 5; x < 115; x++) if (Math.abs(y - 30 - Math.round(20 * Math.sin(x / 10))) < 3) { const o = y * (w * 4 + 1) + 1 + x * 4; raw[o + 3] = 255; }
  const compressed = await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream("deflate"))).arrayBuffer();
  const parts = [new Uint8Array([137,80,78,71,13,10,26,10]), chunk("IHDR", ihdr), chunk("IDAT", new Uint8Array(compressed)), chunk("IEND", new Uint8Array())];
  const all = new Uint8Array(parts.reduce((n, p) => n + p.length, 0)); let at = 0; for (const p of parts) { all.set(p, at); at += p.length; }
  let binary = ""; for (const b of all) binary += String.fromCharCode(b);
  return `data:image/png;base64,${btoa(binary)}`;
}

let original: any, contrat: any, preuves: any[], audits: any[], fichiers: Map<string, Uint8Array>, qualiopi: any[], admin: boolean, calls: string[];
async function reset() {
  const texte = { titre: "Bilan et justification des compétences", version: COMPETENCES_VERSION, expires_at: "2099-01-01T00:00:00Z", declaration: "Déclaration fictive" };
  original = { id: originalId, nom: "Justification des compétences", modele_code: COMPETENCES_MODELE, modele_version: COMPETENCES_VERSION, destinataire_nom: "Albert AKONO", destinataire_email: "fictif@example.invalid", texte_fige: texte, texte_empreinte: await hash(JSON.stringify(texte)), reponses: {}, statut: "brouillon", signed_at: null, identite_figee: { formateur_id: "formateur-fictif" } };
  contrat = null; preuves = []; audits = []; fichiers = new Map(); qualiopi = []; admin = false; calls = [];
}
await reset();
function rows(value: any) { return value ?? null; }
globalThis.fetch = async (input: string | URL | Request, init?: RequestInit) => {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input : input.url);
  if (url.hostname !== "backend.test") throw new Error("Réseau externe interdit");
  const method = init?.method ?? "GET"; calls.push(`${method} ${url.pathname}`);
  if (url.pathname === "/auth/v1/user") return Response.json({ id: originalId, email: "admin@example.invalid" });
  if (url.pathname === "/rest/v1/user_roles") return Response.json(admin ? { role: "admin" } : null);
  if (url.pathname === "/rest/v1/documents_a_signer") {
    if (method === "GET") {
      const colonnesReelles = new Set("id,nom,file_path,champs,destinataire_nom,destinataire_email,token,statut,reponses,sent_at,signed_at,created_by,created_at,updated_at,modele_code,modele_version,texte_fige,texte_empreinte,apprenant_id,choix,signe_le_paris,envoye_le,cle_envoi,identite_figee,mail_objet_fige,mail_html_fige,envoi_etat,envoi_tente_le,envoi_erreur,reinscription_examen".split(","));
      const selection = url.searchParams.get("select")?.split(",") ?? [];
      if (selection.some(c => !colonnesReelles.has(c))) return Response.json({ error: "Colonne inexistante" }, { status: 400 });
      if (url.searchParams.get("modele_code") === `eq.${CONTRAT_MODELE}`) return Response.json(rows(contrat));
      if (url.searchParams.has("token")) return Response.json(url.searchParams.get("token") === `eq.${token}` ? original : null);
      if (url.searchParams.get("id") === `eq.${originalId}`) return Response.json(original);
      return Response.json(null);
    }
    if (method === "POST") {
      const input = JSON.parse(String(init?.body)); contrat = { ...input, id: contratId, created_at: "2026-11-24T18:00:00Z" };
      return Response.json({ id: contrat.id, texte_empreinte: contrat.texte_empreinte });
    }
  }
  if (url.pathname === "/rest/v1/intervenant_signature_preuves") {
    if (method === "GET") {
      const found = preuves.find(p => url.searchParams.has("document_id") ? p.document_id === url.searchParams.get("document_id")?.slice(3) : p.operation_id === url.searchParams.get("operation_id")?.slice(3));
      return Response.json(found ?? null);
    }
    if (method === "POST") { const p = JSON.parse(String(init?.body)); preuves.push(p); return Response.json(p); }
  }
  if (url.pathname === "/rest/v1/audit_journal") {
    if (method === "GET") { const found = audits.find(a => a.operation === url.searchParams.get("operation")?.slice(3) && a.cible_id === url.searchParams.get("cible_id")?.slice(3)); return Response.json(found ? { id: 1 } : null); }
    if (method === "POST") { audits.push(JSON.parse(String(init?.body))); return Response.json({ event_id: audits.length }); }
  }
  if (url.pathname === "/rest/v1/qualiopi_preuves") {
    if (method === "GET") return Response.json(qualiopi.find(q => q.ref_key === url.searchParams.get("ref_key")?.slice(3)) ? { id: "preuve-qualiopi" } : null);
    if (method === "POST") { qualiopi.push(JSON.parse(String(init?.body))); return Response.json({ id: "preuve-qualiopi" }); }
  }
  if (url.pathname === "/rest/v1/qualiopi_preuve_liens") {
    if (method === "GET") return Response.json(null);
    if (method === "POST") return Response.json({ id: "lien-qualiopi" });
  }
  if (url.pathname.startsWith("/storage/v1/object/sign/")) return Response.json({ signedURL: `/storage/v1${url.pathname.slice(18)}?token=fictif` });
  if (url.pathname.startsWith("/storage/v1/object/documents-a-signer/")) {
    const path = decodeURIComponent(url.pathname.split("/documents-a-signer/")[1]);
    if (method === "GET") { const bytes = fichiers.get(path); return bytes ? new Response(bytes.slice().buffer) : Response.json({ error: "absent" }, { status: 404 }); }
    if (method === "POST") { fichiers.set(path, new Uint8Array(await new Response(init?.body).arrayBuffer())); return Response.json({ Key: path }); }
  }
  throw new Error(`Endpoint inattendu ${method} ${url.pathname}`);
};
async function call(body: object, withAuth = false) { return handler(new Request("https://app.test", { method: "POST", headers: { "Content-Type": "application/json", ...(withAuth ? { Authorization: "Bearer fictif" } : {}) }, body: JSON.stringify(body) })); }
function equal(actual: unknown, expected: unknown) { if (actual !== expected) throw new Error(`Attendu ${expected}, reçu ${actual}`); }
async function prepare() { admin = true; return call({ action: "prepare", document_id: originalId, confirmation_contenu: true }, true); }

Deno.test("aperçu sans troisième document inventé ni préparation non admin", async () => {
  await reset(); const vue = await (await call({ action: "get", token })).json();
  equal(vue.documents[1].document_id, null); equal(vue.troisieme_document.statut, "a_identifier"); equal(vue.aucun_envoi, true);
  equal((await call({ action: "prepare", document_id: originalId, confirmation_contenu: true }, true)).status, 403); equal(contrat, null);
});
Deno.test("préparation admin explicite, figée et sans envoi", async () => {
  await reset(); admin = true; equal((await call({ action: "prepare", document_id: originalId, confirmation_contenu: false }, true)).status, 400);
  const response = await prepare(); equal(response.status, 200); equal(contrat.modele_code, CONTRAT_MODELE); equal(contrat.texte_fige.etat, "valide_pour_signature"); equal(contrat.token.length, 48);
  const encore = await prepare(); equal(encore.status, 200); equal((await encore.json()).deja_prepare, true); equal(calls.some(c => c.includes("mail") || c.includes("outlook")), false);
});
Deno.test("déclaration non remise et contenu altéré refusent la signature", async () => {
  await reset(); await prepare(); const signature = await png();
  equal((await call({ action: "sign", token, document_id: originalId, operation_id: operation1, empreinte_vue: original.texte_empreinte, signature, consentement: true })).status, 409);
  original.statut = "signe"; original.signed_at = "2026-11-24T12:00:00Z"; original.reponses = { declaration_acceptee: true };
  equal((await call({ action: "sign", token, document_id: originalId, operation_id: operation1, empreinte_vue: "0".repeat(64), signature, consentement: true })).status, 409);
  original.texte_fige.titre = "Texte altéré";
  equal((await call({ action: "sign", token, document_id: originalId, operation_id: operation1, empreinte_vue: original.texte_empreinte, signature, consentement: true })).status, 409);
  equal(preuves.length, 0);
});
Deno.test("deux signatures séparées, PDF privés, intégrité et idempotence", async () => {
  await reset(); await prepare(); original.statut = "signe"; original.signed_at = "2026-11-24T12:00:00Z"; original.reponses = { declaration_acceptee: true, missions: "Mission fictive" };
  const avant = JSON.stringify(original.reponses); const signature = await png();
  const body1 = { action: "sign", token, document_id: originalId, operation_id: operation1, empreinte_vue: original.texte_empreinte, signature, consentement: true };
  const first = await call(body1); equal(first.status, 200); equal(preuves.length, 1); equal(fichiers.size, 1); equal(JSON.stringify(original.reponses), avant);
  const repeat = await call(body1); equal(repeat.status, 200); equal((await repeat.json()).deja_signe, true); equal(preuves.length, 1); equal(fichiers.size, 1); equal(audits.filter(a => a.operation === "intervenant.document.signe").length, 1);
  const refuse = await call({ action: "sign", token, document_id: contratId, operation_id: operation2, empreinte_vue: contrat.texte_empreinte, signature, consentement: true, collaboration_2021: false }); equal(refuse.status, 409);
  const second = await call({ action: "sign", token, document_id: contratId, operation_id: operation2, empreinte_vue: contrat.texte_empreinte, signature, consentement: true, collaboration_2021: true }); equal(second.status, 200); equal(preuves.length, 2); equal(fichiers.size, 2);
  equal(preuves[0].pdf_empreinte === preuves[1].pdf_empreinte, false); equal(preuves.every(p => /^[a-f0-9]{64}$/.test(p.pdf_empreinte)), true);
  equal((await call({ action: "pdf", token, document_id: contratId })).status, 200);
});
Deno.test("rattachement Qualiopi après signature seulement, sans statut automatique ni doublon", async () => {
  await reset(); admin = true; equal((await call({ action: "attach_qualiopi", document_competences_id: originalId, document_id: originalId, confirmation_relecture: true }, true)).status, 409);
  original.statut = "signe"; original.signed_at = "2026-11-24T12:00:00Z"; original.reponses = { declaration_acceptee: true }; const signature = await png();
  await call({ action: "sign", token, document_id: originalId, operation_id: operation1, empreinte_vue: original.texte_empreinte, signature, consentement: true });
  const body = { action: "attach_qualiopi", document_competences_id: originalId, document_id: originalId, confirmation_relecture: true };
  const attached = await call(body, true); equal(attached.status, 200); const data = await attached.json(); equal(data.indicateur, 21); equal(data.statut_modifie, false);
  equal((await call(body, true)).status, 200); equal(qualiopi.length, 1);
});

// Le processus de test est isolé : la simulation fetch reste active pendant les cas Deno.test.
