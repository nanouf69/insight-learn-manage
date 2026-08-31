import { useState, useEffect, useCallback, memo, useRef, useMemo } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogOut, Target, RotateCcw, ChevronRight, KeyRound, Loader2, AlertTriangle, BookOpen, GraduationCap, TrendingUp, Clock, ArrowRight, Sparkles, CheckCircle2, Lock, Chrome, Smartphone, Tablet, Monitor } from "lucide-react";
import { WelcomeBanner } from "@/components/cours-en-ligne/motivation/WelcomeBanner";
import { XPBar } from "@/components/cours-en-ligne/motivation/XPBar";
import { BadgeGrid } from "@/components/cours-en-ligne/motivation/BadgeGrid";
import { buildBadges, calculateXP } from "@/components/cours-en-ligne/motivation/badges-data";
import { toast } from "sonner";
import ModuleDetailView from "@/components/cours-en-ligne/ModuleDetailView";
import ModuleChangeNotificationsBanner from "@/components/cours-en-ligne/ModuleChangeNotificationsBanner";
import BilanFinFormationFCVtc from "@/components/cours-en-ligne/BilanFinFormationFCVtc";
import ExamensBlancsPage from "@/components/cours-en-ligne/ExamensBlancsPage";
import NotesView from "@/components/cours-en-ligne/NotesView";
import StudentHoursTracker from "@/components/cours-en-ligne/StudentHoursTracker";
import StudentLogin from "@/components/cours-en-ligne/StudentLogin";
import { FORMATIONS, MODULES_DATA, expandModulesAutorises, type FormationId } from "@/components/cours-en-ligne/formations-data";
import { EXAMENS_BLANCS_VTC, EXAMENS_BLANCS_TAXI, EXAMENS_BLANCS_TA, EXAMENS_BLANCS_VA } from "@/components/cours-en-ligne/examens-blancs-data";
import { supabase } from "@/integrations/supabase/client";
import { safeDateParse } from "@/lib/safeDateParse";
import { useConnexionTracking } from "@/hooks/useConnexionTracking";
import { usePresenceCheck } from "@/hooks/usePresenceCheck";
import { useInactivityAlert } from "@/hooks/useInactivityAlert";
import { useSessionKeepAlive } from "@/hooks/useSessionKeepAlive";
import { PresenceCheckModal } from "@/components/cours-en-ligne/PresenceCheckModal";
import { IdentityConfirmModal } from "@/components/cours-en-ligne/IdentityConfirmModal";
import { ApprenantChatWidget } from "@/components/chat/ApprenantChatWidget";
import { EmargementFCModal, isFormationContinue } from "@/components/cours-en-ligne/EmargementFCModal";
import { isPresentielType, getExpectedEmargements, type CreneauKey } from "@/lib/agendaSlots";
import { getExpectedPratiqueEmargements } from "@/lib/pratiqueEmargements";
import { useAuth } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { computeUnlockState, isModuleLocked as computeIsModuleLocked } from "@/lib/moduleUnlockLogic";
import {
  fetchModuleCompletions,
  repairInconsistentCompletions,
  isCompletionDone,
} from "@/lib/moduleCompletion";


const StableModuleDetailView = memo(ModuleDetailView);

// Map CRM values to formation IDs (supports lowercase, aliases and multi-selection values like "x + y")
const FORMATION_ALIASES: Record<string, FormationId> = {
  "vtc": "vtc",
  "vtc-exam": "vtc",
  "vtc-e-presentiel": "vtc",
  "vtc-e": "vtc-elearning",
  "vtc-elearning": "vtc-elearning",
  "vtc-elearning-1099": "vtc-elearning",
  "taxi": "taxi",
  "taxi-exam": "taxi",
  "taxi-e-presentiel": "taxi",
  "taxi-e": "taxi-elearning",
  "taxi-elearning": "taxi-elearning",
  "ta": "taxi-pour-vtc",
  "ta-e-presentiel": "taxi-pour-vtc",
  "ta-e": "taxi-pour-vtc-elearning",
  "passerelle-taxi": "taxi-pour-vtc",
  "passerelle-taxi-elearning": "taxi-pour-vtc-elearning",
  "va": "vtc-pour-taxi",
  "va-e-presentiel": "vtc-pour-taxi",
  "va-e": "vtc-pour-taxi",
  "passerelle-vtc": "vtc-pour-taxi",
  "passerelle-vtc-elearning": "vtc-pour-taxi",
  "vtc-s": "vtc-cours-du-soir",
  "vtc-cours-du-soir": "vtc-cours-du-soir",
  "continue-vtc": "continue-vtc",
  "pa-vtc": "continue-vtc",
  "formation-continue-vtc": "continue-vtc",
  "continue-taxi": "continue-taxi",
  "pa-taxi": "continue-taxi",
  "formation-continue-taxi": "continue-taxi",
};

const normalizeFormationKey = (value: string | null | undefined): string =>
  (value || "").split(" + ")[0].trim().toLowerCase().replace(/\s+/g, "-");

const inferFormationFromModules = (modulesAutorises: number[] | null | undefined): FormationId | null => {
  if (!modulesAutorises || modulesAutorises.length === 0) return null;

  const expanded = new Set(expandModulesAutorises(modulesAutorises) || modulesAutorises);
  let best: { id: FormationId; score: number } | null = null;

  for (const formation of FORMATIONS) {
    const formationModuleIds = MODULES_DATA
      .filter((module) => module.formations.includes(formation.id))
      .map((module) => module.id);

    const score = formationModuleIds.reduce((acc, moduleId) => acc + (expanded.has(moduleId) ? 1 : 0), 0);

    if (!best || score > best.score) {
      best = { id: formation.id, score };
    }
  }

  return best && best.score > 0 ? best.id : null;
};

const resolveFormationId = (
  typeApprenant: string | null | undefined,
  formationChoisie: string | null | undefined,
  modulesAutorises: number[] | null | undefined,
): FormationId | null => {
  // Priority: explicit assigned modules (source of truth for learner access)
  const byModules = inferFormationFromModules(modulesAutorises);
  if (byModules) return byModules;

  const byType = FORMATION_ALIASES[normalizeFormationKey(typeApprenant)];
  if (byType) return byType;

  const byFormation = FORMATION_ALIASES[normalizeFormationKey(formationChoisie)];
  if (byFormation) return byFormation;

  return null;
};

const getConnectedDeviceDetails = (userAgent: string | null | undefined) => {
  const ua = userAgent || "";
  const isIPad = /iPad/.test(ua) || (/Macintosh/.test(ua) && /Mobile\//.test(ua));
  const isTablet = isIPad || /Tablet|SM-T|Lenovo TB|Nexus 7|Nexus 9|Android(?!.*Mobile)/i.test(ua);
  const isPhone = !isTablet && /iPhone|Android.*Mobile|Mobile/i.test(ua);

  const os = /iPhone|iPad/.test(ua) || isIPad
    ? "iOS"
    : /Android/.test(ua)
      ? "Android"
      : /Mac OS X|Macintosh/.test(ua)
        ? "Mac"
        : /Windows/.test(ua)
          ? "Windows"
          : /Linux/.test(ua)
            ? "Linux"
            : "inconnu";

  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua) && !/Edg\//.test(ua)
      ? "Chrome"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Safari\//.test(ua)
          ? "Safari"
          : "navigateur";

  if (isTablet) return { type: "tablette", label: `Tablette ${os}`, browser, Icon: Tablet };
  if (isPhone) return { type: "téléphone", label: `Téléphone ${os}`, browser, Icon: Smartphone };
  return { type: "ordinateur", label: `Ordinateur ${os}`, browser, Icon: Monitor };
};

// ===== LABELS & ORDER synchronized with modules-config.ts =====
const FORMATION_DISPLAY_LABELS: Partial<Record<FormationId, Record<number, string>>> = {
  "vtc": {
    1: "1.INTRODUCTION PRÉSENTIEL",
    2: "2.COURS ET EXERCICES VTC",
    25: "2.COURS ET EXERCICES VTC",
    14: "2.COURS ET EXERCICES VTC",
    15: "2.COURS ET EXERCICES VTC",
    16: "2.COURS ET EXERCICES VTC",
    17: "2.COURS ET EXERCICES VTC",
    18: "2.COURS ET EXERCICES VTC",
    19: "2.COURS ET EXERCICES VTC",
    3: "3.FORMULES",
    4: "4.BILAN EXERCICES VTC",
    35: "5.EXAMENS BLANCS VTC",
    5: "6.BILAN EXAMEN VTC",
    60: "7.SOURCES JURIDIQUES VTC",
    70: "8.FICHES RÉVISIONS VTC",
    8: "9.PRATIQUE VTC",
    83: "10.FEUILLES D'ÉMARGEMENT SIGNÉES VTC",
    50: "11.FIN DE FORMATION VTC",
  },
  "vtc-cours-du-soir": {
    1: "1.INTRODUCTION PRÉSENTIEL",
    2: "2.COURS ET EXERCICES VTC",
    25: "2.COURS ET EXERCICES VTC",
    14: "2.COURS ET EXERCICES VTC",
    15: "2.COURS ET EXERCICES VTC",
    16: "2.COURS ET EXERCICES VTC",
    17: "2.COURS ET EXERCICES VTC",
    18: "2.COURS ET EXERCICES VTC",
    19: "2.COURS ET EXERCICES VTC",
    3: "3.FORMULES",
    4: "4.BILAN EXERCICES VTC",
    35: "5.EXAMENS BLANCS VTC",
    5: "6.BILAN EXAMEN VTC",
    60: "7.SOURCES JURIDIQUES VTC",
    70: "8.FICHES RÉVISIONS VTC",
    8: "9.PRATIQUE VTC",
    83: "10.FEUILLES D'ÉMARGEMENT SIGNÉES VTC",
    50: "11.FIN DE FORMATION VTC",
  },
  "vtc-elearning": {
    26: "1.INTRODUCTION E-LEARNING",
    2: "2.COURS ET EXERCICES VTC",
    25: "2.COURS ET EXERCICES VTC",
    14: "2.COURS ET EXERCICES VTC",
    15: "2.COURS ET EXERCICES VTC",
    16: "2.COURS ET EXERCICES VTC",
    17: "2.COURS ET EXERCICES VTC",
    18: "2.COURS ET EXERCICES VTC",
    19: "2.COURS ET EXERCICES VTC",
    3: "3.FORMULES",
    4: "4.BILAN EXERCICES VTC",
    35: "5.EXAMENS BLANCS VTC",
    5: "6.BILAN EXAMEN VTC",
    60: "7.SOURCES JURIDIQUES VTC",
    70: "8.FICHES RÉVISIONS VTC",
    8: "9.PRATIQUE VTC",
    50: "10.FIN DE FORMATION VTC",
  },
  "taxi": {
    1: "1.INTRODUCTION PRÉSENTIEL",
    10: "2.COURS ET EXERCICES TAXI",
    39: "2.COURS ET EXERCICES TAXI",
    20: "2.COURS ET EXERCICES TAXI",
    21: "2.COURS ET EXERCICES TAXI",
    22: "2.COURS ET EXERCICES TAXI",
    23: "2.COURS ET EXERCICES TAXI",
    24: "2.COURS ET EXERCICES TAXI",
    7: "3.CONNAISSANCES DE LA VILLE TAXI",
    64: "4.ÉQUIPEMENTS TAXI",
    12: "5.CAS PRATIQUE TAXI",
    3: "🔓 FORMULES (libre accès)",
    9: "6.BILAN EXERCICES TAXI",
    13: "7.CONTRÔLE DE CONNAISSANCES TAXI",
    11: "8.BILAN EXAMEN TAXI",
    36: "9.EXAMENS BLANCS TAXI",
    61: "10.SOURCES JURIDIQUES TAXI",
    71: "11.FICHES RÉVISIONS TAXI",
    6: "12.PRATIQUE TAXI",
    84: "13.FEUILLES D'ÉMARGEMENT SIGNÉES TAXI",
    51: "14.FIN DE FORMATION TAXI",
  },
  "taxi-elearning": {
    26: "1.INTRODUCTION E-LEARNING",
    10: "2.COURS ET EXERCICES TAXI",
    39: "2.COURS ET EXERCICES TAXI",
    20: "2.COURS ET EXERCICES TAXI",
    21: "2.COURS ET EXERCICES TAXI",
    22: "2.COURS ET EXERCICES TAXI",
    23: "2.COURS ET EXERCICES TAXI",
    24: "2.COURS ET EXERCICES TAXI",
    7: "3.CONNAISSANCES DE LA VILLE TAXI",
    64: "4.ÉQUIPEMENTS TAXI",
    12: "5.CAS PRATIQUE TAXI",
    3: "6.FORMULES",
    9: "7.BILAN EXERCICES TAXI",
    13: "8.CONTRÔLE DE CONNAISSANCES TAXI",
    11: "9.BILAN EXAMEN TAXI",
    36: "10.EXAMENS BLANCS TAXI",
    61: "11.SOURCES JURIDIQUES TAXI",
    71: "12.FICHES RÉVISIONS TAXI",
    6: "13.PRATIQUE TAXI",
    51: "14.FIN DE FORMATION TAXI",
  },
  "taxi-pour-vtc": {
    31: "1.INTRODUCTION TA",
    40: "2.COURS ET EXERCICES TA",
    7: "3.CONNAISSANCES DE LA VILLE TAXI",
    64: "4.ÉQUIPEMENTS TAXI",
    12: "5.CAS PRATIQUE TAXI",
    3: "🔓 FORMULES (libre accès)",
    27: "6.BILAN EXERCICES TA",
    13: "7.CONTRÔLE DE CONNAISSANCES TAXI",
    28: "8.BILAN EXAMEN TA",
    37: "9.EXAMENS BLANCS TA",
    62: "10.SOURCES JURIDIQUES TA",
    72: "11.FICHES RÉVISIONS TA",
    6: "12.PRATIQUE TAXI",
    84: "13.FEUILLES D'ÉMARGEMENT SIGNÉES TAXI",
    52: "14.FIN DE FORMATION TA",
  },
  "taxi-pour-vtc-elearning": {
    32: "1.INTRODUCTION TA E-LEARNING",
    40: "2.COURS ET EXERCICES TA",
    7: "3.CONNAISSANCES DE LA VILLE TAXI",
    64: "4.ÉQUIPEMENTS TAXI",
    12: "5.CAS PRATIQUE TAXI",
    3: "6.FORMULES",
    27: "7.BILAN EXERCICES TA",
    13: "8.CONTRÔLE DE CONNAISSANCES TAXI",
    28: "9.BILAN EXAMEN TA",
    37: "10.EXAMENS BLANCS TA",
    62: "11.SOURCES JURIDIQUES TA",
    72: "12.FICHES RÉVISIONS TA",
    6: "13.PRATIQUE TAXI",
    52: "14.FIN DE FORMATION TA",
  },
  "vtc-pour-taxi": {
    33: "1.INTRODUCTION VA",
    34: "1.INTRODUCTION VA E-LEARNING",
    41: "2.COURS ET EXERCICES VA",
    3: "3.FORMULES",
    29: "4.BILAN EXERCICES VA",
    30: "5.BILAN EXAMEN VA",
    38: "6.EXAMENS BLANCS VA",
    63: "7.SOURCES JURIDIQUES VA",
    73: "8.FICHES RÉVISIONS VA",
    8: "9.PRATIQUE VTC",
    83: "10.FEUILLES D'ÉMARGEMENT SIGNÉES VTC",
    53: "11.FIN DE FORMATION VA",
  },
  "continue-vtc": {
    81: "1.BILAN EXERCICES FORMATION CONTINUE VTC",
    5: "2.BILAN EXAMEN VTC",
    87: "3.📋 BILAN FIN DE FORMATION CONTINUE VTC",
    83: "4.DOCUMENTS ADMINISTRATIFS VTC",
    85: "5.INFORMATIONS FINANCEUR VTC",
    88: "6.🪪 DEMANDE DE CARTE PROFESSIONNELLE VTC",
  },
  "continue-taxi": {
    82: "1.BILAN EXERCICES FORMATION CONTINUE TAXI",
    11: "2.BILAN EXAMEN TAXI",
    92: "3.COURS FC TAXI (PDF)",
    84: "4.DOCUMENTS ADMINISTRATIFS (ÉMARGEMENTS SIGNÉS)",
    86: "5.INFORMATIONS FINANCEUR TAXI",
    93: "6.🪪 DEMANDE DE CARTE PROFESSIONNELLE TAXI",
    94: "7.💶 REMBOURSEMENT FORMATION CONTINUE TAXI",
    95: "8.📝 QCM 100 QUESTIONS FC TAXI",
    96: "9.🗺️ QUIZZ VILLE DE LYON",
    51: "10.📋 FIN DE FORMATION TAXI",
  },

  "mobilite-taxi": {
    90: "1.COURS MOBILITÉ TAXI",
    84: "2.FEUILLES D'ÉMARGEMENT SIGNÉES TAXI",
    86: "3.INFORMATIONS FINANCEUR TAXI",
  },
};

const FORMATION_DEFAULT_MODULES: Record<FormationId, number[]> = {
  "vtc": [1, 2, 3, 4, 35, 5, 60, 70, 8, 83, 50],
  "vtc-cours-du-soir": [1, 2, 3, 4, 35, 5, 60, 70, 8, 83, 50],
  "vtc-elearning": [26, 2, 3, 4, 35, 5, 60, 70, 8, 50],
  "taxi": [1, 10, 7, 64, 12, 3, 9, 13, 11, 36, 61, 71, 6, 84, 51],
  "taxi-elearning": [26, 10, 7, 64, 12, 3, 9, 13, 11, 36, 61, 71, 6, 51],
  "taxi-pour-vtc": [31, 40, 7, 64, 12, 3, 27, 13, 28, 37, 62, 72, 6, 84, 52],
  "taxi-pour-vtc-elearning": [32, 40, 7, 64, 12, 3, 27, 13, 28, 37, 62, 72, 6, 52],
  "vtc-pour-taxi": [33, 41, 3, 29, 30, 38, 63, 73, 8, 83, 53],
  "continue-vtc": [81, 5, 87, 83, 85, 88, 89],
  "continue-taxi": [82, 11, 92, 84, 86, 93, 94, 95, 96, 51],
  "mobilite-taxi": [90, 84, 86],
};

const MANAGED_MODULE_IDS = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 50, 51, 52, 53, 60, 61, 62, 63, 64, 70, 71, 72, 73, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 92, 93, 94, 95, 96]);
const DASHBOARD_PARENT_MODULE_IDS: Partial<Record<number, number>> = {
  25: 2,
  14: 2,
  15: 2,
  16: 2,
  17: 2,
  18: 2,
  19: 2,
  39: 10,
  20: 10,
  21: 10,
  22: 10,
  23: 10,
  24: 10,
};

const normalizeModuleIdForDashboard = (moduleId: number) => DASHBOARD_PARENT_MODULE_IDS[moduleId] ?? moduleId;

// Reverse map: parent module → list of child module IDs
const PARENT_TO_CHILDREN: Record<number, number[]> = {};
for (const [child, parent] of Object.entries(DASHBOARD_PARENT_MODULE_IDS)) {
  if (!PARENT_TO_CHILDREN[parent]) PARENT_TO_CHILDREN[parent] = [];
  PARENT_TO_CHILDREN[parent].push(Number(child));
}

/**
 * Compute the set of truly fully-completed module IDs.
 * For parent modules (2, 10): ALL child sub-modules must have at least one fully-done row.
 * For simple modules: at least one fully-done row suffices.
 * For intro modules (1, 26, 31, 32, 33, 34): require explicit score OR fully completed details.
 */
const computeFullyCompletedModuleIds = (completionRows: any[]): Set<number> => {
  // NOTE: on ne re-vérifie plus la présence d'un score/détails pour les modules
  // Introduction : toute ligne `apprenant_module_completion` existante = module terminé.
  // (Éviter de "perdre" une complétion historique qui redemanderait à l'apprenant de refaire le module.)

  // Group done rows by their RAW module_id
  const doneRawIds = new Set(
    completionRows
      .filter(isModuleCompletionFullyDone)
      .map((d) => Number(d.module_id)),
  );


  // All normalized IDs that have at least one done row
  const candidateIds = new Set(
    completionRows
      .filter(isModuleCompletionFullyDone)
      .map((d) => normalizeModuleIdForDashboard(Number(d.module_id))),
  );

  const result = new Set<number>();
  for (const id of candidateIds) {
    const children = PARENT_TO_CHILDREN[id];
    if (children && children.length > 0) {
      // Parent module: only fully done if ALL children have done rows
      if (children.every((childId) => doneRawIds.has(childId))) {
        result.add(id);
      }
    } else {
      result.add(id);
    }
  }
  return result;
};

const getCompletionAnsweredCount = (completion: any): number => {
  if (!completion) return 0;
  const details = Array.isArray(completion?.details) ? completion.details : null;
  if (!details || details.length === 0) return 1;

  return details.filter((detail: any) => {
    const answer = detail?.reponseEleve;
    return answer !== null && answer !== undefined && `${answer}`.trim() !== "";
  }).length;
};

const hasModuleCompletionProgress = (completion: any) => {
  if (!completion) return false;
  return getCompletionAnsweredCount(completion) > 0;
};

const isModuleCompletionFullyDone = (completion: any) => {
  if (!completion) return false;
  // SOURCE OF TRUTH: server-side terminal state (status = 'completed').
  if (isCompletionDone(completion)) return true;
  // Any row that carries an explicit status is governed ONLY by that status:
  // `completed_at` alone (now written on intermediate autosaves too) never
  // means "module terminé".
  if (completion.status != null) return false;
  // Legacy heuristic (rows written before the `status` column existed).
  return isLegacyCompletionDone(completion);
};

/** Legacy heuristic kept ONLY to detect rows that must be auto-repaired. */
const isLegacyCompletionDone = (completion: any) => {
  if (!completion) return false;
  // A module is fully done if it has a recorded score (validation was clicked)
  // OR if all question details have been answered
  if (completion.score_max != null && completion.score_max > 0 && completion.score_obtenu != null) {
    return true;
  }
  const details = Array.isArray(completion?.details) ? completion.details : null;
  if (!details || details.length === 0) return true;
  return getCompletionAnsweredCount(completion) === details.length;
};


const normalizeLabelText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const inferSubjectNumberFromExerciseTitle = (title: string): number | null => {
  const normalizedTitle = normalizeLabelText(title);

  if (normalizedTitle.includes("t3p")) return 1;
  if (normalizedTitle.includes("gestion")) return 2;
  if (normalizedTitle.includes("securite")) return 3;
  if (normalizedTitle.includes("francais")) return 4;
  if (normalizedTitle.includes("anglais")) return 5;
  if (normalizedTitle.includes("developpement commercial")) return 6;
  if (normalizedTitle.includes("reglementation nationale")) return 6;
  if (normalizedTitle.includes("reglementation locale")) return 7;
  if (normalizedTitle.includes("reglementation specifique")) return 7;
  if (normalizedTitle.includes("reglementation vtc")) return 7;

  return null;
};

const withTimeout = <T,>(promiseLike: PromiseLike<T>, timeoutMs: number, timeoutMessage: string): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);

    Promise.resolve(promiseLike)
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
};

// Short label for each standard subject number (cours/exercices modules)
const SUBJECT_QUIZ_LABELS: Record<number, string> = {
  1: "T3P",
  2: "Gestion",
  3: "Sécurité Routière",
  4: "Français",
  5: "Anglais",
  6: "Dév. Commercial / Réglem. Nationale",
  7: "Réglem. Spécifique / Réglem. Locale",
};

// Short label for each bilan quiz number
const BILAN_QUIZ_LABELS: Record<number, string> = {
  1: "T3P",
  2: "Gestion",
  3: "Sécurité Routière",
  4: "Réglem. Nationale",
  5: "Réglem. Locale",
  6: "Dév. Commercial",
  7: "Réglem. Spécifique",
};

// Infer sequential quiz number for bilan modules from exercise title
const inferBilanQuizNumber = (title: string): number | null => {
  const normalizedTitle = normalizeLabelText(title);

  // Bilan Exercices titles: "Bilan T3P", "Bilan Gestion", "Bilan Sécurité Routière", etc.
  if (normalizedTitle.includes("bilan t3p")) return 1;
  if (normalizedTitle.includes("bilan gestion")) return 2;
  if (normalizedTitle.includes("bilan securite")) return 3;
  if (normalizedTitle.includes("bilan reglementation nationale + specifique") || normalizedTitle.includes("bilan reglementation nationale +")) return 4;
  if (normalizedTitle.includes("bilan reglementation locale")) return 5;
  if (normalizedTitle.includes("bilan developpement")) return 6;
  if (normalizedTitle.includes("bilan reglementation specifique")) return 7;
  if (normalizedTitle.includes("bilan reglementation nationale")) return 4;

  // Bilan Examen titles: "📝 A - Transport Public", "📝 B - Gestion", etc.
  const letterMatch = normalizedTitle.match(/^(?:\u{1f4dd}\s*)?([a-g])(?:\(.*?\))?\s*-/u);
  if (letterMatch) {
    const letterMap: Record<string, number> = { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7 };
    return letterMap[letterMatch[1]] || null;
  }

  return null;
};

const BILAN_EXERCISE_MODULE_IDS = new Set([4, 5, 9, 11, 27, 28, 29, 30, 81, 82]);

const getPointLabelFromExerciseTitle = (title: string, moduleId?: number): string | null => {
  if (!title) return null;

  // For bilan modules, use bilan-specific numbering with label (e.g. "1. T3P")
  if (moduleId != null && BILAN_EXERCISE_MODULE_IDS.has(moduleId)) {
    const bilanNum = inferBilanQuizNumber(title);
    if (bilanNum) {
      const label = BILAN_QUIZ_LABELS[bilanNum] || "";
      return label ? `${bilanNum}. ${label}` : `${bilanNum}`;
    }
    return null;
  }

  // Standard cours/exercices mapping
  const subjectNum = inferSubjectNumberFromExerciseTitle(title);
  if (subjectNum) {
    const partMatch = title.match(/partie\s*(\d+)/i);
    const partNum = partMatch ? Number(partMatch[1]) : 1;
    const safePartNum = Number.isFinite(partNum) && partNum > 0 ? partNum : 1;
    const subjectName = SUBJECT_QUIZ_LABELS[subjectNum] || "";
    return subjectName ? `${subjectNum}.${safePartNum} ${subjectName}` : `${subjectNum}.${safePartNum}`;
  }

  // Fallback: try bilan quiz number
  const bilanNum = inferBilanQuizNumber(title);
  if (bilanNum) return `${bilanNum}`;

  return null;
};

const getCompletionPointLabels = (completion: any, moduleId?: number): string[] => {
  const details = Array.isArray(completion?.details) ? completion.details : null;
  if (!details || details.length === 0) return [];

  const pointLabels = new Set<string>();

  details.forEach((detail: any) => {
    const answer = detail?.reponseEleve;
    if (answer === null || answer === undefined || `${answer}`.trim() === "") return;

    const exerciseTitle = typeof detail?.exerciceTitre === "string" ? detail.exerciceTitre : "";
    const pointLabel = getPointLabelFromExerciseTitle(exerciseTitle, moduleId);
    if (pointLabel) pointLabels.add(pointLabel);
  });

  return Array.from(pointLabels).sort((a, b) => {
    const aNum = parseInt(a, 10) || 0;
    const bNum = parseInt(b, 10) || 0;
    if (aNum !== bNum) return aNum - bNum;
    const aPartMatch = a.match(/\.(\d+)/);
    const bPartMatch = b.match(/\.(\d+)/);
    return (aPartMatch ? Number(aPartMatch[1]) : 0) - (bPartMatch ? Number(bPartMatch[1]) : 0);
  });
};

const getModuleDisplayName = (formationId: FormationId, moduleId: number, fallback: string) =>
  FORMATION_DISPLAY_LABELS[formationId]?.[moduleId] || fallback;

// Module IDs that should open ExamensBlancsPage (bilans)
// All bilan examen modules (5, 11, 28, 30) now use ModuleDetailView directly
const BILAN_MODULE_IDS: Record<number, string> = {};

// Examens blancs module IDs → forced type filter
const EXAMEN_BLANC_MODULE_IDS: Record<number, "TAXI" | "VTC" | "TA" | "VA"> = {
  35: "VTC",
  36: "TAXI",
  37: "TA",
  38: "VA",
};

interface ApprenantInfo {
  id?: string;
  nom: string;
  prenom: string;
  type_apprenant: string | null;
  formation_choisie: string | null;
  date_debut_cours_en_ligne: string | null;
  date_fin_cours_en_ligne: string | null;
  date_debut_formation?: string | null;
  date_fin_formation?: string | null;
  creneau_horaire?: string | null;
  modules_autorises: number[] | null;
  email?: string | null;
  telephone?: string | null;
  adresse?: string | null;
  code_postal?: string | null;
  ville?: string | null;
  date_naissance?: string | null;
  date_examen_theorique?: string | null;
  resultat_examen?: string | null;
}

interface SessionAccessWindow {
  date_debut: string;
  date_fin: string;
  session_nom: string | null;
}

const dateOnly = (value: unknown): string | null =>
  typeof value === "string" && value.length >= 10 ? value.slice(0, 10) : null;

const parseAccessDate = (value: unknown): Date | null => {
  const valueDateOnly = dateOnly(value);
  return valueDateOnly ? safeDateParse(valueDateOnly) : null;
};

const getEarliestDate = (dates: Date[]): Date | null =>
  dates.length > 0 ? dates.reduce((earliest, date) => (date < earliest ? date : earliest), dates[0]) : null;

const getLatestDate = (dates: Date[]): Date | null =>
  dates.length > 0 ? dates.reduce((latest, date) => (date > latest ? date : latest), dates[0]) : null;

const fetchSessionAccessWindow = async (apprenantId?: string | null): Promise<SessionAccessWindow | null> => {
  if (!apprenantId) return null;

  const { data, error } = await supabase
    .from("session_apprenants")
    .select("date_debut, date_fin, sessions(id, nom, type_session, date_debut, date_fin)")
    .eq("apprenant_id", apprenantId);

  if (error || !data) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const rows = (data as any[])
    .map((row) => {
      const session = Array.isArray(row.sessions) ? row.sessions[0] : row.sessions;
      const label = `${session?.nom || ""} ${session?.type_session || ""}`.toLowerCase();
      const isOnlineOnly = /e-?learning|elearning|en\s*ligne/.test(label);
      const isPresentielSession = !isOnlineOnly && /pr[eé]sentiel|pratique|th[eé]orie|session|vtc|taxi|\bta\b|\bva\b/.test(label);
      const start = dateOnly(row.date_debut) || dateOnly(session?.date_debut);
      const end = dateOnly(row.date_fin) || dateOnly(session?.date_fin) || start;
      return start && end && isPresentielSession
        ? { date_debut: start, date_fin: end, session_nom: session?.nom || null }
        : null;
    })
    .filter(Boolean) as SessionAccessWindow[];

  return rows
    .filter((row) => safeDateParse(row.date_fin) >= today)
    .sort((a, b) => safeDateParse(a.date_debut).getTime() - safeDateParse(b.date_debut).getTime())[0] || null;
};

interface CoursPublicProps {
  embedded?: boolean;
  apprenantOverride?: ApprenantInfo | null;
}

const ChangePasswordDialog = () => {
  const [open, setOpen] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [saving, setSaving] = useState(false);

  const handleChange = async () => {
    if (newPw.length < 6) {
      toast.error("Le nouveau mot de passe doit contenir au moins 6 caractères");
      return;
    }
    if (newPw !== confirmPw) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Mot de passe modifié avec succès !");
        setOpen(false);
        setCurrentPw("");
        setNewPw("");
        setConfirmPw("");
      }
    } catch {
      toast.error("Erreur lors du changement de mot de passe");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" className="text-xs">
          <KeyRound className="w-3.5 h-3.5 mr-1" />
          Changer le mot de passe
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Changer votre mot de passe</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-sm font-medium mb-1 block">Nouveau mot de passe</label>
            <Input type="password" placeholder="Minimum 6 caractères" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Confirmer le mot de passe</label>
            <Input type="password" placeholder="Retapez le mot de passe" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
          </div>
          <Button className="w-full" onClick={handleChange} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <KeyRound className="w-4 h-4 mr-2" />}
            Enregistrer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const CoursPublic = ({ embedded, apprenantOverride }: CoursPublicProps) => {
  const navigate = useNavigate();
  const { user, loading: authLoading, profile, signOut } = useAuth();
  const lastKnownUserIdRef = useRef<string | null>(null);
  if (user?.id) lastKnownUserIdRef.current = user.id;
  const effectiveUserId = user?.id || lastKnownUserIdRef.current;
  const [apprenantLoading, setApprenantLoading] = useState(false);
  // True once the DB progression has actually been fetched. Locks are NEVER
  // computed from an empty/optimistic progression before this is true.
  const [completionsLoaded, setCompletionsLoaded] = useState(false);

  const [apprenant, setApprenant] = useState<ApprenantInfo | null>(null);
  const [apprenantFetchError, setApprenantFetchError] = useState<string | null>(null);
  const [fetchNonce, setFetchNonce] = useState(0);
  const [selectedModule, setSelectedModule] = useState<{ id: number; nom: string } | null>(null);
  const [selectedFormation, setSelectedFormation] = useState<FormationId | null>(null);
  const [activeTab, setActiveTab] = useState<"accueil" | "examens" | "notes">("accueil");
  const [completedModuleIds, setCompletedModuleIds] = useState<Set<number>>(new Set());
  const [moduleScores, setModuleScores] = useState<Record<number, { score_obtenu: number | null; score_max: number | null }>>({});
  const [moduleCompletionsForNotes, setModuleCompletionsForNotes] = useState<Array<{ id: string; module_id: number; score_obtenu: number | null; score_max: number | null; completed_at: string; details: any; status?: string | null; progress?: number | null }>>([]);
  const [examBlancCompletedIds, setExamBlancCompletedIds] = useState<Set<string>>(new Set());
  const [lastModuleName, setLastModuleName] = useState<string | null>(null);
  const [isInExam, setIsInExam] = useState(false);
  const [emargementFCStatus, setEmargementFCStatus] = useState<"checking" | "needed" | "signed" | "skipped" | "n/a">("checking");
  const [emargementCreneau, setEmargementCreneau] = useState<CreneauKey | null>(null);
  const [emargementDate, setEmargementDate] = useState<string | null>(null);
  const [emargementMode, setEmargementMode] = useState<"fc" | "presentiel">("fc");
  const [emargementPratiquePending, setEmargementPratiquePending] = useState(false);
  const [emargementExtraCreneaux, setEmargementExtraCreneaux] = useState<CreneauKey[]>([]);
  const [emargementRefreshTick, setEmargementRefreshTick] = useState(0);
  const [forceDisconnecting, setForceDisconnecting] = useState(false);
  const [sessionAccessWindow, setSessionAccessWindow] = useState<SessionAccessWindow | null>(null);
  const emargementStatusRef = useRef(emargementFCStatus);
  const lastQuizActivityAtRef = useRef(0);

  useEffect(() => {
    emargementStatusRef.current = emargementFCStatus;
  }, [emargementFCStatus]);

  const handleExamStateChange = useCallback((inExam: boolean) => {
    setIsInExam(inExam);
  }, []);

  const isStudentSession = !embedded && !!effectiveUserId && !!apprenant?.id;
  const { trackModuleActivity, markActivity, connexionId, endConnexion, alreadyConnected, otherSessionInfo, forceDisconnectOthers } = useConnexionTracking({
    apprenantId: !embedded && apprenant?.id ? apprenant.id : null,
    userId: effectiveUserId || null,
    enabled: isStudentSession,
  });

  useSessionKeepAlive(isStudentSession, isInExam);

  const forceDisconnectImplRef = useRef<() => Promise<void>>(async () => {});
  const handleForceDisconnect = useCallback(async () => {
    try {
      await forceDisconnectImplRef.current();
    } catch (e) {
      console.error("[CoursPublic] handleForceDisconnect error", e);
    }
  }, []);

  const {
    showModal: showPresenceModal,
    countdownDeadline: presenceDeadline,
    disconnectReason,
    confirmPresence,
  } = usePresenceCheck({
    apprenantId: !embedded && apprenant?.id ? apprenant.id : null,
    userId: effectiveUserId || null,
    connexionId,
    enabled: isStudentSession,
    onForceDisconnect: handleForceDisconnect,
    isInExam,
  });

  const {
    showInactivityModal,
    inactivityDeadline,
    confirmActivity,
  } = useInactivityAlert({
    enabled: isStudentSession,
    onDisconnect: handleForceDisconnect,
    pauseDuringExam: isInExam,
  });

  const fetchAttemptRef = useRef(0);
  const lastFetchedUserIdRef = useRef<string | null>(null);
  const adminRedirectedRef = useRef(false);
  useEffect(() => {
    if (!user || embedded) {
      setApprenantLoading(false);
      return;
    }

    if (profile?.role === "admin") {
      setApprenantLoading(false);
      setApprenant(null);
      setApprenantFetchError(null);
      if (!adminRedirectedRef.current) {
        adminRedirectedRef.current = true;
        navigate("/", { replace: true });
      }
      return;
    }

    adminRedirectedRef.current = false;

    if (lastFetchedUserIdRef.current !== user.id) {
      lastFetchedUserIdRef.current = user.id;
      fetchAttemptRef.current = 0;
    }

    fetchAttemptRef.current += 1;
    const currentAttempt = fetchAttemptRef.current;
    const onlineStatus = typeof navigator !== "undefined" && navigator.onLine === false
      ? " (Aucune connexion internet détectée)"
      : "";

    if (currentAttempt > 8) {
      console.warn("CoursPublic: too many fetch attempts, stopping");
      setApprenantLoading(false);
      setApprenantFetchError(
        `Connexion instable détectée après ${currentAttempt} tentatives${onlineStatus}. Vérifiez votre connexion internet (Wi-Fi / 4G), puis cliquez sur Réessayer.`
      );
      return;
    }

    let cancelled = false;
    // Anti-flicker: only show the spinner for the *first* attempt or a manual retry.
    // Subsequent automatic re-runs (caused by profile/session re-resolution while
    // the network is failing) keep the existing error banner visible instead of
    // swapping it back to a spinner every few hundred ms.
    if (currentAttempt === 1) {
      setApprenantLoading(true);
      setApprenantFetchError(null);
    }

    const fetchApprenant = async () => {
      try {
        const { data, error: fetchError } = await withTimeout(
          supabase
            .from("apprenants")
            .select("id, nom, prenom, type_apprenant, formation_choisie, date_debut_cours_en_ligne, date_fin_cours_en_ligne, date_debut_formation, date_fin_formation, creneau_horaire, modules_autorises, email, telephone, adresse, code_postal, ville, date_naissance")
            .eq("auth_user_id", user.id)
            .maybeSingle(),
          12000,
          "Temps d'attente dépassé pendant le chargement du dossier apprenant.",
        );

        if (cancelled) return;

        if (fetchError) {
          console.error("CoursPublic: fetch apprenant error", fetchError.message);
          const code = (fetchError as any).code ? ` [code ${(fetchError as any).code}]` : "";
          setApprenantFetchError(
            `Impossible de charger vos modules${onlineStatus}. Raison : ${fetchError.message || "erreur inconnue"}${code}. Cliquez sur Réessayer.`
          );
          return;
        }

        if (data) {
          setApprenant(data as any);
          fetchSessionAccessWindow(data.id).then((window) => {
            if (!cancelled) setSessionAccessWindow(window);
          });
          const formationId = resolveFormationId(data.type_apprenant, data.formation_choisie, data.modules_autorises);
          setSelectedFormation(formationId);
          setApprenantFetchError(null);
          fetchAttemptRef.current = 0;
        } else {
          const { data: isAdmin, error: roleError } = await withTimeout(
            supabase.rpc("has_role", {
              _user_id: user.id,
              _role: "admin",
            }),
            5000,
            "Temps d'attente dépassé pendant la vérification du profil.",
          ).catch((error) => {
            console.warn("CoursPublic: role check skipped", error);
            return { data: false, error: null };
          });

          if (!cancelled && !roleError && isAdmin === true) {
            setApprenantLoading(false);
            navigate("/", { replace: true });
            return;
          }

          setApprenant(null);
          setSessionAccessWindow(null);
          setSelectedFormation(null);
          setApprenantFetchError("Compte apprenant introuvable. Réessayez ou contactez le centre.");
        }
      } catch (err: unknown) {
        if (cancelled) return;
        console.error("CoursPublic: unexpected error", err);

        const errorMessage = err instanceof Error ? err.message : String(err);
        if (errorMessage.includes("Temps d'attente dépassé")) {
          setApprenantFetchError(
            `Le chargement du dossier prend trop de temps (>12s)${onlineStatus}. Raison probable : connexion lente, serveur saturé ou Wi-Fi instable. Cliquez sur Réessayer.`
          );
          return;
        }

        if (errorMessage.toLowerCase().includes("failed to fetch") || errorMessage.toLowerCase().includes("networkerror")) {
          setApprenantFetchError(
            `Connexion réseau impossible${onlineStatus}. Raison : ${errorMessage}. Vérifiez votre Wi-Fi / 4G puis cliquez sur Réessayer.`
          );
          return;
        }

        setApprenantFetchError(
          `Une erreur inattendue est survenue${onlineStatus}. Raison : ${errorMessage || "inconnue"}. Cliquez sur Réessayer.`
        );
      } finally {
        if (!cancelled) setApprenantLoading(false);
      }
    };

    void fetchApprenant();

    return () => {
      cancelled = true;
    };
  }, [user?.id, embedded, navigate, fetchNonce, profile?.role]);

  // Use apprenantOverride when provided (admin preview of specific student)
  useEffect(() => {
    if (!apprenantOverride) return;

    let cancelled = false;
    const applyApprenant = (value: ApprenantInfo) => {
      setApprenant(value);
      fetchSessionAccessWindow(value.id).then((window) => {
        if (!cancelled) setSessionAccessWindow(window);
      });
      const formationId = resolveFormationId(value.type_apprenant, value.formation_choisie, value.modules_autorises);
      setSelectedFormation(formationId);
    };

    applyApprenant(apprenantOverride);

    // In embedded preview, force-refresh latest DB state to avoid stale search result snapshot
    if (!embedded || !apprenantOverride.id) return;

    const refreshApprenant = async () => {
      const { data, error } = await supabase
        .from("apprenants")
        .select("id, nom, prenom, type_apprenant, formation_choisie, date_debut_cours_en_ligne, date_fin_cours_en_ligne, date_debut_formation, date_fin_formation, creneau_horaire, modules_autorises, email, telephone, adresse, code_postal, ville, date_naissance")
        .eq("id", apprenantOverride.id)
        .maybeSingle();

      if (cancelled || error || !data) return;
      applyApprenant(data as ApprenantInfo);
    };

    void refreshApprenant();

    return () => {
      cancelled = true;
    };
  }, [apprenantOverride, embedded]);

  // Fetch completed modules + exam blanc results + last module
  useEffect(() => {
    if (!apprenant?.id) return;
    const fetchCompletions = async () => {
      const [completionsResult, { data: examData }, { data: lastActivityData }, { data: lastConnData }] = await Promise.all([
        // Source of truth: DB progression, with retries so a transient failure
        // never yields an empty progression (which re-locked validated modules).
        fetchModuleCompletions(apprenant.id!),
        supabase
          .from("apprenant_quiz_results" as any)
          .select("quiz_id")
          .eq("apprenant_id", apprenant.id!)
          .eq("quiz_type", "examen_blanc"),
        // Primary: use apprenant_module_activites (works even without active connexion)
        supabase
          .from("apprenant_module_activites" as any)
          .select("module_nom")
          .eq("apprenant_id", apprenant.id!)
          .eq("action_type", "open_module")
          .order("occurred_at", { ascending: false })
          .limit(1),
        // Fallback: use apprenant_connexions.current_module
        supabase
          .from("apprenant_connexions" as any)
          .select("current_module")
          .eq("apprenant_id", apprenant.id!)
          .not("current_module", "is", null)
          .order("started_at", { ascending: false })
          .limit(1),
      ]);

      if (completionsResult.ok) {
        const completionRows = completionsResult.rows as any[];

        // Self-healing: rows whose activities are all done but not flagged
        // completed server-side are validated now (repairs broken accounts).
        await repairInconsistentCompletions(
          apprenant.id!,
          completionRows,
          (row) => isLegacyCompletionDone(row),
        );

        setCompletedModuleIds(computeFullyCompletedModuleIds(completionRows));

        const scores: Record<number, { score_obtenu: number | null; score_max: number | null }> = {};
        completionRows.forEach((d) => {
          const normalizedId = normalizeModuleIdForDashboard(Number(d.module_id));
          scores[normalizedId] = { score_obtenu: d.score_obtenu, score_max: d.score_max };
        });
        setModuleScores(scores);
        setModuleCompletionsForNotes(completionRows as any);
        setCompletionsLoaded(true);
      } else {
        console.error("[CoursPublic] Impossible de charger la progression — verrouillage conservé");
      }


      if (examData) {
        const ids = new Set<string>((examData as any[]).map((r: any) => r.quiz_id));
        setExamBlancCompletedIds(ids);
      }

      // Use activity log as primary source, fall back to connexion current_module
      const lastModName =
        (lastActivityData && (lastActivityData as any[]).length > 0 && (lastActivityData as any[])[0].module_nom) ||
        (lastConnData && (lastConnData as any[]).length > 0 && (lastConnData as any[])[0].current_module) ||
        null;
      setLastModuleName(lastModName);
    };
    fetchCompletions();
  }, [apprenant?.id]);

  // Vérifier si une signature d'émargement est requise pour le créneau en cours
  // - Formation continue : matin / aprem (selon l'heure)
  // - Présentiel : matin / aprem / soir (selon l'agenda du jour)
  useEffect(() => {
    // Ne jamais relancer l'émargement pendant un module / quiz / examen :
    // cela démontait la page au bout du refresh 60s et donnait l'impression
    // d'une déconnexion côté apprenant.
    if (selectedModule || isInExam || emargementStatusRef.current === "skipped") {
      return;
    }

    if (embedded || !user || !apprenant?.id) {
      setEmargementFCStatus("n/a");
      setEmargementCreneau(null);
      setEmargementDate(null);
      return;
    }

    const isFC = isFormationContinue(apprenant.type_apprenant, apprenant.formation_choisie);
    const isPres = !isFC && isPresentielType(apprenant.type_apprenant, apprenant.formation_choisie, apprenant.creneau_horaire);

    let cancelled = false;
    setEmargementFCStatus("checking");
    const mode: "fc" | "presentiel" = isFC ? "fc" : "presentiel";
    setEmargementMode(mode);

    const check = async () => {
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

      // Détermine la plage : du début de formation jusqu'à aujourd'hui inclus.
      const startStr =
        (apprenant.date_debut_formation as string | undefined) ||
        (apprenant.date_debut_cours_en_ligne as string | undefined) ||
        todayStr;
      const endStr =
        (apprenant.date_fin_formation as string | undefined) ||
        (apprenant.date_fin_cours_en_ligne as string | undefined) ||
        todayStr;

      const parseISO = (s: string) => {
        const [y, m, d] = s.split("-").map((x) => parseInt(x, 10));
        return new Date(y, (m || 1) - 1, d || 1);
      };
      const startDate = parseISO(startStr.slice(0, 10));
      const endDateRaw = parseISO(endStr.slice(0, 10));
      const today = parseISO(todayStr);
      const endDate = endDateRaw < today ? endDateRaw : today;

      // Liste de tous les créneaux attendus sur la plage
      const [baseExpected, pratiqueExpected] = await Promise.all([
        isFC || isPres
          ? getExpectedEmargements({
              mode,
              formationChoisie: apprenant.formation_choisie,
              creneauHoraire: apprenant.creneau_horaire,
              typeApprenant: apprenant.type_apprenant,
              apprenantId: apprenant.id!,
              startDate,
              endDate,
            })
          : Promise.resolve([] as Array<{ date: string; creneau: CreneauKey }>),
        // Journées de formation PRATIQUE : basées sur le planning (réservations
        // + sessions de type pratique), quel que soit le mode de formation.
        getExpectedPratiqueEmargements(apprenant.id!),
      ]);
      if (cancelled) return;

      const merged = new Map<string, { date: string; creneau: CreneauKey }>();
      for (const e of [...baseExpected, ...pratiqueExpected]) merged.set(`${e.date}|${e.creneau}`, e);
      const expected = Array.from(merged.values()).sort((a, b) =>
        a.date === b.date ? (a.creneau === "matin" ? -1 : 1) : a.date.localeCompare(b.date),
      );

      setEmargementPratiquePending(pratiqueExpected.length > 0);

      if (expected.length === 0) {
        setEmargementFCStatus("n/a");
        setEmargementCreneau(null);
        setEmargementDate(null);
        return;
      }


      // Récupère les créneaux déjà signés (ou déclarés absents) sur la plage
      const fromISO = expected[0].date;
      const toISO = expected[expected.length - 1].date;
      const { data: signedData } = await supabase
        .from("emargements_fc" as any)
        .select("date_emargement, demi_journee, signature_data_url, absent")
        .eq("apprenant_id", apprenant.id!)
        .gte("date_emargement", fromISO)
        .lte("date_emargement", toISO);
      if (cancelled) return;
      const signedSet = new Set<string>(
        (signedData || [])
          .filter((r: any) => Boolean(String(r.signature_data_url || "").trim()) || r.absent === true)
          .map((r: any) => `${r.date_emargement}|${r.demi_journee}`),
      );

      // Premier créneau non signé (passés d'abord, puis aujourd'hui)
      const next = expected.find((e) => !signedSet.has(`${e.date}|${e.creneau}`));
      if (!next) {
        setEmargementCreneau(null);
        setEmargementDate(null);
        setEmargementExtraCreneaux([]);
        setEmargementFCStatus("signed");
        return;
      }
      // Formation pratique : signature unique pour matin + après-midi de la journée
      const pratiqueSameDay = pratiqueExpected.filter((e) => e.date === next.date);
      const isPratiqueDay = pratiqueSameDay.some((e) => e.creneau === next.creneau);
      setEmargementExtraCreneaux(
        isPratiqueDay
          ? pratiqueSameDay
              .filter((e) => e.creneau !== next.creneau && !signedSet.has(`${e.date}|${e.creneau}`))
              .map((e) => e.creneau)
          : [],
      );
      setEmargementCreneau(next.creneau);
      setEmargementDate(next.date);
      setEmargementFCStatus("needed");
    };
    check();
    return () => {
      cancelled = true;
    };
  }, [embedded, user?.id, apprenant?.id, apprenant?.type_apprenant, apprenant?.formation_choisie, apprenant?.creneau_horaire, apprenant?.date_debut_formation, apprenant?.date_fin_formation, emargementRefreshTick, selectedModule, isInExam]);

  useEffect(() => {
    if (embedded || !user || !apprenant?.id || selectedModule || isInExam || emargementStatusRef.current === "skipped") return;
    const interval = window.setInterval(() => {
      if (emargementStatusRef.current !== "needed" && emargementStatusRef.current !== "skipped") {
        setEmargementRefreshTick((t) => t + 1);
      }
    }, 60000);
    return () => window.clearInterval(interval);
  }, [embedded, user?.id, apprenant?.id, selectedModule, isInExam]);


  // Track section navigation (Accueil / Examens / Notes) so the activity report
  // always knows which area of the platform the student was on, even when no
  // module was opened during the session.
  useEffect(() => {
    if (!isStudentSession || !connexionId) return;
    const sectionLabel =
      activeTab === "accueil" ? "Accueil — Liste des modules"
      : activeTab === "examens" ? "Examens blancs"
      : "Notes & Résultats";
    trackModuleActivity(0, sectionLabel, "open_section");
  }, [activeTab, isStudentSession, connexionId, trackModuleActivity]);


  const handleModuleCompleted = useCallback((moduleId: number) => {
    setCompletedModuleIds(prev => new Set([...prev, moduleId]));
  }, []);

  // Scroll auto en haut lors de l'ouverture d'un module
  useEffect(() => {
    if (selectedModule) {
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: "auto" });
        document.scrollingElement?.scrollTo?.({ top: 0, behavior: "auto" });
      });
    }
  }, [selectedModule?.id]);

  const handleTrackCours = useCallback((moduleId: number, coursTitle: string) => {
    trackModuleActivity(moduleId, coursTitle, "open_cours");
  }, [trackModuleActivity]);

  const handleLearnerQuizActivity = useCallback(() => {
    const now = Date.now();
    if (now - lastQuizActivityAtRef.current < 5_000) return;
    void markActivity().then((updated) => {
      if (updated) lastQuizActivityAtRef.current = Date.now();
    });
  }, [markActivity]);

  const apprenantInfoForModule = useMemo(() => apprenant ? {
    nom: apprenant.nom,
    prenom: apprenant.prenom,
    email: apprenant.email || undefined,
    telephone: apprenant.telephone || undefined,
    adresse: apprenant.adresse || undefined,
    code_postal: apprenant.code_postal || undefined,
    ville: apprenant.ville || undefined,
    date_naissance: apprenant.date_naissance || undefined,
    formation_choisie: apprenant.formation_choisie || null,
  } : null, [
    apprenant?.nom,
    apprenant?.prenom,
    apprenant?.email,
    apprenant?.telephone,
    apprenant?.adresse,
    apprenant?.code_postal,
    apprenant?.ville,
    apprenant?.date_naissance,
    apprenant?.formation_choisie,
  ]);

  const handleBackFromModule = useCallback(async () => {
    setSelectedModule(null);
    // Re-fetch completions to pick up any quiz results saved during the module
    if (apprenant?.id) {
      const [completionsResult, { data: examData }] = await Promise.all([
        fetchModuleCompletions(apprenant.id),
        supabase
          .from("apprenant_quiz_results" as any)
          .select("quiz_id")
          .eq("apprenant_id", apprenant.id)
          .eq("quiz_type", "examen_blanc"),
      ]);
      if (completionsResult.ok) {
        const completionRows = completionsResult.rows as any[];
        await repairInconsistentCompletions(
          apprenant.id,
          completionRows,
          (row) => isLegacyCompletionDone(row),
        );
        setCompletedModuleIds(computeFullyCompletedModuleIds(completionRows));

        const scores: Record<number, { score_obtenu: number | null; score_max: number | null }> = {};
        completionRows.forEach((d) => {
          const normalizedId = normalizeModuleIdForDashboard(Number(d.module_id));
          scores[normalizedId] = { score_obtenu: d.score_obtenu, score_max: d.score_max };
        });
        setModuleScores(scores);
        setModuleCompletionsForNotes(completionRows as any);
        setCompletionsLoaded(true);
      }

      if (examData) {
        const ids = new Set<string>((examData as any[]).map((r: any) => r.quiz_id));
        setExamBlancCompletedIds(ids);
      }
    }
  }, [apprenant?.id]);

  const handleLogout = useCallback(async () => {
    await endConnexion();
    await signOut();
    setApprenant(null);
    setSelectedFormation(null);
    setApprenantFetchError(null);
    setIdentityConfirmed(false);
    lastKnownUserIdRef.current = null;
    fetchAttemptRef.current = 0;
    lastFetchedUserIdRef.current = null;
  }, [endConnexion, signOut]);

  // Bind the force-disconnect implementation used by inactivity/presence hooks
  useEffect(() => {
    forceDisconnectImplRef.current = async () => {
      toast.warning("Déconnexion automatique pour inactivité prolongée (30 min sans activité + 5 min sans réponse).");
      await handleLogout();
      navigate("/cours-en-ligne", { replace: true });
    };
  }, [handleLogout, navigate]);

  // Identity confirmation modal (shown at EVERY login, for all learners
  // including e-learning). State only, no persistence: reset on logout,
  // so the next login always re-prompts.
  const [identityConfirmed, setIdentityConfirmed] = useState(false);

  const handleConfirmIdentity = useCallback(() => {
    setIdentityConfirmed(true);
  }, []);

  const handleDenyIdentity = useCallback(async () => {
    setIdentityConfirmed(false);
    await handleLogout();
  }, [handleLogout]);

  const pageContent = useMemo(() => {

  // Admin should never see the learner portal — redirect to dashboard
  if (!embedded && user && profile?.role === "admin") {
    return <Navigate to="/" replace />;
  }


  // NOTE: on ne déclenche PLUS le spinner plein écran quand `user` est là mais
  // `session` est temporairement null (refresh de token Supabase). Sinon l'écran
  // tremble entre le spinner et le bandeau "Chargement du profil…" plusieurs fois
  // par seconde pendant le keep-alive.
  if ((!embedded && authLoading && !(apprenant && selectedModule)) || (apprenantLoading && !selectedModule)) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        <p className="text-sm text-muted-foreground">Chargement de votre espace apprenant…</p>
        {apprenantLoading && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              fetchAttemptRef.current = 0;
              setApprenantLoading(false);
              setApprenantFetchError(
                `Chargement interrompu manuellement${typeof navigator !== "undefined" && !navigator.onLine ? " (Aucune connexion internet détectée)" : ""}. Raison probable : connexion lente ou serveur injoignable. Cliquez sur Réessayer.`
              );
            }}
          >
            Arrêter le chargement
          </Button>
        )}
      </div>
    );
  }

  if (!embedded && !user && !authLoading && apprenant && !selectedModule) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3 p-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        <p className="text-sm text-muted-foreground">Reconnexion en cours…</p>
      </div>
    );
  }

  // Auth required (unless embedded in admin)
  if (!embedded && !user && !apprenant) {
    return <StudentLogin onLogin={() => {}} />;
  }

  // Authenticated but apprenant profile not yet loaded — show warning banner, NEVER block fully
  if (!embedded && user && !apprenant) {
    if (apprenantLoading) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <p className="text-sm text-muted-foreground">Chargement de votre espace apprenant…</p>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800">
              {apprenantFetchError || "Chargement du profil en cours…"}{" "}
              <button
                className="underline font-medium"
                onClick={() => {
                  fetchAttemptRef.current = 0;
                  setFetchNonce((value) => value + 1);
                }}
              >
                Réessayer
              </button>
            </p>
          </div>
          <Button size="sm" variant="outline" className="shrink-0 text-xs" onClick={handleLogout}>
            Se déconnecter
          </Button>
        </div>
        <div className="flex-1 p-4 text-center text-muted-foreground flex items-center justify-center">
          <p>Vos modules se chargeront automatiquement dès que la connexion sera rétablie.</p>
        </div>
      </div>
    );
  }
  if (!embedded && user && apprenant) {
    const now = new Date();
    now.setHours(12, 0, 0, 0);

    // Les accès démarrent le premier jour réel de formation : jamais J-1.
    // La fenêtre e-learning configurée dans le CRM reste prioritaire si elle est active.
    const isFC = isFormationContinue(apprenant?.type_apprenant, apprenant?.formation_choisie);
    const isFcVtc = isFC && /vtc/i.test(`${apprenant?.formation_choisie || ''} ${apprenant?.type_apprenant || ''}`);
    const isPresentielOrFC =
      isPresentielType(apprenant?.type_apprenant, apprenant?.formation_choisie, apprenant?.creneau_horaire) ||
      isFC ||
      !!sessionAccessWindow;
    const accessWindows = [
      ...(isPresentielOrFC
        ? [{
          start: sessionAccessWindow?.date_debut || apprenant.date_debut_formation || apprenant.date_debut_cours_en_ligne,
          end: sessionAccessWindow?.date_fin || apprenant.date_fin_formation || apprenant.date_debut_formation || apprenant.date_debut_cours_en_ligne,
          allowDayBefore: false,
          extendMonths: isFC ? 6 : 0,
        }]
        : []),
      {
        start: apprenant.date_debut_cours_en_ligne || apprenant.date_debut_formation,
        end: apprenant.date_fin_cours_en_ligne,
        allowDayBefore: false,
        extendMonths: isFC ? 6 : 0,
      },
    ]

      .map((window) => {
        const start = parseAccessDate(window.start);
        const end = parseAccessDate(window.end);
        if (!start || !end) return null;
        const extendedEnd = window.extendMonths
          ? new Date(new Date(end).setMonth(end.getMonth() + window.extendMonths))
          : end;
        return {
          start: window.allowDayBefore ? new Date(start.getTime() - 24 * 60 * 60 * 1000) : start,
          end: extendedEnd,
        };
      })
      .filter((window): window is { start: Date; end: Date } => Boolean(window));



    const isAccessAllowed = accessWindows.some((window) => now >= window.start && now <= window.end);
    const debutEffectif = getEarliestDate(accessWindows.map((window) => window.start));
    const fin = getLatestDate(accessWindows.map((window) => window.end));

    if (!isAccessAllowed) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Accès non disponible</h1>
            <p className="text-slate-500 mb-4">
              {!debutEffectif || !fin
                ? "Votre accès aux cours en ligne n'a pas encore été configuré. Contactez votre centre de formation."
                : now < debutEffectif
                  ? `Votre accès sera disponible à partir du ${debutEffectif.toLocaleDateString('fr-FR')}.`
                  : `Votre accès a expiré le ${fin.toLocaleDateString('fr-FR')}. Contactez votre centre de formation.`
              }
            </p>
            <Button variant="destructive" size="sm" onClick={handleLogout}>
              <LogOut className="w-3.5 h-3.5 mr-1" />
              Déconnexion
            </Button>
          </div>
        </div>
      );
    }
  }

  // Émargement obligatoire :
  //  - Formation continue (FC) : matin / après-midi
  //  - Présentiel : matin / après-midi / soir, selon les blocs agenda du jour
  // Bloque l'accès aux cours tant que la signature du créneau n'est pas effectuée.
  const isFC =
    !embedded &&
    !!user &&
    !!apprenant?.id &&
    isFormationContinue(apprenant?.type_apprenant, apprenant?.formation_choisie);

  const isPres =
    !embedded &&
    !!user &&
    !!apprenant?.id &&
    !isFC &&
    isPresentielType(apprenant?.type_apprenant, apprenant?.formation_choisie, apprenant?.creneau_horaire);

  // Dernier jour de FC : on n'autorise PAS le bypass "skipped" — toutes les
  // signatures doivent être régularisées avant d'accéder aux cours.
  const isFCLastDay = (() => {
    if (!isFC) return false;
    const endStr = apprenant?.date_fin_formation;
    if (!endStr) return false;
    const end = new Date(endStr.slice(0, 10) + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.getTime() >= end.getTime();
  })();

  const needsEmargement =
    (isFC || isPres || emargementPratiquePending) &&
    emargementFCStatus !== "signed" &&
    emargementFCStatus !== "n/a" &&
    (isFCLastDay ? emargementFCStatus !== "checking" : emargementFCStatus !== "skipped");


  if (needsEmargement) {
    const formationLabel = !isFC && !isPres && emargementPratiquePending
      ? "formation pratique"
      : isPres ? "formation en présentiel" : "formation continue";
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-md mb-6">
          <div className="text-5xl mb-3">📝</div>
          <h1 className="text-xl font-bold text-slate-900 mb-1">
            Bienvenue {apprenant!.prenom} {apprenant!.nom}
          </h1>
          <p className="text-sm text-slate-500">
            {emargementFCStatus === "checking"
              ? "Vérification de votre émargement…"
              : isFCLastDay
                ? `⚠️ Dernier jour de votre ${formationLabel}. Il vous reste une ou plusieurs signatures manquantes : vous devez toutes les régulariser avant d'accéder à la plateforme.`
                : (() => {
                    const today = (() => {
                      const d = new Date();
                      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                    })();
                    const isPast = emargementDate && emargementDate !== today;
                    return isPast
                      ? `Avant d'accéder à votre ${formationLabel}, merci de régulariser une signature manquante d'un créneau passé.`
                      : `Avant d'accéder à votre ${formationLabel}, merci de signer la feuille d'émargement de ce créneau.`;
                  })()}
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={handleLogout}>
          <LogOut className="w-3.5 h-3.5 mr-1" />
          Se déconnecter
        </Button>
        {emargementFCStatus === "needed" && emargementCreneau && identityConfirmed && (
          <EmargementFCModal
            key={`${emargementDate || "today"}|${emargementCreneau}`}
            apprenantId={apprenant!.id!}
            userId={effectiveUserId!}
            apprenantNom={apprenant!.nom}
            apprenantPrenom={apprenant!.prenom}
            creneau={emargementCreneau}
            extraCreneaux={emargementExtraCreneaux}
            mode={emargementMode}
            dateEmargement={emargementDate || undefined}
            required={false}
            onSigned={() => setEmargementRefreshTick((t) => t + 1)}
            onSkipped={() => setEmargementFCStatus("skipped")}
          />
        )}
        {!identityConfirmed && apprenant?.id && (
          <IdentityConfirmModal
            show
            apprenantId={apprenant.id}
            prenom={apprenant.prenom || ""}
            nom={apprenant.nom || ""}
            onConfirm={handleConfirmIdentity}
            onDeny={handleDenyIdentity}
          />
        )}
      </div>
    );
  }

  // Module detail view
  if (selectedModule) {
    const bilanId = BILAN_MODULE_IDS[selectedModule.id];
    const examenBlancType = EXAMEN_BLANC_MODULE_IDS[selectedModule.id];
    if (bilanId) {
      // Bilan modules open ExamensBlancsPage directly
      return (
        <div className="min-h-screen bg-background p-4">
          <Button variant="ghost" size="sm" className="mb-4" onClick={() => setSelectedModule(null)}>
            <ChevronRight className="w-4 h-4 mr-1 rotate-180" /> Retour
          </Button>
          <ExamensBlancsPage
            defaultBilanId={bilanId}
            apprenantId={apprenant?.id || null}
            userId={effectiveUserId || null}
            apprenantType={apprenant?.type_apprenant || null}
            isPresentiel={!["vtc-elearning", "taxi-elearning", "taxi-pour-vtc-elearning"].includes(selectedFormation)}
            onExamStateChange={handleExamStateChange}
            onLearnerActivity={handleLearnerQuizActivity}
          />
        </div>
      );
    }
    if (examenBlancType) {
      // Examens blancs modules open ExamensBlancsPage filtered by type
      return (
        <div className="min-h-screen bg-background p-4">
          <Button variant="ghost" size="sm" className="mb-4" onClick={() => setSelectedModule(null)}>
            <ChevronRight className="w-4 h-4 mr-1 rotate-180" /> Retour
          </Button>
          <ErrorBoundary>
            <ExamensBlancsPage
              apprenantId={apprenant?.id || null}
              userId={effectiveUserId || null}
              apprenantType={examenBlancType}
              isPresentiel={!["vtc-elearning", "taxi-elearning", "taxi-pour-vtc-elearning"].includes(selectedFormation)}
              onExamStateChange={handleExamStateChange}
              onLearnerActivity={handleLearnerQuizActivity}
            />
          </ErrorBoundary>
        </div>
      );
    }
    // Module 87 (Bilan fin de formation FC VTC) est désormais rendu comme un module quiz standard via StableModuleDetailView ci-dessous.
    return (
      <div className="min-h-screen bg-background">
        <ErrorBoundary>
          <StableModuleDetailView
            module={selectedModule}
            onBack={handleBackFromModule}
            studentOnly
            apprenantId={apprenant?.id || null}
            onModuleCompleted={handleModuleCompleted}
            apprenantType={apprenant?.type_apprenant || null}
            isPresentiel={!["vtc-elearning", "taxi-elearning", "taxi-pour-vtc-elearning"].includes(selectedFormation)}
            hideFormulaires={apprenant?.email === "demo-vtc@ftransport.fr"}
            onTrackCours={handleTrackCours}
            onLearnerActivity={handleLearnerQuizActivity}
            apprenantInfo={apprenantInfoForModule}
          />
        </ErrorBoundary>
      </div>
    );
  }

  // If embedded (admin preview) and no formation selected, show formation picker
  // If student has no formation mapped, also show picker
  if (!selectedFormation) {
    return (
      <div className={embedded ? "p-6" : "min-h-screen bg-slate-50 flex items-center justify-center p-4"}>
        <div className="max-w-2xl w-full">
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
              {embedded ? "Aperçu apprenant" : `Bienvenue ${apprenant?.prenom || ""}`}
            </h1>
            <p className="text-slate-500">Sélectionnez une formation pour voir les cours</p>
          </div>
          <div className="grid gap-3">
            {FORMATIONS.map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFormation(f.id)}
                className="w-full text-left bg-white rounded-xl border border-slate-200 p-5 hover:border-primary/50 hover:shadow-md transition-all flex items-center justify-between group"
              >
                <div>
                  <h2 className="font-semibold text-slate-800 group-hover:text-primary transition-colors">
                    {f.label}
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">
                    {MODULES_DATA.filter((m) => m.formations.includes(f.id)).length} modules
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-primary transition-colors" />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Dashboard
  const formation = FORMATIONS.find((f) => f.id === selectedFormation)!;
  const allModules = MODULES_DATA.filter((m) => m.formations.includes(selectedFormation));

  // Aligner la vue apprenant avec les modules gérés + fusionner les sous-modules sous le parent (2/10)
  const rawAuthorizedIds = Array.from(
    new Set(
      (expandModulesAutorises(apprenant?.modules_autorises) || apprenant?.modules_autorises || [])
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id)),
    ),
  ) as number[];

  const normalizedAuthorizedIds = Array.from(
    new Set(rawAuthorizedIds.map((id) => normalizeModuleIdForDashboard(id))),
  ).filter((id) => MANAGED_MODULE_IDS.has(id));

  const formationDefaultIds = FORMATION_DEFAULT_MODULES[selectedFormation] || [];
  const normalizedFormationDefaultIds = Array.from(
    new Set(formationDefaultIds.map((id) => normalizeModuleIdForDashboard(id))),
  ).filter((id) => MANAGED_MODULE_IDS.has(id));

  // Pour les formations continues, toujours inclure l'ensemble des modules par défaut
  // (évite que d'anciens apprenants n'aient pas accès aux nouveaux modules ajoutés)
  const isFCFormation = selectedFormation === "continue-vtc" || selectedFormation === "continue-taxi";
  const effectiveAuthorizedIds = isFCFormation
    ? Array.from(new Set([...normalizedAuthorizedIds, ...normalizedFormationDefaultIds]))
    : normalizedAuthorizedIds;

  const normalizedAuthorizedSet = new Set(effectiveAuthorizedIds);
  const orderedPrimaryIds = normalizedFormationDefaultIds.filter((id) => normalizedAuthorizedSet.has(id));
  const orderedExtraIds = effectiveAuthorizedIds.filter((id) => !normalizedFormationDefaultIds.includes(id));
  const orderedAuthorizedIds = [...orderedPrimaryIds, ...orderedExtraIds];

  const orderedAuthorizedModules = orderedAuthorizedIds
    .map((id) => MODULES_DATA.find((module) => module.id === id))
    .filter((module): module is (typeof MODULES_DATA)[number] => !!module && module.formations.includes(selectedFormation));

  const fallbackModules = normalizedFormationDefaultIds
    .map((id) => MODULES_DATA.find((module) => module.id === id))
    .filter((module): module is (typeof MODULES_DATA)[number] => !!module);

  const sourceModules = orderedAuthorizedModules.length > 0
    ? orderedAuthorizedModules
    : (fallbackModules.length > 0 ? fallbackModules : allModules);

  // Whitelist stricte pour Formation Continue TAXI : uniquement les modules
  // officiels du parcours FC TAXI (bilan, cours+QCM, émargements, financeur,
  // demande carte pro, remboursement, fin de formation).
  const FC_TAXI_WHITELIST = new Set([82, 11, 92, 84, 86, 93, 94, 95, 96, 51]);
  const filteredSourceModules = selectedFormation === "continue-taxi"
    ? sourceModules.filter((m) => FC_TAXI_WHITELIST.has(m.id))
    : sourceModules;

  const modules = filteredSourceModules.map((module) => ({
    ...module,
    nom: getModuleDisplayName(selectedFormation, module.id, module.nom),
  }));


  const completionsByModuleId = moduleCompletionsForNotes.reduce<Record<number, any[]>>((acc, completion) => {
    const normalizedId = normalizeModuleIdForDashboard(Number(completion.module_id));
    if (!acc[normalizedId]) acc[normalizedId] = [];
    acc[normalizedId].push(completion);
    return acc;
  }, {});


  const moduleRealizedPointsById = modules.reduce<Record<number, string[]>>((acc, module) => {
    const rows = completionsByModuleId[module.id] || [];
    const pointLabels = new Set<string>();

    rows.forEach((row) => {
      getCompletionPointLabels(row, module.id).forEach((label) => pointLabels.add(label));
    });

    acc[module.id] = Array.from(pointLabels).sort((a, b) => {
      const aNum = parseInt(a, 10) || 0;
      const bNum = parseInt(b, 10) || 0;
      if (aNum !== bNum) return aNum - bNum;
      const aPartMatch = a.match(/\.(\d+)/);
      const bPartMatch = b.match(/\.(\d+)/);
      return (aPartMatch ? Number(aPartMatch[1]) : 0) - (bPartMatch ? Number(bPartMatch[1]) : 0);
    });

    return acc;
  }, {});

  // Compute per-module quiz stats: how many quizzes completed vs total
  const moduleQuizStatsById = modules.reduce<Record<number, { completedQuizzes: number; totalQuizzes: number; completedLabels: string[]; remainingLabels: string[] }>>((acc, module) => {
    const rows = completionsByModuleId[module.id] || [];
    const allLabels = new Set<string>();
    const doneLabels = new Set<string>();

    rows.forEach((row) => {
      const details = Array.isArray(row?.details) ? row.details : [];
      details.forEach((detail: any) => {
        const exerciseTitle = typeof detail?.exerciceTitre === "string" ? detail.exerciceTitre : "";
        const pointLabel = getPointLabelFromExerciseTitle(exerciseTitle, module.id);
        if (pointLabel) {
          allLabels.add(pointLabel);
          const answer = detail?.reponseEleve;
          if (answer !== null && answer !== undefined && `${answer}`.trim() !== "") {
            doneLabels.add(pointLabel);
          }
        }
      });
    });

    const completedLabelsArr = Array.from(doneLabels).sort();
    const remainingLabelsArr = Array.from(allLabels).filter(l => !doneLabels.has(l)).sort();

    acc[module.id] = {
      completedQuizzes: doneLabels.size,
      totalQuizzes: allLabels.size,
      completedLabels: completedLabelsArr,
      remainingLabels: remainingLabelsArr,
    };
    return acc;
  }, {});

  // Compute examen blanc stats per module (35=VTC, 36=TAXI, 37=TA, 38=VA)
  const EXAMEN_BLANC_EXAM_IDS: Record<number, string[]> = {
    35: EXAMENS_BLANCS_VTC.filter(e => !e.id.startsWith("bilan-")).map(e => e.id),
    36: EXAMENS_BLANCS_TAXI.filter(e => !e.id.startsWith("bilan-")).map(e => e.id),
    37: EXAMENS_BLANCS_TA.filter(e => !e.id.startsWith("bilan-")).map(e => e.id),
    38: EXAMENS_BLANCS_VA.filter(e => !e.id.startsWith("bilan-")).map(e => e.id),
  };

  const examBlancStatsById = modules.reduce<Record<number, { completed: number; total: number }>>((acc, module) => {
    const examIds = EXAMEN_BLANC_EXAM_IDS[module.id];
    if (examIds) {
      const completed = examIds.filter(id => examBlancCompletedIds.has(id)).length;
      acc[module.id] = { completed, total: examIds.length };
    }
    return acc;
  }, {});

  // A module is truly "done" only if ALL its quizzes/exams are completed
  const moduleProgressById = modules.reduce<Record<number, { isDone: boolean; hasProgress: boolean }>>((acc, module) => {
    const rows = completionsByModuleId[module.id] || [];
    let isDone = completedModuleIds.has(module.id);

    const quizStats = moduleQuizStatsById[module.id];
    const examStats = examBlancStatsById[module.id];

    // Fallback: if module has quizzes/exams and ALL are completed, consider module done
    // (covers modules where the explicit "module completion" row is missing)
    const allQuizzesDone = !quizStats || quizStats.totalQuizzes === 0 || quizStats.completedQuizzes >= quizStats.totalQuizzes;
    const allExamsDone = !examStats || examStats.total === 0 || examStats.completed >= examStats.total;
    const hasAnyTracked = (quizStats?.totalQuizzes ?? 0) > 0 || (examStats?.total ?? 0) > 0;
    if (!isDone && hasAnyTracked && allQuizzesDone && allExamsDone) {
      isDone = true;
    }

    // If module has quiz stats, require ALL quizzes completed
    if (isDone && quizStats && quizStats.totalQuizzes > 0) {
      if (quizStats.completedQuizzes < quizStats.totalQuizzes) {
        isDone = false;
      }
    }

    // If module has exam blanc stats, require ALL exams completed
    if (isDone && examStats && examStats.total > 0) {
      if (examStats.completed < examStats.total) {
        isDone = false;
      }
    }

    acc[module.id] = {
      isDone,
      hasProgress: rows.some(hasModuleCompletionProgress),
    };
    return acc;
  }, {});

  const completedCount = modules.filter((m) => moduleProgressById[m.id]?.isDone).length;
  const globalProgress = modules.length > 0 ? Math.round((completedCount / modules.length) * 100) : 0;
  const remainingModules = modules.filter((m) => !moduleProgressById[m.id]?.isDone);
  const doneModules = modules.filter((m) => moduleProgressById[m.id]?.isDone);
  const inProgressModules = modules.filter((m) => !moduleProgressById[m.id]?.isDone && moduleProgressById[m.id]?.hasProgress);
  const lowModules = remainingModules.filter((m) => !moduleProgressById[m.id]?.hasProgress).slice(0, 3);
  const studentName = apprenant ? `${apprenant.prenom} ${apprenant.nom}` : "Apprenant";

  // Check if a module was the last one the learner was on
  const isLastModule = (modNom: string) =>
    !!lastModuleName && modNom.trim().toLowerCase() === lastModuleName.trim().toLowerCase();

  // E-learning sequential order enforcement
  const ELEARNING_FORMATION_IDS: FormationId[] = ["vtc-elearning", "taxi-elearning", "taxi-pour-vtc-elearning"];
  const isElearning = ELEARNING_FORMATION_IDS.includes(selectedFormation);

  const normalizedTypeApprenant = normalizeFormationKey(apprenant?.type_apprenant);
  const normalizedFormationChoisie = normalizeFormationKey(apprenant?.formation_choisie);

  // Introduction module IDs (first module of each formation)
  const INTRO_MODULE_IDS = new Set([1, 26, 31, 32, 33, 34]);

  // Modules always unlocked even in e-learning (no sequential gate)
  const ALWAYS_UNLOCKED_IDS = new Set([70, 71, 72, 73]);

  const unlockState = computeUnlockState({
    modules,
    completedModuleIds,
    moduleQuizStatsById,
    examBlancStatsById,
    isElearning,
    introModuleIds: INTRO_MODULE_IDS,
    alwaysUnlockedIds: ALWAYS_UNLOCKED_IDS,
  });
  const { effectivelyCompletedIds, unlockedModuleIds } = unlockState;

  // Check if the Introduction (first module) is completed.
  // Fallback : toute ligne `apprenant_module_completion` avec un `completed_at`
  // pour le module d'intro (ou son ID brut) suffit — évite d'afficher à tort
  // le rappel "à refaire" aux apprenants qui l'ont déjà validé.
  const firstModuleId = modules[0]?.id;
  const hasAnyIntroCompletionRow = moduleCompletionsForNotes.some((row) => {
    const mid = Number(row?.module_id);
    return (
      row?.status === "completed" &&
      (mid === firstModuleId || INTRO_MODULE_IDS.has(mid))
    );
  });
  const introCompleted =
    modules.length > 0 &&
    (effectivelyCompletedIds.has(firstModuleId) || hasAnyIntroCompletionRow);


  // Rappel automatique : pour les formations en présentiel, si aujourd'hui = dernier vendredi
  // de la période de formation, on affiche un rappel bloquant si l'Introduction n'est pas faite.
  const isPresLearner = !isFormationContinue(apprenant?.type_apprenant, apprenant?.formation_choisie)
    && isPresentielType(apprenant?.type_apprenant, apprenant?.formation_choisie, apprenant?.creneau_horaire);
  const showLastFridayIntroReminder = (() => {
    if (!isPresLearner || introCompleted || modules.length === 0) return false;
    const startStr = apprenant?.date_debut_formation;
    const endStr = apprenant?.date_fin_formation;
    if (!startStr || !endStr) return false;
    const start = new Date(startStr + "T00:00:00");
    const end = new Date(endStr + "T00:00:00");
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return false;
    // Trouver le dernier vendredi (jour 5) dans [start, end]
    const lastFriday = new Date(end);
    while (lastFriday >= start && lastFriday.getDay() !== 5) {
      lastFriday.setDate(lastFriday.getDate() - 1);
    }
    if (lastFriday < start) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.getTime() === lastFriday.getTime();
  })();

  // Never decide locks before the server progression has been retrieved.
  const isModuleLocked = (modId: number) =>
    !completionsLoaded || computeIsModuleLocked(modId, unlockState);


  // Introduction modules: once completed, they cannot be re-opened (E-LEARNING ONLY)
  const isIntroLocked = (modId: number) => isElearning && INTRO_MODULE_IDS.has(modId) && effectivelyCompletedIds.has(modId);


  return (
    <div className={embedded ? "" : "min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50"}>
       {/* Top navbar */}
       <nav className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-lg">
         <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
           <div className="flex items-center gap-1">
             {(["accueil", "examens", "notes"] as const).map((tab) => (
               <button
                 key={tab}
                 className={`px-4 py-2 text-sm rounded-lg transition-all ${activeTab === tab ? "font-bold text-white bg-white/15 shadow-inner" : "hover:bg-white/10 text-slate-400 hover:text-white"}`}
                 onClick={() => setActiveTab(tab)}
               >
                 {tab === "accueil" ? "🏠 Accueil" : tab === "examens" ? "📝 Examens" : "📊 Notes"}
               </button>
             ))}
             <a
               href="/"
               className="px-4 py-2 text-sm rounded-lg transition-all hover:bg-white/10 text-slate-400 hover:text-white flex items-center gap-1"
             >
               ← Retour
             </a>
           </div>
          {!embedded && (
            <div className="flex items-center gap-2">
              <ChangePasswordDialog />
              <Button variant="destructive" size="sm" className="text-xs" onClick={handleLogout}>
                <LogOut className="w-3.5 h-3.5 mr-1" />
                Déconnexion
              </Button>
            </div>
          )}
        </div>
      </nav>

      {/* Recommandation navigateur */}
      <div className="bg-amber-50 border-b border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/30">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center gap-2 text-amber-800 dark:text-amber-200 text-sm">
          <Chrome className="w-4 h-4 shrink-0" />
          <span className="font-medium">Conseil :</span>
          <span>Si vous rencontrez des bugs ou des problèmes d'affichage, nous vous recommandons d'utiliser <strong>Google Chrome</strong> pour une expérience optimale.</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Notes tab */}
        {activeTab === "notes" && apprenant?.id && (
          <NotesView apprenantId={apprenant.id} studentName={studentName} moduleCompletionsSeed={moduleCompletionsForNotes.filter((r) => r.status === "completed") as any} />
        )}

        {/* Examens tab - Examens Blancs */}
        {activeTab === "examens" && (
          <ErrorBoundary
            fallback={
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-foreground">
                Une erreur est survenue dans la section Examens blancs. Rechargez la page ou réessayez dans quelques instants.
              </div>
            }
          >
            <ExamensBlancsPage
              apprenantId={apprenant?.id || null}
              userId={effectiveUserId || null}
              apprenantType={apprenant?.type_apprenant || null}
              isPresentiel={!["vtc-elearning", "taxi-elearning", "taxi-pour-vtc-elearning"].includes(selectedFormation)}
              onExamStateChange={handleExamStateChange}
              onLearnerActivity={handleLearnerQuizActivity}
            />
          </ErrorBoundary>
        )}

        {/* Accueil tab */}
        {activeTab === "accueil" && (
          <>
            {!completionsLoaded && (
              <div className="mx-auto max-w-6xl px-4 pt-4">
                <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 animate-pulse">
                  Récupération de votre progression…
                </div>
              </div>
            )}

            {/* Gamification: Welcome Banner + XP + Badges + Quiz */}
            {(() => {
              const xp = calculateXP(completedModuleIds, moduleScores);
              const badges = buildBadges(completedModuleIds, modules.length, moduleScores);
              // Estimate streak (simplified: always show 1 if user is active today)
              const streak = completedCount > 0 ? Math.min(completedCount, 7) : 0;
              return (
                <>
                  <WelcomeBanner
                    prenom={apprenant?.prenom || "Apprenant"}
                    formationLabel={formation.label}
                    xp={xp}
                    xpToday={0}
                    streak={streak}
                    completedCount={completedCount}
                    totalModules={modules.length}
                    globalProgress={globalProgress}
                  />
                  {showLastFridayIntroReminder && (
                    <div className="mt-4 rounded-xl border-4 border-red-500 bg-red-50 p-5 shadow-lg animate-pulse">
                      <div className="flex items-start gap-3">
                        <span className="text-3xl">⚠️</span>
                        <div className="flex-1">
                          <div className="text-lg font-bold text-red-800 mb-1">
                            Dernier jour de formation — Module Introduction obligatoire
                          </div>
                          <div className="text-sm text-red-900 mb-3">
                            C'est le <strong>dernier vendredi</strong> de votre formation présentielle et
                            vous n'avez pas encore terminé le module <strong>« {modules[0]?.nom || "Introduction"} »</strong>.
                            Merci de le compléter aujourd'hui avant la fin de la formation.
                          </div>
                          <Button
                            className="bg-red-600 hover:bg-red-700 text-white"
                            onClick={() => setSelectedModule(modules[0])}
                          >
                            👉 Ouvrir le module Introduction maintenant
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                   <XPBar xp={xp} moduleScores={moduleScores} />
                   <BadgeGrid badges={badges} />
                   {apprenant?.id && <ModuleChangeNotificationsBanner apprenantId={apprenant.id} />}
                   <StudentHoursTracker
                     apprenantId={apprenant?.id}
                     typeApprenant={apprenant?.type_apprenant}
                     dateDebutFormation={apprenant?.date_debut_formation}
                     dateFinFormation={apprenant?.date_fin_formation}
                     dateDebutCoursEnLigne={apprenant?.date_debut_cours_en_ligne}
                     dateFinCoursEnLigne={apprenant?.date_fin_cours_en_ligne}
                     dateExamenTheorique={apprenant?.date_examen_theorique}
                     resultatExamen={apprenant?.resultat_examen}
                   />
                 </>
               );
            })()}

            {/* Modules à revoir */}
            {lowModules.length > 0 && (
              <Card className="border-0 shadow-sm mb-8 overflow-hidden">
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 px-6 py-3 border-b">
                  <h3 className="font-bold text-amber-800 dark:text-amber-200 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Modules à réviser en priorité
                  </h3>
                </div>
                <CardContent className="p-4 space-y-2">
                  {lowModules.map((mod) => {
                    const locked = isModuleLocked(mod.id);
                    return (
                    <div key={mod.id} className={`flex items-center justify-between p-3 rounded-xl transition-colors ${locked ? "bg-muted/20 opacity-60" : "bg-muted/30 hover:bg-muted/50"}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${locked ? "bg-muted text-muted-foreground" : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"}`}>
                          {locked ? <Lock className="w-4 h-4" /> : mod.id}
                        </div>
                        <div>
                          <p className="font-medium text-sm text-foreground">{mod.nom}</p>
                          <p className="text-xs text-muted-foreground">
                            {locked ? (INTRO_MODULE_IDS.has(modules[0]?.id) && !introCompleted ? "🔒 Terminez l'Introduction d'abord" : "🔒 Terminez le module précédent") : "Progression : 0%"}
                          </p>
                        </div>
                      </div>
                      {!locked && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs gap-1.5 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300"
                        onClick={() => { trackModuleActivity(mod.id, mod.nom); setSelectedModule(mod); }}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Réviser
                      </Button>
                      )}
                    </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Modules grid: À faire + Réalisés */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* À faire */}
              <div className="space-y-3">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  À faire ({remainingModules.length})
                </h2>
                <div className="grid gap-3">
                  {remainingModules.length === 0 && (
                    <Card className="border-0 shadow-sm p-8 text-center">
                      <p className="text-muted-foreground text-sm">🎉 Tous les modules sont terminés !</p>
                    </Card>
                  )}
                  {remainingModules.map((mod, idx) => {
                    const locked = isModuleLocked(mod.id);
                    const lastMod = isLastModule(mod.nom);
                    return (
                    <Card
                      key={mod.id}
                      className={`shadow-sm transition-all duration-300 overflow-hidden ${lastMod ? "border-2 border-red-500 ring-2 ring-red-200 dark:ring-red-900/40" : "border-0"} ${locked ? "opacity-60 cursor-not-allowed" : "hover:shadow-lg cursor-pointer group"}`}
                      onClick={() => { if (!locked) { trackModuleActivity(mod.id, mod.nom); setSelectedModule(mod); } }}
                    >
                      <CardContent className="p-0">
                        <div className="flex items-center gap-4 p-4">
                          <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border transition-colors ${locked ? "bg-muted border-muted" : "bg-gradient-to-br from-primary/10 to-primary/5 border-primary/10 group-hover:from-primary/20 group-hover:to-primary/10"}`}>
                            {locked
                              ? <Lock className="w-4 h-4 text-muted-foreground" />
                              : <span className="text-sm font-bold text-primary">{idx + 1}</span>
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className={`font-bold text-sm transition-colors ${locked ? "text-muted-foreground" : "text-foreground group-hover:text-primary"}`}>
                              {mod.nom}
                              {lastMod && !locked && (
                                <Badge className="ml-2 text-[10px] px-1.5 py-0 bg-red-500 text-white border-red-500">
                                  ▶ Reprendre
                                </Badge>
                              )}
                            </h3>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {locked ? (INTRO_MODULE_IDS.has(modules[0]?.id) && !introCompleted ? "🔒 Terminez l'Introduction pour débloquer" : "🔒 Terminez le module précédent pour débloquer") : (
                                examBlancStatsById[mod.id]
                                  ? (examBlancStatsById[mod.id].completed > 0
                                    ? `📊 ${examBlancStatsById[mod.id].completed}/${examBlancStatsById[mod.id].total} examens blancs réalisés`
                                    : mod.description)
                                  : moduleQuizStatsById[mod.id]?.totalQuizzes > 0 && moduleQuizStatsById[mod.id]?.completedQuizzes > 0
                                    ? `📊 ${moduleQuizStatsById[mod.id].completedQuizzes}/${moduleQuizStatsById[mod.id].totalQuizzes} quiz complétés — Reste : ${moduleQuizStatsById[mod.id].remainingLabels.join(", ") || "aucun"}`
                                    : mod.description
                              )}
                            </p>
                          </div>
                          <div className="shrink-0 flex items-center gap-2">
                            {!locked && examBlancStatsById[mod.id] && examBlancStatsById[mod.id].completed > 0 && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950/30">
                                {examBlancStatsById[mod.id].completed}/{examBlancStatsById[mod.id].total}
                              </Badge>
                            )}
                            {!locked && !examBlancStatsById[mod.id] && moduleQuizStatsById[mod.id]?.completedQuizzes > 0 && moduleQuizStatsById[mod.id]?.totalQuizzes > 0 && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950/30">
                                {moduleQuizStatsById[mod.id].completedQuizzes}/{moduleQuizStatsById[mod.id].totalQuizzes}
                              </Badge>
                            )}
                            {locked ? (
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-primary/5 group-hover:bg-primary group-hover:text-white flex items-center justify-center transition-all duration-300">
                                <ArrowRight className="w-4 h-4 text-primary group-hover:text-white transition-colors" />
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    );
                  })}
                </div>
              </div>

              {/* Réalisés */}
              <div className="space-y-3">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  Réalisés ({doneModules.length})
                </h2>
                <div className="grid gap-3">
                  {doneModules.length === 0 && (
                    <Card className="border-0 shadow-sm p-8 text-center">
                      <p className="text-muted-foreground text-sm">Aucun module terminé pour l'instant</p>
                    </Card>
                  )}
                  {doneModules.map((mod) => {
                    const introLockedDone = isIntroLocked(mod.id);
                    const lastMod = isLastModule(mod.nom);
                    return (
                    <Card
                      key={mod.id}
                      className={`shadow-sm transition-all duration-300 overflow-hidden border-l-4 ${lastMod ? "border-2 border-red-500 ring-2 ring-red-200 dark:ring-red-900/40 border-l-red-500" : "border-l-emerald-400"} ${introLockedDone ? "opacity-70 cursor-not-allowed" : "hover:shadow-md cursor-pointer group"}`}
                      onClick={() => { if (!introLockedDone) { trackModuleActivity(mod.id, mod.nom); setSelectedModule(mod); } }}
                    >
                      <CardContent className="p-0">
                        <div className="flex items-center gap-4 p-4">
                          <div className="shrink-0 w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className={`font-bold text-sm transition-colors ${introLockedDone ? "text-muted-foreground" : "text-foreground group-hover:text-emerald-600"}`}>
                              {mod.nom}
                              {lastMod && !introLockedDone && (
                                <Badge className="ml-2 text-[10px] px-1.5 py-0 bg-red-500 text-white border-red-500">
                                  ▶ Reprendre
                                </Badge>
                              )}
                            </h3>
                            <p className="text-xs text-emerald-600">
                              {introLockedDone ? "✅ Terminé — Accès verrouillé" : "✅ Terminé"}
                              {!introLockedDone && examBlancStatsById[mod.id] && (
                                <span className="ml-2 font-semibold">
                                  — {examBlancStatsById[mod.id].completed}/{examBlancStatsById[mod.id].total} examens blancs réalisés
                                </span>
                              )}
                              {!introLockedDone && !examBlancStatsById[mod.id] && moduleQuizStatsById[mod.id]?.totalQuizzes > 0 && (
                                <span className="ml-2 font-semibold">
                                  — {moduleQuizStatsById[mod.id].completedQuizzes}/{moduleQuizStatsById[mod.id].totalQuizzes} quiz complétés
                                </span>
                              )}
                              {!introLockedDone && !examBlancStatsById[mod.id] && moduleRealizedPointsById[mod.id]?.length > 0 && !(moduleQuizStatsById[mod.id]?.totalQuizzes > 0) && (
                                <span className="ml-2 font-semibold">
                                  — Point{moduleRealizedPointsById[mod.id].length > 1 ? "s" : ""} réalisé{moduleRealizedPointsById[mod.id].length > 1 ? "s" : ""} : {moduleRealizedPointsById[mod.id].join(", ")}
                                </span>
                              )}
                              {!introLockedDone && moduleScores[mod.id]?.score_obtenu != null && moduleScores[mod.id]?.score_max != null && (
                                <span className="ml-2 font-semibold">
                                  — Score : {moduleScores[mod.id].score_obtenu}/{moduleScores[mod.id].score_max} ({Math.round((moduleScores[mod.id].score_obtenu! / moduleScores[mod.id].score_max!) * 100)}%)
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="shrink-0">
                            {introLockedDone ? (
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30">
                                Revoir
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Presence verification modal (non-blocking overlay) */}
      <PresenceCheckModal
        show={showPresenceModal || showInactivityModal}
        countdownDeadline={showInactivityModal ? inactivityDeadline : presenceDeadline}
        disconnectReason={disconnectReason}
        onConfirm={showInactivityModal ? confirmActivity : confirmPresence}
      />

      {/* Identity confirmation modal (post-login) */}
      {!embedded && apprenant?.id && !identityConfirmed && (
        <IdentityConfirmModal
          show
          apprenantId={apprenant.id}
          prenom={apprenant.prenom || ""}
          nom={apprenant.nom || ""}
          onConfirm={handleConfirmIdentity}
          onDeny={handleDenyIdentity}
        />
      )}

      {/* Blocked: another active session for this account */}
      {!embedded && alreadyConnected && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-card border-2 border-destructive rounded-xl shadow-2xl p-6 max-w-md w-full text-center space-y-4">
            {(() => {
              const device = getConnectedDeviceDetails(otherSessionInfo?.user_agent);
              const DeviceIcon = device.Icon;
              return (
                <>
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                    <DeviceIcon className="h-7 w-7 text-destructive" />
                  </div>
                  <div className="flex items-center justify-center gap-3 flex-wrap">
                    <h2 className="text-xl font-bold text-destructive">Vous êtes déjà connecté</h2>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-destructive text-destructive hover:bg-destructive/10"
                      disabled={forceDisconnecting}
                      onClick={async () => {
                        setForceDisconnecting(true);
                        try {
                          await forceDisconnectOthers();
                          toast.success("Autre session fermée. Vous pouvez continuer ici.");
                        } catch (e) {
                          console.error("Force disconnect error:", e);
                          toast.error("Impossible de forcer la déconnexion. Veuillez réessayer.");
                        } finally {
                          setForceDisconnecting(false);
                        }
                      }}
                    >
                      {forceDisconnecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Forcer la déconnexion
                    </Button>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    Votre compte est déjà ouvert sur un autre appareil : {device.label}.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Pour continuer ici, fermez ou déconnectez-vous d'abord sur {device.type === "tablette" ? "la tablette" : device.type === "téléphone" ? "le téléphone" : "l'autre appareil"} où votre cours est déjà ouvert.
                  </p>
                  <div className="text-left text-xs bg-muted rounded-md p-3 space-y-1">
                    <p className="font-semibold text-foreground">Appareil déjà connecté :</p>
                    <p><span className="text-muted-foreground">Type :</span> {device.label}</p>
                    <p><span className="text-muted-foreground">Navigateur :</span> {device.browser}</p>
                    {otherSessionInfo?.ip_address && (
                      <p><span className="text-muted-foreground">Adresse IP :</span> {otherSessionInfo.ip_address}</p>
                    )}
                    {otherSessionInfo?.last_seen_at && (
                      <p><span className="text-muted-foreground">Dernière activité :</span> {new Date(otherSessionInfo.last_seen_at).toLocaleString("fr-FR")}</p>
                    )}
                    {otherSessionInfo?.started_at && (
                      <p><span className="text-muted-foreground">Connecté depuis :</span> {new Date(otherSessionInfo.started_at).toLocaleString("fr-FR")}</p>
                    )}
                  </div>
                </>
              );
            })()}
            <button
              type="button"
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              onClick={async () => {
                try { await supabase.auth.signOut(); } catch (error) { console.warn("Déconnexion locale impossible", error); }
                window.location.href = "/login";
              }}
            >
              Se déconnecter
            </button>
          </div>
        </div>
      )}

      {/* Chat: ask a question to the centre */}
      {!embedded && apprenant?.id && (
        <ApprenantChatWidget apprenantId={apprenant.id} apprenantNom={`${apprenant.prenom || ""} ${apprenant.nom || ""}`.trim()} />
      )}
    </div>
  );
  }, [
    activeTab,
    apprenant,
    apprenantFetchError,
    apprenantInfoForModule,
    apprenantLoading,
    authLoading,
    completedModuleIds,
    confirmActivity,
    confirmPresence,
    disconnectReason,
    embedded,
    effectiveUserId,
    emargementCreneau,
    emargementDate,
    emargementFCStatus,
    emargementMode,
    examBlancCompletedIds,
    handleBackFromModule,
    handleExamStateChange,
    handleLogout,
    handleConfirmIdentity,
    handleDenyIdentity,
    identityConfirmed,
    handleModuleCompleted,
    handleTrackCours,
    handleLearnerQuizActivity,
    inactivityDeadline,
    lastModuleName,
    moduleCompletionsForNotes,
    moduleScores,
    presenceDeadline,
    profile?.role,
    selectedFormation,
    selectedModule,
    sessionAccessWindow,
    showInactivityModal,
    showPresenceModal,
    trackModuleActivity,
    alreadyConnected,
    otherSessionInfo,
    user,
  ]);

  return pageContent;
};

export default CoursPublic;
