import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Users, TrendingUp, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MODULES_DATA } from "./formations-data";

interface SessionOption {
  id: string;
  nom: string | null;
  date_debut: string;
  date_fin: string;
  type_session: string;
}

interface ApprenantRow {
  id: string;
  nom: string;
  prenom: string;
  formation_choisie: string | null;
}

interface CompletionRow {
  apprenant_id: string;
  module_id: number;
  score_obtenu: number | null;
  score_max: number | null;
}

const ResultatsSessionPage = () => {
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("e-learning");
  const [loading, setLoading] = useState(true);
  const [apprenants, setApprenants] = useState<ApprenantRow[]>([]);
  const [completions, setCompletions] = useState<CompletionRow[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Load sessions
  useEffect(() => {
    const fetchSessions = async () => {
      const { data } = await supabase
        .from("sessions")
        .select("id, nom, date_debut, date_fin, type_session")
        .order("date_debut", { ascending: false });
      setSessions((data as SessionOption[]) || []);
      setLoading(false);
    };
    fetchSessions();
  }, []);

  // Load data for selected session or e-learning
  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      let apprenantIds: string[] = [];
      let apprenantList: ApprenantRow[] = [];

      if (selectedSessionId === "e-learning") {
        // E-learning: apprenants with formation_choisie containing "elearning" or not in any session
        const { data: eLearningApprenants } = await supabase
          .from("apprenants")
          .select("id, nom, prenom, formation_choisie")
          .or("formation_choisie.ilike.%elearning%,formation_choisie.ilike.%e-learning%")
          .order("nom");
        apprenantList = (eLearningApprenants as ApprenantRow[]) || [];
        apprenantIds = apprenantList.map(a => a.id);
      } else {
        // Fetch apprenants in this session
        const { data: sessionApprenants } = await supabase
          .from("session_apprenants")
          .select("apprenant_id")
          .eq("session_id", selectedSessionId);

        if (sessionApprenants && sessionApprenants.length > 0) {
          apprenantIds = sessionApprenants.map(sa => sa.apprenant_id);
          const { data: appData } = await supabase
            .from("apprenants")
            .select("id, nom, prenom, formation_choisie")
            .in("id", apprenantIds)
            .order("nom");
          apprenantList = (appData as ApprenantRow[]) || [];
        }
      }

      setApprenants(apprenantList);

      // Fetch completions for these apprenants
      if (apprenantIds.length > 0) {
        const { data: completionData } = await supabase
          .from("apprenant_module_completion")
          .select("apprenant_id, module_id, score_obtenu, score_max")
          .in("apprenant_id", apprenantIds);
        setCompletions((completionData as CompletionRow[]) || []);
      } else {
        setCompletions([]);
      }

      setLoadingData(false);
    };
    fetchData();
  }, [selectedSessionId]);

  // Determine which modules to show (based on apprenants' formations)
  const relevantModules = useMemo(() => {
    // Get all module IDs that have completions
    const completedModuleIds = new Set(completions.map(c => c.module_id));
    // Also include all modules from MODULES_DATA that match apprenants' formations
    return MODULES_DATA.filter(m => completedModuleIds.has(m.id))
      .sort((a, b) => a.id - b.id);
  }, [completions]);

  // Build completion map: apprenant_id -> module_id -> { score_obtenu, score_max }
  const completionMap = useMemo(() => {
    const map: Record<string, Record<number, { score_obtenu: number | null; score_max: number | null }>> = {};
    for (const c of completions) {
      if (!map[c.apprenant_id]) map[c.apprenant_id] = {};
      map[c.apprenant_id][c.module_id] = { score_obtenu: c.score_obtenu, score_max: c.score_max };
    }
    return map;
  }, [completions]);

  // Calculate averages per module
  const moduleAverages = useMemo(() => {
    const avgs: Record<number, number> = {};
    for (const mod of relevantModules) {
      let total = 0;
      let count = 0;
      for (const a of apprenants) {
        const c = completionMap[a.id]?.[mod.id];
        if (c?.score_obtenu != null && c?.score_max != null && c.score_max > 0) {
          total += (c.score_obtenu / c.score_max) * 100;
          count++;
        }
      }
      avgs[mod.id] = count > 0 ? Math.round(total / count) : 0;
    }
    return avgs;
  }, [relevantModules, apprenants, completionMap]);

  // Calculate per-apprenant total average
  const apprenantAverages = useMemo(() => {
    const avgs: Record<string, number> = {};
    for (const a of apprenants) {
      let total = 0;
      let count = 0;
      for (const mod of relevantModules) {
        const c = completionMap[a.id]?.[mod.id];
        if (c?.score_obtenu != null && c?.score_max != null && c.score_max > 0) {
          total += (c.score_obtenu / c.score_max) * 100;
          count++;
        }
      }
      avgs[a.id] = count > 0 ? Math.round(total / count) : 0;
    }
    return avgs;
  }, [apprenants, relevantModules, completionMap]);

  // Global average
  const globalAverage = useMemo(() => {
    const vals = Object.values(apprenantAverages).filter(v => v > 0);
    if (vals.length === 0) return 0;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }, [apprenantAverages]);

  const selectedSession = sessions.find(s => s.id === selectedSessionId);
  const sessionLabel = selectedSessionId === "e-learning"
    ? "E-Learning"
    : selectedSession?.nom || `Session du ${selectedSession?.date_debut || ""}`;

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
    } catch { return d; }
  };

  const getScoreColor = (pct: number) => {
    if (pct >= 80) return "bg-emerald-500";
    if (pct >= 60) return "bg-amber-400";
    if (pct > 0) return "bg-destructive";
    return "bg-muted";
  };

  const getScoreTextColor = (pct: number) => {
    if (pct >= 80) return "text-emerald-700 dark:text-emerald-400";
    if (pct >= 60) return "text-amber-700 dark:text-amber-400";
    if (pct > 0) return "text-destructive";
    return "text-muted-foreground";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
        <div>
          <h2 className="text-xl font-bold">Résultats par session</h2>
          <p className="text-sm text-muted-foreground">Taux de réussite par module et par élève</p>
        </div>
        <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
          <SelectTrigger className="w-80">
            <SelectValue placeholder="Sélectionner une session" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="e-learning">
              🖥️ E-Learning (tous)
            </SelectItem>
            {sessions.map(s => (
              <SelectItem key={s.id} value={s.id}>
                {s.nom || `Session ${s.type_session}`} — {formatDate(s.date_debut)} au {formatDate(s.date_fin)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-4 px-5 flex items-center gap-3">
            <Users className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{apprenants.length}</p>
              <p className="text-xs text-muted-foreground">Élèves</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 px-5 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{relevantModules.length}</p>
              <p className="text-xs text-muted-foreground">Modules complétés</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 px-5 flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className={`text-2xl font-bold ${getScoreTextColor(globalAverage)}`}>{globalAverage} %</p>
              <p className="text-xs text-muted-foreground">Moyenne générale</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Session label */}
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-sm px-3 py-1">
          {sessionLabel}
        </Badge>
        {selectedSession && (
          <Badge variant="secondary" className="text-xs">
            {selectedSession.type_session.toUpperCase()}
          </Badge>
        )}
      </div>

      {/* Results table */}
      {loadingData ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : apprenants.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Aucun élève trouvé pour cette session.
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="sticky left-0 z-10 bg-muted/30 min-w-[180px] font-bold">Élève</TableHead>
                  <TableHead className="text-center font-bold min-w-[80px]">Totaux</TableHead>
                  {relevantModules.map(mod => (
                    <TableHead key={mod.id} className="text-center min-w-[100px]">
                      <div className="text-xs font-semibold leading-tight">{mod.nom}</div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Averages row */}
                <TableRow className="bg-primary/5 border-b-2 border-primary/20">
                  <TableCell className="sticky left-0 z-10 bg-primary/5 font-bold text-sm">
                    Moyenne session
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`font-bold ${getScoreTextColor(globalAverage)}`}>{globalAverage} %</span>
                  </TableCell>
                  {relevantModules.map(mod => (
                    <TableCell key={mod.id} className="text-center">
                      <span className={`text-sm font-semibold ${getScoreTextColor(moduleAverages[mod.id] || 0)}`}>
                        {moduleAverages[mod.id] || 0} %
                      </span>
                    </TableCell>
                  ))}
                </TableRow>

                {/* Per-apprenant rows */}
                {apprenants.map(a => {
                  const avg = apprenantAverages[a.id] || 0;
                  return (
                    <TableRow key={a.id} className="hover:bg-muted/20">
                      <TableCell className="sticky left-0 z-10 bg-background font-medium">
                        <div className="flex items-center gap-2">
                          {Object.keys(completionMap[a.id] || {}).length > 0 && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          )}
                          <span className="text-sm">{a.prenom} {a.nom}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`font-bold text-sm ${getScoreTextColor(avg)}`}>{avg} %</span>
                      </TableCell>
                      {relevantModules.map(mod => {
                        const c = completionMap[a.id]?.[mod.id];
                        if (!c) {
                          return <TableCell key={mod.id} className="text-center"><span className="text-xs text-muted-foreground">—</span></TableCell>;
                        }
                        const pct = c.score_obtenu != null && c.score_max != null && c.score_max > 0
                          ? Math.round((c.score_obtenu / c.score_max) * 100)
                          : null;

                        return (
                          <TableCell key={mod.id} className="p-1">
                            <div className="flex flex-col items-center gap-1">
                              {pct != null ? (
                                <>
                                  <div className="w-full h-5 rounded-full bg-muted/30 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all ${getScoreColor(pct)}`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                  <span className={`text-xs font-semibold ${getScoreTextColor(pct)}`}>{pct} %</span>
                                </>
                              ) : (
                                <>
                                  <div className="w-full h-5 rounded-full bg-emerald-500" />
                                  <span className="text-xs font-semibold text-emerald-600">✓</span>
                                </>
                              )}
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
};

export default ResultatsSessionPage;
