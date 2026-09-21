import { useState, useEffect, useCallback, useRef } from "react";
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
import { buildExamenMap, findMatiereWithFallback, getSourceQuestions, computeReussiForResult, isResultPlaceholder, isQrcAnswerCertainlyEmpty, isExamAttemptPublicationPending, isMatiereQrcPendingForAttempt } from "./exam-helpers";
import { loadQrcEngineQuizIds, fetchQrcEngineAttemptIds, buildQrcAttemptId } from "@/lib/qrcInstances";
import { QrcInstancesPanel } from "./QrcInstancesPanel";

/** Examens Blancs N°2, toutes filières (VTC, TAXI, VA, TA). */
const EB2_QUIZ_IDS = new Set(["EB2", "EB2-TAXI", "eb2-va", "eb2-ta"]);
const EB2_FILIERE_LABEL: Record<string, string> = {
  "EB2": "VTC", "EB2-TAXI": "TAXI", "eb2-va": "VA", "eb2-ta": "TA",
};

/** Passage réel d'un apprenant sur UN examen : apprenant + examen + tentative persistante. */
function buildAttemptKey(apprenantId: string, quizId: string, dbTentative: number | null | undefined, passageKey: string): string {
  return `${apprenantId}__${quizId}__${dbTentative != null ? `T${dbTentative}` : passageKey}`;
}

interface Eb2PendingAttempt {
  attemptKey: string;
  apprenantId: string;
  apprenant: string;
  filiere: string;
  quizId: string;
  quizTitre: string;
  tentativeLabel: string;
  completedAt: string;
  matieres: string[];
  /** true si au moins une QRC de ce passage est réellement présente dans la file de correction. */
  hasQueueMatch: boolean;
  /** true si la formation de l'apprenant est active aujourd'hui (début ≤ aujourd'hui ≤ fin). */
  formationActive: boolean;
}

interface QrcItem {
  resultId: string;
  source: "result" | "autosave";
  autosaveId?: string;
  userId?: string;
  apprenantId: string;
  apprenantNom: string;
  apprenantPrenom: string;
  quizTitre: string;
  quizId: string;
  quizType: string;
  /** Identité persistante du passage : tentative enregistrée en base ou date du passage si l'ancien numéro est ambigu. */
  passageKey: string;
  tentativeLabel: string;
  tentativeSortValue: number;
  /** Numéro de tentative réellement enregistré si fiable ; jamais recalculé depuis l'ordre d'affichage. */
  tentative: number;
  /** Numéro de tentative tel qu'enregistré en base (cible d'écriture). */
  dbTentative?: number;
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

function getQuestionId(question: any): number | null {
  const rawId = question?.questionId ?? question?.id;
  const questionId = Number(rawId);
  return Number.isFinite(questionId) ? questionId : null;
}

export function getSnapshotQrcQuestionIds(questions: any[] | null | undefined): Set<number> | null {
  if (!Array.isArray(questions) || questions.length === 0) return null;
  const ids = questions
    .filter((q: any) => {
      const type = q?.type
        ? String(q.type).trim().toUpperCase()
        : (/(\(qrc\))/i.test(safeStr(q?.enonce)) ? "QRC" : "QCM");
      return type === "QRC";
    })
    .map((q: any) => Number(q?.questionId ?? q?.id))
    .filter((id: number) => Number.isFinite(id));
  return ids.length > 0 ? new Set(ids) : null;
}

function getCorrectionForQuestion(correctionsIA: Record<string | number, any>, questionId: number): any {
  return correctionsIA?.[questionId] ?? correctionsIA?.[String(questionId)] ?? correctionsIA?.[`Q${questionId}`] ?? null;
}

function getCorrectionKey(apprenantId: string, quizId: string, matiereId: string, questionId: number): string {
  return `${apprenantId}__${quizId}__${matiereId || ""}__${questionId}`;
}

function getExamNumberValue(titre: string, quizId?: string): number {
  const fromTitle = titre.match(/N[°º]\s*(\d+)/i)?.[1];
  const fromId = quizId?.match(/eb\s*(\d+)/i)?.[1] || quizId?.match(/eb(\d+)/i)?.[1];
  const value = Number(fromTitle || fromId || Number.MAX_SAFE_INTEGER);
  return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
}

function getMatiereOrderValue(matiereNom: string, matiereId?: string): number {
  const raw = `${matiereNom || ""} ${matiereId || ""}`;
  const match = raw.match(/^\s*([A-G])\s*(?:\(|-|–|—|\.)/i)
    || raw.match(/(?:^|\s)([A-G])\s*(?:\(|-|–|—|\.)/i);
  if (match?.[1]) return match[1].toUpperCase().charCodeAt(0) - "A".charCodeAt(0);
  return Number.MAX_SAFE_INTEGER;
}

function getBlockingGroupKey(item: Pick<QrcItem, "apprenantId" | "quizId" | "passageKey" | "matiereId">): string {
  return `${item.apprenantId}__${item.quizId}__${item.passageKey}__${item.matiereId || ""}`;
}

function compareBlockingQrcItems(a: QrcItem, b: QrcItem): number {
  const nameA = `${a.apprenantNom} ${a.apprenantPrenom}`.trim();
  const nameB = `${b.apprenantNom} ${b.apprenantPrenom}`.trim();
  const byName = nameA.localeCompare(nameB, "fr", { sensitivity: "base" });
  if (byName !== 0) return byName;

  const byExam = getExamNumberValue(a.quizTitre, a.quizId) - getExamNumberValue(b.quizTitre, b.quizId);
  if (byExam !== 0) return byExam;

  const byExamTitle = a.quizTitre.localeCompare(b.quizTitre, "fr", { sensitivity: "base" });
  if (byExamTitle !== 0) return byExamTitle;

  if (a.tentativeSortValue !== b.tentativeSortValue) return a.tentativeSortValue - b.tentativeSortValue;
  const byPassageDate = (new Date(a.completedAt).getTime() || 0) - (new Date(b.completedAt).getTime() || 0);
  if (byPassageDate !== 0) return byPassageDate;

  const byMatiereOrder = getMatiereOrderValue(a.matiereNom, a.matiereId) - getMatiereOrderValue(b.matiereNom, b.matiereId);
  if (byMatiereOrder !== 0) return byMatiereOrder;

  const byMatiere = (a.matiereNom || a.matiereId).localeCompare(b.matiereNom || b.matiereId, "fr", { sensitivity: "base" });
  if (byMatiere !== 0) return byMatiere;

  return a.questionId - b.questionId;
}

function sortBlockingQrcItems(list: QrcItem[]): QrcItem[] {
  return [...list].sort(compareBlockingQrcItems);
}

/**
 * QRC BLOQUANT UN RÉSULTAT — SOURCE DE VÉRITÉ DU BLOCAGE.
 * Une QRC réellement répondue et non validée manuellement empêche la
 * publication du résultat, quelle que soit la ligne technique (« tentative »)
 * sur laquelle elle a été enregistrée. Lecture/affichage uniquement.
 */
export function isBlockingQrcItem(
  item: Pick<QrcItem, "corrigeManuel" | "reponseEleve">,
): boolean {
  return !item.corrigeManuel && safeStr(item.reponseEleve).trim() !== "";
}

/**
 * Périmètre de confort de la liste normale.
 * IMPORTANT : ce filtre ne doit JAMAIS masquer une QRC qui bloque un résultat.
 */
export function isInTentativeScope(
  item: Pick<QrcItem, "dbTentative" | "corrigeManuel" | "reponseEleve">,
  tentativeFilter: "1" | "all",
): boolean {
  if (tentativeFilter === "all" || item.dbTentative === 1) return true;
  // Une écriture technique « tentative 2/3 » qui porte une QRC bloquante
  // reste toujours accessible à la correction.
  return isBlockingQrcItem(item);
}


/** Identité exacte utilisée pour comparer les files « aujourd'hui » et « bloquantes ». */
export function getQrcQueueIdentity(
  item: Pick<QrcItem, "apprenantId" | "quizId" | "passageKey" | "matiereId" | "questionId">,
): string {
  return `${item.apprenantId}__${item.quizId}__${item.passageKey}__${item.matiereId || ""}__${item.questionId}`;
}

function formatDateOnlyFR(value: string): string {
  if (!value) return "";
  return new Date(value).toLocaleDateString("fr-FR");
}

/**
 * Formation active AUJOURD'HUI : date de début ≤ aujourd'hui ≤ date de fin.
 * Lecture seule : sert uniquement au filtrage d'affichage de l'encadré vert.
 */
function isFormationActiveToday(a: { date_debut_cours_en_ligne?: string | null; date_fin_cours_en_ligne?: string | null }): boolean {
  const debut = a?.date_debut_cours_en_ligne ? String(a.date_debut_cours_en_ligne).slice(0, 10) : null;
  const fin = a?.date_fin_cours_en_ligne ? String(a.date_fin_cours_en_ligne).slice(0, 10) : null;
  if (!debut || !fin) return false;
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return debut <= today && today <= fin;
}

function formatPassageDateTimeFR(value: string | null | undefined): string {
  const date = value ? new Date(value) : null;
  if (!date || !Number.isFinite(date.getTime())) return "date inconnue";
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function getStoredTentative(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

function parseExamAnswerExerciceId(value: unknown): { quizId: string; matiereId: string; tentative: number | null } {
  const parts = safeStr(value).split("__");
  const quizId = parts[0] || "";
  const suffix = parts[parts.length - 1] || "";
  const suffixTentative = suffix.match(/^t(\d+)$/i)?.[1];
  const matiereParts = suffixTentative ? parts.slice(1, -1) : parts.slice(1);
  return {
    quizId,
    matiereId: matiereParts.join("__"),
    tentative: suffixTentative ? getStoredTentative(suffixTentative) : null,
  };
}

function buildFallbackPassageKey(identityKey: string, completedAt: string | null | undefined, primaryId: string): string {
  const time = completedAt ? new Date(completedAt).getTime() : 0;
  return `${identityKey}__P${Number.isFinite(time) && time > 0 ? time : primaryId}`;
}

/**
 * Deux entrées désignent la même QRC réellement passée lorsque l'apprenant,
 * l'examen, la matière, LE PASSAGE/TENTATIVE et l'identifiant stable de la
 * question sont identiques, et que le texte de la réponse est le même.
 * Le texte sert uniquement à reconnaître les lignes techniques jumelles d'un
 * même passage (finalisation, reprise, double écriture). Une vraie nouvelle
 * tentative reste une QRC distincte à corriger, même si l'élève donne
 * exactement la même réponse que lors de sa tentative précédente.
 */
export function isSameQrcContent(
  a: { apprenantId: string; quizId: string; matiereId: string; passageKey?: string; tentative?: number; questionId: number; reponseEleve?: string },
  b: { apprenantId: string; quizId: string; matiereId: string; passageKey?: string; tentative?: number; questionId: number; reponseEleve?: string },
): boolean {
  const texteA = normalizeText(safeStr(a.reponseEleve));
  if (!texteA) return false;
  const samePassage = a.passageKey || b.passageKey
    ? !!a.passageKey && !!b.passageKey && a.passageKey === b.passageKey
    : (a.tentative ?? 1) === (b.tentative ?? 1);
  return (
    a.apprenantId === b.apprenantId &&
    a.quizId === b.quizId &&
    (a.matiereId || "") === (b.matiereId || "") &&
    samePassage &&
    a.questionId === b.questionId &&
    texteA === normalizeText(safeStr(b.reponseEleve))
  );
}


function isAdminValidatedCorrection(correction: unknown, completedAt?: string | null): boolean {
  if (!correction || typeof correction !== "object") return false;
  const correctionRecord = correction as Record<string, unknown>;
  if (correctionRecord.validatedByAdmin === true) return true;

  const explication = safeStr(correctionRecord.explication).toLowerCase();
  const hasLegacyAdminMarker =
    explication.includes("correction manuelle par l'administrateur") ||
    explication.includes("validation manuelle (masqué par admin)");

  if (correctionRecord.manuel === true && !!correctionRecord.correctedAt && hasLegacyAdminMarker) return true;

  // PREUVE CERTAINE (lecture seule, aucun recalcul) : une correction portant le
  // marqueur admin dont la date de correction est postérieure de plus d'une
  // minute à la fin du passage ne peut pas provenir d'un calcul automatique
  // (celui-ci s'écrit à la seconde du passage). Elle est donc reconnue comme
  // déjà corrigée, sans que ses points ni son contenu soient modifiés.
  if (hasLegacyAdminMarker && correctionRecord.correctedAt && completedAt) {
    const corrected = new Date(safeStr(correctionRecord.correctedAt)).getTime();
    const completed = new Date(completedAt).getTime();
    if (Number.isFinite(corrected) && Number.isFinite(completed) && corrected > completed + 60_000) {
      return true;
    }
  }

  return false;
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

/**
 * Classement de la file : DATE/HEURE RÉELLE de la réponse/passage décroissante
 * (par défaut — « Plus récent » en premier), indépendamment de la date de
 * création de l'apprenant ou de l'ordre alphabétique.
 * À date/heure identique (même passage), on reste dans le bloc de l'élève :
 * examen → tentative → matière → n° de question croissant.
 */
function sortQrcItems(list: QrcItem[], sortOrder: "desc" | "asc"): QrcItem[] {
  return [...list].sort((a, b) => {
    const dateA = new Date(a.completedAt).getTime() || 0;
    const dateB = new Date(b.completedAt).getTime() || 0;
    if (dateA !== dateB) return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    const nomA = `${a.apprenantNom} ${a.apprenantPrenom}`.toLowerCase();
    const nomB = `${b.apprenantNom} ${b.apprenantPrenom}`.toLowerCase();
    if (nomA !== nomB) return nomA.localeCompare(nomB);
    if (a.apprenantId !== b.apprenantId) return a.apprenantId.localeCompare(b.apprenantId);
    if (a.quizId !== b.quizId) return a.quizId.localeCompare(b.quizId);
    if (a.tentativeSortValue !== b.tentativeSortValue) return a.tentativeSortValue - b.tentativeSortValue;
    if (a.matiereId !== b.matiereId) return a.matiereId.localeCompare(b.matiereId);
    return a.questionId - b.questionId;
  });
}

const CorrectionQRCTab = () => {
  const [items, setItems] = useState<QrcItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "done" | "today" | "today-pending" | "blocking">("pending");
  const [searchQuery, setSearchQuery] = useState("");
  // Filtre par défaut : tentative 1 uniquement (les refontes — tentative 2+ —
  // restent accessibles via « Toutes les tentatives », sans jamais les modifier).
  const [tentativeFilter, setTentativeFilter] = useState<"1" | "all">("1");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingPoints, setEditingPoints] = useState(0);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [examenMap, setExamenMap] = useState<Record<string, ExamenBlanc>>({});
  const [editingComments, setEditingComments] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [examenFilter, setExamenFilter] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeBlockingGroupKey, setActiveBlockingGroupKey] = useState<string | null>(null);
  // Erreur de chargement (session expirée, 401, permissions) : on n'affiche JAMAIS 0 silencieusement.
  const [loadError, setLoadError] = useState<string | null>(null);
  // Contrôle automatique : QRC répondues présentes en base mais absentes de la file.
  const [integrityAlert, setIntegrityAlert] = useState<{ count: number; apprenants: number } | null>(null);
  // Passages EB N°2 sans note définitive (même règle que le portail apprenant).
  const [eb2PendingAttempts, setEb2PendingAttempts] = useState<Eb2PendingAttempt[]>([]);

  // ── Historique de navigation de la session de correction ──
  // Une QRC validée pendant la session reste visible dans la file courante
  // (badge « ✅ Déjà corrigée ») afin que « Précédent » puisse y revenir.
  // Elle n'est JAMAIS remise en attente : son état corrigé est conservé.
  // Identité stable : apprenant + examen + tentative/passage + matière + question.
  const qrcNavKey = (i: QrcItem) =>
    `${i.apprenantId}__${i.quizId}__${i.dbTentative ?? 1}__${i.passageKey}__${i.matiereId || ""}__${i.questionId}`;
  const keptKeysRef = useRef<Set<string>>(new Set());
  const [keptVersion, setKeptVersion] = useState(0);
  const isKeptInSession = (item: QrcItem) => item.corrigeManuel && keptKeysRef.current.has(qrcNavKey(item));

  const matchesFilter = (item: QrcItem): boolean => {
    const kept = isKeptInSession(item);
    if (filter === "pending" && item.corrigeManuel && !kept) return false;
    if (filter === "done" && !item.corrigeManuel) return false;
    if (filter === "today" && !isAnsweredToday(item)) return false;
    if (filter === "today-pending" && (!isAnsweredToday(item) || (item.corrigeManuel && !kept))) return false;
    if (filter === "blocking" && !isBlockingResult(item) && !kept) return false;
    if (filter === "blocking" && activeBlockingGroupKey && getBlockingGroupKey(item) !== activeBlockingGroupKey) return false;
    // Le même périmètre s'applique sans exception aux listes du jour,
    // bloquantes, en attente, corrigées et à leurs compteurs.
    if (!isInTentativeScope(item, tentativeFilter)) return false;
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
  };

  // Mirrors the filter + sort applied to `sortedFiltered` in the render, so that
  // auto-advance after saving picks the correct next item.
  const computeSortedFiltered = (list: QrcItem[]): QrcItem[] => {
    const filteredList = list.filter(matchesFilter);
    return filter === "blocking" ? sortBlockingQrcItems(filteredList) : sortQrcItems(filteredList, sortOrder);
  };


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
      const saved = await loadSavedExamens(true);
      setExamenMap(buildExamenMap(tousLesExamens, saved));
    };
    load();
  }, []);

  const fetchData = useCallback(async (opts?: { silent?: boolean }) => {
    if (Object.keys(examenMap).length === 0) return;
    if (!opts?.silent) setLoading(true);

    // Session admin : on s'assure d'avoir un jeton valide AVANT toute requête,
    // sinon un 401 ferait croire à tort qu'il n'y a aucune QRC à corriger.
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      if (!refreshed?.session) {
        setLoadError("Session administrateur expirée : impossible de charger les QRC. Reconnectez-vous puis cliquez sur Réactualiser.");
        if (!opts?.silent) setLoading(false);
        return;
      }
    }

    // Fetch all exam_blanc results that have QRC questions (Supabase client is capped at 1000 rows per request)
    const pageSize = 1000;
    const results: any[] = [];
    for (let from = 0, retried = false; ; from += pageSize) {
      const { data, error } = await supabase
        .from("apprenant_quiz_results")
        .select("id, apprenant_id, user_id, quiz_id, quiz_type, quiz_titre, matiere_id, matiere_nom, details, completed_at, score_obtenu, score_max, note_sur_20, tentative")
        .in("quiz_type", ["examen_blanc", "bilan"])
        .order("completed_at", { ascending: false })
        .range(from, from + pageSize - 1);

      if (error) {
        // Une seule tentative de renouvellement de session, puis erreur explicite.
        if (!retried) {
          retried = true;
          const { data: refreshed } = await supabase.auth.refreshSession();
          if (refreshed?.session) { from -= pageSize; continue; }
        }
        console.error("Erreur chargement résultats:", error);
        setLoadError(`Chargement impossible : ${error.message}. Aucune QRC n'a pu être lue (ce n'est pas un écran vide).`);
        if (!opts?.silent) setLoading(false);
        return;
      }
      results.push(...(data || []));
      if (!data || data.length < pageSize) break;
    }
    setLoadError(null);

    // Fetch apprenant names
    const apprenantIds = [...new Set(results.map((r: any) => r.apprenant_id))];
    const apprenants: any[] = [];
    for (let i = 0; i < apprenantIds.length; i += 500) {
      const chunk = apprenantIds.slice(i, i + 500);
      if (chunk.length === 0) continue;
      const { data } = await supabase
        .from("apprenants")
        .select("id, nom, prenom, type_apprenant, date_debut_cours_en_ligne, date_fin_cours_en_ligne")
        .in("id", chunk);
      apprenants.push(...(data || []));
    }

    const apprenantMap: Record<string, { nom: string; prenom: string; mode: "presentiel" | "elearning"; formationActive: boolean }> = {};
    (apprenants || []).forEach((a: any) => {
      const t = String(a.type_apprenant || "").toLowerCase();
      const mode: "presentiel" | "elearning" = t.endsWith("-e") || t.includes("-e-") ? "elearning"
        : (t === "vtc-e-presentiel" ? "presentiel" : (t.endsWith("-e") ? "elearning" : "presentiel"));
      apprenantMap[a.id] = { nom: a.nom, prenom: a.prenom, mode, formationActive: isFormationActiveToday(a) };
    });

    // ────────────────────────────────────────────────────────────────────
    // IDENTITÉ D'UNE QRC (règle définitive) :
    //   apprenant + examen exact + matière + TENTATIVE + identité de question
    // → deux écritures techniques du même passage = UNE seule QRC ;
    // → une vraie nouvelle tentative = une NOUVELLE QRC à corriger ;
    // → une validation admin reste définitive pour cette tentative.
    // Aucune donnée n'est modifiée ici : lecture et classement uniquement.
    // ────────────────────────────────────────────────────────────────────
    const qrcItems: QrcItem[] = [];
    const seenQrcKeys = new Set<string>();

    const attemptKey = (a: string, q: string, m: string, passageKey: string, qid: number) =>
      `${a}__${q}__${m || ""}__${passageKey}__${qid}`;

    // Identité d'une QRC réellement passée : apprenant + examen + matière +
    // PASSAGE/TENTATIVE RÉEL + question stable. Le texte de la réponse n'entre
    // en jeu qu'à l'intérieur d'un même passage, pour reconnaître les lignes
    // techniques jumelles (finalisation, reprise, double écriture) écrites pour
    // ce passage. Deux tentatives réelles restent TOUJOURS deux QRC distinctes,
    // même si l'élève a répondu exactement la même chose.
    const answerIdentity = (a: string, q: string, m: string, passageKey: string, qid: number, reponse: unknown) =>
      `${a}__${q}__${m || ""}__${passageKey}__${qid}__${normalizeText(safeStr(reponse))}`;
    const validatedByAnswer = new Map<string, any>();
    const itemIndexByContent = new Map<string, number>();



    // ── Index des validations admin déjà enregistrées ───────────────────
    // Une validation est rattachée à SON passage (date de fin du passage),
    // jamais à un simple numéro de question.
    type ValidationRecord = { correction: any; matiereId: string; time: number };
    const validationsByQuestion = new Map<string, ValidationRecord[]>();
    let validationsRecuperees = 0;
    let validationsAmbigues = 0;

    for (const r of results as any[]) {
      const correctionsIA = ((r.details as any)?.correctionsIA || {}) as Record<string | number, any>;
      Object.entries(correctionsIA).forEach(([rawQuestionId, correction]) => {
        const questionId = Number(String(rawQuestionId).replace(/^Q/i, ""));
        if (!Number.isFinite(questionId) || !isAdminValidatedCorrection(correction, r.completed_at)) return;
        const lk = `${r.apprenant_id}__${r.quiz_id}__${questionId}`;
        const list = validationsByQuestion.get(lk) || [];
        list.push({ correction, matiereId: r.matiere_id || "", time: new Date(r.completed_at).getTime() || 0 });
        validationsByQuestion.set(lk, list);

      });
    }

    // ── Regroupement par PASSAGE RÉEL (fusion des doubles écritures) ─────
    // IDENTITÉ DÉTERMINISTE, SANS FENÊTRE DE TEMPS :
    //  1) même numéro de tentative persistant  → même passage (par définition) ;
    //  2) sinon, SIGNATURE DE RÉPONSES STRICTEMENT IDENTIQUE (toutes les
    //     réponses enregistrées, caractère pour caractère, avec au moins une
    //     réponse rédigée) → il s'agit d'une ré-écriture du même passage.
    // Toute divergence, même d'un seul caractère, laisse les lignes SÉPARÉES :
    // deux vraies tentatives restent deux passages distincts, même rapprochées
    // dans le temps. Aucune donnée n'est modifiée : regroupement d'affichage.
    const MEME_PASSAGE_MS = 5 * 60 * 1000;
    type AttemptGroup = {
      primaryId: string; apprenantId: string; userId?: string; quizId: string; quizType: string;
      quizTitre: string; matiereId: string; matiereNom: string; identityKey: string; passageKey: string;
      tentative: number; dbTentative?: number; tentativeLabel: string; tentativeSortValue: number; completedAt: string;
      scoreObtenu: number; scoreMax: number; noteSur20: number | null;
      questions: any[] | null; reponses: Record<string, any>; corrections: Record<string, any>; rows: number;
      firstTime: number; lastTime: number;
      /** Signature déterministe des réponses (preuve de ré-écriture du même passage). */
      answerSignature: string | null;
      /** Numéros de tentative techniques regroupés dans ce passage réel. */
      mergedTentatives: number[];
    };
    const groupsByMatiere = new Map<string, AttemptGroup[]>();
    let doublonsTechniques = 0;


    // Les lignes arrivent de la plus récente à la plus ancienne : on les
    // traite de la plus ancienne à la plus récente, sans renuméroter les passages.
    // PILOTE : seuls les PASSAGES réellement pris en charge par le nouveau
    // moteur (une ligne existe dans `qrc_instances`) sont retirés de l'ancienne
    // file — ils sont servis exclusivement par le panneau dédié ci-dessus.
    // Tout l'historique antérieur du même examen reste traité à l'identique
    // par l'ancien mécanisme. Une QRC ne peut donc jamais apparaître deux fois,
    // ni disparaître des deux côtés.
    const engineQuizIds = await loadQrcEngineQuizIds(true);
    const engineAttemptIds = engineQuizIds.size > 0 ? await fetchQrcEngineAttemptIds() : new Set<string>();
    const isHandledByEngine = (r: any): boolean => {
      if (!engineQuizIds.has(String(r.quiz_id))) return false;
      const t = getStoredTentative(r.tentative);
      if (t == null) return false;
      return engineAttemptIds.has(
        buildQrcAttemptId(String(r.apprenant_id), String(r.quiz_id), String(r.matiere_id || ""), t),
      );
    };
    const resultsAsc = (results as any[])
      .filter((r) => !isResultPlaceholder(r) && !isHandledByEngine(r))
      .sort(
      (a, b) => (new Date(a.completed_at).getTime() || 0) - (new Date(b.completed_at).getTime() || 0),
    );

    for (const r of resultsAsc) {
      const details = (r.details as any) || {};
      const mid = r.matiere_id || "";
      const mKey = `${r.apprenant_id}__${r.quiz_type}__${r.quiz_id}__${mid}`;
      const time = new Date(r.completed_at).getTime() || 0;
      const storedTentative = getStoredTentative(r.tentative);
      const questions = Array.isArray(details.questions) && details.questions.length > 0 ? details.questions : null;
      const list = groupsByMatiere.get(mKey) || [];
      const signature = buildAnswerSignature(details);

      // Cible de fusion : même numéro de tentative persistant, ou signature de
      // réponses strictement identique. Jamais une simple proximité horaire.
      const target = list.find((g) =>
        (storedTentative != null && g.dbTentative === storedTentative)
        || (!!signature && g.answerSignature === signature),
      );

      if (target) {
        // Même passage : on complète ce qui manque, sans jamais écraser.
        doublonsTechniques++;
        target.rows++;
        target.lastTime = Math.max(target.lastTime, time);
        if (r.completed_at && time >= target.lastTime) target.completedAt = r.completed_at;
        if (storedTentative != null && !target.mergedTentatives.includes(storedTentative)) {
          target.mergedTentatives.push(storedTentative);
        }
        if (!target.answerSignature && signature) target.answerSignature = signature;
        if (questions && (!target.questions || questions.length > target.questions.length)) {
          target.questions = questions;
          target.primaryId = r.id;
        }
        Object.entries(details.reponses || {}).forEach(([k, v]) => {
          const current = target.reponses[k];
          if (current == null || (typeof current === "string" && current.trim() === "")) target.reponses[k] = v;
        });
        Object.entries(details.correctionsIA || {}).forEach(([k, v]) => {
          const current = target.corrections[k];
          if (current == null || (!isAdminValidatedCorrection(current, target.completedAt) && isAdminValidatedCorrection(v, r.completed_at))) {
            target.corrections[k] = v;
          }
        });
        if (!target.matiereNom && r.matiere_nom) target.matiereNom = r.matiere_nom;
        if ((r.score_obtenu ?? 0) > target.scoreObtenu) {
          target.scoreObtenu = r.score_obtenu ?? 0;
          target.noteSur20 = r.note_sur_20 ?? target.noteSur20;
        }
        continue;
      }

      const initialPassageKey = storedTentative != null
        ? `${mKey}__T${storedTentative}`
        : buildFallbackPassageKey(mKey, r.completed_at, r.id);

      list.push({
        primaryId: r.id, apprenantId: r.apprenant_id, userId: r.user_id, quizId: r.quiz_id,
        quizType: r.quiz_type, quizTitre: r.quiz_titre, matiereId: mid, matiereNom: r.matiere_nom || "",
        identityKey: mKey,
        passageKey: initialPassageKey,
        tentative: storedTentative ?? 0,
        dbTentative: storedTentative ?? undefined,
        tentativeLabel: storedTentative != null ? `tentative ${storedTentative}` : `Passage du ${formatPassageDateTimeFR(r.completed_at)}`,
        tentativeSortValue: storedTentative ?? Number.MAX_SAFE_INTEGER,
        completedAt: r.completed_at,
        scoreObtenu: r.score_obtenu ?? 0, scoreMax: r.score_max ?? 20, noteSur20: r.note_sur_20 ?? null,
        questions,
        reponses: { ...(details.reponses || {}) },
        corrections: { ...(details.correctionsIA || {}) },
        rows: 1,
        firstTime: time,
        lastTime: time,
        answerSignature: signature,
        mergedTentatives: storedTentative != null ? [storedTentative] : [],
      });
      groupsByMatiere.set(mKey, list);

    }

    // Le libellé « tentative X » n'est affiché que si X est unique pour cette
    // identité apprenant+examen+matière. Si d'anciennes lignes réutilisent le
    // même numéro pour plusieurs passages réels, on affiche la date du passage
    // plutôt que d'inventer/renuméroter un numéro.
    groupsByMatiere.forEach((list) => {
      const occurrences = new Map<number, number>();
      list.forEach((g) => {
        if (g.dbTentative != null) occurrences.set(g.dbTentative, (occurrences.get(g.dbTentative) || 0) + 1);
      });
      list.forEach((g) => {
        if (g.dbTentative != null && occurrences.get(g.dbTentative) === 1) {
          g.passageKey = `${g.identityKey}__T${g.dbTentative}`;
          g.tentative = g.dbTentative;
          g.tentativeLabel = `tentative ${g.dbTentative}`;
          g.tentativeSortValue = g.dbTentative;
          return;
        }
        g.passageKey = buildFallbackPassageKey(g.identityKey, g.completedAt, g.primaryId);
        g.tentative = 0;
        g.tentativeLabel = `Passage du ${formatPassageDateTimeFR(g.completedAt)}`;
        g.tentativeSortValue = Number.MAX_SAFE_INTEGER;
      });
    });

    const groups: AttemptGroup[] = [];
    groupsByMatiere.forEach((list) => groups.push(...list));

    // Index des validations, rattaché au PASSAGE réel (et non à la ligne
    // technique qui l'a enregistrée). Chaque passage a son propre index : une
    // nouvelle tentative ne récupère jamais la validation d'une tentative
    // précédente, même avec une réponse strictement identique.
    groups.forEach((g) => {
      Object.entries(g.corrections || {}).forEach(([rawQuestionId, correction]) => {
        const questionId = Number(String(rawQuestionId).replace(/^Q/i, ""));
        if (!Number.isFinite(questionId) || !isAdminValidatedCorrection(correction, g.completedAt)) return;
        const reponse = g.reponses?.[questionId] ?? g.reponses?.[String(questionId)];
        if (!safeStr(reponse).trim()) return;
        const ck = answerIdentity(g.apprenantId, g.quizId, g.matiereId, g.passageKey, questionId, reponse);
        if (!validatedByAnswer.has(ck)) validatedByAnswer.set(ck, correction);
      });
    });


    // Rattachement d'une validation existante au passage concerné :
    // 1) la validation enregistrée sur le passage lui-même ;
    // 2) sinon, rattrapage UNIQUEMENT si la correspondance est certaine —
    //    même apprenant, même examen, même question, même passage (date),
    //    et une seule validation candidate écrite sans code matière
    //    (lignes bilan regroupées). Tout cas ambigu est laissé intact.
    const findValidationForGroup = (g: AttemptGroup, matiereId: string, questionId: number): any | null => {
      const own = getCorrectionForQuestion(g.corrections, questionId);
      if (isAdminValidatedCorrection(own, g.completedAt)) return own;
      const candidates = (validationsByQuestion.get(`${g.apprenantId}__${g.quizId}__${questionId}`) || [])
        .filter(v => Math.abs(v.time - g.lastTime) <= MEME_PASSAGE_MS && (v.matiereId || "") !== (matiereId || ""));
      if (candidates.length === 0) return null;
      const certains = candidates.filter(v => !v.matiereId || !matiereId);
      if (certains.length === 1) { validationsRecuperees++; return certains[0].correction; }
      validationsAmbigues++;
      return null;
    };

    // Dernier passage connu par apprenant + examen + matière (sert à rattacher
    // les réponses en cours de saisie au bon passage).
    const dernierPassage = new Map<string, AttemptGroup>();
    groups.forEach((g) => {
      const k = `${g.apprenantId}__${g.quizId}__${g.matiereId}`;
      const prev = dernierPassage.get(k);
      if (!prev || g.lastTime > prev.lastTime) dernierPassage.set(k, g);
    });
    const passageParTentative = new Map<string, AttemptGroup>();
    const tentativeOccurrences = new Map<string, number>();
    groups.forEach((g) => {
      if (g.dbTentative == null) return;
      const k = `${g.apprenantId}__${g.quizId}__${g.matiereId}__T${g.dbTentative}`;
      tentativeOccurrences.set(k, (tentativeOccurrences.get(k) || 0) + 1);
    });
    groups.forEach((g) => {
      if (g.dbTentative == null) return;
      const k = `${g.apprenantId}__${g.quizId}__${g.matiereId}__T${g.dbTentative}`;
      if (tentativeOccurrences.get(k) === 1) passageParTentative.set(k, g);
    });
    const findPassageForAutosave = (apprenantId: string, quizId: string, matiereId: string, tentative: number | null, at: string | null | undefined): AttemptGroup | undefined => {
      if (tentative != null) {
        const byTentative = passageParTentative.get(`${apprenantId}__${quizId}__${matiereId}__T${tentative}`);
        if (byTentative) return byTentative;
      }
      const time = at ? new Date(at).getTime() : 0;
      if (!Number.isFinite(time) || time <= 0) return undefined;
      const candidates = groupsByMatiere.get(`${apprenantId}__examen_blanc__${quizId}__${matiereId}`) || [];
      return candidates
        .map((g) => ({ group: g, distance: Math.min(Math.abs(time - g.firstTime), Math.abs(time - g.lastTime)) }))
        .filter(({ distance }) => distance <= MEME_PASSAGE_MS)
        .sort((a, b) => a.distance - b.distance)[0]?.group;
    };

    for (const g of groups.values()) {
      const defaultMatiere = findMatiereWithFallback(examenMap, tousLesExamens, g.quizId, g.matiereId);
      const matiere = chooseMatiereMatchingResponses(defaultMatiere, examenMap, g.matiereId, g.reponses);

      let questionList = g.questions;
      if (!questionList && matiere && (Object.keys(g.corrections).length > 0 || Object.keys(g.reponses).length > 0)) {
        questionList = buildQuestionListFromMatiere(matiere, g.reponses);
      }
      if (!questionList) continue;

      for (const q of questionList) {
        const enonceStr = safeStr(q.enonce);
        const inferredType = q.type
          ? String(q.type).toUpperCase()
          : (/\(qrc\)/i.test(enonceStr) ? "QRC" : "QCM");
        if (inferredType !== "QRC") continue;

        const questionId = getQuestionId(q);
        if (questionId == null) continue;

        const effectiveMatiereId = g.matiereId || safeStr(q.matiereId);
        const perQuestionMatiere = matiere
          || findMatiereWithFallback(examenMap, tousLesExamens, g.quizId, effectiveMatiereId);

        const qrcKey = attemptKey(g.apprenantId, g.quizId, effectiveMatiereId, g.passageKey, questionId);
        if (seenQrcKeys.has(qrcKey)) continue;
        seenQrcKeys.add(qrcKey);

        const pts = getPointsParQuestion(effectiveMatiereId, "QRC", perQuestionMatiere || undefined);

        const reponseEleveRaw = q.reponseEleve != null && q.reponseEleve !== ""
          ? q.reponseEleve
          : (g.reponses?.[questionId] ?? g.reponses?.[String(questionId)] ?? "");
        const reponseEleveStr = safeStr(reponseEleveRaw);

        const validation = findValidationForGroup(g, effectiveMatiereId, questionId);
        let correction = validation ?? getCorrectionForQuestion(g.corrections, questionId);
        let hasManualCorrection = !!validation || isAdminValidatedCorrection(correction, g.completedAt);

        // Rattrapage à l'intérieur du MÊME passage : la même réponse, pour le
        // même apprenant, le même examen, la même matière, la même question et
        // la même tentative, a déjà été validée sur une autre écriture
        // technique de ce passage. La correction existante fait foi — rien
        // n'est recalculé ni réécrit, et aucune autre tentative n'est touchée.
        if (!hasManualCorrection && reponseEleveStr.trim()) {
          const dejaValidee = validatedByAnswer.get(
            answerIdentity(g.apprenantId, g.quizId, effectiveMatiereId, g.passageKey, questionId, reponseEleveStr),
          );
          if (dejaValidee) {
            correction = dejaValidee;
            hasManualCorrection = true;
          }
        }

        const app = apprenantMap[g.apprenantId] || { nom: "Inconnu", prenom: "", mode: "presentiel" as const, formationActive: false };

        const questionDef = perQuestionMatiere?.questions?.find((mq: any) => mq && mq.id === questionId);
        const currentExamen = examenMap[g.quizId];
        const currentMatiere = currentExamen?.matieres?.find((m: any) => m.id === effectiveMatiereId);
        const currentQuestionDef = currentMatiere?.questions?.find((mq: any) => mq && mq.id === questionId);
        const savedQuestionText = normalizeText(enonceStr);
        const currentQuestionText = normalizeText(safeStr(currentQuestionDef?.enonce));
        const questionSupprimee = !currentQuestionDef || (!!savedQuestionText && !!currentQuestionText && savedQuestionText !== currentQuestionText);

        // QRC réellement laissée vide par l'élève (snapshot du passage présent et
        // réponse explicitement vide) : elle vaut 0 et ne remonte pas dans la file.
        // Une réponse simplement absente (perte de synchronisation) reste à corriger.
        if (!hasManualCorrection && !reponseEleveStr.trim() && g.questions
          && isQrcAnswerCertainlyEmpty({ questions: g.questions, reponses: g.reponses }, questionId)) {
          continue;
        }


        const reponseCorrecteStr = q.reponseCorrecte
          ? safeStr(q.reponseCorrecte)
          : safeStr(questionDef?.reponseQRC || (questionDef?.reponses_possibles || []).join(" / "));

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

        const contentKey = reponseEleveStr.trim()
          ? answerIdentity(g.apprenantId, g.quizId, effectiveMatiereId, g.passageKey, questionId, reponseEleveStr)
          : null;
        const item: QrcItem = {
          resultId: g.primaryId,
          source: "result",
          userId: g.userId,
          apprenantId: g.apprenantId,
          apprenantNom: app.nom,
          apprenantPrenom: app.prenom,
          quizTitre: g.quizTitre,
          quizId: g.quizId,
          quizType: g.quizType,
          passageKey: g.passageKey,
          tentativeLabel: g.tentativeLabel,
          tentativeSortValue: g.tentativeSortValue,
          tentative: g.tentative,
          dbTentative: g.dbTentative,
          matiereId: effectiveMatiereId,
          matiereNom: g.matiereNom || safeStr(q.matiereNom) || perQuestionMatiere?.nom || "",
          questionId,
          enonce: enonceStr,
          reponseEleve: reponseEleveStr,
          reponseCorrecte: reponseCorrecteStr,
          pointsMax: pts,
          pointsObtenus: hasManualCorrection ? clampToHalfStep(correction?.pointsObtenus ?? 0, pts) : null,
          corrigeManuel: hasManualCorrection,
          completedAt: g.completedAt,
          autoScore,
          autoExplication,
          noteSur20: g.noteSur20,
          scoreMatiereObtenu: g.scoreObtenu,
          scoreMatiereMax: g.scoreMax,
          commentaire: correction && typeof correction === "object" ? (correction.commentaire || "") : "",
          correctedAt: hasManualCorrection ? (correction?.correctedAt || g.completedAt || null) : null,
          apprenantTypeMode: app.mode,
          questionSupprimee,
        };

        // Même réponse déjà présente (deuxième écriture technique du passage) :
        // une seule entrée est conservée, la version corrigée faisant foi.
        if (contentKey && itemIndexByContent.has(contentKey)) {
          const idx = itemIndexByContent.get(contentKey);
          if (idx == null) continue;
          if (!qrcItems[idx].corrigeManuel && item.corrigeManuel) qrcItems[idx] = item;
          continue;
        }
        if (contentKey) itemIndexByContent.set(contentKey, qrcItems.length);
        qrcItems.push(item);

      }
    }

    // ── Réponses réellement sauvegardées (toutes dates, plus seulement le jour) ──
    // Une QRC répondue rejoint la file quelle que soit sa date, dès lors
    // qu'elle n'a jamais été validée et qu'aucun enregistrement de fin ne la
    // porte déjà. Aucune réponse n'est créée : on lit ce qui existe.
    const autosaves: any[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .from("reponses_apprenants" as any)
        .select("id, apprenant_id, user_id, exercice_id, exercice_type, reponses, completed, updated_at, submitted_at, tentative")
        .eq("exercice_type", "examen_blanc")
        .like("exercice_id", "%__%")
        .order("updated_at", { ascending: false })
        .range(from, from + 999);
      if (error) break;
      autosaves.push(...(data || []));
      if (!data || data.length < 1000) break;
    }

    const missingAutosaveApprenantIds = [...new Set(autosaves.map(row => row.apprenant_id))]
      .filter((id) => id && !apprenantMap[id]);
    for (let i = 0; i < missingAutosaveApprenantIds.length; i += 500) {
      const { data } = await supabase
        .from("apprenants")
        .select("id, nom, prenom, type_apprenant, date_debut_cours_en_ligne, date_fin_cours_en_ligne")
        .in("id", missingAutosaveApprenantIds.slice(i, i + 500));
      (data || []).forEach((a: any) => {
        const t = String(a.type_apprenant || "").toLowerCase();
        const mode: "presentiel" | "elearning" = t.endsWith("-e") || t.includes("-e-") ? "elearning" : "presentiel";
        apprenantMap[a.id] = { nom: a.nom, prenom: a.prenom, mode, formationActive: isFormationActiveToday(a) };
      });
    }

    for (const row of autosaves) {
      const parsedExercice = parseExamAnswerExerciceId(row.exercice_id);
      const quizId = parsedExercice.quizId;
      const matiereId = parsedExercice.matiereId;
      if (!quizId || !matiereId) continue;
      const matiere = findMatiereWithFallback(examenMap, tousLesExamens, quizId, matiereId);
      if (!matiere) continue;
      const questions = getSourceQuestions(matiere, tousLesExamens);
      const reponses = row.reponses || {};
      const app = apprenantMap[row.apprenant_id] || { nom: "Inconnu", prenom: "", mode: "presentiel" as const, formationActive: false };
      const examen = examenMap[quizId];
      const rowTentative = parsedExercice.tentative ?? getStoredTentative(row.tentative);
      const passage = findPassageForAutosave(row.apprenant_id, quizId, matiereId, rowTentative, row.submitted_at || row.updated_at);
      const fallbackIdentityKey = `${row.apprenant_id}__examen_blanc__${quizId}__${matiereId}`;
      const autosavePassageKey = passage?.passageKey
        ?? (parsedExercice.tentative != null
          ? `${fallbackIdentityKey}__T${parsedExercice.tentative}`
          : buildFallbackPassageKey(fallbackIdentityKey, row.submitted_at || row.updated_at, row.id));
      const autosaveTentative = passage?.tentative ?? (parsedExercice.tentative ?? 0);
      const autosaveTentativeLabel = passage?.tentativeLabel
        ?? (parsedExercice.tentative != null ? `tentative ${parsedExercice.tentative}` : `Passage du ${formatPassageDateTimeFR(row.submitted_at || row.updated_at)}`);
      const autosaveTentativeSortValue = passage?.tentativeSortValue ?? (parsedExercice.tentative ?? Number.MAX_SAFE_INTEGER);
      const passageSnapshotQrcIds = getSnapshotQrcQuestionIds(passage?.questions);

      for (const q of questions) {
        if (!q || String(q.type).toUpperCase() !== "QRC") continue;
        if (passageSnapshotQrcIds && !passageSnapshotQrcIds.has(Number(q.id))) continue;
        const reponseEleveStr = safeStr(reponses?.[q.id] ?? reponses?.[String(q.id)] ?? "");
        if (!reponseEleveStr.trim()) continue;
        const qrcKey = attemptKey(row.apprenant_id, quizId, matiereId, autosavePassageKey, q.id);
        if (seenQrcKeys.has(qrcKey)) continue;
        if (passage && findValidationForGroup(passage, matiereId, q.id)) continue;
        // Cette réponse exacte a déjà été validée ou déjà listée pour CE
        // passage : elle ne revient pas dans la file. Une autre tentative
        // conserve sa propre entrée.
        const autosaveContentKey = answerIdentity(row.apprenant_id, quizId, matiereId, autosavePassageKey, q.id, reponseEleveStr);
        if (validatedByAnswer.has(autosaveContentKey)) continue;
        if (itemIndexByContent.has(autosaveContentKey)) continue;
        itemIndexByContent.set(autosaveContentKey, qrcItems.length);
        seenQrcKeys.add(qrcKey);

        const pts = getPointsParQuestion(matiereId, "QRC", matiere);
        const recomputed = recomputeQrcAutoScore(q, reponseEleveStr, pts);
        qrcItems.push({
          resultId: `autosave:${row.id}:${quizId}:${matiereId}:${autosavePassageKey}`,
          source: "autosave",
          autosaveId: row.id,
          userId: row.user_id,
          apprenantId: row.apprenant_id,
          apprenantNom: app.nom,
          apprenantPrenom: app.prenom,
          quizTitre: examen?.titre || quizId,
          quizId,
          quizType: "examen_blanc",
          passageKey: autosavePassageKey,
          tentativeLabel: autosaveTentativeLabel,
          tentativeSortValue: autosaveTentativeSortValue,
          dbTentative: passage?.dbTentative ?? rowTentative ?? undefined,
          tentative: autosaveTentative,
          matiereId,
          matiereNom: matiere.nom,
          questionId: q.id,
          enonce: safeStr(q.enonce),
          reponseEleve: reponseEleveStr,
          reponseCorrecte: safeStr(q.reponseQRC || (q.reponses_possibles || []).join(" / ")),
          pointsMax: pts,
          pointsObtenus: null,
          corrigeManuel: false,
          completedAt: row.updated_at,
          autoScore: recomputed.autoScore,
          autoExplication: `Réponse auto-sauvegardée : ${recomputed.explication}`,
          noteSur20: null,
          scoreMatiereObtenu: 0,
          scoreMatiereMax: matiere.noteSur || 20,
          commentaire: "",
          correctedAt: null,
          apprenantTypeMode: app.mode,
          questionSupprimee: false,
        });
      }
    }

    setItems(qrcItems);

    // ────────────────────────────────────────────────────────────────────
    // CONTRÔLE EB N°2 (lecture seule) : tous les passages EB N°2 dont la note
    // définitive n'est pas publiable à cause des QRC, avec la MÊME règle que
    // le portail apprenant (isExamAttemptPublicationPending). Le rapprochement
    // avec la file de correction se fait sur le passage réel :
    // apprenant + examen exact + tentative persistante + matière + question.
    // Aucune donnée n'est modifiée ici.
    // ────────────────────────────────────────────────────────────────────
    const attemptKeysInQueue = new Set(
      qrcItems
        .filter((i) => !i.corrigeManuel && safeStr(i.reponseEleve).trim() !== "")
        .map((i) => buildAttemptKey(i.apprenantId, i.quizId, i.dbTentative, i.passageKey)),
    );
    const eb2Attempts = new Map<string, AttemptGroup[]>();
    for (const g of groups) {
      if (g.quizType !== "examen_blanc" || !EB2_QUIZ_IDS.has(g.quizId)) continue;
      const key = buildAttemptKey(g.apprenantId, g.quizId, g.dbTentative, g.passageKey);
      const list = eb2Attempts.get(key) || [];
      list.push(g);
      eb2Attempts.set(key, list);
    }
    const eb2Pending: Eb2PendingAttempt[] = [];
    eb2Attempts.forEach((gs, key) => {
      const examen = examenMap[gs[0].quizId];
      const rowsLike = gs.map((g) => ({
        matiereId: g.matiereId,
        matiere_id: g.matiereId,
        matiere_nom: g.matiereNom,
        details: {
          ...(g.questions ? { questions: g.questions } : {}),
          reponses: g.reponses,
          correctionsIA: g.corrections,
        },
      }));
      if (!isExamAttemptPublicationPending(rowsLike, examen)) return;
      const matieres = gs
        .filter((g) => {
          const matiere = findMatiereWithFallback(examenMap, tousLesExamens, g.quizId, g.matiereId);
          if (!matiere) return false;
          return isMatiereQrcPendingForAttempt(matiere, {
            ...(g.questions ? { questions: g.questions } : {}),
            reponses: g.reponses,
            correctionsIA: g.corrections,
          });
        })
        .map((g) => g.matiereNom || g.matiereId);
      const app = apprenantMap[gs[0].apprenantId] || { nom: "Inconnu", prenom: "", mode: "presentiel" as const, formationActive: false };
      const latest = gs.reduce((acc, g) => ((new Date(g.completedAt).getTime() || 0) > (new Date(acc.completedAt).getTime() || 0) ? g : acc), gs[0]);
      eb2Pending.push({
        attemptKey: key,
        apprenantId: gs[0].apprenantId,
        apprenant: `${app.nom} ${app.prenom}`.trim(),
        filiere: EB2_FILIERE_LABEL[gs[0].quizId] || gs[0].quizId,
        quizId: gs[0].quizId,
        quizTitre: latest.quizTitre || gs[0].quizId,
        tentativeLabel: latest.tentativeLabel,
        completedAt: latest.completedAt,
        matieres: Array.from(new Set(matieres)),
        hasQueueMatch: attemptKeysInQueue.has(key),
        formationActive: app.formationActive,
      });
    });
    eb2Pending.sort((a, b) =>
      ((new Date(b.completedAt).getTime() || 0) - (new Date(a.completedAt).getTime() || 0))
      || a.apprenant.localeCompare(b.apprenant, "fr", { sensitivity: "base" }),
    );
    setEb2PendingAttempts(eb2Pending);


    // ---- Contrôle automatique (lecture seule, aucune donnée modifiée) ----
    try {
      let missing = 0;
      const missingApprenants = new Set<string>();
      for (const row of autosaves) {
        const parsedExercice = parseExamAnswerExerciceId(row.exercice_id);
        const quizId = parsedExercice.quizId;
        const matiereId = parsedExercice.matiereId;
        if (!quizId || !matiereId) continue;
        const matiere = findMatiereWithFallback(examenMap, tousLesExamens, quizId, matiereId);
        if (!matiere) continue;
        const rowTentative = parsedExercice.tentative ?? getStoredTentative(row.tentative);
        const passage = findPassageForAutosave(row.apprenant_id, quizId, matiereId, rowTentative, row.submitted_at || row.updated_at);
        const fallbackIdentityKey = `${row.apprenant_id}__examen_blanc__${quizId}__${matiereId}`;
        const autosavePassageKey = passage?.passageKey
          ?? (parsedExercice.tentative != null
            ? `${fallbackIdentityKey}__T${parsedExercice.tentative}`
            : buildFallbackPassageKey(fallbackIdentityKey, row.submitted_at || row.updated_at, row.id));
        const passageSnapshotQrcIds = getSnapshotQrcQuestionIds(passage?.questions);
        for (const q of getSourceQuestions(matiere, tousLesExamens)) {
          if (!q || String(q.type).toUpperCase() !== "QRC") continue;
          if (passageSnapshotQrcIds && !passageSnapshotQrcIds.has(Number(q.id))) continue;
          const rep = safeStr((row.reponses || {})?.[q.id] ?? (row.reponses || {})?.[String(q.id)] ?? "");
          if (!rep.trim()) continue;
          if (seenQrcKeys.has(attemptKey(row.apprenant_id, quizId, matiereId, autosavePassageKey, q.id))) continue;
          if (passage && findValidationForGroup(passage, matiereId, q.id)) continue;
          missing++;
          missingApprenants.add(row.apprenant_id);
        }
      }
      setIntegrityAlert(missing > 0 ? { count: missing, apprenants: missingApprenants.size } : null);
      console.info("[Correction QRC] file construite :", {
        qrc: qrcItems.length,
        doublonsTechniquesFusionnes: doublonsTechniques,
        validationsRecuperees,
        casAmbigusLaissesIntacts: validationsAmbigues,
      });
    } catch (e) {
      console.error("Contrôle intégrité QRC:", e);
    }

    if (!opts?.silent) setLoading(false);
  }, [examenMap]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Remontée immédiate : dès qu'un résultat ou une réponse d'examen blanc est
  // écrit en base (n'importe quel apprenant, filière, matière, tentative),
  // la file de correction se recharge silencieusement.
  useEffect(() => {
    if (Object.keys(examenMap).length === 0) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { fetchData({ silent: true }); }, 1500);
    };
    const channel = supabase
      .channel("correction-qrc-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "apprenant_quiz_results" }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "reponses_apprenants" }, schedule)
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [fetchData, examenMap]);

  const handleSaveCorrection = async (item: QrcItem, newPoints: number) => {
    const uniqueKey = `${item.resultId}-${item.questionId}`;
    // Historique de navigation : la QRC corrigée reste accessible avec « Précédent »
    // pendant toute la session de correction (aucune donnée modifiée par cet ajout).
    keptKeysRef.current.add(qrcNavKey(item));
    setKeptVersion((v) => v + 1);
    setSavingId(uniqueKey);


    const clamped = clampToHalfStep(newPoints, item.pointsMax);

    if (item.source === "autosave") {
      const examen = examenMap[item.quizId];
      const matiere = findMatiereWithFallback(examenMap, tousLesExamens, item.quizId, item.matiereId);
      const { data: autosaveRow, error: autosaveErr } = await supabase
        .from("reponses_apprenants" as any)
        .select("reponses, user_id, updated_at")
        .eq("id", item.autosaveId)
        .single();

      if (autosaveErr || !autosaveRow || !matiere) {
        toast.error("Erreur lors de la récupération de la réponse sauvegardée");
        setSavingId(null);
        return;
      }

      const questions = buildQuestionListFromMatiere(matiere, (autosaveRow as any).reponses || {});
      const newCorrection = {
        estCorrect: clamped >= item.pointsMax,
        pointsObtenus: clamped,
        nombrefautes: 0,
        explication: `Correction manuelle par l'administrateur : ${clamped}/${item.pointsMax} pts`,
        commentaire: editingComments[uniqueKey] ?? item.commentaire ?? "",
        correctedAt: new Date().toISOString(),
        manuel: true,
        validatedByAdmin: true,
      };

      const { data: existing } = await supabase
        .from("apprenant_quiz_results")
        .select("id, details")
        .eq("apprenant_id", item.apprenantId)
        .eq("quiz_id", item.quizId)
        .eq("quiz_type", item.quizType)
        .eq("matiere_id", item.matiereId)
        .eq("tentative", item.dbTentative ?? 1)
        .maybeSingle();

      // FIX: merge correctement — les corrections existantes en base d'abord,
      // puis la NOUVELLE correction admin écrase pour cette question précise.
      // (L'ancien Object.assign était bugué : la cible étant aussi source, la nouvelle valeur était écrasée par l'ancienne.)
      const correctionsIA: Record<string, any> = {
        ...(((existing as any)?.details?.correctionsIA) || {}),
        [item.questionId]: newCorrection,
      };

      // Préserve les réponses existantes (si une tentative était déjà enregistrée)
      // et complète avec celles de l'autosave si elles manquent.
      const existingReponses = ((existing as any)?.details?.reponses) || {};
      const autosaveReponses = (autosaveRow as any).reponses || {};
      const mergedReponses = { ...autosaveReponses, ...existingReponses };

      let newScore = 0;
      for (const q of questions) {
        const pts = getPointsParQuestion(item.matiereId, q.type || "QCM", matiere);
        if (q.type === "QCM" && q.reponseCorrecte) {
          const correctes = Array.isArray(q.reponseCorrecte) ? [...q.reponseCorrecte].sort() : [q.reponseCorrecte];
          const donnees = Array.isArray(mergedReponses?.[q.questionId]) ? [...mergedReponses[q.questionId]].sort() : (mergedReponses?.[q.questionId] ? [mergedReponses[q.questionId]] : []);
          if (JSON.stringify(correctes) === JSON.stringify(donnees)) newScore += pts;
        } else if (q.type === "QRC") {
          const corr = correctionsIA[q.questionId];
          if (corr && typeof corr === "object") newScore += clampToHalfStep(corr.pointsObtenus || 0, pts);
        }
      }

      const scoreMax = matiere.noteSur || 20;
      const noteSur20 = scoreMax > 0 ? Number(((Math.min(Math.max(newScore, 0), scoreMax) / scoreMax) * 20).toFixed(1)) : 0;
      const payload = {
        apprenant_id: item.apprenantId,
        user_id: item.userId || (autosaveRow as any).user_id,
        quiz_id: item.quizId,
        quiz_type: item.quizType,
        quiz_titre: examen?.titre || item.quizTitre,
        matiere_id: item.matiereId,
        matiere_nom: item.matiereNom,
        tentative: item.dbTentative ?? 1,
        score_obtenu: Math.min(Math.max(newScore, 0), scoreMax),
        score_max: scoreMax,
        note_sur_20: noteSur20,
        // Même fonction de calcul que le résultat définitif (barème + seuil
        // éliminatoire de la matière), jamais un simple « ≥ 10 ».
        reussi:
          computeReussiForResult(
            {
              score_obtenu: Math.min(Math.max(newScore, 0), scoreMax),
              score_max: scoreMax,
              matiere_nom: item.matiereNom,
              details: { ...((existing as any)?.details || {}), questions, correctionsIA },
            },
            matiere,
          ) ?? false,
        completed_at: (existing as any)?.details
          ? ((existing as any).completed_at || (autosaveRow as any).updated_at || new Date().toISOString())
          : ((autosaveRow as any).updated_at || new Date().toISOString()),
        details: {
          ...((existing as any)?.details || {}),
          questions,
          reponses: mergedReponses,
          correctionsIA,
        },
      };

      let savedResultId = (existing as any)?.id || null;
      let saveErr: any = null;

      if (savedResultId) {
        const { error } = await supabase
          .from("apprenant_quiz_results")
          .update(payload as any)
          .eq("id", savedResultId);
        saveErr = error;
      } else {
        const { data: inserted, error } = await supabase
          .from("apprenant_quiz_results")
          .insert(payload as any)
          .select("id")
          .single();
        savedResultId = (inserted as any)?.id || null;
        saveErr = error;
      }

      if (saveErr?.code === "23505") {
        const { data: latest } = await supabase
          .from("apprenant_quiz_results")
          .select("id")
          .eq("apprenant_id", item.apprenantId)
          .eq("quiz_id", item.quizId)
          .eq("quiz_type", item.quizType)
          .eq("matiere_id", item.matiereId)
          .eq("tentative", item.dbTentative ?? 1)
          .maybeSingle();
        if ((latest as any)?.id) {
          savedResultId = (latest as any).id;
          const { error } = await supabase
            .from("apprenant_quiz_results")
            .update(payload as any)
            .eq("id", savedResultId);
          saveErr = error;
        }
      }

      if (saveErr) {
        console.error("Erreur sauvegarde correction QRC:", saveErr);
        toast.error("Erreur lors de la sauvegarde");
      } else {
        toast.success(`QRC corrigée : ${clamped}/${item.pointsMax} pts`);
        setItems(prev => {
          const updated = prev.map(i => (i.resultId === item.resultId && i.questionId === item.questionId) || isSameQrcContent(i, item)
            ? { ...i, resultId: savedResultId || i.resultId, source: "result" as const, pointsObtenus: clamped, corrigeManuel: true, commentaire: editingComments[uniqueKey] ?? item.commentaire ?? "", correctedAt: new Date().toISOString(), noteSur20, scoreMatiereObtenu: payload.score_obtenu }
            : i);


          setTimeout(() => {
            setCurrentIndex(prevIndex => {
              const newSorted = computeSortedFiltered(updated);
              if (newSorted.length === 0) return 0;
              const nextPending = newSorted.findIndex((i, idx) => idx >= prevIndex && !i.corrigeManuel);
              if (nextPending !== -1) return nextPending;
              return Math.min(prevIndex + 1, newSorted.length - 1);
            });
          }, 0);


          return updated;
        });
      }

      setSavingId(null);
      setEditingId(null);
      return;
    }

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
      validatedByAdmin: true,
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
        // Le statut secondaire « réussi » est recalculé avec la même fonction
        // que le résultat définitif. Tant qu'une QRC reste à corriger, il reste
        // à false : aucun statut définitif n'est publié (l'affichage montre
        // « En attente de correction »).
        reussi:
          computeReussiForResult(
            {
              score_obtenu: protectedScore,
              score_max: scoreMax,
              matiere_nom: item.matiereNom,
              details: { ...details, correctionsIA },
            },
            matiere,
          ) ?? false,
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
          // Écriture technique jumelle du même passage (même réponse exacte) :
          // elle suit immédiatement la validation et ne réapparaît pas.
          if (isSameQrcContent(i, item)) {
            return { ...i, pointsObtenus: clamped, corrigeManuel: true, commentaire: commentaire || "", correctedAt: new Date().toISOString() };
          }
          return i;
        });

        setTimeout(() => {
          setCurrentIndex(prev => {
            const newSorted = computeSortedFiltered(updated);
            if (newSorted.length === 0) return 0;
            const nextPending = newSorted.findIndex((i, idx) => idx >= prev && !i.corrigeManuel);
            if (nextPending !== -1) return nextPending;
            return Math.min(prev + 1, newSorted.length - 1);
          });
        }, 0);


        return updated;
      });
    }

    setSavingId(null);
    setEditingId(null);
  };

  const scopedItems = items.filter((i) => isInTentativeScope(i, tentativeFilter));
  const pendingItems = scopedItems.filter(i => !i.corrigeManuel);
  const pendingCount = pendingItems.length;
  const doneCount = scopedItems.filter(i => i.corrigeManuel).length;

  // Matières dont au moins une QRC reste à corriger : aucune note définitive
  // ne doit y être affichée (Admin comme apprenant).
  const pendingMatiereKeys = new Set(
    pendingItems.map(i => `${i.apprenantId}__${i.quizId}__${i.matiereId || ""}__${i.passageKey}`),
  );


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

  const isAnsweredToday = (item: QrcItem) =>
    isToday(item.completedAt) && safeStr(item.reponseEleve).trim() !== "";

  const isBlockingResult = (item: QrcItem) => isBlockingQrcItem(item);

  // « QRC répondues aujourd'hui » : uniquement les QRC uniques (déjà dédoublonnées
  // par apprenant + examen + matière + question) dont la réponse élève est
  // réellement non vide. Une réponse vide ou composée d'espaces n'est jamais
  // comptée comme répondue.
  const todayItems = scopedItems.filter(i => isAnsweredToday(i));
  const todayCount = todayItems.length;
  const todayPendingItems = todayItems.filter(i => !i.corrigeManuel);
  const todayPendingCount = todayPendingItems.length;

  // SOURCE DE VÉRITÉ DU BLOCAGE : calculée sur TOUTES les QRC chargées,
  // jamais sur le périmètre visuel « tentative 1 ». Dédoublonnage par identité
  // passage + matière + question pour ne jamais compter deux fois la même QRC.
  const blockingItems = (() => {
    const seen = new Set<string>();
    const out: QrcItem[] = [];
    for (const i of items) {
      if (!isBlockingQrcItem(i)) continue;
      const key = getQrcQueueIdentity(i);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(i);
    }
    return out;
  })();
  const blockingCount = blockingItems.length;
  const olderBlockingCount = blockingItems.filter(i => !isAnsweredToday(i)).length;


  // Contrôle mathématique demandé : les deux vues sont des filtres de la même
  // source et utilisent la même identité passage + matière + question.
  const blockingIdentitySet = new Set(blockingItems.map(getQrcQueueIdentity));
  const todayBlockingMissingItems = todayPendingItems.filter(
    (item) => isBlockingResult(item) && !blockingIdentitySet.has(getQrcQueueIdentity(item)),
  );

  // Récapitulatif : apprenant → examen → tentative → matière → QRC restantes.
  const blockingGroups = (() => {
    const map = new Map<string, {
      key: string; firstItem: QrcItem; apprenant: string; quizTitre: string; tentativeLabel: string; matiereNom: string; count: number; datePassage: string; minQuestionId: number;
    }>();
    for (const i of sortBlockingQrcItems(blockingItems)) {
      const key = getBlockingGroupKey(i);
      const prev = map.get(key);
      if (prev) {
        prev.count += 1;
        prev.minQuestionId = Math.min(prev.minQuestionId, i.questionId);
        // Date de référence du groupe = la QRC bloquante la PLUS RÉCENTE du passage.
        if ((new Date(i.completedAt).getTime() || 0) > (new Date(prev.datePassage).getTime() || 0)) prev.datePassage = i.completedAt;
      } else {
        map.set(key, {
          key,
          firstItem: i,
          apprenant: `${i.apprenantNom} ${i.apprenantPrenom}`.trim(),
          quizTitre: i.quizTitre,
          tentativeLabel: i.tentativeLabel,
          matiereNom: i.matiereNom || i.matiereId,
          count: 1,
          datePassage: i.completedAt,
          minQuestionId: i.questionId,
        });
      }
    }
    // Affichage uniquement : PLUS RÉCENT → PLUS ANCIEN, par date/heure réelle
    // du passage contenant les QRC bloquantes (jamais par nom, examen ou tentative).
    // À date/heure identique, ordre stable alphanumérique conservé.
    return Array.from(map.values()).sort((a, b) =>
      ((new Date(b.datePassage).getTime() || 0) - (new Date(a.datePassage).getTime() || 0))
      || compareBlockingQrcItems(a.firstItem, b.firstItem)
      || a.minQuestionId - b.minQuestionId
    );
  })();

  const activeBlockingGroup = activeBlockingGroupKey
    ? blockingGroups.find((g) => g.key === activeBlockingGroupKey)
    : null;

  // ── EB N°2 : apprenants ACTUELLEMENT EN FORMATION bloqués AUJOURD'HUI ──
  // 5 conditions cumulatives (affichage/filtrage uniquement, aucune écriture) :
  //  1) formation active aujourd'hui (début ≤ aujourd'hui ≤ fin)
  //  2) examen = Examen Blanc N°2 (VTC / TAXI / VA / TA)
  //  3) QRC répondue AUJOURD'HUI
  //  4) QRC réellement non validée manuellement
  //  5) résultat réellement bloqué par cette QRC (règle du portail apprenant)
  // Les QRC plus anciennes restent intactes et accessibles dans les autres filtres.
  const eb2Rows = eb2PendingAttempts
    .filter((a) => a.formationActive)
    .map((a) => {
      const own = blockingItems.filter(
        (i) =>
          buildAttemptKey(i.apprenantId, i.quizId, i.dbTentative, i.passageKey) === a.attemptKey
          && isAnsweredToday(i),
      );
      const groupKey = own.length ? getBlockingGroupKey(sortBlockingQrcItems(own)[0]) : null;
      const matieresRestantes = Array.from(new Set(own.map((i) => i.matiereNom || i.matiereId)));
      const derniereQrc = own.reduce<string>(
        (acc, i) => ((new Date(i.completedAt).getTime() || 0) > (new Date(acc).getTime() || 0) ? i.completedAt : acc),
        own[0]?.completedAt || a.completedAt,
      );
      return { ...a, count: own.length, groupKey, matieresRestantes, derniereQrc };
    })
    // Anomalie du jour uniquement : passage du jour bloqué mais absent de la file.
    .filter((r) => r.count > 0 || (!r.hasQueueMatch && isToday(r.completedAt)))
    .sort((a, b) => (new Date(b.derniereQrc).getTime() || 0) - (new Date(a.derniereQrc).getTime() || 0));
  const eb2Anomalies = eb2Rows.filter((r) => r.count === 0);

  const goToBlockingGroup = (key: string) => {
    setFilter("blocking");
    setActiveBlockingGroupKey(key);
    setSearchQuery("");
    setExamenFilter("all");
    setCurrentIndex(0);
    window.requestAnimationFrame(() => {
      document.getElementById("qrc-correction-current")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  // keptVersion force le recalcul quand une QRC corrigée est conservée dans l'historique.
  void keptVersion;
  const filtered = (() => {
    const list = items.filter(matchesFilter);
    if (filter !== "blocking") return list;
    // Vue bloquante : une QRC ne peut jamais apparaître deux fois.
    const seen = new Set<string>();
    return list.filter((i) => {
      const key = getQrcQueueIdentity(i);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  })();



  // Build available exam list grouped by category, each with its numbers
  type ExamOption = { value: string; label: string; total: number };
  const examOptionsByCat: Record<string, { label: string; numbers: Map<string, number> }> = {};
  const examOptionSource = filter === "pending" ? pendingItems
    : filter === "today" ? todayItems
    : filter === "today-pending" ? todayPendingItems
    : filter === "blocking" ? blockingItems
    : filter === "done" ? scopedItems.filter(i => i.corrigeManuel)
    : scopedItems;

  for (const i of examOptionSource) {
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

  // apprenant → examen → tentative → matière → n° de question croissant
  const sortedFiltered = filter === "blocking" ? sortBlockingQrcItems(filtered) : sortQrcItems(filtered, sortOrder);

  // Reset index when filter/search/sort changes (nouvelle session de navigation :
  // l'historique des QRC corrigées conservées est remis à zéro, sans rien modifier en base).
  useEffect(() => {
    setCurrentIndex(0);
    keptKeysRef.current = new Set();
    setKeptVersion((v) => v + 1);
  }, [filter, searchQuery, sortOrder, examenFilter, tentativeFilter, activeBlockingGroupKey]);


  useEffect(() => {
    if (activeBlockingGroupKey && !blockingGroups.some((g) => g.key === activeBlockingGroupKey)) {
      setActiveBlockingGroupKey(null);
    }
  }, [activeBlockingGroupKey, blockingGroups]);

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

      {loadError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4">
          <p className="font-semibold text-destructive">Les QRC n'ont pas pu être chargées</p>
          <p className="text-sm mt-1">{loadError}</p>
          <p className="text-sm mt-1">Les compteurs affichés ci-dessus ne sont pas fiables tant que cette erreur persiste.</p>
        </div>
      )}

      {integrityAlert && (
        <div className="rounded-lg border border-amber-400 bg-amber-50 p-4">
          <p className="font-semibold text-amber-900">
            Contrôle automatique : {integrityAlert.count} QRC répondue(s) ({integrityAlert.apprenants} apprenant(s)) ne remontent pas dans la file de correction
          </p>
          <p className="text-sm text-amber-900 mt-1">
            Alerte informative uniquement : aucune réponse, note ou correction n'a été modifiée.
          </p>
        </div>
      )}

      {/* Nouveau moteur QRC : examens explicitement branchés uniquement. */}
      <QrcInstancesPanel />

      {todayBlockingMissingItems.length > 0 ? (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
          <p className="font-bold text-destructive">
            🚨 ANOMALIE : {todayBlockingMissingItems.length} QRC d'aujourd'hui bloquent une note mais sont absentes de la file QRC bloquantes.
          </p>
          <ul className="mt-2 space-y-1 text-xs text-destructive">
            {todayBlockingMissingItems.map((item) => (
              <li key={getQrcQueueIdentity(item)}>
                {item.apprenantNom} {item.apprenantPrenom} | {item.quizTitre} | {item.tentativeLabel} | {item.matiereNom || item.matiereId} | Q{item.questionId} | {formatPassageDateTimeFR(item.completedAt)}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-destructive">Signalement en lecture seule : aucune correction, réponse, note ou tentative n'a été modifiée.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-green-500/40 bg-green-50/60 p-3 text-sm font-medium text-green-900">
          Contrôle QRC du jour : {todayPendingCount} réellement bloquante(s) − {todayPendingCount} présente(s) dans « QRC bloquant » = 0.
        </div>
      )}

      {/* Contrôle EB N°2 : aucun apprenant bloqué ne peut rester invisible ici. */}
      {eb2Rows.length > 0 && (
        <Card className="border-green-500/50 bg-green-50/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-green-900">
              🟢 APPRENANTS ACTUELLEMENT EN FORMATION — EB N°2 BLOQUÉS AUJOURD'HUI ({eb2Rows.length})
            </CardTitle>
            <p className="text-xs text-green-900/80">
              Formation active à la date du jour + QRC d'Examen Blanc N°2 répondues aujourd'hui et non validées.
              Les QRC plus anciennes restent intactes et consultables dans les autres filtres.
            </p>
          </CardHeader>
          <CardContent className="space-y-2 text-sm max-h-96 overflow-auto">
            {eb2Anomalies.length > 0 && (
              <div className="rounded-md border border-destructive bg-destructive/10 p-3">
                <p className="font-bold text-destructive">
                  🚨 ANOMALIE : {eb2Anomalies.length} passage(s) sans note définitive ne remontent pas dans la correction QRC
                </p>
                <ul className="mt-1 text-destructive text-xs list-disc pl-5">
                  {eb2Anomalies.map((r) => (
                    <li key={r.attemptKey}>
                      {r.apprenant} — {r.filiere} — {r.tentativeLabel} — {formatDateOnlyFR(r.completedAt)} — matières : {r.matieres.join(", ") || "—"}
                    </li>
                  ))}
                </ul>
                <p className="mt-1 text-xs text-destructive">
                  Signalement uniquement : aucune correction, note ou réponse n'a été modifiée.
                </p>
              </div>
            )}
            {eb2Rows.map((r) => (
              <div
                key={r.attemptKey}
                className="flex flex-wrap items-center gap-3 border-b last:border-0 py-3 px-2"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-foreground">{r.apprenant}</span>
                    <Badge variant="outline">{r.filiere}</Badge>
                    <span className="text-muted-foreground">→ Examen Blanc N°2</span>
                    <span className="text-muted-foreground">→ {r.tentativeLabel}</span>
                  </div>
                  <div className="text-muted-foreground">
                    Matières : {(r.matieresRestantes.length ? r.matieresRestantes : r.matieres).join(", ") || "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {r.count > 0
                      ? `${r.count} QRC répondue(s) aujourd'hui non validée(s) manuellement : la note définitive reste bloquée.`
                      : "Passage du jour bloqué côté apprenant mais aucune QRC correspondante dans la file — anomalie signalée ci-dessus."}
                  </div>
                </div>
                <Badge variant="destructive" className="text-sm font-black uppercase px-3 py-1.5">
                  {r.count} QRC restantes aujourd'hui
                </Badge>
                <span className="text-destructive font-black text-base leading-none tabular-nums">
                  {formatPassageDateTimeFR(r.derniereQrc)}
                </span>
                {r.groupKey && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="font-black uppercase"
                    onClick={() => goToBlockingGroup(r.groupKey!)}
                  >
                    🔴 CORRIGER LES QRC
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

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
        <Select value={filter} onValueChange={(v) => {
          setFilter(v as any);
          if (v !== "blocking") setActiveBlockingGroupKey(null);
        }}>
          <SelectTrigger className="w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="blocking">🚨 QRC bloquant des résultats ({blockingCount})</SelectItem>
            <SelectItem value="today">🔥 QRC répondues aujourd'hui ({todayCount})</SelectItem>
            <SelectItem value="today-pending">⏳ À corriger aujourd'hui ({todayPendingCount})</SelectItem>
            <SelectItem value="pending">⏳ En attente uniquement</SelectItem>
            <SelectItem value="done">✅ Déjà corrigées</SelectItem>
            <SelectItem value="all">Toutes</SelectItem>
          </SelectContent>
        </Select>
        <Select value={tentativeFilter} onValueChange={(v) => setTentativeFilter(v as "1" | "all")}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Tentative 1 uniquement</SelectItem>
            <SelectItem value="all">Toutes les tentatives</SelectItem>
          </SelectContent>
        </Select>
        {filter === "blocking" ? (
          <Badge variant="outline" className="gap-1.5 py-2 px-3">
            <ArrowUpDown className="w-4 h-4" />
            Tri A→Z / N° / tentative / matière / QRC
          </Badge>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setSortOrder(prev => prev === "desc" ? "asc" : "desc")}
          >
            <ArrowUpDown className="w-4 h-4" />
            {sortOrder === "desc" ? "Plus récent" : "Plus ancien"}
          </Button>
        )}
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

      {/* Alerte prioritaire : QRC (même anciennes) qui bloquent encore un résultat. */}
      {blockingCount > 0 && filter !== "blocking" && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="py-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-destructive">
                🚨 {blockingCount} QRC bloquent encore la publication de résultats
              </p>
              <p className="text-sm text-muted-foreground">
                Dont {olderBlockingCount} QRC plus anciennes qu'aujourd'hui — tant qu'elles ne sont pas validées,
                l'apprenant reste « En attente de correction des QRC ».
              </p>
            </div>
            <Button variant="destructive" size="sm" onClick={() => { setFilter("blocking"); setCurrentIndex(0); }}>
              Voir les QRC bloquantes
            </Button>
          </CardContent>
        </Card>
      )}

      {filter === "blocking" && blockingGroups.length > 0 && (
        <Card className="border-destructive/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Résultats actuellement bloqués</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm max-h-80 overflow-auto">
            {activeBlockingGroup && (
              <div className="flex items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3">
                <p className="font-semibold text-destructive">
                  Correction directe : {activeBlockingGroup.apprenant} — {activeBlockingGroup.quizTitre} — {activeBlockingGroup.tentativeLabel} — {activeBlockingGroup.matiereNom}
                </p>
                <Button variant="outline" size="sm" onClick={() => setActiveBlockingGroupKey(null)}>
                  Voir toutes les lignes
                </Button>
              </div>
            )}
            {blockingGroups.map((g) => (
              <div
                key={g.key}
                role="button"
                tabIndex={0}
                onClick={() => goToBlockingGroup(g.key)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") goToBlockingGroup(g.key);
                }}
                className={`flex flex-wrap items-center gap-3 border-b last:border-0 py-3 px-2 cursor-pointer transition-colors hover:bg-destructive/5 ${activeBlockingGroupKey === g.key ? "bg-destructive/10" : ""}`}
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-foreground">{g.apprenant}</span>
                    <span className="text-muted-foreground">→ {g.quizTitre}</span>
                    <span className="text-muted-foreground">→ {g.tentativeLabel}</span>
                  </div>
                  <div className="text-muted-foreground">→ {g.matiereNom}</div>
                </div>
                <Badge variant="destructive" className="text-sm font-black uppercase px-3 py-1.5">
                  {g.count} QRC restantes
                </Badge>
                <span className="text-destructive font-black text-2xl md:text-3xl leading-none tabular-nums">
                  {formatDateOnlyFR(g.datePassage)}
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  className="font-black uppercase tracking-normal"
                  onClick={(e) => {
                    e.stopPropagation();
                    goToBlockingGroup(g.key);
                  }}
                >
                  🔴 CORRIGER LES QRC
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

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
                {filter === "today-pending"
                  ? blockingCount > 0
                    ? `Toutes les QRC d'aujourd'hui sont corrigées, mais ${blockingCount} QRC plus anciennes bloquent encore des résultats.`
                    : "Aucune QRC en attente aujourd'hui — toutes corrigées ✅"
                  : filter === "blocking"
                  ? "Aucune QRC ne bloque de résultat ✅"
                  : filter === "pending"
                  ? "Aucune QRC en attente de correction"
                  : "Aucune QRC trouvée"}
              </p>
              {filter === "today-pending" && blockingCount > 0 ? (
                <Button
                  variant="destructive"
                  size="sm"
                  className="mt-3"
                  onClick={() => { setFilter("blocking"); setCurrentIndex(0); }}
                >
                  Voir les QRC bloquantes
                </Button>
              ) : (
                <p className="text-sm mt-1">Les réponses QRC apparaîtront ici au fur et à mesure des examens</p>
              )}
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
              onClick={() => {
                setEditingId(null);
                setCurrentIndex(prev => Math.max(0, prev - 1));
              }}
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
              onClick={() => {
                setEditingId(null);
                setCurrentIndex(prev => Math.min(sortedFiltered.length - 1, prev + 1));
              }}
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
            // La note d'une matière n'est publiée qu'une fois TOUTES ses QRC corrigées.
            const matierePending = pendingMatiereKeys.has(
              `${item.apprenantId}__${item.quizId}__${item.matiereId || ""}__${item.passageKey}`,
            );


            return (
              <Card id="qrc-correction-current" key={uniqueKey} className={`transition-colors ${item.corrigeManuel ? "border-green-200 bg-green-50/30" : "border-amber-200 bg-amber-50/20"}`}>
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
                        <Badge variant="outline" className="text-xs">{item.tentativeLabel}</Badge>
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
                      {matierePending ? (
                        <Badge variant="outline" className="font-bold text-sm text-amber-700 border-amber-300" title="La note ne sera publiée qu'une fois toutes les QRC de cette matière corrigées">
                          ⏳ En attente de correction
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="font-bold text-sm">
                          📊 {item.noteSur20 != null ? `${item.noteSur20}/20` : `${item.scoreMatiereObtenu}/${item.scoreMatiereMax}`}
                        </Badge>
                      )}

                    </div>
                  </div>

                  {/* Question */}
                  <div className="space-y-2">
                    {item.questionSupprimee && !item.corrigeManuel && !item.enonce && (
                      <div className="flex items-center gap-2 p-2 rounded-md bg-red-50 border border-red-200 flex-wrap">
                        <span className="text-sm font-bold text-red-700">⚠️ Q{item.questionId} — QUESTION SUPPRIMÉE</span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-red-300 text-red-700 hover:bg-red-100"
                          disabled={savingId === `${item.resultId}-${item.questionId}`}
                          onClick={() => handleSaveCorrection(item, item.pointsMax)}
                        >
                          Ne pas comptabiliser
                        </Button>
                      </div>
                    )}
                    {item.enonce && (
                      <p className="text-sm font-bold text-foreground">
                        <span className="text-primary mr-1">Q{item.questionId} —</span>
                        {item.enonce}
                        {item.questionSupprimee && (
                          <span className="ml-2 text-xs font-normal text-amber-700" title="Cette question a été modifiée ou supprimée dans l'examen après la passation de l'élève. La correction reste valide.">
                            (modifiée depuis)
                          </span>
                        )}
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
                      {isSaving ? "..." : item.corrigeManuel ? "✓ Confirmer la nouvelle note" : "✓ Valider"}
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
                      <Badge className="bg-green-100 text-green-700 border-green-300 text-xs ml-1">✅ Déjà corrigée</Badge>
                    )}
                  </div>

                  {item.corrigeManuel && (
                    <p className="text-xs text-green-700">
                      ✅ Déjà corrigée — {(item.pointsObtenus ?? item.autoScore)}/{item.pointsMax} pts enregistrés. Cette QRC reste corrigée ;
                      modifiez les points ou le commentaire puis confirmez la nouvelle note pour la changer.
                    </p>
                  )}


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
