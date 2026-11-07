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

/**
 * Aucune matière n'est exclue globalement : l'admissibilité est décidée pour
 * chaque question figée, avec son propre énoncé, corrigé et barème.
 */

/** Même règle que isElearningType (src/lib/dossierFormation.ts). */
export function estElearning(type?: string | null): boolean {
  const t = (type ?? "").trim().toLowerCase();
  if (!t) return false;
  return t.includes("e-learning") || t.includes("elearning") || /(^|[\s-])[a-z]{2,4}-e($|-)/.test(t) || t.endsWith("-e");
}

/**
 * Source unique de l'app (src/lib/examenElearningRelance.ts) : un apprenant est
 * e-learning si son type l'indique OU si sa modalité est elearning_* (synchrone
 * ou asynchrone). Modalité manquante/présentielle = repli sur le type seul.
 */
export function estApprenantElearning(type?: string | null, modalite?: string | null): boolean {
  const m = (modalite ?? "").trim().toLowerCase();
  if (/^elearning_(synchrone|asynchrone)$/.test(m)) return true;
  return estElearning(type);
}

/** Filet de sécurité complémentaire aux indicateurs techniques, jamais une formation. */
export function estCompteTestApprenant(app?: { nom?: string | null; prenom?: string | null; email?: string | null } | null): boolean {
  const identite = `${app?.prenom ?? ""} ${app?.nom ?? ""} ${app?.email ?? ""}`.toLowerCase();
  return /fictif|d[ée]mo|test[ ._-]?technique|compte[ _-]?test|essai[ _-]?ia/.test(identite);
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

type SnapshotExamen = { questions?: unknown; matiere?: unknown; matieres?: unknown };

/**
 * Lit uniquement le snapshot. Les passages historiques peuvent ranger leurs
 * questions dans matieres[] et leur matière dans subject_id/matiereId.
 */
export function questionsDuSnapshot(snapshot: SnapshotExamen | null | undefined): QuestionSnapshot[] {
  if (!snapshot || typeof snapshot !== "object") return [];
  const matiereRacine = typeof snapshot.matiere === "string" ? snapshot.matiere : "";
  const matieres = Array.isArray(snapshot.matieres) ? snapshot.matieres : [];
  const matiereUnique = matieres.length === 1 && matieres[0] && typeof matieres[0] === "object"
    ? ["matiere", "matiereId", "subject_id", "id"].map((k) => (matieres[0] as Record<string, unknown>)[k]).find((v) => typeof v === "string" && v.trim())
    : "";
  const sortie: QuestionSnapshot[] = [];
  const ajouter = (valeur: unknown, matiere: unknown) => {
    if (!Array.isArray(valeur)) return;
    for (const brut of valeur) {
      if (!brut || typeof brut !== "object" || Array.isArray(brut)) continue;
      const q = brut as QuestionSnapshot;
      sortie.push({ ...q, matiere: q.matiere ?? (typeof matiere === "string" ? matiere : "") });
    }
  };
  ajouter(snapshot.questions, matiereRacine || matiereUnique);
  for (const brut of matieres) {
    if (!brut || typeof brut !== "object" || Array.isArray(brut)) continue;
    const m = brut as Record<string, unknown>;
    const matiere = ["matiere", "matiereId", "subject_id", "id"].map((k) => m[k]).find((v) => typeof v === "string" && v.trim());
    ajouter(m.questions, matiere ?? matiereRacine);
  }
  return sortie;
}

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
  const rep = texteReponse(reponse).trim();
  if (!rep) return { admissible: false, statut: "exclue", motif: "reponse_vide" };
  const enonce = (q.enonce ?? "").trim();
  const corrige = (q.reponseQRC ?? "").trim();
  if (enonce.length < 5) return { admissible: false, statut: "a_verifier", motif: "question_absente" };
  if (corrige.length < 3 || corrige.endsWith("?") || corrige.toLocaleLowerCase("fr") === enonce.toLocaleLowerCase("fr")) {
    return { admissible: false, statut: "a_verifier", motif: "corrige_absent" };
  }
  // Un calcul dont le dernier terme est seulement « + supplément bagages » ne
  // contient pas la donnée nécessaire à une note complète : revue formateur.
  const dernierTerme = corrige.split("+").pop() ?? "";
  if (/\b(calculez|calculer|montant)\b/i.test(enonce) && corrige.includes("+") && !/\d/.test(dernierTerme)) {
    return { admissible: false, statut: "a_verifier", motif: "corrige_incomplet_calcul" };
  }
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
  if (obj.ambigu === true) return { valide: false, motif: "reponse_ou_corrige_ambigu" };
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
  "Si la question demande un nombre précis d'éléments (ex. « citez deux cas ») et que le corrigé en liste davantage, ce corrigé est une liste de réponses possibles : " +
  "autant d'éléments justes que demandé (pris parmi n'importe lesquels du corrigé) = note maximale ; ne jamais exiger les autres éléments ; un élément faux ajouté n'annule pas les éléments justes. " +
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
