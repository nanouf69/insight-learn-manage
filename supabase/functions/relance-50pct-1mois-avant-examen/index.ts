// Relance "50% mini 1 mois avant examen"
// Envoie un email aux apprenants e-learning dont l'examen théorique est dans ~1 mois
// et qui ont effectué moins de 50% des heures requises (basé sur tout l'historique
// de connexion - table apprenant_connexions).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendBrandedEmail } from "../_shared/send-branded-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_SESSION_MS = 7 * 60 * 60 * 1000;

const HEURES_REQUISES: Record<string, number> = {
  "vtc-e": 60,
  "taxi-e": 90,
  "continue-vtc": 14,
  "formation-continue-vtc": 14,
  "ta-e": 35,
  "va-e": 7,
};

const PRESENTIEL_TYPES = [
  "vtc", "vtc-exam", "taxi", "taxi-exam",
  "vtc-e-presentiel", "taxi-e-presentiel", "ta-e-presentiel",
  "formation-continue-taxi", "pa-vtc",
];

async function fetchAllPages<T>(query: any): Promise<T[]> {
  const PAGE = 1000;
  let from = 0;
  const all: T[] = [];
  while (true) {
    const { data, error } = await query.range(from, from + PAGE - 1);
    if (error) throw error;
    const batch = (data as T[]) || [];
    all.push(...batch);
    if (batch.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const today = new Date();
    const start = new Date(today); start.setDate(start.getDate() + 25);
    const end = new Date(today); end.setDate(end.getDate() + 35);
    const startStr = start.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);

    console.log(`[relance-50pct] window ${startStr} → ${endStr}`);

    const { data: apprenants, error } = await supabaseAdmin
      .from("apprenants")
      .select("id, nom, prenom, email, type_apprenant, formation_choisie, date_examen_theorique, resultat_examen_pratique")
      .not("email", "is", null)
      .not("date_examen_theorique", "is", null)
      .is("deleted_at", null)
      .gte("date_examen_theorique", startStr)
      .lte("date_examen_theorique", endStr);

    if (error) throw error;

    const eligibles = (apprenants || []).filter((a: any) => {
      const t = (a.type_apprenant || a.formation_choisie || "").toLowerCase();
      if (!HEURES_REQUISES[t]) return false;
      if (PRESENTIEL_TYPES.includes(t)) return false;
      // Exclure les formations continues (pas concernées par les 50% avant examen théorique)
      if (t.includes("continue") || t.startsWith("fc-")) return false;
      // Exclure ceux qui ont déjà passé l'examen pratique (résultat saisi quel qu'il soit)
      if (a.resultat_examen_pratique != null && a.resultat_examen_pratique !== "") return false;
      return true;
    });

    console.log(`[relance-50pct] ${eligibles.length} apprenants e-learning éligibles`);

    if (eligibles.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, message: "Aucun éligible" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Anti-spam: déjà relancé dans les 14 derniers jours
    const fourteenDaysAgo = new Date(today); fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const { data: recent } = await supabaseAdmin
      .from("emails")
      .select("apprenant_id")
      .in("apprenant_id", eligibles.map((a: any) => a.id))
      .like("subject", "%50%- 1 mois%")
      .gte("sent_at", fourteenDaysAgo.toISOString());
    const alreadySent = new Set((recent || []).map((e: any) => e.apprenant_id));

    const senderEmail = "contact@ftransport.fr";
    const results: any[] = [];

    for (const a of eligibles) {
      if (alreadySent.has(a.id)) {
        results.push({ id: a.id, email: a.email, skipped: "already_sent" });
        continue;
      }
      try {
        const t = (a.type_apprenant || a.formation_choisie || "").toLowerCase();
        const requis = HEURES_REQUISES[t];

        // Calcul heures sur TOUT l'historique de connexion (table apprenant_connexions)
        const connexions = await fetchAllPages<any>(
          supabaseAdmin
            .from("apprenant_connexions")
            .select("started_at, ended_at, last_seen_at")
            .eq("apprenant_id", a.id)
            .order("started_at", { ascending: false })
        );

        let totalMs = 0;
        for (const c of connexions) {
          const s = Date.parse(c.started_at);
          if (Number.isNaN(s)) continue;
          const eRaw = c.ended_at ? Date.parse(c.ended_at) : Date.parse(c.last_seen_at);
          const e = Number.isNaN(eRaw) ? s : Math.min(eRaw, s + MAX_SESSION_MS);
          if (e > s) totalMs += (e - s);
        }
        const heuresFaites = totalMs / 3_600_000;
        const pct = requis > 0 ? (heuresFaites / requis) * 100 : 0;

        if (pct >= 50) {
          results.push({ id: a.id, email: a.email, skipped: "above_50pct", pct: Math.round(pct) });
          continue;
        }

        const examDate = new Date(a.date_examen_theorique);
        const daysUntil = Math.ceil((examDate.getTime() - today.getTime()) / 86_400_000);
        const examFmt = examDate.toLocaleDateString("fr-FR", {
          weekday: "long", day: "numeric", month: "long", year: "numeric",
        });
        const formation = t.startsWith("taxi") ? "TAXI" : t.startsWith("ta-") ? "TA" : t.startsWith("va-") ? "VA" : "VTC";
        const hFaites = Math.floor(heuresFaites);
        const mFaites = Math.round((heuresFaites - hFaites) * 60);

        const subject = `⚠️ ${a.prenom}, 50% mini requis - 1 mois avant votre examen ${formation} du ${examFmt}`;

        const html = `
<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;">
  <div style="background:linear-gradient(135deg,#dc2626,#991b1b);padding:24px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:22px;">⚠️ Action urgente requise</h1>
    <p style="color:#fecaca;margin:6px 0 0;">FTRANSPORT - Formation ${formation}</p>
  </div>
  <div style="padding:28px;background:#fff;color:#1f2937;line-height:1.6;">
    <h2 style="color:#1e40af;margin-top:0;">Bonjour ${a.prenom},</h2>
    <p>Votre <strong>examen théorique ${formation}</strong> est prévu le <strong>${examFmt}</strong>, soit dans <strong>${daysUntil} jour${daysUntil>1?"s":""}</strong>.</p>

    <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:16px;margin:20px 0;border-radius:4px;">
      <h3 style="color:#991b1b;margin:0 0 10px;">📊 Votre avancement actuel</h3>
      <ul style="margin:0;padding-left:20px;">
        <li>Heures de connexion effectuées : <strong>${hFaites}h${String(mFaites).padStart(2,"0")} sur ${requis}h</strong></li>
        <li>Progression : <strong>${Math.round(pct)}%</strong></li>
        <li>Minimum requis à 1 mois de l'examen : <strong>50%</strong> (soit ${Math.round(requis/2)}h)</li>
      </ul>
    </div>

    <div style="background:#fffbeb;border-left:4px solid #f59e0b;padding:16px;margin:20px 0;border-radius:4px;">
      <h3 style="color:#92400e;margin:0 0 10px;">🚨 Risque de NON-INSCRIPTION à l'examen</h3>
      <p style="margin:0;">
        Conformément à nos obligations réglementaires <strong>Qualiopi</strong>, si à ce stade vous n'avez pas
        effectué <strong>au moins 50% de votre formation</strong> e-learning (constaté via votre historique de connexion),
        nous serons contraints de <strong>ne pas vous inscrire à l'examen</strong> faute de préparation suffisante.
      </p>
    </div>

    <div style="background:#eff6ff;border-left:4px solid #3b82f6;padding:16px;margin:20px 0;border-radius:4px;">
      <h3 style="color:#1e40af;margin:0 0 10px;">✅ Ce que vous devez faire IMMÉDIATEMENT</h3>
      <ul style="margin:0;padding-left:20px;">
        <li>Vous connecter chaque jour sur votre espace de cours</li>
        <li>Rattraper au minimum ${Math.max(1, Math.round((requis*0.5) - heuresFaites))}h de formation dans les prochains jours</li>
        <li>Avancer dans tous vos modules e-learning</li>
        <li>Réaliser les examens blancs</li>
      </ul>
    </div>

    <div style="text-align:center;margin:28px 0;">
      <a href="https://insight-learn-manage.lovable.app/cours-public"
         style="background:#dc2626;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:bold;display:inline-block;">
        🚀 Reprendre ma formation maintenant
      </a>
    </div>

    <p style="font-size:14px;color:#374151;">
      📞 Pour toute difficulté, contactez-nous immédiatement au <strong>04.28.29.60.91</strong>
      ou par email à <strong>contact@ftransport.fr</strong>.
    </p>
    <p style="color:#6b7280;font-size:12px;margin-top:24px;">
      Email envoyé automatiquement aux apprenants à 1 mois de leur examen dont la progression est inférieure à 50%.
    </p>
  </div>
  <div style="background:#1f2937;padding:16px;text-align:center;font-size:12px;color:#9ca3af;">
    <p style="margin:0;"><strong>FTRANSPORT</strong> - Centre de formation VTC &amp; TAXI</p>
    <p style="margin:4px 0 0;">86 Route de Genas, 69003 Lyon - 04.28.29.60.91</p>
  </div>
</div>`;

        try {
          await sendBrandedEmail({ to: a.email, subject, html, replyTo: senderEmail });
          await supabaseAdmin.from("emails").insert({
            apprenant_id: a.id,
            subject,
            body_preview: `Progression ${Math.round(pct)}% - ${hFaites}h${String(mFaites).padStart(2,"0")}/${requis}h - examen dans ${daysUntil}j`,
            body_html: html,
            sender_email: senderEmail,
            sender_name: "FTRANSPORT",
            recipients: [a.email],
            type: "sent",
            is_read: true,
            has_attachments: false,
            sent_at: new Date().toISOString(),
          });
          results.push({ id: a.id, email: a.email, success: true, pct: Math.round(pct), heures: `${hFaites}h${String(mFaites).padStart(2,"0")}` });
          console.log(`[relance-50pct] ✅ ${a.email} pct=${Math.round(pct)}% (${hFaites}h${mFaites}/${requis}h)`);
        } catch (sendError) {
          const message = sendError instanceof Error ? sendError.message : String(sendError);
          results.push({ id: a.id, email: a.email, success: false, error: message });
          console.error(`[relance-50pct] ❌ ${a.email}:`, message);
        }
      } catch (err) {
        results.push({ id: a.id, email: a.email, success: false, error: String(err) });
      }
    }

    const sent = results.filter((r) => r.success).length;
    const failed = results.filter((r) => r.success === false).length;
    const skipped = results.filter((r) => r.skipped).length;

    if (sent > 0 || failed > 0) {
      await supabaseAdmin.from("alertes_systeme").insert({
        type: "relance_50pct_1mois",
        titre: `⚠️ Relance 50% mini - 1 mois avant examen`,
        message: `${sent} envoyé(s), ${failed} échec(s), ${skipped} ignoré(s)`,
        details: JSON.stringify(results),
      });
    }

    return new Response(JSON.stringify({ success: true, sent, failed, skipped, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[relance-50pct] Fatal:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
