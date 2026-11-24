import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { validerSignaturePng } from "../_shared/signaturePng.ts";
import { COMPETENCES_CHAMPS, COMPETENCES_MODELE } from "../_shared/competencesIntervenant.ts";
import { CONSENTEMENTS_INTERVENANT, CONTRAT_MODELE, CONTRAT_VERSION, MESSAGE_TROISIEME_DOCUMENT, empreinteVueValide, operationIdValide, texteContratFige, type TypeDocumentIntervenant } from "../_shared/parcoursIntervenant.ts";
import { genererPdfIntervenant, type SectionPdfIntervenant } from "../_shared/parcoursIntervenantPdf.ts";

const BUCKET = "documents-a-signer";
const J = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } });
const sha256 = async (value: string | Uint8Array) => {
  const source = typeof value === "string" ? new TextEncoder().encode(value) : value;
  const bytes = new Uint8Array(source.byteLength); bytes.set(source);
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes.buffer))).map(x => x.toString(16).padStart(2, "0")).join("");
};
const titreDocument = (texte: any) => texte?.titre || "Bilan et justification des compétences";
const paris = (iso: string) => new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", dateStyle: "full", timeStyle: "long" }).format(new Date(iso));
const uid = () => globalThis.crypto.randomUUID();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return J({ error: "Méthode non autorisée" }, 405);
  const db: any = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    const body = await req.json();
    const action = body?.action;
    const adminActions = ["admin_get", "prepare", "attach_qualiopi"];
    let adminId: string | null = null;
    if (adminActions.includes(action)) {
      const token = req.headers.get("Authorization")?.replace("Bearer ", "");
      const { data: auth } = await db.auth.getUser(token);
      adminId = auth?.user?.id ?? null;
      if (!adminId) return J({ error: "Authentification administrateur requise" }, 401);
      const { data: admin } = await db.from("user_roles").select("role").eq("user_id", adminId).eq("role", "admin").maybeSingle();
      if (!admin) return J({ error: "Rôle administrateur requis" }, 403);
    }

    const originalFields = "id, nom, modele_code, modele_version, destinataire_nom, destinataire_email, texte_fige, champs, reponses, statut, signed_at, texte_empreinte, identite_figee";
    const originalParId = async (id: unknown) => {
      if (typeof id !== "string") return null;
      const { data, error } = await db.from("documents_a_signer").select(originalFields).eq("id", id).eq("modele_code", COMPETENCES_MODELE).is("apprenant_id", null).maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    };
    const originalParToken = async () => {
      if (typeof body?.token !== "string" || body.token.length < 32 || body.token.length > 128) return null;
      const { data, error } = await db.from("documents_a_signer").select(originalFields).eq("token", body.token).eq("modele_code", COMPETENCES_MODELE).is("apprenant_id", null).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;
      const expire = data.texte_fige?.expires_at || data.texte_fige?.expire_le;
      if (expire && new Date(expire) < new Date()) return null;
      return data;
    };
    const contratPour = async (original: any) => {
      const { data, error } = await db.from("documents_a_signer").select("id, modele_code, modele_version, cle_envoi, destinataire_nom, destinataire_email, texte_fige, texte_empreinte, statut, created_at").eq("modele_code", CONTRAT_MODELE).eq("cle_envoi", original.id).is("apprenant_id", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    };
    const preuvePour = async (documentId: string) => {
      const { data, error } = await db.from("intervenant_signature_preuves").select("id, document_id, operation_id, document_empreinte, requete_empreinte, consentement_texte, signature_empreinte, pdf_path, pdf_empreinte, charge_utile, signed_at, signe_le_paris, created_at").eq("document_id", documentId).maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    };
    const preuveVue = (p: any) => p ? { id: p.id, operation_id: p.operation_id, document_empreinte: p.document_empreinte, signature_empreinte: p.signature_empreinte, pdf_empreinte: p.pdf_empreinte, signed_at: p.signed_at, signe_le_paris: p.signe_le_paris } : null;
    const vueParcours = async (original: any) => {
      const contrat = await contratPour(original);
      const [preuveCompetences, preuveContrat] = await Promise.all([preuvePour(original.id), contrat ? preuvePour(contrat.id) : null]);
      return {
        documents: [
          { type: "competences" as const, document_id: original.id, titre: titreDocument(original.texte_fige), texte_fige: original.texte_fige, statut_source: original.statut, signed_at_source: original.signed_at, empreinte: original.texte_empreinte, signature: preuveVue(preuveCompetences) },
          { type: "contrat" as const, document_id: contrat?.id ?? null, titre: "CONTRAT-CADRE DE PRESTATION DE FORMATION — ANGLAIS", texte_fige: contrat?.texte_fige ?? texteContratFige(), statut_source: contrat?.statut ?? "apercu", signed_at_source: null, empreinte: contrat?.texte_empreinte ?? null, signature: preuveVue(preuveContrat), preparation_requise: !contrat },
        ],
        troisieme_document: { statut: "a_identifier", message: MESSAGE_TROISIEME_DOCUMENT },
        aucun_envoi: true,
      };
    };
    const audit = async (admin: string | null, operation: string, cibleId: string, cible: string, charge: Record<string, unknown>) => {
      const { data: existant, error: lecture } = await db.from("audit_journal").select("id").eq("operation", operation).eq("cible_id", cibleId).maybeSingle();
      if (lecture) return false;
      if (existant) return true;
      const { error } = await db.from("audit_journal").insert({ operation, cible_type: cible, cible_id: cibleId, auteur: admin, apres: charge, origine: "parcours-intervenant" });
      return !error;
    };

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
      if (body?.confirmation_contenu !== true) return J({ error: "La relecture et la confirmation du contenu sont obligatoires" }, 400);
      const original = await originalParId(body?.document_id);
      if (!original) return J({ error: "Déclaration de compétences introuvable" }, 404);
      const existant = await contratPour(original);
      if (existant) return J({ ok: true, deja_prepare: true, document_id: existant.id, aucun_envoi: true });
      const texte = texteContratFige("valide_pour_signature");
      const empreinte = await sha256(JSON.stringify(texte));
      const identite = original.identite_figee || {};
      const { data: contrat, error } = await db.from("documents_a_signer").insert({
        id: uid(), token: Array.from(crypto.getRandomValues(new Uint8Array(24))).map(x => x.toString(16).padStart(2, "0")).join(""), cle_envoi: original.id, apprenant_id: null,
        nom: texte.titre, destinataire_nom: original.destinataire_nom, destinataire_email: original.destinataire_email,
        modele_code: CONTRAT_MODELE, modele_version: CONTRAT_VERSION,
        texte_fige: texte, champs: [], reponses: {}, identite_figee: identite, file_path: "", statut: "brouillon",
        texte_empreinte: empreinte, created_by: adminId,
      }).select("id, texte_empreinte").single();
      if (error) {
        const apresConflit = await contratPour(original);
        if (apresConflit) return J({ ok: true, deja_prepare: true, document_id: apresConflit.id, aucun_envoi: true });
        return J({ error: "Préparation impossible : " + error.message }, 400);
      }
      if (!await audit(adminId, "intervenant.contrat.prepare", contrat.id, "document_intervenant", { document_competences_id: original.id, empreinte, aucun_envoi: true })) return J({ error: "Contrat préparé, mais piste d'audit à vérifier", document_id: contrat.id }, 409);
      return J({ ok: true, document_id: contrat.id, texte_empreinte: contrat.texte_empreinte, aucun_envoi: true });
    }

    if (action === "pdf") {
      const original = await originalParToken();
      if (!original) return J({ error: "Lien invalide ou expiré" }, 404);
      const contrat = await contratPour(original);
      const documentId = body?.document_id === original.id ? original.id : contrat && body?.document_id === contrat.id ? contrat.id : null;
      if (!documentId) return J({ error: "Document hors de ce lien individuel" }, 403);
      const preuve = await preuvePour(documentId);
      if (!preuve) return J({ error: "Document non signé" }, 404);
      const { data, error } = await db.storage.from(BUCKET).createSignedUrl(preuve.pdf_path, 300, { download: true });
      if (error) return J({ error: "PDF privé indisponible" }, 500);
      return J({ url: data.signedUrl, pdf_empreinte: preuve.pdf_empreinte, signed_at: preuve.signed_at });
    }

    if (action === "sign") {
      const original = await originalParToken();
      if (!original) return J({ error: "Lien invalide ou expiré" }, 404);
      if (!operationIdValide(body?.operation_id)) return J({ error: "Identifiant d'opération invalide" }, 400);
      const contrat = await contratPour(original);
      const type: TypeDocumentIntervenant | null = body?.document_id === original.id ? "competences" : contrat && body?.document_id === contrat.id ? "contrat" : null;
      if (!type) return J({ error: "Document inexistant, hors de ce lien ou encore seulement en aperçu" }, 403);
      const doc = type === "competences" ? original : contrat;
      const deja = await preuvePour(doc.id);
      if (deja) {
        if (!await audit(null, "intervenant.document.signe", deja.id, "signature_intervenant", { document_id: doc.id, type, operation_id: deja.operation_id, empreinte_pdf: deja.pdf_empreinte, rappel_idempotent: true })) return J({ error: "Signature déjà enregistrée ; audit à vérifier, ne recréez pas d'opération" }, 409);
        return J({ ok: true, deja_signe: true, document_id: doc.id, signature: preuveVue(deja) });
      }
      if (doc.texte_empreinte !== body?.empreinte_vue || !empreinteVueValide(body?.empreinte_vue)) return J({ error: "Le contenu a changé ou son empreinte est absente : rechargez et relisez le document" }, 409);
      if (await sha256(JSON.stringify(doc.texte_fige)) !== doc.texte_empreinte) return J({ error: "L'intégrité du texte source n'est pas confirmée : signature refusée" }, 409);
      if (body?.consentement !== true) return J({ error: "Le consentement explicite est obligatoire" }, 400);
      if (type === "competences" && (original.statut !== "signe" || !original.signed_at || original.reponses?.declaration_acceptee !== true)) return J({ error: "Remettez d'abord la déclaration de compétences avec ses justificatifs" }, 409);
      if (type === "contrat" && body?.collaboration_2021 !== true) return J({ error: "Confirmez le début de collaboration courant 2021 ou demandez une correction avant de signer" }, 409);
      const signatureValide = await validerSignaturePng(body?.signature);
      if (!signatureValide.ok) return J({ error: `Signature manuscrite invalide (${signatureValide.raison})` }, 400);
      const signatureEmpreinte = await sha256(body.signature);
      const requete = { document_id: doc.id, document_empreinte: doc.texte_empreinte, consentement: CONSENTEMENTS_INTERVENANT[type], signature_empreinte: signatureEmpreinte, collaboration_2021: type === "contrat" ? true : null };
      const requeteEmpreinte = await sha256(JSON.stringify(requete));
      const { data: autreOperation } = await db.from("intervenant_signature_preuves").select("id, document_id, requete_empreinte").eq("operation_id", body.operation_id).maybeSingle();
      if (autreOperation && (autreOperation.document_id !== doc.id || autreOperation.requete_empreinte !== requeteEmpreinte)) return J({ error: "Cet identifiant d'opération a déjà servi à une autre signature" }, 409);

      const signeLe = new Date().toISOString();
      const signeLeParis = paris(signeLe);
      const sections: SectionPdfIntervenant[] = [];
      if (type === "contrat") {
        const fige = doc.texte_fige;
        sections.push({ titre: "Parties", lignes: [
          `SERVICES PRO, SAS, SIRET ${fige.identites.centre.siret}, ${fige.identites.centre.adresse}, représentée par ${fige.identites.centre.representant}.`,
          `${fige.identites.intervenant.denomination}, ${fige.identites.intervenant.forme}, SIRET ${fige.identites.intervenant.siret}, ${fige.identites.intervenant.adresse}.`,
        ] });
        for (const s of fige.sections) sections.push({ titre: s.titre, lignes: [...s.lignes] });
        sections.push({ titre: "Confirmation du prestataire", lignes: ["Albert AKONO confirme expressément que la collaboration a débuté courant 2021. Cette confirmation ne prouve aucune heure historique."] });
      } else {
        sections.push({ titre: "Texte et conditions de la déclaration", lignes: [original.texte_fige?.declaration || "Aucun texte de déclaration dans le modèle figé."] });
        sections.push({ titre: "Réponses déclaratives de l'intervenant", lignes: COMPETENCES_CHAMPS.map(c => `${c.label}\n${original.reponses?.[c.id] || "Non renseigné"}`) });
        const fichiers = Array.isArray(original.reponses?.fichiers) ? original.reponses.fichiers : [];
        sections.push({ titre: "Justificatifs associés", lignes: fichiers.length ? fichiers.map((f: any, i: number) => `${i + 1}. ${f.name || f.path}\nEmpreinte : ${f.hash || "non enregistrée"}`) : ["Aucun fichier associé à la déclaration."] });
        sections.push({ titre: "Portée de la signature", lignes: ["La signature atteste de la déclaration de l'intervenant. Elle ne vaut ni vérification des justificatifs, ni validation des compétences, ni modification des indicateurs Qualiopi."] });
      }
      const pdf = await genererPdfIntervenant({
        titre: type === "contrat" ? doc.texte_fige.titre : titreDocument(original.texte_fige),
        destinataire: `${original.destinataire_nom}`,
        sections, empreinteSource: doc.texte_empreinte, operationId: body.operation_id, apercu: false,
        signature: { dataUrl: body.signature, signeLeParis, consentement: CONSENTEMENTS_INTERVENANT[type] },
        noteFin: type === "contrat" ? "Signature de SERVICES PRO non recueillie dans ce parcours ; aucune signature du centre n'est présumée." : "Revue administrative et validation des compétences distinctes, à effectuer explicitement par un administrateur.",
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
      const contrat = await contratPour(original);
      const type: TypeDocumentIntervenant | null = body?.document_id === original.id ? "competences" : contrat && body?.document_id === contrat.id ? "contrat" : null;
      const indicateur = type === "competences" ? 21 : type === "contrat" ? 27 : null;
      if (!type || !indicateur) return J({ error: "Document ou rattachement Qualiopi non pertinent" }, 400);
      const preuve = await preuvePour(body.document_id);
      if (!preuve) return J({ error: "Seul un document effectivement signé peut être rattaché" }, 409);
      const relu = await db.storage.from(BUCKET).download(preuve.pdf_path);
      if (relu.error || await sha256(new Uint8Array(await relu.data.arrayBuffer())) !== preuve.pdf_empreinte) return J({ error: "Intégrité du PDF non confirmée : rattachement refusé" }, 409);
      const ref = `intervenant-signature:${preuve.id}:i${indicateur}`;
      const { data: existante } = await db.from("qualiopi_preuves").select("id").eq("ref_key", ref).maybeSingle();
      let preuveId = existante?.id;
      if (!preuveId) {
        const { data: ajout, error } = await db.from("qualiopi_preuves").insert({
          titre: `${type === "contrat" ? "Contrat-cadre signé" : "Déclaration de compétences signée"} — ${original.destinataire_nom}`,
          description: `PDF privé relu avant rattachement. Empreinte ${preuve.pdf_empreinte}. Cette preuve ne change pas automatiquement le statut de l'indicateur.`,
          ce_que_demontre: type === "contrat" ? "Existence et intégrité d'un contrat-cadre signé par l'intervenant ; signature du centre et effectivité à vérifier séparément." : "Déclaration manuscrite et datée de l'intervenant ; compétences non validées automatiquement.",
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
    return J({ error: "Action inconnue" }, 400);
  } catch (e) {
    console.error("intervenant-signature", e instanceof Error ? e.message : e);
    return J({ error: e instanceof Error ? e.message : "Erreur serveur" }, 500);
  }
});
