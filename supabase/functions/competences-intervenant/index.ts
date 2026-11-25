import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { COMPETENCES_MODELE, COMPETENCES_VERSION, DECLARATION_COMPETENCES, COMPETENCES_CHAMPS, validerCompetences, validerJustificatif } from "../_shared/competencesIntervenant.ts";
import { validerSignaturePng } from "../_shared/signaturePng.ts";
import { CONSENTEMENT_EVALUATION_I21, CRITERES_I21, EVALUATION_I21_VERSION, criteresI21Valides, libelleAppreciationI21 } from "../_shared/evaluationCompetencesI21.ts";
import { genererPdfIntervenant } from "../_shared/parcoursIntervenantPdf.ts";

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
    if (["admin_get", "review", "review_i21", "admin_evaluation_pdf"].includes(body.action)) {
      const auth = createClient(url, anon, { global: { headers: { Authorization: req.headers.get("authorization") ?? "" } } });
      const { data: identity, error: authError } = await auth.auth.getUser();
      if (authError || !identity.user) return json({ error: "Connexion responsable requise" }, 401);
      const { data: allowed, error: roleError } = await db.rpc("has_role", { _user_id: identity.user.id, _role: "admin" });
      if (roleError || allowed !== true) return json({ error: "Accès réservé au responsable" }, 403);
      const { data: doc, error } = await db.from("documents_a_signer").select("*").eq("id", body.document_id).eq("modele_code", COMPETENCES_MODELE).maybeSingle();
      if (error) throw error;
      if (!doc) return json({ error: "Dossier introuvable" }, 404);
      if (body.action === "admin_get") {
        const { data: reviews, error: reviewError } = await db.from("documents_a_signer").select("id, reponses, signed_at, created_by, file_path, texte_empreinte").eq("modele_code", REVIEW_MODEL).eq("cle_envoi", doc.id).order("created_at", { ascending: true }).range(0, 999);
        if (reviewError) throw reviewError;
        const reviewIds = (reviews ?? []).map(review => review.id);
        const { data: proofs, error: proofError } = reviewIds.length
          ? await db.from("intervenant_signature_preuves").select("document_id, pdf_empreinte, signed_at, signe_le_paris").in("document_id", reviewIds)
          : { data: [], error: null };
        if (proofError) throw proofError;
        for (const review of reviews ?? []) (review as any).preuve = (proofs ?? []).find(proof => proof.document_id === review.id) ?? null;
        const files = [];
        for (const file of doc.reponses?.fichiers ?? []) {
          const { data: signed, error: signedError } = await db.storage.from(BUCKET).createSignedUrl(file.path, 300);
          if (signedError || !signed?.signedUrl) throw signedError ?? new Error("Pièce inaccessible");
          files.push({ nom: file.nom, url: signed.signedUrl });
        }
        return json({ document: doc, reviews, fichiers: files });
      }

      const rattacherI21 = async (saved: any, proof: any) => {
        const ref = `competences-i21-evaluation:${proof.id}`;
        const { data: existing, error: existingError } = await db.from("qualiopi_preuves").select("id").eq("ref_key", ref).maybeSingle();
        if (existingError) throw existingError;
        let preuveId = existing?.id;
        if (!preuveId) {
          const { data: added, error: addError } = await db.from("qualiopi_preuves").insert({
            titre: `Évaluation des compétences I21 — ${doc.destinataire_nom}`,
            description: `Compte rendu signé manuscritement par le responsable le ${proof.signe_le_paris}. Sept critères, commentaire libre et pièces examinées. Empreinte PDF ${proof.pdf_empreinte}.`,
            ce_que_demontre: "Appréciation déclarée et signée du responsable sur les sept critères affichés. Elle ne démontre pas à elle seule la conformité globale de l’indicateur 21.",
            remarque_interne: "Preuve I21 rattachée sans modification automatique du statut de l’indicateur.",
            emplacement: `Documents privés : ${proof.pdf_path}`,
            date_preuve: proof.signed_at.slice(0, 10),
            fichiers: [{ path: proof.pdf_path, sha256: proof.pdf_empreinte, type: "application/pdf" }],
            source_type: "evaluation_competences_responsable", source_table: "intervenant_signature_preuves", source_id: proof.id,
            ref_key: ref, created_by: identity.user.id,
          }).select("id").single();
          if (addError || !added?.id) throw addError ?? new Error("Preuve I21 non créée");
          preuveId = added.id;
        }
        const { data: link, error: linkReadError } = await db.from("qualiopi_preuve_liens").select("id").eq("preuve_id", preuveId).eq("indicateur", 21).maybeSingle();
        if (linkReadError) throw linkReadError;
        if (!link) {
          const { error: linkError } = await db.from("qualiopi_preuve_liens").insert({ preuve_id: preuveId, indicateur: 21, justification: "Compte rendu d’évaluation des compétences signé par le responsable ; statut I21 inchangé." });
          if (linkError) throw linkError;
        }
        return preuveId;
      };

      if (body.action === "admin_evaluation_pdf") {
        const { data: review, error: reviewError } = await db.from("documents_a_signer").select("id").eq("id", body.review_id).eq("modele_code", REVIEW_MODEL).eq("cle_envoi", doc.id).maybeSingle();
        if (reviewError) throw reviewError;
        if (!review) return json({ error: "Évaluation hors de ce dossier" }, 403);
        const { data: proof, error: proofError } = await db.from("intervenant_signature_preuves").select("pdf_path, pdf_empreinte, signed_at").eq("document_id", review.id).maybeSingle();
        if (proofError) throw proofError;
        if (!proof?.pdf_path) return json({ error: "PDF de l’évaluation indisponible" }, 404);
        const { data: signed, error: signedError } = await db.storage.from(BUCKET).createSignedUrl(proof.pdf_path, 300, { download: true });
        if (signedError || !signed?.signedUrl) return json({ error: "Lien privé impossible" }, 500);
        return json({ url: signed.signedUrl, pdf_empreinte: proof.pdf_empreinte, signed_at: proof.signed_at });
      }

      if (body.action === "review_i21") {
        if (doc.statut !== "signe" || !doc.signed_at || !doc.reponses?.declaration_acceptee) return json({ error: "Aucune déclaration remise à examiner" }, 409);
        if (typeof body.operation_id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.operation_id)) return json({ error: "Identifiant d’opération invalide" }, 400);
        const sourceEmpreinte = await hash(new TextEncoder().encode(JSON.stringify(doc.reponses ?? {})));
        const { data: existing, error: existingError } = await db.from("documents_a_signer").select("id,reponses,signed_at").eq("id", body.operation_id).eq("modele_code", REVIEW_MODEL).eq("cle_envoi", doc.id).maybeSingle();
        if (existingError) throw existingError;
        if (existing) {
          if (existing.reponses?.declaration_empreinte !== sourceEmpreinte) return json({ error: "Opération existante sur un autre contenu" }, 409);
          const { data: proof, error: proofError } = await db.from("intervenant_signature_preuves").select("*").eq("document_id", existing.id).maybeSingle();
          if (proofError) throw proofError;
          if (!proof) return json({ error: "Évaluation existante à vérifier ; aucune nouvelle signature créée" }, 409);
          const preuveId = await rattacherI21(existing, proof);
          return json({ success: true, deja_enregistre: true, review: existing, preuve_i21_id: preuveId });
        }
        if (body.confirme !== true || !criteresI21Valides(body.criteres)) return json({ error: "Les sept critères et la confirmation d’examen réel sont obligatoires" }, 400);
        if (typeof body.commentaire !== "string" || body.commentaire.length > 12_000) return json({ error: "Commentaire libre invalide" }, 400);
        const signatureValide = await validerSignaturePng(body.signature);
        if (!signatureValide.ok) return json({ error: `Signature manuscrite invalide (${signatureValide.raison})` }, 400);
        const { data: profile } = await db.from("profiles").select("full_name").eq("user_id", identity.user.id).maybeSingle();
        const responsableNom = profile?.full_name?.trim() || "Responsable SERVICES PRO (compte administrateur vérifié)";
        const criteres = Object.fromEntries(CRITERES_I21.map(critere => [critere.id, body.criteres[critere.id]]));
        const tousAcquis = CRITERES_I21.every(critere => criteres[critere.id] === "acquis");
        const commentaire = body.commentaire.trim();
        const review = {
          document_source: doc.id, evaluation_i21_version: EVALUATION_I21_VERSION,
          decision: tousAcquis ? "valide" : "a_completer",
          motif: commentaire || (tousAcquis ? "Les sept critères sont déclarés acquis par le responsable." : "Au moins un critère n’est pas déclaré acquis."),
          methode: "Examen déclaré par le responsable du bilan, des pièces affichées et des sept critères I21.",
          criteres, commentaire, confirme: true, consentement_texte: CONSENTEMENT_EVALUATION_I21,
          responsable_id: identity.user.id, responsable_nom: responsableNom,
          declaration_empreinte: sourceEmpreinte, operation_id: body.operation_id,
          signature_empreinte: await hash(new TextEncoder().encode(body.signature)),
        };
        const texteSerialise = JSON.stringify(review);
        const texteEmpreinte = await hash(new TextEncoder().encode(texteSerialise));
        const signeLe = new Date().toISOString();
        const signeLeParis = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", dateStyle: "full", timeStyle: "long" }).format(new Date(signeLe));
        const fichiers = Array.isArray(doc.reponses?.fichiers) ? doc.reponses.fichiers : [];
        const pdf = await genererPdfIntervenant({
          titre: "ÉVALUATION DES COMPÉTENCES — INDICATEUR 21",
          destinataire: `${doc.destinataire_nom} — appréciation du responsable ${responsableNom}`,
          empreinteSource: sourceEmpreinte, operationId: body.operation_id, apercu: false,
          sections: [
            { titre: "Portée de l’évaluation", lignes: ["Appréciation déclarée par le responsable après examen du bilan et des pièces affichés. Ce document ne modifie pas automatiquement le statut de l’indicateur 21 et ne vaut pas certification de conformité globale."] },
            { titre: "Bilan rempli par l’intervenant", lignes: COMPETENCES_CHAMPS.map(champ => `${champ.label}\n${doc.reponses?.[champ.id] || "Non renseigné"}`) },
            { titre: "Pièces examinées", lignes: fichiers.length ? fichiers.map((file: any) => `${file.nom}\nEmpreinte : ${file.empreinte}`) : ["Aucune pièce jointe."] },
            { titre: "Sept critères évalués", lignes: CRITERES_I21.map(critere => `${critere.label} : ${libelleAppreciationI21(criteres[critere.id])}`) },
            { titre: "Commentaire libre", lignes: [commentaire || "Aucun commentaire libre."] },
          ],
          signature: { dataUrl: body.signature, signeLeParis, consentement: CONSENTEMENT_EVALUATION_I21, signataire: responsableNom },
          noteFin: "Le bilan et les pièces sources sont conservés séparément. Aucune réponse de l’intervenant n’a été modifiée.",
        });
        const pdfEmpreinte = await hash(pdf);
        const pdfPath = `competences/${doc.id}/i21-${body.operation_id}.pdf`;
        const { error: uploadError } = await db.storage.from(BUCKET).upload(pdfPath, pdf, { contentType: "application/pdf", upsert: false });
        if (uploadError) {
          const { data: stored, error: readError } = await db.storage.from(BUCKET).download(pdfPath);
          if (readError || !stored || await hash(new Uint8Array(await stored.arrayBuffer())) !== pdfEmpreinte) throw uploadError;
        }
        const { data: saved, error: saveError } = await db.from("documents_a_signer").insert({
          id: body.operation_id, nom: `Évaluation I21 — ${doc.destinataire_nom}`, file_path: pdfPath, champs: [],
          modele_code: REVIEW_MODEL, modele_version: EVALUATION_I21_VERSION, texte_fige: texteSerialise,
          texte_empreinte: texteEmpreinte, cle_envoi: doc.id, reponses: review,
          statut: "signe", signed_at: signeLe, created_by: identity.user.id,
        }).select("id,reponses,signed_at").single();
        if (saveError || !saved?.id) throw saveError ?? new Error("Évaluation non enregistrée");
        const requeteEmpreinte = await hash(new TextEncoder().encode(JSON.stringify({ document_id: doc.id, operation_id: body.operation_id, criteres, commentaire, texte_empreinte: texteEmpreinte })));
        const { data: proof, error: proofError } = await db.from("intervenant_signature_preuves").insert({
          document_id: saved.id, operation_id: body.operation_id, document_empreinte: texteEmpreinte,
          requete_empreinte: requeteEmpreinte, consentement_texte: CONSENTEMENT_EVALUATION_I21,
          signature_empreinte: review.signature_empreinte, pdf_path: pdfPath, pdf_empreinte: pdfEmpreinte,
          charge_utile: { signature_png: body.signature, evaluation_i21_version: EVALUATION_I21_VERSION },
          signed_at: signeLe, signe_le_paris: signeLeParis,
        }).select("*").single();
        if (proofError || !proof?.id) throw proofError ?? new Error("Preuve de signature non enregistrée");
        const preuveId = await rattacherI21(saved, proof);
        return json({ success: true, review: saved, preuve_i21_id: preuveId, pdf_empreinte: pdfEmpreinte });
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