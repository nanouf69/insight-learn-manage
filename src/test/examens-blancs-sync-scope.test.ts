import { describe, it, expect } from "vitest";
import { getExamIdentity, getMatiereSyncKey, canSyncExams } from "@/components/cours-en-ligne/examens-blancs-sync-scope";
import { reconcileSharedMatieres } from "@/components/cours-en-ligne/ExamensBlancsEditor";
import { mergeQuestionsForMatiere } from "@/components/cours-en-ligne/examens-blancs-utils";
import { getTotalQuestionsAttendu } from "@/components/cours-en-ligne/examens-blancs-anomalies";

const q = (id: number, enonce: string, type: "QCM" | "QRC" = "QCM") =>
  type === "QCM"
    ? ({ id, type, enonce, choix: [{ lettre: "A", texte: "a", correct: true }, { lettre: "B", texte: "b" }] } as any)
    : ({ id, type, enonce, reponseQRC: "reponse" } as any);

const exam = (id: string, matiereId: string, enonce: string, editedAt?: string) =>
  ({
    id,
    titre: id,
    matieres: [{ id: matiereId, nom: matiereId, questions: [q(2, enonce)], ...(editedAt ? { _editedAt: editedAt } : {}) }],
  } as any);

describe("identité de synchronisation", () => {
  it("déduit numéro et filière", () => {
    expect(getExamIdentity("EB1")).toMatchObject({ numero: 1, filiere: "VTC" });
    expect(getExamIdentity("EB4-TAXI")).toMatchObject({ numero: 4, filiere: "TAXI" });
    expect(getExamIdentity("eb3-va")).toMatchObject({ numero: 3, filiere: "VA" });
    expect(getExamIdentity("bilan-vtc").numero).toBeNull();
  });

  it("autorise VTC↔TAXI↔VA↔TA du même numéro et interdit les numéros différents", () => {
    expect(canSyncExams("EB1", "EB1-TAXI")).toBe(true);
    expect(canSyncExams("EB1", "eb1-va")).toBe(true);
    expect(canSyncExams("EB2-TAXI", "eb2-ta")).toBe(true);
    expect(canSyncExams("EB1", "EB4")).toBe(false);
    expect(canSyncExams("eb1-va", "eb6-va")).toBe(false);
    expect(canSyncExams("EB1", "bilan-vtc")).toBe(false);
  });

  it("la clé de matière intègre le numéro d'examen", () => {
    expect(getMatiereSyncKey("EB1", "reglementation_vtc2")).not.toBe(getMatiereSyncKey("EB4", "reglementation_vtc2"));
    expect(getMatiereSyncKey("EB1", "reglementation_vtc2")).toBe(getMatiereSyncKey("eb1-va", "reglementation_vtc2"));
  });
});

describe("reconcileSharedMatieres", () => {
  const enonceN1 = "Question G(V) du N°1";
  const enonceN4 = "Question G(V) du N°4";

  it("Test 1 : modifier G(V) VTC N°1 met à jour VA N°1 et laisse N°2..N°6 intacts", () => {
    const examens = [
      exam("EB1", "reglementation_vtc2", enonceN1, "2026-09-18T12:00:00.000Z"),
      exam("EB2", "reglementation_vtc2", "N2"),
      exam("EB4", "reglementation_vtc2", enonceN4),
      exam("eb1-va", "reglementation_vtc2", "ancienne version N1"),
      exam("eb4-va", "reglementation_vtc2", enonceN4),
    ];
    reconcileSharedMatieres(examens, {});
    expect(examens[3].matieres[0].questions[0].enonce).toBe(enonceN1);
    expect(examens[1].matieres[0].questions[0].enonce).toBe("N2");
    expect(examens[2].matieres[0].questions[0].enonce).toBe(enonceN4);
    expect(examens[4].matieres[0].questions[0].enonce).toBe(enonceN4);
  });

  it("Test 2 : modifier G(V) VTC N°4 ne touche que VA N°4", () => {
    const examens = [
      exam("EB1", "reglementation_vtc2", enonceN1),
      exam("EB4", "reglementation_vtc2", "N4 modifié", "2026-09-18T12:30:00.000Z"),
      exam("eb1-va", "reglementation_vtc2", enonceN1),
      exam("eb4-va", "reglementation_vtc2", "ancien N4"),
    ];
    reconcileSharedMatieres(examens, {});
    expect(examens[3].matieres[0].questions[0].enonce).toBe("N4 modifié");
    expect(examens[0].matieres[0].questions[0].enonce).toBe(enonceN1);
    expect(examens[2].matieres[0].questions[0].enonce).toBe(enonceN1);
  });

  it("Test 3 : modifier Gestion VTC N°2 ne change que TAXI N°2", () => {
    const examens = [
      exam("EB2", "gestion", "gestion N2 modifiée", "2026-09-18T13:00:00.000Z"),
      exam("EB2-TAXI", "gestion", "ancienne gestion N2"),
      exam("EB3", "gestion", "gestion N3"),
      exam("EB3-TAXI", "gestion", "gestion N3"),
    ];
    reconcileSharedMatieres(examens, {});
    expect(examens[1].matieres[0].questions[0].enonce).toBe("gestion N2 modifiée");
    expect(examens[2].matieres[0].questions[0].enonce).toBe("gestion N3");
    expect(examens[3].matieres[0].questions[0].enonce).toBe("gestion N3");
  });

  it("Test 4 : ajout/suppression de question reste cantonné au même numéro", () => {
    const n1 = exam("EB1", "francais", "Q base", "2026-09-18T14:00:00.000Z");
    n1.matieres[0].questions.push(q(9, "Question ajoutée"));
    const examens = [n1, exam("eb1-va", "francais", "Q base"), exam("EB5", "francais", "Q base")];
    reconcileSharedMatieres(examens, {});
    expect(examens[1].matieres[0].questions).toHaveLength(2);
    expect(examens[2].matieres[0].questions).toHaveLength(1);
  });
});

describe("Test 5 : type enregistré conservé au rechargement", () => {
  it("une QRC convertie en QCM par l'Admin ne récupère pas les propositions d'un autre examen", () => {
    const source = [q(2, "Un conducteur de VTC doit-il être propriétaire ?", "QRC")];
    const saved = [
      { id: 2, type: "QCM", enonce: "Un conducteur de VTC doit-il être propriétaire ?", manually_edited: true, _editedAt: "2026-09-18T15:00:00.000Z", choix: [{ lettre: "A", texte: "Oui", correct: true }, { lettre: "B", texte: "Non" }] } as any,
    ];
    const merged = mergeQuestionsForMatiere(source as any, saved as any);
    expect(merged[0].type).toBe("QCM");
    expect(merged[0].choix?.map((c: any) => c.texte)).toEqual(["Oui", "Non"]);
  });

  it("une QRC enregistrée reste QRC sans propositions", () => {
    const source = [{ id: 2, type: "QCM", enonce: "Même énoncé", choix: [{ lettre: "A", texte: "4,50 m", correct: true }] } as any];
    const saved = [{ id: 2, type: "QRC", enonce: "Même énoncé", manually_edited: true, reponseQRC: "Non" } as any];
    const merged = mergeQuestionsForMatiere(source as any, saved as any);
    expect(merged[0].type).toBe("QRC");
    expect((merged[0] as any).choix).toBeUndefined();
  });
});

describe("Test 6 : total attendu par type d'examen", () => {
  it("un examen complet attend 107 questions et un VA seulement ses matières", () => {
    const complet = {
      id: "EB1",
      matieres: ["t3p", "gestion", "securite", "francais", "anglais", "reglementation_vtc", "reglementation_vtc2"].map((id) => ({ id, nom: id, questions: [] })),
    } as any;
    const va = { id: "eb1-va", matieres: [{ id: "reglementation_vtc", nom: "F(V)", questions: [] }, { id: "reglementation_vtc2", nom: "G(V)", questions: [] }] } as any;
    expect(getTotalQuestionsAttendu(complet)).toBe(107);
    expect(getTotalQuestionsAttendu(va)).toBe(24);
  });
});
