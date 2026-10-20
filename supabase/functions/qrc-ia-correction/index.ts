// Correction IA des QRC d'examens blancs — élèves E-LEARNING uniquement.
// - interrupteur général (qrc_ia_config) : rien ne se passe s'il est désactivé ;
// - nouveaux passages uniquement (fin après l'activation) ;
// - règles déterministes côté serveur (jamais le niveau de confiance de l'IA) ;
// - une seule analyse payante par QRC/version de réponse (clé d'idempotence unique en base) ;
// - aucune nouvelle tentative automatique ; 402/403 = pause globale ;
// - la note IA passe par core_correct_qrc_publish (même calcul de note que le formateur).
import { createClient } from "npm:@supabase/supabase-js@2";
import { createOpenAICompatible } from "npm:@ai-sdk/openai-compatible";
import { generateText } from "npm:ai";
import { streamText } from "npm:ai";
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

    const parsed = z.object({ attempt_id: z.string().uuid(), rattrapage: z.boolean().optional(), reprise_qrc_id: z.string().uuid().optional(), interruption_confirmee: z.boolean().optional() }).strict().safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ ok: false, message: "Paramètres de correction invalides" }, 400);
    const { attempt_id, rattrapage, reprise_qrc_id, interruption_confirmee } = parsed.data;
    // RATTRAPAGES EXCEPTIONNELS, déclenchés par un administrateur uniquement :
    // - autorisé le 25/09/2026 : passages e-learning de septembre 2026 ;
    // - autorisé le 10/10/2026 : passages e-learning du 01/10 au 10/10/2026 14 h 28 (Paris).
    // L'interrupteur général n'est ni lu ni modifié ; toutes les autres règles
    // restent actives (QRC en attente seulement, idempotence, jamais d'écrasement).
    const estRattrapage = rattrapage === true;
    const PERIODES_RATTRAPAGE: Array<[Date, Date]> = [
      [new Date("2026-08-31T22:00:00Z"), new Date("2026-09-30T22:00:00Z")],
      [new Date("2026-09-30T22:00:00Z"), new Date("2026-10-10T12:28:00Z")],
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
    if (!proprio && !admin) return json({ ok: false, message: "non autorisé" }, 403);
    if (estRattrapage && !admin) return json({ ok: false, message: "rattrapage réservé à un administrateur" }, 403);
    if (reprise_qrc_id && !admin) return json({ ok: false, message: "reprise réservée à un administrateur" }, 403);
    if (att.apprenant_id === "c0844007-b999-4385-9665-918e5077c3b5") return json({ ok: true, statut: "exclu" });

    if (att.etat !== "terminee" || !att.finished_at) return json({ ok: true, statut: "passage_non_termine" });
    if (att.is_test) return json({ ok: true, statut: "compte_test_exclu" });
    if (estRattrapage) {
      const fin = new Date(att.finished_at);
      if (!PERIODES_RATTRAPAGE.some(([d, f]) => fin >= d && fin < f)) return json({ ok: true, statut: "hors_periode_rattrapage" });
    } else if (!cfg.actif_depuis || new Date(att.finished_at) < new Date(cfg.actif_depuis)) {
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
    const bilan: Record<string, number> = {};
    const compter = (s: string) => { bilan[s] = (bilan[s] ?? 0) + 1; };

    for (const inst of qrcs ?? []) {
      if (reprise_qrc_id && inst.qrc_instance_id !== reprise_qrc_id) continue;
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
      if (reprise_qrc_id) {
        if (!decision.admissible || !q) return json({ ok: false, message: decision.admissible ? "Question absente" : decision.motif }, 400);
        if (!key) return json({ ok: false, message: "Service IA non configuré" }, 401);
        const { data: lease, error: claimError } = await service.rpc("qrc_ia_reserver_reprise", {
          p_qrc: inst.qrc_instance_id, p_base: { ...base, bareme: decision.bareme }, p_interruption_confirmee: interruption_confirmee === true,
        });
        if (claimError) throw claimError;
        if (!lease) return json({ ok: true, statut: "reprise_non_acquise" });
        let runId: string | null = null;
        const finishError = async (status: number, message: string, statut = "erreur") => {
          const { error } = await service.from("qrc_ia_reprises").update({ statut, http_status: status, message, termine_at: new Date().toISOString(), run_id: runId }).eq("id", lease).eq("statut", "en_cours");
          if (error) throw error;
        };
        try {
          const gateway = createOpenAICompatible({ name: "lovable", baseURL: "https://ai.gateway.lovable.dev/v1", headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" }, fetch: async (input, init) => {
            const response = await fetch(input, init);
            runId = response.headers.get("X-Lovable-AIG-Run-ID");
            return response;
          } });
          // Un seul item par invocation explicite. Flux fournisseur, aucun timer
          // ni retry SDK : une issue inconnue reste verrouillée pour revue humaine.
          const result = streamText({ model: gateway(MODELE_IA_QRC), system: CONSIGNE_IA, prompt: messageUtilisateur(q, decision.bareme, inst.reponse), maxRetries: 0 });
          const text = await result.text;
          if (!text.trim()) {
            await finishError(200, "Réponse IA vide ou refusée", "a_verifier");
            return json({ ok: false, message: "Réponse IA vide ou refusée" }, 422);
          }
          const validated = validerResultatIa(text, decision.bareme);
          if (!validated.valide) {
            await finishError(200, validated.motif, "a_verifier");
            return json({ ok: false, message: validated.motif }, 422);
          }
          const { data: proof, error } = await service.rpc("qrc_ia_publier_reprise", {
            p_id: lease, p_operation: uuidDepuis(await sha256(`qrc-ia:${cle}`)), p_note: validated.note, p_justification: validated.justification, p_run_id: runId,
          });
          if (error) throw error;
          return json({ ok: true, statut: "reprise_terminee", preuve: proof, run_id: runId });
        } catch (e) {
          // Sans statut fournisseur, l'issue (et la facturation) est inconnue :
          // terminal pour cette reprise, jamais assimilée à un 5xx rejouable.
          const upstreamStatus = (e as { statusCode?: number }).statusCode;
          const status = Number(upstreamStatus ?? 499);
          const message = String((e as { message?: string }).message ?? "Service IA indisponible").slice(0, 600);
          await finishError(status, message, upstreamStatus ? "erreur" : "a_verifier");
          if (estPauseGlobale(status)) {
            await service.from("qrc_ia_config").update({ pause_motif: message, pause_depuis: new Date().toISOString() }).eq("id", true);
          }
          return json({ ok: false, message, run_id: runId }, status >= 400 && status <= 599 ? status : 500);
        }
      }

      if (!decision.admissible) {
        // Aucun appel IA : trace seulement (la QRC reste à corriger par le formateur).
        await service.from("qrc_ia_corrections").upsert(
          { ...base, statut: decision.statut, motif: decision.motif, termine_at: new Date().toISOString() },
          { onConflict: "cle_idempotence", ignoreDuplicates: true },
        );
        compter(decision.motif);
        continue;
      }

      // Réservation atomique : une seule analyse payante par clé (F5, double clic, reconnexion…).
      const { data: reserve } = await service.from("qrc_ia_corrections")
        .upsert({ ...base, statut: "en_cours", bareme: decision.bareme }, { onConflict: "cle_idempotence", ignoreDuplicates: true })
        .select("id");
      if (!reserve || reserve.length === 0) { compter("deja_traitee"); continue; }
      const idLigne = reserve[0].id;
      const clore = (maj: Record<string, unknown>) =>
        service.from("qrc_ia_corrections").update({ ...maj, termine_at: new Date().toISOString() }).eq("id", idLigne);

      if (!key) { await clore({ statut: "erreur", motif: "cle_ia_absente" }); compter("erreur"); continue; }

      let texte = "";
      let status = 200;
      let cout: number | null = null;
      try {
        const gateway = createOpenAICompatible({
          name: "lovable",
          baseURL: "https://ai.gateway.lovable.dev/v1",
          headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
        });
        const r = await generateText({
          model: gateway(MODELE_IA_QRC),
          system: CONSIGNE_IA,
          prompt: messageUtilisateur(q ?? {}, decision.bareme, inst.reponse),
          maxRetries: 0, // jamais de boucle d'appels payants
        });
        texte = r.text;
        const u = r.usage as any;
        if (u) cout = (Number(u.inputTokens ?? u.promptTokens ?? 0) * 0.75e-6) + (Number(u.outputTokens ?? u.completionTokens ?? 0) * 3.75e-6);
      } catch (e) {
        status = Number((e as any)?.statusCode ?? 500);
        await clore({ statut: "erreur", motif: "appel_ia_en_erreur", http_status: status });
        compter("erreur");
        if (estPauseGlobale(status)) {
          await service.from("qrc_ia_config").update({
            pause_motif: status === 402 ? "credits_ia_epuises" : "acces_ia_refuse", pause_depuis: new Date().toISOString(),
          }).eq("id", true);
          break; // pause globale : plus aucun appel
        }
        continue;
      }

      const res = validerResultatIa(texte, decision.bareme);
      if (!res.valide) {
        await clore({ statut: "a_verifier", motif: res.motif, http_status: status, cout_estime: cout, justification: texte.slice(0, 600) });
        compter(res.motif);
        continue;
      }

      const { error: errCorr } = await service.rpc("core_correct_qrc_publish", {
        p_operation_id: uuidDepuis(await sha256(`qrc-ia:${cle}`)),
        p_qrc_instance_id: inst.qrc_instance_id,
        p_note: res.note,
        p_commentaire: `🤖 ${res.justification}`,
        p_corrige_email: MARQUEUR_IA,
      });
      if (errCorr) {
        // ex. déjà corrigée par un formateur entre-temps : la correction humaine prime.
        await clore({ statut: "ignoree", motif: `ecriture_refusee: ${errCorr.message.slice(0, 120)}`, note: res.note, justification: res.justification, cout_estime: cout });
        compter("ignoree");
        continue;
      }
      await clore({ statut: "appliquee", note: res.note, justification: res.justification, http_status: status, cout_estime: cout });
      compter("appliquee");
    }

    return json({ ok: true, statut: "traite", bilan });
  } catch (e) {
    console.error("[qrc-ia-correction]", e);
    return json({ ok: false, message: "erreur interne" }, 500);
  }
});
