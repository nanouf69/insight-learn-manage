import { elearningHoursEvidence } from "@/lib/elearningHoursEvidence";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/supabase/fetch-all-rows";
import { getSessionEndMs, clampConnexionsToAccessEnd, getAccessCutoffMs } from "@/lib/reports/session-duration";
import { retirerCreneauxPratique } from "@/lib/reports/exclusionPratique";
import { fetchPratiqueSlotDetails } from "@/lib/pratiqueSlots";
import { chargerClassificationSignatures, signaturesRetenuesPourHeures } from "@/lib/signaturesManquantes";
import { computePresentielHours, presentielProgress } from "@/lib/presentielHours";
import { FORMATION_MODULES } from "@/components/cours-en-ligne/modules-config";
import { requiredElearningHours } from "@/lib/elearningRequiredHours";
import { learningSessionWindow, getLearningHoursStartMs } from "@/lib/reports/learning-hours-window";
import { regleSuiviFormation, chargerRatioSignatures, type RatioSignatures } from "@/lib/suiviFormationIndicateurs";


export interface TauxRealisation {
  modulesCompleted: number;
  modulesTotal: number;
  doneElearning: number;
  donePresentiel: number;
  /** Heures de présence validées manuellement par un admin (ajoutées aux heures signées) */
  heuresPresentielValidees: number;
  reqElearning: number;
  reqPresentiel: number;
  reqTotal: number;
  pctElearning: number;
  pctPresentiel: number;
  pctTotal: number;
  signatures?: RatioSignatures;
  totalParSignatures?: boolean;
  /** Date/heure de la PREMIÈRE activité pédagogique réelle (jamais une simple connexion) */
  premiereActiviteAt: string | null;
  /** Dernier jour de cours/exercice/quiz, plafonné à la fin d'accès */
  derniereActiviteAt: string | null;
}

const pct = (d: number, r: number) => (r > 0 ? Math.min(100, Math.round((d / r) * 100)) : 0);

/**
 * Calcule les taux de realisation (e-learning / presentiel / total)
 * avec EXACTEMENT la meme logique que le releve de connexions PDF.
 */
export function useApprenantTauxRealisation(apprenantId?: string, apprenantProp?: any) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!apprenantId) return;
    // Each effect owns its channel: admin + learner preview and StrictMode
    // can mount concurrently while a previous removal is still asynchronous.
    const channel = supabase.channel(`taux-presence-${apprenantId}-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "emargements_fc", filter: `apprenant_id=eq.${apprenantId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["apprenant-taux-realisation", apprenantId] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "session_apprenants", filter: `apprenant_id=eq.${apprenantId}` }, () => { queryClient.invalidateQueries({ queryKey: ["apprenant-taux-realisation", apprenantId] }); })
      .on("postgres_changes", { event: "*", schema: "public", table: "reservations_pratique", filter: `apprenant_id=eq.${apprenantId}` }, () => { queryClient.invalidateQueries({ queryKey: ["apprenant-taux-realisation", apprenantId] }); })
      .on("postgres_changes", { event: "*", schema: "public", table: "agenda_blocs" }, () => { queryClient.invalidateQueries({ queryKey: ["apprenant-taux-realisation", apprenantId] }); })
      .on("postgres_changes", { event: "*", schema: "public", table: "planning_pratique_config" }, () => { queryClient.invalidateQueries({ queryKey: ["apprenant-taux-realisation", apprenantId] }); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [apprenantId, queryClient]);
  return useQuery<TauxRealisation | null>({
    queryKey: ["apprenant-taux-realisation", apprenantId, apprenantProp?.type_apprenant ?? null, apprenantProp?.formation_choisie ?? null, apprenantProp?.heures_elearning ?? null, apprenantProp?.heures_presentiel ?? null, apprenantProp?.heures_totales ?? null],
    enabled: !!apprenantId,
    // La fiche Admin doit refléter l'état réel courant, pas un cache de 5 minutes
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
    queryFn: async () => {
      if (!apprenantId) return null;

      // Toujours relire les heures contractuelles en base : le prop peut ne pas
      // encore etre charge au premier rendu (sinon taux calcules sur 0h).
      const { data: apprenantRow, error: apprenantError } = await supabase
        .from("apprenants")
        .select("heures_elearning, heures_presentiel, heures_totales, type_apprenant, formation_choisie, date_debut_formation, date_fin_cours_en_ligne, date_fin_formation")
        .eq("id", apprenantId)
        .maybeSingle();
      const apprenant = { ...(apprenantProp || {}), ...(apprenantRow || {}) } as any;
      if (apprenantError || !apprenantRow) throw apprenantError ?? new Error("Formation indisponible");
      const regle = regleSuiviFormation(apprenant);
      const signatures = regle.presentiel && regle.filiere
        ? await chargerRatioSignatures(apprenantId, regle.filiere).catch(() => ({ signees: 0, attendues: 0, taux: null, raison: "Signatures / planning indisponibles : lecture échouée" }))
        : undefined;

      const [acts, quizzes, exos, cnxAll, emargAll, pratiqueDetails, completions, heuresValideesRows, apprenantTypeRow, classification] = await Promise.all([
        fetchAllRows<any>((from, to) => supabase
          .from("apprenant_module_activites")
          .select("module_nom, action_type, occurred_at")
          .eq("apprenant_id", apprenantId)
          .range(from, to)),
        fetchAllRows<any>((from, to) => supabase
          .from("apprenant_quiz_results")
          .select("completed_at")
          .eq("apprenant_id", apprenantId)
          .range(from, to)),
        fetchAllRows<any>((from, to) => supabase
          .from("reponses_apprenants")
          .select("updated_at")
          .eq("apprenant_id", apprenantId)
          .eq("completed", true)
          .range(from, to)),
        fetchAllRows<any>((from, to) => supabase
          .from("apprenant_connexions")
          .select("started_at, ended_at, last_seen_at, last_action_at, current_module")
          .eq("apprenant_id", apprenantId)
          .range(from, to)),
        fetchAllRows<any>((from, to) => supabase
          .from("emargements_fc" as any)
          .select("date_emargement, demi_journee, absent, signature_data_url").filter("masque", "eq", false)
          .eq("apprenant_id", apprenantId)
          .range(from, to)),
        fetchPratiqueSlotDetails(apprenantId),
        fetchAllRows<any>((from, to) => supabase
          .from("apprenant_module_completion")
          .select("module_id")
          .eq("apprenant_id", apprenantId)
          .eq("status", "completed")
          .range(from, to)),
        fetchAllRows<any>((from, to) => supabase
          .from("presentiel_heures_validees" as any)
          .select("id, heures, created_at")
          .eq("apprenant_id", apprenantId)
          .range(from, to)), // erreur propagée : taux indisponible, jamais un faux 0 h
        supabase
          .from("apprenants")
          .select("type_apprenant, formation_choisie")
          .eq("id", apprenantId)
          .maybeSingle()
          .then((r) => r.data, () => null),
        chargerClassificationSignatures(apprenantId),
      ]);

      const { onlineMin, premiereActiviteAt, derniereActiviteAt } = elearningHoursEvidence({
        apprenantId, apprenant, acts, quizzes, exos, cnxAll,
        pratiqueDates: pratiqueDetails.map(p => p.date),
      });

      // ---- Presentiel : les feuilles d'emargement font foi (theorie ET pratique)
      const { theorieHours, pratiqueMinutes } = computePresentielHours(signaturesRetenuesPourHeures(emargAll as any[], classification), pratiqueDetails as any[]);

      // Heures validées manuellement par un admin : elles S'AJOUTENT aux heures
      // signées, sans jamais modifier ni remplacer les émargements existants.
      const heuresPresentielValidees = (heuresValideesRows as any[])
        .reduce((sum, r) => sum + (Number(r?.heures) || 0), 0);

      const reqElearning = requiredElearningHours(apprenant);
      const presence = presentielProgress(theorieHours + pratiqueMinutes / 60, Number(apprenant?.heures_presentiel) || 0, pratiqueDetails);
      const reqPresentiel = regle.heures ?? presence.required;
      const reqTotal = regle.heures ?? (Number(apprenant?.heures_totales) || reqElearning + reqPresentiel);

      // Actual proven time is never capped at the contractual target.
      const doneElearning = onlineMin / 60;
      const donePresentiel = presence.done + heuresPresentielValidees;

      // ---- Jalons (modules terminés) : status='completed' fait foi, jamais completed_at seul
      const ta = String((apprenantTypeRow as any)?.type_apprenant || (apprenantProp as any)?.type_apprenant || "").toLowerCase().trim();
      const fc = String((apprenantTypeRow as any)?.formation_choisie || (apprenantProp as any)?.formation_choisie || "").toLowerCase().trim();
      const pathModules = (FORMATION_MODULES[ta] || FORMATION_MODULES[fc])?.modules || [];
      const pathIds = new Set(pathModules.map((m) => m.id));
      const completedIds = new Set((completions as any[]).map((r: any) => Number(r.module_id)));
      const modulesCompleted = pathIds.size > 0
        ? [...completedIds].filter((id) => pathIds.has(id)).length
        : completedIds.size;
      const modulesTotal = pathIds.size > 0 ? pathIds.size : completedIds.size;

      return {
        modulesCompleted,
        modulesTotal,
        doneElearning,
        donePresentiel,
        heuresPresentielValidees,
        reqElearning,
        reqPresentiel,
        reqTotal,
        pctElearning: pct(doneElearning, reqElearning),
        pctPresentiel: pct(donePresentiel, reqPresentiel),
        pctTotal: regle.presentiel ? signatures?.taux ?? 0 : pct(doneElearning + donePresentiel, reqTotal),
        signatures,
        totalParSignatures: regle.presentiel,
        premiereActiviteAt,
        derniereActiviteAt,
      };
    },
  });
}
