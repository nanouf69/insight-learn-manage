// CONTRÔLE VISUEL DES ANOMALIES — EXAMENS BLANCS
//
// ⚠️ Strictement informatif : ces fonctions sont PURES et en LECTURE SEULE.
// Elles ne modifient, n'ajoutent, ne suppriment et ne réparent RIEN
// (ni question, ni type, ni point, ni coefficient, ni donnée apprenant).
// Elles renvoient uniquement une liste de messages à afficher.

import { getPointsParQuestion, type ExamenBlanc, type Matiere, type Question } from "./examens-blancs-data";

export const BAREME_CIBLE = 20;

/** Format officiel attendu par matière (QCM / QRC / coefficient / seuil éliminatoire). */
interface FormatOfficiel {
  qcm: number;
  qrc: number;
  coefficient: number;
  eliminatoire: number;
}

export const FORMATS_OFFICIELS: Record<string, FormatOfficiel> = {
  t3p: { qcm: 10, qrc: 5, coefficient: 3, eliminatoire: 6 },
  gestion: { qcm: 16, qrc: 2, coefficient: 2, eliminatoire: 6 },
  securite: { qcm: 20, qrc: 0, coefficient: 3, eliminatoire: 6 },
  francais: { qcm: 7, qrc: 3, coefficient: 2, eliminatoire: 6 },
  anglais: { qcm: 20, qrc: 0, coefficient: 1, eliminatoire: 4 },
  reglementation_vtc: { qcm: 12, qrc: 4, coefficient: 3, eliminatoire: 6 },
  reglementation_taxi: { qcm: 12, qrc: 4, coefficient: 3, eliminatoire: 6 },
  reglementation_vtc2: { qcm: 6, qrc: 2, coefficient: 3, eliminatoire: 6 },
  reglementation_taxi2: { qcm: 6, qrc: 2, coefficient: 3, eliminatoire: 6 },
};

const norm = (s: unknown) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** Empreinte du contenu pédagogique d'une matière (pour comparer deux copies partagées). */
export function empreinteMatiere(matiere: Matiere): string {
  const questions = (matiere.questions ?? []).filter((q): q is Question => q != null && q?.type != null);
  return JSON.stringify(
    questions.map((q) => ({
      id: q.id,
      type: q.type,
      enonce: norm(q.enonce),
      qrc: norm(q.reponseQRC),
      choix: (q.choix ?? []).map((c) => ({
        l: String(c?.lettre ?? "").toUpperCase().trim(),
        t: norm(c?.texte),
        c: c?.correct === true,
      })),
    })),
  );
}

/** Action recommandée pour ramener une matière au format officiel (informatif). */
export interface CorrectionMatiere {
  action: "add" | "remove";
  type: "QCM" | "QRC";
  count: number;
  points: number;
  label: string;
}

/**
 * Actions recommandées (ajout / retrait) pour une matière — LECTURE SEULE.
 * Ne modifie rien : sert uniquement à afficher « À corriger » et les boutons.
 */
export function getCorrectionsMatiere(matiere: Matiere): CorrectionMatiere[] {
  if (!matiere) return [];
  const format = FORMATS_OFFICIELS[matiere.id];
  if (!format) return [];
  const questions = (matiere.questions ?? []).filter((q): q is Question => q != null && q?.type != null);
  const nbQCM = questions.filter((q) => q.type === "QCM").length;
  const nbQRC = questions.filter((q) => q.type === "QRC").length;
  const out: CorrectionMatiere[] = [];
  const pousser = (type: "QCM" | "QRC", delta: number) => {
    if (delta === 0) return;
    const pts = getPointsParQuestion(matiere.id, type, matiere);
    const count = Math.abs(delta);
    const ptsTotal = pts * count;
    const ptsLabel = `${String(ptsTotal).replace(".", ",")} pt${Math.abs(ptsTotal) > 1 ? "s" : ""}`;
    out.push({
      action: delta > 0 ? "add" : "remove",
      type,
      count,
      points: pts,
      label:
        delta > 0
          ? `ajouter ${count} ${type === "QCM" ? "QCM" : "QRC"} (${ptsLabel})`
          : `retirer ${count} ${type === "QCM" ? "QCM" : "QRC"} (${ptsLabel})`,
    });
  };
  pousser("QCM", format.qcm - nbQCM);
  pousser("QRC", format.qrc - nbQRC);
  return out;
}

export interface MatiereAnomaliesContext {
  /** Autres copies de la MÊME matière (même id) présentes dans les autres examens chargés. */
  autresCopies?: Array<{ examTitre: string; matiere: Matiere }>;
}

/**
 * Détecte toutes les anomalies de configuration d'une matière.
 * Renvoie la liste complète des raisons (jamais seulement la première).
 */
export function detectMatiereAnomalies(
  matiere: Matiere,
  contexte: MatiereAnomaliesContext = {},
): string[] {
  const anomalies: string[] = [];
  if (!matiere) return anomalies;

  const questions = (matiere.questions ?? []).filter((q): q is Question => q != null && q?.type != null);
  const nbQCM = questions.filter((q) => q.type === "QCM").length;
  const nbQRC = questions.filter((q) => q.type === "QRC").length;
  const total = questions.reduce(
    (acc, q) => acc + getPointsParQuestion(matiere.id, q.type, matiere),
    0,
  );

  // 1. Total de points (affiché seul si le format est correct, sinon inclus dans le bloc format)
  const format = FORMATS_OFFICIELS[matiere.id];
  const formatConforme =
    !format || (nbQCM === format.qcm && nbQRC === format.qrc);

  if (total !== BAREME_CIBLE && formatConforme) {
    const ecart = BAREME_CIBLE - total;
    anomalies.push(
      ecart > 0
        ? `Total incorrect : ${total}/${BAREME_CIBLE} — il manque ${ecart} point${ecart > 1 ? "s" : ""}`
        : `Total incorrect : ${total}/${BAREME_CIBLE} — ${-ecart} point${-ecart > 1 ? "s" : ""} en trop`,
    );
  }

  if (format && !formatConforme) {
    // 2 & 3. Format : diagnostic précis par type (Actuel / Attendu / À corriger)
    const ptsQCM = getPointsParQuestion(matiere.id, "QCM", matiere);
    const ptsQRC = getPointsParQuestion(matiere.id, "QRC", matiere);
    const ptLabel = (pts: number, signe = "") =>
      ` (${signe}${String(pts).replace(".", ",")} pt${Math.abs(pts) > 1 ? "s" : ""})`;
    const attenduTotalQ = format.qcm + format.qrc;

    anomalies.push(
      `Format incorrect — Actuel : ${nbQCM} QCM + ${nbQRC} QRC = ${total}/${BAREME_CIBLE} (${questions.length}/${attenduTotalQ} questions)`,
    );
    anomalies.push(
      `Attendu : ${format.qcm} QCM + ${format.qrc} QRC = ${BAREME_CIBLE}/${BAREME_CIBLE} (${attenduTotalQ} questions)`,
    );

    const corrections: string[] = [];
    const dQCM = format.qcm - nbQCM;
    const dQRC = format.qrc - nbQRC;
    if (dQCM > 0)
      corrections.push(
        `+${dQCM} QCM à ajouter${ptLabel(ptsQCM)}`,
      );
    else if (dQCM < 0)
      corrections.push(`−${-dQCM} QCM à retirer${ptLabel(ptsQCM, "−")}`);
    if (dQRC > 0)
      corrections.push(`+${dQRC} QRC à ajouter${ptLabel(ptsQRC)}`);
    else if (dQRC < 0)
      corrections.push(`−${-dQRC} QRC à retirer${ptLabel(ptsQRC, "−")}`);

    if (corrections.length > 0) {
      anomalies.push(`À corriger : ${corrections.join(" / ")}`);
    }
    if (total !== BAREME_CIBLE) {
      const ecart = BAREME_CIBLE - total;
      anomalies.push(
        ecart > 0
          ? `Total : ${total}/${BAREME_CIBLE} — il manque ${ecart} point${ecart > 1 ? "s" : ""}`
          : `Total : ${total}/${BAREME_CIBLE} — ${-ecart} point${-ecart > 1 ? "s" : ""} en trop`,
      );
    }
  }

  // 10. Coefficient officiel
  if (format && (matiere.coefficient ?? 0) !== format.coefficient) {
    anomalies.push(`Coefficient incorrect : ${matiere.coefficient}, attendu ${format.coefficient}`);
  }
  // 11. Seuil éliminatoire officiel
  if (format && (matiere.noteEliminatoire ?? 0) !== format.eliminatoire) {
    anomalies.push(
      `Seuil éliminatoire incorrect : ${matiere.noteEliminatoire}, attendu ${format.eliminatoire}/20`,
    );
  }

  // 4 à 9. Contrôles question par question
  questions.forEach((q, idx) => {
    const ref = `Q${idx + 1}`;
    if (!String(q.enonce ?? "").trim()) {
      anomalies.push(`${ref} : énoncé vide`);
    }
    if (q.type === "QCM") {
      const choix = q.choix ?? [];
      if (choix.length === 0) {
        anomalies.push(`${ref} : aucune proposition de réponse`);
      } else if (choix.length < 2) {
        anomalies.push(`${ref} : QCM avec une seule proposition de réponse`);
      }
      if (choix.some((c) => !String(c?.texte ?? "").trim())) {
        anomalies.push(`${ref} : une proposition de réponse est vide`);
      }
      const correctes = choix.filter((c) => c?.correct === true);
      if (choix.length > 0 && correctes.length === 0) {
        anomalies.push(`${ref} : QCM sans bonne réponse définie`);
      }
      if (choix.length > 1 && correctes.length === choix.length) {
        anomalies.push(`${ref} : toutes les propositions sont marquées correctes`);
      }
      const vues = new Set<string>();
      for (const c of choix) {
        const lettre = String(c?.lettre ?? "").toUpperCase().trim();
        if (!lettre) {
          anomalies.push(`${ref} : une proposition sans lettre (A, B, C…)`);
          continue;
        }
        if (vues.has(lettre)) anomalies.push(`${ref} : lettre de proposition en double (${lettre})`);
        vues.add(lettre);
      }
    }
    if (q.type === "QRC") {
      const rep = String(q.reponseQRC ?? "").trim();
      if (!rep) {
        anomalies.push(`${ref} : QRC sans réponse attendue`);
      } else if (/\?\s*$/.test(rep) || norm(rep) === norm(q.enonce)) {
        anomalies.push(`${ref} : la réponse attendue reprend la question au lieu de la réponse`);
      }
    }
  });

  // 12. Matière partagée non synchronisée : masqué volontairement (demande Admin).
  // Le mécanisme de synchronisation lui-même n'est pas modifié ; seule cette
  // alerte d'affichage est retirée du contrôle des anomalies pour ne pas
  // polluer le diagnostic avec les différences de contenu entre examens.

  return anomalies;
}

export interface ExamenAnomalies {
  /** anomalies par identifiant de matière */
  parMatiere: Record<string, string[]>;
  matieresEnAnomalie: number;
  total: number;
  /** Nombre réel de questions de l'examen (toutes matières confondues). */
  totalQuestions: number;
  /** Message d'anomalie sur le total (null si 107). */
  totalAnomalie: string | null;
}

/** Nombre total de questions attendu pour un examen blanc COMPLET (7 matières). */
export const TOTAL_QUESTIONS_ATTENDU = 107;

/**
 * Nombre de questions attendu pour CET examen : somme des formats officiels de
 * ses propres matières. Un examen TA/VA (matières spécifiques uniquement) n'est
 * donc jamais comparé au total d'un examen complet.
 */
export function getTotalQuestionsAttendu(examen: ExamenBlanc): number | null {
  const matieres = examen?.matieres ?? [];
  if (matieres.length === 0) return null;
  let total = 0;
  for (const matiere of matieres) {
    const format = matiere ? FORMATS_OFFICIELS[matiere.id] : undefined;
    if (!format) return null; // format inconnu → pas de contrôle de total
    total += format.qcm + format.qrc;
  }
  return total;
}

/**
 * Analyse un examen entier. `tousLesExamensCharges` sert uniquement à repérer
 * les copies partagées d'une même matière (comparaison en lecture seule) —
 * uniquement parmi les examens du MÊME NUMÉRO.
 */
export function detectExamenAnomalies(
  examen: ExamenBlanc,
  tousLesExamensCharges: ExamenBlanc[] = [],
): ExamenAnomalies {
  const parMatiere: Record<string, string[]> = {};
  let total = 0;
  let matieresEnAnomalie = 0;
  let totalQuestions = 0;

  for (const matiere of examen?.matieres ?? []) {
    totalQuestions += (matiere?.questions ?? []).filter(
      (q): q is Question => q != null && q?.type != null,
    ).length;
    if (!matiere) continue;
    const autresCopies = tousLesExamensCharges
      .filter((ex) => ex && ex.id !== examen.id && canSyncExams(ex.id, examen.id))
      .flatMap((ex) =>
        (ex.matieres ?? [])
          .filter((m) => m && m.id === matiere.id)
          .map((m) => ({ examTitre: ex.titre, matiere: m })),
      );
    const anomalies = detectMatiereAnomalies(matiere, { autresCopies });
    parMatiere[matiere.id] = anomalies;
    if (anomalies.length > 0) {
      matieresEnAnomalie++;
      total += anomalies.length;
    }
  }

  // Contrôle du nombre TOTAL de questions (lecture seule), selon le format
  // réellement attendu pour CE type d'examen (complet, TA, VA, bilan…).
  let totalAnomalie: string | null = null;
  const attendu = getTotalQuestionsAttendu(examen);
  if (attendu !== null && totalQuestions !== attendu) {
    const ecart = attendu - totalQuestions;
    totalAnomalie =
      ecart > 0
        ? `Nombre total incorrect : ${totalQuestions}/${attendu} questions — il manque ${ecart} question${ecart > 1 ? "s" : ""}`
        : `Nombre total incorrect : ${totalQuestions}/${attendu} questions — ${-ecart} question${-ecart > 1 ? "s" : ""} en trop`;
    total += 1;
  }

  return { parMatiere, matieresEnAnomalie, total, totalQuestions, totalAnomalie };
}

