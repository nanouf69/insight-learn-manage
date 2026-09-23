/**
 * SURVEILLANCE DU MOTEUR D'EXAMEN — DÉTECTION SEULE (LECTURE SEULE)
 * =================================================================
 * Cette fonction ne corrige RIEN et n'écrit JAMAIS dans les données
 * pédagogiques : elle lit, détecte et alerte. Toute anomalie détectée est
 * signalée à un humain, qui décide.
 *
 * Données anonymisées : les journaux et les alertes ne contiennent aucun nom,
 * aucune adresse e-mail, aucune réponse d'apprenant — uniquement des
 * identifiants techniques tronqués.
 *
 * Anomalies surveillées :
 *   TENTATIVE_CLOTUREE_SANS_QUESTION
 *   RESULTAT_SANS_REPONSE_SERVEUR
 *   QUESTIONS_DIFFERENTES_DU_SNAPSHOT
 *   RESULTATS_MULTIPLES_MEME_TENTATIVE
 *   SAUVEGARDES_BLOQUEES
 *   HAUSSE_ERREURS_FINALISATION
 *   DELAI_48H_SUR_TENTATIVE_OUVERTE
 */
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const TRIGGER_TOKENS = [
  Deno.env.get("MONITORING_TRIGGER_TOKEN") ?? "",
  Deno.env.get("MONITORING_SHARED_TOKEN") ?? "",
].filter((t) => t.length > 0);
const ALERT_EMAIL = Deno.env.get("MONITORING_ALERT_EMAIL") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const ALERT_WEBHOOK_URL = Deno.env.get("ALERT_WEBHOOK_URL") ?? "";
const BUCKET = "observabilite-logs";
const FENETRE_HEURES = 48;
const SEUIL_ERREURS_FINALISATION = 5;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/** Identifiant tronqué : traçable pour l'équipe, non nominatif. */
const anonymiser = (id: string | null | undefined) => (id ? `${String(id).slice(0, 8)}…` : "—");

// Lecture COMPLÈTE par paquets de 1 000 (la base ne renvoie jamais plus par demande).
const PAGE = 1000;
async function lire<T = Record<string, unknown>>(chemin: string): Promise<T[]> {
  const base = chemin.replace(/&limit=\d+/g, "");
  const tout: T[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${base}&limit=${PAGE}&offset=${offset}`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) throw new Error(`lecture ${chemin.split("?")[0]} : HTTP ${r.status}`);
    const page = (await r.json()) as T[];
    tout.push(...page);
    if (page.length < PAGE) break;
  }
  return tout;
}

// Liste d'identifiants découpée en lots de 100 (URL raisonnable), chaque lot paginé.
async function lireParLots<T>(ids: string[], chemin: (lot: string) => string): Promise<T[]> {
  const tout: T[] = [];
  for (let i = 0; i < ids.length; i += 100) {
    tout.push(...(await lire<T>(chemin(ids.slice(i, i + 100).join(",")))));
  }
  return tout;
}

type Anomalie = { code: string; gravite: "critique" | "avertissement"; details: string[] };

async function detecter(): Promise<{ anomalies: Anomalie[]; controles: Record<string, number> }> {
  const depuis = new Date(Date.now() - FENETRE_HEURES * 3600_000).toISOString();
  const anomalies: Anomalie[] = [];
  const pousser = (code: string, gravite: Anomalie["gravite"], details: string[]) => {
    if (details.length > 0) anomalies.push({ code, gravite, details: details.slice(0, 25) });
  };

  const tentatives = await lire<{
    attempt_id: string;
    exam_id: string;
    etat: string;
    is_test: boolean;
    started_at: string;
    snapshot: { questions?: unknown[]; matiere?: string } | null;
  }>(
    `exam_attempts_v2?select=attempt_id,exam_id,etat,is_test,started_at,snapshot&started_at=gte.${depuis}&is_test=eq.false&order=started_at.desc,attempt_id.asc`,
  );
  const neutralisees = new Set(
    (await lire<{ attempt_id: string }>("core_tentatives_neutralisees?select=attempt_id&order=attempt_id.asc")).map((n) => n.attempt_id),
  );
  const suivies = tentatives.filter((t) => !neutralisees.has(t.attempt_id));
  const ids = suivies.map((t) => t.attempt_id);

  // Comptage fait EN BASE par tentative (1 ligne par tentative, jamais tronqué).
  const comptes: { attempt_id: string; nb_reponses: number }[] = [];
  for (let i = 0; i < ids.length; i += 100) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/surveillance_compte_reponses_service`, {
      method: "POST",
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_attempt_ids: ids.slice(i, i + 100) }),
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) throw new Error(`comptage réponses : HTTP ${r.status}`);
    comptes.push(...((await r.json()) as typeof comptes));
  }
  const resultats = await lireParLots<{ attempt_id: string; result_id: string; score: number | null }>(
    ids,
    (lot) => `core_exam_results?select=attempt_id,result_id,score&attempt_id=in.(${lot})&order=result_id.asc`,
  );

  const compteParTentative = new Map<string, number>();
  for (const c of comptes) compteParTentative.set(c.attempt_id, Number(c.nb_reponses) || 0);

  const clotureesSansQuestion: string[] = [];
  const resultatsSansReponse: string[] = [];
  const questionsDifferentes: string[] = [];
  for (const t of suivies) {
    const attendues = Array.isArray(t.snapshot?.questions) ? t.snapshot!.questions!.length : 0;
    const obtenues = compteParTentative.get(t.attempt_id) ?? 0;
    const termine = t.etat === "terminee";
    if (termine && attendues === 0) {
      clotureesSansQuestion.push(`${t.exam_id} / tentative ${anonymiser(t.attempt_id)} : 0 question au snapshot`);
    }
    if (termine && obtenues === 0 && attendues > 0) {
      resultatsSansReponse.push(`${t.exam_id} / tentative ${anonymiser(t.attempt_id)} : 0 réponse serveur sur ${attendues}`);
    }
    if (termine && obtenues > 0 && obtenues !== attendues) {
      questionsDifferentes.push(
        `${t.exam_id} / tentative ${anonymiser(t.attempt_id)} : ${obtenues} réponses pour ${attendues} questions`,
      );
    }
  }
  pousser("TENTATIVE_CLOTUREE_SANS_QUESTION", "critique", clotureesSansQuestion);
  pousser("RESULTAT_SANS_REPONSE_SERVEUR", "critique", resultatsSansReponse);
  pousser("QUESTIONS_DIFFERENTES_DU_SNAPSHOT", "critique", questionsDifferentes);

  const compteResultats = new Map<string, number>();
  for (const r of resultats) compteResultats.set(r.attempt_id, (compteResultats.get(r.attempt_id) ?? 0) + 1);
  pousser(
    "RESULTATS_MULTIPLES_MEME_TENTATIVE",
    "critique",
    [...compteResultats.entries()]
      .filter(([, n]) => n > 1)
      .map(([id, n]) => `tentative ${anonymiser(id)} : ${n} résultats`),
  );

  // Sauvegardes bloquées : réponses écrites dans l'ancien circuit alors que la
  // tentative V2 correspondante n'a rien reçu, ou tentative ouverte depuis
  // longtemps sans aucune réponse serveur.
  const limite = Date.now() - 2 * 3600_000;
  pousser(
    "SAUVEGARDES_BLOQUEES",
    "avertissement",
    suivies
      .filter(
        (t) =>
          t.etat === "en_cours" &&
          new Date(t.started_at).getTime() < limite &&
          (compteParTentative.get(t.attempt_id) ?? 0) === 0,
      )
      .map((t) => `${t.exam_id} / tentative ${anonymiser(t.attempt_id)} ouverte depuis plus de 2 h sans réponse serveur`),
  );

  // Erreurs de finalisation et déclenchements 48 h anormaux (journal technique).
  let erreurs: { message: string | null; created_at: string }[] = [];
  try {
    erreurs = await lire<{ message: string | null; created_at: string }>(
      `error_logs?select=message,created_at&created_at=gte.${depuis}&order=created_at.asc`,
    );
  } catch (_) {
    erreurs = [];
  }
  const finalisation = erreurs.filter((e) => /finalis|core_finalize|terminer la mati/i.test(e.message ?? ""));
  if (finalisation.length >= SEUIL_ERREURS_FINALISATION) {
    anomalies.push({
      code: "HAUSSE_ERREURS_FINALISATION",
      gravite: "critique",
      details: [`${finalisation.length} erreurs de finalisation sur ${FENETRE_HEURES} h`],
    });
  }
  const delai48 = erreurs.filter((e) => /EXAM_RETAKE_DELAY_48H|P0471/i.test(e.message ?? ""));
  if (delai48.length > 0 && suivies.some((t) => t.etat === "en_cours")) {
    anomalies.push({
      code: "DELAI_48H_SUR_TENTATIVE_OUVERTE",
      gravite: "critique",
      details: [`${delai48.length} déclenchement(s) du délai 48 h alors que des tentatives sont encore ouvertes`],
    });
  }

  return {
    anomalies,
    controles: {
      tentatives_examinees: suivies.length,
      reponses_serveur: reponses.length,
      resultats: resultats.length,
      neutralisees_ignorees: neutralisees.size,
    },
  };
}

async function journaliser(entree: Record<string, unknown>): Promise<string | null> {
  const now = new Date();
  const chemin = `logs-moteur-examen/${now.toISOString().slice(0, 10)}/${now.toISOString().replace(/[:.]/g, "-")}.json`;
  try {
    const r = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${chemin}`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        "x-upsert": "false",
      },
      body: JSON.stringify(entree),
    });
    return r.ok ? chemin : null;
  } catch (_) {
    return null;
  }
}

async function alerter(anomalies: Anomalie[], correlationId: string): Promise<string[]> {
  if (anomalies.length === 0) return [];
  const canaux: string[] = [];
  const corps = anomalies
    .map((a) => `<p><strong>${a.code}</strong> (${a.gravite})<br>${a.details.join("<br>")}</p>`)
    .join("");
  if (ALERT_WEBHOOK_URL) {
    try {
      const r = await fetch(ALERT_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "moteur-examen", anomalies, correlation_id: correlationId }),
        signal: AbortSignal.timeout(6000),
      });
      if (r.ok) canaux.push("webhook");
    } catch (_) { /* canal indisponible */ }
  }
  if (RESEND_API_KEY && ALERT_EMAIL) {
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "FTRANSPORT Supervision <contact@ftransport.fr>",
          to: [ALERT_EMAIL],
          subject: `[FTRANSPORT MOTEUR EXAMEN] ${anomalies.length} anomalie(s) détectée(s)`,
          html: `<p>Détection automatique — aucune donnée n'a été modifiée.</p>${corps}<p>Correlation ID : ${correlationId}</p>`,
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (r.ok) canaux.push("email");
    } catch (_) { /* canal indisponible */ }
  }
  return canaux;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = new URL(req.url);
  const token = req.headers.get("x-monitoring-token") ?? url.searchParams.get("token") ?? "";
  if (TRIGGER_TOKENS.length === 0 || !TRIGGER_TOKENS.includes(token)) return json({ error: "unauthorized" }, 401);

  const correlationId = req.headers.get("x-correlation-id") ?? crypto.randomUUID();
  try {
    const { anomalies, controles } = await detecter();
    const canaux = await alerter(anomalies, correlationId);
    const entree = {
      correlation_id: correlationId,
      at: new Date().toISOString(),
      categorie: "surveillance_moteur_examen",
      lecture_seule: true,
      anonymise: true,
      controles,
      anomalies,
      canaux_alerte: canaux,
    };
    const fichier = await journaliser(entree);
    return json({ ...entree, journal: fichier }, anomalies.some((a) => a.gravite === "critique") ? 503 : 200);
  } catch (e) {
    const message = String(e).slice(0, 300);
    await journaliser({ correlation_id: correlationId, at: new Date().toISOString(), erreur: message });
    return json({ error: message, correlation_id: correlationId }, 500);
  }
});
