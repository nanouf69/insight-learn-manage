import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Considérés comme présentiels (doivent émarger). Tout suffixe "-e" pur => e-learning, exclus.
const PRESENTIEL_TYPES = [
  "vtc", "vtc-exam", "taxi", "taxi-exam",
  "vtc-e-presentiel", "taxi-e-presentiel", "ta-e-presentiel",
  "formation-continue-vtc", "formation-continue-taxi", "pa-vtc",
  "ta", "pa", "rp",
];

const isPresentiel = (a: any) => {
  const t = (a.type_apprenant || a.formation_choisie || "").toLowerCase().trim();
  if (!t) return false;
  // Exclure pure e-learning : suffixe "-e" sans "-presentiel"
  if (/-e$/.test(t)) return false;
  return PRESENTIEL_TYPES.includes(t);
};

// Détecte cours du soir si heure_debut >= 17:00
function estCoursDuSoir(heure_debut: string | null): boolean {
  if (!heure_debut) return false;
  const h = parseInt(heure_debut.split(":")[0] || "0", 10);
  return h >= 17;
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function apprenantPublics(typeApprenant: string): string[] {
  const t = (typeApprenant || "").toLowerCase();
  const out: string[] = [];
  if (t === "taxi" || t === "taxi-e") out.push("TAXI");
  if (t === "ta" || t === "ta-e" || t.includes("passerelle-ta") || t.includes("passerelle-taxi")) out.push("TA");
  if (t === "vtc" || t === "vtc-e") out.push("VTC");
  if (t === "va" || t === "va-e" || t === "pa vtc" || t.includes("passerelle-va") || t.includes("passerelle-vtc")) out.push("VA");
  return out;
}

// Retourne les dates réelles de cours (à partir d'agenda_blocs) entre debut et min(today-1, fin)
// pour un apprenant donné. Ne compte QUE les jours passés (pas aujourd'hui, pas le futur).
async function joursDeCoursPasses(
  supabase: any,
  session: { date_debut: string; date_fin: string },
  typeApprenant: string,
  today: Date,
): Promise<string[]> {
  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayStr = fmtDate(yesterday);
  const capStr = session.date_fin < yesterdayStr ? session.date_fin : yesterdayStr;
  if (capStr < session.date_debut) return [];

  const start = new Date(session.date_debut + "T00:00:00Z");
  const semaineMin = new Date(start);
  semaineMin.setUTCDate(semaineMin.getUTCDate() - 6);

  const { data: blocs } = await supabase
    .from("agenda_blocs")
    .select("semaine_debut, jour, formation, publics_cibles, heure_debut")
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
    if (cibles.length > 0) {
      match = publics.length === 0 || publics.some((p) => cibles.includes(p));
    } else {
      match = matchFormation(b.formation);
    }
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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    console.log(`[relance-emargements] Run ${todayStr}`);

    // Sessions en cours
    const { data: sessions, error: sErr } = await supabase
      .from("sessions")
      .select("id, nom, date_debut, date_fin, heure_debut, type_session, statut")
      .lte("date_debut", todayStr)
      .gte("date_fin", todayStr)
      .neq("type_session", "pratique");
    if (sErr) throw sErr;

    if (!sessions || sessions.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, message: "Aucune session en cours" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    type Cible = { apprenant: any; sessionNom: string; signed: number; expected: number; gap: number };
    const cibles: Cible[] = [];

    for (const session of sessions) {
      const soir = estCoursDuSoir(session.heure_debut);
      const demiJourneesParJour = soir ? 1 : 2;

      // Apprenants de la session
      const { data: liens } = await supabase
        .from("session_apprenants")
        .select("apprenant_id, apprenants!inner(id, nom, prenom, email, type_apprenant, formation_choisie, auth_user_id)")
        .eq("session_id", session.id);

      for (const lien of liens || []) {
        const a: any = (lien as any).apprenants;
        if (!a || !a.email) continue;
        if (!isPresentiel(a)) continue;

        // Jours de cours RÉELS déjà passés (basé sur agenda_blocs, exclut weekends/futur/aujourd'hui)
        const joursPasses = await joursDeCoursPasses(
          supabase,
          { date_debut: session.date_debut, date_fin: session.date_fin },
          a.type_apprenant || a.formation_choisie || "",
          today,
        );
        const expected = joursPasses.length * demiJourneesParJour;
        if (expected < 3) continue; // tolérance début de session

        // Compter les émargements signés sur ces jours de cours passés uniquement
        const { count } = await supabase
          .from("emargements_fc")
          .select("id", { count: "exact", head: true })
          .eq("apprenant_id", a.id)
          .in("date_emargement", joursPasses);

        const signed = count || 0;
        const gap = expected - signed;
        if (gap >= 3) {
          cibles.push({ apprenant: a, sessionNom: session.nom || "", signed, expected, gap });
        }
      }
    }

    console.log(`[relance-emargements] ${cibles.length} cibles potentielles`);

    if (cibles.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, message: "Aucun retardataire" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Anti-spam : skip si déjà relancé sur ce sujet dans les 7 derniers jours
    const sevenDaysAgo = new Date(today); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const ids = [...new Set(cibles.map((c) => c.apprenant.id))];
    const recents = new Set<string>();
    for (const id of ids) {
      const { data } = await supabase
        .from("emails")
        .select("apprenant_id")
        .eq("apprenant_id", id)
        .ilike("subject", "%RAPPEL ÉMARGEMENT%")
        .gte("sent_at", sevenDaysAgo.toISOString())
        .limit(1);
      if (data && data.length > 0) recents.add(id);
    }
    const toSend = cibles.filter((c) => !recents.has(c.apprenant.id));
    console.log(`[relance-emargements] ${toSend.length} à envoyer (${recents.size} déjà relancés)`);

    if (toSend.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, message: "Tous déjà relancés récemment" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // MS Graph token
    const tenantId = Deno.env.get("MS_GRAPH_TENANT_ID");
    const clientId = Deno.env.get("MS_GRAPH_CLIENT_ID");
    const clientSecret = Deno.env.get("MS_GRAPH_CLIENT_SECRET");
    if (!tenantId || !clientId || !clientSecret) {
      return new Response(JSON.stringify({ error: "MS Graph credentials not configured" }),
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
      const subject = `⚠️ RAPPEL ÉMARGEMENT - Justificatif requis`;
      const html = `
<div style="font-family:Arial,sans-serif;max-width:640px;color:#222;line-height:1.5">
  <p>Bonjour ${a.prenom || ""} ${a.nom || ""},</p>
  <p>Nous constatons que <strong>plusieurs demi-journées d'émargement sont manquantes</strong> sur votre session de formation${c.sessionNom ? ` "<strong>${c.sessionNom}</strong>"` : ""} (${c.signed}/${c.expected} demi-journées signées à ce jour).</p>
  <p><strong>En cas d'absence, vous devez impérativement nous fournir un justificatif</strong> (arrêt de travail, certificat médical, convocation officielle, etc.).</p>
  <div style="background:#fff4e5;border-left:4px solid #ff9800;padding:12px 16px;margin:16px 0">
    <strong>⚠️ Risque concernant votre dossier CPF :</strong><br/>
    Sans justificatif, votre dossier CPF peut être <strong>suspendu</strong>, faire l'objet d'une <strong>demande de remboursement</strong>, voire être <strong>annulé</strong>.
  </div>
  <p>Merci de :</p>
  <ul>
    <li><strong>Émarger chaque demi-journée</strong> via votre espace apprenant</li>
    <li>Nous transmettre tout justificatif d'absence par retour de mail</li>
  </ul>
  <p>Pour toute question, n'hésitez pas à nous contacter.</p>
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
          const t = await r.text();
          errors.push(`${a.email}: ${r.status} ${t.slice(0, 200)}`);
          continue;
        }
        await supabase.from("emails").insert({
          apprenant_id: a.id,
          subject,
          body_html: html,
          body_preview: `Rappel émargement (${c.signed}/${c.expected})`,
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

    return new Response(JSON.stringify({ success: true, sent, total_cibles: toSend.length, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("[relance-emargements] error", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
