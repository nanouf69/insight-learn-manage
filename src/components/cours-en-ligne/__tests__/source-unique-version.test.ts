// @vitest-environment node
import { describe, it, expect } from "vitest";
import { buildQuestionsFingerprint, buildAttemptSnapshot } from "../exam-content-integrity";

/**
 * Tests SOURCE UNIQUE — données 100 % fictives.
 * Aucune vraie question, aucun apprenant réel, aucune écriture en base.
 *
 * Simule un « serveur » qui publie une version active, et un lecteur
 * (apprenant) qui relit systématiquement cette version sans cache.
 */

type Q = any;

function makeQuestion(bonne: string): Q {
  return {
    id: "TEST-Q1",
    type: "qcm",
    question: "Question fictive de test ?",
    propositions: ["A fictif", "B fictif", "C fictif"],
    bonneReponse: bonne,
    points: 1,
  };
}

class FakeServer {
  private questions: Q[] = [makeQuestion("A")];
  private version = 1;
  publishedAt = new Date("2026-09-22T08:00:00Z").toISOString();

  publish(questions: Q[]) {
    this.questions = questions;
    this.version += 1;
    this.publishedAt = new Date().toISOString();
    return this.version;
  }

  /** Lecture serveur : toujours la version active, jamais de copie. */
  read() {
    return {
      version: this.version,
      fingerprint: buildQuestionsFingerprint(this.questions),
      questions: JSON.parse(JSON.stringify(this.questions)) as Q[],
    };
  }
}

describe("Source unique : Admin = version active serveur = apprenant", () => {
  it("une modification de bonne réponse A -> C est visible immédiatement au rechargement apprenant", () => {
    const server = new FakeServer();
    const avant = server.read();
    expect(avant.questions[0].bonneReponse).toBe("A");

    server.publish([makeQuestion("C")]);

    // « F5 » apprenant = nouvelle lecture serveur, sans cache
    const apresF5 = server.read();
    expect(apresF5.questions[0].bonneReponse).toBe("C");
    expect(apresF5.fingerprint).not.toBe(avant.fingerprint);

    // Reconnexion / autre navigateur / autre appareil = mêmes lectures
    for (let i = 0; i < 4; i++) {
      const relecture = server.read();
      expect(relecture.questions[0].bonneReponse).toBe("C");
      expect(relecture.fingerprint).toBe(apresF5.fingerprint);
    }
  });

  it("aucune ancienne version ne peut être servie après publication (pas de fallback ni de cache)", () => {
    const server = new FakeServer();
    const ancienne = server.read();
    server.publish([makeQuestion("C")]);
    const lectures = [server.read(), server.read(), server.read()];
    expect(lectures.every((l) => l.fingerprint !== ancienne.fingerprint)).toBe(true);
  });

  it("une tentative d'examen déjà commencée conserve son snapshot figé", () => {
    const server = new FakeServer();
    const matiereAvant: any = { id: "matiere-test", nom: "Matière fictive", questions: server.read().questions };
    const snapshot = buildAttemptSnapshot(matiereAvant);

    // L'Admin publie une nouvelle version PENDANT l'épreuve
    server.publish([makeQuestion("C")]);

    // Le snapshot figé ne bouge pas
    expect(JSON.stringify(snapshot)).toContain("\"A\"");
    expect(JSON.stringify(snapshot)).not.toContain("\"C\"");
  });

  it("une NOUVELLE tentative reçoit la version active publiée", () => {
    const server = new FakeServer();
    buildAttemptSnapshot({ id: "m", nom: "Matière fictive", questions: server.read().questions } as any);
    server.publish([makeQuestion("C")]);

    const nouvelleTentative = buildAttemptSnapshot({
      id: "m",
      nom: "Matière fictive",
      questions: server.read().questions,
    } as any);
    expect(JSON.stringify(nouvelleTentative)).toContain("\"C\"");
  });
});
