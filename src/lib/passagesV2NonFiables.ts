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
  const text = (v: unknown) => String(v ?? "").trim();
  // Snapshot formats use zero/one-based ordre. Compare relative order, not its base.
  const ordered = (qs: any[]) => qs.every((q) => Number.isFinite(q.ordre))
    ? [...qs].sort((a, b) => a.ordre - b.ordre) : qs;
  const left = ordered(legacy), right = ordered(moteur);
  const sameChoices = (a: any, b: any) => {
    if (!Array.isArray(a.choix) || !Array.isArray(b.choix) || !a.choix.length || a.choix.length !== b.choix.length) return false;
    // Native snapshots omit false, but MUST retain at least one explicit true.
    // No choices in buildQuestionDetails is missing evidence, never an empty set.
    if (!a.choix.some((c: any) => c.correct === true) || !b.choix.some((c: any) => c.correct === true)) return false;
    return a.choix.every((c: any, i: number) => {
      const d = b.choix[i];
      return text(c.lettre) === text(d.lettre) && text(c.texte) === text(d.texte)
        && (c.correct === true) === (d.correct === true);
    });
  };
  const same = (a: any, b: any) => {
    const type = text(a.type).toUpperCase();
    if (type !== text(b.type).toUpperCase() || !text(a.enonce) || text(a.enonce) !== text(b.enonce)
      || text(a.image) !== text(b.image)) return false;
    if (type === "QCM") return sameChoices(a, b);
    if (type === "QRC") return text(a.reponseQRC) === text(b.reponseQRC);
    return false;
  };
  return left.length === right.length && new Set(left.map(key)).size === left.length
    && new Set(right.map(key)).size === right.length
    && left.every((q: any, i: number) => key(q) === key(right[i]) && same(q, right[i]));
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
