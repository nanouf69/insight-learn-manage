/**
 * Barème of the future Bilan examen = EXACTLY the barème of the matching Examen Blanc N°1
 * (EB1 for VTC module 5, EB1-TAXI for TAXI module 11), read from the active EB definitions.
 * Same functions as the EB engine: points per QCM (getPointsParQuestion), note /20
 * (normalizeNoteSur20), elimination (computeAdmisForMatiere), weighted average (computeMoyenneExamen).
 * Display only: never changes a submission, a stored count or the EB configuration.
 */
import { getPointsParQuestion, type ExamenBlanc, type Matiere } from "@/components/cours-en-ligne/examens-blancs-data";
import { normalizeNoteSur20, computeAdmisForMatiere } from "@/components/cours-en-ligne/examens-blancs-utils";
import { computeMoyenneExamen, seuilEliminatoireFiable } from "@/components/cours-en-ligne/examens-blancs-scoring";

/** Future subject index (0..4) → EB1 subject id. */
export const BILAN_FUTURE_MATIERE_EB1 = ["t3p", "gestion", "securite", "francais", "anglais"] as const;
export const examenReferenceBilan = (moduleId: 5 | 11) => (moduleId === 5 ? "EB1" : "EB1-TAXI");

export type BaremeMatiere = { matiere: Matiere; coefficient: number; seuil: number | null; ptsQcm: number };
export type NoteMatiere = BaremeMatiere & { points: number; maxPoints: number; noteSur20: number; admis: boolean; seuilInconnu: boolean };

/** Null when the reference EB1 or one of its five subjects is missing (never invented). */
export function baremeReference(examens: ExamenBlanc[], moduleId: 5 | 11): BaremeMatiere[] | null {
  const eb = examens.find(e => e?.id === examenReferenceBilan(moduleId));
  if (!eb) return null;
  const out: BaremeMatiere[] = [];
  for (const id of BILAN_FUTURE_MATIERE_EB1) {
    const m = eb.matieres.find(x => x?.id === id);
    if (!m || !(Number(m.coefficient) > 0)) return null;
    out.push({ matiere: m, coefficient: Number(m.coefficient), seuil: seuilEliminatoireFiable(m.noteEliminatoire), ptsQcm: getPointsParQuestion(m.id, "QCM", m) });
  }
  return out;
}

/** Bilan subjects are QCM only: each exact answer earns the EB1 QCM points of that subject. */
export function noterMatiere(b: BaremeMatiere, correct: number, total: number): NoteMatiere {
  const points = correct * b.ptsQcm, maxPoints = total * b.ptsQcm;
  const noteSur20 = normalizeNoteSur20(points, maxPoints);
  const seuilInconnu = b.seuil == null;
  const admis = !seuilInconnu && computeAdmisForMatiere(points, maxPoints, b.seuil, 20, false);
  return { ...b, points, maxPoints, noteSur20, admis, seuilInconnu };
}

/** Weighted average over the five Bilan subjects, same rule as EB (verdict incomplete until all are submitted). */
export function moyenneBilan(bareme: BaremeMatiere[], notes: (NoteMatiere | null)[]) {
  const examen = { id: "bilan-future", matieres: bareme.map(b => b.matiere) } as unknown as ExamenBlanc;
  return computeMoyenneExamen(examen, m => {
    const n = notes[bareme.findIndex(b => b.matiere === m)];
    return n ? { scoreObtenu: n.points, scoreMax: n.maxPoints, noteSur20: n.noteSur20, admis: n.admis, passee: true, seuilInconnu: n.seuilInconnu } as any : null;
  });
}
