import { useQuery } from "@tanstack/react-query";
import { tousLesExamens, type ExamenBlanc } from "./examens-blancs-data";
import { loadSavedExamens } from "./ExamensBlancsEditor";

export const LIVE_EXAMENS_QUERY_KEY = ["examens-blancs-live"] as const;

/**
 * Définitions d'examens blancs telles qu'ENREGISTRÉES (module_editor_state),
 * identiques à ce que voit l'apprenant. La liste statique du code n'est plus
 * qu'un repli en cas d'échec de chargement.
 *
 * Lecture seule : n'écrit jamais de donnée apprenant.
 */
export async function fetchLiveExamens(): Promise<ExamenBlanc[]> {
  try {
    const rows = await loadSavedExamens();
    return Array.isArray(rows) && rows.length ? rows : tousLesExamens;
  } catch {
    return tousLesExamens;
  }
}

export function useLiveExamens(): { examens: ExamenBlanc[]; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: LIVE_EXAMENS_QUERY_KEY,
    queryFn: fetchLiveExamens,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
  });
  return { examens: data && data.length ? data : tousLesExamens, isLoading };
}
