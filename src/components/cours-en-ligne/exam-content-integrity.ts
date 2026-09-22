// INTÉGRITÉ DU CONTENU DES EXAMENS BLANCS
//
// RÈGLE ABSOLUE : si la version active en base ne peut pas être confirmée,
// AUCUNE question n'est affichée. Jamais de repli sur le contenu statique,
// jamais de copie par position, jamais d'ancienne version.
//
// Ces fonctions sont PURES et en LECTURE SEULE : elles ne modifient
// aucune donnée pédagogique ni aucune tentative.

import type { ExamenBlanc, Matiere, Question } from "./examens-blancs-data";

/** Levée dès que la version active d'un examen ne peut pas être confirmée. */
export class ExamContentUnavailableError extends Error {
  readonly code = "EXAM_CONTENT_UNAVAILABLE";
  constructor(message = "Version active de l'examen indisponible") {
    super(message);
    this.name = "ExamContentUnavailableError";
  }
}

export const EXAM_CONTENT_UNAVAILABLE_MESSAGE =
  "🔴 Impossible de charger l'Examen Blanc. Vos données sont conservées. Vérifiez votre connexion puis réessayez.";

export function isExamContentUnavailable(err: unknown): boolean {
  return Boolean(err && typeof err === "object" && (err as any).code === "EXAM_CONTENT_UNAVAILABLE");
}

const txt = (v: unknown) => String(v ?? "").trim().replace(/\s+/g, " ");

/** Empreinte stable d'une question : identité + tout ce qui est présenté et corrigé. */
function questionFingerprintParts(q: Question | null | undefined): string {
  if (!q) return "∅";
  const anyQ = q as any;
  const choix = Array.isArray(anyQ.choix)
    ? anyQ.choix.map((c: any) => `${txt(c?.lettre)}~${txt(c?.texte)}~${c?.correct ? 1 : 0}`).join("§")
    : "";
  const kw = Array.isArray(anyQ.reponses_possibles) ? anyQ.reponses_possibles.map(txt).join("§") : "";
  return [
    `id=${anyQ.id}`,
    `type=${txt(anyQ.type).toUpperCase()}`,
    `enonce=${txt(anyQ.enonce)}`,
    `choix=${choix}`,
    `qrc=${txt(anyQ.reponseQRC)}`,
    `kw=${kw}`,
    `pts=${anyQ.points ?? ""}`,
    `img=${txt(anyQ.image ?? anyQ.image_url ?? "")}`,
  ].join("|");
}

/** Empreinte stable d'une matière (barème compris). */
export function buildMatiereFingerprint(matiere: Matiere | null | undefined): string {
  if (!matiere) return hashString("∅");
  const m = matiere as any;
  const head = [
    `mat=${txt(m.id)}`,
    `nom=${txt(m.nom)}`,
    `noteSur=${m.noteSur ?? ""}`,
    `coef=${m.coefficient ?? ""}`,
    `elim=${m.noteEliminatoire ?? ""}`,
    `ptsQCM=${m.ptsQCM ?? ""}`,
    `ptsQRC=${m.ptsQRC ?? ""}`,
  ].join("|");
  const body = (m.questions ?? []).map(questionFingerprintParts).join("\n");
  return hashString(`${head}\n${body}`);
}

/**
 * Empreinte stable d'un examen complet :
 * examen + numéro + matières + IDs questions + énoncés + propositions +
 * bonnes réponses + QCM/QRC + barèmes + images.
 */
export function buildExamFingerprint(examen: ExamenBlanc | null | undefined): string {
  if (!examen) return hashString("∅");
  const e = examen as any;
  const head = `exam=${txt(e.id)}|num=${e.numero ?? ""}|type=${txt(e.type)}`;
  const body = (e.matieres ?? [])
    .filter(Boolean)
    .map((m: Matiere) => `${txt((m as any).id)}=${buildMatiereFingerprint(m)}`)
    .join("\n");
  return hashString(`${head}\n${body}`);
}

/** Empreinte des seules questions (utilisée pour comparer un ancien passage à la version active). */
export function buildQuestionsFingerprint(questions: unknown): string {
  const list = Array.isArray(questions) ? questions : [];
  return hashString(list.map((q) => questionFingerprintParts(q as Question)).join("\n"));
}

/**
 * Un passage a-t-il été réalisé sur une version ANTÉRIEURE de l'examen ?
 * LECTURE SEULE : ne modifie ni la note ni le passage, sert uniquement
 * à afficher un avertissement côté Admin.
 */
export function isSnapshotOutdated(
  snapshot: { questions?: unknown } | null | undefined,
  matiereActive: Matiere | null | undefined,
): boolean {
  if (!snapshot || !Array.isArray((snapshot as any).questions) || !matiereActive) return false;
  const active = (matiereActive as any).questions;
  if (!Array.isArray(active) || active.length === 0) return false;
  return buildQuestionsFingerprint((snapshot as any).questions) !== buildQuestionsFingerprint(active);
}

/** Photographie complète et indépendante de la version active (deep clone). */
export function buildAttemptSnapshot(examen: ExamenBlanc): ExamenBlanc {
  return JSON.parse(JSON.stringify(examen)) as ExamenBlanc;
}

/** Hash déterministe (FNV-1a 64 bits simulé sur 2 mots 32 bits), sans dépendance. */
export function hashString(input: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 = (Math.imul(h2 ^ c, 0x85ebca6b) + i) >>> 0;
  }
  return `${h1.toString(16).padStart(8, "0")}${h2.toString(16).padStart(8, "0")}`;
}
