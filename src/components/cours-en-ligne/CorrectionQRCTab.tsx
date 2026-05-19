import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Clock, Pencil, Search, User, FileText, Filter, MessageSquare, ChevronLeft, ChevronRight, ArrowUpDown, RefreshCw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { toast } from "sonner";
import { tousLesExamens, getPointsParQuestion, type ExamenBlanc, type Matiere } from "./examens-blancs-data";
import { loadSavedExamens } from "./ExamensBlancsEditor";
import { buildExamenMap, findMatiereWithFallback, getSourceQuestions } from "./exam-helpers";

interface QrcItem {
  resultId: string;
  apprenantId: string;
  apprenantNom: string;
  apprenantPrenom: string;
  quizTitre: string;
  quizId: string;
  quizType: string;
  matiereId: string;
  matiereNom: string;
  questionId: number;
  enonce: string;
  reponseEleve: string;
  reponseCorrecte: string;
  pointsMax: number;
  pointsObtenus: number | null; // null = pas encore corrigé manuellement
  corrigeManuel: boolean;
  completedAt: string;
  autoScore: number;
  autoExplication: string | null;
  noteSur20: number | null;
  scoreMatiereObtenu: number;
  scoreMatiereMax: number;
  commentaire: string;
  correctedAt: string | null;
  apprenantTypeMode: "presentiel" | "elearning";
  questionSupprimee: boolean;
}

function safeStr(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return v.join(", ");
  try { return JSON.stringify(v); } catch { return ""; }
}

function roundToHalfStep(value: number): number {
  return Math.round(value * 2) / 2;
}

function clampToHalfStep(value: number, max: number): number {
  const safeMax = Number.isFinite(max) ? Math.max(max, 0) : 0;
  const safeValue = Number.isFinite(value) ? value : 0;
  return Math.min(Math.max(roundToHalfStep(safeValue), 0), safeMax);
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[àâäáã]/g, "a")
    .replace(/[éèêë]/g, "e")
    .replace(/[îïí]/g, "i")
    .replace(/[ôöó]/g, "o")
    .replace(/[ùûüú]/g, "u")
    .replace(/[ç]/g, "c")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function fuzzyContainsLocal(text: string, keyword: string): boolean {
  if (text.includes(keyword)) return true;
  if (keyword.length <= 3) return false;
  for (let i = 0; i < keyword.length; i++) {
    const partial = keyword.slice(0, i) + keyword.slice(i + 1);
    if (partial.length >= 3 && text.includes(partial)) return true;
  }
  const words = text.split(" ");
  for (const word of words) {
    if (word.length < 3 || keyword.length < 4) continue;
    if (Math.abs(word.length - keyword.length) <= 2) {
      let ki = 0;
      for (let wi = 0; wi < word.length && ki < keyword.length; wi++) {
        if (word[wi] === keyword[ki]) ki++;
      }
      if (ki >= keyword.length - 1) return true;
    }
  }
  return false;
}

const STOPWORDS = new Set([
  "avec", "dans", "pour", "sans", "dont", "plus", "moins", "etre", "avoir", "faire", "cette", "votre", "vous", "leur", "leurs", "entre", "sous", "aux", "des", "les", "une", "du", "de", "la", "le", "et", "ou", "au", "il", "elle", "ils", "elles", "son", "ses", "sur", "par", "qui",
]);

/** Recompute QRC auto-score from question definition + student response */
function recomputeQrcAutoScore(questionDef: any, reponseEleve: string, pointsMax: number): { autoScore: number; explication: string } {
  if (!questionDef || !reponseEleve.trim()) return { autoScore: 0, explication: "Aucune réponse." };

  const normalizedResponse = normalizeText(reponseEleve);

  // Build expected elements from question definition
  const explicitEntries: string[] = Array.isArray(questionDef.reponses_possibles) ? questionDef.reponses_possibles : [];
  let elements: string[][] = [];

  if (explicitEntries.length > 0) {
    elements = explicitEntries
      .map((entry: string) =>
        Array.from(new Set(safeStr(entry).split("|").map((alt: string) => normalizeText(alt)).filter(Boolean)))
      )
      .filter((alts: string[]) => alts.length > 0);
  }

  if (elements.length === 0) {
    const normalizedExpected = normalizeText(safeStr(questionDef.reponseQRC || ""));
    if (!normalizedExpected) return { autoScore: 0, explication: "Réponse attendue indisponible." };
    const fallbackKeywords = Array.from(new Set(
      normalizedExpected.split(" ").map(w => w.trim()).filter(w => w.length >= 3 && !STOPWORDS.has(w))
    )).slice(0, 12);
    elements = fallbackKeywords.map(kw => [kw]);
  }

  if (elements.length === 0) return { autoScore: 0, explication: "Aucun mot-clé défini." };

  const matched = elements.filter(alternatives =>
    alternatives.some(alt => fuzzyContainsLocal(normalizedResponse, alt))
  ).length;
  const total = elements.length;
  const requiredForFullPoints = total > 3 ? 3 : total <= 2 ? total : Math.ceil(total * 0.8);
  const gotFullPoints = matched >= requiredForFullPoints;
  const points = gotFullPoints
    ? pointsMax
    : clampToHalfStep((matched / requiredForFullPoints) * pointsMax, pointsMax);

  return {
    autoScore: clampToHalfStep(points, pointsMax),
    explication: `Recalcul : ${matched}/${total} élément(s) trouvés.`,
  };
}

function getQuestionResponse(reponses: Record<string | number, any>, questionId: number): any {
  return reponses?.[questionId] ?? reponses?.[String(questionId)] ?? null;
}

function buildQuestionListFromMatiere(matiere: Matiere, reponses: Record<string | number, any>): any[] {
  const sourceQuestions = getSourceQuestions(matiere, tousLesExamens);
  return sourceQuestions.map((mq: any) => {
    if (!mq) return null;
    return {
      questionId: mq.id,
      enonce: mq.enonce || "",
      type: mq.type || "QCM",
      reponseEleve: getQuestionResponse(reponses, mq.id),
      reponseCorrecte: mq.type === "QCM" && mq.choix
        ? mq.choix.filter((c: any) => c.correct).map((c: any) => c.lettre)
        : (mq.reponseQRC || (mq.reponses_possibles || []).join(" / ")),
    };
  }).filter(Boolean);
}

function scoreQuestionResponseMatch(question: any, response: string): number {
  const responseWords = normalizeText(response).split(" ").filter(w => w.length >= 4 && !STOPWORDS.has(w));
  if (responseWords.length === 0) return 0;

  const questionText = normalizeText([
    question?.enonce,
    question?.reponseQRC,
    ...(Array.isArray(question?.reponses_possibles) ? question.reponses_possibles : []),
  ].filter(Boolean).join(" "));

  const synonyms: Record<string, string[]> = {
    cible: ["niche", "marche"],
    benefice: ["marge", "resultat"],
    benifice: ["marge", "resultat"],
    intermediaire: ["apporteur", "affaires", "relation"],
    intermidiaire: ["apporteur", "affaires", "relation"],
    charge: ["cout", "revient"],
    charges: ["cout", "revient"],
  };

  return responseWords.reduce((score, word) => {
    if (fuzzyContainsLocal(questionText, word)) return score + 2;
    const aliases = synonyms[word] || [];
    return score + aliases.filter(alias => fuzzyContainsLocal(questionText, alias)).length;
  }, 0);
}

function chooseMatiereMatchingResponses(
  defaultMatiere: Matiere | undefined,
  examenMap: Record<string, ExamenBlanc>,
  matiereId: string,
  reponses: Record<string | number, any>,
): Matiere | undefined {
  if (!matiereId || !reponses || Object.keys(reponses).length === 0) return defaultMatiere;

  const candidateMap = new Map<string, Matiere>();
  if (defaultMatiere) candidateMap.set("default", defaultMatiere);
  [...Object.values(examenMap), ...tousLesExamens].forEach((exam) => {
    exam.matieres?.forEach((m) => {
      if (m.id === matiereId && Array.isArray(m.questions) && m.questions.length > 0) {
        const qrcSignature = m.questions
          .filter((q: any) => q?.type === "QRC")
          .map((q: any) => `${q.id}:${normalizeText(q.enonce || "")}`)
          .join("|");
        candidateMap.set(qrcSignature || `${exam.id}:${m.id}`, m);
      }
    });
  });

  const scoreMatiere = (matiere: Matiere | undefined) => {
    if (!matiere?.questions?.length) return 0;
    return Object.entries(reponses).reduce((total, [key, value]) => {
      if (Array.isArray(value) || value == null || String(value).trim().length < 2) return total;
      const question = matiere.questions.find((q: any) => Number(q?.id) === Number(key));
      if (!question || question.type !== "QRC") return total;
      return total + scoreQuestionResponseMatch(question, safeStr(value));
    }, 0);
  };

  const defaultScore = scoreMatiere(defaultMatiere);
  let bestMatiere = defaultMatiere;
  let bestScore = defaultScore;
  candidateMap.forEach((candidate) => {
    const score = scoreMatiere(candidate);
    if (score > bestScore) {
      bestScore = score;
      bestMatiere = candidate;
    }
  });

  return bestScore >= Math.max(defaultScore + 2, 3) ? bestMatiere : defaultMatiere;
}

const CorrectionQRCTab = () => {
  const [items, setItems] = useState<QrcItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "done" | "today" | "today-pending">("today");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingPoints, setEditingPoints] = useState(0);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [examenMap, setExamenMap] = useState<Record<string, ExamenBlanc>>({});
  const [editingComments, setEditingComments] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [examenFilter, setExamenFilter] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const QUICK_COMMENTS = [
    "Précisez !!!",
    "Dire plutôt permis de conduire hors période probatoire",
    "Précisez casier B2 vierge",
    "Mal dit",
    "Attention aux fautes",
    "Réponse incomplète",
    "Hors sujet",
  ];

  // Load examens (source + saved)
  useEffect(() => {
    const load = async () => {
      const saved = await loadSavedExamens();
      setExamenMap(buildExamenMap(tousLesExamens, saved));
    };
    load();
  }, []);

  const fetchData = useCallback(async (opts?: { silent?: boolean }) => {
    if (Object.keys(examenMap).length === 0) return;
    if (!opts?.silent) setLoading(true);

    // Fetch all exam_blanc results that have QRC questions (Supabase client is capped at 1000 rows per request)
    const pageSize = 1000;
    const results: any[] = [];
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabase
        .from("apprenant_quiz_results")
        .select("id, apprenant_id, quiz_id, quiz_type, quiz_titre, matiere_id, matiere_nom, details, completed_at, score_obtenu, score_max, note_sur_20")
        .in("quiz_type", ["examen_blanc", "bilan"])
        .order("completed_at", { ascending: false })
        .range(from, from + pageSize - 1);

      if (error) {
        console.error("Erreur chargement résultats:", error);
        if (!opts?.silent) setLoading(false);
        return;
      }
      results.push(...(data || []));
      if (!data || data.length < pageSize) break;
    }

    // Fetch apprenant names
    const apprenantIds = [...new Set(results.map((r: any) => r.apprenant_id))];
    const apprenants: any[] = [];
    for (let i = 0; i < apprenantIds.length; i += 500) {
      const chunk = apprenantIds.slice(i, i + 500);
      if (chunk.length === 0) continue;
      const { data } = await supabase
        .from("apprenants")
        .select("id, nom, prenom, type_apprenant")
        .in("id", chunk);
      apprenants.push(...(data || []));
    }

    const apprenantMap: Record<string, { nom: string; prenom: string; mode: "presentiel" | "elearning" }> = {};
    (apprenants || []).forEach((a: any) => {
      const t = String(a.type_apprenant || "").toLowerCase();
      const mode: "presentiel" | "elearning" = t.endsWith("-e") || t.includes("-e-") ? "elearning"
        : (t === "vtc-e-presentiel" ? "presentiel" : (t.endsWith("-e") ? "elearning" : "presentiel"));
      apprenantMap[a.id] = { nom: a.nom, prenom: a.prenom, mode };
    });

    const qrcItems: QrcItem[] = [];
    const seenQrcKeys = new Set<string>();

    // Count how many results exist per apprenant + quiz + matiere (to detect retakes)
    // Must include matiere_id because each exam has ~7 matiere rows per attempt
    const attemptCounts: Record<string, number> = {};
    for (const r of results as any[]) {
      const countKey = `${r.apprenant_id}__${r.quiz_id}__${r.matiere_id || ""}`;
      attemptCounts[countKey] = (attemptCounts[countKey] || 0) + 1;
    }

    // Deduplicate: keep only the latest result per apprenant + quiz + matière
    const seenApprenantQuizMatiere = new Set<string>();
    for (const r of results as any[]) {
      const dedupeKey = `${r.apprenant_id}__${r.quiz_id}__${r.matiere_id || ""}`;
      if (seenApprenantQuizMatiere.has(dedupeKey)) continue;
      seenApprenantQuizMatiere.add(dedupeKey);
      const details = r.details as any;
      if (details == null) continue;

      const correctionsIA = details.correctionsIA || {};
      const reponses = details.reponses || {};
      const defaultMatiere = findMatiereWithFallback(examenMap, tousLesExamens, r.quiz_id, r.matiere_id || "");
      const matiere = chooseMatiereMatchingResponses(defaultMatiere, examenMap, r.matiere_id || "", reponses);

      // Detect if this is a retake (more than one result for same apprenant + quiz + matiere)
      const countKey = `${r.apprenant_id}__${r.quiz_id}__${r.matiere_id || ""}`;
      const isRetake = (attemptCounts[countKey] || 1) > 1;

      // Build question list: prefer details.questions, but fall back to examen definition + correctionsIA
      let questionList = Array.isArray(details.questions) && details.questions.length > 0
        ? details.questions
        : null;

      // If questions array is empty, reconstruct from examen definition + reponses/correctionsIA
      if (!questionList && matiere && (Object.keys(correctionsIA).length > 0 || Object.keys(reponses).length > 0)) {
        questionList = buildQuestionListFromMatiere(matiere, reponses);
      }

      if (!questionList) continue;

      for (const q of questionList) {
        // FIX 19/05 : tolère l'absence de champ `type` (nouvelles lignes bilan
        // qui agrègent toutes les matières) en inférant le type depuis l'énoncé.
        const enonceStr = safeStr(q.enonce);
        const inferredType = q.type
          ? String(q.type).toUpperCase()
          : (/\(qrc\)/i.test(enonceStr) ? "QRC" : "QCM");
        if (inferredType !== "QRC") continue;

        // Pour les lignes bilan agrégées (matiere_id vide), on résout la matière
        // au niveau de la question (chaque question porte son propre matiereId).
        const effectiveMatiereId = (r.matiere_id || "") || safeStr(q.matiereId);
        const perQuestionMatiere = matiere
          || findMatiereWithFallback(examenMap, tousLesExamens, r.quiz_id, effectiveMatiereId);

        // Deduplicate per apprenant + quiz + matière effective + question
        const qrcKey = `${r.apprenant_id}__${r.quiz_id}__${effectiveMatiereId}__${q.questionId}`;
        if (seenQrcKeys.has(qrcKey)) continue;
        seenQrcKeys.add(qrcKey);

        const pts = getPointsParQuestion(effectiveMatiereId, "QRC", perQuestionMatiere || undefined);

        const correction = correctionsIA[q.questionId];
        const hasManualCorrection = correction && typeof correction === "object" && correction.explication?.includes("manuelle");

        const app = apprenantMap[r.apprenant_id] || { nom: "Inconnu", prenom: "", mode: "presentiel" as const };

        const questionDef = perQuestionMatiere?.questions?.find((mq: any) => mq && mq.id === q.questionId);
        // Compare against the CURRENT canonical matiere (from examenMap) to detect
        // questions removed/replaced in the live exam — not the legacy matched variant.
        const currentExamen = examenMap[r.quiz_id];
        const currentMatiere = currentExamen?.matieres?.find((m: any) => m.id === effectiveMatiereId);
        const currentQuestionDef = currentMatiere?.questions?.find((mq: any) => mq && mq.id === q.questionId);
        const savedQuestionText = normalizeText(enonceStr);
        const currentQuestionText = normalizeText(safeStr(currentQuestionDef?.enonce));
        const questionSupprimee = !currentQuestionDef || (!!savedQuestionText && !!currentQuestionText && savedQuestionText !== currentQuestionText);

        // Réponse élève : si absente du champ q.reponseEleve (cas des lignes bilan),
        // on la récupère depuis details.reponses[questionId].
        const reponseEleveRaw = q.reponseEleve != null && q.reponseEleve !== ""
          ? q.reponseEleve
          : (reponses?.[q.questionId] ?? reponses?.[String(q.questionId)] ?? "");
        const reponseEleveStr = safeStr(reponseEleveRaw);

        // Réponse correcte : si absente, on la reconstruit depuis la définition.
        const reponseCorrecteStr = q.reponseCorrecte
          ? safeStr(q.reponseCorrecte)
          : safeStr(questionDef?.reponseQRC || (questionDef?.reponses_possibles || []).join(" / "));

        // Auto score: if manual correction exists, use it; otherwise recompute deterministically
        let autoScore = 0;
        let autoExplication: string | null = null;
        if (correction && typeof correction === "object" && hasManualCorrection) {
          autoScore = clampToHalfStep(correction.pointsObtenus ?? 0, pts);
          autoExplication = correction.explication || null;
        } else if (questionDef) {
          const recomputed = recomputeQrcAutoScore(questionDef, reponseEleveStr, pts);
          autoScore = recomputed.autoScore;
          autoExplication = recomputed.explication;
        } else if (correction && typeof correction === "object") {
          autoScore = clampToHalfStep(correction.pointsObtenus ?? 0, pts);
          autoExplication = correction.explication || null;
        }

        // If this is a retake and no manual correction yet, auto-score with keywords and mark as corrected
        const isAutoScoredRetake = isRetake && !hasManualCorrection;

        qrcItems.push({
          resultId: r.id,
          apprenantId: r.apprenant_id,
          apprenantNom: app.nom,
          apprenantPrenom: app.prenom,
          quizTitre: r.quiz_titre,
          quizId: r.quiz_id,
          quizType: r.quiz_type,
          matiereId: effectiveMatiereId,
          matiereNom: r.matiere_nom || safeStr(q.matiereNom) || perQuestionMatiere?.nom || "",
          questionId: q.questionId,
          enonce: enonceStr,
          reponseEleve: reponseEleveStr,
          reponseCorrecte: reponseCorrecteStr,
          pointsMax: pts,
          pointsObtenus: (hasManualCorrection || isAutoScoredRetake)
            ? clampToHalfStep(hasManualCorrection ? (correction.pointsObtenus ?? 0) : autoScore, pts)
            : null,
          corrigeManuel: !!(hasManualCorrection || isAutoScoredRetake),
          completedAt: r.completed_at,
          autoScore,
          autoExplication: isAutoScoredRetake ? `Notation auto (repasse) : ${autoExplication || "mots-clés"}` : autoExplication,
          noteSur20: r.note_sur_20 ?? null,
          scoreMatiereObtenu: r.score_obtenu ?? 0,
          scoreMatiereMax: r.score_max ?? 20,
          commentaire: isAutoScoredRetake ? "Notation automatique par mots-clés (examen refait)" : (correction && typeof correction === "object" ? (correction.commentaire || "") : ""),
          correctedAt: (hasManualCorrection || isAutoScoredRetake) ? (correction?.correctedAt || r.completed_at || null) : null,
          apprenantTypeMode: app.mode,
          questionSupprimee,
        });
      }
    }

    setItems(qrcItems);
    if (!opts?.silent) setLoading(false);
  }, [examenMap]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSaveCorrection = async (item: QrcItem, newPoints: number) => {
    const uniqueKey = `${item.resultId}-${item.questionId}`;
    setSavingId(uniqueKey);

    const clamped = clampToHalfStep(newPoints, item.pointsMax);

    // Fetch current details
    const { data: row, error: fetchErr } = await supabase
      .from("apprenant_quiz_results")
      .select("details, score_obtenu, score_max")
      .eq("id", item.resultId)
      .single();

    if (fetchErr || !row) {
      toast.error("Erreur lors de la récupération des données");
      setSavingId(null);
      return;
    }

    const details = (row as any).details as any;
    const correctionsIA = details.correctionsIA || {};

    const commentaire = editingComments[uniqueKey] ?? item.commentaire;

    // Update this specific question's correction
    correctionsIA[item.questionId] = {
      estCorrect: clamped >= item.pointsMax,
      pointsObtenus: clamped,
      nombrefautes: 0,
      explication: `Correction manuelle par l'administrateur : ${clamped}/${item.pointsMax} pts`,
      commentaire: commentaire || "",
      correctedAt: new Date().toISOString(),
      manuel: true,
    };

    // Recalculate total score for this matiere
    const examen = examenMap[item.quizId];
    const matiere = examen?.matieres?.find((m: Matiere) => m.id === item.matiereId);
    const questions = details.questions || [];
    const reponses = details.reponses || {};

    let newScore = 0;
    for (const q of questions) {
      if (!q) continue;
      const pts = getPointsParQuestion(matiere?.id || "", q.type || "QCM", matiere || undefined);

      if (q.type === "QCM" && q.reponseCorrecte) {
        const correctes = Array.isArray(q.reponseCorrecte) ? [...q.reponseCorrecte].sort() : [q.reponseCorrecte];
        const donnees = Array.isArray(reponses[q.questionId]) ? [...reponses[q.questionId]].sort() : (reponses[q.questionId] ? [reponses[q.questionId]] : []);
        if (JSON.stringify(correctes) === JSON.stringify(donnees)) {
          newScore += pts;
        }
      } else if (q.type === "QRC") {
        const corr = correctionsIA[q.questionId];
        if (corr && typeof corr === "object") {
          newScore += clampToHalfStep(corr.pointsObtenus || 0, pts);
        }
      }
    }

    const scoreMax = (row as any).score_max || 20;
    const safeClamped = Math.min(Math.max(newScore, 0), scoreMax);
    const existingScore = Math.max(Number((row as any).score_obtenu) || 0, 0);
    const protectedScore = safeClamped <= 0 && existingScore > 0 ? existingScore : safeClamped;
    const noteSur20 = scoreMax > 0 ? Number(((protectedScore / scoreMax) * 20).toFixed(1)) : 0;

    const { error: updateErr } = await supabase
      .from("apprenant_quiz_results")
      .update({
        score_obtenu: protectedScore,
        note_sur_20: noteSur20,
        details: {
          ...details,
          correctionsIA,
        },
      } as any)
      .eq("id", item.resultId);

    if (updateErr) {
      toast.error("Erreur lors de la sauvegarde");
    } else {
      toast.success(`QRC corrigée : ${clamped}/${item.pointsMax} pts — Note matière : ${noteSur20}/20`);

      setItems(prev => {
        const updated = prev.map(i => {
          if (i.resultId === item.resultId) {
            const upd: Partial<QrcItem> = { noteSur20, scoreMatiereObtenu: protectedScore };
            if (i.questionId === item.questionId) {
              return { ...i, ...upd, pointsObtenus: clamped, corrigeManuel: true, commentaire: commentaire || "", correctedAt: new Date().toISOString() };
            }
            return { ...i, ...upd };
          }
          return i;
        });

        setTimeout(() => {
          setCurrentIndex(prev => {
            const newFiltered = updated.filter(i => {
              if (filter === "pending") return !i.corrigeManuel;
              if (filter === "done") return i.corrigeManuel;
              return true;
            });

            if (filter === "pending") {
              // Keep same index so the next pending QRC naturally takes the current slot
              return Math.min(prev, Math.max(0, newFiltered.length - 1));
            }

            return Math.min(prev, Math.max(0, newFiltered.length - 1));
          });
        }, 0);

        return updated;
      });
    }

    setSavingId(null);
    setEditingId(null);
  };

  const pendingItems = items.filter(i => !i.corrigeManuel);
  const pendingCount = pendingItems.length;
  const doneCount = items.filter(i => i.corrigeManuel).length;

  const getExamNum = (titre: string) => (titre.match(/N°\s*(\d+)/)?.[1]) || "";

  // Categorise by examen variant + mode (VTC/TAXI splittés en présentiel vs e-learning)
  const getExamCategory = (titre: string, quizId: string, mode: "presentiel" | "elearning"): { key: string; label: string } => {
    const t = (titre || "").toLowerCase();
    const id = (quizId || "").toLowerCase();
    if (t.includes("passerelle ta") || (id.startsWith("eb") && id.endsWith("-ta"))) return { key: "ta", label: "Passerelle TA" };
    if (t.includes("passerelle va") || (id.startsWith("eb") && id.endsWith("-va"))) return { key: "va", label: "Passerelle VA" };
    if (t.includes("taxi") || id.includes("taxi")) {
      return mode === "elearning"
        ? { key: "taxi-e", label: "TAXI E-learning" }
        : { key: "taxi-p", label: "TAXI Présentiel" };
    }
    return mode === "elearning"
      ? { key: "vtc-e", label: "VTC E-learning" }
      : { key: "vtc-p", label: "VTC Présentiel" };
  };

  const isToday = (d?: string | null) => {
    if (!d) return false;
    const dt = new Date(d);
    const now = new Date();
    return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth() && dt.getDate() === now.getDate();
  };

  const todayPendingItems = items.filter(i => !i.corrigeManuel && isToday(i.completedAt));
  const todayPendingCount = todayPendingItems.length;

  const filtered = items.filter(item => {
    if (filter === "pending" && item.corrigeManuel) return false;
    if (filter === "done" && !item.corrigeManuel) return false;
    if (filter === "today" && !isToday(item.completedAt)) return false;
    if (filter === "today-pending" && (!isToday(item.completedAt) || item.corrigeManuel)) return false;
    if (examenFilter !== "all") {
      const [cat, num] = examenFilter.split(":");
      if (getExamCategory(item.quizTitre, item.quizId, item.apprenantTypeMode).key !== cat) return false;
      if (num && getExamNum(item.quizTitre) !== num) return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.apprenantNom.toLowerCase().includes(q) ||
        item.apprenantPrenom.toLowerCase().includes(q) ||
        item.quizTitre.toLowerCase().includes(q) ||
        item.matiereNom.toLowerCase().includes(q) ||
        item.enonce.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Build available exam list grouped by category, each with its numbers
  type ExamOption = { value: string; label: string; total: number };
  const examOptionsByCat: Record<string, { label: string; numbers: Map<string, number> }> = {};
  for (const i of (filter === "pending" ? pendingItems : items)) {
    const cat = getExamCategory(i.quizTitre, i.quizId, i.apprenantTypeMode);
    const n = getExamNum(i.quizTitre);
    if (!n) continue;
    if (!examOptionsByCat[cat.key]) examOptionsByCat[cat.key] = { label: cat.label, numbers: new Map() };
    const prev = examOptionsByCat[cat.key].numbers.get(n) || 0;
    examOptionsByCat[cat.key].numbers.set(n, prev + 1);
  }
  const CAT_ORDER = ["vtc-p", "vtc-e", "taxi-p", "taxi-e", "ta", "va"];
  const examOptionGroups: { key: string; label: string; options: ExamOption[] }[] = CAT_ORDER
    .filter(k => examOptionsByCat[k])
    .map(k => ({
      key: k,
      label: examOptionsByCat[k].label,
      options: Array.from(examOptionsByCat[k].numbers.entries())
        .sort(([a], [b]) => parseInt(a, 10) - parseInt(b, 10))
        .map(([n, total]) => ({ value: `${k}:${n}`, label: `Examen Blanc N°${n} — ${examOptionsByCat[k].label}`, total })),
    }));

  const sortedFiltered = [...filtered].sort((a, b) => {
    // PRIORITÉ : présentiel d'abord (toujours, indépendamment du tri date)
    const prioA = a.apprenantTypeMode === "presentiel" ? 0 : 1;
    const prioB = b.apprenantTypeMode === "presentiel" ? 0 : 1;
    if (prioA !== prioB) return prioA - prioB;
    const dateA = new Date(a.completedAt).getTime() || 0;
    const dateB = new Date(b.completedAt).getTime() || 0;
    if (dateA !== dateB) return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    const numA = parseInt((a.quizTitre.match(/N°(\d+)/)?.[1]) || "0", 10);
    const numB = parseInt((b.quizTitre.match(/N°(\d+)/)?.[1]) || "0", 10);
    if (numA !== numB) return numA - numB;
    if (a.matiereId !== b.matiereId) return a.matiereId.localeCompare(b.matiereId);
    return a.questionId - b.questionId;
  });

  // Reset index when filter/search/sort changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [filter, searchQuery, sortOrder, examenFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold">Correction QRC</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Corrigez manuellement les réponses QRC des examens blancs
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="gap-1 py-1.5 px-3">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            {pendingCount} en attente
          </Badge>
          <Badge variant="outline" className="gap-1 py-1.5 px-3">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
            {doneCount} corrigées
          </Badge>
        </div>
      </div>

      {/* Sélecteur d'examen blanc (menu déroulant) */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-muted-foreground">Examen :</span>
        <Select value={examenFilter} onValueChange={setExamenFilter}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Choisir un examen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              Tous les examens
              {pendingCount > 0 && (
                <span className="ml-2 inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                  {pendingCount}
                </span>
              )}
            </SelectItem>
            {examOptionGroups.map((group) => (
              <div key={group.key}>
                <div className="px-2 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </div>
                {group.options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                    {opt.total > 0 && (
                      <span className="ml-2 inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                        {opt.total}
                      </span>
                    )}
                  </SelectItem>
                ))}
              </div>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, examen, matière..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
          <SelectTrigger className="w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today-pending">🔥 En attente aujourd'hui ({todayPendingCount})</SelectItem>
            <SelectItem value="pending">⏳ En attente uniquement</SelectItem>
            <SelectItem value="today">📅 Répondues aujourd'hui</SelectItem>
            <SelectItem value="done">✅ Déjà corrigées</SelectItem>
            <SelectItem value="all">Toutes</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setSortOrder(prev => prev === "desc" ? "asc" : "desc")}
        >
          <ArrowUpDown className="w-4 h-4" />
          {sortOrder === "desc" ? "Plus récent" : "Plus ancien"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => {
            setIsRefreshing(true);
            fetchData({ silent: true }).finally(() => setIsRefreshing(false));
          }}
          disabled={isRefreshing || loading}
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Réactualiser
        </Button>
      </div>

      {sortedFiltered.length === 0 ? (
        filter === "pending" && !searchQuery.trim() && examenFilter === "all" ? (
          <div className="min-h-[340px] rounded-xl border bg-background flex items-center justify-center">
            <p className="text-lg font-semibold">Plus de correction actuellement</p>
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">
                {filter === "pending" ? "Aucune QRC en attente de correction" : "Aucune QRC trouvée"}
              </p>
              <p className="text-sm mt-1">Les réponses QRC apparaîtront ici au fur et à mesure des examens</p>
            </CardContent>
          </Card>
        )
      ) : (
        <div className="space-y-3">
          {/* Navigation arrows */}
          <div className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setCurrentIndex(Math.max(0, currentIndex - 1)); setEditingId(null); }}
              disabled={currentIndex <= 0}
              className="gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Précédent
            </Button>
            <span className="text-sm font-medium text-muted-foreground">
              {currentIndex + 1} / {sortedFiltered.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setCurrentIndex(Math.min(sortedFiltered.length - 1, currentIndex + 1)); setEditingId(null); }}
              disabled={currentIndex >= sortedFiltered.length - 1}
              className="gap-1"
            >
              Suivant
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {(() => {
            const safeIdx = Math.min(currentIndex, sortedFiltered.length - 1);
            const item = sortedFiltered[safeIdx];
            if (!item) return null;
            const uniqueKey = `${item.resultId}-${item.questionId}`;
            const isEditing = editingId === uniqueKey;
            const isSaving = savingId === uniqueKey;

            return (
              <Card key={uniqueKey} className={`transition-colors ${item.corrigeManuel ? "border-green-200 bg-green-50/30" : "border-amber-200 bg-amber-50/20"}`}>
                <CardContent className="py-4 px-5 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <User className="w-3 h-3" />
                          {item.apprenantPrenom} {item.apprenantNom}
                        </Badge>
                        <Badge variant="outline" className="text-xs">{item.quizTitre}</Badge>
                        <Badge variant="outline" className="text-xs">{item.matiereNom}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(item.completedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {item.corrigeManuel ? (
                        <Badge className="bg-green-100 text-green-800 border-green-300">
                          ✅ Corrigé : {(item.pointsObtenus ?? item.autoScore)}/{item.pointsMax} pts
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                          ⏳ En attente (auto: {item.autoScore}/{item.pointsMax})
                        </Badge>
                      )}
                      <Badge variant="outline" className="font-bold text-sm">
                        📊 {item.noteSur20 != null ? `${item.noteSur20}/20` : `${item.scoreMatiereObtenu}/${item.scoreMatiereMax}`}
                      </Badge>
                    </div>
                  </div>

                  {/* Question */}
                  <div>
                    {item.questionSupprimee ? (
                      <div className="flex items-center gap-2 p-2 rounded-md bg-red-50 border border-red-200 flex-wrap">
                        <span className="text-sm font-bold text-red-700">⚠️ Q{item.questionId} — QUESTION SUPPRIMÉE</span>
                        {!item.corrigeManuel && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-red-300 text-red-700 hover:bg-red-100"
                            disabled={savingId === `${item.resultId}-${item.questionId}`}
                            onClick={() => handleSaveCorrection(item, item.pointsMax)}
                          >
                            Ne pas comptabiliser
                          </Button>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm font-bold text-foreground">
                        <span className="text-primary mr-1">Q{item.questionId} —</span>
                        {item.enonce}
                      </p>
                    )}
                  </div>

                  {/* Réponse élève */}
                  <div className="bg-background border rounded-lg p-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">📝 Réponse de l'élève :</p>
                    <p className="text-sm whitespace-pre-wrap">{item.reponseEleve || <span className="italic text-muted-foreground">Pas de réponse</span>}</p>
                  </div>

                  {/* Réponse correcte */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-xs font-semibold text-green-700 mb-1">✓ Réponse attendue :</p>
                    <p className="text-sm whitespace-pre-wrap text-green-900">{item.reponseCorrecte}</p>
                  </div>

                  {/* Correction directe */}
                  <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-300 rounded-lg flex-wrap">
                    <span className="text-xs text-blue-700 font-medium">🤖 Mots clés : {item.autoScore}/{item.pointsMax}</span>
                    <span className="text-amber-300">|</span>
                    <Pencil className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="text-xs font-medium text-amber-800">Points :</span>
                    <input
                      type="number"
                      min={0}
                      max={item.pointsMax}
                      step={0.5}
                      value={isEditing ? editingPoints : (item.pointsObtenus ?? item.autoScore)}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setEditingPoints(val);
                        if (!isEditing) setEditingId(uniqueKey);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveCorrection(item, editingPoints);
                      }}
                      className="w-16 px-2 py-1 text-xs border rounded text-center font-bold"
                    />
                    <span className="text-xs text-amber-700">/ {item.pointsMax}</span>
                    <Button
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => {
                        if (!isEditing) {
                          setEditingId(uniqueKey);
                          setEditingPoints(item.pointsObtenus ?? item.autoScore);
                        }
                        handleSaveCorrection(item, isEditing ? editingPoints : (item.pointsObtenus ?? item.autoScore));
                      }}
                      disabled={isSaving}
                    >
                      {isSaving ? "..." : "✓ Valider"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-xs border-red-300 text-red-700 hover:bg-red-100"
                      onClick={() => handleSaveCorrection(item, item.pointsMax)}
                      disabled={isSaving}
                      title="Attribue le maximum de points (question non comptabilisée dans la note)"
                    >
                      🚫 Ne pas comptabiliser
                    </Button>
                    {item.corrigeManuel && !isSaving && (
                      <Badge className="bg-green-100 text-green-700 border-green-300 text-xs ml-1">✅ Corrigé</Badge>
                    )}
                  </div>

                  {/* Commentaire pour l'apprenant */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">Commentaire pour l'apprenant :</span>
                    </div>
                    <textarea
                      rows={2}
                      placeholder="Ajouter un commentaire..."
                      value={editingComments[uniqueKey] ?? item.commentaire}
                      onChange={(e) => setEditingComments(prev => ({ ...prev, [uniqueKey]: e.target.value }))}
                      className="w-full text-xs border rounded-md p-2 resize-none bg-background"
                    />
                    <div className="flex flex-wrap gap-1">
                      {QUICK_COMMENTS.map((qc) => (
                        <button
                          key={qc}
                          type="button"
                          onClick={() => {
                            const current = editingComments[uniqueKey] ?? item.commentaire;
                            const sep = current.trim() ? (current.trim().endsWith(".") ? " " : ". ") : "";
                            setEditingComments(prev => ({ ...prev, [uniqueKey]: current.trim() + sep + qc }));
                          }}
                          className="text-[10px] px-2 py-0.5 rounded-full border bg-muted hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                        >
                          + {qc}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default CorrectionQRCTab;
