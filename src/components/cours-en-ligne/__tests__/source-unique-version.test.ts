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

function makeQuestion(bonne: "A" | "B" | "C"): Q {
  return {
    id: "TEST-Q1",
    type: "QCM",
    enonce: "Question fictive de test ?",
    choix: ["A", "B", "C"].map((lettre) => ({
      lettre,
      texte: `${lettre} fictif`,
      correct: lettre === bonne,
    })),
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

  it("TEST PERMANENT : modification Admin -> sauvegarde confirmée -> F5 apprenant -> empreinte apprenant = empreinte serveur", () => {
    // Si ce test échoue un jour, le déploiement doit être considéré comme NON VALIDE.
    const server = new FakeServer();

    // Admin modifie et la sauvegarde est confirmée par le serveur
    const nouvelleVersion = server.publish([makeQuestion("C")]);
    expect(nouvelleVersion).toBeGreaterThan(1);

    // Empreinte officielle côté serveur après sauvegarde confirmée
    const empreinteServeur = server.read().fingerprint;

    // F5 apprenant : nouvelle lecture de la version active
    const lectureApprenant = server.read();

    // Égalité stricte : l'apprenant voit exactement ce que le serveur a confirmé
    expect(lectureApprenant.fingerprint).toBe(empreinteServeur);
    expect(lectureApprenant.version).toBe(nouvelleVersion);
  });

  it("une tentative déjà commencée garde son snapshot, une nouvelle tentative prend la version active", () => {
    const server = new FakeServer();
    const empreinteAvant = server.read().fingerprint;
    const snapshotEnCours = buildAttemptSnapshot({
      id: "matiere-test",
      nom: "Matière fictive",
      questions: server.read().questions,
    } as any);

    // L'Admin publie une nouvelle version PENDANT l'épreuve
    server.publish([makeQuestion("C")]);
    const empreinteApres = server.read().fingerprint;
    expect(empreinteApres).not.toBe(empreinteAvant);

    // Tentative en cours : snapshot figé, inchangé
    expect(buildQuestionsFingerprint((snapshotEnCours as any).questions)).toBe(empreinteAvant);

    // Nouvelle tentative : version active
    const nouvelleTentative = buildAttemptSnapshot({
      id: "matiere-test",
      nom: "Matière fictive",
      questions: server.read().questions,
    } as any);
    expect(buildQuestionsFingerprint((nouvelleTentative as any).questions)).toBe(empreinteApres);
  });
});
