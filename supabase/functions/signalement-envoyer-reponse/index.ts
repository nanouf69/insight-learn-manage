import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { sendBrandedEmail } from "../_shared/send-branded-email.ts";
import { construireReponse } from "./message.ts";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Méthode non autorisée." });
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return json(401, { error: "Session expirée." });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: u } = await admin.auth.getUser(token);
  if (!u?.user) return json(401, { error: "Session expirée." });
  const { data: role } = await admin.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
  if (!role) return json(403, { error: "Réservé aux administrateurs." });

  const body = await req.json().catch(() => null);
  const suiviId = typeof body?.suivi_id === "string" ? body.suivi_id : "";
  if (!/^[0-9a-f-]{36}$/i.test(suiviId)) return json(400, { error: "Réponse invalide." });

  const { data: suivi } = await admin.from("signalements_suivi").select("id, signalement_id, nature, contenu, created_at").eq("id", suiviId).maybeSingle();
  if (!suivi || suivi.nature !== "reponse" || !suivi.contenu) return json(400, { error: "Seule une réponse à l'apprenant peut être envoyée." });
  const { data: t } = await admin.from("signalements_apprenants").select("id, reference, apprenant_nom, apprenant_email, explication, statut").eq("id", suivi.signalement_id).single();
  if (!t?.apprenant_email) return json(400, { error: "Aucune adresse e-mail enregistrée pour ce ticket." });

  const { data: existants } = await admin.from("signalements_reponses_envois").select("statut").eq("suivi_id", suiviId).neq("statut", "echec");
  if (existants?.some((e) => e.statut === "envoye")) return json(409, { error: "Cette réponse a déjà été envoyée : aucun second envoi." });
  if (existants?.length) return json(409, { error: "Un envoi de cette réponse est déjà en cours ou de résultat inconnu : vérifiez avant tout nouvel essai." });

  const nomAdmin = u.user.email ?? "Administrateur";
  const msg = construireReponse({ reference: t.reference, nom: t.apprenant_nom, demande: t.explication, reponse: suivi.contenu, statut: t.statut });
  const { data: envoi, error: iErr } = await admin.from("signalements_reponses_envois").insert({
    suivi_id: suiviId, signalement_id: t.id, destinataire: t.apprenant_email, sujet: msg.sujet,
    copie_html: msg.html, copie_texte: suivi.contenu, demande_par: u.user.id, demande_par_nom: nomAdmin,
  }).select("id").single();
  if (iErr || !envoi) return json(409, { error: "Envoi déjà en cours pour cette réponse." });

  try {
    await sendBrandedEmail({ to: t.apprenant_email, subject: msg.sujet, html: msg.html, replyTo: "contact@ftransport.fr" });
  } catch (e) {
    const erreur = String((e as Error)?.message ?? e).slice(0, 500);
    await admin.from("signalements_reponses_envois").update({ statut: "echec", erreur }).eq("id", envoi.id);
    return json(502, { error: `Le mail n'est pas parti : ${erreur}`, statut: "echec" });
  }
  await admin.from("signalements_reponses_envois").update({ statut: "envoye", envoye_le: new Date().toISOString() }).eq("id", envoi.id);
  return json(200, { ok: true, statut: "envoye" });
});
