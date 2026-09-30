// Alerte à contact@ dès qu'une donnée élève est supprimée (copie préalable conservée).
// Appelée chaque minute par pg_cron ; ne supprime jamais rien.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { sendBrandedEmail } from "../_shared/send-branded-email.ts";

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const paris = (d: string) => new Date(d).toLocaleString("fr-FR", { timeZone: "Europe/Paris" });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data, error } = await sb.from("donnees_eleves_suppressions").select("*")
      .is("alerte_envoyee_at", null).eq("compte_test", false).order("created_at").limit(200);
    if (error) throw error;
    if (!data?.length) return new Response(JSON.stringify({ ok: true, n: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const rows = data.map((r: any) => `<tr><td>${paris(r.created_at)}</td><td>${esc(r.table_nom)}</td><td>${esc(r.apprenant_id)}</td><td>${esc(r.auteur_uid ?? "—")}<br><small>${esc(r.auteur_role)}</small></td><td>${esc(r.motif)}</td><td><small>${esc(JSON.stringify(r.ligne).slice(0, 400))}</small></td></tr>`).join("");
    await sendBrandedEmail({
      to: "contact@ftransport.fr",
      subject: `ALERTE — ${data.length} donnée(s) élève supprimée(s)`,
      html: `<p>Des données élèves ont été supprimées. Une copie complète de chaque ligne est conservée dans le journal des suppressions.</p>
<table border="1" cellpadding="6" style="border-collapse:collapse;font-size:12px;font-family:Arial"><tr style="background:#f0f0f0"><th>Date</th><th>Table</th><th>Élève</th><th>Auteur</th><th>Motif</th><th>Copie</th></tr>${rows}</table>`,
    });
    await sb.from("donnees_eleves_suppressions").update({ alerte_envoyee_at: new Date().toISOString() }).in("id", data.map((r: any) => r.id));
    return new Response(JSON.stringify({ ok: true, n: data.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[alerte-suppression-donnee-eleve]", e);
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
