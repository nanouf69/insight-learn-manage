import { useQuery } from "@tanstack/react-query";
import { type ExamenBlanc } from "./examens-blancs-data";
import { loadSavedExamens } from "./ExamensBlancsEditor";
import { ExamContentUnavailableError } from "./exam-content-integrity";

export const LIVE_EXAMENS_QUERY_KEY = ["examens-blancs-live"] as const;

/**
 * Définitions d'examens blancs telles qu'ENREGISTRÉES (module_editor_state).
 *
 * AUCUN REPLI : si la version active ne peut pas être chargée, on remonte une
 * erreur. Le contenu statique du code n'est JAMAIS servi à un apprenant.
 *
 * Lecture seule : n'écrit jamais de donnée apprenant.
 */
export async function fetchLiveExamens(): Promise<ExamenBlanc[]> {
  const rows = await loadSavedExamens();
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new ExamContentUnavailableError("Aucune version active d'examen blanc chargée");
  }
  return rows;
}

export function useLiveExamens(): { examens: ExamenBlanc[]; isLoading: boolean; error: unknown; refetch: () => void } {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: LIVE_EXAMENS_QUERY_KEY,
    queryFn: fetchLiveExamens,
    // SOURCE UNIQUE : aucune fenêtre de fraîcheur. Chaque ouverture, montage,
    // F5 ou retour d'onglet relit la version active serveur. Aucune version
    // conservée en cache entre deux affichages.
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: "always",
    retry: 1,
  });
  return { examens: data ?? [], isLoading, error, refetch: () => { void refetch(); } };
}
