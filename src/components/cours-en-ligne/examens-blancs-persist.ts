/**
 * Règles pures de sauvegarde de l'éditeur d'examens blancs.
 *
 * Incident 12/11/2026 (EB4 VTC + EB4 VA, F(V) Q13) : après une sauvegarde,
 * l'examen « frère » (même numéro, matière partagée) gardait dans l'affichage
 * son ancienne matière alors que la base avait reçu la nouvelle. La
 * sauvegarde suivante prenait cette copie périmée pour une modification et la
 * recopiait sur les deux examens (écriture A→B puis B→A en ~1 s).
 */
import { getMatiereSyncKey } from "./examens-blancs-sync-scope";
import type { ExamenBlanc, Matiere } from "./examens-blancs-data";

type ModuleIdDe = (examId: string) => number;

/** Date la plus récente de modification réelle portée par la matière ou ses questions. */
export function horodatageMatiere(m: unknown): number {
  const mat = m as { _editedAt?: string; questions?: Array<{ _editedAt?: string } | null> } | null;
  let max = Number.NEGATIVE_INFINITY;
  const prendre = (v: unknown) => {
    const t = typeof v === "string" ? Date.parse(v) : NaN;
    if (Number.isFinite(t) && t > max) max = t;
  };
  prendre(mat?._editedAt);
  for (const q of mat?.questions ?? []) prendre(q?._editedAt);
  return max;
}

const sansHorodatage = (m: unknown) => {
  if (!m || typeof m !== "object") return m;
  const { _editedAt, ...rest } = m as Record<string, unknown>;
  return rest;
};
const memeContenu = (a: unknown, b: unknown) => JSON.stringify(sansHorodatage(a)) === JSON.stringify(sansHorodatage(b));

export type ChoixModifications = {
  modifiees: Map<string, Matiere>;
  /** Copies périmées ignorées (jamais écrites). */
  perimees: Array<{ examId: string; matiereId: string }>;
};

/**
 * Détermine, par matière partagée, la SEULE version à enregistrer.
 * - candidate = matière différente de la dernière version enregistrée de SON module ;
 * - une candidate plus ancienne que la dernière version enregistrée d'un examen frère est périmée ;
 * - plusieurs candidates : la modification réelle la plus récente l'emporte (ordre d'affichage indifférent).
 */
export function choisirMatieresModifiees(
  examens: ExamenBlanc[],
  empreintes: Record<number, string>,
  moduleIdDe: ModuleIdDe,
): ChoixModifications {
  const enregistrees = new Map<string, Matiere[]>();
  const candidates = new Map<string, Array<{ examId: string; m: Matiere }>>();
  for (const ex of examens) {
    const emp = empreintes[moduleIdDe(ex.id)];
    if (emp === undefined) continue;
    let avant: Matiere[] = [];
    try { avant = JSON.parse(emp) as Matiere[]; } catch { continue; }
    for (const a of avant) {
      if (!a?.id) continue;
      const k = getMatiereSyncKey(ex.id, a.id);
      enregistrees.set(k, [...(enregistrees.get(k) ?? []), a]);
    }
    for (const m of ex.matieres ?? []) {
      if (!m?.id) continue;
      const before = avant.find((p) => p?.id === m.id);
      if (before && memeContenu(before, m)) continue;
      const k = getMatiereSyncKey(ex.id, m.id);
      candidates.set(k, [...(candidates.get(k) ?? []), { examId: ex.id, m }]);
    }
  }
  const modifiees = new Map<string, Matiere>();
  const perimees: ChoixModifications["perimees"] = [];
  candidates.forEach((liste, k) => {
    const referenceServeur = Math.max(Number.NEGATIVE_INFINITY, ...(enregistrees.get(k) ?? []).map(horodatageMatiere));
    let gagnant: { examId: string; m: Matiere } | null = null;
    for (const c of liste) {
      const ts = horodatageMatiere(c.m);
      // Plus ancienne que la dernière version enregistrée de la matière partagée :
      // copie d'affichage en retard, jamais une saisie (toute saisie est horodatée).
      if (ts < referenceServeur) {
        perimees.push({ examId: c.examId, matiereId: c.m.id });
        continue;
      }
      if (!gagnant || ts > horodatageMatiere(gagnant.m)) gagnant = c;
    }
    if (gagnant) modifiees.set(k, gagnant.m);
  });
  return { modifiees, perimees };
}

/**
 * Après une écriture confirmée : remplace dans l'état affiché chaque matière
 * restée identique à celle envoyée par la version enregistrée (y compris les
 * examens frères), sans jamais écraser une saisie faite pendant l'écriture.
 */
export function reconcilierApresSauvegarde(
  actuel: ExamenBlanc[],
  envoye: ExamenBlanc[],
  enregistre: ExamenBlanc[],
): ExamenBlanc[] {
  let change = false;
  const res = actuel.map((ex) => {
    const src = envoye.find((e) => e.id === ex.id);
    const dst = enregistre.find((e) => e.id === ex.id);
    if (!src || !dst) return ex;
    let exChange = false;
    const matieres = (ex.matieres ?? []).map((m) => {
      const s = src.matieres?.find((x) => x?.id === m?.id);
      const d = dst.matieres?.find((x) => x?.id === m?.id);
      if (!s || !d) return m;
      if (JSON.stringify(m) !== JSON.stringify(s)) return m; // saisie plus récente : conservée
      if (JSON.stringify(m) === JSON.stringify(d)) return m;
      exChange = true;
      return JSON.parse(JSON.stringify(d)) as Matiere;
    });
    if (!exChange) return ex;
    change = true;
    return { ...ex, matieres };
  });
  return change ? res : actuel;
}

/** Contenu pédagogique comparé à la relecture serveur (ordre des clés indifférent). */
export function empreinteContenu(matieres: unknown): string {
  const list = Array.isArray(matieres) ? matieres : [];
  return JSON.stringify(list.map((m: any) => ({
    id: m?.id ?? null,
    questions: (Array.isArray(m?.questions) ? m.questions : []).map((q: any) => ({
      id: q?.id ?? null,
      type: q?.type ?? null,
      enonce: q?.enonce ?? null,
      reponseQRC: q?.reponseQRC ?? null,
      choix: Array.isArray(q?.choix)
        ? q.choix.map((c: any) => ({ lettre: c?.lettre ?? null, texte: c?.texte ?? null, correct: !!(c?.correct ?? c?.correcte) }))
        : null,
    })),
  })));
}

/** Écrit un nouveau texte de proposition sans toucher à la bonne réponse ni aux points. */
export function remplacerTexteProposition<Q extends { choix?: Array<{ texte: string }> }>(q: Q, index: number, texte: string): Q {
  if (!Array.isArray(q.choix) || index < 0 || index >= q.choix.length) return q;
  return { ...q, choix: q.choix.map((c, i) => (i === index ? { ...c, texte } : c)) };
}
