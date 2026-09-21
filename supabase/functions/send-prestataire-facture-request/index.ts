import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendBrandedEmail } from "../_shared/send-branded-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let envoiId: string | null = null;
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await admin.auth.getUser(token);
    if (!userData?.user) return json({ error: "Non autorisé" }, 401);

    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roles) return json({ error: "Accès réservé aux administrateurs" }, 403);

    const body = await req.json();
    envoiId = typeof body?.envoiId === "string" ? body.envoiId : null;
    if (!envoiId) return json({ error: "envoiId manquant" }, 400);

    const { data: envoi, error } = await admin
      .from("prestataire_envois")
      .select("*")
      .eq("id", envoiId)
      .maybeSingle();
    if (error || !envoi) return json({ error: "Envoi introuvable" }, 404);
    if (envoi.statut === "envoye") return json({ success: true, alreadySent: true });

    const to = String(envoi.destinataire_email ?? "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      await admin
        .from("prestataire_envois")
        .update({ statut: "echec", erreur: "Adresse e-mail du prestataire invalide" })
        .eq("id", envoiId);
      return json({ error: "Adresse e-mail du prestataire invalide" }, 400);
    }

    await sendBrandedEmail({
      to,
      subject: String(envoi.objet ?? ""),
      html: String(envoi.corps_html ?? ""),
      replyTo: "contact@ftransport.fr",
    });

    await admin
      .from("prestataire_envois")
      .update({ statut: "envoye", envoye_le: new Date().toISOString(), erreur: null })
      .eq("id", envoiId);

    return json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[send-prestataire-facture-request]", message);
    if (envoiId) {
      await admin
        .from("prestataire_envois")
        .update({ statut: "echec", erreur: message.slice(0, 500) })
        .eq("id", envoiId)
        .then(() => undefined, () => undefined);
    }
    return json({ error: message }, 500);
  }
});
