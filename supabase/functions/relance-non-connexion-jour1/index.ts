// Relance J+1 après envoi des identifiants si l'apprenant ne s'est PAS connecté
// Cible : apprenants e-learning VTC/TAXI (*-e) à qui les codes ont été envoyés la veille
// et qui n'ont AUCUNE connexion enregistrée depuis.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

function isCredentialsSubject(s: string | null): boolean {
  if (!s) return false;
  const t = s.toLowerCase();
  return (
    t.includes("identifiant") ||
    t.includes("formation commence") ||
    t.includes("codes de connexion") ||
    t.includes("vos accès")
  );
}

function buildEmail(prenom: string, type: string) {
  const isTaxi = type.toLowerCase().includes("taxi");
  const heures = isTaxi ? 90 : 60;
  const formation = isTaxi ? "TAXI" : "VTC";
  const subject = `⚠️ ${prenom}, vous n'avez pas encore activé votre formation e-learning`;
  const html = `
    <div style="font-family: Arial, sans-serif; color:#111; line-height:1.5; max-width:640px;">
      <p>Bonjour ${prenom},</p>
      <p>Nous vous avons envoyé hier vos <strong>codes d'accès</strong> à la plateforme de formation e-learning FTRANSPORT.</p>
      <p style="background:#fff3cd;border-left:4px solid #f0ad4e;padding:12px;">
        ⚠️ <strong>À ce jour, nous constatons que vous ne vous êtes pas encore connecté(e).</strong>
      </p>
      <p><strong>📌 Rappel important (Qualiopi) :</strong><br/>
      Formation ${formation} : <strong>${heures} heures</strong> e-learning obligatoires.</p>
      <p>Sans la validation de la totalité de vos heures et de tous vos modules,
      <strong>nous serons contraints de vous refuser le passage de l'examen pratique</strong>,
      sans remboursement possible.</p>
      <p>👉 <strong>Connectez-vous dès aujourd'hui</strong> avec les identifiants reçus hier par email pour démarrer votre formation.</p>
      <p>Si vous avez perdu vos identifiants ou rencontrez un problème de connexion, répondez simplement à cet email.</p>
      <p>Cordialement,<br/><strong>L'équipe FTRANSPORT</strong></p>
    </div>
  `;
  return { subject, html };
}

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch(`${GATEWAY_URL}/emails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": RESEND_API_KEY,
    },
    body: JSON.stringify({
      from: "FTRANSPORT <contact@ftransport.fr>",
      to: [to],
      subject,
      html,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Resend ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const dryRun = url.searchParams.get("dry") === "1";

    // Hier (00:00 -> 23:59 UTC)
    const now = new Date();
    const yStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1, 0, 0, 0));
    const yEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1, 23, 59, 59));

    // 1) Emails "identifiants" envoyés hier
    const { data: emails, error: e1 } = await supabase
      .from("emails")
      .select("apprenant_id, subject, recipients, sent_at")
      .eq("type", "sent")
      .gte("sent_at", yStart.toISOString())
      .lte("sent_at", yEnd.toISOString())
      .not("apprenant_id", "is", null);
    if (e1) throw e1;

    const candidatesIds = Array.from(
      new Set((emails ?? []).filter((e) => isCredentialsSubject(e.subject)).map((e) => e.apprenant_id as string))
    );

    if (candidatesIds.length === 0) {
      return new Response(JSON.stringify({ ok: true, count: 0, message: "Aucun envoi d'identifiants hier" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Récupérer apprenants e-learning VTC/TAXI
    const { data: apps, error: e2 } = await supabase
      .from("apprenants")
      .select("id, prenom, nom, email, type_apprenant")
      .in("id", candidatesIds);
    if (e2) throw e2;

    const eligible = (apps ?? []).filter((a) => {
      const t = (a.type_apprenant ?? "").toLowerCase();
      const isElearning = t.endsWith("-e") || t.includes("e-learning") || t.includes("elearning");
      const isVtcOrTaxi = t.includes("vtc") || t.includes("taxi");
      return isElearning && isVtcOrTaxi && a.email;
    });

    if (eligible.length === 0) {
      return new Response(JSON.stringify({ ok: true, count: 0, message: "Aucun apprenant éligible" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3) Vérifier absence de connexion depuis l'envoi des codes
    const { data: cnx, error: e3 } = await supabase
      .from("apprenant_connexions")
      .select("apprenant_id")
      .in("apprenant_id", eligible.map((a) => a.id))
      .gte("started_at", yStart.toISOString());
    if (e3) throw e3;
    const connectes = new Set((cnx ?? []).map((c) => c.apprenant_id as string));

    const toRelance = eligible.filter((a) => !connectes.has(a.id));

    // 4) Anti-doublon : déjà relancé aujourd'hui ?
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
    const { data: alreadySent } = await supabase
      .from("emails")
      .select("apprenant_id, subject")
      .eq("type", "sent")
      .gte("sent_at", todayStart.toISOString())
      .in("apprenant_id", toRelance.map((a) => a.id));
    const dejaRelances = new Set(
      (alreadySent ?? [])
        .filter((e) => (e.subject ?? "").includes("vous n'avez pas encore activé"))
        .map((e) => e.apprenant_id as string)
    );

    const finals = toRelance.filter((a) => !dejaRelances.has(a.id));

    const results: any[] = [];
    for (const a of finals) {
      const { subject, html } = buildEmail(a.prenom ?? "", a.type_apprenant ?? "");
      if (dryRun) {
        results.push({ apprenant: `${a.prenom} ${a.nom}`, email: a.email, subject, sent: false, dry: true });
        continue;
      }
      try {
        await sendEmail(a.email, subject, html);
        await supabase.from("emails").insert({
          apprenant_id: a.id,
          subject,
          body_html: html,
          body_preview: subject,
          sender_email: "contact@ftransport.fr",
          sender_name: "FTRANSPORT",
          recipients: [a.email],
          type: "sent",
          sent_at: new Date().toISOString(),
        });
        results.push({ apprenant: `${a.prenom} ${a.nom}`, email: a.email, sent: true });
      } catch (err) {
        results.push({ apprenant: `${a.prenom} ${a.nom}`, email: a.email, sent: false, error: String(err) });
      }
    }

    return new Response(
      JSON.stringify({ ok: true, dryRun, candidats_envoi_veille: candidatesIds.length, eligibles: eligible.length, non_connectes: toRelance.length, envoyes: results.filter(r=>r.sent).length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
