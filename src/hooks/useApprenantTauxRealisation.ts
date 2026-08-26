import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/supabase/fetch-all-rows";
import { getSessionEndMs, clampConnexionsToAccessEnd } from "@/lib/reports/session-duration";
import { fetchPratiqueSlotDetails, pratiqueSlotDetailsToMinutes } from "@/lib/pratiqueSlots";

export interface TauxRealisation {
  doneElearning: number;
  donePresentiel: number;
  reqElearning: number;
  reqPresentiel: number;
  reqTotal: number;
  pctElearning: number;
  pctPresentiel: number;
  pctTotal: number;
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

      const [acts, quizzes, exos, cnxAll, emargAll, pratiqueDetails] = await Promise.all([
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
          .select("started_at, ended_at, last_seen_at, last_action_at")
          .eq("apprenant_id", apprenantId)
          .range(from, to)).catch(() => [] as any[]),
        fetchAllRows<any>((from, to) => supabase
          .from("emargements_fc" as any)
          .select("date_emargement, demi_journee, absent")
          .eq("apprenant_id", apprenantId)
          .range(from, to)).catch(() => [] as any[]),
        fetchPratiqueSlotDetails(apprenantId).catch(() => []),
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

      // ---- Presentiel theorie (emargements FC)
      const byDate = new Map<string, Set<string>>();
      for (const r of emargAll as any[]) {
        if (r.absent) continue;
        const date = String(r.date_emargement || "").slice(0, 10);
        const slot = String(r.demi_journee || "").trim().toLowerCase();
        if (!date || !slot) continue;
        if (!byDate.has(date)) byDate.set(date, new Set());
        byDate.get(date)!.add(slot);
      }
      let theorieHours = 0;
      for (const slots of byDate.values()) {
        const evening = slots.has("soir") || slots.has("soir_1") || slots.has("soir_2");
        if (evening) {
          theorieHours += Math.min(
            (slots.has("soir") ? 4 : 0) + (slots.has("soir_1") ? 1.5 : 0) + (slots.has("soir_2") ? 2.5 : 0),
            4,
          );
        } else {
          theorieHours += Math.min((slots.has("matin") ? 3 : 0) + (slots.has("apres_midi") ? 3 : 0), 6);
        }
      }

      // ---- Pratique (présentiel) : le planning et son créneau réel font foi.
      const pratiqueMinutes = pratiqueSlotDetailsToMinutes(pratiqueDetails);

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

      return {
        doneElearning,
        donePresentiel,
        reqElearning,
        reqPresentiel,
        reqTotal,
        pctElearning: pct(doneElearning, reqElearning),
        pctPresentiel: pct(donePresentiel, reqPresentiel),
        pctTotal: pct(doneElearning + donePresentiel, reqTotal),
      };
    },
  });
}
