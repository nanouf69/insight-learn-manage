import { useState, useEffect, useMemo, Fragment } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Loader2, Trophy, ChevronDown, ChevronUp, Medal, User, BarChart3, CalendarDays, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";

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

interface ModuleCompletion {
  apprenant_id: string;
  module_id: number;
  score_obtenu: number | null;
  score_max: number | null;
  completed_at: string;
  details: any;
}

interface Apprenant {
  id: string;
  nom: string;
  prenom: string;
  type_apprenant: string | null;
  formation_choisie: string | null;
}

interface SessionAssignment {
  apprenant_id: string;
  session_id: string;
  session_nom: string | null;
  session_date_debut: string | null;
  session_date_fin: string | null;
}

interface QuestionDetail {
  enonce: string;
  reponseEleve: string;
  reponseCorrecte: string;
  correct: boolean | null;
}

interface UnifiedAttempt {
  id: string;
  apprenant_id: string;
  titre: string;
  matiere: string;
  source: "quiz" | "module";
  score_obtenu: number;
  score_max: number;
  note_sur_20: number | null;
  reussi: boolean | null;
  completed_at: string;
  details: any;
  sessionLabel: string;
}

interface RankedStudent {
  id: string;
  nom: string;
  prenom: string;
  formation: string;
  totalAttempts: number;
  averageScore: number;
  bestScore: number;
  totalCorrect: number;
  totalQuestions: number;
  sessions: string[];
  attempts: UnifiedAttempt[];
}

const DEFAULT_SESSION_LABEL = "Hors session";

const toDate = (value?: string | null) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const extractQuestionDetails = (details: any): QuestionDetail[] => {
  if (!details) return [];

  const rawRows = Array.isArray(details)
    ? details
    : Array.isArray(details?.questions)
      ? details.questions
      : [];

  return rawRows
    .map((row: any) => ({
      enonce: String(row?.enonce ?? row?.question ?? "Question"),
      reponseEleve: String(row?.reponseEleve ?? row?.reponse_eleve ?? row?.studentAnswer ?? "-"),
      reponseCorrecte: String(row?.reponseCorrecte ?? row?.reponse_correcte ?? row?.correctAnswer ?? "-"),
      correct: typeof row?.correct === "boolean" ? row.correct : null,
    }))
    .filter((row: QuestionDetail) => row.enonce.trim().length > 0);
};

const getModuleTitle = (completion: ModuleCompletion) => {
  const first = Array.isArray(completion.details) ? completion.details[0] : null;
  if (first?.exerciceTitre) return String(first.exerciceTitre);
  return `Module ${completion.module_id}`;
};

const computeSessionLabel = (
  apprenantId: string,
  completedAt: string,
  sessionsMap: Record<string, SessionAssignment[]>,
) => {
  const sessions = sessionsMap[apprenantId] || [];
  if (sessions.length === 0) return DEFAULT_SESSION_LABEL;

  const attemptDate = toDate(completedAt);
  if (!attemptDate) {
    return sessions[0]?.session_nom || DEFAULT_SESSION_LABEL;
  }

  const inRange = sessions.find((session) => {
    const start = toDate(session.session_date_debut);
    const end = toDate(session.session_date_fin);
    if (!start || !end) return false;
    return attemptDate >= start && attemptDate <= end;
  });

  if (inRange?.session_nom) return inRange.session_nom;

  const sortedByStart = [...sessions].sort((a, b) => {
    const aDate = toDate(a.session_date_debut)?.getTime() || 0;
    const bDate = toDate(b.session_date_debut)?.getTime() || 0;
    return bDate - aDate;
  });

  return sortedByStart[0]?.session_nom || DEFAULT_SESSION_LABEL;
};

export function FormateurResultsTab({ token }: Props) {
  const [loading, setLoading] = useState(true);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [completions, setCompletions] = useState<ModuleCompletion[]>([]);
  const [apprenants, setApprenants] = useState<Apprenant[]>([]);
  const [sessionAssignments, setSessionAssignments] = useState<SessionAssignment[]>([]);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [expandedAttempt, setExpandedAttempt] = useState<string | null>(null);
  const [filterFormation, setFilterFormation] = useState<string>("all");
  const [filterSession, setFilterSession] = useState<string>("all");

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("get-formateur-results", {
          body: { token },
        });
        if (error) throw error;

        setQuizResults((data?.quizResults || []) as QuizResult[]);
        setCompletions((data?.completions || []) as ModuleCompletion[]);
        setApprenants((data?.apprenants || []) as Apprenant[]);
        setSessionAssignments((data?.sessionAssignments || []) as SessionAssignment[]);
      } catch (err) {
        console.error("Erreur chargement résultats:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [token]);

  const sessionsMap = useMemo(() => {
    return sessionAssignments.reduce<Record<string, SessionAssignment[]>>((acc, row) => {
      if (!acc[row.apprenant_id]) acc[row.apprenant_id] = [];
      acc[row.apprenant_id].push(row);
      return acc;
    }, {});
  }, [sessionAssignments]);

  const attempts = useMemo<UnifiedAttempt[]>(() => {
    const quizAttempts: UnifiedAttempt[] = quizResults.map((q, idx) => ({
      id: `quiz-${q.quiz_id}-${q.apprenant_id}-${q.completed_at}-${idx}`,
      apprenant_id: q.apprenant_id,
      titre: q.quiz_titre,
      matiere: q.matiere_nom || q.quiz_type || "Quiz",
      source: "quiz",
      score_obtenu: Number(q.score_obtenu || 0),
      score_max: Number(q.score_max || 0),
      note_sur_20: q.note_sur_20,
      reussi: q.reussi,
      completed_at: q.completed_at,
      details: q.details,
      sessionLabel: computeSessionLabel(q.apprenant_id, q.completed_at, sessionsMap),
    }));

    const moduleAttempts: UnifiedAttempt[] = completions.map((c, idx) => {
      const scoreObtenu = Number(c.score_obtenu || 0);
      const scoreMax = Number(c.score_max || 0);
      const noteSur20 = scoreMax > 0 ? (scoreObtenu / scoreMax) * 20 : null;
      const percent = scoreMax > 0 ? (scoreObtenu / scoreMax) * 100 : 0;

      return {
        id: `module-${c.module_id}-${c.apprenant_id}-${c.completed_at}-${idx}`,
        apprenant_id: c.apprenant_id,
        titre: getModuleTitle(c),
        matiere: "Exercice module",
        source: "module",
        score_obtenu: scoreObtenu,
        score_max: scoreMax,
        note_sur_20: noteSur20,
        reussi: percent >= 60,
        completed_at: c.completed_at,
        details: c.details,
        sessionLabel: computeSessionLabel(c.apprenant_id, c.completed_at, sessionsMap),
      };
    });

    return [...quizAttempts, ...moduleAttempts].sort(
      (a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime(),
    );
  }, [quizResults, completions, sessionsMap]);

  const rankedStudents = useMemo<RankedStudent[]>(() => {
    const byStudent: Record<string, UnifiedAttempt[]> = {};
    attempts.forEach((attempt) => {
      if (!byStudent[attempt.apprenant_id]) byStudent[attempt.apprenant_id] = [];
      byStudent[attempt.apprenant_id].push(attempt);
    });

    return Object.entries(byStudent)
      .map(([id, studentAttempts]) => {
        const a = apprenants.find((apprenant) => apprenant.id === id);
        const totalCorrect = studentAttempts.reduce((sum, result) => sum + result.score_obtenu, 0);
        const totalQuestions = studentAttempts.reduce((sum, result) => sum + result.score_max, 0);
        const averageScore = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
        const bestScore = studentAttempts.reduce((best, result) => {
          const pct = result.score_max > 0 ? (result.score_obtenu / result.score_max) * 100 : 0;
          return Math.max(best, pct);
        }, 0);

        const sessions = Array.from(new Set(studentAttempts.map((attempt) => attempt.sessionLabel)));

        return {
          id,
          nom: a?.nom || "Inconnu",
          prenom: a?.prenom || "",
          formation: a?.type_apprenant || a?.formation_choisie || "-",
          totalAttempts: studentAttempts.length,
          averageScore,
          bestScore,
          totalCorrect,
          totalQuestions,
          sessions,
          attempts: studentAttempts,
        };
      })
      .sort((a, b) => b.averageScore - a.averageScore);
  }, [attempts, apprenants]);

  const formations = useMemo(() => {
    return Array.from(new Set(rankedStudents.map((s) => s.formation).filter((f) => f !== "-"))).sort();
  }, [rankedStudents]);

  const sessions = useMemo(() => {
    return Array.from(new Set(attempts.map((a) => a.sessionLabel))).sort();
  }, [attempts]);

  const filteredStudents = useMemo(() => {
    return rankedStudents.filter((student) => {
      const formationOk = filterFormation === "all" || student.formation === filterFormation;
      const sessionOk =
        filterSession === "all" ||
        student.attempts.some((attempt) => attempt.sessionLabel === filterSession);

      return formationOk && sessionOk;
    });
  }, [rankedStudents, filterFormation, filterSession]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Chargement des résultats...</span>
      </div>
    );
  }

  const getMedalIcon = (rank: number) => {
    if (rank === 0) return <Trophy className="w-5 h-5 text-primary" />;
    if (rank === 1 || rank === 2) return <Medal className="w-5 h-5 text-muted-foreground" />;
    return <span className="w-5 h-5 flex items-center justify-center text-xs font-bold text-muted-foreground">{rank + 1}</span>;
  };

  const scoreVariant = (pct: number): "default" | "secondary" | "destructive" => {
    if (pct >= 80) return "default";
    if (pct >= 60) return "secondary";
    return "destructive";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-2 border-b gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <GraduationCap className="w-5 h-5 text-primary" />
          <div>
            <h2 className="text-xl font-semibold">Résultats détaillés (élève + session)</h2>
            <p className="text-sm text-muted-foreground">
              {filteredStudents.length} élève{filteredStudents.length > 1 ? "s" : ""} — {attempts.length} tentative{attempts.length > 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {formations.length > 0 && (
            <select
              value={filterFormation}
              onChange={(e) => setFilterFormation(e.target.value)}
              className="text-sm border rounded-lg px-3 py-1.5 bg-background"
            >
              <option value="all">Toutes les formations</option>
              {formations.map((f) => (
                <option key={f} value={f}>{f.toUpperCase()}</option>
              ))}
            </select>
          )}

          {sessions.length > 0 && (
            <select
              value={filterSession}
              onChange={(e) => setFilterSession(e.target.value)}
              className="text-sm border rounded-lg px-3 py-1.5 bg-background"
            >
              <option value="all">Toutes les sessions</option>
              {sessions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {filteredStudents.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Élèves", value: filteredStudents.length, icon: User },
            { label: "Tentatives", value: filteredStudents.reduce((sum, st) => sum + st.totalAttempts, 0), icon: BarChart3 },
            {
              label: "Moyenne générale",
              value: `${Math.round(filteredStudents.reduce((sum, st) => sum + st.averageScore, 0) / filteredStudents.length)}%`,
              icon: GraduationCap,
            },
            {
              label: "Sessions couvertes",
              value: new Set(filteredStudents.flatMap((st) => st.sessions)).size,
              icon: CalendarDays,
            },
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

      {filteredStudents.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Aucun résultat enregistré pour ce filtre.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              Classement général
            </CardTitle>
            <CardDescription>Cliquer sur un élève pour voir ses résultats par session et le détail des questions</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <div className="divide-y">
              {filteredStudents.map((student, rank) => {
                const isExpanded = expandedStudent === student.id;
                return (
                  <div key={student.id}>
                    <button
                      onClick={() => {
                        setExpandedStudent(isExpanded ? null : student.id);
                        if (isExpanded) setExpandedAttempt(null);
                      }}
                      className="w-full flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors text-left"
                    >
                      <div className="w-8 flex items-center justify-center shrink-0">
                        {getMedalIcon(rank)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{student.prenom} {student.nom}</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{student.formation.toUpperCase()}</Badge>
                          {student.sessions.slice(0, 2).map((session) => (
                            <Badge key={session} variant="secondary" className="text-[10px] px-1.5 py-0">
                              {session}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {student.totalAttempts} tentative{student.totalAttempts > 1 ? "s" : ""} — {student.totalCorrect}/{student.totalQuestions} réponses justes
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <span className="text-lg font-bold">{Math.round(student.averageScore)}%</span>
                          <p className="text-[10px] text-muted-foreground">moyenne</p>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-5 pb-4 bg-muted/10 animate-fade-in">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm mt-2">
                            <thead>
                              <tr className="border-b text-muted-foreground text-xs">
                                <th className="text-left pb-2 pr-3 font-medium">Session</th>
                                <th className="text-left pb-2 pr-3 font-medium">Exercice / Quiz</th>
                                <th className="text-center pb-2 pr-3 font-medium">Score</th>
                                <th className="text-center pb-2 pr-3 font-medium">%</th>
                                <th className="text-center pb-2 pr-3 font-medium">Note /20</th>
                                <th className="text-center pb-2 pr-3 font-medium">Détails</th>
                                <th className="text-left pb-2 font-medium">Date</th>
                              </tr>
                            </thead>
                            <tbody>
                              {student.attempts
                                .filter((attempt) => filterSession === "all" || attempt.sessionLabel === filterSession)
                                .map((attempt) => {
                                  const pct = attempt.score_max > 0 ? Math.round((attempt.score_obtenu / attempt.score_max) * 100) : 0;
                                  const details = extractQuestionDetails(attempt.details);
                                  const detailsId = `${student.id}-${attempt.id}`;
                                  const isAttemptExpanded = expandedAttempt === detailsId;

                                  return (
                                    <Fragment key={attempt.id}>
                                      <tr key={attempt.id} className="border-b">
                                        <td className="py-2 pr-3 text-xs">{attempt.sessionLabel}</td>
                                        <td className="py-2 pr-3 text-xs max-w-[260px] truncate font-medium">
                                          <span className="mr-2">{attempt.titre}</span>
                                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                            {attempt.source === "quiz" ? "Quiz" : "Module"}
                                          </Badge>
                                        </td>
                                        <td className="py-2 pr-3 text-center font-semibold">{attempt.score_obtenu}/{attempt.score_max}</td>
                                        <td className="py-2 pr-3 text-center">
                                          <Badge variant={scoreVariant(pct)}>{pct}%</Badge>
                                        </td>
                                        <td className="py-2 pr-3 text-center">
                                          {attempt.note_sur_20 != null ? Number(attempt.note_sur_20).toFixed(1) : "-"}
                                        </td>
                                        <td className="py-2 pr-3 text-center">
                                          {details.length > 0 ? (
                                            <Button
                                              type="button"
                                              variant="outline"
                                              size="sm"
                                              className="h-7 px-2 text-xs"
                                              onClick={() => setExpandedAttempt(isAttemptExpanded ? null : detailsId)}
                                            >
                                              <ListChecks className="w-3 h-3 mr-1" />
                                              {isAttemptExpanded ? "Masquer" : `Voir (${details.length})`}
                                            </Button>
                                          ) : (
                                            <span className="text-xs text-muted-foreground">-</span>
                                          )}
                                        </td>
                                        <td className="py-2 text-xs text-muted-foreground">
                                          {new Date(attempt.completed_at).toLocaleDateString("fr-FR")}
                                        </td>
                                      </tr>

                                      {isAttemptExpanded && details.length > 0 && (
                                        <tr className="border-b bg-background/60">
                                          <td colSpan={7} className="p-3">
                                            <div className="space-y-2">
                                              {details.map((detail, idx) => (
                                                <div key={`${attempt.id}-q-${idx}`} className="rounded-md border p-2 text-xs space-y-1">
                                                  <p className="font-medium">Q{idx + 1}. {detail.enonce}</p>
                                                  <p>Réponse élève : <span className="font-medium">{detail.reponseEleve}</span></p>
                                                  <p>Bonne réponse : <span className="font-medium">{detail.reponseCorrecte}</span></p>
                                                  <Badge
                                                    variant={
                                                      detail.correct == null
                                                        ? "outline"
                                                        : detail.correct
                                                          ? "default"
                                                          : "destructive"
                                                    }
                                                  >
                                                    {detail.correct == null ? "Non évaluée" : detail.correct ? "Correcte" : "Incorrecte"}
                                                  </Badge>
                                                </div>
                                              ))}
                                            </div>
                                          </td>
                                        </tr>
                                      )}
                                    </>
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
