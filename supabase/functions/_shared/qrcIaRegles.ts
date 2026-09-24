/**
 * RÈGLES DÉTERMINISTES — CORRECTION IA DES QRC E-LEARNING
 * ======================================================
 * Module pur (aucune dépendance) partagé par la fonction serveur
 * `qrc-ia-correction` et par les tests. La décision d'envoyer une QRC à l'IA
 * ne dépend JAMAIS du niveau de confiance renvoyé par l'IA.
 */

export const MODELE_IA_QRC = "google/gemini-3.8-flash";
export const LIBELLE_MODELE_IA_QRC = "Gemini 3.8 Flash";
/** Marqueur d'origine écrit dans qrc_instances_v2.corrige_email. */
export const MARQUEUR_IA = `ia:${MODELE_IA_QRC}`;

/** Matières exclues : G(T) — Connaissance du territoire TAXI (corrigés insuffisants). */
export const MATIERES_EXCLUES = new Set(["reglementation_taxi2"]);

/** Même règle que isElearningType (src/lib/dossierFormation.ts). */
export function estElearning(type?: string | null): boolean {
  const t = (type ?? "").trim().toLowerCase();
  if (!t) return false;
  return t.includes("e-learning") || t.includes("elearning") || /(^|[\s-])[a-z]{2,4}-e($|-)/.test(t) || t.endsWith("-e");
}

export const texteReponse = (v: unknown): string =>
  typeof v === "string" ? v : v == null ? "" : typeof v === "number" ? String(v) : JSON.stringify(v);

export type QuestionSnapshot = {
  id?: string;
  type?: string | null;
  enonce?: string | null;
  reponseQRC?: string | null;
  points?: number | string | null;
  matiere?: string | null;
  motsCles?: unknown;
};

export type Admissibilite =
  | { admissible: true; bareme: number }
  | { admissible: false; statut: "exclue" | "a_verifier"; motif: string };

const corrompu = (s: string) => s.includes("\uFFFD") || /\u0000/.test(s) || s.length > 6000;

/**
 * Décide, sans IA, si une QRC peut être corrigée automatiquement.
 * Tout doute → formateur (jamais de note inventée).
 */
export function admissibilite(q: QuestionSnapshot | null | undefined, reponse: unknown): Admissibilite {
  if (!q) return { admissible: false, statut: "a_verifier", motif: "question_hors_snapshot" };
  if ((q.type ?? "") !== "QRC") return { admissible: false, statut: "a_verifier", motif: "type_non_qrc" };
  const matiere = (q.matiere ?? "").trim().toLowerCase();
  if (!matiere) return { admissible: false, statut: "a_verifier", motif: "matiere_inconnue" };
  if (MATIERES_EXCLUES.has(matiere)) return { admissible: false, statut: "exclue", motif: "matiere_exclue_gt" };
  const rep = texteReponse(reponse).trim();
  if (!rep) return { admissible: false, statut: "exclue", motif: "reponse_vide" };
  const enonce = (q.enonce ?? "").trim();
  const corrige = (q.reponseQRC ?? "").trim();
  if (enonce.length < 5) return { admissible: false, statut: "a_verifier", motif: "question_absente" };
  if (corrige.length < 3) return { admissible: false, statut: "a_verifier", motif: "corrige_absent" };
  const bareme = Number(q.points);
  if (q.points == null || q.points === "" || !Number.isFinite(bareme) || bareme <= 0 || bareme > 20 || (bareme * 2) % 1 !== 0) {
    return { admissible: false, statut: "a_verifier", motif: "bareme_absent" };
  }
  if (corrompu(enonce) || corrompu(corrige) || corrompu(rep)) {
    return { admissible: false, statut: "a_verifier", motif: "donnees_corrompues" };
  }
  return { admissible: true, bareme };
}

export type ResultatIa =
  | { valide: true; note: number; justification: string }
  | { valide: false; motif: string };

/** Valide strictement la réponse de l'IA : note numérique, pas de 0,5, dans le barème. */
export function validerResultatIa(brut: unknown, bareme: number): ResultatIa {
  let obj: any = brut;
  if (typeof brut === "string") {
    const m = brut.match(/\{[\s\S]*\}/);
    if (!m) return { valide: false, motif: "resultat_invalide" };
    try { obj = JSON.parse(m[0]); } catch { return { valide: false, motif: "resultat_invalide" }; }
  }
  if (!obj || typeof obj !== "object") return { valide: false, motif: "resultat_invalide" };
  const raw = obj.note;
  const note = typeof raw === "number" ? raw : typeof raw === "string" && raw.trim() !== "" ? Number(raw.replace(",", ".")) : NaN;
  if (!Number.isFinite(note)) return { valide: false, motif: "resultat_invalide" };
  if (note < 0 || note > bareme) return { valide: false, motif: "hors_bareme" };
  if ((note * 2) % 1 !== 0) return { valide: false, motif: "hors_bareme" };
  const justification = typeof obj.justification === "string" ? obj.justification.trim().slice(0, 600) : "";
  if (!justification) return { valide: false, motif: "resultat_invalide" };
  return { valide: true, note, justification };
}

/** Consigne identique à celle du benchmark 100 QRC. Aucune donnée personnelle. */
export const CONSIGNE_IA =
  "Tu es correcteur d'examen blanc (formation VTC/TAXI, France). Tu notes une réponse libre (QRC) en la comparant au corrigé officiel. " +
  "Note par pas de 0,5, entre 0 et le barème, sans jamais le dépasser. Accepte les formulations équivalentes, ignore l'orthographe sauf si le sens change. " +
  "Si le corrigé est insuffisant ou la réponse ambiguë, mets ambigu=true. Réponds uniquement en JSON : " +
  '{"note": nombre, "justification": "1 phrase courte", "confiance": "haute|moyenne|faible", "ambigu": true|false}';

export function messageUtilisateur(q: QuestionSnapshot, bareme: number, reponse: unknown): string {
  const motsCles = Array.isArray(q.motsCles) && q.motsCles.length
    ? `\n\nÉLÉMENTS ACCEPTÉS :\n${(q.motsCles as unknown[]).map(String).join(", ")}`
    : "";
  return `QUESTION :\n${(q.enonce ?? "").trim()}\n\nCORRIGÉ OFFICIEL :\n${(q.reponseQRC ?? "").trim()}${motsCles}\n\nBARÈME : ${bareme} points\n\nRÉPONSE DE L'ÉLÈVE :\n${texteReponse(reponse).trim()}\n\nRends ta correction en json.`;
}

/** Clé d'idempotence : apprenant + examen + matière + passage + question + version de réponse. */
export function cleIdempotence(p: {
  apprenantId: string; examId: string; matiere: string; attemptId: string; questionId: string; reponseHash: string;
}): string {
  return [p.apprenantId, p.examId, p.matiere, p.attemptId, p.questionId, p.reponseHash].join("|");
}

/** Statuts HTTP qui mettent tout le système en pause (crédits / accès). */
export const estPauseGlobale = (status: number) => status === 402 || status === 403;
