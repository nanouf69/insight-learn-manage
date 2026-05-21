import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function hasExam26Mai(date: string | null | undefined): boolean {
  if (!date) return false;
  const d = date.toLowerCase();
  return (
    d.includes("26 mai") ||
    d.includes("2025-05-26") ||
    d.includes("2026-05-26") ||
    d.includes("26/05/2025") ||
    d.includes("26/05/2026")
  );
}

function buildHtml(appUrl: string, prenom: string, nom: string): string {
  return `<!DOCTYPE html><html lang="fr"><body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
        <tr><td style="background:#0D2540;padding:24px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:22px">FTRANSPORT</h1>
        </td></tr>
        <tr><td style="padding:32px 28px;color:#1f2937;font-size:15px;line-height:1.6">
          <p>Bonjour ${prenom} ${nom},</p>
          <p>Votre <strong>examen théorique est planifié le 26 mai</strong>.</p>
          <p>Afin de préparer au mieux votre examen, nous vous proposons un <strong>créneau individuel de questions/réponses le lundi 25 mai</strong> (la veille).</p>
          <p>Merci de réserver votre créneau de 15 minutes en cliquant sur le bouton ci-dessous :</p>
          <p style="text-align:center;margin:32px 0">
            <a href="${appUrl}" style="background:#F4A227;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:bold;display:inline-block">Réserver mon créneau</a>
          </p>
          <p style="font-size:13px;color:#6b7280">Les créneaux sont attribués par ordre d'arrivée, dépêchez-vous !</p>
          <p style="margin-top:32px">L'équipe FTRANSPORT</p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:16px;text-align:center;font-size:12px;color:#6b7280">
          formation@ftransport.fr
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY missing" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Auth: only admins
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: claims } = await supabase.auth.getClaims(token);
    if (!claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: claims.claims.sub, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const baseUrl: string = body.baseUrl || "https://gestion.ftransport.fr";

    // Fetch all apprenants with paging
    const PAGE = 1000;
    let from = 0;
    const targets: Array<{ id: string; nom: string; prenom: string; email: string }> = [];
    while (true) {
      const { data, error } = await supabase
        .from("apprenants")
        .select("id, nom, prenom, email, date_examen_theorique")
        .range(from, from + PAGE - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      for (const a of data) {
        if (a.email && hasExam26Mai(a.date_examen_theorique as any)) {
          targets.push({ id: a.id, nom: a.nom ?? "", prenom: a.prenom ?? "", email: a.email });
        }
      }
      if (data.length < PAGE) break;
      from += PAGE;
    }

    let sent = 0;
    const failures: Array<{ email: string; error: string }> = [];

    for (const t of targets) {
      const link = `${baseUrl.replace(/\/+$/, "")}/booking?id=${t.id}`;
      const html = buildHtml(link, t.prenom, t.nom);
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "FTRANSPORT <formation@ftransport.fr>",
          to: [t.email],
          subject: "Votre examen du 26 mai — réservez votre créneau de questions lundi 25 mai",
          html,
        }),
      });
      if (res.ok) sent++;
      else {
        const errText = await res.text();
        failures.push({ email: t.email, error: errText });
      }
    }

    return new Response(JSON.stringify({ ok: true, total: targets.length, sent, failures }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
