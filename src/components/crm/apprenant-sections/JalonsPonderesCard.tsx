import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { FORMATION_MODULES, MODULE_NAME_BY_ID } from "@/components/cours-en-ligne/modules-config";
import { arrondirPoidsAffichage, INTRO_IDS, MODULES_FILIERE, calculerJalonsPonderes, calculerPoids, filiereDuParcours } from "@/lib/jalonsPonderes";
import { construireVolumes } from "@/lib/jalonsVolumes";
import { ecouterContenuModifie } from "@/lib/contenuModifie";

export const JALONS_VOLUMES_KEY = "jalons-volumes";

/** Carte interne ADMIN : taux indicatif pondéré. Lecture seule. */
export function JalonsPonderesCard({ apprenantId, typeApprenant, formationChoisie }: { apprenantId: string; typeApprenant?: string | null; formationChoisie?: string | null }) {
  const [open, setOpen] = useState(false);
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
  const ta = String(typeApprenant ?? "").toLowerCase().trim();
  const fc = String(formationChoisie ?? "").toLowerCase().trim();
  const key = FORMATION_MODULES[ta] ? ta : FORMATION_MODULES[fc] ? fc : null;
  const filiere = filiereDuParcours(key);
  const { data: rows, isError } = useQuery({
    queryKey: ["jalons-ponderes", apprenantId, userId],
    enabled: !!isAdmin && !!filiere,
    queryFn: async () => {
      const { data, error } = await supabase.from("apprenant_module_completion").select("module_id, status, progress").eq("apprenant_id", apprenantId);
      if (error) throw error;
      return data ?? [];
    },
  });
  const parcours = key ? FORMATION_MODULES[key].modules.map((m) => m.id) : [];
  const queryClient = useQueryClient();
  // Poids recalculés depuis le contenu ACTUEL (questions) à chaque affichage, retour d'onglet et enregistrement éditeur.
  const { data: volumes, isError: volErr, isFetching: volFetching } = useQuery({
    queryKey: [JALONS_VOLUMES_KEY, filiere, parcours.join(","), ta, userId],
    enabled: !!isAdmin && !!filiere,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
    refetchInterval: 5 * 60 * 1000, // filet de sécurité si un événement en direct est manqué
    queryFn: async () => {
      const ids = [...new Set([...MODULES_FILIERE[filiere!].filter((x) => x > 0), ...parcours.filter((x) => INTRO_IDS.has(x)), 26, 32, 34])];
      const [{ data, error }, mdv, { fetchLiveExamens }] = await Promise.all([
        supabase.from("module_editor_state").select("module_id, module_data, deleted_exercices").in("module_id", ids),
        import("@/components/cours-en-ligne/ModuleDetailView"),
        import("@/components/cours-en-ligne/useLiveExamens"),
      ]);
      if (error) throw error;
      const examens = await fetchLiveExamens();
      const v = construireVolumes(filiere!, parcours, (data ?? []) as any, (id) => mdv.getInitialModuleContentForVolume(id, typeApprenant), examens as any);
      return { ...v, poids: calculerPoids(filiere!, v.volumes) };
    },
  });
  useEffect(() => {
    if (!isAdmin || !filiere) return;
    const ch = supabase.channel(`jalons-volumes-${apprenantId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "module_editor_state" }, () => {
        void queryClient.invalidateQueries({ queryKey: [JALONS_VOLUMES_KEY] });
      })
      .subscribe();
    const stop = ecouterContenuModifie(() => { void queryClient.invalidateQueries({ queryKey: [JALONS_VOLUMES_KEY] }); });
    return () => { stop(); void supabase.removeChannel(ch); };
  }, [isAdmin, filiere, apprenantId, queryClient]);
  if (!isAdmin || !filiere || !key) return null;
  if (isError || volErr) return <div className="mt-2 rounded-md border bg-card px-3 py-2 text-xs text-muted-foreground">Jalons pondérés : données indisponibles (aucun pourcentage de repli affiché).</div>;
  // Pendant un recalcul, aucun ancien pourcentage n'est affiché.
  if (!rows || !volumes || volFetching) return <div className="mt-2 rounded-md border bg-card px-3 py-2 text-xs text-muted-foreground">Jalons pondérés : calcul en cours…</div>;
  const r = calculerJalonsPonderes(filiere, parcours, rows as any, volumes.poids);
  const ponderees = r.lignes.map((l, i) => [l.poids, i] as const).filter(([p]) => p > 0);
  const arrondis = arrondirPoidsAffichage(ponderees.map(([p]) => p));
  const poidsAffiche = new Map(ponderees.map(([, i], k) => [i, arrondis[k]]));
  const finIncomplete = r.taux < 100 && r.lignes.every((l) => l.obligatoireSansPoids || l.valide);
  return (
    <div className="mt-2 w-full rounded-md border bg-card px-3 py-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">Jalons pondérés (indicatif interne)</span>
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
        <div className="mt-2 overflow-x-auto"><table className="w-full min-w-[22rem] text-xs">
          <thead><tr className="text-muted-foreground text-left"><th>Module</th><th className="text-right">Pages</th><th className="text-right">Questions</th><th className="text-right">Poids</th><th className="text-right">Progression</th><th className="text-right">Contribution</th></tr></thead>
          <tbody>
            {r.lignes.map((l, i) => (
              <tr key={l.moduleId} className="border-t">
                <td>{l.moduleId ? `${l.moduleId} · ${MODULE_NAME_BY_ID[l.moduleId] ?? ""}` : "Introduction (non attribuée)"}</td>
                {(() => { const v = Object.values(volumes.volumes).find((x) => x.moduleId === l.moduleId); return <><td className="text-right">{v?.pages ?? "–"}</td><td className="text-right">{v?.questions ?? "–"}</td></>; })()}
                <td className="text-right">{l.obligatoireSansPoids ? "0 (obligatoire)" : (poidsAffiche.get(i) ?? 0).toLocaleString("fr-FR")}</td>
                <td className="text-right">{Math.round(l.progression)}%</td>
                <td className="text-right">{l.contribution.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-muted-foreground">Poids = (4 × pages + questions actives) / total de la filière. Questions recomptées sur le contenu actuel ; pages issues de l'audit (non recomptées automatiquement). Un module déjà « Terminé » reste à 100 % même si des questions ont été ajoutées depuis.</p>
        {volumes.limites.length > 0 && <ul className="mt-1 list-disc pl-4 text-xs text-muted-foreground">{volumes.limites.map((t) => <li key={t}>{t}</li>)}</ul>}
        </div>
      )}
    </div>
  );
}
