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

// ————————————————————————————————————————————————————————————————
// Source unique « Refaire les questions fausses » (EB, toutes filières).
// Réponses = celles enregistrées de CE passage (resultat.reponses).
// Corrigé QCM = version admin ACTUELLE, seulement si la question est rapprochée
// de façon prouvée (même ID stable, même type, même énoncé, mêmes propositions) ;
// sinon corrigé figé du passage + signalement. QRC = dernière note définitive
// (V2 officielle ou correction enregistrée), barème plein requis ; sans note
// définitive la QRC est EN ATTENTE et n'est jamais comptée fausse.
// Lecture seule : aucune note ni copie n'est recalculée ou réécrite.
// ————————————————————————————————————————————————————————————————
const normTexte = (s: unknown) => safeStr(s).normalize("NFC").replace(/\s+/g, " ").trim();
const reponseVide = (rep: unknown) =>
  rep === undefined || rep === null || (Array.isArray(rep) && rep.length === 0) || (typeof rep === "string" && rep.trim() === "");

/** Rapprochement prouvé figé ↔ actuel ; null si impossible (jamais au hasard). */
export function questionActuelleRapprochee(figee: Question, matiereActuelle: Matiere | null | undefined): Question | null {
  const candidats = (matiereActuelle?.questions ?? []).filter((q): q is Question => !!q && String(q.id) === String(figee.id));
  if (candidats.length !== 1) return null;
  const a = candidats[0];
  if (a.type !== figee.type || normTexte(a.enonce) !== normTexte(figee.enonce)) return null;
  if (figee.type === "QCM") {
    const sig = (q: Question) => JSON.stringify((q.choix ?? []).map((c) => [c.lettre, normTexte(c.texte)]).sort());
    if (!a.choix?.length || sig(a) !== sig(figee)) return null;
    if (!a.choix.some((c) => c.correct)) return null;
  }
  return a;
}

export type BilanRevisionFausses<T> = {
  fausses: { question: Question; questionFigee: Question; corrige: "actuel" | "fige" }[];
  qrcEnAttente: number[];
  nonRapprochees: number[];
  divergencesCorrige: number[]; // faux selon le corrigé actuel mais juste au figé, ou inverse
  _t?: T;
};

export function questionsFaussesDuPassage(
  matiereActuelle: Matiere,
  resultat: RevisionPassage,
): BilanRevisionFausses<never> {
  const out: BilanRevisionFausses<never> = { fausses: [], qrcEnAttente: [], nonRapprochees: [], divergencesCorrige: [] };
  const figees = questionsRevisionDuPassage(matiereActuelle, resultat);
  const matiereFigee = { ...matiereActuelle, questions: figees };
  const exactQcm = (q: Question, rep: unknown) => {
    const att = safeArray<string>((q.choix ?? []).filter((c) => c.correct).map((c) => c.lettre)).sort();
    const don = safeArray<string>(rep).map(String).sort();
    return att.length > 0 && JSON.stringify(att) === JSON.stringify(don);
  };
  for (const qf of figees) {
    const rep = resultat.reponses?.[qf.id] ?? resultat.reponses?.[String(qf.id)];
    if (reponseVide(rep)) continue;
    if (qf.type === "QCM") {
      const actuelle = questionActuelleRapprochee(qf, matiereActuelle);
      if (!actuelle) out.nonRapprochees.push(qf.id);
      const justeFige = exactQcm(qf, rep);
      const juste = actuelle ? exactQcm(actuelle, rep) : justeFige;
      if (actuelle && juste !== justeFige) out.divergencesCorrige.push(qf.id);
      if (!juste) out.fausses.push({ question: actuelle ?? qf, questionFigee: qf, corrige: actuelle ? "actuel" : "fige" });
      continue;
    }
    // QRC : note définitive seulement.
    const points = qf.points ?? getPointsParQuestion(matiereActuelle.id, qf.type, matiereFigee);
    const officielle = correctionOfficielleQrc(resultat.__core, resultat.matiereId ?? matiereActuelle.id, qf.id, points);
    let juste: boolean | null = officielle ? officielle.estCorrect : null;
    if (juste === null && !resultat.__core) {
      const corr = (resultat.correctionsIA ?? resultat.details?.correctionsIA ?? {}) as Record<string, unknown>;
      const c = (corr[qf.id] ?? corr[String(qf.id)]) as { pointsObtenus?: unknown; estCorrect?: unknown } | undefined;
      if (c && typeof c === "object" && Number.isFinite(Number(c.pointsObtenus))) juste = Number(c.pointsObtenus) >= points;
      else if (c && typeof c === "object" && typeof c.estCorrect === "boolean") juste = c.estCorrect;
    }
    if (juste === null) { out.qrcEnAttente.push(qf.id); continue; }
    if (!juste) out.fausses.push({ question: questionActuelleRapprochee(qf, matiereActuelle) ?? qf, questionFigee: qf, corrige: "fige" });
  }
  return out;
}
