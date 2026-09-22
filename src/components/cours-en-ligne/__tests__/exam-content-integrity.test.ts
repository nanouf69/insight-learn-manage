import { describe, it, expect } from "vitest";
import {
  buildExamFingerprint,
  buildMatiereFingerprint,
  buildQuestionsFingerprint,
  buildAttemptSnapshot,
  isSnapshotOutdated,
  isExamContentUnavailable,
  ExamContentUnavailableError,
  EXAM_CONTENT_UNAVAILABLE_MESSAGE,
} from "../exam-content-integrity";

// ── ENVIRONNEMENT DE TEST 100 % FICTIF ────────────────────────────────────
// Aucune donnée réelle, aucun apprenant réel, aucune écriture en base.
const fv = () => ({
  id: "reglementation_vtc",
  nom: "F(V) — Développement commercial",
  noteSur: 20,
  coefficient: 1,
  questions: [
    { id: "q1", type: "qcm", enonce: "Question 1 ?", choix: [{ lettre: "A", texte: "Oui", correct: true }], points: 1 },
    { id: "q2", type: "qrc", enonce: "Expliquez.", reponseQRC: "Réponse attendue", points: 2 },
  ],
});
const gv = () => ({
  id: "reglementation_vtc2",
  nom: "G(V) — Réglementation nationale VTC",
  noteSur: 20,
  coefficient: 1,
  questions: [
    { id: "g1", type: "qcm", enonce: "Question G ?", choix: [{ lettre: "A", texte: "Non", correct: true }], points: 1 },
  ],
});
const examenTest = () => ({ id: "test-vtc-2", numero: 2, type: "VTC", matieres: [fv(), gv()] });
const autreExamen = () => ({ id: "test-vtc-1", numero: 1, type: "VTC", matieres: [fv()] });

describe("Examen blanc — intégrité du contenu (compte TEST fictif)", () => {
  it("Admin = Base = nouvelle tentative : F(V) et G(V) identiques", () => {
    const admin = examenTest();
    const base = examenTest();
    const tentative = buildAttemptSnapshot(base);
    expect(buildExamFingerprint(admin)).toBe(buildExamFingerprint(base));
    expect(buildExamFingerprint(tentative)).toBe(buildExamFingerprint(base));
    expect(buildMatiereFingerprint(tentative.matieres[0])).toBe(buildMatiereFingerprint(fv()));
    expect(buildMatiereFingerprint(tentative.matieres[1])).toBe(buildMatiereFingerprint(gv()));
  });

  it("Échec de lecture : erreur bloquante, jamais de repli statique", () => {
    const err = new ExamContentUnavailableError("réseau coupé");
    expect(isExamContentUnavailable(err)).toBe(true);
    expect(EXAM_CONTENT_UNAVAILABLE_MESSAGE).toContain("Impossible de charger l'Examen Blanc");
    expect(isExamContentUnavailable(new Error("autre"))).toBe(false);
  });

  it("F5 / déconnexion-reconnexion : la photo reste identique (mêmes IDs)", () => {
    const snap = buildAttemptSnapshot(examenTest());
    const empreinte = buildExamFingerprint(snap);
    const apresF5 = JSON.parse(JSON.stringify(snap)); // rechargement de la tentative
    expect(buildExamFingerprint(apresF5)).toBe(empreinte);
    expect(apresF5.matieres[0].questions.map((q: any) => q.id)).toEqual(["q1", "q2"]);
  });

  it("La photo est indépendante : modifier l'Admin ne change pas la tentative en cours", () => {
    const base = examenTest();
    const tentativeEnCours = buildAttemptSnapshot(base);
    const empreinteFigee = buildExamFingerprint(tentativeEnCours);

    // Modification Admin (TEST uniquement)
    base.matieres[0].questions[0].enonce = "Question 1 modifiée ?";

    expect(buildExamFingerprint(tentativeEnCours)).toBe(empreinteFigee);
    expect(tentativeEnCours.matieres[0].questions[0].enonce).toBe("Question 1 ?");

    // Nouvelle tentative → nouvelle version
    const nouvelleTentative = buildAttemptSnapshot(base);
    expect(buildExamFingerprint(nouvelleTentative)).not.toBe(empreinteFigee);
    expect(nouvelleTentative.matieres[0].questions[0].enonce).toBe("Question 1 modifiée ?");
  });

  it("Aucun autre numéro d'examen n'est affecté par une modification", () => {
    const eb1 = autreExamen();
    const avant = buildExamFingerprint(eb1);
    const eb2 = examenTest();
    eb2.matieres[0].questions[0].enonce = "Question 1 modifiée ?";
    expect(buildExamFingerprint(eb1)).toBe(avant);
  });

  it("Contrôle avant démarrage : empreintes différentes → démarrage refusable", () => {
    const affiche = examenTest();
    const base = examenTest();
    base.matieres[1].questions[0].choix[0].correct = false;
    expect(buildExamFingerprint(affiche)).not.toBe(buildExamFingerprint(base));
  });

  it("Ancien passage : signalé « version antérieure » sans recalcul", () => {
    const snapshotHistorique = { questions: fv().questions };
    const active = fv();
    expect(isSnapshotOutdated(snapshotHistorique, active as any)).toBe(false);

    active.questions[0].enonce = "Nouvel énoncé ?";
    expect(isSnapshotOutdated(snapshotHistorique, active as any)).toBe(true);
    // la comparaison est en lecture seule : le snapshot reste intact
    expect(snapshotHistorique.questions[0].enonce).toBe("Question 1 ?");
  });

  it("Empreinte sensible à chaque champ pédagogique", () => {
    const ref = buildQuestionsFingerprint(fv().questions);
    const variantes = [
      (q: any) => { q[0].enonce = "x"; },
      (q: any) => { q[0].choix[0].texte = "x"; },
      (q: any) => { q[0].choix[0].correct = false; },
      (q: any) => { q[0].points = 5; },
      (q: any) => { q[1].reponseQRC = "x"; },
      (q: any) => { q[1].type = "qcm"; },
      (q: any) => { q[0].image = "photo.png"; },
    ];
    for (const muter of variantes) {
      const qs = fv().questions;
      muter(qs);
      expect(buildQuestionsFingerprint(qs)).not.toBe(ref);
    }
  });
});
