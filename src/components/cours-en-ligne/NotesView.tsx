import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { Trophy, TrendingUp, Clock, Target, BookOpen, ChevronDown, ChevronUp, GraduationCap, FileText, CheckCircle2, XCircle, ArrowLeft, Eye, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { MODULES_DATA } from "./formations-data";

interface QuizResult {
  id: string;
  quiz_type: string;
  quiz_id: string;
  quiz_titre: string;
  matiere_id: string | null;
  matiere_nom: string | null;
  score_obtenu: number;
  score_max: number;
  note_sur_20: number | null;
  reussi: boolean;
  duree_secondes: number | null;
  completed_at: string;
  details: any;
}

interface ModuleCompletion {
  id: string;
  module_id: number;
  score_obtenu: number | null;
  score_max: number | null;
  completed_at: string;
  details: any;
}

interface NotesViewProps {
  apprenantId: string;
  studentName: string;
  moduleCompletionsSeed?: ModuleCompletion[];
}

// Map module IDs to matière categories
const MODULE_TO_MATIERE: Record<number, string> = {
  2: "A. Réglementation T3P",
  25: "A. Réglementation T3P",
  10: "A. Réglementation T3P",
  39: "A. Réglementation T3P",
  14: "B. Gestion",
  20: "B. Gestion",
  15: "C. Sécurité Routière",
  21: "C. Sécurité Routière",
  16: "D. Français",
  22: "D. Français",
  17: "E. Anglais",
  23: "E. Anglais",
  18: "F. Réglementation",
  24: "F. Réglementation",
  19: "G. Développement Commercial",
  3: "Formules",
  4: "Bilan Exercices VTC",
  5: "Bilan Examen VTC",
  9: "Bilan Exercices TAXI",
  11: "Bilan Examen TAXI",
  6: "Pratique TAXI",
  7: "Connaissances Ville TAXI",
  8: "Pratique VTC",
};

const normalizeQuizNoteSur20 = (result: QuizResult): number | null => {
  const score = Number(result.score_obtenu ?? 0);
  const max = Number(result.score_max ?? 0);
  if (Number.isFinite(max) && max > 0) {
    const safeScore = Math.min(Math.max(Number.isFinite(score) ? score : 0, 0), max);
    return Number(((safeScore / max) * 20).toFixed(1));
  }

  if (result.note_sur_20 == null) return null;
  const fallback = Number(result.note_sur_20);
  if (!Number.isFinite(fallback)) return null;
  return Number(Math.min(Math.max(fallback, 0), 20).toFixed(1));
};

const NotesView = ({ apprenantId, studentName, moduleCompletionsSeed = [] }: NotesViewProps) => {
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [moduleCompletions, setModuleCompletions] = useState<ModuleCompletion[]>(moduleCompletionsSeed);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"matiere" | "module" | "examens">("matiere");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedDetail, setSelectedDetail] = useState<{ title: string; date: string; score: number; max: number; details: any[] } | null>(null);
  const fetchStateRef = useRef({ inFlight: false, pending: false });
  useEffect(() => {
    setModuleCompletions(moduleCompletionsSeed);
  }, [apprenantId, moduleCompletionsSeed]);

  const fetchAll = useCallback(async () => {
    if (!apprenantId) {
      setLoading(false);
      return;
    }

    if (fetchStateRef.current.inFlight) {
      fetchStateRef.current.pending = true;
      return;
    }

    fetchStateRef.current.inFlight = true;

    try {
      do {
        fetchStateRef.current.pending = false;

        const [quizRes, moduleRes] = await Promise.all([
          supabase
            .from("apprenant_quiz_results")
            .select("*")
            .eq("apprenant_id", apprenantId)
            .order("completed_at", { ascending: true }),
          supabase
            .from("apprenant_module_completion")
            .select("*")
            .eq("apprenant_id", apprenantId)
            .order("completed_at", { ascending: true }),
        ]);

        if (quizRes.error) {
          console.error("NotesView: erreur chargement quiz", quizRes.error);
        } else {
          setQuizResults((quizRes.data || []) as any);
        }

        if (moduleRes.error) {
          console.error("NotesView: erreur chargement modules", moduleRes.error);
        } else if (moduleRes.data && moduleRes.data.length > 0) {
          setModuleCompletions(moduleRes.data as any);
        } else if (moduleCompletionsSeed.length === 0) {
          setModuleCompletions([]);
        }
      } while (fetchStateRef.current.pending);
    } finally {
      fetchStateRef.current.inFlight = false;
      setLoading(false);
    }
  }, [apprenantId, moduleCompletionsSeed]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Realtime subscription to auto-refresh results
  useEffect(() => {
    if (!apprenantId) return;

    const channel = supabase
      .channel(`notes-view-${apprenantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'apprenant_quiz_results', filter: `apprenant_id=eq.${apprenantId}` },
        () => fetchAll()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'apprenant_module_completion', filter: `apprenant_id=eq.${apprenantId}` },
        () => fetchAll()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [apprenantId, fetchAll]);

  // NO polling — realtime subscription above handles updates

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // Combined stats
  const stats = useMemo(() => {
    const allScores: { score: number; max: number }[] = [];
    
    quizResults.forEach(r => {
      const noteSur20 = normalizeQuizNoteSur20(r);
      if (noteSur20 != null) allScores.push({ score: noteSur20, max: 20 });
    });
    moduleCompletions.forEach(m => {
      if (m.score_obtenu != null && m.score_max != null && m.score_max > 0) {
        allScores.push({ score: (m.score_obtenu / m.score_max) * 20, max: 20 });
      }
    });

    if (allScores.length === 0) return null;

    const notes = allScores.map(s => s.score);
    const moyenne = notes.reduce((a, b) => a + b, 0) / notes.length;
    const meilleure = Math.max(...notes);
    const nbReussi = notes.filter(n => n >= 10).length;
    const totalDuree = quizResults.reduce((acc, r) => acc + (r.duree_secondes || 0), 0);

    return { moyenne, meilleure, nbReussi, total: allScores.length, totalDuree, nbModules: moduleCompletions.length, nbExamens: quizResults.length };
  }, [quizResults, moduleCompletions]);

  // Group module completions by matière
  const byMatiere = useMemo(() => {
    const map: Record<string, { moduleName: string; moduleId: number; score: number; max: number; pct: number; date: string; details: any[] }[]> = {};
    
    moduleCompletions.forEach(m => {
      if (m.score_obtenu == null || m.score_max == null) return;
      const matiere = MODULE_TO_MATIERE[m.module_id] || "Autre";
      const mod = MODULES_DATA.find(md => md.id === m.module_id);
      if (!map[matiere]) map[matiere] = [];
      map[matiere].push({
        moduleName: mod?.nom || `Module ${m.module_id}`,
        moduleId: m.module_id,
        score: m.score_obtenu,
        max: m.score_max,
        pct: m.score_max > 0 ? Math.round((m.score_obtenu / m.score_max) * 100) : 0,
        date: m.completed_at,
        details: Array.isArray(m.details) ? m.details : [],
      });
    });

    // Add quiz results grouped by matière
    quizResults.forEach(r => {
      if (r.matiere_nom) {
        const matiere = r.matiere_nom;
        if (!map[matiere]) map[matiere] = [];
        map[matiere].push({
          moduleName: r.quiz_titre,
          moduleId: 0,
          score: r.score_obtenu,
          max: r.score_max,
          pct: r.score_max > 0 ? Math.round((r.score_obtenu / r.score_max) * 100) : 0,
          date: r.completed_at,
          details: Array.isArray((r as any).details) ? (r as any).details : [],
        });
      }
    });

    return map;
  }, [moduleCompletions, quizResults]);

  // Group by module
  const byModule = useMemo(() => {
    const map: Record<string, { score: number; max: number; pct: number; date: string; type: string; details: any[] }[]> = {};
    
    moduleCompletions.forEach(m => {
      if (m.score_obtenu == null || m.score_max == null) return;
      const mod = MODULES_DATA.find(md => md.id === m.module_id);
      const name = mod?.nom || `Module ${m.module_id}`;
      if (!map[name]) map[name] = [];
      map[name].push({
        score: m.score_obtenu,
        max: m.score_max,
        pct: m.score_max > 0 ? Math.round((m.score_obtenu / m.score_max) * 100) : 0,
        date: m.completed_at,
        type: "module",
        details: Array.isArray(m.details) ? m.details : [],
      });
    });

    quizResults.forEach(r => {
      const name = r.quiz_titre;
      if (!map[name]) map[name] = [];
      map[name].push({
        score: r.score_obtenu,
        max: r.score_max,
        pct: r.score_max > 0 ? Math.round((r.score_obtenu / r.score_max) * 100) : 0,
        date: r.completed_at,
        type: "examen",
        details: Array.isArray((r as any).details) ? (r as any).details : [],
      });
    });

    return map;
  }, [moduleCompletions, quizResults]);

  // Radar data from matière averages
  const matiereRadar = useMemo(() => {
    return Object.entries(byMatiere).map(([matiere, items]) => {
      const avg = items.reduce((a, b) => a + b.pct, 0) / items.length;
      return {
        matiere: matiere.replace(/^[A-G]\. /, "").substring(0, 14),
        moyenne: Number((avg / 5).toFixed(1)), // scale to /20
        fullMark: 20,
      };
    });
  }, [byMatiere]);

  // Evolution chart
  const evolutionData = useMemo(() => {
    const all: { date: Date; pct: number; titre: string }[] = [];
    
    moduleCompletions.forEach(m => {
      if (m.score_obtenu == null || m.score_max == null || m.score_max === 0) return;
      const mod = MODULES_DATA.find(md => md.id === m.module_id);
      all.push({
        date: new Date(m.completed_at),
        pct: (m.score_obtenu / m.score_max) * 20,
        titre: mod?.nom || `Module ${m.module_id}`,
      });
    });

    quizResults.forEach(r => {
      const noteSur20 = normalizeQuizNoteSur20(r);
      if (noteSur20 != null) {
        all.push({ date: new Date(r.completed_at), pct: noteSur20, titre: r.quiz_titre });
      }
    });

    return all
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((item, i) => ({
        index: i + 1,
        date: format(item.date, "dd/MM", { locale: fr }),
        note: Number(item.pct.toFixed(1)),
        titre: item.titre,
      }));
  }, [moduleCompletions, quizResults]);

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}min` : `${m}min`;
  };

  const pctColor = (pct: number) =>
    pct >= 80 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-red-500";
  const pctBg = (pct: number) =>
    pct >= 80 ? "bg-emerald-100" : pct >= 50 ? "bg-amber-100" : "bg-red-100";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const hasResults = quizResults.length > 0 || moduleCompletions.length > 0;

  if (!hasResults) {
    return (
      <div className="text-center py-20">
        <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-700 mb-2">Aucun résultat pour le moment</h2>
        <p className="text-slate-500">Tes notes apparaîtront ici après avoir complété des quiz, exercices ou examens blancs.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <TrendingUp className="w-5 h-5 text-blue-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-slate-900">{stats.moyenne.toFixed(1)}/20</p>
            <p className="text-xs text-slate-500">Moyenne</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <Trophy className="w-5 h-5 text-amber-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-slate-900">{stats.meilleure.toFixed(1)}/20</p>
            <p className="text-xs text-slate-500">Meilleure</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <Target className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-slate-900">{stats.nbReussi}/{stats.total}</p>
            <p className="text-xs text-slate-500">Réussis (≥10)</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <FileText className="w-5 h-5 text-indigo-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-slate-900">{stats.nbModules}</p>
            <p className="text-xs text-slate-500">Modules</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <GraduationCap className="w-5 h-5 text-purple-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-slate-900">{stats.nbExamens}</p>
            <p className="text-xs text-slate-500">Examens</p>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-bold text-slate-800 mb-4">📈 Évolution des notes</h3>
          {evolutionData.length >= 2 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={evolutionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 20]} tick={{ fontSize: 11 }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-white border rounded-lg shadow-lg p-3 text-xs">
                        <p className="font-semibold">{d.titre}</p>
                        <p className="text-slate-500">{d.date}</p>
                        <p className="text-lg font-bold text-primary">{d.note}/20</p>
                      </div>
                    );
                  }}
                />
                <Line type="monotone" dataKey="note" stroke="#3b82f6" strokeWidth={2.5} dot={{ fill: "#3b82f6", r: 3 }} />
                <Line type="monotone" dataKey={() => 10} stroke="#ef4444" strokeDasharray="5 5" strokeWidth={1} dot={false} name="Seuil" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-slate-400 text-sm">
              Au moins 2 résultats nécessaires
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-bold text-slate-800 mb-4">🎯 Moyenne par matière</h3>
          {matiereRadar.length >= 3 ? (
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={matiereRadar}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="matiere" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 20]} tick={{ fontSize: 9 }} />
                <Radar name="Moyenne" dataKey="moyenne" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-slate-400 text-sm">
              Au moins 3 matières nécessaires pour le radar
            </div>
          )}
        </div>
      </div>

      {/* Tab selector */}
      <div className="flex gap-2">
        {[
          { key: "matiere" as const, label: "📚 Par matière", count: Object.keys(byMatiere).length },
          { key: "module" as const, label: "📦 Par module", count: Object.keys(byModule).length },
          { key: "examens" as const, label: "📝 Examens blancs", count: quizResults.length },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* By Matière */}
      {activeTab === "matiere" && (
        <div className="space-y-3">
          {Object.entries(byMatiere)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([matiere, items]) => {
              const avg = items.reduce((a, b) => a + b.pct, 0) / items.length;
              const isExpanded = expandedGroups.has(`m-${matiere}`);
              return (
                <div key={matiere} className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <button
                    onClick={() => toggleGroup(`m-${matiere}`)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${pctBg(avg)} ${pctColor(avg)}`}>
                        {Math.round(avg)}%
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-slate-800">{matiere}</p>
                        <p className="text-xs text-slate-500">{items.length} résultat{items.length > 1 ? "s" : ""}</p>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </button>
                  {isExpanded && (
                    <div className="border-t px-5 pb-3">
                      {items.map((item, i) => (
                        <div
                          key={i}
                          className={`flex items-center justify-between py-2.5 border-b last:border-b-0 text-sm ${item.details.length > 0 ? "cursor-pointer hover:bg-blue-50/50 transition-colors" : ""}`}
                          onClick={() => {
                            if (item.details.length > 0) {
                              setSelectedDetail({ title: item.moduleName, date: item.date, score: item.score, max: item.max, details: item.details });
                            }
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <div>
                              <p className="text-slate-700">{item.moduleName}</p>
                              <p className="text-xs text-slate-400">{format(new Date(item.date), "dd/MM/yyyy HH:mm", { locale: fr })}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`font-bold ${pctColor(item.pct)}`}>{item.score}/{item.max}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${pctBg(item.pct)} ${pctColor(item.pct)}`}>
                              {item.pct}%
                            </span>
                            {item.details.length > 0 && <Eye className="w-3.5 h-3.5 text-slate-400" />}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {/* By Module */}
      {activeTab === "module" && (
        <div className="space-y-3">
          {Object.entries(byModule)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([moduleName, items]) => {
              const best = Math.max(...items.map(i => i.pct));
              const isExpanded = expandedGroups.has(`mod-${moduleName}`);
              return (
                <div key={moduleName} className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <button
                    onClick={() => toggleGroup(`mod-${moduleName}`)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${pctBg(best)} ${pctColor(best)}`}>
                        {best}%
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-slate-800">{moduleName}</p>
                        <p className="text-xs text-slate-500">
                          {items.length} tentative{items.length > 1 ? "s" : ""} • Meilleur: {best}%
                        </p>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </button>
                  {isExpanded && (
                    <div className="border-t px-5 pb-3">
                      {items.map((item, i) => (
                        <div
                          key={i}
                          className={`flex items-center justify-between py-2.5 border-b last:border-b-0 text-sm ${item.details.length > 0 ? "cursor-pointer hover:bg-blue-50/50 transition-colors" : ""}`}
                          onClick={() => {
                            if (item.details.length > 0) {
                              setSelectedDetail({ title: moduleName, date: item.date, score: item.score, max: item.max, details: item.details });
                            }
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${item?.type === "examen" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                              {item?.type === "examen" ? "Examen" : "Quiz"}
                            </span>
                            <span className="text-xs text-slate-400">{format(new Date(item.date), "dd/MM/yyyy HH:mm", { locale: fr })}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`font-bold ${pctColor(item.pct)}`}>{item.score}/{item.max}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${pctBg(item.pct)} ${pctColor(item.pct)}`}>
                              {item.pct}%
                            </span>
                            {item.details.length > 0 && <Eye className="w-3.5 h-3.5 text-slate-400" />}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {/* Examens blancs detail */}
      {activeTab === "examens" && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h3 className="font-bold text-slate-800">📝 Résultats des examens blancs</h3>
          </div>
          {quizResults.length === 0 ? (
            <div className="text-center py-10 text-slate-400">Aucun examen blanc complété</div>
          ) : (
            <>
              <div className="hidden md:grid grid-cols-12 gap-2 px-6 py-3 bg-slate-50 border-b text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <div className="col-span-3">Examen</div>
                <div className="col-span-2">Matière</div>
                <div className="col-span-2 text-center">Note</div>
                <div className="col-span-2 text-center">Résultat</div>
                <div className="col-span-1 text-center">Durée</div>
                <div className="col-span-2 text-center">Date</div>
              </div>
              {quizResults.slice().reverse().map((r) => (
                (() => {
                  const noteSur20 = normalizeQuizNoteSur20(r);
                  return (
                    <div key={r.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 px-6 py-3 border-b last:border-b-0 hover:bg-slate-50/50 transition-colors items-center text-sm">
                      <div className="md:col-span-3 font-medium text-slate-800">{r.quiz_titre}</div>
                      <div className="md:col-span-2 text-slate-500 text-xs">{r.matiere_nom || "—"}</div>
                      <div className="md:col-span-2 text-center">
                        <span className={`font-bold ${(noteSur20 ?? 0) >= 10 ? "text-emerald-600" : "text-red-500"}`}>
                          {noteSur20 != null ? `${noteSur20.toFixed(1)}/20` : "—"}
                        </span>
                      </div>
                      <div className="md:col-span-2 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${r.reussi ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                          {r.reussi ? "✅ Réussi" : "❌ Échoué"}
                        </span>
                      </div>
                      <div className="md:col-span-1 text-center text-xs text-slate-500">
                        {r.duree_secondes ? formatDuration(r.duree_secondes) : "—"}
                      </div>
                      <div className="md:col-span-2 text-center text-xs text-slate-500">
                        {format(new Date(r.completed_at), "dd/MM/yyyy HH:mm", { locale: fr })}
                      </div>
                    </div>
                  );
                })()
              ))}
            </>
          )}
        </div>

        {/* À revoir — matières échouées par examen blanc */}
        {(() => {
          // Group quiz results by exam (quiz_id)
          const examGroups: Record<string, QuizResult[]> = {};
          quizResults.forEach(r => {
            if (!examGroups[r.quiz_id]) examGroups[r.quiz_id] = [];
            examGroups[r.quiz_id].push(r);
          });

          // For each exam, find failed matières
          const examsWithFailed = Object.entries(examGroups)
            .map(([quizId, results]) => {
              const failed = results.filter(r => {
                const note = normalizeQuizNoteSur20(r);
                return note != null && (!r.reussi || note < 10);
              });
              if (failed.length === 0) return null;
              // Get exam title from first result
              const examTitle = results[0]?.quiz_titre?.replace(/\s*-\s*.*$/, '') || quizId;
              return { quizId, examTitle, failed };
            })
            .filter(Boolean) as { quizId: string; examTitle: string; failed: QuizResult[] }[];

          if (examsWithFailed.length === 0) return null;

          return (
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <h3 className="font-bold text-red-700 text-lg">À revoir</h3>
              </div>
              {examsWithFailed.map(({ quizId, examTitle, failed }) => (
                <div key={quizId} className="bg-red-50 border-2 border-red-200 rounded-xl overflow-hidden">
                  <div className="px-5 py-3 bg-red-100 border-b border-red-200">
                    <h4 className="font-semibold text-red-800 text-sm">{examTitle}</h4>
                  </div>
                  <div className="px-5 py-3 space-y-2">
                    {failed.map(r => {
                      const note = normalizeQuizNoteSur20(r);
                      return (
                        <div key={r.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-red-100 border border-red-200">
                          <span className="text-sm font-semibold text-red-800">{r.matiere_nom || r.quiz_titre}</span>
                          <span className="text-sm font-bold text-red-700">
                            {note != null ? `${note.toFixed(1)} / 20` : "—"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>
      )}

      {/* Detail panel overlay */}
      {selectedDetail && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setSelectedDetail(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <button onClick={() => setSelectedDetail(null)} className="p-1 hover:bg-slate-200 rounded-lg transition-colors">
                  <ArrowLeft className="w-5 h-5 text-slate-600" />
                </button>
                <div>
                  <h3 className="font-bold text-slate-800">{selectedDetail.title}</h3>
                  <p className="text-xs text-slate-500">
                    {format(new Date(selectedDetail.date), "dd/MM/yyyy HH:mm", { locale: fr })} — {selectedDetail.score}/{selectedDetail.max} ({selectedDetail.max > 0 ? Math.round((selectedDetail.score / selectedDetail.max) * 100) : 0}%)
                  </p>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                selectedDetail.max > 0 && (selectedDetail.score / selectedDetail.max) >= 0.5
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-red-100 text-red-600"
              }`}>
                {selectedDetail.score}/{selectedDetail.max}
              </div>
            </div>

            {/* Questions list */}
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
              {(() => {
                // Group details by exercice
                const grouped: Record<string, { titre: string; questions: any[] }> = {};
                selectedDetail.details.forEach((d: any) => {
                  const key = d.exerciceId || "default";
                  if (!grouped[key]) grouped[key] = { titre: d.exerciceTitre || "", questions: [] };
                  grouped[key].questions.push(d);
                });

                return Object.entries(grouped).map(([exoId, group]) => (
                  <div key={exoId}>
                    {group.titre && Object.keys(grouped).length > 1 && (
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 mt-2">{group.titre}</h4>
                    )}
                    {group.questions.map((q: any, qi: number) => {
                      const isCorrect = q.correct === true;
                      const hasAnswer = q.reponseEleve != null && String(q.reponseEleve).trim() !== "";
                      return (
                        <div
                          key={qi}
                          className={`rounded-lg border p-3 mb-2 ${
                            isCorrect
                              ? "border-emerald-200 bg-emerald-50/50"
                              : hasAnswer
                                ? "border-red-200 bg-red-50/50"
                                : "border-slate-200 bg-slate-50/50"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <div className="shrink-0 mt-0.5">
                              {isCorrect ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-slate-800 font-medium">
                                <span className="text-xs text-slate-400 mr-1">Q{q.questionId ?? q.id ?? "?"}.</span>
                                {q.enonce}
                              </p>
                              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                                <span className="flex items-center gap-1">
                                  <span className="text-slate-500">Réponse élève :</span>
                                  {hasAnswer ? (
                                    <span className={`font-semibold ${isCorrect ? "text-emerald-600" : "text-red-600"}`}>
                                      {q.reponseEleve}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic">Pas de réponse</span>
                                  )}
                                </span>
                                {!isCorrect && q.reponseCorrecte && (
                                  <span className="flex items-center gap-1">
                                    <span className="text-slate-500">Bonne réponse :</span>
                                    <span className="font-semibold text-emerald-600">{q.reponseCorrecte}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ));
              })()}
              {selectedDetail.details.length === 0 && (
                <p className="text-center text-slate-400 py-8">Aucun détail disponible pour ce résultat.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotesView;
