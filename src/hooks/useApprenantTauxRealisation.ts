import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/supabase/fetch-all-rows";
import { getSessionEndMs, clampConnexionsToAccessEnd } from "@/lib/reports/session-duration";
import { fetchPratiqueSlotDetails } from "@/lib/pratiqueSlots";
import { computePresentielHours } from "@/lib/presentielHours";
import { FORMATION_MODULES } from "@/components/cours-en-ligne/modules-config";


export interface TauxRealisation {
  modulesCompleted: number;
  modulesTotal: number;
  doneElearning: number;
  donePresentiel: number;
  reqElearning: number;
  reqPresentiel: number;
  reqTotal: number;
  pctElearning: number;
  pctPresentiel: number;
  pctTotal: number;
  /** Date/heure de la PREMIÈRE activité pédagogique réelle (jamais une simple connexion) */
  premiereActiviteAt: string | null;
}

const pct = (d: number, r: number) => (r > 0 ? Math.min(100, Math.round((d / r) * 100)) : 0);

/**
 * Calcule les taux de realisation (e-learning / presentiel / total)
 * avec EXACTEMENT la meme logique que le releve de connexions PDF.
 */
export function useApprenantTauxRealisation(apprenantId?: string, apprenantProp?: any) {
  return useQuery<TauxRealisation | null>({
    queryKey: ["apprenant-taux-realisation", apprenantId],
    enabled: !!apprenantId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!apprenantId) return null;

      // Toujours relire les heures contractuelles en base : le prop peut ne pas
      // encore etre charge au premier rendu (sinon taux calcules sur 0h).
      const { data: apprenantRow } = await supabase
        .from("apprenants")
        .select("heures_elearning, heures_presentiel, heures_totales, date_fin_cours_en_ligne, date_fin_formation")
        .eq("id", apprenantId)
        .maybeSingle();
      const apprenant = { ...(apprenantProp || {}), ...(apprenantRow || {}) } as any;

      const [acts, quizzes, exos, cnxAll, emargAll, pratiqueDetails, completions, apprenantTypeRow] = await Promise.all([
        fetchAllRows<any>((from, to) => supabase
          .from("apprenant_module_activites")
          .select("module_nom, action_type, occurred_at")
          .eq("apprenant_id", apprenantId)
          .range(from, to)).catch(() => [] as any[]),
        fetchAllRows<any>((from, to) => supabase
          .from("apprenant_quiz_results")
          .select("completed_at")
          .eq("apprenant_id", apprenantId)
          .range(from, to)).catch(() => [] as any[]),
        fetchAllRows<any>((from, to) => supabase
          .from("reponses_apprenants")
          .select("updated_at")
          .eq("apprenant_id", apprenantId)
          .eq("completed", true)
          .range(from, to)).catch(() => [] as any[]),
        fetchAllRows<any>((from, to) => supabase
          .from("apprenant_connexions")
          .select("started_at, ended_at, last_seen_at, last_action_at, current_module")
          .eq("apprenant_id", apprenantId)
          .range(from, to)).catch(() => [] as any[]),
        fetchAllRows<any>((from, to) => supabase
          .from("emargements_fc" as any)
          .select("date_emargement, demi_journee, absent")
          .eq("apprenant_id", apprenantId)
          .range(from, to)).catch(() => [] as any[]),
        fetchPratiqueSlotDetails(apprenantId).catch(() => []),
        fetchAllRows<any>((from, to) => supabase
          .from("apprenant_module_completion")
          .select("module_id")
          .eq("apprenant_id", apprenantId)
          .eq("status", "completed")
          .range(from, to)).catch(() => [] as any[]),
        supabase
          .from("apprenants")
          .select("type_apprenant, formation_choisie")
          .eq("id", apprenantId)
          .maybeSingle()
          .then((r) => r.data, () => null),
      ]);

      const cnxRows = clampConnexionsToAccessEnd(
        cnxAll as any[],
        apprenant?.date_fin_cours_en_ligne || apprenant?.date_fin_formation,
      );

      // ---- E-learning (identique au Rapport d'activite / releve)
      const isAccueil = (nom?: string | null) => !!nom && /accueil|liste\s+des\s+modules/i.test(nom);
      const pedagogicalActTs = [
        ...acts
          .filter((a: any) =>
            (a.action_type === "open_module" || a.action_type === "open_section" || a.action_type === "open_cours") &&
            !isAccueil(a.module_nom))
          .map((a: any) => Date.parse(a.occurred_at)),
        ...exos.map((e: any) => Date.parse(e.updated_at)),
        ...quizzes.map((q: any) => Date.parse(q.completed_at)),
      ].filter((t: number) => !Number.isNaN(t)).sort((a: number, b: number) => a - b);

      const hasActivityInWindow = (start: number, end: number): boolean => {
        let lo = 0, hi = pedagogicalActTs.length - 1;
        while (lo <= hi) {
          const mid = (lo + hi) >> 1;
          const v = pedagogicalActTs[mid];
          if (v < start) lo = mid + 1;
          else if (v > end) hi = mid - 1;
          else return true;
        }
        return false;
      };

      // Début = uniquement l'ouverture d'un module ou la réalisation d'un
      // exercice/quiz. Une simple connexion ou un émargement ne compte pas.
      const isPedagogicalModule = (nom?: string | null) =>
        !!nom && !isAccueil(nom) && !/^syst[eè]me$/i.test(nom.trim());
      const firstPedagogicalConnectionStart = (cnxRows as any[])
        .map((c: any) => {
          const start = Date.parse(c.started_at);
          if (Number.isNaN(start)) return null;
          const end = getSessionEndMs(c as any);
          const qualifies = isPedagogicalModule(c.current_module) || hasActivityInWindow(start, end);
          return qualifies ? start : null;
        })
        .filter((value: number | null): value is number => value !== null)
        .sort((a: number, b: number) => a - b)[0];
      const firstActualActivityStart = firstPedagogicalConnectionStart !== undefined
        ? firstPedagogicalConnectionStart
        : pedagogicalActTs[0];


      let onlineMin = 0;
      for (const c of cnxRows as any[]) {
        const s = c.started_at;
        const e = c.ended_at || c.last_seen_at;
        if (!s || !e) continue;
        const startMs = new Date(s).getTime();
        if (!isFinite(startMs)) continue;
        const endMs = getSessionEndMs(c as any);
        const ms = endMs - startMs;
        if (ms <= 0) continue;
        if (!hasActivityInWindow(startMs, endMs)) continue;
        onlineMin += Math.floor(ms / 60000);
      }

      // ---- Presentiel : les feuilles d'emargement font foi (theorie ET pratique)
      const { theorieHours, pratiqueMinutes } = computePresentielHours(emargAll as any[], pratiqueDetails as any[]);


      const reqElearning =
        Number(apprenant?.heures_elearning) ||
        Math.max(0, (Number(apprenant?.heures_totales) || 0) - (Number(apprenant?.heures_presentiel) || 0));
      const reqPresentiel = Number(apprenant?.heures_presentiel) || 0;
      const reqTotal = Number(apprenant?.heures_totales) || reqElearning + reqPresentiel;

      const doneElearning = Math.min(
        onlineMin / 60,
        reqElearning > 0 ? reqElearning : Number.MAX_SAFE_INTEGER,
      );
      const donePresentiel = Math.min(
        theorieHours + pratiqueMinutes / 60,
        reqPresentiel > 0 ? reqPresentiel : 0,
      );

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
        reqElearning,
        reqPresentiel,
        reqTotal,
        pctElearning: pct(doneElearning, reqElearning),
        pctPresentiel: pct(donePresentiel, reqPresentiel),
        pctTotal: pct(doneElearning + donePresentiel, reqTotal),
        premiereActiviteAt: firstActualActivityStart !== undefined
          ? new Date(firstActualActivityStart).toISOString()
          : pedagogicalActTs.length > 0
            ? new Date(pedagogicalActTs[0]).toISOString()
            : null,
      };
    },
  });
}
