import { createClient } from "npm:@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { validerSignaturePng } from "../_shared/signaturePng.ts";
import { sendBrandedEmail } from "../_shared/send-branded-email.ts";
import { COMPETENCES_CHAMPS, COMPETENCES_MODELE } from "../_shared/competencesIntervenant.ts";
import {
  CONSENTEMENTS_INTERVENANT,
  CONTRAT_MODELE,
  CONTRAT_VERSION,
  SATISFACTION_MODELE,
  SATISFACTION_NOTES,
  SATISFACTION_TEXTES,
  SATISFACTION_VERSION,
  TITRE_SATISFACTION,
  empreinteVueValide,
  operationIdValide,
  texteContratFige,
  texteSatisfactionFige,
  validerReponsesSatisfaction,
  type TypeDocumentIntervenant,
} from "../_shared/parcoursIntervenant.ts";
import { genererPdfIntervenant, type SectionPdfIntervenant } from "../_shared/parcoursIntervenantPdf.ts";

const BUCKET = "documents-a-signer";
const J = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } });
const sha256 = async (value: string | Uint8Array) => {
  const source = typeof value === "string" ? new TextEncoder().encode(value) : value;
  const bytes = new Uint8Array(source.byteLength); bytes.set(source);
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes.buffer))).map(x => x.toString(16).padStart(2, "0")).join("");
};
const texteObjet = (value: any) => {
  if (typeof value !== "string") return value && typeof value === "object" ? value : {};
  try { return JSON.parse(value); } catch { return {}; }
};
const titreDocument = (texte: any, fallback = "Bilan et justification des compétences") => texteObjet(texte)?.titre || fallback;
const paris = (iso: string) => new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", dateStyle: "full", timeStyle: "long" }).format(new Date(iso));
const uid = () => globalThis.crypto.randomUUID();
const jetonSecondaire = () => Array.from(crypto.getRandomValues(new Uint8Array(24))).map(x => x.toString(16).padStart(2, "0")).join("");
const html = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return J({ error: "Méthode non autorisée" }, 405);
  const db: any = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    const body = await req.json();
    const action = body?.action;
    const adminActions = ["admin_get", "prepare", "attach_qualiopi", "admin_contresigne_get", "admin_contresigner", "admin_contresigne_pdf"];
    let adminId: string | null = null;
    if (adminActions.includes(action)) {
      const token = req.headers.get("Authorization")?.replace("Bearer ", "");
      const { data: auth } = await db.auth.getUser(token);
      adminId = auth?.user?.id ?? null;
      if (!adminId) return J({ error: "Authentification administrateur requise" }, 401);
      const { data: admin } = await db.from("user_roles").select("role").eq("user_id", adminId).eq("role", "admin").maybeSingle();
      if (!admin) return J({ error: "Rôle administrateur requis" }, 403);
    }

    const originalFields = "id, nom, token, modele_code, modele_version, destinataire_nom, destinataire_email, texte_fige, champs, reponses, statut, signed_at, texte_empreinte, identite_figee, envoi_etat, envoi_tente_le, envoye_le, envoi_erreur, mail_objet_fige, mail_html_fige";
    const originalParId = async (id: unknown) => {
      if (typeof id !== "string") return null;
      const { data, error } = await db.from("documents_a_signer").select(originalFields).eq("id", id).eq("modele_code", COMPETENCES_MODELE).is("apprenant_id", null).maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    };
    const originalParToken = async () => {
      if (typeof body?.token !== "string" || !/^[a-f0-9]{64}$/.test(body.token)) return null;
      const { data, error } = await db.from("documents_a_signer").select(originalFields).eq("token", body.token).eq("modele_code", COMPETENCES_MODELE).is("apprenant_id", null).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;
      const fige = texteObjet(data.texte_fige);
      const expire = fige?.expires_at || fige?.expire_le;
      if (!expire || !Number.isFinite(Date.parse(expire)) || new Date(expire) <= new Date()) return null;
      return data;
    };
    const documentLiePour = async (original: any, modele: string) => {
      const { data, error } = await db.from("documents_a_signer").select("id, modele_code, modele_version, cle_envoi, destinataire_nom, destinataire_email, texte_fige, texte_empreinte, reponses, statut, signed_at, created_at").eq("modele_code", modele).eq("cle_envoi", original.id).is("apprenant_id", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    };
    const documentsLies = async (original: any) => ({
      contrat: await documentLiePour(original, CONTRAT_MODELE),
      satisfaction: await documentLiePour(original, SATISFACTION_MODELE),
    });
    const preuvePour = async (documentId: string) => {
      const { data, error } = await db.from("intervenant_signature_preuves").select("id, document_id, operation_id, document_empreinte, requete_empreinte, consentement_texte, signature_empreinte, pdf_path, pdf_empreinte, charge_utile, signed_at, signe_le_paris, created_at").eq("document_id", documentId).maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    };
    const preuveVue = (p: any) => p ? { id: p.id, operation_id: p.operation_id, document_empreinte: p.document_empreinte, signature_empreinte: p.signature_empreinte, pdf_empreinte: p.pdf_empreinte, signed_at: p.signed_at, signe_le_paris: p.signe_le_paris } : null;
    const vueParcours = async (original: any) => {
      const { contrat, satisfaction } = await documentsLies(original);
      const [preuveCompetences, preuveContrat, preuveSatisfaction] = await Promise.all([
        preuvePour(original.id), contrat ? preuvePour(contrat.id) : null, satisfaction ? preuvePour(satisfaction.id) : null,
      ]);
      const figeContrat = texteObjet(contrat?.texte_fige);
      const figeSatisfaction = texteObjet(satisfaction?.texte_fige);
      return {
        documents: [
          { type: "competences" as const, document_id: original.id, titre: titreDocument(original.texte_fige), texte_fige: texteObjet(original.texte_fige), statut_source: original.statut, signed_at_source: original.signed_at, empreinte: original.texte_empreinte, signature: preuveVue(preuveCompetences) },
          { type: "contrat" as const, document_id: contrat?.id ?? null, titre: "CONTRAT-CADRE DE PRESTATION DE FORMATION — ANGLAIS", texte_fige: contrat ? figeContrat : texteContratFige(), statut_source: contrat?.statut ?? "apercu", signed_at_source: contrat?.signed_at ?? null, empreinte: contrat?.texte_empreinte ?? null, signature: preuveVue(preuveContrat), preparation_requise: !contrat },
          { type: "satisfaction" as const, document_id: satisfaction?.id ?? null, titre: TITRE_SATISFACTION, texte_fige: satisfaction ? figeSatisfaction : texteSatisfactionFige(), reponses: satisfaction?.reponses ?? {}, statut_source: satisfaction?.statut ?? "apercu", signed_at_source: satisfaction?.signed_at ?? null, empreinte: satisfaction?.texte_empreinte ?? null, signature: preuveVue(preuveSatisfaction), preparation_requise: !satisfaction },
        ],
        envoye_le: original.envoye_le ?? null,
      };
    };
    const audit = async (admin: string | null, operation: string, cibleId: string, cible: string, charge: Record<string, unknown>) => {
      const { data: existant, error: lecture } = await db.from("audit_journal").select("event_id").eq("operation", operation).eq("cible_id", cibleId).maybeSingle();
      if (lecture) return false;
      if (existant) return true;
      const { error } = await db.from("audit_journal").insert({ operation, cible_type: cible, cible_id: cibleId, auteur: admin, apres: charge, origine: "parcours-intervenant" });
      return !error;
    };

    const CONSENTEMENT_CENTRE = "Je, Naoufal GUENICHI, Président de SERVICES PRO, signe personnellement ce contrat-cadre, dans la version exacte déjà signée par le prestataire, sans en modifier le contenu. Ma signature est horodatée par le serveur à l'instant de ce geste.";
    const contratEtPreuve = async () => {
      const original = await originalParId(body?.document_competences_id);
      if (!original) return { erreur: "Parcours intervenant introuvable" };
      const contrat = await documentLiePour(original, CONTRAT_MODELE);
      if (!contrat) return { erreur: "Contrat non préparé" };
      const preuve = await preuvePour(contrat.id);
      const { data: contre, error } = await db.from("intervenant_contresignatures_centre").select("id, document_id, operation_id, signataire_nom, signataire_qualite, signature_empreinte, pdf_intervenant_empreinte, pdf_path, pdf_empreinte, signed_at, signe_le_paris").eq("document_id", contrat.id).maybeSingle();
      if (error) throw new Error(error.message);
      return { original, contrat, preuve, contre };
    };
    if (action === "admin_contresigne_get") {
      const r: any = await contratEtPreuve();
      if (r.erreur) return J({ error: r.erreur }, 404);
      return J({ ok: true, contrat_id: r.contrat.id, statut_crm: r.contrat.statut, prestataire: preuveVue(r.preuve), centre: r.contre, consentement: CONSENTEMENT_CENTRE });
    }
    if (action === "admin_contresigne_pdf") {
      const r: any = await contratEtPreuve();
      if (r.erreur) return J({ error: r.erreur }, 404);
      const chemin = body?.version === "contresigne" ? r.contre?.pdf_path : r.preuve?.pdf_path;
      if (!chemin) return J({ error: "PDF indisponible" }, 404);
      const { data, error } = await db.storage.from(BUCKET).createSignedUrl(chemin, 300);
      if (error || !data?.signedUrl) return J({ error: "Lien privé impossible" }, 500);
      return J({ ok: true, url: data.signedUrl });
    }
    if (action === "admin_contresigner") {
      if (!operationIdValide(body?.operation_id)) return J({ error: "Identifiant d'opération invalide" }, 400);
      const r: any = await contratEtPreuve();
      if (r.erreur) return J({ error: r.erreur }, 404);
      if (r.contre) return J({ ok: true, deja_signe: true, centre: r.contre });
      if (!r.preuve) return J({ error: "Le prestataire n'a pas encore signé ce contrat" }, 409);
      if (body?.consentement !== true) return J({ error: "Le consentement explicite est obligatoire" }, 400);
      if (body?.empreinte_pdf_vue !== r.preuve.pdf_empreinte) return J({ error: "Le PDF du prestataire affiché ne correspond pas à la version signée : rechargez" }, 409);
      const signatureValide = await validerSignaturePng(body?.signature);
      if (!signatureValide.ok) return J({ error: `Signature manuscrite invalide (${signatureValide.raison})` }, 400);
      const source = await db.storage.from(BUCKET).download(r.preuve.pdf_path);
      if (source.error) return J({ error: "PDF signé par le prestataire illisible : signature refusée" }, 500);
      const octets = new Uint8Array(await source.data.arrayBuffer());
      if (await sha256(octets) !== r.preuve.pdf_empreinte) return J({ error: "Intégrité du PDF prestataire non confirmée : signature refusée" }, 409);
      const signeLe = new Date().toISOString();
      const signeLeParis = paris(signeLe);
      const pdfDoc = await PDFDocument.load(octets);
      const page = pdfDoc.addPage([595.28, 841.89]);
      const f = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fb = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const bleu = rgb(0.05, 0.15, 0.25);
      let y = 790;
      const ligne = (t: string, font = f, size = 10) => { for (const morceau of t.match(/.{1,95}(\s|$)/g) ?? [t]) { page.drawText(morceau.trim(), { x: 50, y, size, font, color: bleu }); y -= size + 5; } };
      ligne("SIGNATURE DE SERVICES PRO - CONTRAT-CADRE", fb, 14); y -= 8;
      ligne("Les pages précédentes sont reproduites sans aucune modification depuis le PDF signé par le prestataire.");
      ligne(`Empreinte SHA-256 du PDF prestataire : ${r.preuve.pdf_empreinte}`, f, 8);
      ligne(`Signature du prestataire enregistrée le ${r.preuve.signe_le_paris}.`); y -= 8;
      ligne("Pour SERVICES PRO, SAS, SIRET 82346156100016, 86 route de Genas, 69003 Lyon", fb);
      ligne("Naoufal GUENICHI, Président"); y -= 4;
      ligne(CONSENTEMENT_CENTRE, f, 9); y -= 6;
      ligne(`Signé le ${signeLeParis} (horodatage serveur).`, fb);
      const png = await pdfDoc.embedPng(body.signature);
      const dims = png.scaleToFit(220, 110);
      page.drawImage(png, { x: 50, y: y - dims.height - 10, width: dims.width, height: dims.height });
      page.drawText(`Opération ${body.operation_id}`, { x: 50, y: 40, size: 7, font: f, color: rgb(0.4, 0.4, 0.4) });
      const pdf = await pdfDoc.save();
      const pdfEmpreinte = await sha256(pdf);
      const formateurId = r.original.identite_figee?.formateur_id;
      const pdfPath = `intervenants/${formateurId}/${r.contrat.id}/centre-${body.operation_id}.pdf`;
      const up = await db.storage.from(BUCKET).upload(pdfPath, pdf, { contentType: "application/pdf", upsert: false });
      if (up.error) return J({ error: "PDF contresigné non enregistré ; aucune confirmation" }, 500);
      const relu = await db.storage.from(BUCKET).download(pdfPath);
      if (relu.error || await sha256(new Uint8Array(await relu.data.arrayBuffer())) !== pdfEmpreinte) return J({ error: "Contrôle d'intégrité du PDF contresigné échoué" }, 500);
      const { data: contre, error } = await db.from("intervenant_contresignatures_centre").insert({
        document_id: r.contrat.id, preuve_intervenant_id: r.preuve.id, operation_id: body.operation_id, admin_user_id: adminId,
        signataire_nom: "Naoufal GUENICHI", signataire_qualite: "Président de SERVICES PRO", consentement_texte: CONSENTEMENT_CENTRE,
        signature_data_url: body.signature, signature_empreinte: await sha256(body.signature), pdf_intervenant_empreinte: r.preuve.pdf_empreinte,
        pdf_path: pdfPath, pdf_empreinte: pdfEmpreinte, signed_at: signeLe, signe_le_paris: signeLeParis, user_agent: String(req.headers.get("user-agent") || "").slice(0, 500),
      }).select("id, document_id, operation_id, signataire_nom, signataire_qualite, pdf_path, pdf_empreinte, signed_at, signe_le_paris").single();
      if (error) { const a: any = await contratEtPreuve(); if (a.contre) return J({ ok: true, deja_signe: true, centre: a.contre }); return J({ error: "Preuve non enregistrée" }, 500); }
      await audit(adminId, "intervenant.contrat.contresigne_centre", contre.id, "contresignature_centre", { document_id: r.contrat.id, operation_id: body.operation_id, pdf_empreinte: pdfEmpreinte, pdf_prestataire_empreinte: r.preuve.pdf_empreinte });
      return J({ ok: true, centre: contre });
    }

    if (action === "get") {
      const original = await originalParToken();
      if (!original) return J({ error: "Lien invalide ou expiré" }, 404);
      return J({ document: { id: original.id, statut: original.statut, signed_at: original.signed_at }, ...(await vueParcours(original)) });
    }

    if (action === "admin_get") {
      const original = await originalParId(body?.document_id);
      if (!original) return J({ error: "Déclaration de compétences introuvable" }, 404);
      return J({ ...(await vueParcours(original)), formateur_id: original.identite_figee?.formateur_id ?? null });
    }

    if (action === "prepare") {
      if (body?.confirmation_contenu !== true) return J({ error: "La relecture et la confirmation des trois contenus sont obligatoires" }, 400);
      const original = await originalParId(body?.document_id);
      if (!original) return J({ error: "Déclaration de compétences introuvable" }, 404);
      const resultats: Record<string, string> = {};
      for (const type of ["contrat", "satisfaction"] as const) {
        const modele = type === "contrat" ? CONTRAT_MODELE : SATISFACTION_MODELE;
        const version = type === "contrat" ? CONTRAT_VERSION : SATISFACTION_VERSION;
        let document = await documentLiePour(original, modele);
        if (!document) {
          const texte = type === "contrat" ? texteContratFige("valide_pour_signature") : texteSatisfactionFige("valide_pour_reponse");
          const texteSerialise = JSON.stringify(texte);
          const empreinte = await sha256(texteSerialise);
          const { data: ajout, error } = await db.from("documents_a_signer").insert({
            id: uid(), token: jetonSecondaire(), cle_envoi: original.id, apprenant_id: null,
            nom: texte.titre, destinataire_nom: original.destinataire_nom, destinataire_email: original.destinataire_email,
            modele_code: modele, modele_version: version,
            texte_fige: texteSerialise, champs: [], reponses: {}, identite_figee: original.identite_figee || {}, file_path: "", statut: "brouillon",
            texte_empreinte: empreinte, created_by: adminId,
          }).select("id, texte_empreinte").single();
          if (error) {
            const apresConflit = await documentLiePour(original, modele);
            if (!apresConflit) return J({ error: `Préparation ${type} impossible : ${error.message}` }, 400);
            document = apresConflit;
          } else document = ajout;
        }
        if (!await audit(adminId, `intervenant.${type}.prepare`, document.id, "document_intervenant", { document_competences_id: original.id, empreinte: document.texte_empreinte, aucun_envoi: true })) return J({ error: `${type} préparé, mais piste d'audit à vérifier`, document_id: document.id }, 409);
        resultats[type] = document.id;
      }
      return J({ ok: true, documents: resultats, aucun_envoi: true });
    }

    if (action === "submit_satisfaction") {
      const original = await originalParToken();
      if (!original) return J({ error: "Lien invalide ou expiré" }, 404);
      const satisfaction = await documentLiePour(original, SATISFACTION_MODELE);
      if (!satisfaction || satisfaction.id !== body?.document_id) return J({ error: "Enquête inexistante ou hors de ce lien" }, 403);
      if (satisfaction.statut === "signe" && satisfaction.signed_at) return J({ ok: true, deja_remise: true });
      if (satisfaction.statut !== "brouillon" || satisfaction.signed_at) return J({ error: "Enquête déjà remise, aucune réécriture autorisée" }, 409);
      const refused = validerReponsesSatisfaction(body?.reponses, body?.declaration);
      if (refused) return J({ error: refused }, 400);
      const reponses = {
        ...Object.fromEntries(SATISFACTION_NOTES.map(q => [q.id, body.reponses[q.id]])),
        ...Object.fromEntries(SATISFACTION_TEXTES.map(q => [q.id, body.reponses[q.id] == null ? "" : String(body.reponses[q.id]).trim()])),
        declaration_acceptee: true,
        declaration_texte: texteSatisfactionFige().declaration,
        version: SATISFACTION_VERSION,
        user_agent: String(req.headers.get("user-agent") || "").slice(0, 500),
      };
      const { data: saved, error } = await db.from("documents_a_signer").update({ reponses, statut: "signe", signed_at: new Date().toISOString() }).eq("id", satisfaction.id).eq("statut", "brouillon").is("signed_at", null).select("id, reponses, signed_at").maybeSingle();
      if (error) return J({ error: "Enregistrement de l'enquête impossible : " + error.message }, 400);
      if (!saved?.id) return J({ error: "Enquête déjà remise sur un autre appareil" }, 409);
      const { data: confirmed, error: readError } = await db.from("documents_a_signer").select("id, reponses, signed_at").eq("id", saved.id).single();
      if (readError || !confirmed?.signed_at || JSON.stringify(confirmed.reponses) !== JSON.stringify(saved.reponses)) return J({ error: "Enregistrement à vérifier, ne pas renvoyer automatiquement" }, 409);
      return J({ ok: true });
    }

    if (action === "pdf") {
      const original = await originalParToken();
      if (!original) return J({ error: "Lien invalide ou expiré" }, 404);
      const { contrat, satisfaction } = await documentsLies(original);
      const autorises = [original.id, contrat?.id, satisfaction?.id].filter(Boolean);
      if (!autorises.includes(body?.document_id)) return J({ error: "Document hors de ce lien individuel" }, 403);
      const preuve = await preuvePour(body.document_id);
      if (!preuve) return J({ error: "Document non signé" }, 404);
      const { data, error } = await db.storage.from(BUCKET).createSignedUrl(preuve.pdf_path, 300, { download: true });
      if (error) return J({ error: "PDF privé indisponible" }, 500);
      return J({ url: data.signedUrl, pdf_empreinte: preuve.pdf_empreinte, signed_at: preuve.signed_at });
    }

    if (action === "sign") {
      const original = await originalParToken();
      if (!original) return J({ error: "Lien invalide ou expiré" }, 404);
      if (!operationIdValide(body?.operation_id)) return J({ error: "Identifiant d'opération invalide" }, 400);
      const { contrat, satisfaction } = await documentsLies(original);
      const type: TypeDocumentIntervenant | null = body?.document_id === original.id ? "competences" : contrat && body?.document_id === contrat.id ? "contrat" : satisfaction && body?.document_id === satisfaction.id ? "satisfaction" : null;
      if (!type) return J({ error: "Document inexistant, hors de ce lien ou encore seulement en aperçu" }, 403);
      const doc = type === "competences" ? original : type === "contrat" ? contrat : satisfaction;
      const deja = await preuvePour(doc.id);
      if (deja) {
        if (!await audit(null, "intervenant.document.signe", deja.id, "signature_intervenant", { document_id: doc.id, type, operation_id: deja.operation_id, empreinte_pdf: deja.pdf_empreinte, rappel_idempotent: true })) return J({ error: "Signature déjà enregistrée ; audit à vérifier, ne recréez pas d'opération" }, 409);
        return J({ ok: true, deja_signe: true, document_id: doc.id, signature: preuveVue(deja) });
      }
      if (doc.texte_empreinte !== body?.empreinte_vue || !empreinteVueValide(body?.empreinte_vue)) return J({ error: "Le contenu a changé ou son empreinte est absente : rechargez et relisez le document" }, 409);
      const texteSource = typeof doc.texte_fige === "string" ? doc.texte_fige : JSON.stringify(texteObjet(doc.texte_fige));
      if (await sha256(texteSource) !== doc.texte_empreinte) return J({ error: "L'intégrité du texte source n'est pas confirmée : signature refusée" }, 409);
      if (body?.consentement !== true) return J({ error: "Le consentement explicite est obligatoire" }, 400);
      if (type === "competences" && (original.statut !== "signe" || !original.signed_at || original.reponses?.declaration_acceptee !== true)) return J({ error: "Remettez d'abord la déclaration de compétences avec ses justificatifs" }, 409);
      if (type === "contrat" && body?.collaboration_2021 !== true) return J({ error: "Confirmez le début de collaboration courant 2021 ou demandez une correction avant de signer" }, 409);
      if (type === "satisfaction" && (satisfaction.statut !== "signe" || !satisfaction.signed_at || satisfaction.reponses?.declaration_acceptee !== true)) return J({ error: "Enregistrez d'abord vos réponses complètes à l'enquête" }, 409);
      const signatureValide = await validerSignaturePng(body?.signature);
      if (!signatureValide.ok) return J({ error: `Signature manuscrite invalide (${signatureValide.raison})` }, 400);
      const signatureEmpreinte = await sha256(body.signature);
      const requete = { document_id: doc.id, document_empreinte: doc.texte_empreinte, reponses_empreinte: await sha256(JSON.stringify(doc.reponses ?? {})), consentement: CONSENTEMENTS_INTERVENANT[type], signature_empreinte: signatureEmpreinte, collaboration_2021: type === "contrat" ? true : null };
      const requeteEmpreinte = await sha256(JSON.stringify(requete));
      const { data: autreOperation } = await db.from("intervenant_signature_preuves").select("id, document_id, requete_empreinte").eq("operation_id", body.operation_id).maybeSingle();
      if (autreOperation && (autreOperation.document_id !== doc.id || autreOperation.requete_empreinte !== requeteEmpreinte)) return J({ error: "Cet identifiant d'opération a déjà servi à une autre signature" }, 409);

      const signeLe = new Date().toISOString();
      const signeLeParis = paris(signeLe);
      const sections: SectionPdfIntervenant[] = [];
      if (type === "contrat") {
        const fige = texteObjet(doc.texte_fige);
        sections.push({ titre: "Parties", lignes: [
          `SERVICES PRO, SAS, SIRET ${fige.identites.centre.siret}, ${fige.identites.centre.adresse}, représentée par ${fige.identites.centre.representant}.`,
          `${fige.identites.intervenant.denomination}, ${fige.identites.intervenant.forme}, SIRET ${fige.identites.intervenant.siret}, ${fige.identites.intervenant.adresse}.`,
        ] });
        for (const s of fige.sections) sections.push({ titre: s.titre, lignes: [...s.lignes] });
        sections.push({ titre: "Confirmation du prestataire", lignes: ["Albert AKONO confirme expressément que la collaboration a débuté courant 2021. Cette confirmation ne prouve aucune heure historique."] });
      } else if (type === "competences") {
        sections.push({ titre: "Texte et conditions de la déclaration", lignes: [texteObjet(original.texte_fige)?.declaration || "Aucun texte de déclaration dans le modèle figé."] });
        sections.push({ titre: "Réponses déclaratives de l'intervenant", lignes: COMPETENCES_CHAMPS.map(c => `${c.label}\n${original.reponses?.[c.id] || "Non renseigné"}`) });
        const fichiers = Array.isArray(original.reponses?.fichiers) ? original.reponses.fichiers : [];
        sections.push({ titre: "Justificatifs associés", lignes: fichiers.length ? fichiers.map((f: any, i: number) => `${i + 1}. ${f.name || f.path}\nEmpreinte : ${f.hash || "non enregistrée"}`) : ["Aucun fichier associé à la déclaration."] });
        sections.push({ titre: "Portée de la signature", lignes: ["La signature atteste de la déclaration de l'intervenant. Elle ne vaut ni vérification des justificatifs, ni validation des compétences, ni modification des indicateurs Qualiopi."] });
      } else {
        const fige = texteObjet(doc.texte_fige);
        sections.push({ titre: "Objet et portée", lignes: [fige.introduction, fige.echelle] });
        sections.push({ titre: "Appréciations du formateur", lignes: SATISFACTION_NOTES.map(q => `${q.label} : ${doc.reponses?.[q.id]}/5`) });
        sections.push({ titre: "Réponses libres", lignes: SATISFACTION_TEXTES.map(q => `${q.label}\n${doc.reponses?.[q.id] || "—"}`) });
        sections.push({ titre: "Portée de la signature", lignes: ["La signature atteste des réponses du formateur. Elle ne vaut ni traitement automatique des améliorations proposées, ni validation automatique de l'indicateur Qualiopi 30."] });
      }
      const pdf = await genererPdfIntervenant({
        titre: titreDocument(doc.texte_fige, type === "satisfaction" ? TITRE_SATISFACTION : undefined),
        destinataire: `${original.destinataire_nom}`,
        sections, empreinteSource: doc.texte_empreinte, operationId: body.operation_id, apercu: false,
        signature: { dataUrl: body.signature, signeLeParis, consentement: CONSENTEMENTS_INTERVENANT[type] },
        noteFin: type === "contrat" ? "Signature de SERVICES PRO non recueillie dans ce parcours ; aucune signature du centre n'est présumée." : type === "satisfaction" ? "Analyse des réponses et décision Qualiopi distinctes, à effectuer explicitement par un administrateur." : "Revue administrative et validation des compétences distinctes, à effectuer explicitement par un administrateur.",
      });
      const pdfEmpreinte = await sha256(pdf);
      const formateurId = original.identite_figee?.formateur_id;
      if (typeof formateurId !== "string" || !formateurId) return J({ error: "Identité formateur figée absente : signature refusée" }, 409);
      const pdfPath = `intervenants/${formateurId}/${doc.id}/${body.operation_id}.pdf`;
      const upload = await db.storage.from(BUCKET).upload(pdfPath, pdf, { contentType: "application/pdf", upsert: false });
      if (upload.error) {
        const existant = await db.storage.from(BUCKET).download(pdfPath);
        if (existant.error || await sha256(new Uint8Array(await existant.data.arrayBuffer())) !== pdfEmpreinte) return J({ error: "Le PDF n'a pas pu être enregistré sans ambiguïté ; contactez l'administrateur" }, 500);
      }
      const relu = await db.storage.from(BUCKET).download(pdfPath);
      if (relu.error || await sha256(new Uint8Array(await relu.data.arrayBuffer())) !== pdfEmpreinte) return J({ error: "Le contrôle d'intégrité du PDF a échoué" }, 500);
      const { data: preuve, error } = await db.from("intervenant_signature_preuves").insert({
        id: uid(), document_id: doc.id, operation_id: body.operation_id, document_empreinte: doc.texte_empreinte,
        requete_empreinte: requeteEmpreinte, consentement_texte: CONSENTEMENTS_INTERVENANT[type], signature_data_url: body.signature,
        signature_empreinte: signatureEmpreinte, pdf_path: pdfPath, pdf_empreinte: pdfEmpreinte,
        charge_utile: { type, modele_code: doc.modele_code, modele_version: doc.modele_version, collaboration_2021: type === "contrat" ? true : null },
        signed_at: signeLe, signe_le_paris: signeLeParis, user_agent: String(req.headers.get("user-agent") || "").slice(0, 500),
      }).select("id, document_id, operation_id, document_empreinte, signature_empreinte, pdf_path, pdf_empreinte, signed_at, signe_le_paris").single();
      if (error) {
        const apresConflit = await preuvePour(doc.id);
        if (apresConflit) return J({ ok: true, deja_signe: true, document_id: doc.id, signature: preuveVue(apresConflit) });
        return J({ error: "La preuve de signature n'a pas pu être enregistrée ; aucune confirmation affichée" }, 500);
      }
      if (!await audit(null, "intervenant.document.signe", preuve.id, "signature_intervenant", { document_id: doc.id, type, operation_id: body.operation_id, empreinte_pdf: pdfEmpreinte, empreinte_signature: signatureEmpreinte })) return J({ error: "Signature enregistrée mais audit incomplet : recommencez avec la même opération pour finaliser", document_id: doc.id, enregistre: true }, 409);
      return J({ ok: true, document_id: doc.id, signature: preuveVue(preuve) });
    }

    if (action === "attach_qualiopi") {
      if (body?.confirmation_relecture !== true) return J({ error: "Une relecture humaine explicite est obligatoire" }, 400);
      const original = await originalParId(body?.document_competences_id);
      if (!original) return J({ error: "Déclaration introuvable" }, 404);
      const { contrat, satisfaction } = await documentsLies(original);
      const type: TypeDocumentIntervenant | null = body?.document_id === original.id ? "competences" : contrat && body?.document_id === contrat.id ? "contrat" : satisfaction && body?.document_id === satisfaction.id ? "satisfaction" : null;
      const indicateur = type === "competences" ? 21 : type === "contrat" ? 27 : type === "satisfaction" ? 30 : null;
      if (!type || !indicateur) return J({ error: "Document ou rattachement Qualiopi non pertinent" }, 400);
      const preuve = await preuvePour(body.document_id);
      if (!preuve) return J({ error: "Seul un document effectivement signé peut être rattaché" }, 409);
      const relu = await db.storage.from(BUCKET).download(preuve.pdf_path);
      if (relu.error || await sha256(new Uint8Array(await relu.data.arrayBuffer())) !== preuve.pdf_empreinte) return J({ error: "Intégrité du PDF non confirmée : rattachement refusé" }, 409);
      const ref = `intervenant-signature:${preuve.id}:i${indicateur}`;
      const { data: existante } = await db.from("qualiopi_preuves").select("id").eq("ref_key", ref).maybeSingle();
      let preuveId = existante?.id;
      if (!preuveId) {
        const titre = type === "contrat" ? "Contrat-cadre signé" : type === "satisfaction" ? "Enquête de satisfaction formateur signée" : "Déclaration de compétences signée";
        const { data: ajout, error } = await db.from("qualiopi_preuves").insert({
          titre: `${titre} — ${original.destinataire_nom}`,
          description: `PDF privé relu avant rattachement. Empreinte ${preuve.pdf_empreinte}. Cette preuve ne change pas automatiquement le statut de l'indicateur.`,
          ce_que_demontre: type === "contrat" ? "Existence et intégrité d'un contrat-cadre signé par l'intervenant ; signature du centre et effectivité à vérifier séparément." : type === "satisfaction" ? "Réponses datées et signées du formateur ; exploitation et analyse de la satisfaction à examiner séparément." : "Déclaration manuscrite et datée de l'intervenant ; compétences non validées automatiquement.",
          remarque_interne: "Preuve documentaire seule, sans conformité automatique ni attestation d'heures historiques.",
          emplacement: `Documents privés : ${preuve.pdf_path}`,
          date_preuve: preuve.signed_at.slice(0, 10), fichiers: [{ path: preuve.pdf_path, sha256: preuve.pdf_empreinte, type: "application/pdf" }],
          source_type: "signature_intervenant", source_table: "intervenant_signature_preuves", source_id: preuve.id, ref_key: ref, created_by: adminId,
        }).select("id").single();
        if (error) return J({ error: "Création de la fiche preuve impossible : " + error.message }, 400);
        preuveId = ajout.id;
      }
      const { data: lien } = await db.from("qualiopi_preuve_liens").select("id").eq("preuve_id", preuveId).eq("indicateur", indicateur).maybeSingle();
      if (!lien) {
        const { error } = await db.from("qualiopi_preuve_liens").insert({ preuve_id: preuveId, indicateur, justification: `Document intervenant signé et relu ; indicateur ${indicateur}, sans changement automatique de statut.` });
        if (error) return J({ error: "Rattachement impossible : " + error.message }, 400);
      }
      await audit(adminId, "intervenant.preuve.qualiopi.rattachee", preuveId, "qualiopi_preuve", { signature_preuve_id: preuve.id, indicateur, statut_modifie: false });
      return J({ ok: true, preuve_id: preuveId, indicateur, statut_modifie: false });
    }

    if (action === "send_link") {
      if (body?.confirmation_envoi !== true || body?.confirmation_destinataire !== "contact@speakenglish4real.com") return J({ error: "Confirmation explicite du destinataire unique obligatoire" }, 400);
      const original = await originalParToken();
      if (!original) return J({ error: "Lien invalide ou expiré" }, 404);
      if (original.destinataire_email !== "contact@speakenglish4real.com") return J({ error: "Destinataire du dossier non conforme" }, 403);
      if (original.envoye_le) return J({ ok: true, deja_envoye: true, envoye_le: original.envoye_le });
      if (original.envoi_tente_le) return J({ error: "Un envoi précédent est à vérifier ; aucun renvoi automatique", envoi: "indetermine" }, 409);
      const { contrat, satisfaction } = await documentsLies(original);
      if (!contrat || !satisfaction) return J({ error: "Les trois documents ne sont pas tous préparés ; envoi refusé" }, 409);
      const productionUrl = `https://gestion.ftransport.fr/competences-intervenant/${original.token}`;
      let page: Response;
      try { page = await fetch(productionUrl, { headers: { "Cache-Control": "no-cache" }, redirect: "follow" }); }
      catch { return J({ error: "Lien de production injoignable ; aucun envoi" }, 409); }
      if (!page.ok || new URL(page.url).origin !== "https://gestion.ftransport.fr" || !(await page.text()).includes('id="root"')) return J({ error: "Lien de production non vérifié ; aucun envoi" }, 409);
      const objet = "Vos trois documents formateur SERVICES PRO — lien sécurisé unique";
      const corps = `<p>Bonjour ${html(original.destinataire_nom)},</p><p>Voici votre lien sécurisé unique pour les trois documents suivants :</p><ol><li>bilan et justification des compétences ;</li><li>contrat-cadre de prestation de formation — anglais ;</li><li>enquête de satisfaction formateur.</li></ol><p><a href="${productionUrl}">Accéder à mes trois documents</a></p><p>Pour chaque document, complétez d'abord les informations demandées, relisez-les, puis confirmez et signez séparément à la souris ou au doigt. Le contrat demande aussi votre confirmation explicite concernant le début de collaboration courant 2021.</p><p>Ce lien est individuel et valable jusqu'au 24 décembre 2026 inclus. Ne le transmettez pas. En cas de difficulté, contactez contact@ftransport.fr.</p>`;
      const tentative = new Date().toISOString();
      const { data: reserve, error: reservationError } = await db.from("documents_a_signer").update({ envoi_etat: "en_cours", envoi_tente_le: tentative, mail_objet_fige: objet, mail_html_fige: corps, envoi_erreur: null }).eq("id", original.id).is("envoye_le", null).is("envoi_tente_le", null).select("id").maybeSingle();
      if (reservationError || !reserve?.id) return J({ error: "Envoi déjà réservé ou dossier figé ; aucun nouvel envoi", envoi: "indetermine" }, 409);
      try {
        const trackingId = await sendBrandedEmail({ to: original.destinataire_email, subject: objet, html: corps, replyTo: "contact@ftransport.fr" });
        if (!trackingId) throw new Error("Aucun accusé d'envoi confirmé");
        const { data: accuse } = await db.from("email_accuses").select("provider_message_id, statut").eq("id", trackingId).maybeSingle();
        const envoyeLe = new Date().toISOString();
        const { data: confirme, error: confirmationError } = await db.from("documents_a_signer").update({ envoi_etat: "envoye", envoye_le: envoyeLe, envoi_erreur: null }).eq("id", original.id).is("envoye_le", null).select("id, envoye_le").maybeSingle();
        if (confirmationError || !confirme?.id) return J({ error: "Envoi accepté mais confirmation locale à vérifier ; ne pas renvoyer", envoi: "indetermine" }, 500);
        const auditOk = await audit(null, "intervenant.parcours.envoye", original.id, "document_intervenant", { destinataire: original.destinataire_email, documents: [original.id, contrat.id, satisfaction.id], accuse_id: trackingId, fournisseur_message_id: accuse?.provider_message_id ?? null, envoye_le: envoyeLe });
        return J({ ok: true, envoye: true, envoye_le: envoyeLe, accuse_id: trackingId, fournisseur_message_id: accuse?.provider_message_id ?? null, audit_a_verifier: !auditOk });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Résultat d'envoi inconnu";
        await db.from("documents_a_signer").update({ envoi_etat: "indetermine", envoi_erreur: message.slice(0, 500) }).eq("id", original.id).is("envoye_le", null);
        await audit(null, "intervenant.parcours.envoi.indetermine", original.id, "document_intervenant", { destinataire: original.destinataire_email, erreur: message.slice(0, 500) });
        return J({ error: "Envoi non confirmé ; aucun renvoi automatique", details: message.slice(0, 300), envoi: "indetermine" }, 502);
      }
    }
    return J({ error: "Action inconnue" }, 400);
  } catch (e) {
    console.error("intervenant-signature", e instanceof Error ? e.message : e);
    return J({ error: e instanceof Error ? e.message : "Erreur serveur" }, 500);
  }
});
