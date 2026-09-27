import { supabase } from "@/integrations/supabase/client";
import type { CoreMatiereState } from "@/lib/coreExamPublication";

/**
 * PASSAGES DU NOUVEAU MOTEUR « NON FIABLES » (défaut de synchronisation du 23/09).
 *
 * Depuis le 23/09, le nouveau moteur a parfois gardé seulement la première valeur
 * d'une réponse (souvent un début de texte QRC). Un passage est « non fiable »
 * quand au moins une réponse enregistrée dans la fiche de l'élève
 * (reponses_apprenants) est absente ou différente dans le nouveau moteur.
 *
 * Repérage UNIQUEMENT à l'affichage : aucune écriture, aucune correction,
 * aucune donnée recopiée. Les passages copiés depuis l'ancien système
 * (resultId renseigné) ne sont jamais concernés.
 */
export const DEBUT_DEFAUT_SYNCHRO_V2 = "2026-09-23T00:00:00Z";

export const MENTION_NOTE_RECALCULEE = "note recalculée depuis les réponses complètes";

/** Valeur de réponse normalisée pour comparaison (tableau trié ou texte rogné). */
export function normaliserValeurReponse(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (Array.isArray(v)) {
    const items = v.map((x) => String(x ?? "").trim()).filter(Boolean).sort();
    return items.length ? items.join("+") : null;
  }
  if (typeof v === "object") return JSON.stringify(v);
  const s = String(v).trim();
  return s.length ? s : null;
}

/** Passage concerné par le défaut : nouveau moteur natif terminé depuis le 23/09. */
export function estPassageConcerne(s: Pick<CoreMatiereState, "finishedAt" | "resultId">): boolean {
  if (s.resultId) return false;
  const t = new Date(s.finishedAt).getTime();
  return Number.isFinite(t) && t >= new Date(DEBUT_DEFAUT_SYNCHRO_V2).getTime();
}

/**
 * Fonction pure : true si au moins une réponse non vide de la fiche élève est
 * absente ou différente dans le nouveau moteur.
 * - `reponsesFiche` : clés « 1 », « 2 »… (reponses_apprenants.reponses)
 * - `reponsesMoteur` : clés « matiere:1 »… (answer_state.question_id)
 */
export function estPassageNonFiable(
  matiereId: string,
  reponsesFiche: Record<string, unknown> | null | undefined,
  reponsesMoteur: Record<string, unknown>,
): boolean {
  if (!reponsesFiche) return false;
  for (const [k, v] of Object.entries(reponsesFiche)) {
    const fiche = normaliserValeurReponse(v);
    if (fiche == null) continue;
    const moteur = normaliserValeurReponse(reponsesMoteur[`${matiereId}:${k}`]);
    if (moteur !== fiche) return true;
  }
  return false;
}

/**
 * Lecture seule. Renvoie les identifiants de passages non fiables, ou null si la
 * lecture est impossible (l'écran doit alors afficher « Note en attente »).
 */
export async function fetchPassagesV2NonFiables(
  statesParApprenant: Map<string, CoreMatiereState[]>,
): Promise<Set<string> | null> {
  const out = new Set<string>();
  const candidats: { apprenantId: string; s: CoreMatiereState }[] = [];
  statesParApprenant.forEach((list, apprenantId) => {
    (list || []).forEach((s) => { if (estPassageConcerne(s)) candidats.push({ apprenantId, s }); });
  });
  if (candidats.length === 0) return out;
  try {
    const PAGE = 1000;
    const moteur = new Map<string, Record<string, unknown>>();
    const attemptIds = candidats.map((c) => c.s.attemptId);
    for (let i = 0; i < attemptIds.length; i += 100) {
      const chunk = attemptIds.slice(i, i + 100);
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
          .from("answer_state" as any)
          .select("attempt_id, question_id, valeur")
          .in("attempt_id", chunk)
          .range(from, from + PAGE - 1);
        if (error) throw error;
        ((data as any[]) || []).forEach((r) => {
          const m = moteur.get(r.attempt_id) || {};
          m[String(r.question_id)] = r.valeur;
          moteur.set(r.attempt_id, m);
        });
        if (!data || data.length < PAGE) break;
      }
    }
    const fiche = new Map<string, { reponses: Record<string, unknown>; updatedAt: string }>();
    const apprenantIds = Array.from(new Set(candidats.map((c) => c.apprenantId)));
    const exerciceIds = Array.from(new Set(candidats.map((c) => `${c.s.examId}__${c.s.matiereId}`)));
    for (let i = 0; i < apprenantIds.length; i += 100) {
      const chunk = apprenantIds.slice(i, i + 100);
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
          .from("reponses_apprenants")
          .select("apprenant_id, exercice_id, reponses, updated_at")
          .in("apprenant_id", chunk)
          .in("exercice_id", exerciceIds)
          .range(from, from + PAGE - 1);
        if (error) throw error;
        ((data as any[]) || []).forEach((r) => {
          const key = `${r.apprenant_id}|${r.exercice_id}`;
          const prev = fiche.get(key);
          if (!prev || String(r.updated_at) > prev.updatedAt) {
            fiche.set(key, { reponses: (r.reponses as any) || {}, updatedAt: String(r.updated_at) });
          }
        });
        if (!data || data.length < PAGE) break;
      }
    }
    candidats.forEach(({ apprenantId, s }) => {
      const f = fiche.get(`${apprenantId}|${s.examId}__${s.matiereId}`);
      if (f && estPassageNonFiable(s.matiereId, f.reponses, moteur.get(s.attemptId) || {})) out.add(s.attemptId);
    });
    return out;
  } catch (e) {
    console.warn("[passagesV2NonFiables] lecture impossible:", e);
    return null;
  }
}
