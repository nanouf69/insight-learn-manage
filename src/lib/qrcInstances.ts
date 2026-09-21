/**
 * MOTEUR QRC « 1 QRC = 1 IDENTIFIANT UNIQUE ».
 *
 * Source unique de vérité pour :
 *  - la file de correction formateur,
 *  - le compteur de QRC restantes,
 *  - le blocage / la publication de la note côté portail apprenant.
 *
 * Activation STRICTEMENT par examen via la table `qrc_engine_flags`.
 * Tant qu'un examen n'est pas marqué `enabled`, absolument rien ne change :
 * l'ancien mécanisme continue de fonctionner à l'identique.
 *
 * Aucune donnée existante n'est lue en écriture, modifiée ni migrée ici.
 */
import { supabase } from "@/integrations/supabase/client";

export interface QrcInstanceRow {
  id: string;
  apprenant_id: string;
  quiz_id: string;
  attempt_id: string;
  matiere_id: string;
  question_id: string;
  reponse_eleve: string;
  points_max: number;
  points_obtenus: number | null;
  commentaire: string | null;
  etat: "en_attente" | "corrigee";
  corrected_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Cache mémoire des examens dont le nouveau moteur est activé. */
let enabledQuizIdsPromise: Promise<Set<string>> | null = null;

export async function loadQrcEngineQuizIds(force = false): Promise<Set<string>> {
  if (force) enabledQuizIdsPromise = null;
  if (!enabledQuizIdsPromise) {
    enabledQuizIdsPromise = (async () => {
      const { data, error } = await supabase
        .from("qrc_engine_flags")
        .select("quiz_id, enabled")
        .eq("enabled", true);
      if (error) {
        console.warn("[qrcInstances] lecture des drapeaux impossible:", error.message);
        return new Set<string>();
      }
      return new Set<string>((data || []).map((r: any) => String(r.quiz_id)));
    })();
  }
  return enabledQuizIdsPromise;
}

export async function isQrcEngineEnabled(quizId: string): Promise<boolean> {
  if (!quizId) return false;
  const ids = await loadQrcEngineQuizIds();
  return ids.has(quizId);
}

/**
 * Identifiant DÉFINITIF du passage (uuid déterministe).
 * Même apprenant + même examen + même matière + même numéro de tentative
 * => toujours le même `attempt_id`, après F5, reprise, double envoi ou
 * reconnexion. Une NOUVELLE tentative réelle produit un autre identifiant,
 * donc des QRC entièrement indépendantes.
 */
export function buildQrcAttemptId(
  apprenantId: string,
  quizId: string,
  matiereId: string,
  tentative: number,
): string {
  const seed = `${apprenantId}|${quizId}|${matiereId}|T${Math.max(1, Math.round(Number(tentative) || 1))}`;
  // Hachage déterministe 128 bits (4 × 32 bits, variantes de FNV-1a).
  const words: number[] = [];
  for (let w = 0; w < 4; w++) {
    let h = 0x811c9dc5 ^ (w * 0x9e3779b9);
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i) + w;
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    words.push(h >>> 0);
  }
  const hex = words.map((w) => w.toString(16).padStart(8, "0")).join("");
  // Format uuid v4-like (version 4, variant 8) — purement déterministe.
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    "4" + hex.slice(13, 16),
    "8" + hex.slice(17, 20),
    hex.slice(20, 32),
  ].join("-");
}

export interface QrcSyncItem {
  question_id: string | number;
  reponse_eleve: string;
  points_max: number;
}

/**
 * Crée / met à jour les identifiants QRC du passage (idempotent côté base :
 * contrainte d'unicité + `ON CONFLICT`). Un double clic, un F5 ou une double
 * finalisation ne peuvent pas créer une deuxième QRC.
 * Une instance DÉJÀ CORRIGÉE n'est jamais réécrite par l'apprenant.
 */
export async function syncQrcInstances(args: {
  apprenantId: string;
  quizId: string;
  matiereId: string;
  tentative: number;
  items: QrcSyncItem[];
}): Promise<{ synced: number } | null> {
  const { apprenantId, quizId, matiereId, tentative, items } = args;
  if (!apprenantId || !quizId || !matiereId || !items?.length) return null;
  if (!(await isQrcEngineEnabled(quizId))) return null;

  const attemptId = buildQrcAttemptId(apprenantId, quizId, matiereId, tentative);
  const payload = items.map((i) => ({
    question_id: String(i.question_id),
    reponse_eleve: String(i.reponse_eleve ?? ""),
    points_max: Number(i.points_max) || 0,
  }));

  const { data, error } = await supabase.rpc("upsert_qrc_instances", {
    p_apprenant_id: apprenantId,
    p_quiz_id: quizId,
    p_matiere_id: matiereId,
    p_attempt_id: attemptId,
    p_items: payload as any,
  });
  if (error) {
    console.error("[qrcInstances] upsert_qrc_instances a échoué:", error.message);
    return null;
  }
  return { synced: Array.isArray(data) ? data.length : 0 };
}

/** File de correction : toutes les QRC répondues encore EN ATTENTE. */
export async function fetchQrcInstances(opts?: { quizIds?: string[] }): Promise<QrcInstanceRow[]> {
  const enabled = opts?.quizIds?.length ? opts.quizIds : Array.from(await loadQrcEngineQuizIds());
  if (enabled.length === 0) return [];
  const { data, error } = await supabase
    .from("qrc_instances")
    .select("*")
    .in("quiz_id", enabled)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[qrcInstances] lecture de la file impossible:", error.message);
    return [];
  }
  return (data || []) as unknown as QrcInstanceRow[];
}

/**
 * Passages RÉELLEMENT pris en charge par le nouveau moteur.
 * Sert à exclure ces passages — et EUX SEULS — de l'ancienne file de
 * correction : l'historique d'un examen piloté reste entièrement lisible et
 * corrigeable par l'ancien mécanisme, sans jamais créer de doublon.
 */
export async function fetchQrcEngineAttemptIds(quizIds?: string[]): Promise<Set<string>> {
  const enabled = quizIds?.length ? quizIds : Array.from(await loadQrcEngineQuizIds());
  if (enabled.length === 0) return new Set<string>();
  const out = new Set<string>();
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("qrc_instances")
      .select("attempt_id")
      .in("quiz_id", enabled)
      .range(from, from + pageSize - 1);
    if (error) {
      console.warn("[qrcInstances] lecture des passages branchés impossible:", error.message);
      break;
    }
    (data || []).forEach((r: any) => out.add(String(r.attempt_id)));
    if (!data || data.length < pageSize) break;
  }
  return out;
}

/** Validation formateur : une seule correction active par identifiant. */
export async function validateQrcInstance(
  instanceId: string,
  points: number,
  commentaire: string,
): Promise<QrcInstanceRow> {
  const { data, error } = await supabase.rpc("validate_qrc_instance", {
    p_instance_id: instanceId,
    p_points: points,
    p_commentaire: commentaire ?? "",
  });
  if (error) throw error;
  return (Array.isArray(data) ? data[0] : data) as unknown as QrcInstanceRow;
}

export interface QrcPilotIntegrity {
  quizId: string;
  passages: number;
  qrcRepondues: number;
  idsCrees: number;
  enAttente: number;
  corrigees: number;
  doublons: number;
  manquantes: number;
  correctionsPerdues: number;
  anomalie: boolean;
  /** true si le drapeau a été coupé automatiquement suite à l'anomalie. */
  coupe?: boolean;
}

/** Contrôle d'intégrité du pilote (lecture seule côté base). */
export async function fetchQrcPilotIntegrity(quizId: string): Promise<QrcPilotIntegrity | null> {
  const { data, error } = await supabase.rpc("qrc_pilot_integrity", { p_quiz_id: quizId });
  if (error) {
    console.warn("[qrcInstances] contrôle d'intégrité impossible:", error.message);
    return null;
  }
  const row: any = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return {
    quizId,
    passages: Number(row.passages ?? 0),
    qrcRepondues: Number(row.qrc_repondues ?? 0),
    idsCrees: Number(row.ids_crees ?? 0),
    enAttente: Number(row.en_attente ?? 0),
    corrigees: Number(row.corrigees ?? 0),
    doublons: Number(row.doublons ?? 0),
    manquantes: Number(row.manquantes ?? 0),
    correctionsPerdues: Number(row.corrections_perdues ?? 0),
    anomalie: Boolean(row.anomalie),
  };
}

/** Coupure du moteur pour un examen — les données enregistrées sont conservées. */
export async function disableQrcEngine(quizId: string, reason: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("qrc_disable_engine", { p_quiz_id: quizId, p_reason: reason });
  if (error) {
    console.error("[qrcInstances] coupure du moteur impossible:", error.message);
    return false;
  }
  enabledQuizIdsPromise = null;
  return Boolean(data);
}

/** État de publication d'un passage : source unique, identique à la file. */
export async function fetchQrcPublicationState(attemptId: string) {
  const { data, error } = await supabase.rpc("qrc_attempt_publication_state", { p_attempt_id: attemptId });
  if (error) throw error;
  const row: any = Array.isArray(data) ? data[0] : data;
  return {
    total: Number(row?.total ?? 0),
    enAttente: Number(row?.en_attente ?? 0),
    corrigees: Number(row?.corrigees ?? 0),
    publiable: Boolean(row?.publiable ?? true),
  };
}

/**
 * Lecture du blocage côté apprenant, pour les examens branchés uniquement.
 * Renvoie `null` si le moteur n'est pas activé pour cet examen : l'appelant
 * garde alors exactement son comportement historique.
 */
export async function fetchLearnerQrcPending(args: {
  apprenantId: string;
  quizId: string;
}): Promise<{ pendingByMatiere: Set<string>; pendingTotal: number } | null> {
  const { apprenantId, quizId } = args;
  if (!apprenantId || !quizId) return null;
  if (!(await isQrcEngineEnabled(quizId))) return null;

  const { data, error } = await supabase
    .from("qrc_instances")
    .select("matiere_id, etat")
    .eq("apprenant_id", apprenantId)
    .eq("quiz_id", quizId)
    .eq("etat", "en_attente");
  if (error) {
    console.warn("[qrcInstances] lecture apprenant impossible:", error.message);
    return null;
  }
  const pendingByMatiere = new Set<string>((data || []).map((r: any) => String(r.matiere_id)));
  return { pendingByMatiere, pendingTotal: (data || []).length };
}
