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

/** Same-attempt proof: result answers must match that attempt; missing proof is unreliable. */
export function verifierPassageV2(core: CoreMatiereState, reponsesLigne: unknown): "fiable" | "non_fiable" | "non_verifiable" {
  if (!reponsesLigne || typeof reponsesLigne !== "object" || Array.isArray(reponsesLigne)) return "non_verifiable";
  const source = core.resultId ? core.historicalDetails?.reponses : core.answers;
  if (!source) return "non_verifiable";
  const nonVides = Object.values(reponsesLigne as Record<string, unknown>).some((v) => normaliserValeurReponse(v) != null);
  if (!nonVides) return "non_verifiable";
  const moteur = core.resultId ? Object.fromEntries(Object.entries(source).map(([id, v]) => [`${core.matiereId}:${id}`, v])) : source;
  if (estPassageNonFiable(core.matiereId, reponsesLigne as Record<string, unknown>, moteur)) return "non_fiable";
  if (core.qrcTotal > 0 && (!core.qrcProofs || core.qrcProofs.length !== core.qrcTotal)) return "non_verifiable";
  for (const q of core.qrcProofs ?? []) {
    const id = q.questionId.startsWith(`${core.matiereId}:`) ? q.questionId.slice(core.matiereId.length + 1) : q.questionId;
    if (!Object.prototype.hasOwnProperty.call(reponsesLigne, id)) return "non_verifiable";
    if (normaliserValeurReponse((reponsesLigne as Record<string, unknown>)[id]) !== normaliserValeurReponse(q.reponse)) return "non_fiable";
  }
  return "fiable";
}

export function verifierContenuPassage(core: CoreMatiereState, details: any): boolean {
  const legacy = details?.snapshot?.questions ?? details?.questions;
  const moteur = core.resultId ? core.historicalDetails?.snapshot?.questions ?? core.historicalDetails?.questions : core.questions;
  if (!Array.isArray(legacy) || !legacy.length || !Array.isArray(moteur) || !moteur.length) return false;
  const key = (q: any) => String(q.questionId ?? q.id ?? "").replace(`${core.matiereId}:`, "");
  const same = (a: any, b: any) => String(a.type).toUpperCase() === String(b.type).toUpperCase() && String(a.enonce ?? "").trim() === String(b.enonce ?? "").trim()
    && JSON.stringify(a.choix ?? []) === JSON.stringify(b.choix ?? [])
    && String(a.image ?? "") === String(b.image ?? "");
  return legacy.length === moteur.length && legacy.every((q: any) => {
    const matches = moteur.filter((m: any) => key(m) === key(q));
    return matches.length === 1 && same(q, matches[0]);
  });
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
    (list || []).forEach((s) => { if (!s.resultId) candidats.push({ apprenantId, s }); });
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
    // Enrich the precise attempt. Comparison is made against EACH result's
    // frozen answers in attacherSourceUnique, never a mutable EB__subject row.
    candidats.forEach(({ s }) => { s.answers = moteur.get(s.attemptId) || {}; });
    return out;
  } catch (e) {
    console.warn("[passagesV2NonFiables] lecture impossible:", e);
    return null;
  }
}
