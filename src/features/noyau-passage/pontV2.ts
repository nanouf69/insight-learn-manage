/**
 * PONT DE PASSAGE VERS LE NOYAU V2
 * ================================
 *
 * Objectif : pour tout NOUVEAU passage d'examen blanc, le noyau sécurisé
 * devient la SOURCE DE VÉRITÉ.
 *
 *   démarrage  → core_start_attempt        (snapshot figé, une seule tentative)
 *   réponse    → core_save_answer          (append-only, révision, idempotent)
 *   fin        → core_finalize_attempt     (QRC créées) + core_recalc_result
 *
 * Règles :
 *  - le serveur seul décide si un apprenant est un compte TEST et si le pont
 *    est actif (tables core_bridge_flags / core_bridge_comptes_test) ;
 *  - aucune note, aucun barème, aucune correction n'est calculé ici ;
 *  - l'ancien circuit (reponses_apprenants) n'est jamais lu comme vérité pour
 *    un passage raccordé : il ne reçoit qu'une projection de lecture.
 */
import { supabase } from "@/integrations/supabase/client";
import type { ExamenBlanc, Matiere, Question } from "@/components/cours-en-ligne/examens-blancs-data";
import { getPointsParQuestion } from "@/components/cours-en-ligne/examens-blancs-data";

/** Identifiant de question unique dans tout l'examen : matière + numéro. */
export const idQuestionNoyau = (matiereId: string, questionId: number | string) =>
  `${matiereId}:${questionId}`;

/** UUID déterministe (idempotence) calculé à partir d'une clé métier stable. */
export async function operationId(cle: string): Promise<string> {
  const octets = new TextEncoder().encode(cle);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", octets));
  const hex = Array.from(digest.slice(0, 16), (b) => b.toString(16).padStart(2, "0")).join("");
  return [hex.slice(0, 8), hex.slice(8, 12), "4" + hex.slice(13, 16), "8" + hex.slice(17, 20), hex.slice(20, 32)].join("-");
}

export type ContenuVersion = {
  exam_id: string;
  exam_libelle: string;
  filiere: string;
  exam_numero: string;
  matieres: { subject_id: string; titre: string; ordre: number; duree: number; coefficient: number; note_sur: number }[];
  questions: {
    id: string;
    matiere: string;
    ordre: number;
    type: string;
    enonce: string;
    choix: Question["choix"] | null;
    reponseQRC: string | null;
    image: string | null;
    points: number;
  }[];
};

/**
 * Construit le contenu à publier À PARTIR DE L'EXAMEN RÉELLEMENT SERVI À
 * L'APPRENANT (même objet, mêmes barèmes) : aucune reconstruction, aucune
 * lecture d'une autre source.
 */
export function contenuVersionDepuisExamen(examen: ExamenBlanc): ContenuVersion {
  const matieres = (examen.matieres ?? []).filter(Boolean) as Matiere[];
  return {
    exam_id: examen.id,
    exam_libelle: examen.titre,
    filiere: examen.type,
    exam_numero: String(examen.numero),
    matieres: matieres.map((m, i) => ({
      subject_id: m.id,
      titre: m.nom,
      ordre: i + 1,
      duree: m.duree ?? 0,
      coefficient: m.coefficient ?? 1,
      note_sur: m.noteSur ?? 0,
    })),
    questions: matieres.flatMap((m) =>
      (m.questions ?? [])
        .filter((q): q is Question => !!q && q.type != null)
        .map((q, i) => ({
          id: idQuestionNoyau(m.id, q.id),
          matiere: m.id,
          ordre: i + 1,
          type: q.type,
          enonce: q.enonce ?? "",
          choix: q.choix ?? null,
          reponseQRC: q.reponseQRC ?? null,
          image: q.image ?? null,
          points: getPointsParQuestion(m.id, q.type, m),
        })),
    ),
  };
}

/** Publie (ou retrouve) la version active correspondant au contenu actuel. Admin uniquement. */
export async function publierVersionExamen(examen: ExamenBlanc, moduleId: number | null, email?: string) {
  const contenu = contenuVersionDepuisExamen(examen);
  const op = await operationId(`publish:${examen.id}:${JSON.stringify(contenu).length}:${Date.now()}`);
  const { data, error } = await supabase.rpc("core_publish_version_contenu", {
    p_operation_id: op,
    p_filiere: contenu.filiere,
    p_exam_numero: contenu.exam_numero,
    p_module_id: moduleId,
    p_exam_id: contenu.exam_id,
    p_content: contenu as unknown as never,
    p_email: email ?? null,
    p_is_test: false,
  });
  if (error) throw error;
  return data;
}

/** Le pont est-il actif pour cet apprenant ? (décision serveur, jamais locale) */
export async function pontActifPour(apprenantId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("core_bridge_actif_pour", { p_apprenant_id: apprenantId });
  if (error) return false;
  return data === true;
}

/** Démarre (ou reprend) la tentative V2 d'une matière : snapshot figé côté serveur. */
export async function demarrerTentative(params: {
  apprenantId: string;
  examenId: string;
  matiereId: string;
  tentative: number;
}): Promise<string | null> {
  const op = await operationId(
    `start:${params.apprenantId}:${params.examenId}:${params.matiereId}:t${params.tentative}`,
  );
  const { data, error } = await supabase.rpc("core_start_attempt", {
    p_operation_id: op,
    p_apprenant_id: params.apprenantId,
    p_exam_id: params.examenId,
    p_matiere: params.matiereId,
  });
  if (error) {
    console.warn("[PontV2] démarrage refusé:", error.message);
    return null;
  }
  const att = data as unknown as { attempt_id?: string } | null;
  return att?.attempt_id ?? null;
}

/** Enregistre une réponse dans le noyau (append-only + révision serveur). */
export async function enregistrerReponse(params: {
  attemptId: string;
  matiereId: string;
  questionId: number | string;
  valeur: unknown;
  revisionAttendue?: number | null;
}): Promise<{ ok: boolean; revision?: number; message?: string }> {
  const qid = idQuestionNoyau(params.matiereId, params.questionId);
  const op = await operationId(`answer:${params.attemptId}:${qid}:${JSON.stringify(params.valeur ?? null)}`);
  const { data, error } = await supabase.rpc("core_save_answer", {
    p_operation_id: op,
    p_attempt_id: params.attemptId,
    p_question_id: qid,
    p_valeur: (params.valeur ?? null) as unknown as never,
    p_expected_revision: params.revisionAttendue ?? null,
    p_session_origine: "passage_apprenant",
  });
  if (error) return { ok: false, message: error.message };
  const res = data as unknown as { revision?: number } | null;
  return { ok: true, revision: res?.revision };
}

/** Finalise la matière : crée les QRC en attente puis publie le résultat serveur. */
export async function finaliserMatiere(params: {
  attemptId: string;
  matiereId: string;
  questionsQRC: (number | string)[];
}): Promise<{ ok: boolean; message?: string }> {
  const op = await operationId(`finalize:${params.attemptId}`);
  const { error } = await supabase.rpc("core_finalize_attempt", {
    p_operation_id: op,
    p_attempt_id: params.attemptId,
    p_qrc_questions: params.questionsQRC.map((q) => idQuestionNoyau(params.matiereId, q)),
    p_resultat: {} as unknown as never,
  });
  if (error) return { ok: false, message: error.message };

  const { error: erreurNote } = await supabase.rpc("core_recalc_result", { p_attempt_id: params.attemptId });
  if (erreurNote) return { ok: false, message: erreurNote.message };
  return { ok: true };
}
