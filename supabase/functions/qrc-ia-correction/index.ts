// Correction IA des QRC d'examens blancs — élèves E-LEARNING uniquement.
// - interrupteur général (qrc_ia_config) : rien ne se passe s'il est désactivé ;
// - nouveaux passages uniquement (fin après l'activation) ;
// - règles déterministes côté serveur (jamais le niveau de confiance de l'IA) ;
// - une seule analyse payante par QRC/version de réponse (clé d'idempotence unique en base) ;
// - reprise bornée uniquement après 429/5xx fournisseur terminé ; 402/403 = pause globale ;
// - la note IA passe par core_correct_qrc_publish (même calcul de note que le formateur).
import { passageAutoriseAbaBakre, qrcAutoriseeAbaBakre } from "../_shared/qrcRattrapageAbaBakre.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createOpenAICompatible } from "npm:@ai-sdk/openai-compatible";
import { streamText } from "npm:ai";
import { prochaineActionIa } from "../_shared/qrcIaSuite.ts";
import { z } from "npm:zod@3";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import {
  CONSIGNE_IA, MARQUEUR_IA, MODELE_IA_QRC, admissibilite, cleIdempotence, estApprenantElearning, estElearning, estPauseGlobale,
  messageUtilisateur, texteReponse, validerResultatIa, type QuestionSnapshot,
} from "../_shared/qrcIaRegles.ts";

const cors = corsHeaders;
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

async function sha256(s: string) {
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
  return Array.from(d, (b) => b.toString(16).padStart(2, "0")).join("");
}
function uuidDepuis(hex: string) {
  return [hex.slice(0, 8), hex.slice(8, 12), "4" + hex.slice(13, 16), "8" + hex.slice(17, 20), hex.slice(20, 32)].join("-");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!url || !serviceKey || !anonKey) return json({ ok: false, message: "Configuration serveur absente" }, 500);
    const service = createClient(url, serviceKey);
    const auth = req.headers.get("Authorization") ?? "";
    const utilisateur = createClient(url, anonKey, { global: { headers: { Authorization: auth } } });

    const parsed = z.object({ attempt_id: z.string().uuid(), rattrapage: z.boolean().optional(), reprise_qrc_id: z.string().uuid().optional(), interruption_confirmee: z.boolean().optional(), suite_token: z.string().uuid().optional() }).strict().safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ ok: false, message: "Paramètres de correction invalides" }, 400);
    const { attempt_id, rattrapage, reprise_qrc_id, interruption_confirmee, suite_token } = parsed.data;
    if (suite_token && (rattrapage || reprise_qrc_id || interruption_confirmee)) return json({ ok: false, message: "Continuation invalide" }, 400);
    const { data: suite, error: suiteError } = suite_token ? await service.from("qrc_ia_suites").select("attempt_id").eq("attempt_id", attempt_id).eq("token", suite_token).maybeSingle() : { data: null, error: null };
    if (suite_token && (suiteError || !suite)) return json({ ok: false, message: "Continuation non autorisée" }, 403);
    // RATTRAPAGES EXCEPTIONNELS, déclenchés par un administrateur uniquement :
    // - autorisé le 25/09/2026 : passages e-learning de septembre 2026 ;
    // - autorisé le 10/10/2026 : passages e-learning du 01/10 au 10/10/2026 14 h 28 (Paris) ;
    // - autorisé le 21/10/2026 : 64 QRC (EB1/EB4/EB5/EB6) du 17–18/10/2026,
    //   apprenant d2393741-4007-42ca-93c7-6c0b24d4f55e uniquement.
    // L'interrupteur général n'est ni lu ni modifié ; toutes les autres règles
    // restent actives (QRC en attente seulement, idempotence, jamais d'écrasement).
    const estRattrapage = rattrapage === true;
    // [début, fin, restreint?] — restreint = allowlist figée (passages + QRC exactes).
    const PERIODES_RATTRAPAGE: Array<[Date, Date, boolean?]> = [
      [new Date("2026-08-31T22:00:00Z"), new Date("2026-09-30T22:00:00Z")],
      [new Date("2026-09-30T22:00:00Z"), new Date("2026-10-10T12:28:00Z")],
      [new Date("2026-10-17T00:00:00Z"), new Date("2026-10-19T00:00:00Z"), true],
    ];
    if (!attempt_id || typeof attempt_id !== "string") return json({ ok: false, message: "attempt_id requis" }, 400);

    // 1. Interrupteur général
    const { data: cfg } = await service.from("qrc_ia_config").select("*").eq("id", true).maybeSingle();
    if (!estRattrapage && !cfg?.actif) return json({ ok: true, statut: "desactive" });
    if (cfg?.pause_depuis) return json({ ok: true, statut: "en_pause", motif: cfg.pause_motif });

    // 2. Passage + propriétaire
    const { data: att } = await service.from("exam_attempts_v2")
      .select("attempt_id, apprenant_id, exam_id, snapshot, etat, finished_at, is_test").eq("attempt_id", attempt_id).maybeSingle();
    if (!att) return json({ ok: false, message: "passage introuvable" }, 404);
    const { data: proprio } = await utilisateur.rpc("core_est_proprietaire", { p_apprenant_id: att.apprenant_id });
    const { data: userData } = await utilisateur.auth.getUser();
    let admin = false;
    if (userData?.user) {
      const { data: r } = await service.from("user_roles").select("role").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
      admin = !!r;
    }
    if (!proprio && !admin && !suite) return json({ ok: false, message: "non autorisé" }, 403);
    if (estRattrapage && !admin) return json({ ok: false, message: "rattrapage réservé à un administrateur" }, 403);
    if (reprise_qrc_id && !admin) return json({ ok: false, message: "reprise réservée à un administrateur" }, 403);
    if (reprise_qrc_id && (attempt_id !== "3464d018-c56b-4b54-ae83-816add723b94" || ![
      "ebb0b941-9189-4af3-896d-3c605c8ed461", "308b5a5f-c71e-4857-856d-c35e84c58cad", "270acb2e-fa25-46c6-831c-216d8b1506b0",
    ].includes(reprise_qrc_id))) return json({ ok: false, message: "Hors périmètre de reprise autorisé" }, 403);
    if (att.apprenant_id === "c0844007-b999-4385-9665-918e5077c3b5") return json({ ok: true, statut: "exclu" });

    if (att.etat !== "terminee" || !att.finished_at) return json({ ok: true, statut: "passage_non_termine" });
    if (att.is_test) return json({ ok: true, statut: "compte_test_exclu" });
    const finPassage = new Date(att.finished_at);
    const dansPeriodeRattrapage = PERIODES_RATTRAPAGE.some(([d, f, restreint]) => finPassage >= d && finPassage < f && (!restreint || passageAutoriseAbaBakre(attempt_id, att.apprenant_id)));
    // Passage de la liste figée : seules ses QRC listées sont traitées (direct ou suite).
    const filtreAllowlist = (estRattrapage || !!suite) && passageAutoriseAbaBakre(attempt_id, att.apprenant_id);
    if (estRattrapage) {
      if (!dansPeriodeRattrapage) return json({ ok: true, statut: "hors_periode_rattrapage" });
    } else if (suite && dansPeriodeRattrapage) {
      // Continuation d'un rattrapage autorisé : la suite n'a pu être créée que
      // par le service après validation administrateur ; toutes les bornes
      // (un item payant par appel, budget, idempotence) restent actives.
    } else if (!cfg.actif_depuis || finPassage < new Date(cfg.actif_depuis)) {
      return json({ ok: true, statut: "passage_anterieur_activation" });
    }

    // 3. E-learning uniquement
    const { data: app } = await service.from("apprenants").select("type_apprenant, modalite_formation").eq("id", att.apprenant_id).maybeSingle();
    if (!estApprenantElearning(app?.type_apprenant, app?.modalite_formation)) return json({ ok: true, statut: "non_elearning" });

    const questions: QuestionSnapshot[] = Array.isArray(att.snapshot?.questions) ? att.snapshot.questions : [];
    const { data: qrcs, error: lectureErreur } = await service.from("qrc_instances_v2")
      .select("qrc_instance_id, question_id, reponse, etat").eq("attempt_id", attempt_id).eq("etat", "en_attente");
    if (lectureErreur) throw lectureErreur;

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!reprise_qrc_id && !estRattrapage && !(suite && dansPeriodeRattrapage) && finPassage < new Date("2026-10-20T09:53:00Z")) return json({ ok: true, statut: "historique_sans_reprise_auto" });
    const automatique = !reprise_qrc_id;
    if (automatique) {
      const { data: acquired, error } = await service.rpc("qrc_ia_suite_claim", { p_attempt: attempt_id, p_token: suite_token ?? null });
      if (error) throw error;
      if (!acquired) return json({ ok: true, statut: "suite_non_acquise" });
    }
    const finirSuite = async (statut: string, message: string | null, delay = 60000) => {
      if (!automatique) return;
      const { data: job, error: readError } = await service.from("qrc_ia_suites").select("remaining").eq("attempt_id", attempt_id).single();
      if (readError) throw readError;
      if (statut === "attente" && job.remaining <= 0) { statut = "a_verifier"; message = "Budget de continuation épuisé"; }
      const { error } = await service.from("qrc_ia_suites").update({ statut, message, next_at: new Date(Date.now() + delay).toISOString(), lease_until: null }).eq("attempt_id", attempt_id).eq("statut", "en_cours");
      if (error) throw error;
      if (statut === "a_verifier" || statut === "pause") {
        const { error: alertError } = await service.from("alertes_systeme").insert({ type: "qrc_ia_suite", titre: "Correction QRC à vérifier", message: message ?? "Correction à vérifier", details: JSON.stringify({ attempt_id }), lu: false });
        if (alertError) throw alertError;
      }
    };
    const bilan: Record<string, number> = {};
    const compter = (s: string) => { bilan[s] = (bilan[s] ?? 0) + 1; };

    for (const inst of qrcs ?? []) {
      if (reprise_qrc_id && inst.qrc_instance_id !== reprise_qrc_id) continue;
      if (filtreAllowlist && !qrcAutoriseeAbaBakre(inst.qrc_instance_id, attempt_id)) { compter("hors_allowlist"); continue; }
      const q = questions.find((x) => String(x.id) === String(inst.question_id)) ?? null;
      const matiere = String(q?.matiere ?? att.snapshot?.matiere ?? "");
      const reponseHash = await sha256(texteReponse(inst.reponse));
      const cle = cleIdempotence({
        apprenantId: att.apprenant_id, examId: att.exam_id, matiere, attemptId: attempt_id,
        questionId: inst.question_id, reponseHash,
      });
      const decision = admissibilite(q, inst.reponse);
      const base = {
        cle_idempotence: cle, qrc_instance_id: inst.qrc_instance_id, attempt_id, apprenant_id: att.apprenant_id,
        question_id: inst.question_id, exam_id: att.exam_id, matiere, reponse_hash: reponseHash, modele: MODELE_IA_QRC,
      };
      if (!decision.admissible) {
        const { error } = await service.from("qrc_ia_corrections").upsert({ ...base, statut: decision.statut, motif: decision.motif, termine_at: new Date().toISOString() }, { onConflict: "cle_idempotence", ignoreDuplicates: true });
        if (error) throw error;
        compter(decision.motif); continue;
      }
      if (decision.admissible) {
        if (!q) { await finirSuite("a_verifier", "Question absente du snapshot"); return json({ ok: false, message: "Question absente" }, 400); }
        if (!key) { await finirSuite("a_verifier", "Service IA non configuré"); return json({ ok: false, message: "Service IA non configuré" }, 401); }
        if (automatique) {
          const { data: old, error: oldError } = await service.from("qrc_ia_corrections").select("statut,http_status,termine_at,created_at").eq("qrc_instance_id", inst.qrc_instance_id).maybeSingle();
          const { data: retries, error: retriesError } = await service.from("qrc_ia_reprises").select("statut,http_status,termine_at,created_at,numero").eq("qrc_instance_id", inst.qrc_instance_id).order("numero", { ascending: false }).limit(1);
          if (oldError || retriesError) throw oldError ?? retriesError;
          const action = prochaineActionIa(retries?.[0] ?? old);
          if (action.action === "fin") continue;
          if (action.action !== "appel") { await finirSuite(action.action === "attendre" ? "attente" : "a_verifier", "Correction en attente de reprise contrôlée ou de revue", Math.max(action.delai, 60000)); return json({ ok: true, statut: action.action }); }
        }
        const { data: claim, error: claimError } = automatique
          ? await service.rpc("qrc_ia_reserver_auto", { p_qrc: inst.qrc_instance_id, p_base: { ...base, bareme: decision.bareme } })
          : await service.rpc("qrc_ia_reserver_reprise", { p_qrc: inst.qrc_instance_id, p_base: { ...base, bareme: decision.bareme }, p_interruption_confirmee: interruption_confirmee === true });
        if (claimError) throw claimError;
        if (!claim) { await finirSuite("a_verifier", "Réservation non acquise ; aucune relance payante"); return json({ ok: true, statut: "reprise_non_acquise" }); }
        const lease = typeof claim === "string" ? claim : String((claim as { id: string }).id);
        const initial = typeof claim !== "string" && (claim as { type: string }).type === "initial";
        let runId: string | null = null;
        let retryAfterMs = 120000;
        let providerFinished = false;
        let streamError: unknown;
        const finishError = async (status: number, message: string, statut = "erreur") => {
          const { error } = initial
            ? await service.from("qrc_ia_corrections").update({ statut, http_status: status, motif: message, termine_at: new Date().toISOString() }).eq("id", lease).eq("statut", "en_cours")
            : await service.from("qrc_ia_reprises").update({ statut, http_status: status, message, termine_at: new Date().toISOString(), run_id: runId }).eq("id", lease).eq("statut", "en_cours");
          if (error) throw error;
        };
        try {
          const gateway = createOpenAICompatible({ name: "lovable", baseURL: "https://ai.gateway.lovable.dev/v1", headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" }, fetch: async (input, init) => {
            const response = await fetch(input, init);
            runId = response.headers.get("X-Lovable-AIG-Run-ID");
            const retryAfter = response.headers.get("Retry-After");
            if (retryAfter) {
              const delay = Number.isFinite(Number(retryAfter)) ? Number(retryAfter) * 1000 : Date.parse(retryAfter) - Date.now();
              if (Number.isFinite(delay)) retryAfterMs = Math.max(retryAfterMs, delay);
            }
            return response;
          } });
          // Un seul item par invocation explicite. Flux fournisseur, aucun timer
          // ni retry SDK : une issue inconnue reste verrouillée pour revue humaine.
          const result = streamText({ model: gateway(MODELE_IA_QRC), system: CONSIGNE_IA, prompt: messageUtilisateur(q, decision.bareme, inst.reponse), maxRetries: 0, onError: ({ error }) => { streamError = error; } });
          const text = await result.text;
          if (streamError) throw streamError;
          providerFinished = true;
          if (await result.finishReason !== "stop") {
            await finishError(200, "Flux IA incomplet ou refusé", "a_verifier");
            await finirSuite("a_verifier", "Flux IA incomplet ou refusé ; aucune publication");
            return json({ ok: false, message: "Flux IA incomplet ou refusé" }, 422);
          }
          if (!text.trim()) {
            await finishError(200, "Réponse IA vide ou refusée", "a_verifier");
            await finirSuite("a_verifier", "Réponse IA vide ou refusée");
            return json({ ok: false, message: "Réponse IA vide ou refusée" }, 422);
          }
          const validated = validerResultatIa(text, decision.bareme);
          if (!validated.valide) {
            await finishError(200, validated.motif, "a_verifier");
            await finirSuite("a_verifier", validated.motif);
            return json({ ok: false, message: validated.motif }, 422);
          }
          const { data: proof, error } = automatique ? await service.rpc("qrc_ia_publier_auto", {
            p_id: lease, p_initial: initial, p_attempt: attempt_id, p_qrc: inst.qrc_instance_id, p_reponse: inst.reponse,
            p_operation: uuidDepuis(await sha256(`qrc-ia:${cle}`)), p_note: validated.note, p_justification: validated.justification, p_run_id: runId,
          }) : await service.rpc("qrc_ia_publier_reprise", {
            p_id: lease, p_operation: uuidDepuis(await sha256(`qrc-ia:${cle}`)), p_note: validated.note, p_justification: validated.justification, p_run_id: runId,
          });
          if (error) throw error;
          // One paid item per invocation. The durable queue dispatches the next item after cooldown.
          await finirSuite((qrcs?.length ?? 0) > 1 ? "attente" : "terminee", null);
          return json({ ok: true, statut: "reprise_terminee", preuve: proof, run_id: runId });
        } catch (e) {
          // Sans statut fournisseur, l'issue (et la facturation) est inconnue :
          // terminal pour cette reprise, jamais assimilée à un 5xx rejouable.
          // Publication/readback failure after successful AI must never rebill.
          const upstreamStatus = providerFinished ? undefined : (e as { statusCode?: number }).statusCode;
          const status = Number(upstreamStatus ?? 499);
          const message = String((e as { message?: string }).message ?? "Service IA indisponible").slice(0, 600);
          await finishError(status, message, upstreamStatus ? "erreur" : "a_verifier");
          if (estPauseGlobale(status)) {
            const { error: pauseError } = await service.from("qrc_ia_config").update({ pause_motif: message, pause_depuis: new Date().toISOString() }).eq("id", true);
            if (pauseError) { await finirSuite("pause", message); throw pauseError; }
          }
          const retryable = status === 429 || (status >= 500 && status <= 599 && upstreamStatus !== undefined);
          await finirSuite(estPauseGlobale(status) ? "pause" : retryable ? "attente" : "a_verifier", message, retryAfterMs + Math.floor(Math.random() * 5000));
          return json({ ok: false, message, run_id: runId }, status >= 400 && status <= 599 ? status : 500);
        }
      }

    }
    const revueNecessaire = (qrcs ?? []).some((inst) => {
      const question = questions.find((q) => String(q.id) === String(inst.question_id)) ?? null;
      const decision = admissibilite(question, inst.reponse);
      return !decision.admissible && decision.statut === "a_verifier";
    });
    await finirSuite(revueNecessaire ? "a_verifier" : "terminee", revueNecessaire ? "QRC non admissible : correction formateur requise" : null);
    return json({ ok: true, statut: "traite", bilan });
  } catch (e) {
    console.error("[qrc-ia-correction]", e);
    return json({ ok: false, message: "erreur interne" }, 500);
  }
});
