import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { COMPETENCES_MODELE, COMPETENCES_VERSION, DECLARATION_COMPETENCES, COMPETENCES_CHAMPS, validerCompetences, validerJustificatif } from "../_shared/competencesIntervenant.ts";

const headers = { ...corsHeaders, "Cache-Control": "no-store", "Content-Type": "application/json" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
const hash = async (bytes: Uint8Array) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new Uint8Array(bytes).buffer))).map(x => x.toString(16).padStart(2, "0")).join("");
const REVIEW_MODEL = "validation_competences_responsable";
const BUCKET = "documents-a-signer";

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") return json({ error: "Méthode refusée" }, 405);
  if (Number(req.headers.get("content-length") ?? 0) > 6_000_000) return json({ error: "Fichier trop volumineux" }, 413);
  try {
    const body = await req.json();
    const url = Deno.env.get("SUPABASE_URL");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    if (!url || !service || !anon) return json({ error: "Service indisponible" }, 503);
    const db = createClient(url, service);
    if (["admin_get", "review"].includes(body.action)) {
      const auth = createClient(url, anon, { global: { headers: { Authorization: req.headers.get("authorization") ?? "" } } });
      const { data: identity, error: authError } = await auth.auth.getUser();
      if (authError || !identity.user) return json({ error: "Connexion responsable requise" }, 401);
      const { data: allowed, error: roleError } = await db.rpc("has_role", { _user_id: identity.user.id, _role: "admin" });
      if (roleError || allowed !== true) return json({ error: "Accès réservé au responsable" }, 403);
      const { data: doc, error } = await db.from("documents_a_signer").select("*").eq("id", body.document_id).eq("modele_code", COMPETENCES_MODELE).maybeSingle();
      if (error) throw error;
      if (!doc) return json({ error: "Dossier introuvable" }, 404);
      if (body.action === "admin_get") {
        const { data: reviews, error: reviewError } = await db.from("documents_a_signer").select("id, reponses, signed_at, created_by").eq("modele_code", REVIEW_MODEL).eq("cle_envoi", doc.id).order("created_at", { ascending: true }).range(0, 999);
        if (reviewError) throw reviewError;
        const files = [];
        for (const file of doc.reponses?.fichiers ?? []) {
          const { data: signed, error: signedError } = await db.storage.from(BUCKET).createSignedUrl(file.path, 300);
          if (signedError || !signed?.signedUrl) throw signedError ?? new Error("Pièce inaccessible");
          files.push({ nom: file.nom, url: signed.signedUrl });
        }
        return json({ document: doc, reviews, fichiers: files });
      }
      if (doc.statut !== "signe" || !doc.signed_at || !doc.reponses?.declaration_acceptee) return json({ error: "Aucune déclaration remise à examiner" }, 409);
      if (body.confirme !== true || !["valide", "a_completer", "refuse"].includes(body.decision)
        || typeof body.motif !== "string" || !body.motif.trim() || body.motif.length > 12_000
        || typeof body.methode !== "string" || !body.methode.trim() || body.methode.length > 12_000) return json({ error: "Décision, méthode de vérification et justification explicites requises" }, 400);
      const review = {
        document_source: doc.id, decision: body.decision, motif: body.motif.trim(), methode: body.methode.trim(),
        confirme: true, responsable_id: identity.user.id, declaration_empreinte: await hash(new TextEncoder().encode(JSON.stringify(doc.reponses))),
      };
      const { data: saved, error: saveError } = await db.from("documents_a_signer").insert({
        nom: "Examen responsable — " + doc.destinataire_nom, file_path: "", champs: [],
        modele_code: REVIEW_MODEL, modele_version: COMPETENCES_VERSION, texte_fige: JSON.stringify(review),
        texte_empreinte: await hash(new TextEncoder().encode(JSON.stringify(review))), cle_envoi: doc.id,
        reponses: review, statut: "signe", signed_at: new Date().toISOString(), created_by: identity.user.id,
      }).select("id,reponses,signed_at").single();
      if (saveError || !saved?.id) throw saveError ?? new Error("Décision non enregistrée");
      return json({ success: true, review: saved });
    }

    if (typeof body.token !== "string" || !/^[a-f0-9]{64}$/.test(body.token)) return json({ error: "Lien invalide" }, 404);
    const { data: doc, error } = await db.from("documents_a_signer").select("id, nom, destinataire_nom, modele_version, texte_fige, reponses, statut, signed_at").eq("token", body.token).eq("modele_code", COMPETENCES_MODELE).maybeSingle();
    if (error) throw error;
    if (!doc) return json({ error: "Lien introuvable ou expiré" }, 404);
    const frozen = JSON.parse(doc.texte_fige ?? "null");
    if (!frozen || frozen.version !== COMPETENCES_VERSION || frozen.declaration !== DECLARATION_COMPETENCES
      || !Number.isFinite(Date.parse(frozen.expires_at)) || Date.parse(frozen.expires_at) <= Date.now()) return json({ error: "Lien introuvable ou expiré" }, 404);
    if (body.action === "get") return json({ document: {
      nom: doc.nom, destinataire_nom: doc.destinataire_nom, modele_version: doc.modele_version,
      statut: doc.statut, expires_at: frozen.expires_at,
      reponses: Object.fromEntries(COMPETENCES_CHAMPS.map(c => [c.id, doc.reponses?.[c.id] ?? ""])),
    } });
    if (doc.statut !== "brouillon" || doc.signed_at) return json({ error: "Déclaration déjà remise, aucune réécriture autorisée" }, 409);
    if (body.action === "upload") {
      if (typeof body.data !== "string" || body.data.length > 5_600_000 || !/^[A-Za-z0-9+/]*={0,2}$/.test(body.data)) return json({ error: "Fichier refusé" }, 400);
      const bytes = Uint8Array.from(atob(body.data), c => c.charCodeAt(0));
      if (!validerJustificatif({ size: bytes.length, type: body.mime })) return json({ error: "PDF/JPG/PNG de 4 Mo maximum" }, 400);
      const magic = body.mime === "application/pdf" ? new TextDecoder().decode(bytes.slice(0,5)) === "%PDF-"
        : body.mime === "image/png" ? [137,80,78,71,13,10,26,10].every((v,i) => bytes[i] === v)
        : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
      if (!magic) return json({ error: "Contenu du fichier incompatible" }, 400);
      const digest = await hash(bytes);
      const path = `competences/${doc.id}/${digest}`;
      const { error: uploadError } = await db.storage.from(BUCKET).upload(path, bytes, { contentType: body.mime, upsert: false });
      if (uploadError) {
        const { data: existing, error: readError } = await db.storage.from(BUCKET).download(path);
        if (readError || !existing || await hash(new Uint8Array(await existing.arrayBuffer())) !== digest) throw uploadError;
      }
      return json({ path });
    }
    if (body.action !== "submit") return json({ error: "Action refusée" }, 400);
    const refused = validerCompetences(body.reponses ?? {}, body.declaration);
    if (refused) return json({ error: refused }, 400);
    if (!Array.isArray(body.fichiers) || !body.fichiers.length || body.fichiers.length > 10) return json({ error: "De 1 à 10 justificatifs requis" }, 400);
    const files = [];
    for (const file of body.fichiers) {
      if (typeof file?.path !== "string" || !new RegExp(`^competences/${doc.id}/[a-f0-9]{64}$`).test(file.path)
        || typeof file.nom !== "string" || !file.nom.trim() || file.nom.length > 200) return json({ error: "Justificatif hors de ce dossier" }, 403);
      const { data: stored, error: readError } = await db.storage.from(BUCKET).download(file.path);
      if (readError || !stored || stored.size > 4 * 1024 * 1024) return json({ error: "Justificatif non retrouvé" }, 400);
      const digest = await hash(new Uint8Array(await stored.arrayBuffer()));
      if (!file.path.endsWith("/" + digest)) return json({ error: "Justificatif non conforme" }, 400);
      files.push({ nom: file.nom.trim(), path: file.path, empreinte: digest });
    }
    const answers = {
      ...Object.fromEntries(COMPETENCES_CHAMPS.map(c => [c.id, body.reponses[c.id].trim()])),
      declaration_acceptee: true, declaration_texte: DECLARATION_COMPETENCES, fichiers: files,
      version: COMPETENCES_VERSION, user_agent: (req.headers.get("user-agent") ?? "").slice(0, 500),
    };
    const { data: saved, error: saveError } = await db.from("documents_a_signer").update({ reponses: answers, statut: "signe", signed_at: new Date().toISOString() }).eq("id", doc.id).eq("statut", "brouillon").is("signed_at", null).select("id,reponses,signed_at").maybeSingle();
    if (saveError) throw saveError;
    if (!saved?.id) return json({ error: "Déclaration déjà remise sur un autre appareil" }, 409);
    const { data: confirmed, error: readError } = await db.from("documents_a_signer").select("id,reponses,signed_at").eq("id", saved.id).single();
    if (readError || !confirmed?.signed_at || JSON.stringify(confirmed.reponses) !== JSON.stringify(saved.reponses)) return json({ error: "Enregistrement à vérifier, ne pas renvoyer automatiquement" }, 409);
    return json({ success: true });
  } catch {
    return json({ error: "Opération impossible, aucune validation ne doit être présumée" }, 500);
  }
});