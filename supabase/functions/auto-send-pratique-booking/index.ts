// Envoi automatique du lien de reservation de la formation pratique
// des qu'un candidat (VTC ou TAXI) a termine le module Pratique correspondant
// (module_id 8 pour VTC, 6 pour TAXI) et a reussi l'examen theorique.
// Deduplique via la table emails (type = 'auto_pratique_booking').
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendBrandedEmail } from "../_shared/send-branded-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRACTICE_VTC_TYPES = new Set(['vtc', 'vtc-e', 'vtc-e-presentiel', 'va', 'va-e', 'va-e-presentiel', 'pa-vtc', 'rp-vtc']);
const PRACTICE_TAXI_TYPES = new Set(['taxi', 'taxi-e', 'taxi-e-presentiel', 'ta', 'ta-e', 'ta-e-presentiel', 'pa-taxi', 'rp-taxi']);
const EMAIL_TYPE = 'auto_pratique_booking';
const APP_BASE = 'https://insight-learn-manage.lovable.app';

function buildUrl(id: string, type: 'vtc' | 'taxi', exam: string, pratique?: string | null) {
  const p = new URLSearchParams({ id, type, exam });
  if (pratique) p.set('pratique', pratique);
  return `${APP_BASE}/reservation-pratique?${p.toString()}`;
}

function buildEmail(prenom: string, nom: string, type: 'vtc' | 'taxi', bookingUrl: string, ignoreModule = false, apology = false, relance = false) {
  const label = type === 'vtc' ? 'VTC' : 'TAXI';
  const exercicesLabel = type === 'vtc'
    ? '"Formation Pratique VTC" : Quizz Lyon et Questions à apprendre'
    : '"Formation Pratique TAXI" : QCM Taximètre, Cas pratique, Quizz Lyon et Questions à apprendre';
  if (relance) {
    const subject = `RAPPEL URGENT - Choisissez votre date d'entraînement pratique ${label}`;
    const body = `Bonjour ${prenom},<br><br>Vous n'avez <strong>toujours pas choisi votre date d'entraînement pratique ${label}</strong>.<br><br>Merci de la choisir dès maintenant parmi les journées disponibles :<br><strong>24, 25, 26 et 27 août 2026</strong>.<br><br>👉 <a href="${bookingUrl}" style="background:#2563eb;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block">CHOISIR MA DATE</a><br><br>⚠️ Places limitées à <strong>3 candidats par journée</strong> : premier arrivé, premier servi.<br><br>📍 RDV au 86 Route de Genas 69003 Lyon (journée complète 9h/12h puis 13h/16h).<br><br>📚 Pensez à réviser les exercices de ${exercicesLabel}.<br><br>Cordialement,<br><br>FTRANSPORT<br>📞 04.28.29.60.91`;
    return { subject, body };
  }
  if (apology) {
    const subject = `Important - Merci de rechoisir votre date de formation pratique ${label}`;
    const body = `Bonjour ${prenom},<br><br>Suite à un <strong>dysfonctionnement informatique</strong> de notre plateforme, des dates d'entraînement pratique ont été proposées par erreur (notamment les 3 et 4 septembre), alors que le véhicule n'est pas disponible ces jours-là.<br><br>Nous vous prions de nous excuser pour cette erreur qui nous est entièrement imputable.<br><br>👉 Merci de <strong>choisir à nouveau votre date</strong> parmi les journées réellement disponibles :<br><br><a href="${bookingUrl}" style="background:#2563eb;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block">CHOISIR MA NOUVELLE DATE</a><br><br>⚠️ Places limitées à <strong>3 candidats par journée</strong> : premier arrivé, premier servi.<br><br>📍 RDV au 86 Route de Genas 69003 Lyon (journée complète 9h/12h puis 13h/16h).<br><br>Encore toutes nos excuses,<br><br>FTRANSPORT<br>📞 04.28.29.60.91`;
    return { subject, body };
  }

  const subject = ignoreModule
    ? `Choisissez votre date de formation pratique ${label} - ${prenom} ${nom}`
    : `Félicitations - Choisissez votre date de formation pratique ${label} - ${prenom} ${nom}`;
  const intro = ignoreModule
    ? `Vous n'avez pas encore choisi votre date d'entraînement pratique <strong>${label}</strong>.`
    : `Félicitations, vous venez de terminer le module <strong>Formation Pratique ${label}</strong> !`;
  const rappel = ignoreModule
    ? `<br><br>📚 Pensez à terminer le module e-learning <strong>Formation Pratique ${label}</strong> avant votre journée d'entraînement.`
    : '';
  const body = `Bonjour ${prenom},<br><br>${intro}<br><br>Vous pouvez dès maintenant choisir votre date d'entraînement pratique (journée complète de 9h à 16h - 9h/12h puis 13h/16h).<br><br>👉 <a href="${bookingUrl}" style="background:#2563eb;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block">CHOISISSEZ VOTRE DATE ICI</a><br><br>⚠️ Attention : une seule date, aucun changement possible.${rappel}<br><br>📚 Continuez à réviser les exercices de ${exercicesLabel}.<br><br>📍 RDV au 86 Route de Genas 69003 Lyon à la date que vous aurez choisie.<br><br>Cordialement,<br><br>FTRANSPORT<br>📞 04.28.29.60.91`;
  return { subject, body };
}

function buildSms(prenom: string, type: 'vtc' | 'taxi', bookingUrl: string) {
  const label = type === 'vtc' ? 'VTC' : 'TAXI';
  return `Bonjour ${prenom}, felicitations vous avez termine le module Pratique ${label}. Reservez votre date d'entrainement ici: ${bookingUrl} FTRANSPORT 04.28.29.60.91`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({} as any));
    const dryRun: boolean = !!body?.dryRun;
    const sendSms: boolean = body?.sendSms !== false; // default true
    // Pilot mode: restrict the run to specific learners or a max count
    const onlyIds: string[] | null = Array.isArray(body?.onlyIds) && body.onlyIds.length ? body.onlyIds.map(String) : null;
    const limit: number | null = Number.isFinite(body?.limit) && body.limit > 0 ? Math.floor(body.limit) : null;
    // Envoi a tous ceux qui n'ont pas encore choisi de date, meme sans module Pratique termine
    const ignoreModule: boolean = !!body?.ignoreModule;
    const apology: boolean = !!body?.apology;
    const relance: boolean = !!body?.relance;

    // 1. Toutes les completions des modules pratique
    const doneVtc = new Set<string>();
    const doneTaxi = new Set<string>();
    {
      const pageSize = 1000;
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("apprenant_module_completion")
          .select("apprenant_id, module_id")
          .eq("status", "completed")
          .in("module_id", [6, 8])
          .range(from, from + pageSize - 1);
        if (error) throw error;
        (data || []).forEach((r: any) => {
          if (!r.apprenant_id) return;
          if (r.module_id === 8) doneVtc.add(r.apprenant_id);
          if (r.module_id === 6) doneTaxi.add(r.apprenant_id);
        });
        if (!data || data.length < pageSize) break;
        from += pageSize;
      }
    }

    const doneIds = new Set<string>([...doneVtc, ...doneTaxi]);
    if (doneIds.size === 0 && !ignoreModule) {
      return new Response(JSON.stringify({ ok: true, sent: 0, note: "aucune completion" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Reservations existantes
    const reserved = new Set<string>();
    {
      const { data } = await supabase.from("reservations_pratique").select("apprenant_id");
      (data || []).forEach((r: any) => r.apprenant_id && reserved.add(r.apprenant_id));
    }

    // 3. Deja envoye (marqueur unique dans outlook_message_id)
    const alreadySent = new Set<string>();
    {
      const pageSize = 1000;
      let from = 0;
      while (true) {
        const { data } = await supabase
          .from("emails")
          .select("apprenant_id, outlook_message_id")
          .like("outlook_message_id", `${EMAIL_TYPE}:%`)
          .range(from, from + pageSize - 1);
        (data || []).forEach((r: any) => r.apprenant_id && alreadySent.add(r.apprenant_id));
        if (!data || data.length < pageSize) break;
        from += pageSize;
      }
    }

    // 4. Apprenants eligibles
    let apprenants: any[] = [];
    if (ignoreModule) {
      const pageSize = 1000;
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("apprenants")
          .select("id, nom, prenom, email, telephone, type_apprenant, resultat_examen, date_examen_theorique, deleted_at")
          .eq("resultat_examen", "oui")
          .range(from, from + pageSize - 1);
        if (error) throw error;
        apprenants.push(...(data || []));
        if (!data || data.length < pageSize) break;
        from += pageSize;
      }
      apprenants = apprenants.filter((a) => !reserved.has(a.id) && (relance || !alreadySent.has(a.id)));
    } else {
      const { data, error: appErr } = await supabase
        .from("apprenants")
        .select("id, nom, prenom, email, telephone, type_apprenant, resultat_examen, date_examen_theorique, deleted_at")
        .in("id", Array.from(doneIds).filter((id) => !reserved.has(id) && !alreadySent.has(id)));
      if (appErr) throw appErr;
      apprenants = data || [];
    }

    const eligible: Array<{ a: any; type: 'vtc' | 'taxi' }> = [];
    for (const a of apprenants) {
      if (a.deleted_at) continue;
      if (!a.email) continue;
      if (onlyIds && !onlyIds.includes(a.id)) continue;
      if ((a as any).resultat_examen !== 'oui') continue;
      const t = String(a.type_apprenant || '').toLowerCase().trim();
      let type: 'vtc' | 'taxi' | null = null;
      if (PRACTICE_VTC_TYPES.has(t) && (ignoreModule || doneVtc.has(a.id))) type = 'vtc';
      else if (PRACTICE_TAXI_TYPES.has(t) && (ignoreModule || doneTaxi.has(a.id))) type = 'taxi';
      if (!type) continue;
      eligible.push({ a, type });
      if (limit && eligible.length >= limit) break;
    }

    if (dryRun) {
      return new Response(JSON.stringify({
        ok: true, dryRun: true, count: eligible.length,
        candidates: eligible.map(({ a, type }) => ({ id: a.id, nom: a.nom, prenom: a.prenom, type, email: a.email })),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 5. Planning config cache par exam_date
    const planningCache = new Map<string, string | null>();
    async function pratiqueForExam(examDate: string | null | undefined): Promise<string | null> {
      if (!examDate) return null;
      if (planningCache.has(examDate)) return planningCache.get(examDate) ?? null;
      const { data } = await supabase
        .from("planning_pratique_config")
        .select("date_pratique")
        .ilike("exam_date", `%${examDate}%`)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const val = (data as any)?.date_pratique || null;
      planningCache.set(examDate, val);
      return val;
    }

    const senderEmail = "contact@ftransport.fr";
    let sent = 0;
    let smsSent = 0;
    const failures: any[] = [];

    for (const { a, type } of eligible) {
      try {
        const examLabel = String(a.date_examen_theorique || '').trim();
        const pratiqueLabel = await pratiqueForExam(examLabel);
        const url = buildUrl(a.id, type, examLabel || 'na', pratiqueLabel);
        const { subject, body: html } = buildEmail(a.prenom || '', a.nom || '', type, url, ignoreModule, apology, relance);
        const marker = relance ? `${EMAIL_TYPE}:relance-aout:${a.id}` : `${EMAIL_TYPE}:${a.id}`;

        // Verrou anti-doublon : la contrainte UNIQUE sur outlook_message_id
        // empeche tout second envoi, meme en cas d'appels concurrents.
        const { data: lockRow, error: lockErr } = await supabase
          .from("emails")
          .insert({
            apprenant_id: a.id,
            type: 'sent',
            outlook_message_id: marker,
            subject,
            body_html: html,
            body_preview: `Lien reservation pratique ${type.toUpperCase()} - envoi en cours`,
            sender_email: senderEmail,
            sender_name: "FTRANSPORT",
            recipients: [a.email],
            is_read: true,
            has_attachments: false,
            sent_at: new Date().toISOString(),
          })
          .select("id")
          .single();
        if (lockErr) { continue; } // deja envoye

        let okSend = false;
        let errText = '';

        try {
          await sendBrandedEmail({ to: a.email, subject, html, replyTo: senderEmail });
          okSend = true;
        } catch (sendError) {
          errText = sendError instanceof Error ? sendError.message : String(sendError);
        }


        if (okSend) {
          await supabase.from("emails")
            .update({ body_preview: `Lien reservation pratique ${type.toUpperCase()} envoye automatiquement` })
            .eq("id", (lockRow as any).id);
          sent++;
          if (sendSms && a.telephone) {
            try {
              const { data: smsData, error: smsErr } = await supabase.functions.invoke('send-sms-ovh', {
                body: { receivers: [a.telephone], message: buildSms(a.prenom || '', type, url), sender: 'FTRANSPORT' },
              });
              if (!smsErr && (smsData as any)?.success) smsSent++;
            } catch (_) { /* SMS best-effort */ }
          }
        } else {
          // libere le verrou pour permettre une nouvelle tentative
          await supabase.from("emails").delete().eq("id", (lockRow as any).id);
          failures.push({ id: a.id, email: a.email, error: errText });
        }
      } catch (e) {
        failures.push({ id: a.id, error: String(e) });
      }
    }

    if (sent > 0 || failures.length > 0) {
      await supabase.from("alertes_systeme").insert({
        type: "auto_pratique_booking",
        titre: `🚗 Envoi automatique lien réservation pratique`,
        message: `${sent} lien(s) envoyé(s), ${smsSent} SMS, ${failures.length} échec(s)`,
        details: JSON.stringify({ sent, smsSent, failures }),
        lu: false,
      });
    }

    return new Response(JSON.stringify({ ok: true, eligible: eligible.length, sent, smsSent, failures }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
