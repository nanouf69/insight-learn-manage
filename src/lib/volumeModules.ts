/**
 * Volume pédagogique d'un module (lecture seule, aucun effet de bord).
 * unités = 4 × pages/supports + 1 × question active.
 * Questions : recomptées à chaque lecture depuis le contenu EFFECTIF
 * (module_editor_state fusionné avec le contenu par défaut du code, même
 * fusion que l'écran élève). Pages : base d'audit séparée (voir
 * jalonsPagesBaseline.ts), jamais recomptées automatiquement.
 */
import { mergeSourceExercices } from "@/components/cours-en-ligne/examens-blancs-utils";

export interface EditorRowLite { module_id: number; module_data: any; deleted_exercices?: any }
export interface ModuleContentLite { cours?: any[]; exercices?: any[] }

const actif = (x: any) => !!x && x.actif !== false;

/** Contenu effectif : ligne enregistrée prioritaire, contenu par défaut du code sinon. */
export function contenuEffectif(initial: ModuleContentLite | null, row: EditorRowLite | null | undefined): ModuleContentLite {
  const init = initial ?? { cours: [], exercices: [] };
  const md = row?.module_data;
  if (!md || typeof md !== "object") return { cours: init.cours ?? [], exercices: init.exercices ?? [] };
  const deleted = (Array.isArray(row?.deleted_exercices) ? row!.deleted_exercices : [])
    .map((e: any) => Number(e?.id ?? e)).filter((n: number) => !Number.isNaN(n));
  const exDb = Array.isArray(md.exercices) ? md.exercices : null;
  const exercices = exDb ? mergeSourceExercices(exDb as any[], (init.exercices ?? []) as any[], deleted) : (init.exercices ?? []);
  const cours = Array.isArray(md.cours) ? md.cours : (init.cours ?? []);
  return { cours, exercices };
}

/** Questions actives : exercices actifs + quiz intégrés des cours actifs ; supprimées / désactivées exclues. */
export function compterQuestionsActives(c: ModuleContentLite): { exercices: number; inline: number; total: number } {
  let exercices = 0;
  for (const e of c.exercices ?? []) {
    if (!actif(e) || !Array.isArray(e.questions)) continue;
    const del = new Set((Array.isArray(e.deletedQuestionIds) ? e.deletedQuestionIds : []).map(Number));
    exercices += e.questions.filter((q: any) => actif(q) && q.masque !== true && q.suppressed !== true && !del.has(Number(q.id))).length;
  }
  let inline = 0;
  for (const co of c.cours ?? []) {
    if (!actif(co) || !Array.isArray(co.quiz)) continue;
    inline += co.quiz.filter((q: any) => actif(q) && q.masque !== true && q.suppressed !== true).length;
  }
  return { exercices, inline, total: exercices + inline };
}

/** Empreinte des supports enregistrés (cours actifs, fichiers, slides) pour détecter un remplacement depuis l'audit. */
export function empreinteSupports(row: EditorRowLite | null | undefined): string | null {
  const cours = row?.module_data?.cours;
  if (!Array.isArray(cours)) return null; // aucun support enregistré : contenu par défaut du code
  const parts = cours.filter(actif).map((c: any) => [
    Number(c.id),
    String(c.slidesKey ?? ""),
    (Array.isArray(c.fichiers) ? c.fichiers : []).map((f: any) => String(f?.url ?? f?.nom ?? "")).sort().join(","),
    Array.isArray(c.images) ? c.images.length : 0,
  ].join("|")).sort();
  let h = 5381;
  const s = parts.join("#");
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return `${parts.length}:${(h >>> 0).toString(16)}`;
}

/** Examens blancs : les 6 premiers examens du type (par numéro), chaque épreuve une fois. */
export function compterQuestionsExamensBlancs(examens: Array<{ type: string; numero: number; matieres?: any[] }>, type: string, n = 6): { examens: number; questions: number } {
  const liste = examens.filter((e) => e?.type === type).sort((a, b) => Number(a.numero) - Number(b.numero)).slice(0, n);
  const questions = liste.reduce((s, e) => s + (e.matieres ?? []).reduce((t: number, m: any) => t + (Array.isArray(m?.questions) ? m.questions.filter(actif).length : 0), 0), 0);
  return { examens: liste.length, questions };
}
