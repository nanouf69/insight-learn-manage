import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { createOpenAI } from "npm:@ai-sdk/openai@3";
import { streamText, Output } from "npm:ai@6";
import questions from "./questions.json" with { type: "json" };
import { createLovableAiGatewayRunIdFetch, getLovableAiGatewayResponseHeaders } from "./run-id.ts";
import { VERSION, INSTRUCTIONS, validateGrade, disputedQuestion } from "./core.ts";

const Input = z.object({ quiz: z.enum(["complet", "specialites"]), version: z.literal(VERSION), questionId: z.number().int(), answer: z.string().trim().min(1).max(4000), mode: z.enum(["correct", "read", "retry"]), attemptId: z.string().uuid().optional() }).strict();
const Grade = z.object({ score: z.number().nullable(), verdict: z.enum(["correct", "partial", "incorrect", "review"]), explanation: z.string() }).strict();
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const hash = async (s: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))).map(v => v.toString(16).padStart(2, "0")).join("");

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);
  try {
    const parsed = Input.safeParse(await req.json());
    if (!parsed.success) return json({ error: "Demande de correction invalide (réponse limitée à 4 000 caractères)." }, 400);
    const input = parsed.data;
    const url = Deno.env.get("SUPABASE_URL"), anon = Deno.env.get("SUPABASE_ANON_KEY"), serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), key = Deno.env.get("LOVABLE_API_KEY");
    if (!url || !anon || !serviceKey || !key) return json({ error: "Service de correction non configuré." }, 503);
    const auth = req.headers.get("Authorization") ?? "";
    const client = createClient(url, anon, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
    const { data: userData, error: authError } = await client.auth.getUser();
    if (authError || !userData.user) return json({ error: "Reconnectez-vous pour demander la correction." }, 401);
    const userId = userData.user.id;
    const db = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: role, error: roleError } = await db.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (roleError) return json({ error: "Vérification de l’accès indisponible." }, 503);
    if (!role) {
      const { data: learners, error } = await db.from("apprenants").select("id,modules_autorises,date_debut_cours_en_ligne,date_fin_cours_en_ligne").eq("auth_user_id", userId).is("deleted_at", null).is("compte_cours_archive_at", null);
      if (error) return json({ error: "Vérification de l’accès indisponible." }, 503);
      const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
      let allowed = learners?.some(l => (l.modules_autorises?.includes(11) || (input.quiz === "specialites" && l.modules_autorises?.includes(28))) && l.date_debut_cours_en_ligne && l.date_fin_cours_en_ligne && l.date_debut_cours_en_ligne <= today && l.date_fin_cours_en_ligne >= today);
      if (!allowed) for (const learner of learners ?? []) {
        if (!learner.modules_autorises?.includes(11) && !(input.quiz === 'specialites' && learner.modules_autorises?.includes(28))) continue;
        const extension = await client.rpc('crm_lire_extension_acces', { p_apprenant: learner.id });
        if (extension.error) return json({ error: 'Vérification de l’accès indisponible.' }, 503);
        if (extension.data?.autorise === true) { allowed = true; break; }
      }
      if (!allowed) return json({ error: "Cet entraînement n’est pas accessible à ce compte." }, 403);
    }
    const question = questions.find(q => q.id === input.questionId && (input.quiz === "complet" || q.category === "national"));
    if (!question || (input.quiz === "complet" && question.id === 1)) return json({ error: "Question indisponible dans ce quiz." }, 400);
    const answerHash = await hash(input.answer);
    const identity = await hash(JSON.stringify([userId, input.quiz, VERSION, question.id, answerHash]));
    const sendReceipt = (r: Record<string, unknown>) => json({ identity, receiptId: r.id, status: r.status, result: r.result, error: r.error_message, httpStatus: r.http_status, retryAt: r.retry_at, attempt: r.attempt });
    if (input.mode === "read") {
      const { data, error } = await db.from("qrc_taxi_ia_receipts").select("*").eq("user_id", userId).eq("identity_hash", identity).order("attempt", { ascending: false }).limit(1).maybeSingle();
      if (error) return json({ error: "Lecture de correction indisponible." }, 503);
      return data ? sendReceipt(data) : json({ identity, status: "missing" });
    }
    // All new corrections require a complete immutable optional submission, never a browser flag.
    if (!input.attemptId) return json({ error: 'Soumettez le quiz complet avant de demander une correction.', blocked: true }, 409);
    const { data: submitted, error: submissionError } = await db.from('qrc_practice_attempts').select('owner_id,quiz,submitted_at,submitted_answers').eq('id', input.attemptId).eq('owner_id', userId).maybeSingle();
    if (submissionError) return json({ error: 'Vérification de soumission indisponible.' }, 503);
    if (!submitted?.submitted_at || submitted.quiz !== input.quiz || submitted.submitted_answers?.[`qrc:${input.questionId}`]?.trim() !== input.answer) return json({ error: 'Réponse sans soumission correspondante ; aucune correction lancée.', blocked: true }, 409);
    // Fail closed until a verifiable EUR/credit bound and atomic global budget are available.
    // This affects only optional practice, never official QRC queues or answer saving.
    if (!disputedQuestion(question.id)) return json({ error: 'Correction IA en pause : plafond global de 20 € par mois non encore vérifiable. Votre quiz est sauvegardé et soumis ; aucune note attribuée.', blocked: true }, 402);
    const { data: claim, error: claimError } = await db.rpc("qrc_taxi_ia_claim", { p_user: userId, p_identity: identity, p_quiz: input.quiz, p_version: VERSION, p_question: question.id, p_answer_hash: answerHash, p_retry: input.mode === "retry" });
    if (claimError || !claim) return json({ error: "Réservation de correction indisponible." }, 503);
    if (claim.blocked) return json({ error: claim.message, blocked: true }, claim.status);
    if (!claim.claimed) return sendReceipt(claim.receipt);
    const receipt = claim.receipt;
    const gateway = createLovableAiGatewayRunIdFetch();
    let upstreamStatus: number | undefined;
    let upstreamMessage: string | undefined;
    let upstreamRetryAfter = 0;
    const provider = createOpenAI({ baseURL: "https://ai.gateway.lovable.dev/v1", apiKey: key, headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" }, fetch: async (target, init) => {
      const response = await gateway.fetch(target, init);
      if (!response.ok) {
        upstreamStatus = response.status;
        const seconds = Number(response.headers.get("Retry-After"));
        upstreamRetryAfter = Number.isFinite(seconds) ? seconds * 1000 : 0;
        try { const body = await response.clone().json(); upstreamMessage = body.message ?? body.error?.message; } catch { /* no sensitive body logging */ }
      }
      return response;
    } });
    const encoder = new TextEncoder();
    const body = new ReadableStream({ async start(controller) {
      const emit = (data: unknown) => { try { controller.enqueue(encoder.encode(JSON.stringify(data) + "\n")); } catch { /* receipt remains authoritative after disconnection */ } };
      emit({ identity, receiptId: receipt.id, status: "active" });
      const beat = setInterval(() => emit({ status: "active", identity }), 5000);
      try {
        let grade;
        if (disputedQuestion(question.id)) {
          grade = { score: null, verdict: "review", explanation: "Référence réglementaire en attente d’arbitrage : aucune note définitive n’est attribuée. Consultez l’avertissement de cette question." };
        } else {
          const result = streamText({ model: provider.responses("openai/gpt-6-astra"), system: INSTRUCTIONS, messages: [{ role: "user", content: JSON.stringify({ question: question.qrcQuestion, expected: question.qrcCorrectAnswer, answer: input.answer }) }], output: Output.object({ schema: Grade }), maxOutputTokens: 1800, maxRetries: 0, providerOptions: { openai: { forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] } } });
          grade = validateGrade(await result.output);
        }
        const { error } = await db.from("qrc_taxi_ia_receipts").update({ status: grade.verdict === "review" ? "review" : "done", result: grade, finished_at: new Date().toISOString(), run_id: gateway.getRunId() }).eq("id", receipt.id).eq("status", "active");
        if (error) throw new Error("receipt_write_failed");
        emit({ identity, receiptId: receipt.id, status: grade.verdict === "review" ? "review" : "done", result: grade });
      } catch {
        const status = upstreamStatus ?? 0;
        const message = upstreamMessage || (status ? "Correction IA indisponible." : "Résultat de correction inconnu : aucune nouvelle tentative automatique.");
        const retryAt = [429, 500, 502, 503, 504].includes(status) ? new Date(Date.now() + Math.max(upstreamRetryAfter, 5000 * 2 ** (receipt.attempt - 1) + Math.random() * 1500)).toISOString() : null;
        if ([402, 403].includes(status)) await db.from("qrc_taxi_ia_gate").upsert({ id: true, paused: true, http_status: status, message, updated_at: new Date().toISOString() });
        const { error } = await db.from("qrc_taxi_ia_receipts").update({ status: status ? "error" : "unknown", http_status: status, error_message: message, finished_at: new Date().toISOString(), retry_at: retryAt, run_id: gateway.getRunId() }).eq("id", receipt.id).eq("status", "active");
        console.error(JSON.stringify({ event: "qrc_taxi_ia_error", receipt: receipt.id, status, runId: gateway.getRunId(), receiptSaved: !error }));
        emit({ identity, receiptId: receipt.id, status: status ? "error" : "unknown", error: message, httpStatus: status, retryAt, attempt: receipt.attempt });
      } finally { clearInterval(beat); try { controller.close(); } catch { /* client disconnected */ } }
    } });
    return new Response(body, { headers: getLovableAiGatewayResponseHeaders(undefined, { ...corsHeaders, "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" }) });
  } catch { return json({ error: "Demande invalide ou service indisponible." }, 400); }
});