import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, CheckCircle2, XCircle, Trophy, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { tousLesExamens, type ExamenBlanc, type Matiere } from "@/components/cours-en-ligne/examens-blancs-data";
import { loadSavedExamens } from "@/components/cours-en-ligne/ExamensBlancsEditor";
import { buildExamenMap } from "@/components/cours-en-ligne/exam-helpers";
import {
  buildMatiereLookupKeys,
  findScoreForMatiere,
  normalizeNoteSur20,
  recoverCorruptedScoreRow,
  selectLatestAttemptRows,
  toFiniteNumber,
} from "@/components/cours-en-ligne/examens-blancs-utils";
import { computeMatiereScore, computeMoyenneExamen } from "@/components/cours-en-ligne/examens-blancs-scoring";
import type { ExamScoreItem } from "@/components/cours-en-ligne/examens-blancs-types";

interface ResultatsApprenantTabProps {
  apprenantId: string;
}

export function ResultatsApprenantTab({ apprenantId }: ResultatsApprenantTabProps) {
  const [examensData, setExamensData] = useState<ExamenBlanc[]>(tousLesExamens);
  const [examScores, setExamScores] = useState<Record<string, ExamScoreItem[]>>({});
  const [bilans, setBilans] = useState<Record<string, string>>({});
  const [quizResults, setQuizResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!apprenantId) return;
    let cancelled = false;
    setLoading(true);

    (async () => {
      // 1) Merge source + DB overrides (same as learner side)
      let merged = tousLesExamens;
      try {
        const saved = await loadSavedExamens();
        const map = buildExamenMap(tousLesExamens, saved);
        merged = tousLesExamens.map((e) => map[e.id] || e);
      } catch (e) {
        console.warn("[Admin][Résultats] loadSavedExamens failed:", e);
      }
      if (cancelled) return;
      setExamensData(merged);

      // 2) Fetch all quiz results + bilans in parallel
      const [scoresRes, bilansRes, exercicesRes] = await Promise.all([
        supabase
          .from("apprenant_quiz_results" as any)
          .select("id, quiz_id, quiz_titre, matiere_id, matiere_nom, note_sur_20, score_obtenu, score_max, quiz_type, tentative, completed_at, created_at, details")
          .eq("apprenant_id", apprenantId)
          .eq("quiz_type", "examen_blanc")
          .order("completed_at", { ascending: false })
          .order("created_at", { ascending: false }),
        supabase
          .from("apprenant_documents_completes")
          .select("titre, donnees, completed_at")
          .eq("apprenant_id", apprenantId)
          .eq("type_document", "bilan_examen_blanc")
          .order("completed_at", { ascending: false }),
        supabase
          .from("apprenant_quiz_results")
          .select("quiz_id, quiz_titre, note_sur_20, score_obtenu, score_max, quiz_type, completed_at")
          .eq("apprenant_id", apprenantId)
          .neq("quiz_type", "examen_blanc")
          .neq("quiz_type", "examen_blanc_taxi")
          .neq("quiz_type", "revision_fausses")
          .order("completed_at", { ascending: false }),
      ]);

      if (cancelled) return;

      // 3) Group examen_blanc rows by quiz_id, keep only latest attempt per matiere
      const rowsByQuiz = new Map<string, any[]>();
      ((scoresRes.data as any[]) || []).forEach((r) => {
        if (!r?.quiz_id) return;
        if (!rowsByQuiz.has(r.quiz_id)) rowsByQuiz.set(r.quiz_id, []);
        rowsByQuiz.get(r.quiz_id)!.push(r);
      });

      const scoresByQuiz: Record<string, ExamScoreItem[]> = {};
      rowsByQuiz.forEach((rows, quizId) => {
        const latest = selectLatestAttemptRows(rows);
        scoresByQuiz[quizId] = latest.map((r: any) => {
          const recovered = recoverCorruptedScoreRow(r, merged);
          const src = recovered && recovered.score_obtenu > toFiniteNumber(r.score_obtenu, 0)
            ? { ...r, ...recovered } : r;
          return {
            matiere_id: src.matiere_id,
            matiere_nom: src.matiere_nom,
            note_sur_20: normalizeNoteSur20(src.score_obtenu, src.score_max, src.note_sur_20),
            score_obtenu: toFiniteNumber(src.score_obtenu, 0),
            score_max: toFiniteNumber(src.score_max, 0),
            completed_at: src.completed_at,
            created_at: src.created_at,
            lookupKeys: buildMatiereLookupKeys(src.matiere_id, src.matiere_nom),
            reponses: r?.details?.reponses ?? null,
            correctionsIA: r?.details?.correctionsIA ?? null,
          } as ExamScoreItem;
        });
      });

      setExamScores(scoresByQuiz);

      // 4) Bilans
      const bilansMap: Record<string, string> = {};
      ((bilansRes.data as any[]) || []).forEach((b: any) => {
        if (b.titre && b.donnees?.bilan) bilansMap[b.titre] = b.donnees.bilan;
      });
      setBilans(bilansMap);

      // 5) Exercices simples
      setQuizResults((exercicesRes.data as any[]) || []);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [apprenantId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  // Only exams with at least one score row
  const completedExams = examensData
    .filter((e) => (examScores[e.id] || []).length > 0)
    .sort((a, b) => a.id.localeCompare(b.id));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Examens blancs ({completedExams.length} réalisé{completedExams.length > 1 ? "s" : ""})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {completedExams.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucun examen blanc réalisé pour le moment.</p>
          ) : (
            completedExams.map((examen) => {
              const scores = examScores[examen.id] || [];

              // SAME helper as learner side → moyenne pondérée par coefficient
              const bilan = computeMoyenneExamen(examen, (m: Matiere) => {
                const scoreData = findScoreForMatiere(scores, m);
                if (!scoreData) return null;
                return computeMatiereScore(
                  m,
                  (scoreData as any).reponses,
                  scoreData.score_obtenu,
                  scoreData.score_max,
                  scoreData.correctionsIA,
                );
              });

              const isReussi = bilan.admisGlobal;
              const bilanText = bilans[examen.id];

              return (
                <div key={examen.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm">{examen.titre}</h4>
                      <Badge variant={isReussi ? "default" : "destructive"} className="text-xs">
                        {isReussi ? "Réussi ✅" : "Échoué ❌"}
                      </Badge>
                    </div>
                    <span className={`text-lg font-bold ${isReussi ? "text-green-600" : "text-red-500"}`}>
                      {bilan.moyenne.toFixed(1)}/20
                    </span>
                  </div>

                  {bilan.eliminatoires.length > 0 && (
                    <p className="text-xs text-red-600 font-medium">
                      ⚠ Note éliminatoire en : {bilan.eliminatoires.join(", ")}
                    </p>
                  )}

                  {/* Notes par matière (avec coefficient) */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {examen.matieres.map((m) => {
                      const scoreData = findScoreForMatiere(scores, m);
                      const score = scoreData
                        ? computeMatiereScore(m, (scoreData as any).reponses, scoreData.score_obtenu, scoreData.score_max, scoreData.correctionsIA)
                        : null;
                      const label = (m.nom || m.id || "?").split(" - ")[0];
                      if (!score) {
                        return (
                          <div key={m.id} className="flex justify-between text-xs border rounded px-2 py-1 opacity-60">
                            <span className="truncate pr-1">{label} <span className="text-muted-foreground">(coef {m.coefficient || 1})</span></span>
                            <span className="shrink-0 text-muted-foreground">—</span>
                          </div>
                        );
                      }
                      return (
                        <div key={m.id} className="flex justify-between text-xs border rounded px-2 py-1">
                          <span className="truncate pr-1">
                            {label} <span className="text-muted-foreground">(coef {m.coefficient || 1})</span>
                          </span>
                          <span className={`font-bold shrink-0 ${score.admis ? "text-green-600" : "text-red-500"}`}>
                            {score.noteSur20.toFixed(1)}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {bilanText && (
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mt-2">
                      <div className="flex items-center gap-2 mb-2">
                        <Bot className="w-4 h-4 text-primary" />
                        <span className="text-xs font-semibold text-primary">Bilan automatique</span>
                      </div>
                      <p className="text-xs whitespace-pre-wrap leading-relaxed text-muted-foreground">{bilanText}</p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {quizResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Quiz et exercices ({quizResults.length} résultat{quizResults.length > 1 ? "s" : ""})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {quizResults.slice(0, 50).map((s: any, i: number) => {
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
