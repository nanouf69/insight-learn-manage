import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Loader2, Trophy, ChevronDown, ChevronUp, Medal, User, BarChart3 } from "lucide-react";

interface Props {
  token: string;
}

interface QuizResult {
  apprenant_id: string;
  quiz_id: string;
  quiz_titre: string;
  quiz_type: string;
  score_obtenu: number;
  score_max: number;
  note_sur_20: number | null;
  reussi: boolean | null;
  completed_at: string;
  matiere_nom: string | null;
  matiere_id: string | null;
  details: any;
}

interface Apprenant {
  id: string;
  nom: string;
  prenom: string;
  type_apprenant: string | null;
  formation_choisie: string | null;
}

interface RankedStudent {
  id: string;
  nom: string;
  prenom: string;
  formation: string;
  totalQuizzes: number;
  averageScore: number;
  bestScore: number;
  totalCorrect: number;
  totalQuestions: number;
  quizResults: QuizResult[];
}

export function FormateurResultsTab({ token }: Props) {
  const [loading, setLoading] = useState(true);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [apprenants, setApprenants] = useState<Apprenant[]>([]);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [filterFormation, setFilterFormation] = useState<string>("all");

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("get-formateur-results", {
          body: { token },
        });
        if (error) throw error;
        setQuizResults(data.quizResults || []);
        setApprenants(data.apprenants || []);
      } catch (err) {
        console.error("Erreur chargement résultats:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [token]);

  // Build ranked students
  const rankedStudents = useMemo<RankedStudent[]>(() => {
    const byStudent: Record<string, QuizResult[]> = {};
    quizResults.forEach(q => {
      if (!byStudent[q.apprenant_id]) byStudent[q.apprenant_id] = [];
      byStudent[q.apprenant_id].push(q);
    });

    return Object.entries(byStudent)
      .map(([id, results]) => {
        const a = apprenants.find(a => a.id === id);
        const totalCorrect = results.reduce((s, r) => s + r.score_obtenu, 0);
        const totalQuestions = results.reduce((s, r) => s + r.score_max, 0);
        const averageScore = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
        const bestScore = results.reduce((best, r) => {
          const pct = r.score_max > 0 ? (r.score_obtenu / r.score_max) * 100 : 0;
          return Math.max(best, pct);
        }, 0);

        return {
          id,
          nom: a?.nom || "Inconnu",
          prenom: a?.prenom || "",
          formation: a?.type_apprenant || a?.formation_choisie || "-",
          totalQuizzes: results.length,
          averageScore,
          bestScore,
          totalCorrect,
          totalQuestions,
          quizResults: results.sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()),
        };
      })
      .sort((a, b) => b.averageScore - a.averageScore);
  }, [quizResults, apprenants]);

  const formations = useMemo(() => {
    const set = new Set(rankedStudents.map(s => s.formation).filter(f => f !== "-"));
    return Array.from(set).sort();
  }, [rankedStudents]);

  const filteredStudents = filterFormation === "all"
    ? rankedStudents
    : rankedStudents.filter(s => s.formation === filterFormation);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Chargement des résultats...</span>
      </div>
    );
  }

  const getMedalIcon = (rank: number) => {
    if (rank === 0) return <Trophy className="w-5 h-5 text-amber-500" />;
    if (rank === 1) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-amber-700" />;
    return <span className="w-5 h-5 flex items-center justify-center text-xs font-bold text-muted-foreground">{rank + 1}</span>;
  };

  const getScoreColor = (pct: number) => {
    if (pct >= 80) return "text-emerald-600";
    if (pct >= 60) return "text-amber-600";
    return "text-red-600";
  };

  const getScoreBadgeClass = (pct: number) => {
    if (pct >= 80) return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (pct >= 60) return "bg-amber-100 text-amber-700 border-amber-200";
    return "bg-red-100 text-red-700 border-red-200";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b">
        <div className="flex items-center gap-3">
          <GraduationCap className="w-5 h-5 text-primary" />
          <div>
            <h2 className="text-xl font-semibold">Résultats & Classement des élèves</h2>
            <p className="text-sm text-muted-foreground">
              {filteredStudents.length} élève{filteredStudents.length > 1 ? "s" : ""} — {quizResults.length} quiz réalisé{quizResults.length > 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {formations.length > 1 && (
          <select
            value={filterFormation}
            onChange={e => setFilterFormation(e.target.value)}
            className="text-sm border rounded-lg px-3 py-1.5 bg-background"
          >
            <option value="all">Toutes les formations</option>
            {formations.map(f => (
              <option key={f} value={f}>{f.toUpperCase()}</option>
            ))}
          </select>
        )}
      </div>

      {/* Stats overview */}
      {filteredStudents.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Élèves", value: filteredStudents.length, icon: User },
            { label: "Quiz réalisés", value: filteredStudents.reduce((s, st) => s + st.totalQuizzes, 0), icon: BarChart3 },
            { label: "Moyenne générale", value: `${Math.round(filteredStudents.reduce((s, st) => s + st.averageScore, 0) / filteredStudents.length)}%`, icon: GraduationCap },
            { label: "Meilleur élève", value: filteredStudents[0] ? `${filteredStudents[0].prenom} ${filteredStudents[0].nom.charAt(0)}.` : "-", icon: Trophy },
          ].map((stat, i) => (
            <Card key={i}>
              <CardContent className="pt-4 pb-3 px-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <stat.icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="font-bold text-sm">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Ranking table */}
      {filteredStudents.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Aucun résultat enregistré pour le moment.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              Classement général
            </CardTitle>
            <CardDescription>Classement basé sur la moyenne de tous les quiz</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <div className="divide-y">
              {filteredStudents.map((student, rank) => {
                const isExpanded = expandedStudent === student.id;
                return (
                  <div key={student.id}>
                    {/* Student row */}
                    <button
                      onClick={() => setExpandedStudent(isExpanded ? null : student.id)}
                      className="w-full flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors text-left"
                    >
                      <div className="w-8 flex items-center justify-center shrink-0">
                        {getMedalIcon(rank)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{student.prenom} {student.nom}</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {student.formation.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {student.totalQuizzes} quiz — {student.totalCorrect}/{student.totalQuestions} bonnes réponses
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <span className={`text-lg font-bold ${getScoreColor(student.averageScore)}`}>
                            {Math.round(student.averageScore)}%
                          </span>
                          <p className="text-[10px] text-muted-foreground">moyenne</p>
                        </div>
                        <div className="text-right hidden sm:block">
                          <span className={`text-sm font-semibold ${getScoreColor(student.bestScore)}`}>
                            {Math.round(student.bestScore)}%
                          </span>
                          <p className="text-[10px] text-muted-foreground">meilleur</p>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="px-5 pb-4 bg-muted/10 animate-fade-in">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm mt-2">
                            <thead>
                              <tr className="border-b text-muted-foreground text-xs">
                                <th className="text-left pb-2 pr-3 font-medium">Quiz</th>
                                <th className="text-left pb-2 pr-3 font-medium">Matière</th>
                                <th className="text-center pb-2 pr-3 font-medium">Score</th>
                                <th className="text-center pb-2 pr-3 font-medium">%</th>
                                <th className="text-center pb-2 pr-3 font-medium">Note /20</th>
                                <th className="text-center pb-2 pr-3 font-medium">Réussi</th>
                                <th className="text-left pb-2 font-medium">Date</th>
                              </tr>
                            </thead>
                            <tbody>
                              {student.quizResults.map((q, i) => {
                                const pct = q.score_max > 0 ? Math.round((q.score_obtenu / q.score_max) * 100) : 0;
                                return (
                                  <tr key={i} className="border-b last:border-0">
                                    <td className="py-2 pr-3 text-xs max-w-[200px] truncate font-medium">{q.quiz_titre}</td>
                                    <td className="py-2 pr-3 text-xs text-muted-foreground">{q.matiere_nom || "-"}</td>
                                    <td className="py-2 pr-3 text-center font-semibold">{q.score_obtenu}/{q.score_max}</td>
                                    <td className="py-2 pr-3 text-center">
                                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${getScoreBadgeClass(pct)}`}>
                                        {pct}%
                                      </span>
                                    </td>
                                    <td className="py-2 pr-3 text-center">{q.note_sur_20 != null ? Number(q.note_sur_20).toFixed(1) : "-"}</td>
                                    <td className="py-2 pr-3 text-center">
                                      {q.reussi != null ? (
                                        <span className={`text-xs ${q.reussi ? "text-emerald-600" : "text-red-600"}`}>
                                          {q.reussi ? "✅" : "❌"}
                                        </span>
                                      ) : "-"}
                                    </td>
                                    <td className="py-2 text-xs text-muted-foreground">
                                      {new Date(q.completed_at).toLocaleDateString("fr-FR")}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
