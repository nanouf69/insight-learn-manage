import type { Matiere, Question } from "@/components/cours-en-ligne/examens-blancs-data";

export type QuestionSnapshotV2 = {
  id?: unknown;
  matiere?: unknown;
  ordre?: unknown;
  type?: unknown;
  enonce?: unknown;
  choix?: unknown;
  reponseQRC?: unknown;
  reponses_possibles?: unknown;
  requiresCalcul?: unknown;
  image?: unknown;
  points?: unknown;
};

export type SnapshotMatiereV2 = {
  matiere?: unknown;
  matieres?: unknown;
  questions?: unknown;
};

export type ProjectionSnapshotMatiere =
  | { ok: true; matiere: Matiere }
  | { ok: false; raisons: string[] };

const nombrePositif = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

/**
 * Reconstruit UNIQUEMENT depuis la copie figée de la tentative.
 * Aucun libellé, choix, corrigé, barème ou ordre n'est complété depuis le sujet courant.
 */
export function projeterMatiereDepuisSnapshot(
  snapshot: SnapshotMatiereV2 | null | undefined,
  matiereId: string,
): ProjectionSnapshotMatiere {
  const raisons: string[] = [];
  if (!snapshot || typeof snapshot !== "object") {
    return { ok: false, raisons: ["snapshot absent"] };
  }
  if (String(snapshot.matiere ?? "") !== matiereId) raisons.push("matière différente");

  const metadata = Array.isArray(snapshot.matieres)
    ? snapshot.matieres.filter((m) => String((m as { subject_id?: unknown })?.subject_id ?? "") === matiereId)
    : [];
  if (metadata.length !== 1) raisons.push("métadonnées de matière absentes ou ambiguës");

  const source = Array.isArray(snapshot.questions) ? snapshot.questions as QuestionSnapshotV2[] : [];
  if (source.length === 0) raisons.push("questions absentes");

  const ids = new Set<string>();
  const questions: Question[] = [];
  source.forEach((q, index) => {
    const ref = `question ${index + 1}`;
    const id = String(q?.id ?? "");
    const prefix = `${matiereId}:`;
    const suffix = id.startsWith(prefix) ? id.slice(prefix.length) : "";
    const numericId = Number(suffix);
    if (!id.startsWith(prefix) || !Number.isSafeInteger(numericId) || numericId <= 0) {
      raisons.push(`${ref} : identifiant invalide`);
    } else if (ids.has(id)) {
      raisons.push(`${ref} : identifiant dupliqué`);
    }
    ids.add(id);

    const type = String(q?.type ?? "").toUpperCase();
    if (type !== "QCM" && type !== "QRC") raisons.push(`${ref} : type invalide`);
    if (typeof q?.enonce !== "string" || !q.enonce.trim()) raisons.push(`${ref} : énoncé absent`);
    if (!nombrePositif(q?.points)) raisons.push(`${ref} : barème absent`);
    if (String(q?.matiere ?? "") !== matiereId) raisons.push(`${ref} : matière incohérente`);

    let choix: Question["choix"];
    if (type === "QCM") {
      if (!Array.isArray(q?.choix) || q.choix.length === 0) {
        raisons.push(`${ref} : propositions absentes`);
      } else {
        choix = q.choix.map((c, choiceIndex) => {
          const choice = (c ?? {}) as { lettre?: unknown; texte?: unknown; correct?: unknown; explication?: unknown };
          if (typeof choice.lettre !== "string" || !choice.lettre.trim()) {
            raisons.push(`${ref} : lettre de proposition ${choiceIndex + 1} absente`);
          }
          if (typeof choice.texte !== "string") raisons.push(`${ref} : texte de proposition ${choiceIndex + 1} absent`);
          return {
            lettre: String(choice.lettre ?? ""),
            texte: String(choice.texte ?? ""),
            ...(choice.correct === true ? { correct: true } : {}),
            ...(typeof choice.explication === "string" ? { explication: choice.explication } : {}),
          };
        });
        if (!choix.some((c) => c.correct === true)) raisons.push(`${ref} : bonne réponse absente`);
      }
    }

    questions.push({
      id: Number.isSafeInteger(numericId) && numericId > 0 ? numericId : -(index + 1),
      type: type === "QRC" ? "QRC" : "QCM",
      enonce: typeof q?.enonce === "string" ? q.enonce : "",
      ...(choix ? { choix } : {}),
      ...(typeof q?.reponseQRC === "string" ? { reponseQRC: q.reponseQRC } : {}),
      ...(Array.isArray(q?.reponses_possibles)
        ? { reponses_possibles: q.reponses_possibles.map(String) }
        : {}),
      ...(typeof q?.requiresCalcul === "boolean" ? { requiresCalcul: q.requiresCalcul } : {}),
      ...(typeof q?.image === "string" ? { image: q.image } : {}),
      ...(nombrePositif(q?.points) ? { points: q.points } : {}),
      ordre: index,
    });
  });

  if (raisons.length > 0 || metadata.length !== 1) {
    return { ok: false, raisons: raisons.slice(0, 20) };
  }

  const meta = metadata[0] as Record<string, unknown>;
  const duree = Number(meta.duree);
  const coefficient = Number(meta.coefficient);
  const noteSur = Number(meta.note_sur);
  if (!Number.isFinite(duree) || duree < 0) raisons.push("durée absente");
  if (!nombrePositif(coefficient)) raisons.push("coefficient absent");
  if (!nombrePositif(noteSur)) raisons.push("note maximale absente");
  if (raisons.length > 0) return { ok: false, raisons: raisons.slice(0, 20) };

  const noteEliminatoire = Number(meta.note_eliminatoire);
  return {
    ok: true,
    matiere: {
      id: matiereId,
      nom: String(meta.titre ?? matiereId),
      duree,
      coefficient,
      noteSur,
      // Les snapshots antérieurs à ce champ ne sont pas complétés avec la règle courante.
      noteEliminatoire: Number.isFinite(noteEliminatoire) ? noteEliminatoire : 0,
      ...(Number.isFinite(Number(meta.pts_qcm)) ? { ptsQCM: Number(meta.pts_qcm) } : {}),
      ...(Number.isFinite(Number(meta.pts_qrc)) ? { ptsQRC: Number(meta.pts_qrc) } : {}),
      ...(typeof meta.texte_support === "string" ? { texteSupport: meta.texte_support } : {}),
      ...(typeof meta.texte_source === "string" ? { texteSource: meta.texte_source } : {}),
      questions,
    },
  };
}
