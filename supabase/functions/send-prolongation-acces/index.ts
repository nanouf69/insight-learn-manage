import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { sendBrandedEmail, estEmailValide } from "../_shared/send-branded-email.ts";
import { construireMailProlongation } from "../_shared/prolongation-email.ts";

// Envoie l'e-mail « Prolongation » pour UNE prolongation déjà enregistrée.
// N'ajoute jamais de mois, ne crée aucun compte, ne touche à aucun identifiant.
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Non autorisé" }, 401);
    const caller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: claims, error: cErr } = await caller.auth.getClaims(auth.replace("Bearer ", ""));
    const uid = claims?.claims?.sub;
    if (cErr || !uid) return json({ error: "Non autorisé" }, 401);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: uid, _role: "admin" });
    if (!isAdmin) return json({ error: "Réservé aux administrateurs" }, 403);

    const body = await req.json().catch(() => ({}));
    const extensionId = typeof body?.extension_id === "string" && /^[0-9a-f-]{36}$/i.test(body.extension_id) ? body.extension_id : null;
    if (!extensionId) return json({ error: "Prolongation inconnue" }, 400);

    const { data: ext, error: eErr } = await admin.from("crm_acces_extensions").select("id, apprenant_id, fin").eq("id", extensionId).maybeSingle();
    if (eErr) throw eErr;
    if (!ext) return json({ error: "Prolongation inconnue" }, 404);

    // Libère un envoi resté « en cours » plus de 10 minutes (fonction interrompue).
    await admin.from("crm_prolongation_emails").update({ statut: "echec", erreur: "Envoi interrompu", termine_at: new Date().toISOString() })
      .eq("extension_id", ext.id).eq("statut", "en_cours").lt("created_at", new Date(Date.now() - 10 * 60_000).toISOString());

    const { data: dejaEnvoye } = await admin.from("crm_prolongation_emails").select("id").eq("extension_id", ext.id).eq("statut", "envoye").maybeSingle();
    if (dejaEnvoye) return json({ statut: "envoye", deja: true });

    const { data: a, error: aErr } = await admin.from("apprenants").select("id, prenom, email, emails_bloques").eq("id", ext.apprenant_id).single();
    if (aErr) throw aErr;
    const to = String(a.email ?? "").trim();

    const { data: claim, error: claimErr } = await admin.from("crm_prolongation_emails")
      .insert({ extension_id: ext.id, apprenant_id: a.id, destinataire: to || null, auteur: uid }).select("id").single();
    if (claimErr) {
      if (claimErr.code === "23505") return json({ error: "Envoi déjà en cours" }, 409);
      throw claimErr;
    }
    const finir = (patch: Record<string, unknown>) => admin.from("crm_prolongation_emails").update({ ...patch, termine_at: new Date().toISOString() }).eq("id", claim.id);

    if (!estEmailValide(to)) {
      await finir({ statut: "echec", erreur: "Aucune adresse e-mail valide" });
      return json({ statut: "echec", error: "Aucune adresse e-mail valide pour cet apprenant" }, 422);
    }

    const mail = construireMailProlongation({ prenom: a.prenom, fin: ext.fin });
    try {
      if (a.emails_bloques === true) throw new Error("Envois d'e-mails bloqués pour cet apprenant");
      await sendBrandedEmail({ to, subject: mail.subject, html: mail.html, replyTo: "contact@ftransport.fr" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await finir({ statut: "echec", erreur: msg.slice(0, 500) });
      return json({ statut: "echec", error: msg }, 502);
    }

    const { data: logged } = await admin.from("emails").insert({
      apprenant_id: a.id, subject: mail.subject, body_preview: mail.preview, body_html: mail.html,
      sender_email: "contact@ftransport.fr", sender_name: "FTRANSPORT", recipients: [to],
      type: "sent", is_read: true, has_attachments: false, sent_at: new Date().toISOString(),
    }).select("id").single();
    await finir({ statut: "envoye", email_id: logged?.id ?? null });
    return json({ statut: "envoye" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[send-prolongation-acces]", msg);
    return json({ error: msg }, 500);
  }
});
