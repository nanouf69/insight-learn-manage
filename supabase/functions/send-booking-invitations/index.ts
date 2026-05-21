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

function isElearning(type: string | null | undefined, creneau: string | null | undefined): boolean {
  const t = (type ?? "").toLowerCase().trim();
  const c = (creneau ?? "").toLowerCase().trim();
  // VTC e-learning uniquement (exclut TAXI / TA)
  return t === "vtc-e" || (t === "vtc" && c === "en-ligne");
}

function buildHtml(appUrl: string, prenom: string, nom: string): string {
  const slots = [
    ["11h00 — 11h15","11h15 — 11h30"],
    ["11h30 — 11h45","11h45 — 12h00"],
    ["12h00 — 12h15","12h15 — 12h30"],
    ["12h30 — 12h45","12h45 — 13h00"],
    ["13h00 — 13h15","13h15 — 13h30"],
    ["13h30 — 13h45",""],
  ];
  const slotsHtml = slots.map(row => `
    <tr>
      ${row.map(s => s ? `<td style="padding:6px;width:50%"><div style="border:1px solid #dbeafe;border-radius:8px;padding:10px 12px;color:#1e3a8a;font-size:14px;background:#fff">🕐 ${s}</div></td>` : `<td style="padding:6px;width:50%"></td>`).join("")}
    </tr>`).join("");

  return `<!DOCTYPE html><html lang="fr"><body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;color:#1f2937">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0">
    <tr><td align="center">
      <table width="640" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
        <tr><td style="background:#0D2540;padding:22px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:20px;letter-spacing:0.5px">FTRANSPORT — Formation professionnelle VTC / TAXI</h1>
        </td></tr>
        <tr><td style="padding:24px 28px 0 28px">
          <div style="background:#fef3c7;border-left:4px solid #d97706;border-radius:6px;padding:14px 16px;font-size:14px;color:#7c2d12">
            ⚠️ Ce message s'adresse uniquement aux apprenants dont l'examen e-learning est planifié le <strong>mardi 26 mai 2026</strong>. Si ce n'est pas votre cas, merci de ne pas en tenir compte.
          </div>
        </td></tr>
        <tr><td style="padding:24px 28px;font-size:15px;line-height:1.6">
          <p style="margin:0 0 14px">Bonjour ${prenom} ${nom},</p>
          <p style="margin:0 0 14px">Votre examen e-learning approche — il est programmé <strong>mardi 26 mai</strong>. Pour que vous puissiez l'aborder sereinement, nous vous proposons un <strong>créneau individuel de 15 minutes</strong> le lundi 25 mai, de 11h à 14h.</p>
          <p style="margin:0 0 14px">Posez toutes vos questions : contenu du cours, déroulement de l'examen, accès à la plateforme, conseils de dernière minute…</p>
          <div style="background:#ecfdf5;border-left:4px solid #059669;border-radius:6px;padding:12px 16px;font-size:14px;color:#065f46;margin:18px 0">
            💡 <strong>Conseil :</strong> notez vos questions à l'avance pour que votre créneau soit le plus utile possible.
          </div>
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:16px;margin:20px 0">
            <p style="margin:0 0 10px;font-weight:bold;color:#1e3a8a">📅 Réservez votre créneau — lundi 25 mai, 11h-14h</p>
            <table width="100%" cellpadding="0" cellspacing="0">${slotsHtml}</table>
          </div>
          <p style="text-align:center;margin:28px 0">
            <a href="${appUrl}" style="background:#F4A227;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:bold;display:inline-block;font-size:16px">Réserver mon créneau</a>
          </p>
          <p style="font-size:13px;color:#6b7280;text-align:center">Les créneaux sont limités (12 places, premier arrivé premier servi). Dépêchez-vous !</p>
          <p style="margin-top:28px">L'équipe FTRANSPORT</p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:14px;text-align:center;font-size:12px;color:#6b7280">
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
    const testMode: boolean = !!body.testMode;
    const testEmail: string = (body.testEmail || "").trim();
    const elearningOnly: boolean = body.elearningOnly !== false; // default true
    const dryRun: boolean = !!body.dryRun;

    if (testMode && !testEmail) {
      return new Response(JSON.stringify({ error: "testEmail required in testMode" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const PAGE = 1000;
    let from = 0;
    const targets: Array<{ id: string; nom: string; prenom: string; email: string; type: string; creneau: string }> = [];
    while (true) {
      const { data, error } = await supabase
        .from("apprenants")
        .select("id, nom, prenom, email, date_examen_theorique, type_apprenant, creneau_horaire")
        .range(from, from + PAGE - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      for (const a of data) {
        if (!a.email) continue;
        if (!hasExam26Mai(a.date_examen_theorique as any)) continue;
        if (elearningOnly && !isElearning(a.type_apprenant as any, a.creneau_horaire as any)) continue;
        targets.push({
          id: a.id,
          nom: a.nom ?? "",
          prenom: a.prenom ?? "",
          email: a.email,
          type: a.type_apprenant ?? "",
          creneau: a.creneau_horaire ?? "",
        });
      }
      if (data.length < PAGE) break;
      from += PAGE;
    }

    if (dryRun) {
      return new Response(JSON.stringify({
        ok: true,
        dryRun: true,
        total: targets.length,
        elearningOnly,
        recipients: targets.map((t) => ({ id: t.id, nom: t.nom, prenom: t.prenom, email: t.email, type: t.type })),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let sent = 0;
    const failures: Array<{ email: string; error: string }> = [];

    // In test mode: take the first target apprenant for {prenom,nom,id} and redirect email to testEmail
    const recipientsToSend = testMode
      ? (targets.length > 0
          ? [{ ...targets[0], email: testEmail }]
          : [{ id: "00000000-0000-0000-0000-000000000000", nom: "TEST", prenom: "Apprenant", email: testEmail, type: "", creneau: "" }])
      : targets;

    for (const t of recipientsToSend) {
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
          subject: testMode
            ? "[TEST] Votre examen du 26 mai — réservez votre créneau de questions lundi 25 mai"
            : "Votre examen du 26 mai — réservez votre créneau de questions lundi 25 mai",
          html,
        }),
      });
      if (res.ok) sent++;
      else {
        const errText = await res.text();
        failures.push({ email: t.email, error: errText });
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      testMode,
      elearningOnly,
      eligibleCount: targets.length,
      sent,
      failures,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
