import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { statutEchecPersistance, traceSauvegarde } from './diagnostic.ts';

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  let operation: unknown;
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    operation = body?.operation_id;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authorization = req.headers.get("Authorization") ?? "";
    const tokenFromQuery = new URL(req.url).searchParams.get("access_token") ?? "";
    const token = authorization.replace(/^Bearer\s+/i, "") || tokenFromQuery;
    if (!token) {
      traceSauvegarde(requestId, 'auth_missing', 401, operation);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) {
      traceSauvegarde(requestId, 'auth_rejected', 401, operation, authError?.code);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      apprenant_id,
      user_id,
      module_id,
      exercice_id,
      exercice_type,
      reponses,
      score,
      completed,
      updated_at,
      base_seq,
      events,
      module_total_questions,
    } = body ?? {};

    if (typeof apprenant_id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(apprenant_id) || typeof exercice_id !== 'string' || !exercice_id || exercice_id.length > 255 || typeof exercice_type !== 'string' || !exercice_type || exercice_type.length > 100 || !reponses || typeof reponses !== "object" || Array.isArray(reponses)) {
      traceSauvegarde(requestId, 'input_rejected', 400, operation, 'INVALID_INPUT');
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const effectiveUserId = authData.user.id;
    const { data: learner, error: learnerError } = await supabase
      .from("apprenants")
      .select("id, auth_user_id")
      .eq("id", apprenant_id)
      .maybeSingle();
    if (learnerError) {
      traceSauvegarde(requestId, 'owner_lookup', 500, operation, learnerError.code);
      return new Response(JSON.stringify({ error: "Learner lookup failed", code: learnerError.code }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!learner) {
      traceSauvegarde(requestId, 'owner_missing', 403, operation);
      return new Response(JSON.stringify({ error: "Forbidden", reason: "apprenant_not_found" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (learner.auth_user_id !== effectiveUserId) {
      traceSauvegarde(requestId, 'owner_mismatch', 403, operation);
      return new Response(JSON.stringify({ error: "Forbidden", reason: "auth_user_id_mismatch" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const safeEvents = Array.isArray(events) ? events.slice(0, 500) : [];
    // ORDRE DES ÉCRITURES DÉCIDÉ PAR LE SERVEUR.
    // `base_seq` = dernier numéro d'écriture connu du client au moment où la
    // réponse a été composée. Le serveur refuse toute valeur plus ancienne que
    // ce qui est déjà enregistré pour la même question, et fige une tentative
    // déjà terminée. L'horloge de l'appareil n'intervient plus (`updated_at`
    // n'est conservé que pour compatibilité des anciens envois).
    void updated_at;
    const safeBaseSeq = Number.isFinite(Number(base_seq)) ? Math.max(0, Math.floor(Number(base_seq))) : 0;
    const { data, error } = await supabase.rpc("persist_answer_batch_v2", {
      p_apprenant_id: apprenant_id,
      p_user_id: effectiveUserId,
      p_module_id: typeof module_id === "number" ? module_id : null,
      p_exercice_id: exercice_id,
      p_exercice_type: exercice_type,
      p_reponses: reponses ?? {},
      p_completed: Boolean(completed),
      p_score: score ?? null,
      p_base_seq: safeBaseSeq,
      p_events: safeEvents,
    });

    if (error || !data?.[0]?.saved) {
      const status = statutEchecPersistance(error?.code);
      traceSauvegarde(requestId, 'persistence_refused', status, operation, error?.code);
      return new Response(
        JSON.stringify({
          error: error?.message ?? "Save was not confirmed",
          code: error?.code,
          request_id: requestId,
        }),
        {
          status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const confirmation = data[0];

    // Sécurité : dès que la dernière réponse est confirmée en base, on vérifie
    // côté serveur si le module est intégralement répondu et, si oui, on force
    // sa validation. Aucune réponse n'est modifiée ni recréée ici.
    let autoValidation: unknown = null;
    const totalQuestions = Number(module_total_questions);
    if (typeof module_id === "number" && Number.isFinite(totalQuestions) && totalQuestions > 0) {
      const { data: av, error: avError } = await supabase.rpc("autovalidate_module_if_complete", {
        _apprenant_id: apprenant_id,
        _module_id: module_id,
        _total_questions: Math.round(totalQuestions),
      });
      if (avError) {
        traceSauvegarde(requestId, 'autovalidation_refused', 500, operation, avError.code);
      } else {
        autoValidation = av?.[0] ?? null;
      }
    }

    traceSauvegarde(requestId, confirmation.frozen ? 'confirmed_frozen' : 'confirmed', 200, operation);
    return new Response(JSON.stringify({
      success: true,
      confirmed: true,
      request_id: requestId,
      exercice_id,
      tentative: confirmation.stored_tentative,
      updated_at: confirmation.stored_updated_at,
      write_seq: confirmation.stored_write_seq ?? 0,
      frozen: confirmation.frozen === true,
      skipped_questions: confirmation.skipped_questions ?? [],
      accepted_event_ids: confirmation.accepted_event_ids ?? [],
      auto_validation: autoValidation,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    traceSauvegarde(requestId, 'unexpected', 500, operation);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
