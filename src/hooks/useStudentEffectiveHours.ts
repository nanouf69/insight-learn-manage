import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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

const MAX_SESSION_MS = 7 * 60 * 60 * 1000;

export const HEURES_REQUISES: Record<string, number> = {
  "vtc-e": 60,
  "taxi-e": 90,
  "continue-vtc": 14,
  "ta-e": 35,
  "va-e": 7,
};

async function fetchAll<T>(builder: () => any): Promise<T[]> {
  const PAGE = 1000;
  let from = 0;
  let all: T[] = [];
  while (true) {
    const { data, error } = await builder().range(from, from + PAGE - 1);
    if (error) throw error;
    const batch = (data as T[]) || [];
    all = all.concat(batch);
    if (batch.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

function formatHM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h${m.toString().padStart(2, "0")}`;
}

// Parse YYYY-MM-DD as local date (no UTC shift) → returns ms
function parseDateBound(value: string | null | undefined, endOfDay = false): number | null {
  if (!value) return null;
  const s = value.slice(0, 10);
  const [y, m, d] = s.split("-").map(n => parseInt(n, 10));
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  return dt.getTime();
}

interface UseStudentEffectiveHoursOptions {
  dateDebutFormation?: string | null;
  dateFinFormation?: string | null;
  dateDebutCoursEnLigne?: string | null;
  dateFinCoursEnLigne?: string | null;
}

export function useStudentEffectiveHours(
  apprenantId: string | null | undefined,
  typeApprenant: string | null | undefined,
  options: UseStudentEffectiveHoursOptions = {},
) {
  const [loading, setLoading] = useState(true);
  const [connexions, setConnexions] = useState<ConnexionRow[]>([]);
  const [activites, setActivites] = useState<ActivityTs[]>([]);

  useEffect(() => {
    if (!apprenantId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const [conns, mods, exos, quizz] = await Promise.all([
          fetchAll<ConnexionRow>(() =>
            supabase
              .from("apprenant_connexions" as any)
              .select("apprenant_id, started_at, ended_at, last_seen_at")
              .eq("apprenant_id", apprenantId)
              .order("started_at", { ascending: false })
          ),
          fetchAll<{ apprenant_id: string; occurred_at: string }>(() =>
            supabase
              .from("apprenant_module_activites" as any)
              .select("apprenant_id, occurred_at")
              .eq("apprenant_id", apprenantId)
              .order("occurred_at", { ascending: false })
          ),
          fetchAll<{ apprenant_id: string; updated_at: string }>(() =>
            supabase
              .from("reponses_apprenants")
              .select("apprenant_id, updated_at")
              .eq("apprenant_id", apprenantId)
              .eq("completed", true)
              .order("updated_at", { ascending: false })
          ),
          fetchAll<{ apprenant_id: string; completed_at: string }>(() =>
            supabase
              .from("apprenant_quiz_results" as any)
              .select("apprenant_id, completed_at")
              .eq("apprenant_id", apprenantId)
              .order("completed_at", { ascending: false })
          ),
        ]);

        if (cancelled) return;

        setConnexions(conns);

        const merged: ActivityTs[] = [
          ...mods.map(m => ({ apprenant_id: m.apprenant_id, ts: m.occurred_at })),
          ...exos.map(e => ({ apprenant_id: e.apprenant_id, ts: e.updated_at })),
          ...quizz.map(q => ({ apprenant_id: q.apprenant_id, ts: q.completed_at })),
        ].filter(a => a.ts);
        setActivites(merged);
      } catch (err) {
        console.error("[useStudentEffectiveHours] load error", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [apprenantId]);

  const actTimestamps = useMemo(() => {
    const arr = activites
      .map(a => Date.parse(a.ts))
      .filter(t => !Number.isNaN(t))
      .sort((a, b) => a - b);
    return arr;
  }, [activites]);

  // Bornes de la formation (priorité dates de formation, fallback cours en ligne)
  const windowStart = useMemo(
    () =>
      parseDateBound(options.dateDebutFormation, false) ??
      parseDateBound(options.dateDebutCoursEnLigne, false),
    [options.dateDebutFormation, options.dateDebutCoursEnLigne],
  );
  const windowEnd = useMemo(
    () =>
      parseDateBound(options.dateFinFormation, true) ??
      parseDateBound(options.dateFinCoursEnLigne, true),
    [options.dateFinFormation, options.dateFinCoursEnLigne],
  );

  const totalMinutes = useMemo(() => {
    if (connexions.length === 0) return 0;
    let total = 0;
    for (const c of connexions) {
      const startRaw = Date.parse(c.started_at);
      if (Number.isNaN(startRaw)) continue;
      const rawEnd = c.ended_at ? Date.parse(c.ended_at) : Date.parse(c.last_seen_at);
      const endRaw = Number.isNaN(rawEnd) ? startRaw : Math.min(rawEnd, startRaw + MAX_SESSION_MS);

      // Clipper la fenêtre à la période de formation si définie
      const start = windowStart != null ? Math.max(startRaw, windowStart) : startRaw;
      const end = windowEnd != null ? Math.min(endRaw, windowEnd) : endRaw;
      if (end <= start) continue;

      total += Math.max(0, Math.round((end - start) / 60000));
    }
    return total;
  }, [connexions, windowStart, windowEnd]);

  const requis = HEURES_REQUISES[(typeApprenant || "").toLowerCase()] ?? 0;
  const faitHeures = totalMinutes / 60;
  const restantHeures = Math.max(0, requis - faitHeures);
  const pct = requis > 0 ? Math.min(100, (faitHeures / requis) * 100) : 0;

  return {
    loading,
    totalMinutes,
    requis,
    faitHeures,
    restantHeures,
    pct,
    formattedDone: formatHM(totalMinutes),
    formattedRemaining: formatHM(Math.round(restantHeures * 60)),
  };
}
