import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Présentiels devant émarger (mêmes règles que relance-emargements-manquants)
const PRESENTIEL_TYPES = [
  "vtc", "vtc-exam", "taxi", "taxi-exam",
  "vtc-e-presentiel", "taxi-e-presentiel", "ta-e-presentiel",
  "formation-continue-vtc", "formation-continue-taxi", "pa-vtc",
  "ta", "pa", "rp",
];

const isPresentiel = (a: any) => {
  const t = (a.type_apprenant || a.formation_choisie || "").toLowerCase().trim();
  if (!t) return false;
  if (/-e$/.test(t)) return false;
  return PRESENTIEL_TYPES.includes(t);
};

function fmtDate(d: Date): string { return d.toISOString().slice(0, 10); }
const estCoursDuSoir = (h: string | null) =>
  !!h && parseInt((h || "").split(":")[0] || "0", 10) >= 17;

function apprenantPublics(typeApprenant: string): string[] {
  const t = (typeApprenant || "").toLowerCase();
  const out: string[] = [];
  if (t === "taxi" || t === "taxi-e") out.push("TAXI");
  if (t === "ta" || t === "ta-e" || t.includes("passerelle-ta") || t.includes("passerelle-taxi")) out.push("TA");
  if (t === "vtc" || t === "vtc-e") out.push("VTC");
  if (t === "va" || t === "va-e" || t === "pa vtc" || t.includes("passerelle-va") || t.includes("passerelle-vtc")) out.push("VA");
  return out;
}

// Jours de cours réels déjà passés (basé sur agenda_blocs)
async function joursDeCoursPasses(
  supabase: any,
  session: { date_debut: string; date_fin: string },
  typeApprenant: string,
  today: Date,
): Promise<string[]> {
  const todayStr = fmtDate(today);
  const capStr = session.date_fin < todayStr ? session.date_fin : todayStr;
  if (capStr < session.date_debut) return [];

  const start = new Date(session.date_debut + "T00:00:00Z");
  const semaineMin = new Date(start);
  semaineMin.setUTCDate(semaineMin.getUTCDate() - 6);

  const { data: blocs } = await supabase
    .from("agenda_blocs")
    .select("semaine_debut, jour, formation, publics_cibles")
    .gte("semaine_debut", fmtDate(semaineMin))
    .lte("semaine_debut", session.date_fin);

  const publics = apprenantPublics(typeApprenant);
  const t = (typeApprenant || "").toLowerCase();
  const isTaxi = t.includes("taxi") || t === "ta" || t === "ta-e";
  const isVTC = !isTaxi && (t === "vtc" || t === "vtc-e" || t === "pa vtc" || t === "va" || t === "va-e");
  const matchFormation = (f: string) => {
    const fl = (f || "").toLowerCase();
    if (fl.includes("taxi et vtc") || fl.includes("taxi & vtc")) return true;
    if (isTaxi && fl.includes("taxi")) return true;
    if (isVTC && fl.includes("vtc")) return true;
    if (!isTaxi && !isVTC) return true;
    return false;
  };

  const dates = new Set<string>();
  for (const b of blocs || []) {
    const cibles: string[] = Array.isArray(b.publics_cibles) ? b.publics_cibles : [];
    let match = false;
    if (cibles.length > 0) match = publics.length === 0 || publics.some((p) => cibles.includes(p));
    else match = matchFormation(b.formation);
    if (!match) continue;
    const ws = new Date(b.semaine_debut + "T00:00:00Z");
    ws.setUTCDate(ws.getUTCDate() + Number(b.jour || 0));
    const key = fmtDate(ws);
    if (key < session.date_debut || key > capStr) continue;
    dates.add(key);
  }
  return Array.from(dates).sort();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const target = new Date(today);
    target.setUTCDate(target.getUTCDate() + 3);
    const targetStr = target.toISOString().split("T")[0];

    console.log(`[relance-signatures-fin-session] today=${todayStr} target end=${targetStr}`);

    // Sessions se terminant exactement dans 3 jours
    const { data: sessions, error: sErr } = await supabase
      .from("sessions")
      .select("id, nom, date_debut, date_fin, heure_debut, type_session")
      .eq("date_fin", targetStr)
      .neq("type_session", "pratique");
    if (sErr) throw sErr;

    if (!sessions?.length) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "Aucune session ne se termine dans 3 jours" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    type Cible = { apprenant: any; sessionNom: string; signed: number; expected: number; gap: number };
    const cibles: Cible[] = [];

    for (const session of sessions) {
      const soir = estCoursDuSoir(session.heure_debut);
      const demiJourneesParJour = soir ? 1 : 2;

      const { data: liens } = await supabase
        .from("session_apprenants")
        .select("apprenant_id, apprenants!inner(id, nom, prenom, email, type_apprenant, formation_choisie)")
        .eq("session_id", session.id);

      for (const lien of liens || []) {
        const a: any = (lien as any).apprenants;
        if (!a?.email || !isPresentiel(a)) continue;

        // Jours de cours RÉELS déjà passés (agenda_blocs, exclut weekends/futur)
        const joursPasses = await joursDeCoursPasses(
          supabase,
          { date_debut: session.date_debut, date_fin: session.date_fin },
          a.type_apprenant || a.formation_choisie || "",
          today,
        );
        const expected = joursPasses.length * demiJourneesParJour;
        if (expected < 1) continue;

        // Compter les émargements uniquement sur ces jours de cours passés
        const { count } = await supabase
          .from("emargements_fc")
          .select("id", { count: "exact", head: true })
          .eq("apprenant_id", a.id)
          .in("date_emargement", joursPasses);

        const signed = count || 0;
        const gap = expected - signed;
        if (gap >= 1) {
          cibles.push({ apprenant: a, sessionNom: session.nom || "", signed, expected, gap });
        }
      }
    }

    console.log(`[relance-signatures-fin-session] ${cibles.length} cibles`);

    if (!cibles.length) {
      return new Response(JSON.stringify({ success: true, sent: 0, message: "Tout est signé" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Anti-doublon : skip si déjà relancé (fin de session) dans 7 jours
    const sevenDaysAgo = new Date(today); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recents = new Set<string>();
    for (const c of cibles) {
      const { data } = await supabase
        .from("emails")
        .select("id")
        .eq("apprenant_id", c.apprenant.id)
        .ilike("subject", "%SIGNATURES MANQUANTES%")
        .gte("sent_at", sevenDaysAgo.toISOString())
        .limit(1);
      if (data?.length) recents.add(c.apprenant.id);
    }
    const toSend = cibles.filter((c) => !recents.has(c.apprenant.id));

    if (!toSend.length) {
      return new Response(JSON.stringify({ success: true, sent: 0, message: "Déjà relancés" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // MS Graph
    const tenantId = Deno.env.get("MS_GRAPH_TENANT_ID");
    const clientId = Deno.env.get("MS_GRAPH_CLIENT_ID");
    const clientSecret = Deno.env.get("MS_GRAPH_CLIENT_SECRET");
    if (!tenantId || !clientId || !clientSecret) {
      return new Response(JSON.stringify({ error: "MS Graph non configuré" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const tokenRes = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId, client_secret: clientSecret,
        scope: "https://graph.microsoft.com/.default", grant_type: "client_credentials",
      }).toString(),
    });
    const accessToken = (await tokenRes.json()).access_token;
    if (!accessToken) throw new Error("MS Graph token failed");

    const FROM = "contact@ftransport.fr";
    let sent = 0;
    const errors: string[] = [];

    for (const c of toSend) {
      const a = c.apprenant;
      const subject = `⚠️ SIGNATURES MANQUANTES avant fin de formation`;
      const html = `
<div style="font-family:Arial,sans-serif;max-width:640px;color:#222;line-height:1.5">
  <p>Bonjour ${a.prenom || ""} ${a.nom || ""},</p>
  <p>Votre formation${c.sessionNom ? ` "<strong>${c.sessionNom}</strong>"` : ""} se termine <strong>dans 3 jours</strong>.</p>
  <p>Il vous manque <strong>${c.gap} demi-journée${c.gap > 1 ? "s" : ""} d'émargement</strong> (${c.signed}/${c.expected} signées à ce jour).</p>
  <div style="background:#fff4e5;border-left:4px solid #ff9800;padding:12px 16px;margin:16px 0">
    <strong>Action requise avant la fin de la formation :</strong>
    <ul style="margin:8px 0 0 0">
      <li>Émargez chaque demi-journée manquante depuis votre espace apprenant</li>
      <li><strong>En cas d'absence</strong>, transmettez un justificatif (arrêt de travail, certificat médical, convocation…) — l'absence justifiée est enregistrée comme telle et ne bloque pas votre dossier.</li>
    </ul>
  </div>
  <p>À défaut, votre dossier CPF/OPCO peut être suspendu ou faire l'objet d'une demande de remboursement.</p>
  <p>Cordialement,<br/><strong>L'équipe FTRANSPORT</strong></p>
</div>`;

      try {
        const r = await fetch(`https://graph.microsoft.com/v1.0/users/${FROM}/sendMail`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            message: {
              subject,
              body: { contentType: "HTML", content: html },
              toRecipients: [{ emailAddress: { address: a.email } }],
              from: { emailAddress: { address: FROM, name: "FTRANSPORT" } },
            },
            saveToSentItems: true,
          }),
        });
        if (!r.ok) {
          errors.push(`${a.email}: ${r.status} ${(await r.text()).slice(0, 200)}`);
          continue;
        }
        await supabase.from("emails").insert({
          apprenant_id: a.id,
          subject,
          body_html: html,
          body_preview: `Signatures manquantes fin de session (${c.signed}/${c.expected})`,
          sender_email: FROM,
          sender_name: "FTRANSPORT",
          recipients: [a.email],
          type: "sent",
          sent_at: new Date().toISOString(),
        });
        sent++;
      } catch (e: any) {
        errors.push(`${a.email}: ${e.message}`);
      }
    }

    return new Response(JSON.stringify({ success: true, sent, total: toSend.length, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("[relance-signatures-fin-session] error", e);
    return new Response(JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
