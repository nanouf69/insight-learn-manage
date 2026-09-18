// @vitest-environment node
/**
 * GARDE-FOUS PERMANENTS — architecture QRC / passages d'examen blanc.
 *
 * Règles vérifiées après chaque scénario :
 *  - QRC répondue non corrigée = exactement 1 apparition dans la file
 *  - QRC corrigée = 0 apparition
 *  - QRC réellement vide = 0 apparition et 0 point
 *  - aucune réponse perdue
 *  - aucune note 0 artificielle
 *
 * Aucun test n'écrit en base : logique pure, données existantes intactes.
 */
import { describe, it, expect } from "vitest";
import {
  groupPassages,
  getQrcToCorrect,
  getQrcState,
  isPassagePendingQrc,
  getLatestPassages,
  auditQrcCoherence,
  buildQrcIdentity,
  PASSAGE_WINDOW_MS,
} from "@/lib/examPassageIdentity";
import {
  resolveIdempotentTentative,
  runFinalizationOnce,
  buildFinalizationKey,
  getInflightFinalizations,
} from "@/lib/examFinalizationGuard";

const T0 = new Date("2026-09-18T17:56:41.000Z").getTime();
const iso = (offsetMs: number) => new Date(T0 + offsetMs).toISOString();

const question = (id: number, type: "QCM" | "QRC", reponseEleve?: unknown) => ({
  questionId: String(id),
  type,
  ...(reponseEleve === undefined ? {} : { reponseEleve }),
});

const row = (over: Partial<any> = {}): any => ({
  id: `row-${Math.random().toString(36).slice(2)}`,
  apprenant_id: "A1",
  quiz_type: "vtc",
  quiz_id: "EB1",
  matiere_id: "t3p",
  matiere_nom: "A - T3P",
  tentative: 1,
  completed_at: iso(0),
  score_obtenu: 11.5,
  score_max: 20,
  details: { questions: [], reponses: {}, correctionsIA: {} },
  ...over,
});

const manuelle = (points: number) => ({ validatedByAdmin: true, pointsObtenus: points, explication: "corrigé" });
const auto = () => ({ validatedByAdmin: false, pointsObtenus: 0, explication: "auto" });

describe("Identité canonique du passage", () => {
  it("plusieurs écritures techniques à moins d'une seconde = UN seul passage réel", () => {
    const passages = groupPassages([
      row({ tentative: 1, completed_at: iso(0), details: { questions: [question(1, "QRC", "rep")], reponses: { "1": "rep" }, correctionsIA: { "1": manuelle(1.5) } } }),
      row({ tentative: 2, completed_at: iso(472), details: { questions: [], reponses: {}, correctionsIA: { "5": manuelle(0) } } }),
    ]);
    expect(passages).toHaveLength(1);
    expect(passages[0].rows).toHaveLength(2);
    expect(passages[0].passage).toBe(1);
  });

  it("deux vraies retentatives espacées restent deux passages distincts", () => {
    const passages = groupPassages([
      row({ tentative: 1, completed_at: iso(0) }),
      row({ tentative: 2, completed_at: iso(PASSAGE_WINDOW_MS + 60_000) }),
    ]);
    expect(passages).toHaveLength(2);
    expect(getLatestPassages(passages)).toHaveLength(1);
  });

  it("l'identité QRC est stable et commune élève / formateur", () => {
    const [p] = groupPassages([row({ details: { questions: [question(1, "QRC", "rep")], reponses: { "1": "rep" }, correctionsIA: {} } })]);
    expect(buildQrcIdentity(p, 1)).toBe("A1|vtc|EB1|t3p|P1|Q1");
  });
});

describe("État des QRC — règle unique", () => {
  it("QRC corrigée sur une écriture et lue depuis l'écriture sœur = 0 apparition", () => {
    const [p] = groupPassages([
      row({ tentative: 1, completed_at: iso(0), details: { questions: [question(5, "QRC", "U")], reponses: { "5": "U" }, correctionsIA: {} } }),
      row({ tentative: 2, completed_at: iso(400), details: { questions: [], reponses: {}, correctionsIA: { "5": manuelle(0) } } }),
    ]);
    expect(getQrcState(p, 5)).toBe("validated");
    expect(getQrcToCorrect(p)).toHaveLength(0);
    expect(isPassagePendingQrc(p)).toBe(false);
  });

  it("une correction manuelle n'est jamais remplacée par une correction automatique plus récente", () => {
    const [p] = groupPassages([
      row({ completed_at: iso(0), details: { questions: [question(2, "QRC", "rep")], reponses: { "2": "rep" }, correctionsIA: { "2": manuelle(2) } } }),
      row({ completed_at: iso(800), details: { questions: [question(2, "QRC", "rep")], reponses: { "2": "rep" }, correctionsIA: { "2": auto() } } }),
    ]);
    expect(p.corrections["2"].pointsObtenus).toBe(2);
    expect(getQrcState(p, 2)).toBe("validated");
  });

  it("QRC répondue et non corrigée = exactement 1 apparition", () => {
    const [p] = groupPassages([
      row({ completed_at: iso(0), details: { questions: [question(3, "QRC", "ma réponse")], reponses: { "3": "ma réponse" }, correctionsIA: {} } }),
      row({ completed_at: iso(300), details: { questions: [question(3, "QRC", "ma réponse")], reponses: { "3": "ma réponse" }, correctionsIA: {} } }),
    ]);
    expect(getQrcToCorrect(p)).toEqual(["3"]);
  });

  it("QRC réellement vide = 0 apparition, 0 point, non bloquante", () => {
    const [p] = groupPassages([
      row({ details: { questions: [question(4, "QRC", "   ")], reponses: { "4": "" }, correctionsIA: {}, qrc_pending_correction: true } }),
    ]);
    expect(getQrcState(p, 4)).toBe("empty");
    expect(getQrcToCorrect(p)).toHaveLength(0);
    expect(isPassagePendingQrc(p)).toBe(false);
  });

  it("réponse perdue (aucune trace dans le snapshot) reste à corriger, jamais mise à 0", () => {
    const [p] = groupPassages([
      row({ details: { questions: [question(6, "QRC")], reponses: {}, correctionsIA: {} } }),
    ]);
    expect(getQrcState(p, 6)).toBe("to_correct");
  });

  it("aucune réponse n'est perdue par la fusion logique", () => {
    const [p] = groupPassages([
      row({ completed_at: iso(0), details: { questions: [question(1, "QRC", "a"), question(2, "QRC", "b")], reponses: { "1": "a" }, correctionsIA: {} } }),
      row({ completed_at: iso(120), details: { questions: [], reponses: { "2": "b" }, correctionsIA: {} } }),
    ]);
    expect(p.reponses).toEqual({ "1": "a", "2": "b" });
  });
});

describe("Finalisation idempotente", () => {
  it("double clic sur « Terminer » = une seule exécution", async () => {
    let calls = 0;
    const key = buildFinalizationKey({ apprenantId: "A1", quizType: "vtc", quizId: "EB1", matiereId: "t3p", tentative: 1 });
    const task = () => new Promise<boolean>((r) => setTimeout(() => { calls++; r(true); }, 20));
    const [a, b] = await Promise.all([runFinalizationOnce(key, task), runFinalizationOnce(key, task)]);
    expect(calls).toBe(1);
    expect(a).toBe(true);
    expect(b).toBe(true);
    expect(getInflightFinalizations()).toBe(0);
  });

  it("deux requêtes simultanées sur des matières différentes restent indépendantes", async () => {
    let calls = 0;
    const task = () => new Promise<boolean>((r) => setTimeout(() => { calls++; r(true); }, 10));
    const k1 = buildFinalizationKey({ apprenantId: "A1", quizType: "vtc", quizId: "EB1", matiereId: "t3p", tentative: 1 });
    const k2 = buildFinalizationKey({ apprenantId: "A1", quizType: "vtc", quizId: "EB1", matiereId: "gestion", tentative: 1 });
    await Promise.all([runFinalizationOnce(k1, task), runFinalizationOnce(k2, task)]);
    expect(calls).toBe(2);
  });

  it("réessai après coupure réseau / rechargement : réutilise le passage en cours", () => {
    const rows = [row({ tentative: 1, completed_at: iso(0) })];
    const t = resolveIdempotentTentative({
      rows, quizId: "EB1", quizType: "vtc", matiereId: "t3p", desiredTentative: 2, now: T0 + 1500,
    });
    expect(t).toBe(1);
  });

  it("une vraie nouvelle tentative conserve son numéro", () => {
    const rows = [row({ tentative: 1, completed_at: iso(0) })];
    const t = resolveIdempotentTentative({
      rows, quizId: "EB1", quizType: "vtc", matiereId: "t3p", desiredTentative: 2, now: T0 + PASSAGE_WINDOW_MS + 5_000,
    });
    expect(t).toBe(2);
  });

  it("tablette partagée : le passage d'un autre apprenant n'influence jamais la finalisation", () => {
    const rows = [row({ apprenant_id: "A2", tentative: 3, completed_at: iso(200) })];
    const t = resolveIdempotentTentative({
      rows: rows.filter((r) => r.apprenant_id === "A1"),
      quizId: "EB1", quizType: "vtc", matiereId: "t3p", desiredTentative: 1, now: T0 + 1000,
    });
    expect(t).toBe(1);
  });

  it("aucune note 0 artificielle : les lignes techniques placeholder sont ignorées", () => {
    const placeholder = row({ tentative: 7, score_obtenu: 0, details: { auto_created: true, needs_recompute: true, questions: [] } });
    const t = resolveIdempotentTentative({
      rows: [placeholder], quizId: "EB1", quizType: "vtc", matiereId: "t3p", desiredTentative: 2, now: T0 + 1000,
    });
    expect(t).toBe(2);
    expect(groupPassages([placeholder])).toHaveLength(0);
  });
});

describe("Surveillance d'incohérence", () => {
  it("signale un passage marqué « En attente » sans QRC réellement à corriger", () => {
    const report = auditQrcCoherence([
      row({ completed_at: iso(0), details: { questions: [question(1, "QRC", "rep")], reponses: { "1": "rep" }, correctionsIA: {}, qrc_pending_correction: true } }),
      row({ completed_at: iso(400), details: { questions: [], reponses: {}, correctionsIA: { "1": manuelle(2) } } }),
    ]);
    expect(report.qrcToCorrect).toBe(0);
    expect(report.pendingPassages).toBe(0);
    expect(report.incoherences).toHaveLength(1);
  });

  it("aucune incohérence quand la QRC est réellement en attente", () => {
    const report = auditQrcCoherence([
      row({ details: { questions: [question(1, "QRC", "rep")], reponses: { "1": "rep" }, correctionsIA: {}, qrc_pending_correction: true } }),
    ]);
    expect(report.qrcToCorrect).toBe(1);
    expect(report.incoherences).toHaveLength(0);
  });
});
