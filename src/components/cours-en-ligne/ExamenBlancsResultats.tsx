import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, ArrowRight, CheckCircle2, XCircle, AlertTriangle,
  Trophy, RotateCcw, ChevronRight, BookOpen, Loader2, Bot, Clock, Pencil
} from "lucide-react";
import { getPointsParQuestion, isCalculQuestion, type ExamenBlanc, type Matiere, type Question } from "./examens-blancs-data";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ExamQuestionImage } from "./ExamQuestionImage";
import type { ResultatMatiere, Reponses, CorrectionQRC, CorrectionCache, ReponseQCM, ReponseQRC as ReponseQRCType } from "./examens-blancs-types";
import {
  safeStr, safeArray, toFiniteNumber, clamp,
  normalizeNoteSur20, clampToQuestionMax, computeAdmisForMatiere,
  evaluateQrcDeterministic, ENABLE_AI_QRC_CORRECTION, AI_ONLY_UPGRADES,
  getQuestionImageValue,
} from "./examens-blancs-utils";

function EcranResultats({
  examen,
  resultats,
  onRecommencer,
  onRetour,
  onRefaireFausses,
  apprenantId,
  userId,
  isViewingSaved,
  isAdmin,
  canRetry,
  isPresentiel,
}: {
  examen: ExamenBlanc;
  resultats: ResultatMatiere[];
  onRecommencer: () => void;
  onRetour: () => void;
  onRefaireFausses: () => void;
  apprenantId?: string | null;
  userId?: string | null;
  isViewingSaved?: boolean;
  isAdmin?: boolean;
  canRetry?: boolean;
  isPresentiel?: boolean;
}) {
  // Ensure resultats is always a proper array (DB data can be malformed)
  resultats = safeArray<ResultatMatiere>(resultats);
  // Check if corrections are already cached in the resultats (from DB)
  const hasPreloadedCorrections = resultats.some(
    (r) => r.correctionsIA && Object.values(r.correctionsIA).some((value) => value && value !== "loading")
  );

  const [correctionsIA, setCorrectionsIA] = useState<{ [matiereIdx: number]: CorrectionCache }>(() => {
    if (!hasPreloadedCorrections) return {};
    // Initialize from preloaded data
    const initial: { [matiereIdx: number]: CorrectionCache } = {};
    resultats.forEach((r, mi) => {
      if (r.correctionsIA && Object.keys(r.correctionsIA).length > 0) {
        initial[mi] = r.correctionsIA;
      }
    });
    return initial;
  });
  const [correctionEnCours, setCorrectionEnCours] = useState(false);
  const [expandedMatieres, setExpandedMatieres] = useState<{ [mi: number]: boolean }>({});
  const [editingQrc, setEditingQrc] = useState<string | null>(null);
  const [editingPoints, setEditingPoints] = useState<number>(0);
  const [revisionDejaFaite, setRevisionDejaFaite] = useState(false);

  // === BILAN AUTOMATIQUE ===
  const generateBilanAuto = useCallback(() => {
    if (!resultats || resultats.length === 0) return null;

    // Compute weighted average
    let totalCoef = 0;
    let weightedSum = 0;
    const matieresDetails: { nom: string; note: number; coef: number; noteElim: number; isElim: boolean }[] = [];

    resultats.forEach((r) => {
      const coef = examen.matieres.find(m => m.id === r.matiereId)?.coefficient || 1;
      const noteElim = examen.matieres.find(m => m.id === r.matiereId)?.noteEliminatoire || 6;
      const note = r.maxPoints > 0 ? Math.round(((r.noteObtenue / r.maxPoints) * 20) * 10) / 10 : 0;
      weightedSum += note * coef;
      totalCoef += coef;
      matieresDetails.push({
        nom: r.nomMatiere.split(" - ")[0],
        note,
        coef,
        noteElim,
        isElim: note < noteElim,
      });
    });

    const moyenne = totalCoef > 0 ? Math.round((weightedSum / totalCoef) * 10) / 10 : 0;
    const isReussi = moyenne >= 10 && !matieresDetails.some(m => m.isElim);

    // Sort by note ascending for weakest first
    const sorted = [...matieresDetails].sort((a, b) => a.note - b.note);
    const faibles = sorted.filter(m => m.note < 10);
    const eliminatoires = sorted.filter(m => m.isElim);
    const forts = sorted.filter(m => m.note >= 14);

    const lines: string[] = [];

    if (isReussi) {
      lines.push(`✅ Bravo ! Vous avez obtenu une moyenne de ${moyenne.toFixed(1)}/20, vous avez réussi cet examen blanc.`);
    } else {
      lines.push(`❌ Votre moyenne est de ${moyenne.toFixed(1)}/20. L'examen n'est pas validé (il faut 10/20 minimum sans note éliminatoire).`);
    }

    if (eliminatoires.length > 0) {
      lines.push("");
      lines.push(`⚠️ Note(s) éliminatoire(s) :`);
      eliminatoires.forEach(m => {
        lines.push(`  • ${m.nom} : ${m.note.toFixed(1)}/20 (minimum requis : ${m.noteElim}/20)`);
      });
    }

    if (faibles.length > 0) {
      lines.push("");
      lines.push(`📚 Matières à réviser en priorité :`);
      faibles.forEach(m => {
        lines.push(`  • ${m.nom} : ${m.note.toFixed(1)}/20`);
      });
    }

    if (forts.length > 0) {
      lines.push("");
      lines.push(`💪 Points forts :`);
      forts.forEach(m => {
        lines.push(`  • ${m.nom} : ${m.note.toFixed(1)}/20`);
      });
    }

    // Recommendations
    lines.push("");
    if (!isReussi) {
      lines.push(`📝 Conseils :`);
      if (eliminatoires.length > 0) {
        lines.push(`  • Concentrez-vous d'abord sur ${eliminatoires.map(m => m.nom).join(", ")} pour dépasser la note éliminatoire.`);
      }
      if (faibles.length > 0) {
        const matieresARevoir = faibles.filter(m => !m.isElim);
        if (matieresARevoir.length > 0) {
          lines.push(`  • Renforcez ensuite ${matieresARevoir.map(m => m.nom).join(", ")} pour atteindre la moyenne.`);
        }
      }
      lines.push(`  • Utilisez les fiches de révision et les exercices pour chaque matière faible.`);
      lines.push(`  • Refaites les questions fausses de cet examen pour consolider vos acquis.`);
    } else {
      if (faibles.length > 0) {
        lines.push(`📝 Même si vous avez réussi, renforcez ${faibles.map(m => m.nom).join(", ")} pour être plus à l'aise le jour de l'examen.`);
      } else {
        lines.push(`📝 Continuez vos révisions pour maintenir ce bon niveau. Passez aux examens blancs suivants pour vous entraîner.`);
      }
    }

    return lines.join("\n");
  }, [resultats, examen]);

  // Auto-save bilan to DB
  useEffect(() => {
    if (!apprenantId || !userId || !examen?.id) return;
    const bilan = generateBilanAuto();
    if (!bilan) return;
    supabase.from("apprenant_documents_completes").upsert({
      apprenant_id: apprenantId,
      user_id: userId,
      type_document: "bilan_examen_blanc",
      titre: examen.id,
      donnees: { bilan, examen_titre: examen.titre, generated_at: new Date().toISOString() },
    } as any, { onConflict: "apprenant_id,type_document,titre" }).then(({ error }) => {
      if (error) console.error("[BilanAuto] Save error:", error);
      else console.log("[BilanAuto] Saved for", examen.id);
    });
  }, [apprenantId, userId, examen?.id, generateBilanAuto]);

  // Check if revision has already been done for this exam
  useEffect(() => {
    if (!apprenantId || !examen?.id) return;
    const checkRevision = async () => {
      const { data, error } = await supabase
        .from("apprenant_quiz_results")
        .select("id")
        .eq("apprenant_id", apprenantId)
        .eq("quiz_type", "revision_fausses")
        .eq("quiz_id", examen.id)
        .limit(1);
      if (error) {
        console.error("Erreur vérification révision:", error.message);
      }
      if (data && data.length > 0) {
        setRevisionDejaFaite(true);
      }
    };
    checkRevision();
  }, [apprenantId, examen?.id]);

  const toggleMatiere = (mi: number) => {
    setExpandedMatieres(prev => ({ ...prev, [mi]: !prev[mi] }));
  };

  // Admin manual QRC override
  const handleAdminOverrideQrc = (mi: number, questionId: number, newPoints: number, pts: number) => {
    const clamped = clampToQuestionMax(newPoints, pts);
    const correction: CorrectionQRC = {
      estCorrect: clamped >= pts,
      pointsObtenus: clamped,
      nombrefautes: 0,
      explication: `Correction manuelle par l'administrateur : ${clamped}/${pts} pts`,
    };
    setCorrectionsIA(prev => ({
      ...prev,
      [mi]: { ...(prev[mi] || {}), [questionId]: correction },
    }));
    setEditingQrc(null);
    toast.success(`QRC corrigée : ${clamped}/${pts} pts`);
  };

  // Save AI corrections to DB once complete
  const saveCorrectionsToDb = async (finalCorrections: { [matiereIdx: number]: CorrectionCache }) => {
    if (!apprenantId || !userId) return;
    const quizType = examen.id.startsWith("bilan-") ? "bilan" : "examen_blanc";
    
    for (let mi = 0; mi < examen.matieres.length; mi++) {
      const matiere = examen.matieres[mi];
      if (!matiere) continue;
      const cache = finalCorrections[mi];
      if (!cache) continue;
      
      // Only save if all QRC corrections are done (no "loading")
      const hasLoading = Object.values(cache).some(v => v === "loading");
      if (hasLoading) continue;

      // Serialize corrections (convert "error" to a proper object)
      const serializedCache: Record<string, any> = {};
      for (const [qId, val] of Object.entries(cache)) {
        if (val === "error") {
          serializedCache[qId] = { estCorrect: false, pointsObtenus: 0, nombrefautes: 0, explication: "Erreur de correction" };
        } else if (val !== "loading") {
          serializedCache[qId] = val;
        }
      }

      // Recalculate score with IA corrections
      const resultat = resultats[mi];
      if (!resultat) continue;
      const questionsSafe = (matiere.questions || []).filter(q => q && q?.type !== undefined);
      let noteRecalculee = 0;
      questionsSafe.forEach(q => {
        if (!q) return;
        if (q?.type === "QCM" && q.choix) {
          const correctes = safeArray<string>(q.choix?.filter(c => c.correct).map(c => c.lettre)).sort();
          const donnees = safeArray<string>(resultat.reponses?.[q.id]).sort();
          if (JSON.stringify(correctes) === JSON.stringify(donnees)) {
            noteRecalculee += getPointsParQuestion(matiere.id, q?.type || "QCM", matiere);
          }
        } else if (q?.type === "QRC") {
          const correction = cache[q.id];
          if (correction && correction !== "loading" && correction !== "error") {
            noteRecalculee += clampToQuestionMax(
              correction.pointsObtenus,
              getPointsParQuestion(matiere.id, q?.type || "QRC", matiere)
            );
          }
        }
      });

      const safeMax = Math.max(toFiniteNumber(resultat.maxPoints, 0), 0);
      const noteRecalculeeSecurisee = safeMax > 0 ? clamp(noteRecalculee, 0, safeMax) : Math.max(noteRecalculee, 0);
      const scoreInitial = Math.max(toFiniteNumber(resultat.noteObtenue, 0), 0);
      const scoreProtege = noteRecalculeeSecurisee <= 0 && scoreInitial > 0 ? scoreInitial : noteRecalculeeSecurisee;
      const noteSur20 = normalizeNoteSur20(scoreProtege, safeMax);

      // Update the existing row with corrections
      await supabase
        .from("apprenant_quiz_results" as any)
        .update({
          score_obtenu: scoreProtege,
          note_sur_20: noteSur20,
          reussi: computeAdmisForMatiere(
            scoreProtege,
            safeMax,
            resultat.noteEliminatoire,
            resultat.noteSur,
            Boolean(resultat.admis)
          ),
          details: {
            questions: (resultat as any).details?.questions || [],
            reponses: resultat.reponses,
            correctionsIA: serializedCache,
          },
        } as any)
        .eq("apprenant_id", apprenantId)
        .eq("quiz_id", examen.id)
        .eq("quiz_type", quizType)
        .eq("matiere_id", matiere.id);
    }
  };

  // Mode hybride : correction IA en arrière-plan, ne peut qu'AMÉLIORER le score déterministe
  useEffect(() => {
    // Skip AI correction if viewing saved results or already has corrections
    if (!ENABLE_AI_QRC_CORRECTION || hasPreloadedCorrections || isViewingSaved) return;

    let cancelled = false;
    const corrigerTout = async () => {
      // Collect QRC questions that got less than max points with deterministic
      const qrcToCorrect: { mi: number; q: Question; rep: string; pts: number; deterministicScore: number }[] = [];
      examen.matieres.forEach((matiere, mi) => {
        if (!matiere) return;
        const resultat = resultats[mi];
        if (!resultat) return;
        const questionsSafe = (matiere.questions || []).filter(q => q && q?.type !== undefined);
        questionsSafe.forEach(q => {
          if (!q || q?.type !== "QRC") return;
          const rep = safeStr(resultat.reponses?.[q.id]);
          if (!rep.trim()) return; // skip empty answers
          const pts = getPointsParQuestion(matiere.id, q?.type || "QRC", matiere);
          const deterResult = evaluateQrcDeterministic(q, rep, pts);
          // Only call AI if deterministic didn't give full points
          if (deterResult.pointsObtenus < pts) {
            qrcToCorrect.push({ mi, q, rep, pts, deterministicScore: deterResult.pointsObtenus });
          }
        });
      });

      if (qrcToCorrect.length === 0) return;

      // Don't block the UI - show a subtle indicator
      setCorrectionEnCours(true);

      const finalCorrections: { [matiereIdx: number]: CorrectionCache } = {};

      try {
        for (const { mi, q, rep, pts, deterministicScore } of qrcToCorrect) {
          if (cancelled) return;
          const matiere = examen.matieres[mi];
          if (!matiere) continue;

          try {
            const isCalc = isCalculQuestion(q);
            const invokePromise = supabase.functions.invoke("corriger-qrc", {
              body: {
                question: q.enonce,
                reponseEtudiant: rep,
                reponsesAttendues: q.reponses_possibles || [q.reponseQRC || ""],
                matiereId: matiere.id,
                pointsQuestion: pts,
                isCalcul: isCalc,
                reponseQRC: q.reponseQRC || "",
              },
            });

            const timeoutPromise = new Promise<never>((_, reject) => {
              window.setTimeout(() => reject(new Error("IA timeout")), 12000);
            });

            const { data, error } = await Promise.race([invokePromise, timeoutPromise]);

            if (cancelled) return;

            if (error || !data || (data as any).error) {
              // AI failed → keep deterministic score, no change
              continue;
            }

            const safeData = data as CorrectionQRC;
            let aiScore = clampToQuestionMax(safeData.pointsObtenus, pts);

            // HYBRID RULE: AI can only UPGRADE the score, never downgrade
            if (AI_ONLY_UPGRADES && aiScore <= deterministicScore) {
              // AI didn't improve → keep deterministic
              continue;
            }

            const clamped: CorrectionQRC = {
              ...safeData,
              pointsObtenus: aiScore,
            };

            if (!finalCorrections[mi]) finalCorrections[mi] = {};
            finalCorrections[mi][q.id] = clamped;

            if (!cancelled) {
              setCorrectionsIA(prev => ({
                ...prev,
                [mi]: { ...(prev[mi] || {}), [q.id]: clamped },
              }));
            }
          } catch {
            // Timeout or network error → keep deterministic, no blocking
            continue;
          }

          await new Promise(r => setTimeout(r, 300));
        }

        if (!cancelled && Object.keys(finalCorrections).length > 0) {
          saveCorrectionsToDb(finalCorrections);
        }
      } finally {
        if (!cancelled) setCorrectionEnCours(false);
      }
    };

    corrigerTout();
    return () => { cancelled = true; };
  }, [examen, resultats, hasPreloadedCorrections, isViewingSaved]);

  // Résultats sécurisés + score matière recalculé depuis le détail affiché
  // pour garder la note principale strictement alignée avec les sous-notes.
  const resultatsAvecIA = resultats.map((r, mi) => {
    const safeMaxPoints = Math.max(toFiniteNumber(r.maxPoints, 0), 0);
    const matiere = examen.matieres[mi];
    const questionsSafe = matiere ? (matiere.questions || []).filter((q): q is Question => q != null && q?.type !== undefined) : [];
    const cacheMatiere = correctionsIA[mi] || {};

    const recalculatedFromDetails = questionsSafe.reduce((acc, q) => {
      const pts = getPointsParQuestion(matiere?.id ?? "", q?.type || "QRC", matiere);
      const rep = r.reponses?.[q.id];

      if (q?.type === "QCM" && q.choix) {
        const correctes = safeArray<string>(q.choix.filter(c => c.correct).map(c => c.lettre)).sort();
        const donnees = safeArray<string>(rep).sort();
        return acc + (JSON.stringify(correctes) === JSON.stringify(donnees) ? pts : 0);
      }

      if (q?.type === "QRC") {
        const corrIA = cacheMatiere[q.id];
        const fallback = evaluateQrcDeterministic(q, rep, pts);
        if (corrIA && corrIA !== "loading" && corrIA !== "error") {
          return acc + clampToQuestionMax(corrIA.pointsObtenus, pts);
        }
        return acc + clampToQuestionMax(fallback.pointsObtenus, pts);
      }

      return acc;
    }, 0);

    const scoreInitial = Math.max(toFiniteNumber(r.noteObtenue, 0), 0);
    const baseNote = questionsSafe.length > 0 ? recalculatedFromDetails : scoreInitial;
    const safeNoteCandidate = safeMaxPoints > 0
      ? clamp(baseNote, 0, safeMaxPoints)
      : Math.max(baseNote, 0);
    const safeNote = safeNoteCandidate <= 0 && scoreInitial > 0 ? scoreInitial : safeNoteCandidate;

    return {
      ...r,
      noteObtenue: Number(safeNote.toFixed(1)),
      admis: computeAdmisForMatiere(safeNote, safeMaxPoints, r.noteEliminatoire, r.noteSur, Boolean(r.admis)),
    };
  });

  // Auto-save recalculated scores to DB for ALL users (not just admin)
  // so the list view averages stay in sync with the detail view
  useEffect(() => {
    if (!apprenantId || !examen) return;
    const quizType = examen.id?.startsWith("taxi") ? "examen_blanc_taxi" : "examen_blanc";
    resultatsAvecIA.forEach(async (r, mi) => {
      const matiere = examen.matieres[mi];
      if (!matiere) return;
      const safeMax = Math.max(toFiniteNumber(r.maxPoints, 0), 0);
      const scoreInitial = Math.max(toFiniteNumber(resultats[mi]?.noteObtenue, 0), 0);
      const scoreProtege = toFiniteNumber(r.noteObtenue, 0) <= 0 && scoreInitial > 0
        ? scoreInitial
        : Math.max(toFiniteNumber(r.noteObtenue, 0), 0);
      const noteSur20 = normalizeNoteSur20(scoreProtege, safeMax);
      // Also save the correctionsIA in the details column for admin overrides
      const cacheMatiere = correctionsIA[mi] || {};
      const serializedCache: Record<string, CorrectionQRC> = {};
      for (const [k, v] of Object.entries(cacheMatiere)) {
        if (v && v !== "loading" && v !== "error") serializedCache[k] = v;
      }
      await supabase
        .from("apprenant_quiz_results" as any)
        .update({
          score_obtenu: scoreProtege,
          note_sur_20: noteSur20,
          reussi: computeAdmisForMatiere(scoreProtege, safeMax, r.noteEliminatoire, r.noteSur, Boolean(r.admis)),
          details: {
            questions: (resultats[mi] as any)?.details?.questions || [],
            reponses: r.reponses,
            correctionsIA: Object.keys(serializedCache).length > 0 ? serializedCache : undefined,
          },
        } as any)
        .eq("apprenant_id", apprenantId)
        .eq("quiz_id", examen.id)
        .eq("quiz_type", quizType)
        .eq("matiere_id", matiere.id);
    });
  }, [isViewingSaved, resultatsAvecIA.map(r => r.noteObtenue).join(",")]);

  const totalCoef = resultatsAvecIA.reduce((acc, r) => acc + (r.coefficient || 1), 0) || 1;
  const noteGlobaleBrute = resultatsAvecIA.reduce((acc, r) => {
    return acc + normalizeNoteSur20(r.noteObtenue, r.maxPoints) * (r.coefficient || 1);
  }, 0) / totalCoef;
  const noteGlobale = clamp(toFiniteNumber(noteGlobaleBrute, 0), 0, 20);
  const hasNoteEliminatoire = resultatsAvecIA.some(r => !r.admis);
  const moyenneSuffisante = noteGlobale >= 10;
  const admisGlobal = moyenneSuffisante && !hasNoteEliminatoire;

  // Matières avec note éliminatoire
  const matieresEliminatoires = resultatsAvecIA
    .filter(r => !r.admis)
    .map(r => r.nomMatiere.split(" - ")[0]);

  // Detect if QRC corrections are pending (for présentiel: formateur must validate)
  const hasQrcPendingValidation = isPresentiel && !isAdmin && (() => {
    for (let mi = 0; mi < examen.matieres.length; mi++) {
      const matiere = examen.matieres[mi];
      if (!matiere) continue;
      const resultatMatiere = resultatsAvecIA[mi];
      const questionsSafe = (matiere.questions || []).filter((q): q is Question => q != null && q?.type !== undefined);
      const qrcQuestions = questionsSafe.filter(q => q?.type === "QRC");
      if (qrcQuestions.length === 0) continue;
      const cacheMatiere = correctionsIA[mi] || {};
      for (const q of qrcQuestions) {
        // Skip QRC where student didn't provide any answer — auto-0, no validation needed
        const reponseEleve = resultatMatiere?.reponses?.[q.id] ?? resultatMatiere?.reponses?.[String(q.id)];
        const reponseStr = typeof reponseEleve === "string" ? reponseEleve.trim() : "";
        if (!reponseStr) continue; // No answer = auto 0 pts, no need for formateur validation

        const corr = cacheMatiere[q.id] ?? cacheMatiere[String(q.id)];
        // A QRC is considered validated by formateur if it has a manual correction
        if (!corr || corr === "loading" || corr === "error") return true;
        const corrObj = corr as CorrectionQRC;
        if (!corrObj.explication?.includes("Correction manuelle") && !corrObj.explication?.includes("manuelle")) return true;
      }
    }
    return false;
  })();

  return (
    <div className="space-y-6">
      {/* Bandeau correction IA en cours */}
      {correctionEnCours && (
        <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
          <Bot className="w-4 h-4 shrink-0" />
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          <span>L'IA affine vos réponses ouvertes (QRC)... Les notes peuvent légèrement s'améliorer.</span>
        </div>
      )}

      {/* Header résultats FTRANSPORT */}
      {hasQrcPendingValidation ? (
        <div className="rounded-xl overflow-hidden border-2 border-amber-400">
          <div className="p-8 text-center text-white" style={{ backgroundColor: '#0D2540' }}>
            <Clock className="w-14 h-14 mx-auto mb-3 text-amber-400" />
            <h3 className="text-3xl font-black mb-2 text-amber-400">
              En attente de validation du formateur
            </h3>
            <p className="text-lg text-gray-300 mt-2">
              Vos réponses aux questions ouvertes (QRC) doivent être corrigées par votre formateur avant d'obtenir votre résultat final.
            </p>
            <p className="text-sm text-gray-400 mt-3">{examen.titre}</p>
          </div>
        </div>
      ) : (
      <div className="rounded-xl overflow-hidden border-2" style={{ borderColor: admisGlobal ? '#00B4D8' : '#ef4444' }}>
        <div className="p-6 text-center text-white" style={{ backgroundColor: '#0D2540' }}>
          {admisGlobal ? (
            <Trophy className="w-12 h-12 mx-auto mb-2" style={{ color: '#F4A227' }} />
          ) : (
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-2" />
          )}
          <h3 className="text-2xl font-bold mb-1">
            {admisGlobal
              ? "Examen blanc réussi ✅"
              : "Examen blanc échoué ❌"
            }
          </h3>
          <p className="text-4xl font-black mt-2" style={{ color: '#00B4D8' }}>
            {isFinite(noteGlobale) ? noteGlobale.toFixed(1) : "0.0"} / 20
            {correctionEnCours && <Loader2 className="w-5 h-5 animate-spin inline ml-2 text-blue-300" />}
          </p>
          <p className="text-sm text-gray-300 mt-1">
            Moyenne pondérée par coefficients sur {resultatsAvecIA.length} matières
          </p>
          {!admisGlobal && (
            <div className="mt-3 space-y-1">
              {!moyenneSuffisante && (
                <p className="text-sm text-red-300 font-medium">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  Moyenne inférieure à 10/20
                </p>
              )}
              {hasNoteEliminatoire && (
                <p className="text-sm text-red-300 font-medium">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  Note éliminatoire en : {matieresEliminatoires.join(", ")}
                </p>
              )}
            </div>
          )}
          <p className="text-sm text-gray-400 mt-1">{examen.titre}</p>
        </div>
      </div>
      )}

      {/* Détail par matière — sous-totaux groupés */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-6 rounded-full" style={{ backgroundColor: '#00B4D8' }} />
          <h4 className="font-semibold text-lg" style={{ color: '#0D2540' }}>Résultats par matière</h4>
        </div>
        {resultatsAvecIA.map((r, mi) => {
          const safeMaxPoints = Math.max(toFiniteNumber(r.maxPoints, 0), 0);
          const noteObtenueSafe = safeMaxPoints > 0
            ? clamp(toFiniteNumber(r.noteObtenue, 0), 0, safeMaxPoints)
            : Math.max(toFiniteNumber(r.noteObtenue, 0), 0);
          const noteSur20 = normalizeNoteSur20(noteObtenueSafe, safeMaxPoints);
          const matiereEnCours = Object.values(correctionsIA[mi] || {}).some(v => v === "loading");
          const pctScore = safeMaxPoints > 0 ? Math.min((noteObtenueSafe / safeMaxPoints) * 100, 100) : 0;
          const matiere = examen.matieres[mi];
          const cacheMatiere = correctionsIA[mi] || {};
          const questionsSafe = matiere ? (matiere.questions || []).filter(q => q && q?.type !== undefined) : [];
          const isExpanded = !!expandedMatieres[mi];
          return (
            <Card key={r.matiereId} className="border-l-4 overflow-hidden" style={{ borderLeftColor: r.admis ? '#00B4D8' : '#ef4444' }}>
              <div className="px-4 py-2 flex items-center gap-2" style={{ backgroundColor: '#0D2540' }}>
                <span className="text-xs font-semibold text-white">Matière {mi + 1}/{resultatsAvecIA.length}</span>
                <span className="text-xs font-medium" style={{ color: '#00B4D8' }}>— Coeff. {r.coefficient || 1}</span>
                {!r.admis && <span className="text-xs font-semibold text-red-400 ml-auto">⚠ Note éliminatoire</span>}
                {matiereEnCours && <span className="text-xs flex items-center gap-1 ml-auto" style={{ color: '#00B4D8' }}><Loader2 className="w-3 h-3 animate-spin" />IA en cours</span>}
              </div>
              <div className="cursor-pointer" onClick={() => toggleMatiere(mi)}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm" style={{ color: '#0D2540' }}>{r.nomMatiere}</p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-xs text-muted-foreground">Barème : {r.maxPoints} pts</span>
                        <span className="text-xs text-muted-foreground">Éliminatoire sous {r.noteEliminatoire}/{r.noteSur || 20}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-lg font-bold" style={{ color: r.admis ? '#00B4D8' : '#ef4444' }}>
                          {noteObtenueSafe} / {safeMaxPoints} pts
                        </span>
                        <p className="text-xs text-muted-foreground">= {noteSur20.toFixed(1)} / 20</p>
                      </div>
                      {r.admis ? (
                        <CheckCircle2 className="w-5 h-5" style={{ color: '#00B4D8' }} />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                      <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                    </div>
                  </div>
                  <Progress
                    value={pctScore}
                    className={`h-2 mt-2 ${r.admis ? "[&>*]:bg-[#00B4D8]" : "[&>*]:bg-red-500"}`}
                  />
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    {isExpanded ? "Cliquer pour masquer la correction" : "Cliquer pour voir la correction détaillée"}
                  </p>
                </CardContent>
              </div>

              {/* Correction détaillée inline */}
              {isExpanded && (
                <CardContent className="pt-0 px-4 pb-4 space-y-3 border-t">
                  {questionsSafe.map((q, qIdx) => {
                    if (!q || !q?.type) return null;
                    const rep = r.reponses?.[q.id];
                    const pts = getPointsParQuestion(matiere?.id ?? "", q?.type, matiere);
                    let isCorrect = false;
                    let pointsObtenus = 0;
                    let correctionDetail: string | null = null;
                    let isLoadingIA = false;

                    if (q?.type === "QCM" && q.choix) {
                      const correctes = safeArray<string>(q.choix?.filter(c => c.correct).map(c => c.lettre)).sort();
                       const donnees = safeArray<string>(rep).sort();
                       isCorrect = JSON.stringify(correctes) === JSON.stringify(donnees);
                       pointsObtenus = isCorrect ? pts : 0;
                    } else if (q?.type === "QRC") {
                      const corrIA = cacheMatiere[q.id];
                      const fallback = evaluateQrcDeterministic(q, rep, pts);
                      if (corrIA === "loading") {
                        isLoadingIA = true;
                      } else if (corrIA && corrIA !== "error") {
                        pointsObtenus = clampToQuestionMax(corrIA.pointsObtenus, pts);
                        isCorrect = Boolean(corrIA.estCorrect) && pointsObtenus >= pts;
                        correctionDetail = corrIA.explication;
                      } else {
                        isCorrect = fallback.estCorrect;
                        pointsObtenus = fallback.pointsObtenus;
                        correctionDetail = corrIA === "error"
                          ? `Correction IA indisponible. ${fallback.explication}`
                          : fallback.explication;
                      }
                    }

                    return (
                      <div key={q.id} className={`p-3 rounded-lg border ${isLoadingIA ? "bg-blue-50 border-blue-200" : isCorrect ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                        <div className="flex items-start gap-2">
                          {isLoadingIA ? (
                            <Loader2 className="w-4 h-4 text-blue-500 shrink-0 mt-0.5 animate-spin" />
                          ) : isCorrect ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <div className="flex items-center gap-1.5 flex-1">
                                <Badge variant={q?.type === "QRC" ? "secondary" : "outline"} className="text-xs shrink-0">{q?.type}</Badge>
                                <p className="text-sm font-bold">Q{qIdx + 1}. {q.enonce}</p>
                                {q?.image && (
                                  <ExamQuestionImage
                                    image={q.image}
                                    alt={`Illustration de la question Q${qIdx + 1}`}
                                    className="mt-1 max-h-24 rounded border"
                                    fallbackClassName="mt-1 text-xs text-muted-foreground italic"
                                  />
                                )}
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {q?.type === "QRC" && <Bot className="w-3 h-3 text-blue-500" aria-label="Corrigé par IA" />}
                                {isLoadingIA ? (
                                  <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-blue-200 text-blue-800">? / {pts} pt{pts > 1 ? "s" : ""}</span>
                                ) : (
                                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${isCorrect ? "bg-green-200 text-green-800" : pointsObtenus > 0 ? "bg-amber-200 text-amber-800" : "bg-red-200 text-red-800"}`}>+{pointsObtenus} / {pts} pt{pts > 1 ? "s" : ""}</span>
                                )}
                              </div>
                            </div>

                            {q?.type === "QCM" && (
                              <div className="mt-2 space-y-1.5">
                                {(q.choix || []).map(c => {
                                  const isSelected = Array.isArray(rep) && rep.includes(c.lettre);
                                  const isCorrectChoice = c.correct === true;
                                  let classes = "text-sm flex items-center gap-2 px-3 py-2 rounded-lg border-2 ";
                                  if (isCorrectChoice) {
                                    classes += "bg-green-100 border-green-500 text-green-900 font-semibold";
                                  } else if (isSelected && !isCorrectChoice) {
                                    classes += "bg-red-50 border-red-400 text-red-800";
                                  } else {
                                    classes += "border-muted bg-muted/30 text-muted-foreground";
                                  }
                                    return (
                                      <div key={c.lettre}>
                                        <div className={classes}>
                                          <span className="font-bold shrink-0">{c.lettre})</span>
                                          <span className="flex-1">{c.texte}</span>
                                          {isCorrectChoice && <span className="text-green-700 font-bold text-xs bg-green-200 px-2 py-0.5 rounded-full shrink-0">✓ Bonne réponse</span>}
                                          {isSelected && !isCorrectChoice && <span className="text-red-600 font-bold text-xs bg-red-200 px-2 py-0.5 rounded-full shrink-0">✗ Votre choix</span>}
                                          {isSelected && isCorrectChoice && <span className="text-green-700 font-bold text-xs bg-green-300 px-2 py-0.5 rounded-full shrink-0">✓ Votre choix</span>}
                                        </div>
                                        {c.explication && (isSelected || isCorrectChoice) && (
                                          <p className="text-xs text-muted-foreground italic ml-8 mt-1">💡 {c.explication}</p>
                                        )}
                                      </div>
                                    );
                                })}
                                <div className="mt-2 flex flex-wrap gap-3 text-sm">
                                  <span className="font-medium text-muted-foreground">Votre réponse : <strong className={isCorrect ? "text-green-700" : "text-red-600"}>{Array.isArray(rep) && rep.length > 0 ? rep.join(", ") : "Aucune"}</strong></span>
                                  <span className="font-medium text-green-700">Bonne réponse : <strong>{(q.choix || []).filter(c => c.correct).map(c => c.lettre).join(", ") || "—"}</strong></span>
                                </div>
                              </div>
                            )}

                            {q?.type === "QRC" && (
                              <div className="mt-1 space-y-1">
                                {rep != null && <p className="text-xs italic text-muted-foreground">Votre réponse : {String(rep) || "Aucune"}</p>}
                                {isCalculQuestion(q) && !isLoadingIA && pointsObtenus > 0 && !isCorrect && (
                                  <div className="flex items-start gap-1 text-xs text-amber-700 bg-amber-50 rounded p-1.5 border border-amber-200">
                                    <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                                    <span>Vous avez trouvé le bon résultat mais le détail du calcul est manquant → {pointsObtenus}/{pts} pts</span>
                                  </div>
                                )}
                                {correctionDetail && (
                                  <div className="flex items-start gap-1 text-xs text-blue-700 bg-blue-50 rounded p-1.5">
                                    <Bot className="w-3 h-3 shrink-0 mt-0.5" /><span>{correctionDetail}</span>
                                  </div>
                                )}
                                <p className="text-xs text-green-700 font-medium">Réponse attendue : {q.reponseQRC || (q.reponses_possibles || []).join(" / ") || "—"}</p>
                                {/* Admin manual QRC override */}
                                {isAdmin && !isLoadingIA && (
                                  <div className="mt-2">
                                    {editingQrc === `${mi}-${q.id}` ? (
                                      <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-300 rounded-lg">
                                        <Pencil className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                        <span className="text-xs font-medium text-amber-800">Points :</span>
                                        <input
                                          type="number"
                                          min={0}
                                          max={pts}
                                          step={0.5}
                                          value={editingPoints}
                                          onChange={(e) => setEditingPoints(Number(e.target.value))}
                                          className="w-16 px-2 py-1 text-xs border rounded text-center font-bold"
                                          autoFocus
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter") handleAdminOverrideQrc(mi, q.id, editingPoints, pts);
                                            if (e.key === "Escape") setEditingQrc(null);
                                          }}
                                        />
                                        <span className="text-xs text-amber-700">/ {pts}</span>
                                        <Button
                                          size="sm"
                                          variant="default"
                                          className="h-6 px-2 text-xs"
                                          onClick={() => handleAdminOverrideQrc(mi, q.id, editingPoints, pts)}
                                        >
                                          ✓ Valider
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-6 px-2 text-xs"
                                          onClick={() => setEditingQrc(null)}
                                        >
                                          Annuler
                                        </Button>
                                      </div>
                                    ) : (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-6 px-2 text-xs gap-1 border-amber-300 text-amber-700 hover:bg-amber-50"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingQrc(`${mi}-${q.id}`);
                                          setEditingPoints(pointsObtenus);
                                        }}
                                      >
                                        <Pencil className="w-3 h-3" />
                                        Corriger manuellement
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              )}
            </Card>
          );
        })}

        {/* Score global résumé */}
        {hasQrcPendingValidation ? (
          <Card className="border-2 border-amber-400">
            <CardContent className="py-6 px-5 text-center">
              <Clock className="w-8 h-8 mx-auto mb-2 text-amber-500" />
              <p className="text-xl font-black text-amber-600">En attente de validation du formateur</p>
              <p className="text-sm text-muted-foreground mt-1">Le résultat final sera disponible après correction des QRC par votre formateur.</p>
            </CardContent>
          </Card>
        ) : (
        <Card className="border-2" style={{ borderColor: '#F4A227' }}>
          <CardContent className="py-4 px-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold" style={{ color: '#0D2540' }}>Score global pondéré</p>
                <p className="text-xs text-muted-foreground">{resultatsAvecIA.length} matières • Coefficients appliqués</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black" style={{ color: admisGlobal ? '#00B4D8' : '#ef4444' }}>
                  {isFinite(noteGlobale) ? noteGlobale.toFixed(1) : "0.0"} / 20
                </p>
                <p className="text-xs font-semibold" style={{ color: admisGlobal ? '#00B4D8' : '#ef4444' }}>
                  {admisGlobal ? "ADMIS" : "NON ADMIS"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        )}
      </div>

      {/* Bouton refaire les fausses — EN HAUT bien visible */}
      {!hasQrcPendingValidation && (() => {
        let nbFaussesTop = 0;
        resultatsAvecIA.forEach((r, mi) => {
          if (r.matiereId === "francais" || r.matiereId === "bilan_francais") return;
          const matiere = examen.matieres[mi];
          if (!matiere) return;
          const qSafe = (matiere.questions || []).filter((q): q is Question => !!q && q?.type !== undefined);
          qSafe.forEach(q => {
            const rep = r.reponses?.[q.id];
            if (q?.type === "QCM" && q.choix) {
              const correctes = safeArray<string>(q.choix?.filter(c => c.correct).map(c => c.lettre)).sort();
               const donnees = safeArray<string>(rep).sort();
               if (JSON.stringify(correctes) !== JSON.stringify(donnees)) nbFaussesTop++;
            } else if (q?.type === "QRC") {
              const corrIA = correctionsIA[mi]?.[q.id];
              if (corrIA && corrIA !== "loading" && corrIA !== "error") {
                if (!corrIA.estCorrect) nbFaussesTop++;
              } else {
                const fallback = evaluateQrcDeterministic(q, rep, getPointsParQuestion(matiere.id, q?.type || "QRC", matiere));
                if (!fallback.estCorrect) nbFaussesTop++;
              }
            }
          });
        });
        if (nbFaussesTop === 0) return null;
        return (
          <Button
            onClick={onRefaireFausses}
            className="w-full gap-2 text-lg py-6 font-bold shadow-lg"
            style={{ backgroundColor: '#F4A227', borderColor: '#F4A227', color: 'white', fontSize: '18px' }}
          >
            🎯 Refaire uniquement les questions fausses ({nbFaussesTop} questions)
          </Button>
        );
      })()}

      {revisionDejaFaite && (
        <div className="w-full text-center py-3 px-4 rounded-lg bg-green-50 border border-green-200">
          <p className="text-sm font-semibold text-green-700 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Questions fausses déjà effectuées ✅
          </p>
        </div>
      )}


      {/* Bilan automatique */}
      {(() => {
        const bilan = generateBilanAuto();
        if (!bilan) return null;
        return (
          <Card className="border-2 border-primary/30 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Bot className="w-5 h-5 text-primary" />
                Bilan de votre examen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{bilan}</p>
            </CardContent>
          </Card>
        );
      })()}

      {/* Boutons */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onRetour} className={`${canRetry ? "flex-1" : "w-full"} gap-2`}>
          <ArrowLeft className="w-4 h-4" />
          Retour aux examens
        </Button>
        {canRetry && (
          <Button onClick={onRecommencer} className="flex-1 gap-2">
            <RotateCcw className="w-4 h-4" />
            Recommencer
          </Button>
        )}
      </div>
    </div>
  );
}

// ===== RÉVISION DES QUESTIONS FAUSSES =====


function RevisionFausses({
  wrongQuestions,
  onTerminer,
  apprenantId,
  userId,
  examenId,
}: {
  wrongQuestions: { matiere: Matiere; question: Question; matiereNom: string }[];
  onTerminer: () => void;
  apprenantId?: string | null;
  userId?: string | null;
  examenId?: string | null;
}) {
  const [reponses, setReponses] = useState<Reponses>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showCorrection, setShowCorrection] = useState(false);
  const [correctedCount, setCorrectedCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const exerciceId = `revision_fausses_${examenId || "unknown"}`;

  // ---- Load saved progress on mount ----
  useEffect(() => {
    if (!apprenantId || !userId || !examenId || wrongQuestions.length === 0) {
      setLoaded(true);
      return;
    }
    (async () => {
      try {
        const { data } = await supabase
          .from("reponses_apprenants")
          .select("reponses, score")
          .eq("apprenant_id", apprenantId)
          .eq("exercice_id", exerciceId)
          .eq("exercice_type", "revision_fausses")
          .eq("completed", false)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data?.reponses && typeof data.reponses === "object") {
          const saved = data.reponses as any;
          if (saved.answers && typeof saved.answers === "object") {
            setReponses(saved.answers);
          }
          if (typeof saved.currentIndex === "number" && saved.currentIndex >= 0 && saved.currentIndex < wrongQuestions.length) {
            setCurrentIndex(saved.currentIndex);
          }
          if (typeof saved.correctedCount === "number") {
            setCorrectedCount(saved.correctedCount);
          }
          // If the saved question was already corrected (showCorrection), restore that state
          if (saved.correctedQuestions && Array.isArray(saved.correctedQuestions)) {
            const idx = typeof saved.currentIndex === "number" ? saved.currentIndex : 0;
            if (idx < wrongQuestions.length) {
              const qId = wrongQuestions[idx]?.question?.id;
              if (qId && saved.correctedQuestions.includes(qId)) {
                setShowCorrection(true);
              }
            }
          }
        }
      } catch (err) {
        console.error("Erreur chargement révision:", err);
      } finally {
        setLoaded(true);
      }
    })();
  }, [apprenantId, userId, examenId, exerciceId, wrongQuestions.length]);

  // ---- Persist progress (debounced) ----
  const correctedQuestionsRef = useRef<string[]>([]);

  const persistProgress = useCallback((
    newReponses: Reponses,
    newIndex: number,
    newCorrectedCount: number,
    correctedQuestions: string[],
  ) => {
    if (!apprenantId || !userId) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const payload = {
          apprenant_id: apprenantId,
          user_id: userId,
          exercice_id: exerciceId,
          exercice_type: "revision_fausses",
          reponses: {
            answers: newReponses,
            currentIndex: newIndex,
            correctedCount: newCorrectedCount,
            correctedQuestions,
          },
          score: newCorrectedCount,
          completed: false,
        };
        // Try upsert
        const { error } = await supabase
          .from("reponses_apprenants")
          .upsert(payload as any, { onConflict: "apprenant_id,exercice_id" });
        if (error) console.error("Erreur sauvegarde révision progress:", error.message);
      } catch (err) {
        console.error("Erreur sauvegarde révision progress:", err);
      }
    }, 800);
  }, [apprenantId, userId, exerciceId]);

  if (!loaded) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-primary" />
          <p className="text-sm text-muted-foreground">Chargement de votre progression…</p>
        </CardContent>
      </Card>
    );
  }

  if (wrongQuestions.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <p className="font-semibold text-lg">Aucune question fausse à réviser !</p>
          <Button className="mt-4" onClick={onTerminer}>Retour aux résultats</Button>
        </CardContent>
      </Card>
    );
  }

  const current = wrongQuestions[currentIndex];
  if (!current) return null;
  const { question: q, matiereNom } = current;
  const rep = reponses[q.id];

  const checkAnswer = () => {
    let isCorrect = false;
    if (q?.type === "QCM" && q.choix) {
       const correctes = safeArray<string>(q.choix?.filter(c => c.correct).map(c => c.lettre)).sort();
       const donnees = safeArray<string>(rep).sort();
       isCorrect = JSON.stringify(correctes) === JSON.stringify(donnees);
     } else if (q?.type === "QRC") {
       const repStr = safeStr(rep).toLowerCase().replace(/[àâäáã]/g, "a").replace(/[éèêë]/g, "e").replace(/[îïí]/g, "i").replace(/[ôöó]/g, "o").replace(/[ùûüú]/g, "u").replace(/[ç]/g, "c").replace(/[^a-z0-9 ]/g, "");
       const motsCles = Array.isArray(q.reponses_possibles) ? q.reponses_possibles : [];
      let nbTrouvees = 0;
      motsCles.forEach(mc => { const mcN = mc.toLowerCase().replace(/[àâäáã]/g, "a").replace(/[éèêë]/g, "e").replace(/[îïí]/g, "i").replace(/[ôöó]/g, "o").replace(/[ùûüú]/g, "u").replace(/[ç]/g, "c").replace(/[^a-z0-9 ]/g, ""); if (repStr.includes(mcN)) nbTrouvees++; });
      isCorrect = nbTrouvees >= motsCles.length;
    }
    const newCorrected = isCorrect ? correctedCount + 1 : correctedCount;
    if (isCorrect) setCorrectedCount(newCorrected);
    setShowCorrection(true);

    // Track corrected questions
    correctedQuestionsRef.current = [...new Set([...correctedQuestionsRef.current, String(q.id)])];
    persistProgress(reponses, currentIndex, newCorrected, correctedQuestionsRef.current);
  };

  const goNext = async () => {
    setShowCorrection(false);
    if (currentIndex < wrongQuestions.length - 1) {
      const newIdx = currentIndex + 1;
      setCurrentIndex(newIdx);
      persistProgress(reponses, newIdx, correctedCount, correctedQuestionsRef.current);
    } else {
      // Save final revision results to database
      const finalCorrected = correctedCount;
      if (apprenantId && userId && examenId) {
        try {
          // Mark the in-progress record as completed
          await supabase
            .from("reponses_apprenants")
            .upsert({
              apprenant_id: apprenantId,
              user_id: userId,
              exercice_id: exerciceId,
              exercice_type: "revision_fausses",
              reponses: {
                answers: reponses,
                currentIndex: wrongQuestions.length - 1,
                correctedCount: finalCorrected,
                correctedQuestions: correctedQuestionsRef.current,
              },
              score: finalCorrected,
              completed: true,
            } as any, { onConflict: "apprenant_id,exercice_id" });

          const { error } = await supabase
            .from("apprenant_quiz_results")
            .insert({
              apprenant_id: apprenantId,
              user_id: userId,
              quiz_type: "revision_fausses",
              quiz_id: examenId,
              quiz_titre: `Révision questions fausses — ${examenId}`,
              score_obtenu: finalCorrected,
              score_max: wrongQuestions.length,
              note_sur_20: Math.round((finalCorrected / wrongQuestions.length) * 20 * 2) / 2,
              reussi: finalCorrected === wrongQuestions.length,
              details: {
                reponses,
                questions: wrongQuestions.map(wq => ({
                  questionId: wq.question.id,
                  matiereId: wq.matiere.id,
                  matiereNom: wq.matiereNom,
                  enonce: wq.question.enonce,
                })),
              } as any,
            });
          if (error) {
            console.error("Erreur sauvegarde révision:", error.message, error.details);
          } else {
            console.log("Révision sauvegardée avec succès");
          }
        } catch (err) {
          console.error("Erreur sauvegarde révision:", err);
        }
      }
      toast.success(`Révision terminée ! ${finalCorrected}/${wrongQuestions.length} questions corrigées.`);
      onTerminer();
    }
  };

  const handleRecommencer = async () => {
    if (!apprenantId || !userId) return;
    // Delete saved progress
    try {
      await supabase
        .from("reponses_apprenants")
        .delete()
        .eq("apprenant_id", apprenantId)
        .eq("exercice_id", exerciceId)
        .eq("exercice_type", "revision_fausses");
    } catch (err) {
      console.error("Erreur suppression progression:", err);
    }
    setReponses({});
    setCurrentIndex(0);
    setShowCorrection(false);
    setCorrectedCount(0);
    correctedQuestionsRef.current = [];
    toast.info("Révision réinitialisée.");
  };

  // Update reponses with persistence
  const updateReponse = (questionId: number | string, value: any) => {
    const newReponses = { ...reponses, [questionId]: value };
    setReponses(newReponses);
    persistProgress(newReponses, currentIndex, correctedCount, correctedQuestionsRef.current);
  };

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center justify-between">
        <Badge style={{ backgroundColor: '#0D2540', color: '#00B4D8' }}>
          Question Q{q?.id ?? "?"} ({currentIndex + 1} / {wrongQuestions.length})
        </Badge>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{matiereNom}</span>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground hover:text-destructive"
            onClick={handleRecommencer}
          >
            <RotateCcw className="w-3 h-3 mr-1" /> Recommencer
          </Button>
        </div>
      </div>
      <Progress value={((currentIndex + 1) / wrongQuestions.length) * 100} className="h-2" />

      <Card className="border-2" style={{ borderColor: '#0D2540' }}>
        <CardContent className="pt-5 pb-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <p className="font-semibold text-base flex-1" style={{ color: '#0D2540' }}>
              {q.enonce}
            </p>
            <Badge variant="outline" className="shrink-0 text-xs font-semibold text-primary border-primary/40">
              {getPointsParQuestion(current.matiere.id, q?.type || "QCM", current.matiere)} pt{getPointsParQuestion(current.matiere.id, q?.type || "QCM", current.matiere) > 1 ? "s" : ""}
            </Badge>
          </div>
          {q?.image && (
            <ExamQuestionImage
              image={q.image}
              alt={`Illustration de la question ${q.id}`}
              className="mt-2 max-h-40 rounded-lg border"
              fallbackClassName="mt-2 text-xs text-muted-foreground italic"
            />
          )}

          {q?.type === "QCM" && q.choix && (
            <div className="space-y-2">
              {q.choix.map(c => {
                const selected = safeArray<string>(rep).includes(c.lettre);
                const isCorrectChoice = c.correct;
                let borderColor = selected ? '#0D2540' : '#e5e7eb';
                let bgColor = 'transparent';
                if (showCorrection) {
                  if (isCorrectChoice) { borderColor = '#22c55e'; bgColor = '#f0fdf4'; }
                  else if (selected && !isCorrectChoice) { borderColor = '#ef4444'; bgColor = '#fef2f2'; }
                }
                return (
                    <div key={c.lettre}>
                      <div
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${showCorrection ? 'pointer-events-none' : ''}`}
                        style={{ borderColor, backgroundColor: bgColor }}
                        onClick={() => {
                          if (showCorrection) return;
                          const prev = safeArray<string>(rep);
                          const correctCount = q.choix!.filter(ch => ch.correct).length;
                          if (correctCount <= 1) {
                            updateReponse(q.id, [c.lettre]);
                          } else {
                            updateReponse(q.id, prev.includes(c.lettre) ? prev.filter(l => l !== c.lettre) : [...prev, c.lettre]);
                          }
                        }}
                      >
                        <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 ${
                          selected ? 'text-white' : ''
                        }`} style={{
                          borderColor: showCorrection && isCorrectChoice ? '#22c55e' : selected ? '#0D2540' : '#d1d5db',
                          backgroundColor: selected ? '#0D2540' : 'transparent',
                        }}>
                          {showCorrection && isCorrectChoice ? <CheckCircle2 className="w-4 h-4 text-green-600" /> :
                           showCorrection && selected && !isCorrectChoice ? <XCircle className="w-4 h-4 text-red-500" /> :
                           c.lettre}
                        </div>
                        <span className="text-sm">{c.texte}</span>
                      </div>
                      {showCorrection && c.explication && (selected || isCorrectChoice) && (
                        <p className="text-xs text-muted-foreground italic ml-10 mt-1">💡 {c.explication}</p>
                      )}
                    </div>
                  );
              })}
            </div>
          )}

          {q?.type === "QRC" && (
            <div className="space-y-2">
              <Textarea
                value={(rep as string) || ""}
                onChange={e => updateReponse(q.id, e.target.value)}
                placeholder="Saisissez votre réponse..."
                disabled={showCorrection}
                rows={3}
              />
              {showCorrection && (
                <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                  <p className="text-sm font-medium text-green-800">
                    Réponse attendue : {q.reponseQRC || (q.reponses_possibles || []).join(" / ") || "—"}
                  </p>
                </div>
              )}
            </div>
          )}

          {!showCorrection ? (
            <Button
              onClick={checkAnswer}
              disabled={!rep || (Array.isArray(rep) && rep.length === 0)}
              className="w-full gap-2"
              style={{ backgroundColor: '#0D2540' }}
            >
              Valider ma réponse
            </Button>
          ) : (
            <Button
              onClick={goNext}
              className="w-full gap-2"
              style={{ backgroundColor: '#F4A227' }}
            >
              {currentIndex < wrongQuestions.length - 1 ? (
                <>Question suivante <ArrowRight className="w-4 h-4" /></>
              ) : (
                <>Terminer la révision <CheckCircle2 className="w-4 h-4" /></>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}



export { EcranResultats, RevisionFausses };
