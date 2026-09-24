import { useState, useEffect, useRef } from "react";
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
  computeAdmisForMatiere, getMeaningfulAnswerCount,
  selectLatestAttemptRows, parseExamAnswerKey,
} from "./examens-blancs-utils";
import { computeMoyenneExamen, computeMatiereScore, computeMatiereScoreForAttempt, resolveMatiereForScoring } from "./examens-blancs-scoring";
import { fetchCoreMatiereStates, matchCoreState } from "@/lib/coreExamPublication";
import { isExamAttemptPublicationPending, isMatiereQrcPendingForAttempt, excludeResultPlaceholders, mergePassageSiblingRows } from "./exam-helpers";
import { toast } from "sonner";
import { RefaireExamenDialog } from "./RefaireExamenDialog";
import { computeExamRetakeLock, examRetakeLockMessage } from "@/lib/examRetakeDelay";
import { useQrcEnginePending } from "@/hooks/useQrcEnginePending";
import { isAfterExamReset, latestExamResetCutoffs } from "@/lib/examResetCutoff";

/**
 * Retrouve la version ORIGINALE (source statique) d'une matière pour un examen
 * donné — repli sûr quand les réponses d'un élève ne correspondent plus à la
 * version actuelle (question supprimée/modifiée après coup).
 */
function findStaticFallbackMatiere(examId: string, matiereId: string, matiereNom?: string): Matiere | null {
  const staticExam = tousLesExamens.find((e) => e.id === examId);
  if (!staticExam) return null;
  return (
    staticExam.matieres.find((m) => m.id === matiereId) ||
    (matiereNom ? staticExam.matieres.find((m) => m.nom === matiereNom) : undefined) ||
    null
  );
}

function EcranSelection({ onStart, onStartPartial, onEdit, onViewResults, defaultBilanId, apprenantType, examensData, apprenantId, isAdmin, refreshKey, pausedExamIds, onPauseToggle }: { onStart: (examen: ExamenBlanc, forceRetake?: boolean) => void; onStartPartial?: (examen: ExamenBlanc) => void; onEdit: () => void; onViewResults: (examen: ExamenBlanc) => void; defaultBilanId?: string | null; apprenantType?: string | null; examensData: ExamenBlanc[]; apprenantId?: string | null; isAdmin?: boolean; refreshKey?: number; pausedExamIds?: Set<string>; onPauseToggle?: (examId: string) => void }) {
  const [retakeExamen, setRetakeExamen] = useState<ExamenBlanc | null>(null);
  // Examens branchés sur le nouveau moteur QRC : le blocage de la note vient
  // exactement des mêmes identifiants que la file de correction du formateur.
  // Pour tous les autres examens, la règle historique est conservée telle quelle.
  const qrcEngine = useQrcEnginePending(apprenantId, (examensData || []).map((e) => e.id));
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
  // Passage réellement OUVERT (tentative en cours non terminée), même si l'examen
  // a déjà été terminé lors d'une tentative précédente. Affichage uniquement.
  const [openAttemptIds, setOpenAttemptIds] = useState<Set<string>>(new Set());
  // Fin de la dernière tentative réellement passée (terminée ou en attente de
  // correction QRC) — sert au délai de 48 h avant une NOUVELLE tentative.
  const [lastFinishedByExam, setLastFinishedByExam] = useState<Record<string, number>>({});
  // Autorisations exceptionnelles accordées par un Admin (passage effectué sur
  // une version erronée) : elles lèvent UNIQUEMENT le délai de 48 h.
  // Aucune ancienne tentative, note ou QRC n'est touchée.
  const [retakeAuthorizedExamIds, setRetakeAuthorizedExamIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!apprenantId) return;
    let cancelled = false;
    supabase
      .from("exam_retake_authorizations" as any)
      .select("exam_id")
      .eq("apprenant_id", apprenantId)
      .is("consumed_at", null)
      .is("revoked_at", null)
      .then(({ data }) => {
        if (cancelled || !data) return;
        setRetakeAuthorizedExamIds(new Set((data as any[]).map((r) => String(r.exam_id))));
      });
    return () => { cancelled = true; };
  }, [apprenantId, refreshKey]);
  const [nowTick, setNowTick] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  const [examScores, setExamScores] = useState<Record<string, ExamScoreItem[]>>({});
  const [previousExamAverages, setPreviousExamAverages] = useState<Record<string, number | null>>({});
  // Ref so the score-fetch effect below can read the LATEST exam definitions
  // without needing `examensData` as a dependency (its identity changes on
  // every fast question-definition refresh, which was causing this effect to
  // re-run every few seconds and produce a visible flicker in scores).
  const examensDataRef = useRef(examensData);
  examensDataRef.current = examensData;
  const [resetRefreshKey, setResetRefreshKey] = useState(0);

  // Une remise à zéro administrative peut arriver pendant que la liste est
  // déjà ouverte. Elle invalide immédiatement les états calculés en mémoire ;
  // les historiques restent en base mais ne doivent plus piloter la carte.
  useEffect(() => {
    if (!apprenantId) return;
    const channel = supabase
      .channel(`exam-reset-list-${apprenantId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "core_exam_resets", filter: `apprenant_id=eq.${apprenantId}` },
        () => setResetRefreshKey((value) => value + 1),
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [apprenantId]);

  // Fetch completed exams with scores from DB + started-but-not-finished.
  // IMPORTANT: only re-run when the STUDENT changes, not on every question-
  // definition refresh (which now happens every few seconds so admin edits
  // propagate fast). Results don't need to be re-fetched that often, and
  // doing so repeatedly caused a visible flicker between correct and stale
  // reads a few seconds apart.
  useEffect(() => {
    if (!apprenantId) return;

    // 1) Fetch completed results — with retry + session refresh in case the
    // auth token expired in the background (same class of issue as the
    // tablet/session bugs fixed previously: a stale token can make this
    // read return incomplete/wrong data without any visible error).
    const fetchQuizResultsWithRetry = async () => {
      let lastResult: { data: any } = { data: null };
      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) {
          await new Promise((r) => setTimeout(r, 600 * attempt));
          try { await supabase.auth.refreshSession(); } catch { /* best effort */ }
        }
        const result = await supabase
          .from("apprenant_quiz_results" as any)
          .select("id, quiz_id, matiere_id, matiere_nom, note_sur_20, score_obtenu, score_max, tentative, completed_at, created_at, details")
          .eq("apprenant_id", apprenantId)
          .eq("quiz_type", "examen_blanc")
          .order("completed_at", { ascending: false })
          .order("created_at", { ascending: false });
        lastResult = result;
        if (!result.error && result.data) return result;
        console.warn(`[ExamensBlancs] Fetch attempt ${attempt + 1} failed:`, result.error);
      }
      return lastResult;
    };

    Promise.all([
      fetchQuizResultsWithRetry(),
      supabase
        .from("core_exam_resets")
        .select("exam_id, cutoff_at")
        .eq("apprenant_id", apprenantId),
      supabase
        .from("exam_attempts_v2")
        .select("attempt_id, exam_id, etat, started_at")
        .eq("apprenant_id", apprenantId)
        .eq("etat", "en_cours"),
      fetchCoreMatiereStates(apprenantId),
    ])
      .then(async ([{ data }, { data: resetRows }, { data: openV2Rows }, coreStates]) => {
        if (data) {
          const resetCutoffs = latestExamResetCutoffs(resetRows);
          // Les lignes techniques « en attente de finalisation » (score 0 créé
          // par le filet de sécurité) ne sont jamais des notes.
          const allRows = mergePassageSiblingRows(excludeResultPlaceholders((data as any[]).filter((row: any) =>
            isAfterExamReset(row?.completed_at ?? row?.created_at, resetCutoffs[String(row?.quiz_id ?? "")]),
          )));
          const allRowsByQuiz = new Map<string, any[]>();
          allRows.forEach((r: any) => {
            if (!r.quiz_id) return;
            if (!allRowsByQuiz.has(r.quiz_id)) allRowsByQuiz.set(r.quiz_id, []);
            allRowsByQuiz.get(r.quiz_id)!.push(r);
          });

          const latestRows = Array.from(allRowsByQuiz.values()).flatMap((rows) => selectLatestAttemptRows(rows));

          // FALLBACK: some rows have an empty details.reponses (the grading
          // snapshot never captured the answers, e.g. a save that failed
          // mid-way), even though the raw answers were actually saved to
          // reponses_apprenants during the exam. Without this, those rows
          // can never be rescored and stay wrongly stuck at 0.
          const rowsNeedingRawFallback = latestRows.filter(
            (r: any) => !r?.details?.reponses || Object.keys(r.details.reponses).length === 0,
          );
          if (rowsNeedingRawFallback.length > 0 && apprenantId) {
            try {
              const { data: rawRows } = await supabase
                .from("reponses_apprenants" as any)
                .select("exercice_id, reponses, created_at, updated_at")
                .eq("apprenant_id", apprenantId)
                .in(
                  "exercice_id",
                  rowsNeedingRawFallback.map((r: any) => `${r.quiz_id}__${r.matiere_id}`),
                );
              const rawByExercice = new Map<string, any>();
              ((rawRows as any[]) || []).forEach((rr) => {
                if (rr.reponses && Object.keys(rr.reponses).length > 0) rawByExercice.set(rr.exercice_id, rr.reponses);
              });
              rowsNeedingRawFallback.forEach((r: any) => {
                const raw = rawByExercice.get(`${r.quiz_id}__${r.matiere_id}`);
                if (raw) {
                  r.details = { ...(r.details || {}), reponses: raw };
                }
              });
            } catch (err) {
              console.warn("[ExamensBlancs] reponses_apprenants fallback fetch failed:", err);
            }
          }

          const completedIds = new Set<string>();
          const rowsByQuiz = new Map<string, any[]>();

          latestRows.forEach((row: any) => {
            const quizId = row?.quiz_id;
            if (!quizId) return;
            if (!rowsByQuiz.has(quizId)) rowsByQuiz.set(quizId, []);
            rowsByQuiz.get(quizId)!.push(row);
          });

          rowsByQuiz.forEach((rows, quizId) => {
            const examDef = examensDataRef.current.find((e) => e.id === quizId);
            const validMatieres = (examDef?.matieres || []).filter((m): m is Matiere => Boolean(m));
            const requiredMatieres = Math.max(validMatieres.length || 1, 1);

            const doneLookupKeys = new Set<string>();
            rows.forEach((row: any) => {
              buildMatiereLookupKeys(row?.matiere_id, row?.matiere_nom).forEach((key) => doneLookupKeys.add(key));
            });

            const completedMatiereCount = validMatieres.filter((matiere) =>
              buildMatiereLookupKeys(matiere.id, matiere.nom).some((key) => doneLookupKeys.has(key))
            ).length;

            if (completedMatiereCount >= requiredMatieres) {
              completedIds.add(quizId);
            }
          });

          setCompletedExamIds(completedIds);

          // Date de fin de la dernière tentative par examen (lecture seule).
          const finishedAt: Record<string, number> = {};
          latestRows.forEach((r: any) => {
            const quizId = r?.quiz_id;
            if (!quizId) return;
            const t = toTimestamp(r?.completed_at) || toTimestamp(r?.created_at);
            if (t > (finishedAt[quizId] ?? 0)) finishedAt[quizId] = t;
          });
          setLastFinishedByExam(finishedAt);

          const scores: Record<string, ExamScoreItem[]> = {};
          latestRows.forEach((r: any) => {
            const recovered = recoverCorruptedScoreRow(r, examensDataRef.current);
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
              reponses: r?.details?.reponses ?? null,
              correctionsIA: r?.details?.correctionsIA ?? null,
              details: r?.details ?? null,
              // Source unique : état serveur du passage nouveau système, s'il existe.
              __core: matchCoreState(coreStates, r.quiz_id, r.matiere_id, r.completed_at),
            } as ExamScoreItem);

            if (recovered && recovered.score_obtenu > toFiniteNumber(r.score_obtenu, 0)) {
              console.warn(
                `[ExamensBlancs][Recovery] Score restauré ${r.quiz_id}/${r.matiere_id}: ${r.score_obtenu}/${r.score_max} -> ${recovered.score_obtenu}/${recovered.score_max}`
              );
              // Affichage récupéré en mémoire uniquement : aucune note existante
              // n'est réécrite par l'écran de liste.
            }
          });

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
            const examDef = examensDataRef.current.find((exam) => exam.id === quizId);
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
          allRowsByQuiz.forEach((rows, quizId) => {
            const examDef = examensDataRef.current.find(e => e.id === quizId);
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
              // BUG 4 fix: only count coef when prior attempt data exists, otherwise dilutes the average
              if (mRows.length >= 2) {
                hasPrev = true;
                const prev = mRows[1];
                const note = normalizeNoteSur20(prev.score_obtenu, prev.score_max, prev.note_sur_20);
                weightedSum += note * coef;
                totalCoef += coef;
              }
            });
            if (hasPrev && totalCoef > 0) {
              prevAvgs[quizId] = Math.round((weightedSum / totalCoef) * 10) / 10;
            }
          });
          setPreviousExamAverages(prevAvgs);

          // 2) Fetch started-but-not-finished + fallback completion detection from reponses_apprenants.
          //    Certains scores peuvent ne pas s'être enregistrés dans apprenant_quiz_results (bug historique) :
          //    on considère l'examen comme terminé si toutes ses matières ont completed=true dans reponses_apprenants.
          supabase
            .from("reponses_apprenants" as any)
            .select("exercice_id, completed, reponses, created_at, updated_at")
            .eq("apprenant_id", apprenantId)
            .eq("exercice_type", "examen_blanc")
            .then(({ data: repData }) => {
              const started = new Set<string>();

              // Une sauvegarde de réponses, même marquée completed, ne remplace
              // jamais une finalisation réelle dans apprenant_quiz_results.
              const mergedCompleted = new Set(completedIds);
              if (mergedCompleted.size !== completedIds.size) {
                setCompletedExamIds(mergedCompleted);
              }


              const open = new Set<string>();
              ((openV2Rows as any[]) ?? []).forEach((attempt: any) => {
                const quizId = String(attempt?.exam_id ?? "");
                if (!quizId || !isAfterExamReset(attempt?.started_at, resetCutoffs[quizId])) return;
                started.add(quizId);
                open.add(quizId);
              });
              if (repData) {
                (repData as any[]).forEach((r: any) => {
                  const id: string = r?.exercice_id || "";
                  const quizId = examensDataRef.current.find((exam) => parseExamAnswerKey(id, exam.id))?.id ?? "";
                  if (!quizId) return;
                  if (!isAfterExamReset(r?.updated_at ?? r?.created_at, resetCutoffs[quizId])) return;
                  const nbReponses = getMeaningfulAnswerCount(r?.reponses);
                  if (nbReponses === 0) return;
                  // Après une remise à zéro complète, seul le nouveau passage V2
                  // ouvert fait foi. Une écriture historique tardive ne peut donc
                  // jamais remettre la carte en « NON TERMINÉ ».
                  if (resetCutoffs[quizId]) return;
                  if (!mergedCompleted.has(quizId)) {
                    started.add(quizId);
                  }
                  // Un passage ouvert (non finalisé, avec au moins une réponse) reste
                  // reprenable même si une tentative précédente est terminée.
                  if (r?.completed !== true && nbReponses > 0) {
                    open.add(quizId);
                  }
                });
              }
              setStartedNotFinishedIds(started);
              setOpenAttemptIds(open);
            });
        }
      });
  }, [apprenantId, refreshKey, resetRefreshKey]);

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
              // Délai de 48 h : une NOUVELLE tentative n'est possible que
              // 2 jours complets après la fin de la précédente. La reprise
              // d'une tentative EN COURS reste toujours autorisée.
              const retakeLock = computeExamRetakeLock(lastFinishedByExam[examen.id] ?? null, nowTick);
              const retakeAuthorized = retakeAuthorizedExamIds.has(examen.id);
              const retakeBlocked = isCompleted && !openAttemptIds.has(examen.id) && retakeLock.locked && !retakeAuthorized;
              const canRetake = !retakeBlocked;
              const canStartExam = true;
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
                      // RÈGLE : aucune note finale publiée tant qu'une QRC de cette
                      // tentative n'a pas été validée manuellement par le formateur.
                       // Le nouveau moteur ne peut que bloquer EN PLUS : il ne
                       // débloque jamais un passage historique en attente.
                       const enginePending = qrcEngine.isExamPending(examen.id);
                       const publicationPending = enginePending === true
                         || isExamAttemptPublicationPending(scores, examen);
                       if (publicationPending) {
                        return (
                          <div className="flex flex-col items-center gap-1 mt-2 rounded-lg px-3 py-2 border-2 bg-amber-50 border-amber-400">
                            <span className="text-amber-700 font-bold text-base uppercase tracking-wide text-center">
                              ⏳ En attente de correction des QRC
                            </span>
                            <span className="text-xs text-amber-700 text-center">
                              La note finale sera publiée après validation de toutes les QRC par le formateur.
                            </span>
                          </div>
                        );
                      }
                      // Utilise le helper partagé pour être ALIGNÉ avec l'écran de résultats détaillés.
                      const bilan = computeMoyenneExamen(examen, (m) => {
                        const scoreData = findScoreForMatiere(scores, m);
                        if (!scoreData) return null;
                        // Tentative avec snapshot → notée sur la version d'origine.
                        // Tentative sans snapshot → note enregistrée, jamais recalculée.
                        return computeMatiereScoreForAttempt(
                          m,
                          {
                            details: (scoreData as any).details ?? { reponses: (scoreData as any).reponses, correctionsIA: scoreData.correctionsIA },
                            score_obtenu: scoreData.score_obtenu,
                            score_max: scoreData.score_max,
                            note_sur_20: (scoreData as any).note_sur_20,
                          },
                          findStaticFallbackMatiere(examen.id, m.id, m.nom),
                        );
                      });
                      const moyenne = bilan.moyenne;
                      const hasScores = bilan.hasScores;
                      const eliminatoiresMatieres = bilan.eliminatoires;
                      const isReussi = bilan.admisGlobal;
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
                        // STATUT PAR MATIÈRE (jamais hérité du blocage global de l'examen) :
                        // une matière est « en attente » uniquement si ELLE contient encore
                        // une QRC répondue non validée manuellement pour CE passage.
                        const engineMatierePending = qrcEngine.isMatierePending(examen.id, m.id);
                        const publicationPending = (!!scoreData && engineMatierePending === true)
                          || (!!scoreData && isMatiereQrcPendingForAttempt(m, {
                              ...((scoreData as any)?.details || {}),
                              reponses: (scoreData as any)?.reponses ?? (scoreData as any)?.details?.reponses,
                              correctionsIA: (scoreData as any)?.correctionsIA ?? (scoreData as any)?.details?.correctionsIA,
                            }));
                        return (
                          <div key={m.id} className="flex justify-between text-xs text-muted-foreground">
                            <span className="truncate pr-2">{m.nom.split(" - ")[0]}</span>
                             {isCompleted && scoreData && publicationPending ? (
                              <span className="shrink-0 font-semibold text-amber-600">⏳ En attente</span>
                            ) : isCompleted && scoreData ? (() => {
                              const score = computeMatiereScoreForAttempt(
                                m,
                                {
                                  details: (scoreData as any).details ?? { reponses: scoreData.reponses, correctionsIA: scoreData.correctionsIA },
                                  score_obtenu: scoreData.score_obtenu,
                                  score_max: scoreData.score_max,
                                  note_sur_20: scoreData.note_sur_20,
                                },
                                findStaticFallbackMatiere(examen.id, m.id, m.nom),
                              );
                              const noteSur20 = score?.noteSur20 ?? normalizeNoteSur20(scoreData.score_obtenu, scoreData.score_max, scoreData.note_sur_20);
                              if (m.id === "reglementation_vtc2") {
                                const ts = new Date().toISOString();
                                const source = score?.noteSur20 != null ? "RECALCUL(computeMatiereScore)" : "REPLI(score_obtenu/score_max stockés)";
                                // eslint-disable-next-line no-console
                                console.log(`[TRACE ${ts}] examen=${examen.id} matiere=reglementation_vtc2 apprenant=${apprenantId} source=${source} score=${JSON.stringify(score)} stored.score_obtenu=${scoreData.score_obtenu} stored.score_max=${scoreData.score_max} stored.note_sur_20=${scoreData.note_sur_20} reponsesKeys=${scoreData.reponses ? Object.keys(scoreData.reponses).length : 0} => noteAffichée=${noteSur20.toFixed(1)}/20`);
                              }

                              return (
                                <span className="flex items-center gap-1 shrink-0">
                                  {isAdmin && (
                                    <button
                                      type="button"
                                      title="Diagnostiquer cette matière (admin)"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const reponsesCount = scoreData.reponses ? Object.keys(scoreData.reponses).length : 0;
                                        const staticFallback = findStaticFallbackMatiere(examen.id, m.id, m.nom);
                                        const questionCount = m.questions?.length ?? 0;
                                        const staticQuestionCount = staticFallback?.questions?.length ?? 0;
                                        toast.info(
                                          `🔍 Matière "${m.nom}" — apprenant=${apprenantId}\n` +
                                          `• Réponses stockées (details.reponses) : ${reponsesCount} clé(s)\n` +
                                          `• Questions version actuelle : ${questionCount}\n` +
                                          `• Questions version d'origine : ${staticQuestionCount}\n` +
                                          `• score_obtenu / score_max stockés : ${scoreData.score_obtenu} / ${scoreData.score_max}\n` +
                                          `• note_sur_20 stockée : ${scoreData.note_sur_20}\n` +
                                          (reponsesCount === 0
                                            ? "→ Aucune réponse brute enregistrée : la donnée d'origine est manquante, note irrécupérable automatiquement."
                                            : "→ Des réponses existent : le score devrait pouvoir être recalculé."),
                                          { duration: 30000 },
                                        );
                                      }}
                                      className="text-muted-foreground hover:text-foreground"
                                    >
                                      🔍
                                    </button>
                                  )}
                                  <span className={`font-bold ${(score?.admis ?? computeAdmisForMatiere(scoreData.score_obtenu, scoreData.score_max, m.noteEliminatoire, m.noteSur || 20, true)) ? "text-green-600" : "text-red-500"}`}>
                                    {noteSur20.toFixed(1)}/20
                                  </span>
                                </span>
                              );
                            })() : (
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
                    {isCompleted && openAttemptIds.has(examen.id) && (
                      <Button
                        className="w-full mt-2 gap-2 border-2 border-orange-400 bg-orange-50 text-orange-800 hover:bg-orange-100"
                        variant="outline"
                        disabled={pausedExamIds?.has(examen.id)}
                        onClick={(e) => { e.stopPropagation(); onStart(examen, false); }}
                      >
                        ▶ Reprendre ma tentative en cours
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    )}
                    {retakeAuthorized && isCompleted && (
                      <div className="mt-2 rounded-lg border-2 border-blue-300 bg-blue-50 px-3 py-2 text-center text-sm font-semibold text-blue-800">
                        ✅ Un nouveau passage vous a été autorisé. Votre passage précédent reste conservé.
                      </div>
                    )}
                    {retakeBlocked && (
                      <div className="mt-2 rounded-lg border-2 border-slate-300 bg-slate-50 px-3 py-2 text-center text-sm font-semibold text-slate-700">
                        {examRetakeLockMessage(retakeLock.availableAt)}
                      </div>
                    )}
                    <Button
                      className="w-full mt-2 gap-2"
                      variant={isCompleted ? "outline" : isStartedNotFinished ? "default" : "default"}
                      disabled={pausedExamIds?.has(examen.id) || retakeExamen?.id === examen.id || retakeBlocked}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (retakeBlocked) return;
                        // « Refaire l'examen » ne crée jamais une nouvelle tentative directement :
                        // double confirmation explicite obligatoire.
                        if (isCompleted) { setRetakeExamen(examen); return; }
                        onStart(examen, false);
                      }}
                    >
                      {pausedExamIds?.has(examen.id)
                        ? "⏸ Examen en pause"
                        : retakeBlocked
                          ? "🔒 Refaire l'examen indisponible"
                          : isCompleted ? "🔄 Refaire l'examen" : isStartedNotFinished ? "Reprendre l'examen" : "Commencer l'examen"}
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    {onStartPartial && (
                      <Button
                        className="w-full mt-2 gap-2"
                        variant="outline"
                         disabled={pausedExamIds?.has(examen.id) || retakeBlocked}
                         onClick={(e) => { e.stopPropagation(); if (retakeBlocked) return; onStartPartial(examen); }}
                      >
                        🎯 Choisir les matières à passer
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    )}
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

      <RefaireExamenDialog
        open={!!retakeExamen}
        onOpenChange={(o) => { if (!o) setRetakeExamen(null); }}
        hasResumableAttempt={!!retakeExamen && (startedNotFinishedIds.has(retakeExamen.id) || openAttemptIds.has(retakeExamen.id))}
        onResume={() => { const ex = retakeExamen; setRetakeExamen(null); if (ex) onStart(ex, false); }}
        onConfirm={() => { const ex = retakeExamen; setRetakeExamen(null); if (ex) onStart(ex, true); }}
      />
    </div>
  );
}

// ===== CALCULATRICE POUR GESTION =====


export { EcranSelection };
