/**
 * Generic "current key" projection of a SUBMITTED legacy Bilan snapshot (modules 5/11).
 * Pure + read-only. Identity = snapshot uid; options mapped only by exact text proof.
 * Recalculated note is displayed beside the original, never replaces it; practice
 * answers drive only the training result, never the exam note.
 */
import { reponseExacte } from "@/lib/bilanFutureCorrection";

/** Server reader not installed (docs/sql-revue/2026-11-12-bilan-corrige-actuel.sql). */
export const BILAN_CORRIGE_ACTUEL_ACTIF = false;

type Choix = { lettre: string; texte: string; correct?: boolean };
type Q = { uid?: string; type?: string | null; enonce?: string; choix?: Choix[]; bareme?: unknown; reponseQRC?: unknown };
export type LigneLue = { uid: string | null; cle: string; frozen: Q; current: Q | null; matches: number; submitted: unknown; practice?: unknown };
export type Statut = "ok" | "supprimee" | "ambigue" | "sans_identite" | "type_change" | "options_non_prouvees" | "sans_corrige" | "qrc_a_reverifier";
export type QuestionActuelle = {
  uid: string | null; cle: string; statut: Statut;
  enonce: string; choix: { lettre: string; texte: string }[]; // current content, frozen letters
  correct: string[]; submitted: string[]; practice: string[];
  submittedJuste: boolean | null; practiceJuste: boolean | null;
};

const canon = (t: unknown) => String(t ?? "").normalize("NFC").replace(/\s+/g, " ").trim();
const arr = (a: unknown): string[] => Array.isArray(a) ? a.map(String) : typeof a === "string" && a ? [a] : [];
const isQcm = (q: Q) => (q.type ?? "QCM") === "QCM";

/** Bijective frozen-letter → current-letter mapping by exact (normalised) option text. */
export function mapperOptions(frozen: Choix[] = [], current: Choix[] = []): Map<string, string> | null {
  if (!frozen.length || frozen.length !== current.length) return null;
  const m = new Map<string, string>(); const used = new Set<string>();
  for (const f of frozen) {
    const hits = current.filter(c => canon(c.texte) === canon(f.texte));
    if (hits.length !== 1 || used.has(hits[0].lettre)) return null;
    used.add(hits[0].lettre); m.set(f.lettre, hits[0].lettre);
  }
  return m;
}

export function projeterQuestion(l: LigneLue): QuestionActuelle {
  const submitted = arr(l.submitted), practice = l.practice === undefined || l.practice === null ? submitted : arr(l.practice);
  const base = { uid: l.uid, cle: l.cle, enonce: canon(l.frozen.enonce), choix: (l.frozen.choix ?? []).map(c => ({ lettre: c.lettre, texte: c.texte })), correct: [] as string[], submitted, practice, submittedJuste: null, practiceJuste: null };
  const no = (statut: Statut): QuestionActuelle => ({ ...base, statut });
  if (!l.uid) return no("sans_identite");
  if (l.matches === 0) return no("supprimee");
  if (l.matches !== 1 || !l.current || l.current.uid !== l.uid) return no("ambigue");
  if (isQcm(l.frozen) !== isQcm(l.current)) return no("type_change");
  if (!isQcm(l.frozen)) return no("qrc_a_reverifier");
  const map = mapperOptions(l.frozen.choix, l.current.choix);
  if (!map) return no("options_non_prouvees");
  const inverse = new Map([...map].map(([f, c]) => [c, f]));
  const correct = (l.current.choix ?? []).filter(c => c.correct === true).map(c => inverse.get(c.lettre)!).sort();
  if (!correct.length) return no("sans_corrige");
  const textes = new Map((l.current.choix ?? []).map(c => [inverse.get(c.lettre)!, c.texte]));
  return { ...base, statut: "ok", enonce: canon(l.current.enonce), choix: base.choix.map(c => ({ lettre: c.lettre, texte: textes.get(c.lettre) ?? c.texte })),
    correct, submittedJuste: reponseExacte(submitted, correct), practiceJuste: reponseExacte(practice, correct) };
}

export type Projection = {
  questions: QuestionActuelle[];
  noteRecalculee: { juste: number; total: number; sur20: number } | null; // null = incomplete, never 0
  aReverifier: number; nonRapprochees: number;
  fausses: QuestionActuelle[]; // training list (current key + latest practice)
};

export function projeterCopie(lignes: LigneLue[]): Projection {
  const questions = lignes.map(projeterQuestion);
  const ok = questions.filter(q => q.statut === "ok");
  const aReverifier = questions.filter(q => q.statut === "qrc_a_reverifier").length;
  const nonRapprochees = questions.length - ok.length - aReverifier;
  const juste = ok.filter(q => q.submittedJuste).length;
  const complet = ok.length > 0 && ok.length === questions.length;
  return { questions, aReverifier, nonRapprochees,
    noteRecalculee: complet ? { juste, total: ok.length, sur20: Math.round((juste / ok.length) * 200) / 10 } : null,
    fausses: ok.filter(q => !q.practiceJuste) };
}

/** Strict reader: refuses malformed payloads (error ≠ empty). */
export function lireCorrigeActuel(data: any, snapshotId: string): { lignes: LigneLue[]; editorAt: string; originalScore: number | null } | null {
  if (!data || data.snapshot_id !== snapshotId || !Array.isArray(data.questions) || !data.editor_at) return null;
  return { editorAt: String(data.editor_at), originalScore: data.original_score == null ? null : Number(data.original_score),
    lignes: data.questions.map((r: any) => ({ uid: r.uid ?? null, cle: String(r.cle), frozen: r.frozen ?? {}, current: r.current ?? null, matches: Number(r.matches ?? 0), submitted: r.submitted, practice: r.practice })) };
}
