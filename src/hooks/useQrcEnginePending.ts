import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchLearnerQrcPending, buildQrcAttemptId } from "@/lib/qrcInstances";
import { isQrcCorrectionValidated } from "@/components/cours-en-ligne/exam-helpers";

type EngineEntry = {
  pendingByMatiere: Set<string>;
  pendingTotal: number;
  pendingAttemptIds?: Set<string>;
  pendingQuestionsByAttempt?: Map<string, Set<string>>;
};

/**
 * Une fiche pilote `qrc_instances` restée « en_attente » ne bloque plus la
 * matière quand la copie elle-même porte, pour CHAQUE question en attente de ce
 * passage, une correction validée par l'administrateur (ex. notation via
 * `qrc_historique_noter`, qui écrit sur la copie et ne ferme pas la fiche
 * pilote). Lecture seule : rien n'est écrit.
 */
export function pilotPendingResolvedByCopy(pendingQuestionIds: Set<string> | undefined, row: any): boolean {
  if (!pendingQuestionIds || pendingQuestionIds.size === 0) return false;
  const corr = row?.correctionsIA ?? row?.details?.correctionsIA;
  if (!corr || typeof corr !== "object") return false;
  for (const qid of pendingQuestionIds) {
    const c = (corr as any)[qid] ?? (corr as any)[`Q${qid}`];
    if (!isQrcCorrectionValidated(c)) return false;
  }
  return true;
}

export function engineMatierePending(
  entry: EngineEntry | undefined,
  apprenantId: string | null | undefined,
  quizId: string,
  matiereId: string,
  row?: any,
): boolean | null {
  if (!entry) return null;
  if (row && apprenantId && Number.isFinite(Number(row.tentative)) && Number(row.tentative) > 0 && entry.pendingAttemptIds) {
    const attemptId = buildQrcAttemptId(apprenantId, quizId, matiereId, Number(row.tentative));
    if (!entry.pendingAttemptIds.has(attemptId)) return false;
    return !pilotPendingResolvedByCopy(entry.pendingQuestionsByAttempt?.get(attemptId), row);
  }
  return entry.pendingByMatiere.has(matiereId);
}

/**
 * Blocage de note côté apprenant pour les examens branchés sur le nouveau
 * moteur QRC. Renvoie `null` pour tout examen non branché : l'écran conserve
 * alors strictement son comportement actuel.
 */
export function useQrcEnginePending(apprenantId: string | null | undefined, quizIds: string[]) {
  const [state, setState] = useState<Record<string, EngineEntry>>({});
  const key = quizIds.filter(Boolean).sort().join("|");

  useEffect(() => {
    let cancelled = false;
    const ids = key ? key.split("|") : [];
    if (!apprenantId || ids.length === 0) { setState({}); return; }

    const load = async () => {
      const next: Record<string, EngineEntry> = {};
      for (const quizId of ids) {
        const res = await fetchLearnerQrcPending({ apprenantId, quizId });
        if (res) next[quizId] = res;
      }
      if (!cancelled) setState(next);
    };
    load();

    const channel = supabase
      .channel(`qrc-instances-learner-${apprenantId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "qrc_instances", filter: `apprenant_id=eq.${apprenantId}` }, () => load())
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [apprenantId, key]);

  return {
    /** null = examen non branché (comportement historique conservé). */
    isExamPending(quizId: string): boolean | null {
      const entry = state[quizId];
      if (!entry) return null;
      return entry.pendingTotal > 0;
    },
    isMatierePending(quizId: string, matiereId: string, row?: any): boolean | null {
      return engineMatierePending(state[quizId], apprenantId, quizId, matiereId, row);
    },
  };
}
