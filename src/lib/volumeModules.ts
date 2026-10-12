/**
 * Volume pédagogique d'un module (lecture seule, aucun effet de bord).
 * unités = 4 × pages/supports + 1 × question active.
 * Questions : recomptées à chaque lecture depuis le contenu EFFECTIF
 * (module_editor_state fusionné avec le contenu par défaut du code, même
 * fusion que l'écran élève). Pages : base d'audit séparée (voir
 * jalonsPagesBaseline.ts), jamais recomptées automatiquement.
 */
import { mergeSourceExercices } from "@/components/cours-en-ligne/examens-blancs-utils";

export interface EditorRowLite { module_id: number; module_data: any; deleted_exercices?: any; deleted_cours?: any }
export interface ModuleContentLite { cours?: any[]; exercices?: any[]; masquees?: Set<string> }

const ids = (v: any) => new Set((Array.isArray(v) ? v : []).map((e: any) => Number(e?.id ?? e)).filter((n: number) => !Number.isNaN(n)));

/** Même réinjection que l'écran élève : seulement slidesKey/fichiers depuis la source, jamais le quiz. */
function reinjecterMetaCours(dbCours: any[], src: any[]): any[] {
  const parId = new Map(src.map((c) => [Number(c?.id), c]));
  return dbCours.map((c) => {
    const s = parId.get(Number(c?.id));
    if (!s) return c;
    const n = { ...c };
    if (!n.slidesKey && s.slidesKey) n.slidesKey = s.slidesKey;
    if ((!Array.isArray(n.fichiers) || n.fichiers.length === 0) && Array.isArray(s.fichiers) && s.fichiers.length) n.fichiers = s.fichiers;
    return n;
  });
}

const actif = (x: any) => !!x && x.actif !== false;

/** Contenu effectif : ligne enregistrée prioritaire, contenu par défaut du code sinon. */
export function contenuEffectif(initial: ModuleContentLite | null, row: EditorRowLite | null | undefined): ModuleContentLite {
  const init = initial ?? { cours: [], exercices: [] };
  const md = row?.module_data;
  if (!md || typeof md !== "object") return { cours: init.cours ?? [], exercices: init.exercices ?? [] };
  const deleted = [...ids(row?.deleted_exercices)];
  const coursSupprimes = ids(row?.deleted_cours);
  // Questions retirées des bilans (archive questions_masquees_bilan) : jamais comptées.
  const masquees = new Set<string>();
  for (const m of Array.isArray(md.questions_masquees_bilan) ? md.questions_masquees_bilan : []) {
    const q = m?.question;
    if (q?.uid) masquees.add(`uid:${q.uid}`);
    if (q?.id != null && m?.exercice_id != null) masquees.add(`${m.exercice_id}:${q.id}`);
  }
  const exDb = Array.isArray(md.exercices) ? md.exercices : null;
  const exercices = exDb ? mergeSourceExercices(exDb as any[], (init.exercices ?? []) as any[], deleted) : (init.exercices ?? []);
  const cours = (Array.isArray(md.cours) ? reinjecterMetaCours(md.cours, init.cours ?? []) : (init.cours ?? []))
    .filter((c: any) => !coursSupprimes.has(Number(c?.id)));
  return { cours, exercices, masquees };
}

/** Questions actives : exercices actifs + quiz intégrés des cours actifs ; supprimées / désactivées exclues. */
export function compterQuestionsActives(c: ModuleContentLite): { exercices: number; inline: number; total: number } {
  let exercices = 0;
  for (const e of c.exercices ?? []) {
    if (!actif(e) || !Array.isArray(e.questions)) continue;
    const del = new Set((Array.isArray(e.deletedQuestionIds) ? e.deletedQuestionIds : []).map(Number));
    const m = c.masquees ?? new Set<string>();
    exercices += e.questions.filter((q: any) => actif(q) && q.masque !== true && q.suppressed !== true && !del.has(Number(q.id))
      && !(q.uid && m.has(`uid:${q.uid}`)) && !m.has(`${e.id}:${q.id}`)).length;
  }
  let inline = 0;
  for (const co of c.cours ?? []) {
    if (!actif(co) || !Array.isArray(co.quiz)) continue;
    const delQ = ids(co.deletedQuestionIds);
    inline += co.quiz.filter((q: any) => actif(q) && q.masque !== true && q.suppressed !== true && !delQ.has(Number(q.id))).length;
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

/**
 * Examens blancs : liste rendue à l'élève (fetchLiveExamens, hors « bilan-* »),
 * examens inactifs/retirés exclus, un seul examen par numéro, les 6 premiers.
 */
export function compterQuestionsExamensBlancs(examens: Array<{ id?: string; type: string; numero: number; matieres?: any[]; actif?: boolean; retired?: boolean }>, type: string, n = 6): { examens: number; questions: number; doublons: number } {
  const parNumero = new Map<number, any>();
  let doublons = 0;
  for (const e of examens) {
    if (e?.type !== type || String(e?.id ?? "").startsWith("bilan-") || e.actif === false || e.retired === true || (e as any).suppressed === true) continue;
    if (parNumero.has(Number(e.numero))) { doublons++; continue; }
    parNumero.set(Number(e.numero), e);
  }
  const liste = [...parNumero.values()].sort((a, b) => Number(a.numero) - Number(b.numero)).slice(0, n);
  const questions = liste.reduce((s, e) => s + (e.matieres ?? []).reduce((t: number, m: any) => t + (Array.isArray(m?.questions) ? m.questions.filter((q: any) => actif(q) && q.suppressed !== true).length : 0), 0), 0);
  return { examens: liste.length, questions, doublons };
}
