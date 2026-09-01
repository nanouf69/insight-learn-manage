import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { flushSync } from "react-dom";
import { Button } from "@/components/ui/button";
import { RealtimeStatusIndicator } from "./RealtimeStatusIndicator";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, ArrowUp, ArrowDown, Pencil, Trash2, Plus, ToggleLeft, ToggleRight, Save, X, CheckCircle2, Eye, Settings, Download, FileText, Upload, Loader2, ZoomIn, ZoomOut, RotateCcw, Maximize, Users, ChevronDown, ChevronUp, Lock, Printer, RefreshCw, AlertTriangle, Calculator } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { diffModuleData, publishModuleChangeNotification } from "@/lib/moduleChangeNotifications";
import { logModuleAudit, logAdminEditsDiff } from "@/lib/moduleAuditLog";
import { RichText } from "@/lib/richText";
import { saveModuleCompletion, isCompletionDone } from "@/lib/moduleCompletion";
import {
  buildExerciceId,
  buildInlineQuizId,
  fetchQuizAttempts,
  isAttemptSubmitted,
  submitQuizAttempt,
} from "@/lib/quizAttempts";

import { ColoredTextField } from "./ColoredTextField";

import SlideViewer from "./slides/SlideViewer";
import PdfSlideViewer from "./PdfSlideViewer";
import ImageCarouselViewer from "./ImageCarouselViewer";
import { FICHE_IMAGE_SLIDES } from "./fiches-revision-slides";
import PptxViewerComparison from "./PptxViewerComparison";
import { T3P_PARTIE1_SLIDES, type Slide } from "./slides/t3p-partie1-data";
import { T3P_PARTIE2_SLIDES } from "./slides/t3p-partie2-data";
import { GESTION_PARTIE1_SLIDES } from "./slides/gestion-partie1-data";
import { GESTION_PARTIE2_SLIDES } from "./slides/gestion-partie2-data";
import { GESTION_PARTIE3_SLIDES } from "./slides/gestion-partie3-data";
import { VILLE_CHATEAUX_SLIDES } from "./slides/ville-chateaux-data";
import { VILLE_GARES_SLIDES } from "./slides/ville-gares-data";
import { VILLE_HOPITAUX_SLIDES } from "./slides/ville-hopitaux-data";
import { VILLE_MAIRIES_SLIDES } from "./slides/ville-mairies-data";
import { VILLE_EGLISES_SLIDES } from "./slides/ville-eglises-data";
import { VILLE_FRESQUES_SLIDES } from "./slides/ville-fresques-data";
import { VILLE_CONSULATS_SLIDES } from "./slides/ville-consulats-data";
import { VILLE_COMMISSARIATS_SLIDES } from "./slides/ville-commissariats-data";
import FileLastModified from "./FileLastModified";
import FilePreviewDialog from "./FilePreviewDialog";


import { VILLE_HOTELS_SLIDES } from "./slides/ville-hotels-data";
import { VILLE_DIVERS_SLIDES } from "./slides/ville-divers-data";
import { VILLE_MUSEES_SLIDES } from "./slides/ville-musees-data";
import { VILLE_PARCS_SLIDES } from "./slides/ville-parcs-data";
import { VILLE_PERSONNALITES_SLIDES } from "./slides/ville-personnalites-data";
import { VILLE_SALLES_SPECTACLES_SLIDES } from "./slides/ville-salles-spectacles-data";
import { VILLE_VINS_SLIDES } from "./slides/ville-vins-data";
import { VILLE_ARRONDISSEMENTS_SLIDES } from "./slides/ville-arrondissements-data";
import { VILLE_STATIONS_TAXI_SLIDES } from "./slides/ville-stations-taxi-data";
import { QuestionImageUpload } from "./QuestionImageUpload";
import { ImageLightbox } from "./ImageLightbox";
import { ExamQuestionImage } from "./ExamQuestionImage";
import { mergeSourceExercices, moveQuestionToPosition } from "./examens-blancs-utils";

// Images des monuments et lieux de Lyon
import imgCathedraleStJean from "@/assets/pratique/cathedrale-st-jean.jpg";
import imgBasiliqueFourviere from "@/assets/pratique/basilique-fourviere.jpg";
import imgEgliseStGeorges from "@/assets/pratique/eglise-st-georges.jpg";
import imgPlaceBellecour from "@/assets/pratique/place-bellecour.jpg";
import imgPlaceTerreaux from "@/assets/pratique/place-terreaux.jpg";
import imgOperaLyon from "@/assets/pratique/opera-lyon.jpg";
import imgHotelDeVille from "@/assets/pratique/hotel-de-ville.jpg";
import imgParcTeteDor from "@/assets/pratique/parc-tete-dor.jpg";
import imgHotelDieu from "@/assets/pratique/hotel-dieu.jpg";
import imgMuseeConfluences from "@/assets/pratique/musee-confluences.jpg";
import imgTourOxygene from "@/assets/pratique/tour-oxygene.jpg";
import imgTourIncity from "@/assets/pratique/tour-incity.jpg";
import imgFresqueLyonnais from "@/assets/pratique/fresque-lyonnais.jpg";
import imgMurCanuts from "@/assets/pratique/mur-canuts.jpg";
import imgPaulBocuse from "@/assets/pratique/paul-bocuse.jpg";
import imgChateauMotte from "@/assets/pratique/chateau-motte.jpg";
import imgBrasserieGeorges from "@/assets/pratique/brasserie-georges.jpg";
import imgParcBlandan from "@/assets/pratique/parc-blandan.jpg";
import imgQuenelle from "@/assets/pratique/quenelle.jpg";
import imgBugnes from "@/assets/pratique/bugnes.jpg";
import { VTC_COURS_DATA, VTC_SECTIONS } from "./vtc-cours-data";
import { FORMULES_DATA } from "./formules-data";
import { TAXI_COURS_DATA, TAXI_SECTIONS } from "./taxi-cours-data";
import { TA_COURS_DATA, TA_SECTIONS } from "./ta-cours-data";
import { VA_COURS_DATA, VA_SECTIONS } from "./va-cours-data";
import { CONTROLE_CONNAISSANCES_TAXI_DATA } from "./controle-connaissances-taxi-data";
import { CONNAISSANCES_VILLE_TAXI_DATA } from "./connaissances-ville-taxi-data";
import { BILAN_EXERCICES_VTC, buildBilanExercicesVtcFromCours } from "./bilan-exercices-vtc-data";
import { BILAN_EXERCICES_TAXI } from "./bilan-exercices-taxi-data";
import { BILAN_EXERCICES_TA } from "./bilan-exercices-ta-data";
import { BILAN_EXERCICES_VA } from "./bilan-exercices-va-data";
import { BILAN_EXERCICES_FC_VTC } from "./bilan-exercices-fc-vtc-data";
import { BILAN_FIN_FORMATION_FC_VTC_EXERCICE } from "./bilan-fin-formation-fc-vtc-exercice";
import { BILAN_EXERCICES_FC_TAXI } from "./bilan-exercices-fc-taxi-data";
import { QCM_100_FC_TAXI } from "./qcm-100-fc-taxi-data";
import { COURS_FC_TAXI, QCM_FINAL_FC_TAXI } from "./cours-fc-taxi-data";
import { COURS_MOBILITE_TAXI, QCM_FINAL_MOBILITE_TAXI } from "./cours-mobilite-taxi-data";
import { BILAN_EXAMEN_VTC } from "./bilan-examen-vtc-data";
import { BILAN_EXAMEN_TAXI } from "./bilan-examen-taxi-data";
import { BILAN_EXAMEN_VA } from "./bilan-examen-va-data";
import { BILAN_EXAMEN_TA } from "./bilan-examen-ta-data";
import { EQUIPEMENTS_TAXI_DATA } from "./equipements-taxi-data";
import CompetencesChecklist from "./CompetencesChecklist";
import EmargementsSignesViewer from "./EmargementsSignesViewer";
import RemboursementFCViewer from "./RemboursementFCViewer";
import FinanceurFCForm from "./FinanceurFCForm";
import DemandeCarteVTCViewer from "./DemandeCarteVTCViewer";
import DemandeCarteTAXIViewer from "./DemandeCarteTAXIViewer";

import AnalyseBesoinForm from "./AnalyseBesoinForm";
import ProjetProfessionnelForm from "./ProjetProfessionnelForm";
import EvaluationAcquisForm from "./EvaluationAcquisForm";
import SatisfactionForm from "./SatisfactionForm";
import CGVAcceptanceForm from "./CGVAcceptanceForm";
import CGVReglementForm from "./CGVReglementForm";
import { getCompetencesForFormation } from "./competences-checklist-data";
import Calculatrice from "./Calculatrice";
import GrillesPratiqueApprenant from "./GrillesPratiqueApprenant";
import {
  applyOverridesToModuleExercices,
  detectAndSaveOverrides,
  getOverridesFingerprint,
  loadCrossModuleOverridesFromDb,
  applyCrossModuleOverrides,
  syncSharedExercisesToSiblingModules,
  type ModuleInitialData,
} from "./shared-exercise-overrides";
import { resolveOverrideConflict } from "@/components/fournisseurs/quiz-editor-utils";
import {
  GENERATED_BILAN_MODULE_IDS as GENERATED_BILAN_IDS_UTIL,
  hasDuplicateGeneratedBilanQuestions as hasDuplicateBilanUtil,
  shouldForceBilanReset,
} from "./bilan-reset-utils";

interface InlineQuizQuestion {
  id: number;
  enonce: string;
  choix: { lettre: string; texte: string; correct?: boolean; explication?: string }[];
  explication?: string;
}

interface ContentItem {
  id: number;
  titre: string;
  sousTitre?: string;
  description?: string;
  image?: string;
  images?: string[];
  actif: boolean;
  fichiers?: { nom: string; url: string }[];
  slidesKey?: string;
  quiz?: InlineQuizQuestion[];
  checklistType?: "competences" | "analyse-besoin" | "evaluation-acquis" | "satisfaction" | "projet-professionnel" | "cgv" | "cgv-reglement" | "emargements-fc" | "financeur-fc" | "demande-carte-vtc" | "demande-carte-taxi" | "remboursement-fc-vtc" | "remboursement-fc-taxi";
  formationType?: string;
}

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "");
const STORAGE_URL = SUPABASE_URL ? `${SUPABASE_URL}/storage/v1` : "";

function normalizeSignedStorageUrl(signedUrl: string): string {
  if (/^https?:\/\//i.test(signedUrl)) return signedUrl;
  if (signedUrl.startsWith("/storage/v1/")) return SUPABASE_URL ? `${SUPABASE_URL}${signedUrl}` : signedUrl;
  if (signedUrl.startsWith("/object/")) return STORAGE_URL ? `${STORAGE_URL}${signedUrl}` : signedUrl;
  if (signedUrl.startsWith("object/")) return STORAGE_URL ? `${STORAGE_URL}/${signedUrl}` : signedUrl;
  return signedUrl;
}

function resolveAppFileUrl(fileUrl: string): string {
  if (!fileUrl) return "";
  if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
  if (fileUrl.startsWith("/storage/v1/")) return SUPABASE_URL ? `${SUPABASE_URL}${fileUrl}` : fileUrl;

  const normalizedPath = fileUrl.startsWith("/") ? fileUrl : `/${fileUrl}`;
  if (typeof window === "undefined") return normalizedPath;

  const fallbackPublicOrigin = "https://insight-learn-manage.lovable.app";
  const isPreviewHost = window.location.hostname.endsWith("lovableproject.com");
  const baseOrigin = isPreviewHost ? fallbackPublicOrigin : window.location.origin;
  return `${baseOrigin}${normalizedPath}`;
}

function extractCourseStorageObject(input: string): { bucket: string; path: string } | null {
  if (/^(question-images|cours-images|cours-pdfs|vtc)\//i.test(input)) {
    return { bucket: "cours-fichiers", path: input };
  }

  const storageMatch = input.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/([^?#]+)/);
  if (storageMatch) {
    return {
      bucket: decodeURIComponent(storageMatch[1]),
      path: decodeURIComponent(storageMatch[2]),
    };
  }

  const objectMatch = input.match(/^\/?object\/(?:public|sign)\/([^/]+)\/([^?#]+)/);
  if (objectMatch) {
    return {
      bucket: decodeURIComponent(objectMatch[1]),
      path: decodeURIComponent(objectMatch[2]),
    };
  }

  return null;
}

async function toDisplayableCourseUrl(fileUrl: string): Promise<string> {
  const resolvedUrl = resolveAppFileUrl(fileUrl);
  try {
    const storageObject = extractCourseStorageObject(fileUrl) ?? extractCourseStorageObject(resolvedUrl);
    if (!storageObject) return resolvedUrl;

    const { data, error } = await supabase.storage
      .from(storageObject.bucket)
      .createSignedUrl(storageObject.path, 60 * 60);

    if (error || !data?.signedUrl) return resolvedUrl;
    return normalizeSignedStorageUrl(data.signedUrl);
  } catch {
    return resolvedUrl;
  }
}

function useDisplayableCourseUrl(fileUrl?: string) {
  const [displayUrl, setDisplayUrl] = useState<string | null>(fileUrl ? resolveAppFileUrl(fileUrl) : null);

  useEffect(() => {
    let cancelled = false;
    if (!fileUrl) {
      setDisplayUrl(null);
      return;
    }

    setDisplayUrl(resolveAppFileUrl(fileUrl));
    toDisplayableCourseUrl(fileUrl).then((url) => {
      if (!cancelled) setDisplayUrl(url);
    });

    return () => {
      cancelled = true;
    };
  }, [fileUrl]);

  return displayUrl;
}

function CourseImageLightbox({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const displayUrl = useDisplayableCourseUrl(src);

  if (!displayUrl) {
    return <div className={className ?? "h-48 rounded border bg-muted animate-pulse"} />;
  }

  return <ImageLightbox src={displayUrl} alt={alt} className={className} />;
}

function CourseFileViewer({
  fichier,
  pdfFallbackUrl,
  hasInteractiveSlides,
  secureMode,
  onLastPageReached,
}: {
  fichier: { nom: string; url: string };
  pdfFallbackUrl?: string;
  hasInteractiveSlides: boolean;
  secureMode: boolean;
  onLastPageReached: () => void;
}) {
  const displayUrl = useDisplayableCourseUrl(fichier.url);
  const pdfDisplayUrl = useDisplayableCourseUrl(pdfFallbackUrl);
  const lowerName = fichier.nom.toLowerCase();
  const lowerUrl = fichier.url.toLowerCase();
  const isPptx = lowerName.endsWith(".pptx") || lowerName.endsWith(".ppt") || lowerUrl.endsWith(".pptx") || lowerUrl.endsWith(".ppt");
  const isPdf = lowerName.endsWith(".pdf") || lowerUrl.endsWith(".pdf");
  const isDocx = lowerName.endsWith(".docx") || lowerName.endsWith(".doc") || lowerUrl.endsWith(".docx") || lowerUrl.endsWith(".doc");
  const isImage = /\.(png|jpe?g|webp|gif|bmp|svg)(?:[?#].*)?$/i.test(fichier.nom) || /\.(png|jpe?g|webp|gif|bmp|svg)(?:[?#].*)?$/i.test(fichier.url);
  const shouldShowViewers = Boolean((isPptx || isDocx) && !hasInteractiveSlides);

  if (!displayUrl) {
    return <div className="h-20 rounded-lg border bg-muted animate-pulse" />;
  }

  const googleViewerUrl = shouldShowViewers
    ? `https://docs.google.com/viewer?url=${encodeURIComponent(displayUrl)}&embedded=true`
    : null;
  const msViewerUrl = shouldShowViewers
    ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(displayUrl)}`
    : null;

  return (
    <div className="space-y-3">
      {!secureMode && !isDocx && !isPdf && !isImage && (
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href={displayUrl}
            download
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
          >
            <FileText className="w-4 h-4" />
            {fichier.nom}
            <Download className="w-3 h-3" />
          </a>
        </div>
      )}

      {isImage && (
        <div className="mt-2">
          <CourseImageLightbox
            src={displayUrl}
            alt={fichier.nom}
            className="w-full max-h-[70vh] object-contain rounded-lg border bg-muted"
          />
        </div>
      )}

      {shouldShowViewers && googleViewerUrl && msViewerUrl && (
        <PptxViewerComparison
          googleViewerUrl={googleViewerUrl}
          msViewerUrl={msViewerUrl}
          absoluteFileUrl={displayUrl}
          nom={fichier.nom}
          pdfUrl={pdfDisplayUrl ?? undefined}
          onLastPageReached={onLastPageReached}
          studentOnly={secureMode}
        />
      )}

      {isPdf && !shouldShowViewers && (
        <div className="mt-2">
          <PdfSlideViewer
            url={displayUrl}
            nom={fichier.nom}
            onLastPageReached={onLastPageReached}
          />
        </div>
      )}
    </div>
  );
}

function CourseFileLink({ fichier, compact = false }: { fichier: { nom: string; url: string }; compact?: boolean }) {
  const displayUrl = useDisplayableCourseUrl(fichier.url);
  const isExternal = /^https?:\/\//i.test(fichier.url);

  return (
    <a
      href={displayUrl ?? resolveAppFileUrl(fichier.url)}
      target="_blank"
      rel="noopener noreferrer"
      className={compact
        ? "inline-flex items-center gap-1 text-xs text-primary hover:underline"
        : "inline-flex items-center gap-2 px-4 py-3 rounded-lg border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary font-medium transition-all"}
    >
      {isExternal ? <Maximize className={compact ? "w-3 h-3" : "w-4 h-4"} /> : compact ? <FileText className="w-3 h-3" /> : <Download className="w-4 h-4" />}
      {fichier.nom}
    </a>
  );
}

interface ExerciceChoix {
  lettre: string;
  texte: string;
  correct?: boolean;
  explication?: string;
}

type ImageSize = "sm" | "md" | "lg" | "xl" | "2xl";

interface ExerciceQuestion {
  id: number;
  enonce: string;
  image?: string;
  imageSize?: ImageSize;
  _editedAt?: string;
  choix: ExerciceChoix[];
}

interface ExerciceItem {
  id: number;
  titre: string;
  sousTitre?: string;
  actif: boolean;
  questions?: ExerciceQuestion[];
  fichiers?: { nom: string; url: string }[];
  deletedQuestionIds?: number[];
}

interface ModuleData {
  id: number;
  nom: string;
  description: string;
  cours: ContentItem[];
  exercices: ExerciceItem[];
}

interface TrainerOverrideInfo {
  quiz_id: string;
  fournisseur_id?: string | null;
  section_id: number;
  question_id: number;
  enonce: string;
  choix: ExerciceChoix[];
  updated_at: string;
}

const BILAN_VTC_SOURCE_MODULE_ID = 2;
const BILAN_VTC_MODULE_ID = 4;
const BILAN_TAXI_MODULE_ID = 9;
const FC_BILAN_PARENT_BY_MODULE_ID: Record<number, number> = { 81: BILAN_VTC_MODULE_ID, 82: BILAN_TAXI_MODULE_ID };
const FC_BILAN_EXCLUDED_EXERCISE_IDS = new Set([101, 103, 105]);
const BILAN_SECURITY_SIBLING_BY_MODULE_ID: Record<number, number> = {
  [BILAN_VTC_MODULE_ID]: BILAN_TAXI_MODULE_ID,
  [BILAN_TAXI_MODULE_ID]: BILAN_VTC_MODULE_ID,
};
const BILAN_EXAMEN_VTC_MODULE_ID = 5;
const BILAN_EXAMEN_TAXI_MODULE_ID = 11;
const SECURITE_ROUTIERE_BILAN_ID = 102;
// Ces modules sont édités depuis l'admin et leur source de vérité est
// exclusivement module_editor_state. L'ancienne table quiz_questions_overrides
// peut contenir des copies fournisseur obsolètes : elle ne doit jamais repasser
// au-dessus des corrections admin sur les Bilans.
// Modules Bilan / exercices dont l'unique source de vérité est module_editor_state.
// Toute question qui vit dans ces modules ne peut plus être réécrasée par les
// données source hardcodées ni par un ancien override fournisseur, MÊME quand
// les marqueurs `manually_edited` / `_editedAt` sont absents ou mal posés
// (cas des lignes historiques). Le trigger SQL `ensure_module_editor_manual_flags`
// re-tampe automatiquement ces marqueurs sur chaque sauvegarde pour ces IDs.
const ADMIN_AUTHORITATIVE_QUIZ_MODULE_IDS = new Set([4, 5, 9, 11, 27, 28, 29, 30, 81, 82, 87, 90]);
const BILAN_EXAMEN_GESTION_EXERCISE_IDS: Record<number, number> = {
  [BILAN_EXAMEN_VTC_MODULE_ID]: 501,
  [BILAN_EXAMEN_TAXI_MODULE_ID]: 601,
};
// Anciens IDs concernés par la correction d'images Bilan Examen.
// Important : la base reste la source prioritaire des corrections admin.
const BILAN_EXAMEN_FORCE_FROM_SOURCE_IDS: Record<number, number[]> = {
  [BILAN_EXAMEN_VTC_MODULE_ID]: [500, 501, 502, 503, 504, 505, 506],
  [BILAN_EXAMEN_TAXI_MODULE_ID]: [600, 601, 602, 603, 604, 605, 606],
};

const TRAINER_QUIZ_IDS_BY_MODULE_ID: Record<number, string[]> = {
  7: ["connaissance-ville"],
  9: ["bilan-exercices-taxi"],
  10: ["reglementation-nationale", "reglementation-locale"],
  11: ["bilan-examen-taxi"],
  12: ["cas-pratique-taxi"],
  13: ["controle-connaissances-taxi"],
  24: ["reglementation-nationale", "reglementation-locale"],
  27: ["bilan-exercices-ta"],
  28: ["bilan-examen-ta"],
  40: ["reglementation-nationale", "reglementation-locale"],
  42: ["reglementation-locale"],
  64: ["equipements-taxi"],
};

const isAdminAuthoritativeQuizModule = (moduleId: number | string) =>
  ADMIN_AUTHORITATIVE_QUIZ_MODULE_IDS.has(Number(moduleId));

const getTrainerQuizIdsForModule = (moduleId: number | string) =>
  isAdminAuthoritativeQuizModule(moduleId) ? [] : (TRAINER_QUIZ_IDS_BY_MODULE_ID[Number(moduleId)] || []);

const buildTrainerOverrideMap = (rows: any[] | null | undefined) => {
  const overrideMap = new Map<string, TrainerOverrideInfo>();
  for (const ov of rows ?? []) {
    const key = `${ov.section_id}-${ov.question_id}`;
    if (!overrideMap.has(key)) {
      overrideMap.set(key, {
        quiz_id: ov.quiz_id,
        fournisseur_id: ov.fournisseur_id ?? null,
        section_id: ov.section_id,
        question_id: ov.question_id,
        enonce: ov.enonce,
        choix: ov.choix as ExerciceChoix[],
        updated_at: ov.updated_at,
      });
    }
  }
  return overrideMap;
};

const normalizeManualQuestionFlags = (data: ModuleData): ModuleData => ({
  ...data,
  exercices: (data.exercices ?? []).map((exercise) => ({
    ...exercise,
    questions: Array.isArray(exercise.questions)
      ? exercise.questions.map((question) => {
          const q = question as ExerciceQuestion & { manually_edited?: boolean };
          const hasManualMarker = Boolean(q.manually_edited) || Boolean(q._editedAt);
          if (!hasManualMarker) return question;
          return {
            ...q,
            manually_edited: true,
            _editedAt: q._editedAt ?? new Date().toISOString(),
          } as ExerciceQuestion;
        })
      : exercise.questions,
  })),
});

type ModuleEditorSavePayload = {
  module_id: number;
  module_data: any;
  deleted_cours: any;
  deleted_exercices: any;
  source_fingerprint: string;
};

const cloneJson = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const getQuestionEditTs = (question: unknown): number => {
  if (!question || typeof question !== "object") return 0;
  const editedAt = (question as any)._editedAt;
  const ts = editedAt ? new Date(String(editedAt)).getTime() : 0;
  if (Number.isFinite(ts) && ts > 0) return ts;
  return (question as any).manually_edited ? 1 : 0;
};

const sameJson = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

const mergeLatestDbModuleWithLocalIntent = (
  latestData: ModuleData | null | undefined,
  localIntent: ModuleData,
  localDeletedExercices: unknown,
): ModuleData => {
  const latest = latestData?.exercices ? cloneJson(latestData) : cloneJson(localIntent);
  const intent = cloneJson(localIntent);
  const deletedExerciseIds = new Set(
    (Array.isArray(localDeletedExercices) ? localDeletedExercices : [])
      .map((exercise: any) => Number(exercise?.id))
      .filter((id: number) => Number.isFinite(id)),
  );

  const latestExercisesById = new Map((latest.exercices ?? []).map((exercise) => [Number(exercise.id), exercise]));
  const intentExercisesById = new Map((intent.exercices ?? []).map((exercise) => [Number(exercise.id), exercise]));
  const nextExercises: ExerciceItem[] = [];

  for (const latestExercise of latest.exercices ?? []) {
    const exerciseId = Number(latestExercise.id);
    if (deletedExerciseIds.has(exerciseId)) continue;

    const intentExercise = intentExercisesById.get(exerciseId);
    if (!intentExercise) {
      nextExercises.push(latestExercise);
      continue;
    }

    const deletedQuestionIds = new Set<number>([
      ...((Array.isArray((latestExercise as any).deletedQuestionIds) ? (latestExercise as any).deletedQuestionIds : []) as any[]),
      ...((Array.isArray((intentExercise as any).deletedQuestionIds) ? (intentExercise as any).deletedQuestionIds : []) as any[]),
    ].map((id) => Number(id)).filter((id) => Number.isFinite(id)));

    const latestQuestionsById = new Map((latestExercise.questions ?? []).map((question) => [Number(question.id), question]));
    const intentQuestionsById = new Map((intentExercise.questions ?? []).map((question) => [Number(question.id), question]));
    const mergedQuestionsById = new Map<number, ExerciceQuestion>();

    for (const latestQuestion of latestExercise.questions ?? []) {
      const questionId = Number(latestQuestion.id);
      if (deletedQuestionIds.has(questionId)) continue;
      const intentQuestion = intentQuestionsById.get(questionId);
      if (!intentQuestion) {
        mergedQuestionsById.set(questionId, latestQuestion);
        continue;
      }

      const intentTs = getQuestionEditTs(intentQuestion);
      const latestTs = getQuestionEditTs(latestQuestion);
      const intentChanged = !sameJson(intentQuestion, latestQuestion);
      mergedQuestionsById.set(
        questionId,
        intentChanged && intentTs >= latestTs ? intentQuestion : latestQuestion,
      );
    }

    for (const intentQuestion of intentExercise.questions ?? []) {
      const questionId = Number(intentQuestion.id);
      if (deletedQuestionIds.has(questionId) || mergedQuestionsById.has(questionId)) continue;
      mergedQuestionsById.set(questionId, intentQuestion);
    }

    const orderedQuestionIds = [
      ...(intentExercise.questions ?? []).map((question) => Number(question.id)),
      ...(latestExercise.questions ?? []).map((question) => Number(question.id)),
    ];
    const seenQuestionIds = new Set<number>();
    const mergedQuestions = orderedQuestionIds
      .filter((questionId) => {
        if (seenQuestionIds.has(questionId)) return false;
        seenQuestionIds.add(questionId);
        return mergedQuestionsById.has(questionId);
      })
      .map((questionId) => mergedQuestionsById.get(questionId))
      .filter((question): question is ExerciceQuestion => Boolean(question));

    nextExercises.push({
      ...latestExercise,
      ...intentExercise,
      questions: mergedQuestions,
      ...(deletedQuestionIds.size > 0 ? { deletedQuestionIds: Array.from(deletedQuestionIds) } : {}),
    });
  }

  for (const intentExercise of intent.exercices ?? []) {
    const exerciseId = Number(intentExercise.id);
    if (deletedExerciseIds.has(exerciseId) || latestExercisesById.has(exerciseId)) continue;
    nextExercises.push(intentExercise);
  }

  return {
    ...latest,
    nom: intent.nom ?? latest.nom,
    description: intent.description ?? latest.description,
    cours: intent.cours ?? latest.cours,
    exercices: nextExercises,
  };
};

// IMPORTANT: les Bilans affichés aux apprenants ne doivent plus être réhydratés
// depuis le module de cours source (module 2). Ce module peut contenir des
// questions intermédiaires/anciennes et a déjà provoqué des décalages de réponses
// après rafraîchissement. La source fiable est module_editor_state du Bilan parent.
const shouldSyncVtcBilanFromCours = (_moduleId: number | string) => false;

const getExerciseById = (data: ModuleData | null | undefined, exerciseId: number): ExerciceItem | null => {
  return data?.exercices?.find((exercise) => Number(exercise.id) === exerciseId) ?? null;
};

const usesDatabaseOnlyEditorState = (moduleId: number | string) => {
  const id = Number(moduleId);
  return ADMIN_AUTHORITATIVE_QUIZ_MODULE_IDS.has(id) || Boolean(FC_BILAN_PARENT_BY_MODULE_ID[id]);
};

const getManualQuestionTimestamp = (question: unknown): number => {
  if (!question || typeof question !== "object") return 0;
  const editedAt = (question as any)._editedAt;
  const ts = editedAt ? new Date(String(editedAt)).getTime() : 0;
  if (Number.isFinite(ts) && ts > 0) return ts;
  return (question as any).manually_edited ? 1 : 0;
};

const mergeManualExerciseEditsFromSource = (targetExercise: ExerciceItem, sourceExercise: ExerciceItem): ExerciceItem => {
  if (!Array.isArray(targetExercise.questions) || !Array.isArray(sourceExercise.questions)) return targetExercise;

  const sourceQuestionsById = new Map(sourceExercise.questions.map((question) => [Number(question.id), question]));
  let changed = false;

  const mergedQuestions = targetExercise.questions.map((targetQuestion) => {
    const sourceQuestion = sourceQuestionsById.get(Number(targetQuestion.id));
    if (!sourceQuestion) return targetQuestion;

    const sourceTs = getManualQuestionTimestamp(sourceQuestion);
    if (sourceTs <= 0) return targetQuestion;

    const targetTs = getManualQuestionTimestamp(targetQuestion);
    if (targetTs > sourceTs) return targetQuestion;

    changed = true;
    return {
      ...targetQuestion,
      enonce: sourceQuestion.enonce,
      choix: Array.isArray(sourceQuestion.choix) ? sourceQuestion.choix.map((choice) => ({ ...choice })) : targetQuestion.choix,
      image: (sourceQuestion as any).image,
      imageSize: (sourceQuestion as any).imageSize ?? (targetQuestion as any).imageSize,
      manually_edited: true,
      _editedAt: (sourceQuestion as any)._editedAt ?? (targetQuestion as any)._editedAt ?? new Date().toISOString(),
    } as ExerciceQuestion;
  });

  return changed ? { ...targetExercise, questions: mergedQuestions } : targetExercise;
};

const applyManualExerciseEditsFromSource = (
  targetData: ModuleData,
  sourceData: ModuleData | null | undefined,
): ModuleData => {
  if (!sourceData?.exercices?.length) return targetData;

  const sourceExerciseById = new Map(sourceData.exercices.map((exercise) => [Number(exercise.id), exercise]));
  let changed = false;

  const exercices = targetData.exercices.map((exercise) => {
    const sourceExercise = sourceExerciseById.get(Number(exercise.id));
    if (!sourceExercise) return exercise;
    const merged = mergeManualExerciseEditsFromSource(exercise, sourceExercise);
    if (merged !== exercise) changed = true;
    return merged;
  });

  return changed ? { ...targetData, exercices } : targetData;
};

const forceTaxiSecurityFromVtc = (taxiData: ModuleData, vtcSecurityExercise: ExerciceItem | null): ModuleData => {
  // Désactivé volontairement : VTC et TAXI ne doivent jamais se réécrire au
  // chargement. Seule une vraie action admin déclenche une propagation, sinon
  // un ancien état ouvert dans un onglet peut remettre les vieilles réponses.
  void vtcSecurityExercise;
  return taxiData;
};

async function loadSyncedVtcBilanFromCours(
  apprenantType?: string | null,
  studentOnly?: boolean,
): Promise<ModuleData | null> {
  try {
    const { data: sourceState } = await supabase
      .from("module_editor_state")
      .select("module_data, deleted_exercices")
      .eq("module_id", BILAN_VTC_SOURCE_MODULE_ID)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const sourceMd = sourceState?.module_data as unknown as ModuleData | undefined;
    if (!sourceMd?.exercices || !Array.isArray(sourceMd.exercices)) return null;

    const sourceInitial = JSON.parse(JSON.stringify(VTC_COURS_DATA)) as ModuleData;
    const deletedSourceIds = Array.isArray(sourceState?.deleted_exercices)
      ? (sourceState.deleted_exercices as any[]).map((e: any) => Number(e?.id)).filter((n) => !Number.isNaN(n))
      : [];
    const sourceExercices = mergeSourceExercices(sourceMd.exercices, sourceInitial.exercices, deletedSourceIds);
    const bilanInitial = getInitialModuleDataRaw({ id: BILAN_VTC_MODULE_ID, nom: "4.BILAN EXERCICES VTC" }, apprenantType, studentOnly);

    return getSyncedBilanVtcModuleData(bilanInitial, sourceExercices, true);
  } catch (e) {
    console.error("[Bilan VTC] Erreur chargement source module 2:", e);
    return null;
  }
}

const buildFcBilanModuleFromParent = (
  fcModuleId: number | string,
  parentModuleData: ModuleData | null | undefined,
  fcSourceData: ModuleData,
): ModuleData | null => {
  if (!FC_BILAN_PARENT_BY_MODULE_ID[Number(fcModuleId)]) return null;
  const parentExercices = Array.isArray(parentModuleData?.exercices) ? parentModuleData.exercices : [];
  if (parentExercices.length === 0 || fcSourceData.exercices.length === 0) return null;

  const allowedExerciseIds = new Set(fcSourceData.exercices.map((exercise) => Number(exercise.id)));
  const filteredParentExercices = parentExercices.filter((exercise) => {
    const exerciseId = Number(exercise?.id);
    return allowedExerciseIds.has(exerciseId) && !FC_BILAN_EXCLUDED_EXERCISE_IDS.has(exerciseId);
  });

  if (filteredParentExercices.length === 0) return null;

  return {
    ...fcSourceData,
    exercices: mergeSourceExercices(filteredParentExercices, fcSourceData.exercices),
  };
};

const buildParentBilanModuleFromFcChild = (
  parentModuleData: ModuleData,
  fcChildModuleData: ModuleData,
): ModuleData | null => {
  const parentExercices = Array.isArray(parentModuleData.exercices) ? parentModuleData.exercices : [];
  const fcExercices = Array.isArray(fcChildModuleData.exercices) ? fcChildModuleData.exercices : [];
  if (parentExercices.length === 0 || fcExercices.length === 0) return null;

  const fcByExerciseId = new Map<number, ExerciceItem>();
  for (const exercise of fcExercices) {
    const exerciseId = Number(exercise?.id);
    if (!Number.isFinite(exerciseId) || FC_BILAN_EXCLUDED_EXERCISE_IDS.has(exerciseId)) continue;
    fcByExerciseId.set(exerciseId, JSON.parse(JSON.stringify(exercise)) as ExerciceItem);
  }
  if (fcByExerciseId.size === 0) return null;

  let changed = false;
  const nextParentExercices = parentExercices.map((exercise) => {
    const replacement = fcByExerciseId.get(Number(exercise?.id));
    if (!replacement) return exercise;
    changed = true;
    return replacement;
  });

  if (!changed) return null;
  return { ...parentModuleData, exercices: nextParentExercices };
};

const buildSiblingBilanSecurityModule = (
  siblingModuleData: ModuleData,
  sourceModuleData: ModuleData,
): ModuleData | null => {
  const sourceSecurity = getExerciseById(sourceModuleData, SECURITE_ROUTIERE_BILAN_ID);
  if (!sourceSecurity?.questions?.length) return null;

  let changed = false;
  const securityClone = JSON.parse(JSON.stringify(sourceSecurity)) as ExerciceItem;
  const siblingExercices = Array.isArray(siblingModuleData.exercices) ? siblingModuleData.exercices : [];
  const nextExercices = siblingExercices.map((exercise) => {
    if (Number(exercise.id) !== SECURITE_ROUTIERE_BILAN_ID) return exercise;
    changed = true;
    return securityClone;
  });

  if (!changed) {
    nextExercices.push(securityClone);
  }

  return {
    ...siblingModuleData,
    exercices: nextExercices,
  };
};

const forceSourceExerciseTitles = (moduleId: number | string, loadedData: ModuleData, sourceData: ModuleData): ModuleData => {
  if (Number(moduleId) !== 9) return loadedData;

  const sourceById = new Map(sourceData.exercices.map((exercise) => [Number(exercise.id), exercise]));
  return {
    ...loadedData,
    exercices: loadedData.exercices.map((exercise) => {
      const sourceExercise = sourceById.get(Number(exercise.id));
      if (!sourceExercise) return exercise;
      return {
        ...exercise,
        titre: sourceExercise.titre,
        sousTitre: sourceExercise.sousTitre,
      };
    }),
  };
};

const isBilanExamGestionExercise = (moduleId: number | string, exerciseId: number | string) =>
  BILAN_EXAMEN_GESTION_EXERCISE_IDS[Number(moduleId)] === Number(exerciseId);

const forceBilanExamGestionFromSource = (moduleId: number | string, loadedData: ModuleData, sourceData: ModuleData): ModuleData => {
  const forcedIds = BILAN_EXAMEN_FORCE_FROM_SOURCE_IDS[Number(moduleId)];
  if (!forcedIds || forcedIds.length === 0) return loadedData;

  const overwrites: Array<{
    exerciceId: any;
    questionId?: any;
    field: string;
    summary: string;
    before?: unknown;
    after?: unknown;
  }> = [];

  const nextExercices = [...loadedData.exercices];
  for (const forcedId of forcedIds) {
    const sourceIndex = sourceData.exercices.findIndex((exercise) => Number(exercise.id) === forcedId);
    const sourceExercise = sourceData.exercices[sourceIndex];
    if (!sourceExercise) continue;

    const loadedIndex = nextExercices.findIndex((exercise) => Number(exercise.id) === forcedId);
    if (loadedIndex === -1) {
      const insertAt = Math.max(0, Math.min(sourceIndex, nextExercices.length));
      nextExercices.splice(insertAt, 0, JSON.parse(JSON.stringify(sourceExercise)));
      overwrites.push({
        exerciceId: forcedId,
        field: "exercice_inserted_from_source",
        summary: `Exercice ${forcedId} réinjecté depuis la source (absent en base)`,
        after: sourceExercise,
      });
      continue;
    }

    const loadedExercise = nextExercices[loadedIndex];
    const sourceQuestionsById = new Map(
      (sourceExercise.questions ?? []).map((question) => [Number(question.id), question]),
    );

    const mergedQuestions = (loadedExercise.questions ?? []).map((question) => {
      const sourceQuestion = sourceQuestionsById.get(Number(question.id));
      if (!sourceQuestion) return question;

      const patched: ExerciceQuestion = { ...question };
      // On complète seulement les anciennes lignes qui n'ont jamais eu d'image.
      // image:null = suppression volontaire admin, à ne jamais restaurer.
      if (!("image" in question) || (question as any).image === undefined) {
        if ((sourceQuestion as any).image) {
          patched.image = (sourceQuestion as any).image;
          overwrites.push({
            exerciceId: forcedId,
            questionId: (question as any).id,
            field: "image",
            summary: `Image restaurée depuis la source (aucune valeur admin en base)`,
            before: undefined,
            after: (sourceQuestion as any).image,
          });
        }
      }
      if (!("imageSize" in question) || (question as any).imageSize === undefined) {
        if ((sourceQuestion as any).imageSize) patched.imageSize = (sourceQuestion as any).imageSize;
      }
      return patched;
    });

    nextExercices[loadedIndex] = { ...loadedExercise, questions: mergedQuestions };
  }

  if (overwrites.length > 0) {
    // Fire-and-forget : audit log de la resynchronisation
    void Promise.all(
      overwrites.slice(0, 20).map((o) =>
        logModuleAudit({
          moduleId: Number(moduleId),
          action: "resync_overwrite",
          origin: "forceBilanExamGestionFromSource",
          exerciceId: o.exerciceId,
          questionId: o.questionId,
          field: o.field,
          summary: o.summary,
          before: o.before,
          after: o.after,
        }),
      ),
    );
  }

  return { ...loadedData, exercices: nextExercices };
};

const getSyncedBilanVtcModuleData = (
  initialData: ModuleData,
  sourceExercices: ExerciceItem[],
  includeGestion: boolean,
): ModuleData => {
  const groupedExercices = buildBilanExercicesVtcFromCours(sourceExercices);
  return {
    ...initialData,
    exercices: includeGestion
      ? groupedExercices
      : groupedExercices.filter((exercise) => Number(exercise.id) !== 101),
  };
};

interface ExerciseQuestionPrompt {
  question: string;
  passageTitle?: string;
  passageBody?: string;
}

const EXERCISE_PASSAGE_REGEX = /^(TEXTE\s+\d+\s*[—-][^\n]*)\n\n([\s\S]+?)\n\n([^]+)$/s;

const parseExerciseQuestionPrompt = (enonce: string): ExerciseQuestionPrompt => {
  const normalized = enonce?.trim() ?? "";
  const match = normalized.match(EXERCISE_PASSAGE_REGEX);

  if (!match) {
    return { question: normalized };
  }

  return {
    passageTitle: match[1].trim(),
    passageBody: match[2].trim(),
    question: match[3].trim(),
  };
};

const buildExerciseQuestionPrompts = <T extends { enonce: string }>(questions: T[]): ExerciseQuestionPrompt[] => {
  let currentPassage: Pick<ExerciseQuestionPrompt, "passageTitle" | "passageBody"> | null = null;

  return questions.map((question) => {
    const parsed = parseExerciseQuestionPrompt(question.enonce);

    if (parsed.passageTitle && parsed.passageBody) {
      currentPassage = {
        passageTitle: parsed.passageTitle,
        passageBody: parsed.passageBody,
      };
      return parsed;
    }

    return currentPassage ? { ...currentPassage, question: parsed.question } : parsed;
  });
};

const renderExerciseQuestionPrompt = (questionNumber: number, prompt: ExerciseQuestionPrompt) => (
  <div className="space-y-2">
    <p className="font-medium whitespace-pre-line">
      <span className="inline-flex items-center justify-center bg-primary/10 text-primary text-xs font-bold rounded px-1.5 py-0.5 mr-1.5">
        Q{questionNumber}
      </span>
      <RichText value={prompt.question} />
    </p>

    {prompt.passageTitle && prompt.passageBody ? (
      <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm leading-relaxed">
        <p className="mb-2 font-semibold text-foreground"><RichText value={prompt.passageTitle} /></p>
        <p className="whitespace-pre-line text-foreground"><RichText value={prompt.passageBody} /></p>
      </div>
    ) : null}
  </div>
);

interface ModuleDetailViewProps {
  module: { id: number; nom: string };
  onBack: () => void;
  studentOnly?: boolean;
  apprenantId?: string | null;
  onModuleCompleted?: (moduleId: number) => void;
  apprenantType?: string | null;
  isPresentiel?: boolean;
  hideFormulaires?: boolean;
  onTrackCours?: (moduleId: number, coursTitle: string) => void;
  onLearnerActivity?: () => void;
  apprenantInfo?: {
    nom?: string;
    prenom?: string;
    email?: string;
    telephone?: string;
    adresse?: string;
    code_postal?: string;
    ville?: string;
    date_naissance?: string;
    formation_choisie?: string | null;
  } | null;
}

const isFormationContinueVtcTaxi = (...values: Array<string | null | undefined>) =>
  values.some((value) => {
    const normalized = (value || "").toLowerCase();
    return normalized.includes("continue-vtc") || normalized.includes("continue-taxi") || normalized.includes("formation-continue-vtc") || normalized.includes("formation-continue-taxi");
  });

// ===== Données initiales du module INTRODUCTION FORMATION EN PRÉSENTIEL =====
const INTRODUCTION_PRESENTIEL_DATA: ModuleData = {
  id: 1,
  nom: "1.INTRODUCTION FORMATION EN PRÉSENTIEL",
  description: "Introduction pour les formations en présentiel : organisation de l'examen, programme, coefficients, CGV, règlement intérieur.",
  cours: [
    {
      id: 0,
      titre: "Test de compétences avant formation",
      description: "Avant le début de la formation, merci de bien vouloir répondre à ces questions en cochant Oui ou Non pour chaque compétence.",
      actif: true,
      checklistType: "competences",
    },
    {
      id: 100,
      titre: "Analyse du besoin – Fiche client",
      description: "Complétez cette fiche pour nous permettre de mieux cerner votre profil et vos besoins.",
      actif: true,
      checklistType: "analyse-besoin",
    },
    {
      id: 101,
      titre: "Questionnaire Projet Professionnel",
      description: "Évaluation de votre motivation et de votre projet professionnel (adapté TAXI ou VTC).",
      actif: true,
      checklistType: "projet-professionnel",
    },
    {
      id: 102,
      titre: "Conditions Generales de Vente et Reglement Interieur",
      description: "Veuillez lire et signer les CGV et le reglement interieur avant de continuer.",
      actif: true,
      checklistType: "cgv-reglement" as const,
    },
    {
      id: 1,
      titre: "Bienvenue sur la plateforme",
      description: `Cette plateforme est dédiée aux futurs chauffeurs VTC et TAXIS. Vous devez réussir deux épreuves pour obtenir votre carte de chauffeur VTC ou de chauffeur TAXI :
• L'épreuve d'admissibilité (théorie avec 7 matières) — minimum 10/20
• L'épreuve d'admission (pratique) — minimum 12/20
Le tout sans note éliminatoire.

Vous avez à disposition : des cours, des exercices, des examens blancs et des bilans. L'accès à cette plateforme est limité.`,
      actif: true,
    },
    {
      id: 2,
      titre: "Informations importantes",
      description: `⚠️ Délai : Vous devez réussir votre examen théorique sous 6 mois à compter de l'envoi de vos identifiants. Passé ce délai, l'entraînement pratique et le véhicule seront facturés.

💰 Frais d'examen en cas d'échec (à votre charge) :
• Examen théorique : environ 240€
• Examen pratique : environ 200€

📋 Les examens sont organisés par la Chambre des Métiers et de l'Artisanat. Vérifiez bien votre inscription.

📞 Contactez-nous le jour des résultats de l'examen théorique (et non le jour de réception de la convocation pratique). En nous contactant plus tard, nous ne pouvons garantir un entraînement pratique et un véhicule.`,
      actif: true,
    },
    {
      id: 3,
      titre: "Contenu de l'examen — Épreuves communes",
      description: `L'examen se compose d'épreuves théoriques d'admissibilité (QCM + QRC) et d'une épreuve pratique d'admission.

📝 ÉPREUVES COMMUNES TAXI & VTC :

A — Réglementation T3P et prévention des discriminations
   Durée : 45 min | Note sur 20 | Coeff. 3 | Éliminatoire : 6/20

B — Gestion et développement commercial
   Durée : 45 min | Note sur 20 | Coeff. 2 | Éliminatoire : 6/20

C — Sécurité routière
   Durée : 30 min | Note sur 20 | Coeff. 3 | Éliminatoire : 6/20

D — Français (expression et compréhension)
   Durée : 30 min | Note sur 20 | Coeff. 2 | Éliminatoire : 6/20
   ⚠️ -1 point toutes les 5 fautes d'orthographe sur les QRC

E — Anglais (expression et compréhension)
   Durée : 30 min | Note sur 20 | Coeff. 1 | Éliminatoire : 4/20`,
      actif: true,
    },
    {
      id: 4,
      titre: "Épreuves spécifiques VTC & TAXI",
      description: `📝 ÉPREUVES SPÉCIFIQUES VTC :
F(V) — Développement commercial et gestion VTC
   Durée : 30 min | Note sur 20 | Coeff. 3 | Éliminatoire : 6/20
G(V) — Réglementation nationale spécifique VTC
   Durée : 20 min | Note sur 20 | Coeff. 3 | Éliminatoire : 6/20

📝 ÉPREUVES SPÉCIFIQUES TAXI :
F(T) — Connaissance du territoire et réglementation locale
   Durée : 30 min | Note sur 20 | Coeff. 3 | Éliminatoire : 6/20
G(T) — Réglementation nationale TAXI et gestion
   Durée : 20 min | Note sur 20 | Coeff. 3 | Éliminatoire : 6/20

✅ CONDITIONS D'ADMISSIBILITÉ :
• Moyenne ≥ 10/20 (pondérée des coefficients)
• Aucune note éliminatoire

Un candidat admissible peut se présenter 3 fois à l'épreuve pratique dans un délai d'1 an.`,
      actif: true,
    },
    {
      id: 5,
      titre: "L'épreuve d'admission (pratique)",
      description: `Après chaque session d'admissibilité, une session d'admission est organisée dans un délai maximum de 2 mois.

L'épreuve pratique comprend une phase de conduite en circulation d'une durée minimum de 20 minutes, notée sur 20 points.

📌 Note minimale requise : 12/20

💰 En cas d'échec à l'examen pratique :
• Frais d'examen CMA à la charge de l'élève : environ 200€
• Frais de location de voiture à la charge de l'élève : environ 80€`,
      actif: true,
    },
    {
      id: 7,
      titre: "Programme de formation — Épreuves théoriques",
      description: `📋 PROGRAMME DE FORMATION

📘 A — RÉGLEMENTATION T3P
• Réglementation des taxis, VTC, VMDTR
• Utilisation de la voie publique, obligations véhicules et conducteurs
• Organismes administratifs, assurances, contrôles, sanctions
• Prise en charge des PMR, covoiturage, intermédiaires
• Prévention des discriminations et violences sexuelles/sexistes

📘 B — GESTION
• Principes de comptabilité, charges fixes/variables, amortissement
• Formes juridiques (EI, EIRL, EURL, SARL, SASU…)
• Régimes d'imposition, formalités déclaratives
• Chambres des métiers, régimes sociaux

📘 C — SÉCURITÉ ROUTIÈRE
• Code de la route, alcoolémie, stupéfiants, fatigue
• Éco-conduite, entretien véhicule, constat amiable
• Permis de conduire (points, probatoire, suspension)

📘 D — FRANÇAIS
• Compréhension de texte lié au transport
• Expression : accueil, demandes, conversation, prise de congé

📘 E — ANGLAIS (niveau A2)
• Accueil clientèle, demandes simples, conversation, prise de congé`,
      actif: true,
    },
    {
      id: 8,
      titre: "Programme — Épreuves spécifiques",
      description: `📗 PROGRAMME SPÉCIFIQUE VTC :

F(V) — DÉVELOPPEMENT COMMERCIAL
• Marketing : analyse de marché, ciblage, compétitivité, prix
• Valorisation de la prestation VTC, fidélisation
• Communication (internet, numérique), réseau de partenaires

G(V) — RÉGLEMENTATION SPÉCIFIQUE VTC
• Inscription au registre VTC, capacité financière
• Obligations véhicules (dimensions, puissance, âge, signalisation)
• Documents de prestation pour les contrôles

📕 PROGRAMME SPÉCIFIQUE TAXI :

F(T) — RÉGLEMENTATION NATIONALE TAXI
• Équipements spéciaux, terminal de paiement électronique
• Articulation réglementations nationales et locales
• Autorisations de stationnement, tarification
• Activités complémentaires, TICPE, taxe de stationnement

G(T) — CONNAISSANCE DU TERRITOIRE ET RÉGLEMENTATION LOCALE
• Principaux lieux, sites, bâtiments publics, axes routiers
• Règlement local en vigueur`,
      actif: true,
    },
    {
      id: 9,
      titre: "Programme — Épreuve pratique",
      description: `📙 ÉPREUVE PRATIQUE D'ADMISSION

A — CONDUITE ET SÉCURITÉ
• A1 : Conduite en sécurité, code de la route, éco-conduite
• A2 : Souplesse de conduite pour le confort des passagers
• A3 : Prise en charge et dépose des clients et bagages

B — RELATION CLIENT
• B1 : Présentation, attitudes, courtoisie
• B2 : Accueil, comportement, prise de congé
• B3 : Vérification de l'état du véhicule

C — PARCOURS ET ACCOMPAGNEMENT
• C1 : Construction du parcours, utilisation GPS
• C2 : Informations touristiques et pratiques

D — FACTURATION ET PAIEMENT
• D1 : Calcul du prix, facturation, encaissement (TPE)

🎯 Moyens pédagogiques : tablettes, plateforme numérique, cours magistraux, contrôles continus et examens blancs.`,
      actif: true,
    },
    {
      id: 6,
      titre: "Horaires et accueil — Formation présentielle",
      description: `🏢 FTRANSPORT — Centre de formation
86 Route de Genas, 69003 Lyon

📞 Tel : 04 28 29 60 91
📧 Email : contact@ftransport.fr

⏰ Horaires de formation : 9h-12h et 13h-17h
📋 Effectif maximum : 21 stagiaires par session

📌 Prérequis : savoir lire et écrire, casier B2 vierge.

👥 Équipe :
• Responsable pédagogique : Guenichi Naoufal
• Responsable administrative : Baaziz Fadela
• Formatrice Taxi : Rim Touil
• Formateur VTC : Guenichi Naoufal
• Formateur Anglais : Albert Akono`,
      actif: true,
    },
    {
      id: 10,
      titre: "Plannings de formation (indicatifs)",
      description: `Les plannings ci-dessous sont donnes a titre indicatif. Ils peuvent etre modifies en fonction des necessites pedagogiques.

PLANNING TA — Formation Taxi pour chauffeurs VTC
Duree : 3 semaines | Horaires : 9h00-12h00 / 13h00-16h00

Semaine 1 :
LUNDI 9h-12h : Reglementation locale | 13h-16h : Reglementation locale
MARDI 9h-12h : Reglementation locale | 13h-16h : Reglementation locale
MERCREDI 9h-12h : Topographie | 13h-16h : Topographie
JEUDI 9h-12h : Bilan examen | 13h-16h : 13h-15h Correction
VENDREDI 9h-12h : Controle continu | 13h-16h : Correction 15h-16h

Semaine 2 : Revisions individuelles et examens blancs complementaires.

Semaine 3 :
LUNDI 15h-17h : Revision

---

PLANNING TAXI — Formation complete
Duree : 3 semaines | Horaires : 9h00-12h00 / 13h00-16h00

Semaine 1 :
LUNDI 9h-12h : Reglementation locale | 13h-16h : Reglementation locale
MARDI 9h-12h : Reglementation locale | 13h-16h : Reglementation locale
MERCREDI 9h-12h : Topographie | 13h-16h : Topographie
JEUDI 9h-12h : Bilan examen | 13h-16h : 13h-15h + Correction
VENDREDI 9h-12h : Controle continu | 13h-16h : 15h-16h

Semaine 2 :
LUNDI : T3P 1/2 + Securite routiere 13h-15h + Anglais
MARDI : Gestion + Securite routiere 13h-15h + Anglais
MERCREDI : Gestion + Securite routiere 13h-15h + Anglais
JEUDI : Reglementation VTC 9h-10h30 + Gestion 13h-14h30 + Examen blanc
VENDREDI : 10h30-12h + Anglais 14h-15h + Revision

Semaine 3 :
LUNDI : Bilan QCM + Bilan QRC
MARDI : Bilan QRC + Examen blanc 13h-16h
MERCREDI : Bilan QCM 9h-10h30 + Examen blanc 13h-14h
JEUDI : 10h30-12h + Examen blanc 13h-14h
VENDREDI : Examen blanc 9h-10h30 + Anglais 14h-15h + Revision

---

PLANNING VTC — Formation complete
Duree : 3 semaines | Horaires : 9h00-12h00 / 13h00-16h00

Semaine 1 :
LUNDI : T3P 1/2 + Securite routiere 13h-15h + Anglais 15h-16h
MARDI : Gestion + Securite routiere 13h-15h + Anglais 15h-16h
MERCREDI : Gestion + Securite routiere 13h-15h + Anglais 15h-16h
JEUDI : Reglementation VTC 9h-10h30 + Gestion 13h-14h30 + Examen blanc 14h-16h
VENDREDI : Examen blanc 10h30-12h + Anglais 14h-15h + 15h-16h

Semaine 2 :
LUNDI : Bilan QCM + Bilan QRC
MARDI : Bilan QRC + Examen blanc 13h-16h
MERCREDI : Bilan QCM 9h-10h30 + Examen blanc 13h-14h + 14h-16h
JEUDI : Bilan QCM 9h-10h30 + Examen blanc 13h-14h + 14h-16h
VENDREDI : Examen blanc 9h-10h30 + Anglais 14h-15h + Revision 15h-16h

---

PLANNING VTC COURS DU SOIR
Duree : 2 semaines | Horaires : 17h00-21h00

Semaine 1 :
LUNDI : T3P 17h-18h30 + Securite routiere 18h-21h
MARDI : Gestion 17h-18h30 + Securite routiere 18h30-21h
MERCREDI : Gestion 17h-18h30 + Securite routiere 18h30-21h
JEUDI : Gestion 17h-18h30 + Reglementation 18h30-20h
VENDREDI : Anglais 17h-18h + Revision VTC 20h-21h + Examen blanc 19h30-21h

Semaine 2 :
LUNDI : Examen blanc 17h-18h + Bilan QRC 18h-18h30 + Correction 18h30-20h30
MARDI : Bilan QRC + Bilan QCM 18h30-19h30 + Examen blanc 19h30-21h
MERCREDI : Examen blanc 17h-18h + Bilan QCM 18h-19h30 + Examen blanc 19h30-21h
JEUDI : Examen blanc 17h-18h + Bilan QCM 18h-19h30 + Examen blanc 19h30-21h
VENDREDI : Anglais 17h-18h + Revision 19h-21h

Certaines heures peuvent etre rajoutees et le planning est susceptible d'etre modifie.`,
      actif: true,
    },
  ],
  exercices: [
    {
      id: 1,
      titre: "Quiz Introduction",
      sousTitre: "Vérifiez vos connaissances sur l'examen",
      actif: true,
      questions: [
        { id: 1, enonce: "Quelle note minimale faut-il obtenir à l'épreuve théorique (admissibilité) ?", choix: [{ lettre: "A", texte: "8/20" }, { lettre: "B", texte: "10/20", correct: true }, { lettre: "C", texte: "12/20" }, { lettre: "D", texte: "14/20" }] },
        { id: 2, enonce: "Quelle note minimale faut-il obtenir à l'épreuve pratique (admission) ?", choix: [{ lettre: "A", texte: "10/20" }, { lettre: "B", texte: "11/20" }, { lettre: "C", texte: "12/20", correct: true }, { lettre: "D", texte: "14/20" }] },
        { id: 3, enonce: "Combien de matières comporte l'épreuve théorique ?", choix: [{ lettre: "A", texte: "5 matières" }, { lettre: "B", texte: "6 matières" }, { lettre: "C", texte: "7 matières", correct: true }, { lettre: "D", texte: "8 matières" }] },
        { id: 4, enonce: "Quelle est la durée de l'épreuve A (Réglementation T3P) ?", choix: [{ lettre: "A", texte: "20 minutes" }, { lettre: "B", texte: "30 minutes" }, { lettre: "C", texte: "45 minutes", correct: true }, { lettre: "D", texte: "60 minutes" }] },
        { id: 5, enonce: "En cas d'échec à l'examen théorique, quel est le coût approximatif des frais d'examen ?", choix: [{ lettre: "A", texte: "150€" }, { lettre: "B", texte: "240€", correct: true }, { lettre: "C", texte: "300€" }, { lettre: "D", texte: "180€" }] },
        { id: 6, enonce: "Pour l'épreuve de Français (D), combien de fautes d'orthographe entraînent une pénalité de -1 point ?", choix: [{ lettre: "A", texte: "3 fautes" }, { lettre: "B", texte: "5 fautes", correct: true }, { lettre: "C", texte: "10 fautes" }, { lettre: "D", texte: "Aucune pénalité" }] },
        { id: 7, enonce: "Combien de fois un candidat admissible peut-il se présenter à l'épreuve pratique ?", choix: [{ lettre: "A", texte: "1 fois" }, { lettre: "B", texte: "2 fois" }, { lettre: "C", texte: "3 fois", correct: true }, { lettre: "D", texte: "Illimité" }] },
        { id: 8, enonce: "Quel est le délai pour réussir l'examen théorique après réception des identifiants ?", choix: [{ lettre: "A", texte: "3 mois" }, { lettre: "B", texte: "6 mois", correct: true }, { lettre: "C", texte: "12 mois" }, { lettre: "D", texte: "Pas de délai" }] },
        { id: 9, enonce: "Quelle est la note éliminatoire pour l'épreuve d'Anglais (E) ?", choix: [{ lettre: "A", texte: "4/20", correct: true }, { lettre: "B", texte: "6/20" }, { lettre: "C", texte: "8/20" }, { lettre: "D", texte: "10/20" }] },
        { id: 10, enonce: "Quelle est la durée minimale de la phase de conduite lors de l'épreuve pratique ?", choix: [{ lettre: "A", texte: "10 minutes" }, { lettre: "B", texte: "15 minutes" }, { lettre: "C", texte: "20 minutes", correct: true }, { lettre: "D", texte: "30 minutes" }] },
      ],
    },
    {
      id: 2,
      titre: "Quiz Coefficients",
      sousTitre: "Connaissez-vous les coefficients de chaque épreuve ?",
      actif: true,
      questions: [
        { id: 1, enonce: "Quel est le coefficient de l'épreuve A — Réglementation T3P ?", choix: [{ lettre: "A", texte: "1" }, { lettre: "B", texte: "2" }, { lettre: "C", texte: "3", correct: true }, { lettre: "D", texte: "4" }] },
        { id: 2, enonce: "Quel est le coefficient de l'épreuve B — Gestion ?", choix: [{ lettre: "A", texte: "1" }, { lettre: "B", texte: "2", correct: true }, { lettre: "C", texte: "3" }, { lettre: "D", texte: "4" }] },
        { id: 3, enonce: "Quel est le coefficient de l'épreuve C — Sécurité routière ?", choix: [{ lettre: "A", texte: "1" }, { lettre: "B", texte: "2" }, { lettre: "C", texte: "3", correct: true }, { lettre: "D", texte: "4" }] },
        { id: 4, enonce: "Quel est le coefficient de l'épreuve D — Français ?", choix: [{ lettre: "A", texte: "1" }, { lettre: "B", texte: "2", correct: true }, { lettre: "C", texte: "3" }, { lettre: "D", texte: "4" }] },
        { id: 5, enonce: "Quel est le coefficient de l'épreuve E — Anglais ?", choix: [{ lettre: "A", texte: "1", correct: true }, { lettre: "B", texte: "2" }, { lettre: "C", texte: "3" }, { lettre: "D", texte: "4" }] },
        { id: 6, enonce: "Quelle est la somme totale des coefficients des 7 épreuves théoriques ?", choix: [{ lettre: "A", texte: "14" }, { lettre: "B", texte: "15" }, { lettre: "C", texte: "17", correct: true }, { lettre: "D", texte: "20" }] },
        { id: 7, enonce: "Quelles épreuves ont le coefficient le plus élevé (coeff. 3) ?", choix: [{ lettre: "A", texte: "T3P, Gestion, Français" }, { lettre: "B", texte: "T3P, Sécurité, et les 2 épreuves spécifiques", correct: true }, { lettre: "C", texte: "Français, Anglais, Gestion" }, { lettre: "D", texte: "Toutes les épreuves" }] },
        { id: 8, enonce: "Quelle épreuve a le coefficient le plus faible ?", choix: [{ lettre: "A", texte: "Français" }, { lettre: "B", texte: "Gestion" }, { lettre: "C", texte: "Anglais", correct: true }, { lettre: "D", texte: "Sécurité routière" }] },
      ],
    },
  ],
};

// ===== Données initiales du module INTRODUCTION E-LEARNING =====
const INTRODUCTION_ELEARNING_DATA: ModuleData = {
  id: 26, nom: "1.INTRODUCTION E-LEARNING",
  description: "Introduction pour les formations en e-learning.",
  cours: [
    { id: 0, titre: "Test de compétences avant formation", description: "Répondez aux questions en cochant Oui ou Non.", actif: true, checklistType: "competences" },
    { id: 100, titre: "Analyse du besoin – Fiche client", description: "Complétez cette fiche.", actif: true, checklistType: "analyse-besoin" },
    { id: 101, titre: "Questionnaire Projet Professionnel", description: "Évaluation de votre motivation et de votre projet professionnel.", actif: true, checklistType: "projet-professionnel" },
    { id: 102, titre: "Conditions Générales de Vente", description: "Veuillez lire et accepter les CGV avant de continuer.", actif: true, checklistType: "cgv" },
    { id: 1, titre: "Bienvenue sur la plateforme", description: "Cette plateforme est dédiée aux futurs chauffeurs VTC et TAXIS. Vous devez réussir deux épreuves :\n• L'épreuve d'admissibilité (théorie avec 7 matières) — minimum 10/20\n• L'épreuve d'admission (pratique) — minimum 12/20\nLe tout sans note éliminatoire.", actif: true },
    { id: 2, titre: "Informations importantes", description: "💰 Frais d'examen en cas d'échec (à votre charge) :\n• Examen théorique : environ 240€\n• Examen pratique : environ 200€\n\n📋 Les examens sont organisés par la CMA.\n📞 Contactez-nous le jour des résultats de l'examen théorique.", actif: true },
    { id: 3, titre: "Contenu de l'examen — Épreuves communes", description: `L'examen se compose d'épreuves théoriques d'admissibilité (QCM + QRC) et d'une épreuve pratique d'admission.

📝 ÉPREUVES COMMUNES TAXI & VTC :

A — Réglementation T3P et prévention des discriminations
   Durée : 45 min | Note sur 20 | Coeff. 3 | Éliminatoire : 6/20

B — Gestion
   Durée : 45 min | Note sur 20 | Coeff. 2 | Éliminatoire : 6/20

C — Sécurité routière
   Durée : 30 min | Note sur 20 | Coeff. 3 | Éliminatoire : 6/20

D — Français (expression et compréhension)
   Durée : 30 min | Note sur 20 | Coeff. 2 | Éliminatoire : 6/20
   ⚠️ -1 point toutes les 5 fautes d'orthographe sur les QRC

E — Anglais (expression et compréhension)
   Durée : 30 min | Note sur 20 | Coeff. 1 | Éliminatoire : 4/20`, actif: true },
    { id: 4, titre: "Épreuves spécifiques VTC & TAXI", description: `📝 ÉPREUVES SPÉCIFIQUES VTC :
F(V) — Développement commercial et gestion VTC
   Durée : 30 min | Note sur 20 | Coeff. 3 | Éliminatoire : 6/20
G(V) — Réglementation nationale spécifique VTC
   Durée : 20 min | Note sur 20 | Coeff. 3 | Éliminatoire : 6/20

📝 ÉPREUVES SPÉCIFIQUES TAXI :
F(T) — Connaissance du territoire et réglementation locale
   Durée : 20 min | Note sur 20 | Coeff. 3 | Éliminatoire : 6/20
G(T) — Réglementation nationale TAXI et gestion
   Durée : 30 min | Note sur 20 | Coeff. 3 | Éliminatoire : 6/20

✅ CONDITIONS D'ADMISSIBILITÉ :
• Moyenne ≥ 10/20 (pondérée des coefficients)
• Aucune note éliminatoire

Un candidat admissible peut se présenter 3 fois à l'épreuve pratique dans un délai d'1 an.`, actif: true },
    { id: 5, titre: "L'épreuve d'admission (pratique)", description: `Après chaque session d'admissibilité, une session d'admission est organisée dans un délai maximum de 2 mois.

L'épreuve pratique comprend une phase de conduite en circulation d'une durée minimum de 20 minutes, notée sur 20 points.

📌 Note minimale requise : 12/20

💰 En cas d'échec à l'examen pratique :
• Frais d'examen CMA à la charge de l'élève : environ 200€
• Frais de location de voiture à la charge de l'élève : environ 80€`, actif: true },
    { id: 7, titre: "Programme — Épreuves théoriques", description: `📋 PROGRAMME DE FORMATION

📘 A — RÉGLEMENTATION T3P
• Réglementation taxis, VTC, VMDTR, voie publique
• Obligations véhicules/conducteurs, organismes, assurances, sanctions
• PMR, covoiturage, prévention discriminations

📘 B — GESTION
• Comptabilité, charges, amortissement, formes juridiques
• Régimes d'imposition, chambres des métiers, régimes sociaux

📘 C — SÉCURITÉ ROUTIÈRE
• Code de la route, risques, éco-conduite, permis de conduire

📘 D — FRANÇAIS
• Compréhension de texte, expression (accueil, conversation)

📘 E — ANGLAIS (niveau A2)
• Accueil clientèle, demandes simples, conversation`, actif: true },
    { id: 8, titre: "Programme — Épreuves spécifiques", description: `📗 SPÉCIFIQUE VTC :
F(V) — Développement commercial : marketing, fidélisation, communication
G(V) — Réglementation VTC : registre, véhicules, documents

📕 SPÉCIFIQUE TAXI :
F(T) — Réglementation nationale : équipements, ADS, tarification
G(T) — Territoire et réglementation locale : lieux, règlement local`, actif: true },
    { id: 6, titre: "Contact", description: "🏢 FTRANSPORT — 86 Route de Genas, 69003 Lyon\n📞 04 28 29 60 91\n📧 contact@ftransport.fr", actif: true },
  ],
  exercices: [
    { id: 1, titre: "Quiz Introduction", sousTitre: "Vérifiez vos connaissances", actif: true, questions: [
      { id: 1, enonce: "Note minimale épreuve théorique ?", choix: [{ lettre: "A", texte: "8/20" }, { lettre: "B", texte: "10/20", correct: true }, { lettre: "C", texte: "12/20" }] },
      { id: 2, enonce: "Note minimale épreuve pratique ?", choix: [{ lettre: "A", texte: "10/20" }, { lettre: "B", texte: "12/20", correct: true }, { lettre: "C", texte: "14/20" }] },
      { id: 3, enonce: "Nombre de matières ?", choix: [{ lettre: "A", texte: "5" }, { lettre: "B", texte: "7", correct: true }, { lettre: "C", texte: "8" }] },
    ] },
    { id: 2, titre: "Quiz Coefficients", sousTitre: "Connaissez-vous les coefficients ?", actif: true, questions: [
      { id: 1, enonce: "Quel est le coefficient de l'épreuve A — Réglementation T3P ?", choix: [{ lettre: "A", texte: "1" }, { lettre: "B", texte: "2" }, { lettre: "C", texte: "3", correct: true }, { lettre: "D", texte: "4" }] },
      { id: 2, enonce: "Quel est le coefficient de l'épreuve B — Gestion ?", choix: [{ lettre: "A", texte: "1" }, { lettre: "B", texte: "2", correct: true }, { lettre: "C", texte: "3" }, { lettre: "D", texte: "4" }] },
      { id: 3, enonce: "Quel est le coefficient de l'épreuve C — Sécurité routière ?", choix: [{ lettre: "A", texte: "1" }, { lettre: "B", texte: "2" }, { lettre: "C", texte: "3", correct: true }, { lettre: "D", texte: "4" }] },
      { id: 4, enonce: "Quel est le coefficient de l'épreuve D — Français ?", choix: [{ lettre: "A", texte: "1" }, { lettre: "B", texte: "2", correct: true }, { lettre: "C", texte: "3" }, { lettre: "D", texte: "4" }] },
      { id: 5, enonce: "Quel est le coefficient de l'épreuve E — Anglais ?", choix: [{ lettre: "A", texte: "1", correct: true }, { lettre: "B", texte: "2" }, { lettre: "C", texte: "3" }, { lettre: "D", texte: "4" }] },
      { id: 6, enonce: "Quelle est la somme totale des coefficients des 7 épreuves ?", choix: [{ lettre: "A", texte: "14" }, { lettre: "B", texte: "15" }, { lettre: "C", texte: "17", correct: true }, { lettre: "D", texte: "20" }] },
      { id: 7, enonce: "Quelle épreuve a le coefficient le plus faible ?", choix: [{ lettre: "A", texte: "Français" }, { lettre: "B", texte: "Gestion" }, { lettre: "C", texte: "Anglais", correct: true }, { lettre: "D", texte: "Sécurité routière" }] },
    ] },
  ],
};
// ===== Introduction TA Présentiel (ID 31) =====
const INTRODUCTION_TA_PRESENTIEL_DATA: ModuleData = {
  id: 31, nom: "1.INTRODUCTION TA", description: "Introduction passerelle TA (présentiel).",
  cours: [
    { id: 0, titre: "Test de compétences avant formation", description: "Répondez aux questions.", actif: true, checklistType: "competences" },
    { id: 100, titre: "Analyse du besoin – Fiche client", description: "Complétez cette fiche.", actif: true, checklistType: "analyse-besoin" },
    { id: 101, titre: "Questionnaire Projet Professionnel", description: "Évaluation de votre motivation et de votre projet professionnel.", actif: true, checklistType: "projet-professionnel" },
    { id: 1, titre: "Bienvenue — Passerelle TA", description: "Cette formation passerelle vous permet d'obtenir votre carte TAXI en complétant vos compétences VTC.\n\nVous devez réussir l'examen théorique sur 2 matières spécifiques TAXI, puis l'épreuve pratique.\n\n💰 Frais d'examen en cas d'échec :\n• Examen théorique : environ 240€\n• Examen pratique : environ 200€", actif: true },
    { id: 2, titre: "Contenu de l'examen — Épreuves spécifiques TAXI", description: `L'examen passerelle TA se compose de 2 épreuves théoriques d'admissibilité (QCM + QRC) et d'une épreuve pratique d'admission.

📝 ÉPREUVES SPÉCIFIQUES TAXI :

F(T) — Connaissance du territoire et réglementation locale
   Durée : 20 min | Note sur 20 | Coeff. 3 | Éliminatoire : 6/20

G(T) — Réglementation nationale de l'activité taxi et gestion propre à cette activité
   Durée : 30 min | Note sur 20 | Coeff. 3 | Éliminatoire : 6/20

✅ CONDITIONS D'ADMISSIBILITÉ :
• Moyenne ≥ 10/20 (pondérée des coefficients)
• Aucune note éliminatoire

Un candidat admissible peut se présenter 3 fois à l'épreuve pratique dans un délai d'1 an.`, actif: true },
    { id: 6, titre: "Programme de formation TA", description: `📋 PROGRAMME — Passerelle TAXI pour VTC

📕 F(T) — RÉGLEMENTATION NATIONALE TAXI
• Fonctionnement des équipements spéciaux et du TPE
• Articulation réglementations nationales et locales
• Régimes d'autorisation de stationnement
• Règles de tarification d'une course de Taxi
• Activités complémentaires : services réguliers, transport assis professionnalisé
• Détaxation TICPE, taxe de stationnement

📕 G(T) — RÉGLEMENTATION LOCALE
• Territoire d'exercice : principaux lieux, sites, bâtiments publics, axes routiers
• Règlement local en vigueur`, actif: true },
    { id: 5, titre: "L'épreuve d'admission (pratique)", description: `L'épreuve pratique comprend une phase de conduite en circulation d'une durée minimum de 20 minutes, notée sur 20 points.

📌 Note minimale requise : 12/20

💰 En cas d'échec à l'examen pratique :
• Frais d'examen CMA à la charge de l'élève : environ 200€
• Frais de location de voiture à la charge de l'élève : environ 80€`, actif: true },
    { id: 102, titre: "CGV et Reglement Interieur", description: "Veuillez lire et signer les CGV et le reglement interieur.", actif: true, checklistType: "cgv-reglement" as const },
    { id: 3, titre: "Planning et contact", description: "🏢 FTRANSPORT — 86 Route de Genas, 69003 Lyon\n📞 04 28 29 60 91\n⏰ 9h-12h / 13h-17h", actif: true },
  ],
  exercices: [
    { id: 1, titre: "Quiz Coefficients TA", sousTitre: "Connaissez-vous les coefficients de vos épreuves passerelle ?", actif: true, questions: [
      { id: 1, enonce: "Combien de matières comporte l'examen passerelle TA ?", choix: [{ lettre: "A", texte: "2 matières", correct: true }, { lettre: "B", texte: "5 matières" }, { lettre: "C", texte: "7 matières" }] },
      { id: 2, enonce: "Quel est le coefficient de l'épreuve F(T) — Réglementation nationale TAXI ?", choix: [{ lettre: "A", texte: "1" }, { lettre: "B", texte: "2" }, { lettre: "C", texte: "3", correct: true }, { lettre: "D", texte: "4" }] },
      { id: 3, enonce: "Quel est le coefficient de l'épreuve G(T) — Réglementation locale ?", choix: [{ lettre: "A", texte: "1" }, { lettre: "B", texte: "2" }, { lettre: "C", texte: "3", correct: true }, { lettre: "D", texte: "4" }] },
      { id: 4, enonce: "Quelle est la somme des coefficients des épreuves passerelle TA ?", choix: [{ lettre: "A", texte: "4" }, { lettre: "B", texte: "5" }, { lettre: "C", texte: "6", correct: true }, { lettre: "D", texte: "7" }] },
      { id: 5, enonce: "Quelle note minimale faut-il obtenir à l'épreuve théorique ?", choix: [{ lettre: "A", texte: "8/20" }, { lettre: "B", texte: "10/20", correct: true }, { lettre: "C", texte: "12/20" }] },
    ] },
  ],
};
// ===== Introduction TA E-Learning (ID 32) =====
const INTRODUCTION_TA_ELEARNING_DATA: ModuleData = {
  id: 32, nom: "1.INTRODUCTION TA E-LEARNING", description: "Introduction passerelle TA (e-learning).",
  cours: [
    { id: 0, titre: "Test de compétences avant formation", description: "Répondez aux questions.", actif: true, checklistType: "competences" },
    { id: 100, titre: "Analyse du besoin – Fiche client", description: "Complétez cette fiche.", actif: true, checklistType: "analyse-besoin" },
    { id: 101, titre: "Questionnaire Projet Professionnel", description: "Évaluation de votre motivation et de votre projet professionnel.", actif: true, checklistType: "projet-professionnel" },
    { id: 102, titre: "Conditions Générales de Vente", description: "Veuillez lire et accepter les CGV avant de continuer.", actif: true, checklistType: "cgv" },
    { id: 1, titre: "Bienvenue — Passerelle TA (E-learning)", description: "Formation passerelle TAXI en e-learning.\n\n2 matières : Réglementation nationale TAXI + Réglementation locale\n\n💰 Frais d'examen en cas d'échec :\n• Examen théorique : environ 240€\n• Examen pratique : environ 200€", actif: true },
    { id: 2, titre: "Contenu de l'examen — Épreuves spécifiques TAXI", description: `L'examen passerelle TA se compose de 2 épreuves théoriques d'admissibilité (QCM + QRC) et d'une épreuve pratique d'admission.

📝 ÉPREUVES SPÉCIFIQUES TAXI :

F(T) — Connaissance du territoire et réglementation locale
   Durée : 20 min | Note sur 20 | Coeff. 3 | Éliminatoire : 6/20

G(T) — Réglementation nationale de l'activité taxi et gestion propre à cette activité
   Durée : 30 min | Note sur 20 | Coeff. 3 | Éliminatoire : 6/20

✅ CONDITIONS D'ADMISSIBILITÉ :
• Moyenne ≥ 10/20 (pondérée des coefficients)
• Aucune note éliminatoire

Un candidat admissible peut se présenter 3 fois à l'épreuve pratique dans un délai d'1 an.`, actif: true },
    { id: 6, titre: "Programme de formation TA", description: `📋 PROGRAMME — Passerelle TAXI pour VTC (E-learning)

📕 F(T) — RÉGLEMENTATION NATIONALE TAXI
• Fonctionnement des équipements spéciaux et du TPE
• Articulation réglementations nationales et locales
• Régimes d'autorisation de stationnement
• Règles de tarification d'une course de Taxi
• Activités complémentaires, TICPE, taxe de stationnement

📕 G(T) — RÉGLEMENTATION LOCALE
• Territoire d'exercice : lieux, sites, bâtiments publics, axes routiers
• Règlement local en vigueur`, actif: true },
    { id: 5, titre: "L'épreuve d'admission (pratique)", description: `L'épreuve pratique comprend une phase de conduite en circulation d'une durée minimum de 20 minutes, notée sur 20 points.

📌 Note minimale requise : 12/20

💰 En cas d'échec à l'examen pratique :
• Frais d'examen CMA à la charge de l'élève : environ 200€
• Frais de location de voiture à la charge de l'élève : environ 80€`, actif: true },
    { id: 3, titre: "Contact", description: "🏢 FTRANSPORT — 86 Route de Genas, 69003 Lyon\n📞 04 28 29 60 91\n📧 contact@ftransport.fr", actif: true },
  ],
  exercices: [
    { id: 1, titre: "Quiz Coefficients TA", sousTitre: "Connaissez-vous les coefficients de vos épreuves passerelle ?", actif: true, questions: [
      { id: 1, enonce: "Combien de matières comporte l'examen passerelle TA ?", choix: [{ lettre: "A", texte: "2 matières", correct: true }, { lettre: "B", texte: "5 matières" }, { lettre: "C", texte: "7 matières" }] },
      { id: 2, enonce: "Quel est le coefficient de l'épreuve F(T) — Réglementation nationale TAXI ?", choix: [{ lettre: "A", texte: "1" }, { lettre: "B", texte: "2" }, { lettre: "C", texte: "3", correct: true }, { lettre: "D", texte: "4" }] },
      { id: 3, enonce: "Quel est le coefficient de l'épreuve G(T) — Réglementation locale ?", choix: [{ lettre: "A", texte: "1" }, { lettre: "B", texte: "2" }, { lettre: "C", texte: "3", correct: true }, { lettre: "D", texte: "4" }] },
      { id: 4, enonce: "Quelle note minimale faut-il obtenir à l'épreuve théorique ?", choix: [{ lettre: "A", texte: "8/20" }, { lettre: "B", texte: "10/20", correct: true }, { lettre: "C", texte: "12/20" }] },
    ] },
  ],
};
// ===== Introduction VA Présentiel (ID 33) =====
const INTRODUCTION_VA_PRESENTIEL_DATA: ModuleData = {
  id: 33, nom: "1.INTRODUCTION VA", description: "Introduction passerelle VA (présentiel).",
  cours: [
    { id: 0, titre: "Test de compétences avant formation", description: "Répondez aux questions.", actif: true, checklistType: "competences" },
    { id: 100, titre: "Analyse du besoin – Fiche client", description: "Complétez cette fiche.", actif: true, checklistType: "analyse-besoin" },
    { id: 101, titre: "Questionnaire Projet Professionnel", description: "Évaluation de votre motivation et de votre projet professionnel.", actif: true, checklistType: "projet-professionnel" },
    { id: 1, titre: "Bienvenue — Passerelle VA", description: "Cette formation passerelle vous permet d'obtenir votre carte VTC en complétant vos compétences TAXI.\n\nVous devez réussir l'examen théorique sur 2 matières spécifiques VTC, puis l'épreuve pratique.\n\n💰 Frais d'examen en cas d'échec :\n• Examen théorique : environ 240€\n• Examen pratique : environ 200€", actif: true },
    { id: 2, titre: "Contenu de l'examen — Épreuves spécifiques VTC", description: `L'examen passerelle VA se compose de 2 épreuves théoriques d'admissibilité (QCM + QRC) et d'une épreuve pratique d'admission.

📝 ÉPREUVES SPÉCIFIQUES VTC :

F(V) — Développement commercial et gestion propre à l'activité de VTC
   Durée : 30 min | Note sur 20 | Coeff. 3 | Éliminatoire : 6/20

G(V) — Réglementation nationale spécifique à l'activité de VTC
   Durée : 20 min | Note sur 20 | Coeff. 3 | Éliminatoire : 6/20

✅ CONDITIONS D'ADMISSIBILITÉ :
• Moyenne ≥ 10/20 (pondérée des coefficients)
• Aucune note éliminatoire

Un candidat admissible peut se présenter 3 fois à l'épreuve pratique dans un délai d'1 an.`, actif: true },
    { id: 6, titre: "Programme de formation VA", description: `📋 PROGRAMME — Passerelle VTC pour TAXI

📗 F(V) — DÉVELOPPEMENT COMMERCIAL
• Principes généraux du marketing (analyse de marché, ciblage, compétitivité, prix)
• Valorisation de la prestation commerciale VTC
• Fidélisation des clients, prospection
• Communication (internet, moyens numériques)
• Développement d'un réseau de partenaires (hôtels, entreprises)

📗 G(V) — RÉGLEMENTATION SPÉCIFIQUE VTC
• Modalités d'inscription au registre des VTC, capacité financière
• Obligations véhicules d'exploitation (dimensions, puissance, âge, signalisation)
• Documents de prestation pour les contrôles`, actif: true },
    { id: 5, titre: "L'épreuve d'admission (pratique)", description: `L'épreuve pratique comprend une phase de conduite en circulation d'une durée minimum de 20 minutes, notée sur 20 points.

📌 Note minimale requise : 12/20

💰 En cas d'échec à l'examen pratique :
• Frais d'examen CMA à la charge de l'élève : environ 200€
• Frais de location de voiture à la charge de l'élève : environ 80€`, actif: true },
    { id: 102, titre: "CGV et Reglement Interieur", description: "Veuillez lire et signer les CGV et le reglement interieur.", actif: true, checklistType: "cgv-reglement" as const },
    { id: 3, titre: "Planning et contact", description: "🏢 FTRANSPORT — 86 Route de Genas, 69003 Lyon\n📞 04 28 29 60 91\n⏰ 9h-12h / 13h-17h", actif: true },
  ],
  exercices: [
    { id: 1, titre: "Quiz Coefficients VA", sousTitre: "Connaissez-vous les coefficients de vos épreuves passerelle ?", actif: true, questions: [
      { id: 1, enonce: "Combien de matières comporte l'examen passerelle VA ?", choix: [{ lettre: "A", texte: "2 matières", correct: true }, { lettre: "B", texte: "5 matières" }, { lettre: "C", texte: "7 matières" }] },
      { id: 2, enonce: "Quel est le coefficient de l'épreuve F(V) — Développement commercial ?", choix: [{ lettre: "A", texte: "1" }, { lettre: "B", texte: "2" }, { lettre: "C", texte: "3", correct: true }, { lettre: "D", texte: "4" }] },
      { id: 3, enonce: "Quel est le coefficient de l'épreuve G(V) — Réglementation spécifique VTC ?", choix: [{ lettre: "A", texte: "1" }, { lettre: "B", texte: "2" }, { lettre: "C", texte: "3", correct: true }, { lettre: "D", texte: "4" }] },
      { id: 4, enonce: "Quelle note minimale faut-il obtenir à l'épreuve théorique ?", choix: [{ lettre: "A", texte: "8/20" }, { lettre: "B", texte: "10/20", correct: true }, { lettre: "C", texte: "12/20" }] },
    ] },
  ],
};
// ===== Introduction VA E-Learning (ID 34) =====
const INTRODUCTION_VA_ELEARNING_DATA: ModuleData = {
  id: 34, nom: "1.INTRODUCTION VA E-LEARNING", description: "Introduction passerelle VA (e-learning).",
  cours: [
    { id: 0, titre: "Test de compétences avant formation", description: "Répondez aux questions.", actif: true, checklistType: "competences" },
    { id: 100, titre: "Analyse du besoin – Fiche client", description: "Complétez cette fiche.", actif: true, checklistType: "analyse-besoin" },
    { id: 101, titre: "Questionnaire Projet Professionnel", description: "Évaluation de votre motivation et de votre projet professionnel.", actif: true, checklistType: "projet-professionnel" },
    { id: 102, titre: "Conditions Générales de Vente", description: "Veuillez lire et accepter les CGV avant de continuer.", actif: true, checklistType: "cgv" },
    { id: 1, titre: "Bienvenue — Passerelle VA (E-learning)", description: "Formation passerelle VTC en e-learning.\n\n2 matières : Développement Commercial + Réglementation spécifique VTC\n\n💰 Frais d'examen en cas d'échec :\n• Examen théorique : environ 240€\n• Examen pratique : environ 200€", actif: true },
    { id: 2, titre: "Contenu de l'examen — Épreuves spécifiques VTC", description: `L'examen passerelle VA se compose de 2 épreuves théoriques d'admissibilité (QCM + QRC) et d'une épreuve pratique d'admission.

📝 ÉPREUVES SPÉCIFIQUES VTC :

F(V) — Développement commercial et gestion propre à l'activité de VTC
   Durée : 30 min | Note sur 20 | Coeff. 3 | Éliminatoire : 6/20

G(V) — Réglementation nationale spécifique à l'activité de VTC
   Durée : 20 min | Note sur 20 | Coeff. 3 | Éliminatoire : 6/20

✅ CONDITIONS D'ADMISSIBILITÉ :
• Moyenne ≥ 10/20 (pondérée des coefficients)
• Aucune note éliminatoire

Un candidat admissible peut se présenter 3 fois à l'épreuve pratique dans un délai d'1 an.`, actif: true },
    { id: 6, titre: "Programme de formation VA", description: `📋 PROGRAMME — Passerelle VTC pour TAXI (E-learning)

📗 F(V) — DÉVELOPPEMENT COMMERCIAL
• Marketing : analyse de marché, ciblage, compétitivité, prix
• Valorisation prestation VTC, fidélisation, prospection
• Communication (internet, numérique), réseau de partenaires

📗 G(V) — RÉGLEMENTATION SPÉCIFIQUE VTC
• Inscription registre VTC, capacité financière
• Obligations véhicules (dimensions, puissance, âge, signalisation)
• Documents de prestation pour les contrôles`, actif: true },
    { id: 5, titre: "L'épreuve d'admission (pratique)", description: `L'épreuve pratique comprend une phase de conduite en circulation d'une durée minimum de 20 minutes, notée sur 20 points.

📌 Note minimale requise : 12/20

💰 En cas d'échec à l'examen pratique :
• Frais d'examen CMA à la charge de l'élève : environ 200€
• Frais de location de voiture à la charge de l'élève : environ 80€`, actif: true },
    { id: 3, titre: "Contact", description: "🏢 FTRANSPORT — 86 Route de Genas, 69003 Lyon\n📞 04 28 29 60 91\n📧 contact@ftransport.fr", actif: true },
  ],
  exercices: [
    { id: 1, titre: "Quiz Coefficients VA", sousTitre: "Connaissez-vous les coefficients de vos épreuves passerelle ?", actif: true, questions: [
      { id: 1, enonce: "Combien de matières comporte l'examen passerelle VA ?", choix: [{ lettre: "A", texte: "2 matières", correct: true }, { lettre: "B", texte: "5 matières" }, { lettre: "C", texte: "7 matières" }] },
      { id: 2, enonce: "Quel est le coefficient de l'épreuve F(V) — Développement commercial ?", choix: [{ lettre: "A", texte: "1" }, { lettre: "B", texte: "2" }, { lettre: "C", texte: "3", correct: true }, { lettre: "D", texte: "4" }] },
      { id: 3, enonce: "Quel est le coefficient de l'épreuve G(V) — Réglementation spécifique VTC ?", choix: [{ lettre: "A", texte: "1" }, { lettre: "B", texte: "2" }, { lettre: "C", texte: "3", correct: true }, { lettre: "D", texte: "4" }] },
      { id: 4, enonce: "Quelle note minimale faut-il obtenir à l'épreuve théorique ?", choix: [{ lettre: "A", texte: "8/20" }, { lettre: "B", texte: "10/20", correct: true }, { lettre: "C", texte: "12/20" }] },
    ] },
  ],
};

// ===== Données initiales des modules PRATIQUE =====
const PRATIQUE_TAXI_DATA: ModuleData = {
  id: 6,
  nom: "8.PRATIQUE TAXI",
  description: "Cours et exercices pour la préparation à l'épreuve pratique TAXI — Déroulement de l'examen, lieux touristiques de Lyon, facturation et relation client.",
  cours: [
    { id: 1, titre: "1. Grille de notation de l'épreuve pratique TAXI", sousTitre: "Barème : Parcours (2pts), Sécurité/Conduite (10pts), Relation client (5pts), Facturation (3pts) — Note min. 12/20", description: "L'épreuve pratique comprend une phase de conduite en circulation d'une durée minimum de 20 minutes, notée sur 20 points. Est déclaré reçu le candidat ayant obtenu au moins 12/20.", actif: true },
    { id: 2, titre: "2. Déroulement de l'épreuve pratique TAXI", sousTitre: "Accueil des jurys, tirage au sort de la destination, taximètre, parcours aller-retour, prise de congé", description: "1) Arrangements techniques. 2) Accueil des jurys. 3) Présentation carte grise et assurance. 4) Tirage au sort destination. 5) Démarrage taximètre et GPS (6 min max). 6) Parcours aller-retour. 7) Facturation et prise de congé.", actif: true },
    { id: 3, titre: "3. Monuments historiques de Lyon", sousTitre: "Cathédrale St Jean, Basilique de Fourvière, Église St Georges", image: imgCathedraleStJean, description: "• Cathédrale St Jean (1480) — Vieux Lyon, 5e arr., près du funiculaire de Fourvière.\n• Basilique de Fourvière (1886) — Patrimoine mondial UNESCO 1998, surplombe la ville.\n• Église St Georges (1848) — Vieux Lyon, entre Quarantaine et St-Jean.", actif: true },
    { id: 4, titre: "4. Places et bâtiments remarquables", sousTitre: "Place Bellecour, Palais de Justice, Place des Terreaux, Opéra, Hôtel de Ville", image: imgPlaceBellecour, description: "• Place Bellecour — 5e plus grande place de France, statue de Louis XIV.\n• Palais de Justice (1835) — 5e arr., « Palais des 24 colonnes ».\n• Place des Terreaux — 1er arr., fontaine Bartholdi.\n• Opéra de Lyon (1831) — restructuré par Jean Nouvel (1993).\n• Hôtel de Ville — entre Place des Terreaux et Place de la Comédie.", actif: true },
    { id: 5, titre: "5. Tours et architecture moderne", sousTitre: "Tour Part-Dieu (le crayon, 165m), Tour Oxygène (117m), Tour Incity (la gomme, 202m)", image: imgTourIncity, description: "• Tour Part-Dieu « le crayon » — 42 étages, 165m, ouverte depuis 1977.\n• Tour Oxygène — 28 niveaux, 117m, inaugurée en 2010.\n• Tour Incity « la gomme » — 39 étages, 202m, 3e plus haut gratte-ciel de France, inaugurée en 2016.", actif: true },
    { id: 6, titre: "6. Fresques et personnalités lyonnaises", sousTitre: "Fresque des Lyonnais, Mur des Canuts, Mur du cinéma — Paul Bocuse, Frères Lumière", image: imgFresqueLyonnais, description: "• Fresque des Lyonnais — 800m², 30 personnages, 2 rue de la Martinière 69001.\n• Mur des Canuts — 36 Bd des Canuts 69004, plus grand d'Europe (1200m²).\n• Mur du cinéma — Place Gabriel Péri 69007.\n• Paul Bocuse — 3 étoiles Michelin 53 ans.\n• Frères Lumière — pionniers du cinéma.\n• Tony Garnier — architecte urbaniste.", actif: true },
    { id: 7, titre: "7. Parcs et châteaux", sousTitre: "Parc de la Tête d'Or, Parc Blandan, Parc de Parilly, Parc de Gerland", image: imgParcTeteDor, description: "• Parc de la Tête d'Or (117 ha) — zoo, jardin botanique, vélodrome, Guignol.\n• Parc Blandan — skate park, carousel, jeux enfants.\n• Parc de Parilly — hippodrome, stade d'athlétisme, 10 terrains de foot.\n• Château de la Motte — 7e arr., motte castrale.\n• Fort St Jean — 1er arr., première ceinture.\n• Domaine de la Bachasse — Sainte-Foy-lès-Lyon.", actif: true },
    { id: 8, titre: "8. Spécialités culinaires et restaurants", sousTitre: "Quenelle, Cervelle de canut, Tablier de sapeur, Bugnes, Bouchons lyonnais", image: imgQuenelle, description: "• Quenelle — semoule de blé dur, beurre, œufs, lait.\n• Cervelle de canut — fromage blanc, herbes, échalote.\n• Tablier de sapeur — gras-double (estomac de bœuf).\n• Bugnes, Coussins lyonnais, Tarte praline.\n• Brasserie Georges (2e, cours Verdun) — fruits de mer, choucroute.\n• Bouchons lyonnais — restaurants typiques (Le Mercière, Aux Trois Maries).", actif: true },
    { id: 9, titre: "9. Facturation et taximètre", sousTitre: "Compteur horokilométrique, sélection du tarif, suppléments, terminal de paiement", description: "Utilisation du compteur horokilométrique, sélection du tarif approprié, établissement de la facturation avec suppléments, terminal de paiement électronique. Note de course obligatoire à partir de 25€ TTC.", actif: true },
    { id: 10, titre: "10. Conseils pratiques pour le jour de l'examen", sousTitre: "Tenue vestimentaire, GPS, gestion du feu orange, comportement neutre", description: "• Tenue élégante (pas de baskets/casquettes).\n• GPS sur téléphone (Waze/Maps), tester avant l'examen.\n• Feu orange : s'arrêter sauf danger pour véhicules suivants.\n• Rester poli, courtois, neutre (pas d'opinions politiques/religieuses).\n• « Je ne sais pas mais je peux me renseigner » si question inconnue.", actif: true },
  ],
  exercices: [
    {
      id: 100, titre: "Épreuve pratique — Barème et déroulement", actif: true,
      questions: [
        { id: 1, enonce: "Quelle est la note minimale requise pour être reçu à l'épreuve pratique TAXI ?", choix: [{ lettre: "A", texte: "10/20" }, { lettre: "B", texte: "12/20", correct: true }, { lettre: "C", texte: "14/20" }, { lettre: "D", texte: "8/20" }] },
        { id: 2, enonce: "Combien de points sont attribués à la 'Préparation et réalisation du parcours' ?", choix: [{ lettre: "A", texte: "5 points" }, { lettre: "B", texte: "2 points", correct: true }, { lettre: "C", texte: "3 points" }, { lettre: "D", texte: "10 points" }] },
        { id: 3, enonce: "Combien de temps avez-vous pour actionner le taximètre, GPS et montrer les points sur la carte ?", choix: [{ lettre: "A", texte: "3 minutes" }, { lettre: "B", texte: "10 minutes" }, { lettre: "C", texte: "6 minutes", correct: true }, { lettre: "D", texte: "8 minutes" }] },
        { id: 4, enonce: "Que devez-vous présenter aux jurys avant de démarrer ?", choix: [{ lettre: "A", texte: "Le permis de conduire uniquement" }, { lettre: "B", texte: "La carte grise et l'assurance du véhicule", correct: true }, { lettre: "C", texte: "La carte professionnelle" }] },
        { id: 5, enonce: "Combien de points sont attribués à la 'Sécurité et souplesse de la conduite' ?", choix: [{ lettre: "A", texte: "5 points" }, { lettre: "B", texte: "10 points", correct: true }, { lettre: "C", texte: "8 points" }] },
        { id: 6, enonce: "Combien de points pour la 'Facturation et utilisation des équipements spéciaux' ?", choix: [{ lettre: "A", texte: "5 points" }, { lettre: "B", texte: "2 points" }, { lettre: "C", texte: "3 points", correct: true }] },
        { id: 7, enonce: "Si vous dépassez les 6 minutes de préparation, que risquez-vous ?", choix: [{ lettre: "A", texte: "Pénalité de 2 points" }, { lettre: "B", texte: "Élimination", correct: true }, { lettre: "C", texte: "Rien de particulier" }] },
      ]
    },
    {
      id: 101, titre: "Relation client et questions touristiques", actif: true,
      questions: [
        { id: 1, enonce: "Que faire si vous ne connaissez pas la réponse à une question touristique ?", choix: [{ lettre: "A", texte: "Inventer une réponse" }, { lettre: "B", texte: "Dire 'Je ne sais pas mais je peux me renseigner'", correct: true }, { lettre: "C", texte: "Ne rien dire" }] },
        { id: 2, enonce: "Avez-vous le droit de prendre un client hélé à moins de 50m d'une station taxi ?", choix: [{ lettre: "A", texte: "Oui, toujours" }, { lettre: "B", texte: "Non", correct: true }, { lettre: "C", texte: "Oui, si la station est vide" }] },
        { id: 3, enonce: "À partir de quel montant la note de course TAXI est-elle obligatoire ?", choix: [{ lettre: "A", texte: "15,24 €" }, { lettre: "B", texte: "25 € TTC", correct: true }, { lettre: "C", texte: "10 €" }] },
        { id: 4, enonce: "Un chauffeur taxi a-t-il l'obligation de détenir un siège enfant dans son véhicule ?", choix: [{ lettre: "A", texte: "Oui" }, { lettre: "B", texte: "Non", correct: true }, { lettre: "C", texte: "Oui, seulement la nuit" }] },
        { id: 5, enonce: "Qu'est-ce qu'un bouchon lyonnais ?", choix: [{ lettre: "A", texte: "Un embouteillage typique de Lyon" }, { lettre: "B", texte: "Un restaurant typique avec spécialités locales", correct: true }, { lettre: "C", texte: "Un bar à vins" }] },
        { id: 6, enonce: "Quel moyen de transport permet d'aller à l'aéroport de Lyon ?", choix: [{ lettre: "A", texte: "Le Rhône Express", correct: true }, { lettre: "B", texte: "Le TGV" }, { lettre: "C", texte: "Le tramway T4" }] },
        { id: 7, enonce: "Quelle est la spécialité de la Brasserie Georges ?", choix: [{ lettre: "A", texte: "Pizza et pâtes" }, { lettre: "B", texte: "Fruits de mer et choucroute", correct: true }, { lettre: "C", texte: "Cuisine asiatique" }] },
      ]
    },
    {
      id: 102, titre: "Monuments et lieux de Lyon", actif: true,
      questions: [
        { id: 1, enonce: "En quelle année la Cathédrale Saint-Jean a-t-elle été achevée ?", choix: [{ lettre: "A", texte: "1200" }, { lettre: "B", texte: "1480", correct: true }, { lettre: "C", texte: "1650" }] },
        { id: 2, enonce: "Dans quel arrondissement est situé le Vieux Lyon ?", choix: [{ lettre: "A", texte: "1er" }, { lettre: "B", texte: "5ème", correct: true }, { lettre: "C", texte: "3ème" }] },
        { id: 3, enonce: "Quel surnom donne-t-on à la Tour Part-Dieu ?", choix: [{ lettre: "A", texte: "La gomme" }, { lettre: "B", texte: "Le crayon", correct: true }, { lettre: "C", texte: "La fusée" }] },
        { id: 4, enonce: "Quelle est la hauteur de la Tour Incity ?", choix: [{ lettre: "A", texte: "165 mètres" }, { lettre: "B", texte: "117 mètres" }, { lettre: "C", texte: "202 mètres", correct: true }] },
        { id: 5, enonce: "Quelle fontaine se trouve sur la Place des Terreaux ?", choix: [{ lettre: "A", texte: "Fontaine de Trévi" }, { lettre: "B", texte: "Fontaine Bartholdi", correct: true }, { lettre: "C", texte: "Fontaine Médicis" }] },
        { id: 6, enonce: "La Place Bellecour est la combientième plus grande place de France ?", choix: [{ lettre: "A", texte: "3ème" }, { lettre: "B", texte: "5ème", correct: true }, { lettre: "C", texte: "1ère" }] },
        { id: 7, enonce: "Le Musée des Confluences a été inauguré en quelle année ?", choix: [{ lettre: "A", texte: "2010" }, { lettre: "B", texte: "2014", correct: true }, { lettre: "C", texte: "2018" }] },
      ]
    },
  ],
};

const PRATIQUE_VTC_DATA: ModuleData = {
  id: 8,
  nom: "7.PRATIQUE VTC",
  description: "Cours et exercices pour la préparation à l'épreuve pratique VTC — Déroulement de l'examen, devis et facturation, lieux touristiques de Lyon, relation client.",
  cours: [
    { id: 1, titre: "1. Grille de notation de l'épreuve pratique VTC", sousTitre: "Barème : Parcours (2pts), Sécurité/Conduite (10pts), Relation client (5pts), Facturation (3pts) — Note min. 12/20", description: "L'épreuve pratique comprend une phase de conduite en circulation d'une durée minimum de 20 minutes, notée sur 20 points. Est déclaré reçu le candidat ayant obtenu au moins 12/20.", actif: true },
    { id: 2, titre: "2. Déroulement de l'épreuve pratique VTC", sousTitre: "Accueil des jurys, tirage au sort, devis, parcours, facture, prise de congé", description: "1) Arrangements techniques. 2) Accueil des jurys. 3) Présentation carte grise et assurance. 4) Tirage au sort destination. 5) Réalisation du devis (transfert ou mise à disposition) + GPS (6 min max). 6) Signature du devis par le client. 7) Parcours aller-retour. 8) Facturation et prise de congé.", actif: true },
    { id: 3, titre: "3. Monuments historiques de Lyon", sousTitre: "Cathédrale St Jean, Basilique de Fourvière, Église St Georges", image: imgCathedraleStJean, description: "• Cathédrale St Jean (1480) — Vieux Lyon, 5e arr., près du funiculaire de Fourvière.\n• Basilique de Fourvière (1886) — Patrimoine mondial UNESCO 1998, surplombe la ville.\n• Église St Georges (1848) — Vieux Lyon, entre Quarantaine et St-Jean.", actif: true },
    { id: 4, titre: "4. Places et bâtiments remarquables", sousTitre: "Place Bellecour, Palais de Justice, Place des Terreaux, Opéra, Hôtel de Ville", image: imgPlaceTerreaux, description: "• Place Bellecour — 5e plus grande place de France, statue de Louis XIV.\n• Palais de Justice (1835) — 5e arr., « Palais des 24 colonnes ».\n• Place des Terreaux — 1er arr., fontaine Bartholdi.\n• Opéra de Lyon (1831) — restructuré par Jean Nouvel (1993).\n• Hôtel de Ville — entre Place des Terreaux et Place de la Comédie.\n• Hôtel-Dieu — premier hôpital lyonnais (1184), aujourd'hui InterContinental.\n• Musée des Confluences — inauguré en 2014.", actif: true },
    { id: 5, titre: "5. Tours et architecture moderne", sousTitre: "Tour Part-Dieu (le crayon, 165m), Tour Oxygène (117m), Tour Incity (la gomme, 202m)", image: imgTourOxygene, description: "• Tour Part-Dieu « le crayon » — 42 étages, 165m, ouverte depuis 1977.\n• Tour Oxygène — 28 niveaux, 117m, inaugurée en 2010.\n• Tour Incity « la gomme » — 39 étages, 202m, 3e plus haut gratte-ciel de France, inaugurée en 2016.", actif: true },
    { id: 6, titre: "6. Fresques et personnalités lyonnaises", sousTitre: "Fresque des Lyonnais, Mur des Canuts — Paul Bocuse, Frères Lumière", image: imgMurCanuts, description: "• Fresque des Lyonnais — 800m², 30 personnages, 2 rue de la Martinière 69001.\n• Mur des Canuts — 36 Bd des Canuts 69004, plus grand d'Europe (1200m²).\n• Paul Bocuse — 3 étoiles Michelin 53 ans.\n• Frères Lumière — pionniers du cinéma.\n• Tony Garnier — architecte urbaniste.", actif: true },
    { id: 7, titre: "7. Parcs et châteaux", sousTitre: "Parc de la Tête d'Or, Parc Blandan, Parc de Parilly, Châteaux", image: imgParcBlandan, description: "• Parc de la Tête d'Or (117 ha) — zoo, jardin botanique, vélodrome, Guignol.\n• Parc Blandan — skate park, carousel, jeux enfants.\n• Parc de Parilly — hippodrome, stade d'athlétisme.\n• Château de la Motte — 7e arr.\n• Fort St Jean — 1er arr.\n• Domaine de la Bachasse — Sainte-Foy-lès-Lyon.", actif: true },
    { id: 8, titre: "8. Spécialités culinaires et restaurants", sousTitre: "Quenelle, Cervelle de canut, Tablier de sapeur, Bugnes, Bouchons lyonnais", image: imgBrasserieGeorges, description: "• Quenelle — semoule de blé dur, beurre, œufs, lait.\n• Cervelle de canut — fromage blanc, herbes, échalote.\n• Tablier de sapeur — gras-double.\n• Bugnes, Coussins lyonnais, Tarte praline.\n• Brasserie Georges (2e, cours Verdun) — fruits de mer, choucroute.\n• Bouchons lyonnais — restaurants typiques.", actif: true },
    { id: 9, titre: "9. Devis et facturation VTC", sousTitre: "Transfert vs Mise à disposition, calcul TVA 10%, signature du devis", description: "• Transfert (A→B) : prix forfaitaire HT + TVA 10%.\n• Mise à disposition : tarif horaire.\n• Minimum 10€ HT (11€ TTC).\n• Faire signer le devis par le client avant de démarrer.\n• Facture à établir à l'arrivée.", actif: true },
    { id: 10, titre: "10. Conseils pratiques pour le jour de l'examen", sousTitre: "Tenue vestimentaire, GPS, gestion du feu orange, comportement neutre", description: "• Tenue élégante (pas de baskets/casquettes).\n• GPS sur téléphone (Waze/Maps), tester avant l'examen.\n• Feu orange : s'arrêter sauf danger pour véhicules suivants.\n• Rester poli, courtois, neutre.\n• Bien écrire le point de départ de la facturation sur le devis.\n• À destination : retourner au siège ou stationner hors chaussée.", actif: true },
  ],
  exercices: [
    {
      id: 200, titre: "Épreuve pratique — Barème et déroulement VTC", actif: true,
      questions: [
        { id: 1, enonce: "Quelle est la note minimale requise pour être reçu à l'épreuve pratique VTC ?", choix: [{ lettre: "A", texte: "10/20" }, { lettre: "B", texte: "12/20", correct: true }, { lettre: "C", texte: "14/20" }] },
        { id: 2, enonce: "Combien de temps avez-vous pour faire le devis, GPS et montrer les points sur la carte ?", choix: [{ lettre: "A", texte: "3 minutes" }, { lettre: "B", texte: "6 minutes", correct: true }, { lettre: "C", texte: "10 minutes" }] },
        { id: 3, enonce: "Que devez-vous présenter aux jurys avant de démarrer ?", choix: [{ lettre: "A", texte: "Le permis uniquement" }, { lettre: "B", texte: "La carte grise et l'assurance du véhicule", correct: true }, { lettre: "C", texte: "La carte professionnelle" }] },
        { id: 4, enonce: "Quel document devez-vous faire signer au client avant de démarrer la course VTC ?", choix: [{ lettre: "A", texte: "Un contrat de transport" }, { lettre: "B", texte: "Le devis", correct: true }, { lettre: "C", texte: "Aucun document" }] },
        { id: 5, enonce: "Si vous dépassez les 6 minutes de préparation, que risquez-vous ?", choix: [{ lettre: "A", texte: "Pénalité de 2 points" }, { lettre: "B", texte: "Élimination", correct: true }, { lettre: "C", texte: "Rien" }] },
        { id: 6, enonce: "Combien de points pour la 'Sécurité et souplesse de la conduite' ?", choix: [{ lettre: "A", texte: "5 points" }, { lettre: "B", texte: "10 points", correct: true }, { lettre: "C", texte: "8 points" }] },
        { id: 7, enonce: "Combien de points pour 'Qualité de la prise en charge et relation client' ?", choix: [{ lettre: "A", texte: "5 points", correct: true }, { lettre: "B", texte: "3 points" }, { lettre: "C", texte: "8 points" }] },
      ]
    },
    {
      id: 201, titre: "Devis, facturation et relation client VTC", actif: true,
      questions: [
        { id: 1, enonce: "Quel est le taux de TVA applicable pour une prestation VTC ?", choix: [{ lettre: "A", texte: "20%" }, { lettre: "B", texte: "10%", correct: true }, { lettre: "C", texte: "5,5%" }] },
        { id: 2, enonce: "Que faites-vous une fois arrivé à destination en tant que VTC ?", choix: [{ lettre: "A", texte: "Je reste sur la chaussée en attente" }, { lettre: "B", texte: "Je retourne au siège ou stationne hors chaussée", correct: true }, { lettre: "C", texte: "Je cherche d'autres clients" }] },
        { id: 3, enonce: "Que faire si le client ne paie pas ?", choix: [{ lettre: "A", texte: "Appeler la police" }, { lettre: "B", texte: "Injonction de payer devant le tribunal d'instance", correct: true }, { lettre: "C", texte: "Refuser de le laisser sortir" }] },
        { id: 4, enonce: "Quel est le montant minimum pour un devis VTC (HT) ?", choix: [{ lettre: "A", texte: "5 €" }, { lettre: "B", texte: "10 €", correct: true }, { lettre: "C", texte: "15 €" }] },
        { id: 5, enonce: "Quelles précautions pour transporter un enfant de 9 mois à 4 ans ?", choix: [{ lettre: "A", texte: "Ceinture classique" }, { lettre: "B", texte: "Siège auto adapté à l'arrière face à la route", correct: true }, { lettre: "C", texte: "Pas de précaution" }] },
        { id: 6, enonce: "Quelles précautions pour transporter un animal de compagnie ?", choix: [{ lettre: "A", texte: "Aucune précaution" }, { lettre: "B", texte: "Ceinture de sécurité ou caisse de transport", correct: true }, { lettre: "C", texte: "Refuser le transport" }] },
        { id: 7, enonce: "Que faire si vous ne connaissez pas la réponse à une question touristique ?", choix: [{ lettre: "A", texte: "Inventer" }, { lettre: "B", texte: "Dire 'Je ne sais pas mais je peux me renseigner'", correct: true }, { lettre: "C", texte: "Ignorer la question" }] },
      ]
    },
    {
      id: 202, titre: "Monuments et lieux de Lyon", actif: true,
      questions: [
        { id: 1, enonce: "En quelle année la Cathédrale Saint-Jean a-t-elle été achevée ?", choix: [{ lettre: "A", texte: "1200" }, { lettre: "B", texte: "1480", correct: true }, { lettre: "C", texte: "1650" }] },
        { id: 2, enonce: "Quel surnom donne-t-on à la Tour Part-Dieu ?", choix: [{ lettre: "A", texte: "La gomme" }, { lettre: "B", texte: "Le crayon", correct: true }, { lettre: "C", texte: "La fusée" }] },
        { id: 3, enonce: "La Place Bellecour est la combientième plus grande place de France ?", choix: [{ lettre: "A", texte: "3ème" }, { lettre: "B", texte: "5ème", correct: true }, { lettre: "C", texte: "1ère" }] },
        { id: 4, enonce: "Quelle fontaine se trouve Place des Terreaux ?", choix: [{ lettre: "A", texte: "Fontaine de Trévi" }, { lettre: "B", texte: "Fontaine Bartholdi", correct: true }, { lettre: "C", texte: "Fontaine Médicis" }] },
        { id: 5, enonce: "Le Musée des Confluences a été inauguré en quelle année ?", choix: [{ lettre: "A", texte: "2010" }, { lettre: "B", texte: "2014", correct: true }, { lettre: "C", texte: "2018" }] },
        { id: 6, enonce: "Qu'est-ce qu'un bouchon lyonnais ?", choix: [{ lettre: "A", texte: "Un embouteillage" }, { lettre: "B", texte: "Un restaurant typique avec spécialités locales", correct: true }, { lettre: "C", texte: "Un bar à vins" }] },
        { id: 7, enonce: "Quel moyen de transport permet d'aller à l'aéroport de Lyon ?", choix: [{ lettre: "A", texte: "Le Rhône Express", correct: true }, { lettre: "B", texte: "Le TGV" }, { lettre: "C", texte: "Le tramway T4" }] },
      ]
    },
  ],
};

// ===== Données initiales du module CAS PRATIQUE TAXI =====
const CAS_PRATIQUE_TAXI_DATA: ModuleData = {
  id: 12,
  nom: "9.CAS PRATIQUE TAXI",
  description: "Exercices de mise en situation : calcul de courses taxi avec tarifs, suppléments, réservation et bagages. 10 cas pratiques sous forme de QCM.",
  cours: [
    {
      id: 1,
      titre: "📥 Document complet — Cas Pratique Taxi",
      sousTitre: "Téléchargez le document avec tous les cas pratiques de facturation taxi",
      description: "Ce document contient l'ensemble des 10 cas pratiques de facturation taxi avec les tarifs, suppléments, réservations et bagages.",
      actif: true,
      fichiers: [
        { nom: "Cas Pratique Taxi (Word)", url: "/cours/vtc/CAS_PRATIQUE.docx" },
      ],
    },
    {
      id: 2,
      titre: "Précisions importantes",
      description: `Avant de commencer les cas pratiques, retenez bien ces règles :

• Il n'y a PAS de réservation immédiate ou à l'avance lorsque l'on est dans une station ou lorsqu'un client vous hèle.
• Il y a une réservation à l'avance à partir du moment où l'on vous donne une date ou une heure.
• S'il n'y a aucune précision sur la date ou l'heure, c'est qu'il s'agit de la date d'aujourd'hui.

📋 Tarifs de référence :
• Tarif A : 1,00 €/km
• Tarif B : 1,50 €/km  
• Tarif C : 1,47 €/km
• Tarif D : 2,94 €/km (tarifs A ou B × 2, jours fériés/nuit)

• Prise en charge : 3,00 €
• Course minimum : 8,00 €
• Supplément réservation : 4 € (à l'avance) ou 2 € (immédiate)
• Supplément bagage (3e et au-delà) : 2 € par bagage
• Supplément passager (5e et au-delà) : 2 € par personne
• Supplément animal : gratuit`,
      actif: true,
    },
  ],
  exercices: [
    {
      id: 300, titre: "Tarifs de base", actif: true,
      questions: [
        { id: 1, enonce: "Quel est le prix du tarif A ?", choix: [{ lettre: "A", texte: "0,96 €" }, { lettre: "B", texte: "1,00 €", correct: true }, { lettre: "C", texte: "1,34 €" }, { lettre: "D", texte: "1,85 €" }] },
        { id: 2, enonce: "Quel est le prix du tarif B ?", choix: [{ lettre: "A", texte: "1,50 €", correct: true }, { lettre: "B", texte: "1,49 €" }, { lettre: "C", texte: "1,51 €" }, { lettre: "D", texte: "2,58 €" }] },
        { id: 3, enonce: "Quel est le prix du tarif C ?", choix: [{ lettre: "A", texte: "0,78 €" }, { lettre: "B", texte: "1,47 €", correct: true }, { lettre: "C", texte: "1,59 €" }, { lettre: "D", texte: "2,00 €" }] },
        { id: 4, enonce: "Quel est le prix du tarif D ?", choix: [{ lettre: "A", texte: "2,90 €" }, { lettre: "B", texte: "2,91 €" }, { lettre: "C", texte: "3,00 €" }, { lettre: "D", texte: "2,94 €", correct: true }] },
      ]
    },
    {
      id: 301, titre: "Cas n°1 — 1er mai, 16h, réservation la veille, 66 rue Smith → Mairie Lyon 2 (2.3km)", actif: true,
      questions: [
        { id: 1, enonce: "Cas n°1 : 1er mai, 16h, client dans le véhicule, appelé hier soir, 66 rue Smith → Mairie Lyon 2 (2.3 km), 4 bagages dont 2 instruments. Quel tarif appliqué ?", choix: [{ lettre: "A", texte: "Tarif A" }, { lettre: "B", texte: "Tarif B", correct: true }] },
        { id: 2, enonce: "Cas n°1 : Quel est le coût de la réservation ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €", correct: true }, { lettre: "C", texte: "Pas de surplus" }] },
        { id: 3, enonce: "Cas n°1 : Quel est le coût des bagages supplémentaires ?", choix: [{ lettre: "A", texte: "2 €", correct: true }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "Pas de surplus" }] },
        { id: 4, enonce: "Cas n°1 : Quel est le coût total des suppléments (réservation + bagages + passagers) ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "6 €", correct: true }, { lettre: "D", texte: "8 €" }] },
        { id: 5, enonce: "Cas n°1 : Quel est le tarif total de la course ?", choix: [{ lettre: "A", texte: "11,20 €" }, { lettre: "B", texte: "12,20 €" }, { lettre: "C", texte: "15,90 €", correct: true }, { lettre: "D", texte: "17,50 €" }] },
      ]
    },
    {
      id: 302, titre: "Cas n°2 — 15 août, 6h, Hôpital St Foy → 66 rue Smith (6.6km)", actif: true,
      questions: [
        { id: 1, enonce: "Cas n°2 : 15 août, 6h, client demande de le chercher de suite à l'hôpital de St Foy les Lyon → 66 rue Smith (6.6 km), pas de bagages. Quel tarif appliqué ?", choix: [{ lettre: "A", texte: "Tarif A" }, { lettre: "B", texte: "Tarif B" }, { lettre: "C", texte: "Tarif C" }, { lettre: "D", texte: "Tarif D", correct: true }] },
        { id: 2, enonce: "Cas n°2 : Quel est le coût de la réservation ?", choix: [{ lettre: "A", texte: "2 €", correct: true }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "Pas de surplus" }] },
        { id: 3, enonce: "Cas n°2 : Quel est le coût des bagages supplémentaires ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "Pas de surplus", correct: true }] },
        { id: 4, enonce: "Cas n°2 : Quel est le coût total des suppléments ?", choix: [{ lettre: "A", texte: "2 €", correct: true }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "6 €" }, { lettre: "D", texte: "8 €" }] },
        { id: 5, enonce: "Cas n°2 : Quel est le tarif total de la course ?", choix: [{ lettre: "A", texte: "24,80 €", correct: true }, { lettre: "B", texte: "23,97 €" }, { lettre: "C", texte: "24,02 €" }, { lettre: "D", texte: "26,70 €" }] },
      ]
    },
    {
      id: 303, titre: "Cas n°3 — 19h, client hélé, 66 rue Smith → Mairie Oullins A/R (6.4km)", actif: true,
      questions: [
        { id: 1, enonce: "Cas n°3 : 19h, client vous hèle, 1 malle + 1 animal, 66 rue Smith → Mairie Oullins A/R (6.4 km aller simple). Quel tarif appliqué ?", choix: [{ lettre: "A", texte: "Tarif A", correct: true }, { lettre: "B", texte: "Tarif B" }, { lettre: "C", texte: "Tarif C" }, { lettre: "D", texte: "Tarif D" }] },
        { id: 2, enonce: "Cas n°3 : Quel est le coût de la réservation ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "Pas de surplus", correct: true }] },
        { id: 3, enonce: "Cas n°3 : Quel est le coût des bagages supplémentaires ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "Pas de surplus", correct: true }] },
        { id: 4, enonce: "Cas n°3 : Quel est le coût des passagers supplémentaires ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "Pas de surplus", correct: true }] },
        { id: 5, enonce: "Cas n°3 : Quel est le coût total des suppléments ?", choix: [{ lettre: "A", texte: "0 €", correct: true }, { lettre: "B", texte: "2 €" }, { lettre: "C", texte: "4 €" }] },
        { id: 6, enonce: "Cas n°3 : Quel est le tarif total de la course ?", choix: [{ lettre: "A", texte: "6 €" }, { lettre: "B", texte: "20,89 €" }, { lettre: "C", texte: "22,20 €", correct: true }, { lettre: "D", texte: "22,77 €" }] },
      ]
    },
    {
      id: 304, titre: "Cas n°4 — 24 déc, 23h50, appel immédiat, 66 rue Smith → Stade Gerland (3.1km)", actif: true,
      questions: [
        { id: 1, enonce: "Cas n°4 : 24 décembre, 23h50, on vous appelle pour emmener 5 personnes + 5 bagages au Stade de Gerland tout de suite (3.1 km). Quel tarif appliqué ?", choix: [{ lettre: "A", texte: "Tarif A" }, { lettre: "B", texte: "Tarif B", correct: true }] },
        { id: 2, enonce: "Cas n°4 : Quel est le coût de la réservation ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "Pas de surplus", correct: true }] },
        { id: 3, enonce: "Cas n°4 : Quel est le coût des bagages supplémentaires ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €", correct: true }, { lettre: "C", texte: "Pas de surplus" }] },
        { id: 4, enonce: "Cas n°4 : Quel est le coût des passagers supplémentaires ?", choix: [{ lettre: "A", texte: "3 €" }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "Pas de surplus" }] },
        { id: 5, enonce: "Cas n°4 : Quel est le coût total des suppléments ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "3 €" }, { lettre: "C", texte: "6 €", correct: true }, { lettre: "D", texte: "8 €" }] },
        { id: 6, enonce: "Cas n°4 : Quel est le tarif total de la course ?", choix: [{ lettre: "A", texte: "13,77 €" }, { lettre: "B", texte: "14,74 €" }, { lettre: "C", texte: "15,88 €" }, { lettre: "D", texte: "18,30 €", correct: true }] },
      ]
    },
    {
      id: 305, titre: "Cas n°5 — 15 fév, 16h, station, neige, 2 pers + 10 bagages → Hôpital St Luc A/R (3.5km)", actif: true,
      questions: [
        { id: 1, enonce: "Cas n°5 : 15 février, 16h, neige, station, 2 personnes + 10 bagages → Hôpital St Luc St Joseph A/R (3.5 km aller). Quel tarif appliqué ?", choix: [{ lettre: "A", texte: "Tarif A" }, { lettre: "B", texte: "Tarif B", correct: true }, { lettre: "C", texte: "Tarif C" }, { lettre: "D", texte: "Tarif D" }] },
        { id: 2, enonce: "Cas n°5 : Quel est le coût de la réservation ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "Pas de surplus", correct: true }] },
        { id: 3, enonce: "Cas n°5 : Quel est le coût des bagages supplémentaires ?", choix: [{ lettre: "A", texte: "6 €" }, { lettre: "B", texte: "8 €", correct: true }, { lettre: "C", texte: "Pas de surplus" }] },
        { id: 4, enonce: "Cas n°5 : Quel est le coût des passagers supplémentaires ?", choix: [{ lettre: "A", texte: "3 €" }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "Pas de surplus", correct: true }] },
        { id: 5, enonce: "Cas n°5 : Quel est le coût total des suppléments ?", choix: [{ lettre: "A", texte: "8 €", correct: true }, { lettre: "B", texte: "10 €" }, { lettre: "C", texte: "12 €" }, { lettre: "D", texte: "14 €" }] },
        { id: 6, enonce: "Cas n°5 : Quel est le tarif total de la course ?", choix: [{ lettre: "A", texte: "21,50 €", correct: true }, { lettre: "B", texte: "21,51 €" }, { lettre: "C", texte: "22,14 €" }, { lettre: "D", texte: "23,98 €" }] },
      ]
    },
    {
      id: 306, titre: "Cas n°6 — 1er nov, 14h, appel, 6 pers, Mairie 5e → 66 rue Smith (4.7km)", actif: true,
      questions: [
        { id: 1, enonce: "Cas n°6 : 1er novembre, 14h, on vous appelle pour 6 personnes sans bagages, Mairie du 5e → 66 rue Smith (4.7 km). Quel tarif appliqué ?", choix: [{ lettre: "A", texte: "Tarif A" }, { lettre: "B", texte: "Tarif B" }, { lettre: "C", texte: "Tarif C" }, { lettre: "D", texte: "Tarif D", correct: true }] },
        { id: 2, enonce: "Cas n°6 : Quel est le coût de la réservation ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €", correct: true }, { lettre: "C", texte: "Pas de surplus" }] },
        { id: 3, enonce: "Cas n°6 : Quel est le coût des bagages supplémentaires ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "Pas de surplus", correct: true }] },
        { id: 4, enonce: "Cas n°6 : Quel est le coût des passagers supplémentaires ?", choix: [{ lettre: "A", texte: "4 €", correct: true }, { lettre: "B", texte: "2 €" }, { lettre: "C", texte: "Pas de surplus" }] },
        { id: 5, enonce: "Cas n°6 : Quel est le coût total des suppléments ?", choix: [{ lettre: "A", texte: "8 €" }, { lettre: "B", texte: "10 €" }, { lettre: "C", texte: "12 €", correct: true }] },
        { id: 6, enonce: "Cas n°6 : Quel est le tarif total de la course ?", choix: [{ lettre: "A", texte: "24,88 €" }, { lettre: "B", texte: "25,87 €" }, { lettre: "C", texte: "29,10 €", correct: true }, { lettre: "D", texte: "27,28 €" }] },
      ]
    },
    {
      id: 307, titre: "Cas n°7 — 12 juil, 17h, appel, 66 rue Smith → Aéroport St Exupéry (24km)", actif: true,
      questions: [
        { id: 1, enonce: "Cas n°7 : 12 juillet, 17h, on vous appelle pour 1 personne sans bagages, 66 rue Smith → Aéroport Lyon St Exupéry (24 km). Quel tarif appliqué ?", choix: [{ lettre: "A", texte: "Tarif A" }, { lettre: "B", texte: "Tarif B", correct: true }, { lettre: "C", texte: "Tarif C" }, { lettre: "D", texte: "Tarif D" }] },
        { id: 2, enonce: "Cas n°7 : Quel est le coût de la réservation ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €", correct: true }, { lettre: "C", texte: "6 €" }, { lettre: "D", texte: "8 €" }] },
        { id: 3, enonce: "Cas n°7 : Quel est le coût des bagages supplémentaires ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "Pas de surplus", correct: true }] },
        { id: 4, enonce: "Cas n°7 : Quel est le coût des passagers supplémentaires ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "Pas de surplus", correct: true }] },
        { id: 5, enonce: "Cas n°7 : Quel est le coût total des suppléments ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €", correct: true }, { lettre: "C", texte: "Pas de surplus" }] },
        { id: 6, enonce: "Cas n°7 : Quel est le tarif total de la course ?", choix: [{ lettre: "A", texte: "51 €" }, { lettre: "B", texte: "55 €", correct: true }, { lettre: "C", texte: "54,47 €" }, { lettre: "D", texte: "55,87 €" }] },
      ]
    },
    {
      id: 308, titre: "Cas n°8 — Gare Part-Dieu, 3 pers + 3 bagages → Guillotière (2.4km)", actif: true,
      questions: [
        { id: 1, enonce: "Cas n°8 : Gare Part-Dieu, 3 personnes + 3 bagages entrent dans le véhicule → quartier Guillotière (2.4 km). Quel tarif appliqué ?", choix: [{ lettre: "A", texte: "Tarif A", correct: true }, { lettre: "B", texte: "Tarif B" }, { lettre: "C", texte: "Tarif C" }, { lettre: "D", texte: "Tarif D" }] },
        { id: 2, enonce: "Cas n°8 : Quel est le coût de la réservation ?", choix: [{ lettre: "A", texte: "0 €", correct: true }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "6 €" }, { lettre: "D", texte: "8 €" }] },
        { id: 3, enonce: "Cas n°8 : Quel est le coût des passagers supplémentaires ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "Pas de surplus", correct: true }] },
        { id: 4, enonce: "Cas n°8 : Quel est le coût des bagages supplémentaires ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "Pas de surplus", correct: true }] },
        { id: 5, enonce: "Cas n°8 : Quel est le coût total des suppléments ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "Pas de surplus", correct: true }] },
        { id: 6, enonce: "Cas n°8 : Quel est le tarif total de la course ?", choix: [{ lettre: "A", texte: "8 €", correct: true }, { lettre: "B", texte: "9,56 €" }, { lettre: "C", texte: "9,54 €" }, { lettre: "D", texte: "10,72 €" }] },
      ]
    },
    {
      id: 309, titre: "Cas n°9 — 3 janv, 6h, appel, 5 pers, Gare Perrache → Halles Bocuse (5.6km)", actif: true,
      questions: [
        { id: 1, enonce: "Cas n°9 : 3 janvier, 6h, on vous appelle pour 5 personnes sans bagages, Gare Perrache → Halles Paul Bocuse (5.6 km). Quel tarif appliqué ?", choix: [{ lettre: "A", texte: "Tarif A" }, { lettre: "B", texte: "Tarif B" }, { lettre: "C", texte: "Tarif C" }, { lettre: "D", texte: "Tarif D", correct: true }] },
        { id: 2, enonce: "Cas n°9 : Quel est le coût de la réservation ?", choix: [{ lettre: "A", texte: "2 €", correct: true }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "6 €" }, { lettre: "D", texte: "8 €" }] },
        { id: 3, enonce: "Cas n°9 : Quel est le coût des bagages supplémentaires ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "Pas de surplus", correct: true }] },
        { id: 4, enonce: "Cas n°9 : Quel est le coût des passagers supplémentaires ?", choix: [{ lettre: "A", texte: "3 €" }, { lettre: "B", texte: "4 €", correct: true }, { lettre: "C", texte: "Pas de surplus" }] },
        { id: 5, enonce: "Cas n°9 : Quel est le coût total des suppléments ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "6 €", correct: true }, { lettre: "C", texte: "Pas de surplus" }] },
        { id: 6, enonce: "Cas n°9 : Quel est le tarif total de la course ?", choix: [{ lettre: "A", texte: "25,80 €", correct: true }, { lettre: "B", texte: "24,58 €" }, { lettre: "C", texte: "25,69 €" }, { lettre: "D", texte: "26,88 €" }] },
      ]
    },
    {
      id: 310, titre: "Cas n°10 — 22 juin, 9h, hélé, Gare Part-Dieu → Place Bellecour A/R (2.6km)", actif: true,
      questions: [
        { id: 1, enonce: "Cas n°10 : 22 juin, 9h, client vous hèle à la Gare Part-Dieu → Place Bellecour A/R (2.6 km aller), pas de bagages, il pleut. Quel tarif appliqué ?", choix: [{ lettre: "A", texte: "Tarif A", correct: true }, { lettre: "B", texte: "Tarif B" }, { lettre: "C", texte: "Tarif C" }, { lettre: "D", texte: "Tarif D" }] },
        { id: 2, enonce: "Cas n°10 : Quel est le coût de la réservation ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "6 €" }, { lettre: "D", texte: "Aucun", correct: true }] },
        { id: 3, enonce: "Cas n°10 : Quel est le coût des bagages supplémentaires ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "Pas de surplus", correct: true }] },
        { id: 4, enonce: "Cas n°10 : Quel est le coût des passagers supplémentaires ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "Pas de surplus", correct: true }] },
        { id: 5, enonce: "Cas n°10 : Quel est le coût total des suppléments ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "Pas de surplus", correct: true }] },
        { id: 6, enonce: "Cas n°10 : Quel est le tarif total de la course ?", choix: [{ lettre: "A", texte: "4,89 €" }, { lettre: "B", texte: "8,20 €", correct: true }, { lettre: "C", texte: "8,99 €" }, { lettre: "D", texte: "9,99 €" }] },
      ]
    },
  ],
};

function applyOverridesToResult(data: ModuleData): ModuleData {
  if (data.exercices.length === 0) return data;
  return {
    ...data,
    exercices: applyOverridesToModuleExercices(data.exercices),
  };
}

// All module IDs that contain exercises and could share questions
const ALL_EXERCISE_MODULE_IDS = [
  2, 4, 5, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 27, 28, 29, 30, 39, 40, 41, 42, 43, 64,
];

/**
 * Build initial data for ALL known modules that have exercises.
 * Used for cross-module propagation when creating records for unrecorded modules.
 */
function getAllModulesInitialData(apprenantType?: string | null): ModuleInitialData[] {
  const results: ModuleInitialData[] = [];
  for (const id of ALL_EXERCISE_MODULE_IDS) {
    try {
      const data = getInitialModuleDataRaw({ id, nom: `Module ${id}` }, apprenantType, false);
      if (data.exercices && data.exercices.length > 0) {
        results.push(data as ModuleInitialData);
      }
    } catch {
      // Module may not exist for this apprenant type
    }
  }
  return results;
}

function getInitialModuleData(
  module: { id: number; nom: string },
  apprenantType?: string | null,
  studentOnly = false,
): ModuleData {
  const result = getInitialModuleDataRaw(module, apprenantType, studentOnly);
  // Apply shared overrides so that admin/trainer question edits propagate to all modules
  return applyOverridesToResult(result);
}

function getInitialModuleDataRaw(
  module: { id: number; nom: string },
  apprenantType?: string | null,
  studentOnly = false,
): ModuleData {
  // Module IDs: 1 = INTRODUCTION PRÉSENTIEL, 26 = INTRODUCTION E-LEARNING, 6 = PRATIQUE TAXI, 8 = PRATIQUE VTC, 12 = CAS PRATIQUE TAXI
  if (module.id === 1) return JSON.parse(JSON.stringify(INTRODUCTION_PRESENTIEL_DATA));
  if (module.id === 26) return JSON.parse(JSON.stringify(INTRODUCTION_ELEARNING_DATA));
  if (module.id === 31) return JSON.parse(JSON.stringify(INTRODUCTION_TA_PRESENTIEL_DATA));
  if (module.id === 32) return JSON.parse(JSON.stringify(INTRODUCTION_TA_ELEARNING_DATA));
  if (module.id === 33) return JSON.parse(JSON.stringify(INTRODUCTION_VA_PRESENTIEL_DATA));
  if (module.id === 34) return JSON.parse(JSON.stringify(INTRODUCTION_VA_ELEARNING_DATA));
  if (module.id === 6) return JSON.parse(JSON.stringify(PRATIQUE_TAXI_DATA));
  if (module.id === 8) return JSON.parse(JSON.stringify(PRATIQUE_VTC_DATA));
  if (module.id === 12) return JSON.parse(JSON.stringify(CAS_PRATIQUE_TAXI_DATA));
  if (module.id === 3) return JSON.parse(JSON.stringify(FORMULES_DATA));
  if (module.id === 13) return JSON.parse(JSON.stringify(CONTROLE_CONNAISSANCES_TAXI_DATA));
  if (module.id === 7) return JSON.parse(JSON.stringify(CONNAISSANCES_VILLE_TAXI_DATA));

  // Bilan Exercices VTC (module 4) — toutes les matières
  if (module.id === 4) {
    return {
      id: 4,
      nom: "4.BILAN EXERCICES VTC",
      description: "Tous les exercices regroupés par matière. Refaites-les autant de fois que nécessaire pour maîtriser chaque sujet.",
      cours: [],
      exercices: JSON.parse(JSON.stringify(BILAN_EXERCICES_VTC)),
    };
  }

  // Bilan Exercices Formation Continue VTC (module 81) — sans Gestion
  if (module.id === 81) {
    return {
      id: 81,
      nom: "1.BILAN EXERCICES FORMATION CONTINUE VTC",
      description: "Tous les exercices regroupés par matière (sans Gestion). Refaites-les autant de fois que nécessaire.",
      cours: [],
      exercices: JSON.parse(JSON.stringify(BILAN_EXERCICES_FC_VTC)),
    };
  }

  // Bilan Exercices Formation Continue TAXI (module 82)
  // Matières : T3P + Sécurité Routière + Réglementation Nationale + Locale
  if (module.id === 82) {
    return {
      id: 82,
      nom: "1.BILAN EXERCICES FORMATION CONTINUE TAXI",
      description: "Tous les exercices regroupés par matière (T3P, Sécurité Routière, Réglementation Nationale et Locale). Refaites-les autant de fois que nécessaire.",
      cours: [],
      exercices: JSON.parse(JSON.stringify(BILAN_EXERCICES_FC_TAXI)),
    };
  }

  // QCM 100 QUESTIONS FC TAXI (module 95)
  // T3P + Sécurité Routière + Réglementation Nationale + Développement Commercial
  if (module.id === 95) {
    return {
      id: 95,
      nom: "📝 QCM 100 QUESTIONS FC TAXI",
      description: "QCM de synthèse — 100 questions au total réparties en 4 matières (T3P, Sécurité Routière, Réglementation Nationale, Développement Commercial).",
      cours: [],
      exercices: JSON.parse(JSON.stringify(QCM_100_FC_TAXI)),
    };
  }

  // Quizz Ville de Lyon FC TAXI (module 96) — repris de CONNAISSANCES_VILLE_TAXI (module pratique 7)
  if (module.id === 96) {
    const villeExercices = (CONNAISSANCES_VILLE_TAXI_DATA.exercices || []).filter(
      (e: any) => Array.isArray(e?.questions) && e.questions.length > 0,
    );
    return {
      id: 96,
      nom: "🗺️ QUIZZ VILLE DE LYON",
      description: "Quizz Ville de Lyon — connaissances géographiques de Lyon et sa métropole (autoroutes, avenues, boulevards, cours, places, quais, rues et lieux emblématiques).",
      cours: [],
      exercices: JSON.parse(JSON.stringify(villeExercices)),
    };
  }





  // Cours Formation Continue TAXI — PDFs pédagogiques + QCM Final (module 92)
  if (module.id === 92) {
    return {
      id: 92,
      nom: "2.COURS FC TAXI (PDF)",
      description: "Formation continue TAXI — 4 modules pédagogiques téléchargeables (Droit du T3P, Réglementation, Sécurité Routière, Gestion & Développement Commercial) + QCM Final de validation.",
      cours: JSON.parse(JSON.stringify(COURS_FC_TAXI)),
      exercices: JSON.parse(JSON.stringify(QCM_FINAL_FC_TAXI)),
    };
  }

  // Cours Formation Mobilité TAXI (module 90) — 2 modules PDF + QCM Final
  if (module.id === 90) {
    return {
      id: 90,
      nom: "1.COURS MOBILITÉ TAXI",
      description: "Formation Mobilité TAXI — 2 modules pédagogiques téléchargeables (Connaissance du territoire, Réglementation locale) + QCM Final de validation.",
      cours: JSON.parse(JSON.stringify(COURS_MOBILITE_TAXI)),
      exercices: JSON.parse(JSON.stringify(QCM_FINAL_MOBILITE_TAXI)),
    };
  }


  // Bilan fin de formation — Formation Continue VTC (module 87) — quiz interactif
  if (module.id === 87) {
    return {
      id: 87,
      nom: "2.📋 BILAN FIN DE FORMATION CONTINUE VTC",
      description: "Bilan final de la formation continue VTC. Répondez aux questions puis validez pour voir votre score.",
      cours: [],
      exercices: JSON.parse(JSON.stringify(BILAN_FIN_FORMATION_FC_VTC_EXERCICE)),
    };
  }

  // Feuilles d'émargement signées — VTC / VA présentiel & Formation Continue VTC (83)
  if (module.id === 83) {
    return {
      id: module.id,
      nom: "📝 FEUILLES D'ÉMARGEMENT SIGNÉES VTC",
      description: "Consultez vos feuilles d'émargement signées (matin 09h-12h / après-midi 13h-16h, ou cours du soir 17h-18h30 / 18h30-21h) et signez les créneaux manquants.",
      cours: [
        {
          id: 1,
          titre: "Mes feuilles d'émargement signées",
          description: "Historique des signatures — possibilité de signer les créneaux manquants",
          actif: true,
          checklistType: "emargements-fc" as const,
        },
      ],
      exercices: [],
    };
  }

  // Feuilles d'émargement signées — TAXI / TA présentiel & Formation Continue TAXI (84)
  if (module.id === 84) {
    return {
      id: module.id,
      nom: "📝 FEUILLES D'ÉMARGEMENT SIGNÉES TAXI",
      description: "Consultez vos feuilles d'émargement signées (matin 09h-12h / après-midi 13h-16h) et signez les créneaux manquants.",
      cours: [
        {
          id: 1,
          titre: "Mes feuilles d'émargement signées",
          description: "Historique des signatures — possibilité de signer les créneaux manquants",
          actif: true,
          checklistType: "emargements-fc" as const,
        },
      ],
      exercices: [],
    };
  }

  // Remboursement Formation Continue VTC (89) — documents pour le financeur
  if (module.id === 89) {
    return {
      id: module.id,
      nom: "💶 REMBOURSEMENT FORMATION CONTINUE VTC",
      description: "Téléchargez l'ensemble des documents nécessaires au remboursement par votre financeur.",
      cours: [
        {
          id: 1,
          titre: "Documents pour le remboursement de la formation",
          description: "Programme, émargements, attestation et facture acquittée.",
          actif: true,
          checklistType: "remboursement-fc-vtc" as const,
        },
      ],
      exercices: [],
    };
  }

  // Informations financeur — Formation Continue VTC (85) / TAXI (86)
  if (module.id === 85 || module.id === 86) {
    const isTaxi = module.id === 86;
    return {
      id: module.id,
      nom: `3.INFORMATIONS FINANCEUR${isTaxi ? " TAXI" : " VTC"}`,
      description: "Renseignez les informations de facturation pour permettre l'émission rapide de votre facture.",
      cours: [
        {
          id: 1,
          titre: "Informations du financeur (facturation)",
          description: "Particulier ou professionnel — données pour la facture",
          actif: true,
          checklistType: "financeur-fc" as const,
        },
      ],
      exercices: [],
    };
  }

  // Demande de Carte Professionnelle VTC — Formation Continue VTC (88)
  if (module.id === 88) {
    return {
      id: 88,
      nom: "🪪 DEMANDE DE CARTE PROFESSIONNELLE VTC",
      description: "Démarche officielle de renouvellement de la carte professionnelle VTC à effectuer en ligne après la formation continue.",
      cours: [
        {
          id: 1,
          titre: "Renouvellement de la carte professionnelle VTC",
          description: "Liste des pièces à fournir et accès au portail demarches-simplifiees.fr",
          actif: true,
          checklistType: "demande-carte-vtc" as const,
        },
      ],
      exercices: [],
    };
  }

  // Demande de Carte Professionnelle TAXI — Formation Continue TAXI (93)
  if (module.id === 93) {
    return {
      id: 93,
      nom: "🪪 DEMANDE DE CARTE PROFESSIONNELLE TAXI",
      description: "Démarche officielle de renouvellement de la carte professionnelle TAXI auprès de la préfecture après la formation continue.",
      cours: [
        {
          id: 1,
          titre: "Renouvellement de la carte professionnelle TAXI",
          description: "Liste des pièces à fournir et démarche auprès de la préfecture",
          actif: true,
          checklistType: "demande-carte-taxi" as const,
        },
      ],
      exercices: [],
    };
  }

  // Remboursement Formation Continue TAXI (94) — documents pour le financeur
  if (module.id === 94) {
    return {
      id: 94,
      nom: "💶 REMBOURSEMENT FORMATION CONTINUE TAXI",
      description: "Téléchargez l'ensemble des documents nécessaires au remboursement par votre financeur.",
      cours: [
        {
          id: 1,
          titre: "Documents pour le remboursement de la formation",
          description: "Programme, émargements, attestation et facture acquittée.",
          actif: true,
          checklistType: "remboursement-fc-taxi" as const,
        },
      ],
      exercices: [],
    };
  }


  // Bilan Exercices TAXI (module 9) — toutes les matières
  if (module.id === 9) {
    return {
      id: 9,
      nom: "4.BILAN EXERCICES TAXI",
      description: "Tous les exercices regroupés par matière. Refaites-les autant de fois que nécessaire pour maîtriser chaque sujet.",
      cours: [],
      exercices: JSON.parse(JSON.stringify(BILAN_EXERCICES_TAXI)),
    };
  }

  // Bilan Exercices TA (module 27) — Réglementation Nationale + Locale
  if (module.id === 27) {
    return {
      id: 27,
      nom: "4.BILAN EXERCICES TA",
      description: "Tous les exercices regroupés par matière. Refaites-les autant de fois que nécessaire pour maîtriser chaque sujet.",
      cours: [],
      exercices: JSON.parse(JSON.stringify(BILAN_EXERCICES_TA)),
    };
  }

  // Bilan Exercices VA (module 29) — sans T3P, Gestion, Sécurité routière
  if (module.id === 29) {
    return {
      id: 29,
      nom: "4.BILAN EXERCICES VA",
      description: "Tous les exercices regroupés par matière. Refaites-les autant de fois que nécessaire pour maîtriser chaque sujet.",
      cours: [],
      exercices: JSON.parse(JSON.stringify(BILAN_EXERCICES_VA)),
    };
  }

  // VTC sub-modules (matières A-G, anciennement module 2)
  if (module.id === 2) {
    return JSON.parse(JSON.stringify(VTC_COURS_DATA));
  }
  if (module.id === 25) {
    return createSectionModuleData(25, "A. Réglementation T3P — Partie 2", "Cours et exercices T3P — Partie 2", {
      cours: VTC_SECTIONS[0].cours.slice(1, 2),
      exercices: VTC_SECTIONS[0].exercices.slice(1, 2),
    });
  }
  if (module.id === 14) return createSectionModuleData(14, "B. Gestion", "Cours et exercices de gestion", VTC_SECTIONS[1]);
  if (module.id === 15) return createSectionModuleData(15, "C. Sécurité Routière", "Cours sur la sécurité routière", VTC_SECTIONS[2]);
  if (module.id === 16) return createSectionModuleData(16, "D. Français", "Cours et exercices de français", VTC_SECTIONS[3]);
  if (module.id === 17) return createSectionModuleData(17, "E. Anglais", "Cours et exercices d'anglais", VTC_SECTIONS[4]);
  if (module.id === 18) return createSectionModuleData(18, "F. Réglementation Spécifique", "Réglementation nationale, spécifique VTC et locale", VTC_SECTIONS[5]);
  if (module.id === 19) return createSectionModuleData(19, "G. Développement Commercial", "Marketing et développement commercial", VTC_SECTIONS[6]);

  // TAXI sub-modules (matières A-F, anciennement module 10)
  if (module.id === 10) {
    return JSON.parse(JSON.stringify(TAXI_COURS_DATA));
  }
  if (module.id === 39) {
    return createSectionModuleData(39, "A. Réglementation T3P — Partie 2", "Cours et exercices T3P — Partie 2 (TAXI)", {
      cours: TAXI_SECTIONS[0].cours.slice(1, 2),
      exercices: TAXI_SECTIONS[0].exercices.slice(1, 2),
    });
  }
  if (module.id === 20) return createSectionModuleData(20, "B. Gestion", "Cours et exercices de gestion (TAXI)", TAXI_SECTIONS[1]);
  if (module.id === 21) return createSectionModuleData(21, "C. Sécurité Routière", "Cours sur la sécurité routière (TAXI)", TAXI_SECTIONS[2]);
  if (module.id === 22) return createSectionModuleData(22, "D. Français", "Cours et exercices de français (TAXI)", TAXI_SECTIONS[3]);
  if (module.id === 23) return createSectionModuleData(23, "E. Anglais", "Cours et exercices d'anglais (TAXI)", TAXI_SECTIONS[4]);
  if (module.id === 24) return createSectionModuleData(24, "F. Réglementation", "Réglementation nationale et locale (TAXI)", TAXI_SECTIONS[5]);

  // TA sub-modules (Passerelle Taxi : Nationale + Locale)
  if (module.id === 40) {
    return JSON.parse(JSON.stringify(TA_COURS_DATA));
  }
  if (module.id === 42) return createSectionModuleData(42, "F. Réglementation Locale", "Réglementation locale (TA)", TA_SECTIONS[1]);

  // VA sub-modules (Passerelle VTC : Marketing + Spécifique VTC)
  if (module.id === 41) {
    return JSON.parse(JSON.stringify(VA_COURS_DATA));
  }
  if (module.id === 43) return createSectionModuleData(43, "G. Réglementation Spécifique VTC", "Réglementation spécifique VTC (VA)", VA_SECTIONS[1]);

  if (module.id === 5) {
    return {
      id: 5,
      nom: "6.BILAN EXAMEN VTC",
      description: "Bilan examen VTC — 7 matières séparées. Questions type examen, sans chronomètre.",
      cours: [],
      exercices: BILAN_EXAMEN_VTC,
    };
  }

  // Bilan Examen TAXI (module 11) — 7 matières séparées sans chronomètre
  if (module.id === 11) {
    return {
      id: 11,
      nom: "6.BILAN EXAMEN TAXI",
      description: "Bilan examen TAXI — 7 matières séparées. Questions type examen, sans chronomètre.",
      cours: [],
      exercices: BILAN_EXAMEN_TAXI,
    };
  }

  // Bilan Examen TA (module 28) — toutes les matières
  if (module.id === 28) {
    return {
      id: 28,
      nom: "6.BILAN EXAMEN TA",
      description: "Bilan examen TA — Réglementation Nationale TAXI & Réglementation Locale. Questions type examen, sans chronomètre.",
      cours: [],
      exercices: BILAN_EXAMEN_TA,
    };
  }

  // Bilan Examen VA (module 30) — F(V) + G(V) uniquement
  if (module.id === 30) {
    return {
      id: 30,
      nom: "6.BILAN EXAMEN VA",
      description: "Bilan examen VA — Développement Commercial & Réglementation Spécifique VTC. Questions type examen, sans chronomètre.",
      cours: [],
      exercices: BILAN_EXAMEN_VA,
    };
  }

  // === Équipements TAXI (module 64) ===
  if (module.id === 64) {
    return JSON.parse(JSON.stringify(EQUIPEMENTS_TAXI_DATA));
  }

  // === Sources Juridiques ===
  const SOURCES_JURIDIQUES_INTRO: ContentItem[] = [
    {
      id: 0,
      titre: "Qu'est-ce qu'un texte juridique ?",
      description: `📚 HIÉRARCHIE DES TEXTES JURIDIQUES

Avant d'étudier les sources juridiques de votre formation, il est important de comprendre les différents types de textes de loi :

🔴 LA CONSTITUTION
C'est la loi suprême. Tous les autres textes doivent la respecter.

🟠 LA LOI
Texte voté par le Parlement (Assemblée nationale + Sénat). Elle fixe les règles générales dans un domaine.
Exemple : La loi n°2014-1104 relative aux taxis et VTC.

🟡 L'ORDONNANCE
Texte pris par le Gouvernement dans un domaine normalement réservé à la loi, avec l'autorisation du Parlement. Elle a la même valeur qu'une loi une fois ratifiée.
Exemple : L'ordonnance n°2021-487 relative aux conditions d'exercice des T3P.

🟢 LE DÉCRET
Texte pris par le Président de la République ou le Premier ministre. Il précise les modalités d'application d'une loi.
Exemple : Le décret n°2017-483 relatif aux obligations des VTC.

🔵 L'ARRÊTÉ
Texte pris par un ministre, un préfet ou un maire. C'est le texte le plus précis et le plus technique. Il fixe les détails pratiques.
Exemple : L'arrêté du 6 avril 2017 relatif au programme des examens.

⚠️ Ordre hiérarchique : Constitution > Loi > Ordonnance > Décret > Arrêté
Un texte inférieur ne peut jamais contredire un texte supérieur.`,
      actif: true,
    },
  ];

  const SOURCES_JURIDIQUES_QUIZ: ExerciceItem[] = [
    {
      id: 1,
      titre: "Quiz — Types de textes juridiques",
      sousTitre: "Testez vos connaissances sur la hiérarchie des normes",
      actif: true,
      questions: [
        { id: 1, enonce: "Quel texte est au sommet de la hiérarchie des normes en France ?", choix: [{ lettre: "A", texte: "La loi" }, { lettre: "B", texte: "La Constitution", correct: true }, { lettre: "C", texte: "Le décret" }, { lettre: "D", texte: "L'ordonnance" }] },
        { id: 2, enonce: "Qui vote la loi en France ?", choix: [{ lettre: "A", texte: "Le Président de la République" }, { lettre: "B", texte: "Le Premier ministre" }, { lettre: "C", texte: "Le Parlement (Assemblée nationale + Sénat)", correct: true }, { lettre: "D", texte: "Le Préfet" }] },
        { id: 3, enonce: "Qu'est-ce qu'une ordonnance ?", choix: [{ lettre: "A", texte: "Un texte voté par le Parlement" }, { lettre: "B", texte: "Un texte pris par le Gouvernement avec autorisation du Parlement", correct: true }, { lettre: "C", texte: "Un texte pris par un maire" }, { lettre: "D", texte: "Un jugement de tribunal" }] },
        { id: 4, enonce: "Qui peut prendre un décret ?", choix: [{ lettre: "A", texte: "Un maire uniquement" }, { lettre: "B", texte: "Le Président de la République ou le Premier ministre", correct: true }, { lettre: "C", texte: "Le Parlement" }, { lettre: "D", texte: "Un préfet" }] },
        { id: 5, enonce: "Qu'est-ce qu'un arrêté ?", choix: [{ lettre: "A", texte: "Un texte voté par l'Assemblée nationale" }, { lettre: "B", texte: "Un texte pris par un ministre, un préfet ou un maire", correct: true }, { lettre: "C", texte: "Un texte pris par le Président" }, { lettre: "D", texte: "Une décision de justice" }] },
        { id: 6, enonce: "Dans l'ordre hiérarchique, quel texte est supérieur au décret ?", choix: [{ lettre: "A", texte: "L'arrêté" }, { lettre: "B", texte: "La loi", correct: true }, { lettre: "C", texte: "Le règlement intérieur" }, { lettre: "D", texte: "La circulaire" }] },
        { id: 7, enonce: "Un arrêté peut-il contredire une loi ?", choix: [{ lettre: "A", texte: "Oui, s'il est plus récent" }, { lettre: "B", texte: "Non, jamais — un texte inférieur ne peut contredire un texte supérieur", correct: true }, { lettre: "C", texte: "Oui, si le préfet l'autorise" }, { lettre: "D", texte: "Oui, dans certains départements" }] },
        { id: 8, enonce: "Quel type de texte fixe les détails pratiques et techniques d'application ?", choix: [{ lettre: "A", texte: "La Constitution" }, { lettre: "B", texte: "La loi" }, { lettre: "C", texte: "L'arrêté", correct: true }, { lettre: "D", texte: "L'ordonnance" }] },
        { id: 9, enonce: "Un décret sert principalement à :", choix: [{ lettre: "A", texte: "Créer de nouvelles lois" }, { lettre: "B", texte: "Préciser les modalités d'application d'une loi", correct: true }, { lettre: "C", texte: "Juger les infractions" }, { lettre: "D", texte: "Modifier la Constitution" }] },
        { id: 10, enonce: "Quelle est la bonne hiérarchie (du plus fort au moins fort) ?", choix: [{ lettre: "A", texte: "Loi > Décret > Constitution > Arrêté" }, { lettre: "B", texte: "Constitution > Loi > Ordonnance > Décret > Arrêté", correct: true }, { lettre: "C", texte: "Arrêté > Décret > Loi > Constitution" }, { lettre: "D", texte: "Décret > Loi > Arrêté > Constitution" }] },
      ],
    },
    {
      id: 2,
      titre: "Quiz — Sanctions et réglementation T3P",
      sousTitre: "Sanctions encourues par les conducteurs VTC et TAXI",
      actif: true,
      questions: [
        { id: 1, enonce: "Quelle sanction encourt un conducteur VTC exerçant sans carte professionnelle ?", choix: [{ lettre: "A", texte: "Amende de 135€" }, { lettre: "B", texte: "1 an d'emprisonnement et 15 000€ d'amende", correct: true }, { lettre: "C", texte: "Simple avertissement" }, { lettre: "D", texte: "Retrait du permis" }] },
        { id: 2, enonce: "Un taxi qui stationne hors de sa zone d'autorisation risque :", choix: [{ lettre: "A", texte: "Rien" }, { lettre: "B", texte: "Une amende de 4ème classe" }, { lettre: "C", texte: "Le retrait de son autorisation de stationnement", correct: true }, { lettre: "D", texte: "La prison" }] },
        { id: 3, enonce: "La maraude électronique est autorisée pour :", choix: [{ lettre: "A", texte: "Les taxis uniquement" }, { lettre: "B", texte: "Les VTC uniquement", correct: true }, { lettre: "C", texte: "Les taxis et les VTC" }, { lettre: "D", texte: "Personne" }] },
        { id: 4, enonce: "Quel texte de loi encadre principalement l'activité des T3P ?", choix: [{ lettre: "A", texte: "Le Code de la route" }, { lettre: "B", texte: "La loi Grandguillaume (2016) et le Code des transports", correct: true }, { lettre: "C", texte: "Le Code civil" }, { lettre: "D", texte: "Le Code du travail" }] },
        { id: 5, enonce: "Le refus de prise en charge par un taxi est sanctionné par :", choix: [{ lettre: "A", texte: "Un simple rappel à l'ordre" }, { lettre: "B", texte: "Une contravention de 4ème classe (135€)" }, { lettre: "C", texte: "Une amende de 5ème classe (1 500€)", correct: true }, { lettre: "D", texte: "Le retrait immédiat de la licence" }] },
        { id: 6, enonce: "Un VTC peut-il prendre un client dans la rue sans réservation préalable ?", choix: [{ lettre: "A", texte: "Oui, à tout moment" }, { lettre: "B", texte: "Non, c'est interdit — il faut obligatoirement une réservation préalable", correct: true }, { lettre: "C", texte: "Oui, si le client le demande" }, { lettre: "D", texte: "Oui, la nuit uniquement" }] },
        { id: 7, enonce: "La discrimination envers un client (refus basé sur l'origine, le handicap...) est punie de :", choix: [{ lettre: "A", texte: "135€ d'amende" }, { lettre: "B", texte: "3 ans d'emprisonnement et 45 000€ d'amende", correct: true }, { lettre: "C", texte: "1 500€ d'amende" }, { lettre: "D", texte: "Avertissement" }] },
        { id: 8, enonce: "Quelle est la durée de validité de la carte professionnelle VTC/TAXI ?", choix: [{ lettre: "A", texte: "3 ans" }, { lettre: "B", texte: "5 ans", correct: true }, { lettre: "C", texte: "10 ans" }, { lettre: "D", texte: "Illimitée" }] },
      ],
    },
  ];

  if (module.id === 60) {
    return {
      id: 60,
      nom: "📖 SOURCES JURIDIQUES VTC",
      description: "Sources légales et textes réglementaires de la formation VTC. Consultez le document PDF en mode HD puis testez vos connaissances.",
      cours: [
        ...SOURCES_JURIDIQUES_INTRO,
        { id: 1, titre: "Sources légales VTC (PDF HD)", description: "Consultez l'intégralité des sources juridiques de la formation VTC.", actif: true, fichiers: [{ nom: "Sources_Legales_VTC.pdf", url: "/cours/vtc/Sources_Legales_VTC.pdf" }] },
      ],
      exercices: SOURCES_JURIDIQUES_QUIZ,
    };
  }

  if (module.id === 61) {
    return {
      id: 61,
      nom: "📖 SOURCES JURIDIQUES TAXI",
      description: "Sources légales et textes réglementaires de la formation TAXI. Consultez le document PDF en mode HD puis testez vos connaissances.",
      cours: [
        ...SOURCES_JURIDIQUES_INTRO,
        { id: 1, titre: "Sources légales TAXI (PDF HD)", description: "Consultez l'intégralité des sources juridiques de la formation TAXI.", actif: true, fichiers: [{ nom: "Sources_Legales_TAXI.pdf", url: "/cours/vtc/Sources_Legales_TAXI.pdf" }] },
      ],
      exercices: SOURCES_JURIDIQUES_QUIZ,
    };
  }

  if (module.id === 62) {
    return {
      id: 62,
      nom: "📖 SOURCES JURIDIQUES TA",
      description: "Sources légales et textes réglementaires de la passerelle TA. Consultez le document PDF en mode HD puis testez vos connaissances.",
      cours: [
        ...SOURCES_JURIDIQUES_INTRO,
        { id: 1, titre: "Sources légales TA (PDF HD)", description: "Consultez l'intégralité des sources juridiques de la passerelle TA.", actif: true, fichiers: [{ nom: "Sources_Legales_TA.pdf", url: "/cours/vtc/Sources_Legales_TA.pdf" }] },
      ],
      exercices: SOURCES_JURIDIQUES_QUIZ,
    };
  }

  if (module.id === 63) {
    return {
      id: 63,
      nom: "📖 SOURCES JURIDIQUES VA",
      description: "Sources légales et textes réglementaires de la passerelle VA. Consultez le document PDF en mode HD puis testez vos connaissances.",
      cours: [
        ...SOURCES_JURIDIQUES_INTRO,
        { id: 1, titre: "Sources légales VA (PDF HD)", description: "Consultez l'intégralité des sources juridiques de la passerelle VA.", actif: true, fichiers: [{ nom: "Sources_Legales_VA.pdf", url: "/cours/vtc/Sources_Legales_VA.pdf" }] },
      ],
      exercices: SOURCES_JURIDIQUES_QUIZ,
    };
  }

  // === Fiches Révisions (modules 70-73) ===
  if (module.id === 70) {
    return {
      id: 70,
      nom: "📝 FICHES RÉVISIONS VTC",
      description: "Fiches de révision pour la formation VTC : synthèse matières communes, spécialités VTC et définitions.",
      cours: [
        { id: 1, titre: "Fiche Synthèse — Matières Communes", description: "Fiche de révision regroupant les matières communes à toutes les formations.", actif: true, fichiers: [{ nom: "Fiches_Revision_Matiere_Commune.pdf", url: "/cours/vtc/Fiches_Revision_Matiere_Commune.pdf" }] },
        { id: 2, titre: "Fiche Synthèse — Spécialités VTC", description: "Fiche de synthèse des spécialités propres à la formation VTC.", actif: true, fichiers: [{ nom: "Fiche_Synthese_Specialites_VTC.pdf", url: "/cours/vtc/Fiche_Synthese_Specialites_VTC.pdf" }] },
        { id: 3, titre: "Définitions VTC", description: "Glossaire et définitions clés de la formation VTC.", actif: true, fichiers: [{ nom: "Definitions_VTC.docx", url: "/cours/vtc/Definitions_VTC.docx" }] },
        { id: 4, titre: "Bilan QRC VTC", description: "Bilan des Questions à Réponse Courte pour la formation VTC.", actif: true, fichiers: [{ nom: "Bilan_QRC_VTC.docx", url: "/cours/vtc/Bilan_QRC_VTC.docx" }] },
      ],
      exercices: [],
    };
  }

  if (module.id === 71) {
    return {
      id: 71,
      nom: "📝 FICHES RÉVISIONS TAXI",
      description: "Fiches de révision pour la formation TAXI : synthèse matières communes, spécialités TAXI et définitions.",
      cours: [
        { id: 1, titre: "Fiche Synthèse — Matières Communes", description: "Fiche de révision regroupant les matières communes à toutes les formations.", actif: true, fichiers: [{ nom: "Fiches_Revision_Matiere_Commune.pdf", url: "/cours/vtc/Fiches_Revision_Matiere_Commune.pdf" }] },
        { id: 2, titre: "Fiche Synthèse — Spécialités TAXI", description: "Fiche de révision des spécialités propres à la formation TAXI.", actif: true, fichiers: [{ nom: "Fiche_Revision_Specialites_TAXI.pdf", url: "/cours/vtc/Fiche_Revision_Specialites_TAXI.pdf" }] },
        { id: 3, titre: "Définitions TAXI", description: "Glossaire et définitions clés de la formation TAXI.", actif: true, fichiers: [{ nom: "Definitions_Taxi.docx", url: "/cours/vtc/Definitions_Taxi.docx" }] },
        { id: 4, titre: "Bilan QRC TAXI", description: "Bilan des Questions à Réponse Courte pour la formation TAXI.", actif: true, fichiers: [{ nom: "Bilan_QRC_TAXI.docx", url: "/cours/vtc/Bilan_QRC_TAXI.docx" }] },
      ],
      exercices: [],
    };
  }

  if (module.id === 72) {
    return {
      id: 72,
      nom: "📝 FICHES RÉVISIONS TA",
      description: "Fiches de révision pour la passerelle TA : synthèse spécialités TAXI, définitions TA et bilan QRC.",
      cours: [
        { id: 1, titre: "Fiche Synthèse — Spécialités TAXI", description: "Fiche de révision des spécialités TAXI pour la passerelle TA.", actif: true, fichiers: [{ nom: "Fiche_Revision_Specialites_TAXI.pdf", url: "/cours/vtc/Fiche_Revision_Specialites_TAXI.pdf" }] },
        { id: 2, titre: "Définitions TA", description: "Glossaire et définitions clés de la passerelle TA.", actif: true, fichiers: [{ nom: "Definitions_TA.docx", url: "/cours/vtc/Definitions_TA.docx" }] },
        { id: 3, titre: "Bilan QRC TA", description: "Bilan des Questions à Réponse Courte pour la passerelle TA.", actif: true, fichiers: [{ nom: "Bilan_QRC_TA.docx", url: "/cours/vtc/Bilan_QRC_TA.docx" }] },
      ],
      exercices: [],
    };
  }

  if (module.id === 73) {
    return {
      id: 73,
      nom: "📝 FICHES RÉVISIONS VA",
      description: "Fiches de révision pour la passerelle VA : synthèse spécialités VTC, définitions VA et bilan QRC.",
      cours: [
        { id: 1, titre: "Fiche Synthèse — Spécialités VTC", description: "Fiche de synthèse des spécialités VTC pour la passerelle VA.", actif: true, fichiers: [{ nom: "Fiche_Synthese_Specialites_VTC.pdf", url: "/cours/vtc/Fiche_Synthese_Specialites_VTC.pdf" }] },
        { id: 2, titre: "Définitions VA", description: "Glossaire et définitions clés de la passerelle VA.", actif: true, fichiers: [{ nom: "Definitions_VA.docx", url: "/cours/vtc/Definitions_VA.docx" }] },
        { id: 3, titre: "Bilan QRC VA", description: "Bilan des Questions à Réponse Courte pour la passerelle VA.", actif: true, fichiers: [{ nom: "Bilan_QRC_VA.docx", url: "/cours/vtc/Bilan_QRC_VA.docx" }] },
      ],
      exercices: [],
    };
  }

  // === Fin de formation (formulaires interactifs) ===
  const FIN_FORMATION_MAP: Record<number, { label: string; formationType: string }> = {
    50: { label: "VTC", formationType: "vtc" },
    51: { label: "TAXI", formationType: "taxi" },
    52: { label: "TA", formationType: "ta" },
    53: { label: "VA", formationType: "va" },
  };

  if (FIN_FORMATION_MAP[module.id]) {
    const { label, formationType } = FIN_FORMATION_MAP[module.id];
    return {
      id: module.id,
      nom: `📋 FIN DE FORMATION ${label}`,
      description: `Félicitations ! Vous avez terminé l'ensemble des modules de la formation ${label}. Merci de remplir les formulaires ci-dessous.`,
      cours: [
        { id: 1, titre: "Évaluation des acquis", description: `Évaluez vos compétences acquises au cours de la formation ${label}.`, actif: true, checklistType: "evaluation-acquis" as any, formationType },
        { id: 2, titre: "Enquête de satisfaction", description: "Votre avis compte ! Merci de remplir ce questionnaire.", actif: true, checklistType: "satisfaction" as any, formationType },
      ],
      exercices: [],
    };
  }

  return {
    id: module.id,
    nom: module.nom,
    description: "Module en cours de construction",
    cours: [],
    exercices: [],
  };
}

function createSectionModuleData(id: number, nom: string, description: string, section: { cours: any[]; exercices: any[] }): ModuleData {
  return JSON.parse(JSON.stringify({
    id,
    nom,
    description,
    cours: section.cours,
    exercices: section.exercices,
  }));
}

// ===== Éditeur de question QCM =====
function QuestionEditor({
  question,
  onSave,
  onDraftSave,
  onDelete,
  onCancel,
  moduleId,
}: {
  question: ExerciceQuestion;
  onSave: (q: ExerciceQuestion) => void;
  onDraftSave: (q: ExerciceQuestion) => void;
  onDelete: () => void;
  onCancel: () => void;
  moduleId: number;
}) {

  const [enonce, setEnonce] = useState(question.enonce);
  const [choix, setChoix] = useState<ExerciceChoix[]>([...question.choix]);
  const [image, setImage] = useState<string | null>(question.image ?? null);
  const [imageSize, setImageSize] = useState<ImageSize>((question.imageSize as ImageSize) ?? "sm");

  // Auto-save live: propage chaque modification (énoncé, choix, bonne réponse)
  // vers le parent qui déclenche la persistance DB debouncée.
  // ⚠️ On utilise onDraftSave (ne ferme PAS l'éditeur) et non onSave.
  const isFirstAutoSaveRef = useRef(true);
  useEffect(() => {
    if (isFirstAutoSaveRef.current) {
      isFirstAutoSaveRef.current = false;
      return;
    }
    const t = setTimeout(() => {
      onDraftSave({
        ...question,
        enonce,
        choix,
        // ⚠️ image: null = suppression explicite par l'admin (le merge côté apprenant
        // doit conserver null et NE PAS re-hydrater l'image source). undefined serait
        // supprimé par JSON.stringify → le merge retomberait sur l'image source.
        image: image as any,
        imageSize,
        _editedAt: new Date().toISOString(),
      } as ExerciceQuestion);
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enonce, choix, image, imageSize]);


  const handleChoixTexte = (i: number, val: string) => {
    setChoix(prev => prev.map((c, idx) => idx === i ? { ...c, texte: val } : c));
  };
  const handleChoixCorrect = (i: number, val: boolean) => {
    setChoix(prev => prev.map((c, idx) => idx === i ? { ...c, correct: val } : c));
  };
  const handleChoixExplication = (i: number, val: string) => {
    setChoix(prev => prev.map((c, idx) => idx === i ? { ...c, explication: val } : c));
  };
  const addChoix = () => {
    const lettres = ["A", "B", "C", "D", "E", "F"];
    setChoix(prev => [...prev, { lettre: lettres[prev.length] || String(prev.length + 1), texte: "" }]);
  };
  const removeChoix = (i: number) => {
    setChoix(prev => prev.filter((_, idx) => idx !== i));
  };


  return (
    <div className="border-2 border-primary/30 rounded-lg p-4 bg-primary/5 space-y-3">
      <div className="flex items-center justify-between">
        <Badge>QCM — Q{question.id}</Badge>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={onCancel}><X className="w-4 h-4" /></Button>
          <Button size="sm" variant="destructive" onClick={onDelete}><Trash2 className="w-3 h-3" /></Button>
          <Button size="sm" onClick={() => onSave({ ...question, enonce, choix, image: image as any, imageSize, _editedAt: new Date().toISOString() } as ExerciceQuestion)} className="gap-1">
            <Save className="w-3 h-3" /> Enregistrer
          </Button>
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-semibold">Énoncé</label>
        <ColoredTextField value={enonce} onChange={setEnonce} rows={2} className="text-sm" />
      </div>
      {/* Image (optionnel) — enregistrement immédiat */}
      <QuestionImageUpload
        image={image}
        imageSize={imageSize}
        onImageSizeChange={(sz) => {
          setImageSize(sz);
          onDraftSave({ ...question, enonce, choix, image: image as any, imageSize: sz, _editedAt: new Date().toISOString() } as ExerciceQuestion);
        }}
        context="module"
        contextId={moduleId}
        questionId={question.id}
        onImageChange={(newImage) => {
          setImage(newImage);
          // newImage === null ⇒ suppression explicite (doit être persistée telle quelle).
          onDraftSave({ ...question, enonce, choix, image: newImage as any, imageSize, _editedAt: new Date().toISOString() } as ExerciceQuestion);
        }}

      />
      <div className="space-y-3">
        <label className="text-xs font-semibold">Réponses (cochez les bonnes réponses — plusieurs possibles)</label>
        {choix.map((c, i) => (
          <div key={i} className="space-y-1.5 p-2 rounded-md border bg-background/60">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!c.correct}
                onChange={e => handleChoixCorrect(i, e.target.checked)}
                className="w-4 h-4 shrink-0"
                title="Bonne réponse"
              />
              <span className="w-6 text-xs font-bold text-muted-foreground">{c.lettre}</span>
              <Input value={c.texte} onChange={e => handleChoixTexte(i, e.target.value)} className="text-sm flex-1" placeholder={`Choix ${c.lettre}`} />
              <Button size="sm" variant="ghost" onClick={() => removeChoix(i)}><X className="w-3 h-3" /></Button>
            </div>
            <Textarea
              value={c.explication ?? ""}
              onChange={e => handleChoixExplication(i, e.target.value)}
              placeholder="Saisir une explication (optionnel)"
              rows={2}
              className="text-xs ml-6"
            />
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={addChoix} className="gap-1">
          <Plus className="w-3 h-3" /> Ajouter un choix
        </Button>
      </div>
    </div>
  );
}

// ===== Carte exercice avec questions =====
function ExerciceCard({
  item,
  index,
  total,
  onMove,
  onDelete,
  onToggle,
  onUpdateQuestions,
  moduleId,
  overrideWarnings,
}: {
  item: ExerciceItem;
  index: number;
  total: number;
  onMove: (index: number, direction: "up" | "down") => void;
  onDelete: (id: number) => void;
  onToggle: (id: number) => void;
  onUpdateQuestions: (id: number, questions: ExerciceQuestion[], deletedQuestionId?: number) => void;
  moduleId: number;
  overrideWarnings?: Map<string, TrainerOverrideInfo>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [editingQId, setEditingQId] = useState<number | null>(null);

  // Dé-doublonnage défensif par id (évite tout mélange d'affichage entre questions
  // partageant accidentellement le même id — la 1re occurrence gagne).
  const safeQuestions = useMemo(() => {
    if (!item.questions) return [] as ExerciceQuestion[];
    const seen = new Set<number>();
    const out: ExerciceQuestion[] = [];
    for (const q of item.questions) {
      const key = Number(q.id);
      if (seen.has(key)) {
        console.warn(`[ModuleDetailView] Doublon d'id question détecté (${key}) dans exo ${item.id} — ignoré`);
        continue;
      }
      seen.add(key);
      out.push(q);
    }
    return out;
  }, [item.questions, item.id]);
  const hasQuestions = safeQuestions.length > 0;
  const getOverrideWarning = (questionId: number) => overrideWarnings?.get(`${item.id}-${questionId}`);
  const overrideWarningCount = safeQuestions.filter(q => getOverrideWarning(q.id)).length;

  const saveQuestion = (updated: ExerciceQuestion) => {
    if (!item.questions) return;
    const newQ = item.questions.map(q => q.id === updated.id ? updated : q);
    onUpdateQuestions(item.id, newQ);
    setEditingQId(null);
  };

  const saveQuestionDraft = (updated: ExerciceQuestion) => {
    if (!item.questions) return;
    const newQ = item.questions.map(q => q.id === updated.id ? updated : q);
    onUpdateQuestions(item.id, newQ);
  };


  const [confirmDeleteQId, setConfirmDeleteQId] = useState<number | null>(null);

  const deleteQuestion = (qId: number) => {
    setConfirmDeleteQId(qId);
  };

  const confirmDelete = () => {
    if (confirmDeleteQId === null || !item.questions) return;
    onUpdateQuestions(item.id, item.questions.filter(q => q.id !== confirmDeleteQId), confirmDeleteQId);
    setEditingQId(null);
    setConfirmDeleteQId(null);
    // Pas de toast optimiste ici : la confirmation « ✅ Changement enregistré »
    // est déclenchée uniquement par performDbSave après un UPSERT réussi (CAS)
    // dans module_editor_state. En cas d'erreur DB, un toast d'erreur exact
    // sera affiché à la place.
  };

  const moveQuestion = (qId: number, direction: "up" | "down") => {
    if (!item.questions) return;
    const idx = item.questions.findIndex(q => q.id === qId);
    if (idx < 0) return;
    const target = direction === "up" ? idx - 1 : idx + 1;
    if (target < 0 || target >= item.questions.length) return;
    const reordered = moveQuestionToPosition(item.questions, qId, target);
    onUpdateQuestions(item.id, reordered);
  };

  const addQuestion = () => {
    const existing = item.questions || [];
    const newId = Math.max(0, ...existing.map(q => q.id)) + 1;
    const newQ: ExerciceQuestion = {
      id: newId,
      enonce: "Nouvelle question",
      choix: [
        { lettre: "A", texte: "Choix A", correct: true },
        { lettre: "B", texte: "Choix B" },
        { lettre: "C", texte: "Choix C" },
      ],
    };
    onUpdateQuestions(item.id, [...existing, newQ]);
    setEditingQId(newId);
    setExpanded(true);
  };

  return (
    <Card className="border-2 border-slate-300 transition-all hover:shadow-md">
      <CardContent className="p-4 space-y-3">
        <div>
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-base">{item.titre}</h4>
            {hasQuestions && (
              <Badge variant="secondary" className="text-xs">{item.questions!.length} questions</Badge>
            )}
            {overrideWarningCount > 0 && (
              <span className="badge-warning ml-2 inline-flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {overrideWarningCount} override formateur
              </span>
            )}
          </div>
          {item.sousTitre && <p className="text-sm text-muted-foreground">{item.sousTitre}</p>}
          {item.fichiers && item.fichiers.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-1">
              {item.fichiers.map((f, i) => (
                <CourseFileLink key={`${f.url}-${i}`} fichier={f} compact />
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onMove(index, "up")} disabled={index === 0}>
            <ArrowUp className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onMove(index, "down")} disabled={index === total - 1}>
            <ArrowDown className="w-4 h-4" />
          </Button>
          {hasQuestions && (
            <Button variant="default" size="sm" className="gap-1" onClick={() => setExpanded(!expanded)}>
              <Pencil className="w-3 h-3" />
              {expanded ? "Fermer" : "Modifier les questions"}
            </Button>
          )}
          {hasQuestions && (
            <Button variant="outline" size="sm" className="gap-1" onClick={() => setFullscreenOpen(true)}>
              <Maximize className="w-3 h-3" /> Ouvrir en plein écran
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-1" onClick={addQuestion}>
            <Plus className="w-3 h-3" /> Ajouter question
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="destructive" size="sm" className="gap-1" onClick={() => onDelete(item.id)}>
            <Trash2 className="w-3 h-3" /> Supprimer
          </Button>
          <button onClick={() => onToggle(item.id)} className="text-muted-foreground hover:text-foreground transition-colors" title={item.actif ? "Désactiver" : "Activer"}>
            {item.actif ? <ToggleRight className="w-8 h-8 text-emerald-500" /> : <ToggleLeft className="w-8 h-8" />}
          </button>
        </div>

        {/* Questions list */}
        {expanded && hasQuestions && (
          <div className="space-y-2 pt-2 border-t">
            {safeQuestions.map((q, qi) => (
              <div key={`${q.id}-${qi}`}>

                {editingQId === q.id ? (
                  <QuestionEditor
                    question={q}
                    onSave={saveQuestion}
                    onDraftSave={saveQuestionDraft}
                    onDelete={() => deleteQuestion(q.id)}
                    onCancel={() => setEditingQId(null)}
                    moduleId={moduleId}
                  />

                ) : (
                  <div className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/20 group transition-colors">
                    <Badge className="text-xs shrink-0 mt-0.5">Q{qi + 1}</Badge>
                    {q.image && (
                      <ExamQuestionImage
                        image={q.image}
                        alt={`Illustration Q${qi + 1}`}
                        className="w-20 h-20 object-contain rounded border shrink-0 bg-white"
                        fallbackClassName="hidden"
                      />
                    )}
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground line-clamp-2"><RichText value={q.enonce} /></p>
                      {getOverrideWarning(q.id) && (
                        <div className="mt-2 flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span>
                            Override formateur détecté ({getOverrideWarning(q.id)?.quiz_id}) — les réponses admin restent prioritaires.
                          </span>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {q.choix.map(c => (
                          <span key={c.lettre} className={`text-xs px-2 py-0.5 rounded-full ${c.correct ? "bg-emerald-100 text-emerald-700 font-semibold" : "bg-muted text-muted-foreground"}`}>
                            {c.lettre}. <RichText value={c.texte.slice(0, 30) + (c.texte.length > 30 ? "…" : "")} /> {c.correct ? "✓" : ""}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100">
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => moveQuestion(q.id, "up")} disabled={qi === 0} title="Monter">
                        <ArrowUp className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => moveQuestion(q.id, "down")} disabled={qi === safeQuestions.length - 1} title="Descendre">
                        <ArrowDown className="w-3 h-3" />
                      </Button>
                    </div>
                    <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 h-7 px-2" onClick={() => setEditingQId(q.id)}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Confirmation de suppression de question */}
      <AlertDialog open={confirmDeleteQId !== null} onOpenChange={(open) => { if (!open) setConfirmDeleteQId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer la question Q{confirmDeleteQId} ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Vue plein écran des questions */}
      <Dialog open={fullscreenOpen} onOpenChange={setFullscreenOpen}>
        <DialogContent className="max-w-[98vw] w-[98vw] h-[95vh] p-0 flex flex-col">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              📝 {item.titre}
              {hasQuestions && <Badge variant="secondary">{item.questions!.length} questions</Badge>}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="flex items-center gap-2 mb-4">
              <Button size="sm" className="gap-1" onClick={addQuestion}>
                <Plus className="w-4 h-4" /> Ajouter une question
              </Button>
            </div>
            {hasQuestions ? (
              <div className="space-y-3">
                {safeQuestions.map((q, qi) => (
                  <div key={`${q.id}-${qi}`}>

                    {editingQId === q.id ? (
                      <QuestionEditor
                        question={q}
                        onSave={saveQuestion}
                        onDraftSave={saveQuestionDraft}
                        onDelete={() => deleteQuestion(q.id)}
                        onCancel={() => setEditingQId(null)}
                        moduleId={moduleId}
                      />

                    ) : (
                      <div className="flex items-start gap-3 p-4 border rounded-lg hover:bg-muted/20 group transition-colors">
                        <Badge className="text-base shrink-0 mt-0.5 px-3 py-1">Q{qi + 1}</Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-xl font-semibold mb-3 leading-snug"><RichText value={q.enonce} /></p>
                          {getOverrideWarning(q.id) && (
                            <div className="mb-3 flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
                              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                              <span>
                                Override formateur détecté ({getOverrideWarning(q.id)?.quiz_id}) — les réponses admin restent prioritaires.
                              </span>
                            </div>
                          )}
                          {q.image && (
                            <ExamQuestionImage
                              image={q.image}
                              alt={`Illustration Q${qi + 1}`}
                              className="max-h-48 object-contain rounded border mb-3 bg-white cursor-zoom-in"
                              fallbackClassName="mb-3 text-xs text-muted-foreground italic"
                            />
                          )}
                          <div className="flex flex-wrap gap-2">
                            {q.choix.map(c => (
                              <span key={c.lettre} className={`text-lg px-4 py-1.5 rounded-full ${c.correct ? "bg-emerald-100 text-emerald-700 font-semibold" : "bg-muted text-muted-foreground"}`}>
                                {c.lettre}. <RichText value={c.texte} /> {c.correct ? "✓" : ""}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => moveQuestion(q.id, "up")} disabled={qi === 0} title="Monter">
                            <ArrowUp className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => moveQuestion(q.id, "down")} disabled={qi === safeQuestions.length - 1} title="Descendre">
                            <ArrowDown className="w-3 h-3" />
                          </Button>
                        </div>
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => setEditingQId(q.id)}>
                          <Pencil className="w-3 h-3" /> Modifier
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">Aucune question. Cliquez sur « Ajouter une question » pour commencer.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ===== Éditeur riche pour la description =====
function RichDescriptionEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [color, setColor] = useState("#111827");
  const sizes = [
    { label: "XS", px: "12px" },
    { label: "S", px: "14px" },
    { label: "M", px: "16px" },
    { label: "L", px: "20px" },
    { label: "XL", px: "24px" },
    { label: "XXL", px: "32px" },
  ];
  const colorSwatches = ["#111827", "#dc2626", "#ea580c", "#ca8a04", "#16a34a", "#0284c7", "#7c3aed", "#db2777"];

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== (value || "")) {
      ref.current.innerHTML = value || "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emit = () => { if (ref.current) onChange(ref.current.innerHTML); };

  const exec = (cmd: string, val?: string) => {
    ref.current?.focus();
    document.execCommand(cmd, false, val);
    emit();
  };

  const wrapSelection = (styles: Partial<CSSStyleDeclaration>) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      toast.info("Sélectionnez d'abord le texte à modifier");
      return;
    }
    const range = sel.getRangeAt(0);
    const span = document.createElement("span");
    Object.assign(span.style, styles);
    try {
      span.appendChild(range.extractContents());
      range.insertNode(span);
      sel.removeAllRanges();
      emit();
    } catch { /* noop */ }
  };

  const applyColor = (c: string) => {
    setColor(c);
    wrapSelection({ color: c });
  };

  return (
    <div className="border rounded-md">
      <div className="flex flex-wrap items-center gap-2 p-2 border-b bg-muted/40">
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-semibold text-muted-foreground mr-1">Taille</span>
          {sizes.map(s => (
            <button key={s.px} type="button" onClick={() => wrapSelection({ fontSize: s.px })}
              className="px-2 py-1 text-xs rounded border bg-background hover:bg-accent" title={`Taille ${s.px}`}>{s.label}</button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-semibold text-muted-foreground mr-1">Couleur</span>
          {colorSwatches.map(c => (
            <button key={c} type="button" onClick={() => applyColor(c)}
              className="w-5 h-5 rounded border" style={{ background: c }} title={c} />
          ))}
          <input type="color" value={color} onChange={(e) => applyColor(e.target.value)}
            className="w-6 h-6 p-0 border rounded cursor-pointer" title="Couleur personnalisée" />
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => exec("bold")} className="px-2 py-1 text-xs rounded border bg-background hover:bg-accent font-bold">B</button>
          <button type="button" onClick={() => exec("italic")} className="px-2 py-1 text-xs rounded border bg-background hover:bg-accent italic">I</button>
          <button type="button" onClick={() => exec("underline")} className="px-2 py-1 text-xs rounded border bg-background hover:bg-accent underline">U</button>
          <button type="button" onClick={() => exec("removeFormat")} className="px-2 py-1 text-xs rounded border bg-background hover:bg-accent" title="Effacer le formatage">✕</button>
        </div>
      </div>
      <div ref={ref} contentEditable suppressContentEditableWarning
        onInput={emit}
        className="min-h-[200px] p-3 text-sm outline-none whitespace-pre-wrap" />
    </div>
  );
}

// ===== Éditeur inline pour un cours =====
function CoursEditor({ item, onSave, onCancel, onPersist }: { item: ContentItem; onSave: (updated: ContentItem) => void; onCancel: () => void; onPersist?: (updated: ContentItem) => void }) {
  const [titre, setTitre] = useState(item.titre);
  const [sousTitre, setSousTitre] = useState(item.sousTitre || "");
  const [description, setDescription] = useState(item.description || "");
  const [images, setImages] = useState<string[]>(Array.isArray(item.images) ? item.images : (item.image ? [item.image] : []));
  const [fichiers, setFichiers] = useState<{ nom: string; url: string }[]>(Array.isArray(item.fichiers) ? item.fichiers : []);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const persistAll = (nextImages: string[], nextFichiers: { nom: string; url: string }[]) => {
    setImages(nextImages);
    setFichiers(nextFichiers);
    onPersist?.({ ...item, titre, sousTitre: sousTitre || undefined, description: description || undefined, images: nextImages, image: nextImages[0], fichiers: nextFichiers });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingImg(true);
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        if (!file.type.startsWith("image/")) {
          toast.error(`"${file.name}" n'est pas une image`);
          continue;
        }
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`"${file.name}" dépasse 5 Mo`);
          continue;
        }
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
        const path = `cours-images/cours-${item.id}_${Date.now()}_${safeName}`;
        const { error } = await supabase.storage.from("cours-fichiers").upload(path, file, { upsert: true });
        if (error) throw error;
        const { data } = supabase.storage.from("cours-fichiers").getPublicUrl(path);
        uploaded.push(data.publicUrl);
      }
      if (uploaded.length) {
        persistAll([...images, ...uploaded], fichiers);
        toast.success(`${uploaded.length} photo(s) ajoutée(s) et enregistrée(s)`);
      }
    } catch (err: any) {
      console.error("Upload image cours error:", err);
      toast.error(err?.message || "Erreur lors de l'upload de l'image");
    } finally {
      setUploadingImg(false);
      if (imgInputRef.current) imgInputRef.current.value = "";
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingPdf(true);
    try {
      const uploaded: { nom: string; url: string }[] = [];
      for (const file of files) {
        const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
        if (!isPdf) {
          toast.error(`"${file.name}" n'est pas un PDF`);
          continue;
        }
        if (file.size > 20 * 1024 * 1024) {
          toast.error(`"${file.name}" dépasse 20 Mo`);
          continue;
        }
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
        const path = `cours-pdfs/cours-${item.id}_${Date.now()}_${safeName}`;
        const { error } = await supabase.storage.from("cours-fichiers").upload(path, file, { upsert: true, contentType: "application/pdf" });
        if (error) throw error;
        const { data } = supabase.storage.from("cours-fichiers").getPublicUrl(path);
        uploaded.push({ nom: file.name, url: data.publicUrl });
      }
      if (uploaded.length) {
        persistAll(images, [...fichiers, ...uploaded]);
        toast.success(`${uploaded.length} PDF ajouté(s) et enregistré(s)`);
      }
    } catch (err: any) {
      console.error("Upload PDF cours error:", err);
      toast.error(err?.message || "Erreur lors de l'upload du PDF");
    } finally {
      setUploadingPdf(false);
      if (pdfInputRef.current) pdfInputRef.current.value = "";
    }
  };

  const removeImage = (idx: number) => {
    const next = images.filter((_, i) => i !== idx);
    persistAll(next, fichiers);
    toast.success("Photo supprimée");
  };

  const removePdf = (idx: number) => {
    const next = fichiers.filter((_, i) => i !== idx);
    persistAll(images, next);
    toast.success("PDF supprimé");
  };

  return (
    <Card className="border-2 border-primary/30 transition-all">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Badge>Modifier le cours</Badge>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={onCancel}><X className="w-4 h-4" /></Button>
            <Button size="sm" onClick={() => { onSave({ ...item, titre, sousTitre: sousTitre || undefined, description: description || undefined, images, image: images[0], fichiers }); }} className="gap-1">
              <Save className="w-3 h-3" /> Enregistrer
            </Button>
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold">Titre</label>
          <Input value={titre} onChange={e => setTitre(e.target.value)} className="text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold">Sous-titre</label>
          <Input value={sousTitre} onChange={e => setSousTitre(e.target.value)} className="text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold">Description / Contenu détaillé</label>
          <RichDescriptionEditor value={description} onChange={setDescription} />
          <p className="text-[10px] text-muted-foreground">Sélectionnez le texte puis choisissez une taille ou une couleur.</p>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold">Photos du cours</label>
          {images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {images.map((url, i) => (
                <div key={`${url}-${i}`} className="relative group border rounded overflow-hidden bg-muted">
                  <CourseImageLightbox src={url} alt={`Photo ${i + 1}`} className="w-full h-24 object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-90 hover:opacity-100"
                    title="Supprimer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <input
            ref={imgInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleImageUpload}
          />
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => imgInputRef.current?.click()} disabled={uploadingImg}>
            {uploadingImg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploadingImg ? "Upload en cours..." : "Ajouter une ou plusieurs photos"}
          </Button>
          <p className="text-[10px] text-muted-foreground">Formats acceptés : JPG, PNG, WebP, GIF (max 5 Mo). Enregistrement immédiat.</p>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold">PDF du cours</label>
          {fichiers.length > 0 && (
            <div className="space-y-1">
              {fichiers.map((f, i) => (
                <div key={`${f.url}-${i}`} className="flex items-center justify-between gap-2 border rounded px-2 py-1.5 bg-muted/40">
                  <div className="truncate flex-1">
                    <CourseFileLink fichier={f} compact />
                  </div>
                  <button
                    type="button"
                    onClick={() => removePdf(i)}
                    className="bg-destructive text-destructive-foreground rounded-full p-1"
                    title="Supprimer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <input
            ref={pdfInputRef}
            type="file"
            accept="application/pdf,.pdf"
            multiple
            className="hidden"
            onChange={handlePdfUpload}
          />
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => pdfInputRef.current?.click()} disabled={uploadingPdf}>
            {uploadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploadingPdf ? "Upload en cours..." : "Ajouter un ou plusieurs PDF"}
          </Button>
          <p className="text-[10px] text-muted-foreground">Format PDF uniquement (max 20 Mo). Enregistrement immédiat.</p>
        </div>
      </CardContent>
    </Card>
  );
}



const ContentCard = ({
  item,
  index,
  total,
  onMove,
  onDelete,
  onToggle,
  onEdit,
  borderColor,
  onFileUploaded,
  onFileDeleted,
}: {
  item: ContentItem;
  index: number;
  total: number;
  onMove: (index: number, direction: "up" | "down") => void;
  onDelete: (id: number) => void;
  onToggle: (id: number) => void;
  onEdit: (id: number) => void;
  borderColor: string;
  onFileUploaded?: (itemId: number, fichier: { nom: string; url: string }) => void;
  onFileDeleted?: (itemId: number, fichierIndex: number, url: string) => void;
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.ms-powerpoint",
      "application/pdf",
    ];
    if (!allowedTypes.includes(file?.type)) {
      toast.error("Format non supporté. Utilisez un fichier .pptx, .ppt ou .pdf");
      return;
    }

    setUploading(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `vtc/${item.id}_${Date.now()}_${safeName}`;
      
      const { error } = await supabase.storage
        .from("cours-fichiers")
        .upload(path, file, { upsert: true });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from("cours-fichiers")
        .getPublicUrl(path);

      onFileUploaded?.(item.id, { nom: file.name, url: publicUrlData.publicUrl });
      toast.success(`Fichier "${file.name}" uploadé avec succès`);
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err.message || "Erreur lors de l'upload");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <Card className={`border-2 ${borderColor} transition-all hover:shadow-md`}>
      <CardContent className="p-4 space-y-3">
        <div>
          <h4 className="font-bold text-base">{item.titre}</h4>
          {item.sousTitre && (
            <p className="text-sm text-muted-foreground">{item.sousTitre}</p>
          )}
          {item.description && (
            <div className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap max-h-32 overflow-y-auto" dangerouslySetInnerHTML={{ __html: item.description }} />
          )}
        </div>
        {/* Fichiers PowerPoint */}
        {item.fichiers && item.fichiers.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {item.fichiers.map((f, i) => (
              <div key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/10 text-primary text-sm font-medium">
                <CourseFileLink fichier={f} compact />
                <FileLastModified url={f.url} />
                <FilePreviewDialog url={f.url} nom={f.nom} />

                <button
                  onClick={() => onFileDeleted?.(item.id, i, f.url)}
                  className="ml-1 p-0.5 rounded hover:bg-destructive/20 text-destructive transition-colors"
                  title="Supprimer ce fichier"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

          </div>
        )}
        {/* Upload PowerPoint */}
        <div className="flex items-center gap-2 flex-wrap">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pptx,.ppt,.pdf"
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? "Upload en cours..." : "Ajouter un PowerPoint"}
          </Button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onMove(index, "up")} disabled={index === 0}>
            <ArrowUp className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onMove(index, "down")} disabled={index === total - 1}>
            <ArrowDown className="w-4 h-4" />
          </Button>
          <Button variant="default" size="sm" className="gap-1" onClick={() => onEdit(item.id)}>
            <Pencil className="w-3 h-3" />
            Modifier
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="destructive" size="sm" className="gap-1" onClick={() => onDelete(item.id)}>
            <Trash2 className="w-3 h-3" />
            Supprimer
          </Button>
          <button onClick={() => onToggle(item.id)} className="text-muted-foreground hover:text-foreground transition-colors" title={item.actif ? "Désactiver" : "Activer"}>
            {item.actif ? <ToggleRight className="w-8 h-8 text-emerald-500" /> : <ToggleLeft className="w-8 h-8" />}
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

const ModuleDetailView = ({ module, onBack, studentOnly = false, apprenantId, onModuleCompleted, apprenantType, apprenantInfo, isPresentiel = false, hideFormulaires = false, onTrackCours, onLearnerActivity }: ModuleDetailViewProps) => {
  console.log("[ModuleDetailView] Rendering module:", module.id, module.nom, "studentOnly:", studentOnly, "apprenantType:", apprenantType, "isPresentiel:", isPresentiel);

  // Cleanup mode plein écran à la sortie du composant
  useEffect(() => {
    return () => {
      document.body.classList.remove("app-fullscreen");
    };
  }, []);

  const createInitialSlidesByKey = (): Record<string, Slide[]> => ({
    "t3p-partie1": [...T3P_PARTIE1_SLIDES],
    "t3p-partie2": [...T3P_PARTIE2_SLIDES],
    "gestion-partie1": [...GESTION_PARTIE1_SLIDES],
    "gestion-partie2": [...GESTION_PARTIE2_SLIDES],
    "gestion-partie3": [...GESTION_PARTIE3_SLIDES],
    "ville-chateaux": [...VILLE_CHATEAUX_SLIDES],
    "ville-gares": [...VILLE_GARES_SLIDES],
    "ville-hopitaux": [...VILLE_HOPITAUX_SLIDES],
    "ville-mairies": [...VILLE_MAIRIES_SLIDES],
    "ville-eglises": [...VILLE_EGLISES_SLIDES],
    "ville-fresques": [...VILLE_FRESQUES_SLIDES],
    "ville-consulats": [...VILLE_CONSULATS_SLIDES],
    "ville-commissariats": [...VILLE_COMMISSARIATS_SLIDES],
    "ville-hotels": [...VILLE_HOTELS_SLIDES],
    "ville-divers": [...VILLE_DIVERS_SLIDES],
    "ville-musees": [...VILLE_MUSEES_SLIDES],
    "ville-parcs": [...VILLE_PARCS_SLIDES],
    "ville-personnalites": [...VILLE_PERSONNALITES_SLIDES],
    "ville-salles-spectacles": [...VILLE_SALLES_SPECTACLES_SLIDES],
    "ville-vins": [...VILLE_VINS_SLIDES],
    "ville-arrondissements": [...VILLE_ARRONDISSEMENTS_SLIDES],
    "ville-stations-taxi": [...VILLE_STATIONS_TAXI_SLIDES],
  });

  let initialModuleData: ModuleData;
  try {
    initialModuleData = getInitialModuleData(module, apprenantType, studentOnly);
    console.log("[ModuleDetailView] Module data loaded:", { id: initialModuleData.id, coursCount: initialModuleData.cours.length, exercicesCount: initialModuleData.exercices.length });
  } catch (err) {
    console.error("[ModuleDetailView] CRASH in getInitialModuleData:", err);
    initialModuleData = { id: module.id, nom: module.nom, description: "", cours: [], exercices: [] };
  }

  const [moduleData, setModuleData] = useState<ModuleData>(() => initialModuleData);
  const [editingCoursId, setEditingCoursId] = useState<number | null>(null);
  const [slidesByKey, setSlidesByKey] = useState<Record<string, Slide[]>>(() => createInitialSlidesByKey());
  const [deletedCours, setDeletedCours] = useState<ContentItem[]>([]);
  const [deletedExercices, setDeletedExercices] = useState<ExerciceItem[]>([]);
  const [editorStateHydrated, setEditorStateHydrated] = useState(false);
  const [loadedModuleEditorState, setLoadedModuleEditorState] = useState(false);
  const [trainerOverrideWarnings, setTrainerOverrideWarnings] = useState<Map<string, TrainerOverrideInfo>>(new Map());
  // Trigger pour forcer la réapplication des overrides fournisseur après chaque
  // reload de moduleData depuis la DB (realtime, visibility, polling).
  const [trainerOverridesReapplyKey, setTrainerOverridesReapplyKey] = useState(0);
  // Statut de la connexion Realtime (visible uniquement côté apprenant)
  const [realtimeStatus, setRealtimeStatus] = useState<string>("CONNECTING");
  const [realtimeReconnectKey, setRealtimeReconnectKey] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [lastDbUpdatedAt, setLastDbUpdatedAt] = useState<string | null>(null);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const refetchModuleFromDbRef = useRef<(() => Promise<void>) | null>(null);
  const moduleEditorStorageKey = `module-editor-state:${module.id}`;
  const skipInitialAutosaveRef = useRef(true);
  const saveErrorShownRef = useRef(false);
  const lastChangeToastAtRef = useRef<number>(0);
  const dbSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushImmediateRef = useRef(false);
  const isSavingToDbRef = useRef(false);
  const dbSaveVersionRef = useRef(0);
  const dbSaveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const latestQueuedDbSaveRef = useRef<ModuleEditorSavePayload | null>(null);
  const dbSaveGenerationRef = useRef(0);
  const lastSavedPayloadSignatureRef = useRef<string | null>(null);
  const pendingDbSaveDataRef = useRef<{
    module_id: number;
    module_data: any;
    deleted_cours: any;
    deleted_exercices: any;
    source_fingerprint: string;
  } | null>(null);
  const hydratedModuleIdRef = useRef<number | null>(null);
  const adminLocalEditAtRef = useRef(0);
  const lastQueuedAdminLocalEditAtRef = useRef(0);
  const lastAppliedDbUpdatedAtRef = useRef(0);
  const lastDbUpdatedAtRef = useRef<string | null>(null);
  const lastMaintenanceBroadcastRef = useRef(0);
  const [maintenanceActive, setMaintenanceActive] = useState(false);
  const maintenanceHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toSafeTimestamp = (value: unknown) => {
    const ts = new Date(String(value ?? "")).getTime();
    return Number.isFinite(ts) ? ts : 0;
  };

  const markAdminLocalEdit = () => {
    if (studentOnly) return;
    adminLocalEditAtRef.current = Date.now();
    // Throttled maintenance broadcast (max 1 every 3s) → learners voient
    // instantanément une bannière "Opération de maintenance" pendant que
    // l'admin est en train d'éditer une question/réponse.
    const now = Date.now();
    if (now - lastMaintenanceBroadcastRef.current < 3000) return;
    lastMaintenanceBroadcastRef.current = now;
    (async () => {
      try {
        const chan = supabase.channel(`module-editor-live-${module.id}`);
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(resolve, 500);
          chan.subscribe((status) => {
            if (status === "SUBSCRIBED") { clearTimeout(timeout); resolve(); }
          });
        });
        await chan.send({
          type: "broadcast",
          event: "maintenance-start",
          payload: { moduleId: module.id, at: new Date().toISOString() },
        });
        await supabase.removeChannel(chan);
      } catch (err) {
        console.warn("[Realtime] Broadcast maintenance-start failed (non-bloquant):", err);
      }
    })();
  };

  const markDbSnapshotApplied = (updatedAt: unknown) => {
    const updatedAtString = typeof updatedAt === "string" ? updatedAt : updatedAt ? String(updatedAt) : null;
    const updatedAtTs = toSafeTimestamp(updatedAtString);
    if (updatedAtTs > lastAppliedDbUpdatedAtRef.current) {
      lastAppliedDbUpdatedAtRef.current = updatedAtTs;
    }
    if (updatedAtString) {
      lastDbUpdatedAtRef.current = updatedAtString;
      setLastDbUpdatedAt(updatedAtString);
    }
  };

  const getSavePayloadSignature = (payload: ModuleEditorSavePayload) => JSON.stringify({
    module_id: payload.module_id,
    module_data: payload.module_data ?? null,
    deleted_cours: payload.deleted_cours ?? [],
    deleted_exercices: payload.deleted_exercices ?? [],
    source_fingerprint: payload.source_fingerprint ?? null,
  });

  const shouldSkipFetchedQuestionState = (remoteUpdatedAt: unknown, fetchStartedAt: number, context: string) => {
    const remoteTs = toSafeTimestamp(remoteUpdatedAt);

    if (remoteTs > 0 && remoteTs < lastAppliedDbUpdatedAtRef.current) {
      console.warn(`[ModuleDetailView] Ignoring stale ${context} snapshot`, {
        moduleId: module.id,
        remoteUpdatedAt,
        lastApplied: lastDbUpdatedAtRef.current,
      });
      return true;
    }

    if (!studentOnly && adminLocalEditAtRef.current > 0) {
      const localEditHappenedAfterFetchStarted = adminLocalEditAtRef.current > fetchStartedAt;
      const remotePredatesLocalEdit = remoteTs === 0 || remoteTs < adminLocalEditAtRef.current;

      if (localEditHappenedAfterFetchStarted || remotePredatesLocalEdit) {
        console.warn(`[ModuleDetailView] Preserving newer admin edits over ${context} snapshot`, {
          moduleId: module.id,
          remoteUpdatedAt,
          adminLocalEditAt: new Date(adminLocalEditAtRef.current).toISOString(),
        });
        return true;
      }
    }

    return false;
  };

  const preserveNewerLocalQuestionEdits = (incoming: ModuleData, previous: ModuleData, context: string): ModuleData => {
    if (studentOnly || adminLocalEditAtRef.current === 0) return incoming;

    let preserved = false;
    const previousExerciseMap = new Map((previous.exercices ?? []).map((exo) => [Number(exo.id), exo]));
    const incomingExercices = (incoming.exercices ?? []).map((incomingExo) => {
      const previousExo = previousExerciseMap.get(Number(incomingExo.id));
      if (!previousExo?.questions || !incomingExo.questions) return incomingExo;

      const incomingQuestionIds = new Set(incomingExo.questions.map((q) => Number(q.id)));
      const previousQuestionMap = new Map(previousExo.questions.map((q) => [Number(q.id), q]));
      const mergedQuestions = incomingExo.questions.map((incomingQ) => {
        const previousQ = previousQuestionMap.get(Number(incomingQ.id));
        if (!previousQ) return incomingQ;

        const previousEditedAt = toSafeTimestamp((previousQ as any)._editedAt);
        const incomingEditedAt = toSafeTimestamp((incomingQ as any)._editedAt);
        if (previousEditedAt > incomingEditedAt) {
          preserved = true;
          return previousQ;
        }

        return incomingQ;
      });

      const locallyAddedQuestions = previousExo.questions.filter((previousQ) => {
        if (incomingQuestionIds.has(Number(previousQ.id))) return false;
        return toSafeTimestamp((previousQ as any)._editedAt) > 0;
      });

      if (locallyAddedQuestions.length > 0) preserved = true;
      return { ...incomingExo, questions: [...mergedQuestions, ...locallyAddedQuestions] };
    });

    if (preserved) {
      console.warn(`[ModuleDetailView] Preserved newer local admin question edits during ${context}`, { moduleId: module.id });
    }

    return preserved ? { ...incoming, exercices: incomingExercices } : incoming;
  };

  const GENERATED_BILAN_MODULE_IDS = new Set([4, 9, 27, 29, 81, 82, 90]);

  const hasDuplicateGeneratedBilanQuestions = (data: ModuleData | null | undefined) => {
    if (!data || !GENERATED_BILAN_MODULE_IDS.has(Number(data.id))) return false;

    return (data.exercices ?? []).some((exercise) => {
      const seenQuestionKeys = new Set<string>();

      return (exercise.questions ?? []).some((question) => {
        const key = [
          Number(exercise.id),
          String(question.enonce ?? "").trim(),
          String(question.image ?? "").trim(),
          JSON.stringify((question.choix ?? []).map((choice) => ({
            lettre: choice.lettre,
            texte: choice.texte,
            correct: Boolean(choice.correct),
          }))),
        ].join("::");

        if (seenQuestionKeys.has(key)) {
          return true;
        }

        seenQuestionKeys.add(key);
        return false;
      });
    });
  };

  const buildSourceFingerprint = (data: ModuleData) =>
    JSON.stringify({
      v: 12,
      overrides: getOverridesFingerprint(),
      coursCount: data.cours.length,
      exercicesCount: data.exercices.length,
      totalQuestions: data.exercices.reduce((acc, e) => acc + (e.questions?.length || 0), 0),
      cours: data.cours.map((c, index) => ({
        index,
        id: c.id,
        titre: c.titre,
        fichiersCount: c.fichiers?.length || 0,
        fichiers: c.fichiers?.map(f => f.url) || [],
      })),
      exercices: data.exercices.map((e, index) => ({
        index,
        id: e.id,
        titre: e.titre,
        sousTitre: e.sousTitre ?? "",
        questionCount: e.questions?.length || 0,
        questionSignature: (e.questions ?? []).map((q) => ({
          id: q.id,
          enonce: q.enonce,
          image: q.image ?? "",
          choix: q.choix.map((c) => `${c.lettre}:${c.texte}:${c.correct ? 1 : 0}`),
        })),
      })),
    });

  // mergeSourceExercices is now imported from examens-blancs-utils
  // with the correct priority: saved (DB) data takes priority over source

  // Load trainer DB overrides and apply to student view
  // Runs AFTER editorStateHydrated so initial data is already set.
  // Also reruns when apprenantType arrives/changes to avoid losing trainer edits
  // after student data hydration resets moduleData.
  useEffect(() => {
    // BUG #9 FIX: apply trainer overrides even when module_editor_state exists
    // Previously skipped when loadedModuleEditorState was truthy, making the two systems mutually exclusive
    if (!studentOnly || !editorStateHydrated) return;

    async function loadTrainerOverrides() {
      try {
        const fetchStartedAt = Date.now();
        // Appliquer uniquement les overrides des quiz explicitement liés au module.
        // Ne jamais charger tous les quiz_ids dynamiquement : des section_id/question_id
        // identiques existent entre modules et peuvent écraser les réponses admin.
        let targetQuizIds = getTrainerQuizIdsForModule(module.id);
        if (!targetQuizIds || targetQuizIds.length === 0) return;

        const { data } = await supabase
          .from("quiz_questions_overrides")
          .select("quiz_id, fournisseur_id, section_id, question_id, enonce, choix, updated_at")
          .in("quiz_id", targetQuizIds)
          .order("updated_at", { ascending: false });

        if (!data || data.length === 0) return;

        const overrideMap = buildTrainerOverrideMap(data);

        setModuleData((prev) => {
          if (shouldSkipFetchedQuestionState(lastDbUpdatedAtRef.current, fetchStartedAt, "trainer override reload")) return prev;

          const updatedExercices = prev.exercices
            .map((exo) => {
              if (!exo.questions || exo.questions.length === 0) return exo;
              if (isBilanExamGestionExercise(module.id, exo.id)) return exo;

              const updatedQuestions = exo.questions
                .map((q) => {
                  const override = overrideMap.get(`${exo.id}-${q.id}`);
                  if (!override) return q;
                  // Règle dure: si la question a été modifiée par l'admin (_editedAt),
                  // les réponses correctes admin gagnent toujours, sans comparer les timestamps.
                  const adminTs = (q as any)._editedAt ?? undefined;
                  const winner = resolveOverrideConflict(adminTs, override.updated_at);
                  if (winner === "admin") return q;
                  return { ...q, enonce: override.enonce, choix: override.choix };
                })
                .filter((q) => q.enonce !== "__DELETED__");

              // If trainer deleted all questions of this quiz, hide the whole exercise for students
              if (exo.questions.length > 0 && updatedQuestions.length === 0) {
                return null;
              }

              return { ...exo, questions: updatedQuestions };
            })
            .filter((exo): exo is ExerciceItem => exo !== null);

          return { ...prev, exercices: updatedExercices };
        });
      } catch (err) {
        console.error("[ModuleDetailView] Error loading trainer overrides:", err);
      }
    }

    loadTrainerOverrides();
  }, [studentOnly, module.id, apprenantType, editorStateHydrated, loadedModuleEditorState, trainerOverridesReapplyKey, lastDbUpdatedAt]);

  useEffect(() => {
    if (studentOnly || !editorStateHydrated) return;

    async function loadTrainerOverrideWarnings() {
      const targetQuizIds = getTrainerQuizIdsForModule(module.id);
      if (targetQuizIds.length === 0) {
        setTrainerOverrideWarnings(new Map());
        return;
      }

      const { data, error } = await supabase
        .from("quiz_questions_overrides")
        .select("quiz_id, fournisseur_id, section_id, question_id, enonce, choix, updated_at")
        .in("quiz_id", targetQuizIds)
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("[ModuleDetailView] Error loading trainer override warnings:", error);
        return;
      }

      setTrainerOverrideWarnings(buildTrainerOverrideMap(data));
    }

    loadTrainerOverrideWarnings();
  }, [studentOnly, module.id, editorStateHydrated, trainerOverridesReapplyKey]);

  useEffect(() => {
    const initialData = getInitialModuleData(module, apprenantType, studentOnly);
    const sourceFingerprint = buildSourceFingerprint(initialData);
    setLoadedModuleEditorState(false);
    const moduleIdNumber = Number(module.id);
    const isNewModuleHydration = hydratedModuleIdRef.current !== moduleIdNumber;
    skipInitialAutosaveRef.current = isNewModuleHydration;
    if (isNewModuleHydration) {
      hydratedModuleIdRef.current = null;
      adminLocalEditAtRef.current = 0;
      lastAppliedDbUpdatedAtRef.current = 0;
      lastDbUpdatedAtRef.current = null;
      latestQueuedDbSaveRef.current = null;
      lastSavedPayloadSignatureRef.current = null;
      dbSaveGenerationRef.current += 1;
      setLastDbUpdatedAt(null);
      setTrainerOverrideWarnings(new Map());
    }

    const loadLocalState = () => {
      if (typeof window === "undefined") return false;
      if (usesDatabaseOnlyEditorState(module.id)) {
        window.localStorage.removeItem(moduleEditorStorageKey);
        return false;
      }

      try {
        const raw = window.localStorage.getItem(moduleEditorStorageKey);
        if (!raw) return false;

        const parsed = JSON.parse(raw) as {
          moduleData?: ModuleData;
          deletedCours?: ContentItem[];
          deletedExercices?: ExerciceItem[];
          sourceFingerprint?: string;
        };

        if (parsed.sourceFingerprint !== sourceFingerprint) {
          window.localStorage.removeItem(moduleEditorStorageKey);
          return false;
        }

        const hasValidModuleData =
          parsed?.moduleData &&
          Array.isArray(parsed.moduleData.cours) &&
          Array.isArray(parsed.moduleData.exercices) &&
          Number(parsed.moduleData.id) === Number(module.id);

        if (!hasValidModuleData) return false;

        if (hasDuplicateGeneratedBilanQuestions(parsed.moduleData)) {
          window.localStorage.removeItem(moduleEditorStorageKey);
          return false;
        }

        const deletedExerciceIdsLocal = Array.isArray(parsed.deletedExercices)
          ? parsed.deletedExercices.map((e: any) => Number(e?.id)).filter((n: number) => !Number.isNaN(n))
          : [];
        const mergedModuleData: ModuleData = {
          ...parsed.moduleData,
          exercices: mergeSourceExercices(parsed.moduleData.exercices, initialData.exercices, deletedExerciceIdsLocal),
        };

        setModuleData(forceSourceExerciseTitles(module.id, mergedModuleData, initialData));
        setDeletedCours(Array.isArray(parsed.deletedCours) ? parsed.deletedCours : []);
        setDeletedExercices(Array.isArray(parsed.deletedExercices) ? parsed.deletedExercices : []);
        setLoadedModuleEditorState(false);

        return true;
      } catch (error) {
        console.error("Erreur chargement état local module:", error);
        return false;
      }
    };

    (async () => {
      try {
        const fetchStartedAt = Date.now();
        const requestTimestamp = new Date().toISOString();
        const { data, error } = await supabase
          .from("module_editor_state")
          .select("module_data, deleted_cours, deleted_exercices, updated_at, source_fingerprint")
          .eq("module_id", module.id)
          .lte("updated_at", requestTimestamp)
          .order("updated_at", { ascending: false })
          .limit(1);

        if (error) throw error;

        const latestState = Array.isArray(data) ? data[0] : null;

        // DB is the source of truth. Never let an admin browser cache overwrite
        // module_editor_state, otherwise old answers from localStorage can restore
        // previous corrections after a reload or a stale tab.

        const parentModuleId = FC_BILAN_PARENT_BY_MODULE_ID[Number(module.id)];

        let vtcSecurityForTaxi: ExerciceItem | null = null;
        if (Number(module.id) === BILAN_TAXI_MODULE_ID) {
          try {
            const { data: vtcBilanState } = await supabase
              .from("module_editor_state")
              .select("module_data")
              .eq("module_id", BILAN_VTC_MODULE_ID)
              .order("updated_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            const vtcBilanData = vtcBilanState?.module_data as unknown as ModuleData | undefined;
            vtcSecurityForTaxi = getExerciseById(vtcBilanData, SECURITE_ROUTIERE_BILAN_ID)
              ?? getExerciseById(getInitialModuleDataRaw({ id: BILAN_VTC_MODULE_ID, nom: "4.BILAN EXERCICES VTC" }, apprenantType, studentOnly), SECURITE_ROUTIERE_BILAN_ID);
          } catch (e) {
            console.error("[Bilan TAXI] Erreur récupération Sécurité Routière VTC:", e);
          }
        }

        // Ancien comportement dangereux : si le module source était plus récent,
        // il remplaçait le Bilan déjà modifié par l'admin quelques minutes après.
        // Désormais, le module courant en base est toujours prioritaire ; la
        // source ne sert qu'au tout premier backfill quand aucun état n'existe.
        if (!latestState?.module_data && shouldSyncVtcBilanFromCours(module.id) && initialData.exercices.length > 0) {
          try {
            const { data: sourceState } = await supabase
              .from("module_editor_state")
              .select("module_data, deleted_exercices, updated_at")
              .eq("module_id", BILAN_VTC_SOURCE_MODULE_ID)
              .order("updated_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            const sourceMd = sourceState?.module_data as unknown as ModuleData | undefined;
            if (sourceMd?.exercices && Array.isArray(sourceMd.exercices)) {
              if (shouldSkipFetchedQuestionState(sourceState.updated_at, fetchStartedAt, "initial generated bilan source sync")) {
                setEditorStateHydrated(true);
                return;
              }

              const sourceInitial = JSON.parse(JSON.stringify(VTC_COURS_DATA)) as ModuleData;
              const deletedSourceIds = Array.isArray(sourceState?.deleted_exercices)
                ? (sourceState.deleted_exercices as any[]).map((e: any) => Number(e?.id)).filter((n) => !Number.isNaN(n))
                : [];
              const sourceExercices = mergeSourceExercices(sourceMd.exercices, sourceInitial.exercices, deletedSourceIds);
              const syncedModuleData = getSyncedBilanVtcModuleData(initialData, sourceExercices, Number(module.id) === 4);

              setModuleData((prev) => preserveNewerLocalQuestionEdits(syncedModuleData, prev, "initial generated bilan source sync"));
              setDeletedCours([]);
              setDeletedExercices([]);
              setLoadedModuleEditorState(true);
              markDbSnapshotApplied(sourceState.updated_at);
              return;
            }
          } catch (e) {
            console.error(`[Bilan VTC] Erreur synchronisation depuis module ${BILAN_VTC_SOURCE_MODULE_ID}:`, e);
          }
        }

        // Modules FC: toujours refléter le bilan parent (4 VTC / 9 TAXI), même si
        // un ancien état propre au module 81/82 existe en base. Sinon les élèves
        // FC gardent des questions/réponses obsolètes.
        if (parentModuleId && initialData.exercices.length > 0) {
          try {
            const { data: parentData } = await supabase
              .from("module_editor_state")
              .select("module_data")
              .eq("module_id", parentModuleId)
              .order("updated_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            const parentMd = parentData?.module_data as unknown as ModuleData | undefined;
            const authoritativeParentMd = parentMd;
            const fcMerged = buildFcBilanModuleFromParent(module.id, authoritativeParentMd, initialData);
            if (fcMerged) {
                console.log(`[FC-Bilan] Module ${module.id} forcé depuis module ${parentModuleId} (sans Gestion)`);
                setModuleData(fcMerged);
                setDeletedCours([]);
                setDeletedExercices([]);
                setLoadedModuleEditorState(true);
                return;
            }
          } catch (e) {
            console.error(`[FC-Bilan] Erreur hydratation forcée module ${module.id} depuis ${parentModuleId}:`, e);
          }
        }

        if (latestState?.module_data) {
          // 🔎 DEBUG carte grise : log what we just READ from DB on initial load
          try {
            const exos = ((latestState.module_data as any)?.exercices ?? []) as any[];
            for (const exo of exos) {
              for (const q of (exo?.questions ?? [])) {
                const enonce = String(q?.enonce ?? "").toLowerCase();
                if (enonce.includes("carte grise")) {
                  console.log("[CarteGriseDebug][INITIAL LOAD READ]", {
                    module_id: module.id,
                    exo_id: exo?.id,
                    exo_titre: exo?.titre,
                    q_id: q?.id,
                    enonce: q?.enonce,
                    choix: JSON.parse(JSON.stringify(q?.choix ?? [])),
                    db_updated_at: latestState.updated_at,
                  });
                }
              }
            }
          } catch (e) {
            console.warn("[CarteGriseDebug] initial-load log failed", e);
          }

          if (shouldSkipFetchedQuestionState(latestState.updated_at, fetchStartedAt, "initial module_editor_state load")) {
            setEditorStateHydrated(true);
            return;
          }

          const md = latestState.module_data as unknown as ModuleData;
          const hasMatchingSourceFingerprint = latestState.source_fingerprint === sourceFingerprint;
          // Reset uniquement sur doublons réels (corruption de données).
          // Ne PAS reset sur fingerprint mismatch car le fingerprint inclut les
          // shared overrides (localStorage) qui changent indépendamment de la source.
          const shouldForceSourceExercisesRefresh = shouldForceBilanReset(module.id, md);

          const hasValidModuleData =
            Array.isArray(md.cours) &&
            Array.isArray(md.exercices) &&
            Number(md.id) === Number(module.id) &&
            (
              Number(module.id) !== 27 ||
              (() => {
                const exerciseIds = md.exercices.map((exo) => Number(exo.id)).sort((a, b) => a - b);
                return exerciseIds.length === 2 && exerciseIds[0] === 250 && exerciseIds[1] === 251;
              })()
            );

          if (hasValidModuleData) {
            if (shouldForceSourceExercisesRefresh) {
              const resetModuleData = JSON.parse(JSON.stringify(initialData)) as ModuleData;
              setModuleData(resetModuleData);
              setDeletedCours([]);
              setDeletedExercices([]);
              setLoadedModuleEditorState(true);

              if (!studentOnly) {
                console.warn("[ModuleEditor] Reset source détecté au chargement — aucune écriture DB automatique n'est lancée");
              }
              return;
            }

            // Always load DB data and re-merge with latest source.
            // Even when fingerprint doesn't match (e.g. source version bumped),
            // admin edits in DB still take priority — merge picks up new source
            // questions while preserving saved edits.
            const deletedExerciceIdsFromDb = (Array.isArray(latestState.deleted_exercices)
              ? (latestState.deleted_exercices as any[]).map((e: any) => Number(e?.id)).filter((n) => !Number.isNaN(n))
              : []);
            const mergedModuleData: ModuleData = {
              ...md,
              exercices: mergeSourceExercices(md.exercices, initialData.exercices, deletedExerciceIdsFromDb),
            };
            let resolvedModuleData = usesDatabaseOnlyEditorState(module.id)
              ? forceSourceExerciseTitles(module.id, mergedModuleData, initialData)
              : forceBilanExamGestionFromSource(
                module.id,
                forceTaxiSecurityFromVtc(
                  forceSourceExerciseTitles(module.id, mergedModuleData, initialData),
                  vtcSecurityForTaxi,
                ),
                initialData,
              );
            if (shouldSyncVtcBilanFromCours(module.id)) {
              const syncedVtcBilan = await loadSyncedVtcBilanFromCours(apprenantType, studentOnly);
              if (syncedVtcBilan) {
                resolvedModuleData = applyManualExerciseEditsFromSource(resolvedModuleData, syncedVtcBilan);
              }
            }
            setModuleData((prev) => preserveNewerLocalQuestionEdits(resolvedModuleData, prev, "initial module_editor_state load"));
            setDeletedCours(Array.isArray(latestState.deleted_cours) ? (latestState.deleted_cours as unknown as ContentItem[]) : []);
            setDeletedExercices(Array.isArray(latestState.deleted_exercices) ? (latestState.deleted_exercices as unknown as ExerciceItem[]) : []);
            setLoadedModuleEditorState(true);
            hydratedModuleIdRef.current = Number(module.id);
            markDbSnapshotApplied(latestState.updated_at);

            // Ne jamais ré-écrire automatiquement au chargement pour "corriger"
            // un fingerprint : cela modifie updated_at et crée exactement les
            // conflits P0409 observés entre deux écritures admin rapprochées.
            if (!studentOnly && !hasMatchingSourceFingerprint) {
              console.log("[ModuleEditor] Fingerprint mismatch ignoré sans écriture DB automatique");
            }
            return;
          }
        }

        if (!studentOnly && loadLocalState()) return;

        // FC Bilan fallback: modules 81 (FC VTC) and 82 (FC TAXI) doivent refléter
        // exactement le bilan complet 4 (VTC) / 9 (TAXI) — sans Gestion (exo id 101).
        // Sans ce fallback, les élèves FC voient la source statique alors que l'admin
        // a modifié le bilan principal.
        if (parentModuleId && initialData.exercices.length > 0) {
          try {
            const { data: parentData } = await supabase
              .from("module_editor_state")
              .select("module_data")
              .eq("module_id", parentModuleId)
              .order("updated_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            const parentMd = parentData?.module_data as unknown as ModuleData | undefined;
            const authoritativeParentMd = parentMd;
            const fcMerged = buildFcBilanModuleFromParent(module.id, authoritativeParentMd, initialData);
            if (fcMerged) {
                console.log(`[FC-Bilan] Module ${module.id} hydraté depuis module ${parentModuleId} (sans Gestion)`);
                setModuleData(fcMerged);
                setDeletedCours([]);
                setDeletedExercices([]);
                setLoadedModuleEditorState(false);
                return;
            }
          } catch (e) {
            console.error(`[FC-Bilan] Erreur hydratation module ${module.id} depuis ${parentModuleId}:`, e);
          }
        }

        // No record for this module — apply cross-module overrides from other modules' records
        // This ensures that question edits made in sibling modules (e.g., module 11 → module 28) are visible
        if (studentOnly && initialData.exercices.length > 0) {
          const crossOverrides = await loadCrossModuleOverridesFromDb();
          if (Object.keys(crossOverrides).length > 0) {
            const updatedExercices = applyCrossModuleOverrides(initialData.exercices, crossOverrides);
            const hasChanges = JSON.stringify(updatedExercices) !== JSON.stringify(initialData.exercices);
            if (hasChanges) {
              console.log("[CrossModule] Applied cross-module overrides to module", module.id);
              setModuleData({ ...initialData, exercices: updatedExercices });
              setDeletedCours([]);
              setDeletedExercices([]);
              setLoadedModuleEditorState(false);
              return;
            }
          }
        }

        setModuleData(initialData);
        setDeletedCours([]);
        setDeletedExercices([]);
        setLoadedModuleEditorState(false);
      } catch (err) {
        console.error("Error loading module editor state:", err);

        if (!studentOnly && loadLocalState()) return;

        setModuleData(initialData);
        setDeletedCours([]);
        setDeletedExercices([]);
        setLoadedModuleEditorState(false);
      } finally {
        setEditorStateHydrated(true);
      }
    })();
  }, [module.id, apprenantType, studentOnly, moduleEditorStorageKey]);

  // === REALTIME: live sync when admin changes questions ===
  useEffect(() => {
    if (!studentOnly) return; // Only students need realtime updates

    // Refetch from DB instead of trusting the payload (which can be truncated for large JSONB)
    const refetchModuleFromDb = async () => {
      try {
        const fetchStartedAt = Date.now();
        const parentModuleId = FC_BILAN_PARENT_BY_MODULE_ID[Number(module.id)];
        let query = supabase
          .from("module_editor_state")
          .select("module_id, module_data, deleted_cours, deleted_exercices, updated_at")
          .order("updated_at", { ascending: false })
          .limit(parentModuleId ? 2 : 1);

        query = parentModuleId
          ? query.in("module_id", [Number(module.id), parentModuleId])
          : query.eq("module_id", module.id);

        const { data, error } = await query;

        if (error) throw error;
        const rows = Array.isArray(data) ? data : [];
        const latest = parentModuleId
          ? (rows.find((row: any) => Number(row?.module_id) === parentModuleId) ?? rows[0] ?? null)
          : (rows[0] ?? null);
        if (!latest?.module_data) return;
        if (shouldSkipFetchedQuestionState(latest.updated_at, fetchStartedAt, "realtime module_editor_state refetch")) return;

        const sourceModuleData = getInitialModuleData(module, apprenantType, studentOnly);

        if (parentModuleId) {
          const parentMd = latest.module_data as unknown as ModuleData;
          const authoritativeParentMd = parentMd;
          const fcMerged = buildFcBilanModuleFromParent(module.id, authoritativeParentMd, sourceModuleData);
          if (!fcMerged) return;
          console.log("[Realtime] Refetched FC bilan from parent module", parentModuleId, "for module", module.id);
          setModuleData((prev) => preserveNewerLocalQuestionEdits(fcMerged, prev, "realtime FC parent refetch"));
          setDeletedCours([]);
          setDeletedExercices([]);
          setLoadedModuleEditorState(true);
          markDbSnapshotApplied(latest.updated_at);
          setLastSyncAt(new Date());
          setTrainerOverridesReapplyKey((k) => k + 1);
          return;
        }

        const md = latest.module_data as unknown as ModuleData;
        const hasValidModuleData =
          Array.isArray(md.cours) &&
          Array.isArray(md.exercices) &&
          Number(md.id) === Number(module.id) &&
          (
            Number(module.id) !== 27 ||
            (() => {
              const exerciseIds = md.exercices.map((exo) => Number(exo.id)).sort((a, b) => a - b);
              return exerciseIds.length === 2 && exerciseIds[0] === 250 && exerciseIds[1] === 251;
            })()
          );

        if (hasValidModuleData) {
          console.log("[Realtime] Refetched module data from DB for module", module.id);
          const deletedExoIdsRt = Array.isArray(latest.deleted_exercices)
            ? (latest.deleted_exercices as any[]).map((e: any) => Number(e?.id)).filter((n) => !Number.isNaN(n))
            : [];
          const mergedRealtimeModuleData: ModuleData = {
            ...md,
            exercices: mergeSourceExercices(md.exercices, sourceModuleData.exercices, deletedExoIdsRt),
          };
          let resolvedRealtimeModuleData = usesDatabaseOnlyEditorState(module.id)
            ? forceSourceExerciseTitles(module.id, mergedRealtimeModuleData, sourceModuleData)
            : forceBilanExamGestionFromSource(module.id, mergedRealtimeModuleData, sourceModuleData);
          if (shouldSyncVtcBilanFromCours(module.id)) {
            const syncedVtcBilan = await loadSyncedVtcBilanFromCours(apprenantType, studentOnly);
            if (syncedVtcBilan) {
              resolvedRealtimeModuleData = applyManualExerciseEditsFromSource(resolvedRealtimeModuleData, syncedVtcBilan);
            }
          }
          setModuleData((prev) => preserveNewerLocalQuestionEdits(resolvedRealtimeModuleData, prev, "realtime module_editor_state refetch"));
          setDeletedCours(Array.isArray(latest.deleted_cours) ? (latest.deleted_cours as unknown as ContentItem[]) : []);
          setDeletedExercices(Array.isArray(latest.deleted_exercices) ? (latest.deleted_exercices as unknown as ExerciceItem[]) : []);
          setLoadedModuleEditorState(true);
          markDbSnapshotApplied(latest.updated_at);
          setLastSyncAt(new Date());
          // Re-apply fournisseur overrides après reload DB (sinon perdu par le merge admin)
          setTrainerOverridesReapplyKey((k) => k + 1);
          return;
        }

        // Fallback seulement s'il n'existe PAS encore d'état propre au module.
        // Ne jamais l'utiliser pour écraser des corrections admin existantes.
        if (shouldSyncVtcBilanFromCours(module.id)) {
          const { data: sourceState } = await supabase
            .from("module_editor_state")
            .select("module_data, deleted_exercices")
            .eq("module_id", BILAN_VTC_SOURCE_MODULE_ID)
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          const sourceMd = sourceState?.module_data as unknown as ModuleData | undefined;
          if (sourceMd?.exercices && Array.isArray(sourceMd.exercices)) {
            const sourceInitial = JSON.parse(JSON.stringify(VTC_COURS_DATA)) as ModuleData;
            const deletedSourceIds = Array.isArray(sourceState?.deleted_exercices)
              ? (sourceState.deleted_exercices as any[]).map((e: any) => Number(e?.id)).filter((n) => !Number.isNaN(n))
              : [];
            const sourceExercices = mergeSourceExercices(sourceMd.exercices, sourceInitial.exercices, deletedSourceIds);
            setModuleData((prev) => applyManualExerciseEditsFromSource(
              getSyncedBilanVtcModuleData(prev, sourceExercices, Number(module.id) === 4),
              getSyncedBilanVtcModuleData(sourceModuleData, sourceExercices, Number(module.id) === 4),
            ));
            setDeletedCours([]);
            setDeletedExercices([]);
            setLoadedModuleEditorState(true);
            setTrainerOverridesReapplyKey((k) => k + 1);
          }
        }
      } catch (err) {
        console.error("[Realtime] Error refetching module data:", err);
      }
    };
    refetchModuleFromDbRef.current = refetchModuleFromDb;

    const handleRealtimeChange = async (payload: any) => {
      const newData = payload.new as any;
      const eventModule = newData?.module_id != null ? Number(newData.module_id) : null;

        if (
          eventModule === Number(module.id) ||
          eventModule === FC_BILAN_PARENT_BY_MODULE_ID[Number(module.id)] ||
          (shouldSyncVtcBilanFromCours(module.id) && eventModule === BILAN_VTC_SOURCE_MODULE_ID)
        ) {
        // Direct module match — refetch full data from DB (payload may be truncated)
        await refetchModuleFromDb();
      } else {
        // Another module was updated — check for shared questions (cross-module propagation)
        const crossOverrides = await loadCrossModuleOverridesFromDb();
        if (Object.keys(crossOverrides).length > 0) {
          setModuleData((prev) => {
            const updatedExercices = applyCrossModuleOverrides(prev.exercices, crossOverrides);
            const hasChanges = JSON.stringify(updatedExercices) !== JSON.stringify(prev.exercices);
            if (hasChanges) {
              console.log("[Realtime/CrossModule] Applied cross-module overrides to module", module.id);
              return { ...prev, exercices: updatedExercices };
            }
            return prev;
          });
        }
      }
    };

    // Handle trainer quiz_questions_overrides changes in realtime
    const handleTrainerOverrideChange = async (payload: any) => {
      const fetchStartedAt = Date.now();
      const targetQuizIds = getTrainerQuizIdsForModule(module.id);

      if (targetQuizIds.length === 0) return;

      const newRow = payload.new as any;
      // Only process if it's for the relevant quiz
      if (newRow?.quiz_id && !targetQuizIds.includes(newRow.quiz_id)) return;

      console.log("[Realtime] Trainer override changed, reloading for module", module.id);

      // Reload all overrides for this quiz
      const { data } = await supabase
        .from("quiz_questions_overrides")
        .select("quiz_id, fournisseur_id, section_id, question_id, enonce, choix, updated_at")
        .in("quiz_id", targetQuizIds)
        .order("updated_at", { ascending: false });

      if (!data || data.length === 0) return;

      const overrideMap = buildTrainerOverrideMap(data);

      setModuleData((prev) => {
        if (shouldSkipFetchedQuestionState(lastDbUpdatedAtRef.current, fetchStartedAt, "realtime trainer override reload")) return prev;

        const updatedExercices = prev.exercices
          .map((exo) => {
            if (!exo.questions || exo.questions.length === 0) return exo;
            if (isBilanExamGestionExercise(module.id, exo.id)) return exo;
            const updatedQuestions = exo.questions
              .map((q) => {
                const override = overrideMap.get(`${exo.id}-${q.id}`);
                if (!override) return q;
                // Règle dure: si la question a été modifiée par l'admin (_editedAt),
                // les réponses correctes admin gagnent toujours, sans comparer les timestamps.
                const adminTs = (q as any)._editedAt ?? undefined;
                const winner = resolveOverrideConflict(adminTs, override.updated_at);
                if (winner === "admin") return q;
                return { ...q, enonce: override.enonce, choix: override.choix };
              })
              .filter((q) => q.enonce !== "__DELETED__");
            if (exo.questions.length > 0 && updatedQuestions.length === 0) return null;
            return { ...exo, questions: updatedQuestions };
          })
          .filter((exo): exo is ExerciceItem => exo !== null);
        return { ...prev, exercices: updatedExercices };
      });
    };

    const channel = supabase
      .channel(`module-editor-live-${module.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'module_editor_state',
        },
        handleRealtimeChange
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quiz_questions_overrides',
        },
        handleTrainerOverrideChange
      )
      // Broadcast complémentaire émis par l'admin après chaque autosave
      // (permet un refresh apprenant instantané même si postgres_changes est retardé)
      .on('broadcast', { event: 'module-updated' }, () => {
        console.log(`[Realtime/Broadcast] module-updated received for module ${module.id}`);
        // Fin de la maintenance : les nouvelles données arrivent, on masque la bannière.
        if (maintenanceHideTimerRef.current) {
          clearTimeout(maintenanceHideTimerRef.current);
          maintenanceHideTimerRef.current = null;
        }
        setMaintenanceActive(false);
        void refetchModuleFromDb();
      })
      .on('broadcast', { event: 'maintenance-start' }, () => {
        console.log(`[Realtime/Broadcast] maintenance-start received for module ${module.id}`);
        setMaintenanceActive(true);
        // Auto-clear après 10s si aucun module-updated n'arrive (garde-fou).
        if (maintenanceHideTimerRef.current) clearTimeout(maintenanceHideTimerRef.current);
        maintenanceHideTimerRef.current = setTimeout(() => {
          setMaintenanceActive(false);
          maintenanceHideTimerRef.current = null;
        }, 10_000);
      })
      .subscribe((status) => {
        console.log(`[Realtime] Channel module-editor-live-${module.id} status:`, status);
        setRealtimeStatus(status);
        // Auto-reconnect on failure so students never miss admin corrections
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setTimeout(() => setRealtimeReconnectKey((k) => k + 1), 3000);
        }
      });

    // Polling fallback — plus rapide côté apprenant pour garantir que
    // toute modification admin (suppression d'image, édition de réponse…)
    // soit visible en moins de 5 s même si Realtime rate un événement.
    const pollIntervalMs = studentOnly ? 5_000 : 15_000;
    const pollTimer = setInterval(() => {
      void refetchModuleFromDb();
    }, pollIntervalMs);

    // Refetch immédiat quand l'onglet reprend le focus (l'apprenant revient sur la page)
    const handleFocusRefresh = () => { void refetchModuleFromDb(); };
    window.addEventListener('focus', handleFocusRefresh);

    return () => {
      clearInterval(pollTimer);
      window.removeEventListener('focus', handleFocusRefresh);
      supabase.removeChannel(channel);
    };
  }, [module.id, studentOnly, realtimeReconnectKey]);


  // Polling fallback for students: if realtime subscription fails or misses events,
  // re-fetch from DB when the tab becomes visible again (e.g. student switches back).
  // This ensures students ALWAYS see the latest admin changes without needing to logout.
  useEffect(() => {
    if (!studentOnly || !editorStateHydrated) return;

    let lastCheckedAt = Date.now();

    const handleVisibilityChange = async () => {
      if (document.hidden) return;
      // Only re-check if at least 10s have passed since last check
      if (Date.now() - lastCheckedAt < 10_000) return;
      lastCheckedAt = Date.now();

      try {
        const fetchStartedAt = Date.now();
        const parentModuleId = FC_BILAN_PARENT_BY_MODULE_ID[Number(module.id)];
        let query = supabase
          .from("module_editor_state")
          .select("module_id, module_data, deleted_cours, deleted_exercices, updated_at")
          .order("updated_at", { ascending: false })
          .limit(parentModuleId ? 2 : 1);

        query = parentModuleId
          ? query.in("module_id", [Number(module.id), parentModuleId])
          : query.eq("module_id", module.id);

        const { data, error } = await query;

        if (error || !data || data.length === 0) return;

        const rows = Array.isArray(data) ? data : [];
        const latest = parentModuleId
          ? (rows.find((row: any) => Number(row?.module_id) === parentModuleId) ?? rows[0] ?? null)
          : (rows[0] ?? null);
        if (!latest?.module_data) return;
        if (shouldSkipFetchedQuestionState(latest.updated_at, fetchStartedAt, "visibility module_editor_state refresh")) return;

        const sourceModuleData = getInitialModuleData(module, apprenantType, studentOnly);

        if (parentModuleId) {
          const parentMd = latest.module_data as unknown as ModuleData;
          const authoritativeParentMd = parentMd;
          const fcMerged = buildFcBilanModuleFromParent(module.id, authoritativeParentMd, sourceModuleData);
          if (!fcMerged) return;

          let didUpdate = false;
          setModuleData((prev) => {
            if (JSON.stringify(prev.exercices) === JSON.stringify(fcMerged.exercices) &&
                JSON.stringify(prev.cours) === JSON.stringify(fcMerged.cours)) {
              return prev;
            }
            console.log("[Visibility] Refreshed FC bilan from parent module", parentModuleId, "for module", module.id);
            didUpdate = true;
            return preserveNewerLocalQuestionEdits(fcMerged, prev, "visibility FC parent refresh");
          });
          markDbSnapshotApplied(latest.updated_at);
          if (didUpdate) setTrainerOverridesReapplyKey((k) => k + 1);
          return;
        }

        const md = latest.module_data as unknown as ModuleData;
        if (!Array.isArray(md.cours) || !Array.isArray(md.exercices)) return;
        if (Number(md.id) !== Number(module.id)) return;

        const deletedExoIdsPoll = Array.isArray(latest.deleted_exercices)
          ? (latest.deleted_exercices as any[]).map((e: any) => Number(e?.id)).filter((n) => !Number.isNaN(n))
          : [];
        const merged: ModuleData = {
          ...md,
          exercices: mergeSourceExercices(md.exercices, sourceModuleData.exercices, deletedExoIdsPoll),
        };
        let resolved = usesDatabaseOnlyEditorState(module.id)
          ? forceSourceExerciseTitles(module.id, merged, sourceModuleData)
          : forceBilanExamGestionFromSource(module.id, merged, sourceModuleData);
        if (shouldSyncVtcBilanFromCours(module.id)) {
          const syncedVtcBilan = await loadSyncedVtcBilanFromCours(apprenantType, studentOnly);
          if (syncedVtcBilan) {
            resolved = applyManualExerciseEditsFromSource(resolved, syncedVtcBilan);
          }
        }

        // Only update if data actually changed
        let didUpdate = false;
        setModuleData((prev) => {
          if (JSON.stringify(prev.exercices) === JSON.stringify(resolved.exercices) &&
              JSON.stringify(prev.cours) === JSON.stringify(resolved.cours)) {
            return prev;
          }
          console.log("[Visibility] Refreshed module data from DB for module", module.id);
          didUpdate = true;
          return preserveNewerLocalQuestionEdits(resolved, prev, "visibility module_editor_state refresh");
        });
        markDbSnapshotApplied(latest.updated_at);
        // Re-apply fournisseur overrides après reload DB
        if (didUpdate) setTrainerOverridesReapplyKey((k) => k + 1);
      } catch (err) {
        console.error("[Visibility] Error refreshing module data:", err);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Periodic polling fallback (every 45s) — catches missed realtime events
    // when the tab stays visible for a long time (student watching a course).
    const pollingInterval = window.setInterval(() => {
      if (!document.hidden) {
        lastCheckedAt = 0; // bypass the 10s throttle
        void handleVisibilityChange();
      }
    }, 45_000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.clearInterval(pollingInterval);
    };
  }, [module.id, studentOnly, editorStateHydrated, apprenantType]);


  const isStaleModuleEditorStateError = (error: unknown): boolean => {
    const maybeError = error as { code?: string; message?: string } | null | undefined;
    const msg = String(maybeError?.message ?? "");
    return maybeError?.code === "P0409" || msg.includes("stale_module_editor_state_write");
  };

  const saveModuleEditorStateWithCas = async ({
    moduleId,
    moduleData,
    deletedCours,
    deletedExercices,
    sourceFingerprint,
    expectedUpdatedAt,
  }: {
    moduleId: number;
    moduleData: ModuleData | Record<string, unknown>;
    deletedCours: unknown[] | unknown;
    deletedExercices: unknown[] | unknown;
    sourceFingerprint: string | null;
    expectedUpdatedAt: string | null | undefined;
  }): Promise<string> => {
    const fallbackSavedAt = new Date().toISOString();
    const { data: casData, error } = await supabase.rpc("save_module_editor_state", {
      p_module_id: moduleId,
      p_module_data: moduleData as any,
      p_deleted_cours: (deletedCours ?? []) as any,
      p_deleted_exercices: (deletedExercices ?? []) as any,
      p_source_fingerprint: sourceFingerprint,
      p_expected_updated_at: expectedUpdatedAt ?? null,
    });

    if (error) throw error;
    return (Array.isArray(casData) ? casData[0]?.updated_at : (casData as any)?.updated_at) ?? fallbackSavedAt;
  };

  const loadModuleEditorStateRow = async (moduleId: number) => {
    const { data, error } = await supabase
      .from("module_editor_state")
      .select("module_data, deleted_cours, deleted_exercices, source_fingerprint, updated_at")
      .eq("module_id", moduleId)
      .maybeSingle();

    if (error) throw error;
    return data as unknown as {
      module_data: ModuleData | null;
      deleted_cours: unknown[] | null;
      deleted_exercices: unknown[] | null;
      source_fingerprint: string | null;
      updated_at: string | null;
    } | null;
  };

  const performDbSave = async (dataToSave: ModuleEditorSavePayload, options: { retryStaleOnce?: boolean } = {}) => {
    isSavingToDbRef.current = true;
    try {
      let normalizedModuleData = normalizeManualQuestionFlags(dataToSave.module_data as ModuleData);
      // Snapshot ancienne version pour détecter les changements pédagogiques
      let previousModuleData: any = null;
      let currentRow: Awaited<ReturnType<typeof loadModuleEditorStateRow>> = null;
      try {
        currentRow = await loadModuleEditorStateRow(dataToSave.module_id);
        previousModuleData = currentRow?.module_data ?? null;
      } catch (readError) {
        console.warn("[ModuleEditor] Lecture pré-sauvegarde impossible:", readError);
      }

      // Compare-and-swap: refuse d'écraser une version en base plus récente que
      // celle que cet onglet a lue (protection contre les onglets admin restés
      // ouverts avec un vieux snapshot qui rétabliraient de mauvaises réponses).
      let persistedUpdatedAt: string;
      try {
        persistedUpdatedAt = await saveModuleEditorStateWithCas({
          moduleId: dataToSave.module_id,
          moduleData: normalizedModuleData,
          deletedCours: dataToSave.deleted_cours ?? [],
          deletedExercices: dataToSave.deleted_exercices ?? [],
          sourceFingerprint: dataToSave.source_fingerprint ?? null,
          expectedUpdatedAt: lastDbUpdatedAtRef.current,
        });
      } catch (saveError) {
        if (!options.retryStaleOnce || !isStaleModuleEditorStateError(saveError)) {
          throw saveError;
        }

        const latestRow = await loadModuleEditorStateRow(dataToSave.module_id);
        previousModuleData = latestRow?.module_data ?? previousModuleData;
        markDbSnapshotApplied(latestRow?.updated_at ?? null);

        normalizedModuleData = normalizeManualQuestionFlags(
          mergeLatestDbModuleWithLocalIntent(
            latestRow?.module_data ?? null,
            normalizedModuleData,
            dataToSave.deleted_exercices,
          ),
        );

        console.warn("[ModuleEditor] P0409 détecté : dernière version rechargée, modification locale refusionnée, retry unique", {
          moduleId: dataToSave.module_id,
          latestUpdatedAt: latestRow?.updated_at,
        });

        persistedUpdatedAt = await saveModuleEditorStateWithCas({
          moduleId: dataToSave.module_id,
          moduleData: normalizedModuleData,
          deletedCours: dataToSave.deleted_cours ?? latestRow?.deleted_cours ?? [],
          deletedExercices: dataToSave.deleted_exercices ?? latestRow?.deleted_exercices ?? [],
          sourceFingerprint: dataToSave.source_fingerprint ?? latestRow?.source_fingerprint ?? null,
          expectedUpdatedAt: latestRow?.updated_at ?? null,
        });
      }

      saveErrorShownRef.current = false;
      markDbSnapshotApplied(persistedUpdatedAt);

      // Le trigger DB peut refuser une question plus ancienne envoyée par un onglet
      // resté ouvert. Toutes les propagations/audits ci-dessous doivent donc partir
      // de la version réellement conservée en base, pas du payload navigateur.
      let confirmedRow: Awaited<ReturnType<typeof loadModuleEditorStateRow>> = null;
      try {
        confirmedRow = await loadModuleEditorStateRow(dataToSave.module_id);
        if (confirmedRow?.module_data) {
          normalizedModuleData = confirmedRow.module_data as unknown as ModuleData;
          markDbSnapshotApplied(confirmedRow.updated_at ?? persistedUpdatedAt);
          const confirmedSignature = getSavePayloadSignature({
            ...dataToSave,
            module_data: normalizedModuleData,
            deleted_cours: confirmedRow.deleted_cours ?? dataToSave.deleted_cours ?? [],
            deleted_exercices: confirmedRow.deleted_exercices ?? dataToSave.deleted_exercices ?? [],
            source_fingerprint: confirmedRow.source_fingerprint ?? dataToSave.source_fingerprint ?? null,
          });
          lastSavedPayloadSignatureRef.current = confirmedSignature;
          setModuleData(normalizedModuleData);
          setDeletedCours(Array.isArray(confirmedRow.deleted_cours) ? (confirmedRow.deleted_cours as ContentItem[]) : []);
          setDeletedExercices(Array.isArray(confirmedRow.deleted_exercices) ? (confirmedRow.deleted_exercices as ExerciceItem[]) : []);
        }
      } catch (confirmReadError) {
        console.warn("[ModuleEditor] Lecture confirmation sauvegarde impossible:", confirmReadError);
      }

      const savedAt = confirmedRow?.updated_at ?? persistedUpdatedAt;

      // Les modules FC 81/82 sont affichés aux apprenants depuis leur Bilan parent
      // (4/9) pour éviter les anciennes copies obsolètes. Donc si l'admin modifie
      // directement le module FC, on répercute immédiatement ces exercices dans le
      // parent, sinon l'admin voit bien la correction mais l'apprenant relit l'ancien parent.
      const fcParentId = FC_BILAN_PARENT_BY_MODULE_ID[Number(dataToSave.module_id)];
      if (fcParentId) {
        try {
          const { data: parentRow, error: parentReadError } = await supabase
            .from("module_editor_state")
            .select("module_data, deleted_cours, deleted_exercices, source_fingerprint, updated_at")
            .eq("module_id", fcParentId)
            .maybeSingle();

          if (parentReadError) throw parentReadError;

          const parentModuleData = (parentRow?.module_data as unknown as ModuleData | undefined)
            ?? getInitialModuleDataRaw({ id: fcParentId, nom: `Module ${fcParentId}` }, apprenantType, false);
          const nextParentModuleData = buildParentBilanModuleFromFcChild(parentModuleData, normalizedModuleData);

          if (nextParentModuleData) {
            const parentSavedAt = await saveModuleEditorStateWithCas({
              moduleId: fcParentId,
              moduleData: normalizeManualQuestionFlags(nextParentModuleData),
              deletedCours: parentRow?.deleted_cours ?? [],
              deletedExercices: parentRow?.deleted_exercices ?? [],
              sourceFingerprint: parentRow?.source_fingerprint ?? buildSourceFingerprint(parentModuleData),
              expectedUpdatedAt: parentRow?.updated_at ?? null,
            });

            try {
              const parentChan = supabase.channel(`module-editor-live-${fcParentId}`);
              await new Promise<void>((resolve) => {
                const timeout = setTimeout(resolve, 500);
                parentChan.subscribe((status) => {
                  if (status === 'SUBSCRIBED') {
                    clearTimeout(timeout);
                    resolve();
                  }
                });
              });
              await parentChan.send({
                type: 'broadcast',
                event: 'module-updated',
                payload: { moduleId: fcParentId, at: parentSavedAt, syncedFromFc: dataToSave.module_id },
              });
              await supabase.removeChannel(parentChan);
            } catch (parentBroadcastErr) {
              console.warn('[FC-Bilan] Broadcast parent failed (non-bloquant):', parentBroadcastErr);
            }
          }
        } catch (fcParentSyncError) {
          console.error('[FC-Bilan] Synchronisation module FC → parent impossible:', fcParentSyncError);
          toast.error("Correction enregistrée, mais la synchronisation apprenant a échoué. Réessayez.");
        }
      }

      // 📣 Broadcast complémentaire : force un refresh instantané côté apprenant
      // (backup de postgres_changes ; utile quand l'image d'une question est supprimée
      // et que l'apprenant doit voir la mise à jour sans attendre le polling).
      try {
        const broadcastChan = supabase.channel(`module-editor-live-${dataToSave.module_id}`);
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(resolve, 600);
          broadcastChan.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              clearTimeout(timeout);
              resolve();
            }
          });
        });
        await broadcastChan.send({
          type: 'broadcast',
          event: 'module-updated',
          payload: { moduleId: dataToSave.module_id, at: savedAt },
        });
        await supabase.removeChannel(broadcastChan);
      } catch (broadcastErr) {
        console.warn('[Realtime] Broadcast module-updated failed (non-bloquant):', broadcastErr);
      }

      // 🔎 DEBUG carte grise : log the exact choix array we just wrote to DB
      try {
        const exos = (normalizedModuleData?.exercices ?? []) as any[];
        for (const exo of exos) {
          for (const q of (exo?.questions ?? [])) {
            const enonce = String(q?.enonce ?? "").toLowerCase();
            if (enonce.includes("carte grise")) {
              console.log("[CarteGriseDebug][UPSERT WRITTEN]", {
                module_id: dataToSave.module_id,
                exo_id: exo?.id,
                exo_titre: exo?.titre,
                q_id: q?.id,
                enonce: q?.enonce,
                choix: JSON.parse(JSON.stringify(q?.choix ?? [])),
                savedAt,
              });
            }
          }
        }
        // Re-read immediately to confirm what is actually stored
        const { data: verifyRow } = await supabase
          .from("module_editor_state")
          .select("module_data, updated_at")
          .eq("module_id", dataToSave.module_id)
          .maybeSingle();
        const vexos = ((verifyRow?.module_data as any)?.exercices ?? []) as any[];
        for (const exo of vexos) {
          for (const q of (exo?.questions ?? [])) {
            const enonce = String(q?.enonce ?? "").toLowerCase();
            if (enonce.includes("carte grise")) {
              console.log("[CarteGriseDebug][UPSERT VERIFY READBACK]", {
                module_id: dataToSave.module_id,
                exo_id: exo?.id,
                q_id: q?.id,
                choix: JSON.parse(JSON.stringify(q?.choix ?? [])),
                db_updated_at: verifyRow?.updated_at,
              });
            }
          }
        }
      } catch (e) {
        console.warn("[CarteGriseDebug] log failed", e);
      }

      // Détection et publication d'une notification de changement
      try {
        const summary = diffModuleData(previousModuleData, normalizedModuleData);
        if (summary) {
          publishModuleChangeNotification({
            moduleId: dataToSave.module_id,
            moduleNom: module.nom,
            summary,
          });
          // Toast admin : confirmer visuellement l'enregistrement des modifs/suppressions de questions
          if (/question|exercice/i.test(summary)) {
            const now = Date.now();
            if (now - (lastChangeToastAtRef.current ?? 0) > 1500) {
              lastChangeToastAtRef.current = now;
              toast.success("✅ Changement enregistré");
            }
          }
        }
      } catch (e) {
        console.error("[ModuleNotif] diff/publish error:", e);
      }

      // 📝 Journal d'audit : trace question par question chaque changement admin
      void logAdminEditsDiff(
        dataToSave.module_id,
        module.nom,
        previousModuleData,
        normalizedModuleData,
        "ModuleDetailView.performDbSave",
      );

      // Sync shared exercises to ALL sibling modules (handles edits, adds, deletes)
      await syncSharedExercisesToSiblingModules(
        dataToSave.module_id,
        normalizedModuleData.exercices ?? [],
        (dataToSave.deleted_exercices ?? []).map((e: any) => e.id),
      );

      // Aucun miroir VTC↔TAXI automatique ici : chaque écriture implicite sur un
      // autre module crée un updated_at concurrent et peut réintroduire d'anciens
      // snapshots. Les modules FC continuent seulement de lire leur parent.
    } catch (err: any) {
      console.error("Erreur sauvegarde DB module_editor_state:", err);
      // Extraction du message d'erreur exact (Supabase/Postgres)
      const rawMsg = err?.message || err?.error_description || err?.details || err?.hint || (typeof err === "string" ? err : "");
      const code = err?.code ? ` [${err.code}]` : "";
      const exactMsg = rawMsg ? `${rawMsg}${code}` : "Erreur inconnue";

      if (isStaleModuleEditorStateError(err)) {
        console.warn("[ModuleEditor] Stale write blocked by DB compare-and-swap", {
          moduleId: dataToSave.module_id,
          expectedUpdatedAt: lastDbUpdatedAtRef.current,
          error: err,
        });
        toast.error(
          `Version obsolète bloquée par le serveur après le retry automatique : rechargez la page avant de ré-enregistrer.\n\nDétail : ${exactMsg}`,
          { duration: 10000 },
        );
        saveErrorShownRef.current = true;
        return;
      }
      // Toujours afficher le message exact renvoyé par Supabase — plus de message générique masqué
      toast.error(`❌ Sauvegarde refusée par la base : ${exactMsg}`, { duration: 10000 });
      saveErrorShownRef.current = true;
    } finally {
      isSavingToDbRef.current = false;
    }
  };

  const enqueueDbSave = (payload: ModuleEditorSavePayload) => {
    latestQueuedDbSaveRef.current = payload;
    const generation = dbSaveGenerationRef.current;

    dbSaveQueueRef.current = dbSaveQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        while (generation === dbSaveGenerationRef.current) {
          const nextPayload = latestQueuedDbSaveRef.current;
          if (!nextPayload) return;
          latestQueuedDbSaveRef.current = null;
          await performDbSave(nextPayload, { retryStaleOnce: true });
          pendingDbSaveDataRef.current = latestQueuedDbSaveRef.current;
        }
      });

    return dbSaveQueueRef.current;
  };

  useEffect(() => {
    if (!editorStateHydrated || studentOnly || typeof window === "undefined") return;
    if (Number(moduleData.id) !== Number(module.id)) return;

    if (skipInitialAutosaveRef.current) {
      skipInitialAutosaveRef.current = false;
      return;
    }

    const initialData = getInitialModuleData(module, apprenantType, studentOnly);
    const sourceFingerprint = buildSourceFingerprint(initialData);
    const adminEditAtForThisSave = adminLocalEditAtRef.current;

    // Remote refreshes/realtime echoes also change moduleData, but they are not
    // admin edits and must not be written back as a second UPDATE.
    if (adminEditAtForThisSave <= lastQueuedAdminLocalEditAtRef.current) {
      pendingDbSaveDataRef.current = null;
      return;
    }

    const payload = {
      moduleData,
      deletedCours,
      deletedExercices,
      sourceFingerprint,
      savedAt: new Date().toISOString(),
    };

      // Les Bilans et modules FC sont DB-only : un cache local stale a déjà
      // réinjecté d'anciennes réponses après retour dans le module.
      if (usesDatabaseOnlyEditorState(module.id)) {
        try {
          window.localStorage.removeItem(moduleEditorStorageKey);
        } catch {}
      } else {
        try {
          window.localStorage.setItem(moduleEditorStorageKey, JSON.stringify(payload));
        } catch (error) {
          console.error("Erreur sauvegarde état édition module:", error);
        }
    }

    // Debounced save to database (1.5s after last change)
    // Prevents race conditions when admin makes many rapid edits
    const saveVersion = ++dbSaveVersionRef.current;

    // Capture data for this save (avoids stale closure when timer fires)
    const dataToSave = {
      module_id: module.id,
      module_data: moduleData as any,
      deleted_cours: deletedCours as any,
      deleted_exercices: deletedExercices as any,
      source_fingerprint: sourceFingerprint,
    };

    const saveSignature = getSavePayloadSignature(dataToSave);
    if (saveSignature === lastSavedPayloadSignatureRef.current) {
      pendingDbSaveDataRef.current = null;
      return;
    }

    // Track pending data for beforeunload flush
    pendingDbSaveDataRef.current = dataToSave;

    if (dbSaveTimerRef.current) clearTimeout(dbSaveTimerRef.current);
    const debounceMs = flushImmediateRef.current ? 0 : 600;
    flushImmediateRef.current = false;
    dbSaveTimerRef.current = setTimeout(async () => {
      // Skip if a newer save was queued while we waited
      if (dbSaveVersionRef.current !== saveVersion) return;
      lastQueuedAdminLocalEditAtRef.current = adminEditAtForThisSave;
      await enqueueDbSave(dataToSave);
    }, debounceMs);

    return () => {
      if (dbSaveTimerRef.current) clearTimeout(dbSaveTimerRef.current);
    };
  }, [editorStateHydrated, studentOnly, moduleEditorStorageKey, moduleData, deletedCours, deletedExercices]);

  // Flush pending debounced save on browser close / tab close
  useEffect(() => {
    if (studentOnly) return;

    const flushPendingSave = () => {
      if (dbSaveTimerRef.current) {
        clearTimeout(dbSaveTimerRef.current);
        dbSaveTimerRef.current = null;
      }
      const pending = pendingDbSaveDataRef.current;
      if (pending && !isSavingToDbRef.current) {
        pendingDbSaveDataRef.current = null;
        lastQueuedAdminLocalEditAtRef.current = Math.max(
          lastQueuedAdminLocalEditAtRef.current,
          adminLocalEditAtRef.current,
        );
        enqueueDbSave(pending);
      }
    };

    window.addEventListener("beforeunload", flushPendingSave);
    return () => window.removeEventListener("beforeunload", flushPendingSave);
  }, [studentOnly]);

  useEffect(() => {
    setSlidesByKey((current) => {
      const hasPlaceholderSlides = Object.values(current).some((slides) =>
        slides.some((slide) => /^Slide\s+\d+$/i.test(slide.title))
      );

      return hasPlaceholderSlides ? createInitialSlidesByKey() : current;
    });
  }, [
    module.id,
    T3P_PARTIE1_SLIDES[0]?.title,
    T3P_PARTIE2_SLIDES[0]?.title,
    GESTION_PARTIE1_SLIDES[0]?.title,
    GESTION_PARTIE2_SLIDES[0]?.title,
    GESTION_PARTIE3_SLIDES[0]?.title,
  ]);

  const updateSlidesForKey = (key: string, slides: Slide[]) => {
    setSlidesByKey((prev) => ({ ...prev, [key]: slides }));
  };

  const isPratique = module.id === 6 || module.id === 8;

  const moveItem = (type: "cours" | "exercices", index: number, direction: "up" | "down") => {
    markAdminLocalEdit();
    setModuleData((prev) => {
      const items = [...prev[type]];
      const swapIndex = direction === "up" ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= items.length) return prev;
      [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
      return { ...prev, [type]: items };
    });
  };

  const deleteItem = (type: "cours" | "exercices", id: number) => {
    markAdminLocalEdit();
    setModuleData((prev) => {
      if (type === "cours") {
        const item = prev.cours.find((i) => i.id === id);
        if (item) setDeletedCours((d) => [...d, item]);
      } else {
        const item = prev.exercices.find((i) => i.id === id);
        if (item) setDeletedExercices((d) => [...d, item as ExerciceItem]);
      }
      return { ...prev, [type]: prev[type].filter((i) => i.id !== id) };
    });
  };

  const restoreItem = (type: "cours" | "exercices", id: number) => {
    markAdminLocalEdit();
    if (type === "cours") {
      const item = deletedCours.find((i) => i.id === id);
      if (item) {
        setModuleData((prev) => ({ ...prev, cours: [...prev.cours, item] }));
        setDeletedCours((d) => d.filter((i) => i.id !== id));
      }
    } else {
      const item = deletedExercices.find((i) => i.id === id);
      if (item) {
        setModuleData((prev) => ({ ...prev, exercices: [...prev.exercices, item] }));
        setDeletedExercices((d) => d.filter((i) => i.id !== id));
      }
    }
  };

  const toggleItem = (type: "cours" | "exercices", id: number) => {
    markAdminLocalEdit();
    setModuleData((prev) => ({
      ...prev,
      [type]: prev[type].map((i) => i.id === id ? { ...i, actif: !i.actif } : i),
    }));
  };

  const addItem = (type: "cours" | "exercices") => {
    markAdminLocalEdit();
    const newId = Date.now();
    setModuleData((prev) => {
      if (type === "exercices" && isPratique) {
        const newExo: ExerciceItem = {
          id: newId,
          titre: "Nouvel exercice",
          actif: true,
          questions: [
            { id: 1, enonce: "Nouvelle question", choix: [{ lettre: "A", texte: "Choix A", correct: true }, { lettre: "B", texte: "Choix B" }, { lettre: "C", texte: "Choix C" }] },
          ],
        };
        return { ...prev, exercices: [...prev.exercices, newExo] };
      }
      const newItem: ContentItem = { id: newId, titre: type === "cours" ? "Nouveau cours" : "Nouvel exercice", actif: true };
      return { ...prev, [type]: [...prev[type], newItem] };
    });
  };

  const updateExerciceQuestions = (exerciceId: number, questions: ExerciceQuestion[], deletedQuestionId?: number) => {
    markAdminLocalEdit();
    // Save enonce-based overrides to localStorage for same-session cross-module cache invalidation.
    // DB propagation to sibling modules is handled by syncSharedExercisesToSiblingModules
    // (called after the debounced DB save) to avoid concurrent write races.
    if (!studentOnly) {
        const sourceData = getInitialModuleDataRaw(module, apprenantType, studentOnly);
        const sourceExo = sourceData.exercices.find(e => e.id === exerciceId);
        if (sourceExo?.questions && !isBilanExamGestionExercise(module.id, exerciceId)) {
        detectAndSaveOverrides(
          sourceExo.questions as { enonce: string; choix: { lettre: string; texte: string; correct?: boolean }[] }[],
          questions,
          module.id,
        );
      }
    }

    const now = new Date().toISOString();
    setModuleData((prev) => ({
      ...prev,
      exercices: prev.exercices.map(e => {
        if (e.id !== exerciceId) return e;
        // Stamp _editedAt on questions that actually changed (for admin vs fournisseur conflict resolution)
          const stampedQuestions = questions.map(q => {
          const prevQ = e.questions?.find(pq => pq.id === q.id);
          const changed = !prevQ ||
            prevQ.enonce !== q.enonce ||
            JSON.stringify(prevQ.choix) !== JSON.stringify(q.choix) ||
            (prevQ as any).image !== (q as any).image;
          // Mark as manually_edited when admin changes the question, so the cross-module
          // propagation system never overwrites it. Once true, the flag is preserved.
            if (changed) return { ...q, _editedAt: now, manually_edited: true } as any;
          return {
            ...q,
            ...(((q as any)._editedAt ?? (prevQ as any)?._editedAt) ? { _editedAt: (q as any)._editedAt ?? (prevQ as any)?._editedAt } : {}),
            ...(((q as any).manually_edited ?? (prevQ as any)?.manually_edited) ? { manually_edited: true } : {}),
          } as any;
        });
        const updated: any = { ...e, questions: stampedQuestions };
        // Track deleted question IDs so mergeSourceExercices won't restore them from source
        if (deletedQuestionId != null) {
          const existing = Array.isArray((e as any).deletedQuestionIds) ? (e as any).deletedQuestionIds : [];
          updated.deletedQuestionIds = [...new Set([...existing, deletedQuestionId])];
        }
        return updated;
      }),
    }));
  };

  const handleFileUploaded = (type: "cours" | "exercices", itemId: number, fichier: { nom: string; url: string }) => {
    markAdminLocalEdit();
    setModuleData((prev) => ({
      ...prev,
      [type]: prev[type].map((item) =>
        item.id === itemId
          ? { ...item, fichiers: [...(item.fichiers ?? []), fichier] }
          : item,
      ),
    }));
  };

  const handleFileDeleted = async (type: "cours" | "exercices", itemId: number, fichierIndex: number, url: string) => {
    markAdminLocalEdit();
    setModuleData((prev) => ({
      ...prev,
      [type]: prev[type].map((item) => {
        if (item.id !== itemId) return item;
        const nextFiles = (item.fichiers ?? []).filter((_, index) => index !== fichierIndex);
        return { ...item, fichiers: nextFiles };
      }),
    }));

    // Nettoyage du bucket si le fichier vient du stockage cours-fichiers
    if (url.includes("/storage/v1/object/public/cours-fichiers/")) {
      try {
        const objectPath = decodeURIComponent(url.split("/storage/v1/object/public/cours-fichiers/")[1] ?? "");
        if (objectPath) {
          await supabase.storage.from("cours-fichiers").remove([objectPath]);
        }
      } catch (error) {
        console.warn("Impossible de supprimer le fichier du bucket:", error);
      }
    }
  };

  // === Aperçu apprenant ===
  // Garder le type de composant stable évite un démontage/remontage complet
  // lors des heartbeats/autosaves, ce qui faisait repartir le navigateur en haut.
  //
  // BUGFIX (apprenant Bilans/exercices) : `moduleData` ne DOIT PAS figurer dans
  // les dépendances de ce `useMemo`. Chaque refresh en arrière-plan (polling
  // toutes les ~5s, Realtime, réconciliation `usesDatabaseOnlyEditorState`)
  // change la référence de `moduleData`, ce qui recréait le type du composant
  // et provoquait un **démontage/remontage complet** de LearnerPreview :
  //   - `selectedAnswers` revenait à `{}` → les cases se décochaient toutes
  //     seules pendant que l'apprenant répondait.
  //   - le scroll partait en haut de la page.
  // On lit désormais `moduleData` via un ref lu à chaque render → toujours
  // frais, mais sans invalider l'identité du composant.
  const moduleDataRef = useRef(moduleData);
  useEffect(() => { moduleDataRef.current = moduleData; }, [moduleData]);

  const LearnerPreview = useMemo(() => {
    const LearnerPreviewComponent = ({ secureMode = true }: { secureMode?: boolean }) => {
    const moduleData = moduleDataRef.current;
    const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string | string[]>>({});
    const preserveScrollRef = useRef<{ top: number; left: number; anchorId?: string; anchorTop?: number; capturedAt: number } | null>(null);
    const restoreScrollFrameRef = useRef<number | null>(null);

    // Always allow multiple answers (checkboxes) for all questions
    const isMultiAnswer = (_q: { choix: { correct?: boolean }[] }) => true;

    const getQuestionChoices = (q: { choix?: { lettre: string; texte?: string; correct?: boolean }[] } | null | undefined) =>
      Array.isArray(q?.choix) ? q.choix : [];

    // Helper: check if answer is correct (works for single and multi)
    const isAnswerCorrect = (selected: string | string[] | undefined, q: { choix?: { lettre: string; correct?: boolean }[] } | null | undefined) => {
      const selectedLetters = Array.isArray(selected) ? selected.filter(Boolean) : selected ? [selected] : [];
      if (selectedLetters.length === 0) return false;

      const correctLetters = getQuestionChoices(q).filter(c => c.correct).map(c => c.lettre).sort();
      if (correctLetters.length === 0) return false;

      return JSON.stringify([...selectedLetters].sort()) === JSON.stringify(correctLetters);
    };
    const [showResultsFor, setShowResultsFor] = useState<Set<number>>(new Set());
    const [showCalculator, setShowCalculator] = useState(false);
    // Revision mode: per exo, set of question IDs to display (only the wrong ones)
    const [revisionQuestionsFor, setRevisionQuestionsFor] = useState<Record<number, Set<number | string>>>({});
    type PendingWrongQuestionRevision = {
      exoId: number;
      total: number;
      snapCorrect: number;
      snapshot: Record<string, string | string[]>;
      wrongKeys: string[];
      wrongIds: (number | string)[];
    };
    const [pendingWrongQuestionRevision, setPendingWrongQuestionRevision] = useState<PendingWrongQuestionRevision | null>(null);
    // History of past attempts per exo (snapshot of selectedAnswers + score)
    type AttemptRecord = { at: number; total: number; correct: number; mode: "complet" | "revision"; answers: Record<string, string | string[]> };
    const [attemptHistoryFor, setAttemptHistoryFor] = useState<Record<number, AttemptRecord[]>>({});
    const [currentPage, setCurrentPage] = useState(0);
    const [completedPages, setCompletedPages] = useState<Set<number>>(new Set());
    const [inlineQuizAnswers, setInlineQuizAnswers] = useState<Record<string, string>>({});
    const [inlineQuizValidated, setInlineQuizValidated] = useState<Set<number>>(new Set());
    const [qrcAnswers, setQrcAnswers] = useState<Record<string, string>>({});
    const [unansweredKeys, setUnansweredKeys] = useState<Set<string>>(new Set());
    const [qrcResults, setQrcResults] = useState<Record<string, { estCorrect: boolean; pointsObtenus: number; explication: string } | "loading">>({});

    const [introAcknowledged, setIntroAcknowledged] = useState<Set<number>>(new Set());
    const [savedAnswersLoaded, setSavedAnswersLoaded] = useState(false);
    const [uiStateHydrated, setUiStateHydrated] = useState(false);
    type PendingResultRestore = { exoId: number; page: number; validatedAt: number };
    const [pendingResultRestore, setPendingResultRestore] = useState<PendingResultRestore | null>(null);
    const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const learnerUiStateKey = `module-ui-state:${apprenantId ?? "anonymous"}:${module.id}`;
    const learnerUiStateAnonymousFallbackKey = `module-ui-state:anonymous:${module.id}`;

    const HIDDEN_CHECKLIST_TYPES = ["analyse-besoin", "projet-professionnel", "competences", "cgv", "cgv-reglement"];
    const activeCours = moduleData.cours.filter(c => c.actif && !(hideFormulaires && c.checklistType && HIDDEN_CHECKLIST_TYPES.includes(c.checklistType)));
    const activeExercices = moduleData.exercices.filter(e => e.actif) as ExerciceItem[];

    const scrollToRevisionStart = useCallback((exoId: number) => {
      const target =
        document.getElementById(`exo-revision-top-${exoId}`) ||
        document.querySelector(`[id^="exo-q-${exoId}-"]`);

      if (target instanceof HTMLElement) {
        const top = Math.max(0, window.scrollY + target.getBoundingClientRect().top - 16);
        window.scrollTo({ top, behavior: "smooth" });
        target.classList.add("ring-4", "ring-primary");
        window.setTimeout(() => target.classList.remove("ring-4", "ring-primary"), 1400);
        return;
      }

      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    }, []);

    const scheduleScrollToRevisionStart = useCallback((exoId: number) => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => scrollToRevisionStart(exoId));
      });
      window.setTimeout(() => scrollToRevisionStart(exoId), 180);
      window.setTimeout(() => scrollToRevisionStart(exoId), 420);
    }, [scrollToRevisionStart]);

    const startWrongQuestionRevision = (pending: {
      exoId: number;
      total: number;
      snapCorrect: number;
      snapshot: Record<string, string | string[]>;
      wrongKeys: string[];
      wrongIds: (number | string)[];
    }) => {
      if (!pending || pending.wrongKeys.length === 0) return;

      const wrongKeySet = new Set(pending.wrongKeys);

      // Build the cleared answer maps up front so the actual state update is
      // purely a value swap — no side-effects inside the setState updater and
      // no chance of a stale closure re-introducing the previous selections.
      const clearedSelected: Record<string, string | string[]> = {};
      for (const [k, v] of Object.entries(selectedAnswers)) {
        if (!wrongKeySet.has(k)) clearedSelected[k] = v;
      }
      const clearedQrc: Record<string, string> = {};
      for (const [k, v] of Object.entries(qrcAnswers)) {
        if (!wrongKeySet.has(k)) clearedQrc[k] = v;
      }
      const clearedQrcResults: typeof qrcResults = {} as typeof qrcResults;
      for (const [k, v] of Object.entries(qrcResults)) {
        if (!wrongKeySet.has(k)) (clearedQrcResults as any)[k] = v;
      }

      flushSync(() => {
        if (Object.keys(pending.snapshot).length > 0) {
          setAttemptHistoryFor(prev => ({
            ...prev,
            [pending.exoId]: [
              ...(prev[pending.exoId] ?? []),
              { at: Date.now(), total: pending.total, correct: pending.snapCorrect, mode: "complet", answers: pending.snapshot },
            ],
          }));
        }
        // Force-overwrite: previous checked answers for wrong questions are wiped.
        setSelectedAnswers(clearedSelected);
        setQrcAnswers(clearedQrc);
        setQrcResults(clearedQrcResults);
        setUnansweredKeys(new Set());
        setShowResultsFor(prev => { const next = new Set(prev); next.delete(pending.exoId); return next; });
        setPendingResultRestore((prev) => (prev?.exoId === pending.exoId ? null : prev));
        setRevisionQuestionsFor(prev => ({ ...prev, [pending.exoId]: new Set(pending.wrongIds) }));
        setPendingWrongQuestionRevision(null);
      });

      // Persist the wiped selections after state has settled.
      autoSaveAnswers(clearedSelected, [pending.exoId]);

      toast.success(`🎯 Mode révision activé — ${pending.wrongKeys.length} question${pending.wrongKeys.length > 1 ? "s" : ""} à refaire (réponses effacées)`);
      scheduleScrollToRevisionStart(pending.exoId);
    };

    // Backward-compat alias — the confirmation banner still calls this name.
    const confirmWrongQuestionRevision = () => {
      const pending = pendingWrongQuestionRevision;
      if (!pending) return;
      startWrongQuestionRevision(pending);
    };

    // === Subject number mapping for stepper numbering (e.g. 1.1, 1.2, 2.1…) ===
    const SUBJECT_NUMBER_MAP: Record<number, { parentTitle: string; subjectNum: number }> = {
      // VTC sub-modules
      2: { parentTitle: "2. COURS ET EXERCICES VTC", subjectNum: 1 },
      25: { parentTitle: "2. COURS ET EXERCICES VTC", subjectNum: 1 },
      14: { parentTitle: "2. COURS ET EXERCICES VTC", subjectNum: 2 },
      15: { parentTitle: "2. COURS ET EXERCICES VTC", subjectNum: 3 },
      16: { parentTitle: "2. COURS ET EXERCICES VTC", subjectNum: 4 },
      17: { parentTitle: "2. COURS ET EXERCICES VTC", subjectNum: 5 },
      18: { parentTitle: "2. COURS ET EXERCICES VTC", subjectNum: 6 },
      19: { parentTitle: "2. COURS ET EXERCICES VTC", subjectNum: 7 },
      // TAXI sub-modules
      10: { parentTitle: "2. COURS ET EXERCICES TAXI", subjectNum: 1 },
      39: { parentTitle: "2. COURS ET EXERCICES TAXI", subjectNum: 1 },
      20: { parentTitle: "2. COURS ET EXERCICES TAXI", subjectNum: 2 },
      21: { parentTitle: "2. COURS ET EXERCICES TAXI", subjectNum: 3 },
      22: { parentTitle: "2. COURS ET EXERCICES TAXI", subjectNum: 4 },
      23: { parentTitle: "2. COURS ET EXERCICES TAXI", subjectNum: 5 },
      24: { parentTitle: "2. COURS ET EXERCICES TAXI", subjectNum: 6 },
      // TA sub-modules
      40: { parentTitle: "2. COURS ET EXERCICES TA", subjectNum: 1 },
      42: { parentTitle: "2. COURS ET EXERCICES TA", subjectNum: 2 },
      // VA sub-modules
      41: { parentTitle: "2. COURS ET EXERCICES VA", subjectNum: 1 },
      43: { parentTitle: "2. COURS ET EXERCICES VA", subjectNum: 2 },
    };
    const subjectInfo = SUBJECT_NUMBER_MAP[Number(moduleData.id)];

    // Build pages: interleave cours and exercises for matière sub-modules
    type PageType = { type: "cours"; cours: ContentItem } | { type: "exercices" } | { type: "exercice-single"; exercice: ExerciceItem };
    const INTERLEAVED_IDS = new Set([2, 10, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 39, 40, 41, 42, 43]);
    const pages: PageType[] = (() => {
      if (INTERLEAVED_IDS.has(Number(moduleData.id))) {
        // Simple zip: cours[0] → exo[0] → cours[1] → exo[1] → ...
        const ac = activeCours;
        const ae = activeExercices;
        const result: PageType[] = [];
        const maxLen = Math.max(ac.length, ae.length);
        for (let i = 0; i < maxLen; i++) {
          if (i < ac.length) result.push({ type: "cours", cours: ac[i] });
          if (i < ae.length) result.push({ type: "exercice-single", exercice: ae[i] });
        }
        return result;
      }
      // Other modules: all cours first, then exercises
      return [
        ...activeCours.map(c => ({ type: "cours" as const, cours: c })),
        ...activeExercices.map(e => ({ type: "exercice-single" as const, exercice: e })),
      ];
    })();



    const BILAN_MODULE_IDS_SET = new Set([4, 5, 9, 11, 27, 28, 29, 30, 81, 82]);
    const isBilanModule = BILAN_MODULE_IDS_SET.has(Number(moduleData.id));
    const hierarchicalLabelsByPage = useMemo<Record<number, string>>(() => {

      // For bilan modules (exercices-only), number each quiz sequentially: 1, 2, 3…
      if (isBilanModule) {
        const labels: Record<number, string> = {};
        let quizIndex = 0;
        pages.forEach((page, index) => {
          if (page?.type === "exercice-single") {
            quizIndex++;
            const cleanTitle = page.exercice.titre.replace(/^📝\s*|^📘\s*|^📗\s*|^📙\s*|^📕\s*|^📓\s*/, "");
            labels[index] = `${quizIndex}. 📝 Quiz — ${cleanTitle}`;
          }
        });
        return labels;
      }

      // For modules with subject letters (A-G), group by subject
      const subjectNums: Record<string, number> = { A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7 };
      const hasSubjectLetters = pages.some(p =>
        p?.type === "cours" && /^\s*[A-G]\./i.test(p.cours.titre)
      );

      if (hasSubjectLetters) {
        const partBySubject: Record<number, number> = {};
        const labels: Record<number, string> = {};
        let currentMeta: { subjectNum: number; partNum: number } | null = null;

        pages.forEach((page, index) => {
          if (page?.type === "cours") {
            const subjectLetter = page.cours.titre.match(/^\s*([A-G])\./i)?.[1]?.toUpperCase() || "A";
            const subjectNum = subjectNums[subjectLetter] || 1;
            const nextPart = (partBySubject[subjectNum] || 0) + 1;
            partBySubject[subjectNum] = nextPart;
            currentMeta = { subjectNum, partNum: nextPart };
            labels[index] = `${subjectNum}.${nextPart} ${page.cours.titre}`;
            return;
          }

          if (page?.type === "exercice-single" && currentMeta) {
            labels[index] = `${currentMeta.subjectNum}.${currentMeta.partNum} 📝 Quiz — ${page.exercice.titre}`;
          }
        });
        return labels;
      }

      // Fallback for all other modules: sequential numbering with cours/quiz pairs
      const labels: Record<number, string> = {};
      let pairNum = 0;
      let lastCoursIndex = -1;

      pages.forEach((page, index) => {
        if (page?.type === "cours") {
          pairNum++;
          lastCoursIndex = index;
          labels[index] = `${pairNum} 📖 Cours — ${page.cours.titre}`;
        } else if (page?.type === "exercice-single") {
          const isQuiz = page.exercice.questions && page.exercice.questions.length > 0;
          if (isQuiz) {
            // Use same pairNum as the preceding cours if this quiz directly follows it
            const quizNum = lastCoursIndex === index - 1 ? pairNum : ++pairNum;
            labels[index] = `${quizNum} 📝 Quiz — ${page.exercice.titre}`;
          } else {
            pairNum++;
            labels[index] = `${pairNum} 📝 ${page.exercice.titre}`;
          }
        }
      });

      return labels;
    }, [pages, isBilanModule]);

    const totalPages = pages.length;
    const currentPageData = pages[currentPage];
    const progressPercent = totalPages > 0 ? Math.round((completedPages.size / totalPages) * 100) : 0;

    // --- Restore learner UI state (page + results) to prevent unwanted reset ---
    useEffect(() => {
      if (uiStateHydrated) return;

      try {
        let rawState = window.sessionStorage.getItem(learnerUiStateKey);
        if (!rawState && apprenantId) {
          rawState = window.sessionStorage.getItem(learnerUiStateAnonymousFallbackKey);
        }

        if (!rawState) {
          setUiStateHydrated(true);
          return;
        }

        const parsed = JSON.parse(rawState) as {
          currentPage?: number;
          selectedAnswers?: Record<string, string>;
          showResultsFor?: number[];
          completedPages?: number[];
          pendingResultRestore?: { exoId?: number; page?: number; validatedAt?: number } | null;
          revisionQuestionsFor?: Record<string, (number | string)[]>;
        };

        if (parsed.selectedAnswers && typeof parsed.selectedAnswers === "object") {
          setSelectedAnswers(parsed.selectedAnswers);
        }
        if (Array.isArray(parsed.showResultsFor)) {
          setShowResultsFor(new Set(parsed.showResultsFor));
        }
        if (Array.isArray(parsed.completedPages)) {
          setCompletedPages(new Set(parsed.completedPages));
        }
        if (
          parsed.pendingResultRestore &&
          typeof parsed.pendingResultRestore.exoId === "number" &&
          typeof parsed.pendingResultRestore.page === "number"
        ) {
          setPendingResultRestore({
            exoId: parsed.pendingResultRestore.exoId,
            page: parsed.pendingResultRestore.page,
            validatedAt: typeof parsed.pendingResultRestore.validatedAt === "number"
              ? parsed.pendingResultRestore.validatedAt
              : Date.now(),
          });
        }
        if (parsed.revisionQuestionsFor && typeof parsed.revisionQuestionsFor === "object") {
          const restored: Record<number, Set<number | string>> = {};
          for (const [k, v] of Object.entries(parsed.revisionQuestionsFor)) {
            const exoId = Number(k);
            if (Number.isFinite(exoId) && Array.isArray(v)) {
              restored[exoId] = new Set(v);
            }
          }
          if (Object.keys(restored).length > 0) {
            setRevisionQuestionsFor(restored);
          }
        }
        // Restore currentPage: prefer sessionStorage, fallback to localStorage
        // (localStorage survives disconnections so the learner resumes where they left off)
        let pageToRestore: number | null =
          typeof parsed.currentPage === "number" ? parsed.currentPage : null;
        if (pageToRestore === null) {
          try {
            const lsPage = window.localStorage.getItem(`${learnerUiStateKey}:page`);
            if (lsPage !== null) {
              const n = parseInt(lsPage, 10);
              if (!Number.isNaN(n)) pageToRestore = n;
            }
            if (pageToRestore === null && apprenantId) {
              const lsPageFb = window.localStorage.getItem(`${learnerUiStateAnonymousFallbackKey}:page`);
              if (lsPageFb !== null) {
                const n = parseInt(lsPageFb, 10);
                if (!Number.isNaN(n)) pageToRestore = n;
              }
            }
          } catch {}
        }
        if (pageToRestore !== null && totalPages > 0) {
          const clampedPage = Math.max(0, Math.min(pageToRestore, totalPages - 1));
          setCurrentPage(clampedPage);
        }
      } catch (error) {
        console.error("Erreur restauration état module:", error);
      } finally {
        setUiStateHydrated(true);
      }
    }, [learnerUiStateKey, learnerUiStateAnonymousFallbackKey, apprenantId, totalPages, uiStateHydrated]);

    // Track initial cours page view after hydration
    const initialCoursTrackedRef = useRef(false);
    useEffect(() => {
      if (!uiStateHydrated || initialCoursTrackedRef.current || pages.length === 0) return;
      initialCoursTrackedRef.current = true;
      const page = pages[currentPage];
      if (page?.type === "cours" && onTrackCours) {
        onTrackCours(module.id, page.cours.titre);
      }
    }, [uiStateHydrated, pages.length]);

    // --- Restore completedPages from Supabase for interactive form pages ---
    useEffect(() => {
      if (!uiStateHydrated || !apprenantId || pages.length === 0) return;

      const CHECKLIST_TO_DOC_TYPE: Record<string, string> = {
        "analyse-besoin": "analyse-besoin",
        "projet-professionnel": "projet-professionnel",
        "cgv": "cgv-acceptation",
        "cgv-reglement": "cgv-reglement",
        "competences": "competences-checklist",
        "evaluation-acquis": "evaluation-acquis",
        "satisfaction": "satisfaction",
      };

      const formPages: { pageIndex: number; docType: string }[] = [];
      pages.forEach((p, idx) => {
        if (p?.type === "cours" && p.cours.checklistType) {
          const docType = CHECKLIST_TO_DOC_TYPE[p.cours.checklistType];
          if (docType) formPages.push({ pageIndex: idx, docType });
        }
      });

      if (formPages.length === 0) return;

      supabase
        .from("apprenant_documents_completes" as any)
        .select("type_document")
        .eq("apprenant_id", apprenantId)
        .in("type_document", formPages.map(fp => fp.docType))
        .then(({ data }) => {
          if (!data || data.length === 0) return;
          const completedDocTypes = new Set((data as any[]).map((d: any) => d.type_document));
          setCompletedPages(prev => {
            const next = new Set(prev);
            let changed = false;
            formPages.forEach(fp => {
              if (completedDocTypes.has(fp.docType) && !next.has(fp.pageIndex)) {
                next.add(fp.pageIndex);
                changed = true;
              }
            });
            return changed ? next : prev;
          });
        });
    }, [uiStateHydrated, apprenantId, pages.length]);

    // --- Persist learner UI state while progressing in module ---
    useEffect(() => {
      if (!uiStateHydrated) return;

      try {
        const revisionSerialized: Record<string, (number | string)[]> = {};
        for (const [k, v] of Object.entries(revisionQuestionsFor)) {
          revisionSerialized[k] = Array.from(v as Set<number | string>);
        }
        window.sessionStorage.setItem(
          learnerUiStateKey,
          JSON.stringify({
            currentPage,
            selectedAnswers,
            showResultsFor: Array.from(showResultsFor),
            completedPages: Array.from(completedPages),
            pendingResultRestore,
            revisionQuestionsFor: revisionSerialized,
          })
        );
        // Persist only the current page index to localStorage so the learner
        // resumes where they left off even after a disconnect (sessionStorage is cleared).
        try {
          window.localStorage.setItem(`${learnerUiStateKey}:page`, String(currentPage));
        } catch {}
      } catch (error) {
        console.error("Erreur sauvegarde état module:", error);
      }
    }, [learnerUiStateKey, uiStateHydrated, currentPage, selectedAnswers, showResultsFor, completedPages, pendingResultRestore, revisionQuestionsFor]);

    // --- If a quiz was just validated, force-restore the exact result screen ---
    useEffect(() => {
      if (!uiStateHydrated || !pendingResultRestore) return;

      // Expire stale pending restore after 30 minutes
      if (Date.now() - pendingResultRestore.validatedAt > 30 * 60 * 1000) {
        setPendingResultRestore(null);
        return;
      }

      const targetPageFromPages = pages.findIndex(
        (p) => p?.type === "exercice-single" && p.exercice.id === pendingResultRestore.exoId,
      );
      const resolvedPage = targetPageFromPages >= 0 ? targetPageFromPages : pendingResultRestore.page;

      setShowResultsFor((prev) => {
        if (prev.has(pendingResultRestore.exoId) && currentPage === resolvedPage) return prev;
        const next = new Set(prev);
        next.add(pendingResultRestore.exoId);
        return next;
      });

      setCompletedPages((prev) => {
        const hasCurrent = prev.has(resolvedPage);
        const hasPrevious = resolvedPage <= 0 || prev.has(resolvedPage - 1);
        if (hasCurrent && hasPrevious) return prev;

        const next = new Set(prev);
        next.add(resolvedPage);
        if (resolvedPage > 0) next.add(resolvedPage - 1);
        return next;
      });

      if (currentPage !== resolvedPage) {
        setCurrentPage(resolvedPage);
      }
    }, [uiStateHydrated, pendingResultRestore, pages, currentPage]);

    // --- Get user ID and JWT for reponses_apprenants ---
    const userIdForSaveRef = useRef<string | null>(null);
    const jwtTokenRef = useRef<string | null>(null);
    const reponsesSaveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
      const updateRefs = (session: any) => {
        if (session?.user?.id) userIdForSaveRef.current = session.user.id;
        if (session?.access_token) jwtTokenRef.current = session.access_token;
      };

      supabase.auth.getSession().then(({ data }) => updateRefs(data.session));
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        updateRefs(session);
      });

      return () => subscription.unsubscribe();
    }, []);

    // --- Restaure l'état "validé" à partir du STATUT SERVEUR uniquement ---
    // Un quiz est validé si, et seulement si, sa ligne reponses_apprenants
    // a status = 'submitted'. La présence de réponses ne suffit jamais.
    const applySubmittedAttempts = (attempts: { exercice_id: string; status?: string }[]) => {
      const submittedExoIds: number[] = [];
      const submittedInlineIds: number[] = [];
      attempts.forEach((row) => {
        if (!isAttemptSubmitted(row as any)) return;
        const exoMatch = /_exo_(\d+)$/.exec(row.exercice_id);
        if (exoMatch) {
          submittedExoIds.push(Number(exoMatch[1]));
          return;
        }
        const inlineMatch = /_inline_(\d+)$/.exec(row.exercice_id);
        if (inlineMatch) submittedInlineIds.push(Number(inlineMatch[1]));
      });

      if (submittedExoIds.length > 0) {
        setShowResultsFor((prev) => {
          const next = new Set(prev);
          submittedExoIds.forEach((id) => next.add(id));
          return next;
        });
      }
      if (submittedInlineIds.length > 0) {
        setInlineQuizValidated((prev) => {
          const next = new Set(prev);
          submittedInlineIds.forEach((id) => next.add(id));
          return next;
        });
      }
      if (submittedExoIds.length > 0 || submittedInlineIds.length > 0) {
        setCompletedPages((prev) => {
          const next = new Set(prev);
          pages.forEach((p: any, idx: number) => {
            if (p?.type === "exercice-single" && submittedExoIds.includes(Number(p.exercice?.id))) next.add(idx);
            if (p?.cours?.id != null && submittedInlineIds.includes(Number(p.cours.id))) next.add(idx);
          });
          return next;
        });
      }
    };

    // --- Load saved partial answers from DB on mount ---
    useEffect(() => {
      if (!apprenantId || savedAnswersLoaded) return;
      (async () => {
        try {
          // 1) Check FIRST if the module is already validated
          //    (apprenant_module_completion exists for this apprenant/module).
          //    If yes → freeze module: lock writes to reponses_apprenants and
          //    only restore answers from the immutable snapshot in details.
          const { data: completionData } = await supabase
            .from("apprenant_module_completion")
            .select("details, score_obtenu, status, completed_at")
            .eq("apprenant_id", apprenantId)
            .eq("module_id", module.id)
            .maybeSingle();

          const isAlreadyValidated = isCompletionDone(completionData as any);


          if (isAlreadyValidated) {
            // Lock all future writes to reponses_apprenants for this couple.
            moduleAlreadyValidatedRef.current = true;
            completionPersistedRef.current = true;

            if (completionData?.details && Array.isArray(completionData.details)) {
              const restored: Record<string, string | string[]> = {};
              const answeredByExercice = new Map<number, number>();

              (completionData.details as any[]).forEach((d: any) => {
                if (d.reponseEleve) {
                  restored[`${d.exerciceId}-${d.questionId}`] = d.reponseEleve;
                  const exoId = Number(d.exerciceId);
                  if (Number.isFinite(exoId)) {
                    answeredByExercice.set(exoId, (answeredByExercice.get(exoId) || 0) + 1);
                  }
                }
              });

              if (Object.keys(restored).length > 0) {
                // Force-overwrite local state with the frozen snapshot.
                setSelectedAnswers(restored);
              }

              if (completionData.score_obtenu !== null) {
                const validatedExoIds = activeExercices
                  .filter((exo) => {
                    const totalExoQuestions = exo.questions?.length || 0;
                    if (totalExoQuestions === 0) return false;
                    return (answeredByExercice.get(Number(exo.id)) || 0) >= totalExoQuestions;
                  })
                  .map((exo) => Number(exo.id));

                if (validatedExoIds.length > 0) {
                  setShowResultsFor((prev) => {
                    const next = new Set(prev);
                    validatedExoIds.forEach((exoId) => next.add(exoId));
                    return next;
                  });

                  setCompletedPages((prev) => {
                    const next = new Set(prev);
                    validatedExoIds.forEach((exoId) => {
                      const exoPage = pages.findIndex((p) => p?.type === "exercice-single" && p.exercice.id === exoId);
                      if (exoPage >= 0) {
                        next.add(exoPage);
                        if (exoPage > 0) next.add(exoPage - 1);
                      }
                    });
                    return next;
                  });
                }
              }
            }

            console.log(`[ModuleDetailView] Module ${module.id} déjà validé pour apprenant ${apprenantId} — apprenant_module_completion figé, reponses_apprenants autorisées pour rejouer les questions fausses.`);

            // Merge any redo answers saved in reponses_apprenants over the frozen snapshot.
            const inlineQuizIds = (pages as any[])
              .filter((p) => p?.cours?.quiz?.length)
              .map((p) => buildInlineQuizId(module.id, p.cours.id));
            const exerciceIds = [
              ...activeExercices.map(e => buildExerciceId(module.id, e.id)),
              ...inlineQuizIds,
            ];
            if (exerciceIds.length > 0) {
              const attempts = await fetchQuizAttempts(apprenantId, exerciceIds);
              if (attempts.length > 0) {
                const redo: Record<string, string | string[]> = {};
                attempts.forEach((row) => {
                  if (row.reponses && typeof row.reponses === "object") {
                    Object.assign(redo, row.reponses);
                  }
                });
                if (Object.keys(redo).length > 0) {
                  setSelectedAnswers((prev) => ({ ...prev, ...redo }));
                }
                applySubmittedAttempts(attempts);
              }
            }

          } else {
            // 2) Module not yet validated → restore from reponses_apprenants (progressive save).
            const inlineQuizIds = (pages as any[])
              .filter((p) => p?.cours?.quiz?.length)
              .map((p) => buildInlineQuizId(module.id, p.cours.id));
            const exerciceIds = [
              ...activeExercices.map(e => buildExerciceId(module.id, e.id)),
              ...inlineQuizIds,
            ];
            if (exerciceIds.length > 0) {
              const attempts = await fetchQuizAttempts(apprenantId, exerciceIds);

              if (attempts.length > 0) {
                const restored: Record<string, string | string[]> = {};
                attempts.forEach((row) => {
                  // Réponses restaurées quel que soit le statut : une tentative
                  // soumise doit réafficher ses réponses ET ses corrections.
                  if (row.reponses && typeof row.reponses === "object") {
                    Object.assign(restored, row.reponses);
                  }
                });
                if (Object.keys(restored).length > 0) {
                  setSelectedAnswers((prev) => (Object.keys(prev).length > 0 ? prev : restored));
                }
                // RÈGLE : seul status='submitted' vaut « quiz validé ».
                applySubmittedAttempts(attempts);
              }
            }
          }
        } catch (e) {
          console.error("Erreur chargement réponses sauvegardées:", e);
        }
        setSavedAnswersLoaded(true);
      })();
    }, [apprenantId, module.id, savedAnswersLoaded, activeExercices, pages]);

    // --- Auto-save partial answers to DB (debounced) ---
    const autoSaveAnswers = (
      answers: Record<string, string | string[]>,
      forceExerciceIds: number[] = []
    ) => {
      if (!apprenantId) return;

      // Save to reponses_apprenants per exercice (500ms debounce)
      // NOTE: we allow this even if the module is already validated so that
      // "Refaire les fausses" / retry attempts persist the new answers.
      if (reponsesSaveDebounceRef.current) clearTimeout(reponsesSaveDebounceRef.current);
      reponsesSaveDebounceRef.current = setTimeout(async () => {
        if (!userIdForSaveRef.current) return;
        try {
          // Group answers by exercice
          const byExo = new Map<number, Record<string, string | string[]>>();
          for (const [key, val] of Object.entries(answers)) {
            const exoId = parseInt(key.split("-")[0], 10);
            if (!Number.isFinite(exoId)) continue;
            if (!byExo.has(exoId)) byExo.set(exoId, {});
            byExo.get(exoId)![key] = val;
          }

          // If all answers for an exercise are cleared, force an empty row so
          // the old DB answers are actually overwritten instead of reappearing.
          forceExerciceIds.forEach((exoId) => {
            if (Number.isFinite(exoId) && !byExo.has(exoId)) {
              byExo.set(exoId, {});
            }
          });
          
          const rows = Array.from(byExo.entries()).map(([exoId, exoAnswers]) => ({
            apprenant_id: apprenantId,
            user_id: userIdForSaveRef.current,
            exercice_id: `module_${module.id}_exo_${exoId}`,
            exercice_type: "quiz",
            reponses: exoAnswers,
            completed: false,
            updated_at: new Date().toISOString(),
          }));

          if (rows.length > 0) {
            console.log("[ModuleDetailView] UPSERT reponses_apprenants — user_id envoyé:", userIdForSaveRef.current, "| nb rows:", rows.length, "| apprenant_id:", apprenantId);
            await supabase.from("reponses_apprenants" as any)
              .upsert(rows as any, { onConflict: "apprenant_id,exercice_id" });
          }
        } catch (e) {
          console.error("[AutoSave reponses_apprenants] error:", e);
        }
      }, 300);

      // apprenant_module_completion: frozen snapshot — do NOT overwrite once validated.
      if (completionPersistedRef.current || moduleAlreadyValidatedRef.current) return;

      // Also save to apprenant_module_completion (existing behavior, debounced 3s)
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = setTimeout(async () => {

        try {
          const questionDetails = activeExercices.flatMap(e =>
            (e.questions || []).map(q => {
              const key = `${e.id}-${q.id}`;
              const selected = answers[key];
              const correctChoix = q.choix.filter(c => c.correct);
              const correctLetters = correctChoix.map(c => c.lettre);
              const correctTexts = correctChoix.map(c => c.texte);
              return {
                exerciceId: e.id,
                exerciceTitre: e.titre,
                questionId: q.id,
                enonce: q.enonce,
                reponseEleve: selected || null,
                reponseCorrecte: correctLetters.length === 1 ? correctLetters[0] : correctLetters,
                reponseCorrecteTexte: correctTexts.length === 1 ? correctTexts[0] : correctTexts,
                correct: isAnswerCorrect(selected, q),
              };
            })
          );
          const answeredCount = Object.keys(answers).length;
          const totalQ = activeExercices.reduce((s, e) => s + (e.questions?.length || 0), 0);
          const correctC = questionDetails.filter(d => d.correct).length;
          // Progress-only autosave: goes through the atomic RPC, which can
          // NEVER downgrade an already-completed module nor lower progress.
          const savedOk = await saveModuleCompletion({
            apprenantId,
            moduleId: module.id,
            completed: false,
            progress: totalQ > 0 ? Math.round((answeredCount / totalQ) * 100) : 0,
            scoreObtenu: correctC,
            scoreMax: totalQ,
            details: questionDetails,
            retries: 2,
          });
          if (!savedOk) {
            console.error("[AutoSave] Progression non enregistrée (module", module.id, ")");
            return;
          }
          console.log(`[AutoSave] ${answeredCount}/${totalQ} réponses sauvegardées pour module ${module.id}`);

        } catch (e) {
          console.error("Auto-save erreur:", e);
        }
      }, 3000);
    };

    // Keep a ref to latest answers for beforeunload
    const latestAnswersRef = useRef<Record<string, string | string[]>>({});
    useEffect(() => { latestAnswersRef.current = selectedAnswers; }, [selectedAnswers]);

    // beforeunload: flush pending saves immediately
    useEffect(() => {
      const flushSave = () => {
        if (!apprenantId || !userIdForSaveRef.current) return;
        const answers = latestAnswersRef.current;
        if (Object.keys(answers).length === 0) return;
        // Group answers by exercice
        const byExo = new Map<number, Record<string, string | string[]>>();
        for (const [key, val] of Object.entries(answers)) {
          const exoId = parseInt(key.split("-")[0], 10);
          if (!Number.isFinite(exoId)) continue;
          if (!byExo.has(exoId)) byExo.set(exoId, {});
          byExo.get(exoId)![key] = val;
        }
        const rows = Array.from(byExo.entries()).map(([exoId, exoAnswers]) => ({
          apprenant_id: apprenantId,
          user_id: userIdForSaveRef.current,
          exercice_id: `module_${module.id}_exo_${exoId}`,
          exercice_type: "quiz",
          reponses: exoAnswers,
          completed: false,
          updated_at: new Date().toISOString(),
        }));
        if (rows.length > 0) {
          console.log("[ModuleDetailView] FLUSH XHR reponses_apprenants — user_id envoyé:", userIdForSaveRef.current, "| nb rows:", rows.length, "| apprenant_id:", apprenantId);
          const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/reponses_apprenants?on_conflict=apprenant_id,exercice_id`;
          const token = jwtTokenRef.current || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
          try {
            const xhr = new XMLHttpRequest();
            xhr.open("POST", url, false); // synchronous
            xhr.setRequestHeader("Content-Type", "application/json");
            xhr.setRequestHeader("apikey", import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
            xhr.setRequestHeader("Authorization", `Bearer ${token}`);
            xhr.setRequestHeader("Prefer", "resolution=merge-duplicates");
            xhr.send(JSON.stringify(rows));
          } catch (_) {}
        }
      };
      window.addEventListener("beforeunload", flushSave);
      return () => {
        window.removeEventListener("beforeunload", flushSave);
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        if (reponsesSaveDebounceRef.current) clearTimeout(reponsesSaveDebounceRef.current);
      };
    }, [apprenantId, module.id]);

    // Scroll preservation removed: clicking an answer must NEVER move the page.
    const captureAnswerScrollPosition = useCallback((_target?: HTMLElement | null) => {
      // no-op: keep the user exactly where they are
    }, []);

    const scheduleAnswerScrollRestore = useCallback(() => {
      // no-op
    }, []);

    const handleAnswer = (exoId: number, qId: number, lettre: string, multi?: boolean, target?: HTMLElement | null) => {
      if (showResultsFor.has(exoId)) return;
      onLearnerActivity?.();
      captureAnswerScrollPosition(target);
      const ansKey = `${exoId}-${qId}`;
      flushSync(() => {
        setSelectedAnswers(prev => {
          if (multi) {
            const current = Array.isArray(prev[ansKey]) ? (prev[ansKey] as string[]) : prev[ansKey] ? [prev[ansKey] as string] : [];
            const next = current.includes(lettre) ? current.filter(l => l !== lettre) : [...current, lettre];
            const updated = { ...prev, [ansKey]: next };
            autoSaveAnswers(updated);
            return updated;
          }
          if (prev[ansKey] === lettre) return prev;
          const updated = { ...prev, [ansKey]: lettre };
          autoSaveAnswers(updated);
          return updated;
        });
        setUnansweredKeys(prev => {
          if (!prev.has(ansKey)) return prev;
          const next = new Set(prev);
          next.delete(ansKey);
          return next;
        });
      });
      scheduleAnswerScrollRestore();
    };

    const handleQrcAnswerChange = (key: string, value: string) => {
      onLearnerActivity?.();
      captureAnswerScrollPosition(document.activeElement instanceof HTMLElement ? document.activeElement : null);
      flushSync(() => {
        setQrcAnswers(prev => ({ ...prev, [key]: value }));
        setSelectedAnswers(prev => {
          const next = { ...prev, [key]: value };
          autoSaveAnswers(next);
          return next;
        });
        setUnansweredKeys(prev => {
          if (!prev.has(key)) return prev;
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      });
      scheduleAnswerScrollRestore();
    };

    const totalQuestions = activeExercices.reduce((sum, e) => sum + (e.questions?.length || 0), 0);
    const correctCount = activeExercices.reduce((sum, e) => {
      if (!e.questions) return sum;
      return sum + e.questions.filter(q => {
        const key = `${e.id}-${q.id}`;
        return isAnswerCorrect(selectedAnswers[key], q);
      }).length;
    }, 0);

    const completionPersistedRef = useRef(false);
    // True once we've confirmed a row exists in apprenant_module_completion
    // for this (apprenant, module). Module becomes frozen: no more writes
    // to reponses_apprenants allowed, results read from completion.details only.
    const moduleAlreadyValidatedRef = useRef(false);
    const [savingCompletion, setSavingCompletion] = useState(false);



    const markPageCompleted = (pageIndex: number) => {
      setCompletedPages(prev => {
        const next = new Set(prev);
        next.add(pageIndex);
        return next;
      });
    };

    const persistModuleCompletion = async () => {
      if (completionPersistedRef.current) return true;

      if (!apprenantId) {
        return true;
      }

      try {
        // Build question-level details
        const questionDetails = activeExercices.flatMap(e =>
          (e.questions || []).map(q => {
            const key = `${e.id}-${q.id}`;
            const selected = selectedAnswers[key];
            const correctChoix = q.choix.filter(c => c.correct);
            const correctLetters = correctChoix.map(c => c.lettre);
            const correctTexts = correctChoix.map(c => c.texte);
            return {
              exerciceId: e.id,
              exerciceTitre: e.titre,
              questionId: q.id,
              enonce: q.enonce,
              reponseEleve: selected || null,
              reponseCorrecte: correctLetters.length === 1 ? correctLetters[0] : correctLetters,
              reponseCorrecteTexte: correctTexts.length === 1 ? correctTexts[0] : correctTexts,
              correct: isAnswerCorrect(selected, q),
            };
          })
        );

        // Terminal validation: MUST be confirmed by the server before the
        // module is considered done and the next one unlocked.
        setSavingCompletion(true);
        const ok = await saveModuleCompletion({
          apprenantId,
          moduleId: module.id,
          completed: true,
          progress: 100,
          scoreObtenu: totalQuestions > 0 ? correctCount : null,
          scoreMax: totalQuestions > 0 ? totalQuestions : null,
          details: questionDetails,
          retries: 5,
        });
        setSavingCompletion(false);

        if (!ok) {
          completionPersistedRef.current = false;
          toast.error("Votre progression n'a pas pu être enregistrée. Vérifiez votre connexion et réessayez.");
          return false;
        }

        completionPersistedRef.current = true;
        moduleAlreadyValidatedRef.current = true;
        onModuleCompleted?.(module.id);
        return true;
      } catch (e) {
        setSavingCompletion(false);
        completionPersistedRef.current = false;
        console.error("Erreur completion module:", e);
        toast.error("Le résultat du quiz n'a pas pu être enregistré");
        return false;
      }
    };



    // Introduction module IDs that require acknowledgment before quiz
    const INTRO_MODULE_IDS = new Set([1, 26, 31, 32, 33, 34]);
    const isIntroModule = INTRO_MODULE_IDS.has(Number(moduleData.id));

    // Auto-complete pages that have no PDF and no quiz (text-only cours)
    // BUT NOT for intro modules — those require explicit acknowledgment
    useEffect(() => {
      pages.forEach((p, i) => {
        if (p?.type === "cours") {
          const hasPdf = p.cours.fichiers?.some(f => f.nom.endsWith(".pdf") || f.url.endsWith(".pdf"));
          const hasSlides = p.cours.slidesKey && slidesByKey[p.cours.slidesKey]?.length > 0;
          const hasQuiz = p.cours.quiz && p.cours.quiz.length > 0;
          if (!hasPdf && !hasSlides && !hasQuiz && !isIntroModule) {
            markPageCompleted(i);
          }
        }
        // exercice-single pages: don't auto-complete, user must validate

      });
    }, [pages.length]);

    // Module IDs where Réglementation Nationale/Locale content exists for TAXI and TA
    const TAXI_REGLEMENTATION_MODULE_IDS = new Set([10, 9, 11, 40, 27, 28]);
    const isTaxiOrTA = (apprenantType || "").toLowerCase().replace(/-e$/, "").match(/^(taxi|ta)$/) !== null;

    const isReglementationPage = (pageIdx: number): boolean => {
      if (!isTaxiOrTA || !TAXI_REGLEMENTATION_MODULE_IDS.has(Number(moduleData.id))) return false;
      const page = pages[pageIdx];
      if (!page) return false;
      const title = page?.type === "cours"
        ? page.cours.titre
        : page?.type === "exercice-single"
          ? page.exercice.titre
          : "";
      return /réglementation\s+(nationale|locale)/i.test(title);
    };

    const isPageUnlocked = (pageIndex: number): boolean => {
      if (pageIndex === 0) return true;
      // Introduction modules: ALWAYS sequential — must complete each step before next
      if (isIntroModule) {
        for (let i = 0; i < pageIndex; i++) {
          if (!completedPages.has(i)) return false;
        }
        return true;
      }
      // E-learning: navigation libre sans obligation de défiler toutes les slides
      if (!isPresentiel) return true;
      // Présentiel formations: all pages freely accessible (no slide gate)
      if (isPresentiel) return true;
      // For TAXI présentiel: Réglementation Nationale/Locale pages are freely accessible
      if (isReglementationPage(pageIndex)) return true;
      // All previous pages must be completed (skip réglementation pages in the chain)
      for (let i = 0; i < pageIndex; i++) {
        if (isReglementationPage(i)) continue;
        if (!completedPages.has(i)) return false;
      }
      return true;
    };

    const goToPage = (page: number) => {
      if (page >= 0 && page < totalPages && isPageUnlocked(page)) {
        setCurrentPage(page);
        // Track individual cours view
        const targetPage = pages[page];
        if (targetPage?.type === "cours" && onTrackCours) {
          onTrackCours(module.id, targetPage.cours.titre);
        }
        if (pendingResultRestore && page !== pendingResultRestore.page) {
          setPendingResultRestore(null);
        }
        // Auto scroll-to-top retiré : il remontait la page pendant les quiz lors des re-renders
      }
    };

    const renderCoursPage = (cours: ContentItem) => {
      const hasInteractiveSlides = Boolean(cours.slidesKey && slidesByKey[cours.slidesKey]?.length > 0);
      const suppressPreInformationEmails = isFormationContinueVtcTaxi(apprenantType, apprenantInfo?.formation_choisie);

      // --- Interactive checklist types ---
      if (cours.checklistType === "competences") {
        const competencesData = getCompetencesForFormation(apprenantType);
        return (
          <CompetencesChecklist
            data={competencesData}
            apprenantId={apprenantId || undefined}
            suppressAdminNotification={suppressPreInformationEmails}
            completed={completedPages.has(currentPage)}
            onComplete={() => {
              markPageCompleted(currentPage);
              if (currentPage < totalPages - 1) goToPage(currentPage + 1);
            }}
          />
        );
      }

      if (cours.checklistType === "emargements-fc") {
        return (
          <EmargementsSignesViewer
            apprenantId={apprenantId || undefined}
            completed={completedPages.has(currentPage)}
            onComplete={() => {
              markPageCompleted(currentPage);
              if (currentPage < totalPages - 1) goToPage(currentPage + 1);
            }}
          />
        );
      }

      if (cours.checklistType === "remboursement-fc-vtc") {
        return (
          <RemboursementFCViewer
            apprenantId={apprenantId || undefined}
            formation="VTC"
            completed={completedPages.has(currentPage)}
            onComplete={() => {
              markPageCompleted(currentPage);
              if (currentPage < totalPages - 1) goToPage(currentPage + 1);
            }}
          />
        );
      }

      if (cours.checklistType === "demande-carte-vtc") {
        return (
          <DemandeCarteVTCViewer
            completed={completedPages.has(currentPage)}
            onComplete={() => {
              markPageCompleted(currentPage);
              if (currentPage < totalPages - 1) goToPage(currentPage + 1);
            }}
          />
        );
      }

      if (cours.checklistType === "remboursement-fc-taxi") {
        return (
          <RemboursementFCViewer
            apprenantId={apprenantId || undefined}
            formation="TAXI"
            completed={completedPages.has(currentPage)}
            onComplete={() => {
              markPageCompleted(currentPage);
              if (currentPage < totalPages - 1) goToPage(currentPage + 1);
            }}
          />
        );
      }

      if (cours.checklistType === "demande-carte-taxi") {
        return (
          <DemandeCarteTAXIViewer
            completed={completedPages.has(currentPage)}
            onComplete={() => {
              markPageCompleted(currentPage);
              if (currentPage < totalPages - 1) goToPage(currentPage + 1);
            }}
          />
        );
      }


      if (cours.checklistType === "financeur-fc") {
        return (
          <FinanceurFCForm
            apprenantId={apprenantId || undefined}
            apprenantNom={apprenantInfo?.nom}
            apprenantPrenom={apprenantInfo?.prenom}
            apprenantEmail={apprenantInfo?.email}
            apprenantTelephone={apprenantInfo?.telephone}
            apprenantAdresse={apprenantInfo?.adresse}
            apprenantCodePostal={apprenantInfo?.code_postal}
            apprenantVille={apprenantInfo?.ville}
            completed={completedPages.has(currentPage)}
            onComplete={() => {
              markPageCompleted(currentPage);
              if (currentPage < totalPages - 1) goToPage(currentPage + 1);
            }}
          />
        );
      }

      if (cours.checklistType === "analyse-besoin") {
        return (
          <AnalyseBesoinForm
            apprenantNom={apprenantInfo?.nom}
            apprenantPrenom={apprenantInfo?.prenom}
            apprenantEmail={apprenantInfo?.email}
            apprenantTelephone={apprenantInfo?.telephone}
            apprenantAdresse={apprenantInfo?.adresse}
            apprenantCodePostal={apprenantInfo?.code_postal}
            apprenantVille={apprenantInfo?.ville}
            apprenantType={apprenantType || ""}
            apprenantId={apprenantId || undefined}
            suppressAdminNotification={suppressPreInformationEmails}
            completed={completedPages.has(currentPage)}
            onComplete={() => {
              markPageCompleted(currentPage);
              if (currentPage < totalPages - 1) goToPage(currentPage + 1);
            }}
          />
        );
      }

      if (cours.checklistType === "projet-professionnel") {
        return (
          <ProjetProfessionnelForm
            apprenantNom={apprenantInfo?.nom}
            apprenantPrenom={apprenantInfo?.prenom}
            apprenantEmail={apprenantInfo?.email}
            apprenantTelephone={apprenantInfo?.telephone}
            apprenantAdresse={apprenantInfo?.adresse}
            apprenantDateNaissance={apprenantInfo?.date_naissance || ""}
            apprenantType={apprenantType || ""}
            apprenantId={apprenantId || undefined}
            suppressAdminNotification={suppressPreInformationEmails}
            isAdmin={!studentOnly}
            completed={completedPages.has(currentPage)}
            onComplete={() => {
              markPageCompleted(currentPage);
              if (currentPage < totalPages - 1) goToPage(currentPage + 1);
            }}
          />
        );
      }

      if (cours.checklistType === "cgv") {
        return (
          <CGVAcceptanceForm
            apprenantId={apprenantId || undefined}
            completed={completedPages.has(currentPage)}
            onComplete={() => {
              markPageCompleted(currentPage);
              if (currentPage < totalPages - 1) goToPage(currentPage + 1);
            }}
          />
        );
      }

      if (cours.checklistType === "cgv-reglement") {
        return (
          <CGVReglementForm
            apprenantId={apprenantId || undefined}
            apprenantNom={apprenantInfo?.nom}
            apprenantPrenom={apprenantInfo?.prenom}
            apprenantAdresse={apprenantInfo?.adresse}
            apprenantType={apprenantType}
            completed={completedPages.has(currentPage)}
            onComplete={() => {
              markPageCompleted(currentPage);
              if (currentPage < totalPages - 1) goToPage(currentPage + 1);
            }}
          />
        );
      }

      if (cours.checklistType === "evaluation-acquis") {
        return (
          <EvaluationAcquisForm
            formationType={cours.formationType || "vtc"}
            apprenantId={apprenantId || undefined}
            onComplete={() => {
              markPageCompleted(currentPage);
              if (currentPage < totalPages - 1) goToPage(currentPage + 1);
            }}
          />
        );
      }

      if (cours.checklistType === "satisfaction") {
        return (
          <SatisfactionForm
            formationType={cours.formationType || "vtc"}
            apprenantId={apprenantId || undefined}
            onComplete={() => {
              markPageCompleted(currentPage);
              if (currentPage < totalPages - 1) {
                goToPage(currentPage + 1);
              } else {
                persistModuleCompletion();
                onBack();
                toast.success("🎉 Formation terminée ! Merci pour vos retours.");
              }
            }}
          />
        );
      }

      return (
        <div className="space-y-4">
        <Card key={cours.id} className="overflow-hidden">
          {cours.image && (
            <div className="w-full h-48 sm:h-64 overflow-hidden">
              <CourseImageLightbox src={cours.image} alt={cours.titre} className="w-full h-full object-cover" />
            </div>
          )}
          <CardContent className="p-5 space-y-2">
            <h4 className="font-bold text-lg">{cours.titre}</h4>
            {cours.sousTitre && <p className="text-sm text-muted-foreground">{cours.sousTitre}</p>}
            {cours.description && (
              <div
                className="text-sm whitespace-pre-line leading-relaxed mt-2"
                dangerouslySetInnerHTML={{ __html: cours.description }}
              />
            )}
            {Array.isArray(cours.images) && cours.images.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                {cours.images.map((url, i) => (
                  <CourseImageLightbox
                    key={`${url}-${i}`}
                    src={url}
                    alt={`${cours.titre} - photo ${i + 1}`}
                    className="w-full h-48 object-cover rounded border"
                  />
                ))}
              </div>
            )}

            {(() => {
              return (
                <>
                  {cours.fichiers && cours.fichiers.length > 0 && (() => {
                    const pdfFile = cours.fichiers!.find(f => f.nom.endsWith(".pdf") || f.url.endsWith(".pdf"));
                    const pdfLocalUrl = pdfFile?.url;

                    return (
                      <div className="space-y-3 mt-3">
                        {cours.fichiers!.map((f, i) => (
                          <CourseFileViewer
                            key={`${f.url}-${i}`}
                            fichier={f}
                            pdfFallbackUrl={pdfLocalUrl}
                            hasInteractiveSlides={hasInteractiveSlides}
                            secureMode={secureMode}
                            onLastPageReached={() => markPageCompleted(currentPage)}
                          />
                        ))}
                      </div>
                    );
                  })()}

                  {hasInteractiveSlides && cours.slidesKey && (
                    <div className="mt-4" style={{ height: "min(70vh, 600px)" }}>
                      <SlideViewer
                        slides={slidesByKey[cours.slidesKey] ?? []}
                        titre={cours.titre}
                        brand="FTRANSPORT"
                        onBack={() => {}}
                        editable={!secureMode}
                        onLastSlideReached={() => markPageCompleted(currentPage)}
                        onSlidesChange={(slides) => updateSlidesForKey(cours.slidesKey!, slides)}
                      />
                    </div>
                  )}
                </>
              );
            })()}
          </CardContent>
        </Card>

        {/* Acknowledgment button for intro modules (text-only pages) */}
        {isIntroModule && (() => {
          const hasPdf = cours.fichiers?.some(f => f.nom.endsWith(".pdf") || f.url.endsWith(".pdf"));
          const hasSlides = cours.slidesKey && slidesByKey[cours.slidesKey]?.length > 0;
          const hasQuiz = cours.quiz && cours.quiz.length > 0;
          const isTextOnly = !hasPdf && !hasSlides && !hasQuiz;
          const isAcknowledged = introAcknowledged.has(cours.id);
          
          if (isTextOnly && !completedPages.has(currentPage)) {
            return (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id={`ack-${cours.id}`}
                      checked={isAcknowledged}
                      onChange={(e) => {
                        setIntroAcknowledged(prev => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(cours.id);
                          else next.delete(cours.id);
                          return next;
                        });
                      }}
                      className="mt-1 h-4 w-4 rounded border-primary accent-primary cursor-pointer"
                    />
                    <label htmlFor={`ack-${cours.id}`} className="text-sm cursor-pointer select-none">
                      J'ai lu et compris le contenu ci-dessus.
                    </label>
                  </div>
                  <Button
                    size="sm"
                    disabled={!isAcknowledged}
                    onClick={async () => {
                      markPageCompleted(currentPage);
                      if (currentPage < totalPages - 1) {
                        goToPage(currentPage + 1);
                      } else {
                        // Last page of intro module: persist completion to DB
                        const ok = await persistModuleCompletion();
                        if (ok) {
                          toast.success("✅ Module enregistré !");
                          onBack();
                        }
                      }
                    }}
                    className="w-full gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {currentPage === totalPages - 1 ? "Valider et terminer le module" : "Valider et continuer"}
                  </Button>
                </CardContent>
              </Card>
            );
          }
          return null;
        })()}

        {/* Inline Quiz after course content */}
        {cours.quiz && cours.quiz.length > 0 && (() => {
          const pageIdx = currentPage;
          const isValidated = inlineQuizValidated.has(cours.id);
          const inlineQuizPrompts = buildExerciseQuestionPrompts(cours.quiz ?? []);
          const allAnswered = cours.quiz!.every(q => inlineQuizAnswers[`inline-${cours.id}-${q.id}`]);
          const correctInline = cours.quiz!.filter(q => {
            const sel = inlineQuizAnswers[`inline-${cours.id}-${q.id}`];
            const correct = q.choix.find(c => c.correct);
            return sel && correct && sel === correct.lettre;
          }).length;

          return (
            <div className="grid grid-cols-[minmax(0,1fr)_64px] sm:grid-cols-[minmax(0,1fr)_88px] gap-3 sm:gap-4">
              <div className="min-w-0">
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-5 space-y-4">
                <h4 className="font-bold text-lg flex items-center gap-2">
                  🧠 Exercice d'application
                </h4>
                {cours.quiz!.map((q, qi) => {
                  const key = `inline-${cours.id}-${q.id}`;
                  const selected = inlineQuizAnswers[key];
                  const prompt = inlineQuizPrompts[qi] ?? parseExerciseQuestionPrompt(q.enonce);
                  return (
                    <div key={q.id} id={`inline-q-${cours.id}-${q.id}`} data-answer-scroll-anchor className={`space-y-2 p-4 border rounded-lg scroll-mt-20 transition-all ${unansweredKeys.has(key) ? 'border-destructive border-2 bg-destructive/5' : 'bg-background'}`}>
                      {renderExerciseQuestionPrompt(qi + 1, prompt)}
                      <div className="space-y-1.5 ml-2">
                        {q.choix.map(c => {
                          let bg = "bg-background hover:bg-muted/50 border";
                          if (selected === c.lettre && !isValidated) bg = "bg-primary/10 border-primary border-2";
                          if (isValidated && c.correct) bg = "bg-emerald-50 border-emerald-500 border-2 dark:bg-emerald-950";
                          if (isValidated && selected === c.lettre && !c.correct) bg = "bg-destructive/10 border-destructive border-2";
                          return (
                            <button
                              key={c.lettre}
                              onClick={(event) => {
                                if (isValidated) return;
                                captureAnswerScrollPosition(event.currentTarget);
                                flushSync(() => {
                                  setInlineQuizAnswers(prev => prev[key] === c.lettre ? prev : ({ ...prev, [key]: c.lettre }));
                                  setUnansweredKeys(prev => { if (!prev.has(key)) return prev; const n = new Set(prev); n.delete(key); return n; });
                                });
                                scheduleAnswerScrollRestore();
                              }}
                              className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-all ${bg}`}
                            >
                              <span className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0">
                                {c.lettre}
                              </span>
                              <span className="text-sm flex-1">{c.texte}</span>
                              {isValidated && c.correct && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                            </button>
                          );
                        })}
                        {isValidated && q.choix.some(c => c.explication) && (
                          <div className="mt-2 space-y-1.5">
                            {q.choix.filter(c => c.explication).map(c => (
                              <div key={`exp-${c.lettre}`} className={`p-2 rounded-md text-xs border ${c.correct ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800" : "bg-muted/50 border-border"}`}>
                                <span className="font-semibold">{c.lettre}.</span> {c.explication}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* Explanation after validation */}
                      {isValidated && q.explication && (
                        <div className="mt-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-sm">
                          <p className="font-semibold text-blue-800 dark:text-blue-200 mb-1">💡 Explication :</p>
                          <p className="text-blue-700 dark:text-blue-300">{q.explication}</p>
                        </div>
                      )}
                      {isValidated && !q.explication && (() => {
                        const correctChoice = q.choix.find(c => c.correct);
                        return correctChoice ? (
                          <div className="mt-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-sm">
                            <p className="font-semibold text-blue-800 dark:text-blue-200">✅ Bonne réponse : {correctChoice.lettre}. {correctChoice.texte}</p>
                          </div>
                        ) : null;
                      })()}
                    </div>
                  );
                })}

                {!isValidated ? (
                  <Button
                    onClick={async () => {
                      if (!allAnswered) {
                        // Find unanswered inline questions and highlight them
                        const missing = new Set<string>();
                        cours.quiz!.forEach(qq => {
                          const k = `inline-${cours.id}-${qq.id}`;
                          if (!inlineQuizAnswers[k]) missing.add(k);
                        });
                        setUnansweredKeys(missing);
                        const firstMissingKey = Array.from(missing)[0];
                        if (firstMissingKey) {
                          document
                            .getElementById(`inline-q-${cours.id}-${firstMissingKey.split("-").pop()}`)
                            ?.scrollIntoView({ behavior: "smooth", block: "start" });
                        }
                        toast.error("Répondez à toutes les questions avant de valider");
                        return;
                      }
                      setUnansweredKeys(new Set());
                      setInlineQuizValidated(prev => {
                        const next = new Set(prev);
                        next.add(cours.id);
                        return next;
                      });
                      markPageCompleted(pageIdx);

                      // VALIDATION DÉFINITIVE CÔTÉ SERVEUR (status = submitted)
                      if (apprenantId) {
                        const inlineAnswers: Record<string, any> = {};
                        cours.quiz!.forEach((qq) => {
                          const k = `inline-${cours.id}-${qq.id}`;
                          if (inlineQuizAnswers[k]) inlineAnswers[k] = inlineQuizAnswers[k];
                        });
                        const submitted = await submitQuizAttempt({
                          apprenantId,
                          exerciceId: buildInlineQuizId(module.id, cours.id),
                          exerciceType: "quiz",
                          reponses: inlineAnswers,
                          bonnesReponses: correctInline,
                          totalQuestions: cours.quiz!.length,
                        });
                        if (!submitted) {
                          toast.error("⚠️ Validation non enregistrée sur le serveur — vérifiez votre connexion et revalidez.");
                          return;
                        }
                      }

                      if (correctInline === cours.quiz!.length) {
                        toast.success("🎉 Parfait ! Toutes les réponses sont correctes !");
                      } else {
                        toast("📖 Consultez les corrections ci-dessus");
                      }
                    }}
                    className="gap-2"
                    
                  >
                    <CheckCircle2 className="w-4 h-4" /> Valider mes réponses
                  </Button>
                ) : (() => {
                  const totalInline = cours.quiz!.length;
                  const pctInline = totalInline > 0 ? Math.round((correctInline / totalInline) * 100) : 0;
                  const cColor = pctInline >= 80 ? "text-emerald-500" : pctInline >= 50 ? "text-amber-500" : "text-destructive";
                  const cBg = pctInline >= 80 ? "bg-emerald-50 dark:bg-emerald-950/30" : pctInline >= 50 ? "bg-amber-50 dark:bg-amber-950/30" : "bg-red-50 dark:bg-red-950/30";
                  const circ = 2 * Math.PI * 40;
                  const offset = circ - (pctInline / 100) * circ;
                  return (
                  <div className="flex flex-col items-center gap-3 py-2">
                    <div className={`relative w-24 h-24 rounded-full flex items-center justify-center ${cBg}`}>
                      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 90 90">
                        <circle cx="45" cy="45" r="40" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/20" />
                        <circle cx="45" cy="45" r="40" fill="none" stroke="currentColor" strokeWidth="6" className={cColor} strokeLinecap="round"
                          strokeDasharray={circ} strokeDashoffset={offset} style={{ transition: "stroke-dashoffset 1s ease-out" }} />
                      </svg>
                      <span className={`text-2xl font-black ${cColor}`}>{pctInline}%</span>
                    </div>
                    <p className="text-lg font-bold">Points : {correctInline} / {totalInline}</p>
                    <p className="text-sm text-muted-foreground">
                      {correctInline === totalInline ? "🎉 Parfait !" : "📖 Révisez les corrections ci-dessus"}
                    </p>
                  </div>
                  );
                })()}
              </CardContent>
            </Card>
              </div>
              <aside className="block">
                <div className="sticky top-4 rounded-lg border bg-card p-2 max-h-[calc(100vh-2rem)] overflow-y-auto">
                  <div className="text-[10px] font-semibold text-muted-foreground text-center mb-2 uppercase tracking-wide">
                    Questions
                  </div>
                    <div className="grid grid-cols-2 gap-1.5">
                    {cours.quiz!.map((q, qi) => {
                      const key = `inline-${cours.id}-${q.id}`;
                      const isAnswered = !!inlineQuizAnswers[key];
                      return (
                        <button
                          key={q.id ?? qi}
                          type="button"
                          onClick={() => document.getElementById(`inline-q-${cours.id}-${q.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                          className={`w-full aspect-square rounded-md text-xs font-bold transition-colors flex items-center justify-center ${
                            isAnswered
                              ? "bg-green-500 text-white border border-green-600 hover:bg-green-600"
                              : "bg-red-500 text-white border border-red-600 hover:bg-red-600"
                          }`}
                          title={isAnswered ? `Q${qi + 1} — répondue ✓` : `Q${qi + 1} — non répondue ✗`}
                        >
                          {qi + 1}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-3 space-y-1.5 text-[10px] text-muted-foreground border-t pt-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-green-500 border border-green-600" />
                      <span>Répondu</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-red-500 border border-red-600" />
                      <span>À faire</span>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          );
        })()}
      </div>
    );
    };

    const renderSingleExercicePage = (exo: ExerciceItem) => {
      const handleQrcCorrection = async (exoId: number, q: any, key: string) => {
        const existingAnswer = selectedAnswers[key];
        const reponse = (qrcAnswers[key] ?? (typeof existingAnswer === "string" ? existingAnswer : "")).trim();
        if (!reponse) { toast.error("Écrivez une réponse avant de valider"); return; }
        setQrcResults(prev => ({ ...prev, [key]: "loading" }));
        try {
          const { data, error } = await supabase.functions.invoke("corriger-qrc", {
            body: {
              question: q.enonce,
              reponseEtudiant: reponse,
              reponsesAttendues: q.reponsesAttendues || [],
              matiereId: "reglementation_taxi",
              pointsQuestion: 2,
            },
          });
          if (error) throw error;
          setQrcResults(prev => ({ ...prev, [key]: data }));
        } catch (e) {
          console.error(e);
          setQrcResults(prev => ({ ...prev, [key]: { estCorrect: false, pointsObtenus: 0, explication: "Erreur de correction" } }));
          toast.error("Erreur lors de la correction IA");
        }
      };

      const exoQuestionsNormalized = (exo.questions ?? []).map((q: any) => {
        if (!q) return q;
        const choix = getQuestionChoices(q);
        return {
          ...q,
          choix,
          type: q?.type ?? (choix.length > 0 ? "qcm" : "qrc"),
        };
      });
      const questionsSafe = (exoQuestionsNormalized ?? []).filter((q: any) => q != null && q?.type != null);
      const exoTotalQ = questionsSafe.length;
      const questionPrompts = buildExerciseQuestionPrompts(questionsSafe);
      const exoCorrect = questionsSafe.filter((q: any) => {
        const key = `${exo.id}-${q.id}`;
        return isAnswerCorrect(selectedAnswers[key], q as any);
      }).length;
      const isQuestionAnsweredForSidebar = (q: any) => {
        const key = `${exo.id}-${q.id}`;
        const isQrc = q?.type === "qrc" || (q.choix?.length === 0 && q.reponsesAttendues);
        if (isQrc) {
          const qrcValue = qrcAnswers[key] ?? selectedAnswers[key];
          return typeof qrcValue === "string" && qrcValue.trim().length > 0;
        }
        const answer = selectedAnswers[key];
        return Array.isArray(answer) ? answer.length > 0 : !!answer;
      };
      const scrollToExerciseQuestion = (questionIndex: number) => {
        document
          .getElementById(`exo-q-${exo.id}-${questionIndex}`)
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      };

      // File-only exercise (no questions) — show links and auto-complete
      if (exoTotalQ === 0 && exo.fichiers && exo.fichiers.length > 0) {
        return (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold">📝 {exo.titre}</h3>
                    {exo.sousTitre && <p className="text-sm text-muted-foreground mt-1">{exo.sousTitre}</p>}
                  </div>
                  {(apprenantInfo?.prenom || apprenantInfo?.nom) && (
                    <div className="shrink-0 px-3 py-1.5 rounded-lg border-2 border-primary/30 bg-primary/5 text-primary text-sm font-semibold whitespace-nowrap">
                      👤 {apprenantInfo?.prenom} {apprenantInfo?.nom}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-3 mt-4">
                  {exo.fichiers.map((f, i) => {
                    return (
                      <CourseFileLink key={`${f.url}-${i}`} fichier={f} />
                    );
                  })}
                </div>
                <div className="flex justify-center gap-4 pt-4">
                  {!completedPages.has(currentPage) && (
                    <Button
                      size="lg"
                      onClick={() => {
                        markPageCompleted(currentPage);
                        toast.success("✅ Contenu consulté !");
                      }}
                      className="gap-2"
                    >
                      <CheckCircle2 className="w-5 h-5" /> J'ai consulté ce contenu
                    </Button>
                  )}
                  {completedPages.has(currentPage) && currentPage < totalPages - 1 && (
                    <Button size="lg" className="gap-2" onClick={() => goToPage(currentPage + 1)}>
                      Suivant ➡️
                    </Button>
                  )}
                  {completedPages.has(currentPage) && currentPage === totalPages - 1 && (
                    <Button size="lg" variant="secondary" className="gap-2" onClick={async () => {
                      const ok = await persistModuleCompletion();
                      onBack();
                      if (ok) toast.success("🎉 Module terminé !");
                    }}>
                      <CheckCircle2 className="w-4 h-4" /> Terminé
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        );
      }

      return (
      <div className="grid grid-cols-[minmax(0,1fr)_64px] sm:grid-cols-[minmax(0,1fr)_88px] gap-3 sm:gap-4">
        <div className="space-y-4 min-w-0">
          <Card key={exo.id} id={`exo-revision-top-${exo.id}`} className="scroll-mt-4 transition-all">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="text-lg font-bold">📝 {exo.titre}</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  {(apprenantInfo?.prenom || apprenantInfo?.nom) && (
                    <div className="px-3 py-1.5 rounded-lg border-2 border-primary/30 bg-primary/5 text-primary text-sm font-semibold whitespace-nowrap">
                      👤 {apprenantInfo?.prenom} {apprenantInfo?.nom}
                    </div>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowCalculator(v => !v)}
                    className="gap-1"
                  >
                    <Calculator className="w-4 h-4" />
                    Calculatrice
                  </Button>
                </div>
              </div>
              {exo.sousTitre && <p className="text-sm text-muted-foreground">{exo.sousTitre}</p>}
              {pendingWrongQuestionRevision?.exoId === exo.id && (
                <div className="rounded-lg border-2 border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-4 space-y-3 text-sm text-amber-900 dark:text-amber-200">
                  <div className="font-bold text-base">📖 Que souhaitez-vous faire ?</div>
                  <p>
                    Vous pouvez relire vos erreurs avec les corrections affichées, ou refaire directement uniquement les questions fausses.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      variant="outline"
                      className="border-amber-300 text-amber-800 hover:bg-amber-100"
                      onClick={() => {
                        setPendingWrongQuestionRevision(null);
                        scheduleScrollToRevisionStart(exo.id);
                      }}
                    >
                      📖 Relire mes erreurs
                    </Button>
                    <Button onClick={confirmWrongQuestionRevision}>
                      🎯 Refaire les questions fausses
                    </Button>
                  </div>
                </div>
              )}
              {/* Show file links if present alongside questions */}
              {exo.fichiers && exo.fichiers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {exo.fichiers.map((f, i) => (
                    <CourseFileLink key={`${f.url}-${i}`} fichier={f} compact />
                  ))}
                </div>
              )}
              {(() => {
                const revisionSet = revisionQuestionsFor[exo.id];
                const isRevisionMode = revisionSet && revisionSet.size > 0;
                if (isRevisionMode) {
                  return (
                    <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-3 text-sm text-amber-800 dark:text-amber-300 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <span>🎯 Mode révision — vous ne voyez que les {revisionSet.size} question{revisionSet.size > 1 ? "s" : ""} fausse{revisionSet.size > 1 ? "s" : ""}.</span>
                        <Button size="sm" variant="ghost" onClick={() => {
                          setRevisionQuestionsFor(prev => { const next = { ...prev }; delete next[exo.id]; return next; });
                        }}>Voir toutes les questions</Button>
                      </div>
                      <div className="font-semibold text-amber-900 dark:text-amber-200">
                        📖 Relisez vos erreurs avant de recommencer les questions fausses.
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
              {questionsSafe.map((q: any, originalIdx: number) => ({ q, originalIdx })).filter(({ q }: any) => {
                const revisionSet = revisionQuestionsFor[exo.id];
                if (!revisionSet || revisionSet.size === 0) return true;
                return revisionSet.has(q.id);
              }).map(({ q, originalIdx }: any, _filteredIdx: number) => {
                const qi = originalIdx;
                const key = `${exo.id}-${q.id}`;
                const isQrc = q?.type === "qrc" || (q.choix?.length === 0 && q.reponsesAttendues);
                const selected = selectedAnswers[key];
                const qrcResult = qrcResults[key];
                const revisionSet = revisionQuestionsFor[exo.id];
                const isInRevision = revisionSet && revisionSet.size > 0;

                if (isQrc) {
                  const isQrcWrong = isInRevision || (qrcResult && qrcResult !== "loading" && !qrcResult.estCorrect);
                  return (
                    <div key={q.id} id={`exo-q-${exo.id}-${qi}`} className={`space-y-2 p-4 border rounded-lg scroll-mt-20 ${isQrcWrong ? 'border-destructive border-4 bg-destructive/10' : ''}`}>
                      {renderExerciseQuestionPrompt(qi + 1, questionPrompts[qi] ?? parseExerciseQuestionPrompt(q.enonce))}
                      <Badge variant="outline" className="text-xs">QRC — Réponse libre</Badge>
                      <Textarea
                        placeholder="Écrivez votre réponse ici..."
                        value={qrcAnswers[key] ?? (typeof selected === "string" ? selected : "")}
                        onChange={(e) => handleQrcAnswerChange(key, e.target.value)}
                        disabled={qrcResult !== undefined && qrcResult !== "loading"}
                        className="mt-2"
                      />
                      {!qrcResult && (
                        <Button size="sm" onClick={() => handleQrcCorrection(exo.id, q, key)} className="gap-2 mt-1">
                          🤖 Corriger par IA
                        </Button>
                      )}
                      {qrcResult === "loading" && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin" /> Correction en cours...
                        </div>
                      )}
                      {qrcResult && qrcResult !== "loading" && (
                        <div className={`p-3 rounded-lg border-2 mt-2 ${qrcResult.estCorrect ? "bg-emerald-50 border-emerald-500 dark:bg-emerald-950" : qrcResult.pointsObtenus > 0 ? "bg-amber-50 border-amber-500 dark:bg-amber-950" : "bg-destructive/10 border-destructive"}`}>
                          <p className="font-semibold text-sm">
                            🤖 {qrcResult.estCorrect ? "✅ Correct" : qrcResult.pointsObtenus > 0 ? "⚠️ Partiellement correct" : "❌ Incorrect"} — {qrcResult.pointsObtenus}/2 pts
                          </p>
                          <p className="text-sm mt-1">{qrcResult.explication}</p>
                          {q.reponsesAttendues && (
                            <p className="text-xs text-muted-foreground mt-2">
                              💡 Réponses attendues : {q.reponsesAttendues.join(" / ")}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                }

                const multi = isMultiAnswer(q);
                const selectedArr = Array.isArray(selected) ? selected : selected ? [selected] : [];
                const exoShowResults = showResultsFor.has(exo.id);
                const answerIsCorrect = isAnswerCorrect(selected, q);
                const isQcmWrong = (isInRevision && selectedArr.length > 0 && !answerIsCorrect) || (exoShowResults && !answerIsCorrect);


                return (
                  <div key={q.id} id={`exo-q-${exo.id}-${qi}`} data-answer-scroll-anchor className={`space-y-2 p-4 border rounded-lg scroll-mt-20 transition-all ${isQcmWrong ? 'border-destructive border-4 bg-destructive/10' : unansweredKeys.has(key) ? 'border-destructive border-2 bg-destructive/5' : ''}`}>
                    {renderExerciseQuestionPrompt(qi + 1, questionPrompts[qi] ?? parseExerciseQuestionPrompt(q.enonce))}
                    {q.image && (() => {
                      const sizeMap: Record<string, string> = {
                        sm: "max-h-40",
                        md: "max-h-64",
                        lg: "max-h-96",
                        xl: "max-h-[32rem]",
                        "2xl": "max-h-[48rem]",
                      };
                      const sizeClass = sizeMap[q.imageSize ?? "sm"] ?? "max-h-40";
                      return (
                        <ExamQuestionImage image={q.image} alt="Illustration" className={`${sizeClass} rounded border object-contain ml-2`} fallbackClassName="ml-2 text-xs text-muted-foreground italic" />
                      );
                    })()}
                    {multi && (
                      <p className="text-xs text-muted-foreground italic ml-2">⚠️ Plusieurs réponses possibles</p>
                    )}
                    <div className="space-y-1.5 ml-2">
                      {getQuestionChoices(q).map((c: any) => {
                        const exoShowResults = showResultsFor.has(exo.id);
                        const isSelected = selectedArr.includes(c.lettre);
                        let bg = "bg-background hover:bg-muted/50 border";
                        if (isSelected && !exoShowResults) bg = "bg-primary/10 border-primary border-2";
                        if (exoShowResults && c.correct) bg = "bg-emerald-50 border-emerald-500 border-2 dark:bg-emerald-950";
                        if (exoShowResults && isSelected && !c.correct) bg = "bg-destructive/10 border-destructive border-2";
                        return (
                          <button
                            key={c.lettre}
                            onClick={(event) => handleAnswer(exo.id, q.id, c.lettre, multi, event.currentTarget)}
                            className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-all ${bg}`}
                          >
                            {multi ? (
                              <span className={`w-5 h-5 rounded border-2 flex items-center justify-center text-xs font-bold shrink-0 ${isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/40'}`}>
                                {isSelected ? '✓' : ''}
                              </span>
                            ) : (
                              <span className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 ${isSelected ? 'border-primary bg-primary text-primary-foreground' : ''}`}>
                                {c.lettre}
                              </span>
                            )}
                            <span className="text-sm">{c.texte}</span>
                            {exoShowResults && c.correct && <CheckCircle2 className="w-4 h-4 text-emerald-600 ml-auto shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {exoTotalQ > 0 && (
                <div className="flex justify-center gap-4">
                  {!showResultsFor.has(exo.id) ? (
                    <Button
                      size="lg"
                      onClick={async () => {
                        // Check all QCM questions are answered (skip QRC)
                        const unansweredQcmKeys: string[] = [];
                        let firstMissingIndex = -1;
                        questionsSafe.forEach((q: any, qi: number) => {
                          const k = `${exo.id}-${q.id}`;
                          const isQrc = q?.type === "qrc" || (q.choix?.length === 0 && q.reponsesAttendues);
                          const ans = selectedAnswers[k];
                          const hasAnswer = Array.isArray(ans) ? ans.length > 0 : !!ans;
                          if (!isQrc && !hasAnswer) {
                            unansweredQcmKeys.push(k);
                            if (firstMissingIndex === -1) firstMissingIndex = qi;
                          }
                        });
                        if (unansweredQcmKeys.length > 0) {
                          setUnansweredKeys(new Set(unansweredQcmKeys));
                          toast.error("Répondez à toutes les questions QCM avant de valider");
                          if (firstMissingIndex !== -1) {
                            setTimeout(() => {
                              document
                                .getElementById(`exo-q-${exo.id}-${firstMissingIndex}`)
                                ?.scrollIntoView({ behavior: "smooth", block: "start" });
                            }, 50);
                          }
                          return;
                        }
                        setUnansweredKeys(new Set());
                        const validatedResultState = { exoId: exo.id, page: currentPage, validatedAt: Date.now() };

                        const nextShowResults = new Set(showResultsFor);
                        nextShowResults.add(exo.id);
                        setShowResultsFor(nextShowResults);

                        const nextCompletedPages = new Set(completedPages);
                        nextCompletedPages.add(currentPage);
                        setCompletedPages(nextCompletedPages);
                        setPendingResultRestore(validatedResultState);

                        try {
                          const revisionSerialized: Record<string, (number | string)[]> = {};
                          for (const [k, v] of Object.entries(revisionQuestionsFor)) {
                            revisionSerialized[k] = Array.from(v as Set<number | string>);
                          }
                          window.sessionStorage.setItem(
                            learnerUiStateKey,
                            JSON.stringify({
                              currentPage,
                              selectedAnswers,
                              showResultsFor: Array.from(nextShowResults),
                              completedPages: Array.from(nextCompletedPages),
                              pendingResultRestore: validatedResultState,
                              revisionQuestionsFor: revisionSerialized,
                            })
                          );
                        } catch (error) {
                          console.error("Erreur snapshot UI module:", error);
                        }

                        // Persist partiel en DB pour garder les réponses/scores intermédiaires
                        // sans marquer le module comme terminé.
                        if (apprenantId) {
                          try {
                            const questionDetails = activeExercices.flatMap(e =>
                              (e.questions || []).map(q => {
                                const key = `${e.id}-${q.id}`;
                                const sel = selectedAnswers[key];
                                 const correctChoix = getQuestionChoices(q).filter(c => c.correct);
                                 const correctLetters = correctChoix.map(c => c.lettre);
                                 const correctTexts = correctChoix.map(c => c.texte);
                                return {
                                  exerciceId: e.id, exerciceTitre: e.titre,
                                  questionId: q.id, enonce: q.enonce,
                                  reponseEleve: sel || null,
                                   reponseCorrecte: correctLetters.length === 1 ? correctLetters[0] : correctLetters,
                                   reponseCorrecteTexte: correctTexts.length === 1 ? correctTexts[0] : correctTexts,
                                   correct: isAnswerCorrect(sel, q),
                                };
                              })
                            );
                            const totalQ = activeExercices.reduce((s, e) => s + (e.questions?.length || 0), 0);
                            const correctC = questionDetails.filter(d => d.correct).length;
                            await saveModuleCompletion({
                              apprenantId,
                              moduleId: module.id,
                              completed: false,
                              progress: totalQ > 0 ? Math.round((questionDetails.filter(d => d.reponseEleve).length / totalQ) * 100) : 0,
                              scoreObtenu: correctC,
                              scoreMax: totalQ,
                              details: questionDetails,
                            });

                          } catch (e) {
                            console.error("Erreur sauvegarde quiz:", e);
                          }
                        }

                        // VALIDATION DÉFINITIVE CÔTÉ SERVEUR (status = submitted)
                        if (apprenantId) {
                          const exoAnswers: Record<string, any> = {};
                          Object.entries(selectedAnswers).forEach(([k, v]) => {
                            if (k.startsWith(`${exo.id}-`)) exoAnswers[k] = v;
                          });
                          const submitted = await submitQuizAttempt({
                            apprenantId,
                            exerciceId: buildExerciceId(module.id, exo.id),
                            exerciceType: "quiz",
                            reponses: exoAnswers,
                            bonnesReponses: exoCorrect,
                            totalQuestions: exoTotalQ,
                          });
                          if (!submitted) {
                            toast.error("⚠️ Validation non enregistrée sur le serveur — vérifiez votre connexion et revalidez.");
                            return;
                          }
                        }

                        toast.success("✅ Quiz validé ! Consultez vos résultats puis cliquez sur Suivant.");
                      }}
                      className="gap-2"
                    >
                      <CheckCircle2 className="w-5 h-5" /> Valider les QCM
                    </Button>
                  ) : (() => {
                    const pct = exoTotalQ > 0 ? Math.round((exoCorrect / exoTotalQ) * 100) : 0;
                    const circleColor = pct >= 80 ? "text-emerald-500" : pct >= 50 ? "text-amber-500" : "text-destructive";
                    const circleBg = pct >= 80 ? "bg-emerald-50 dark:bg-emerald-950/30" : pct >= 50 ? "bg-amber-50 dark:bg-amber-950/30" : "bg-red-50 dark:bg-red-950/30";
                    const circumference = 2 * Math.PI * 54;
                    const strokeDashoffset = circumference - (pct / 100) * circumference;

                    return (
                    <div className="w-full space-y-5">
                      {/* Score circle */}
                      <div className="flex flex-col items-center gap-3">
                        <div className={`relative w-36 h-36 rounded-full flex items-center justify-center ${circleBg}`}>
                          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 120 120">
                            <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/20" />
                            <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="8" className={circleColor} strokeLinecap="round"
                              strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} style={{ transition: "stroke-dashoffset 1s ease-out" }} />
                          </svg>
                          <span className={`text-4xl font-black ${circleColor}`}>{pct}%</span>
                        </div>
                        <p className="text-lg font-bold">Points : {exoCorrect} / {exoTotalQ}</p>
                      </div>

                      {/* Answer grid */}
                      <div className="rounded-lg border p-4 space-y-2">
                        <h4 className="font-semibold text-sm">Réponses</h4>
                        <p className="text-xs text-muted-foreground">Cliquez sur une question pour revoir la correction</p>
                        <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
                          {questionsSafe.map((q, qi) => {
                            const key = `${exo.id}-${q.id}`;
                            const selected = selectedAnswers[key];
                            const isCorrect = isAnswerCorrect(selected, q as any);
                            return (
                              <div key={q.id}
                                className="flex items-center gap-2 rounded-lg border bg-background p-2 cursor-pointer hover:bg-muted/50 transition-colors"
                                title={`Q${qi + 1}: ${isCorrect ? "Correct" : "Incorrect"} — Cliquer pour voir`}
                                onClick={() => {
                                  const el = document.getElementById(`exo-q-${exo.id}-${qi}`);
                                  if (!el) {
                                    console.warn(`[Réponses] Anchor introuvable: exo-q-${exo.id}-${qi}`);
                                    return;
                                  }
                                  el.scrollIntoView({ behavior: "smooth", block: "start" });
                                  el.classList.add("ring-4", "ring-primary");
                                  setTimeout(() => el.classList.remove("ring-4", "ring-primary"), 1500);
                                }}

                              >
                                <span className="text-sm font-bold min-w-[1.2rem] text-center">{qi + 1}</span>
                                <span className={`w-3.5 h-3.5 rounded-full shrink-0 ${isCorrect ? "bg-emerald-500" : "bg-destructive"}`} />
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Progress + Actions */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-lg border p-4 space-y-2">
                          <h4 className="font-semibold text-sm">Progrès</h4>
                          <div className="flex gap-4">
                            <div className="flex flex-col items-center gap-1">
                              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                              </div>
                              <span className="text-xs text-muted-foreground">Soumis</span>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                              </div>
                              <span className="text-xs text-muted-foreground">Noté</span>
                            </div>
                          </div>
                        </div>
                        <div className="rounded-lg border p-4 space-y-2">
                          <h4 className="font-semibold text-sm">Actions</h4>
                          <div className="flex flex-col gap-2">
                            <Button variant="outline" size="sm" className="gap-2" onClick={() => {
              if (!window.confirm("Êtes-vous sûr de vouloir tout recommencer ? Vos réponses actuelles seront effacées.")) return;
              const exoKeys = questionsSafe.map((q: any) => `${exo.id}-${q.id}`);
                              // Save snapshot to history before clearing
                              const snapshot: Record<string, string | string[]> = {};
                              let snapCorrect = 0;
                              questionsSafe.forEach((q: any) => {
                                const k = `${exo.id}-${q.id}`;
                                if (selectedAnswers[k] !== undefined) snapshot[k] = selectedAnswers[k];
                                if (isAnswerCorrect(selectedAnswers[k], q)) snapCorrect++;
                              });
                              if (Object.keys(snapshot).length > 0) {
                                setAttemptHistoryFor(prev => ({
                                  ...prev,
                                  [exo.id]: [...(prev[exo.id] ?? []), { at: Date.now(), total: questionsSafe.length, correct: snapCorrect, mode: "complet", answers: snapshot }],
                                }));
                              }
                              setSelectedAnswers(prev => {
                                const next = { ...prev };
                                exoKeys.forEach(k => delete next[k]);
                autoSaveAnswers(next, [exo.id]);
                                return next;
                              });
                              setShowResultsFor(prev => { const next = new Set(prev); next.delete(exo.id); return next; });
                              setPendingResultRestore((prev) => (prev?.exoId === exo.id ? null : prev));
                              setRevisionQuestionsFor(prev => { const next = { ...prev }; delete next[exo.id]; return next; });
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}>
                              🔄 Recommencer tout
                            </Button>
                            <Button variant="outline" size="sm" className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50" onClick={() => {
                              const snapshot: Record<string, string | string[]> = {};
                              let snapCorrect = 0;
                              const wrongIds: (number | string)[] = [];
                              const wrongKeys: string[] = [];
                              questionsSafe.forEach((q: any) => {
                                const key = `${exo.id}-${q.id}`;
                                if (selectedAnswers[key] !== undefined) snapshot[key] = selectedAnswers[key];
                                if (isAnswerCorrect(selectedAnswers[key], q)) {
                                  snapCorrect++;
                                } else {
                                  wrongKeys.push(key);
                                  wrongIds.push(q.id);
                                }
                              });
                              if (wrongKeys.length === 0) {
                                toast.success("🎉 Aucune question fausse à refaire !");
                                return;
                              }
                              startWrongQuestionRevision({
                                exoId: exo.id,
                                total: questionsSafe.length,
                                snapCorrect,
                                snapshot,
                                wrongKeys,
                                wrongIds,
                              });
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}>
                              🎯 Refaire les fausses ({(() => {
                                let count = 0;
                                questionsSafe.forEach((q: any) => {
                                  const key = `${exo.id}-${q.id}`;
                                  if (!isAnswerCorrect(selectedAnswers[key], q)) count++;
                                });
                                return count;
                              })()})
                            </Button>
                            {currentPage < totalPages - 1 && completedPages.has(currentPage) && (
                              <Button size="sm" className="gap-2" onClick={() => {
                                goToPage(currentPage + 1);
                              }}>
                                Suivant ➡️
                              </Button>
                            )}
                            {currentPage === totalPages - 1 && (
                              <Button size="sm" variant="secondary" className="gap-2" onClick={async () => {
                                const ok = await persistModuleCompletion();
                                onBack();
                                if (ok) toast.success("🎉 Module terminé !");
                              }}>
                                <CheckCircle2 className="w-4 h-4" /> Terminé
                              </Button>
                            )}
                            <Button size="sm" variant="outline" className="gap-2 border-primary/30 text-primary hover:bg-primary/5" onClick={async () => {
                              await persistModuleCompletion();
                              onBack();
                            }}>
                              🏠 Retour à l'accueil
                            </Button>
                          </div>
                        </div>
                      </div>
                      {(attemptHistoryFor[exo.id]?.length ?? 0) > 0 && (
                        <div className="mt-4 rounded-lg border bg-muted/30 p-4">
                          <h4 className="font-semibold text-sm mb-2">📜 Historique des tentatives</h4>
                          <ul className="space-y-1 text-xs text-muted-foreground">
                            {attemptHistoryFor[exo.id].map((att, idx) => {
                              const pct = att.total > 0 ? Math.round((att.correct / att.total) * 100) : 0;
                              const dt = new Date(att.at);
                              return (
                                <li key={idx} className="flex items-center justify-between gap-2">
                                  <span>Tentative {idx + 1} — {dt.toLocaleDateString("fr-FR")} {dt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                                  <span className="font-medium">{att.correct}/{att.total} ({pct}%)</span>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <aside className="block">
          <div className="sticky top-4 rounded-lg border bg-card p-2 max-h-[calc(100vh-2rem)] overflow-y-auto">
            <div className="text-[10px] font-semibold text-muted-foreground text-center mb-2 uppercase tracking-wide">
              Questions
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {questionsSafe.map((q: any, qi: number) => {
                const isAnswered = isQuestionAnsweredForSidebar(q);
                return (
                  <button
                    key={q.id ?? qi}
                    type="button"
                    onClick={() => scrollToExerciseQuestion(qi)}
                    className={`w-full aspect-square rounded-md text-xs font-bold transition-colors flex items-center justify-center ${
                      isAnswered
                        ? "bg-green-500 text-white border border-green-600 hover:bg-green-600"
                        : "bg-red-500 text-white border border-red-600 hover:bg-red-600"
                    }`}
                    title={isAnswered ? `Q${qi + 1} — répondue ✓` : `Q${qi + 1} — non répondue ✗`}
                  >
                    {qi + 1}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 space-y-1.5 text-[10px] text-muted-foreground border-t pt-2">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-green-500 border border-green-600" />
                <span>Répondu</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-red-500 border border-red-600" />
                <span>À faire</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    );
    };

    if (totalPages === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <p>Aucun contenu disponible pour ce module.</p>
        </div>
      );
    }

    const [mobileProgressOpen, setMobileProgressOpen] = useState(false);

    const renderProgressionSteps = (isMobileView = false) => (
      <div className={isMobileView ? "space-y-1" : "space-y-1.5"}>
        {pages.map((p, i) => {
          const unlocked = isPageUnlocked(i);
          const isCurrent = i === currentPage;
          const isCompleted = completedPages.has(i);
          const isQuizPage = p?.type === "exercice-single" && p.exercice.questions && p.exercice.questions.length > 0;
          const rawLabel = p?.type === "cours"
            ? `📖 ${p.cours.titre}`
            : p?.type === "exercice-single"
              ? isQuizPage ? `📝 Quiz — ${p.exercice.titre}` : `📝 ${p.exercice.titre}`
              : "📝 Exercices";
          const label = hierarchicalLabelsByPage[i]
            || (subjectInfo
              ? `${subjectInfo.subjectNum}.${i + 1} ${rawLabel}`
              : rawLabel);

          return (
            <div key={i} className="flex items-start gap-3">
              {/* Vertical line + dot */}
              <div className="flex flex-col items-center shrink-0">
                <button
                  onClick={() => { if (unlocked) { goToPage(i); if (isMobileView) setMobileProgressOpen(false); } }}
                  disabled={!unlocked}
                  className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                    isCurrent
                      ? "border-primary bg-primary text-primary-foreground scale-110 shadow-md shadow-primary/30"
                      : isCompleted
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : unlocked
                          ? "border-muted-foreground/30 bg-background hover:border-primary/50"
                          : "border-muted/50 bg-muted/30 cursor-not-allowed"
                  }`}
                >
                  {isCompleted && !isCurrent && (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  {isCurrent && (
                    <div className="w-2 h-2 rounded-full bg-current" />
                  )}
                  {!unlocked && !isCompleted && !isCurrent && (
                    <Lock className="w-3 h-3 text-muted-foreground/50" />
                  )}
                </button>
                {i < pages.length - 1 && (
                  <div className={`w-0.5 h-8 ${isCompleted ? "bg-emerald-400" : "bg-muted"}`} />
                )}
              </div>
              {/* Label + Badge */}
              <button
                onClick={() => { if (unlocked) { goToPage(i); if (isMobileView) setMobileProgressOpen(false); } }}
                disabled={!unlocked}
                className={`text-left text-sm leading-snug pt-1 transition-colors flex items-start gap-1.5 ${
                  isCurrent
                    ? "font-bold text-primary"
                    : isCompleted
                      ? "text-emerald-600 font-medium"
                      : unlocked
                        ? "text-muted-foreground hover:text-foreground"
                        : "text-muted-foreground/40 cursor-not-allowed"
                }`}
              >
                <span className="line-clamp-2 flex-1">{label}</span>
                {(() => {
                  // Extract part number from hierarchical label (e.g. "1.2 ..." → "Partie 2", "3 📖 Cours — ..." → "Partie 3")
                  const hLabel = hierarchicalLabelsByPage[i] || "";
                  const partMatch = hLabel.match(/^(\d+)\.(\d+)\s/) || hLabel.match(/^(\d+)\s/);
                  const partNum = partMatch ? (partMatch[2] || partMatch[1]) : null;
                  
                  return isQuizPage ? (
                    <span className="shrink-0 inline-flex flex-col items-center gap-0.5">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-700 border border-amber-300">Quiz</span>
                      {partNum && <span className="text-[9px] text-muted-foreground font-medium">Partie {partNum}</span>}
                    </span>
                  ) : p?.type === "cours" ? (
                    <span className="shrink-0 inline-flex flex-col items-center gap-0.5">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-sky-100 text-sky-700 border border-sky-300">Cours</span>
                      {partNum && <span className="text-[9px] text-muted-foreground font-medium">Partie {partNum}</span>}
                    </span>
                  ) : null;
                })()}
              </button>
            </div>
          );
        })}
      </div>
    );

    const renderProgressBar = () => {
      const coursPages = pages.map((p, i) => ({ p, i })).filter(({ p }) => p?.type === "cours");
      const quizPages = pages.map((p, i) => ({ p, i })).filter(({ p }) => p?.type === "exercice-single" && p.exercice?.questions?.length > 0);
      const coursCompleted = coursPages.filter(({ i }) => completedPages.has(i)).length;
      const quizCompleted = quizPages.filter(({ i }) => completedPages.has(i)).length;

      return (
        <div className="pt-4 mt-3 border-t space-y-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span className="font-medium">Avancement</span>
            <span className="font-bold text-primary text-base">{progressPercent}%</span>
          </div>
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {(coursPages.length > 0 || quizPages.length > 0) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
              {coursPages.length > 0 && (
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-sky-500" />
                  {coursCompleted}/{coursPages.length} cours
                </span>
              )}
              {quizPages.length > 0 && (
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
                  {quizCompleted}/{quizPages.length} quiz
                </span>
              )}
            </div>
          )}
        </div>
      );
    };

    return (
      <>
      <div className="flex gap-4 lg:gap-6 max-w-6xl mx-auto">
        {/* Vertical progress sidebar — desktop */}
        <div className="hidden md:block shrink-0 w-56 lg:w-72 sticky top-4 self-start max-h-[calc(100vh-2rem)] overflow-y-auto">
          <div className="rounded-xl border bg-card shadow-sm p-5 space-y-2">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4">Progression</h3>
            {renderProgressionSteps()}
            {renderProgressBar()}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-6">
        {/* Header */}
        <div className="space-y-3">
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-bold">{subjectInfo ? subjectInfo.parentTitle : moduleData.nom}</h2>
            <p className="text-muted-foreground text-sm">{moduleData.description}</p>
          </div>

          {/* Grilles d'évaluation pratique (tous les passages) */}
          {[6, 8].includes(Number(module.id)) && apprenantId && (
            <GrillesPratiqueApprenant
              apprenantId={apprenantId}
              apprenantNom={apprenantInfo?.nom || ""}
              apprenantPrenom={apprenantInfo?.prenom || ""}
              formation={Number(module.id) === 6 ? "taxi" : "vtc"}
              readOnly
            />
          )}



          {/* Print all revision sheets button for modules 70-73 */}
          {[70, 71, 72, 73].includes(module.id) && moduleData.cours && moduleData.cours.length > 0 && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-primary/30 text-primary hover:bg-primary/5"
                onClick={async () => {
                  const allFiles = moduleData.cours.flatMap(c => c.fichiers || []);
                  const printableFiles = allFiles.filter(f => 
                    f.nom.endsWith(".pdf") || f.url.endsWith(".pdf")
                  );
                  const docxFiles = allFiles.filter(f =>
                    f.nom.endsWith(".docx") || f.nom.endsWith(".doc") || f.url.endsWith(".docx") || f.url.endsWith(".doc")
                  );
                  // Open PDFs in new tabs for printing
                  const signedPrintableUrls = await Promise.all(printableFiles.map(f => toDisplayableCourseUrl(f.url)));
                  signedPrintableUrls.forEach(url => {
                    window.open(url, "_blank");
                  });
                  // Open DOCX files via Google Docs viewer print-friendly mode
                  const signedDocxUrls = await Promise.all(docxFiles.map(f => toDisplayableCourseUrl(f.url)));
                  signedDocxUrls.forEach(absoluteUrl => {
                    window.open(`https://docs.google.com/viewer?url=${encodeURIComponent(absoluteUrl)}&embedded=false`, "_blank");
                  });
                  if (printableFiles.length + docxFiles.length === 0) {
                    toast.info("Aucune fiche disponible à imprimer");
                  } else {
                    toast.success(`${printableFiles.length + docxFiles.length} fiche(s) ouvertes — utilisez Ctrl+P pour imprimer`);
                  }
                }}
              >
                <Printer className="w-4 h-4" />
                🖨️ Imprimer toutes les fiches révisions
              </Button>
            </div>
          )}

          {/* Mobile/tablet collapsible progression */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileProgressOpen(!mobileProgressOpen)}
              className="w-full flex items-center justify-between rounded-xl border bg-card shadow-sm px-4 py-3"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-bold text-sm">{progressPercent}%</span>
                  </div>
                  <div className="text-left">
                    <span className="text-sm font-semibold text-foreground">Progression</span>
                    <span className="text-xs text-muted-foreground block">
                      {currentPageData?.type === "cours" ? "📚 Cours" : "📝 Exercices"} — {currentPage + 1}/{totalPages}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2.5 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                {mobileProgressOpen ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
              </div>
            </button>
            {mobileProgressOpen && (
              <div className="mt-2 rounded-xl border bg-card shadow-sm p-4 animate-fade-in max-h-[60vh] overflow-y-auto">
                {renderProgressionSteps(true)}
                {renderProgressBar()}
              </div>
            )}
          </div>
        </div>

        {/* Lock message */}
        {!completedPages.has(currentPage) && currentPage < totalPages - 1 && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-sm">
            <span>🔒</span>
            <span>
              {isIntroModule && currentPageData?.type === "cours" && !currentPageData.cours.quiz?.length
                ? "Lisez le contenu puis cochez « J'ai lu et compris » pour continuer."
                : currentPageData?.type === "cours" && currentPageData.cours.quiz?.length
                  ? "Répondez au QCM ci-dessous pour débloquer les exercices et la partie suivante."
                  : "Parcourez toutes les slides jusqu'à la dernière pour débloquer les exercices et la partie suivante."}
            </span>
          </div>
        )}

        {/* Current page content */}
        <div className="animate-fade-in">
          {currentPageData?.type === "cours" && renderCoursPage(currentPageData.cours)}
          {currentPageData?.type === "exercice-single" && renderSingleExercicePage(currentPageData.exercice)}
        </div>

        {/* Quiz completion rate */}
        {(() => {
          const totalQ = activeExercices.reduce((s, e) => s + (e.questions?.length || 0), 0);
          const answeredQ = activeExercices.reduce((s, e) => {
            if (!e.questions) return s;
            return s + e.questions.filter(q => selectedAnswers[`${e.id}-${q.id}`]).length;
          }, 0);
          if (totalQ === 0) return null;
          const pctAnswered = Math.round((answeredQ / totalQ) * 100);
          const remaining = totalQ - answeredQ;
          return (
            <div className="flex items-center gap-3 px-4 py-2 rounded-lg border bg-muted/30 text-sm">
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span className="font-medium">📝 Réponses : {answeredQ} / {totalQ}</span>
                  <span className="text-muted-foreground">{pctAnswered}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary/60 transition-all duration-500"
                    style={{ width: `${pctAnswered}%` }}
                  />
                </div>
              </div>
              {remaining > 0 && (
                <span className="text-xs text-muted-foreground shrink-0">
                  {remaining} restante{remaining > 1 ? "s" : ""}
                </span>
              )}
              {remaining === 0 && (
                <span className="text-xs text-emerald-600 font-semibold shrink-0">✅ Complet</span>
              )}
            </div>
          );
        })()}

        {/* Navigation buttons */}
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 0}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Précédent
          </Button>
          <span className="text-sm text-muted-foreground font-medium">
            {currentPage + 1} / {totalPages}
          </span>
          {currentPage < totalPages - 1 ? (() => {
            // Check if current page has an unvalidated quiz → block navigation
            const pageData = pages[currentPage];
            let hasUnvalidatedQuiz = false;
            if (pageData?.type === "cours" && pageData.cours.quiz && pageData.cours.quiz.length > 0) {
              hasUnvalidatedQuiz = !inlineQuizValidated.has(pageData.cours.id);
            }
            if (pageData?.type === "exercice-single") {
              hasUnvalidatedQuiz = !showResultsFor.has(pageData.exercice.id);
            }
            return (
            <Button
              onClick={() => {
                goToPage(currentPage + 1);
              }}
              disabled={hasUnvalidatedQuiz}
              className="gap-2"
              title={hasUnvalidatedQuiz ? "Validez le quiz avant de continuer" : ""}
            >
              {hasUnvalidatedQuiz && <span>🔒</span>}
              Suivant <ArrowDown className="w-4 h-4 -rotate-90" />
            </Button>
            );
          })() : (
            <Button variant="secondary" className="gap-2" disabled={savingCompletion} onClick={async () => {
              const ok = await persistModuleCompletion();
              if (!ok) return; // on reste sur la page tant que le serveur n'a pas confirmé
              onBack();
              toast.success("🎉 Module terminé !");
            }}>
              <CheckCircle2 className="w-4 h-4" />
              {savingCompletion ? "Enregistrement…" : "Terminé"}
            </Button>

          )}
        </div>
        </div>
      </div>
      {showCalculator && <Calculatrice onClose={() => setShowCalculator(false)} />}
    </>
    );
    };

    return LearnerPreviewComponent;
    // NB : `moduleData` volontairement omis — voir commentaire au-dessus
    // de la définition de LearnerPreview. Il est lu via `moduleDataRef.current`
    // pour éviter tout démontage/remontage lors des refresh en arrière-plan
    // (polling ~5s, Realtime, réconciliation Bilans), ce qui décochait les
    // réponses de l'apprenant et provoquait un scroll vers le haut.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apprenantId, apprenantInfo, apprenantType, hideFormulaires, isPresentiel, module.id, onBack, onLearnerActivity, onModuleCompleted, onTrackCours, slidesByKey, studentOnly]);

  if (studentOnly) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="outline" size="icon" onClick={onBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h2 className="text-2xl font-bold">{(() => {
              const parentMap: Record<number, string> = {
                2: "2. COURS ET EXERCICES VTC", 25: "2. COURS ET EXERCICES VTC",
                14: "2. COURS ET EXERCICES VTC", 15: "2. COURS ET EXERCICES VTC",
                16: "2. COURS ET EXERCICES VTC", 17: "2. COURS ET EXERCICES VTC",
                18: "2. COURS ET EXERCICES VTC", 19: "2. COURS ET EXERCICES VTC",
                10: "2. COURS ET EXERCICES TAXI", 39: "2. COURS ET EXERCICES TAXI",
                20: "2. COURS ET EXERCICES TAXI", 21: "2. COURS ET EXERCICES TAXI",
                22: "2. COURS ET EXERCICES TAXI", 23: "2. COURS ET EXERCICES TAXI", 24: "2. COURS ET EXERCICES TAXI",
                40: "2. COURS ET EXERCICES TA", 42: "2. COURS ET EXERCICES TA",
                41: "2. COURS ET EXERCICES VA", 43: "2. COURS ET EXERCICES VA",
              };
              return parentMap[module.id] || moduleData.nom;
            })()}</h2>
          </div>
          {(apprenantInfo?.prenom || apprenantInfo?.nom) && (
            <div className="shrink-0 px-3 py-1.5 rounded-lg border-2 border-primary/30 bg-primary/5 text-primary text-sm font-semibold whitespace-nowrap">
              👤 {apprenantInfo?.prenom} {apprenantInfo?.nom}
            </div>
          )}
          {/* Sync silencieuse côté apprenant : aucun indicateur ni bouton visible.
              Le realtime + refetch initial assurent l'actualisation automatique. */}
        </div>
        <LearnerPreview secureMode />
      </div>
    );
  }

  // ===== Résultats élèves par module =====
  const ModuleResultsTab = ({ moduleId, moduleName }: { moduleId: number; moduleName: string }) => {
    const [expandedRow, setExpandedRow] = useState<string | null>(null);

    const { data: results, isLoading: loadingResults } = useQuery({
      queryKey: ['module-results', moduleId],
      queryFn: async () => {
        const { data: completions, error } = await supabase
          .from('apprenant_module_completion')
          .select('apprenant_id, score_obtenu, score_max, completed_at, details')
          .eq('module_id', moduleId)
          .eq('status', 'completed')
          .order('completed_at', { ascending: false });
        if (error) throw error;
        if (!completions?.length) return [];

        const ids = [...new Set(completions.map(c => c.apprenant_id))];
        const { data: apprenants } = await supabase
          .from('apprenants')
          .select('id, nom, prenom, type_apprenant, formation_choisie')
          .in('id', ids);

        const appMap = new Map((apprenants || []).map(a => [a.id, a]));

        const bestByApprenant = new Map<string, typeof completions[0]>();
        for (const c of completions) {
          const existing = bestByApprenant.get(c.apprenant_id);
          if (!existing || (c.score_obtenu || 0) > (existing.score_obtenu || 0)) {
            bestByApprenant.set(c.apprenant_id, c);
          }
        }

        return Array.from(bestByApprenant.values()).map(c => {
          const app = appMap.get(c.apprenant_id);
          const pct = c.score_max ? Math.round(((c.score_obtenu || 0) / c.score_max) * 100) : 0;
          return {
            ...c,
            nom: app ? `${app.prenom} ${app.nom}` : 'Inconnu',
            type: app?.type_apprenant || '',
            formation: app?.formation_choisie || '',
            pct,
          };
        }).sort((a, b) => b.pct - a.pct);
      },
    });

    if (loadingResults) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;

    if (!results?.length) return (
      <Card><CardContent className="py-12 text-center text-muted-foreground">
        Aucun résultat enregistré pour ce module.
      </CardContent></Card>
    );

    const avgScore = Math.round(results.reduce((s, r) => s + r.pct, 0) / results.length);

    return (
      <div className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card><CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold">{results.length}</p>
            <p className="text-sm text-muted-foreground">Élèves</p>
          </CardContent></Card>
          <Card><CardContent className="pt-6 text-center">
            <p className={`text-3xl font-bold ${avgScore >= 60 ? 'text-emerald-600' : 'text-destructive'}`}>{avgScore}%</p>
            <p className="text-sm text-muted-foreground">Moyenne</p>
          </CardContent></Card>
          <Card><CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-emerald-600">{results.filter(r => r.pct >= 60).length}</p>
            <p className="text-sm text-muted-foreground">Réussi (≥60%)</p>
          </CardContent></Card>
        </div>

        {/* Module number */}
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm px-3 py-1">Module n°{moduleId}</Badge>
          <span className="text-sm font-medium text-muted-foreground">{moduleName}</span>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Élève</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead className="w-[200px]">Progression</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r, i) => {
                  const details = Array.isArray(r.details) ? r.details as Array<{
                    questionId: number;
                    enonce: string;
                    reponseEleve: string | null;
                    reponseCorrecte: string | null;
                    correct: boolean;
                    exerciceTitre?: string;
                  }> : [];
                  const isExpanded = expandedRow === r.apprenant_id;
                  const hasDetails = details.length > 0;

                  return (
                    <>
                      <TableRow
                        key={i}
                        className={hasDetails ? 'cursor-pointer' : ''}
                        onClick={() => hasDetails && setExpandedRow(isExpanded ? null : r.apprenant_id)}
                      >
                        <TableCell className="w-8 px-2">
                          {hasDetails && (
                            isExpanded
                              ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                              : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{r.nom}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{r?.type?.toUpperCase() || '-'}</Badge>
                        </TableCell>
                        <TableCell className="font-mono">{r.score_obtenu}/{r.score_max}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={r.pct} className="h-2 flex-1" />
                            <span className={`text-xs font-bold min-w-[3ch] ${r.pct >= 80 ? 'text-emerald-600' : r.pct >= 60 ? 'text-amber-500' : 'text-destructive'}`}>
                              {r.pct}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(r.completed_at).toLocaleDateString('fr-FR')}
                        </TableCell>
                      </TableRow>
                      {isExpanded && details.length > 0 && (
                        <TableRow key={`${i}-details`}>
                          <TableCell colSpan={6} className="p-0">
                            <div className="bg-muted/30 px-6 py-4 space-y-1">
                              <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                                Détail des {details.length} questions
                              </p>
                              <div className="grid gap-1.5">
                                {details.map((q, qi) => (
                                  <div
                                    key={qi}
                                    className={`flex items-start gap-3 rounded-lg px-3 py-2 text-sm ${
                                      q.correct
                                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800'
                                        : 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800'
                                    }`}
                                  >
                                    <span className={`shrink-0 font-bold text-xs mt-0.5 rounded-full w-6 h-6 flex items-center justify-center ${
                                      q.correct
                                        ? 'bg-emerald-500 text-white'
                                        : 'bg-red-500 text-white'
                                    }`}>
                                      {q.questionId}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-sm ${q.correct ? 'text-emerald-800 dark:text-emerald-300' : 'text-red-800 dark:text-red-300'}`}>
                                        <RichText value={q.enonce} />
                                      </p>
                                      {!q.correct && q.reponseCorrecte && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                          Réponse : <span className="font-semibold text-emerald-600">{q.reponseCorrecte}</span>
                                          {q.reponseEleve && <> — Élève : <span className="font-semibold text-red-500">{q.reponseEleve}</span></>}
                                        </p>
                                      )}
                                    </div>
                                    <span className="shrink-0">
                                      {q.correct ? '✅' : '❌'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {studentOnly && maintenanceActive && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-3 rounded-lg border border-amber-400 bg-amber-50 px-4 py-3 text-amber-900 shadow-sm"
        >
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-500" />
          <div className="text-sm font-medium">
            Opération de maintenance en cours — le formateur met à jour ce module. Vos réponses sont conservées, la page se rafraîchira automatiquement.
          </div>
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-2xl font-bold">Détail du module</h2>
        </div>
        <div className="flex items-center gap-2">
          {[4, 9, 81, 82].includes(Number(module.id)) && (
            <Button
              variant="default"
              size="sm"
              className="gap-2"
              onClick={async () => {
                const parentId = [4, 81].includes(Number(module.id)) ? 4 : 9;
                const siblingId = parentId === 4 ? 9 : 4;
                const SHARED = new Set([100, 101, 102, 103, 105]);
                const t = toast.loading("Resynchronisation en cours…");
                try {
                  const { data: parentRow, error: parentErr } = await supabase
                    .from("module_editor_state")
                    .select("module_data, deleted_cours, deleted_exercices, source_fingerprint")
                    .eq("module_id", parentId)
                    .maybeSingle();
                  if (parentErr) throw parentErr;
                  const parentData: any = parentRow?.module_data ?? { exercices: [] };
                  const parentExos: any[] = Array.isArray(parentData.exercices) ? parentData.exercices : [];
                  const sharedFromParent = parentExos
                    .filter((e) => SHARED.has(Number(e?.id)))
                    .map((e) => JSON.parse(JSON.stringify(e)));

                  // Miroir vers l'autre parent (4↔9)
                  if (sharedFromParent.length > 0) {
                    const { data: sibRow } = await supabase
                      .from("module_editor_state")
                      .select("module_data, deleted_cours, deleted_exercices, source_fingerprint, updated_at")
                      .eq("module_id", siblingId)
                      .maybeSingle();
                    const sibData: any = sibRow?.module_data ?? { exercices: [] };
                    const sibExos: any[] = Array.isArray(sibData.exercices) ? sibData.exercices : [];
                    const kept = sibExos.filter((e) => !SHARED.has(Number(e?.id)));
                    const nextData = { ...sibData, exercices: [...sharedFromParent, ...kept] };
                    await saveModuleEditorStateWithCas({
                      moduleId: siblingId,
                      moduleData: nextData,
                      deletedCours: sibRow?.deleted_cours ?? [],
                      deletedExercices: sibRow?.deleted_exercices ?? [],
                      sourceFingerprint: sibRow?.source_fingerprint ?? null,
                      expectedUpdatedAt: sibRow?.updated_at ?? null,
                    });
                  }

                  // Broadcast vers TOUS les modules concernés (parents + FC)
                  const at = new Date().toISOString();
                  for (const mid of [4, 9, 81, 82]) {
                    try {
                      const ch = supabase.channel(`module-editor-live-${mid}`);
                      await new Promise<void>((resolve) => {
                        const to = setTimeout(resolve, 350);
                        ch.subscribe((s) => { if (s === "SUBSCRIBED") { clearTimeout(to); resolve(); } });
                      });
                      await ch.send({
                        type: "broadcast",
                        event: "module-updated",
                        payload: { moduleId: mid, at, resyncFrom: parentId },
                      });
                      await supabase.removeChannel(ch);
                    } catch {}
                  }
                  toast.success("✅ Réponses FC resynchronisées côté apprenant", { id: t });
                } catch (e: any) {
                  console.error("[Resync Bilan] échec:", e);
                  toast.error(`Échec resynchronisation : ${e?.message ?? "erreur"}`, { id: t });
                }
              }}
            >
              <RefreshCw className="w-4 h-4" />
              Resynchroniser maintenant
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              const isFs = document.body.classList.toggle("app-fullscreen");
              if (!isFs) document.body.classList.remove("app-fullscreen");
            }}
          >
            <Maximize className="w-4 h-4" />
            Plein écran
          </Button>
        </div>
      </div>

      <Tabs defaultValue="edition" className="w-full">
         <TabsList className="mb-4">
          <TabsTrigger value="edition" className="gap-2"><Settings className="w-4 h-4" /> Édition</TabsTrigger>
          <TabsTrigger value="corbeille" className="gap-2"><Trash2 className="w-4 h-4" /> Corbeille {(deletedCours.length + deletedExercices.length) > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{deletedCours.length + deletedExercices.length}</Badge>}</TabsTrigger>
          <TabsTrigger value="apercu" className="gap-2"><Eye className="w-4 h-4" /> Aperçu apprenant</TabsTrigger>
          <TabsTrigger value="resultats" className="gap-2"><Users className="w-4 h-4" /> Résultats élèves</TabsTrigger>
        </TabsList>

        <TabsContent value="edition" className="space-y-6">
          {/* Description */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-bold text-lg mb-1">{moduleData.nom}</h3>
              <p className="text-sm text-muted-foreground">{moduleData.description}</p>
            </CardContent>
          </Card>

          {/* Cours */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold flex items-center gap-2">📚 Cours ({moduleData.cours.length})</h3>
              <Button size="sm" className="gap-1" onClick={() => addItem("cours")}>
                <Plus className="w-4 h-4" /> Ajouter un cours
              </Button>
            </div>
            {moduleData.cours.map((cours, index) =>
              editingCoursId === cours.id ? (
                <CoursEditor
                  key={cours.id}
                  item={cours}
                  onSave={(updated) => {
                    markAdminLocalEdit();
                    setModuleData((prev) => ({
                      ...prev,
                      cours: prev.cours.map(c => c.id === updated.id ? updated : c),
                    }));
                    setEditingCoursId(null);
                  }}
                  onPersist={(updated) => {
                    markAdminLocalEdit();
                    flushImmediateRef.current = true;
                    setModuleData((prev) => ({
                      ...prev,
                      cours: prev.cours.map(c => c.id === updated.id ? { ...c, images: updated.images, image: updated.image, fichiers: updated.fichiers } : c),
                    }));
                  }}
                  onCancel={() => setEditingCoursId(null)}
                />
              ) : (
                <ContentCard
                  key={cours.id}
                  item={cours}
                  index={index}
                  total={moduleData.cours.length}
                  onMove={(i, d) => moveItem("cours", i, d)}
                  onDelete={(id) => deleteItem("cours", id)}
                  onToggle={(id) => toggleItem("cours", id)}
                  onEdit={(id) => setEditingCoursId(id)}
                  borderColor="border-primary/30"
                  onFileUploaded={(itemId, fichier) => handleFileUploaded("cours", itemId, fichier)}
                  onFileDeleted={(itemId, fichierIndex, url) => handleFileDeleted("cours", itemId, fichierIndex, url)}
                />
              )
            )}
          </div>

          {/* Exercices */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold flex items-center gap-2">📝 Exercices ({moduleData.exercices.length})</h3>
              <Button size="sm" className="gap-1" onClick={() => addItem("exercices")}>
                <Plus className="w-4 h-4" /> Ajouter un exercice
              </Button>
            </div>
            {moduleData.exercices.map((exo, index) => (
              <ExerciceCard
                key={exo.id}
                item={exo as ExerciceItem}
                index={index}
                total={moduleData.exercices.length}
                onMove={(i, d) => moveItem("exercices", i, d)}
                onDelete={(id) => deleteItem("exercices", id)}
                onToggle={(id) => toggleItem("exercices", id)}
                onUpdateQuestions={(id, questions) => updateExerciceQuestions(id, questions)}
                moduleId={moduleData.id}
                overrideWarnings={trainerOverrideWarnings}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="corbeille" className="space-y-6">
          {deletedCours.length === 0 && deletedExercices.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Trash2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">La corbeille est vide</p>
                <p className="text-sm mt-1">Les cours et exercices supprimés apparaîtront ici pour être restaurés.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {deletedCours.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-bold flex items-center gap-2">📚 Cours supprimés ({deletedCours.length})</h3>
                  {deletedCours.map((cours) => (
                    <Card key={cours.id} className="border-dashed border-destructive/30">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-muted-foreground line-through">{cours.titre}</p>
                          {cours.sousTitre && <p className="text-xs text-muted-foreground">{cours.sousTitre}</p>}
                        </div>
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => restoreItem("cours", cours.id)}>
                          <RotateCcw className="w-3 h-3" /> Restaurer
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              {deletedExercices.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-bold flex items-center gap-2">📝 Exercices supprimés ({deletedExercices.length})</h3>
                  {deletedExercices.map((exo) => (
                    <Card key={exo.id} className="border-dashed border-destructive/30">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-muted-foreground line-through">{exo.titre}</p>
                          {exo.sousTitre && <p className="text-xs text-muted-foreground">{exo.sousTitre}</p>}
                        </div>
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => restoreItem("exercices", exo.id)}>
                          <RotateCcw className="w-3 h-3" /> Restaurer
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="apercu">
          <LearnerPreview secureMode />
        </TabsContent>
        <TabsContent value="resultats">
          <ModuleResultsTab moduleId={module.id} moduleName={module.nom} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ModuleDetailView;