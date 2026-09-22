import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, Bot, CheckCircle2, XCircle, Trophy, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { loadSavedExamens } from "@/components/cours-en-ligne/ExamensBlancsEditor";
import { computeMoyenneExamen, computeMatiereScoreForAttempt } from "@/components/cours-en-ligne/examens-blancs-scoring";
import { findScoreForMatiere, buildMatiereLookupKeys } from "@/components/cours-en-ligne/examens-blancs-utils";
import { isExamAttemptPublicationPending, excludeResultPlaceholders, mergePassageSiblingRows } from "@/components/cours-en-ligne/exam-helpers";
import { isSnapshotOutdated, findSnapshotWrongExamSource } from "@/components/cours-en-ligne/exam-content-integrity";

interface ResultatsApprenantTabProps {
  apprenantId: string;
}

export function ResultatsApprenantTab({ apprenantId }: ResultatsApprenantTabProps) {
  const [examScores, setExamScores] = useState<any[]>([]);
  const [bilans, setBilans] = useState<Record<string, string>>({});
  const [quizResults, setQuizResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // Définitions d'examens réellement en vigueur (base), identiques à l'espace apprenant
  // AUCUN REPLI STATIQUE : tant que la version active n'est pas chargée, rien n'est comparé.
  const [liveExamens, setLiveExamens] = useState<any[]>([]);
  const [liveExamensError, setLiveExamensError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadSavedExamens()
      .then((rows) => { if (!cancelled && Array.isArray(rows) && rows.length) setLiveExamens(rows as any[]); })
      .catch(() => { if (!cancelled) setLiveExamensError(true); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!apprenantId) return;
    setLoading(true);

    Promise.all([
      // Exam blanc scores
      supabase
        .from("apprenant_quiz_results")
        .select("quiz_id, quiz_titre, matiere_id, matiere_nom, note_sur_20, score_obtenu, score_max, quiz_type, completed_at, created_at, details")
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
      if (scoresRes.data) setExamScores(mergePassageSiblingRows(excludeResultPlaceholders(scoresRes.data)) as any[]);
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
          {liveExamensError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
              🔴 Impossible de charger la version officielle des examens. Les notes affichées peuvent être incomplètes. Vérifiez votre connexion puis rechargez la page.
            </div>
          )}
          {sortedExams.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucun examen blanc réalisé pour le moment.</p>
          ) : (
            sortedExams.map(([quizId, exam]) => {
              // Recalcul EN DIRECT à partir des réponses brutes + définition actuelle des
              // questions — strictement le même mécanisme que l'écran apprenant
              // (computeMoyenneExamen / computeMatiereScore), pour ne jamais afficher une
              // note différente de celle que voit l'apprenant.
              const examenDef = liveExamens.find((e: any) => e.id === quizId);
              const scoresWithLookup = exam.matieres.map((m: any) => ({
                ...m,
                lookupKeys: buildMatiereLookupKeys(m.matiere_id, m.matiere_nom),
              }));
              const bilanExamen = examenDef
                ? computeMoyenneExamen(examenDef, (m) => {
                    const row = findScoreForMatiere(scoresWithLookup as any, m);
                    if (!row) return null;
                    return computeMatiereScoreForAttempt(m, row as any);
                  })
                : null;
              const moyenne = bilanExamen?.moyenne ?? 0;
              const isReussi = bilanExamen?.admisGlobal ?? moyenne >= 10;
              const bilan = bilans[quizId];
              // QRC non encore corrigées manuellement : pas de statut définitif.
              // Règle générale : le drapeau `qrc_pending_correction` n'existe que sur
              // les nouveaux résultats → on vérifie AUSSI chaque QRC de la définition
              // d'examen contre les corrections validées manuellement.
               const enAttenteCorrection = isExamAttemptPublicationPending(exam.matieres, examenDef);
               // LECTURE SEULE : signale un passage réalisé sur une version
               // antérieure de l'examen. Aucune note n'est recalculée ni corrigée.
               const versionAnterieure = exam.matieres.some((m: any) => {
                 const snap = m?.details?.snapshot;
                 const def = examenDef?.matieres.find(
                   (md: any) => md.id === m.matiere_id || md.nom === m.matiere_nom,
                 );
                 return isSnapshotOutdated(snap, def as any);
               });
               // LECTURE SEULE : détecte un passage dont le contenu servi
               // correspond exactement à la matière d'un AUTRE numéro d'examen
               // (ex. EB1 servi dans EB2 le 21/09 avant 18h15). Jamais de recalcul.
               let mauvaisExam: { sourceExamenTitre: string; sourceExamenNumero: number | null } | null = null;
               for (const m of exam.matieres as any[]) {
                 const found = findSnapshotWrongExamSource(
                   m?.details?.snapshot,
                   m?.matiere_id,
                   m?.matiere_nom,
                   examenDef as any,
                   liveExamens as any,
                 );
                 if (found) { mauvaisExam = found; break; }
               }

              return (
                <div key={quizId} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm">{exam.titre}</h4>
                      {enAttenteCorrection ? (
                        <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700">
                          ⏳ En attente de correction
                        </Badge>
                      ) : (
                        <Badge variant={isReussi ? "default" : "destructive"} className="text-xs">
                          {isReussi ? "Réussi ✅" : "Échoué ❌"}
                        </Badge>
                      )}
                      {versionAnterieure && !mauvaisExam && (
                        <Badge variant="outline" className="text-xs border-amber-400 text-amber-700">
                          ⚠️ Version antérieure de l'examen
                        </Badge>
                      )}
                      {mauvaisExam && (
                        <Badge variant="destructive" className="text-xs">
                          ⚠️ PASSAGE EFFECTUÉ SUR UNE VERSION ERRONÉE DE L'EXAMEN — contenu {mauvaisExam.sourceExamenNumero != null ? `EB${mauvaisExam.sourceExamenNumero}` : mauvaisExam.sourceExamenTitre} servi dans cet examen
                        </Badge>
                      )}
                    </div>
                    {enAttenteCorrection ? (
                      <span className="text-sm font-semibold text-amber-600">Note en attente</span>
                    ) : (
                      <span className={`text-lg font-bold ${isReussi ? "text-green-600" : "text-red-500"}`}>
                        {moyenne.toFixed(1)}/20
                      </span>
                    )}

                  </div>

                  {/* Notes par matière */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {exam.matieres.map((m: any, i: number) => {
                      const matiereDef = examenDef?.matieres.find(
                        (md) => md.id === m.matiere_id || md.nom === m.matiere_nom,
                      );
                      const recomputed = matiereDef
                        ? computeMatiereScoreForAttempt(matiereDef, m as any)
                        : null;
                      const note = recomputed?.noteSur20 ?? (Number(m.note_sur_20) || 0);
                      return (
                        <div key={i} className="flex justify-between text-xs border rounded px-2 py-1">
                          <span className="truncate pr-1">{(m.matiere_nom || m.matiere_id || "?").split(" - ")[0]}</span>
                           {enAttenteCorrection ? (
                            <span className="font-semibold shrink-0 text-amber-600">⏳</span>
                          ) : (
                            <span className={`font-bold shrink-0 ${note >= 10 ? "text-green-600" : "text-red-500"}`}>
                              {note.toFixed(1)}
                            </span>
                          )}
                        </div>
                      );

                    })}
                  </div>

                  {/* Bilan auto */}
                   {bilan && !enAttenteCorrection && (
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
