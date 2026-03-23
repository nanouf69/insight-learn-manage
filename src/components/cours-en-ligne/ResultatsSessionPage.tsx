import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Loader2, Users, TrendingUp, CheckCircle2, XCircle, BarChart3,
  BookOpen, FileText, ChevronDown, ChevronRight, Award,
} from "lucide-react";
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

interface QuestionDetail {
  questionId: number;
  enonce: string;
  type: string;
  reponseEleve: string[];
  reponseCorrecte: string[];
}

interface QuizResultRow {
  id: string;
  apprenant_id: string;
  quiz_id: string;
  quiz_titre: string;
  quiz_type: string;
  score_obtenu: number;
  score_max: number;
  note_sur_20: number | null;
  reussi: boolean | null;
  matiere_id: string | null;
  matiere_nom: string | null;
  completed_at: string;
  duree_secondes: number | null;
  details: { questions?: QuestionDetail[] } | null;
}

const PASS_THRESHOLD = 50; // 50% = seuil de réussite pour les modules
const EXAM_PASS_NOTE = 10; // 10/20 = seuil de réussite pour les examens blancs

const ResultatsSessionPage = () => {
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("e-learning");
  const [loading, setLoading] = useState(true);
  const [apprenants, setApprenants] = useState<ApprenantRow[]>([]);
  const [completions, setCompletions] = useState<CompletionRow[]>([]);
  const [quizResults, setQuizResults] = useState<QuizResultRow[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [expandedExam, setExpandedExam] = useState<string | null>(null);
  const [expandedMatiere, setExpandedMatiere] = useState<string | null>(null);

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

  // Load data for selected session
  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      let apprenantIds: string[] = [];
      let apprenantList: ApprenantRow[] = [];

      if (selectedSessionId === "e-learning") {
        const { data: eLearningApprenants } = await supabase
          .from("apprenants")
          .select("id, nom, prenom, formation_choisie")
          .or("formation_choisie.ilike.%elearning%,formation_choisie.ilike.%e-learning%")
          .is("deleted_at", null)
          .order("nom");
        apprenantList = (eLearningApprenants as ApprenantRow[]) || [];
        apprenantIds = apprenantList.map(a => a.id);
      } else {
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
            .is("deleted_at", null)
            .order("nom");
          apprenantList = (appData as ApprenantRow[]) || [];
        }
      }

      setApprenants(apprenantList);

      if (apprenantIds.length > 0) {
        // Fetch completions and quiz results in parallel
        const [completionRes, quizRes] = await Promise.all([
          supabase
            .from("apprenant_module_completion")
            .select("apprenant_id, module_id, score_obtenu, score_max")
            .in("apprenant_id", apprenantIds),
          supabase
            .from("apprenant_quiz_results")
            .select("id, apprenant_id, quiz_id, quiz_titre, quiz_type, score_obtenu, score_max, note_sur_20, reussi, matiere_id, matiere_nom, completed_at, duree_secondes, details")
            .in("apprenant_id", apprenantIds)
            .order("completed_at", { ascending: false }),
        ]);
        setCompletions((completionRes.data as CompletionRow[]) || []);
        setQuizResults((quizRes.data as QuizResultRow[]) || []);
      } else {
        setCompletions([]);
        setQuizResults([]);
      }

      setLoadingData(false);
    };
    fetchData();
  }, [selectedSessionId]);

  // ── Derived data ──

  const relevantModules = useMemo(() => {
    const completedModuleIds = new Set(completions.map(c => c.module_id));
    return MODULES_DATA.filter(m => completedModuleIds.has(m.id)).sort((a, b) => a.id - b.id);
  }, [completions]);

  const completionMap = useMemo(() => {
    const map: Record<string, Record<number, { score_obtenu: number | null; score_max: number | null }>> = {};
    for (const c of completions) {
      if (!map[c.apprenant_id]) map[c.apprenant_id] = {};
      map[c.apprenant_id][c.module_id] = { score_obtenu: c.score_obtenu, score_max: c.score_max };
    }
    return map;
  }, [completions]);

  // Module averages
  const moduleAverages = useMemo(() => {
    const avgs: Record<number, { avg: number; passCount: number; failCount: number; total: number }> = {};
    for (const mod of relevantModules) {
      let totalPct = 0, count = 0, pass = 0, fail = 0;
      for (const a of apprenants) {
        const c = completionMap[a.id]?.[mod.id];
        if (c?.score_obtenu != null && c?.score_max != null && c.score_max > 0) {
          const pct = (c.score_obtenu / c.score_max) * 100;
          totalPct += pct;
          count++;
          if (pct >= PASS_THRESHOLD) pass++; else fail++;
        }
      }
      avgs[mod.id] = { avg: count > 0 ? Math.round(totalPct / count) : 0, passCount: pass, failCount: fail, total: count };
    }
    return avgs;
  }, [relevantModules, apprenants, completionMap]);

  // Per-apprenant averages
  const apprenantAverages = useMemo(() => {
    const avgs: Record<string, number> = {};
    for (const a of apprenants) {
      let total = 0, count = 0;
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

  const globalAverage = useMemo(() => {
    const vals = Object.values(apprenantAverages).filter(v => v > 0);
    return vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  }, [apprenantAverages]);

  // ── Examens blancs analytics ──

  const examBlancResults = useMemo(() => {
    return quizResults.filter(q => q.quiz_type === "examen_blanc");
  }, [quizResults]);

  // Group by quiz_id (examen), then by apprenant (last attempt only)
  const examsByQuizId = useMemo(() => {
    const map: Record<string, { titre: string; results: Record<string, QuizResultRow[]> }> = {};
    for (const r of examBlancResults) {
      if (!map[r.quiz_id]) map[r.quiz_id] = { titre: r.quiz_titre, results: {} };
      if (!map[r.quiz_id].results[r.apprenant_id]) map[r.quiz_id].results[r.apprenant_id] = [];
      map[r.quiz_id].results[r.apprenant_id].push(r);
    }
    return map;
  }, [examBlancResults]);

  // Per-exam stats
  const examStats = useMemo(() => {
    const stats: Record<string, {
      titre: string;
      nbCandidats: number;
      nbReussi: number;
      nbEchec: number;
      moyenneNote: number;
      matieres: Record<string, { nom: string; totalNote: number; count: number; pass: number; fail: number }>;
      apprenantDetails: { id: string; nom: string; prenom: string; note: number; reussi: boolean; matieres: { nom: string; note: number; reussi: boolean }[] }[];
    }> = {};

    for (const [quizId, data] of Object.entries(examsByQuizId)) {
      const matieres: Record<string, { nom: string; totalNote: number; count: number; pass: number; fail: number }> = {};
      let totalNote = 0, nbCandidats = 0, nbReussi = 0, nbEchec = 0;
      const apprenantDetails: typeof stats[string]["apprenantDetails"] = [];

      for (const [appId, results] of Object.entries(data.results)) {
        // Get last attempt per matiere
        const lastPerMatiere: Record<string, QuizResultRow> = {};
        for (const r of results) {
          const key = r.matiere_id || r.quiz_id;
          if (!lastPerMatiere[key] || new Date(r.completed_at) > new Date(lastPerMatiere[key].completed_at)) {
            lastPerMatiere[key] = r;
          }
        }

        const matiereDetails: { nom: string; note: number; reussi: boolean }[] = [];
        let appTotal = 0, appCount = 0;

        for (const [mKey, r] of Object.entries(lastPerMatiere)) {
          const note = r.note_sur_20 != null ? Math.min(r.note_sur_20, 20) : (r.score_max > 0 ? Math.min((r.score_obtenu / r.score_max) * 20, 20) : 0);
          const matNom = r.matiere_nom || r.quiz_titre;
          const reussiMat = note >= EXAM_PASS_NOTE;

          if (!matieres[mKey]) matieres[mKey] = { nom: matNom, totalNote: 0, count: 0, pass: 0, fail: 0 };
          matieres[mKey].totalNote += note;
          matieres[mKey].count++;
          if (reussiMat) matieres[mKey].pass++; else matieres[mKey].fail++;

          matiereDetails.push({ nom: matNom, note: Math.round(note * 10) / 10, reussi: reussiMat });
          appTotal += note;
          appCount++;
        }

        const noteGlobale = appCount > 0 ? Math.round((appTotal / appCount) * 10) / 10 : 0;
        const reussiGlobal = noteGlobale >= EXAM_PASS_NOTE;

        const apprenant = apprenants.find(a => a.id === appId);
        if (apprenant) {
          apprenantDetails.push({
            id: appId,
            nom: apprenant.nom,
            prenom: apprenant.prenom,
            note: noteGlobale,
            reussi: reussiGlobal,
            matieres: matiereDetails.sort((a, b) => a.nom.localeCompare(b.nom)),
          });
        }

        totalNote += noteGlobale;
        nbCandidats++;
        if (reussiGlobal) nbReussi++; else nbEchec++;
      }

      stats[quizId] = {
        titre: data.titre,
        nbCandidats,
        nbReussi,
        nbEchec,
        moyenneNote: nbCandidats > 0 ? Math.round((totalNote / nbCandidats) * 10) / 10 : 0,
        matieres,
        apprenantDetails: apprenantDetails.sort((a, b) => a.nom.localeCompare(b.nom)),
      };
    }
    return stats;
  }, [examsByQuizId, apprenants]);

  // Global exam stats
  const globalExamStats = useMemo(() => {
    let totalCandidats = 0, totalReussi = 0, totalEchec = 0, totalNote = 0;
    for (const s of Object.values(examStats)) {
      totalCandidats += s.nbCandidats;
      totalReussi += s.nbReussi;
      totalEchec += s.nbEchec;
      totalNote += s.moyenneNote * s.nbCandidats;
    }
    return {
      totalCandidats,
      totalReussi,
      totalEchec,
      tauxReussite: totalCandidats > 0 ? Math.round((totalReussi / totalCandidats) * 100) : 0,
      moyenneNote: totalCandidats > 0 ? Math.round((totalNote / totalCandidats) * 10) / 10 : 0,
    };
  }, [examStats]);

  // Per-question stats for a given exam + matiere
  const getQuestionStats = (quizId: string, matiereNom: string) => {
    // Match by quiz_id AND matiere name
    const examResults = examBlancResults.filter(r => {
      if (r.quiz_id !== quizId) return false;
      const rMatiere = r.matiere_nom || r.quiz_titre || '';
      return rMatiere === matiereNom;
    });

    // Collect last attempt per student THAT HAS question details
    const lastPerStudent: Record<string, QuizResultRow> = {};
    for (const r of examResults) {
      const det = r.details as any;
      const hasQuestions = Array.isArray(det?.questions) && det.questions.length > 0;
      if (!hasQuestions) continue;
      if (!lastPerStudent[r.apprenant_id] || new Date(r.completed_at) > new Date(lastPerStudent[r.apprenant_id].completed_at)) {
        lastPerStudent[r.apprenant_id] = r;
      }
    }

    // Aggregate per questionId
    const questionMap: Record<number, { enonce: string; type: string; correct: number; incorrect: number; total: number }> = {};
    for (const r of Object.values(lastPerStudent)) {
      const det = r.details as any;
      const questions: any[] = det?.questions || [];
      for (const q of questions) {
        const qId = q?.questionId ?? q?.id;
        if (qId == null || !q?.enonce) continue;
        if (!questionMap[qId]) {
          questionMap[qId] = { enonce: q.enonce, type: q.type || 'QCM', correct: 0, incorrect: 0, total: 0 };
        }
        const eleve = Array.isArray(q.reponseEleve) ? q.reponseEleve : [];
        const correcte = Array.isArray(q.reponseCorrecte) ? q.reponseCorrecte : [];
        const isCorrect = eleve.length > 0 && eleve.length === correcte.length
          && eleve.every((v: string) => correcte.includes(v));
        questionMap[qId].total++;
        if (isCorrect) questionMap[qId].correct++; else questionMap[qId].incorrect++;
      }
    }

    return Object.entries(questionMap)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([id, data]) => ({ questionId: Number(id), ...data }));
  };

  // Module pass/fail global
  const globalModuleStats = useMemo(() => {
    let pass = 0, fail = 0;
    for (const s of Object.values(moduleAverages)) {
      pass += s.passCount;
      fail += s.failCount;
    }
    const total = pass + fail;
    return { pass, fail, total, tauxReussite: total > 0 ? Math.round((pass / total) * 100) : 0 };
  }, [moduleAverages]);

  const selectedSession = sessions.find(s => s.id === selectedSessionId);
  const sessionLabel = selectedSessionId === "e-learning"
    ? "E-Learning"
    : selectedSession?.nom || `Session du ${selectedSession?.date_debut || ""}`;

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }); }
    catch { return d; }
  };

  const getScoreColor = (pct: number) => {
    if (pct >= 80) return "bg-emerald-500";
    if (pct >= 60) return "bg-amber-400";
    if (pct > 0) return "bg-destructive";
    return "bg-muted";
  };

  const getScoreTextColor = (pct: number) => {
    if (pct >= 80) return "text-emerald-700";
    if (pct >= 60) return "text-amber-700";
    if (pct > 0) return "text-destructive";
    return "text-muted-foreground";
  };

  const getNoteColor = (note: number) => {
    if (note >= 14) return "text-emerald-700";
    if (note >= 10) return "text-amber-700";
    return "text-destructive";
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
          <p className="text-sm text-muted-foreground">Analyse détaillée des modules, examens blancs et taux de réussite</p>
        </div>
        <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
          <SelectTrigger className="w-80">
            <SelectValue placeholder="Sélectionner une session" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="e-learning">🖥️ E-Learning (tous)</SelectItem>
            {sessions.map(s => (
              <SelectItem key={s.id} value={s.id}>
                {s.nom || `Session ${s.type_session}`} — {formatDate(s.date_debut)} au {formatDate(s.date_fin)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Session label */}
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-sm px-3 py-1">{sessionLabel}</Badge>
        {selectedSession && (
          <Badge variant="secondary" className="text-xs">{selectedSession.type_session.toUpperCase()}</Badge>
        )}
      </div>

      {loadingData ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : apprenants.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Aucun élève trouvé pour cette session.</CardContent></Card>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardContent className="py-4 px-5 flex items-center gap-3">
                <Users className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{apprenants.length}</p>
                  <p className="text-xs text-muted-foreground">Élèves</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 px-5 flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{relevantModules.length}</p>
                  <p className="text-xs text-muted-foreground">Modules</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 px-5 flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-primary" />
                <div>
                  <p className={`text-2xl font-bold ${getScoreTextColor(globalAverage)}`}>{globalAverage}%</p>
                  <p className="text-xs text-muted-foreground">Moy. modules</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 px-5 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <div>
                  <p className="text-2xl font-bold text-emerald-700">{globalModuleStats.tauxReussite}%</p>
                  <p className="text-xs text-muted-foreground">Réussite modules</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 px-5 flex items-center gap-3">
                <FileText className="w-5 h-5 text-primary" />
                <div>
                  <p className={`text-2xl font-bold ${getNoteColor(globalExamStats.moyenneNote)}`}>
                    {globalExamStats.moyenneNote}/20
                  </p>
                  <p className="text-xs text-muted-foreground">Moy. examens blancs</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 w-full max-w-lg">
              <TabsTrigger value="overview" className="flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4" /> Vue globale
              </TabsTrigger>
              <TabsTrigger value="modules" className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4" /> Modules
              </TabsTrigger>
              <TabsTrigger value="examens" className="flex items-center gap-1.5">
                <FileText className="w-4 h-4" /> Examens blancs
              </TabsTrigger>
            </TabsList>

            {/* ── TAB: Vue globale ── */}
            <TabsContent value="overview" className="space-y-6 mt-4">
              {/* Taux de réussite par module */}
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold text-base mb-4 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    Taux de réussite par module (≥ {PASS_THRESHOLD}%)
                  </h3>
                  <div className="space-y-3">
                    {relevantModules.map(mod => {
                      const stats = moduleAverages[mod.id];
                      if (!stats || stats.total === 0) return null;
                      const tauxReussite = Math.round((stats.passCount / stats.total) * 100);
                      return (
                        <div key={mod.id} className="flex items-center gap-3">
                          <div className="w-48 text-sm font-medium truncate" title={mod.nom}>{mod.nom}</div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Progress value={tauxReussite} className="flex-1 h-3" />
                              <span className={`text-sm font-bold w-12 text-right ${getScoreTextColor(tauxReussite)}`}>{tauxReussite}%</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs w-32">
                            <span className="text-emerald-600 font-medium">{stats.passCount} ✓</span>
                            <span className="text-destructive font-medium">{stats.failCount} ✗</span>
                            <span className="text-muted-foreground">/ {stats.total}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Taux de réussite examens blancs */}
              {Object.keys(examStats).length > 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="font-semibold text-base mb-4 flex items-center gap-2">
                      <Award className="w-4 h-4 text-primary" />
                      Taux de réussite Examens blancs (≥ {EXAM_PASS_NOTE}/20)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(examStats).map(([qId, s]) => {
                        const tauxReussite = s.nbCandidats > 0 ? Math.round((s.nbReussi / s.nbCandidats) * 100) : 0;
                        return (
                          <div key={qId} className="border rounded-lg p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="font-semibold text-sm">{s.titre}</p>
                              <Badge variant={tauxReussite >= 50 ? "default" : "destructive"} className="text-xs">
                                {tauxReussite}% réussite
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-muted-foreground">{s.nbCandidats} candidats</span>
                              <span className="text-emerald-600 font-medium flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {s.nbReussi}</span>
                              <span className="text-destructive font-medium flex items-center gap-1"><XCircle className="w-3 h-3" /> {s.nbEchec}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Progress value={tauxReussite} className="flex-1 h-2" />
                              <span className={`text-sm font-bold ${getNoteColor(s.moyenneNote)}`}>{s.moyenneNote}/20</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Global summary */}
                    <div className="mt-4 pt-4 border-t flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm">
                        <span className="font-semibold">Total :</span>
                        <span>{globalExamStats.totalCandidats} passages</span>
                        <span className="text-emerald-600 font-medium">{globalExamStats.totalReussi} réussis</span>
                        <span className="text-destructive font-medium">{globalExamStats.totalEchec} échoués</span>
                      </div>
                      <Badge variant={globalExamStats.tauxReussite >= 50 ? "default" : "destructive"}>
                        {globalExamStats.tauxReussite}% réussite globale
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* ── TAB: Modules ── */}
            <TabsContent value="modules" className="mt-4">
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="sticky left-0 z-10 bg-muted/30 min-w-[180px] font-bold">Élève</TableHead>
                        <TableHead className="text-center font-bold min-w-[80px]">Moyenne</TableHead>
                        <TableHead className="text-center font-bold min-w-[70px]">Statut</TableHead>
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
                        <TableCell className="sticky left-0 z-10 bg-primary/5 font-bold text-sm">Moyenne session</TableCell>
                        <TableCell className="text-center">
                          <span className={`font-bold ${getScoreTextColor(globalAverage)}`}>{globalAverage}%</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="text-[10px]">{globalModuleStats.tauxReussite}%</Badge>
                        </TableCell>
                        {relevantModules.map(mod => (
                          <TableCell key={mod.id} className="text-center">
                            <span className={`text-sm font-semibold ${getScoreTextColor(moduleAverages[mod.id]?.avg || 0)}`}>
                              {moduleAverages[mod.id]?.avg || 0}%
                            </span>
                          </TableCell>
                        ))}
                      </TableRow>

                      {apprenants.map(a => {
                        const avg = apprenantAverages[a.id] || 0;
                        const passed = avg >= PASS_THRESHOLD;
                        return (
                          <TableRow key={a.id} className="hover:bg-muted/20">
                            <TableCell className="sticky left-0 z-10 bg-background font-medium">
                              <span className="text-sm">{a.prenom} {a.nom}</span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={`font-bold text-sm ${getScoreTextColor(avg)}`}>{avg}%</span>
                            </TableCell>
                            <TableCell className="text-center">
                              {avg > 0 ? (
                                passed
                                  ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                                  : <XCircle className="w-4 h-4 text-destructive mx-auto" />
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            {relevantModules.map(mod => {
                              const c = completionMap[a.id]?.[mod.id];
                              if (!c) return <TableCell key={mod.id} className="text-center"><span className="text-xs text-muted-foreground">—</span></TableCell>;
                              const pct = c.score_obtenu != null && c.score_max != null && c.score_max > 0
                                ? Math.round((c.score_obtenu / c.score_max) * 100) : null;
                              return (
                                <TableCell key={mod.id} className="p-1">
                                  <div className="flex flex-col items-center gap-1">
                                    {pct != null ? (
                                      <>
                                        <div className="w-full h-4 rounded-full bg-muted/30 overflow-hidden">
                                          <div className={`h-full rounded-full transition-all ${getScoreColor(pct)}`} style={{ width: `${pct}%` }} />
                                        </div>
                                        <span className={`text-[10px] font-semibold ${getScoreTextColor(pct)}`}>{pct}%</span>
                                      </>
                                    ) : (
                                      <>
                                        <div className="w-full h-4 rounded-full bg-emerald-500" />
                                        <span className="text-[10px] font-semibold text-emerald-600">✓</span>
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
            </TabsContent>

            {/* ── TAB: Examens blancs ── */}
            <TabsContent value="examens" className="space-y-4 mt-4">
              {Object.keys(examStats).length === 0 ? (
                <Card><CardContent className="py-12 text-center text-muted-foreground">Aucun examen blanc passé pour cette session.</CardContent></Card>
              ) : (
                Object.entries(examStats).map(([qId, s]) => {
                  const isExpanded = expandedExam === qId;
                  const tauxReussite = s.nbCandidats > 0 ? Math.round((s.nbReussi / s.nbCandidats) * 100) : 0;
                  const matieresArr = Object.values(s.matieres).sort((a, b) => a.nom.localeCompare(b.nom));

                  return (
                    <Card key={qId} className="overflow-hidden">
                      {/* Exam header */}
                      <div
                        className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-muted/20 transition-colors"
                        onClick={() => setExpandedExam(isExpanded ? null : qId)}
                      >
                        <div className="flex items-center gap-3">
                          {isExpanded ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
                          <div>
                            <h3 className="font-semibold">{s.titre}</h3>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-0.5">
                              <span>{s.nbCandidats} candidats</span>
                              <span className={getNoteColor(s.moyenneNote)}>Moy. {s.moyenneNote}/20</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right text-sm">
                            <span className="text-emerald-600 font-medium">{s.nbReussi} ✓</span>
                            <span className="mx-1 text-muted-foreground">/</span>
                            <span className="text-destructive font-medium">{s.nbEchec} ✗</span>
                          </div>
                          <Badge variant={tauxReussite >= 50 ? "default" : "destructive"}>{tauxReussite}%</Badge>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t">
                          {/* Matière averages */}
                          {matieresArr.length > 0 && (
                            <div className="px-5 py-4 bg-muted/10 border-b">
                              <h4 className="text-sm font-semibold mb-3">Résultats par matière <span className="text-xs text-muted-foreground font-normal">(cliquez pour voir le détail par question)</span></h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {matieresArr.map(m => {
                                  const mAvg = m.count > 0 ? Math.round((m.totalNote / m.count) * 10) / 10 : 0;
                                  const mTaux = m.count > 0 ? Math.round((m.pass / m.count) * 100) : 0;
                                  const mKey = `${qId}__${m.nom}`;
                                  const isMatiereExpanded = expandedMatiere === mKey;
                                  const questionStats = isMatiereExpanded ? getQuestionStats(qId, m.nom) : [];

                                  return (
                                    <div key={m.nom} className={`bg-background border rounded-lg overflow-hidden transition-all ${isMatiereExpanded ? 'col-span-full' : ''}`}>
                                      <div
                                        className="p-3 space-y-2 cursor-pointer hover:bg-muted/30 transition-colors"
                                        onClick={() => setExpandedMatiere(isMatiereExpanded ? null : mKey)}
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-1.5">
                                            {isMatiereExpanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                                            <span className="text-sm font-medium truncate">{m.nom}</span>
                                          </div>
                                          <span className={`text-sm font-bold ${getNoteColor(mAvg)}`}>{mAvg}/20</span>
                                        </div>
                                        <Progress value={mTaux} className="h-2" />
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                          <span>{m.count} élèves</span>
                                          <span>
                                            <span className="text-emerald-600">{m.pass} ✓</span> / <span className="text-destructive">{m.fail} ✗</span>
                                          </span>
                                        </div>
                                      </div>

                                      {/* Per-question drill-down */}
                                      {isMatiereExpanded && (
                                        <div className="border-t px-3 py-3 space-y-2 bg-muted/5">
                                          {questionStats.length === 0 ? (
                                            <p className="text-xs text-muted-foreground text-center py-2">Aucun détail par question disponible.</p>
                                          ) : (
                                            <>
                                              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground border-b pb-1 mb-1">
                                                <span>Question</span>
                                                <span className="w-40 text-right">Bonnes / Mauvaises</span>
                                              </div>
                                              {questionStats.map((q, idx) => {
                                                const tauxBon = q.total > 0 ? Math.round((q.correct / q.total) * 100) : 0;
                                                return (
                                                  <div key={q.questionId} className="space-y-1">
                                                    <div className="flex items-start gap-2">
                                                      <span className="text-xs font-bold text-muted-foreground w-6 shrink-0">Q{idx + 1}</span>
                                                      <p className="text-xs flex-1 leading-snug">{q.enonce}</p>
                                                      <div className="flex items-center gap-2 shrink-0 justify-end">
                                                        <span className="text-xs text-emerald-600 font-semibold">{q.correct} ✓</span>
                                                        <span className="text-xs text-destructive font-semibold">{q.incorrect} ✗</span>
                                                        <Badge
                                                          variant={tauxBon >= 60 ? "default" : "destructive"}
                                                          className="text-xs px-2 py-0.5 min-w-[50px] text-center"
                                                        >
                                                          {tauxBon}%
                                                        </Badge>
                                                      </div>
                                                    </div>
                                                    <div className="ml-6">
                                                      <div className="w-full h-2 rounded-full bg-muted/30 overflow-hidden">
                                                        <div
                                                          className={`h-full rounded-full transition-all ${tauxBon >= 80 ? 'bg-emerald-500' : tauxBon >= 60 ? 'bg-amber-400' : 'bg-destructive'}`}
                                                          style={{ width: `${tauxBon}%` }}
                                                        />
                                                      </div>
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Per-student results */}
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/20">
                                  <TableHead className="font-bold min-w-[180px]">Élève</TableHead>
                                  <TableHead className="text-center font-bold w-24">Note</TableHead>
                                  <TableHead className="text-center font-bold w-20">Statut</TableHead>
                                  {matieresArr.map(m => (
                                    <TableHead key={m.nom} className="text-center min-w-[90px]">
                                      <div className="text-xs font-semibold leading-tight">{m.nom}</div>
                                    </TableHead>
                                  ))}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {s.apprenantDetails.map(ad => (
                                  <TableRow key={ad.id} className="hover:bg-muted/20">
                                    <TableCell className="font-medium text-sm">{ad.prenom} {ad.nom}</TableCell>
                                    <TableCell className="text-center">
                                      <span className={`font-bold ${getNoteColor(ad.note)}`}>{ad.note}/20</span>
                                    </TableCell>
                                    <TableCell className="text-center">
                                      {ad.reussi
                                        ? <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 text-[10px]">Admis</Badge>
                                        : <Badge variant="destructive" className="text-[10px]">Échec</Badge>
                                      }
                                    </TableCell>
                                    {matieresArr.map(m => {
                                      const matResult = ad.matieres.find(am => am.nom === m.nom);
                                      if (!matResult) return <TableCell key={m.nom} className="text-center text-xs text-muted-foreground">—</TableCell>;
                                      return (
                                        <TableCell key={m.nom} className="text-center">
                                          <span className={`text-xs font-semibold ${getNoteColor(matResult.note)}`}>{matResult.note}/20</span>
                                        </TableCell>
                                      );
                                    })}
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default ResultatsSessionPage;
