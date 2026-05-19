import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Clock, Pencil, Search, User, FileText, Filter, MessageSquare, ChevronLeft, ChevronRight, ArrowUpDown, EyeOff } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { toast } from "sonner";
import { tousLesExamens, getPointsParQuestion, type ExamenBlanc, type Matiere } from "./examens-blancs-data";
import { loadSavedExamens } from "./ExamensBlancsEditor";
import { buildExamenMap, buildQrcDedupeKey, findMatiereWithFallback, getSourceQuestions } from "./exam-helpers";

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
  isRetake: boolean;
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

const CorrectionQRCTab = () => {
  const [items, setItems] = useState<QrcItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "done">("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingPoints, setEditingPoints] = useState(0);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [examenMap, setExamenMap] = useState<Record<string, ExamenBlanc>>({});
  const [editingComments, setEditingComments] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [examenFilter, setExamenFilter] = useState<string>("all");
  // Garde anti-écrasement : ignore les refetch Realtime juste après une action locale
  // (sauvegarde / masquage), le temps que Supabase propage le `manuel: true`.
  const lastLocalMutationRef = useRef<number>(0);

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

  const fetchData = useCallback(async () => {
    if (Object.keys(examenMap).length === 0) return;
    setLoading(true);
    setItems([]);

    // 1. Paginate apprenant_quiz_results (Supabase caps at 1000 rows per request)
    const PAGE = 1000;
    const allResults: any[] = [];
    let from = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { data, error } = await supabase
        .from("apprenant_quiz_results")
        .select("id, apprenant_id, quiz_id, quiz_type, quiz_titre, matiere_id, matiere_nom, details, completed_at, score_obtenu, score_max, note_sur_20")
        .in("quiz_type", ["examen_blanc", "bilan"])
        .order("completed_at", { ascending: false })
        .range(from, from + PAGE - 1);
      if (error) {
        console.error("Erreur chargement résultats:", error);
        break;
      }
      if (!data || data.length === 0) break;
      allResults.push(...data);
      if (data.length < PAGE) break;
      from += PAGE;
    }

    // 2. Fetch apprenants in chunks of 500 (avoid huge .in() lists)
    const apprenantIds = [...new Set(allResults.map((r: any) => r.apprenant_id))];
    const apprenantMap: Record<string, { nom: string; prenom: string; mode: "presentiel" | "elearning" }> = {};
    const CHUNK = 500;
    for (let i = 0; i < apprenantIds.length; i += CHUNK) {
      const slice = apprenantIds.slice(i, i + CHUNK);
      const { data: apprenants } = await supabase
        .from("apprenants")
        .select("id, nom, prenom, type_apprenant")
        .in("id", slice);
      (apprenants || []).forEach((a: any) => {
        const t = String(a.type_apprenant || "").toLowerCase();
        const mode: "presentiel" | "elearning" = t.endsWith("-e") || t.includes("-e-") ? "elearning"
          : (t === "vtc-e-presentiel" ? "presentiel" : (t.endsWith("-e") ? "elearning" : "presentiel"));
        apprenantMap[a.id] = { nom: a.nom, prenom: a.prenom, mode };
      });
    }

    // Count attempts (for retake detection) across the full dataset
    const attemptCounts: Record<string, number> = {};
    for (const r of allResults as any[]) {
      const countKey = `${r.apprenant_id}__${r.quiz_id}__${r.matiere_id || ""}`;
      attemptCounts[countKey] = (attemptCounts[countKey] || 0) + 1;
    }

    // 3. Build QRC items progressively in batches so the UI displays the first questions quickly
    // IMPORTANT: dedupe per-QRC (apprenant+quiz+matiere+questionId), NOT per-result.
    // A retake creates a new result row with empty correctionsIA → if we kept only the
    // latest row, already-corrected QRCs would reappear as "pending". We sort results so
    // that rows containing a manual correction for a given question are processed first.
    const seenQrcKeys = new Set<string>();

    // Pre-compute which questions are manually corrected per result so we can sort.
    const resultHasManual = (r: any): boolean => {
      const c = r?.details?.correctionsIA;
      if (!c || typeof c !== "object") return false;
      return Object.values(c).some((v: any) =>
        v && typeof v === "object" && typeof v.explication === "string" && v.explication.includes("manuelle")
      );
    };
    allResults.sort((a: any, b: any) => {
      const am = resultHasManual(a) ? 1 : 0;
      const bm = resultHasManual(b) ? 1 : 0;
      if (am !== bm) return bm - am; // corrected rows first
      const ta = a.completed_at ? new Date(a.completed_at).getTime() : 0;
      const tb = b.completed_at ? new Date(b.completed_at).getTime() : 0;
      return tb - ta;
    });
    let buffer: QrcItem[] = [];
    let firstFlush = true;
    // Collecte des QRC de repasse à persister en DB pour qu'elles ne réapparaissent plus
    // en "En attente" au prochain chargement.
    const retakePersistByResult: Record<string, { items: QrcItem[] }> = {};

    const flush = () => {
      if (buffer.length === 0) return;
      const chunk = buffer;
      buffer = [];
      setItems(prev => [...prev, ...chunk]);
      if (firstFlush) {
        setLoading(false);
        firstFlush = false;
      }
    };

    const BATCH_SIZE = 10;

    for (let idx = 0; idx < allResults.length; idx++) {
      const r: any = allResults[idx];
      const details = r.details as any;
      if (details == null) continue;

      const matiere = findMatiereWithFallback(examenMap, tousLesExamens, r.quiz_id, r.matiere_id || "");
      const correctionsIA = details.correctionsIA || {};
      const countKey = `${r.apprenant_id}__${r.quiz_id}__${r.matiere_id || ""}`;
      const isRetake = (attemptCounts[countKey] || 1) > 1;

      const reponses = details.reponses || {};
      let questionList: any[] | null = Array.isArray(details.questions) && details.questions.length > 0
        ? [...details.questions]
        : null;

      // Build/augment from source so we NEVER miss a QRC question (legacy rows
      // sometimes saved only QCM entries, or saved details.questions=[] entirely).
      if (matiere && (Object.keys(correctionsIA).length > 0 || Object.keys(reponses).length > 0)) {
        // SCOPE STRICT: ne chercher les questions sources que dans l'examen r.quiz_id,
        // pour éviter de récupérer des questions d'un autre examen partageant un matiere_id.
        const examenDuQuiz = examenMap[r.quiz_id] || tousLesExamens.find((e) => e.id === r.quiz_id);
        const matiereDuQuiz = examenDuQuiz?.matieres?.find((m: Matiere) => m.id === matiere.id) || matiere;
        let sourceQuestions: any[] = Array.isArray(matiereDuQuiz?.questions) ? matiereDuQuiz.questions : [];
        if (sourceQuestions.length === 0) {
          // Fallback large uniquement si l'examen r.quiz_id n'a aucune question pour cette matière.
          sourceQuestions = getSourceQuestions(matiere, tousLesExamens);
        }
        if (sourceQuestions.length > 0) {
          const existingIds = new Set<number>((questionList || []).map((q: any) => Number(q?.questionId)).filter(n => Number.isFinite(n)));
          const buildFromSource = (mq: any) => ({
            questionId: mq.id,
            enonce: mq.enonce || "",
            type: mq.type || "QCM",
            reponseEleve: reponses[mq.id] ?? reponses[String(mq.id)] ?? null,
            reponseCorrecte: mq.type === "QCM" && mq.choix
              ? mq.choix.filter((c: any) => c.correct).map((c: any) => c.lettre)
              : (mq.reponseQRC || (mq.reponses_possibles || []).join(" / ")),
          });
          if (!questionList) {
            questionList = sourceQuestions.map((mq: any) => mq ? buildFromSource(mq) : null).filter(Boolean) as any[];
          } else {
            for (const mq of sourceQuestions) {
              if (!mq) continue;
              const qid = Number(mq.id);
              if (Number.isFinite(qid) && !existingIds.has(qid)) {
                questionList.push(buildFromSource(mq));
                existingIds.add(qid);
              }
            }
          }
        }
      }

      if (!questionList || questionList.length === 0) {
        if (Object.keys(reponses).length > 0 || Object.keys(correctionsIA).length > 0) {
          console.warn("[CorrectionQRC] Row skipped (no questions resolvable)", {
            resultId: r.id,
            apprenant: `${apprenantMap[r.apprenant_id]?.nom || "?"} ${apprenantMap[r.apprenant_id]?.prenom || ""}`,
            quizId: r.quiz_id,
            matiereId: r.matiere_id,
            matiereFound: !!matiere,
          });
        }
        continue;
      }

      for (const q of questionList) {
        if (q.type !== "QRC") continue;
        // Dédup par question réelle (id + énoncé) : les matières réutilisent souvent
        // les ids 1, 2, 3... mais une même question legacy ne doit pas apparaître deux fois.
        const qrcKey = buildQrcDedupeKey(r.apprenant_id, r.quiz_id, q);
        if (seenQrcKeys.has(qrcKey)) continue;
        seenQrcKeys.add(qrcKey);

        const pts = getPointsParQuestion(r.matiere_id || "", "QRC", matiere || undefined);
        const correction = correctionsIA[q.questionId];
        const hasManualCorrection = correction && typeof correction === "object" && (correction.manuel === true || correction.explication?.includes("manuelle") || correction.explication?.includes("masqué par admin"));
        const app = apprenantMap[r.apprenant_id] || { nom: "Inconnu", prenom: "", mode: "presentiel" as const };
        const questionDef = matiere?.questions?.find((mq: any) => mq && mq.id === q.questionId);

        let autoScore = 0;
        let autoExplication: string | null = null;
        if (correction && typeof correction === "object" && hasManualCorrection) {
          autoScore = clampToHalfStep(correction.pointsObtenus ?? 0, pts);
          autoExplication = correction.explication || null;
        } else if (questionDef) {
          const recomputed = recomputeQrcAutoScore(questionDef, safeStr(q.reponseEleve), pts);
          autoScore = recomputed.autoScore;
          autoExplication = recomputed.explication;
        } else if (correction && typeof correction === "object") {
          autoScore = clampToHalfStep(correction.pointsObtenus ?? 0, pts);
          autoExplication = correction.explication || null;
        }

        const isAutoScoredRetake = isRetake && !hasManualCorrection;

        buffer.push({
          resultId: r.id,
          apprenantId: r.apprenant_id,
          apprenantNom: app.nom,
          apprenantPrenom: app.prenom,
          quizTitre: r.quiz_titre,
          quizId: r.quiz_id,
          quizType: r.quiz_type,
          matiereId: r.matiere_id || "",
          matiereNom: r.matiere_nom || "",
          questionId: q.questionId,
          enonce: safeStr(q.enonce),
          reponseEleve: safeStr(q.reponseEleve),
          reponseCorrecte: safeStr(q.reponseCorrecte),
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
          isRetake,
        });

        if (isAutoScoredRetake) {
          (retakePersistByResult[r.id] ||= { items: [] }).items.push(buffer[buffer.length - 1]);
        }
      }

      if (buffer.length >= BATCH_SIZE) {
        flush();
        // Yield to the browser so the UI can paint between batches
        await new Promise<void>(resolve => setTimeout(resolve, 0));
      }
    }

    flush();
    setLoading(false);

    // === Persistance silencieuse des QRC de repasse ===
    // Pour chaque résultat contenant des QRC auto-notées (examen refait),
    // on écrit `correctionsIA` en DB avec le marqueur "manuelle" afin que ces
    // questions ne réapparaissent plus jamais dans "En attente".
    void (async () => {
      const resultIds = Object.keys(retakePersistByResult);
      if (resultIds.length === 0) return;

      for (const resultId of resultIds) {
        try {
          const { data: row, error: fErr } = await supabase
            .from("apprenant_quiz_results")
            .select("details, score_obtenu, score_max, quiz_id, matiere_id")
            .eq("id", resultId)
            .single();
          if (fErr || !row) continue;

          const details: any = (row as any).details || {};
          const correctionsIA = { ...(details.correctionsIA || {}) };
          const nowIso = new Date().toISOString();
          let touched = false;

          for (const qrc of retakePersistByResult[resultId].items) {
            const existing = correctionsIA[qrc.questionId];
            if (existing && typeof existing === "object" && typeof existing.explication === "string" && existing.explication.includes("manuelle")) {
              continue;
            }
            const clamped = clampToHalfStep(qrc.autoScore, qrc.pointsMax);
            correctionsIA[qrc.questionId] = {
              estCorrect: clamped >= qrc.pointsMax,
              pointsObtenus: clamped,
              nombrefautes: 0,
              explication: `Correction manuelle (auto repasse) : ${clamped}/${qrc.pointsMax} pts — À VÉRIFIER`,
              commentaire: "Notation automatique par mots-clés (examen refait) — à vérifier",
              correctedAt: nowIso,
              autoRetake: true,
            };
            touched = true;
          }

          if (!touched) continue;

          // Recalcul score matière (sans toucher au score si déjà > 0 et nouveau = 0)
          const examen = examenMap[(row as any).quiz_id];
          const matiere = examen?.matieres?.find((m: Matiere) => m.id === (row as any).matiere_id);
          const questions = details.questions || [];
          const reponses = details.reponses || {};
          let newScore = 0;
          for (const qq of questions) {
            if (!qq) continue;
            const ptsQ = getPointsParQuestion(matiere?.id || "", qq.type || "QCM", matiere || undefined);
            if (qq.type === "QCM" && qq.reponseCorrecte) {
              const correctes = Array.isArray(qq.reponseCorrecte) ? [...qq.reponseCorrecte].sort() : [qq.reponseCorrecte];
              const donnees = Array.isArray(reponses[qq.questionId]) ? [...reponses[qq.questionId]].sort() : (reponses[qq.questionId] ? [reponses[qq.questionId]] : []);
              if (JSON.stringify(correctes) === JSON.stringify(donnees)) newScore += ptsQ;
            } else if (qq.type === "QRC") {
              const corr = correctionsIA[qq.questionId];
              if (corr && typeof corr === "object") newScore += clampToHalfStep(corr.pointsObtenus || 0, ptsQ);
            }
          }
          const scoreMax = (row as any).score_max || 20;
          const safeClamped = Math.min(Math.max(newScore, 0), scoreMax);
          const existingScore = Math.max(Number((row as any).score_obtenu) || 0, 0);
          const protectedScore = safeClamped <= 0 && existingScore > 0 ? existingScore : safeClamped;
          const noteSur20 = scoreMax > 0 ? Number(((protectedScore / scoreMax) * 20).toFixed(1)) : 0;

          await supabase
            .from("apprenant_quiz_results")
            .update({
              score_obtenu: protectedScore,
              note_sur_20: noteSur20,
              details: { ...details, correctionsIA },
            } as any)
            .eq("id", resultId);
        } catch (e) {
          console.warn("Persistance retake QRC échouée pour", resultId, e);
        }
      }
    })();
  }, [examenMap]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Realtime: rafraîchir automatiquement dès qu'un élève termine/modifie un examen
  // (évite de devoir recharger la page pour voir les nouvelles QRC à corriger).
  useEffect(() => {
    if (Object.keys(examenMap).length === 0) return;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefetch = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        // Ignore les events provoqués par nos propres updates locaux (8 s de garde)
        if (Date.now() - lastLocalMutationRef.current < 8000) return;
        fetchData();
      }, 1500);
    };
    const channel = supabase
      .channel("correction-qrc-results")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "apprenant_quiz_results" },
        (payload: any) => {
          const qt = payload?.new?.quiz_type ?? payload?.old?.quiz_type;
          if (qt === "examen_blanc" || qt === "bilan") scheduleRefetch();
        }
      )
      .subscribe();
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [examenMap, fetchData]);

  const handleSaveCorrection = async (item: QrcItem, newPoints: number) => {
    lastLocalMutationRef.current = Date.now();
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

      // Notifier l'apprenant via la messagerie quand toutes les QRC de cet examen sont corrigées
      try {
        const stillPending = items.some(
          i => i.resultId === item.resultId && i.questionId !== item.questionId && !i.corrigeManuel
        );
        if (!stillPending) {
          const marker = `[examen-corrige:${item.resultId}]`;
          const { data: existing } = await supabase
            .from("apprenant_questions")
            .select("id")
            .eq("apprenant_id", item.apprenantId)
            .ilike("question", `%${marker}%`)
            .limit(1);
          if (!existing || existing.length === 0) {
            await supabase.from("apprenant_questions").insert({
              apprenant_id: item.apprenantId,
              apprenant_nom: `${item.apprenantPrenom} ${item.apprenantNom}`.trim() || null,
              question: `${marker} Correction de votre examen`,
              reponse: `Bonjour, votre examen « ${item.quizTitre} » vient d'être corrigé par le centre. Note finale : ${noteSur20}/20. Vous pouvez consulter le détail depuis votre espace « Résultats ».`,
              status: "answered",
              answered_at: new Date().toISOString(),
              read_by_apprenant: false,
            } as any);
          }
        }
      } catch (e) {
        console.warn("[CorrectionQRC] Notification apprenant échouée:", e);
      }

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

  // Masquer toutes les QRC en attente d'un apprenant : on les valide avec leur autoScore
  // et on les marque comme corrigées manuellement pour qu'elles disparaissent de la liste
  // "En attente" et basculent dans "Déjà corrigées".
  const handleHideApprenant = async (apprenantId: string, apprenantLabel: string) => {
    const pendingForApp = items.filter(i => i.apprenantId === apprenantId && !i.corrigeManuel);
    if (pendingForApp.length === 0) {
      toast.info("Aucune QRC en attente pour cet apprenant.");
      return;
    }
    const ok = window.confirm(
      `Masquer les ${pendingForApp.length} QRC en attente de ${apprenantLabel} ?\n\nElles seront marquées comme corrigées avec leur note auto et déplacées dans "Déjà corrigées".`
    );
    if (!ok) return;
    lastLocalMutationRef.current = Date.now();

    setSavingId(`hide-${apprenantId}`);

    // Regrouper par resultId pour ne faire qu'un update par ligne DB
    const byResult: Record<string, QrcItem[]> = {};
    for (const it of pendingForApp) {
      (byResult[it.resultId] ||= []).push(it);
    }

    const updatedResultScores: Record<string, { score: number; note: number; max: number }> = {};
    let okCount = 0;
    let errCount = 0;

    for (const [resultId, qrcs] of Object.entries(byResult)) {
      const { data: row, error: fetchErr } = await supabase
        .from("apprenant_quiz_results")
        .select("details, score_obtenu, score_max, quiz_id, matiere_id")
        .eq("id", resultId)
        .single();

      if (fetchErr || !row) { errCount += qrcs.length; continue; }

      const details: any = (row as any).details || {};
      const correctionsIA = details.correctionsIA || {};
      const nowIso = new Date().toISOString();

      for (const q of qrcs) {
        const clamped = clampToHalfStep(q.autoScore, q.pointsMax);
        correctionsIA[q.questionId] = {
          estCorrect: clamped >= q.pointsMax,
          pointsObtenus: clamped,
          nombrefautes: 0,
          explication: `Validation manuelle (masqué par admin) : ${clamped}/${q.pointsMax} pts`,
          commentaire: "",
          manuel: true,
          correctedAt: nowIso,
        };
      }

      // Recalcul du score matière
      const examen = examenMap[(row as any).quiz_id];
      const matiere = examen?.matieres?.find((m: Matiere) => m.id === (row as any).matiere_id);
      const questions = details.questions || [];
      const reponses = details.reponses || {};
      let newScore = 0;
      for (const qq of questions) {
        if (!qq) continue;
        const pts = getPointsParQuestion(matiere?.id || "", qq.type || "QCM", matiere || undefined);
        if (qq.type === "QCM" && qq.reponseCorrecte) {
          const correctes = Array.isArray(qq.reponseCorrecte) ? [...qq.reponseCorrecte].sort() : [qq.reponseCorrecte];
          const donnees = Array.isArray(reponses[qq.questionId]) ? [...reponses[qq.questionId]].sort() : (reponses[qq.questionId] ? [reponses[qq.questionId]] : []);
          if (JSON.stringify(correctes) === JSON.stringify(donnees)) newScore += pts;
        } else if (qq.type === "QRC") {
          const corr = correctionsIA[qq.questionId];
          if (corr && typeof corr === "object") newScore += clampToHalfStep(corr.pointsObtenus || 0, pts);
        }
      }

      const scoreMax = (row as any).score_max || 20;
      const safeClamped = Math.min(Math.max(newScore, 0), scoreMax);
      const existingScore = Math.max(Number((row as any).score_obtenu) || 0, 0);
      const protectedScore = safeClamped <= 0 && existingScore > 0 ? existingScore : safeClamped;
      const noteSur20 = scoreMax > 0 ? Number(((protectedScore / scoreMax) * 20).toFixed(1)) : 0;

      const { error: updErr } = await supabase
        .from("apprenant_quiz_results")
        .update({
          score_obtenu: protectedScore,
          note_sur_20: noteSur20,
          details: { ...details, correctionsIA },
        } as any)
        .eq("id", resultId);

      if (updErr) { errCount += qrcs.length; continue; }
      okCount += qrcs.length;
      updatedResultScores[resultId] = { score: protectedScore, note: noteSur20, max: scoreMax };
    }

    setItems(prev => prev.map(i => {
      if (i.apprenantId !== apprenantId) return i;
      const upd = updatedResultScores[i.resultId];
      const base = upd ? { ...i, noteSur20: upd.note, scoreMatiereObtenu: upd.score, scoreMatiereMax: upd.max } : i;
      if (!i.corrigeManuel && updatedResultScores[i.resultId]) {
        return {
          ...base,
          pointsObtenus: clampToHalfStep(i.autoScore, i.pointsMax),
          corrigeManuel: true,
          commentaire: "",
          correctedAt: new Date().toISOString(),
        };
      }
      return base;
    }));

    setSavingId(null);
    setEditingId(null);
    setCurrentIndex(0);

    if (errCount === 0) toast.success(`${okCount} QRC masquées pour ${apprenantLabel}.`);
    else toast.warning(`${okCount} masquées, ${errCount} en erreur.`);
  };

  const pendingCount = items.filter(i => !i.corrigeManuel).length;
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

  const filtered = items.filter(item => {
    if (filter === "pending" && item.corrigeManuel) return false;
    if (filter === "done" && !item.corrigeManuel) return false;
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
  type ExamOption = { value: string; label: string; pending: number };
  const examOptionsByCat: Record<string, { label: string; numbers: Map<string, number> }> = {};
  for (const i of items) {
    const cat = getExamCategory(i.quizTitre, i.quizId, i.apprenantTypeMode);
    const n = getExamNum(i.quizTitre);
    if (!n) continue;
    if (!examOptionsByCat[cat.key]) examOptionsByCat[cat.key] = { label: cat.label, numbers: new Map() };
    const prev = examOptionsByCat[cat.key].numbers.get(n) || 0;
    examOptionsByCat[cat.key].numbers.set(n, prev + (i.corrigeManuel ? 0 : 1));
  }
  const CAT_ORDER = ["vtc-p", "vtc-e", "taxi-p", "taxi-e", "ta", "va"];
  const examOptionGroups: { key: string; label: string; options: ExamOption[] }[] = CAT_ORDER
    .filter(k => examOptionsByCat[k])
    .map(k => ({
      key: k,
      label: examOptionsByCat[k].label,
      options: Array.from(examOptionsByCat[k].numbers.entries())
        .sort(([a], [b]) => parseInt(a, 10) - parseInt(b, 10))
        .map(([n, pending]) => ({ value: `${k}:${n}`, label: `Examen Blanc N°${n} — ${examOptionsByCat[k].label}`, pending })),
    }));

  const sortedFiltered = [...filtered].sort((a, b) => {
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
          <button
            type="button"
            onClick={() => setFilter("pending")}
            aria-pressed={filter === "pending"}
            className={`inline-flex items-center gap-1 py-1.5 px-3 rounded-md border text-xs font-semibold transition-colors ${filter === "pending" ? "bg-amber-100 border-amber-400 text-amber-900" : "bg-background hover:bg-accent border-border text-foreground"}`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            {pendingCount} en attente
          </button>
          <button
            type="button"
            onClick={() => setFilter("done")}
            aria-pressed={filter === "done"}
            className={`inline-flex items-center gap-1 py-1.5 px-3 rounded-md border text-xs font-semibold transition-colors ${filter === "done" ? "bg-green-100 border-green-400 text-green-900" : "bg-background hover:bg-accent border-border text-foreground"}`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
            {doneCount} corrigées
          </button>
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
                    {opt.pending > 0 && (
                      <span className="ml-2 inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                        {opt.pending}
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
            <SelectItem value="pending">⏳ En attente</SelectItem>
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
      </div>

      {sortedFiltered.length === 0 ? (
        filter === "pending" && !searchQuery.trim() ? (
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
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs gap-1 border-amber-300 text-amber-800 hover:bg-amber-50"
                        disabled={savingId === `hide-${item.apprenantId}`}
                        onClick={() => handleHideApprenant(item.apprenantId, `${item.apprenantPrenom} ${item.apprenantNom}`.trim())}
                        title="Marque toutes les QRC en attente de cet apprenant comme corrigées (note auto) et les déplace dans Déjà corrigées."
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                        {savingId === `hide-${item.apprenantId}` ? "..." : "Ne plus afficher cet apprenant"}
                      </Button>
                    </div>
                  </div>

                  {/* Bandeau "à vérifier" pour les examens refaits */}
                  {item.isRetake && (
                    <div className="rounded-lg border-2 border-amber-500 bg-amber-100 px-4 py-3 text-center">
                      <p className="text-lg font-extrabold uppercase tracking-wide text-amber-900">
                        ⚠️ Vérifier les réponses des QRC
                      </p>
                      <p className="text-xs text-amber-800 mt-1">
                        Examen refait — notation automatique par mots-clés. Validez ou ajustez si besoin.
                      </p>
                    </div>
                  )}

                  {/* Question */}
                  <div>
                    <p className="text-sm font-bold text-foreground">{item.enonce}</p>
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
