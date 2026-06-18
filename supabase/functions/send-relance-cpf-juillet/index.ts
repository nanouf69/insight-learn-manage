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
  formation: string;
  dateDebut: string;
}

const RECIPIENTS: Recipient[] = [
  { to: "abadiemickael@gmail.com", prenom: "Mickael", nom: "ABADIE", formation: "VTC chauffeur cours du soir + VTC E-learning", dateDebut: "06/07/2026" },
  { to: "Mauritian86@gmail.com", prenom: "Jean", nom: "COLLET", formation: "Formation chauffeur TAXI E-learning + Formation pratique Lyon", dateDebut: "01/07/2026" },
  { to: "Domar21000@outlook.fr", prenom: "Mandoche", nom: "JULIAO MAKUNGU", formation: "Formation chauffeur VTC (frais d'examen compris)", dateDebut: "06/07/2026" },
  { to: "akdjofang@gmail.com", prenom: "Armel", nom: "KUEBO DJOFANG", formation: "Formation chauffeur VTC cours du soir", dateDebut: "06/07/2026" },
  { to: "ilyes.meziane69@gmail.com", prenom: "Ilyes", nom: "MEZIANE", formation: "Formation chauffeur VTC cours du soir", dateDebut: "06/07/2026" },
  { to: "Abdelazizmsadek268@gmail.fr", prenom: "Abdelaziz", nom: "MSADEK", formation: "Formation chauffeur VTC (frais d'examen compris)", dateDebut: "06/07/2026" },
  { to: "stephen.prevost00@gmail.com", prenom: "Stephen", nom: "PREVOST", formation: "VTC chauffeur cours du soir avec frais d'examen", dateDebut: "06/07/2026" },
  { to: "chaimbk@yahoo.fr", prenom: "Khaled", nom: "HAJJI", formation: "VTC chauffeur cours du soir avec frais d'examen", dateDebut: "06/07/2026" },
  { to: "mohamed200702@yahoo.com", prenom: "Mohamed", nom: "HAMID ARGA", formation: "Formation chauffeur VTC E-learning + Pratique + Frais d'examen", dateDebut: "03/07/2026" },
];

function buildHtml(r: Recipient): string {
  return `<p>Bonjour <strong>${r.prenom} ${r.nom}</strong>,</p>
<p>Vous êtes inscrit(e) à notre formation <strong>${r.formation}</strong> qui débute le <strong>${r.dateDebut}</strong>.</p>
<p>Votre dossier figure dans notre liste des <strong>dossiers en attente CPF</strong>. Vous disposez de <strong>48 heures</strong> pour valider votre inscription sur le site officiel du CPF :</p>
<p>👉 <a href="https://www.moncompteformation.gouv.fr/espace-public/consulter-mes-droits-formation">https://www.moncompteformation.gouv.fr/espace-public/consulter-mes-droits-formation</a><br>
Rubrique : <strong>Mes dossiers</strong></p>
<p>⚠️ <strong>Sans validation de votre part dans les 48h, vous ne pourrez pas passer l'examen théorique prévu le 21 juillet 2026.</strong> La prochaine session d'examen n'aura lieu qu'à la <strong>fin septembre 2026</strong>, ce qui retardera significativement l'obtention de votre carte professionnelle.</p>
<p>Pour toute question, n'hésitez pas à nous contacter au 04 28 29 60 91.</p>
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

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const subject = "⚠️ Action urgente sous 48h - Validation de votre dossier CPF";
  const results: Array<{ to: string; status: string; id?: string; error?: string }> = [];

  for (const r of RECIPIENTS) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "FTRANSPORT <contact@ftransport.fr>",
          to: [r.to],
          subject,
          html: buildHtml(r),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        results.push({ to: r.to, status: "sent", id: data.id });
        await supabase.from("emails").insert({
          type: "sent",
          subject,
          body_html: buildHtml(r),
          sender_email: "contact@ftransport.fr",
          recipients: [r.to],
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
