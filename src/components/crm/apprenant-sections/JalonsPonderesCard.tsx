import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MODULE_NAME_BY_ID } from "@/components/cours-en-ligne/modules-config";
import { LABEL_PRESENTIEL } from "@/lib/jalonsPonderes";
import { chargerCalculJalons, estJalonPratique, formationJalonsElearning } from "@/lib/jalonsPedagogiques";
import { EXPLICATION_JALONS, formatDureeJalon, heuresEnregistreesJalons, tableauAffichageJalons } from "@/lib/affichageJalons";
import { chargerPreuvesJalons } from "@/lib/preuvesJalons";
import { Button } from "@/components/ui/button";
import { ecouterContenuModifie } from "@/lib/contenuModifie";
import { ObjectifsJalonsSection } from "./ObjectifsJalonsSection";
import { HEURES_VALIDEES_EVENT } from "@/lib/heuresValideesAdmin";
import { GEL_QUERY_KEY, chargerEtatGel, mentionGel } from "@/lib/releveJalonsGel";

export const JALONS_VOLUMES_KEY = "jalons-volumes";

/** Carte interne ADMIN : taux indicatif pondéré. Lecture seule. */
export function JalonsPonderesCard({ apprenantId, typeApprenant, formationChoisie, defaultOpen = false, titre, afficherObjectifs = false, apprenant }: { apprenantId: string; typeApprenant?: string | null; formationChoisie?: string | null; defaultOpen?: boolean; titre?: string; afficherObjectifs?: boolean; apprenant?: any }) {
  const [open, setOpen] = useState(defaultOpen);
  const { user, loading } = useAuth();
  const userId = !loading ? user?.id ?? null : null;
  const { data: adminCheck } = useQuery({
    queryKey: ["jalons-ponderes-admin", userId],
    enabled: !!userId,
    staleTime: 0,
    queryFn: async () => {
      if (!userId) throw new Error("Accès administrateur requis");
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
      if (error) throw error;
      return { userId, admin: !!data };
    },
  });
  // Le résultat n'est valable que pour le compte qui l'a obtenu (changement de compte / déconnexion = masqué).
  const isAdmin = !!userId && adminCheck?.userId === userId && adminCheck.admin;
  const key = formationJalonsElearning(typeApprenant, formationChoisie);
  const queryClient = useQueryClient();
  // Relevé figé à la clôture : prioritaire sur tout recalcul (le contenu actuel ne s'applique plus).
  const gelQuery = useQuery({
    queryKey: [GEL_QUERY_KEY, apprenantId, userId],
    enabled: !!isAdmin && !!key,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchInterval: 5 * 60 * 1000,
    queryFn: () => chargerEtatGel(apprenantId),
  });
  const etatGel = gelQuery.data ?? null;
  const gel = etatGel?.etat === "fige" ? etatGel.gel : null;
  // Poids recalculés depuis le contenu ACTUEL — seulement si aucun gel n'existe (lecture du gel réussie).
  const { data: calculActuel, isError: calculError, isFetching } = useQuery({
    queryKey: [JALONS_VOLUMES_KEY, apprenantId, key, userId, gel?.id ?? "actuel"],
    enabled: !!isAdmin && !!key && gelQuery.isSuccess && etatGel?.etat !== "en_attente",
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
    refetchInterval: 5 * 60 * 1000, // filet de sécurité si un événement en direct est manqué
    queryFn: () => chargerCalculJalons({ apprenantId, typeApprenant, formationChoisie, gel }),
  });
  const calcul = calculActuel;
  const isError = gelQuery.isError || calculError;
  const { data: preuvesActuelles, isFetching: preuvesFetching } = useQuery({
    queryKey: ["jalons-heures-enregistrees", apprenantId, userId, calcul?.key, gel?.id ?? "actuel"],
    enabled: !!isAdmin && !!calcul && !!apprenant && afficherObjectifs,
    staleTime: 0,
    gcTime: 0,
    queryFn: () => {
      if (!calcul || !apprenant) throw new Error("Relevé indisponible");
      return chargerPreuvesJalons({ apprenant, filiere: calcul.filiere, lignesModuleIds: calcul.resultat.lignes.map((l) => l.moduleId), completions: calcul.completions, gel });
    },
  });
  useEffect(() => {
    if (!isAdmin || !key) return;
    // Nom unique par instance : la carte peut être affichée deux fois (fiche + Contrôle).
    const ch = supabase.channel(`jalons-volumes-${apprenantId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "module_editor_state" }, () => {
        void queryClient.invalidateQueries({ queryKey: [JALONS_VOLUMES_KEY] });
      })
      .subscribe();
    const stop = ecouterContenuModifie(() => { void queryClient.invalidateQueries({ queryKey: [JALONS_VOLUMES_KEY] }); });
    // Ajout d'heures confirmé par le serveur : relire l'état du gel (nouvelle version possible).
    const onHeures = () => { void queryClient.invalidateQueries({ queryKey: [GEL_QUERY_KEY, apprenantId] }); };
    window.addEventListener(HEURES_VALIDEES_EVENT, onHeures);
    return () => { stop(); window.removeEventListener(HEURES_VALIDEES_EVENT, onHeures); void supabase.removeChannel(ch); };
  }, [isAdmin, key, apprenantId, queryClient]);
  if (!isAdmin || !key) return null;
  const preuves = preuvesActuelles;
  if (etatGel?.etat === "en_attente") return <div className="mt-2 rounded-md border bg-card px-3 py-2 text-xs text-muted-foreground">Jalons pondérés : {mentionGel(etatGel)}</div>;
  if (gelQuery.isError) return <div className="mt-2 rounded-md border bg-card px-3 py-2 text-xs text-destructive">Jalons pondérés : état du relevé figé illisible — aucun pourcentage affiché (ni figé, ni recalculé).</div>;
  if (isError) return <div className="mt-2 rounded-md border bg-card px-3 py-2 text-xs text-muted-foreground">Jalons pondérés : données indisponibles (aucun pourcentage de repli affiché).</div>;
  // Pendant un recalcul, aucun ancien pourcentage n'est affiché.
  if (!calcul || isFetching) return <div className="mt-2 rounded-md border bg-card px-3 py-2 text-xs text-muted-foreground">Jalons pondérés : calcul en cours…</div>;
  const r = calcul.resultat;
  const tableau = tableauAffichageJalons(calcul);
  const heures = heuresEnregistreesJalons(calcul, preuvesFetching ? null : preuves);
  const pct = (n: number) => `${n.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;
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
      <div className={`mt-1 text-xs ${gel ? "font-medium text-foreground" : "text-muted-foreground"}`}>{mentionGel(etatGel)}</div>
      {finIncomplete && <div className="mt-1 text-xs text-muted-foreground">Contenus pédagogiques terminés ; validation de fin de formation / jalon administratif en attente.</div>}
      <Button variant="ghost" size="sm" onClick={() => setOpen(!open)} className="mt-1 gap-1 text-xs text-primary">
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />} Détail par module
      </Button>
      {open && (
        <div className="mt-2 overflow-x-auto"><table className="w-full min-w-[48rem] text-xs [&_th]:px-2 [&_th]:py-2 [&_td]:px-2 [&_td]:py-2">
          <caption className="text-left font-semibold mb-2">Pourcentages et heures prévisionnelles par jalon</caption>
          <thead><tr className="text-muted-foreground text-left"><th>Module / jalon</th><th className="text-right">Pages</th><th className="text-right">Questions</th><th className="text-right">Heures CPF prévisionnelles</th><th className="text-right">Poids dans la formation (%)</th><th className="text-right">Progression élève (%)</th><th className="text-right">Contribution (points de %)</th><th className="text-right">Durée prévisionnelle couverte</th></tr></thead>
          <tbody>
            {tableau.lignes.map((l) => (
              <tr key={l.moduleId} className="border-t">
                <td>{estJalonPratique(l.moduleId) ? LABEL_PRESENTIEL : l.moduleId ? `${l.moduleId} · ${MODULE_NAME_BY_ID[l.moduleId] ?? ""}` : "Introduction (non attribuée)"}</td>
                {(() => { const v = Object.values(calcul.volumes).find((x) => x.moduleId === l.moduleId); return <><td className="text-right">{estJalonPratique(l.moduleId) ? "–" : v?.pages ?? "–"}</td><td className="text-right">{estJalonPratique(l.moduleId) ? "–" : v?.questions ?? "–"}</td></>; })()}
                <td className="text-right whitespace-nowrap">{formatDureeJalon(l.minutesCpf)}</td>
                <td className="text-right">{pct(l.poidsAffiche)}{l.obligatoireSansPoids ? " (obligatoire)" : ""}</td>
                <td className="text-right">{pct(l.progression)}</td>
                <td className="text-right">{l.contribution.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} pt de %</td>
                <td className="text-right whitespace-nowrap">{formatDureeJalon(l.minutesCouvertes)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr className="border-t font-semibold"><td colSpan={3}>TOTAL FORMATION</td><td className="text-right">{formatDureeJalon(tableau.totalMinutes)}</td><td className="text-right">100 %</td><td className="text-right">Taux global : {pct(tableau.taux)}</td><td className="text-right">{tableau.contributionBrute.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} pt de % (brut)</td><td className="text-right">{formatDureeJalon(tableau.minutesCouvertes)}</td></tr></tfoot>
        </table>
        <p className="mt-2 text-xs text-muted-foreground">{EXPLICATION_JALONS} Durée couverte = durée CPF × progression / 100 (arrondie à la minute pour l’affichage). Le total couvert est arrondi après addition. Le taux global n’est pas la somme des progressions ; le plafond interne existant reste inchangé. Examens blancs : {calcul.filiere === "vtc" || calcul.filiere === "taxi" ? "23h00" : "5h00"} ; présentiel : 6h00.</p>
        <p className="mt-2 text-xs font-medium">Heures réellement enregistrées (distinctes du prévisionnel) : en ligne {heures.enLigne == null ? "lecture non disponible" : formatDureeJalon(heures.enLigne)} · présence (signée ou validée par l’administration) {formatDureeJalon(heures.pratique)} · total {heures.total == null ? "lecture non disponible" : formatDureeJalon(heures.total)}. Aucune répartition d’heures réelles par module n’est déduite des connexions.</p>
        <p className="mt-1 text-xs text-muted-foreground">Questions recomptées sur le contenu actuel ; pages issues de l'audit (non recomptées automatiquement). Un module déjà « Terminé » reste à 100 % même si des questions ont été ajoutées depuis.</p>
        {calcul.limites.length > 0 && <ul className="mt-1 list-disc pl-4 text-xs text-muted-foreground">{calcul.limites.map((t) => <li key={t}>{t}</li>)}</ul>}
        </div>
      )}
      {afficherObjectifs && <ObjectifsJalonsSection parcours={key} moduleIds={r.lignes.map((line) => line.moduleId)} />}
    </div>
  );
}
