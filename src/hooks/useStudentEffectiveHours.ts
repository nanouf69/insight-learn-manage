import { useApprenantTauxRealisation } from "@/hooks/useApprenantTauxRealisation";
import { formatLearningHours } from "@/lib/elearningRequiredHours";
export { HEURES_REQUISES } from "@/lib/elearningRequiredHours";

export interface ConnexionRow {
  apprenant_id: string;
  started_at: string;
  ended_at: string | null;
  last_seen_at: string;
}

export interface ActivityTs {
  apprenant_id: string;
  ts: string;
}

interface UseStudentEffectiveHoursOptions {
  dateDebutFormation?: string | null;
  dateFinFormation?: string | null;
  dateDebutCoursEnLigne?: string | null;
  dateFinCoursEnLigne?: string | null;
}

/** Read-only adapter: learner and CRM read exactly the same evidence and contract. */
export function useStudentEffectiveHours(
  apprenantId: string | null | undefined,
  typeApprenant: string | null | undefined,
  options: UseStudentEffectiveHoursOptions = {},
) {
  const { data, isLoading, isError } = useApprenantTauxRealisation(apprenantId ?? undefined, {
    type_apprenant: typeApprenant,
    date_fin_formation: options.dateFinFormation,
    date_fin_cours_en_ligne: options.dateFinCoursEnLigne,
  });
  const requis = data?.reqElearning ?? 0;
  const faitHeures = data?.doneElearning ?? 0;
  const restantHeures = Math.max(0, requis - faitHeures);
  return {
    loading: isLoading || isError || (!!apprenantId && !data),
    totalMinutes: Math.round(faitHeures * 60),
    requis,
    faitHeures,
    restantHeures,
    pct: data?.pctElearning ?? 0,
    formattedDone: formatLearningHours(faitHeures),
    formattedRemaining: formatLearningHours(restantHeures),
  };
}
