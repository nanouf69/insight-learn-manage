import { getPointsParQuestion, type Matiere, type Question } from "@/components/cours-en-ligne/examens-blancs-data";
import { correctionOfficielleQrc, type QrcProof } from "@/lib/correctionOfficielleQrc";
import { safeArray, safeStr } from "@/components/cours-en-ligne/examens-blancs-utils";

export type RevisionPassage = {
  matiereId?: string;
  reponses?: Record<string, unknown>;
  correctionsIA?: Record<string, unknown>;
  details?: { correctionsIA?: Record<string, unknown> };
  __core?: { questions?: unknown[]; qrcProofs?: QrcProof[] } | null;
};

/** Questions de la tentative V2, jamais celles d'une version publiée ensuite. */
export function questionsRevisionDuPassage(matiere: Matiere, resultat: RevisionPassage): Question[] {
  const coreQuestions = resultat?.__core?.questions;
  if (!Array.isArray(coreQuestions)) return (matiere.questions ?? []).filter((q): q is Question => Boolean(q?.type));
  const out: Question[] = [];
  for (const raw of coreQuestions) {
    const q = raw as Record<string, unknown>;
    const fullId = String(q.id ?? "");
    const prefix = `${String(resultat.matiereId ?? matiere.id)}:`;
    const id = Number(fullId.startsWith(prefix) ? fullId.slice(prefix.length) : "");
    const type = String(q.type ?? "").toUpperCase();
    const points = Number(q.points);
    if (!Number.isSafeInteger(id) || id <= 0 || (type !== "QCM" && type !== "QRC") || !Number.isFinite(points) || points <= 0) {
      return [];
    }
    out.push({
      id,
      type,
      enonce: String(q.enonce ?? ""),
      points,
      ...(Array.isArray(q.choix) ? { choix: q.choix as Question["choix"] } : {}),
      ...(typeof q.reponseQRC === "string" ? { reponseQRC: q.reponseQRC } : {}),
      ...(Array.isArray(q.reponses_possibles) ? { reponses_possibles: q.reponses_possibles.map(String) } : {}),
      ...(typeof q.image === "string" ? { image: q.image } : {}),
    });
  }
  return out;
}

export function reponseCorrecteDansRevision(
  question: Question,
  reponse: unknown,
  matiere: Matiere,
  resultat: RevisionPassage,
): boolean {
  if (question.type === "QCM") {
    const attendues = safeArray<string>((question.choix ?? []).filter((c) => c.correct).map((c) => c.lettre)).sort();
    const donnees = safeArray<string>(reponse).sort();
    return attendues.length > 0 && JSON.stringify(attendues) === JSON.stringify(donnees);
  }

  const points = question.points ?? getPointsParQuestion(matiere.id, question.type, matiere);
  const officielle = correctionOfficielleQrc(resultat.__core, resultat.matiereId ?? matiere.id, question.id, points);
  if (officielle) return officielle.estCorrect;

  const corrections = resultat.correctionsIA ?? resultat.details?.correctionsIA ?? {};
  const correction = corrections[question.id] ?? corrections[String(question.id)];
  if (correction && typeof correction === "object" && ("estCorrect" in correction || "pointsObtenus" in correction)) {
    if ("estCorrect" in correction) return Boolean((correction as { estCorrect?: unknown }).estCorrect);
    return Number((correction as { pointsObtenus?: unknown }).pointsObtenus) >= points;
  }

  const texte = safeStr(reponse).toLowerCase();
  const mots = question.reponses_possibles ?? [];
  return mots.length > 0 && mots.every((mot) => texte.includes(mot.toLowerCase()));
}
