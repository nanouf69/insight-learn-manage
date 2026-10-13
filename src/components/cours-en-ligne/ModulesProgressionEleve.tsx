import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, ChevronRight, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ACTIVITES_CODE } from "@/lib/jeuxPedagogiques";
import { progressionModulesEleve, type ModuleEleveLite, type ProgressionModules } from "@/lib/progressionModulesEleve";
import type { CompletionLite } from "@/lib/moduleUnlockLogic";

export const ACTIVITE_CONFIRMEE_EVENT = "activite-registre-confirmee";
const CLE = "activites-registre-eleve";

/** Activités du registre terminées (serveur) pour CE compte ; null = lecture impossible. */
export function useActivitesTermineesEleve(apprenantId: string | null | undefined) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: [CLE, apprenantId],
    enabled: !!apprenantId,
    staleTime: 0,
    gcTime: 0, // jamais réutilisé pour un autre compte sur la même tablette
    queryFn: async () => {
      if (!apprenantId) throw new Error("Compte absent");
      const { data, error } = await supabase.from("reponses_apprenants").select("exercice_id, completed")
        .eq("apprenant_id", apprenantId).in("exercice_id", ACTIVITES_CODE.map((a) => a.id));
      if (error) throw error;
      return new Set(((data as any[]) ?? []).filter((r) => r.completed === true).map((r) => String(r.exercice_id)));
    },
  });
  useEffect(() => {
    const f = () => { void qc.invalidateQueries({ queryKey: [CLE, apprenantId] }); };
    window.addEventListener(ACTIVITE_CONFIRMEE_EVENT, f);
    return () => window.removeEventListener(ACTIVITE_CONFIRMEE_EVENT, f);
  }, [qc, apprenantId]);
  if (!apprenantId || q.isError) return { pret: true, termines: null as Set<string> | null };
  return { pret: q.isSuccess && !q.isFetching, termines: q.data ?? null };
}

export function useProgressionModulesEleve(apprenantId: string | null | undefined, modules: ModuleEleveLite[], estTermine: (id: number) => boolean, charge: boolean, completions: readonly CompletionLite[] = []): ProgressionModules | null {
  const { pret, termines } = useActivitesTermineesEleve(apprenantId);
  if (!charge || !pret) return null;
  return progressionModulesEleve(modules, estTermine, termines, undefined, apprenantId, completions);
}

export function ModulesProgressionEleve({ progression, onOuvrir, estVerrouille }: { progression: ProgressionModules | null; onOuvrir: (id: number) => void; estVerrouille: (id: number) => boolean }) {
  if (!progression) return <div className="mb-4 rounded-lg border bg-muted px-4 py-3 text-sm text-muted-foreground">Chargement de vos modules…</div>;
  if (progression.etat === "indisponible") return <div className="mb-4 rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground" data-testid="modules-indisponible">Progression des modules momentanément indisponible. Réessayez dans un instant : rien n'est perdu.</div>;
  const { total, termines, restants, seulementPratique } = progression;
  const pct = total > 0 ? Math.round((termines / total) * 100) : 0;
  return (
    <Card className="mb-4 border shadow-sm" data-testid="modules-progression">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-2"><BookOpen className="w-5 h-5 text-primary shrink-0" /><h3 className="font-bold text-lg">Mes modules</h3></div>
        <p className="text-2xl sm:text-3xl font-bold leading-tight" data-testid="modules-termines">{termines} module{termines > 1 ? "s" : ""} terminé{termines > 1 ? "s" : ""} sur {total}</p>
        <p className="text-lg font-semibold text-primary mt-1" data-testid="modules-restants">
          {restants.length === 0 ? "Tous vos modules sont terminés" : `${restants.length} module${restants.length > 1 ? "s" : ""} ${restants.length > 1 ? "restent" : "reste"} à terminer`}
        </p>
        {total > 0 && <div className="flex items-center gap-3 mt-3"><Progress value={pct} className="h-2.5 flex-1" /><span className="text-sm font-semibold w-12 text-right">{pct}%</span></div>}
        {seulementPratique && <p className="text-sm mt-3 font-medium">Il vous reste la présence / pratique à réaliser.</p>}
        {restants.length > 0 && (
          <ul className="mt-3 space-y-1">
            {restants.slice(0, 8).map((m) => {
              const lock = estVerrouille(m.id);
              return (
                <li key={m.id}>
                  <Button type="button" variant="outline" disabled={lock} onClick={() => onOuvrir(m.id)}
                    className="w-full h-auto flex items-center justify-between gap-2 px-3 py-2 text-left text-sm whitespace-normal">
                    <span className="min-w-0 break-words">
                      {m.nom}
                      {m.raison === "nouvelles_activites" && <span className="block text-xs text-muted-foreground">Nouvelles activités à terminer</span>}
                      {m.pratique && <span className="block text-xs text-muted-foreground">Présence / pratique à réaliser</span>}
                       {(m.id === 6 || m.id === 8) && <span className="block text-xs text-muted-foreground">Activités pratiques en ligne à terminer</span>}
                    </span>
                    {lock ? <Lock className="w-4 h-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
                  </Button>
                </li>
              );
            })}
            {restants.length > 8 && <li className="text-xs text-muted-foreground px-1">… et {restants.length - 8} autre(s) dans la liste des modules ci-dessous.</li>}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
