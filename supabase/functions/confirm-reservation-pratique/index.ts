import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DAY_NAMES = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const MONTH_NAMES = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const KNOWN_EXAM_DATES = [
  "27 janvier 2026",
  "31 mars 2026",
  "26 mai 2026",
  "21 juillet 2026",
  "29 septembre 2026",
  "17 novembre 2026",
];

function normalizeText(value: string | null | undefined) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function detectPlanningExamDate(rawDate: string | null) {
  const normalizedRaw = normalizeText(rawDate);
  if (!normalizedRaw) return null;

  return KNOWN_EXAM_DATES.find((date) => normalizedRaw.includes(normalizeText(date))) || null;
}

function formatDateFR(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d, 12, 0, 0);
  return `${DAY_NAMES[dt.getDay()]} ${d} ${MONTH_NAMES[m - 1]} ${y}`;
}

function getShortDayMonth(dateStr: string) {
  const [, m, d] = dateStr.split("-").map(Number);
  const DAYS_SHORT = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  const MONTHS_SHORT = ["jan", "fév", "mar", "avr", "mai", "jun", "jul", "aoû", "sep", "oct", "nov", "déc"];
  const dt = new Date(Number(dateStr.split("-")[0]), m - 1, d, 12);
  return `${DAYS_SHORT[dt.getDay()]} ${d} ${MONTHS_SHORT[m - 1]}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { apprenantId, selectedDate, type, isModification, mode, examDate, pratiqueDate } = body;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // ── LOAD MODE: fetch apprenant + reservation data for the public page ──
    if (mode === "load") {
      if (!apprenantId) {
        return new Response(JSON.stringify({ error: "Missing apprenantId" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const [{ data: appData, error: appErr }, { data: existingRes }, { data: allRes }] = await Promise.all([
        supabase
          .from("apprenants")
          .select("id, prenom, nom, type_apprenant, date_examen_theorique")
          .eq("id", apprenantId)
          .is("deleted_at", null)
          .single(),
        supabase
          .from("reservations_pratique")
          .select("date_choisie")
          .eq("apprenant_id", apprenantId)
          .maybeSingle(),
        supabase
          .from("reservations_pratique")
          .select("date_choisie, type_formation"),
      ]);

      if (appErr || !appData) {
        return new Response(JSON.stringify({ error: "Apprenant non trouvé" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const resolvedExamDate = examDate || detectPlanningExamDate(appData.date_examen_theorique);
      let config = null;
      let allApprenants: unknown[] = [];
      let examApprenants: unknown[] = [];
      let deplacesSession: unknown[] = [];
      let deplacesApprenants: unknown[] = [];
      let dejaFormes: unknown[] = [];
      let existingSessions: unknown[] = [];

      if (resolvedExamDate) {
        if (pratiqueDate) {
          const { data: explicitConfig, error: explicitConfigError } = await supabase
            .from("planning_pratique_config")
            .select("*")
            .eq("exam_date", resolvedExamDate)
            .eq("date_pratique", pratiqueDate)
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (explicitConfigError) throw explicitConfigError;
          config = explicitConfig;
        }

        if (!config) {
          const { data: latestConfig, error: latestConfigError } = await supabase
            .from("planning_pratique_config")
            .select("*")
            .eq("exam_date", resolvedExamDate)
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (latestConfigError) throw latestConfigError;
          config = latestConfig;
        }

        if (config) {
          const [allAppsResult, examAppsResult, deplacesSessionResult, deplacesApprenantsResult, dejaFormesResult, existingSessionsResult] = await Promise.all([
            supabase
              .from("apprenants")
              .select("id, prenom, nom, type_apprenant, date_examen_theorique, resultat_examen, resultat_examen_pratique")
              .is("deleted_at", null)
              .order("nom", { ascending: true }),
            supabase
              .from("apprenants")
              .select("id, prenom, nom, type_apprenant, date_examen_theorique, resultat_examen, resultat_examen_pratique")
              .ilike("date_examen_theorique", `%${resolvedExamDate}%`)
              .is("deleted_at", null)
              .order("nom", { ascending: true }),
            supabase
              .from("session_apprenants")
              .select("apprenant_id, sessions!inner(type_session)")
              .eq("presence_pratique", "deplace")
              .eq("sessions.type_session", "pratique"),
            supabase
              .from("apprenants")
              .select("id")
              .eq("resultat_examen_pratique", "deplace")
              .is("deleted_at", null),
            supabase
              .from("session_apprenants")
              .select("apprenant_id, sessions!inner(type_session)")
              .eq("sessions.type_session", "pratique")
              .eq("presence_pratique", "present"),
            supabase
              .from("sessions")
              .select("id, date_debut, date_fin, type_session, nom")
              .neq("type_session", "pratique")
              .gte("date_fin", config.planning_start_date)
              .lte("date_debut", config.planning_end_date),
          ]);

          if (allAppsResult.error || examAppsResult.error || deplacesSessionResult.error || deplacesApprenantsResult.error || dejaFormesResult.error || existingSessionsResult.error) {
            throw allAppsResult.error || examAppsResult.error || deplacesSessionResult.error || deplacesApprenantsResult.error || dejaFormesResult.error || existingSessionsResult.error;
          }

          allApprenants = allAppsResult.data || [];
          examApprenants = examAppsResult.data || [];
          deplacesSession = deplacesSessionResult.data || [];
          deplacesApprenants = deplacesApprenantsResult.data || [];
          dejaFormes = dejaFormesResult.data || [];
          existingSessions = existingSessionsResult.data || [];
        }
      }

      return new Response(JSON.stringify({
        apprenant: appData,
        existingReservation: existingRes || null,
        allReservations: allRes || [],
        resolvedExamDate,
        config,
        allApprenants,
        examApprenants,
        deplacesSession,
        deplacesApprenants,
        dejaFormes,
        existingSessions,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── CONFIRM MODE ──
    if (!apprenantId || !selectedDate || !type) {
      return new Response(JSON.stringify({ error: "Missing parameters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    // 1. Get apprenant info
    const { data: apprenant, error: appErr } = await supabase
      .from("apprenants")
      .select("id, prenom, nom, email, type_apprenant")
      .eq("id", apprenantId)
      .single();

    if (appErr || !apprenant) {
      return new Response(JSON.stringify({ error: "Apprenant not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Upsert reservation
    if (isModification) {
      // Remove from old session first
      const { data: oldRes } = await supabase
        .from("reservations_pratique")
        .select("date_choisie")
        .eq("apprenant_id", apprenantId)
        .maybeSingle();

      if (oldRes) {
        // Find old session and remove apprenant
        const { data: oldSession } = await supabase
          .from("sessions")
          .select("id")
          .eq("type_session", "pratique")
          .eq("date_debut", oldRes.date_choisie)
          .eq("date_fin", oldRes.date_choisie)
          .maybeSingle();

        if (oldSession) {
          await supabase
            .from("session_apprenants")
            .delete()
            .eq("apprenant_id", apprenantId)
            .eq("session_id", oldSession.id);
        }
      }

      const { error: updateErr } = await supabase
        .from("reservations_pratique")
        .update({ date_choisie: selectedDate, type_formation: type })
        .eq("apprenant_id", apprenantId);

      if (updateErr) throw updateErr;
    } else {
      const { error: insertErr } = await supabase
        .from("reservations_pratique")
        .insert({
          apprenant_id: apprenantId,
          date_choisie: selectedDate,
          type_formation: type,
        });

      if (insertErr) throw insertErr;
    }

    // 3. Update date_examen_pratique
    await supabase
      .from("apprenants")
      .update({ date_examen_pratique: selectedDate })
      .eq("id", apprenantId);

    // 4. Find or create the session for this date
    const formationLabel = type === "vtc" ? "VTC" : "TAXI";
    const shortDate = getShortDayMonth(selectedDate);
    const sessionName = `Formation pratique ${formationLabel} - ${shortDate}`;

    let { data: existingSession } = await supabase
      .from("sessions")
      .select("id")
      .eq("type_session", "pratique")
      .eq("date_debut", selectedDate)
      .eq("date_fin", selectedDate)
      .ilike("nom", `%${formationLabel}%`)
      .maybeSingle();

    let sessionId: string;

    if (existingSession) {
      sessionId = existingSession.id;
    } else {
      // Also check for any pratique session on that date
      const { data: anySession } = await supabase
        .from("sessions")
        .select("id")
        .eq("type_session", "pratique")
        .eq("date_debut", selectedDate)
        .eq("date_fin", selectedDate)
        .maybeSingle();

      if (anySession) {
        sessionId = anySession.id;
      } else {
        // Create the session
        const { data: newSession, error: createErr } = await supabase
          .from("sessions")
          .insert({
            nom: sessionName,
            type_session: "pratique",
            date_debut: selectedDate,
            date_fin: selectedDate,
            heure_debut: type === "vtc" ? "09:00" : "09:00",
            heure_fin: type === "vtc" ? "16:00" : "17:00",
            places_disponibles: 3,
            statut: "planifiee",
            lieu: "86 Route de Genas, 69003 Lyon",
          })
          .select("id")
          .single();

        if (createErr) throw createErr;
        sessionId = newSession.id;
      }
    }

    // 5. Add apprenant to session (ignore if already there)
    const { data: existingLink } = await supabase
      .from("session_apprenants")
      .select("id")
      .eq("apprenant_id", apprenantId)
      .eq("session_id", sessionId)
      .maybeSingle();

    if (!existingLink) {
      await supabase.from("session_apprenants").insert({
        apprenant_id: apprenantId,
        session_id: sessionId,
        presence_pratique: "en_attente",
      });
    }

    // 6. Format email content
    const dateStr = formatDateFR(selectedDate);
    const horaires = type === "vtc" ? "9h00 - 12h00 puis 13h00 - 16h00" : "9h00 - 17h00";
    const exerciceLink = type === "vtc" ? "https://app.formative.com/join/DNFDZS" : "https://app.formative.com/join/ZT924H";
    const exerciceNom = type === "vtc"
      ? '"Formation Pratique VTC" : Quizz Lyon et Questions à apprendre'
      : '"Formation Pratique TAXI" : QCM Taximètre, Cas pratique, Quizz Lyon et Questions à apprendre';

    const actionLabel = isModification ? "Modification" : "Confirmation";

    // 7. Send confirmation email to apprenant
    if (apprenant.email) {
      const subject = `${actionLabel} de votre date de formation pratique ${formationLabel} - ${apprenant.prenom} ${apprenant.nom}`;
      const body = `Bonjour ${apprenant.prenom},\n\nNous ${isModification ? "confirmons la modification de" : "confirmons"} votre inscription à la journée de formation pratique ${formationLabel} :\n\n📅 Date : ${dateStr}\n🕐 Horaires : ${horaires}\n📍 Lieu : 86 Route de Genas, 69003 Lyon\n🍽️ Pause déjeuner : Confluences (12h - 13h)\n\n📚 Rappel important :\nMerci de bien réviser les exercices suivants dans ${exerciceNom}.\nLien : ${exerciceLink}\n\nCordialement,\n\nFTRANSPORT\nCentre de formation\n86 Route de Genas 69003 Lyon\n📞 04.28.29.60.91\nDe 9h à 17h sur rendez-vous`;

      try {
        await supabase.functions.invoke("sync-outlook-emails", {
          body: { action: "send", userEmail: "contact@ftransport.fr", to: apprenant.email, subject, body, apprenantId },
        });
      } catch (e) {
        console.error("Email apprenant failed:", e);
      }
    }

    // 8. Send notification email to admin
    const adminSubject = `📋 ${actionLabel} réservation pratique ${formationLabel} — ${apprenant.prenom} ${apprenant.nom}`;
    const adminBody = `${actionLabel} de réservation pratique :\n\n👤 Apprenant : ${apprenant.prenom} ${apprenant.nom}\n📧 Email : ${apprenant.email || "Non renseigné"}\n🏷️ Formation : ${formationLabel}\n📅 Date choisie : ${dateStr}\n🕐 Horaires : ${horaires}\n\n📌 L'apprenant a été automatiquement ajouté à la session "${sessionName}" dans le planning.`;

    try {
      await supabase.functions.invoke("sync-outlook-emails", {
        body: { action: "send", userEmail: "contact@ftransport.fr", to: "contact@ftransport.fr", subject: adminSubject, body: adminBody },
      });
    } catch (e) {
      console.error("Admin notification email failed:", e);
    }

    return new Response(JSON.stringify({ success: true, sessionId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("confirm-reservation-pratique error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});