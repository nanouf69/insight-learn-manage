import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Search, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { differenceInMinutes, parseISO } from "date-fns";

// Heures e-learning requises par type d'apprenant
const HEURES_REQUISES: Record<string, number> = {
  "vtc-e": 60,
  "taxi-e": 90,
  "continue-vtc": 14,
  "ta-e": 35,
  "va-e": 7,
};

const ELEARNING_TYPES = Object.keys(HEURES_REQUISES);
const MAX_SESSION_MS = 7 * 60 * 60 * 1000;

interface Apprenant {
  id: string;
  nom: string;
  prenom: string;
  email: string | null;
  type_apprenant: string;
  date_debut_formation: string | null;
  date_fin_formation: string | null;
  date_debut_cours_en_ligne: string | null;
  date_fin_cours_en_ligne: string | null;
}
interface Connexion {
  apprenant_id: string;
  started_at: string;
  ended_at: string | null;
  last_seen_at: string;
}
interface ActivityTs {
  apprenant_id: string;
  ts: string;
}

// Parse YYYY-MM-DD as local date (no UTC shift)
function parseDateBound(value: string | null | undefined, endOfDay = false): number | null {
  if (!value) return null;
  const s = value.slice(0, 10);
  const [y, m, d] = s.split("-").map(n => parseInt(n, 10));
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  return dt.getTime();
}

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

export default function SuiviHeuresElearning() {
  const [loading, setLoading] = useState(true);
  const [apprenants, setApprenants] = useState<Apprenant[]>([]);
  const [connexions, setConnexions] = useState<Connexion[]>([]);
  const [activites, setActivites] = useState<ActivityTs[]>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // 1) Tous les apprenants (tous types) ayant un compte
        const apps = await fetchAll<Apprenant>(() =>
          supabase
            .from("apprenants")
            .select("id, nom, prenom, email, type_apprenant, date_debut_formation, date_fin_formation, date_debut_cours_en_ligne, date_fin_cours_en_ligne")
            .not("auth_user_id", "is", null)
            .order("nom"),
        );
        setApprenants(apps);

        const ids = new Set(apps.map(a => a.id));

        // 2) Connexions de tous les apprenants e-learning
        const conns = await fetchAll<Connexion>(() =>
          supabase
            .from("apprenant_connexions" as any)
            .select("apprenant_id, started_at, ended_at, last_seen_at")
            .in("apprenant_id", Array.from(ids))
            .order("started_at", { ascending: false }),
        );
        setConnexions(conns.filter(c => ids.has(c.apprenant_id)));

        // 3) Activités module + exercices complétés + quiz (timestamps uniquement)
        const [mods, exos, quizz] = await Promise.all([
          fetchAll<{ apprenant_id: string; occurred_at: string }>(() =>
            supabase
              .from("apprenant_module_activites" as any)
              .select("apprenant_id, occurred_at")
              .in("apprenant_id", Array.from(ids))
              .order("occurred_at", { ascending: false }),
          ),
          fetchAll<{ apprenant_id: string; updated_at: string }>(() =>
            supabase
              .from("reponses_apprenants")
              .select("apprenant_id, updated_at")
              .eq("completed", true)
              .in("apprenant_id", Array.from(ids))
              .order("updated_at", { ascending: false }),
          ),
          fetchAll<{ apprenant_id: string; completed_at: string }>(() =>
            supabase
              .from("apprenant_quiz_results")
              .select("apprenant_id, completed_at")
              .in("apprenant_id", Array.from(ids))
              .order("completed_at", { ascending: false }),
          ),
        ]);

        const merged: ActivityTs[] = [
          ...mods.map(m => ({ apprenant_id: m.apprenant_id, ts: m.occurred_at })),
          ...exos.map(e => ({ apprenant_id: e.apprenant_id, ts: e.updated_at })),
          ...quizz.map(q => ({ apprenant_id: q.apprenant_id, ts: q.completed_at })),
        ].filter(a => a.ts);
        setActivites(merged);
      } catch (err) {
        console.error("[SuiviHeuresElearning] load error", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Index : activité par apprenant (timestamps ms triés)
  const actByApp = useMemo(() => {
    const m = new Map<string, number[]>();
    for (const a of activites) {
      const t = Date.parse(a.ts);
      if (Number.isNaN(t)) continue;
      const arr = m.get(a.apprenant_id) || [];
      arr.push(t);
      m.set(a.apprenant_id, arr);
    }
    for (const arr of m.values()) arr.sort((a, b) => a - b);
    return m;
  }, [activites]);

  // Index : connexions par apprenant
  const connByApp = useMemo(() => {
    const m = new Map<string, Connexion[]>();
    for (const c of connexions) {
      const arr = m.get(c.apprenant_id) || [];
      arr.push(c);
      m.set(c.apprenant_id, arr);
    }
    return m;
  }, [connexions]);

  // Bornes formation par apprenant (priorité dates_formation, fallback cours_en_ligne)
  const windowByApp = useMemo(() => {
    const m = new Map<string, { start: number | null; end: number | null }>();
    for (const a of apprenants) {
      const start =
        parseDateBound(a.date_debut_formation, false) ??
        parseDateBound(a.date_debut_cours_en_ligne, false);
      const end =
        parseDateBound(a.date_fin_formation, true) ??
        parseDateBound(a.date_fin_cours_en_ligne, true);
      m.set(a.id, { start, end });
    }
    return m;
  }, [apprenants]);

  // Calcul du temps de connexion EFFECTIF (seulement quand un module/exercice/quiz a été ouvert,
  // et uniquement dans la plage de formation de l'apprenant)
  const heuresByApp = useMemo(() => {
    const result = new Map<string, number>(); // minutes
    for (const [appId, conns] of connByApp.entries()) {
      const acts = actByApp.get(appId) || [];
      if (acts.length === 0) {
        result.set(appId, 0);
        continue;
      }
      const win = windowByApp.get(appId) || { start: null, end: null };
      let total = 0;
      for (const c of conns) {
        const startRaw = Date.parse(c.started_at);
        const rawEnd = c.ended_at ? Date.parse(c.ended_at) : Date.parse(c.last_seen_at);
        const cappedEnd = Math.min(rawEnd, startRaw + MAX_SESSION_MS);

        // Clipper à la plage formation
        const start = win.start != null ? Math.max(startRaw, win.start) : startRaw;
        const end = win.end != null ? Math.min(cappedEnd, win.end) : cappedEnd;
        if (end <= start) continue;

        // recherche binaire : existe-t-il une activité dans [start, end] ?
        let lo = 0, hi = acts.length - 1, found = false;
        while (lo <= hi) {
          const mid = (lo + hi) >> 1;
          const v = acts[mid];
          if (v < start) lo = mid + 1;
          else if (v > end) hi = mid - 1;
          else { found = true; break; }
        }
        if (found) {
          total += Math.max(0, Math.round((end - start) / 60000));
        }
      }
      result.set(appId, total);
    }
    return result;
  }, [connByApp, actByApp, windowByApp]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return apprenants
      .filter(a => filterType === "all" || a.type_apprenant === filterType)
      .filter(a => {
        if (!q) return true;
        return (
          a.nom.toLowerCase().includes(q) ||
          a.prenom.toLowerCase().includes(q) ||
          (a.email || "").toLowerCase().includes(q)
        );
      })
      .map(a => {
        const requis = HEURES_REQUISES[a.type_apprenant] ?? 0;
        const fait = (heuresByApp.get(a.id) || 0) / 60;
        const restant = Math.max(0, requis - fait);
        const pct = requis > 0 ? Math.min(100, (fait / requis) * 100) : 0;
        return { ...a, requis, faitMin: heuresByApp.get(a.id) || 0, fait, restant, pct };
      })
      .sort((a, b) => a.restant === b.restant ? a.nom.localeCompare(b.nom) : b.restant - a.restant);
  }, [apprenants, heuresByApp, search, filterType]);

  const totals = useMemo(() => {
    const totalApps = rows.length;
    const done = rows.filter(r => r.restant === 0 && r.requis > 0).length;
    const enRetard = rows.filter(r => r.pct < 50 && r.requis > 0).length;
    return { totalApps, done, enRetard };
  }, [rows]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-amber-50 p-4 dark:bg-amber-950/20">
        <h2 className="text-2xl font-bold">Suivi heures e-learning</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Le compteur d'heures ne démarre <strong>qu'à partir du moment où l'apprenant a commencé ou fait un module, un exercice ou un quiz</strong> — c'est cette action pédagogique qui déclenche le décompte. Le temps est ensuite comptabilisé <strong>uniquement à l'intérieur de la plage de dates de sa formation</strong>. Les simples connexions (sans ouverture de module, exercice ou quiz) ou les connexions hors période ne sont jamais comptées.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Apprenants e-learning</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{totals.totalApps}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-600"/>Heures terminées</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{totals.done}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-orange-500"/>Moins de 50%</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-orange-600">{totals.enRetard}</div></CardContent></Card>
      </div>

      <div className="flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Rechercher un apprenant…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select
          className="border rounded-md px-3 py-2 text-sm bg-background"
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
        >
          <option value="all">Tous les types</option>
          {ELEARNING_TYPES.map(t => <option key={t} value={t}>{t.toUpperCase()} ({HEURES_REQUISES[t]}h)</option>)}
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Calcul des heures…
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Apprenant</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Heures faites</TableHead>
                  <TableHead className="text-right">Requis</TableHead>
                  <TableHead className="text-right">Restant</TableHead>
                  <TableHead className="w-[200px]">Avancement</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Aucun apprenant.</TableCell></TableRow>
                ) : rows.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.prenom} {r.nom}</div>
                      <div className="text-xs text-muted-foreground">{r.email || "—"}</div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{r.type_apprenant}</Badge></TableCell>
                    <TableCell className="text-right font-mono">{formatHM(r.faitMin)}</TableCell>
                    <TableCell className="text-right font-mono">{r.requis}h</TableCell>
                    <TableCell className="text-right font-mono">
                      {r.requis === 0 ? "—" : r.restant === 0 ? (
                        <Badge className="bg-green-600">Terminé</Badge>
                      ) : (
                        <span className={r.pct < 50 ? "text-orange-600 font-semibold" : ""}>
                          {formatHM(Math.round(r.restant * 60))}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={r.pct} className="h-2" />
                        <span className="text-xs w-10 text-right">{Math.round(r.pct)}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
