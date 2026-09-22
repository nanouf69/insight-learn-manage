// Accès au VRAI noyau sécurisé en base (aucun serveur simulé).
// Toutes les écritures passent par des fonctions serveur idempotentes.
import { supabase } from "@/integrations/supabase/client";

export type QuestionSnapshot = {
  id: string;
  matiere: string;
  type: string;
  enonce: string;
  reponseQRC?: string;
  points: number;
};

export type MatiereSnapshot = { subject_id: string; lettre: string; titre: string; ordre: number };

export type SnapshotExamen = {
  exam_id: string;
  exam_libelle?: string;
  matieres: MatiereSnapshot[];
  questions: QuestionSnapshot[];
  session?: { date: string; heure: string };
};

export type TentativeReelle = {
  attempt_id: string;
  apprenant_id: string;
  exam_id: string;
  exam_version_id: string;
  etat: string;
  snapshot: SnapshotExamen;
  snapshot_fingerprint: string;
  candidat: string;
};

export type QrcReelle = {
  qrc_instance_id: string;
  attempt_id: string;
  question_id: string;
  apprenant_id: string;
  reponse: unknown;
  etat: "en_attente" | "corrigee";
  note: number | null;
};

export type ResultatReel = {
  result_id: string;
  attempt_id: string;
  result_revision: number;
  status: "provisoire" | "definitif";
  score: number | null;
  total: number | null;
  qrc_restantes: number;
  published_at: string | null;
};

export type SessionReelle = {
  tentatives: TentativeReelle[];
  qrc: QrcReelle[];
  resultats: ResultatReel[];
};

const asSnapshot = (v: unknown) => v as SnapshotExamen;

/**
 * Charge une session depuis la base réelle.
 * - "test"  : tentatives fictives marquées is_test
 * - "migre" : passages réels copiés depuis l'ancien système (pilote contrôlé)
 */
export async function chargerSessionTest(mode: "test" | "migre" = "test"): Promise<SessionReelle> {
  const { data: attempts, error } = await supabase
    .from("exam_attempts_v2")
    .select("attempt_id, apprenant_id, exam_id, exam_version_id, etat, snapshot, snapshot_fingerprint")
    .eq("is_test", mode === "test")
    .order("started_at", { ascending: true });
  if (error) throw error;

  const ids = (attempts ?? []).map((a) => a.apprenant_id);
  const { data: apprenants } = ids.length
    ? await supabase.from("apprenants").select("id, nom, prenom").in("id", ids)
    : { data: [] as { id: string; nom: string; prenom: string }[] };
  const nomDe = new Map((apprenants ?? []).map((a) => [a.id, `${a.nom} ${a.prenom}`]));

  const attemptIds = (attempts ?? []).map((a) => a.attempt_id);
  const { data: qrc } = attemptIds.length
    ? await supabase
        .from("qrc_instances_v2")
        .select("qrc_instance_id, attempt_id, question_id, apprenant_id, reponse, etat, note")
        .in("attempt_id", attemptIds)
    : { data: [] as QrcReelle[] };

  const { data: resultats } = attemptIds.length
    ? await supabase
        .from("core_exam_results")
        .select("result_id, attempt_id, result_revision, status, score, total, qrc_restantes, published_at")
        .in("attempt_id", attemptIds)
    : { data: [] as ResultatReel[] };

  return {
    tentatives: (attempts ?? []).map((a) => ({
      ...a,
      snapshot: asSnapshot(a.snapshot),
      candidat: nomDe.get(a.apprenant_id) ?? "(apprenant)",
    })),
    qrc: (qrc ?? []) as QrcReelle[],
    resultats: (resultats ?? []) as ResultatReel[],
  };
}

/** Correction formateur : événement séparé, recalcul et publication côté serveur. */
export async function corrigerQrc(params: {
  operationId: string;
  qrcInstanceId: string;
  note: number;
  commentaire?: string;
  email?: string;
}) {
  const { data, error } = await supabase.rpc("core_correct_qrc_publish", {
    p_operation_id: params.operationId,
    p_qrc_instance_id: params.qrcInstanceId,
    p_note: params.note,
    p_commentaire: params.commentaire ?? null,
    p_corrige_email: params.email ?? null,
  });
  if (error) throw error;
  return data as Record<string, unknown>;
}

/** Réponse apprenant : journal d'événements + révision, confirmée par le serveur. */
export async function enregistrerReponse(params: {
  operationId: string;
  attemptId: string;
  questionId: string;
  valeur: string;
  revisionAttendue: number;
}) {
  const { data, error } = await supabase.rpc("core_save_answer", {
    p_operation_id: params.operationId,
    p_attempt_id: params.attemptId,
    p_question_id: params.questionId,
    p_valeur: JSON.stringify(params.valeur) as unknown as never,
    p_expected_revision: params.revisionAttendue,
    p_session_origine: "pilote-test",
  });
  if (error) throw error;
  return data as Record<string, unknown>;
}

export async function finaliserTentative(params: {
  operationId: string;
  attemptId: string;
  questionsQrc: string[];
}) {
  const { data, error } = await supabase.rpc("core_finalize_attempt", {
    p_operation_id: params.operationId,
    p_attempt_id: params.attemptId,
    p_qrc_questions: params.questionsQrc,
    p_resultat: {} as unknown as never,
  });
  if (error) throw error;
  return data as Record<string, unknown>;
}

export async function lireResultat(attemptId: string): Promise<ResultatReel | null> {
  const { data } = await supabase
    .from("core_exam_results")
    .select("result_id, attempt_id, result_revision, status, score, total, qrc_restantes, published_at")
    .eq("attempt_id", attemptId)
    .maybeSingle();
  return (data as ResultatReel) ?? null;
}

/** Temps réel : simple signal « une nouvelle donnée serveur existe », aucune vérité métier. */
export function souscrireSignal(canal: string, table: "qrc_instances_v2" | "core_exam_results", onSignal: () => void) {
  const ch = supabase
    .channel(canal)
    .on("postgres_changes", { event: "*", schema: "public", table }, () => onSignal())
    .subscribe();
  return () => {
    supabase.removeChannel(ch);
  };
}
