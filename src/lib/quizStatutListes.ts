/**
 * Listes nominatives des quiz d'un module (tableau de bord ET détail du module).
 * Groupe 1 : quiz confirmés par le serveur (tentative d'origine remise, ou module
 * validé par le verdict serveur). Groupe 2 : quiz en attente ou indisponibles, chacun
 * avec un état exact. « non répondu » n'est affiché que si le serveur a été lu sans
 * erreur et ne contient aucune réponse ; une erreur de lecture ne devient jamais un succès.
 */
import { hasRecordedAnswer } from "@/lib/moduleCompletionEvidence";

export type StatutQuizEnAttente = "non_repondu" | "non_confirme" | "indisponible" | "non_verifiable";

export const TITRE_QUIZ_CONFIRMES = "Quiz confirmés par le serveur";
export const TITRE_QUIZ_EN_ATTENTE = "Quiz en attente ou indisponibles";
export const LIBELLES_STATUT_QUIZ: Record<StatutQuizEnAttente, string> = {
  non_repondu: "non répondu",
  non_confirme: "réponses présentes, non confirmées par le serveur",
  indisponible: "quiz exigé mais indisponible à l'écran — contactez le centre",
  non_verifiable: "état non vérifiable : lecture du serveur impossible, réessayez",
};

export interface QuizRef { id: string; label: string }
export interface QuizEnAttente extends QuizRef { statut: StatutQuizEnAttente }
export interface ListesQuiz { lisible: boolean; confirmes: QuizRef[]; enAttente: QuizEnAttente[] }

/** Lignes serveur du compte pour un module : tentatives d'origine uniquement (jamais les révisions). */
export interface LigneReponseServeur { apprenant_id?: string; exercice_id: string; status?: string | null; submitted_at?: string | null; reponses?: unknown }
export interface EtatServeurQuizModule { soumis: Set<string>; reponsesNonRemises: Map<string, number> }

export function etatServeurQuizModule(lignes: readonly LigneReponseServeur[], moduleId: number, apprenantId: string): EtatServeurQuizModule {
  const soumis = new Set<string>();
  const reponsesNonRemises = new Map<string, number>();
  for (const l of lignes) {
    if (l.apprenant_id !== undefined && l.apprenant_id !== apprenantId) continue;
    const m = /^module_(\d+)_exo_(\d+)$/.exec(l.exercice_id ?? "");
    if (!m || Number(m[1]) !== Number(moduleId)) continue;
    const ex = m[2];
    if (l.status === "submitted" && l.submitted_at) { soumis.add(ex); continue; }
    const rep = l.reponses && typeof l.reponses === "object" && !Array.isArray(l.reponses) ? l.reponses as Record<string, unknown> : {};
    const n = Object.entries(rep).filter(([k, v]) => k.startsWith(`${ex}-`) && hasRecordedAnswer(v)).length;
    reponsesNonRemises.set(ex, (reponsesNonRemises.get(ex) ?? 0) + n);
  }
  return { soumis, reponsesNonRemises };
}

export function listesQuizModule(p: {
  requis: readonly QuizRef[];
  /** Lecture serveur réussie, ou null si elle a échoué. */
  serveur: EtatServeurQuizModule | null;
  /** Verdict serveur du module (etat_completion_modules) : complet = tous confirmés. */
  moduleConfirme?: boolean;
  /** Quiz réellement affichables à l'écran ; absent = inconnu (aucun « indisponible » affirmé). */
  affichables?: ReadonlySet<string>;
  /** Réponses présentes sur cet appareil (file locale) par quiz. */
  reponsesLocales?: (id: string) => number;
}): ListesQuiz {
  const vus = new Set<string>();
  const requis = p.requis.filter((q) => (vus.has(String(q.id)) ? false : (vus.add(String(q.id)), true)));
  if (!p.serveur) {
    return { lisible: false, confirmes: [], enAttente: requis.map((q) => ({ ...q, statut: "non_verifiable" })) };
  }
  if (p.moduleConfirme) return { lisible: true, confirmes: [...requis], enAttente: [] };
  const confirmes: QuizRef[] = [];
  const enAttente: QuizEnAttente[] = [];
  for (const q of requis) {
    const id = String(q.id);
    if (p.serveur.soumis.has(id)) { confirmes.push(q); continue; }
    if (p.affichables && !p.affichables.has(id)) { enAttente.push({ ...q, statut: "indisponible" }); continue; }
    const present = (p.serveur.reponsesNonRemises.get(id) ?? 0) > 0 || (p.reponsesLocales?.(id) ?? 0) > 0;
    enAttente.push({ ...q, statut: present ? "non_confirme" : "non_repondu" });
  }
  return { lisible: true, confirmes, enAttente };
}

export function libelleQuiz(q: QuizRef): string {
  return q.label && q.label !== q.id ? `« ${q.label} »` : `quiz n° ${q.id}`;
}

/** Texte complet (messages de blocage) : les deux groupes, titres et états exacts. */
export function texteListesQuiz(l: ListesQuiz): string {
  const c = l.confirmes.length ? l.confirmes.map(libelleQuiz).join(", ") : "aucun";
  const a = l.enAttente.map((q) => `${libelleQuiz(q)} (${LIBELLES_STATUT_QUIZ[q.statut]})`).join(", ");
  return `${TITRE_QUIZ_CONFIRMES} (${l.confirmes.length}) : ${c}. ${TITRE_QUIZ_EN_ATTENTE} (${l.enAttente.length}) : ${a || "aucun"}.`;
}
