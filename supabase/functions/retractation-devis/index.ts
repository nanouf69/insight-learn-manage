import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Rétractation en ligne d'un devis valant contrat : écrite une seule fois, horodatée par le serveur.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);
  try {
    const { token, confirmation } = await req.json();
    if (typeof token !== "string" || token.length < 10) return json({ error: "Lien invalide" }, 400);
    if (confirmation !== true) return json({ error: "Confirmation requise" }, 400);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: devis, error } = await supabase.from("devis_envois")
      .select("id, apprenant_id, signed_at, retractation, contrat_conditions").eq("token", token).maybeSingle();
    if (error || !devis) return json({ error: "Lien invalide ou expiré" }, 404);
    if (!devis.contrat_conditions) return json({ error: "Rétractation en ligne disponible uniquement pour un devis valant contrat" }, 409);
    if (devis.retractation) return json({ ok: true, deja: true, retractation: devis.retractation });
    if (!devis.signed_at) return json({ error: "Contrat non signé : aucune rétractation nécessaire" }, 409);
    const now = new Date();
    const jours = (now.getTime() - new Date(devis.signed_at).getTime()) / 86400000;
    const retractation = {
      horodatage_serveur: now.toISOString(),
      canal: "en_ligne",
      texte: "Je notifie par la présente ma rétractation du contrat de formation.",
      jours_depuis_signature: Math.round(jours * 100) / 100,
      // Le décompte exact (10 jours L6353-5 / 14 jours contractuels) est examiné par l'organisme ; aucune demande refusée ici.
      dans_delai_14_jours: jours <= 14,
      user_agent: req.headers.get("user-agent") ?? null,
    };
    const { error: upErr } = await supabase.from("devis_envois")
      .update({ retractation, statut: "retracte" }).eq("id", devis.id).is("retractation", null);
    if (upErr) return json({ error: "Enregistrement impossible, réessayez ou écrivez à l'organisme" }, 500);
    await supabase.from("alertes_systeme").insert({
      type: "devis_retractation",
      titre: "↩️ Rétractation en ligne d'un contrat de formation",
      message: `Rétractation enregistrée le ${now.toISOString()}.`,
      details: JSON.stringify({ devis_id: devis.id, apprenant_id: devis.apprenant_id, ...retractation }),
    });
    return json({ ok: true, retractation });
  } catch {
    return json({ error: "Erreur serveur" }, 500);
  }
});
