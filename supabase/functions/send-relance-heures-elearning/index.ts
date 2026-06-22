import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Recipient {
  to: string;
  prenom: string;
  nom: string;
  formation: "VTC" | "TAXI";
  dateExamen: string;
  heuresFaites: number;
  heuresRequises: number;
  modulesValides: number;
  modulesTotal: number;
}

const RECIPIENTS: Recipient[] = [
  {
    to: "ismailamar729@gmail.com",
    prenom: "Ismail",
    nom: "AMAR",
    formation: "VTC",
    dateExamen: "29 juin 2026",
    heuresFaites: 42,
    heuresRequises: 60,
    modulesValides: 7,
    modulesTotal: 7,
  },
];

function buildHtml(r: Recipient): string {
  const heuresRestantes = Math.max(0, r.heuresRequises - r.heuresFaites);
  return `<p>Bonjour <strong>${r.prenom}</strong>,</p>
<p>Votre <strong>examen pratique ${r.formation}</strong> est prévu le <strong>${r.dateExamen}</strong>.</p>
<p>⚠️ <strong>À ce jour, votre formation e-learning n'est pas terminée :</strong></p>
<ul>
  <li>Heures effectuées : <strong>${r.heuresFaites}h sur ${r.heuresRequises}h requises</strong></li>
  <li>Heures restantes à effectuer : <strong>environ ${heuresRestantes}h</strong></li>
  <li>Modules validés : <strong>${r.modulesValides}/${r.modulesTotal}</strong></li>
</ul>
<p>📌 <strong>Rappel réglementaire (Qualiopi)</strong> : pour être autorisé à passer l'examen pratique, vous devez impérativement avoir effectué <strong>la totalité des ${r.heuresRequises} heures de formation e-learning</strong>.</p>
<p>❌ <strong>Sans cela, nous serons contraints de vous refuser le passage de l'examen pratique</strong>, sans remboursement possible.</p>
<p>👉 Connectez-vous dès maintenant sur votre espace apprenant pour compléter vos heures restantes.</p>
<p>Si vous avez la moindre difficulté, contactez-nous immédiatement au 04 28 29 60 91.</p>
<p>Cordialement,<br>L'équipe FTRANSPORT</p>
<br>---<br>
<strong>FTRANSPORT</strong><br>Centre de formation VTC &amp; TAXI<br>86 Route de Genas, 69003 Lyon<br>📞 04.28.29.60.91<br>📧 contact@ftransport.fr`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY missing" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const results: Array<{ to: string; status: string; id?: string; error?: string }> = [];

  for (const r of RECIPIENTS) {
    const subject = `⚠️ ${r.prenom}, finalisez vos heures de formation avant votre examen pratique ${r.formation} du ${r.dateExamen}`;
    const html = buildHtml(r);
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: "FTRANSPORT <contact@ftransport.fr>", to: [r.to], subject, html }),
      });
      const data = await res.json();
      if (res.ok) {
        results.push({ to: r.to, status: "sent", id: data.id });
        await supabase.from("emails").insert({
          type: "sent", subject, body_html: html,
          sender_email: "contact@ftransport.fr", recipients: [r.to],
          sent_at: new Date().toISOString(),
        }).then(() => {}, () => {});
      } else {
        results.push({ to: r.to, status: "error", error: JSON.stringify(data) });
      }
    } catch (err) {
      results.push({ to: r.to, status: "exception", error: String(err) });
    }
  }

  return new Response(JSON.stringify({ success: true, count: results.length, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
