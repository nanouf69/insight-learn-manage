// Correction IA serveur des QRC du Contrôle de connaissances (module 13).
// - soumettre : l'élève connecté fige sa copie à partir de ses réponses ENREGISTRÉES
//   et du contenu serveur (module_editor_state) ; idempotent (empreinte unique).
// - traiter : appelé par la file (jeton par QRC) ; une QRC = un appel payant au plus,
//   précédé d'une réservation sur le plafond mensuel commun. Barème : 1 point juste/faux.
// Erreur ou issue inconnue = « à vérifier » (formateur), jamais 0, jamais rejoué à l'aveugle.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createOpenAICompatible } from "npm:@ai-sdk/openai-compatible";
import { streamText } from "npm:ai";
import { z } from "npm:zod@3";
import { CONSIGNE_IA, MODELE_IA_QRC, messageUtilisateur, validerResultatIa, estPauseGlobale } from "../_shared/qrcIaRegles.ts";
import { creditsMax, creditsReels, debutMoisSuivant, SORTIE_MAX_JETONS } from "../_shared/qrcIaBudget.ts";

const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const EXERCICES = new Set(["module_13_exo_13100", "module_13_revision_exo_13100"]);
const EXO_SOURCE = 13100;
const MAX_ESSAIS = 3;
const TIMEOUT_MS = 60000;

const Corps = z.discriminatedUnion("action", [
  z.object({ action: z.literal("soumettre"), exercice_id: z.string() }).strict(),
  z.object({ action: z.literal("traiter"), item_id: z.string().uuid(), token: z.string().uuid() }).strict(),
]);

async function sha256(s: string) {
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
  return Array.from(d, (b) => b.toString(16).padStart(2, "0")).join("");
}
const estQrc = (q: any) => q?.type === "qrc" || (Array.isArray(q?.choix) && q.choix.length === 0);
const lettresJustes = (q: any) => (q?.choix ?? []).filter((c: any) => c?.correct === true).map((c: any) => String(c.lettre)).sort();
function qcmJuste(q: any, rep: unknown): boolean {
  const attendu = lettresJustes(q);
  if (!attendu.length) return false;
  const donne = (Array.isArray(rep) ? rep : rep == null ? [] : [rep]).map(String).sort();
  return donne.length === attendu.length && donne.every((v, i) => v === attendu[i]);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const parsed = Corps.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ ok: false, message: "Paramètres invalides" }, 400);
  const url = Deno.env.get("SUPABASE_URL")!, serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const db = createClient(url, serviceKey, { auth: { persistSession: false } });
  try {
    if (parsed.data.action === "soumettre") return await soumettre(db, url, anon, req.headers.get("Authorization") ?? "", parsed.data.exercice_id);
    const travail = traiter(db, parsed.data.item_id, parsed.data.token).catch((e) => console.error("[controle-qrc-ia]", String(e?.message ?? e).slice(0, 300)));
    const rt = (globalThis as any).EdgeRuntime;
    if (rt?.waitUntil) { rt.waitUntil(travail); return json({ ok: true, statut: "accepte" }, 202); }
    await travail; return json({ ok: true });
  } catch (e) {
    console.error("[controle-qrc-ia]", String((e as Error)?.message ?? e).slice(0, 300));
    return json({ ok: false, message: "Erreur interne : vos réponses restent enregistrées." }, 500);
  }
});

async function soumettre(db: any, url: string, anon: string, auth: string, exerciceId: string) {
  if (!EXERCICES.has(exerciceId)) return json({ ok: false, message: "Exercice hors périmètre" }, 400);
  const client = createClient(url, anon, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: u, error: ue } = await client.auth.getUser();
  if (ue || !u.user) return json({ ok: false, message: "Reconnectez-vous." }, 401);
  const { data: apps, error: ae } = await db.from("apprenants").select("id").eq("auth_user_id", u.user.id).is("deleted_at", null);
  if (ae) throw ae;
  const ids = (apps ?? []).map((a: any) => a.id);
  if (!ids.length) return json({ ok: false, message: "Compte élève introuvable" }, 403);
  const { data: rows, error: re } = await db.from("reponses_apprenants").select("id, apprenant_id, reponses, status").in("apprenant_id", ids).eq("exercice_id", exerciceId).order("updated_at", { ascending: false }).limit(1);
  if (re) throw re;
  const row = rows?.[0];
  if (!row) return json({ ok: false, message: "Réponses non enregistrées" }, 409);
  const revision = exerciceId.includes("_revision_");
  if (!revision && row.status !== "submitted") return json({ ok: false, message: "Quiz non validé côté serveur" }, 409);
  const { data: mod, error: me } = await db.from("module_editor_state").select("module_data").eq("module_id", 13).maybeSingle();
  if (me) throw me;
  const exo = (mod?.module_data?.exercices ?? []).find((e: any) => Number(e?.id) === EXO_SOURCE);
  if (!exo) return json({ ok: false, message: "Contenu introuvable" }, 409);
  const reponses = (row.reponses ?? {}) as Record<string, unknown>;
  let questions = (exo.questions ?? []).filter((q: any) => q && q.id != null);
  if (revision) questions = questions.filter((q: any) => `${EXO_SOURCE}-${q.id}` in reponses);
  const qrc = questions.filter(estQrc);
  const qcm = questions.filter((q: any) => !estQrc(q));
  const repondues = qrc.map((q: any) => ({ q, r: String(reponses[`${EXO_SOURCE}-${q.id}`] ?? "").trim() })).filter((x: any) => x.r.length > 0);
  const empreinte = await sha256(JSON.stringify([exerciceId, row.id, repondues.map((x: any) => [String(x.q.id), x.r])]));
  const copie = {
    apprenant_id: row.apprenant_id, user_id: u.user.id, exercice_id: exerciceId, source_reponse_id: row.id, empreinte,
    qcm_bons: qcm.filter((q: any) => qcmJuste(q, reponses[`${EXO_SOURCE}-${q.id}`])).length,
    qcm_total: qcm.length, qrc_total: qrc.length,
  };
  const { error: ie } = await db.from("controle_qrc_copies").upsert(copie, { onConflict: "apprenant_id,exercice_id,empreinte", ignoreDuplicates: true });
  if (ie) throw ie;
  const { data: c, error: ce } = await db.from("controle_qrc_copies").select("id, statut").eq("apprenant_id", row.apprenant_id).eq("exercice_id", exerciceId).eq("empreinte", empreinte).single();
  if (ce) throw ce;
  if (repondues.length) {
    const items = repondues.map(({ q, r }: any) => {
      const attendus = Array.isArray(q.reponsesAttendues) ? q.reponsesAttendues.map(String) : [];
      return { copie_id: c.id, question_id: String(q.id), enonce: String(q.enonce ?? ""), corrige: String(q.reponseQRC ?? attendus.join(" ; ")), mots_cles: attendus, reponse: r.slice(0, 4000) };
    });
    const { error: ite } = await db.from("controle_qrc_items").upsert(items, { onConflict: "copie_id,question_id", ignoreDuplicates: true });
    if (ite) throw ite;
    const { error: arm } = await db.rpc("controle_qrc_armer");
    if (arm) console.error("[controle-qrc-ia] armer", arm.message);
  } else {
    await db.rpc("controle_qrc_cloturer", { p_copie: c.id });
  }
  return json({ ok: true, copie_id: c.id });
}

async function traiter(db: any, itemId: string, token: string) {
  const { data: it, error } = await db.from("controle_qrc_items").select("*").eq("id", itemId).eq("token", token).eq("statut", "en_cours").maybeSingle();
  if (error) throw error;
  if (!it) return;
  const maj = async (v: Record<string, unknown>) => {
    const { error: e } = await db.from("controle_qrc_items").update({ ...v, lease_until: null }).eq("id", itemId).eq("token", token).eq("statut", "en_cours");
    if (e) throw e;
  };
  const enAttente = (motif: string, delaiMs: number, extra: Record<string, unknown> = {}) => maj({ statut: "en_attente", motif, next_at: new Date(Date.now() + delaiMs).toISOString(), ...extra });
  const { data: cfg } = await db.from("qrc_ia_config").select("actif, pause_depuis").eq("id", true).maybeSingle();
  if (!cfg?.actif || cfg.pause_depuis) return enAttente("ia_en_pause", 3600000);
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return maj({ statut: "a_verifier", motif: "service_ia_non_configure" });
  const q = { enonce: it.enonce, reponseQRC: it.corrige, motsCles: it.mots_cles };
  const prompt = messageUtilisateur(q, 1, it.reponse);
  const { data: resa, error: be } = await db.rpc("qrc_ia_budget_reserver", { p_source: "controle_m13", p_ref: itemId, p_credits_max: creditsMax(MODELE_IA_QRC as any, CONSIGNE_IA.length + prompt.length) });
  if (be) throw be;
  if (!resa) return enAttente("budget_mensuel_atteint", debutMoisSuivant().getTime() - Date.now());
  let runId: string | null = null, statusCode: number | undefined, fini = false, timeout = false, streamErr: unknown;
  const ctrl = new AbortController();
  const minuteur = setTimeout(() => { timeout = true; ctrl.abort(); }, TIMEOUT_MS);
  try {
    const gateway = createOpenAICompatible({ name: "lovable", baseURL: "https://ai.gateway.lovable.dev/v1", headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" }, fetch: async (i, init) => {
      const r = await fetch(i, init); runId = r.headers.get("X-Lovable-AIG-Run-ID"); if (!r.ok) statusCode = r.status; return r;
    } });
    const result = streamText({ model: gateway(MODELE_IA_QRC), system: CONSIGNE_IA, prompt, maxOutputTokens: SORTIE_MAX_JETONS, maxRetries: 0, abortSignal: ctrl.signal, onError: ({ error }) => { streamErr = error; } });
    const text = await result.text;
    if (streamErr) throw streamErr;
    if (timeout) throw new Error("delai");
    fini = true;
    clearTimeout(minuteur);
    await db.rpc("qrc_ia_budget_regler", { p_id: resa, p_credits_reels: creditsReels(MODELE_IA_QRC as any, await result.usage) });
    const v = validerResultatIa(text, 1);
    if ((await result.finishReason) !== "stop" || !v.valide) return maj({ statut: "a_verifier", motif: v.valide ? "flux_incomplet" : v.motif, run_id: runId });
    const juste = v.note >= 1;
    return maj({ statut: "corrigee", est_correct: juste, points: juste ? 1 : 0, note_ia: v.note, commentaire: (v.note === 0.5 ? "Réponse partielle (0 point au barème juste/faux) : " : "") + v.justification, run_id: runId, motif: null });
  } catch (e) {
    clearTimeout(minuteur);
    const st = fini ? undefined : (statusCode ?? (e as any)?.statusCode);
    if (!st) { // issue inconnue (délai local, réseau) : réservation conservée, aucune relance automatique
      await db.rpc("qrc_ia_budget_regler", { p_id: resa, p_credits_reels: null });
      return maj({ statut: "a_verifier", motif: timeout ? "delai_ia_depasse" : "issue_inconnue", run_id: runId });
    }
    await db.rpc("qrc_ia_budget_regler", { p_id: resa, p_credits_reels: 0, p_annuler: true });
    if (estPauseGlobale(st)) {
      await db.from("qrc_ia_config").update({ pause_depuis: new Date().toISOString(), pause_motif: `controle_m13 HTTP ${st}` }).eq("id", true);
      return enAttente(`pause_globale_${st}`, 3600000, { http_status: st });
    }
    if ((st === 429 || st >= 500) && it.essais + 1 < MAX_ESSAIS) return enAttente(`reprise_${st}`, 30000 * 2 ** it.essais + Math.floor(Math.random() * 5000), { essais: it.essais + 1, http_status: st });
    return maj({ statut: "a_verifier", motif: `erreur_ia_${st}`, http_status: st, essais: it.essais + 1, run_id: runId });
  }
}
