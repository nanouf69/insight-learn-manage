import { cheminDocumentUnique } from "./chemin.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { DOCUMENT_MAX_BYTES, documentValidation, verifyOnboardingDocumentToken } from '../_shared/documentUploadRules.ts';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405);
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const apprenantId = formData.get("apprenant_id") as string | null;
    const titre = (formData.get("titre") as string) || "Devis formation";
    const typeDocument = (formData.get("type_document") as string) || "devis";

    if (!(file instanceof File) || !apprenantId || !/^[0-9a-f-]{36}$/i.test(apprenantId) || !/^[a-z0-9_-]{1,150}$/i.test(typeDocument) || titre.length > 500) {
      return new Response(JSON.stringify({ error: "file et apprenant_id requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (file.size > DOCUMENT_MAX_BYTES) {
      return new Response(JSON.stringify({ error: "Fichier trop volumineux (max 4 Mo)" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = Deno.env.get('SUPABASE_URL');
    const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !secret) return json({ error: 'Service documentaire indisponible' }, 503);
    const supabase = createClient(url, secret);
    if (!typeDocument.startsWith('libre')) {
      const invalid = documentValidation(file, typeDocument === 'photo_identite');
      if (invalid) return json({ error: invalid }, 400);
    }
    const operation = String(formData.get('operation_id') ?? crypto.randomUUID());
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(operation)) return json({ error: 'Identifiant opération invalide' }, 400);
    const token = String(formData.get('session_token') ?? '');
    const onboardingAuthorized = await verifyOnboardingDocumentToken(apprenantId, token, secret);
    const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
    const { data: userData } = jwt ? await supabase.auth.getUser(jwt) : { data: { user: null } };
    const userId = userData.user?.id;
    if (!onboardingAuthorized && !userId) return json({ error: 'Session expirée. Reconnectez-vous ou rouvrez votre lien de bienvenue ; le fichier est conservé.' }, 401);

    const { data: apprenant, error: appError } = await supabase
      .from("apprenants")
      .select("id, nom, prenom, auth_user_id")
      .eq("id", apprenantId)
      .single();

    if (appError || !apprenant) {
      return new Response(JSON.stringify({ error: "Apprenant non trouvé" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!onboardingAuthorized && apprenant.auth_user_id !== userId) {
      const { data: admin, error: roleError } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' });
      if (roleError || !admin) return json({ error: 'Vous ne pouvez pas déposer un document pour ce dossier.' }, 403);
    }

    const ext = file.name.split(".").pop() || "pdf";
    const arrayBuffer = await file.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    const storagePath = `${apprenantId}/${typeDocument}-${operation}-${hash}.${ext.replace(/[^a-z0-9]/gi, '')}`;
    const success = (path: string, name: string) => json({ success: true, confirmed: true, operationId: operation, storagePath: path, fileName: name, publicUrl: supabase.storage.from('documents-inscription').getPublicUrl(path).data.publicUrl });
    const readOperation = () => supabase.from('documents_inscription').select('id, apprenant_id, type_document, url, nom_fichier').eq('id', operation).maybeSingle();
    const { data: existing, error: existingError } = await readOperation();
    if (existingError) return json({ error: 'Lecture de confirmation impossible. Réessayez le même fichier.' }, 503);
    if (existing) {
      if (existing.apprenant_id !== apprenantId || existing.type_document !== typeDocument || existing.url !== storagePath) return json({ error: 'Cette opération concerne un autre document ; aucun remplacement effectué.' }, 409);
      return success(storagePath, existing.nom_fichier ?? file.name);
    }
    const { error: uploadError } = await supabase.storage
      .from("documents-inscription")
      .upload(storagePath, arrayBuffer, {
        contentType: file.type || "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      // A timed-out request may already have stored this exact operation/hash.
      const { data: stored } = await supabase.storage.from('documents-inscription').download(storagePath);
      const storedHash = stored ? Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await stored.arrayBuffer())), byte => byte.toString(16).padStart(2, '0')).join('') : null;
      if (storedHash !== hash) return new Response(JSON.stringify({ error: "Stockage indisponible. Réessayez le fichier conservé." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // AUCUNE DONNÉE ÉLÈVE NE DISPARAÎT : les versions précédentes (ligne + fichier)
    // sont conservées. Les lectures prennent la plus récente (created_at desc).
    // Avant le 15/10/2026, chaque nouvel envoi supprimait ligne ET fichier
    // précédents (3 récapitulatifs perdus le 14/10/2026 09:59 UTC, 11:59 Paris).

    const { error: dbError } = await supabase
      .from("documents_inscription")
      .insert({
        id: operation,
        apprenant_id: apprenantId,
        titre,
        type_document: typeDocument,
        nom_fichier: file.name,
        url: storagePath,
        statut: "valid",
      });

    if (dbError) {
      const { data: confirmed } = await readOperation();
      if (confirmed?.apprenant_id === apprenantId && confirmed.url === storagePath) return success(storagePath, confirmed.nom_fichier ?? file.name);
      console.error('document confirmation failed', { operation, code: dbError.code });
      // Retain the uploaded file for an idempotent retry, never remove a version.
      return new Response(JSON.stringify({ error: "Confirmation impossible. Fichier conservé ; réessayez la même opération." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("alertes_systeme").insert({
      type: "document_upload",
      titre: "Nouveau document recu",
      message: `${apprenant.prenom} ${apprenant.nom} a uploade "${titre}"`,
      details: `Type: ${typeDocument} | Fichier: ${file.name}`,
    });

    return success(storagePath, file.name);
  } catch (err) {
    console.error("Document upload interrupted", { type: err instanceof Error ? err.name : 'unknown' });
    return new Response(JSON.stringify({ error: "Envoi interrompu. Votre fichier et les versions précédentes sont conservés ; réessayez." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
