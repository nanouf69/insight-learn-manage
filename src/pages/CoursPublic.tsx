import { useState, useEffect, useCallback, memo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogOut, Target, RotateCcw, ChevronRight, KeyRound, Loader2, AlertTriangle, BookOpen, GraduationCap, TrendingUp, Clock, ArrowRight, Sparkles, CheckCircle2, Lock } from "lucide-react";
import { WelcomeBanner } from "@/components/cours-en-ligne/motivation/WelcomeBanner";
import { XPBar } from "@/components/cours-en-ligne/motivation/XPBar";
import { BadgeGrid } from "@/components/cours-en-ligne/motivation/BadgeGrid";
import { buildBadges, calculateXP } from "@/components/cours-en-ligne/motivation/badges-data";
import { toast } from "sonner";
import ModuleDetailView from "@/components/cours-en-ligne/ModuleDetailView";
import ExamensBlancsPage from "@/components/cours-en-ligne/ExamensBlancsPage";
import NotesView from "@/components/cours-en-ligne/NotesView";
import StudentLogin from "@/components/cours-en-ligne/StudentLogin";
import { FORMATIONS, MODULES_DATA, expandModulesAutorises, type FormationId } from "@/components/cours-en-ligne/formations-data";
import { EXAMENS_BLANCS_VTC, EXAMENS_BLANCS_TAXI, examenBlanc1TA, examenBlanc1VA } from "@/components/cours-en-ligne/examens-blancs-data";
import { supabase } from "@/integrations/supabase/client";
import { safeDateParse } from "@/lib/safeDateParse";
import { useConnexionTracking } from "@/hooks/useConnexionTracking";
import { usePresenceCheck } from "@/hooks/usePresenceCheck";
import { PresenceCheckModal } from "@/components/cours-en-ligne/PresenceCheckModal";
import { useAuth } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";

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
    50: "10.FIN DE FORMATION VTC",
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
    50: "10.FIN DE FORMATION VTC",
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
    51: "13.FIN DE FORMATION TAXI",
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
    52: "13.FIN DE FORMATION TA",
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
    53: "10.FIN DE FORMATION VA",
  },
  "continue-vtc": {
    81: "1.BILAN EXERCICES FORMATION CONTINUE VTC",
  },
};

const FORMATION_DEFAULT_MODULES: Record<FormationId, number[]> = {
  "vtc": [1, 2, 3, 4, 35, 5, 60, 70, 8, 50],
  "vtc-cours-du-soir": [1, 2, 3, 4, 35, 5, 60, 70, 8, 50],
  "vtc-elearning": [26, 2, 3, 4, 35, 5, 60, 70, 8, 50],
  "taxi": [1, 10, 7, 64, 12, 3, 9, 13, 11, 36, 61, 71, 6, 51],
  "taxi-elearning": [26, 10, 7, 64, 12, 3, 9, 13, 11, 36, 61, 71, 6, 51],
  "taxi-pour-vtc": [31, 40, 7, 64, 12, 3, 27, 13, 28, 37, 62, 72, 6, 52],
  "taxi-pour-vtc-elearning": [32, 40, 7, 64, 12, 3, 27, 13, 28, 37, 62, 72, 6, 52],
  "vtc-pour-taxi": [33, 41, 3, 29, 30, 38, 63, 73, 8, 53],
  "continue-vtc": [81],
};

const MANAGED_MODULE_IDS = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 50, 51, 52, 53, 60, 61, 62, 63, 64, 70, 71, 72, 73]);
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
 */
const computeFullyCompletedModuleIds = (completionRows: any[]): Set<number> => {
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

const BILAN_EXERCISE_MODULE_IDS = new Set([4, 5, 9, 11, 27, 28, 29, 30]);

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
  modules_autorises: number[] | null;
  email?: string | null;
  telephone?: string | null;
  adresse?: string | null;
  code_postal?: string | null;
  ville?: string | null;
  date_naissance?: string | null;
}

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
  const { user, loading: authLoading, signOut } = useAuth();
  const [apprenantLoading, setApprenantLoading] = useState(false);
  const [apprenant, setApprenant] = useState<ApprenantInfo | null>(null);
  const [apprenantFetchError, setApprenantFetchError] = useState<string | null>(null);
  const [fetchNonce, setFetchNonce] = useState(0);
  const [selectedModule, setSelectedModule] = useState<{ id: number; nom: string } | null>(null);
  const [selectedFormation, setSelectedFormation] = useState<FormationId | null>(null);
  const [activeTab, setActiveTab] = useState<"accueil" | "examens" | "notes">("accueil");
  const [completedModuleIds, setCompletedModuleIds] = useState<Set<number>>(new Set());
  const [moduleScores, setModuleScores] = useState<Record<number, { score_obtenu: number | null; score_max: number | null }>>({});
  const [moduleCompletionsForNotes, setModuleCompletionsForNotes] = useState<Array<{ id: string; module_id: number; score_obtenu: number | null; score_max: number | null; completed_at: string; details: any }>>([]);
  const [examBlancCompletedIds, setExamBlancCompletedIds] = useState<Set<string>>(new Set());
  const [lastModuleName, setLastModuleName] = useState<string | null>(null);

  // Tracking connexion élève (only for real student sessions, not admin preview)
  const isStudentSession = !embedded && !!user && !!apprenant?.id;
  const { trackModuleActivity, connexionId, endConnexion } = useConnexionTracking({
    apprenantId: !embedded && apprenant?.id ? apprenant.id : null,
    userId: user?.id || null,
    enabled: isStudentSession,
  });

  // Presence verification: every 4h + 7h max session
  const handleForceDisconnect = useCallback(async () => {
    await supabase.auth.signOut();
    navigate("/cours");
    toast.error("Session terminée");
  }, [navigate]);

  const {
    showModal: showPresenceModal,
    countdownSeconds: presenceCountdown,
    disconnectReason,
    confirmPresence,
  } = usePresenceCheck({
    apprenantId: !embedded && apprenant?.id ? apprenant.id : null,
    userId: user?.id || null,
    connexionId,
    enabled: isStudentSession,
    onForceDisconnect: handleForceDisconnect,
  });

  // Fetch apprenant info when user is logged in
  const fetchAttemptRef = useRef(0);
  const lastFetchedUserIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!user || embedded) return;

    if (lastFetchedUserIdRef.current !== user.id) {
      lastFetchedUserIdRef.current = user.id;
      fetchAttemptRef.current = 0;
    }

    // Guard against infinite fetch loops (e.g. token rate-limiting causing repeated failures)
    fetchAttemptRef.current += 1;
    const currentAttempt = fetchAttemptRef.current;
    if (currentAttempt > 3) {
      console.warn("CoursPublic: too many fetch attempts, stopping");
      setApprenantLoading(false);
      setApprenantFetchError("Connexion instable détectée. Cliquez sur Réessayer.");
      return;
    }

    let cancelled = false;
    setApprenantLoading(true);
    setApprenantFetchError(null);

    const fetchApprenant = async () => {
      try {
        const { data: isAdmin, error: roleError } = await withTimeout(
          supabase.rpc("has_role", {
            _user_id: user.id,
            _role: "admin",
          }),
          12000,
          "Temps d'attente dépassé pendant la vérification du profil.",
        );

        if (!cancelled && !roleError && isAdmin === true) {
          navigate("/", { replace: true });
          return;
        }

        const { data, error: fetchError } = await withTimeout(
          supabase
            .from("apprenants")
            .select("id, nom, prenom, type_apprenant, formation_choisie, date_debut_cours_en_ligne, date_fin_cours_en_ligne, modules_autorises, email, telephone, adresse, code_postal, ville, date_naissance")
            .eq("auth_user_id", user.id)
            .maybeSingle(),
          12000,
          "Temps d'attente dépassé pendant le chargement du dossier apprenant.",
        );

        if (cancelled) return;

        if (fetchError) {
          console.error("CoursPublic: fetch apprenant error", fetchError.message);
          setApprenantFetchError("Impossible de charger vos modules pour le moment.");
          return;
        }

        if (data) {
          setApprenant(data as any);
          const formationId = resolveFormationId(data.type_apprenant, data.formation_choisie, data.modules_autorises);
          setSelectedFormation(formationId);
          setApprenantFetchError(null);
          fetchAttemptRef.current = 0;
        } else {
          setApprenant(null);
          setSelectedFormation(null);
          setApprenantFetchError("Compte apprenant introuvable. Réessayez ou contactez le centre.");
        }
      } catch (err: any) {
        if (cancelled) return;
        console.error("CoursPublic: unexpected error", err);

        const errorMessage = typeof err?.message === "string" ? err.message : "";
        if (errorMessage.includes("Temps d'attente dépassé")) {
          setApprenantFetchError("Connexion lente détectée sur cet appareil. Cliquez sur Réessayer.");
        } else {
          setApprenantFetchError("Une erreur inattendue est survenue.");
        }
      } finally {
        if (!cancelled) setApprenantLoading(false);
      }
    };

    void fetchApprenant();

    return () => {
      cancelled = true;
    };
  }, [user, embedded, navigate, fetchNonce]);

  // Use apprenantOverride when provided (admin preview of specific student)
  useEffect(() => {
    if (!apprenantOverride) return;

    const applyApprenant = (value: ApprenantInfo) => {
      setApprenant(value);
      const formationId = resolveFormationId(value.type_apprenant, value.formation_choisie, value.modules_autorises);
      setSelectedFormation(formationId);
    };

    applyApprenant(apprenantOverride);

    // In embedded preview, force-refresh latest DB state to avoid stale search result snapshot
    if (!embedded || !apprenantOverride.id) return;

    let cancelled = false;
    const refreshApprenant = async () => {
      const { data, error } = await supabase
        .from("apprenants")
        .select("id, nom, prenom, type_apprenant, formation_choisie, date_debut_cours_en_ligne, date_fin_cours_en_ligne, modules_autorises, email, telephone, adresse, code_postal, ville, date_naissance")
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
      const [{ data }, { data: examData }, { data: lastConnData }] = await Promise.all([
        supabase
          .from("apprenant_module_completion")
          .select("id, module_id, score_obtenu, score_max, completed_at, details")
          .eq("apprenant_id", apprenant.id!),
        supabase
          .from("apprenant_quiz_results" as any)
          .select("quiz_id")
          .eq("apprenant_id", apprenant.id!)
          .eq("quiz_type", "examen_blanc"),
        supabase
          .from("apprenant_connexions" as any)
          .select("current_module")
          .eq("apprenant_id", apprenant.id!)
          .not("current_module", "is", null)
          .order("started_at", { ascending: false })
          .limit(1),
      ]);

      if (data) {
        const completionRows = data as any[];
        setCompletedModuleIds(computeFullyCompletedModuleIds(completionRows));

        const scores: Record<number, { score_obtenu: number | null; score_max: number | null }> = {};
        completionRows.forEach((d) => {
          const normalizedId = normalizeModuleIdForDashboard(Number(d.module_id));
          scores[normalizedId] = { score_obtenu: d.score_obtenu, score_max: d.score_max };
        });
        setModuleScores(scores);
        setModuleCompletionsForNotes(completionRows);
      }

      if (examData) {
        const ids = new Set<string>((examData as any[]).map((r: any) => r.quiz_id));
        setExamBlancCompletedIds(ids);
      }

      if (lastConnData && (lastConnData as any[]).length > 0) {
        setLastModuleName((lastConnData as any[])[0].current_module || null);
      }
    };
    fetchCompletions();
  }, [apprenant?.id]);

  const handleModuleCompleted = useCallback((moduleId: number) => {
    setCompletedModuleIds(prev => new Set([...prev, moduleId]));
  }, []);

  const handleBackFromModule = useCallback(async () => {
    setSelectedModule(null);
    // Re-fetch completions to pick up any quiz results saved during the module
    if (apprenant?.id) {
      const [{ data }, { data: examData }] = await Promise.all([
        supabase
          .from("apprenant_module_completion")
          .select("id, module_id, score_obtenu, score_max, completed_at, details")
          .eq("apprenant_id", apprenant.id),
        supabase
          .from("apprenant_quiz_results" as any)
          .select("quiz_id")
          .eq("apprenant_id", apprenant.id)
          .eq("quiz_type", "examen_blanc"),
      ]);
      if (data) {
        const completionRows = data as any[];
        setCompletedModuleIds(computeFullyCompletedModuleIds(completionRows));

        const scores: Record<number, { score_obtenu: number | null; score_max: number | null }> = {};
        completionRows.forEach((d) => {
          const normalizedId = normalizeModuleIdForDashboard(Number(d.module_id));
          scores[normalizedId] = { score_obtenu: d.score_obtenu, score_max: d.score_max };
        });
        setModuleScores(scores);
        setModuleCompletionsForNotes(completionRows);
      }
      if (examData) {
        const ids = new Set<string>((examData as any[]).map((r: any) => r.quiz_id));
        setExamBlancCompletedIds(ids);
      }
    }
  }, [apprenant?.id]);

  const handleLogout = async () => {
    await signOut();
    setApprenant(null);
    setSelectedFormation(null);
    setApprenantFetchError(null);
    fetchAttemptRef.current = 0;
    lastFetchedUserIdRef.current = null;
  };

  // Loading state
  if ((!embedded && authLoading) || apprenantLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        <p className="text-sm text-muted-foreground">Chargement de votre espace apprenant…</p>
      </div>
    );
  }

  // Auth required (unless embedded in admin)
  if (!embedded && !user) {
    return <StudentLogin onLogin={() => {}} />;
  }

  // Authenticated but apprenant profile not yet loaded (avoid white screen / forced logout)
  if (!embedded && user && !apprenant) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-xl border bg-background p-6 shadow-sm text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
          <h1 className="text-lg font-semibold">Accès modules indisponible</h1>
          <p className="text-sm text-muted-foreground">
            {apprenantFetchError || "Nous n’arrivons pas à charger votre dossier apprenant pour le moment."}
          </p>
          <div className="flex items-center justify-center gap-2 pt-1">
            <Button
              size="sm"
              onClick={() => {
                fetchAttemptRef.current = 0;
                setFetchNonce((value) => value + 1);
              }}
            >
              Réessayer
            </Button>
            <Button size="sm" variant="outline" onClick={handleLogout}>
              Se déconnecter
            </Button>
          </div>
        </div>
      </div>
    );
  }
  if (!embedded && user && apprenant) {
    const now = new Date();
    now.setHours(12, 0, 0, 0);
    const debut = apprenant.date_debut_cours_en_ligne ? safeDateParse(apprenant.date_debut_cours_en_ligne) : null;
    const fin = apprenant.date_fin_cours_en_ligne ? safeDateParse(apprenant.date_fin_cours_en_ligne) : null;

    if (!debut || !fin || now < debut || now > fin) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Accès non disponible</h1>
            <p className="text-slate-500 mb-4">
              {!debut || !fin
                ? "Votre accès aux cours en ligne n'a pas encore été configuré. Contactez votre centre de formation."
                : now < debut
                  ? `Votre accès sera disponible à partir du ${debut.toLocaleDateString('fr-FR')}.`
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
            userId={user?.id || null}
            apprenantType={apprenant?.type_apprenant || null}
            isPresentiel={!["vtc-elearning", "taxi-elearning", "taxi-pour-vtc-elearning"].includes(selectedFormation)}
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
          <ExamensBlancsPage
            apprenantId={apprenant?.id || null}
            userId={user?.id || null}
            apprenantType={examenBlancType}
            isPresentiel={!["vtc-elearning", "taxi-elearning", "taxi-pour-vtc-elearning"].includes(selectedFormation)}
          />
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-background">
        <StableModuleDetailView
          module={selectedModule}
          onBack={handleBackFromModule}
          studentOnly
          apprenantId={apprenant?.id || null}
          onModuleCompleted={handleModuleCompleted}
          apprenantType={apprenant?.type_apprenant || null}
          isPresentiel={!["vtc-elearning", "taxi-elearning", "taxi-pour-vtc-elearning"].includes(selectedFormation)}
          hideFormulaires={apprenant?.email === "demo-vtc@ftransport.fr"}
          onTrackCours={(moduleId, coursTitle) => {
            trackModuleActivity(moduleId, coursTitle, "open_cours");
          }}
          apprenantInfo={apprenant ? {
            nom: apprenant.nom,
            prenom: apprenant.prenom,
            email: apprenant.email || undefined,
            telephone: apprenant.telephone || undefined,
            adresse: apprenant.adresse || undefined,
            code_postal: apprenant.code_postal || undefined,
            ville: apprenant.ville || undefined,
            date_naissance: apprenant.date_naissance || undefined,
          } : null}
        />
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

  const normalizedAuthorizedSet = new Set(normalizedAuthorizedIds);
  const orderedPrimaryIds = normalizedFormationDefaultIds.filter((id) => normalizedAuthorizedSet.has(id));
  const orderedExtraIds = normalizedAuthorizedIds.filter((id) => !normalizedFormationDefaultIds.includes(id));
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

  const modules = sourceModules.map((module) => ({
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
    37: [examenBlanc1TA.id],
    38: [examenBlanc1VA.id],
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

    // If module has quiz stats, require ALL quizzes completed
    const quizStats = moduleQuizStatsById[module.id];
    if (isDone && quizStats && quizStats.totalQuizzes > 0) {
      if (quizStats.completedQuizzes < quizStats.totalQuizzes) {
        isDone = false;
      }
    }

    // If module has exam blanc stats, require ALL exams completed
    const examStats = examBlancStatsById[module.id];
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

  // Build a set of unlocked module IDs
  const unlockedModuleIds = new Set<number>();

  // The first module (Introduction) is always unlocked
  if (modules.length > 0) {
    unlockedModuleIds.add(modules[0].id);
  }

  // Check if the Introduction (first module) is completed
  const introCompleted = modules.length > 0 && completedModuleIds.has(modules[0].id);

  if (isElearning) {
    // E-learning: strict sequential unlock + intro lock
    for (let i = 0; i < modules.length; i++) {
      if (i === 0 || ALWAYS_UNLOCKED_IDS.has(modules[i].id)) {
        unlockedModuleIds.add(modules[i].id);
      } else if (completedModuleIds.has(modules[i - 1].id)) {
        unlockedModuleIds.add(modules[i].id);
      }
    }
  } else {
    // Présentiel / E-Présentiel: all modules unlocked, no intro requirement
    modules.forEach(m => unlockedModuleIds.add(m.id));
  }

  // Completed modules are always accessible (for review)
  // For e-learning: EXCEPT Introduction modules (locked once done)
  // For présentiel: all completed modules remain accessible including intro
  modules.forEach(m => {
    if (completedModuleIds.has(m.id)) {
      if (!isElearning || !INTRO_MODULE_IDS.has(m.id)) {
        unlockedModuleIds.add(m.id);
      }
    }
  });

  const isModuleLocked = (modId: number) => !unlockedModuleIds.has(modId) && !completedModuleIds.has(modId);

  // Introduction modules: once completed, they cannot be re-opened (E-LEARNING ONLY)
  const isIntroLocked = (modId: number) => isElearning && INTRO_MODULE_IDS.has(modId) && completedModuleIds.has(modId);

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

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Notes tab */}
        {activeTab === "notes" && apprenant?.id && (
          <NotesView apprenantId={apprenant.id} studentName={studentName} moduleCompletionsSeed={moduleCompletionsForNotes} />
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
              userId={user?.id || null}
              apprenantType={apprenant?.type_apprenant || null}
              isPresentiel={!["vtc-elearning", "taxi-elearning", "taxi-pour-vtc-elearning"].includes(selectedFormation)}
            />
          </ErrorBoundary>
        )}

        {/* Accueil tab */}
        {activeTab === "accueil" && (
          <>
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
                   <XPBar xp={xp} moduleScores={moduleScores} />
                   <BadgeGrid badges={badges} />
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
        show={showPresenceModal}
        countdownSeconds={presenceCountdown}
        disconnectReason={disconnectReason}
        onConfirm={confirmPresence}
      />
    </div>
  );
};

export default CoursPublic;
