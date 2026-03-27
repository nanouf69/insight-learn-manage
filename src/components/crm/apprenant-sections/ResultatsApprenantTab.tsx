import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, Bot, CheckCircle2, XCircle, Trophy, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ResultatsApprenantTabProps {
  apprenantId: string;
}

export function ResultatsApprenantTab({ apprenantId }: ResultatsApprenantTabProps) {
  const [examScores, setExamScores] = useState<any[]>([]);
  const [bilans, setBilans] = useState<Record<string, string>>({});
  const [quizResults, setQuizResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!apprenantId) return;
    setLoading(true);

    Promise.all([
      // Exam blanc scores
      supabase
        .from("apprenant_quiz_results")
        .select("quiz_id, quiz_titre, matiere_id, matiere_nom, note_sur_20, score_obtenu, score_max, quiz_type, completed_at, created_at")
        .eq("apprenant_id", apprenantId)
        .order("completed_at", { ascending: false }),
      // Bilans
      supabase
        .from("apprenant_documents_completes")
        .select("titre, donnees, completed_at")
        .eq("apprenant_id", apprenantId)
        .eq("type_document", "bilan_examen_blanc")
        .order("completed_at", { ascending: false }),
    ]).then(([scoresRes, bilansRes]) => {
      if (scoresRes.data) setExamScores(scoresRes.data as any[]);
      if (bilansRes.data) {
        const map: Record<string, string> = {};
        (bilansRes.data as any[]).forEach((b: any) => {
          if (b.titre && b.donnees?.bilan) map[b.titre] = b.donnees.bilan;
        });
        setBilans(map);
      }
      setLoading(false);
    });
  }, [apprenantId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  // Group exam scores by quiz_id
  const examBlancsScores = examScores.filter(s => s.quiz_type === "examen_blanc" || s.quiz_type === "examen_blanc_taxi");
  const exerciceScores = examScores.filter(s => s.quiz_type !== "examen_blanc" && s.quiz_type !== "examen_blanc_taxi" && s.quiz_type !== "revision_fausses");

  // Group by quiz_id, keeping latest per matiere
  const examsByQuiz = new Map<string, { titre: string; matieres: any[]; completedAt: string }>();
  examBlancsScores.forEach((s: any) => {
    const key = s.quiz_id;
    if (!examsByQuiz.has(key)) {
      examsByQuiz.set(key, { titre: s.quiz_titre || key, matieres: [], completedAt: s.completed_at });
    }
    const entry = examsByQuiz.get(key)!;
    // Only keep latest per matiere
    const existing = entry.matieres.find((m: any) => m.matiere_id === s.matiere_id);
    if (!existing || new Date(s.completed_at) > new Date(existing.completed_at)) {
      if (existing) {
        entry.matieres = entry.matieres.filter((m: any) => m.matiere_id !== s.matiere_id);
      }
      entry.matieres.push(s);
    }
  });

  const sortedExams = Array.from(examsByQuiz.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div className="space-y-6">
      {/* Examens blancs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Examens blancs ({sortedExams.length} réalisé{sortedExams.length > 1 ? "s" : ""})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {sortedExams.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucun examen blanc réalisé pour le moment.</p>
          ) : (
            sortedExams.map(([quizId, exam]) => {
              // Compute weighted average (equal weight without exam definition)
              const notes = exam.matieres.map((m: any) => Number(m.note_sur_20) || 0);
              const moyenne = notes.length > 0 ? Math.round((notes.reduce((a: number, b: number) => a + b, 0) / notes.length) * 10) / 10 : 0;
              const isReussi = moyenne >= 10;
              const bilan = bilans[quizId];

              return (
                <div key={quizId} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm">{exam.titre}</h4>
                      <Badge variant={isReussi ? "default" : "destructive"} className="text-xs">
                        {isReussi ? "Réussi ✅" : "Échoué ❌"}
                      </Badge>
                    </div>
                    <span className={`text-lg font-bold ${isReussi ? "text-green-600" : "text-red-500"}`}>
                      {moyenne.toFixed(1)}/20
                    </span>
                  </div>

                  {/* Notes par matière */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {exam.matieres.map((m: any, i: number) => {
                      const note = Number(m.note_sur_20) || 0;
                      return (
                        <div key={i} className="flex justify-between text-xs border rounded px-2 py-1">
                          <span className="truncate pr-1">{(m.matiere_nom || m.matiere_id || "?").split(" - ")[0]}</span>
                          <span className={`font-bold shrink-0 ${note >= 10 ? "text-green-600" : "text-red-500"}`}>
                            {note.toFixed(1)}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Bilan auto */}
                  {bilan && (
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mt-2">
                      <div className="flex items-center gap-2 mb-2">
                        <Bot className="w-4 h-4 text-primary" />
                        <span className="text-xs font-semibold text-primary">Bilan automatique</span>
                      </div>
                      <p className="text-xs whitespace-pre-wrap leading-relaxed text-muted-foreground">{bilan}</p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Quiz et exercices */}
      {exerciceScores.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Quiz et exercices ({exerciceScores.length} résultat{exerciceScores.length > 1 ? "s" : ""})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {exerciceScores.slice(0, 50).map((s: any, i: number) => {
                const note = Number(s.note_sur_20) || 0;
                return (
                  <div key={i} className="flex items-center justify-between text-sm border-b pb-1">
                    <div className="flex items-center gap-2 truncate pr-2">
                      {note >= 10 ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      )}
                      <span className="truncate">{s.quiz_titre || s.quiz_id}</span>
                    </div>
                    <span className={`font-medium shrink-0 ${note >= 10 ? "text-green-600" : "text-red-500"}`}>
                      {note.toFixed(1)}/20
                    </span>
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
