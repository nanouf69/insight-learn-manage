import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MODULE_NAME_BY_ID } from "@/components/cours-en-ligne/modules-config";
import { arrondirPoidsAffichage, BUDGET_CPF, LABEL_PRESENTIEL } from "@/lib/jalonsPonderes";
import { chargerCalculJalons, dureeLigne, estJalonPratique, formationJalonsElearning } from "@/lib/jalonsPedagogiques";
import { ecouterContenuModifie } from "@/lib/contenuModifie";

export const JALONS_VOLUMES_KEY = "jalons-volumes";

/** Carte interne ADMIN : taux indicatif pondéré. Lecture seule. */
export function JalonsPonderesCard({ apprenantId, typeApprenant, formationChoisie, defaultOpen = false, titre }: { apprenantId: string; typeApprenant?: string | null; formationChoisie?: string | null; defaultOpen?: boolean; titre?: string }) {
  const [open, setOpen] = useState(defaultOpen);
  const { user, loading } = useAuth();
  const userId = !loading ? user?.id ?? null : null;
  const { data: adminCheck } = useQuery({
    queryKey: ["jalons-ponderes-admin", userId],
    enabled: !!userId,
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId!).eq("role", "admin").maybeSingle();
      if (error) throw error;
      return { userId, admin: !!data };
    },
  });
  // Le résultat n'est valable que pour le compte qui l'a obtenu (changement de compte / déconnexion = masqué).
  const isAdmin = !!userId && adminCheck?.userId === userId && adminCheck.admin;
  const key = formationJalonsElearning(typeApprenant, formationChoisie);
  const queryClient = useQueryClient();
  // Poids recalculés depuis le contenu ACTUEL (questions) à chaque affichage, retour d'onglet et enregistrement éditeur.
  const { data: calcul, isError, isFetching } = useQuery({
    queryKey: [JALONS_VOLUMES_KEY, apprenantId, key, userId],
    enabled: !!isAdmin && !!key,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
    refetchInterval: 5 * 60 * 1000, // filet de sécurité si un événement en direct est manqué
    queryFn: () => chargerCalculJalons({ apprenantId, typeApprenant, formationChoisie }),
  });
  useEffect(() => {
    if (!isAdmin || !key) return;
    const ch = supabase.channel(`jalons-volumes-${apprenantId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "module_editor_state" }, () => {
        void queryClient.invalidateQueries({ queryKey: [JALONS_VOLUMES_KEY] });
      })
      .subscribe();
    const stop = ecouterContenuModifie(() => { void queryClient.invalidateQueries({ queryKey: [JALONS_VOLUMES_KEY] }); });
    return () => { stop(); void supabase.removeChannel(ch); };
  }, [isAdmin, key, apprenantId, queryClient]);
  if (!isAdmin || !key) return null;
  if (isError) return <div className="mt-2 rounded-md border bg-card px-3 py-2 text-xs text-muted-foreground">Jalons pondérés : données indisponibles (aucun pourcentage de repli affiché).</div>;
  // Pendant un recalcul, aucun ancien pourcentage n'est affiché.
  if (!calcul || isFetching) return <div className="mt-2 rounded-md border bg-card px-3 py-2 text-xs text-muted-foreground">Jalons pondérés : calcul en cours…</div>;
  const r = calcul.resultat;
  const ponderees = r.lignes.map((l, i) => [l.poids, i] as const).filter(([p]) => p > 0);
  const arrondis = arrondirPoidsAffichage(ponderees.map(([p]) => p));
  const poidsAffiche = new Map(ponderees.map(([, i], k) => [i, arrondis[k]]));
  const totalMinutes = BUDGET_CPF[calcul.filiere].total;
  const finIncomplete = r.taux < 100 && r.lignes.every((l) => l.obligatoireSansPoids || l.valide);
  return (
    <div className="mt-2 w-full rounded-md border bg-card px-3 py-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">{titre ?? "Jalons pondérés (indicatif interne)"}</span>
        <span className="text-lg font-bold text-foreground">{r.taux.toLocaleString("fr-FR")}%</span>
      </div>
      <div className="mt-1.5 h-1.5 w-full rounded-full bg-border overflow-hidden">
        <div className="h-full rounded-full bg-foreground/60" style={{ width: `${Math.min(100, r.taux)}%` }} />
      </div>
      {finIncomplete && <div className="mt-1 text-xs text-muted-foreground">Contenus pédagogiques terminés ; validation de fin de formation / jalon administratif en attente.</div>}
      <button type="button" onClick={() => setOpen(!open)} className="mt-1 flex items-center gap-1 text-xs text-primary">
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />} Détail par module
      </button>
      {open && (
        <div className="mt-2 overflow-x-auto"><table className="w-full min-w-[42rem] text-xs">
          <thead><tr className="text-muted-foreground text-left"><th>Module</th><th className="text-right">Pages</th><th className="text-right">Questions</th><th className="text-right">Durée prévisionnelle CPF (min)</th><th className="text-right">Poids</th><th className="text-right">Progression</th><th className="text-right">Contribution</th></tr></thead>
          <tbody>
            {r.lignes.map((l, i) => (
              <tr key={l.moduleId} className="border-t">
                <td>{estJalonPratique(l.moduleId) ? LABEL_PRESENTIEL : l.moduleId ? `${l.moduleId} · ${MODULE_NAME_BY_ID[l.moduleId] ?? ""}` : "Introduction (non attribuée)"}</td>
                {(() => { const v = Object.values(calcul.volumes).find((x) => x.moduleId === l.moduleId); return <><td className="text-right">{estJalonPratique(l.moduleId) ? "6 h" : v?.pages ?? "–"}</td><td className="text-right">{estJalonPratique(l.moduleId) ? "–" : v?.questions ?? "–"}</td></>; })()}
                <td className="text-right">{l.obligatoireSansPoids ? "0 (obligatoire)" : dureeLigne(calcul.durees, l.moduleId, l.poids).toLocaleString("fr-FR")}</td>
                <td className="text-right">{l.obligatoireSansPoids ? "0 (obligatoire)" : (poidsAffiche.get(i) ?? 0).toLocaleString("fr-FR")}</td>
                <td className="text-right">{Math.round(l.progression)}%</td>
                <td className="text-right">{l.contribution.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr className="border-t font-semibold"><td colSpan={3}>Total formation</td><td className="text-right">{totalMinutes.toLocaleString("fr-FR")} ({totalMinutes / 60} h)</td><td className="text-right">100</td><td colSpan={2} /></tr></tfoot>
        </table>
        <p className="mt-2 text-xs text-muted-foreground">Répartition prévisionnelle des durées CPF (tableau approuvé) : examens blancs et présentiel 6 h fixes ; le reste du budget est réparti selon le volume actuel (2 × pages d’audit + questions actives) et s’ajuste automatiquement quand des questions sont ajoutées. Poids = durée prévisionnelle / durée totale × 100. Ces durées ne sont ni des heures réalisées, ni des temps validés par la CDC, ni une note. Heures réalisées en présentiel (preuve) : {Math.min(360, calcul.pratique.minutes)} / 360 min justifiées par le Planning pratique et les émargements signés.</p>
        <p className="mt-1 text-xs text-muted-foreground">Questions recomptées sur le contenu actuel ; pages issues de l'audit (non recomptées automatiquement). Un module déjà « Terminé » reste à 100 % même si des questions ont été ajoutées depuis.</p>
        {calcul.limites.length > 0 && <ul className="mt-1 list-disc pl-4 text-xs text-muted-foreground">{calcul.limites.map((t) => <li key={t}>{t}</li>)}</ul>}
        </div>
      )}
    </div>
  );
}
