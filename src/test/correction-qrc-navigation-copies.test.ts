// @vitest-environment node
import { describe, expect, it } from "vitest";
import { copieVoisine, decisionApresCorrection } from "@/features/correction-qrc-v2/navigationCopies";
import type { QrcReelle, SessionReelle, TentativeReelle } from "@/features/correction-qrc-v2/noyauReel";

const tentative = (id: string, questions: Array<{ id: string; matiere?: string }>): TentativeReelle => ({
  attempt_id: id,
  apprenant_id: `apprenant-${id}`,
  exam_id: "eb1-test",
  exam_version_id: "version-test",
  etat: "remis",
  snapshot_fingerprint: `empreinte-${id}`,
  candidat: `Candidat ${id}`,
  snapshot: {
    exam_id: "eb1-test",
    matieres: [{ subject_id: "A", lettre: "A", titre: "Matière A", ordre: 1 }],
    questions: questions.map((q) => ({
      id: q.id,
      matiere: q.matiere ?? "A",
      type: "QRC",
      enonce: `Question ${q.id}`,
      points: 2,
    })),
  },
});

const qrc = (attempt_id: string, question_id: string): QrcReelle => ({
  qrc_instance_id: `${attempt_id}-${question_id}`,
  attempt_id,
  question_id,
  apprenant_id: `apprenant-${attempt_id}`,
  reponse: "Réponse",
  etat: "en_attente",
  note: null,
});

const session: Pick<SessionReelle, "tentatives" | "qrc"> = {
  tentatives: [
    tentative("a1", [{ id: "q1" }, { id: "q2" }]),
    tentative("a2", [{ id: "q1" }, { id: "q2" }]),
    tentative("a3", [{ id: "q1" }, { id: "q2" }]),
  ],
  qrc: [qrc("a1", "q1"), qrc("a1", "q2"), qrc("a2", "q1"), qrc("a2", "q2"), qrc("a3", "q1"), qrc("a3", "q2")],
};

describe("Correction QRC — navigation entre copies affichées", () => {
  it("va à la copie précédente et suivante en conservant la question", () => {
    expect(copieVoisine(session, "a2-q1", -1)?.qrc_instance_id).toBe("a1-q1");
    expect(copieVoisine(session, "a2-q1", 1)?.qrc_instance_id).toBe("a3-q1");
  });

  it("désactive les deux extrémités de la liste", () => {
    expect(copieVoisine(session, "a1-q1", -1)).toBeNull();
    expect(copieVoisine(session, "a3-q1", 1)).toBeNull();
  });

  it("respecte l'ordre et le périmètre déjà filtré sans le reconstruire", () => {
    const filtre = { tentatives: [session.tentatives[0], session.tentatives[2]], qrc: session.qrc };
    expect(copieVoisine(filtre, "a1-q2", 1)?.qrc_instance_id).toBe("a3-q2");
    expect(copieVoisine(filtre, "a3-q2", -1)?.qrc_instance_id).toBe("a1-q2");
  });

  it("reste dans la matière si la question courante est absente de la copie voisine", () => {
    const particuliere = {
      tentatives: [session.tentatives[0], tentative("a2", [{ id: "q2" }]), session.tentatives[2]],
      qrc: session.qrc.filter((q) => q.qrc_instance_id !== "a2-q1"),
    };
    expect(copieVoisine(particuliere, "a1-q1", 1)?.qrc_instance_id).toBe("a2-q2");
  });

  it("ne mute ni les copies ni leur ordre", () => {
    const avant = JSON.stringify(session);
    copieVoisine(session, "a2-q1", 1);
    expect(JSON.stringify(session)).toBe(avant);
  });

  it("refuse une sélection inconnue ou une session absente", () => {
    expect(copieVoisine(session, "inconnue", 1)).toBeNull();
    expect(copieVoisine(null, "a1-q1", 1)).toBeNull();
  });
});
