import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChevronRight, Pencil, Trophy, FileText, CheckCircle2, XCircle, AlertTriangle, BookOpen, Clock, Pause, Play } from "lucide-react";
import { tousLesExamens, getPointsParQuestion, type ExamenBlanc, type Matiere, type Question } from "./examens-blancs-data";
import { supabase } from "@/integrations/supabase/client";
import type { ExamScoreItem } from "./examens-blancs-types";
import {
  safeStr, safeArray, toFiniteNumber, toTimestamp, clamp,
  normalizeNoteSur20, normalizeMatiereLookupValue,
  buildMatiereLookupKeys, getMatiereCanonicalKey, shareLookupKey,
  pickBestScoreRow, recoverCorruptedScoreRow, findScoreForMatiere,
  computeAdmisForMatiere,
} from "./examens-blancs-utils";

function EcranSelection({ onStart, onEdit, onViewResults, defaultBilanId, apprenantType, examensData, apprenantId, isAdmin, refreshKey, pausedExamIds, onPauseToggle }: { onStart: (examen: ExamenBlanc) => void; onEdit: () => void; onViewResults: (examen: ExamenBlanc) => void; defaultBilanId?: string | null; apprenantType?: string | null; examensData: ExamenBlanc[]; apprenantId?: string | null; isAdmin?: boolean; refreshKey?: number; pausedExamIds?: Set<string>; onPauseToggle?: (examId: string) => void }) {
  // Determine the forced exam type from the student's formation type
  const forcedType = (() => {
    if (!apprenantType) return null;
    const t = apprenantType.replace(/-e$/i, "").toUpperCase();
    if (["TAXI", "VTC", "TA", "VA"].includes(t)) return t as "TAXI" | "VTC" | "TA" | "VA";
    return null;
  })();

  const [typeFiltre, setTypeFiltre] = useState<"tous" | "TAXI" | "VTC" | "TA" | "VA">(forcedType || "tous");
  const [completedExamIds, setCompletedExamIds] = useState<Set<string>>(new Set());
  const [startedNotFinishedIds, setStartedNotFinishedIds] = useState<Set<string>>(new Set());
  const [examScores, setExamScores] = useState<Record<string, ExamScoreItem[]>>({});
  const [previousExamAverages, setPreviousExamAverages] = useState<Record<string, number | null>>({});

  // Fetch completed exams with scores from DB + started-but-not-finished
  useEffect(() => {
    if (!apprenantId) return;

    // 1) Fetch completed results
    supabase
      .from("apprenant_quiz_results" as any)
      .select("id, quiz_id, matiere_id, matiere_nom, note_sur_20, score_obtenu, score_max, completed_at, created_at, details")
      .eq("apprenant_id", apprenantId)
      .eq("quiz_type", "examen_blanc")
      .order("completed_at", { ascending: false })
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) {
          const latestByQuizMatiere = new Map<string, any>();
          (data as any[]).forEach((r: any) => {
            const canonicalMatiereKey = getMatiereCanonicalKey(r.matiere_id, r.matiere_nom);
            const key = `${r.quiz_id}::${canonicalMatiereKey}`;
            const prev = latestByQuizMatiere.get(key);
            latestByQuizMatiere.set(key, pickBestScoreRow(prev, r));
          });

          const latestRows = Array.from(latestByQuizMatiere.values());
          const completedIds = new Set<string>();
          const rowsByQuiz = new Map<string, any[]>();

          latestRows.forEach((row: any) => {
            const quizId = row?.quiz_id;
            if (!quizId) return;
            if (!rowsByQuiz.has(quizId)) rowsByQuiz.set(quizId, []);
            rowsByQuiz.get(quizId)!.push(row);
          });

          rowsByQuiz.forEach((rows, quizId) => {
            const examDef = examensData.find((e) => e.id === quizId);
            const validMatieres = (examDef?.matieres || []).filter((m): m is Matiere => Boolean(m));
            const requiredMatieres = Math.max(validMatieres.length || 1, 1);

            const doneLookupKeys = new Set<string>();
            rows.forEach((row: any) => {
              buildMatiereLookupKeys(row?.matiere_id, row?.matiere_nom).forEach((key) => doneLookupKeys.add(key));
            });

            const completedMatiereCount = validMatieres.filter((matiere) =>
              buildMatiereLookupKeys(matiere.id, matiere.nom).some((key) => doneLookupKeys.has(key))
            ).length;

            const fallbackCompleted = rows.length >= requiredMatieres && completedMatiereCount >= Math.max(requiredMatieres - 1, 0);
            if (completedMatiereCount >= requiredMatieres || fallbackCompleted) {
              completedIds.add(quizId);
            }
          });

          setCompletedExamIds(completedIds);

          const scores: Record<string, ExamScoreItem[]> = {};
          latestRows.forEach((r: any) => {
            const recovered = recoverCorruptedScoreRow(r, examensData);
            const scoreSource = recovered && recovered.score_obtenu > toFiniteNumber(r.score_obtenu, 0)
              ? { ...r, ...recovered }
              : r;

            if (!scores[r.quiz_id]) scores[r.quiz_id] = [];
            scores[r.quiz_id].push({
              matiere_id: scoreSource.matiere_id,
              matiere_nom: scoreSource.matiere_nom,
              note_sur_20: normalizeNoteSur20(scoreSource.score_obtenu, scoreSource.score_max, scoreSource.note_sur_20),
              score_obtenu: toFiniteNumber(scoreSource.score_obtenu, 0),
              score_max: toFiniteNumber(scoreSource.score_max, 0),
              completed_at: scoreSource.completed_at,
              created_at: scoreSource.created_at,
              lookupKeys: buildMatiereLookupKeys(scoreSource.matiere_id, scoreSource.matiere_nom),
            });

            if (recovered && recovered.score_obtenu > toFiniteNumber(r.score_obtenu, 0)) {
              console.warn(
                `[ExamensBlancs][Recovery] Score restauré ${r.quiz_id}/${r.matiere_id}: ${r.score_obtenu}/${r.score_max} -> ${recovered.score_obtenu}/${recovered.score_max}`
              );
              // Auto-heal: persist recovered score back to DB (fire-and-forget)
              if (r.id) {
                void supabase
                  .from("apprenant_quiz_results" as any)
                  .update({
                    score_obtenu: recovered.score_obtenu,
                    score_max: recovered.score_max,
                    note_sur_20: recovered.note_sur_20,
                  } as any)
                  .eq("id", r.id)
                  .then(({ error: healErr }) => {
                    if (healErr) console.error("[AutoHeal][Liste] DB update failed:", healErr);
                    else console.log(`[AutoHeal][Liste] Healed ${r.quiz_id}/${r.matiere_id} -> ${recovered.score_obtenu}`);
                  });
              }
            }
          });

          const allRows = data as any[];
          const debugRowsEb1 = allRows.filter((row) => row?.quiz_id === "EB1");
          const debugRowsEb2 = allRows.filter((row) => row?.quiz_id === "EB2");

          console.groupCollapsed(`[ExamensBlancs][RAW Supabase] apprenant=${apprenantId} quiz=EB1 lignes=${debugRowsEb1.length}`);
          console.table(
            debugRowsEb1.map((row, index) => ({
              idx: index + 1,
              quiz_id: row.quiz_id,
              matiere_id_exact: JSON.stringify(row.matiere_id),
              matiere_nom_exact: JSON.stringify(row.matiere_nom),
              score_obtenu: row.score_obtenu,
              score_max: row.score_max,
              note_sur_20: row.note_sur_20,
              canonical_key: getMatiereCanonicalKey(row.matiere_id, row.matiere_nom),
              completed_at: row.completed_at,
              created_at: row.created_at,
            }))
          );

          const sampleC = debugRowsEb1.find((row) => {
            const id = normalizeMatiereLookupValue(row?.matiere_id);
            const nom = safeStr(row?.matiere_nom);
            return id === "securite" || /^\s*c\s*-/i.test(nom);
          });

          const sampleE = debugRowsEb1.find((row) => {
            const id = normalizeMatiereLookupValue(row?.matiere_id);
            const nom = safeStr(row?.matiere_nom);
            return id === "anglais" || /^\s*e\s*-/i.test(nom);
          });

          const sampleAorFvZero = debugRowsEb1.find((row) => {
            const id = normalizeMatiereLookupValue(row?.matiere_id);
            const nom = safeStr(row?.matiere_nom);
            const normalizedNote = normalizeNoteSur20(row?.score_obtenu, row?.score_max, row?.note_sur_20);
            const isAorFv = id === "t3p" || id === "reglementation vtc" || /^\s*a\s*-/i.test(nom) || /^\s*f\(v\)/i.test(nom);
            return isAorFv && normalizedNote === 0;
          });

          console.log("[ExamensBlancs][RAW sample C]", sampleC ? {
            matiere_id_exact: JSON.stringify(sampleC.matiere_id),
            matiere_nom_exact: JSON.stringify(sampleC.matiere_nom),
            note_sur_20: sampleC.note_sur_20,
            score_obtenu: sampleC.score_obtenu,
            score_max: sampleC.score_max,
          } : "Introuvable");

          console.log("[ExamensBlancs][RAW sample E]", sampleE ? {
            matiere_id_exact: JSON.stringify(sampleE.matiere_id),
            matiere_nom_exact: JSON.stringify(sampleE.matiere_nom),
            note_sur_20: sampleE.note_sur_20,
            score_obtenu: sampleE.score_obtenu,
            score_max: sampleE.score_max,
          } : "Introuvable");

          console.log("[ExamensBlancs][RAW sample A/F(V) note=0]", sampleAorFvZero ? {
            matiere_id_exact: JSON.stringify(sampleAorFvZero.matiere_id),
            matiere_nom_exact: JSON.stringify(sampleAorFvZero.matiere_nom),
            note_sur_20: sampleAorFvZero.note_sur_20,
            score_obtenu: sampleAorFvZero.score_obtenu,
            score_max: sampleAorFvZero.score_max,
          } : "Introuvable");

          const latestEb1ByKey = new Map<string, any>();
          debugRowsEb1.forEach((row) => {
            const key = getMatiereCanonicalKey(row?.matiere_id, row?.matiere_nom);
            latestEb1ByKey.set(key, pickBestScoreRow(latestEb1ByKey.get(key), row));
          });

          const latestEb2ByKey = new Map<string, any>();
          debugRowsEb2.forEach((row) => {
            const key = getMatiereCanonicalKey(row?.matiere_id, row?.matiere_nom);
            latestEb2ByKey.set(key, pickBestScoreRow(latestEb2ByKey.get(key), row));
          });

          const comparedKeys = Array.from(new Set([...latestEb1ByKey.keys(), ...latestEb2ByKey.keys()]));
          console.groupCollapsed(`[ExamensBlancs][RAW compare EB1 vs EB2] apprenant=${apprenantId}`);
          console.log("[ExamensBlancs][RAW compare] EB1 matiere_id exacts:", Array.from(new Set(debugRowsEb1.map((r) => JSON.stringify(r?.matiere_id)))));
          console.log("[ExamensBlancs][RAW compare] EB2 matiere_id exacts:", Array.from(new Set(debugRowsEb2.map((r) => JSON.stringify(r?.matiere_id)))));
          console.table(
            comparedKeys.map((key) => {
              const eb1 = latestEb1ByKey.get(key);
              const eb2 = latestEb2ByKey.get(key);
              return {
                canonical_key: key,
                eb1_matiere_id_exact: eb1 ? JSON.stringify(eb1.matiere_id) : null,
                eb1_matiere_nom_exact: eb1 ? JSON.stringify(eb1.matiere_nom) : null,
                eb1_note_sur_20: eb1 ? normalizeNoteSur20(eb1.score_obtenu, eb1.score_max, eb1.note_sur_20).toFixed(1) : null,
                eb2_matiere_id_exact: eb2 ? JSON.stringify(eb2.matiere_id) : null,
                eb2_matiere_nom_exact: eb2 ? JSON.stringify(eb2.matiere_nom) : null,
                eb2_note_sur_20: eb2 ? normalizeNoteSur20(eb2.score_obtenu, eb2.score_max, eb2.note_sur_20).toFixed(1) : null,
              };
            })
          );
          console.groupEnd();

          Object.entries(scores).forEach(([quizId, quizScores]) => {
            const examDef = examensData.find((exam) => exam.id === quizId);
            if (!examDef) return;
            console.groupCollapsed(`[ExamensBlancs][${quizId}] mapping par matière`);
            console.table(
              examDef.matieres.map((matiere) => {
                const matched = findScoreForMatiere(quizScores, matiere);
                return {
                  matiere_attendue_id: matiere.id,
                  matiere_attendue_nom: matiere.nom,
                  lookup_attendu: buildMatiereLookupKeys(matiere.id, matiere.nom).join(" | "),
                  matched_matiere_id: matched?.matiere_id ?? null,
                  matched_matiere_nom: matched?.matiere_nom ?? null,
                  matched_note_sur_20: matched ? matched.note_sur_20.toFixed(1) : null,
                };
              })
            );
            console.groupEnd();
          });
          console.groupEnd();

          setExamScores(scores);

          // Compute previous attempt averages per exam
          const prevAvgs: Record<string, number | null> = {};
          const allRowsByQuiz = new Map<string, any[]>();
          (data as any[]).forEach((r: any) => {
            if (!r.quiz_id) return;
            if (!allRowsByQuiz.has(r.quiz_id)) allRowsByQuiz.set(r.quiz_id, []);
            allRowsByQuiz.get(r.quiz_id)!.push(r);
          });
          allRowsByQuiz.forEach((rows, quizId) => {
            const examDef = examensData.find(e => e.id === quizId);
            if (!examDef) return;
            // Group rows by matiere canonical key, sorted by created_at desc
            const byMatiere = new Map<string, any[]>();
            rows.forEach(r => {
              const key = getMatiereCanonicalKey(r.matiere_id, r.matiere_nom);
              if (!byMatiere.has(key)) byMatiere.set(key, []);
              byMatiere.get(key)!.push(r);
            });
            // For each matiere, sort by created_at desc, find the second row (previous attempt)
            let hasPrev = false;
            let totalCoef = 0;
            let weightedSum = 0;
            examDef.matieres.forEach(m => {
              const mKey = getMatiereCanonicalKey(m.id, m.nom);
              const mRows = byMatiere.get(mKey) || [];
              mRows.sort((a: any, b: any) => toTimestamp(b.created_at) - toTimestamp(a.created_at));
              const coef = m.coefficient || 1;
              totalCoef += coef;
              if (mRows.length >= 2) {
                hasPrev = true;
                const prev = mRows[1];
                const note = normalizeNoteSur20(prev.score_obtenu, prev.score_max, prev.note_sur_20);
                weightedSum += note * coef;
              }
            });
            if (hasPrev && totalCoef > 0) {
              prevAvgs[quizId] = Math.round((weightedSum / totalCoef) * 10) / 10;
            }
          });
          setPreviousExamAverages(prevAvgs);

          // 2) Fetch started-but-not-finished exams from reponses_apprenants
          supabase
            .from("reponses_apprenants" as any)
            .select("exercice_id, completed")
            .eq("apprenant_id", apprenantId)
            .eq("exercice_type", "examen_blanc")
            .then(({ data: repData }) => {
              const started = new Set<string>();
              if (repData) {
                (repData as any[]).forEach((r: any) => {
                  // Started but not finished = has a reponse row but not in completedExamIds
                  if (!completedIds.has(r.exercice_id)) {
                    started.add(r.exercice_id);
                  }
                });
              }
              setStartedNotFinishedIds(started);
            });
        }
      });
  }, [apprenantId, examensData, refreshKey]);

  const examens = examensData.filter(e => {
    const typeOk = typeFiltre === "tous" || e?.type === typeFiltre;
    const isBilan = e.id.startsWith("bilan-");
    return typeOk && !isBilan;
  });

  const examensBlancs = examensData.filter(e => !e.id.startsWith("bilan-") && (typeFiltre === "tous" || e?.type === typeFiltre));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold mb-1">Examens Blancs</h2>
          <p className="text-muted-foreground text-sm">
            {forcedType
              ? `${examensBlancs.length} examens blancs ${forcedType}. Chaque test comporte les matières correspondantes chronométrées.`
              : "24 examens blancs (6 TAXI, 6 VTC, 6 Passerelle TA, 6 Passerelle VA). Chaque test comporte les matières correspondantes chronométrées."
            }
          </p>
        </div>
        {isAdmin && (
          <Button variant="outline" size="sm" onClick={onEdit} className="gap-2 shrink-0">
            <Pencil className="w-4 h-4" />
            Modifier les examens
          </Button>
        )}
      </div>

      {/* Filtres — masqués si l'apprenant a un type forcé */}
      {!forcedType && (
        <div className="flex flex-wrap gap-2">
          <div className="flex gap-1 border rounded-lg p-1">
            {(["tous", "TAXI", "VTC", "TA", "VA"] as const).map(t => (
              <Button
                key={t}
                variant={typeFiltre === t ? "default" : "ghost"}
                size="sm"
                onClick={() => setTypeFiltre(t)}
                className="h-7 px-3"
              >
                {t === "tous" ? "Tous" : t === "TA" ? "Passerelle TA" : t === "VA" ? "Passerelle VA" : t}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Section Examens blancs */}
      {examensBlancs.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Examens Blancs</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {examensBlancs.map(examen => {
               const totalQuestions = examen.matieres.reduce((acc, m) => acc + m.questions.length, 0);
              const dureeTotal = examen.matieres.reduce((acc, m) => acc + m.duree, 0);
              const isCompleted = completedExamIds.has(examen.id);
              const isStartedNotFinished = !isCompleted && startedNotFinishedIds.has(examen.id);
              const canRetake = Boolean(isAdmin);
              const canStartExam = !isCompleted || canRetake;
              const scores = examScores[examen.id] || [];
              return (
                <Card
                  key={examen.id}
                  className={`hover:shadow-md transition-shadow border-2 ${isCompleted ? "border-green-500/60 bg-green-50/30 cursor-pointer" : isStartedNotFinished ? "border-orange-400/60 bg-orange-50/30" : "hover:border-primary/40"}`}
                  onClick={isCompleted ? () => onViewResults(examen) : undefined}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Badge variant={examen?.type === "TAXI" ? "default" : "secondary"} className="text-xs">
                        {examen?.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">N°{examen.numero}</span>
                    </div>
                    <CardTitle className="text-base mt-2">{examen.titre}</CardTitle>
                    {isCompleted && (() => {
                      // Compute weighted average from DB scores — uses same logic as EcranResultats
                      let totalCoef = 0;
                      let weightedSum = 0;
                      let hasScores = false;
                      const eliminatoiresMatieres: string[] = [];
                      examen.matieres.forEach(m => {
                        const scoreData = findScoreForMatiere(scores, m);
                        const coef = m.coefficient || 1;
                        if (scoreData) {
                          weightedSum += scoreData.note_sur_20 * coef;
                          hasScores = true;
                          // Use computeAdmisForMatiere (same as detail view) to check éliminatoire
                          const admisMatiere = computeAdmisForMatiere(
                            scoreData.score_obtenu, scoreData.score_max,
                            m.noteEliminatoire, m.noteSur || 20, true
                          );
                          if (!admisMatiere) {
                            eliminatoiresMatieres.push(m.nom.split(" - ")[0]);
                          }
                        }
                        totalCoef += coef;
                      });
                      const moyenne = totalCoef > 0 ? Math.round((weightedSum / totalCoef) * 10) / 10 : 0;
                      const isReussi = hasScores && moyenne >= 10 && eliminatoiresMatieres.length === 0;
                      return (
                        <div className={`flex flex-col items-center gap-1 mt-2 rounded-lg px-3 py-2 border ${
                          isReussi
                            ? "bg-green-100 border-green-300"
                            : "bg-red-50 border-red-400 border-2"
                        }`}>
                          <div className="flex items-center gap-2">
                            {isReussi ? (
                              <>
                                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                                <span className="text-green-700 font-bold text-lg uppercase tracking-wide">Examen réussi ✅</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                                <span className="text-red-600 font-bold text-lg uppercase tracking-wide">Examen échoué ❌</span>
                              </>
                            )}
                          </div>
                          {hasScores && (
                            <span className={`text-2xl font-extrabold ${isReussi ? "text-green-700" : "text-red-500"}`}>
                              {moyenne.toFixed(1)} / 20
                            </span>
                          )}
                          {eliminatoiresMatieres.length > 0 && (
                            <span className="text-xs text-red-600 font-medium">
                              ⚠ Note éliminatoire en : {eliminatoiresMatieres.join(", ")}
                            </span>
                          )}
                          {previousExamAverages[examen.id] != null && (
                            <span className="text-xs text-muted-foreground italic">
                              Précédent essai : {previousExamAverages[examen.id]!.toFixed(1)} / 20
                            </span>
                          )}
                        </div>
                      );
                    })()}
                    {isStartedNotFinished && (
                      <div className="flex items-center gap-2 mt-2 bg-orange-100 border-2 border-orange-400 rounded-lg px-3 py-3">
                        <AlertTriangle className="w-6 h-6 text-orange-600 shrink-0" />
                        <span className="text-orange-700 font-extrabold text-lg uppercase tracking-wide">Non terminé</span>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <BookOpen className="w-3 h-3" />
                        <span>{totalQuestions} questions</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{dureeTotal} min</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <FileText className="w-3 h-3" />
                        <span>{examen.matieres.length} matière{examen.matieres.length > 1 ? "s" : ""}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {examen.matieres.map(m => {
                        const scoreData = findScoreForMatiere(scores, m);
                        return (
                          <div key={m.id} className="flex justify-between text-xs text-muted-foreground">
                            <span className="truncate pr-2">{m.nom.split(" - ")[0]}</span>
                            {isCompleted && scoreData ? (
                              <span className={`shrink-0 font-bold ${computeAdmisForMatiere(scoreData.score_obtenu, scoreData.score_max, m.noteEliminatoire, m.noteSur || 20, true) ? "text-green-600" : "text-red-500"}`}>
                                {scoreData.note_sur_20.toFixed(1)}/20
                              </span>
                            ) : (
                              <span className="shrink-0">{m.duree}min</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {isCompleted && (
                      <Button className="w-full mt-2 gap-2" variant="secondary" onClick={(e) => { e.stopPropagation(); onViewResults(examen); }}>
                        <Trophy className="w-4 h-4" />
                        Voir mes résultats
                      </Button>
                    )}
                    <Button
                      className="w-full mt-2 gap-2"
                      variant={isCompleted && !canRetake ? "secondary" : isCompleted ? "outline" : isStartedNotFinished ? "default" : "default"}
                      disabled={!canStartExam || pausedExamIds?.has(examen.id)}
                      onClick={(e) => { e.stopPropagation(); if (canStartExam) onStart(examen); }}
                    >
                      {pausedExamIds?.has(examen.id) ? "⏸ Examen en pause" : isCompleted ? (canRetake ? "Recommencer l'examen" : "Examen déjà réalisé") : isStartedNotFinished ? "Reprendre l'examen" : "Commencer l'examen"}
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    {isAdmin && onPauseToggle && (
                      <Button
                        className="w-full mt-1 gap-2"
                        variant={pausedExamIds?.has(examen.id) ? "default" : "outline"}
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); onPauseToggle(examen.id); }}
                      >
                        {pausedExamIds?.has(examen.id) ? (
                          <>
                            <Play className="w-4 h-4" />
                            Reprendre cet examen
                          </>
                        ) : (
                          <>
                            <Pause className="w-4 h-4" />
                            Mettre en pause
                          </>
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ===== CALCULATRICE POUR GESTION =====


export { EcranSelection };
