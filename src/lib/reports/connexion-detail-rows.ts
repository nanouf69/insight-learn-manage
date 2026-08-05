/**
 * Source unique de vérité pour le "Détail des connexions".
 * Utilisé à la fois par l'écran (Rapport d'activité) et par les PDF
 * (relevé de connexions inclus dans les dossiers de contrôle),
 * afin que les deux affichent EXACTEMENT les mêmes colonnes :
 *   - Module consulté
 *   - Quiz / Examens réalisés
 *   - Cours & Exercices effectués
 */
import { ALL_MODULES } from "@/components/cours-en-ligne/modules-config";
import { VTC_COURS_DATA } from "@/components/cours-en-ligne/vtc-cours-data";
import { TAXI_COURS_DATA } from "@/components/cours-en-ligne/taxi-cours-data";
import { TA_COURS_DATA } from "@/components/cours-en-ligne/ta-cours-data";
import { VA_COURS_DATA } from "@/components/cours-en-ligne/va-cours-data";
import { BILAN_EXERCICES_VTC } from "@/components/cours-en-ligne/bilan-exercices-vtc-data";
import { BILAN_EXERCICES_FC_VTC } from "@/components/cours-en-ligne/bilan-exercices-fc-vtc-data";
import { BILAN_EXERCICES_TAXI } from "@/components/cours-en-ligne/bilan-exercices-taxi-data";
import { BILAN_EXERCICES_TA } from "@/components/cours-en-ligne/bilan-exercices-ta-data";
import { BILAN_EXERCICES_VA } from "@/components/cours-en-ligne/bilan-exercices-va-data";
import { FORMULES_DATA } from "@/components/cours-en-ligne/formules-data";
import { CONNAISSANCES_VILLE_TAXI_DATA } from "@/components/cours-en-ligne/connaissances-ville-taxi-data";
import { CONTROLE_CONNAISSANCES_TAXI_DATA } from "@/components/cours-en-ligne/controle-connaissances-taxi-data";
import { EQUIPEMENTS_TAXI_DATA } from "@/components/cours-en-ligne/equipements-taxi-data";

const EXERCICE_TITLE_MAP = new Map<string, string>();
const registerModuleExercises = (moduleId: number, exercices: { id: number; titre: string }[] = []) => {
  exercices.forEach((exo) => EXERCICE_TITLE_MAP.set(`module_${moduleId}_exo_${exo.id}`, exo.titre));
};
[VTC_COURS_DATA, TAXI_COURS_DATA, TA_COURS_DATA, VA_COURS_DATA, FORMULES_DATA,
 CONNAISSANCES_VILLE_TAXI_DATA, CONTROLE_CONNAISSANCES_TAXI_DATA, EQUIPEMENTS_TAXI_DATA]
  .forEach((mod: any) => registerModuleExercises(mod.id, mod.exercices || []));
registerModuleExercises(4, BILAN_EXERCICES_VTC as any);
registerModuleExercises(9, BILAN_EXERCICES_TAXI as any);
registerModuleExercises(27, BILAN_EXERCICES_TA as any);
registerModuleExercises(29, BILAN_EXERCICES_VA as any);
registerModuleExercises(81, BILAN_EXERCICES_FC_VTC as any);

const MODULE_NAME_MAP = new Map<number, string>();
ALL_MODULES.forEach((m: any) => MODULE_NAME_MAP.set(m.id, m.nom));

export const NO_MODULE_LABEL = "Aucun module / quiz ouvert (page d'accueil uniquement)";
export const MAX_SESSION_MS = 7 * 60 * 60 * 1000;

export const resolveExerciceTitle = (exerciceId: string): string => {
  if (!exerciceId) return "Exercice";
  const mapped = EXERCICE_TITLE_MAP.get(exerciceId);
  if (mapped) return mapped;
  const match = exerciceId.match(/^module_(\d+)_exo_(\d+)$/);
  if (match) {
    const modName = MODULE_NAME_MAP.get(parseInt(match[1]));
    if (modName) return `${modName} — Exo ${match[2]}`;
  }
  return exerciceId;
};

export const shortenMatiere = (m: string): string => {
  const map: Record<string, string> = {
    A: "T3P", B: "Gestion", C: "Sécurité routière", D: "Français", E: "Anglais",
    "F(V)": "Dév. commercial VTC", "F(T)": "Réglem. TAXI",
    "G(V)": "Réglem. VTC", "G(T)": "Ville TAXI",
  };
  const match = m.match(/^([A-G](?:\([VT]\))?)\s*-/);
  if (match) return `${match[1]} - ${map[match[1]] || m.split(" - ").slice(1).join(" - ").substring(0, 30)}`;
  return m.length > 40 ? m.substring(0, 40) + "…" : m;
};

const isAccueilLabel = (s?: string | null) => !!s && /accueil|liste\s+des\s+modules/i.test(s);

export interface ConnexionLike {
  started_at: string;
  ended_at?: string | null;
  last_seen_at?: string | null;
  current_module?: string | null;
  [k: string]: any;
}
export interface ActiviteLike { occurred_at: string; action_type: string; module_id?: number | null; module_nom?: string | null; }
export interface QuizLike { completed_at: string; quiz_titre?: string | null; matiere_nom?: string | null; }
export interface ExoLike { updated_at: string; exercice_id: string; }

export interface ConnexionDetail {
  modules_consultes: string[];
  quiz_realises: string[];
  cours_exercices: string[];
}

/** Calcule les 3 colonnes de détail pour une connexion (logique identique à l'écran). */
export function computeConnexionDetail(
  c: ConnexionLike,
  activites: ActiviteLike[],
  quizzes: QuizLike[],
  exos: ExoLike[],
): ConnexionDetail {
  const startMs = c.started_at ? new Date(c.started_at).getTime() : NaN;
  const rawEndMs = (c.ended_at || c.last_seen_at) ? new Date((c.ended_at || c.last_seen_at) as string).getTime() : NaN;
  if (!isFinite(startMs) || !isFinite(rawEndMs)) {
    return { modules_consultes: [], quiz_realises: [], cours_exercices: [] };
  }
  const endMs = Math.min(rawEndMs, startMs + MAX_SESSION_MS);
  const inWindow = (iso?: string | null) => {
    if (!iso) return false;
    const t = new Date(iso).getTime();
    return isFinite(t) && t >= startMs && t <= endMs;
  };

  // ── Cours & Exercices effectués (modules/parties/sections ouverts + exercices complétés)
  const coursExercices: string[] = [];
  const seen = new Set<string>();
  activites
    .filter((a) => inWindow(a.occurred_at)
      && ["open_module", "open_cours", "open_section"].includes(a.action_type)
      && !isAccueilLabel(a.module_nom))
    .forEach((a) => {
      const key = `${a.action_type}_${a.module_id}_${a.module_nom}`;
      if (seen.has(key)) return;
      seen.add(key);
      const icon = a.action_type === "open_section" ? "🧭" : "📖";
      coursExercices.push(`${icon} ${a.module_nom}`);
    });
  exos.filter((e) => inWindow(e.updated_at))
    .forEach((e) => coursExercices.push(resolveExerciceTitle(String(e.exercice_id || ""))));

  // ── Quiz / Examens réalisés
  const quizRealises: string[] = [];
  quizzes.filter((q) => inWindow(q.completed_at)).forEach((q) => {
    const matiere = q.matiere_nom ? ` — ${shortenMatiere(q.matiere_nom)}` : "";
    quizRealises.push(`${q.quiz_titre || "Quiz"}${matiere}`);
  });

  // ── Module consulté (libellé unique, comme à l'écran)
  const sessionActs = activites
    .filter((a) => inWindow(a.occurred_at)
      && (a.action_type === "open_module" || a.action_type === "open_section")
      && !isAccueilLabel(a.module_nom))
    .sort((a, b) => String(b.occurred_at).localeCompare(String(a.occurred_at)));

  const inferred = new Set<string>();
  exos.filter((e) => inWindow(e.updated_at)).forEach((e) => {
    const match = String(e.exercice_id || "").match(/^module_(\d+)_exo_\d+$/);
    if (match) {
      const name = MODULE_NAME_MAP.get(parseInt(match[1]));
      if (name) inferred.add(name);
    }
  });
  quizzes.filter((q) => inWindow(q.completed_at)).forEach((q) => {
    if (q.matiere_nom) inferred.add(shortenMatiere(q.matiere_nom));
    else if (q.quiz_titre) inferred.add(q.quiz_titre);
  });

  const trackedLabel = (!isAccueilLabel(c.current_module) ? c.current_module : null)
    || sessionActs.find((a) => a.action_type === "open_module")?.module_nom
    || sessionActs[0]?.module_nom
    || null;
  const moduleLabel = trackedLabel || (inferred.size > 0 ? `${[...inferred].join(", ")} (déduit)` : null);

  return {
    modules_consultes: [moduleLabel || NO_MODULE_LABEL],
    quiz_realises: quizRealises,
    cours_exercices: coursExercices,
  };
}

/** Enrichit une liste de connexions pour le PDF du relevé. */
export function enrichConnexionRows<T extends ConnexionLike>(
  connexions: T[],
  activites: ActiviteLike[],
  quizzes: QuizLike[],
  exos: ExoLike[],
): (T & ConnexionDetail)[] {
  return connexions.map((c) => ({ ...c, ...computeConnexionDetail(c, activites, quizzes, exos) }));
}
